import { ChatLayout } from '@/components/ChatLayout';
import { ChatProvider } from '@/lib/chat-context';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import SplitChatColumn from '@/components/SplitChatColumn';

// Next.js app directory: searchParams is always an object, not a Promise, unless using generateMetadata or generateStaticParams
// But let's be defensive and support both

type SplitChatPageProps = { searchParams?: { chats?: string } } | Promise<{ searchParams?: { chats?: string } }>;

export default async function SplitChatPage(props: SplitChatPageProps) {
  // Await if props is a Promise
  const resolvedProps = await props;
  const searchParams = await resolvedProps.searchParams || {};

  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/auth');
  }

  const chatIds: string[] = (searchParams.chats || '').split(',').filter(Boolean).slice(0, 3);

  // Fetch chat and messages for each chatId
  const chatData = await Promise.all(
    chatIds.map(async (chatId: string) => {
      if (!chatId) return null;
      const chat = await db.get(
        'SELECT * FROM chat WHERE id = ? AND createdBy = ?',
        [chatId, session.user.id]
      );
      if (!chat) return null;
      const messages = await db.all(
        'SELECT * FROM message WHERE chatId = ? ORDER BY createdAt ASC',
        [chatId]
      );
      const formattedMessages = messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        thinking: msg.thinking || undefined
      }));
      return { chatId, messages: formattedMessages, isBranched: !!chat.parentChatId };
    })
  );

  // Only show on desktop
  return (
    <div className="hidden lg:flex flex-1 h-full w-full">
      {chatData.map((data: any, idx: number) =>
        data ? (
          <div key={data.chatId} className="flex-1 h-full min-h-0 border-r last:border-r-0 border-border min-w-0">
            <SplitChatColumn initialChatId={data.chatId} initialMessages={data.messages} isBranched={data.isBranched} />
          </div>
        ) : (
          <div key={idx} className="flex-1 h-full min-h-0 flex items-center justify-center text-muted-foreground border-r last:border-r-0 border-border">
            <span>No chat</span>
          </div>
        )
      )}
    </div>
  );
} 