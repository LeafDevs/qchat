import {createGoogleGenerativeAI} from "@ai-sdk/google";
import {openai} from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type ModelProviders = "Google" | "OpenAI" | "Anthropic" | "OpenRouter";

export interface ModelConfig {
    model: string;
    provider: ModelProviders;
    display_name: string;
    hasFileUpload: boolean;
    hasVision: boolean;
    hasThinking: boolean;
    hasPDFManipulation: boolean;
    hasSearch: boolean;
}

export const Models: ModelConfig[] = [
    {
        model: "gpt-4.1",
        display_name: "GPT-4.1",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: false,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gpt-4o-mini",
        display_name: "GPT-4o-mini",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: false,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gpt-4o",
        display_name: "GPT-4o",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: false,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "o4-mini",
        display_name: "o4-mini",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "o3",
        display_name: "o3",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "o3-mini",
        display_name: "o3-mini",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "anthropic/claude-3.5-sonnet-20241022",
        display_name: "Claude 3.5 Sonnet",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gemini-2.5-flash-preview-05-20",    
        display_name: "Gemini 2.5 Flash",
        provider: "Google",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "deepseek/deepseek-r1-0528:free",
        display_name: "DeepSeek R1 (0528)",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "deepseek/deepseek-chat-v3-0324",
        display_name: "DeepSeek V3 (0324)",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "qwen/qwen3-8b",
        display_name: "Qwen 3.8B",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gemini-2.0-flash",
        display_name: "Gemini 2.0 Flash",
        provider: "Google",
        hasFileUpload: true,
        hasVision: true,
        hasThinking: false,
        hasPDFManipulation: true,
        hasSearch: true
    },
]

// Create provider instances with user API keys
export function createProviderWithKey(provider: ModelProviders, apiKey: string) {
    console.log(`[AI] Creating ${provider} provider with user API key`);
    
    switch (provider) {
        case "Google":
            return createGoogleGenerativeAI({ apiKey });
        case "OpenAI":
            // OpenAI doesn't need a separate provider instance, we'll use it directly
            return { apiKey };
        case "Anthropic":
            // Anthropic doesn't need a separate provider instance, we'll use it directly
            return { apiKey };
        case "OpenRouter":
            return createOpenRouter({ 
                apiKey, 
                baseURL: 'https://openrouter.ai/api/v1' 
            });
        default:
            throw new Error(`Provider ${provider} not supported`);
    }
}

// Utility to get the right model instance for streamText with user API key
export function getProviderModelWithKey(model: string, provider: ModelProviders, apiKey: string) {
    const modelConfig = Models.find(m => m.model === model);
    if (!modelConfig) throw new Error(`Model ${model} not supported`);
    
    console.log('[AI] Getting provider model with user key:', { model, provider: modelConfig.provider });
    
    switch (modelConfig.provider) { 
        case "OpenAI":
            // For OpenAI, we need to create a new client with the API key
            return { model: openai.responses(model), apiKey };
        case "Google":
            const googleProvider = createGoogleGenerativeAI({ apiKey });
            return { model: googleProvider(model), apiKey };
        case "Anthropic":
            console.log('[AI] Creating Anthropic model instance with user key:', model);
            // For Anthropic, we need to create a new client with the API key
            return { model: anthropic(model), apiKey };
        case "OpenRouter":
            const openRouterProvider = createOpenRouter({ 
                apiKey, 
                baseURL: 'https://openrouter.ai/api/v1' 
            });
            return { model: openRouterProvider(model), apiKey };
        default:
            throw new Error(`Provider ${modelConfig.provider} not supported`);
    }
}

// --- OpenRouter direct streaming helper with user API key ---
export async function openRouterTextStreamWithKey(
  model: string,
  messages: { role: string; content: string }[],
  apiKey: string,
) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OR_REFERER || 'http://localhost',
      'User-Agent': 'qchat/0.1.0',
    },
    body: JSON.stringify({ model, stream: true, messages }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`OpenRouter request failed: ${res.status}`);
  }

  const decoder = new TextDecoder();
  async function* iterator() {
    let buffer = '';
    // @ts-ignore
    for await (const chunk of res.body as any as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const ln of lines) {
        if (!ln.startsWith('data:')) continue;
        const payload = ln.replace(/^data:\s*/, '').trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch {
          // ignore malformed JSON
        }
      }
    }
  }

  return { textStream: iterator() };
}

// Legacy functions for backward compatibility (deprecated)
export function initializeProviders() {
    console.warn('[AI] initializeProviders is deprecated. Use createProviderWithKey instead.');
    return {
        googleAI: createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || '' }),
        anthropicAI: anthropic,
        openRouterAI: createOpenRouter({ 
            apiKey: process.env.OPENROUTER_API_KEY || '', 
            baseURL: 'https://openrouter.ai/api/v1' 
        })
    };
}

export function getProviderModel(model: string, providers: ReturnType<typeof initializeProviders>) {
    console.warn('[AI] getProviderModel is deprecated. Use getProviderModelWithKey instead.');
    const modelConfig = Models.find(m => m.model === model);
    if (!modelConfig) throw new Error(`Model ${model} not supported`);
    
    switch (modelConfig.provider) { 
        case "OpenAI":
            return openai.responses(model);
        case "Google":
            return providers.googleAI(model);
        case "Anthropic":
            return providers.anthropicAI(model);
        case "OpenRouter":
            return providers.openRouterAI(model);
        default:
            throw new Error(`Provider ${modelConfig.provider} not supported`);
    }
}

export async function openRouterTextStream(
  model: string,
  messages: { role: string; content: string }[],
) {
  console.warn('[AI] openRouterTextStream is deprecated. Use openRouterTextStreamWithKey instead.');
  return openRouterTextStreamWithKey(model, messages, process.env.OPENROUTER_API_KEY || '');
}
