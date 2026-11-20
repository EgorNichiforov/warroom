/**
 * applyExtraction: turns a validated Extraction into rows + events against a snapshot.
 * Pure and deterministic given `newId`. Never deletes: corrections retract, structural
 * changes produce new immutable model versions (D-09, D-10).
 */
import type {
  ActionItem,
  ChangeEvent,
  Concept,
  ModelSnapshot,
  ModelVersion,
  Relation,
  Scene,
  SessionSnapshot,
  SystemModel,
  Thought,
  TranscriptSegment,
} from "@/lib/contracts/domain";
import type { Extraction, ExtractedChange, SceneDirective } from "@/lib/contracts/extraction";
import type { NewSessionEvent } from "@/lib/contracts/events";
import { snapshotFocus } from "./digest";
import type { ApplyInput, ApplyResult } from "./types";

type EventType = NewSessionEvent["type"];
type PayloadOf<T extends EventType> = Extract<NewSessionEvent, { type: T }>["payload"];
type Bucket = "segments" | "concepts" | "relations" | "thoughts" | "models" | "scenes" | "actions" | "ambiguities";
const BUCKET_ORDER: Bucket[] = ["segments", "concepts", "relations", "thoughts", "models", "scenes", "actions", "ambiguities"];

/** Case/diacritics-insensitive key used for deduplication. */
export function normalizeLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Mutable working state for one apply run. */
class Ctx {
  readonly result: ApplyResult;
  readonly buckets: Record<Bucket, NewSessionEvent[]>;
  readonly inserted = new Set<string>();
  readonly conceptRefs = new Map<string, string>();
  readonly relationRefs = new Map<string, string>();
  readonly thoughtRefs = new Map<string, string>();
  readonly actionRefs = new Map<string, string>();
  readonly concepts: Map<string, Concept>;
  readonly relations: Map<string, Relation>;
  readonly thoughts: Map<string, Thought>;
  readonly models: Map<string, SystemModel>;
  readonly scenes: Map<string, Scene>;
  readonly actions: Map<string, ActionItem>;
  readonly segments: Map<string, TranscriptSegment>;
  readonly latestVersion = new Map<string, ModelVersion>();
  /** models that received an explicit change in this batch */
  readonly touchedModels = new Set<string>();
  readonly batchRelationIds: string[] = [];

  constructor(readonly input: ApplyInput) {
    const s = input.snapshot;
    this.result = {
      inserts: { thoughts: [], concepts: [], relations: [], models: [], versions: [], changes: [], scenes: [], actions: [] },
      updates: { thoughts: [], concepts: [], relations: [], models: [], scenes: [], actions: [], segments: [] },
      events: [],
      focus: input.extraction.focus.trim() || snapshotFocus(s),
      warnings: [],
    };
    this.buckets = { segments: [], concepts: [], relations: [], thoughts: [], models: [], scenes: [], actions: [], ambiguities: [] };
    this.concepts = new Map(s.concepts.map((c) => [c.id, c]));
    this.relations = new Map(s.relations.map((r) => [r.id, r]));
    this.thoughts = new Map(s.thoughts.map((t) => [t.id, t]));
    this.models = new Map(s.models.map((m) => [m.id, m]));
    this.scenes = new Map(s.scenes.map((x) => [x.id, x]));
    this.actions = new Map(s.actions.map((a) => [a.id, a]));
    this.segments = new Map(s.segments.map((x) => [x.id, x]));
    for (const v of s.versions) {
      const cur = this.latestVersion.get(v.modelId);
      if (!cur || v.version > cur.version) this.latestVersion.set(v.modelId, v);
    }
  }

  get sessionId() {
    return this.input.snapshot.session.id;
  }
  get now() {
    return this.input.nowIso;
  }
  id(prefix: string) {
    return this.input.newId(prefix);
  }
  warn(msg: string) {
    this.result.warnings.push(msg);
  }
  emit<T extends EventType>(bucket: Bucket, type: T, payload: PayloadOf<T>) {
    this.buckets[bucket].push({ type, sessionId: this.sessionId, atMs: this.input.atMs, payload } as Extract<NewSessionEvent, { type: T }>);
  }
  flagAmbiguity(text: string, candidates: string[], sourceSegmentIds: string[]) {
    this.emit("ambiguities", "ambiguity.flagged", { text, candidates: uniq(candidates), sourceSegmentIds });
  }

