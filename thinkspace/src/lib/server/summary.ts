/**
 * End-of-session summary: LLM summarize() with a deterministic fallback when the provider fails.
 * Persists session.summary, marks the session ended, and emits summary.ready + session.updated.
 */
import "server-only";
import { getDb } from "@/lib/db/client";
import { emitEvents, getSnapshot, logUsage, updateSession, withTx } from "@/lib/db/repo";
import { nowIso } from "@/lib/ids";
import { buildDeterministicSummary } from "@/lib/engine/summary";
import { LlmProviderError } from "@/lib/providers/llm/types";
import { createConfiguredLlmProvider } from "@/lib/server/ingest";
import type { SessionSummary } from "@/lib/contracts/domain";
import type { SessionEvent } from "@/lib/contracts/events";

export type EmitEvent = (e: SessionEvent) => void;
const SUMMARY_TIMEOUT_MS = 120_000;
export const FALLBACK_NOTE = "Summary generated without AI (provider unavailable)";

export async function runSummary(sessionId: string, emit: EmitEvent, opts: { signal?: AbortSignal } = {}): Promise<void> {
  const db = await getDb();
  const snapshot = await getSnapshot(sessionId);
  if (!snapshot) {
    emit({ seq: 0, sessionId, atMs: 0, createdAt: nowIso(), type: "engine.error", payload: { stage: "summary", message: "session not found", retryable: false } });
    return;
  }
  const atMs = Math.max(snapshot.session.durationMs, ...snapshot.segments.map((s) => s.endedMs), 0);
  const provider = createConfiguredLlmProvider();

  let summary: SessionSummary;
  try {
    const signal = opts.signal ? AbortSignal.any([AbortSignal.timeout(SUMMARY_TIMEOUT_MS), opts.signal]) : AbortSignal.timeout(SUMMARY_TIMEOUT_MS);
    const res = await provider.summarize(snapshot, { signal });
    summary = res.summary;
    if (res.usage) {
      await logUsage({
        sessionId,
        provider: provider.name,
        model: res.usage.model,
        kind: "summary",
        inputTokens: res.usage.inputTokens,
        outputTokens: res.usage.outputTokens,
        costUsd: res.usage.costUsd,
        durationMs: res.usage.durationMs,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = err instanceof LlmProviderError ? err.retryable : true;
    console.warn("[thinkspace/summary] provider failed, using deterministic summary:", message);
    summary = buildDeterministicSummary(snapshot, true);
    summary = { ...summary, suggestions: [...summary.suggestions, FALLBACK_NOTE] };
    const errEvents = await emitEvents(db, sessionId, [
      { type: "engine.error", sessionId, atMs, payload: { stage: "summary", message: `${message} — ${FALLBACK_NOTE}`, retryable } },
    ]);
    for (const e of errEvents) emit(e);
  }

  const events = await withTx(db, async (tx) => {
    const now = nowIso();
    const session = await updateSession(
      sessionId,
      {
        summary,
        status: "ended",
        endedAt: snapshot.session.endedAt ?? now,
        durationMs: Math.max(snapshot.session.durationMs, atMs),
      },
      tx,
    );
    if (!session) throw new Error("session disappeared while summarizing");
    return emitEvents(tx, sessionId, [
      { type: "summary.ready", sessionId, atMs, payload: summary },
      { type: "session.updated", sessionId, atMs, payload: session },
    ]);
  });
  for (const e of events) emit(e);
}
