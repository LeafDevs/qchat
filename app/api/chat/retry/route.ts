import { NextResponse } from 'next/server'
import { streamText } from 'ai';
import { getProviderModel, Models, initializeProviders } from '@/lib/AI';
import { db } from '@/lib/db';

// Initialize providers once when the module loads
const providers = initializeProviders();

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

    // Get the message to retry
    const messageToRetry = await db.get(
      'SELECT * FROM message WHERE id = ? AND chatId = ?',
      [messageId, chatId]
    );

    if (!messageToRetry) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    try {
      console.log(`[Chat API] Starting retry for message: ${messageId}, model: ${model}`);
      
      // Fetch messages for context up to the retry point
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

      // Store the current content as previous content
      const now = new Date();
      console.log('[Chat API] Current message content:', messageToRetry.content);
      try {
        await db.run(
          'UPDATE message SET previousContent = content, content = ?, status = ?, updatedAt = ? WHERE id = ?',
          ['', 'streaming', now, messageId]
        );
        console.log('[Chat API] Successfully updated message with previous content');
      } catch (error) {
        console.error('[Chat API] Error updating message:', error);
        throw error;
      }

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
          // Handle OpenRouter requests directly
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

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

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
            // Handle other providers using the initialized providers
            const providerModel = getProviderModel(model, providers);
            const streamResult = await streamText({ model: providerModel, messages: contextMessages });
            
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
          console.log('[Chat API] Retry stream processing complete');

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
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
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