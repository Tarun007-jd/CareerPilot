"use client";

import {
  Bot,
  Check,
  CircleAlert,
  Download,
  FlaskConical,
  HardDrive,
  KeyRound,
  LockKeyhole,
  Mic,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type ConfirmAction = "reset" | "sample" | null;

export default function SettingsPage() {
  const {
    state,
    aiStatus,
    aiStatusReady,
    storageError,
    resetWorkspace,
    loadDemoWorkspace,
    exportWorkspace,
  } = useCareerPilot();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [processing, setProcessing] = useState(false);

  const dataCounts = [
    { label: "Profile", value: state.profile.name ? 1 : 0 },
    {
      label: "Skills",
      value: state.profile.skills.length,
    },
    { label: "Gap analysis", value: state.analysis ? 1 : 0 },
    { label: "Roadmap", value: state.roadmap ? 1 : 0 },
    { label: "Projects", value: state.projects.length },
    { label: "Interviews", value: state.interviews.length },
    { label: "Applications", value: state.applications.length },
    { label: "Assistant messages", value: state.assistantMessages.length },
  ];

  async function performConfirmedAction() {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      if (confirmAction === "reset") {
        await resetWorkspace();
      } else {
        await loadDemoWorkspace();
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error("Workspace action failed", {
        description:
          error instanceof Error
            ? error.message
            : "CareerPilot could not update local storage.",
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 10 · Workspace control"
        title="Settings"
        description="Control the AI engine, your local data, and the sample workspace. CareerPilot never exposes secrets to the browser."
        actions={<AIEngineBadge />}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          {storageError ? (
            <Alert
              variant="error"
              title="Local storage needs attention"
              icon={<CircleAlert className="h-4 w-4" />}
            >
              {storageError} Export a copy if possible, then reset the workspace from
              this page.
            </Alert>
          ) : null}

          <Card className="overflow-hidden">
            <div className="border-b border-border p-5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">AI engine</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Gemini runs only on the server. With no key, the transparent local
                      coach handles every module.
                    </p>
                  </div>
                </div>
                {aiStatusReady ? (
                  <Badge variant={aiStatus.configured ? "success" : "warning"}>
                    {aiStatus.configured ? "Gemini connected" : "Local coach mode"}
                  </Badge>
                ) : (
                  <Badge variant="outline">Checking…</Badge>
                )}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {aiStatusReady && aiStatus.configured ? (
                <Alert variant="success" icon={<Check className="h-4 w-4" />}>
                  A server-side Gemini key is configured. Structured outputs are validated
                  before use. If a Gemini request fails, CareerPilot returns an explicit
                  error instead of silently faking success.
                </Alert>
              ) : aiStatusReady ? (
                <Alert variant="warning" icon={<Sparkles className="h-4 w-4" />}>
                  No server-side Gemini key is configured. The deterministic local coach
                  is active and is labeled in every module. This mode is fully functional
                  for practice, but it is not Gemini and does not claim to be.
                </Alert>
              ) : (
                <div className="h-14 animate-pulse rounded-xl bg-muted" />
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Current mode
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    {aiStatusReady
                      ? aiStatus.configured
                        ? "Gemini"
                        : "Local coach"
                      : "Checking"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Model
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] font-medium">
                    {aiStatusReady ? aiStatus.model : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Key location
                  </p>
                  <p className="mt-1 text-xs font-medium">Server only</p>
                </div>
              </div>

              <div className="mt-5">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Configure Gemini locally
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Add these variables to <code>.env.local</code>, then restart{" "}
                  <code>npm run dev</code>. Never prefix the key with{" "}
                  <code>NEXT_PUBLIC_</code>.
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
                  <code>{`GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash`}</code>
                </pre>
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  For Vercel, add the same values under Project Settings → Environment
                  Variables. The browser calls internal API routes; it never receives the
                  key.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <HardDrive className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Local workspace</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Everything is stored in this browser under{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    careerpilot:v1
                  </code>
                  . There is no account or cloud database in this MVP.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {dataCounts.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border bg-muted/25 p-2.5"
                >
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/25 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium">Export a JSON copy</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Includes your profile, resume, analyses, plans, interviews, and
                  applications. Treat it as personal data.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={exportWorkspace}>
                <Download className="h-4 w-4" />
                Export workspace
              </Button>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[10px] text-muted-foreground">
              <span>Last saved locally</span>
              <span>{formatDate(state.savedAt)}</span>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Sample workspace</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Load a clearly labeled sample student and job description to explore the
                  workflow. No analysis is prefilled; you generate the real results.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Loading the sample replaces your current workspace in this browser.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction("sample")}
              >
                <RefreshCw className="h-4 w-4" />
                Load sample workspace
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Mic className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Voice with Wispr Flow</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Voice input comes from the Wispr Flow desktop app, not a simulated
                  browser microphone.
                </p>
              </div>
            </div>
            <ol className="mt-4 space-y-3">
              {[
                {
                  title: "Install and enable Wispr Flow",
                  description:
                    "Use your own desktop dictation setup and configured keyboard shortcut.",
                },
                {
                  title: "Focus a text field",
                  description:
                    "Dictate into the assistant composer, an interview answer, a notes field, or any other input.",
                },
                {
                  title: "Speak a supported command",
                  description:
                    "For example: “I applied to Acme for a Data Analyst role yesterday” or “I already know Java, correct the roadmap.”",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-lg bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              Data-changing voice actions always show a preview and require confirmation.
              CareerPilot never applies for jobs, emails employers, or claims an external
              action occurred.
            </p>
          </Card>

          <Card className="overflow-hidden border-rose-100">
            <div className="border-b border-rose-100 bg-rose-50/50 p-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-rose-950">Danger zone</h2>
                  <p className="mt-0.5 text-xs text-rose-900/70">
                    Permanently erase this browser’s CareerPilot workspace.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                This removes your profile, resume, analyses, roadmap, projects, interview
                history, applications, and assistant messages. Export first if you want a
                copy.
              </p>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmAction("reset")}
              >
                <Trash2 className="h-4 w-4" />
                Reset workspace
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Privacy boundaries
            </div>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                API keys remain server-side.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                LocalStorage is not encrypted; use a trusted device.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                When Gemini is configured, submitted resume/JD/answer text is sent to
                Google for that request.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                No employer is contacted and no application is submitted.
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LockKeyhole className="h-4 w-4 text-primary" />
              AI limitations
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Resume extraction, skill levels, readiness scores, interview scores, and
              insights are coaching estimates. They are not verified credentials or
              hiring predictions. Always review and correct extracted information.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="h-4 w-4 text-primary" />
              About
            </div>
            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">App</dt>
                <dd className="font-medium">CareerPilot AI</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">1.0.0</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Storage</dt>
                <dd className="font-medium">Local browser</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Framework</dt>
                <dd className="font-medium">Next.js</dd>
              </div>
            </dl>
          </Card>

          <Alert variant="neutral" title="No hidden fallback">
            A failed Gemini request with a configured key is surfaced as an error. The
            local coach is used only when no key exists, and it is always labeled.
          </Alert>
        </div>
      </div>

      <Dialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !processing) setConfirmAction(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "reset"
                ? "Reset the entire workspace?"
                : "Replace this workspace with the sample?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "reset"
                ? "Your profile, resume, analyses, plans, projects, interviews, applications, and assistant history will be permanently removed from this browser."
                : "The sample student and demo job description will replace your current workspace in this browser. Export first if you need a copy."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction === "reset" ? "destructive" : "default"}
              onClick={() => void performConfirmedAction()}
              disabled={processing}
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : confirmAction === "reset" ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              {confirmAction === "reset" ? "Reset workspace" : "Load sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
