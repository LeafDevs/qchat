"use client"

import { RotateCcw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProviderIcon, formatModelName, type ModelProvider } from "./ProviderIcons"

interface RetryDropdownProps {
  onRetry: (newModel?: string) => void
  availableModels: ModelProvider[]
}

export function RetryDropdown({ onRetry, availableModels }: RetryDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
          title="Retry with different model"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">Retry</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        {availableModels?.map((provider) => 
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
                    onClick={() => onRetry(model.id)}
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onRetry()}>
          <RotateCcw className="w-4 h-4" />
          <div>
            <div className="font-medium">Use Same Model</div>
            <div className="text-xs text-muted-foreground">Retry with current model</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 