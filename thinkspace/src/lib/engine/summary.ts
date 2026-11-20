/**
 * Deterministic end-of-session summary built purely from the snapshot.
 * Used by the mock provider and as the fallback when the LLM summary fails.
 */
import type { SessionSnapshot, SessionSummary, Thought } from "@/lib/contracts/domain";
import { snapshotFocus } from "./digest";

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const active = (t: Thought) => t.status === "active";
const ofType = (snapshot: SessionSnapshot, ...types: Thought["type"][]) =>
  snapshot.thoughts.filter((t) => active(t) && types.includes(t.type));

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function buildHeadline(snapshot: SessionSnapshot, decisions: number, actions: number): string {
  const title = snapshot.session.title.trim() || "Thinking session";
  const focus = snapshotFocus(snapshot).trim();
  const counts = [decisions ? `${decisions} decision${decisions === 1 ? "" : "s"}` : "", actions ? `${actions} action${actions === 1 ? "" : "s"}` : ""]
    .filter(Boolean)
    .join(", ");
  return [title, focus, counts].filter(Boolean).join(" — ");
}

/** A compact digest of the session for the LLM summary prompt (not raw bytes). */
export function buildSummaryContext(snapshot: SessionSnapshot) {
  const label = (id: string) => snapshot.concepts.find((c) => c.id === id)?.label ?? id;
  return {
    sessionTitle: snapshot.session.title,
    focus: snapshotFocus(snapshot),
    transcript: snapshot.segments
      .filter((s) => s.isFinal)
      .sort((a, b) => a.seq - b.seq)
      .map((s) => ({ id: s.id, language: s.language, text: s.cleanedText ?? s.rawText })),
    thoughts: snapshot.thoughts
      .filter(active)
      .map((t) => ({ id: t.id, type: t.type, provenance: t.provenance, text: t.text, sourceSegmentIds: t.sourceSegmentIds })),
    concepts: snapshot.concepts.filter((c) => c.status === "active").map((c) => ({ id: c.id, label: c.label, kind: c.kind })),
    relations: snapshot.relations
      .filter((r) => r.status === "active")
      .map((r) => `${label(r.fromId)} —${r.type}→ ${label(r.toId)}`),
    models: snapshot.models
      .filter((m) => m.status === "active")
      .map((m) => ({ id: m.id, name: m.name, currentVersion: m.currentVersion })),
    changes: snapshot.changes.map((c) => ({ kind: c.kind, description: c.description, implications: c.implications, unresolved: c.unresolved })),
    actions: snapshot.actions.map((a) => ({ id: a.id, text: a.text, status: a.status, priority: a.priority, dueDate: a.dueDate, dependsOn: a.dependsOn })),
  };
}

export function buildDeterministicSummary(snapshot: SessionSnapshot, simulated: boolean): SessionSummary {
  const conceptLabel = (id: string) => snapshot.concepts.find((c) => c.id === id)?.label ?? id;
  const actionText = (id: string) => snapshot.actions.find((a) => a.id === id)?.text ?? id;

  const decisions = ofType(snapshot, "decision").map((t) => ({ text: t.text, sourceSegmentIds: t.sourceSegmentIds }));
  const openActions = snapshot.actions.filter((a) => a.status === "open");
  const actionItems = openActions.map((a) => ({ id: a.id, text: a.text, priority: a.priority }));

  const dependencies = uniq([
    ...openActions.flatMap((a) => a.dependsOn.map((d) => `"${a.text}" depends on "${actionText(d)}"`)),
    ...snapshot.relations
      .filter((r) => r.status === "active" && r.type === "depends_on")
      .map((r) => `${conceptLabel(r.fromId)} depends on ${conceptLabel(r.toId)}`),
  ]);

  const priorities = [...openActions]
    .filter((a) => a.priority)
    .sort((a, b) => PRIORITY_ORDER[a.priority!] - PRIORITY_ORDER[b.priority!])
    .map((a) => `${a.priority}: ${a.text}`);

  const modelName = (id: string | null) => (id ? snapshot.models.find((m) => m.id === id)?.name ?? id : null);
  const systemsToChange = uniq(
    snapshot.changes
      .filter((c) => c.kind !== "create")
      .map((c) => {
        const name = modelName(c.modelId);
        return name ? `${name} (v${c.beforeVersion ?? "?"} → v${c.afterVersion ?? "?"}): ${c.description}` : c.description;
      }),
  );

  const suggestions = uniq([
    ...snapshot.thoughts.filter((t) => active(t) && t.provenance === "inferred" && t.type !== "question").map((t) => t.text),
    ...snapshot.actions.filter((a) => a.status === "open" && a.provenance === "inferred").map((a) => a.text),
    ...snapshot.changes.flatMap((c) => c.implications),
  ]);

  return {
    headline: buildHeadline(snapshot, decisions.length, actionItems.length),
    whatIThoughtAbout: uniq(snapshot.concepts.filter((c) => c.status === "active").map((c) => c.label)),
    conclusions: uniq(ofType(snapshot, "conclusion", "insight").map((t) => t.text)),
    decisions,
    actionItems,
    nextSteps: uniq(openActions.map((a) => a.text)),
    openQuestions: uniq([...ofType(snapshot, "question").map((t) => t.text), ...snapshot.changes.flatMap((c) => c.unresolved)]),
    ideasToExplore: uniq(ofType(snapshot, "idea", "alternative", "hypothesis").map((t) => t.text)),
    dependencies,
    priorities,
    systemsToChange,
    suggestions,
    generatedAt: new Date().toISOString(),
    simulated,
  };
}
