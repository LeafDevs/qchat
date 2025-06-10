"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProviderIcon, formatModelName, type ModelProvider } from "./ProviderIcons"
import { cn } from "@/lib/utils"

interface ModelSelectorDropdownProps {
  currentModel: string
  onModelChange: (model: string) => void
  providers: ModelProvider[]
}

export function ModelSelectorDropdown({ currentModel, onModelChange, providers }: ModelSelectorDropdownProps) {
  const getCurrentModelName = () => {
    for (const provider of providers) {
      const model = provider.models.find(m => m.id === currentModel)
      if (model) return formatModelName(model.name, provider.name)
    }
    return currentModel
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-background/80 rounded-md border hover:bg-accent/50 transition-colors min-w-[4rem] sm:min-w-[5rem]"
        >
          <span className="truncate max-w-16 sm:max-w-20">{getCurrentModelName()}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        {providers?.map((provider) => 
          provider.models.length > 0 ? (
            <DropdownMenuSub key={provider.name}>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <ProviderIcon provider={provider.name} />
                <span>{provider.name}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {provider.models.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={cn(currentModel === model.id && "bg-accent/80")}
                  >
                    {formatModelName(model.name, provider.name)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem key={provider.name} disabled>
              <ProviderIcon provider={provider.name} />
              <span>{provider.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">No models</span>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 