"use client"

import { cn } from "@/lib/utils"
import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ModelSelectorDropdown } from "./ModelSelectorDropdown"
import { type ModelConfig } from "@/lib/AI"
import { ArrowUp } from "lucide-react"

interface ChatInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  currentModel: string
  onModelChange: (model: string) => void
  availableModels?: ModelConfig[]
  fullWidth?: boolean
}

export function ChatInput({ onSubmit, isLoading, currentModel, onModelChange, availableModels, fullWidth = false }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
      className="bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-md border-t border-border/50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]"
    >
      <div className={cn(fullWidth ? 'max-w-full' : 'max-w-[40%]', 'mx-auto px-3 sm:px-6 py-4')}>
        <form onSubmit={handleSubmit} className="relative">
          <motion.div
            animate={{
              borderColor: isFocused ? 'var(--primary)' : 'var(--border)',
              boxShadow: isFocused ? '0 0 0 1px var(--ring), 0 4px 12px -2px rgba(0,0,0,0.1)' : '0 2px 8px -2px rgba(0,0,0,0.05)'
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex flex-col w-full bg-background/80 border border-border rounded-2xl p-3 shadow-sm backdrop-blur-md transition-all duration-200",
              isFocused && "ring-2 ring-primary/50"
            )}
          >
            <div className="flex w-full items-end gap-3">
              {/* Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none min-h-[40px] max-h-[120px] py-2 px-1 placeholder:text-muted-foreground/50"
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
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
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
                      <ArrowUp className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Footer controls */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground px-1">
              <ModelSelectorDropdown 
                currentModel={currentModel}
                onModelChange={onModelChange}
              />
              <div>
                {/* Placeholder for extra options */}
              </div>
            </div>
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