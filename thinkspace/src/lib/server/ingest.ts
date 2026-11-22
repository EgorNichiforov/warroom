/**
 * Ingest pipeline (ARCHITECTURE "Ingest pipeline"): segments → digest → LLM extract → apply → persist.
 * Batches for one session are serialized with an in-process mutex; identical batch text within a
 * 5-minute window is deduplicated (DECISIONS D-13). Any failure becomes a persisted `engine.error`
 * and the segments stay un-ingested so the client can retry.
 */
import "server-only";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { emitEvents, getSessionFocus, getSnapshot, logUsage, persistApplyResult, withTx, type Executor } from "@/lib/db/repo";
import { newId, nowIso } from "@/lib/ids";
import { buildDigest } from "@/lib/engine/digest";
import { applyExtraction } from "@/lib/engine/apply";
import { createLlmProvider } from "@/lib/providers/llm";
import { LlmProviderError, type LlmProvider } from "@/lib/providers/llm/types";
import type { SegmentInput } from "@/lib/contracts/extraction";
import type { NewSessionEvent, SessionEvent } from "@/lib/contracts/events";

export type EmitEvent = (e: SessionEvent) => void;
export type IngestOptions = { signal?: AbortSignal; timeoutMs?: number };

const EXTRACT_TIMEOUT_MS = 60_000;
const DEDUPE_WINDOW_MS = 5 * 60_000;

// ---------- per-session mutex ----------
const chains = new Map<string, Promise<void>>();

export function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(sessionId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  chains.set(sessionId, tail);
  void tail.then(() => {
    if (chains.get(sessionId) === tail) chains.delete(sessionId);
  });
  return run;
}

// ---------- dedupe ----------
const recentBatches = new Map<string, Map<string, number>>();

function seenRecently(sessionId: string, text: string, now: number): boolean {
  const m = recentBatches.get(sessionId);
  if (!m) return false;
  for (const [k, t] of m) if (now - t > DEDUPE_WINDOW_MS) m.delete(k);
  return m.has(text);
}
function remember(sessionId: string, text: string, now: number) {
  let m = recentBatches.get(sessionId);
  if (!m) recentBatches.set(sessionId, (m = new Map()));
  m.set(text, now);
}

