"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Code2,
  FolderKanban,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectStatusBadge } from "@/components/shared/status-badges";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { generateProjects, ClientApiError } from "@/lib/api-client";
import type { PortfolioProject, ProjectStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const nextStatus: Partial<Record<ProjectStatus, ProjectStatus>> = {
  recommended: "saved",
  saved: "in_progress",
  in_progress: "completed",
  completed: "in_progress",
};

const nextLabel: Partial<Record<ProjectStatus, string>> = {
  recommended: "Save project",
  saved: "Start building",
  in_progress: "Mark complete",
  completed: "Reopen project",
};

const nextIcon: Partial<Record<ProjectStatus, typeof Bookmark>> = {
  recommended: Bookmark,
  saved: Play,
  in_progress: CheckCircle2,
  completed: RotateCcw,
};

function parseTechnologies(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function mergeProjectStatuses(
  generated: PortfolioProject[],
  existing: PortfolioProject[],
) {
  return generated.map((project) => {
    const match = existing.find(
      (entry) => entry.title.trim().toLowerCase() === project.title.trim().toLowerCase(),
    );
    return match ? { ...project, id: match.id, status: match.status } : project;
  });
}

function ProjectsContent() {
  const { state, saveProjects, updateProjectStatus } = useCareerPilot();
  const { analysis, jobTarget, projects, profile } = state;
  const searchParams = useSearchParams();
  const [focusTechnologies, setFocusTechnologies] = useState(() =>
    parseTechnologies(searchParams.get("technologies") ?? "").join(", "),
  );
  const [generating, setGenerating] = useState(false);
  const [engine, setEngine] = useState<PortfolioProject["engine"] | null>(
    projects[0]?.engine ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const focusSkills =
    analysis?.gaps
      .filter((gap) => gap.classification !== "strong")
      .slice(0, 8)
      .map((gap) => gap.skill) ?? [];
  const counts = {
    saved: projects.filter((project) => project.status === "saved").length,
    in_progress: projects.filter((project) => project.status === "in_progress").length,
    completed: projects.filter((project) => project.status === "completed").length,
  };

  const runProjects = useCallback(
    async (technologiesOverride?: string[]) => {
      if (!analysis || !jobTarget) return;
      setGenerating(true);
      setError(null);
      const requested =
        technologiesOverride ?? parseTechnologies(focusTechnologies);
      try {
        const response = await generateProjects({
          profile,
          jobTarget,
          analysis,
          focusTechnologies: requested.length ? requested : undefined,
        });
        const merged = mergeProjectStatuses(response.projects, projects);
        saveProjects(merged);
        setEngine(response.engine);
        toast.success("Project recommendations ready", {
          description:
            response.engine === "gemini"
              ? "Gemini proposed three portfolio builds tied to your recorded gaps."
              : "The local coach proposed three portfolio builds tied to your recorded gaps.",
        });
      } catch (caught) {
        const message =
          caught instanceof ClientApiError
            ? caught.message
            : "Projects could not be recommended. Your existing projects are unchanged.";
        setError(message);
        toast.error("Projects not generated", { description: message });
      } finally {
        setGenerating(false);
      }
    },
    [analysis, jobTarget, profile, focusTechnologies, projects, saveProjects],
  );

  useEffect(() => {
    if (
      autoRan.current ||
      searchParams.get("autorun") !== "1" ||
      !analysis ||
      !jobTarget
    ) {
      return;
    }
    autoRan.current = true;
    const requested = parseTechnologies(
      searchParams.get("technologies") ?? "",
    );
    void runProjects(requested);
  }, [analysis, jobTarget, runProjects, searchParams]);

  function addFocusSkill(skill: string) {
    const current = parseTechnologies(focusTechnologies);
    if (current.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      return;
    }
    setFocusTechnologies([...current, skill].join(", "));
  }

  function advanceProject(project: PortfolioProject) {
    const targetStatus = nextStatus[project.status];
    if (!targetStatus) return;
    updateProjectStatus(project.id, targetStatus);
    const messages: Record<ProjectStatus, string> = {
      recommended: "Project moved back to recommendations.",
      saved: "Project saved to your portfolio plan.",
      in_progress: "Project marked as in progress.",
      completed: "Project marked complete. Add real evidence before claiming it.",
    };
    toast.success(messages[targetStatus], {
      description:
        targetStatus === "completed"
          ? "Completion is self-reported in this workspace; it is not employer-verified."
          : undefined,
    });
  }

  if (!analysis || !jobTarget) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Module 06 · Portfolio evidence"
          title="Portfolio projects"
          description="Recommended work must target a real gap. Add a user-supplied job description and run the skill-gap analysis before CareerPilot suggests projects."
          actions={<AIEngineBadge />}
        />
        <Card className="mt-5 p-5 sm:p-6">
          <EmptyState
            icon={FolderKanban}
            title="A gap analysis unlocks project recommendations"
            description="CareerPilot builds projects around the skills your target role requires and your profile does not yet prove. It will not invent a target or a project history."
            action={
              <Button asChild>
                <Link href="/skill-gap">
                  Analyze a job description
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 06 · Portfolio evidence"
        title="Portfolio projects"
        description={`Exactly three buildable projects for ${analysis.targetRole}${
          analysis.company ? ` at ${analysis.company}` : ""
        }, designed to turn your recorded gaps into inspectable work.`}
        actions={<AIEngineBadge />}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Recommendation brief</h2>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Optionally steer the stack. Projects still target your highest-value
                  gaps and must be buildable by one person in 3–6 weeks.
                </p>
              </div>
              {engine ? (
                <Badge variant={engine === "gemini" ? "success" : "warning"}>
                  {engine === "gemini" ? "Gemini recommendations" : "Local recommendations"}
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="focus-technologies">Focus technologies (optional)</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="focus-technologies"
                  value={focusTechnologies}
                  onChange={(event) => setFocusTechnologies(event.target.value)}
                  placeholder="e.g. FastAPI, PostgreSQL, Docker"
                  maxLength={220}
                />
                <Button
                  type="button"
                  onClick={() => void runProjects()}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : projects.length ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {projects.length ? "Regenerate" : "Recommend 3 projects"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Separate technologies with commas. Leave blank to let CareerPilot choose
                the most relevant tools.
              </p>
            </div>
            {focusSkills.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Gap-based suggestions:
                </span>
                {focusSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addFocusSkill(skill)}
                    className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <Alert
                variant="error"
                title="Project generation failed"
                icon={<CircleAlert className="h-4 w-4" />}
                className="mt-4"
              >
                {error}
              </Alert>
            ) : null}
          </Card>

          {generating ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2].map((item) => (
                <Card key={item} className="p-5">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="mt-1.5 h-3 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="h-16 animate-pulse rounded-lg bg-muted/70" />
                    <div className="h-16 animate-pulse rounded-lg bg-muted/70" />
                  </div>
                  <div className="mt-4 h-9 w-32 animate-pulse rounded-md bg-muted" />
                </Card>
              ))}
            </div>
          ) : projects.length ? (
            <>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">
                    {projects.length} recommended project{projects.length === 1 ? "" : "s"}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Recommendations only. Completed means you marked it complete in this
                    browser.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Generated {formatDate(projects[0]?.createdAt ?? new Date())}
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((project, index) => {
                  const Icon = nextIcon[project.status] ?? Bookmark;
                  return (
                    <Card
                      key={project.id}
                      className="flex flex-col overflow-hidden transition-shadow hover:shadow-soft"
                    >
                      <div className="border-b border-border bg-muted/20 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[11px] font-semibold text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Badge variant="outline">{project.difficulty}</Badge>
                          </div>
                          <ProjectStatusBadge status={project.status} />
                        </div>
                        <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight">
                          {project.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {project.durationWeeks} weeks
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {project.features.length} features
                          </span>
                          <span>{project.engine === "gemini" ? "Gemini" : "Local"}</span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {project.description}
                        </p>
                        <div className="mt-3 rounded-lg border border-border bg-muted/25 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Problem
                          </p>
                          <p className="mt-1 text-xs leading-relaxed">
                            {project.problemStatement}
                          </p>
                        </div>

                        <div className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Suggested stack
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {project.techStack.map((technology) => (
                              <Badge
                                key={technology}
                                variant="secondary"
                                className="gap-1 font-mono text-[10px]"
                              >
                                <Code2 className="h-2.5 w-2.5" />
                                {technology}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Skills developed
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {project.skills.map((item) => (
                              <Badge key={item} variant="outline" className="text-[10px]">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer list-none text-[11px] font-medium text-primary">
                            Features, deliverables & why it matters
                          </summary>
                          <div className="mt-2 space-y-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Build these
                              </p>
                              <ul className="mt-1 space-y-1">
                                {project.features.map((feature) => (
                                  <li
                                    key={feature}
                                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                                  >
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Deliverables
                              </p>
                              <ul className="mt-1 space-y-1">
                                {project.deliverables.map((deliverable) => (
                                  <li
                                    key={deliverable}
                                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                                  >
                                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                                    {deliverable}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                Employability signal
                              </p>
                              <p className="mt-1 text-[11px] leading-relaxed text-amber-950">
                                {project.employability}
                              </p>
                            </div>
                          </div>
                        </details>

                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <Button
                            type="button"
                            size="sm"
                            variant={project.status === "completed" ? "outline" : "default"}
                            onClick={() => advanceProject(project)}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {nextLabel[project.status]}
                          </Button>
                          {project.status === "completed" ? (
                            <span className="text-[10px] text-emerald-600">
                              Evidence ready to present
                            </span>
                          ) : project.status !== "recommended" ? (
                            <button
                              type="button"
                              onClick={() => {
                                updateProjectStatus(project.id, "recommended");
                                toast.success("Recommendation restored");
                              }}
                              className="text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              Reset status
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              <Alert variant="neutral" className="text-xs">
                Projects are coaching recommendations, not assignments or completed
                portfolio evidence. Only describe features you have actually built.
              </Alert>
            </>
          ) : (
            <Card className="p-5 sm:p-6">
              <EmptyState
                icon={Sparkles}
                title="No projects recommended yet"
                description="Use the brief above to generate exactly three projects. They will be tied to your saved gaps and optional stack choices."
                action={
                  <Button
                    type="button"
                    onClick={() => void runProjects()}
                    disabled={generating}
                  >
                    <Sparkles className="h-4 w-4" />
                    Recommend 3 projects
                  </Button>
                }
              />
            </Card>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FolderKanban className="h-4 w-4 text-primary" />
              Portfolio pipeline
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-sky-50 p-2.5">
                <p className="text-lg font-semibold text-sky-700">{counts.saved}</p>
                <p className="text-[10px] text-sky-600">saved</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2.5">
                <p className="text-lg font-semibold text-amber-700">
                  {counts.in_progress}
                </p>
                <p className="text-[10px] text-amber-600">building</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <p className="text-lg font-semibold text-emerald-700">
                  {counts.completed}
                </p>
                <p className="text-[10px] text-emerald-600">complete</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Move a project from recommendation to saved, then building, then complete.
              Status is tracked only in this workspace.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              Current gaps
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {analysis.gaps
                .filter((gap) => gap.classification !== "strong")
                .slice(0, 8)
                .map((gap) => (
                  <Badge key={gap.skill} variant="outline">
                    {gap.skill}
                  </Badge>
                ))}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/skill-gap">
                Review full gap analysis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Make the work credible
            </div>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Write a README with setup and trade-offs.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Keep a short demo or screenshots.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Explain what failed, not only what worked.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Never claim features you did not build.
              </li>
            </ul>
          </Card>

          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/roadmap">
              Back to four-week roadmap
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="h-[520px] animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
