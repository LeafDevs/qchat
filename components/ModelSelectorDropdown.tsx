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
import { ProviderIcon } from "./ProviderIcons"
import { cn } from "@/lib/utils"
import { ModelProviders, Models, type ModelConfig } from "@/lib/AI"

interface ModelSelectorDropdownProps {
  currentModel: string
  onModelChange: (model: string) => void
  providers?: ModelProviders
}

export function ModelSelectorDropdown({ currentModel, onModelChange, providers }: ModelSelectorDropdownProps) {
  // Group models by provider
  const groupedModels = Models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ModelConfig[]>)

  const getCurrentModelName = () => {
    const model = Models.find(m => m.model === currentModel)
    if (model) {
      return model.model;
    }
    return currentModel
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-background/80 rounded-md hover:bg-accent/50 transition-colors min-w-[4rem] sm:min-w-[5rem]"
        >
          <span className="truncate max-w-16 sm:max-w-20">{getCurrentModelName()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(groupedModels).map(([provider, models]) => (
          <DropdownMenuSub key={provider}>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <ProviderIcon provider={provider} />
              <span>{provider}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.model}
                  onClick={() => onModelChange(model.model)}
                  className={cn(
                    currentModel === model.model && "bg-accent/80",
                    "flex items-center gap-2"
                  )}
                >
                  <span>{model.display_name}</span>
                  {model.hasThinking && (
                    <span className="ml-auto text-xs text-muted-foreground">Thinking</span>
                  )}
                </DropdownMenuItem>
              ))}
              
            </DropdownMenuSubContent>

          </DropdownMenuSub>
        ))}
        <DropdownMenuItem
                  key="use-other-models"
                  onClick={() => window.location.href = '/settings?tab=models'}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <span>Use Other Models</span>
                  <span className="ml-auto text-xs">→</span>
                </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 