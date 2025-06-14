import { NextResponse } from 'next/server'
import { streamText } from 'ai';
import { getProviderModel, openRouterTextStream, Models } from '@/lib/AI';
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

    try {
      console.log(`[Chat API] Starting chat processing for chatId: ${chatId}, model: ${model}`);
      
      // Fetch existing messages for context
      const previousMessages = await db.all(
        'SELECT role, content FROM message WHERE chatId = ? ORDER BY createdAt ASC',
        [chatId]
      );
      console.log(`[Chat API] Retrieved ${previousMessages.length} previous messages for context`);

      type ChatRole = 'user' | 'assistant' | 'system';
      const contextMessages = (
        previousMessages as { role: string; content: string }[]
      ).map((m) => ({ role: m.role as ChatRole, content: m.content }));

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

      const modelProvider = Models.find(m=>m.model===model)?.provider;
      let assistantResponse = '';
      let chunkCount = 0;

      // Create a TransformStream to handle the streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Start processing the stream in the background
      (async () => {
        try {
          // cant get the @openrouter/ai-sdk-provider  to work with responses it would work with requests but i wouldnt recieve responses :P
          if (modelProvider === 'OpenRouter') {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
            const providerModel = getProviderModel(model);
            const streamResult = await streamText({ model: providerModel, messages: contextMessages });
            
            for await (const chunk of streamResult.textStream) {
              const text = (typeof chunk === 'string') ? chunk : new TextDecoder().decode(chunk);
              await writer.write(encoder.encode(text));
              assistantResponse += text;
              chunkCount++;

              // Update database every 10 chunks
              if (chunkCount % 10 === 0) {
                await db.run(
                  'UPDATE message SET content = ?, updatedAt = ? WHERE id = ?',
                  [assistantResponse, new Date(), assistantMessageId]
                );
                console.log(`[Chat API] Processed ${chunkCount} chunks, current response length: ${assistantResponse.length}`);
              }
            }
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