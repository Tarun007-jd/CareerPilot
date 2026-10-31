"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  AIStatus,
  ApplicationStatus,
  AssistantMessage,
  CareerState,
  Difficulty,
  InterviewSession,
  JobApplication,
  JobTarget,
  PortfolioProject,
  RoadmapTask,
  SkillCategory,
  SkillGapAnalysis,
  UserProfile,
  VoiceAgentResult,
  VoiceOperation,
  Roadmap,
} from "@/lib/types";
import {
  careerStorage,
  createEmptyCareerState,
} from "@/lib/storage";
import { createDemoState } from "@/lib/demo-data";
import { createId, normalizeSkill, todayInputValue } from "@/lib/utils";
import { inferSkillCategory, skillKey } from "@/lib/skills";

type ProfilePatch = Partial<
  Pick<
    UserProfile,
    | "name"
    | "email"
    | "headline"
    | "location"
    | "college"
    | "degree"
    | "graduationYear"
    | "experience"
    | "certifications"
    | "careerInterests"
    | "targetRole"
    | "resume"
  >
>;

interface NewApplication {
  company: string;
  title: string;
  appliedDate: string;
  source: string;
  jobDescription: string;
  url: string;
  status: ApplicationStatus;
  interviewDates: string[];
  notes: string;
}

interface NewTask {
  title: string;
  description: string;
  skill: string;
  estimatedHours: number;
  difficulty: Difficulty;
  resourceSuggestions: string[];
  completionCriteria: string;
}

interface ApplyResult {
  redirect?: string;
  applied: boolean;
  summary: string;
}

interface CareerPilotContextValue {
  state: CareerState;
  ready: boolean;
  aiStatus: AIStatus;
  aiStatusReady: boolean;
  storageError: string | null;
  updateProfile: (patch: ProfilePatch) => void;
  addSkill: (
    name: string,
    category?: SkillCategory,
    proficiency?: number,
    source?: "manual" | "resume" | "ai",
  ) => void;
  addSkills: (
    skills: { name: string; category: SkillCategory; proficiency?: number }[],
    source?: "manual" | "resume" | "ai",
  ) => void;
  updateSkill: (
    id: string,
    patch: { name?: string; proficiency?: number; category?: SkillCategory },
  ) => void;
  removeSkill: (id: string) => void;
  replaceSkills: (skills: UserProfile["skills"]) => void;
  saveJobTarget: (jobTarget: JobTarget) => void;
  saveAnalysis: (analysis: SkillGapAnalysis) => void;
  saveRoadmap: (roadmap: Roadmap) => void;
  toggleTask: (taskId: string) => void;
  addTask: (week: number, task: NewTask) => void;
  deleteTask: (taskId: string) => void;
  rescheduleTask: (taskId: string, targetWeek: number) => void;
  saveProjects: (projects: PortfolioProject[]) => void;
  updateProjectStatus: (
    projectId: string,
    status: PortfolioProject["status"],
  ) => void;
  addInterview: (interview: InterviewSession) => void;
  updateInterview: (
    interviewId: string,
    updater: (interview: InterviewSession) => InterviewSession,
  ) => void;
  addApplication: (application: NewApplication) => JobApplication;
  updateApplication: (
    applicationId: string,
    patch: Partial<Omit<JobApplication, "id" | "createdAt">>,
  ) => void;
  deleteApplication: (applicationId: string) => void;
  addAssistantUserMessage: (content: string) => string;
  addAssistantResult: (command: string, result: VoiceAgentResult) => string;
  setAssistantMessageStatus: (
    messageId: string,
    status: AssistantMessage["status"],
  ) => void;
  applyProposal: (messageId: string) => ApplyResult;
  cancelProposal: (messageId: string) => void;
  clearAssistantHistory: () => void;
  resetWorkspace: () => Promise<void>;
  loadDemoWorkspace: () => Promise<void>;
  exportWorkspace: () => void;
}

const CareerPilotContext = createContext<CareerPilotContextValue | null>(null);

const fallbackAIStatus: AIStatus = {
  configured: false,
  model: "gemini-2.5-flash",
  mode: "local",
};

