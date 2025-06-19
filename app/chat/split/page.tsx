import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import SplitChatColumn from '@/components/SplitChatColumn';

// Props passed to app route pages follow Next.js `PageProps`.
// `searchParams` is already resolved, so we don't need Promise handling.

interface SplitChatPageProps {
  searchParams?: Promise<Record<string, string | string[]>>;
}

export default async function SplitChatPage({ searchParams }: SplitChatPageProps) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/auth');
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  // Extract up to 3 chat IDs from the `chats` query string (comma-separated).
  let chatIds: string[] = [];
  if (resolvedSearchParams && 'chats' in resolvedSearchParams && resolvedSearchParams.chats) {
    const raw = resolvedSearchParams.chats;
    if (typeof raw === 'string') {
      chatIds = raw.split(',');
    } else if (Array.isArray(raw)) {
      // Handle ?chats=1&chats=2 pattern.
      chatIds = raw.flatMap((v) => v.split(','));
    }
    chatIds = chatIds.filter(Boolean).slice(0, 3);
  }

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