  // ---- ref resolution ----
  conceptId(ref: string): string | undefined {
    return this.conceptRefs.get(ref) ?? (this.concepts.has(ref) ? ref : undefined);
  }
  relationId(ref: string): string | undefined {
    return this.relationRefs.get(ref) ?? (this.relations.has(ref) ? ref : undefined);
  }
  thoughtId(ref: string): string | undefined {
    return this.thoughtRefs.get(ref) ?? (this.thoughts.has(ref) ? ref : undefined);
  }
  actionId(ref: string): string | undefined {
    return this.actionRefs.get(ref) ?? (this.actions.has(ref) ? ref : undefined);
  }

  /** Resolves many refs, warning once per unknown ref. */
  resolveMany(refs: string[], resolve: (ref: string) => string | undefined, what: string): string[] {
    const out: string[] = [];
    for (const ref of refs) {
      const id = resolve(ref);
      if (id) out.push(id);
      else this.warn(`Unknown ${what} ref "${ref}" dropped`);
    }
    return uniq(out);
  }

  // ---- generic insert/update helpers (inserted rows are mutated in place; existing rows are copied into updates) ----
  private upsertUpdate<T extends { id: string }>(list: T[], row: T) {
    const i = list.findIndex((x) => x.id === row.id);
    if (i >= 0) list[i] = row;
    else list.push(row);
  }

  insertConcept(c: Concept) {
    this.concepts.set(c.id, c);
    this.inserted.add(c.id);
    this.result.inserts.concepts.push(c);
    this.emit("concepts", "concept.added", c);
  }
  updateConcept(id: string, patch: Partial<Concept>) {
    const cur = this.concepts.get(id);
    if (!cur) return;
    if (this.inserted.has(id)) {
      Object.assign(cur, patch);
      return;
    }
    const next = { ...cur, ...patch, updatedAt: this.now };
    this.concepts.set(id, next);
    this.upsertUpdate(this.result.updates.concepts, next);
    this.emit("concepts", "concept.updated", next);
  }
  insertRelation(r: Relation) {
    this.relations.set(r.id, r);
    this.inserted.add(r.id);
    this.batchRelationIds.push(r.id);
    this.result.inserts.relations.push(r);
    this.emit("relations", "relation.added", r);
  }
  updateRelation(id: string, patch: Partial<Relation>) {
    const cur = this.relations.get(id);
    if (!cur) return;
    if (this.inserted.has(id)) {
      Object.assign(cur, patch);
      return;
    }
    const next = { ...cur, ...patch, updatedAt: this.now };
    this.relations.set(id, next);
    this.upsertUpdate(this.result.updates.relations, next);
    this.emit("relations", "relation.updated", next);
  }
  insertThought(t: Thought) {
    this.thoughts.set(t.id, t);
    this.inserted.add(t.id);
    this.result.inserts.thoughts.push(t);
    this.emit("thoughts", "thought.added", t);
  }
  updateThought(id: string, patch: Partial<Thought>) {
    const cur = this.thoughts.get(id);
    if (!cur) return;
    if (this.inserted.has(id)) {
      Object.assign(cur, patch);
      return;
    }
    const next = { ...cur, ...patch, updatedAt: this.now };
    this.thoughts.set(id, next);
    this.upsertUpdate(this.result.updates.thoughts, next);
    this.emit("thoughts", "thought.updated", next);
  }
  insertModel(m: SystemModel) {
    this.models.set(m.id, m);
    this.inserted.add(m.id);
    this.result.inserts.models.push(m);
    this.emit("models", "model.added", m);
  }
  updateModel(id: string, patch: Partial<SystemModel>) {
    const cur = this.models.get(id);
    if (!cur) return;
    if (this.inserted.has(id)) {
      Object.assign(cur, patch);
      return;
    }
    const next = { ...cur, ...patch, updatedAt: this.now };
    this.models.set(id, next);
    this.upsertUpdate(this.result.updates.models, next);
    this.emit("models", "model.updated", next);
  }
  insertVersion(v: ModelVersion) {
    this.latestVersion.set(v.modelId, v);
    this.result.inserts.versions.push(v);
    this.emit("models", "version.added", v);
  }
  insertChange(c: ChangeEvent) {
    this.result.inserts.changes.push(c);
    this.emit("models", "change.recorded", c);
  }
  insertScene(s: Scene) {
    this.scenes.set(s.id, s);
    this.inserted.add(s.id);
    this.result.inserts.scenes.push(s);
    this.emit("scenes", "scene.added", s);
  }
  updateScene(id: string, patch: Partial<Scene>) {
    const cur = this.scenes.get(id);
    if (!cur) return;
    const next = { ...cur, ...patch, updatedAt: this.now };
    this.scenes.set(id, next);
    this.upsertUpdate(this.result.updates.scenes, next);
    this.emit("scenes", "scene.updated", next);
  }
  insertAction(a: ActionItem) {
    this.actions.set(a.id, a);
    this.inserted.add(a.id);
    this.result.inserts.actions.push(a);
    this.emit("actions", "action.added", a);
  }