function withSkill(
  profile: UserProfile,
  name: string,
  category: SkillCategory,
  proficiency: number,
  source: "manual" | "resume" | "ai",
) {
  const clean = name.trim();
  if (!clean) return profile.skills;
  if (profile.skills.some((skill) => skillKey(skill.name) === skillKey(clean))) {
    return profile.skills;
  }
  return [
    ...profile.skills,
    {
      id: createId("skill"),
      name: clean,
      category,
      proficiency: Math.max(0, Math.min(100, Math.round(proficiency))),
      source,
    },
  ];
}

function taskMatchesQuery(task: RoadmapTask, match: string) {
  const key = skillKey(match);
  const matchNormalized = normalizeSkill(match);
  return (
    (!task.completed && skillKey(task.skill) === key) ||
    (!task.completed &&
      (normalizeSkill(task.title).includes(matchNormalized) ||
        normalizeSkill(task.description).includes(matchNormalized)))
  );
}

function removeTaskFromWeeks(roadmap: Roadmap, predicate: (task: RoadmapTask) => boolean) {
  return {
    ...roadmap,
    updatedAt: new Date().toISOString(),
    weeks: roadmap.weeks.map((week) => ({
      ...week,
      tasks: week.tasks.filter((task) => !predicate(task)),
    })),
  };
}

function insertTaskIntoWeek(roadmap: Roadmap, task: RoadmapTask, targetWeek: number) {
  const without = removeTaskFromWeeks(roadmap, (entry) => entry.id === task.id);
  return {
    ...without,
    updatedAt: new Date().toISOString(),
    weeks: without.weeks.map((week) =>
      week.week === targetWeek
        ? {
            ...week,
            tasks: [
              ...week.tasks,
              { ...task, week: targetWeek },
            ],
          }
        : week,
    ),
  };
}

function operationRedirect(operations: VoiceOperation[]) {
  const start = operations.find(
    (operation) => operation.type === "START_INTERVIEW",
  );
  if (start && start.type === "START_INTERVIEW") {
    const params = new URLSearchParams({
      autorun: "1",
      role: start.role,
      category: start.category,
      difficulty: start.difficulty,
      questions: String(start.questionCount),
    });
    return `/interview?${params.toString()}`;
  }
  const run = operations.find(
    (operation) => operation.type === "RUN_MODULE_ACTION",
  );
  if (run && run.type === "RUN_MODULE_ACTION") {
    if (run.action === "ANALYZE_SKILLS") return "/skill-gap?autorun=1";
    if (run.action === "GENERATE_ROADMAP") return "/roadmap?autorun=1";
    if (run.action === "RECOMMEND_PROJECTS") {
      const params = new URLSearchParams({ autorun: "1" });
      if (run.params?.technologies) {
        params.set("technologies", run.params.technologies);
      }
      return `/projects?${params.toString()}`;
    }
    if (run.action === "VIEW_APPLICATION_INSIGHTS")
      return "/applications?insights=1";
  }
  const navigate = operations.find((operation) => operation.type === "NAVIGATE");
  if (navigate && navigate.type === "NAVIGATE") {
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
    return routes[navigate.module];
  }
  if (operations.some((operation) => operation.type === "ADD_APPLICATION")) {
    return "/applications";
  }
  if (
    operations.some((operation) =>
      ["COMPLETE_TASKS", "DELETE_TASKS", "RESCHEDULE_TASK"].includes(
        operation.type,
      ),
    )
  ) {
    return "/roadmap";
  }
  if (
    operations.some((operation) =>
      [
        "SET_CAREER_TARGET",
        "ADD_SKILLS",
        "UPDATE_PROFILE",
      ].includes(operation.type),
    )
  ) {
    return "/profile";
  }
  return undefined;
}

