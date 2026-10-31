"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  FolderKanban,
  Gauge,
  MessagesSquare,
  Route,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useCareerPilot } from "@/components/providers/career-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import {
  ApplicationStatusBadge,
  GapStatusBadge,
  ProjectStatusBadge,
} from "@/components/shared/status-badges";
import {
  ApplicationPipelineChart,
  InterviewTrendChart,
  SkillReadinessChart,
} from "@/components/dashboard/dashboard-charts";
import {
  averageInterviewScore,
  calculateApplicationStats,
  completedTaskHoursLastWeek,
  formatHours,
  formatDate,
  gapStats,
  getInitials,
  learningStreak,
  preparationScore,
  relativeDate,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

function SetupCard() {
  const { loadDemoWorkspace } = useCareerPilot();
  const steps = [
    {
      title: "Build your career profile",
      description: "Add your education, skills, experience, and target role.",
      href: "/profile",
      icon: Target,
      action: "Open profile",
    },
    {
      title: "Bring in your resume",
      description: "Upload a PDF or paste text, then review the extracted details.",
      href: "/resume",
      icon: Sparkles,
      action: "Parse resume",
    },
    {
      title: "Map a real job description",
      description: "See matched, partial, and missing skills against requirements.",
      href: "/skill-gap",
      icon: Gauge,
      action: "Analyze gaps",
    },
  ];
  return (
    <div className="page-shell">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 shadow-soft sm:px-10 sm:py-14">
        <div className="subtle-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                Voice-first career intelligence
              </Badge>
              <AIEngineBadge />
            </div>
            <h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
              Your career shouldn’t be a <span className="text-gradient">guess</span>.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              CareerPilot compares your real skills and resume against a job
              description you supply, then builds an adaptive plan around the gap.
              Start with three inputs. Everything else follows your data.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/profile">
                  Create your profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void loadDemoWorkspace()}
              >
                <Sparkles className="h-4 w-4" />
                Explore with a sample student
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sample data is clearly labeled. CareerPilot does not generate fake
              analysis unless you run the real workflow.
            </p>
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.href}
                  href={step.href}
                  className="group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="text-[10px] font-semibold text-muted-foreground/60">
                        0{index + 1}
                      </span>
                      {step.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
  accent = "indigo",
  children,
}: {
  icon: typeof Gauge;
  label: string;
  value: string | number;
  suffix?: string;
  sub?: React.ReactNode;
  accent?: "indigo" | "emerald" | "amber" | "sky";
  children?: React.ReactNode;
}) {
  const accentClasses = {
    indigo: "border-primary/10 bg-accent text-primary",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
  };
  return (
    <Card className="card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 flex items-baseline gap-1 text-[28px] font-semibold tracking-[-0.03em] text-foreground">
            {value}
            {suffix ? (
              <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            accentClasses[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {children}
      {sub ? <div className="mt-3 text-xs leading-relaxed text-muted-foreground">{sub}</div> : null}
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const { state, toggleTask, aiStatus } = useCareerPilot();
  const { profile, analysis, roadmap, projects, interviews, applications } = state;

  if (!profile.name || !profile.targetRole) {
    return <SetupCard />;
  }

  const firstName = profile.name.split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const prep = preparationScore(state);
  const skillGaps = analysis?.gaps ?? [];
  const stats = gapStats(analysis);
  const appStats = calculateApplicationStats(applications);
  const weeklyHours = completedTaskHoursLastWeek(roadmap);
  const streak = learningStreak(roadmap);
  const tasks = roadmap?.weeks.flatMap((week) => week.tasks) ?? [];
  const upcoming = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => a.week - b.week)
    .slice(0, 4);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const averageScore = averageInterviewScore(interviews);
  const recentInterviews = [...interviews]
    .filter((interview) => interview.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime(),
    )
    .slice(0, 3);
  const recentApplications = [...applications]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);
  const missingSkills = skillGaps.filter(
    (gap) => gap.classification === "missing" || gap.classification === "needs-improvement",
  );
  const targetMismatch = analysis && analysis.targetRole !== profile.targetRole;
  const analysisStale = analysis && profile.updatedAt > analysis.createdAt;
  const recommendedProjects = [...projects]
    .sort((a, b) => {
      const order = { recommended: 0, saved: 0, in_progress: 1, completed: 2 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 3);

  function handleToggleTask(taskId: string, completed: boolean) {
    toggleTask(taskId);
    toast.success(completed ? "Task reopened" : "Task completed", {
      description: completed
        ? "Your roadmap progress has been updated."
        : weeklyHours >= 0
          ? "Progress saved. Review the roadmap to adapt what’s next."
          : undefined,
    });
  }

  return (
    <div className="page-shell">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="subtle-grid pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                Target · {profile.targetRole}
              </Badge>
              <AIEngineBadge />
            </div>
            <h1 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[30px]">
              {greeting}, {firstName}. Let’s move the <span className="text-gradient">needle</span>.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {analysis
                ? `You’re estimated at ${analysis.readinessScore}% readiness for ${analysis.targetRole}. ${
                    missingSkills.length
                      ? `${missingSkills.length} priority skill${
                          missingSkills.length === 1 ? "" : "s"
                        } still stand between you and the role.`
                      : "Your recorded profile covers every requirement in the saved job description."
                  }`
                : "Your profile is ready. Add a real job description to turn it into a measurable skill-gap plan."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={analysis ? "/roadmap" : "/skill-gap"}>
                  {analysis ? "Continue your roadmap" : "Analyze a job description"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/assistant">
                  <Sparkles className="h-3.5 w-3.5" />
                  Dictate an update
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-6 rounded-xl border border-border bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:gap-6">
            <div className="relative h-[112px] w-[112px]">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <defs>
                  <linearGradient id="readiness-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(243 54% 55%)" />
                    <stop offset="100%" stopColor="hsl(199 89% 55%)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="hsl(226 30% 93%)"
                  strokeWidth="9"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#readiness-gradient)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${(prep / 100) * 314.16} 314.16`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tracking-[-0.04em]">{prep}%</span>
                <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Prepared
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Skill readiness
                </p>
                <p className="mt-0.5 text-lg font-semibold">
                  {analysis ? `${analysis.readinessScore}%` : "Not analyzed"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Roadmap
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {tasks.length ? `${completedTasks}/${tasks.length} tasks` : "No plan yet"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Practice
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {averageScore !== null ? `${averageScore}/100 avg` : "Not started"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {targetMismatch || analysisStale ? (
        <Alert
          variant="warning"
          className="mt-4"
          title="Your analysis may be out of date"
          icon={<CircleAlert className="h-4 w-4" />}
        >
          {targetMismatch
            ? `Your target role is now ${profile.targetRole}, but the saved analysis was built for ${analysis.targetRole}. Rerun the analysis before relying on these gaps.`
            : "You changed your profile after the last skill-gap analysis. Rerun it to keep the dashboard, roadmap, and projects aligned."}{" "}
          <Link href="/skill-gap" className="font-semibold underline underline-offset-2">
            Review the analysis
          </Link>
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Gauge}
          label="Career preparation"
          value={prep}
          suffix="%"
          accent="indigo"
          sub="Composite of profile, skill readiness, plan progress, and interview evidence."
        >
          <Progress value={prep} className="mt-3 h-1.5" label="Career preparation" />
        </MetricCard>
        <MetricCard
          icon={Activity}
          label="Estimated skill readiness"
          value={analysis ? analysis.readinessScore : "—"}
          suffix={analysis ? "%" : undefined}
          accent="sky"
          sub={
            analysis
              ? `Based on ${analysis.gaps.length} requirements from your supplied job description.`
              : "Run a job-description analysis to establish readiness."
          }
        >
          {analysis ? (
            <Progress
              value={analysis.readinessScore}
              className="mt-3 h-1.5"
              indicatorClassName="bg-sky-500"
              label="Estimated skill readiness"
            />
          ) : null}
        </MetricCard>
        <MetricCard
          icon={Target}
          label="Skills assessed"
          value={analysis ? analysis.gaps.length : "—"}
          accent="amber"
          sub={
            analysis ? (
              <span className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="text-emerald-700">{stats.strong} strong</span>
                <span>·</span>
                <span className="text-rose-700">{stats.missing} missing</span>
                <span>·</span>
                <span className="text-amber-700">{stats.needsImprovement} to improve</span>
              </span>
            ) : (
              "No requirement set has been analyzed yet."
            )
          }
        />
        <MetricCard
          icon={Flame}
          label="Learning momentum"
          value={streak}
          suffix={streak === 1 ? "day streak" : "day streak"}
          accent="emerald"
          sub={`${formatHours(weeklyHours)} completed in the last 7 days · ${
            tasks.filter((task) => !task.completed).length
          } tasks pending.`}
        >
          <div className="mt-3 flex items-center gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <span
                key={day}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  day < Math.min(7, streak) ? "bg-emerald-500/70" : "bg-muted",
                )}
              />
            ))}
          </div>
        </MetricCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="min-w-0 p-5 sm:p-6 xl:col-span-2">
          <SectionHeader
            title="Skill readiness map"
            description={
              analysis
                ? `Current estimated level versus target level for ${analysis.targetRole}. The target is inferred from the job description you supplied.`
                : "Analyze a job description to visualize your skill fit."
            }
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/skill-gap">
                  View analysis
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {skillGaps.length ? (
            <>
              <div className="mt-5">
                <SkillReadinessChart gaps={skillGaps} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-indigo-500" /> Current estimate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-indigo-100" /> Required level
                </span>
                <span className="ml-auto">
                  AI-generated estimates, not verified certifications.
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Gauge}
                title="No skill analysis yet"
                description="Paste a real job description and analyze it against your saved profile. Nothing is inferred from live listings."
                action={
                  <Button asChild size="sm">
                    <Link href="/skill-gap">Analyze skill gaps</Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeader
            title="Application health"
            description="Calculated from only the applications you recorded."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/applications">
                  Tracker
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {applications.length ? (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: "Response rate", value: `${appStats.responseRate}%`, hint: "Statuses beyond Applied or Interested" },
                  { label: "Interview rate", value: `${appStats.interviewConversionRate}%`, hint: "Interview/Offer or an interview date recorded" },
                  { label: "Offers", value: appStats.offers, hint: "Applications with Offer status" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-border bg-muted/25 p-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">{metric.value}</p>
                    <p className="mt-1 text-[9px] leading-snug text-muted-foreground/80">{metric.hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <ApplicationPipelineChart applications={applications} />
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                {appStats.applied} submitted · {appStats.responses} recorded response
                {appStats.responses === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={BriefcaseBusiness}
                title="No applications recorded"
                description="Add real applications to see response and interview conversion rates."
                action={
                  <Button asChild size="sm">
                    <Link href="/applications">Add application</Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6 xl:col-span-2">
          <SectionHeader
            title="Your next move"
            description={
              roadmap
                ? `Upcoming tasks across your four-week plan for ${roadmap.targetRole}.`
                : "Generate a roadmap to turn gaps into a sequenced plan."
            }
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/roadmap">
                  Full roadmap
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {upcoming.length ? (
            <div className="mt-4 divide-y divide-border">
              {upcoming.map((task) => (
                <div key={task.id} className="flex items-start gap-3 py-3 last:pb-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.completed}
                    aria-label={`Mark ${task.title} complete`}
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-card transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {task.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> Week {task.week}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> {formatHours(task.estimatedHours)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">{task.skill}</span>
                      <Badge variant="outline" className="capitalize">
                        {task.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : roadmap ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <Trophy className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-950">All roadmap tasks are complete</p>
                <p className="mt-0.5 text-xs text-emerald-900/70">
                  Adapt the remaining plan or practice explaining your work in a mock interview.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="ml-auto shrink-0">
                <Link href="/roadmap">Review plan</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Route}
                title="No roadmap yet"
                description={
                  analysis
                    ? "Build a four-week plan from your current skill gaps."
                    : "Complete a skill-gap analysis first so the plan is based on real requirements."
                }
                action={
                  <Button asChild size="sm">
                    <Link href={analysis ? "/roadmap" : "/skill-gap"}>
                      {analysis ? "Generate roadmap" : "Analyze skills first"}
                    </Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeader
            title="Interview practice"
            description={
              averageScore !== null
                ? `${averageScore}/100 average across ${recentInterviews.length ? interviews.filter((interview) => interview.status === "completed").length : 0} completed session${
                    interviews.filter((interview) => interview.status === "completed").length === 1 ? "" : "s"
                  }.`
                : "Practice with structured scoring, then watch evidence compound."
            }
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/interview">
                  Practice
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {recentInterviews.length ? (
            <>
              <div className="mt-4">
                <InterviewTrendChart interviews={interviews} />
              </div>
              <div className="mt-2 divide-y divide-border">
                {recentInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center gap-3 py-2.5 last:pb-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
                      {interview.overallScore}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{interview.role}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {interview.category} · {relativeDate(interview.completedAt ?? interview.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {interview.questions.length}Q
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={MessagesSquare}
                title="No completed interviews"
                description="Run a mock interview to build a score history and discover weak areas."
                action={
                  <Button asChild size="sm">
                    <Link href="/interview">Start interview</Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6 xl:col-span-2">
          <SectionHeader
            title="Recommended portfolio projects"
            description="Projects are prioritized around your recorded gaps and saved here once recommended."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/projects">
                  All projects
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {recommendedProjects.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recommendedProjects.map((project) => (
                <Link
                  key={project.id}
                  href="/projects"
                  className="group flex h-full flex-col rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/25 hover:bg-accent/25"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-primary">
                      <FolderKanban className="h-3.5 w-3.5" />
                    </span>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-snug text-foreground">
                    {project.title}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {project.problemStatement}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[10px] text-muted-foreground">
                    <span className="capitalize">{project.difficulty}</span>
                    <span>·</span>
                    <span>{project.durationWeeks} weeks</span>
                    <span>·</span>
                    <span className="truncate">{project.techStack.slice(0, 2).join(", ")}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={FolderKanban}
                title="No project recommendations yet"
                description={
                  analysis
                    ? "Generate three projects that demonstrate the competencies this role requires."
                    : "Run the skill-gap analysis first, then generate projects around the gaps."
                }
                action={
                  <Button asChild size="sm">
                    <Link href={analysis ? "/projects" : "/skill-gap"}>
                      {analysis ? "Generate projects" : "Analyze skills first"}
                    </Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeader
            title="Skill signals"
            description="Based on the last saved job-description analysis."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/skill-gap">
                  Details
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {analysis ? (
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Strong or partially matched
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.gaps
                    .filter((gap) => gap.classification === "strong" || gap.classification === "partial")
                    .slice(0, 8)
                    .map((gap) => (
                      <Badge
                        key={gap.skill}
                        variant={gap.classification === "strong" ? "success" : "info"}
                      >
                        {gap.skill}
                      </Badge>
                    ))}
                  {!analysis.gaps.some(
                    (gap) => gap.classification === "strong" || gap.classification === "partial",
                  ) ? (
                    <p className="text-xs text-muted-foreground">No matched requirements recorded yet.</p>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
                  <CircleAlert className="h-3.5 w-3.5" />
                  Missing or needs improvement
                </p>
                <div className="space-y-2">
                  {missingSkills.slice(0, 4).map((gap) => (
                    <div key={gap.skill} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-foreground/80">{gap.skill}</span>
                      <GapStatusBadge classification={gap.classification} />
                    </div>
                  ))}
                  {!missingSkills.length ? (
                    <p className="text-xs text-muted-foreground">
                      No missing skills were recorded for this requirement set.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
                {aiStatus.configured
                  ? "Gemini estimates from your supplied evidence. "
                  : "Local coach estimates from your supplied evidence. "}
                Not independently verified.
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Target}
                title="No signals yet"
                description="Your strengths and gaps appear after a job-description analysis."
              />
            </div>
          )}
        </Card>

        <Card className="min-w-0 p-5 sm:p-6 xl:col-span-3">
          <SectionHeader
            title="Recent application activity"
            description="A record of what you submitted and what happened next. CareerPilot never invents outcomes."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/applications">
                  Manage applications
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          {recentApplications.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="pb-2.5 pr-4 font-medium">Company</th>
                    <th className="pb-2.5 pr-4 font-medium">Role</th>
                    <th className="pb-2.5 pr-4 font-medium">Applied</th>
                    <th className="pb-2.5 pr-4 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Next interview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentApplications.map((application) => (
                    <tr key={application.id} className="text-sm">
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[9px] font-semibold text-primary">
                            {getInitials(application.company)}
                          </span>
                          {application.company}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{application.title}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {formatDate(application.appliedDate)}
                      </td>
                      <td className="py-3 pr-4">
                        <ApplicationStatusBadge status={application.status} />
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {application.interviewDates.length
                          ? formatDate(application.interviewDates[0])
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={BriefcaseBusiness}
                title="Your application activity will appear here"
                description="Add a real application to track stages, response rate, and interview conversion."
                action={
                  <Button asChild size="sm">
                    <Link href="/applications">Add your first application</Link>
                  </Button>
                }
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
