import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

const result = streamText({
  model: openai.responses('o4-mini'),
  prompt: 'Tell me about the Mission burrito debate in San Francisco.',
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
  } else if (part.type === 'text-delta') {
    if (reasoningText) {
      console.log('Reasoning:', reasoningText);
      reasoningText = '';
    }
    process.stdout.write(part.textDelta);
  }
}