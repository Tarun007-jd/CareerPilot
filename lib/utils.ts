import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  CareerState,
  JobApplication,
  SkillGapAnalysis,
  Roadmap,
  InterviewSession,
} from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? parseDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function todayInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function relativeDate(value: string) {
  const date = parseDate(value);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((start.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  if (diff === -1) return "Tomorrow";
  return formatDate(date);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CP";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function normalizeSkill(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.js\b/g, "js")
    .replace(/[^a-z0-9+#]/g, "")
    .replace(/js$/, "");
}

export function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeSkill(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function profileCompleteness(state: CareerState) {
  const { profile } = state;
  let score = 0;
  if (profile.name.trim()) score += 12;
  if (profile.college.trim()) score += 10;
  if (profile.degree.trim()) score += 8;
  if (profile.graduationYear.trim()) score += 5;
  if (profile.targetRole.trim()) score += 20;
  if (profile.skills.length >= 3) score += 20;
  else if (profile.skills.length > 0) score += 10;
  if (profile.resume?.text) score += 15;
  if (profile.careerInterests.length) score += 5;
  if (profile.experience.trim() || profile.certifications.length) score += 5;
  return clamp(score);
}

export function roadmapProgress(roadmap: Roadmap | null) {
  if (!roadmap) return 0;
  const tasks = roadmap.weeks.flatMap((week) => week.tasks);
  if (!tasks.length) return 0;
  return Math.round(
    (tasks.filter((task) => task.completed).length / tasks.length) * 100,
  );
}

export function averageInterviewScore(interviews: InterviewSession[]) {
  const scored = interviews.filter(
    (interview) => interview.status === "completed" && interview.overallScore !== null,
  );
  if (!scored.length) return null;
  return Math.round(
    scored.reduce((total, interview) => total + (interview.overallScore ?? 0), 0) /
      scored.length,
  );
}

export function preparationScore(state: CareerState) {
  const profile = profileCompleteness(state);
  const skill = state.analysis?.readinessScore ?? 0;
  const roadmap = roadmapProgress(state.roadmap);
  const interview = averageInterviewScore(state.interviews) ?? 0;
  const hasAnalysis = Boolean(state.analysis);
  const hasRoadmap = Boolean(state.roadmap);
  const hasInterview = state.interviews.some((i) => i.status === "completed");
  const weights = {
    profile: hasAnalysis || state.profile.targetRole ? 0.2 : 0.35,
    skill: hasAnalysis ? 0.4 : 0,
    roadmap: hasRoadmap ? 0.25 : 0,
    interview: hasInterview ? 0.15 : 0,
  };
  if (!hasAnalysis && !hasRoadmap && !hasInterview) {
    return Math.round(profile * 0.65);
  }
  const totalWeight =
    weights.profile + weights.skill + weights.roadmap + weights.interview;
  return Math.round(
    (profile * weights.profile +
      skill * weights.skill +
      roadmap * weights.roadmap +
      interview * weights.interview) /
      totalWeight,
  );
}

export function completedTaskHoursLastWeek(roadmap: Roadmap | null) {
  if (!roadmap) return 0;
  const cutoff = Date.now() - 7 * 86400000;
  return roadmap.weeks
    .flatMap((week) => week.tasks)
    .filter(
      (task) =>
        task.completed &&
        task.completedAt &&
        new Date(task.completedAt).getTime() >= cutoff,
    )
    .reduce((total, task) => total + task.estimatedHours, 0);
}

export function learningStreak(roadmap: Roadmap | null) {
  if (!roadmap) return 0;
  const days = new Set(
    roadmap.weeks
      .flatMap((week) => week.tasks)
      .filter((task) => task.completedAt)
      .map((task) => {
        const date = new Date(task.completedAt as string);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }),
  );
  if (!days.size) return 0;
  let streak = 0;
  const cursor = new Date();
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface ApplicationStats {
  total: number;
  active: number;
  applied: number;
  responses: number;
  interviews: number;
  offers: number;
  rejected: number;
  responseRate: number;
  interviewConversionRate: number;
  statusCounts: Record<string, number>;
}

export function calculateApplicationStats(
  applications: JobApplication[],
): ApplicationStats {
  const applied = applications.filter((app) => app.status !== "Interested").length;
  const responses = applications.filter((app) =>
    ["Assessment", "Interview", "Rejected", "Offer"].includes(app.status),
  ).length;
  const interviews = applications.filter(
    (app) =>
      ["Interview", "Offer"].includes(app.status) || app.interviewDates.length > 0,
  ).length;
  const offers = applications.filter((app) => app.status === "Offer").length;
  const rejected = applications.filter((app) => app.status === "Rejected").length;
  const statusCounts = applications.reduce<Record<string, number>>((counts, app) => {
    counts[app.status] = (counts[app.status] ?? 0) + 1;
    return counts;
  }, {});
  return {
    total: applications.length,
    active: applications.filter((app) =>
      ["Interested", "Applied", "Assessment", "Interview"].includes(app.status),
    ).length,
    applied,
    responses,
    interviews,
    offers,
    rejected,
    responseRate: applied ? Math.round((responses / applied) * 100) : 0,
    interviewConversionRate: applied
      ? Math.round((interviews / applied) * 100)
      : 0,
    statusCounts,
  };
}

export function gapStats(analysis: SkillGapAnalysis | null) {
  if (!analysis) {
    return { strong: 0, partial: 0, missing: 0, needsImprovement: 0 };
  }
  return analysis.gaps.reduce(
    (stats, gap) => {
      if (gap.classification === "strong") stats.strong += 1;
      if (gap.classification === "partial") stats.partial += 1;
      if (gap.classification === "missing") stats.missing += 1;
      if (gap.classification === "needs-improvement") stats.needsImprovement += 1;
      return stats;
    },
    { strong: 0, partial: 0, missing: 0, needsImprovement: 0 },
  );
}

export function truncate(value: string, length = 160) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function formatHours(hours: number) {
  if (!Number.isFinite(hours)) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

export function isProfileReady(state: CareerState) {
  return Boolean(state.profile.name.trim() && state.profile.targetRole.trim());
}

export function buildVoiceContext(state: CareerState) {
  return {
    today: todayInputValue(),
    profile: {
      name: state.profile.name,
      targetRole: state.profile.targetRole,
      skills: state.profile.skills.map((skill) => skill.name),
      college: state.profile.college,
      degree: state.profile.degree,
      graduationYear: state.profile.graduationYear,
      careerInterests: state.profile.careerInterests,
    },
    jobTarget: state.jobTarget
      ? {
          title: state.jobTarget.title,
          company: state.jobTarget.company,
          requiredSkills: state.jobTarget.requiredSkills,
          hasDescription: Boolean(state.jobTarget.description.trim()),
        }
      : null,
    analysis: state.analysis
      ? {
          targetRole: state.analysis.targetRole,
          missingSkills: state.analysis.gaps
            .filter((gap) => gap.classification !== "strong")
            .map((gap) => gap.skill)
            .slice(0, 10),
          readinessScore: state.analysis.readinessScore,
        }
      : null,
    roadmap: state.roadmap
      ? {
          tasks: state.roadmap.weeks.flatMap((week) =>
            week.tasks.map((task) => ({
              title: task.title,
              skill: task.skill,
              week: task.week,
              completed: task.completed,
            })),
          ),
        }
      : null,
    applications: state.applications.map((app) => ({
      company: app.company,
      title: app.title,
      status: app.status,
      appliedDate: app.appliedDate,
    })),
    interviews: state.interviews.map((interview) => ({
      role: interview.role,
      score: interview.overallScore,
      date: interview.createdAt,
    })),
  };
}
