import { z } from "zod";

export const skillCategorySchema = z.enum([
  "language",
  "framework",
  "tool",
  "technical",
  "soft",
]);

export const skillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: skillCategorySchema,
  proficiency: z.number().min(0).max(100),
  source: z.enum(["manual", "resume", "ai"]),
});

export const resumeExtractionSchema = z.object({
  summary: z.string(),
  education: z.array(z.string()),
  technicalSkills: z.array(z.string()),
  programmingLanguages: z.array(z.string()),
  frameworks: z.array(z.string()),
  tools: z.array(z.string()),
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    }),
  ),
  certifications: z.array(z.string()),
  experience: z.array(z.string()),
  potentialGaps: z.array(z.string()),
});

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  headline: z.string(),
  location: z.string(),
  college: z.string(),
  degree: z.string(),
  graduationYear: z.string(),
  skills: z.array(skillSchema),
  experience: z.string(),
  certifications: z.array(z.string()),
  careerInterests: z.array(z.string()),
  targetRole: z.string(),
  resume: z
    .object({
      fileName: z.string(),
      text: z.string(),
      uploadedAt: z.string(),
      extraction: resumeExtractionSchema.nullable(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobTargetSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  experienceRequirement: z.string(),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  toolsAndTechnologies: z.array(z.string()),
  source: z.literal("user-provided"),
  createdAt: z.string(),
});

export const gapClassificationSchema = z.enum([
  "strong",
  "partial",
  "missing",
  "needs-improvement",
]);

export const skillGapSchema = z.object({
  skill: z.string(),
  currentLevel: z.number().min(0).max(100),
  requiredLevel: z.number().min(0).max(100),
  gapScore: z.number().min(0).max(100),
  classification: gapClassificationSchema,
  priority: z.enum(["high", "medium", "low"]),
  reason: z.string(),
  learningAction: z.string(),
});

export const skillGapAnalysisSchema = z.object({
  id: z.string(),
  targetRole: z.string(),
  company: z.string(),
  basis: z.literal("job-description"),
  sourceNote: z.string(),
  gaps: z.array(skillGapSchema),
  summary: z.string(),
  readinessScore: z.number().min(0).max(100),
  matchedCount: z.number(),
  missingCount: z.number(),
  createdAt: z.string(),
  engine: z.enum(["gemini", "local"]),
  disclaimer: z.string(),
});

export const difficultySchema = z.enum(["Beginner", "Intermediate", "Advanced"]);

export const roadmapTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  skill: z.string(),
  estimatedHours: z.number().min(0),
  difficulty: difficultySchema,
  resourceSuggestions: z.array(z.string()),
  completionCriteria: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  week: z.number().int().min(1),
  origin: z.enum(["ai", "user"]),
  createdAt: z.string(),
});

export const roadmapWeekSchema = z.object({
  week: z.number().int().min(1),
  objective: z.string(),
  topics: z.array(z.string()),
  tasks: z.array(roadmapTaskSchema),
});

export const roadmapSchema = z.object({
  id: z.string(),
  targetRole: z.string(),
  weeks: z.array(roadmapWeekSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  engine: z.enum(["gemini", "local"]),
});

export const portfolioProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  problemStatement: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  techStack: z.array(z.string()),
  difficulty: difficultySchema,
  durationWeeks: z.number(),
  features: z.array(z.string()),
  deliverables: z.array(z.string()),
  employability: z.string(),
  status: z.enum(["recommended", "saved", "in_progress", "completed"]),
  createdAt: z.string(),
  engine: z.enum(["gemini", "local"]),
});

export const interviewCategorySchema = z.enum([
  "Technical",
  "Programming",
  "Computer Science",
  "Problem Solving",
  "Behavioral",
  "HR",
]);

export const interviewDifficultySchema = z.enum(["Easy", "Medium", "Hard"]);

export const interviewEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  rubric: z.object({
    technicalCorrectness: z.number().min(0).max(100),
    conceptualUnderstanding: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  incorrectAssumptions: z.array(z.string()),
  suggestions: z.array(z.string()),
  strongerAnswer: z.string(),
  wordCount: z.number(),
});

export const interviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  evaluation: interviewEvaluationSchema.nullable(),
});

