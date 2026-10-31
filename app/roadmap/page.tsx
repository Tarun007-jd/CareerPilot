"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock3,
  FolderKanban,
  Loader2,
  Plus,
  Route,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Progress } from "@/components/ui/progress";
import { generateRoadmap, ClientApiError } from "@/lib/api-client";
import type { Difficulty, RoadmapTask } from "@/lib/types";
import { cn, formatDate, roadmapProgress } from "@/lib/utils";

const difficultyVariant: Record<
  Difficulty,
  "outline" | "info" | "warning"
> = {
  Beginner: "outline",
  Intermediate: "info",
  Advanced: "warning",
};

function RoadmapContent() {
  const {
    state,
    saveRoadmap,
    toggleTask,
    addTask,
    deleteTask,
    rescheduleTask,
  } = useCareerPilot();
  const { roadmap, analysis, jobTarget, profile } = state;
  const searchParams = useSearchParams();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTaskWeek, setNewTaskWeek] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("4");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [completionCriteria, setCompletionCriteria] = useState("");
  const autoRan = useRef(false);

  const progress = roadmapProgress(roadmap);
  const tasks = roadmap?.weeks.flatMap((week) => week.tasks) ?? [];
  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingHours = tasks
    .filter((task) => !task.completed)
    .reduce((total, task) => total + task.estimatedHours, 0);
  const nextTask = tasks.find((task) => !task.completed) ?? null;
  const currentWeek =
    roadmap?.weeks.find((week) => week.tasks.some((task) => !task.completed))
      ?.week ?? 4;
  const roadmapStale = Boolean(
    roadmap &&
      analysis &&
      (roadmap.targetRole !== analysis.targetRole ||
        new Date(roadmap.updatedAt).getTime() <
          new Date(analysis.createdAt).getTime()),
  );

  const runRoadmap = useCallback(
    async (mode: "generate" | "adapt") => {
      if (!analysis || !jobTarget) return;
      setGenerating(true);
      setError(null);
      try {
        const response = await generateRoadmap({
          mode,
          profile,
          jobTarget,
          analysis,
          existingRoadmap: mode === "adapt" ? roadmap : null,
        });
        saveRoadmap(response.roadmap);
        toast.success(mode === "adapt" ? "Roadmap adapted" : "Roadmap generated", {
          description:
            mode === "adapt"
              ? "Completed and custom tasks were kept while the plan shifted around them."
              : response.engine === "gemini"
                ? "Gemini built a four-week plan from your current gaps."
                : "The local coach built a four-week plan from your current gaps.",
        });
      } catch (caught) {
        const message =
          caught instanceof ClientApiError
            ? caught.message
            : "The roadmap could not be generated. Your existing plan is unchanged.";
        setError(message);
        toast.error("Roadmap not generated", { description: message });
      } finally {
        setGenerating(false);
      }
    },
    [analysis, jobTarget, profile, roadmap, saveRoadmap],
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
    void runRoadmap(roadmap ? "adapt" : "generate");
  }, [analysis, jobTarget, roadmap, runRoadmap, searchParams]);

  function openAddTask(week: number) {
    setNewTaskWeek(week);
    setTitle("");
    setDescription("");
    setSkill(analysis?.gaps[0]?.skill ?? "");
    setEstimatedHours("4");
    setDifficulty("Beginner");
    setCompletionCriteria("");
    setDialogOpen(true);
  }

  function handleAddTask() {
    if (!roadmap) return;
    if (title.trim().length < 3 || skill.trim().length < 2) {
      toast.error("Add a task title and the skill it practices.");
      return;
    }
    const hours = Number(estimatedHours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 40) {
      toast.error("Estimated hours must be between 0 and 40.");
      return;
    }
    addTask(newTaskWeek, {
      title: title.trim(),
      description:
        description.trim() ||
        "A self-added task focused on the skill named above.",
      skill: skill.trim(),
      estimatedHours: Math.round(hours * 2) / 2,
      difficulty,
      resourceSuggestions: [
        `Search: "${skill.trim()} official documentation"`,
        `Search: "${skill.trim()} practice exercise"`,
      ],
      completionCriteria:
        completionCriteria.trim() ||
        "Produce a short artifact and explain what you learned.",
    });
    setDialogOpen(false);
    toast.success("Task added to your plan", {
      description: `Week ${newTaskWeek} now includes your custom task.`,
    });
  }

  function moveTask(task: RoadmapTask, week: number) {
    if (week === task.week) return;
    rescheduleTask(task.id, week);
    toast.success("Task rescheduled", {
      description: `“${task.title}” moved to week ${week}.`,
    });
  }

  if (!analysis || !jobTarget) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Module 05 · Adaptive learning plan"
          title="Learning roadmap"
          description="Turn a real skill-gap analysis into a focused four-week plan. Without a target and gap analysis, CareerPilot will not invent a curriculum."
          actions={<AIEngineBadge />}
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-5 sm:p-6">
            <EmptyState
              icon={Route}
              title="A target and gap analysis come first"
              description="Your roadmap is derived from a job description you supplied. Add one, analyze your fit, then return here to build the plan."
              action={
                <Button asChild>
                  <Link href="/skill-gap">
                    {jobTarget ? "Finish skill gap analysis" : "Add a job description"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">How the plan stays honest</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Tasks come from recorded gaps, not a generic bootcamp.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Completion means producing evidence, not just watching videos.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                No fake course links, certificates, or claimed job outcomes.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 05 · Adaptive learning plan"
        title="Learning roadmap"
        description={`A four-week plan for ${analysis.targetRole}${
          analysis.company ? ` at ${analysis.company}` : ""
        }, prioritized from your recorded gaps. Complete work, reschedule it, or adapt the plan as evidence changes.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AIEngineBadge />
            <Button
              type="button"
              onClick={() => void runRoadmap(roadmap ? "adapt" : "generate")}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : roadmap ? (
                <WandSparkles className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {roadmap ? "Adapt plan" : "Generate roadmap"}
            </Button>
          </div>
        }
      />

      {error ? (
        <Alert
          variant="error"
          title="Roadmap request failed"
          icon={<CircleAlert className="h-4 w-4" />}
          className="mt-4"
        >
          {error}
        </Alert>
      ) : null}

      {roadmapStale ? (
        <Alert
          variant="warning"
          title="Your gaps changed after this plan was created"
          icon={<CircleAlert className="h-4 w-4" />}
          className="mt-4"
        >
          Adapt the roadmap to focus on the newest analysis. Completed and custom tasks
          will be preserved.
        </Alert>
      ) : null}

      {generating ? (
        <Card className="mt-4 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">
                {roadmap ? "Adapting your four-week plan…" : "Building your four-week plan…"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Prioritizing gaps and turning each one into observable practice.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {!roadmap ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-5 sm:p-6">
            <EmptyState
              icon={Route}
              title="Your plan is ready to be built"
              description={`CareerPilot will turn your ${analysis.gaps.length} assessed skills into four weeks of realistic tasks, beginning with the highest-priority gaps.`}
              action={
                <Button
                  type="button"
                  onClick={() => void runRoadmap("generate")}
                  disabled={generating}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate my four-week plan
                </Button>
              }
            />
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Current focus</p>
            <div className="mt-3 space-y-2">
              {analysis.gaps
                .filter((gap) => gap.priority === "high")
                .slice(0, 4)
                .map((gap) => (
                  <div
                    key={gap.skill}
                    className="rounded-lg border border-border bg-muted/25 p-2.5"
                  >
                    <p className="text-xs font-medium">{gap.skill}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                      {gap.learningAction}
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      Four-week plan · {roadmap.targetRole}
                    </h2>
                    <Badge variant={roadmap.engine === "gemini" ? "success" : "warning"}>
                      {roadmap.engine === "gemini" ? "Gemini plan" : "Local plan"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDate(roadmap.createdAt)} · last updated{" "}
                    {formatDate(roadmap.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-semibold tracking-tight">{progress}%</p>
                    <p className="text-[10px] text-muted-foreground">complete</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="text-right">
                    <p className="text-2xl font-semibold tracking-tight">
                      {completedCount}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{tasks.length}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">tasks</p>
                  </div>
                </div>
              </div>
              <Progress value={progress} className="mt-4 h-2" label="Roadmap progress" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-muted/25 p-2.5">
                  <p className="text-sm font-semibold">{remainingHours}h</p>
                  <p className="text-[10px] text-muted-foreground">estimated left</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-2.5">
                  <p className="text-sm font-semibold">Week {currentWeek}</p>
                  <p className="text-[10px] text-muted-foreground">current focus</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-2.5">
                  <p className="truncate text-sm font-semibold">
                    {tasks.filter((task) => task.origin === "user").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">custom tasks</p>
                </div>
              </div>
            </Card>

            {roadmap.weeks.map((week) => {
              const weekDone = week.tasks.filter((task) => task.completed).length;
              const weekProgress = week.tasks.length
                ? Math.round((weekDone / week.tasks.length) * 100)
                : 0;
              const weekHours = week.tasks
                .filter((task) => !task.completed)
                .reduce((total, task) => total + task.estimatedHours, 0);
              return (
                <Card key={week.week} className="overflow-hidden">
                  <div
                    className={cn(
                      "flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:px-6",
                      week.week === currentWeek && "bg-accent/25",
                    )}
                  >
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                          weekDone === week.tasks.length && week.tasks.length
                            ? "bg-emerald-50 text-emerald-700"
                            : week.week === currentWeek
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {weekDone === week.tasks.length && week.tasks.length ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          week.week
                        )}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-semibold">Week {week.week}</h3>
                          {week.week === currentWeek ? (
                            <Badge variant="default">Current</Badge>
                          ) : null}
                          {weekDone === week.tasks.length && week.tasks.length ? (
                            <Badge variant="success">Complete</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {week.objective}
                        </p>
                        {week.topics.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {week.topics.map((topic) => (
                              <Badge key={topic} variant="outline">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {weekHours}h left
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={weekProgress}
                          className="h-1.5 w-20"
                          label={`Week ${week.week} progress`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {weekProgress}%
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAddTask(week.week)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add task
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {week.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "p-5 transition-colors sm:px-6",
                          task.completed && "bg-muted/20",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            aria-label={
                              task.completed
                                ? `Mark ${task.title} incomplete`
                                : `Mark ${task.title} complete`
                            }
                            aria-pressed={task.completed}
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                              task.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-border text-transparent hover:border-primary/50 hover:text-primary/40",
                            )}
                          >
                            {task.completed ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  task.completed &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                {task.title}
                              </p>
                              <Badge variant={difficultyVariant[task.difficulty]}>
                                {task.difficulty}
                              </Badge>
                              <Badge variant="secondary">{task.skill}</Badge>
                              {task.origin === "user" ? (
                                <Badge variant="outline">Your task</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                              {task.description}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                {task.estimatedHours}h estimated
                              </span>
                              {task.completed && task.completedAt ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completed {formatDate(task.completedAt)}
                                </span>
                              ) : null}
                              <details className="w-full">
                                <summary className="cursor-pointer list-none text-[10px] font-medium text-primary">
                                  Completion criteria & resources
                                </summary>
                                <div className="mt-2 rounded-lg border border-border bg-muted/25 p-3">
                                  <p className="text-[11px] leading-relaxed">
                                    <span className="font-medium">Done when:</span>{" "}
                                    {task.completionCriteria}
                                  </p>
                                  <ul className="mt-2 space-y-1">
                                    {task.resourceSuggestions.map((resource) => (
                                      <li
                                        key={resource}
                                        className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground"
                                      >
                                        <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                                        {resource}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </details>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!task.completed ? (
                              <div className="hidden sm:block">
                                <Select
                                  value={String(task.week)}
                                  onChange={(event) =>
                                    moveTask(task, Number(event.target.value))
                                  }
                                  aria-label={`Move ${task.title} to another week`}
                                  className="h-8 w-[104px] text-[10px]"
                                >
                                  {[1, 2, 3, 4].map((weekNumber) => (
                                    <option key={weekNumber} value={weekNumber}>
                                      Move to week {weekNumber}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            ) : null}
                            {task.origin === "user" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  deleteTask(task.id);
                                  toast.success("Custom task removed");
                                }}
                                aria-label={`Delete ${task.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        {!task.completed ? (
                          <div className="mt-3 flex items-center justify-end sm:hidden">
                            <Select
                              value={String(task.week)}
                              onChange={(event) =>
                                moveTask(task, Number(event.target.value))
                              }
                              aria-label={`Move ${task.title} to another week`}
                              className="h-8 w-[134px] text-[10px]"
                            >
                              {[1, 2, 3, 4].map((weekNumber) => (
                                <option key={weekNumber} value={weekNumber}>
                                  Move to week {weekNumber}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!week.tasks.length ? (
                      <div className="p-6 text-center">
                        <p className="text-xs text-muted-foreground">
                          No tasks in this week yet. Add your own or adapt the plan.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Route className="h-4 w-4 text-primary" />
                Up next
              </div>
              {nextTask ? (
                <>
                  <p className="mt-3 text-sm font-medium">{nextTask.title}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Week {nextTask.week} · {nextTask.estimatedHours}h ·{" "}
                    {nextTask.difficulty}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {nextTask.completionCriteria}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => toggleTask(nextTask.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark complete
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Every task is complete. Adapt the plan to build the next stage from
                  your updated evidence.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" />
                Plan rules
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Week 1 prioritizes the highest-impact gaps.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Every task ends with observable evidence.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Adapting keeps your completed and custom work.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Hours are estimates, not a promise of mastery.
                </li>
              </ul>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderKanban className="h-4 w-4 text-primary" />
                Turn practice into proof
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Convert your roadmap skills into portfolio evidence the hiring
                conversation can inspect.
              </p>
              <Button asChild size="sm" className="mt-3 w-full">
                <Link href="/projects?autorun=1">
                  Recommend projects
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold">Progress is self-reported</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                CareerPilot records what you mark complete. It does not claim that you
                finished a course, earned a certificate, or gained employer-verified
                experience.
              </p>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a custom task</DialogTitle>
            <DialogDescription>
              Add work the generated plan missed. Custom tasks survive roadmap
              adaptation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-week">Week</Label>
                <Select
                  id="task-week"
                  value={String(newTaskWeek)}
                  onChange={(event) => setNewTaskWeek(Number(event.target.value))}
                >
                  {[1, 2, 3, 4].map((week) => (
                    <option key={week} value={week}>
                      Week {week}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-difficulty">Difficulty</Label>
                <Select
                  id="task-difficulty"
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(event.target.value as Difficulty)
                  }
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Task title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Build a retrieval evaluation notebook"
                maxLength={120}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label htmlFor="task-skill">Skill practiced</Label>
                <Input
                  id="task-skill"
                  value={skill}
                  onChange={(event) => setSkill(event.target.value)}
                  placeholder="e.g. RAG evaluation"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-hours">Hours</Label>
                <Input
                  id="task-hours"
                  type="number"
                  min={0}
                  max={40}
                  step={0.5}
                  value={estimatedHours}
                  onChange={(event) => setEstimatedHours(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="What will you practice or build?"
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-criteria">Completion evidence</Label>
              <Textarea
                id="task-criteria"
                value={completionCriteria}
                onChange={(event) => setCompletionCriteria(event.target.value)}
                rows={2}
                placeholder="e.g. A notebook with three evaluated retrieval configurations and written findings."
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddTask}>
              <Plus className="h-4 w-4" />
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <RoadmapContent />
    </Suspense>
  );
}
