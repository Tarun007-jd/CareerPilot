"use client";

import { Keyboard, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCareerPilot } from "@/components/providers/career-provider";

const capabilityGroups = [
  {
    title: "Update your plan",
    commands: [
      "I want to become an AI engineer.",
      "I completed Python this week.",
      "Move machine learning to next week.",
    ],
  },
  {
    title: "Ask for intelligence",
    commands: [
      "What skills am I missing?",
      "Create a four-week learning plan.",
      "Show my application performance.",
    ],
  },
  {
    title: "Practice and track",
    commands: [
      "Start a technical mock interview with 3 questions.",
      "Suggest a project using Python and TensorFlow.",
      "I applied for a software engineering role at Microsoft yesterday.",
    ],
  },
];

export default function AssistantPage() {
  const { state } = useCareerPilot();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 09 · Voice-first"
        title="CareerPilot command center"
        description="Dictate with Wispr Flow, then submit. CareerPilot reads your saved context, asks for missing information, and previews every data change before saving."
        actions={<AIEngineBadge showModel />}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="flex min-h-[680px] flex-col overflow-hidden">
          <AssistantPanel showHeader={false} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                <Keyboard className="h-4 w-4" />
              </span>
              Dictate, don’t simulate
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Use the Wispr Flow desktop app to dictate into any CareerPilot text
              field. CareerPilot does not create a fake microphone or claim a
              Wispr Flow API integration.
            </p>
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Recommended flow</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                <li>Activate Wispr Flow.</li>
                <li>Speak naturally with pauses and corrections.</li>
                <li>Review the transcript in the command box.</li>
                <li>Send, inspect the preview, then confirm.</li>
              </ol>
            </div>
          </Card>

          {capabilityGroups.map((group) => (
            <Card key={group.title} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.title}
              </p>
              <div className="mt-3 space-y-2">
                {group.commands.map((command) => (
                  <p
                    key={command}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed text-foreground/80"
                  >
                    “{command}”
                  </p>
                ))}
              </div>
            </Card>
          ))}

          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Context in use
            </p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Target role</span>
                <Badge variant="outline">
                  {state.profile.targetRole || "Not set"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Job description</span>
                <Badge variant={state.jobTarget?.description ? "success" : "outline"}>
                  {state.jobTarget?.description ? "Saved" : "Not added"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Roadmap tasks</span>
                <Badge variant="outline">
                  {state.roadmap
                    ? state.roadmap.weeks.flatMap((week) => week.tasks).length
                    : 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Applications</span>
                <Badge variant="outline">{state.applications.length}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
