'use client'

import { LogOut, MessageSquare, Plus, User, Trash2, MoreVertical } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "@/lib/auth-client"
import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Chat {
  id: string;
  model: string;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt: string;
}

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const user = session?.user;
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeChatId = params?.id as string;

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchChats = async () => {
      try {
        const response = await fetch(`/api/chat/list?userId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch chats');
        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const handleNewChat = async () => {
    try {
      if (!user?.id) return;
      
      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          model: 'gpt-4' // Default model, can be changed later
        })
      });

      if (!response.ok) throw new Error('Failed to create chat');
      
      const { chatId } = await response.json();
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/chat/delete?chatId=${chatId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete chat');
      
      // Remove the chat from the local state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      
      // If we're currently on the deleted chat, redirect to home
      if (chatId === activeChatId) {
        router.push('/');
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Group chats by last used time
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayChats = chats.filter(chat => {
    const chatDate = new Date(chat.lastMessageTime || chat.updatedAt).toISOString().split('T')[0];
    return chatDate === today;
  });
  const last7DaysChats = chats.filter(chat => {
    const chatDate = new Date(chat.lastMessageTime || chat.updatedAt).toISOString().split('T')[0];
    return chatDate < today && chatDate >= sevenDaysAgo;
  });
  const last30DaysChats = chats.filter(chat => {
    const chatDate = new Date(chat.lastMessageTime || chat.updatedAt).toISOString().split('T')[0];
    return chatDate < sevenDaysAgo && chatDate >= thirtyDaysAgo;
  });
  const olderChats = chats.filter(chat => {
    const chatDate = new Date(chat.lastMessageTime || chat.updatedAt).toISOString().split('T')[0];
    return chatDate < thirtyDaysAgo;
  });

  const renderChatItem = (chat: Chat) => (
    <Link
      key={chat.id}
      href={`/chat/${chat.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors group",
        activeChatId === chat.id
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate">{chat.lastMessage || 'New Chat'}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(chat.lastMessageTime || chat.updatedAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => handleDeleteChat(chat.id, e)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );

  return (
    <Sidebar>
      <SidebarHeader className="sticky top-0 z-10 border-b border-sidebar-border p-3 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-medium">QChat</h1>
            <p className="text-xs text-sidebar-foreground/60">AI Chat Application</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleNewChat}
                  className="w-full px-3 py-2 rounded-lg transition-all duration-200 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-sidebar-foreground flex items-center gap-2.5 shadow-sm hover:shadow-md border border-primary/10 hover:border-primary/20 group"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="truncate flex-1 font-medium">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading chats...
          </div>
        ) : (
          <>
            {todayChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Today</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {todayChats.map(renderChatItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {last7DaysChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Last 7 Days</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {last7DaysChats.map(renderChatItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {last30DaysChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Last 30 Days</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {last30DaysChats.map(renderChatItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {olderChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Older</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {olderChats.map(renderChatItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {chats.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chats yet. Start a new conversation!
              </div>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 w-full hover:bg-sidebar-accent/10 rounded-md p-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="relative w-6 h-6 rounded-full bg-sidebar-accent/10 overflow-hidden ring-1 ring-sidebar-accent/20 hover:ring-sidebar-accent/40 transition-all duration-200">
              {user?.image ? (
                <img 
                  src={user.image} 
                  alt={user.name || 'User'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-0 mb-2 w-full bg-sidebar border border-sidebar-border rounded-md shadow-lg overflow-hidden"
              >
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full p-2 text-sm hover:bg-sidebar-accent/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}