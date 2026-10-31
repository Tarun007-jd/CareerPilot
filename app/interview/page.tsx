"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Lightbulb,
  ListChecks,
  Loader2,
  MessagesSquare,
  Mic,
  Play,
  RotateCcw,
  Send,
  Target,
  ThumbsUp,
  Trophy,
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
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  evaluateAnswer,
  generateInterviewQuestions,
  summarizeInterview,
  ClientApiError,
} from "@/lib/api-client";
import { createId, formatDate } from "@/lib/utils";
import type {
  InterviewCategory,
  InterviewDifficulty,
  InterviewEvaluation,
  InterviewSession,
} from "@/lib/types";

const categories: InterviewCategory[] = [
  "Technical",
  "Programming",
  "Computer Science",
  "Problem Solving",
  "Behavioral",
  "HR",
];

const difficulties: InterviewDifficulty[] = ["Easy", "Medium", "Hard"];

const rubricWeights = [
  { key: "technicalCorrectness", label: "Technical correctness", weight: 40 },
  { key: "conceptualUnderstanding", label: "Conceptual understanding", weight: 25 },
  { key: "problemSolving", label: "Problem solving", weight: 20 },
  { key: "communication", label: "Communication", weight: 15 },
] as const;

function parseCategory(value: string | null): InterviewCategory {
  return categories.includes(value as InterviewCategory)
    ? (value as InterviewCategory)
    : "Technical";
}

function parseDifficulty(value: string | null): InterviewDifficulty {
  return difficulties.includes(value as InterviewDifficulty)
    ? (value as InterviewDifficulty)
    : "Medium";
}

function firstUnansweredIndex(session: InterviewSession | null) {
  if (!session) return 0;
  const first = session.questions.findIndex((question) => !question.evaluation);
  if (first === -1) return Math.max(0, session.questions.length - 1);
  return first;
}

function scoreTone(score: number) {
  if (score >= 80) return { text: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 60) return { text: "text-sky-600", bg: "bg-sky-50" };
  if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-50" };
  return { text: "text-rose-600", bg: "bg-rose-50" };
}

function RubricMeter({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">
          {label}
          {weight ? <span className="ml-1 opacity-70">· {weight}%</span> : null}
        </span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={value} className="mt-1 h-1.5" />
    </div>
  );
}