export const interviewSummarySchema = z.object({
  overallScore: z.number().min(0).max(100),
  rubric: z.object({
    technicalCorrectness: z.number().min(0).max(100),
    conceptualUnderstanding: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  verdict: z.string(),
});

export const interviewSessionSchema = z.object({
  id: z.string(),
  role: z.string(),
  category: interviewCategorySchema,
  difficulty: interviewDifficultySchema,
  questions: z.array(interviewQuestionSchema),
  status: z.enum(["in_progress", "completed"]),
  overallScore: z.number().nullable(),
  summary: interviewSummarySchema.nullable(),
  engine: z.enum(["gemini", "local"]),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const applicationStatusSchema = z.enum([
  "Interested",
  "Applied",
  "Assessment",
  "Interview",
  "Rejected",
  "Offer",
]);

export const jobApplicationSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  appliedDate: z.string(),
  source: z.string(),
  jobDescription: z.string(),
  url: z.string(),
  status: applicationStatusSchema,
  interviewDates: z.array(z.string()),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const applicationInsightSchema = z.object({
  id: z.string(),
  text: z.string(),
  evidence: z.string(),
  tone: z.enum(["positive", "neutral", "attention"]),
});

export const voiceIntentSchema = z.enum([
  "UPDATE_PROFILE",
  "SET_CAREER_TARGET",
  "ANALYZE_SKILLS",
  "GENERATE_ROADMAP",
  "UPDATE_PROGRESS",
  "RESCHEDULE_TASK",
  "RECOMMEND_PROJECTS",
  "START_INTERVIEW",
  "ADD_APPLICATION",
  "VIEW_APPLICATION_INSIGHTS",
]);

export const voiceOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SET_CAREER_TARGET"),
    role: z.string(),
    company: z.string().optional(),
  }),
  z.object({
    type: z.literal("ADD_SKILLS"),
    skills: z.array(
      z.object({ name: z.string(), category: skillCategorySchema }),
    ),
  }),
  z.object({
    type: z.literal("UPDATE_PROFILE"),
    changes: z.object({
      name: z.string().optional(),
      college: z.string().optional(),
      degree: z.string().optional(),
      graduationYear: z.string().optional(),
      careerInterests: z.array(z.string()).optional(),
    }),
  }),
  z.object({ type: z.literal("COMPLETE_TASKS"), match: z.string() }),
  z.object({ type: z.literal("DELETE_TASKS"), match: z.string() }),
  z.object({
    type: z.literal("RESCHEDULE_TASK"),
    match: z.string(),
    targetWeek: z.number().int().min(1).max(4),
  }),
  z.object({
    type: z.literal("ADD_APPLICATION"),
    company: z.string(),
    title: z.string(),
    appliedDate: z.string(),
    status: applicationStatusSchema,
    source: z.string().optional(),
  }),
  z.object({
    type: z.literal("RUN_MODULE_ACTION"),
    action: z.enum([
      "ANALYZE_SKILLS",
      "GENERATE_ROADMAP",
      "RECOMMEND_PROJECTS",
      "VIEW_APPLICATION_INSIGHTS",
    ]),
    params: z.record(z.string()).optional(),
  }),
  z.object({
    type: z.literal("START_INTERVIEW"),
    role: z.string(),
    category: interviewCategorySchema,
    difficulty: interviewDifficultySchema,
    questionCount: z.number().int().min(1).max(10),
  }),
  z.object({ type: z.literal("NAVIGATE"), module: z.string() }),
]);

export const voiceProposalSchema = z.object({
  summary: z.string(),
  operations: z.array(voiceOperationSchema),
  preview: z.array(z.object({ label: z.string(), value: z.string() })),
});

export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
  proposal: voiceProposalSchema.nullable(),
  intent: voiceIntentSchema.nullable(),
  requiredInformation: z.array(z.string()).default([]),
  status: z.enum(["pending", "confirmed", "cancelled", "answered"]),
  engine: z.enum(["gemini", "local"]).nullable(),
});

export const careerStateSchema = z.object({
  version: z.literal(1),
  profile: userProfileSchema,
  jobTarget: jobTargetSchema.nullable(),
  analysis: skillGapAnalysisSchema.nullable(),
  roadmap: roadmapSchema.nullable(),
  projects: z.array(portfolioProjectSchema),
  interviews: z.array(interviewSessionSchema),
  applications: z.array(jobApplicationSchema),
  assistantMessages: z.array(assistantMessageSchema),
  savedAt: z.string(),
});

export const careerAnalysisRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resume"),
    resumeText: z.string().min(40, "Add more resume text to analyze."),
  }),
  z.object({
    action: z.literal("job-description"),
    jobDescription: z
      .string()
      .min(80, "A job description needs at least 80 characters."),
    companyHint: z.string().optional(),
  }),
  z.object({
    action: z.literal("skill-gap"),
    profile: userProfileSchema,
    jobTarget: jobTargetSchema,
  }),
  z.object({
    action: z.literal("application-insights"),
    applications: z.array(jobApplicationSchema),
    targetRole: z.string().optional(),
  }),
]);

