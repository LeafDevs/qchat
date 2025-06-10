'use client'

import { ChatMessages, ChatInput } from "@/components/Chat";
import { type Message } from "@/components/ChatMessage";
import { useState, useEffect } from "react";
import { AI } from "@/lib/AI";

export function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentModel, setCurrentModel] = useState('openai:gpt-4o-mini')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [ai] = useState(() => new AI())

  // Helper function to parse model ID and configure AI
  const configureAI = (modelId: string) => {
    // Parse provider:model format (e.g., "openai:gpt-4o-mini", "ollama:llama2:7b-chat")
    const parts = modelId.split(':')
    const provider = parts[0] || 'OpenAI'
    const model = parts.slice(1).join(':') || 'gpt-4o-mini'
    
    // Map provider names to match AI class expectations
    const providerMap: { [key: string]: string } = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic', 
      'google': 'Google',
      'ollama': 'Ollama',
      'openrouter': 'OpenRouter'
    }
    
    const mappedProvider = providerMap[provider.toLowerCase()] || provider
    
    ai.setProvider(mappedProvider)
    ai.setModel(model)
    
    return { provider: mappedProvider, model }
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Create initial assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString()
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, initialAssistantMessage])
    setIsLoading(false) // Set loading to false since we're now streaming
    setIsStreaming(true)

    try {
      // Configure AI with current model
      const { provider, model } = configureAI(currentModel)
      
      let streamingContent = ''
      
      // Send message to AI with streaming callback
      await ai.sendMessage(content, undefined, (chunk: string) => {
        streamingContent += chunk
        
        // Update the assistant message with new content
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: streamingContent }
              : msg
          )
        )
      })
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Sorry, I encountered an error while processing your message. Please try again.

**Error details:** ${error instanceof Error ? error.message : 'Unknown error'}

This might be due to:
- Network connectivity issues
- API key not configured
- Model not available
- Server temporarily unavailable`,
        role: 'assistant',
        timestamp: new Date()
      }
      
      // Replace the streaming message with error message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId ? errorMessage : msg
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleRetry = async (messageId: string, newModel?: string) => {
    // Find the message being retried
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    // Update current model if a new one was selected
    const modelToUse = newModel || currentModel
    if (newModel) {
      setCurrentModel(newModel)
    }

    // Remove all messages after the retried message
    const updatedMessages = messages.slice(0, messageIndex)
    setMessages(updatedMessages)
    
    // Get the previous user message to retry
    const userMessage = updatedMessages[updatedMessages.length - 1]
    if (userMessage && userMessage.role === 'user') {
      // Create initial assistant message for streaming
      const assistantMessageId = Date.now().toString()
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, initialAssistantMessage])
      setIsStreaming(true)
      
      try {
        // Configure AI with the model to use for retry
        const { provider, model } = configureAI(modelToUse)
        
        let streamingContent = ''
        
        // Send message to AI with streaming callback
        await ai.sendMessage(userMessage.content, undefined, (chunk: string) => {
          streamingContent += chunk
          
          // Update the assistant message with new content
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: streamingContent }
                : msg
            )
          )
        })
        
      } catch (error) {
        console.error('Error retrying message:', error)
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: `Sorry, I encountered an error while retrying your message. Please try again.

**Error details:** ${error instanceof Error ? error.message : 'Unknown error'}

This might be due to:
- Network connectivity issues
- API key not configured  
- Model not available
- Server temporarily unavailable`,
          role: 'assistant',
          timestamp: new Date()
        }
        
        // Replace the streaming message with error message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId ? errorMessage : msg
                     )
         )
       } finally {
         setIsStreaming(false)
       }
     }
   }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatMessages 
        messages={messages} 
        isLoading={isLoading} 
        isStreaming={isStreaming}
        onRetry={handleRetry}
      />
      <ChatInput 
        onSubmit={handleSendMessage} 
        isLoading={isLoading}
        currentModel={currentModel}
        onModelChange={setCurrentModel}
      />
    </div>
  )
} 