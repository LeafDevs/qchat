'use client'

import { Calendar, CreditCard, Home, Inbox, LogOut, MessageSquare, Search, Settings, User } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"

// Menu items.
const chats = [
    { title: "Chat 1", url: "/chat/1", lastUsed: "2025-03-15" },
    { title: "Chat 2", url: "/chat/2", lastUsed: "2025-03-18" },
    { title: "Chat 3", url: "/chat/3", lastUsed: "2025-04-02" },
    { title: "Chat 4", url: "/chat/4", lastUsed: "2025-04-05" },
    { title: "Chat 5", url: "/chat/5", lastUsed: "2025-05-12" },
    { title: "Chat 6", url: "/chat/6", lastUsed: "2025-06-01" },
    { title: "Chat 7", url: "/chat/7", lastUsed: "2025-06-15" },
]

export function AppSidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

  return (
    <Sidebar className="flex flex-col h-full">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-center gap-2 w-full mb-2">
          <p className="text-sm font-medium">QChat</p>
        </div>
        <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground bg-sidebar-accent/10 hover:bg-sidebar-accent/20 rounded-md transition-colors">
          New Chat
        </button>
        <div className="mt-2 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-sidebar-foreground/50" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-7 pr-2 py-1.5 text-xs text-sidebar-foreground bg-transparent border border-sidebar-border rounded-md focus:outline-none focus:ring-1 focus:ring-sidebar-accent/20 focus:border-sidebar-accent/20"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        {(() => {
          const todayChats = chats.filter(chat => {
            const today = new Date()
            const chatDate = new Date(chat.lastUsed)
            return chatDate.toDateString() === today.toDateString()
          })

          const last7DaysChats = chats.filter(chat => {
            const today = new Date()
            const chatDate = new Date(chat.lastUsed)
            const diffTime = Math.abs(today.getTime() - chatDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays <= 7 && diffDays > 0
          })

          const last30DaysChats = chats.filter(chat => {
            const today = new Date()
            const chatDate = new Date(chat.lastUsed)
            const diffTime = Math.abs(today.getTime() - chatDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays <= 30 && diffDays > 7
          })

          const olderChats = chats.filter(chat => {
            const today = new Date()
            const chatDate = new Date(chat.lastUsed)
            const diffTime = Math.abs(today.getTime() - chatDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays > 30
          })

          return (
            <>
              {todayChats.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 px-3 py-1">Today</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {todayChats.map(chat => (
                        <SidebarMenuItem key={chat.url}>
                          <SidebarMenuButton className="px-3 py-1.5 hover:bg-sidebar-accent/10 rounded-md transition-colors">
                            <a href={chat.url} className="text-xs text-sidebar-foreground truncate">{chat.title}</a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {last7DaysChats.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 px-3 py-1">Last 7 Days</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {last7DaysChats.map(chat => (
                        <SidebarMenuItem key={chat.url}>
                          <SidebarMenuButton className="px-3 py-1.5 hover:bg-sidebar-accent/10 rounded-md transition-colors">
                            <a href={chat.url} className="text-xs text-sidebar-foreground truncate">{chat.title}</a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {last30DaysChats.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 px-3 py-1">Last 30 Days</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {last30DaysChats.map(chat => (
                        <SidebarMenuItem key={chat.url}>
                          <SidebarMenuButton className="px-3 py-1.5 hover:bg-sidebar-accent/10 rounded-md transition-colors">
                            <a href={chat.url} className="text-xs text-sidebar-foreground truncate">{chat.title}</a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {olderChats.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 px-3 py-1">Older</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {olderChats.map(chat => (
                        <SidebarMenuItem key={chat.url}>
                          <SidebarMenuButton className="px-3 py-1.5 hover:bg-sidebar-accent/10 rounded-md transition-colors">
                            <a href={chat.url} className="text-xs text-sidebar-foreground truncate">{chat.title}</a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )
        })()}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 w-full hover:bg-sidebar-accent/10 rounded-md p-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="relative w-6 h-6 rounded-full bg-sidebar-accent/10 overflow-hidden ring-1 ring-sidebar-accent/20 hover:ring-sidebar-accent/40 transition-all duration-200">
              <img 
                src="https://github.com/shadcn.png" 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-sidebar-foreground truncate">user@example.com</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Free Plan</p>
            </div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full right-0 mb-2 w-48 bg-sidebar dark:bg-sidebar rounded-lg shadow-xl border border-sidebar-border p-1 z-50"
              >
                <div className="flex flex-col">
                  <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground rounded-md hover:bg-sidebar-accent/10 transition-colors">
                    <User className="h-3 w-3" />
                    <span>Account</span>
                  </button>
                  <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground rounded-md hover:bg-sidebar-accent/10 transition-colors">
                    <CreditCard className="h-3 w-3" />
                    <span>Billing</span>
                  </button>
                  <div className="h-px bg-sidebar-border my-1" />
                  <button className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="h-3 w-3" />
                    <span>Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}