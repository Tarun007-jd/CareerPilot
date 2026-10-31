"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetContent,
} from "@/components/ui/dialog";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const OPEN_ASSISTANT_EVENT = "careerpilot:open-assistant";

export function AssistantCommandCenter() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    const keyHandler = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "j"
      ) {
        const target = event.target as HTMLElement | null;
        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, openHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener(OPEN_ASSISTANT_EVENT, openHandler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 hidden h-11 rounded-full px-4 shadow-lift sm:inline-flex"
            aria-label="Open CareerPilot command center"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Sparkles className="h-4 w-4" />
            Ask CareerPilot
            <span className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-normal text-primary-foreground/80 md:inline">
              Ctrl J
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open the persistent voice command center</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className="max-w-[540px] p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">
            CareerPilot AI command center
          </DialogTitle>
          <DialogDescription className="sr-only">
            Dictate a career command with Wispr Flow or type it, then submit to
            review the recognized intent and proposed changes before confirming.
          </DialogDescription>
          <AssistantPanel
            autoFocusTextarea
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
