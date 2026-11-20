import type { ContextDigest, Extraction, SegmentInput } from "@/lib/contracts/extraction";
import type { SessionSnapshot, SessionSummary } from "@/lib/contracts/domain";

export type LlmUsage = { inputTokens: number; outputTokens: number; costUsd: number; model: string; durationMs: number };

export type ExtractResult = { extraction: Extraction; usage: LlmUsage | null };
export type SummaryResult = { summary: SessionSummary; usage: LlmUsage | null };

export interface LlmProvider {
  readonly name: string;
  /** false for simulated providers; surfaced in the UI */
  readonly real: boolean;
  readonly model: string;
  extract(digest: ContextDigest, segments: SegmentInput[], opts?: { signal?: AbortSignal }): Promise<ExtractResult>;
  summarize(snapshot: SessionSnapshot, opts?: { signal?: AbortSignal }): Promise<SummaryResult>;
}

export class LlmProviderError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly cause?: unknown) {
    super(message);
    this.name = "LlmProviderError";
  }
}