export const roadmapRequestSchema = z.object({
  mode: z.enum(["generate", "adapt"]),
  profile: userProfileSchema,
  jobTarget: jobTargetSchema,
  analysis: skillGapAnalysisSchema,
  existingRoadmap: roadmapSchema.nullable().optional(),
});

export const projectsRequestSchema = z.object({
  profile: userProfileSchema,
  jobTarget: jobTargetSchema,
  analysis: skillGapAnalysisSchema,
  focusTechnologies: z.array(z.string()).optional(),
});

export const interviewRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    role: z.string().min(2),
    category: interviewCategorySchema,
    difficulty: interviewDifficultySchema,
    questionCount: z.number().int().min(1).max(10),
    profile: userProfileSchema,
    analysis: skillGapAnalysisSchema.nullable().optional(),
  }),
  z.object({
    action: z.literal("evaluate"),
    role: z.string().min(2),
    category: interviewCategorySchema,
    difficulty: interviewDifficultySchema,
    question: z.string().min(5),
    answer: z.string().trim().min(10, "Add at least a short answer."),
    profile: userProfileSchema,
  }),
  z.object({
    action: z.literal("summary"),
    evaluations: z.array(interviewEvaluationSchema).min(1),
    role: z.string().min(2),
  }),
]);

export const voiceAgentRequestSchema = z.object({
  command: z.string().trim().min(2, "Dictate or type a command first.").max(3000),
  context: z.object({
    today: z.string(),
    profile: z.object({
      name: z.string(),
      targetRole: z.string(),
      skills: z.array(z.string()),
      college: z.string(),
      degree: z.string(),
      graduationYear: z.string(),
      careerInterests: z.array(z.string()),
    }),
    jobTarget: z
      .object({
        title: z.string(),
        company: z.string(),
        requiredSkills: z.array(z.string()),
        hasDescription: z.boolean(),
      })
      .nullable(),
    analysis: z
      .object({
        targetRole: z.string(),
        missingSkills: z.array(z.string()),
        readinessScore: z.number(),
      })
      .nullable(),
    roadmap: z
      .object({
        tasks: z.array(
          z.object({
            title: z.string(),
            skill: z.string(),
            week: z.number(),
            completed: z.boolean(),
          }),
        ),
      })
      .nullable(),
    applications: z.array(
      z.object({
        company: z.string(),
        title: z.string(),
        status: applicationStatusSchema,
        appliedDate: z.string(),
      }),
    ),
    interviews: z.array(
      z.object({
        role: z.string(),
        score: z.number().nullable(),
        date: z.string(),
      }),
    ),
  }),
});

export const aiResumeSchema = resumeExtractionSchema;

export const aiJobTargetSchema = z.object({
  title: z.string(),
  company: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  experienceRequirement: z.string(),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  toolsAndTechnologies: z.array(z.string()),
  extractionNote: z.string(),
});

export const aiSkillGapSchema = z.object({
  summary: z.string(),
  gaps: z.array(skillGapSchema.omit({ gapScore: true })),
});

export const aiRoadmapSchema = z.object({
  weeks: z.array(
    z.object({
      week: z.number().int().min(1).max(4),
      objective: z.string(),
      topics: z.array(z.string()),
      tasks: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          skill: z.string(),
          estimatedHours: z.number().min(0.25).max(20),
          difficulty: difficultySchema,
          resourceSuggestions: z.array(z.string()),
          completionCriteria: z.string(),
        }),
      ),
    }),
  ),
});

export const aiProjectsSchema = z.object({
  projects: z.array(
    z.object({
      title: z.string(),
      problemStatement: z.string(),
      description: z.string(),
      skills: z.array(z.string()),
      techStack: z.array(z.string()),
      difficulty: difficultySchema,
      durationWeeks: z.number().min(1).max(16),
      features: z.array(z.string()),
      deliverables: z.array(z.string()),
      employability: z.string(),
    }),
  ),
});

export const aiInterviewQuestionsSchema = z.object({
  questions: z.array(z.object({ question: z.string() })),
});

export const aiInterviewEvaluationSchema = interviewEvaluationSchema.omit({
  wordCount: true,
});

export const aiInterviewSummarySchema = interviewSummarySchema;

export const aiApplicationInsightsSchema = z.object({
  insights: z.array(
    z.object({
      text: z.string(),
      evidence: z.string(),
      tone: z.enum(["positive", "neutral", "attention"]),
    }),
  ),
});

export const aiVoiceAgentSchema = z.object({
  intent: voiceIntentSchema,
  entities: z.record(z.unknown()),
  targetModule: z.string(),
  proposedAction: z.object({
    summary: z.string(),
    operations: z.array(voiceOperationSchema),
    preview: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  requiredInformation: z.array(z.string()),
  requiresConfirmation: z.boolean(),
  responseMessage: z.string(),
});
