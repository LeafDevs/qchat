'use client'

import { ChatProvider, useChat } from '@/lib/chat-context';
import { ChatLayout } from '@/components/ChatLayout';
import { ChatInput } from '@/components/ChatInput';
import { type Message } from '@/components/ChatMessage';

interface SplitChatColumnProps {
  initialChatId: string;
  initialMessages: Message[];
  isBranched: boolean;
}

function ColumnContent({ initialChatId, initialMessages, isBranched }: SplitChatColumnProps) {
  const { currentModel, setCurrentModel, isLoading, handleSendMessage } = useChat();
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat content - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ChatLayout 
          initialChatId={initialChatId}
          initialMessages={initialMessages}
          isBranched={isBranched}
        />
      </div>
      {/* Input fixed at bottom of column */}
      <div className="border-t border-border shrink-0">
        <ChatInput
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          fullWidth
        />
      </div>
    </div>
  );
}

export default function SplitChatColumn(props: SplitChatColumnProps) {
  return (
    <ChatProvider>
      <ColumnContent {...props} />
    </ChatProvider>
  );
} 