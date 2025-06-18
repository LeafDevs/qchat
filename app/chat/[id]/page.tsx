import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ChatLayout } from '@/components/ChatLayout';

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    redirect('/auth');
  }

  const { id: chatId } = await params;
  
  if (!chatId) {
    redirect('/');
  }

  // Fetch chat and messages
  const chat = await db.get(
    'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
    [chatId, session.user.id]
  );

  if (!chat) {
    redirect('/');
  }

  const messages = await db.all(
    'SELECT * FROM message WHERE chatId = ? ORDER BY createdAt ASC',
    [chatId]
  );

  // Transform messages to include timestamp
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    thinking: msg.thinking || undefined
  }));

  return (
    <ChatLayout 
      initialChatId={chatId}
      initialMessages={formattedMessages} 
    />
  );
}