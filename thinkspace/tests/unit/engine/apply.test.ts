import { describe, expect, it } from "vitest";
import { emptyExtraction } from "@/lib/contracts/extraction";
import { apply, makeSegment, makeSnapshot } from "./fixtures";

const withSegment = () => {
  const snapshot = makeSnapshot();
  const seg = makeSegment(snapshot, "Research controls execution.");
  return { snapshot: { ...snapshot, segments: [seg] }, seg };
};

describe("applyExtraction", () => {
  it("never inserts a relation with unresolved refs; flags an ambiguity instead", () => {
    const { snapshot, seg } = withSegment();
    const extraction = emptyExtraction();
    extraction.concepts.push({ tempId: "c1", label: "Research", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null });
    extraction.relations.push({ tempId: "r1", fromRef: "c1", toRef: "con_does_not_exist", type: "controls", label: null, provenance: "stated", sourceSegmentIds: [seg.id] });
    const result = apply(snapshot, extraction, [seg.id]);
    expect(result.inserts.relations).toHaveLength(0);
    expect(result.inserts.concepts).toHaveLength(1);
    const flagged = result.events.filter((e) => e.type === "ambiguity.flagged");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].payload).toMatchObject({ candidates: ["con_does_not_exist"], sourceSegmentIds: [seg.id] });
    expect(result.warnings.some((w) => w.includes("con_does_not_exist"))).toBe(true);
    expect(result.events.at(-1)?.type).toBe("ambiguity.flagged");
  });

  it("dedupes concepts by normalized label and relations by from/to/type", () => {
    const { snapshot, seg } = withSegment();
    const first = emptyExtraction();
    first.concepts.push(
      { tempId: "c1", label: "Execuție", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
      { tempId: "c2", label: "Research", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
    );
    first.relations.push({ tempId: "r1", fromRef: "c2", toRef: "c1", type: "advises", label: null, provenance: "stated", sourceSegmentIds: [seg.id] });
    const r1 = apply(snapshot, first, [seg.id]);
    const snap2 = { ...snapshot, concepts: r1.inserts.concepts, relations: r1.inserts.relations };

    const second = emptyExtraction();
    second.concepts.push({ tempId: "c9", label: "  executie ", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null });
    second.concepts.push({ tempId: "c8", label: "RESEARCH", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null });
    second.relations.push({ tempId: "r2", fromRef: "c8", toRef: "c9", type: "advises", label: null, provenance: "stated", sourceSegmentIds: [seg.id] });
    second.thoughts.push({ tempId: "t1", type: "idea", text: "x", provenance: "stated", confidence: 0.5, sourceSegmentIds: [seg.id], revisesThoughtId: null, conceptRefs: ["c9", "c8"] });
    const r2 = apply(snap2, second, [seg.id]);
    expect(r2.inserts.concepts).toHaveLength(0);
    expect(r2.inserts.relations).toHaveLength(0);
    expect(r2.inserts.thoughts[0].conceptIds.sort()).toEqual(r1.inserts.concepts.map((c) => c.id).sort());
  });

  it("creates a model (v1), then versions a replace keeping v1 and marking removed concepts revised", () => {
    const { snapshot, seg } = withSegment();
    const create = emptyExtraction();
    create.concepts.push(
      { tempId: "a", label: "A", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
      { tempId: "b", label: "B", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
    );
    create.relations.push({ tempId: "r", fromRef: "a", toRef: "b", type: "feeds", label: null, provenance: "stated", sourceSegmentIds: [seg.id] });
    create.changes.push({ kind: "create", modelId: null, newModelName: "Pipeline", description: "A feeds B", removeConceptRefs: [], addConceptRefs: ["a", "b"], removeRelationRefs: [], addRelationRefs: ["r"], renames: [], implications: [], unresolvedQuestions: [], sourceSegmentIds: [seg.id] });
    const r1 = apply(snapshot, create, [seg.id]);
    expect(r1.inserts.models[0].currentVersion).toBe(1);
    expect(r1.inserts.versions[0].snapshot.relationIds).toHaveLength(1);
    expect(r1.inserts.changes[0]).toMatchObject({ kind: "create", beforeVersion: null, afterVersion: 1 });
    expect(r1.events.map((e) => e.type)).toEqual(["concept.added", "concept.added", "relation.added", "model.added", "version.added", "change.recorded"]);

    const snap2 = { ...snapshot, concepts: r1.inserts.concepts, relations: r1.inserts.relations, models: r1.inserts.models, versions: r1.inserts.versions, changes: r1.inserts.changes };
    const [a, b] = r1.inserts.concepts.map((c) => c.id);
    const replace = emptyExtraction();
    replace.concepts.push({ tempId: "c", label: "C", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null });
    replace.changes.push({ kind: "replace", modelId: snap2.models[0].id, newModelName: null, description: "B replaced by C", removeConceptRefs: [b], addConceptRefs: ["c"], removeRelationRefs: [], addRelationRefs: [], renames: [{ conceptRef: a, newLabel: "A prime" }], implications: ["imp"], unresolvedQuestions: ["Who owns C?"], sourceSegmentIds: [seg.id] });
    const r2 = apply(snap2, replace, [seg.id]);
    const version = r2.inserts.versions[0];
    expect(version.version).toBe(2);
    expect(version.snapshot.conceptIds).not.toContain(b);
    expect(version.snapshot.relationIds).toHaveLength(0); // the A→B relation left with B
    expect(version.snapshot.concepts.find((c) => c.id === a)?.label).toBe("A prime");
    expect(r2.updates.models[0].currentVersion).toBe(2);
    expect(r2.updates.concepts.find((c) => c.id === b)?.status).toBe("revised");
    expect(r2.updates.relations[0].status).toBe("revised");
    expect(r2.inserts.changes[0].diff.removedConceptIds).toEqual([b]);
    expect(r2.inserts.changes[0].beforeVersion).toBe(1);
    expect(r2.inserts.thoughts).toEqual([expect.objectContaining({ type: "question", provenance: "inferred", text: "Who owns C?" })]);
    expect(snap2.versions[0].snapshot.conceptIds).toContain(b); // v1 untouched
  });

  it("implicitly rewires a model when a new relation joins two of its concepts, without an explicit change", () => {
    const { snapshot, seg } = withSegment();
    const create = emptyExtraction();
    create.concepts.push(
      { tempId: "a", label: "A", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
      { tempId: "b", label: "B", kind: "component", description: null, provenance: "stated", sourceSegmentIds: [seg.id], existingId: null },
    );
    create.changes.push({ kind: "create", modelId: null, newModelName: "M", description: "", removeConceptRefs: [], addConceptRefs: ["a", "b"], removeRelationRefs: [], addRelationRefs: [], renames: [], implications: [], unresolvedQuestions: [], sourceSegmentIds: [seg.id] });
    const r1 = apply(snapshot, create, [seg.id]);
    const snap2 = { ...snapshot, concepts: r1.inserts.concepts, models: r1.inserts.models, versions: r1.inserts.versions };
    const [a, b] = r1.inserts.concepts.map((c) => c.id);
    const ex = emptyExtraction();
    ex.relations.push({ tempId: "r", fromRef: a, toRef: b, type: "depends_on", label: null, provenance: "stated", sourceSegmentIds: [seg.id] });
    const r2 = apply(snap2, ex, [seg.id]);
    expect(r2.inserts.changes[0]).toMatchObject({ kind: "rewire", beforeVersion: 1, afterVersion: 2 });
    expect(r2.inserts.versions[0].snapshot.relationIds).toEqual([r2.inserts.relations[0].id]);
  });

  it("corrections retract (never delete) and record a correction change event", () => {
    const { snapshot, seg } = withSegment();
    const ex = emptyExtraction();
    ex.thoughts.push({ tempId: "t", type: "idea", text: "old", provenance: "stated", confidence: 0.5, sourceSegmentIds: [seg.id], revisesThoughtId: null, conceptRefs: [] });
    const r1 = apply(snapshot, ex, [seg.id]);
    const snap2 = { ...snapshot, thoughts: r1.inserts.thoughts };
    const cor = emptyExtraction();
    cor.corrections.push({ description: "not that", retractThoughtIds: [snap2.thoughts[0].id, "tho_missing"], retractRelationIds: [], retractConceptIds: [], sourceSegmentIds: [seg.id] });
    const r2 = apply(snap2, cor, [seg.id]);
    expect(r2.updates.thoughts[0].status).toBe("retracted");
    expect(r2.inserts.changes[0]).toMatchObject({ kind: "correction", modelId: null });
    expect(r2.warnings.some((w) => w.includes("tho_missing"))).toBe(true);
  });

  it("scenes: image kinds without a prompt fall back to structured; updates supersede the parent", () => {
    const { snapshot, seg } = withSegment();
    const ex = emptyExtraction();
    ex.sceneDirectives.push({ op: "new", sceneId: null, title: "S", kind: "photo", description: "d", imagePrompt: "", conceptRefs: ["nope"], reason: "", sourceSegmentIds: [seg.id] });
    const r1 = apply(snapshot, ex, [seg.id]);
    expect(r1.inserts.scenes[0]).toMatchObject({ kind: "structured", status: "ready", conceptIds: [] });
    const snap2 = { ...snapshot, scenes: r1.inserts.scenes };
    const upd = emptyExtraction();
    upd.sceneDirectives.push({ op: "update", sceneId: snap2.scenes[0].id, title: "S2", kind: "illustration", description: "d2", imagePrompt: "a calm room", conceptRefs: [], reason: "", sourceSegmentIds: [seg.id] });
    const r2 = apply(snap2, upd, [seg.id]);
    expect(r2.inserts.scenes[0]).toMatchObject({ parentSceneId: snap2.scenes[0].id, status: "planned", prompt: "a calm room" });
    expect(r2.updates.scenes[0].status).toBe("superseded");
  });

  it("actions: dependencies resolve within the batch, duplicates are not re-created, segment annotations never touch rawText", () => {
    const { snapshot, seg } = withSegment();
    const ex = emptyExtraction();
    ex.actions.push(
      { tempId: "a1", text: "Write charter", priority: "high", dueDate: null, dependsOnRefs: ["a2", "act_ghost"], provenance: "stated", sourceSegmentIds: [seg.id] },
      { tempId: "a2", text: "Call ops lead", priority: null, dueDate: "2026-12-01", dependsOnRefs: [], provenance: "stated", sourceSegmentIds: [seg.id] },
      { tempId: "a3", text: "write charter", priority: null, dueDate: null, dependsOnRefs: [], provenance: "inferred", sourceSegmentIds: [seg.id] },
    );
    ex.segmentAnnotations.push({ segmentId: seg.id, language: "en", cleanedText: "Research controls execution.", translation: null });
    ex.focus = "";
    const r = apply(snapshot, ex, [seg.id]);
    expect(r.inserts.actions).toHaveLength(2);
    expect(r.inserts.actions[0].dependsOn).toEqual([r.inserts.actions[1].id]);
    expect(r.inserts.actions[1].dueDate).toBe("2026-12-01");
    expect(r.updates.segments).toEqual([{ id: seg.id, cleanedText: "Research controls execution.", translation: null, language: "en" }]);
    const segEvent = r.events.find((e) => e.type === "segment.updated")!;
    expect(segEvent.payload).toMatchObject({ rawText: seg.rawText, language: "en" });
    expect(r.focus).toBe("");
    expect(r.warnings.some((w) => w.includes("act_ghost"))).toBe(true);
  });
});
