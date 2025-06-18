'use client'

import { ChatMessages } from "@/components/Chat";
import { type Message } from "@/components/ChatMessage";
import { useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useChat } from "@/lib/chat-context";

interface ChatLayoutProps {
  initialChatId?: string;
  initialMessages?: Message[];
}

export function ChatLayout({ initialChatId, initialMessages = [] }: ChatLayoutProps) {
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(initialChatId || null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const lastContentRef = useRef<{ [key: string]: string }>({})

  const { data: session } = useSession()
  const userId = session?.user?.id
  const { messages, setMessages, currentModel, isLoading, setIsLoading } = useChat()

  // Initialize messages from props
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const providerName = currentModel.split('-')[0].toLowerCase() || 'openai';

  const handleRetry = async (originalAssistantId: string, newModel?: string) => {
    // Find prompt before the selected assistant message
    const index = messages.findIndex(m => m.id === originalAssistantId);
    if (index === -1) return;
    const promptMessage = messages.slice(0, index).reverse().find(m => m.role === 'user');
    if (!promptMessage) return;

    const modelToUse = newModel || currentModel;

    // Store the current content as previous content
    const currentMessage = messages[index];
    const updatedMessage: Message = {
      ...currentMessage,
      previousContent: currentMessage.content,
      content: '',
      model: modelToUse
    };

    setMessages((prev: Message[]) => {
      const newMsgs = [...prev];
      newMsgs[index] = updatedMessage;
      return newMsgs;
    });
    setStreamingMessageId(originalAssistantId);
    lastContentRef.current[originalAssistantId] = '';

    try {
      setError(null);
      setIsLoading(true);

      const response = await fetch('/api/chat/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messageId: originalAssistantId,
          chatId: chatId,
          userId,
          prompt: promptMessage.content
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
        lastContentRef.current[originalAssistantId] = assistantResponse;
        setMessages((prev: Message[]) => 
          prev.map((m: Message) => m.id === originalAssistantId ? { ...m, content: assistantResponse } : m)
        );
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
    </div>
  )
} 