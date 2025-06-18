'use client';

import { createContext, useContext, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { type Message } from '@/components/ChatMessage';
import { useSession } from '@/lib/auth-client';

interface ChatContextType {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  currentModel: string;
  setCurrentModel: (model: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  handleSendMessage: (message: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentModel, setCurrentModel] = useState('gpt-4.1');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!userId) {
      console.error("You must be signed in to chat.");
      return;
    }

    let activeChatId = chatId;
    if (!activeChatId) {
      // Create a new chat
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, model: currentModel }),
      });
      const data = await res.json();
      activeChatId = data.chatId;
      setChatId(activeChatId);
    }

    try {
      setIsLoading(true);

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
        model: currentModel
      };
      setMessages(prev => [...prev, userMessage]);

      // Create initial assistant message
      const assistantMessageId = crypto.randomUUID();
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: '',
        model: currentModel
      };
      setMessages(prev => [...prev, initialAssistantMessage]);

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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        assistantResponse += text;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: assistantResponse }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error in chat:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentModel, chatId]);

  return (
    <ChatContext.Provider value={{
      messages,
      setMessages,
      currentModel,
      setCurrentModel,
      isLoading,
      setIsLoading,
      handleSendMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 