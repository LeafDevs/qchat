import {createGoogleGenerativeAI} from "@ai-sdk/google";
import {createOpenAI, openai} from "@ai-sdk/openai";
import {createAnthropic} from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type ModelProviders = "Google" | "OpenAI" | "Anthropic" | "OpenRouter";

export interface ModelConfig {
    model: string;
    provider: ModelProviders;
    hasFileUpload: boolean;
    hasVision: boolean;
    hasThinking: boolean;
    hasPDFManipulation: boolean;
    hasSearch: boolean;
}

export const Models: ModelConfig[] = [
    {
        model: "gpt-4.1",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gpt-4o-mini",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gpt-4o",
        provider: "OpenAI",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "claude-3.7-sonnet",
        provider: "Anthropic",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "anthropic/claude-4-sonnet",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gemini-2.5-flash-preview-05-20",
        provider: "Google",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gemini-2.5-pro-preview-06-05",
        provider: "Google",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "deepseek/deepseek-r1-0528:free",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "deepseek/deepseek-chat-v3-0324",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "qwen/qwen3-8b",
        provider: "OpenRouter",
        hasFileUpload: false,
        hasVision: false,
        hasThinking: true,
        hasPDFManipulation: false,
        hasSearch: false
    },
    {
        model: "gemini-2.0-flash",
        provider: "Google",
        hasFileUpload: true,
        hasVision: true,
        hasThinking: false,
        hasPDFManipulation: true,
        hasSearch: true
    }
]

// Initialize providers with environment variables
export function initializeProviders() {
    const openAI = createOpenAI({ compatibility: "strict", apiKey: process.env.OPENAI_API_KEY });
    const googleAI = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const anthropicAI = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const openRouterAI = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });

    return {
        openAI,
        googleAI,
        anthropicAI,
        openRouterAI
    };
}

// Utility to get the right model instance for streamText
export function getProviderModel(model: string, providers: ReturnType<typeof initializeProviders>) {
    const modelConfig = Models.find(m => m.model === model);
    if (!modelConfig) throw new Error(`Model ${model} not supported`);
    switch (modelConfig.provider) {
        case "OpenAI":
            return providers.openAI(model);
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

// --- OpenRouter direct streaming helper (bypass ai-sdk) ---
export async function openRouterTextStream(
  model: string,
  messages: { role: string; content: string }[],
) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
