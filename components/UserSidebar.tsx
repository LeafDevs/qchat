'use client'

import { Calendar, CreditCard, Home, Inbox, LogOut, MessageSquare, Plus, Search, Settings, User } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "@/lib/auth-client"
import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { db } from "@/lib/db"
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
import { ProviderIcon } from "./ProviderIcons"
import { cn } from "@/lib/utils"

interface Chat {
  id: string;
  model: string;
  lastMessage: string;
  lastMessageTime: string;
  createdAt: string;
  updatedAt: string;
}

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useSession().data?.user;
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname();
  const activeChatId = pathname?.startsWith('/chat/') ? pathname.split('/chat/')[1] : null;

  useEffect(() => {
    if (user?.id) {
      fetchChats();
    }
  }, [user?.id]);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/chat/list?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleNewChat = () => {
    router.push('/');
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
                    {todayChats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <Link
                          href={`/chat/${chat.id}`}
                          className={
                            cn(
                              "block w-full px-2 py-1 rounded-md transition-colors",
                              activeChatId === chat.id
                                ? "bg-sidebar-accent/20 text-foreground"
                                : "hover:bg-sidebar-accent/10 text-sidebar-foreground"
                            )
                          }
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ProviderIcon provider={chat.model.split('/')[0].toLowerCase()} />
                            <span className="truncate flex-1">{chat.lastMessage || 'New Chat'}</span>
                            <span className="text-xs text-muted-foreground">{chat.model}</span>
                          </div>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {last7DaysChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Last 7 Days</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {last7DaysChats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <Link
                          href={`/chat/${chat.id}`}
                          className={
                            cn(
                              "block w-full px-2 py-1 rounded-md transition-colors",
                              activeChatId === chat.id
                                ? "bg-sidebar-accent/20 text-foreground"
                                : "hover:bg-sidebar-accent/10 text-sidebar-foreground"
                            )
                          }
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ProviderIcon provider={chat.model.split('/')[0].toLowerCase()} />
                            <span className="truncate flex-1">{chat.lastMessage || 'New Chat'}</span>
                            <span className="text-xs text-muted-foreground">{chat.model}</span>
                          </div>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {last30DaysChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Last 30 Days</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {last30DaysChats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <Link
                          href={`/chat/${chat.id}`}
                          className={
                            cn(
                              "block w-full px-2 py-1 rounded-md transition-colors",
                              activeChatId === chat.id
                                ? "bg-sidebar-accent/20 text-foreground"
                                : "hover:bg-sidebar-accent/10 text-sidebar-foreground"
                            )
                          }
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ProviderIcon provider={chat.model.split('/')[0].toLowerCase()} />
                            <span className="truncate flex-1">{chat.lastMessage || 'New Chat'}</span>
                            <span className="text-xs text-muted-foreground">{chat.model}</span>
                          </div>
                        </Link>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {olderChats.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="uppercase text-[11px] tracking-wider text-muted-foreground/70 px-3 py-1">Older</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {olderChats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <Link
                          href={`/chat/${chat.id}`}
                          className={
                            cn(
                              "block w-full px-2 py-1 rounded-md transition-colors",
                              activeChatId === chat.id
                                ? "bg-sidebar-accent/20 text-foreground"
                                : "hover:bg-sidebar-accent/10 text-sidebar-foreground"
                            )
                          }
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ProviderIcon provider={chat.model.split('/')[0].toLowerCase()} />
                            <span className="truncate flex-1">{chat.lastMessage || 'New Chat'}</span>
                            <span className="text-xs text-muted-foreground">{chat.model}</span>
                          </div>
                        </Link>
                      </SidebarMenuItem>
                    ))}
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