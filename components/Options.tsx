'use client'

import { Settings, Cog, Columns3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"


export function SettingsButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={() => router.push('/settings')}
      title="Settings"
    >
      <Cog className="w-5 h-5" />
    </Button>
  )
}

export function SplitViewButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={onClick}
      title="Open Split View (Ctrl+B)"
    >
      <Columns3 className="w-5 h-5" />
    </Button>
  );
}