function applyOperationsToState(
  state: CareerState,
  operations: VoiceOperation[],
): CareerState {
  let next: CareerState = { ...state };

  for (const operation of operations) {
    switch (operation.type) {
      case "SET_CAREER_TARGET": {
        const role = operation.role.trim();
        const targetChanged = role !== next.profile.targetRole;
        next = {
          ...next,
          profile: {
            ...next.profile,
            targetRole: role,
            updatedAt: new Date().toISOString(),
          },
          ...(targetChanged
            ? {
                jobTarget: null,
                analysis: null,
                roadmap: null,
              }
            : {}),
        };
        break;
      }
      case "ADD_SKILLS": {
        let skills = next.profile.skills;
        for (const incoming of operation.skills) {
          skills = withSkill(
            { ...next.profile, skills },
            incoming.name,
            incoming.category ?? inferSkillCategory(incoming.name),
            60,
            "ai",
          );
        }
        next = {
          ...next,
          profile: {
            ...next.profile,
            skills,
            updatedAt: new Date().toISOString(),
          },
        };
        break;
      }
      case "UPDATE_PROFILE": {
        const changes = operation.changes;
        next = {
          ...next,
          profile: {
            ...next.profile,
            ...(changes.name ? { name: changes.name } : {}),
            ...(changes.college ? { college: changes.college } : {}),
            ...(changes.degree ? { degree: changes.degree } : {}),
            ...(changes.graduationYear
              ? { graduationYear: changes.graduationYear }
              : {}),
            ...(changes.careerInterests
              ? {
                  careerInterests: Array.from(
                    new Set([
                      ...next.profile.careerInterests,
                      ...changes.careerInterests,
                    ]),
                  ),
                }
              : {}),
            updatedAt: new Date().toISOString(),
          },
        };
        break;
      }
      case "COMPLETE_TASKS": {
        if (!next.roadmap) break;
        const completedAt = new Date().toISOString();
        next = {
          ...next,
          roadmap: {
            ...next.roadmap,
            updatedAt: completedAt,
            weeks: next.roadmap.weeks.map((week) => ({
              ...week,
              tasks: week.tasks.map((task) =>
                taskMatchesQuery(task, operation.match)
                  ? { ...task, completed: true, completedAt }
                  : task,
              ),
            })),
          },
        };
        break;
      }
      case "DELETE_TASKS": {
        if (!next.roadmap) break;
        next = {
          ...next,
          roadmap: removeTaskFromWeeks(next.roadmap, (task) =>
            taskMatchesQuery(task, operation.match),
          ),
        };
        break;
      }
      case "RESCHEDULE_TASK": {
        if (!next.roadmap) break;
        let roadmap = next.roadmap;
        const matching = roadmap.weeks
          .flatMap((week) => week.tasks)
          .filter((task) => taskMatchesQuery(task, operation.match));
        for (const task of matching) {
          roadmap = insertTaskIntoWeek(
            roadmap,
            task,
            Math.max(1, Math.min(4, operation.targetWeek)),
          );
        }
        next = { ...next, roadmap };
        break;
      }
      case "ADD_APPLICATION": {
        const now = new Date().toISOString();
        const application: JobApplication = {
          id: createId("app"),
          company: operation.company,
          title: operation.title,
          appliedDate: operation.appliedDate || todayInputValue(),
          source: operation.source?.trim() || "Voice command",
          jobDescription: "",
          url: "",
          status: operation.status,
          interviewDates: [],
          notes: "",
          createdAt: now,
          updatedAt: now,
        };
        next = {
          ...next,
          applications: [application, ...next.applications],
        };
        break;
      }
      case "START_INTERVIEW":
      case "RUN_MODULE_ACTION":
      case "NAVIGATE":
        break;
      default:
        break;
    }
  }

  return { ...next, savedAt: new Date().toISOString() };
}

