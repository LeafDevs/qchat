'use client';

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/UserSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsButton } from "@/components/Options";
import { ChatLayout } from "@/components/ChatLayout";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 left-0 right-0 z-20 flex h-12 items-center justify-between border-b bg-background px-3">
          <SidebarTrigger className="-ml-1 h-8 w-8" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SettingsButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 