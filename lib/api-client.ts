import type {
  ApplicationInsight,
  EngineKind,
  InterviewCategory,
  InterviewDifficulty,
  InterviewEvaluation,
  InterviewSummary,
  JobApplication,
  JobTarget,
  PortfolioProject,
  ResumeExtraction,
  Roadmap,
  SkillGapAnalysis,
  UserProfile,
  VoiceAgentRequestContext,
  VoiceAgentResult,
} from "./types";

export class ClientApiError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(
    message: string,
    options: { status?: number; code?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "ClientApiError";
    this.status = options.status ?? 0;
    this.code = options.code ?? "CLIENT_REQUEST_FAILED";
    this.retryable = options.retryable ?? false;
  }
}

interface RequestOptions {
  timeout?: number;
  retries?: number;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  { timeout = 75000, retries = 0 }: RequestOptions = {},
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(path, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;
      if (!response.ok) {
        const errorPayload = payload as
          | {
              error?: {
                message?: string;
                code?: string;
                retryable?: boolean;
              };
            }
          | null;
        const error = new ClientApiError(
          errorPayload?.error?.message ||
            `Request failed with status ${response.status}.`,
          {
            status: response.status,
            code: errorPayload?.error?.code,
            retryable:
              errorPayload?.error?.retryable ??
              (response.status === 429 || response.status >= 500),
          },
        );
        if (
          error.retryable &&
          attempt < retries &&
          response.status !== 400
        ) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
          continue;
        }
        throw error;
      }
      return payload as T;
    } catch (error) {
      if (error instanceof ClientApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ClientApiError(
          "The request took too long. Check your connection and retry.",
          { code: "CLIENT_TIMEOUT", retryable: true },
        );
      }
      if (attempt < retries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        continue;
      }
      throw new ClientApiError(
        "Could not reach the CareerPilot server. Check your connection and retry.",
        { code: "NETWORK_ERROR", retryable: true },
      );
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ClientApiError("Request failed.", { retryable: true });
}

function postJson<T>(path: string, body: unknown, options?: RequestOptions) {
  return apiRequest<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

export async function fetchAIStatus() {
  return apiRequest<{
    configured: boolean;
    model: string;
    mode: EngineKind;
  }>("/api/ai-status", { method: "GET" }, { timeout: 10000, retries: 1 });
}

export async function parseResume(
  input: { file: File } | { text: string },
): Promise<{
  text: string;
  fileName: string;
  extraction: ResumeExtraction;
  engine: EngineKind;
}> {
  if ("file" in input) {
    const form = new FormData();
    form.append("file", input.file);
    return apiRequest(
      "/api/resume",
      { method: "POST", body: form },
      { timeout: 90000, retries: 1 },
    );
  }
  return postJson(
    "/api/resume",
    { text: input.text },
    { timeout: 90000, retries: 1 },
  );
}

export function extractJobDescription(
  jobDescription: string,
  companyHint?: string,
) {
  return postJson<{
    action: "job-description";
    jobTarget: JobTarget;
    extractionNote: string;
    engine: EngineKind;
  }>(
    "/api/career-analysis",
    {
      action: "job-description",
      jobDescription,
      companyHint,
    },
    { timeout: 75000, retries: 1 },
  );
}

export function analyzeSkillGap(profile: UserProfile, jobTarget: JobTarget) {
  return postJson<{
    action: "skill-gap";
    analysis: SkillGapAnalysis;
    engine: EngineKind;
  }>(
    "/api/career-analysis",
    { action: "skill-gap", profile, jobTarget },
    { timeout: 75000, retries: 1 },
  );
}

export function generateRoadmap(body: {
  mode: "generate" | "adapt";
  profile: UserProfile;
  jobTarget: JobTarget;
  analysis: SkillGapAnalysis;
  existingRoadmap: Roadmap | null;
}) {
  return postJson<{ roadmap: Roadmap; engine: EngineKind }>("/api/roadmap", body, {
    timeout: 75000,
    retries: 1,
  });
}

export function generateProjects(body: {
  profile: UserProfile;
  jobTarget: JobTarget;
  analysis: SkillGapAnalysis;
  focusTechnologies?: string[];
}) {
  return postJson<{
    projects: PortfolioProject[];
    engine: EngineKind;
  }>("/api/projects", body, { timeout: 75000, retries: 1 });
}

export function generateInterviewQuestions(body: {
  action: "generate";
  role: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  questionCount: number;
  profile: UserProfile;
  analysis: SkillGapAnalysis | null;
}) {
  return postJson<{
    action: "generate";
    questions: { id: string; question: string }[];
    engine: EngineKind;
  }>("/api/interview", body, { timeout: 75000, retries: 1 });
}

export function evaluateAnswer(body: {
  action: "evaluate";
  role: string;
  category: InterviewCategory;
  difficulty: InterviewDifficulty;
  question: string;
  answer: string;
  profile: UserProfile;
}) {
  return postJson<{
    action: "evaluate";
    evaluation: InterviewEvaluation;
    engine: EngineKind;
  }>("/api/interview", body, { timeout: 75000, retries: 1 });
}

export function summarizeInterview(body: {
  action: "summary";
  evaluations: InterviewEvaluation[];
  role: string;
}) {
  return postJson<{
    action: "summary";
    summary: InterviewSummary;
    engine: EngineKind;
  }>("/api/interview", body, { timeout: 75000, retries: 1 });
}

export function generateApplicationInsights(applications: JobApplication[]) {
  return postJson<{
    action: "application-insights";
    insights: ApplicationInsight[];
    enoughData: boolean;
    engine: EngineKind;
    note?: string;
  }>(
    "/api/career-analysis",
    { action: "application-insights", applications },
    { timeout: 75000, retries: 1 },
  );
}

export function runVoiceAgent(
  command: string,
  context: VoiceAgentRequestContext,
) {
  return postJson<{ result: VoiceAgentResult; engine: EngineKind }>(
    "/api/voice-agent",
    { command, context },
    { timeout: 60000, retries: 1 },
  );
}
