"use client";

import {
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Keyboard,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AssistantMessage, VoiceAgentResult } from "@/lib/types";
import { useCareerPilot } from "@/components/providers/career-provider";
import { buildVoiceContext } from "@/lib/utils";
import { runVoiceAgent, ClientApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { cn } from "@/lib/utils";

const intents: Record<string, string> = {
  UPDATE_PROFILE: "Update profile",
  SET_CAREER_TARGET: "Set career target",
  ANALYZE_SKILLS: "Analyze skills",
  GENERATE_ROADMAP: "Generate roadmap",
  UPDATE_PROGRESS: "Update progress",
  RESCHEDULE_TASK: "Reschedule task",
  RECOMMEND_PROJECTS: "Recommend projects",
  START_INTERVIEW: "Start interview",
  ADD_APPLICATION: "Add application",
  VIEW_APPLICATION_INSIGHTS: "Application insights",
};

const exampleCommands = [
  "Analyze my skills against my saved job description.",
  "Create a four-week learning plan for my target role.",
  "Suggest a portfolio project using Python and TensorFlow.",
  "Start a technical mock interview with 3 questions.",
  "I applied for a Software Engineer role at Microsoft yesterday.",
  "Show my application performance.",
];

function readOnlyRedirect(result: VoiceAgentResult) {
  for (const operation of result.proposedAction.operations) {
    if (operation.type === "NAVIGATE") {
      const routes: Record<string, string> = {
        Dashboard: "/",
        "Career Profile": "/profile",
        "Resume Intelligence": "/resume",
        "Skill Gap Analysis": "/skill-gap",
        "Learning Roadmap": "/roadmap",
        "Portfolio Projects": "/projects",
        "Mock Interview": "/interview",
        "Application Tracker": "/applications",
        "AI Assistant": "/assistant",
        Settings: "/settings",
      };
      if (routes[operation.module]) return routes[operation.module];
    }
    if (
      operation.type === "RUN_MODULE_ACTION" &&
      operation.action === "VIEW_APPLICATION_INSIGHTS"
    ) {
      return "/applications?insights=1";
    }
  }
  return undefined;
}

function MessageBubble({
  message,
  onConfirm,
  onCancel,
  confirming,
}: {
  message: AssistantMessage;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-accent text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-2xl rounded-tl-md border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {message.intent ? (
              <Badge variant="secondary">{intents[message.intent] ?? message.intent}</Badge>
            ) : null}
            {message.engine ? (
              <Badge variant="outline" className="gap-1">
                {message.engine === "gemini" ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
                {message.engine === "gemini" ? "Gemini" : "Local coach"}
              </Badge>
            ) : null}
            {message.status === "confirmed" ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                Confirmed
              </Badge>
            ) : null}
            {message.status === "cancelled" ? (
              <Badge variant="outline">Cancelled</Badge>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {message.content}
          </p>

          {message.requiredInformation.length ? (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <CircleAlert className="h-3.5 w-3.5" />
                Needed to continue
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-900/80">
                {message.requiredInformation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {message.proposal && message.proposal.operations.length ? (
            <div className="mt-4 rounded-xl border border-primary/15 bg-accent/45">
              <div className="border-b border-primary/10 px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Proposed action preview
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {message.proposal.summary}
                </p>
              </div>
              {message.proposal.preview.length ? (
                <dl className="divide-y divide-primary/10 px-4">
                  {message.proposal.preview.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <dt className="text-xs text-muted-foreground">{item.label}</dt>
                      <dd className="max-w-[70%] text-right text-xs font-medium text-foreground">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {message.status === "pending" ? (
                <div className="flex flex-col-reverse gap-2 border-t border-primary/10 p-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={confirming}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onConfirm}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Confirm & save
                  </Button>
                </div>
              ) : message.status === "cancelled" ? (
                <p className="border-t border-primary/10 p-3 text-xs text-muted-foreground">
                  Cancelled. No career data was changed.
                </p>
              ) : message.status === "confirmed" ? (
                <p className="border-t border-primary/10 p-3 text-xs text-muted-foreground">
                  This action was confirmed and saved.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AssistantPanel({
  onNavigate,
  showHeader = true,
  autoFocusTextarea = false,
  className,
}: {
  onNavigate?: () => void;
  showHeader?: boolean;
  autoFocusTextarea?: boolean;
  className?: string;
}) {
  const {
    state,
    aiStatus,
    aiStatusReady,
    addAssistantUserMessage,
    addAssistantResult,
    applyProposal,
    cancelProposal,
    clearAssistantHistory,
  } = useCareerPilot();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [state.assistantMessages.length, loading, error]);

  useEffect(() => {
    if (!autoFocusTextarea) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [autoFocusTextarea]);

  async function submitCommand(command: string, skipUserMessage = false) {
    const clean = command.trim();
    if (!clean || loading) return;
    setError(null);
    setLastAttempt(clean);
    if (!skipUserMessage) addAssistantUserMessage(clean);
    setInput("");
    setLoading(true);
    try {
      const response = await runVoiceAgent(clean, buildVoiceContext(state));
      addAssistantResult(clean, response.result);
      if (!response.result.requiresConfirmation) {
        const redirect = readOnlyRedirect(response.result);
        if (redirect) {
          toast.message("CareerPilot", {
            description: response.result.proposedAction.summary,
          });
          onNavigate?.();
          router.push(redirect);
        }
      }
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "The command could not be processed. Nothing was changed.";
      setError(message);
      toast.error("Command not processed", { description: message });
    } finally {
      setLoading(false);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleConfirm(message: AssistantMessage) {
    if (confirmingId) return;
    setConfirmingId(message.id);
    try {
      const result = applyProposal(message.id);
      toast.success(result.applied ? "Changes saved" : "Action ready", {
        description: result.summary,
      });
      onNavigate?.();
      if (result.redirect) {
        router.push(result.redirect);
      }
    } catch (caught) {
      toast.error("Could not confirm action", {
        description:
          caught instanceof Error
            ? caught.message
            : "The saved data was not changed.",
      });
    } finally {
      setConfirmingId(null);
    }
  }

  const messages = state.assistantMessages;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-card", className)}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 pr-14">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">CareerPilot Command Center</p>
              <p className="text-xs text-muted-foreground">
                Voice-first career intelligence
              </p>
            </div>
          </div>
          <AIEngineBadge />
        </div>
      ) : null}

      <div className="border-b border-border bg-muted/25 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
              1
            </span>
            Activate Wispr Flow
          </span>
          <ChevronRight className="h-3 w-3" />
          <span>Speak naturally</span>
          <ChevronRight className="h-3 w-3" />
          <span>Review the transcript</span>
          <ChevronRight className="h-3 w-3" />
          <span>Confirm changes</span>
          <a
            href="https://wisprflow.ai/"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Wispr Flow
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
          Wispr Flow is desktop dictation. CareerPilot does not use a simulated
          microphone or browser speech API.
        </p>
      </div>

      {aiStatusReady && !aiStatus.configured ? (
        <div className="border-b border-amber-100 bg-amber-50/60 px-5 py-2.5">
          <p className="text-xs leading-relaxed text-amber-900">
            Local coach mode is active because Gemini is not configured. Intent
            parsing and all workflows still run, with transparent deterministic logic.
          </p>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-accent text-primary">
              <MessageSquareText className="h-5.5 w-5.5" />
            </div>
            <h2 className="text-base font-semibold">
              Say what changed, or ask what’s next.
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              CareerPilot reads your saved profile, roadmap, applications, and
              practice results before proposing an action.
            </p>
            <div className="mt-5 grid w-full max-w-md gap-2">
              {exampleCommands.slice(0, 4).map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => {
                    setInput(command);
                    textareaRef.current?.focus();
                  }}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{command}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onConfirm={() => handleConfirm(message)}
              onCancel={() => cancelProposal(message.id)}
              confirming={confirmingId === message.id}
            />
          ))
        )}

        {loading ? (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-accent text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Reading your command against your saved career context…
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert
            variant="error"
            title="Command not processed"
            icon={<CircleAlert className="h-4 w-4" />}
          >
            <p>{error}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (lastAttempt) void submitCommand(lastAttempt, true);
                }}
              >
                Retry command
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          </Alert>
        ) : null}
      </div>

      <div className="border-t border-border bg-card p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <label
            htmlFor="careerpilot-command"
            className="text-xs font-medium text-foreground"
          >
            Your command
          </label>
          <span className="text-[10px] text-muted-foreground">
            Review before sending
          </span>
        </div>
        <p
          id="wispr-flow-instruction"
          className="mb-2 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground"
        >
          <Keyboard
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          Speak naturally using Wispr Flow. Your words will appear here
          automatically.
        </p>
        <div className="rounded-xl border border-input bg-background/60 p-2.5 shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/15">
          <textarea
            id="careerpilot-command"
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void submitCommand(input);
              }
            }}
            rows={5}
            maxLength={3000}
            placeholder="Dictate with Wispr Flow or type… e.g. “I completed Python this week. Actually, I already know Java — focus on machine learning.”"
            className="min-h-[132px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60"
            aria-describedby="wispr-flow-instruction command-help"
          />
          <div className="flex items-center justify-between gap-2 px-1 pt-1.5">
            <p id="command-help" className="text-[10px] text-muted-foreground">
              {input.length}/3000 · <span className="kbd">Ctrl</span> +{" "}
              <span className="kbd">Enter</span> to submit
            </p>
            <div className="flex items-center gap-1.5">
              {messages.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearAssistantHistory}
                  aria-label="Clear assistant conversation history"
                  title="Clear history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => void submitCommand(input)}
                disabled={!input.trim() || loading}
                aria-label="Send command to CareerPilot"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/80">
          Read-only requests can run immediately. Data changes always require
          confirmation. CareerPilot never submits applications or contacts employers.
        </p>
      </div>
    </div>
  );
}
