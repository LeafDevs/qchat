'use client';

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/UserSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsButton } from "@/components/Options";
import { ChatInput } from "@/components/ChatInput";
import { ChatProvider, useChat } from "@/lib/chat-context";

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";
  const isSettingsPage = pathname === "/settings";
  const isChatPage = pathname === "/" || pathname.startsWith("/chat/");
  const { currentModel, setCurrentModel, isLoading, handleSendMessage } = useChat();

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 left-0 right-0 z-20 flex h-12 items-center justify-between bg-transparent px-3">
          <SidebarTrigger className="-ml-1 h-8 w-8" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SettingsButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
        {isChatPage && (
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