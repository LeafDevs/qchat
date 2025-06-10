import { Brain, Zap, Globe, MessageSquare, Server, Bot } from "lucide-react"
import OllamaIcon from "./icons/Ollama";
import AnthropicIcon from "./icons/Anthropic";
import OpenAIIcon from "./icons/OpenAI";
import GoogleIcon from "./icons/Google";
import OpenRouterIcon from "./icons/OpenRouter";

export interface ModelProvider {
  name: string
  models: { id: string; name: string }[]
}

// Provider logos/icons
export const ProviderIcon = ({ provider }: { provider: string }) => {
  const iconProps = { className: "w-4 h-4" }
  
  switch (provider.toLowerCase()) {
    case 'openai':
      return <OpenAIIcon className="w-4 h-4" />
    case 'anthropic':
      return <AnthropicIcon className="w-4 h-4" />
    case 'google':
      return <GoogleIcon className="w-4 h-4" />
    case 'openrouter':
      return <OpenRouterIcon className="w-4 h-4" />
    case 'ollama':
      return <OllamaIcon className="w-4 h-4"  />
    default:
      return <Bot {...iconProps} />
  }
}

// Format Ollama model names
export const formatModelName = (modelName: string, provider: string) => {
  if (provider.toLowerCase() === 'ollama') {
    // Remove 'ollama:' prefix if present
    const name = modelName.replace(/^ollama:/, '')
    
    // Common model name formatting
    return name
      .split(/[-_:]/)
      .map(part => {
        // Special cases for common models
        if (part.toLowerCase() === 'llama') return 'Llama'
        if (part.toLowerCase() === 'phi') return 'Phi'
        if (part.toLowerCase() === 'qwen') return 'Qwen'
        if (part.toLowerCase() === 'gemma') return 'Gemma'
        if (part.toLowerCase() === 'mistral') return 'Mistral'
        if (part.toLowerCase() === 'codellama') return 'CodeLlama'
        if (part.toLowerCase() === 'deepseek') return 'DeepSeek'
        if (part.toLowerCase() === 'nomic') return 'Nomic'
        if (part.match(/^\d/)) return part // Keep version numbers as-is
        if (part === 'b' || part === 'B') return 'B' // For model sizes like 7B, 13B
        
        // Capitalize first letter of other parts
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      })
      .join(' ')
  }
  
  return modelName
}

// Default providers configuration
export const DEFAULT_PROVIDERS: ModelProvider[] = [
  {
    name: 'OpenAI',
    models: [
      { id: 'openai:gpt-4o', name: 'GPT-4o' },
      { id: 'openai:gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'openai:gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'openai:gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ]
  },
  {
    name: 'Anthropic',
    models: [
      { id: 'anthropic:claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic:claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'anthropic:claude-3-haiku', name: 'Claude 3 Haiku' },
      { id: 'anthropic:claude-3-opus', name: 'Claude 3 Opus' },
    ]
  },
  {
    name: 'Google',
    models: [
      { id: 'google:gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'google:gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'google:gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
    ]
  },
  {
    name: 'OpenRouter',
    models: [
      { id: 'openrouter:anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openrouter:openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openrouter:google/gemini-pro', name: 'Gemini Pro' },
      { id: 'openrouter:meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
      { id: 'openrouter:mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
    ]
  },
  {
    name: 'Ollama',
    models: []
  }
] 