function InterviewHistory({
  sessions,
  onOpen,
}: {
  sessions: InterviewSession[];
  onOpen: (session: InterviewSession) => void;
}) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-5 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold">Practice history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every session is saved in this browser with its real answers and scores.
          </p>
        </div>
        <History className="h-4 w-4 text-muted-foreground" />
      </div>
      {sorted.length ? (
        <div className="divide-y divide-border">
          {sorted.slice(0, 8).map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onOpen(session)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <MessagesSquare className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-xs font-medium">{session.role}</span>
                  <Badge variant="outline">{session.category}</Badge>
                  {session.status === "in_progress" ? (
                    <Badge variant="warning">In progress</Badge>
                  ) : (
                    <Badge variant="success">Completed</Badge>
                  )}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {session.questions.length} questions · {session.difficulty} ·{" "}
                  {formatDate(session.completedAt ?? session.createdAt)}
                </span>
              </span>
              {session.overallScore !== null ? (
                <span
                  className={`text-sm font-semibold ${
                    scoreTone(session.overallScore).text
                  }`}
                >
                  {session.overallScore}
                </span>
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-6">
          <EmptyState
            icon={MessagesSquare}
            title="No sessions yet"
            description="Your first scored mock interview will appear here."
            compact
          />
        </div>
      )}
    </Card>
  );
}

function InterviewContent() {
  const { state, addInterview, updateInterview } = useCareerPilot();
  const { profile, analysis, interviews } = state;
  const searchParams = useSearchParams();
  const initialActive =
    interviews.find((interview) => interview.status === "in_progress") ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialActive?.id ?? null);
  const [questionIndex, setQuestionIndex] = useState(() =>
    firstUnansweredIndex(initialActive),
  );
  const [role, setRole] = useState(
    () =>
      searchParams.get("role")?.trim() ||
      analysis?.targetRole ||
      profile.targetRole ||
      "Software Engineer",
  );
  const [category, setCategory] = useState<InterviewCategory>(() =>
    parseCategory(searchParams.get("category")),
  );
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(() =>
    parseDifficulty(searchParams.get("difficulty")),
  );
  const [questionCount, setQuestionCount] = useState(() => {
    const value = Number(searchParams.get("questions"));
    return Number.isFinite(value) && value >= 1 ? Math.min(10, Math.round(value)) : 5;
  });
  const [answer, setAnswer] = useState("");
  const [starting, setStarting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const active = activeId
    ? interviews.find((interview) => interview.id === activeId) ?? null
    : null;
  const answeredCount =
    active?.questions.filter((question) => question.evaluation).length ?? 0;
  const currentQuestion = active?.questions[questionIndex] ?? null;
  const allAnswered = Boolean(
    active && active.questions.every((question) => question.evaluation),
  );
  const answeredScores =
    active?.questions
      .map((question) => question.evaluation?.overallScore)
      .filter((score): score is number => typeof score === "number") ?? [];
  const runningAverage = answeredScores.length
    ? Math.round(
        answeredScores.reduce((total, score) => total + score, 0) /
          answeredScores.length,
      )
    : null;

  const startInterview = useCallback(
    async (overrides?: {
      role?: string;
      category?: InterviewCategory;
      difficulty?: InterviewDifficulty;
      questionCount?: number;
    }) => {
      const nextRole = (overrides?.role ?? role).trim();
      if (nextRole.length < 2) {
        toast.error("Add the role you are practicing for.");
        return;
      }
      const nextCategory = overrides?.category ?? category;
      const nextDifficulty = overrides?.difficulty ?? difficulty;
      const nextCount = Math.min(
        10,
        Math.max(1, overrides?.questionCount ?? questionCount),
      );
      setStarting(true);
      setError(null);
      try {
        const response = await generateInterviewQuestions({
          action: "generate",
          role: nextRole,
          category: nextCategory,
          difficulty: nextDifficulty,
          questionCount: nextCount,
          profile: { ...profile, targetRole: profile.targetRole || nextRole },
          analysis,
        });
        if (!response.questions.length) {
          throw new ClientApiError(
            "No interview questions were returned. Please retry.",
            { code: "EMPTY_INTERVIEW" },
          );
        }
        const now = new Date().toISOString();
        const session: InterviewSession = {
          id: createId("interview"),
          role: nextRole,
          category: nextCategory,
          difficulty: nextDifficulty,
          questions: response.questions.map((question) => ({
            id: createId("question"),
            question: question.question,
            answer: null,
            evaluation: null,
          })),
          status: "in_progress",
          overallScore: null,
          summary: null,
          engine: response.engine,
          createdAt: now,
          completedAt: null,
        };
        addInterview(session);
        setRole(nextRole);
        setCategory(nextCategory);
        setDifficulty(nextDifficulty);
        setQuestionCount(nextCount);
        setActiveId(session.id);
        setQuestionIndex(0);
        setAnswer("");
        toast.success("Mock interview started", {
          description: `${response.questions.length} ${
            response.engine === "gemini" ? "Gemini-generated" : "locally generated"
          } questions · answer one at a time.`,
        });
      } catch (caught) {
        const message =
          caught instanceof ClientApiError
            ? caught.message
            : "The interview could not be started. No session was saved.";
        setError(message);
        toast.error("Interview not started", { description: message });
      } finally {
        setStarting(false);
      }
    },
    [
      analysis,
      category,
      difficulty,
      profile,
      questionCount,
      role,
      addInterview,
    ],
  );

  useEffect(() => {
    if (
      autoRan.current ||
      searchParams.get("autorun") !== "1" ||
      interviews.some((interview) => interview.status === "in_progress")
    ) {
      return;
    }
    autoRan.current = true;
    const requestedCount = Number(searchParams.get("questions"));
    void startInterview({
      role: searchParams.get("role")?.trim() || role,
      category: parseCategory(searchParams.get("category")),
      difficulty: parseDifficulty(searchParams.get("difficulty")),
      questionCount:
        Number.isFinite(requestedCount) && requestedCount >= 1
          ? Math.min(10, Math.round(requestedCount))
          : questionCount,
    });
  }, [interviews, questionCount, role, searchParams, startInterview]);

  async function submitAnswer() {
    if (!active || !currentQuestion) return;
    const clean = answer.trim();
    if (clean.length < 10) {
      toast.error("Write at least a short answer before submitting.");
      return;
    }
    setEvaluating(true);
    setError(null);
    try {
      const response = await evaluateAnswer({
        action: "evaluate",
        role: active.role,
        category: active.category,
        difficulty: active.difficulty,
        question: currentQuestion.question,
        answer: clean,
        profile,
      });
      updateInterview(active.id, (interview) => ({
        ...interview,
        engine: response.engine,
        questions: interview.questions.map((question) =>
          question.id === currentQuestion.id
            ? { ...question, answer: clean, evaluation: response.evaluation }
            : question,
        ),
      }));
      setAnswer("");
      toast.success("Answer scored", {
        description: `Overall ${response.evaluation.overallScore}/100. Review the feedback before continuing.`,
      });
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "Your answer could not be scored. It was not saved.";
      setError(message);
      toast.error("Answer not scored", { description: message });
    } finally {
      setEvaluating(false);
    }
  }

  async function finishInterview() {
    if (!active) return;
    const evaluations = active.questions
      .map((question) => question.evaluation)
      .filter((evaluation): evaluation is InterviewEvaluation => Boolean(evaluation));
    if (!evaluations.length) {
      toast.error("Answer at least one question before finishing.");
      return;
    }
    if (evaluations.length < active.questions.length) {
      toast.error("Answer the remaining questions before finishing.", {
        description: "CareerPilot summarizes only the answers you actually gave.",
      });
      return;
    }
    setFinishing(true);
    setError(null);
    try {
      const response = await summarizeInterview({
        action: "summary",
        evaluations,
        role: active.role,
      });
      updateInterview(active.id, (interview) => ({
        ...interview,
        engine: response.engine,
        status: "completed",
        overallScore: response.summary.overallScore,
        summary: response.summary,
        completedAt: new Date().toISOString(),
      }));
      toast.success("Interview debrief ready", {
        description: `Recorded overall score: ${response.summary.overallScore}/100.`,
      });
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "The debrief could not be generated. Your answers and scores are still saved.";
      setError(message);
      toast.error("Debrief not generated", { description: message });
    } finally {
      setFinishing(false);
    }
  }

  function openSession(session: InterviewSession) {
    setActiveId(session.id);
    setQuestionIndex(firstUnansweredIndex(session));
    setAnswer("");
    setError(null);
  }

  function backToSetup() {
    if (active) {
      setRole(active.role);
      setCategory(active.category);
      setDifficulty(active.difficulty);
      setQuestionCount(active.questions.length);
    }
    setActiveId(null);
    setQuestionIndex(0);
    setAnswer("");
    setError(null);
  }

  if (!active) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Module 07 · Practice under pressure"
          title="Mock interview"
          description="Practice one question at a time. Every answer is scored against a transparent weighted rubric, with specific gaps and a stronger sample answer."
          actions={<AIEngineBadge />}
        />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                  <MessagesSquare className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Configure your session</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Questions are generated from general knowledge plus your saved
                    context. No live interviewer is involved.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="interview-role">Target role</Label>
                  <Input
                    id="interview-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="e.g. AI Engineer"
                    maxLength={100}
                  />
                </div>

                <div>
                  <p className="text-xs font-medium">Interview category</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCategory(option)}
                        className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          category === option
                            ? "border-primary/40 bg-accent font-medium text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium">Difficulty</p>
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/30 p-1">
                      {difficulties.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDifficulty(option)}
                          className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                            difficulty === option
                              ? "bg-card font-medium text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="question-count">Questions</Label>
                    <Select
                      id="question-count"
                      value={String(questionCount)}
                      onChange={(event) => setQuestionCount(Number(event.target.value))}
                    >
                      {[1, 3, 5, 7, 10].map((count) => (
                        <option key={count} value={count}>
                          {count} question{count === 1 ? "" : "s"}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/25 p-3.5">
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Session focus
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {role || "Your target role"} · {category} · {difficulty} ·{" "}
                    {questionCount} question{questionCount === 1 ? "" : "s"}
                    {analysis
                      ? ` · questions can reference your ${analysis.gaps.length} recorded gaps`
                      : " · no skill-gap analysis saved yet"}
                  </p>
                </div>

                {error ? (
                  <Alert
                    variant="error"
                    title="Interview session failed"
                    icon={<CircleAlert className="h-4 w-4" />}
                  >
                    {error}
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Starting creates a saved session immediately. You can leave and resume
                    it later.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void startInterview()}
                    disabled={starting || role.trim().length < 2}
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {starting ? "Preparing questions…" : "Start mock interview"}
                  </Button>
                </div>
              </div>
            </Card>

            <InterviewHistory sessions={interviews} onOpen={openSession} />
          </div>

          <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-primary" />
                Weighted rubric
              </div>
              <div className="mt-3 space-y-2.5">
                {rubricWeights.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-medium">{item.weight}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                Overall score is a weighted coaching estimate. It is not an employer
                decision or a standardized interview result.
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mic className="h-4 w-4 text-primary" />
                Speak your answers
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Use Wispr Flow in your desktop app to dictate into the answer box. There
                is no simulated microphone in CareerPilot, and browser audio is not
                recorded.
              </p>
              <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
                Try: “The main trade-off is latency versus retrieval quality. I would
                measure both on a small evaluation set before choosing.”
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-4 w-4 text-primary" />
                Practice rules
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  One question at a time; no hints reveal the answer.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Weak or incomplete answers are not rounded up.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  Every score is saved with its answer for review.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (active.status === "completed" && active.summary) {
    const tone = scoreTone(active.summary.overallScore);
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Module 07 · Session debrief"
          title="Interview debrief"
          description={`${active.role} · ${active.category} · ${active.difficulty} · completed ${formatDate(
            active.completedAt ?? active.createdAt,
          )}`}
          actions={
            <Button type="button" variant="outline" onClick={backToSetup}>
              <ArrowLeft className="h-4 w-4" />
              All sessions
            </Button>
          }
        />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-accent/70 via-card to-card p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                      Recorded result
                    </p>
                    <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                      {active.role} mock interview
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {active.questions.length} answered questions ·{" "}
                      {active.engine === "gemini" ? "Gemini" : "Local coach"}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-6 py-4 text-center ${tone.bg}`}>
                    <p className={`text-4xl font-semibold tracking-tight ${tone.text}`}>
                      {active.summary.overallScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">out of 100</p>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {active.summary.verdict}
                </p>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <RubricMeter
                  label="Technical correctness"
                  value={active.summary.rubric.technicalCorrectness}
                  weight={40}
                />
                <RubricMeter
                  label="Conceptual understanding"
                  value={active.summary.rubric.conceptualUnderstanding}
                  weight={25}
                />
                <RubricMeter
                  label="Problem solving"
                  value={active.summary.rubric.problemSolving}
                  weight={20}
                />
                <RubricMeter
                  label="Communication"
                  value={active.summary.rubric.communication}
                  weight={15}
                />
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  Strengths across the session
                </div>
                <ul className="mt-3 space-y-2">
                  {active.summary.strengths.map((strength) => (
                    <li
                      key={strength}
                      className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  What to improve next
                </div>
                <ul className="mt-3 space-y-2">
                  {active.summary.improvements.map((improvement) => (
                    <li
                      key={improvement}
                      className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-border p-5 sm:px-6">
                <h2 className="text-sm font-semibold">Review every answer</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Scores are shown exactly as recorded. Open a question to revisit the
                  feedback.
                </p>
              </div>
              <div className="divide-y divide-border">
                {active.questions.map((question, index) => (
                  <details key={question.id} className="group p-5 sm:px-6">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                          <p className="text-xs font-medium leading-relaxed">
                            {question.question}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {question.evaluation?.overallScore ?? 0}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-3 pl-9">
                      <div className="rounded-lg border border-border bg-muted/25 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Your answer
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {question.answer}
                        </p>
                      </div>
                      {question.evaluation ? (
                        <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Stronger sample answer
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-amber-950">
                            {question.evaluation.strongerAnswer}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </details>
                ))}
              </div>
            </Card>

            <Alert variant="neutral">
              This is an AI coaching debrief, not a hiring decision. Scores reflect one
              practice attempt and should guide the next practice session, not your
              self-worth.
            </Alert>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={backToSetup}>
                <RotateCcw className="h-4 w-4" />
                Practice another session
              </Button>
              <Button type="button" variant="outline" onClick={backToSetup}>
                View history
              </Button>
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-primary" />
                Session facts
              </div>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Questions</dt>
                  <dd className="font-medium">{active.questions.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Average score</dt>
                  <dd className="font-medium">{active.overallScore}/100</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Engine</dt>
                  <dd className="font-medium capitalize">{active.engine}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Saved</dt>
                  <dd className="font-medium">
                    {formatDate(active.completedAt ?? active.createdAt)}
                  </dd>
                </div>
              </dl>
            </Card>
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href="/roadmap">
                Apply feedback in your roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Module 07 · Practice under pressure"
          title="Mock interview"
          description="This session has no questions."
        />
        <Card className="mt-5 p-5">
          <EmptyState
            icon={CircleAlert}
            title="Session data is incomplete"
            description="Return to setup and start a new mock interview."
            action={
              <Button type="button" onClick={backToSetup}>
                Back to setup
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const evaluation = currentQuestion.evaluation;
  const isLastQuestion = questionIndex >= active.questions.length - 1;
  const questionProgress = Math.round(
    ((questionIndex + (evaluation ? 1 : 0)) / active.questions.length) * 100,
  );
  const sessionTone = evaluation ? scoreTone(evaluation.overallScore) : null;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Module 07 · Live practice
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.025em]">
            {active.role} mock interview
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{active.category}</Badge>
            <Badge variant="outline">{active.difficulty}</Badge>
            <Badge variant={active.engine === "gemini" ? "success" : "warning"}>
              {active.engine === "gemini" ? "Gemini" : "Local coach"}
            </Badge>
            <Badge variant="secondary">
              Question {questionIndex + 1} of {active.questions.length}
            </Badge>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={backToSetup}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Save & exit
        </Button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Session progress</span>
              <span>{questionProgress}%</span>
            </div>
            <Progress value={questionProgress} className="mt-1.5 h-1.5" />
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                {questionIndex + 1}
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Interview question
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Answer in your own words, with trade-offs and concrete examples where
                  relevant.
                </p>
              </div>
            </div>
            <p className="mt-4 text-lg font-medium leading-relaxed tracking-[-0.01em]">
              {currentQuestion.question}
            </p>
          </Card>

          {error ? (
            <Alert
              variant="error"
              title="This step failed"
              icon={<CircleAlert className="h-4 w-4" />}
            >
              {error}
            </Alert>
          ) : null}

          {!evaluation ? (
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="interview-answer">Your answer</Label>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Mic className="h-3 w-3" />
                  Wispr Flow dictation supported
                </span>
              </div>
              <Textarea
                id="interview-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={9}
                maxLength={12000}
                placeholder="Structure your answer: direct response, reasoning, trade-offs, and a concrete example…"
                className="mt-2 text-sm leading-relaxed"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] text-muted-foreground">
                  {answer.trim()
                    ? `${answer.trim().split(/\s+/).filter(Boolean).length} words`
                    : "No answer yet"}{" "}
                  · length is not a substitute for correctness
                </div>
                <Button
                  type="button"
                  onClick={() => void submitAnswer()}
                  disabled={evaluating || answer.trim().length < 10}
                >
                  {evaluating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {evaluating ? "Scoring answer…" : "Submit for feedback"}
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Submitting sends the question and answer to the configured coaching
                engine. Your answer is stored with this session.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Your submitted answer
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {evaluation.wordCount} words
                    </p>
                  </div>
                  <Badge variant="outline">Answer recorded</Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {currentQuestion.answer}
                </p>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Answer score
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Weighted rubric · technical correctness counts most
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-3 rounded-xl px-4 py-2 ${
                      sessionTone?.bg ?? ""
                    }`}
                  >
                    <span
                      className={`text-2xl font-semibold ${
                        sessionTone?.text ?? ""
                      }`}
                    >
                      {evaluation.overallScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RubricMeter
                      label="Technical correctness"
                      value={evaluation.rubric.technicalCorrectness}
                      weight={40}
                    />
                    <RubricMeter
                      label="Conceptual understanding"
                      value={evaluation.rubric.conceptualUnderstanding}
                      weight={25}
                    />
                    <RubricMeter
                      label="Problem solving"
                      value={evaluation.rubric.problemSolving}
                      weight={20}
                    />
                    <RubricMeter
                      label="Communication"
                      value={evaluation.rubric.communication}
                      weight={15}
                    />
                  </div>

                  <div className="grid gap-4 pt-2 sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        What worked
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {evaluation.strengths.map((strength) => (
                          <li
                            key={strength}
                            className="text-[11px] leading-relaxed text-muted-foreground"
                          >
                            · {strength}
                          </li>
                        ))}
                        {!evaluation.strengths.length ? (
                          <li className="text-[11px] text-muted-foreground">
                            No clear strengths detected yet.
                          </li>
                        ) : null}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <CircleAlert className="h-3.5 w-3.5 text-amber-600" />
                        Missing or incorrect
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {[
                          ...evaluation.missingConcepts.map(
                            (item) => `Missing: ${item}`,
                          ),
                          ...evaluation.incorrectAssumptions.map(
                            (item) => `Assumption: ${item}`,
                          ),
                        ].map((item) => (
                          <li
                            key={item}
                            className="text-[11px] leading-relaxed text-muted-foreground"
                          >
                            · {item}
                          </li>
                        ))}
                        {!evaluation.missingConcepts.length &&
                        !evaluation.incorrectAssumptions.length ? (
                          <li className="text-[11px] text-muted-foreground">
                            No specific gaps flagged.
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/25 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Improve next
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {evaluation.suggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                        >
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <details className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                    <summary className="cursor-pointer list-none text-[11px] font-semibold text-amber-900">
                      View a stronger sample answer
                    </summary>
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-950">
                      {evaluation.strongerAnswer}
                    </p>
                    <p className="mt-2 text-[9px] text-amber-800">
                      Example for learning, not a script to memorize. Do not claim
                      experience you do not have.
                    </p>
                  </details>
                </div>
                <div className="flex flex-col gap-2 border-t border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-[10px] text-muted-foreground">
                    {answeredCount} of {active.questions.length} questions answered
                  </p>
                  {isLastQuestion ? (
                    <Button
                      type="button"
                      onClick={() => void finishInterview()}
                      disabled={finishing || !allAnswered}
                    >
                      {finishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trophy className="h-4 w-4" />
                      )}
                      {finishing ? "Building debrief…" : "Finish & view debrief"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        setQuestionIndex((current) => current + 1);
                        setAnswer("");
                        setError(null);
                      }}
                    >
                      Next question
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BrainCircuit className="h-4 w-4 text-primary" />
              Session status
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <p className="text-2xl font-semibold tracking-tight">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">
                / {active.questions.length} answered
              </p>
            </div>
            <Progress
              value={(answeredCount / active.questions.length) * 100}
              className="mt-2 h-1.5"
            />
            <div className="mt-3 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Running average</span>
              <span className="font-medium">
                {runningAverage !== null ? `${runningAverage}/100` : "—"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Current question</span>
              <span className="font-medium">
                {questionIndex + 1} / {active.questions.length}
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-primary" />
              How scoring works
            </div>
            <div className="mt-3 space-y-2">
              {rubricWeights.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  <span className="text-[10px] font-medium">{item.weight}%</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Long, vague answers are not rewarded. The rubric rewards correctness,
              reasoning, trade-offs, and clear communication.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="h-4 w-4 text-primary" />
              No timer
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Take the time to structure your answer. This practice mode measures quality,
              not arbitrary speed.
            </p>
          </Card>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={backToSetup}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Save and exit session
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
            <div className="h-[480px] animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