export function createConfiguredLlmProvider(): LlmProvider {
  return createLlmProvider({
    provider: config.llm.provider,
    model: config.llm.model,
    summaryModel: config.llm.summaryModel,
    liveEffort: config.llm.liveEffort,
    summaryEffort: config.llm.summaryEffort,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function combineSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([timeout, external]) : timeout;
}

async function persistAndEmit(ex: Executor, sessionId: string, events: NewSessionEvent[], emit: EmitEvent) {
  const persisted = await emitEvents(ex, sessionId, events);
  for (const e of persisted) emit(e);
  return persisted;
}

export async function runIngest(sessionId: string, segmentIds: string[], emit: EmitEvent, opts: IngestOptions = {}): Promise<void> {
  return withSessionLock(sessionId, () => ingestOnce(sessionId, segmentIds, emit, opts));
}

async function ingestOnce(sessionId: string, requestedIds: string[], emit: EmitEvent, opts: IngestOptions): Promise<void> {
  const db = await getDb();
  const startedAt = Date.now();
  const snapshot = await getSnapshot(sessionId);
  if (!snapshot) {
    emit({
      seq: 0,
      sessionId,
      atMs: 0,
      createdAt: nowIso(),
      type: "engine.error",
      payload: { stage: "extract", message: "session not found", retryable: false, segmentIds: requestedIds },
    });
    return;
  }

  const wanted = new Set(requestedIds);
  const batch = snapshot.segments.filter((s) => wanted.has(s.id)).sort((a, b) => a.seq - b.seq);
  const segmentIds = batch.map((s) => s.id);
  const atMs = batch.reduce((m, s) => Math.max(m, s.endedMs), 0);

  if (batch.length === 0) {
    await persistAndEmit(
      db as Executor,
      sessionId,
      [{ type: "engine.error", sessionId, atMs, payload: { stage: "extract", message: "none of the requested segments exist in this session", retryable: false, segmentIds: requestedIds } }],
      emit,
    );
    return;
  }

  const provider = createConfiguredLlmProvider();
  await persistAndEmit(
    db as Executor,
    sessionId,
    [{ type: "ingest.started", sessionId, atMs, payload: { segmentIds, provider: provider.name, simulated: !provider.real } }],
    emit,
  );

  const segments: SegmentInput[] = batch.map((s) => ({ id: s.id, text: s.cleanedText ?? s.rawText, startedMs: s.startedMs, endedMs: s.endedMs }));
  const batchText = segments.map((s) => s.text.trim()).join("\n");

  if (seenRecently(sessionId, batchText, startedAt)) {
    // Same words were just processed: mark the segments ingested without a second LLM call.
    const focus = await getSessionFocus(sessionId);
    await withTx(db, async (tx) => {
      await persistApplyResult(tx, sessionId, { inserts: emptyInserts(), updates: emptyUpdates(), events: [], focus, warnings: [] }, atMs, segmentIds);
      await persistAndEmit(
        tx,
        sessionId,
        [{ type: "ingest.finished", sessionId, atMs, payload: { segmentIds, focus, durationMs: Date.now() - startedAt, usage: null } }],
        emit,
      );
    });
    return;
  }

  // ---- extract ----
  let extraction;
  let usage;
  try {
    const digest = buildDigest(snapshot, segmentIds, config.llm.maxContextSegments);
    const res = await provider.extract(digest, segments, { signal: combineSignals(opts.timeoutMs ?? EXTRACT_TIMEOUT_MS, opts.signal) });
    extraction = res.extraction;
    usage = res.usage;
  } catch (err) {
    const retryable = err instanceof LlmProviderError ? err.retryable : true;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[thinkspace/ingest] extract failed", err);
    await persistAndEmit(
      db as Executor,
      sessionId,
      [{ type: "engine.error", sessionId, atMs, payload: { stage: "extract", message, retryable, segmentIds } }],
      emit,
    );
    return;
  }

  // ---- apply + persist ----
  try {
    const result = applyExtraction({
      snapshot,
      extraction,
      segmentIds,
      nowIso: nowIso(),
      atMs,
      newId,
      provider: { name: provider.name, simulated: !provider.real },
    });
    for (const w of result.warnings) console.warn("[thinkspace/ingest] warning:", w);

    const persisted = await withTx(db, (tx) => persistApplyResult(tx, sessionId, result, atMs, segmentIds));
    for (const e of persisted) emit(e);
    remember(sessionId, batchText, Date.now());

    if (usage) {
      await logUsage({
        sessionId,
        provider: provider.name,
        model: usage.model,
        kind: "extract",
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: usage.costUsd,
        durationMs: usage.durationMs,
      });
    }

    await persistAndEmit(
      db as Executor,
      sessionId,
      [
        {
          type: "ingest.finished",
          sessionId,
          atMs,
          payload: {
            segmentIds,
            focus: result.focus,
            durationMs: Date.now() - startedAt,
            usage: usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costUsd: usage.costUsd } : null,
          },
        },
      ],
      emit,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[thinkspace/ingest] apply failed", err);
    await persistAndEmit(
      db as Executor,
      sessionId,
      [{ type: "engine.error", sessionId, atMs, payload: { stage: "apply", message, retryable: true, segmentIds } }],
      emit,
    );
  }
}

const emptyInserts = () => ({ thoughts: [], concepts: [], relations: [], models: [], versions: [], changes: [], scenes: [], actions: [] });
const emptyUpdates = () => ({ thoughts: [], concepts: [], relations: [], models: [], scenes: [], actions: [], segments: [] });
