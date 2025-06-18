'use client'

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"


export function SettingsButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" size="icon" onClick={() => {
      router.push('/settings');
    }}>
      <Settings className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Settings</span>
    </Button>
  )
}
