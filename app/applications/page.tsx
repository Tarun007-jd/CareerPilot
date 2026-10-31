"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Lightbulb,
  Loader2,
  Mic,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplicationStatusBadge } from "@/components/shared/status-badges";
import { ApplicationPipelineChart } from "@/components/dashboard/dashboard-charts";
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
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { OPEN_ASSISTANT_EVENT } from "@/components/assistant/assistant-command-center";
import { generateApplicationInsights, ClientApiError } from "@/lib/api-client";
import {
  calculateApplicationStats,
  formatDate,
  todayInputValue,
} from "@/lib/utils";
import type {
  ApplicationInsight,
  ApplicationStatus,
  EngineKind,
  JobApplication,
} from "@/lib/types";

const statuses: ApplicationStatus[] = [
  "Interested",
  "Applied",
  "Assessment",
  "Interview",
  "Rejected",
  "Offer",
];

const toneStyles: Record<ApplicationInsight["tone"], string> = {
  positive: "border-emerald-100 bg-emerald-50/60 text-emerald-950",
  neutral: "border-border bg-muted/25 text-foreground",
  attention: "border-amber-100 bg-amber-50/60 text-amber-950",
};

function normalizeUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

function ApplicationsContent() {
  const {
    state,
    addApplication,
    updateApplication,
    deleteApplication,
  } = useCareerPilot();
  const { applications } = state;
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("Applied");
  const [appliedDate, setAppliedDate] = useState(todayInputValue());
  const [source, setSource] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [interviewDates, setInterviewDates] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [insights, setInsights] = useState<ApplicationInsight[]>([]);
  const [insightEngine, setInsightEngine] = useState<EngineKind | null>(null);
  const [insightBasis, setInsightBasis] = useState<string | null>(null);
  const [insightNote, setInsightNote] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const stats = calculateApplicationStats(applications);
  const currentBasis = applications
    .map((application) => `${application.id}:${application.updatedAt}:${application.status}`)
    .sort()
    .join("|");
  const insightsStale = Boolean(
    insights.length && insightBasis && insightBasis !== currentBasis,
  );
  const filtered = [...applications]
    .filter((application) => {
      if (statusFilter !== "All" && application.status !== statusFilter) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [application.company, application.title, application.source, application.notes]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    })
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  const runInsights = useCallback(async () => {
    if (!applications.length) {
      toast.error("Add an application before generating insights.");
      return;
    }
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const response = await generateApplicationInsights(applications);
      setInsights(response.insights);
      setInsightEngine(response.engine);
      setInsightBasis(
        applications
          .map(
            (application) =>
              `${application.id}:${application.updatedAt}:${application.status}`,
          )
          .sort()
          .join("|"),
      );
      setInsightNote(
        response.note ??
          (response.enoughData
            ? "Insights are calculated only from the applications recorded in this browser."
            : "Record at least 3 applications before CareerPilot looks for patterns. It will not invent comparisons."),
      );
      if (response.insights.length) {
        toast.success("Application insights refreshed", {
          description:
            response.engine === "gemini"
              ? "Gemini summarized supported patterns in your recorded applications."
              : "The local coach summarized supported patterns in your recorded applications.",
        });
      }
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "Application insights could not be generated. Your records were not changed.";
      setInsightsError(message);
      toast.error("Insights not generated", { description: message });
    } finally {
      setInsightsLoading(false);
    }
  }, [applications]);

  useEffect(() => {
    if (autoRan.current || searchParams.get("insights") !== "1") return;
    autoRan.current = true;
    if (!applications.length) return;
    const timer = window.setTimeout(() => {
      void runInsights();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applications, runInsights, searchParams]);

  function openCreate() {
    setEditing(null);
    setCompany("");
    setTitle(state.analysis?.targetRole || state.profile.targetRole || "");
    setStatus("Applied");
    setAppliedDate(todayInputValue());
    setSource("");
    setJobUrl("");
    setJobDescription(state.jobTarget?.description ?? "");
    setInterviewDates([]);
    setNotes("");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(application: JobApplication) {
    setEditing(application);
    setCompany(application.company);
    setTitle(application.title);
    setStatus(application.status);
    setAppliedDate(application.appliedDate);
    setSource(application.source);
    setJobUrl(application.url);
    setJobDescription(application.jobDescription);
    setInterviewDates(application.interviewDates);
    setNotes(application.notes);
    setFormError(null);
    setDialogOpen(true);
  }

  function saveApplication() {
    if (!company.trim() || !title.trim()) {
      setFormError("Company and role title are required.");
      return;
    }
    if (!appliedDate) {
      setFormError("Add the date you want associated with this application.");
      return;
    }
    const normalizedUrl = normalizeUrl(jobUrl);
    if (normalizedUrl) {
      try {
        const parsed = new URL(normalizedUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setFormError("Enter a valid http(s) job URL, or leave it blank.");
        return;
      }
    }
    const cleanInterviewDates = Array.from(
      new Set(interviewDates.map((date) => date.trim()).filter(Boolean)),
    ).sort();
    const payload = {
      company: company.trim(),
      title: title.trim(),
      status,
      appliedDate,
      source: source.trim(),
      jobDescription: jobDescription.trim(),
      url: normalizedUrl,
      interviewDates: cleanInterviewDates,
      notes: notes.trim(),
    };
    if (editing) {
      updateApplication(editing.id, payload);
      toast.success("Application updated", {
        description: `${payload.company} · ${payload.title}`,
      });
    } else {
      addApplication(payload);
      toast.success("Application added", {
        description:
          status === "Interested"
            ? "Saved as interested. It is not counted as submitted yet."
            : `${payload.company} · ${payload.title}`,
      });
    }
    setDialogOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteApplication(deleteTarget.id);
    toast.success("Application removed", {
      description: `${deleteTarget.company} · ${deleteTarget.title}`,
    });
    setDeleteTarget(null);
  }

  function openVoiceAssistant() {
    window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 08 · Track the real search"
        title="Application tracker"
        description="Record what you actually submitted or plan to submit. CareerPilot computes your pipeline and evidence-based observations without inventing employer responses."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AIEngineBadge />
            <Button type="button" variant="outline" onClick={openVoiceAssistant}>
              <Mic className="h-4 w-4" />
              Add by voice
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add application
            </Button>
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Recorded", value: stats.total, helper: "all entries" },
          { label: "Active", value: stats.active, helper: "not closed" },
          {
            label: "Response rate",
            value: `${stats.responseRate}%`,
            helper: `${stats.responses} of ${stats.applied} submitted`,
          },
          {
            label: "Interviews",
            value: stats.interviews,
            helper: "stage or date",
          },
          { label: "Offers", value: stats.offers, helper: "recorded" },
        ].map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{card.helper}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search company, role, source, or notes…"
                  className="pl-9"
                  aria-label="Search applications"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ApplicationStatus | "All")
                }
                aria-label="Filter by status"
                className="sm:w-[180px]"
              >
                <option value="All">All statuses</option>
                {statuses.map((option) => (
                  <option key={option} value={option}>
                    {option} ({stats.statusCounts[option] ?? 0})
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold">
                  {filtered.length} application{filtered.length === 1 ? "" : "s"}
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Interested is tracked separately from submitted applications.
                </p>
              </div>
              {statusFilter !== "All" || query ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("All");
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>

            {applications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={BriefcaseBusiness}
                  title="No applications recorded"
                  description="Add a real application manually or use the assistant with Wispr Flow: “I applied to Acme for a Data Analyst role yesterday.”"
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button type="button" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Add application
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openVoiceAssistant}
                      >
                        <Mic className="h-4 w-4" />
                        Dictate with Wispr Flow
                      </Button>
                    </div>
                  }
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Search}
                  title="No applications match those filters"
                  description="Try another company, role, status, or clear the filters."
                  compact
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStatusFilter("All");
                        setQuery("");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/25 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2.5 font-medium sm:px-6">Role</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Applied</th>
                        <th className="px-3 py-2.5 font-medium">Source</th>
                        <th className="px-3 py-2.5 font-medium">Interview</th>
                        <th className="px-5 py-2.5 text-right font-medium sm:px-6">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((application) => {
                        const nextInterview = [...application.interviewDates].sort()[0];
                        return (
                          <tr
                            key={application.id}
                            className="group transition-colors hover:bg-muted/20"
                          >
                            <td className="px-5 py-3.5 sm:px-6">
                              <p className="text-xs font-medium">{application.title}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <p className="text-[11px] text-muted-foreground">
                                  {application.company}
                                </p>
                                {application.url ? (
                                  <a
                                    href={application.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                                  >
                                    Job post
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                ) : null}
                              </div>
                              {application.notes ? (
                                <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground/80">
                                  {application.notes}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-3.5">
                              <ApplicationStatusBadge status={application.status} />
                            </td>
                            <td className="px-3 py-3.5 text-[11px] text-muted-foreground">
                              {formatDate(application.appliedDate)}
                            </td>
                            <td className="max-w-[130px] truncate px-3 py-3.5 text-[11px] text-muted-foreground">
                              {application.source || "—"}
                            </td>
                            <td className="px-3 py-3.5 text-[11px] text-muted-foreground">
                              {nextInterview ? (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDate(nextInterview)}
                                  {application.interviewDates.length > 1
                                    ? ` +${application.interviewDates.length - 1}`
                                    : ""}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right sm:px-6">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEdit(application)}
                                  aria-label={`Edit ${application.company} application`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget(application)}
                                  aria-label={`Delete ${application.company} application`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {filtered.map((application) => (
                    <div key={application.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">{application.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {application.company}
                          </p>
                        </div>
                        <ApplicationStatusBadge status={application.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span>Applied {formatDate(application.appliedDate)}</span>
                        {application.source ? <span>{application.source}</span> : null}
                        {application.interviewDates.length ? (
                          <span>
                            {application.interviewDates.length} interview date
                            {application.interviewDates.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      {application.notes ? (
                        <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                          {application.notes}
                        </p>
                      ) : null}
                      <div className="mt-3 flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(application)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(application)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Response rate counts Assessment, Interview, Rejected, and Offer as
            responses. Interested entries are excluded from the denominator. These are
            your records, not employer-reported data.
          </p>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" />
              Pipeline
            </div>
            {applications.length ? (
              <>
                <div className="mt-2">
                  <ApplicationPipelineChart applications={applications} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <p className="font-semibold">{stats.applied}</p>
                    <p className="text-muted-foreground">submitted</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <p className="font-semibold">{stats.interviewConversionRate}%</p>
                    <p className="text-muted-foreground">interview conversion</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Add applications to see your recorded pipeline.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Application insights
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void runInsights()}
                disabled={insightsLoading || !applications.length}
                aria-label="Refresh application insights"
              >
                {insightsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {insightEngine ? (
              <Badge
                variant={insightEngine === "gemini" ? "success" : "warning"}
                className="mt-2"
              >
                {insightEngine === "gemini" ? "Gemini insights" : "Local insights"}
              </Badge>
            ) : null}

            {insightsStale ? (
              <Alert variant="warning" className="mt-2 text-xs">
                Your applications changed after these insights were generated. Refresh
                to recalculate from the current records.
              </Alert>
            ) : null}

            {insightsLoading ? (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : insightsError ? (
              <Alert variant="error" className="mt-3 text-xs">
                {insightsError}
              </Alert>
            ) : insights.length ? (
              <div className="mt-3 space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-lg border p-3 ${toneStyles[insight.tone]}`}
                  >
                    <p className="text-[11px] font-medium leading-relaxed">
                      {insight.text}
                    </p>
                    <p className="mt-1 text-[9px] leading-relaxed opacity-70">
                      {insight.evidence}
                    </p>
                  </div>
                ))}
              </div>
            ) : insightNote ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/25 p-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {insightNote}
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {applications.length
                    ? "Generate observations from the applications you recorded. CareerPilot needs at least 3 entries before comparing patterns."
                    : "Add at least 3 applications first. CareerPilot will not invent a market benchmark, response rate, or employer behavior."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => void runInsights()}
                  disabled={!applications.length}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Generate insights
                </Button>
              </div>
            )}

            {insightNote && insights.length ? (
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                {insightNote}
              </p>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mic className="h-4 w-4 text-primary" />
              Add applications by voice
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Dictate into the CareerPilot assistant with Wispr Flow. Changes are previewed
              and require confirmation before anything is saved.
            </p>
            <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              “I applied to Acme for a Data Analyst role yesterday.”
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={openVoiceAssistant}
            >
              <Bot className="h-3.5 w-3.5" />
              Open voice assistant
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              Keep it honest
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              A rejection or silence is not proof that your profile is weak. Insights
              describe only the small sample you recorded. CareerPilot never contacts
              employers, applies for jobs, or claims a response you did not enter.
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit application" : "Add an application"}
            </DialogTitle>
            <DialogDescription>
              Record only what actually happened. Interested entries are not counted as
              submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="app-company">Company</Label>
                <Input
                  id="app-company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="e.g. Acme Labs"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-title">Role title</Label>
                <Input
                  id="app-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Data Analyst"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-status">Status</Label>
                <Select
                  id="app-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ApplicationStatus)
                  }
                >
                  {statuses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-date">
                  {status === "Interested" ? "Date noted" : "Applied date"}
                </Label>
                <Input
                  id="app-date"
                  type="date"
                  value={appliedDate}
                  onChange={(event) => setAppliedDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-source">Source</Label>
                <Input
                  id="app-source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="e.g. LinkedIn, referral, careers page"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-url">Job URL</Label>
                <Input
                  id="app-url"
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="https://…"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Interview dates</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInterviewDates((dates) => [...dates, ""])}
                >
                  <Plus className="h-3 w-3" />
                  Add date
                </Button>
              </div>
              {interviewDates.length ? (
                <div className="space-y-2">
                  {interviewDates.map((date, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={date}
                        aria-label={`Interview date ${index + 1}`}
                        onChange={(event) =>
                          setInterviewDates((dates) =>
                            dates.map((entry, entryIndex) =>
                              entryIndex === index ? event.target.value : entry,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove interview date ${index + 1}`}
                        onClick={() =>
                          setInterviewDates((dates) =>
                            dates.filter((_, entryIndex) => entryIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Optional. Add dates for scheduled interviews.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-description">Job description</Label>
              <Textarea
                id="app-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={3}
                maxLength={30000}
                placeholder="Optional — keep the real description for reference."
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-notes">Notes</Label>
              <Textarea
                id="app-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={3000}
                placeholder="Contacts, follow-up dates, preparation notes…"
                className="text-xs leading-relaxed"
              />
            </div>

            {formError ? (
              <Alert variant="error">{formError}</Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveApplication}>
              {editing ? (
                <ClipboardList className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editing ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this application?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.company} · ${deleteTarget.title} will be removed from this browser. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Delete application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="h-[520px] animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
