import { NextResponse } from 'next/server'
import { streamText } from 'ai';
import { getProviderModelWithKey, Models, type ModelProviders } from '@/lib/AI';
import { db } from '@/lib/db';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  try {
    const { model, messageId, chatId, userId, prompt } = await req.json();

    if (!model || !messageId || !chatId || !userId || !prompt) {
      return NextResponse.json(
        { error: 'Model, messageId, chatId, userId, and prompt are required' },
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

    // Get the message to retry and verify it exists
    const messageToRetry = await db.get(
      'SELECT * FROM message WHERE id = ? AND chatId = ? AND role = ?',
      [messageId, chatId, 'assistant']
    );

    if (!messageToRetry) {
      return NextResponse.json(
        { error: 'Message not found or not an assistant message' },
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
      console.log(`[Retry API] Using user's ${modelProvider} API key (free)`);
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

      console.log(`[Retry API] Using environment ${modelProvider} API key (charging 1 request)`);
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

    // Get previous messages for context
    const previousMessages = await db.all(
      'SELECT role, content FROM message WHERE chatId = ? AND createdAt < ? ORDER BY createdAt ASC',
      [chatId, messageToRetry.createdAt]
    );

    type ChatRole = 'user' | 'assistant' | 'system';
    const contextMessages = (
      previousMessages as { role: string; content: string }[]
    ).map((m) => ({ role: m.role as ChatRole, content: m.content }));

    // Add the user prompt that triggered this message
    contextMessages.push({ role: 'user', content: prompt });

    // Store the current content as previous content and reset the message
    const now = new Date();
    await db.run(
      'UPDATE message SET previousContent = content, content = ?, status = ?, updatedAt = ?, model = ? WHERE id = ?',
      ['', 'streaming', now, model, messageId]
    );

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
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: contextMessages,
              stream: true,
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
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

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  await writer.write(encoder.encode(content));
                  assistantResponse += content;
                  chunkCount++;

                  if (chunkCount % 10 === 0) {
                    await db.run(
                      'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                      [assistantResponse, new Date(), messageId]
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
            const streamResult = await streamText({ 
              model: providerModelData.model, 
              messages: contextMessages,
              providerOptions: {
                openai: {
                  reasoningSummary: 'detailed'
                }
              }
            });
            
            let isInReasoning = false;
            for await (const part of streamResult.fullStream) {
              if (part.type === 'reasoning') {
                if (!isInReasoning) {
                  await writer.write(encoder.encode('<think>'));
                  assistantResponse += '<think>';
                  isInReasoning = true;
                }
                await writer.write(encoder.encode(part.textDelta));
                assistantResponse += part.textDelta;
                console.log('[Chat API] Reasoning:', part.textDelta);
              } else if (part.type === 'text-delta') {
                if (isInReasoning) {
                  await writer.write(encoder.encode('</think>'));
                  assistantResponse += '</think>';
                  isInReasoning = false;
                }
                await writer.write(encoder.encode(part.textDelta));
                assistantResponse += part.textDelta;
              }
              
              chunkCount++;

              if (chunkCount % 10 === 0) {
                await db.run(
                  'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                  [assistantResponse, new Date(), messageId]
                );
              }
            }

            // Ensure we close any open reasoning tags
            if (isInReasoning) {
              await writer.write(encoder.encode('</think>'));
              assistantResponse += '</think>';
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
                  [assistantResponse, new Date(), messageId]
                );
              }
            }
          }

          // Final database updates
          await db.run(
            'UPDATE message SET content = ?, status = ?, updatedAt = ? WHERE id = ?',
            [assistantResponse, 'complete', new Date(), messageId]
          );
          await db.run(
            'UPDATE chat SET updatedAt = ? WHERE id = ?',
            [new Date(), chatId]
          );
        }
      } catch (error) {
        console.error('Error in stream processing:', error);
        await db.run(
          'UPDATE message SET status = ?, content = ? WHERE id = ?',
          ['error', 'Failed to generate response', messageId]
        );
        throw error;
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in retry API:', error);
    return NextResponse.json(
      {
        error: 'Failed to process retry request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 