'use client'

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"



export function SettingsButton() {
  return (
    <Button variant="ghost" size="icon">
      <Settings className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Settings</span>
    </Button>
  )
}
