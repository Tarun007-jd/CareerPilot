"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useCareerPilot } from "@/components/providers/career-provider";
import { AIEngineBadge } from "@/components/shared/ai-engine-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  GapStatusBadge,
  PriorityBadge,
} from "@/components/shared/status-badges";
import { SkillReadinessChart } from "@/components/dashboard/dashboard-charts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  extractJobDescription,
  analyzeSkillGap,
  ClientApiError,
} from "@/lib/api-client";
import { DEMO_JOB_DESCRIPTION } from "@/lib/demo-data";
import type {
  GapClassification,
  JobTarget,
  SkillGap,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const PROFILE_WARNING =
  "This is a coaching estimate from the skills in your profile and the job description you supplied. It is not a hiring prediction.";

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  function add() {
    const clean = value.trim();
    if (!clean) return;
    if (items.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      setValue("");
      return;
    }
    onChange([...items, clean]);
    setValue("");
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1 py-1">
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((entry) => entry !== item))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {!items.length ? (
          <span className="text-xs text-muted-foreground">None listed.</span>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="h-8 text-xs"
          placeholder={placeholder}
          aria-label={`Add to ${label}`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          aria-label={`Add to ${label}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function countClassifications(gaps: SkillGap[]) {
  const counts: Record<GapClassification, number> = {
    strong: 0,
    partial: 0,
    missing: 0,
    "needs-improvement": 0,
  };
  for (const gap of gaps) counts[gap.classification] += 1;
  return counts;
}

function SkillGapContent() {
  const {
    state,
    saveJobTarget,
    saveAnalysis,
  } = useCareerPilot();
  const searchParams = useSearchParams();
  const { profile, jobTarget: savedTarget, analysis } = state;
  const [jd, setJd] = useState(savedTarget?.description ?? "");
  const [companyHint, setCompanyHint] = useState(savedTarget?.company ?? "");
  const [target, setTarget] = useState<JobTarget | null>(savedTarget);
  const [extractionNote, setExtractionNote] = useState<string>(
    savedTarget ? "Saved job target from your workspace." : "",
  );
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const normalizedJd = jd.trim();
  const jdChanged = Boolean(
    target && normalizedJd && normalizedJd !== target.description.trim(),
  );
  const canExtract = normalizedJd.length >= 80 && !extracting && !analyzing;
  const canAnalyze = Boolean(
    target?.requiredSkills.length && !jdChanged && !extracting && !analyzing,
  );
  const analysisStale = Boolean(
    analysis &&
      savedTarget &&
      (new Date(analysis.createdAt).getTime() <
        new Date(savedTarget.createdAt).getTime() ||
        new Date(profile.updatedAt).getTime() >
          new Date(analysis.createdAt).getTime()),
  );

  const runAnalysis = useCallback(
    async (jobTarget: JobTarget) => {
      if (!jobTarget) return;
      setAnalyzing(true);
      setError(null);
      saveJobTarget(jobTarget);
      try {
        const response = await analyzeSkillGap(
          { ...profile, targetRole: jobTarget.title },
          jobTarget,
        );
        saveAnalysis(response.analysis);
        toast.success("Skill gap analysis ready", {
          description:
            response.engine === "gemini"
              ? "Gemini compared your profile with the saved job description."
              : "The local coach compared your profile with the saved job description.",
        });
      } catch (caught) {
        const message =
          caught instanceof ClientApiError
            ? caught.message
            : "Skill gaps could not be analyzed. Your previous analysis is unchanged.";
        setError(message);
        toast.error("Analysis failed", { description: message });
      } finally {
        setAnalyzing(false);
      }
    },
    [profile, saveAnalysis, saveJobTarget],
  );

  useEffect(() => {
    if (
      autoRan.current ||
      searchParams.get("autorun") !== "1" ||
      !savedTarget
    ) {
      return;
    }
    autoRan.current = true;
    void runAnalysis(savedTarget);
  }, [runAnalysis, savedTarget, searchParams]);

  async function extractRequirements() {
    if (!canExtract) return;
    setExtracting(true);
    setError(null);
    try {
      const response = await extractJobDescription(
        normalizedJd,
        companyHint.trim() || undefined,
      );
      setTarget(response.jobTarget);
      setCompanyHint(response.jobTarget.company);
      setExtractionNote(response.extractionNote);
      saveJobTarget(response.jobTarget);
      toast.success("Job requirements extracted", {
        description:
          "Review the role details and required skills. Correct anything wrong, then analyze your fit.",
      });
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "The job description could not be parsed. Nothing was saved.";
      setError(message);
      toast.error("Could not extract requirements", { description: message });
    } finally {
      setExtracting(false);
    }
  }

  function updateTarget(patch: Partial<JobTarget>) {
    setTarget((current) => (current ? { ...current, ...patch } : current));
  }

  const classificationCounts = analysis
    ? countClassifications(analysis.gaps)
    : null;
  const sortedGaps = analysis
    ? [...analysis.gaps].sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return (
          priority[b.priority] - priority[a.priority] || b.gapScore - a.gapScore
        );
      })
    : [];
  const focusActions = sortedGaps
    .filter((gap) => gap.priority === "high")
    .slice(0, 3);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Module 04 · Evidence-based gap mapping"
        title="Skill gap analysis"
        description="Bring a real job description. CareerPilot compares its requirements against your profile and shows exactly what to learn next — without inventing a live listing."
        actions={<AIEngineBadge />}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Target job description</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Paste the role you are actually pursuing. 80 characters minimum.
                </p>
              </div>
              {!normalizedJd ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setJd(DEMO_JOB_DESCRIPTION);
                    setCompanyHint("Nimbus Labs");
                    setError(null);
                  }}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Use labeled sample
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="space-y-1.5">
                <Label htmlFor="job-description">Job description</Label>
                <Textarea
                  id="job-description"
                  value={jd}
                  onChange={(event) => {
                    setJd(event.target.value);
                    setError(null);
                  }}
                  rows={12}
                  maxLength={60000}
                  placeholder="Paste the full job description, including responsibilities, requirements, and preferred qualifications…"
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company-hint">Company</Label>
                  <Input
                    id="company-hint"
                    value={companyHint}
                    onChange={(event) => setCompanyHint(event.target.value)}
                    placeholder="Optional company hint"
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/25 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">Why paste it yourself?</p>
                  <p className="mt-1">
                    CareerPilot does not scrape job boards or invent openings. The
                    source text stays visible and attributable to you.
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{normalizedJd.length.toLocaleString()} characters</span>
                  {normalizedJd.length > 0 && normalizedJd.length < 80 ? (
                    <span className="text-amber-600">
                      {80 - normalizedJd.length} more needed
                    </span>
                  ) : (
                    <span className="text-emerald-600">Ready to extract</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                Extraction identifies requirements from the text. It does not verify
                that the role is still open.
              </p>
              <Button
                type="button"
                onClick={() => void extractRequirements()}
                disabled={!canExtract}
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                {target?.requiredSkills.length
                  ? "Re-extract requirements"
                  : "Extract requirements"}
              </Button>
            </div>

            {error ? (
              <Alert
                variant="error"
                title="Skill gap request failed"
                icon={<CircleAlert className="h-4 w-4" />}
                className="mt-4"
              >
                {error}
              </Alert>
            ) : null}

            {analyzing ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Comparing your profile…</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Scoring each required skill from your saved proficiency levels.
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          {target ? (
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Review job requirements</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {extractionNote || "Review the extracted target before analyzing."}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">
                  User-provided JD
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="target-title">Role title</Label>
                  <Input
                    id="target-title"
                    value={target.title}
                    onChange={(event) => updateTarget({ title: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-company">Company</Label>
                  <Input
                    id="target-company"
                    value={target.company}
                    onChange={(event) => updateTarget({ company: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="target-experience">Experience requirement</Label>
                  <Input
                    id="target-experience"
                    value={target.experienceRequirement}
                    onChange={(event) =>
                      updateTarget({ experienceRequirement: event.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <StringListEditor
                  label="Required skills"
                  items={target.requiredSkills}
                  onChange={(items) => updateTarget({ requiredSkills: items })}
                  placeholder="Add a required skill"
                />
                <StringListEditor
                  label="Preferred skills"
                  items={target.preferredSkills}
                  onChange={(items) => updateTarget({ preferredSkills: items })}
                  placeholder="Add a preferred skill"
                />
                <StringListEditor
                  label="Tools & technologies"
                  items={target.toolsAndTechnologies}
                  onChange={(items) => updateTarget({ toolsAndTechnologies: items })}
                  placeholder="Add a tool or technology"
                />
                <div className="space-y-2">
                  <p className="text-xs font-medium">Responsibilities</p>
                  <ul className="max-h-36 space-y-1 overflow-auto rounded-lg border border-border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    {target.responsibilities.map((item) => (
                      <li key={item} className="flex gap-1.5">
                        <span className="text-primary">·</span>
                        {item}
                      </li>
                    ))}
                    {!target.responsibilities.length ? (
                      <li>None extracted.</li>
                    ) : null}
                  </ul>
                </div>
              </div>

              {jdChanged ? (
                <Alert variant="warning" className="mt-4">
                  The job description text has changed since these requirements were
                  extracted. Re-extract before analyzing so the comparison stays
                  honest.
                </Alert>
              ) : null}

              {target && !target.requiredSkills.length ? (
                <Alert variant="warning" className="mt-4">
                  This target has no required skills yet. Extract the requirements or
                  add at least one required skill manually before analyzing your fit.
                </Alert>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {target.requiredSkills.length + target.preferredSkills.length} skills
                  captured · corrections are saved with the target.
                </p>
                <Button
                  type="button"
                  onClick={() => void runAnalysis(target)}
                  disabled={!canAnalyze}
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                  {analysis ? "Re-analyze my fit" : "Analyze my fit"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <EmptyState
                icon={Target}
                title="No job target extracted yet"
                description="Add a real job description and extract its requirements. You will be able to correct every required skill before comparing."
              />
            </Card>
          )}

          {analysis ? (
            <>
              {analysisStale ? (
                <Alert
                  variant="warning"
                  title="This comparison may be out of date"
                  icon={<CircleAlert className="h-4 w-4" />}
                >
                  Your profile or saved job target changed after this analysis. Re-run
                  the fit check to refresh the recommendations.
                </Alert>
              ) : null}

              <Card className="overflow-hidden">
                <div className="border-b border-border bg-gradient-to-br from-accent/60 via-card to-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Your current fit
                      </p>
                      <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                        {analysis.targetRole}
                        {analysis.company ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            at {analysis.company}
                          </span>
                        ) : null}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {analysis.sourceNote} · analyzed {formatDate(analysis.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-3xl font-semibold tracking-tight">
                          {analysis.readinessScore}
                          <span className="text-sm font-normal text-muted-foreground">
                            /100
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          readiness estimate
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress
                      value={analysis.readinessScore}
                      className="h-2.5 bg-white/70"
                      label="Readiness score"
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border/70 bg-card/80 p-2.5">
                      <p className="text-lg font-semibold">{analysis.matchedCount}</p>
                      <p className="text-[10px] text-muted-foreground">strong or partial</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card/80 p-2.5">
                      <p className="text-lg font-semibold">{analysis.missingCount}</p>
                      <p className="text-[10px] text-muted-foreground">missing</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-card/80 p-2.5">
                      <p className="text-lg font-semibold">{analysis.gaps.length}</p>
                      <p className="text-[10px] text-muted-foreground">skills assessed</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {analysis.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Badge variant="strong">
                      {classificationCounts?.strong ?? 0} strong
                    </Badge>
                    <Badge variant="partial">
                      {classificationCounts?.partial ?? 0} partial
                    </Badge>
                    <Badge variant="missing">
                      {classificationCounts?.missing ?? 0} missing
                    </Badge>
                    <Badge variant="needs-improvement">
                      {classificationCounts?.["needs-improvement"] ?? 0} needs work
                    </Badge>
                    <Badge variant="outline">
                      {analysis.engine === "gemini" ? "Gemini analysis" : "Local analysis"}
                    </Badge>
                  </div>
                </div>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold">Current vs target level</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Top gaps by priority and evidence gap.
                      </p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-3">
                    <SkillReadinessChart gaps={analysis.gaps} />
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Focus this week</h2>
                  </div>
                  <div className="mt-3 space-y-3">
                    {focusActions.map((gap, index) => (
                      <div
                        key={gap.skill}
                        className="rounded-lg border border-border bg-muted/25 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{gap.skill}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {gap.learningAction}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!focusActions.length ? (
                      <p className="text-xs text-muted-foreground">
                        No high-priority gaps were identified. Keep strengthening the
                        partial matches and document proof of your work.
                      </p>
                    ) : null}
                  </div>
                  <Button asChild size="sm" className="mt-4 w-full">
                    <Link href="/roadmap?autorun=1">
                      Build my roadmap
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="border-b border-border p-5 sm:px-6">
                  <h2 className="text-sm font-semibold">Every assessed skill</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Current levels come from your Career Profile. Adjust them there if
                    this comparison feels wrong.
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {sortedGaps.map((gap) => (
                    <div
                      key={gap.skill}
                      className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(160px,0.85fr)_minmax(220px,1.25fr)_minmax(220px,1.15fr)]"
                    >
                      <div>
                        <p className="text-sm font-medium">{gap.skill}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <GapStatusBadge classification={gap.classification} />
                          <PriorityBadge priority={gap.priority} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>You</span>
                            <span>{gap.currentLevel}%</span>
                          </div>
                          <Progress value={gap.currentLevel} className="mt-1 h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Role target</span>
                            <span>{gap.requiredLevel}%</span>
                          </div>
                          <Progress
                            value={gap.requiredLevel}
                            className="mt-1 h-1.5"
                            indicatorClassName="bg-indigo-300"
                          />
                        </div>
                      </div>
                      <div className="text-xs leading-relaxed">
                        <p className="text-muted-foreground">{gap.reason}</p>
                        <p className="mt-1.5 font-medium text-foreground">
                          {gap.learningAction}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border bg-muted/25 px-5 py-4 sm:px-6">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {analysis.disclaimer || PROFILE_WARNING}
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-5 sm:p-6">
              <EmptyState
                icon={Target}
                title="Your fit analysis will appear here"
                description="CareerPilot needs your profile skills and a user-supplied job description. Nothing is scored until both exist."
                compact
              />
            </Card>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              Readiness snapshot
            </div>
            {analysis ? (
              <>
                <div className="mt-4 flex items-end gap-2">
                  <p className="text-4xl font-semibold tracking-tight">
                    {analysis.readinessScore}
                  </p>
                  <span className="pb-1 text-xs text-muted-foreground">/100</span>
                </div>
                <Progress value={analysis.readinessScore} className="mt-2" />
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50 p-2.5">
                    <p className="font-semibold text-emerald-700">
                      {analysis.matchedCount}
                    </p>
                    <p className="text-[10px] text-emerald-600">matched</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2.5">
                    <p className="font-semibold text-rose-700">
                      {analysis.missingCount}
                    </p>
                    <p className="text-[10px] text-rose-600">missing</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                  Readiness is a coaching estimate, not an ATS score or hiring
                  probability.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href="/profile">
                    Adjust skill evidence
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Extract a job description and analyze your fit to get a readiness
                estimate and prioritized learning actions.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Check className="h-4 w-4 text-primary" />
              What this does
            </div>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Reads only the JD you paste
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Uses your saved skill levels as evidence
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Gives each gap a reason and next action
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                Keeps the source note and limitations visible
              </li>
            </ul>
          </Card>

          <Alert variant="neutral" title="No live jobs, no guesses">
            CareerPilot never fetches live listings, invents a job, or implies an
            employer endorsed this analysis. Company names and requirements are only
            what you provide.
          </Alert>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RefreshCw className="h-4 w-4 text-primary" />
              Rerun after changes
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Update your skills in Career Profile, then re-analyze. The roadmap uses
              the newest saved comparison.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/resume">
                Update resume evidence
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SkillGapPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <SkillGapContent />
    </Suspense>
  );
}