export function CareerPilotProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CareerState | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>(fallbackAIStatus);
  const [aiStatusReady, setAiStatusReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    careerStorage
      .load()
      .then((loaded) => {
        if (!active) return;
        setState(loaded ?? createEmptyCareerState());
      })
      .catch(() => {
        if (!active) return;
        setState(createEmptyCareerState());
        setStorageError("CareerPilot could not read saved workspace data.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/ai-status", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("status unavailable");
        return response.json() as Promise<AIStatus>;
      })
      .then((status) => {
        if (!active) return;
        setAiStatus(status);
      })
      .catch(() => {
        if (!active) return;
        setAiStatus(fallbackAIStatus);
      })
      .finally(() => {
        if (active) setAiStatusReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const timer = window.setTimeout(() => {
      careerStorage
        .save(state)
        .then(() => setStorageError(null))
        .catch((error: Error) => {
          setStorageError(error.message);
          toast.error("Workspace could not be saved locally", {
            description: error.message,
          });
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [state]);

  const commit = useCallback(
    (updater: (previous: CareerState) => CareerState) => {
      setState((previous) => {
        if (!previous) return previous;
        return { ...updater(previous), savedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      commit((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [commit],
  );

  const addSkills = useCallback(
    (
      skills: { name: string; category: SkillCategory; proficiency?: number }[],
      source: "manual" | "resume" | "ai" = "manual",
    ) => {
      commit((previous) => {
        let current = previous.profile.skills;
        for (const skill of skills) {
          current = withSkill(
            { ...previous.profile, skills: current },
            skill.name,
            skill.category,
            skill.proficiency ?? 55,
            source,
          );
        }
        return {
          ...previous,
          profile: {
            ...previous.profile,
            skills: current,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [commit],
  );

  const addSkill = useCallback(
    (
      name: string,
      category?: SkillCategory,
      proficiency = 55,
      source: "manual" | "resume" | "ai" = "manual",
    ) => {
      addSkills(
        [{ name, category: category ?? inferSkillCategory(name), proficiency }],
        source,
      );
    },
    [addSkills],
  );

  const updateSkill = useCallback(
    (
      id: string,
      patch: { name?: string; proficiency?: number; category?: SkillCategory },
    ) => {
      commit((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          updatedAt: new Date().toISOString(),
          skills: previous.profile.skills.map((skill) =>
            skill.id === id ? { ...skill, ...patch } : skill,
          ),
        },
      }));
    },
    [commit],
  );

  const removeSkill = useCallback(
    (id: string) => {
      commit((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          updatedAt: new Date().toISOString(),
          skills: previous.profile.skills.filter((skill) => skill.id !== id),
        },
      }));
    },
    [commit],
  );

  const replaceSkills = useCallback(
    (skills: UserProfile["skills"]) => {
      commit((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          updatedAt: new Date().toISOString(),
          skills,
        },
      }));
    },
    [commit],
  );

  const saveJobTarget = useCallback(
    (jobTarget: JobTarget) => {
      commit((previous) => ({
        ...previous,
        jobTarget,
        profile: {
          ...previous.profile,
          targetRole: jobTarget.title,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    [commit],
  );

  const saveAnalysis = useCallback(
    (analysis: SkillGapAnalysis) => {
      commit((previous) => ({ ...previous, analysis }));
    },
    [commit],
  );

  const saveRoadmap = useCallback(
    (roadmap: Roadmap) => {
      commit((previous) => ({ ...previous, roadmap }));
    },
    [commit],
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      commit((previous) => {
        if (!previous.roadmap) return previous;
        const now = new Date().toISOString();
        return {
          ...previous,
          roadmap: {
            ...previous.roadmap,
            updatedAt: now,
            weeks: previous.roadmap.weeks.map((week) => ({
              ...week,
              tasks: week.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      completed: !task.completed,
                      completedAt: task.completed ? undefined : now,
                    }
                  : task,
              ),
            })),
          },
        };
      });
    },
    [commit],
  );

  const addTask = useCallback(
    (weekNumber: number, task: NewTask) => {
      commit((previous) => {
        if (!previous.roadmap) return previous;
        const newTask: RoadmapTask = {
          ...task,
          id: createId("task"),
          completed: false,
          week: weekNumber,
          origin: "user",
          createdAt: new Date().toISOString(),
        };
        return {
          ...previous,
          roadmap: {
            ...previous.roadmap,
            updatedAt: new Date().toISOString(),
            weeks: previous.roadmap.weeks.map((week) =>
              week.week === weekNumber
                ? { ...week, tasks: [...week.tasks, newTask] }
                : week,
            ),
          },
        };
      });
    },
    [commit],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      commit((previous) => {
        if (!previous.roadmap) return previous;
        return {
          ...previous,
          roadmap: removeTaskFromWeeks(
            previous.roadmap,
            (task) => task.id === taskId && task.origin === "user",
          ),
        };
      });
    },
    [commit],
  );

  const rescheduleTask = useCallback(
    (taskId: string, targetWeek: number) => {
      commit((previous) => {
        if (!previous.roadmap) return previous;
        const task = previous.roadmap.weeks
          .flatMap((week) => week.tasks)
          .find((entry) => entry.id === taskId);
        if (!task) return previous;
        return {
          ...previous,
          roadmap: insertTaskIntoWeek(previous.roadmap, task, targetWeek),
        };
      });
    },
    [commit],
  );

  const saveProjects = useCallback(
    (projects: PortfolioProject[]) => {
      commit((previous) => ({ ...previous, projects }));
    },
    [commit],
  );

  const updateProjectStatus = useCallback(
    (projectId: string, status: PortfolioProject["status"]) => {
      commit((previous) => ({
        ...previous,
        projects: previous.projects.map((project) =>
          project.id === projectId ? { ...project, status } : project,
        ),
      }));
    },
    [commit],
  );

  const addInterview = useCallback(
    (interview: InterviewSession) => {
      commit((previous) => ({
        ...previous,
        interviews: [interview, ...previous.interviews],
      }));
    },
    [commit],
  );

  const updateInterview = useCallback(
    (
      interviewId: string,
      updater: (interview: InterviewSession) => InterviewSession,
    ) => {
      commit((previous) => ({
        ...previous,
        interviews: previous.interviews.map((interview) =>
          interview.id === interviewId ? updater(interview) : interview,
        ),
      }));
    },
    [commit],
  );

  const addApplication = useCallback(
    (application: NewApplication) => {
      const now = new Date().toISOString();
      const newApplication: JobApplication = {
        ...application,
        id: createId("app"),
        createdAt: now,
        updatedAt: now,
      };
      commit((previous) => ({
        ...previous,
        applications: [newApplication, ...previous.applications],
      }));
      return newApplication;
    },
    [commit],
  );

  const updateApplication = useCallback(
    (
      applicationId: string,
      patch: Partial<Omit<JobApplication, "id" | "createdAt">>,
    ) => {
      commit((previous) => ({
        ...previous,
        applications: previous.applications.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : application,
        ),
      }));
    },
    [commit],
  );

  const deleteApplication = useCallback(
    (applicationId: string) => {
      commit((previous) => ({
        ...previous,
        applications: previous.applications.filter(
          (application) => application.id !== applicationId,
        ),
      }));
    },
    [commit],
  );

  const addAssistantUserMessage = useCallback(
    (content: string) => {
      const id = createId("msg");
      const message: AssistantMessage = {
        id,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        proposal: null,
        intent: null,
        requiredInformation: [],
        status: "answered",
        engine: null,
      };
      commit((previous) => ({
        ...previous,
        assistantMessages: [...previous.assistantMessages, message].slice(-60),
      }));
      return id;
    },
    [commit],
  );

  const addAssistantResult = useCallback(
    (_command: string, result: VoiceAgentResult) => {
      const id = createId("msg");
      const message: AssistantMessage = {
        id,
        role: "assistant",
        content: result.responseMessage,
        createdAt: new Date().toISOString(),
        proposal: result.proposedAction,
        intent: result.intent,
        requiredInformation: result.requiredInformation,
        status: result.requiresConfirmation ? "pending" : "answered",
        engine: result.engine,
      };
      commit((previous) => ({
        ...previous,
        assistantMessages: [...previous.assistantMessages, message].slice(-60),
      }));
      return id;
    },
    [commit],
  );

  const setAssistantMessageStatus = useCallback(
    (messageId: string, status: AssistantMessage["status"]) => {
      commit((previous) => ({
        ...previous,
        assistantMessages: previous.assistantMessages.map((message) =>
          message.id === messageId ? { ...message, status } : message,
        ),
      }));
    },
    [commit],
  );

  const applyProposal = useCallback(
    (messageId: string): ApplyResult => {
      if (!state) {
        return { applied: false, summary: "Workspace is still loading." };
      }
      const message = state.assistantMessages.find((entry) => entry.id === messageId);
      if (!message?.proposal) {
        return { applied: false, summary: "No proposal found." };
      }
      const modifying = message.proposal.operations.some((operation) =>
        [
          "SET_CAREER_TARGET",
          "ADD_SKILLS",
          "UPDATE_PROFILE",
          "COMPLETE_TASKS",
          "DELETE_TASKS",
          "RESCHEDULE_TASK",
          "ADD_APPLICATION",
        ].includes(operation.type),
      );
      const base = modifying
        ? applyOperationsToState(state, message.proposal.operations)
        : state;
      const confirmation: AssistantMessage = {
        id: createId("msg"),
        role: "assistant",
        content: modifying
          ? `Saved. ${message.proposal.summary}. Your workspace is updated.`
          : message.proposal.summary,
        createdAt: new Date().toISOString(),
        proposal: null,
        intent: message.intent,
        requiredInformation: [],
        status: "answered",
        engine: message.engine,
      };
      const next: CareerState = {
        ...base,
        assistantMessages: [
          ...base.assistantMessages.map((entry) =>
            entry.id === messageId
              ? { ...entry, status: "confirmed" as const }
              : entry,
          ),
          confirmation,
        ].slice(-60),
        savedAt: new Date().toISOString(),
      };
      setState(next);
      return {
        applied: modifying,
        redirect: operationRedirect(message.proposal.operations),
        summary: message.proposal.summary,
      };
    },
    [state],
  );

  const cancelProposal = useCallback(
    (messageId: string) => {
      commit((previous) => ({
        ...previous,
        assistantMessages: previous.assistantMessages.map((message) =>
          message.id === messageId
            ? { ...message, status: "cancelled" }
            : message,
        ),
      }));
      toast.message("Proposed change cancelled", {
        description: "No saved career data was changed.",
      });
    },
    [commit],
  );

  const clearAssistantHistory = useCallback(() => {
    commit((previous) => ({ ...previous, assistantMessages: [] }));
    toast.success("Assistant history cleared");
  }, [commit]);

  const resetWorkspace = useCallback(async () => {
    await careerStorage.clear();
    setState(createEmptyCareerState());
    setStorageError(null);
    toast.success("Workspace reset", {
      description: "Profile, analyses, plans, interviews, and applications were removed.",
    });
  }, []);

  const loadDemoWorkspace = useCallback(async () => {
    const demo = createDemoState();
    setState(demo);
    await careerStorage.save(demo);
    toast.success("Sample student loaded", {
      description:
        "Aarav Mehta’s sample profile and a demo job description are ready. Run the analysis to generate real results.",
    });
  }, []);

  const exportWorkspace = useCallback(() => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `careerpilot-workspace-${todayInputValue()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Workspace exported");
  }, [state]);

  const value = useMemo<CareerPilotContextValue | null>(() => {
    if (!state) return null;
    return {
      state,
      ready: true,
      aiStatus,
      aiStatusReady,
      storageError,
      updateProfile,
      addSkill,
      addSkills,
      updateSkill,
      removeSkill,
      replaceSkills,
      saveJobTarget,
      saveAnalysis,
      saveRoadmap,
      toggleTask,
      addTask,
      deleteTask,
      rescheduleTask,
      saveProjects,
      updateProjectStatus,
      addInterview,
      updateInterview,
      addApplication,
      updateApplication,
      deleteApplication,
      addAssistantUserMessage,
      addAssistantResult,
      setAssistantMessageStatus,
      applyProposal,
      cancelProposal,
      clearAssistantHistory,
      resetWorkspace,
      loadDemoWorkspace,
      exportWorkspace,
    };
  }, [
    state,
    aiStatus,
    aiStatusReady,
    storageError,
    updateProfile,
    addSkill,
    addSkills,
    updateSkill,
    removeSkill,
    replaceSkills,
    saveJobTarget,
    saveAnalysis,
    saveRoadmap,
    toggleTask,
    addTask,
    deleteTask,
    rescheduleTask,
    saveProjects,
    updateProjectStatus,
    addInterview,
    updateInterview,
    addApplication,
    updateApplication,
    deleteApplication,
    addAssistantUserMessage,
    addAssistantResult,
    setAssistantMessageStatus,
    applyProposal,
    cancelProposal,
    clearAssistantHistory,
    resetWorkspace,
    loadDemoWorkspace,
    exportWorkspace,
  ]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift">
            <span className="text-lg font-bold">C</span>
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your career workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <CareerPilotContext.Provider value={value}>
      {children}
    </CareerPilotContext.Provider>
  );
}

export function useCareerPilot() {
  const context = useContext(CareerPilotContext);
  if (!context) {
    throw new Error("useCareerPilot must be used inside CareerPilotProvider");
  }
  return context;
}
