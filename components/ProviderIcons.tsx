import { Brain, Zap, Globe, MessageSquare, Server, Bot } from "lucide-react"
import OllamaIcon from "./icons/Ollama";
import AnthropicIcon from "./icons/Anthropic";
import OpenAIIcon from "./icons/OpenAI";
import GoogleIcon from "./icons/Google";
import OpenRouterIcon from "./icons/OpenRouter";

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