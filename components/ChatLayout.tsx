'use client'

import { ChatMessages, ChatInput } from "@/components/Chat";
import { type Message } from "@/components/ChatMessage";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";

interface ChatLayoutProps {
  initialChatId?: string;
  initialMessages?: Message[];
}

export function ChatLayout({ initialChatId, initialMessages = [] }: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [currentModel, setCurrentModel] = useState('gpt-4.1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(initialChatId || null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const lastContentRef = useRef<{ [key: string]: string }>({})

  const { data: session } = useSession()
  const userId = session?.user?.id

  const providerName = currentModel.split('-')[0].toLowerCase() || 'openai';

  const handleSendMessage = async (messageContent: string) => {
    if (!userId) {
      setError("You must be signed in to chat.")
      return
    }

    let activeChatId = chatId
    if (!activeChatId) {
      // Create a new chat
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, model: currentModel }),
      })
      const data = await res.json()
      activeChatId = data.chatId
      setChatId(activeChatId)
    }

    try {
      setError(null)
      setIsLoading(true)

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
        model: currentModel
      }
      setMessages(prev => [...prev, userMessage])

      // Create initial assistant message
      const assistantMessageId = crypto.randomUUID();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: '',
        model: currentModel
      }
      setMessages(prev => [...prev, initialAssistantMessage])
      setStreamingMessageId(assistantMessageId)
      lastContentRef.current[assistantMessageId] = '';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: currentModel,
          prompt: messageContent,
          chatId: activeChatId,
          userId,
          messageId: assistantMessageId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        assistantResponse += text;
        lastContentRef.current[assistantMessageId] = assistantResponse;
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
            ? { ...msg, content: assistantResponse }
          : msg
        ));
      }

      setStreamingMessageId(null);
    } catch (error) {
      console.error('Error in chat:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (originalAssistantId: string, newModel?: string) => {
    // Find prompt before the selected assistant message
    const index = messages.findIndex(m => m.id === originalAssistantId);
    if (index === -1) return;
    const promptMessage = messages.slice(0, index).reverse().find(m => m.role === 'user');
    if (!promptMessage) return;

    const modelToUse = newModel || currentModel;

    // Create a new assistant message placeholder
    const retryAssistantId = crypto.randomUUID();
    const placeholder: Message = {
      id: retryAssistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: modelToUse
    };

    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs.splice(index + 1, 0, placeholder);
      return newMsgs;
    });
    setStreamingMessageId(retryAssistantId);
    lastContentRef.current[retryAssistantId] = '';

    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt: promptMessage.content,
          chatId: chatId,
          userId,
          messageId: retryAssistantId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      let assistantResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        assistantResponse += text;
        lastContentRef.current[retryAssistantId] = assistantResponse;
        setMessages(prev => prev.map(m => m.id === retryAssistantId ? { ...m, content: assistantResponse } : m));
      }
      setStreamingMessageId(null);
    } catch (err) {
      console.error('Retry error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="flex-1 p-4 min-h-0">
        <ChatMessages 
          messages={messages} 
          isLoading={isLoading}
          isStreaming={!!streamingMessageId}
          onRetry={handleRetry}
          modelName={currentModel}
          provider={providerName as string}
        />
      </div>
      
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            currentModel={currentModel}
            onModelChange={setCurrentModel}
          />
        </div>
      </div>
    </div>
  )
} 