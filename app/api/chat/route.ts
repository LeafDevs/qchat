import { NextResponse } from 'next/server'
import { streamText } from 'ai';
import { getProviderModelWithKey, openRouterTextStreamWithKey, Models, type ModelProviders } from '@/lib/AI';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { model, prompt, chatId, userId, messageId } = await req.json();

    if (!model || !prompt || !chatId || !userId) {
      return NextResponse.json(
        { error: 'Model, prompt, chatId, and userId are required' },
        { status: 400 }
      );
    }

    // Verify chat ownership
    const chat = await db.get(
      'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
      [chatId, userId]
    );

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get the model provider
    const modelProvider = Models.find(m=>m.model===model)?.provider as ModelProviders | undefined;
    if (!modelProvider) {
      return NextResponse.json(
        { error: 'Model not supported' },
        { status: 400 }
      );
    }

    // Fetch user's API key for this provider
    const userApiKey = await db.get(
      'SELECT key FROM apiKey WHERE userId = ? AND provider = ? AND enabled = 1',
      [userId, modelProvider]
    );

    let usingUserKey = false;
    let apiKey = '';

    if (userApiKey?.key) {
      // User has their own API key - use it for free
      usingUserKey = true;
      apiKey = userApiKey.key;
      console.log(`[Chat API] Using user's ${modelProvider} API key (free)`);
    } else {
      // User doesn't have API key - use environment variable but charge 1 request
      usingUserKey = false;
      
      // Get the appropriate environment variable
      switch (modelProvider) {
        case 'OpenAI':
          apiKey = process.env.OPENAI_API_KEY || '';
          break;
        case 'Anthropic':
          apiKey = process.env.ANTHROPIC_API_KEY || '';
          break;
        case 'Google':
          apiKey = process.env.GEMINI_API_KEY || '';
          break;
        case 'OpenRouter':
          apiKey = process.env.OPENROUTER_API_KEY || '';
          break;
        default:
          return NextResponse.json(
            { error: 'Provider not supported' },
            { status: 400 }
          );
      }

      if (!apiKey) {
        return NextResponse.json(
          { error: `No API key available for ${modelProvider}. Please add your own API key in settings or contact support.` },
          { status: 400 }
        );
      }

      console.log(`[Chat API] Using environment ${modelProvider} API key (charging 1 request)`);
    }

    // Check request limit
    const requestLimit = await db.get(
      'SELECT * FROM requestLimit WHERE userId = ?',
      [userId]
    );

    if (requestLimit) {
      if (requestLimit.requestCount >= requestLimit.maxRequests) {
        return NextResponse.json(
          { error: 'Monthly request limit reached' },
          { status: 429 }
        );
      }

      // Update request count (charge 1 request if using environment key, 0 if using user key)
      const requestCost = usingUserKey ? 0 : 1;
      await db.run(
        'UPDATE requestLimit SET requestCount = requestCount + ?, updatedAt = ? WHERE id = ?',
        [requestCost, new Date().toISOString(), requestLimit.id]
      );
    } else {
      // Create new request limit (charge 1 request if using environment key, 0 if using user key)
      const requestCost = usingUserKey ? 0 : 1;
      const id = crypto.randomUUID();
      const now = new Date();
      const resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Reset in 30 days

      await db.run(
        `INSERT INTO requestLimit (
          id, userId, requestCount, maxRequests, resetAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id, userId, requestCost, 250,
          resetAt.toISOString(), now.toISOString(), now.toISOString()
        ]
      );
    }

    try {
      console.log(`[Chat API] Starting chat processing for chatId: ${chatId}, model: ${model}, usingUserKey: ${usingUserKey}`);
      
      type ChatRole = 'user' | 'assistant' | 'system';
      
      // Only fetch previous messages if this is not the first message in the chat
      const messageCount = await db.get(
        'SELECT COUNT(*) as count FROM message WHERE chatId = ?',
        [chatId]
      );
      
      let contextMessages: { role: ChatRole; content: string }[] = [];
      
      // Get user's system prompt
      const userPreferences = await db.get(
        'SELECT systemPrompt FROM userPreferences WHERE userId = ?',
        [userId]
      );
      
      // Add system prompt if it exists
      if (userPreferences?.systemPrompt) {
        contextMessages.push({ role: 'system', content: userPreferences.systemPrompt });
        console.log('[Chat API] Added system prompt to context');
      }
      
      if (messageCount.count > 0) {
        // Fetch existing messages for context only if there are previous messages
        const previousMessages = await db.all(
          'SELECT role, content FROM message WHERE chatId = ? ORDER BY createdAt ASC',
          [chatId]
        );
        console.log(`[Chat API] Retrieved ${previousMessages.length} previous messages for context`);
        contextMessages = contextMessages.concat(previousMessages.map((m) => ({ role: m.role as ChatRole, content: m.content })));
      }

      // Append the current user prompt as the last message
      contextMessages.push({ role: 'user', content: prompt });
      console.log('[Chat API] Added current prompt to context messages');

      // Save user message to the database
      const userMessageId = crypto.randomUUID();
      const now = new Date();
      await db.run(
        'INSERT INTO message (id, chatId, content, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [userMessageId, chatId, prompt, 'user', now, now]
      );
      console.log(`[Chat API] Saved user message with ID: ${userMessageId}`);

      // Update chat's updatedAt timestamp
      await db.run(
        'UPDATE chat SET updatedAt = ? WHERE id = ?',
        [now, chatId]
      );
      console.log('[Chat API] Updated chat timestamp');

      // Create a temporary message for the assistant's response
      const assistantMessageId = messageId || crypto.randomUUID();
      await db.run(
        'INSERT INTO message (id, chatId, content, role, createdAt, updatedAt, status, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [assistantMessageId, chatId, '', 'assistant', now, now, 'streaming', model]
      );
      console.log(`[Chat API] Created temporary assistant message with ID: ${assistantMessageId}`);

      let assistantResponse = '';
      let chunkCount = 0;

      // Create a TransformStream to handle the streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Start processing the stream in the background
      (async () => {
        try {
          // Handle OpenRouter requests directly
          if (modelProvider === 'OpenRouter') {
            // Map model names to OpenRouter format if needed
            let openRouterModel = model;
            if (model === 'anthropic/claude-4-sonnet' || model === 'anthropic/claude-3.5-sonnet-20241022') {
              openRouterModel = 'anthropic/claude-3.5-sonnet-20241022';
            }
            
            console.log('[Chat API] OpenRouter request details:', {
              originalModel: model,
              openRouterModel,
              messageCount: contextMessages.length,
              firstMessage: contextMessages[0],
              lastMessage: contextMessages[contextMessages.length - 1]
            });

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://qchat.app',
                'X-Title': 'QChat',
              },
              body: JSON.stringify({
                model: openRouterModel,
                messages: contextMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 4000,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`OpenRouter API error ${response.status}:`, errorText);
              console.error('Request details:', {
                originalModel: model,
                openRouterModel,
                messageCount: contextMessages.length,
                headers: {
                  Authorization: `Bearer ${apiKey.substring(0, 10)}...`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://qchat.app',
                  'X-Title': 'QChat',
                }
              });
              throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('Response body is not readable');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // Decode the chunk and add to buffer
              buffer += decoder.decode(value, { stream: true });

              // Process complete lines
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                const data = trimmedLine.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;
                  const reasoning = parsed.choices[0]?.delta?.reasoning;
                  if (reasoning) {
                    if (!assistantResponse.includes('<think>')) {
                      await writer.write(encoder.encode('<think>'));
                      assistantResponse += '<think>';
                    }
                    await writer.write(encoder.encode(reasoning));
                    assistantResponse += reasoning;
                    chunkCount++;
                  }
                  if (content) {
                    if (assistantResponse.includes('<think>') && !assistantResponse.includes('</think>')) {
                      await writer.write(encoder.encode('</think>'));
                      assistantResponse += '</think>';
                    }
                    // Write immediately to the stream
                    await writer.write(encoder.encode(content));
                    assistantResponse += content;
                    chunkCount++;

                    // Update database periodically
                    if (chunkCount % 10 === 0) {
                      await db.run(
                        'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                        [assistantResponse, new Date(), assistantMessageId]
                      );
                    }
                  }
                } catch (e) {
                  console.error('Error parsing JSON:', e);
                }
              }
            }
          } else {
            // Handle other providers using the API key
            const providerModelData = getProviderModelWithKey(model, modelProvider, apiKey);
            
            if (modelProvider === 'OpenAI') {
              const result = streamText({
                model: providerModelData.model,
                messages: contextMessages,
                providerOptions: {
                  openai: {
                    reasoningSummary: 'detailed', // 'auto' for condensed or 'detailed' for comprehensive
                  },
                },
              });
              
              let reasoningText = '';
              for await (const part of result.fullStream) {
                if (part.type === 'reasoning') {
                  reasoningText += part.textDelta;
                  if (!assistantResponse.includes('<think>')) {
                    await writer.write(encoder.encode('<think>'));
                    assistantResponse += '<think>';
                  }
                  await writer.write(encoder.encode(part.textDelta));
                  assistantResponse += part.textDelta;
                  chunkCount++;
                } else if (part.type === 'text-delta') {
                  if (reasoningText) {
                    if (!assistantResponse.includes('</think>')) {
                      await writer.write(encoder.encode('</think>'));
                      assistantResponse += '</think>';
                    }
                    reasoningText = '';
                  }
                  await writer.write(encoder.encode(part.textDelta));
                  assistantResponse += part.textDelta;
                  chunkCount++;

                  if (chunkCount % 10 === 0) {
                    await db.run(
                      'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                      [assistantResponse, new Date(), assistantMessageId]
                    );
                  }
                }
              }
            } else {
              // Handle other providers using streamText
              const streamResult = await streamText({ 
                model: providerModelData.model, 
                messages: contextMessages,
                providerOptions: modelProvider === 'Anthropic' ? {
                  anthropic: {
                    thinking: { type: 'enabled', budgetTokens: 500 }
                  }
                } : undefined
              });
              
              for await (const chunk of streamResult.textStream) {
                const text = (typeof chunk === 'string') ? chunk : new TextDecoder().decode(chunk);
                await writer.write(encoder.encode(text));
                assistantResponse += text;
                chunkCount++;

                if (chunkCount % 10 === 0) {
                  await db.run(
                    'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                    [assistantResponse, new Date(), assistantMessageId]
                  );
                  console.log(`[Chat API] Processed ${chunkCount} chunks, current response length: ${assistantResponse.length}`);
                }
              }
            }

            console.log('[Chat API] Stream processing complete, final response:', assistantResponse);
          }

          // Final database updates
          await db.run(
            'UPDATE message SET content = ?, status = ?, updatedAt = ? WHERE id = ?',
            [assistantResponse, 'complete', new Date(), assistantMessageId]
          );
          await db.run(
            'UPDATE chat SET updatedAt = ? WHERE id = ?',
            [new Date(), chatId]
          );
          console.log('[Chat API] Stream processing complete');

        } catch (error) {
          console.error('Error in stream processing:', error);
          await db.run(
            'UPDATE message SET status = ?, content = ? WHERE id = ?',
            ['error', 'Failed to generate response', assistantMessageId]
          );
          throw error;
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });

    } catch (streamError) {
      console.error('Error in stream processing:', streamError);
      throw streamError;
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}