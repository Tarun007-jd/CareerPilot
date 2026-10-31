export type SkillCategory =
  | "language"
  | "framework"
  | "tool"
  | "technical"
  | "soft";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: number;
  source: "manual" | "resume" | "ai";
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  college: string;
  degree: string;
  graduationYear: string;
  skills: Skill[];
  experience: string;
  certifications: string[];
  careerInterests: string[];
  targetRole: string;
  resume: {
    fileName: string;
    text: string;
    uploadedAt: string;
    extraction: ResumeExtraction | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeExtraction {
  summary: string;
  education: string[];
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  tools: string[];
  projects: { title: string; description: string; technologies: string[] }[];
  certifications: string[];
  experience: string[];
  potentialGaps: string[];
}

export interface JobTarget {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirement: string;
  responsibilities: string[];
  qualifications: string[];
  toolsAndTechnologies: string[];
  source: "user-provided";
  createdAt: string;
}

export type GapClassification =
  | "strong"
  | "partial"
  | "missing"
  | "needs-improvement";

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gapScore: number;
  classification: GapClassification;
  priority: "high" | "medium" | "low";
  reason: string;
  learningAction: string;
}

export type EngineKind = "gemini" | "local";

export interface SkillGapAnalysis {
  id: string;
  targetRole: string;
  company: string;
  basis: "job-description";
  sourceNote: string;
  gaps: SkillGap[];
  summary: string;
  readinessScore: number;
  matchedCount: number;
  missingCount: number;
  createdAt: string;
  engine: EngineKind;
  disclaimer: string;
}

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  skill: string;
  estimatedHours: number;
  difficulty: Difficulty;
  resourceSuggestions: string[];
  completionCriteria: string;
  completed: boolean;
  completedAt?: string;
  week: number;
  origin: "ai" | "user";
  createdAt: string;
}

export interface RoadmapWeek {
  week: number;
  objective: string;
  topics: string[];
  tasks: RoadmapTask[];
}

export interface Roadmap {
  id: string;
  targetRole: string;
  weeks: RoadmapWeek[];
  createdAt: string;
  updatedAt: string;
  engine: EngineKind;
}

export type ProjectStatus = "recommended" | "saved" | "in_progress" | "completed";

export interface PortfolioProject {
  id: string;
  title: string;
  problemStatement: string;
  description: string;
  skills: string[];
  techStack: string[];
  difficulty: Difficulty;
  durationWeeks: number;
  features: string[];
  deliverables: string[];
  employability: string;
  status: ProjectStatus;
  createdAt: string;
  engine: EngineKind;
}

export type InterviewCategory =
  | "Technical"
  | "Programming"
  | "Computer Science"
  | "Problem Solving"
  | "Behavioral"
  | "HR";

export type InterviewDifficulty = "Easy" | "Medium" | "Hard";

export interface InterviewEvaluation {
  overallScore: number;
  rubric: {
    technicalCorrectness: number;
    conceptualUnderstanding: number;
    problemSolving: number;
    communication: number;
  };
  strengths: string[];
  missingConcepts: string[];
  incorrectAssumptions: string[];
  suggestions: string[];
  strongerAnswer: string;
  wordCount: number;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  answer: string | null;
  evaluation: InterviewEvaluation | null;
}

export interface InterviewSummary {
  overallScore: number;
  rubric: {
    technicalCorrectness: number;
    conceptualUnderstanding: number;
    problemSolving: number;
    communication: number;
  };
  strengths: string[];
  improvements: string[];
  verdict: string;
}

export interface InterviewSession {
  id: string;
  role: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  questions: InterviewQuestion[];
  status: "in_progress" | "completed";
  overallScore: number | null;
  summary: InterviewSummary | null;
  engine: EngineKind;
  createdAt: string;
  completedAt: string | null;
}

export type ApplicationStatus =
  | "Interested"
  | "Applied"
  | "Assessment"
  | "Interview"
  | "Rejected"
  | "Offer";

