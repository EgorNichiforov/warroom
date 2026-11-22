/**
 * Merges an ApplyResult into a SessionSnapshot. The server persists the same rows in a
 * transaction; the client store performs the equivalent merge from the event stream.
 * Used by tests and by anything that needs the post-apply state without a database.
 */
import type { SessionSnapshot } from "@/lib/contracts/domain";
import type { ApplyResult } from "./types";

function merge<T extends { id: string }>(existing: T[], inserts: T[], updates: T[]): T[] {
  const byId = new Map(existing.map((x) => [x.id, x]));
  for (const u of updates) byId.set(u.id, u);
  for (const i of inserts) byId.set(i.id, i);
  return [...byId.values()];
}

export function applyToSnapshot(snapshot: SessionSnapshot, result: ApplyResult): SessionSnapshot {
  const patches = new Map(result.updates.segments.map((p) => [p.id, p]));
  const segments = snapshot.segments.map((s) => {
    const p = patches.get(s.id);
    return p ? { ...s, cleanedText: p.cleanedText, translation: p.translation, language: p.language } : s;
  });
  return {
    ...snapshot,
    session: { ...snapshot.session, settings: { ...snapshot.session.settings, focus: result.focus } },
    segments,
    thoughts: merge(snapshot.thoughts, result.inserts.thoughts, result.updates.thoughts),
    concepts: merge(snapshot.concepts, result.inserts.concepts, result.updates.concepts),
    relations: merge(snapshot.relations, result.inserts.relations, result.updates.relations),
    models: merge(snapshot.models, result.inserts.models, result.updates.models),
    versions: merge(snapshot.versions, result.inserts.versions, []),
    changes: merge(snapshot.changes, result.inserts.changes, []),
    scenes: merge(snapshot.scenes, result.inserts.scenes, result.updates.scenes),
    actions: merge(snapshot.actions, result.inserts.actions, result.updates.actions),
    lastEventSeq: snapshot.lastEventSeq + result.events.length,
  };
}
