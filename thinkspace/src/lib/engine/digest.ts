/**
 * Context digest: the compact view of a session handed to the LLM on every ingest call
 * (D-13: never the full transcript). Pure function over the snapshot.
 */
import type { SessionSnapshot } from "@/lib/contracts/domain";
import type { ContextDigest } from "@/lib/contracts/extraction";

const RECENT_THOUGHTS = 20;

/** The running focus string stored in session.settings (empty when absent). */
export function snapshotFocus(snapshot: SessionSnapshot): string {
  const f = snapshot.session.settings["focus"];
  return typeof f === "string" ? f : "";
}

/** Text used for a segment everywhere downstream: cleaned when available, else raw. */
export const segmentText = (s: { cleanedText: string | null; rawText: string }) => s.cleanedText ?? s.rawText;

/**
 * Builds the digest for an ingest batch.
 * @param newSegmentIds segments about to be extracted — excluded from `recentSegments`
 * @param maxSegments how many earlier final segments to include as context
 */
export function buildDigest(snapshot: SessionSnapshot, newSegmentIds: string[], maxSegments: number): ContextDigest {
  const fresh = new Set(newSegmentIds);
  const activeThoughts = snapshot.thoughts.filter((t) => t.status === "active");

  const models = snapshot.models
    .filter((m) => m.status === "active")
    .map((m) => {
      const current = snapshot.versions
        .filter((v) => v.modelId === m.id)
        .sort((a, b) => b.version - a.version)[0];
      return { id: m.id, name: m.name, version: m.currentVersion, conceptIds: current?.snapshot.conceptIds ?? [] };
    });

  const recentSegments = snapshot.segments
    .filter((s) => s.isFinal && !fresh.has(s.id))
    .sort((a, b) => a.seq - b.seq)
    .slice(-Math.max(0, maxSegments))
    .map((s) => ({ id: s.id, text: segmentText(s), language: s.language }));

  return {
    sessionTitle: snapshot.session.title,
    focus: snapshotFocus(snapshot),
    concepts: snapshot.concepts
      .filter((c) => c.status === "active")
      .map((c) => ({ id: c.id, label: c.label, kind: c.kind })),
    relations: snapshot.relations
      .filter((r) => r.status === "active")
      .map((r) => ({ id: r.id, fromId: r.fromId, toId: r.toId, type: r.type, label: r.label })),
    models,
    recentThoughts: activeThoughts.slice(-RECENT_THOUGHTS).map((t) => ({ id: t.id, type: t.type, text: t.text })),
    openQuestions: activeThoughts.filter((t) => t.type === "question").map((t) => ({ id: t.id, text: t.text })),
    scenes: snapshot.scenes
      .filter((s) => s.status !== "superseded" && s.status !== "failed")
      .map((s) => ({ id: s.id, title: s.title, kind: s.kind, conceptIds: s.conceptIds })),
    recentSegments,
  };
}
