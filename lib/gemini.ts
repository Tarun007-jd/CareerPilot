import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";

export type GeminiOperation =
  | "resume"
  | "job-description"
  | "skill-gap"
  | "roadmap"
  | "projects"
  | "interview-questions"
  | "interview-evaluation"
  | "interview-summary"
  | "application-insights"
  | "voice-agent";

export class AIServiceError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(
    message: string,
    options: { status?: number; code?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "AIServiceError";
    this.status = options.status ?? 502;
    this.code = options.code ?? "AI_SERVICE_ERROR";
    this.retryable = options.retryable ?? false;
  }
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

let client: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AIServiceError(
      "Gemini is not configured on the server. Add GEMINI_API_KEY to run Gemini analysis.",
      { status: 503, code: "GEMINI_NOT_CONFIGURED" },
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

const supportedSchemaKeywords = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

const schemaDictionaryKeywords = new Set([
  "$defs",
  "properties",
  "patternProperties",
  "dependentSchemas",
]);

function stripUnsupportedSchemaKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUnsupportedSchemaKeys);
  if (!value || typeof value !== "object") return value;
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (schemaDictionaryKeywords.has(key)) {
      cleaned[key] =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? Object.fromEntries(
              Object.entries(entry as Record<string, unknown>).map(
                ([name, subSchema]) => [
                  name,
                  stripUnsupportedSchemaKeys(subSchema),
                ],
              ),
            )
          : entry;
      continue;
    }
    if (!supportedSchemaKeywords.has(key)) continue;
    cleaned[key] = stripUnsupportedSchemaKeys(entry);
  }
  return cleaned;
}

function parseJsonText(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(unfenced) as unknown;
  } catch {
    const first = unfenced.indexOf("{");
    const last = unfenced.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(unfenced.slice(first, last + 1)) as unknown;
      } catch {
        throw new AIServiceError(
          "Gemini returned malformed JSON. Please try again.",
          { status: 502, code: "INVALID_AI_JSON", retryable: true },
        );
      }
    }
    throw new AIServiceError("Gemini returned malformed JSON. Please try again.", {
      status: 502,
      code: "INVALID_AI_JSON",
      retryable: true,
    });
  }
}

function isRetryable(error: unknown) {
  if (error instanceof AIServiceError) return error.retryable;
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode ?? record.code);
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  const message = String(record.message ?? "").toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("503") ||
    message.includes("fetch failed")
  );
}

function normalizeGeminiError(error: unknown) {
  if (error instanceof AIServiceError) return error;
  const record =
    error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const rawStatus = Number(record.status ?? record.statusCode);
  const message = String(record.message ?? "Gemini request failed.");
  const lower = message.toLowerCase();
  if (rawStatus === 429 || lower.includes("429") || lower.includes("rate limit")) {
    return new AIServiceError(
      "Gemini rate limit reached. Wait a moment, then retry the request.",
      { status: 429, code: "GEMINI_RATE_LIMIT", retryable: true },
    );
  }
  if (
    rawStatus === 401 ||
    rawStatus === 403 ||
    lower.includes("api key") ||
    lower.includes("permission denied")
  ) {
    return new AIServiceError(
      "Gemini rejected the server API key. Check GEMINI_API_KEY and the Gemini API access for this project.",
      { status: 502, code: "GEMINI_AUTH_ERROR" },
    );
  }
  if (lower.includes("timeout") || lower.includes("deadline")) {
    return new AIServiceError(
      "Gemini took too long to respond. Please retry with a shorter input.",
      { status: 504, code: "GEMINI_TIMEOUT", retryable: true },
    );
  }
  if (rawStatus === 400) {
    return new AIServiceError(
      "Gemini could not process this request. Shorten the input or remove unusual formatting, then retry.",
      { status: 400, code: "GEMINI_BAD_REQUEST" },
    );
  }
  return new AIServiceError(
    "Gemini could not complete this request. Check the server logs and retry.",
    { status: 502, code: "GEMINI_ERROR", retryable: true },
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface StructuredGenerationOptions<T> {
  operation: GeminiOperation;
  systemInstruction: string;
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateStructured<T>({
  operation,
  systemInstruction,
  prompt,
  schema,
  temperature = 0.35,
  maxOutputTokens = 8192,
}: StructuredGenerationOptions<T>): Promise<T> {
  const ai = getClient();
  const model = getGeminiModel();
  const jsonSchema = stripUnsupportedSchemaKeys(
    zodToJsonSchema(schema, {
      target: "jsonSchema7",
      $refStrategy: "none",
    }),
  );

  let lastError: unknown;
  let lastRawCause = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature,
          maxOutputTokens,
          httpOptions: { timeout: 45000 },
        },
      });
      const text = response.text;
      if (!text) {
        throw new AIServiceError(
          "Gemini returned an empty response. Please retry.",
          { status: 502, code: "EMPTY_AI_RESPONSE", retryable: true },
        );
      }
      const parsed = parseJsonText(text);
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        console.error(
          `Gemini ${operation} schema mismatch:`,
          JSON.stringify(validated.error.issues).slice(0, 1200),
        );
        throw new AIServiceError(
          "Gemini returned a response in an unexpected structure. Please retry.",
          { status: 502, code: "AI_SCHEMA_MISMATCH", retryable: true },
        );
      }
      return validated.data;
    } catch (error) {
      lastRawCause =
        error instanceof Error ? error.message : String(error ?? "unknown error");
      lastError = normalizeGeminiError(error);
      const retryable = isRetryable(lastError);
      if (!retryable || attempt === 2) break;
      await wait(600 * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
    }
  }

  console.error(
    `Gemini ${operation} failed:`,
    (lastError as Error)?.message,
    "| cause:",
    lastRawCause.slice(0, 500),
  );
  throw lastError instanceof AIServiceError
    ? lastError
    : new AIServiceError("Gemini could not complete this request.", {
        status: 502,
        code: "GEMINI_ERROR",
      });
}
