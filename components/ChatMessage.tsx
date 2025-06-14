"use client"

import { User, Bot, Copy, Check, MoreHorizontal, Brain } from "lucide-react"
import { ProviderIcon } from "./ProviderIcons"
import { cn } from "@/lib/utils"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import React, { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { RetryDropdown } from "./RetryDropdown"
import { ModelProviders } from "@/lib/AI"
import { useSession } from "@/lib/auth-client"

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  thinking?: string // For thinking models like o1
  model?: string
}

interface ChatMessageProps {
  message: Message
  isLast?: boolean
  onRetry?: (messageId: string, newModel?: string) => void
  modelName: string
  provider: string
}

export function ChatMessage({ message, isLast, onRetry, modelName, provider }: ChatMessageProps) {
  const { theme } = useTheme()
  const session = useSession().data
  const userName = session?.user?.name || 'You'
  const userImage = session?.user?.image
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [showThinking, setShowThinking] = useState(true) // Default to true to show thinking initially
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Extract thinking content from message
  const thinkingMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
  const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : '';
  const displayContent = message.content.replace(/<think>[\s\S]*?<\/think>/, '');

  const copyToClipboard = async (text: string, type: 'code' | 'message' = 'code') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'code') {
        setCopiedCode(text)
        setTimeout(() => setCopiedCode(null), 2000)
      } else {
        setCopiedMessage(true)
        setTimeout(() => setCopiedMessage(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleRetry = (newModel?: string) => {
    if (onRetry) {
      onRetry(message.id, newModel)
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "group px-3 sm:px-6 py-2 sm:py-3 transition-colors duration-200",
        isLast && "mb-2"
      )}
    >
      {/* Rest of the component remains unchanged */}
      <div className="max-w-full sm:max-w-6xl mx-auto">
        <div className={cn(
          "flex gap-3 sm:gap-4 rounded-lg p-2 sm:p-3 transition-colors duration-200",
          message.role === 'user' 
            ? "bg-transparent hover:bg-muted/20" 
            : "bg-muted/30 hover:bg-muted/40"
        )}>
          {/* Avatar section */}
          <div className="flex-shrink-0">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-muted/30"
            >
              {message.role === 'user' ? (
                userImage ? (
                  <img src={userImage} alt={userName} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                )
              ) : (
                <ProviderIcon provider={provider} />
              )}
            </motion.div>
          </div>
          
          {/* Message content section */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Header with role and timestamp */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {message.role === 'user' ? userName : modelName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            {/* Thinking section */}
            {thinkingContent && (
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30 transition-colors mb-2 w-fit"
              >
                <Brain className="w-3 h-3" />
                <span>{showThinking ? 'Hide thinking' : 'Show Thinking...'}</span>
              </button>
            )}
            
            {thinkingContent && showThinking && (
              <div className="mb-3 border-l-4 border-muted-foreground/30 pl-4 py-2 bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-xs font-medium text-muted-foreground/80">Thinking</span>
                </div>
                <div className="text-sm text-muted-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p]:mb-2 [&>p]:leading-relaxed italic">
                  {thinkingContent.split('\n').map((line, index) => (
                    <div key={index} className="flex">
                      <span className="flex-1">{line || '\u00A0'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message content section */}
            <div className="relative">
              {/* Loading indicators */}
              {message.role === 'assistant' && !displayContent && !thinkingContent && (
                <div className="flex items-center gap-1 py-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
                  />
                  <span className="text-xs text-muted-foreground ml-2">thinking...</span>
                </div>
              )}

              {/* Deep thinking indicator */}
              {message.role === 'assistant' && !displayContent && thinkingContent && (
                <div className="flex items-center gap-1 py-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 rounded-full bg-orange-500/20 flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  </motion.div>
                  <span className="text-xs text-muted-foreground ml-2">deep thinking...</span>
                  {thinkingContent && (
                    <button
                      onClick={() => setShowThinking(!showThinking)}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 px-2 py-0.5 rounded-md hover:bg-orange-500/10 transition-colors ml-2"
                    >
                      <Brain className="w-2.5 h-2.5" />
                      <span>{showThinking ? 'Hide thinking' : 'Show Thinking...'}</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* Message content */}
              {displayContent && (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p]:leading-relaxed break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const codeContent = String(children).replace(/\n$/, '')
                      
                      if (!inline && match) {
                        return (
                          <div className="relative group/code my-4 max-w-full overflow-hidden">
                            <div className="flex items-center justify-between bg-muted/80 px-3 sm:px-4 py-2 rounded-t-lg border-b border-border/50">
                              <span className="text-xs font-medium text-muted-foreground">
                                {match[1]}
                              </span>
                              <button
                                onClick={() => copyToClipboard(codeContent, 'code')}
                                className="opacity-0 group-hover/code:opacity-100 transition-opacity p-1 hover:bg-background/80 rounded text-xs"
                              >
                                {copiedCode === codeContent ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <SyntaxHighlighter
                                style={theme === 'dark' ? vscDarkPlus : oneLight}
                                language={match[1]}
                                PreTag="div"
                                className="!mt-0 !rounded-t-none !border-t-0 text-xs sm:text-sm"
                                customStyle={{
                                  margin: 0,
                                  borderTopLeftRadius: 0,
                                  borderTopRightRadius: 0,
                                  fontSize: window.innerWidth < 640 ? '12px' : '14px',
                                }}
                                {...props}
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-all" {...props}>
                          {children}
                        </code>
                      )
                    },
                    p: ({ children }) => (
                      <p className="mb-3 last:mb-0 leading-relaxed text-sm sm:text-base">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-3 text-sm sm:text-base">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-3 text-sm sm:text-base">{children}</ol>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-muted-foreground/20 pl-3 sm:pl-4 italic my-3 text-muted-foreground text-sm sm:text-base">
                        {children}
                      </blockquote>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-base sm:text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm sm:text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs sm:text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h3>
                    ),
                  }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )}
              
              {/* Action Buttons - Show only when there's content */}
              {displayContent && (
                <div className="flex items-center gap-0.5 mt-1 pt-0.5">
                  <button
                    onClick={() => copyToClipboard(displayContent, 'message')}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                    title="Copy message"
                  >
                    {copiedMessage ? (
                      <Check className="w-2.5 h-2.5 text-green-500" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  
                  {message.role === 'assistant' && (
                    <RetryDropdown onRetry={handleRetry} />
                  )}
                  <button
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                    title="More actions"
                  >
                    <span className="hidden sm:inline">More</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 