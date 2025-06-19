'use client';

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/UserSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsButton, SplitViewButton } from "@/components/Options";
import { ChatInput } from "@/components/ChatInput";
import { ChatProvider, useChat } from "@/lib/chat-context";
import { useState, useCallback, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/utils";

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";
  const isSettingsPage = pathname === "/settings";
  const isSplitChatPage = pathname.startsWith("/chat/split");
  const isChatPage = pathname === "/" || pathname.startsWith("/chat/");
  const { currentModel, setCurrentModel, isLoading, handleSendMessage } = useChat();
  const [splitModalOpen, setSplitModalOpen] = useState(false);

  // Hotkey: Ctrl+B to open split modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setSplitModalOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isSplitChatPage) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [isSplitChatPage]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider className="h-full flex flex-1 min-h-0">
      <AppSidebar />
      
      <SidebarInset className={cn('flex flex-col h-full min-h-0', isSplitChatPage && 'overflow-hidden')}>
        <header className="sticky top-0 left-0 right-0 z-20 flex h-12 items-center justify-between bg-transparent px-3">
          <SidebarTrigger className="-ml-1 h-8 w-8" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SplitViewButton onClick={() => setSplitModalOpen(true)} />
            <SettingsButton />
          </div>
        </header>
        {splitModalOpen && <SplitViewModal onClose={() => setSplitModalOpen(false)} />}
        <main className={cn('flex-1 min-h-0 h-full', isSplitChatPage ? 'overflow-hidden' : 'overflow-y-auto')}>
          {children}
        </main>
        {isChatPage && !isSplitChatPage && (
          <div className="sticky bottom-0 left-0 right-0 z-20">
            <ChatInput 
              onSubmit={handleSendMessage}
              isLoading={isLoading}
              currentModel={currentModel}
              onModelChange={setCurrentModel}
            />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </ChatProvider>
  );
}

// Modal with chat selection, search, pagination, and new chat creation
function SplitViewModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const pageSize = 8;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch(`/api/chat/list?userId=${session.user.id}`)
      .then(res => res.json())
      .then(data => setChats(data))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const filteredChats = chats.filter(chat =>
    (chat.title || chat.lastMessage || "").toLowerCase().includes(search.toLowerCase())
    || chat.id.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredChats.length / pageSize) || 1;
  const pagedChats = filteredChats.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    setSelected(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : sel.length < 3 ? [...sel, id] : sel
    );
  };

  const handleOpen = () => {
    if (selected.length > 0) {
      onClose();
      router.push(`/chat/split?chats=${selected.join(",")}`);
    }
  };

  const handleCreate = async () => {
    if (!session?.user?.id) return;
    setCreating(true);
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.user.id })
    });
    const data = await res.json();
    setCreating(false);
    if (data.chatId) {
      setSelected(sel => sel.length < 3 ? [...sel, data.chatId] : sel);
      // Refetch chats
      fetch(`/api/chat/list?userId=${session.user.id}`)
        .then(res => res.json())
        .then(data => setChats(data));
    }
  };

  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-lg p-6 min-w-[350px] max-w-[95vw] w-full sm:w-[420px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Open Split View</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            className="flex-1 px-3 py-2 border rounded bg-muted/30 focus:outline-none"
            placeholder="Search chats..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <button
            className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-60"
            onClick={handleCreate}
            disabled={creating || selected.length >= 3}
            title="Create new chat"
          >
            {creating ? '...' : 'New'}
          </button>
        </div>
        <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
          <span>Select up to 3 chats</span>
          {selected.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
              <span>Selected: {selected.length}</span>
              <span className="text-lg leading-none">✓</span>
            </span>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto border rounded divide-y divide-border bg-muted/10 mb-3">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : pagedChats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No chats found.</div>
          ) : pagedChats.map(chat => (
            <label key={chat.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors">
              <input
                type="checkbox"
                checked={selected.includes(chat.id)}
                onChange={() => toggleSelect(chat.id)}
                disabled={!selected.includes(chat.id) && selected.length >= 3}
                className="accent-primary w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-sm">{chat.title || chat.lastMessage || 'New Chat'}</div>
                <div className="truncate text-xs text-muted-foreground">{chat.id}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded text-xs bg-muted/50 hover:bg-muted/80"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >Prev</button>
            <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
            <button
              className="px-2 py-1 rounded text-xs bg-muted/50 hover:bg-muted/80"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >Next</button>
          </div>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-60"
            disabled={selected.length === 0}
            onClick={handleOpen}
          >Open in Split</button>
        </div>
      </div>
    </div>
  );
} 