import type { CareerState } from "./types";
import { careerStateSchema } from "./schemas";

export const STORAGE_KEY = "careerpilot:v1";

export interface CareerStorageAdapter {
  load(): Promise<CareerState | null>;
  save(state: CareerState): Promise<void>;
  clear(): Promise<void>;
}

export function createEmptyCareerState(): CareerState {
  const now = new Date().toISOString();
  return {
    version: 1,
    profile: {
      id: `user_${crypto.randomUUID?.() ?? Date.now()}`,
      name: "",
      email: "",
      headline: "",
      location: "",
      college: "",
      degree: "",
      graduationYear: "",
      skills: [],
      experience: "",
      certifications: [],
      careerInterests: [],
      targetRole: "",
      resume: null,
      createdAt: now,
      updatedAt: now,
    },
    jobTarget: null,
    analysis: null,
    roadmap: null,
    projects: [],
    interviews: [],
    applications: [],
    assistantMessages: [],
    savedAt: now,
  };
}

export class LocalStorageCareerAdapter implements CareerStorageAdapter {
  constructor(private readonly key = STORAGE_KEY) {}

  async load(): Promise<CareerState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      const validated = careerStateSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as CareerState;
    } catch {
      return null;
    }
  }

  async save(state: CareerState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      throw new Error(
        "CareerPilot could not save to this browser. Storage may be full or blocked.",
      );
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      throw new Error("CareerPilot could not clear your local workspace.");
    }
  }
}

export const careerStorage: CareerStorageAdapter = new LocalStorageCareerAdapter();
