"use client"

import { cn } from "@/lib/utils"
import React, { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DEFAULT_PROVIDERS, type ModelProvider } from "./ProviderIcons"
import { ModelSelectorDropdown } from "./ModelSelectorDropdown"

interface ChatInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  currentModel: string
  onModelChange: (model: string) => void
}

export function ChatInput({ onSubmit, isLoading, currentModel, onModelChange }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [providers, setProviders] = useState<ModelProvider[]>(DEFAULT_PROVIDERS)
  
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
        
        setProviders(prev => 
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



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    onSubmit(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])



  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="border-t bg-background/80 backdrop-blur-sm sticky bottom-0"
    >
      <div className="max-w-full sm:max-w-6xl mx-auto px-3 sm:px-6 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <motion.div
            animate={{
              borderColor: isFocused ? 'rgb(59 130 246)' : 'transparent',
              boxShadow: isFocused ? '0 0 0 1px rgb(59 130 246 / 0.3)' : 'none'
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-end gap-2 bg-muted/50 rounded-lg p-2 transition-all duration-200",
              isFocused && "bg-muted/70"
            )}
          >
            {/* Model Selector */}
            <ModelSelectorDropdown 
              currentModel={currentModel}
              onModelChange={onModelChange}
              providers={providers}
            />

            {/* Input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none min-h-[32px] max-h-[120px] py-1 placeholder:text-muted-foreground/60"
              disabled={isLoading}
              rows={1}
            />

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 self-end",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                  />
                ) : (
                  <motion.span
                    key="send"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    Send
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </form>
        
        {/* Mobile hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground mt-2 text-center sm:hidden"
        >
          Tap Send or press Enter to send • Shift+Enter for new line
        </motion.p>
      </div>
    </motion.div>
  )
} 