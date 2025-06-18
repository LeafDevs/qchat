"use client"

import { RotateCcw } from "lucide-react"
import { Models } from "@/lib/AI"
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
import { ProviderIcon } from "./ProviderIcons"

interface RetryDropdownProps {
  onRetry: (newModel?: string) => void
}

export function RetryDropdown({ onRetry }: RetryDropdownProps) {
  // Group models by provider
  const groupedModels = Models.reduce((acc, model) => {
    const provider = model.provider;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push({
      id: model.model,
      name: model.model,
      display_name: model.display_name
    });
    return acc;
  }, {} as Record<string, { id: string; name: string; display_name: string }[]>);

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
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(groupedModels).map(([provider, models]) => (
          <DropdownMenuSub key={provider}>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <ProviderIcon provider={provider.toLowerCase()} />
              <span>{provider}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => onRetry(model.id)}
                >
                  {model.display_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
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
  );
} 