  /** Models whose current version contains the concept or relation. */
  modelsContaining(id: string): string[] {
    const out: string[] = [];
    for (const [modelId, v] of this.latestVersion) {
      if (this.models.get(modelId)?.status !== "active") continue;
      if (v.snapshot.conceptIds.includes(id) || v.snapshot.relationIds.includes(id)) out.push(modelId);
    }
    return out;
  }

  finish(): ApplyResult {
    this.result.events = BUCKET_ORDER.flatMap((b) => this.buckets[b]);
    return this.result;
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function applySegments(ctx: Ctx) {
  for (const a of ctx.input.extraction.segmentAnnotations) {
    const seg = ctx.segments.get(a.segmentId);
    if (!seg) {
      ctx.warn(`Annotation for unknown segment "${a.segmentId}" dropped`);
      continue;
    }
    const cleaned = a.cleanedText.trim() || null;
    const patch = { id: seg.id, cleanedText: cleaned, translation: a.translation?.trim() || null, language: a.language };
    ctx.result.updates.segments.push(patch);
    const next: TranscriptSegment = { ...seg, cleanedText: patch.cleanedText, translation: patch.translation, language: patch.language };
    ctx.segments.set(seg.id, next);
    ctx.emit("segments", "segment.updated", next);
  }
}

function applyConcepts(ctx: Ctx) {
  const byLabel = new Map<string, string>();
  for (const c of ctx.concepts.values()) if (c.status === "active") byLabel.set(normalizeLabel(c.label), c.id);

  for (const ec of ctx.input.extraction.concepts) {
    if (ec.existingId) {
      const existing = ctx.concepts.get(ec.existingId);
      if (existing) {
        ctx.conceptRefs.set(ec.tempId, existing.id);
        continue;
      }
      ctx.warn(`Concept "${ec.label}" referenced unknown existingId "${ec.existingId}"; matched by label instead`);
    }
    const key = normalizeLabel(ec.label);
    if (!key) {
      ctx.warn(`Concept "${ec.tempId}" has an empty label; skipped`);
      continue;
    }
    const dup = byLabel.get(key);
    if (dup) {
      ctx.conceptRefs.set(ec.tempId, dup);
      continue;
    }
    const concept: Concept = {
      id: ctx.id("con"),
      sessionId: ctx.sessionId,
      label: ec.label.trim(),
      kind: ec.kind,
      description: ec.description,
      status: "active",
      provenance: ec.provenance,
      sourceSegmentIds: ec.sourceSegmentIds,
      metadata: {},
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.insertConcept(concept);
    ctx.conceptRefs.set(ec.tempId, concept.id);
    byLabel.set(key, concept.id);
  }
}

const relationKey = (r: { fromId: string; toId: string; type: string }) => `${r.fromId}|${r.toId}|${r.type}`;

function applyRelations(ctx: Ctx) {
  const active = new Map<string, string>();
  for (const r of ctx.relations.values()) if (r.status === "active") active.set(relationKey(r), r.id);

  for (const er of ctx.input.extraction.relations) {
    const fromId = ctx.conceptId(er.fromRef);
    const toId = ctx.conceptId(er.toRef);
    if (!fromId || !toId) {
      const missing = [!fromId ? er.fromRef : null, !toId ? er.toRef : null].filter((x): x is string => x !== null);
      ctx.warn(`Relation "${er.tempId}" (${er.type}) skipped: unresolved ref(s) ${missing.join(", ")}`);
      ctx.flagAmbiguity(`Unresolved reference in relation (${er.type}): ${missing.join(", ")}`, missing, er.sourceSegmentIds);
      continue;
    }
    const dup = active.get(relationKey({ fromId, toId, type: er.type }));
    if (dup) {
      ctx.relationRefs.set(er.tempId, dup);
      continue;
    }
    const relation: Relation = {
      id: ctx.id("rel"),
      sessionId: ctx.sessionId,
      fromId,
      toId,
      type: er.type,
      label: er.label,
      status: "active",
      provenance: er.provenance,
      sourceSegmentIds: er.sourceSegmentIds,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.insertRelation(relation);
    ctx.relationRefs.set(er.tempId, relation.id);
    active.set(relationKey(relation), relation.id);
  }
}

function applyThoughts(ctx: Ctx) {
  for (const et of ctx.input.extraction.thoughts) {
    let revises: string | null = null;
    if (et.revisesThoughtId) {
      revises = ctx.thoughtId(et.revisesThoughtId) ?? null;
      if (!revises) ctx.warn(`Thought "${et.tempId}" revises unknown thought "${et.revisesThoughtId}"; link dropped`);
    }
    const thought: Thought = {
      id: ctx.id("tho"),
      sessionId: ctx.sessionId,
      type: et.type,
      text: et.text.trim(),
      status: "active",
      provenance: et.provenance,
      confidence: et.confidence,
      sourceSegmentIds: et.sourceSegmentIds,
      revisesThoughtId: revises,
      conceptIds: ctx.resolveMany(et.conceptRefs, (r) => ctx.conceptId(r), "concept"),
      metadata: {},
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.insertThought(thought);
    ctx.thoughtRefs.set(et.tempId, thought.id);
    if (revises) ctx.updateThought(revises, { status: "revised" });
  }
}

/** Corrections retract items; the model containing them gets a correction version (D-10). */
function applyCorrections(ctx: Ctx) {
  const explicitCorrectionModels = new Set(
    ctx.input.extraction.changes.filter((c) => c.kind === "correction" && c.modelId).map((c) => c.modelId as string),
  );
  for (const cor of ctx.input.extraction.corrections) {
    const thoughtIds = ctx.resolveMany(cor.retractThoughtIds, (r) => ctx.thoughtId(r), "thought");
    const relationIds = ctx.resolveMany(cor.retractRelationIds, (r) => ctx.relationId(r), "relation");
    const conceptIds = ctx.resolveMany(cor.retractConceptIds, (r) => ctx.conceptId(r), "concept");
    for (const id of thoughtIds) ctx.updateThought(id, { status: "retracted" });
    for (const id of relationIds) ctx.updateRelation(id, { status: "retracted" });
    for (const id of conceptIds) ctx.updateConcept(id, { status: "retracted" });

    const affectedModels = uniq([...relationIds, ...conceptIds].flatMap((id) => ctx.modelsContaining(id)));
    const description = cor.description.trim() || "Correction";
    if (affectedModels.length === 0) {
      ctx.insertChange({
        id: ctx.id("chg"),
        sessionId: ctx.sessionId,
        modelId: null,
        kind: "correction",
        description,
        beforeVersion: null,
        afterVersion: null,
        sourceSegmentIds: cor.sourceSegmentIds,
        implications: [],
        unresolved: [],
        diff: { addedConceptIds: [], removedConceptIds: conceptIds, addedRelationIds: [], removedRelationIds: relationIds },
        createdAt: ctx.now,
      });
      continue;
    }
    for (const modelId of affectedModels) {
      if (explicitCorrectionModels.has(modelId)) continue; // the explicit change carries this correction
      applyChange(ctx, {
        kind: "correction",
        modelId,
        newModelName: null,
        description,
        removeConceptRefs: conceptIds,
        addConceptRefs: [],
        removeRelationRefs: relationIds,
        addRelationRefs: [],
        renames: [],
        implications: [],
        unresolvedQuestions: [],
        sourceSegmentIds: cor.sourceSegmentIds,
      });
    }
  }
}

function findModelByName(ctx: Ctx, name: string | null): SystemModel | undefined {
  if (!name) return undefined;
  const key = normalizeLabel(name);
  for (const m of ctx.models.values()) if (m.status === "active" && normalizeLabel(m.name) === key) return m;
  return undefined;
}

/** Relations that are active and connect two concepts of the set. */
function relationsWithin(ctx: Ctx, candidateIds: Iterable<string>, conceptSet: Set<string>): string[] {
  const out: string[] = [];
  for (const id of candidateIds) {
    const r = ctx.relations.get(id);
    if (r && r.status === "active" && conceptSet.has(r.fromId) && conceptSet.has(r.toId)) out.push(id);
  }
  return uniq(out);
}

function denormalize(ctx: Ctx, conceptIds: string[], relationIds: string[]): ModelSnapshot {
  return {
    conceptIds,
    relationIds,
    concepts: conceptIds.map((id) => {
      const c = ctx.concepts.get(id)!;
      return { id: c.id, label: c.label, kind: c.kind };
    }),
    relations: relationIds.map((id) => {
      const r = ctx.relations.get(id)!;
      return { id: r.id, fromId: r.fromId, toId: r.toId, type: r.type, label: r.label };
    }),
  };
}

/** The versioned change engine: one change → one new immutable version + one ChangeEvent. */
function applyChange(ctx: Ctx, ch: ExtractedChange) {
  let model = ch.modelId ? ctx.models.get(ch.modelId) : undefined;
  if (ch.modelId && !model) ctx.warn(`Change "${ch.kind}" referenced unknown model "${ch.modelId}"`);
  if (!model) model = findModelByName(ctx, ch.newModelName);
  const creating = !model;
  if (creating && !ch.newModelName && ch.kind !== "create") {
    ctx.warn(`Change "${ch.kind}" has neither a known model nor a newModelName; skipped`);
    return;
  }

  const prev = model ? ctx.latestVersion.get(model.id)?.snapshot : undefined;
  const prevConcepts = prev?.conceptIds ?? [];
  const prevRelations = prev?.relationIds ?? [];

  // renames first so the denormalized snapshot carries the new labels
  let renamed = false;
  for (const rn of ch.renames) {
    const id = ctx.conceptId(rn.conceptRef);
    const label = rn.newLabel.trim();
    if (!id || !label) {
      ctx.warn(`Rename of unknown concept ref "${rn.conceptRef}" dropped`);
      continue;
    }
    if (ctx.concepts.get(id)?.label !== label) {
      ctx.updateConcept(id, { label });
      renamed = true;
    }
  }

  const removeC = new Set(ctx.resolveMany(ch.removeConceptRefs, (r) => ctx.conceptId(r), "concept"));
  const addC = ctx.resolveMany(ch.addConceptRefs, (r) => ctx.conceptId(r), "concept");
  const removeR = new Set(ctx.resolveMany(ch.removeRelationRefs, (r) => ctx.relationId(r), "relation"));
  const addR = ctx.resolveMany(ch.addRelationRefs, (r) => ctx.relationId(r), "relation");

  const conceptSet = new Set<string>();
  for (const id of [...prevConcepts, ...addC]) {
    if (removeC.has(id)) continue;
    if (ctx.concepts.get(id)?.status === "active") conceptSet.add(id);
  }
  // relations added explicitly must connect concepts of the model; unresolved endpoints are not invented
  for (const id of addR) {
    const r = ctx.relations.get(id);
    if (r && (!conceptSet.has(r.fromId) || !conceptSet.has(r.toId))) {
      ctx.warn(`Relation "${id}" added to model "${ch.newModelName ?? ch.modelId}" connects concepts outside it; dropped`);
    }
  }
  const relationIds = relationsWithin(
    ctx,
    [...prevRelations, ...addR, ...ctx.batchRelationIds].filter((id) => !removeR.has(id)),
    conceptSet,
  );
  const conceptIds = [...conceptSet];

  const diff = {
    addedConceptIds: conceptIds.filter((id) => !prevConcepts.includes(id)),
    removedConceptIds: prevConcepts.filter((id) => !conceptSet.has(id)),
    addedRelationIds: relationIds.filter((id) => !prevRelations.includes(id)),
    removedRelationIds: prevRelations.filter((id) => !relationIds.includes(id)),
  };
  const empty = Object.values(diff).every((xs) => xs.length === 0);
  if (!creating && empty && !renamed) {
    ctx.warn(`Change "${ch.kind}" on model "${model!.name}" produced no difference; no version created`);
    return;
  }

  if (!model) {
    model = {
      id: ctx.id("mod"),
      sessionId: ctx.sessionId,
      name: (ch.newModelName ?? "System model").trim(),
      description: ch.description.trim() || null,
      currentVersion: 1,
      status: "active",
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.insertModel(model);
  }
  const beforeVersion = creating ? null : model.currentVersion;
  const afterVersion = creating ? 1 : model.currentVersion + 1;
  const changeId = ctx.id("chg");

  ctx.insertVersion({
    id: ctx.id("ver"),
    modelId: model.id,
    sessionId: ctx.sessionId,
    version: afterVersion,
    snapshot: denormalize(ctx, conceptIds, relationIds),
    changeEventId: changeId,
    createdAt: ctx.now,
  });
  if (!creating) ctx.updateModel(model.id, { currentVersion: afterVersion });
  ctx.touchedModels.add(model.id);

  // items removed from this model and from no other model stay in history as "revised" (never retracted)
  for (const id of diff.removedConceptIds) {
    if (ctx.concepts.get(id)?.status === "active" && ctx.modelsContaining(id).length === 0) ctx.updateConcept(id, { status: "revised" });
  }
  for (const id of diff.removedRelationIds) {
    if (ctx.relations.get(id)?.status === "active" && ctx.modelsContaining(id).length === 0) ctx.updateRelation(id, { status: "revised" });
  }

  const unresolved = ch.unresolvedQuestions.map((q) => q.trim()).filter(Boolean);
  ctx.insertChange({
    id: changeId,
    sessionId: ctx.sessionId,
    modelId: model.id,
    kind: creating ? "create" : ch.kind,
    description: ch.description.trim() || `${ch.kind} on ${model.name}`,
    beforeVersion,
    afterVersion,
    sourceSegmentIds: ch.sourceSegmentIds,
    implications: ch.implications.map((x) => x.trim()).filter(Boolean),
    unresolved,
    diff,
    createdAt: ctx.now,
  });

  // every unresolved question becomes an open (inferred) question thought
  const existingQuestions = new Set(
    [...ctx.thoughts.values()].filter((t) => t.type === "question" && t.status === "active").map((t) => normalizeLabel(t.text)),
  );
  for (const q of unresolved) {
    if (existingQuestions.has(normalizeLabel(q))) continue;
    ctx.insertThought({
      id: ctx.id("tho"),
      sessionId: ctx.sessionId,
      type: "question",
      text: q,
      status: "active",
      provenance: "inferred",
      confidence: 0.6,
      sourceSegmentIds: ch.sourceSegmentIds,
      revisesThoughtId: null,
      conceptIds: diff.addedConceptIds,
      metadata: { changeEventId: changeId },
      createdAt: ctx.now,
      updatedAt: ctx.now,
    });
    existingQuestions.add(normalizeLabel(q));
  }
}

function applyChanges(ctx: Ctx) {
  for (const ch of ctx.input.extraction.changes) applyChange(ctx, ch);
}

/**
 * Conservative rewire: a relation added in this batch between two concepts that already
 * live in a model (untouched by an explicit change) joins that model's next version.
 */
function applyImplicitRewires(ctx: Ctx) {
  if (ctx.batchRelationIds.length === 0) return;
  for (const model of [...ctx.models.values()]) {
    if (model.status !== "active" || ctx.touchedModels.has(model.id)) continue;
    const v = ctx.latestVersion.get(model.id);
    if (!v) continue;
    const conceptSet = new Set(v.snapshot.conceptIds);
    const fresh = relationsWithin(ctx, ctx.batchRelationIds, conceptSet).filter((id) => !v.snapshot.relationIds.includes(id));
    if (fresh.length === 0) continue;
    applyChange(ctx, {
      kind: "rewire",
      modelId: model.id,
      newModelName: null,
      description: `Added ${fresh.length} relation(s) between existing concepts of ${model.name}`,
      removeConceptRefs: [],
      addConceptRefs: [],
      removeRelationRefs: [],
      addRelationRefs: fresh,
      renames: [],
      implications: [],
      unresolvedQuestions: [],
      sourceSegmentIds: uniq(fresh.flatMap((id) => ctx.relations.get(id)?.sourceSegmentIds ?? [])),
    });
  }
}

const IMAGE_KINDS = new Set(["photo", "illustration", "metaphor"]);

function applyScenes(ctx: Ctx) {
  for (const sd of ctx.input.extraction.sceneDirectives) {
    let parent: Scene | undefined;
    if (sd.op === "update") {
      parent = sd.sceneId ? ctx.scenes.get(sd.sceneId) : undefined;
      if (!parent) ctx.warn(`Scene update referenced unknown scene "${sd.sceneId}"; created a new scene instead`);
    }
    let kind: SceneDirective["kind"] = sd.kind;
    let imagePrompt = sd.imagePrompt.trim();
    if (IMAGE_KINDS.has(kind) && !imagePrompt) {
      ctx.warn(`Scene "${sd.title}" of kind ${kind} has no imagePrompt; rendered as structured instead`);
      kind = "structured";
    }
    if (!IMAGE_KINDS.has(kind)) imagePrompt = "";
    const conceptIds = uniq([...(parent?.conceptIds ?? []), ...ctx.resolveMany(sd.conceptRefs, (r) => ctx.conceptId(r), "concept")]);
    const scene: Scene = {
      id: ctx.id("scn"),
      sessionId: ctx.sessionId,
      title: sd.title.trim() || parent?.title || "Scene",
      description: sd.description.trim(),
      kind,
      prompt: imagePrompt || sd.description.trim(),
      status: IMAGE_KINDS.has(kind) ? "planned" : "ready",
      assetId: null,
      parentSceneId: parent?.id ?? null,
      conceptIds,
      sourceSegmentIds: sd.sourceSegmentIds,
      provider: null,
      error: null,
      metadata: { reason: sd.reason, op: parent ? "update" : "new" },
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.insertScene(scene);
    if (parent) ctx.updateScene(parent.id, { status: "superseded" });
  }
}

function applyActions(ctx: Ctx) {
  const openByText = new Map<string, string>();
  for (const a of ctx.actions.values()) if (a.status === "open") openByText.set(normalizeLabel(a.text), a.id);

  const created: { action: ActionItem; dependsOnRefs: string[] }[] = [];
  for (const ea of ctx.input.extraction.actions) {
    const text = ea.text.trim();
    const key = normalizeLabel(text);
    if (!key) continue;
    const dup = openByText.get(key);
    if (dup) {
      ctx.actionRefs.set(ea.tempId, dup);
      ctx.warn(`Action "${text}" already open; not duplicated`);
      continue;
    }
    const action: ActionItem = {
      id: ctx.id("act"),
      sessionId: ctx.sessionId,
      text,
      status: "open",
      priority: ea.priority,
      dueDate: ea.dueDate?.trim() || null,
      dependsOn: [],
      provenance: ea.provenance,
      sourceSegmentIds: ea.sourceSegmentIds,
      thoughtId: null,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    };
    ctx.actionRefs.set(ea.tempId, action.id);
    openByText.set(key, action.id);
    created.push({ action, dependsOnRefs: ea.dependsOnRefs });
  }
  // second pass: dependencies may point forward within the batch
  for (const { action, dependsOnRefs } of created) {
    action.dependsOn = ctx.resolveMany(dependsOnRefs, (r) => ctx.actionId(r), "action").filter((id) => id !== action.id);
    ctx.insertAction(action);
  }
}

function applyAmbiguities(ctx: Ctx) {
  for (const a of ctx.input.extraction.ambiguities) ctx.flagAmbiguity(a.text, a.candidates, a.sourceSegmentIds);
}

/** Applies an Extraction to a snapshot. See module doc for the rules. */
export function applyExtraction(input: ApplyInput): ApplyResult {
  const ctx = new Ctx(input);
  applySegments(ctx);
  applyConcepts(ctx);
  applyRelations(ctx);
  applyThoughts(ctx);
  applyCorrections(ctx);
  applyChanges(ctx);
  applyImplicitRewires(ctx);
  applyScenes(ctx);
  applyActions(ctx);
  applyAmbiguities(ctx);
  return ctx.finish();
}

