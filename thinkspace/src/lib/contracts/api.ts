/** Request/response shapes for the HTTP API. */
import { z } from "zod";
import { Language, SessionStatus } from "./domain";

export const CreateSessionBody = z.object({
  title: z.string().min(1).max(200).optional(),
  languageHint: z.string().max(16).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateSessionBody = z.object({
  title: z.string().min(1).max(200).optional(),
  status: SessionStatus.optional(),
  durationMs: z.number().int().nonnegative().optional(),
  languageHint: z.string().max(16).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const AppendSegmentsBody = z.object({
  segments: z.array(
    z.object({
      /** client-generated id so retries are idempotent */
      id: z.string().min(1).max(64),
      startedMs: z.number().int().nonnegative(),
      endedMs: z.number().int().nonnegative(),
      rawText: z.string().min(1).max(5000),
      language: Language.optional(),
      isFinal: z.boolean(),
      provider: z.string().max(32),
      confidence: z.number().min(0).max(1).nullable().optional(),
    }),
  ).min(1).max(50),
});

export const UpdateSegmentBody = z.object({
  rawText: z.string().min(1).max(5000).optional(),
  cleanedText: z.string().max(5000).nullable().optional(),
  language: Language.optional(),
});

export const IngestBody = z.object({
  segmentIds: z.array(z.string()).min(1).max(50),
});

export const UpdateActionBody = z.object({
  text: z.string().min(1).max(2000).optional(),
  status: z.enum(["open", "done", "dropped"]).optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const UpdateThoughtBody = z.object({
  text: z.string().min(1).max(4000).optional(),
  status: z.enum(["active", "revised", "retracted"]).optional(),
});

export const SpeechTokenBody = z.object({
  provider: z.enum(["soniox", "deepgram"]),
});

export const HealthResponse = z.object({
  ok: z.boolean(),
  db: z.enum(["pglite", "postgres"]),
  providers: z.object({
    llm: z.object({ name: z.string(), real: z.boolean(), model: z.string() }),
    image: z.object({ name: z.string(), real: z.boolean(), model: z.string() }),
    speech: z.object({ default: z.string(), available: z.array(z.string()) }),
  }),
  auth: z.enum(["passphrase", "open"]),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const SearchResultKind = z.enum(["session", "segment", "thought", "concept", "action"]);
export type SearchResultKind = z.infer<typeof SearchResultKind>;

/** One hit from GET /api/search. atMs = session-relative ms of the hit (first source segment) when known. */
export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  sessionId: string;
  sessionTitle: string;
  text: string;
  atMs: number | null;
  createdAt: string;
};

/** Per-session counts returned alongside each session by GET /api/sessions. */
export type SessionCounts = { segments: number; thoughts: number; concepts: number; actions: number };

export type ApiError = { error: string; code?: string; details?: unknown };
