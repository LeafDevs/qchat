import { Message as MessageType } from '@/types/db';
import { ReasoningBlock } from './ReasoningBlock';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const content = message.content || '';

  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'bg-muted/50' : '')}>
      <Avatar className="h-8 w-8">
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="prose dark:prose-invert">
          {content.includes('<think>') && <ReasoningBlock content={content} />}
          <div className="whitespace-pre-wrap">
            {content.replace(/<think>[\s\S]*?<\/think>/, '')}
          </div>
        </div>
      </div>
    </div>
  );
} 