export interface JobApplication {
  id: string;
  company: string;
  title: string;
  appliedDate: string;
  source: string;
  jobDescription: string;
  url: string;
  status: ApplicationStatus;
  interviewDates: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInsight {
  id: string;
  text: string;
  evidence: string;
  tone: "positive" | "neutral" | "attention";
}

export type VoiceIntent =
  | "UPDATE_PROFILE"
  | "SET_CAREER_TARGET"
  | "ANALYZE_SKILLS"
  | "GENERATE_ROADMAP"
  | "UPDATE_PROGRESS"
  | "RESCHEDULE_TASK"
  | "RECOMMEND_PROJECTS"
  | "START_INTERVIEW"
  | "ADD_APPLICATION"
  | "VIEW_APPLICATION_INSIGHTS";

export type VoiceOperation =
  | { type: "SET_CAREER_TARGET"; role: string; company?: string }
  | {
      type: "ADD_SKILLS";
      skills: { name: string; category: SkillCategory }[];
    }
  | {
      type: "UPDATE_PROFILE";
      changes: {
        name?: string;
        college?: string;
        degree?: string;
        graduationYear?: string;
        careerInterests?: string[];
      };
    }
  | { type: "COMPLETE_TASKS"; match: string }
  | { type: "DELETE_TASKS"; match: string }
  | { type: "RESCHEDULE_TASK"; match: string; targetWeek: number }
  | {
      type: "ADD_APPLICATION";
      company: string;
      title: string;
      appliedDate: string;
      status: ApplicationStatus;
      source?: string;
    }
  | {
      type: "RUN_MODULE_ACTION";
      action:
        | "ANALYZE_SKILLS"
        | "GENERATE_ROADMAP"
        | "RECOMMEND_PROJECTS"
        | "VIEW_APPLICATION_INSIGHTS";
      params?: Record<string, string>;
    }
  | {
      type: "START_INTERVIEW";
      role: string;
      category: InterviewCategory;
      difficulty: InterviewDifficulty;
      questionCount: number;
    }
  | { type: "NAVIGATE"; module: string };

export interface VoiceProposal {
  summary: string;
  operations: VoiceOperation[];
  preview: { label: string; value: string }[];
}

export interface AssistantActionResult {
  redirect?: string;
  applied: boolean;
  summary: string;
}

export interface VoiceAgentResult {
  intent: VoiceIntent;
  entities: Record<string, unknown>;
  targetModule: string;
  proposedAction: VoiceProposal;
  requiredInformation: string[];
  requiresConfirmation: boolean;
  responseMessage: string;
  engine: EngineKind;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  proposal: VoiceProposal | null;
  intent: VoiceIntent | null;
  requiredInformation: string[];
  status: "pending" | "confirmed" | "cancelled" | "answered";
  engine: EngineKind | null;
}

export interface CareerState {
  version: number;
  profile: UserProfile;
  jobTarget: JobTarget | null;
  analysis: SkillGapAnalysis | null;
  roadmap: Roadmap | null;
  projects: PortfolioProject[];
  interviews: InterviewSession[];
  applications: JobApplication[];
  assistantMessages: AssistantMessage[];
  savedAt: string;
}

export interface AIStatus {
  configured: boolean;
  model: string;
  mode: EngineKind;
}

export interface VoiceAgentRequestContext {
  today: string;
  profile: {
    name: string;
    targetRole: string;
    skills: string[];
    college: string;
    degree: string;
    graduationYear: string;
    careerInterests: string[];
  };
  jobTarget: {
    title: string;
    company: string;
    requiredSkills: string[];
    hasDescription: boolean;
  } | null;
  analysis: {
    targetRole: string;
    missingSkills: string[];
    readinessScore: number;
  } | null;
  roadmap: {
    tasks: {
      title: string;
      skill: string;
      week: number;
      completed: boolean;
    }[];
  } | null;
  applications: {
    company: string;
    title: string;
    status: ApplicationStatus;
    appliedDate: string;
  }[];
  interviews: {
    role: string;
    score: number | null;
    date: string;
  }[];
}
