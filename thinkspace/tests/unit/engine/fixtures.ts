/** Test helpers: snapshot fixture, deterministic ids, and a mock-provider → apply pipeline. */
import type { SessionSnapshot, TranscriptSegment } from "@/lib/contracts/domain";
import type { Extraction } from "@/lib/contracts/extraction";
import { applyExtraction } from "@/lib/engine/apply";
import { buildDigest } from "@/lib/engine/digest";
import { applyToSnapshot } from "@/lib/engine/snapshot";
import type { ApplyInput, ApplyResult } from "@/lib/engine/types";
import type { ScriptLine } from "@/lib/demo/script";
import type { LlmProvider } from "@/lib/providers/llm/types";

export const NOW = "2026-11-20T10:00:00.000Z";

export function makeIdFactory() {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    return `${prefix}_${String(n).padStart(4, "0")}`;
  };
}

export function makeSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    session: {
      id: "ses_test",
      ownerId: "owner",
      title: "Org design session",
      status: "active",
      languageHint: "ro-RO",
      startedAt: NOW,
      endedAt: null,
      durationMs: 0,
      summary: null,
      settings: {},
      createdAt: NOW,
      updatedAt: NOW,
    },
    segments: [],
    thoughts: [],
    concepts: [],
    relations: [],
    models: [],
    versions: [],
    changes: [],
    scenes: [],
    assets: [],
    actions: [],
    lastEventSeq: 0,
    ...overrides,
  };
}

export function makeSegment(snapshot: SessionSnapshot, text: string, language: TranscriptSegment["language"] = "unknown"): TranscriptSegment {
  const seq = snapshot.segments.length + 1;
  return {
    id: `seg_${String(seq).padStart(4, "0")}`,
    sessionId: snapshot.session.id,
    seq,
    startedMs: (seq - 1) * 5000,
    endedMs: seq * 5000,
    rawText: text,
    cleanedText: null,
    translation: null,
    language,
    isFinal: true,
    editedByUser: false,
    provider: "mock",
    confidence: null,
    ingestedAt: null,
    createdAt: NOW,
  };
}

export function apply(snapshot: SessionSnapshot, extraction: Extraction, segmentIds: string[], newId = makeIdFactory()): ApplyResult {
  const input: ApplyInput = {
    snapshot,
    extraction,
    segmentIds,
    nowIso: NOW,
    atMs: Math.max(0, ...segmentIds.map((id) => snapshot.segments.find((s) => s.id === id)?.endedMs ?? 0)),
    newId,
    provider: { name: "mock", simulated: true },
  };
  return applyExtraction(input);
}

export type Step = { line: ScriptLine; extraction: Extraction; result: ApplyResult; snapshot: SessionSnapshot };

/** Runs script lines one by one through provider.extract → applyExtraction → applyToSnapshot. */
export async function runScript(lines: ScriptLine[], provider: LlmProvider, start = makeSnapshot()): Promise<{ snapshot: SessionSnapshot; steps: Step[] }> {
  const newId = makeIdFactory();
  let snapshot = start;
  const steps: Step[] = [];
  for (const line of lines) {
    const seg = makeSegment(snapshot, line.text, line.language);
    snapshot = { ...snapshot, segments: [...snapshot.segments, seg] };
    const digest = buildDigest(snapshot, [seg.id], 12);
    const { extraction } = await provider.extract(digest, [{ id: seg.id, text: seg.rawText, startedMs: seg.startedMs, endedMs: seg.endedMs }]);
    const result = apply(snapshot, extraction, [seg.id], newId);
    snapshot = applyToSnapshot(snapshot, result);
    steps.push({ line, extraction, result, snapshot });
  }
  return { snapshot, steps };
}

export const label = (snapshot: SessionSnapshot, id: string) => snapshot.concepts.find((c) => c.id === id)?.label ?? id;
export const conceptByLabel = (snapshot: SessionSnapshot, l: string) =>
  snapshot.concepts.find((c) => c.label.toLowerCase() === l.toLowerCase() && c.status === "active");
