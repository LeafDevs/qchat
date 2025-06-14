import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ChatLayout } from '@/components/ChatLayout';

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth');
  }

  // Get chat details and verify ownership
  const chat = await db.get(
    'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
    [id, userId]
  );

  if (!chat) {
    redirect('/');
  }

  // Get messages for this chat
  const messages = await db.all(
    'SELECT * FROM message WHERE chatId = ? ORDER BY createdAt ASC',
    [id]
  );

  return (
    <ChatLayout 
      initialChatId={id}
      initialMessages={messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        thinking: msg.thinking || undefined
      }))}
    />
  );
}