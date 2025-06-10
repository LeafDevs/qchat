"use client"

import { Bot, ArrowDown } from "lucide-react"
import React, { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatMessage, type Message } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { DEFAULT_PROVIDERS, type ModelProvider } from "./ProviderIcons"

// Loading message component
function LoadingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="group px-3 sm:px-6 py-4 sm:py-6"
    >
      <div className="max-w-full sm:max-w-6xl mx-auto">
        <div className="flex gap-3 sm:gap-4 rounded-lg p-3 sm:p-4 bg-muted/30">
          <div className="flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-medium text-sm bg-gradient-to-br from-green-500 to-green-600">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Assistant</span>
              <span className="text-xs text-muted-foreground">typing...</span>
            </div>
            
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-muted-foreground/60 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-muted-foreground/60 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-muted-foreground/60 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  isStreaming?: boolean
  onRetry?: (messageId: string, newModel?: string) => void
  availableModels?: ModelProvider[]
}

export function ChatMessages({ messages, isLoading, isStreaming, onRetry, availableModels }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [internalProviders, setInternalProviders] = useState<ModelProvider[]>(DEFAULT_PROVIDERS)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Fetch Ollama models
  useEffect(() => {
    const fetchOllamaModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags')
        const data = await response.json()
        const ollamaModels = data.models?.map((model: any) => ({
          id: `ollama:${model.name}`,
          name: model.name
        })) || []
        
        setInternalProviders(prev => 
          prev.map(provider => 
            provider.name === 'Ollama' 
              ? { ...provider, models: ollamaModels }
              : provider
          )
        )
      } catch (error) {
        console.warn('Could not fetch Ollama models:', error)
      }
    }
    
    fetchOllamaModels()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScrollToBottom = () => {
    scrollToBottom()
    setIsAtBottom(true) // Manually set to bottom state
  }

  // Check if user is at bottom and update scroll state
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
    
    setIsAtBottom(isNearBottom)
    setShowScrollButton(!isNearBottom && messages.length > 0)
  }

  // Initialize scroll position check on mount
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      handleScroll()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Only auto-scroll when user is at bottom
  useEffect(() => {
    // Auto-scroll only if user is at bottom or if starting a new conversation
    if (isAtBottom || isLoading) {
      scrollToBottom()
    }
  }, [messages, isLoading, isAtBottom])

  // Use provided models or fall back to internal providers
  const modelsToUse = availableModels || internalProviders

  return (
    <div className="relative flex-1">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-behavior-contain h-full"
      >
        <div className="max-w-full sm:max-w-6xl mx-auto">
        {messages.length === 0 && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center h-full text-muted-foreground px-3 sm:px-6"
          >
            <div className="text-center space-y-3 max-w-md">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Bot className="w-12 h-12 mx-auto opacity-50" />
              </motion.div>
              <h3 className="text-lg font-medium">Ready to chat!</h3>
              <p className="text-sm leading-relaxed">
                Send a message to get started. I can help with coding, questions, creative writing, and more.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="pb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <ChatMessage 
                  key={message.id} 
                  message={message}
                  isLast={index === messages.length - 1 && !isLoading}
                  onRetry={onRetry}
                  availableModels={modelsToUse}
                />
              ))}
              {isLoading && <LoadingMessage key="loading" />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </div>
      
      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={handleScrollToBottom}
            className="absolute bottom-4 right-4 bg-background border border-border rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow z-10"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// Export the ChatInput component for use in other files
export { ChatInput } 