"use client";

import { Bot, Cpu, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCareerPilot } from "@/components/providers/career-provider";

export function AIEngineBadge({ showModel = false }: { showModel?: boolean }) {
  const { aiStatus, aiStatusReady } = useCareerPilot();
  if (!aiStatusReady) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Cpu className="h-3 w-3 animate-pulse" />
        Checking AI
      </Badge>
    );
  }
  if (aiStatus.configured) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="success" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            Gemini connected
            {showModel ? (
              <span className="hidden font-normal opacity-70 xl:inline">
                · {aiStatus.model}
              </span>
            ) : null}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-center">
          AI requests run server-side with Gemini. Your API key is never sent to the
          browser.
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="warning" className="gap-1.5">
          <Bot className="h-3 w-3" />
          Local coach mode
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-balance text-center">
        GEMINI_API_KEY is not configured. CareerPilot is using its transparent
        deterministic coach for analysis, planning, and practice. Results are not
        presented as Gemini output.
      </TooltipContent>
    </Tooltip>
  );
}
