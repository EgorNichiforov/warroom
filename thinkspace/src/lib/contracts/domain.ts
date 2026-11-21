/**
 * THINKSPACE domain contracts.
 * Shared by server (DB, engine) and client (store, UI). Zod schemas are the source of truth.
 */
import { z } from "zod";

export const Language = z.enum(["ro", "en", "mixed", "unknown"]);
export type Language = z.infer<typeof Language>;

export const SessionStatus = z.enum(["active", "paused", "ended"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const ThoughtType = z.enum([
  "idea",
  "concept",
  "question",
  "hypothesis",
  "observation",
  "insight",
  "decision",
  "conclusion",
  "contradiction",
  "alternative",
  "assumption",
  "system_component",
  "proposed_modification",
  "action_item",
]);
export type ThoughtType = z.infer<typeof ThoughtType>;

/** stated = the user said it explicitly; inferred = the engine derived it. */
export const Provenance = z.enum(["stated", "inferred"]);
export type Provenance = z.infer<typeof Provenance>;

export const ItemStatus = z.enum(["active", "revised", "retracted"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const ConceptKind = z.enum([
  "concept",
  "component",
  "actor",
  "process",
  "resource",
  "place",
  "object",
  "goal",
  "problem",
  "metric",
  "other",
]);
export type ConceptKind = z.infer<typeof ConceptKind>;

export const RelationType = z.enum([
  "contains",
  "part_of",
  "depends_on",
  "reports_to",
  "advises",
  "controls",
  "connects_to",
  "feeds",
  "alternative_to",
  "contradicts",
  "causes",
  "precedes",
  "related_to",
]);
export type RelationType = z.infer<typeof RelationType>;

export const ChangeKind = z.enum([
  "create",
  "add",
  "remove",
  "replace",
  "rewire",
  "rename",
  "merge",
  "split",
  "correction",
]);
export type ChangeKind = z.infer<typeof ChangeKind>;

export const SceneKind = z.enum(["photo", "illustration", "diagram", "metaphor", "structured"]);
export type SceneKind = z.infer<typeof SceneKind>;

export const SceneStatus = z.enum(["planned", "generating", "ready", "failed", "superseded"]);
export type SceneStatus = z.infer<typeof SceneStatus>;

export const ActionStatus = z.enum(["open", "done", "dropped"]);
export type ActionStatus = z.infer<typeof ActionStatus>;

export const Priority = z.enum(["high", "medium", "low"]);
export type Priority = z.infer<typeof Priority>;

// ---------- Entities ----------

export const Session = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  status: SessionStatus,
  languageHint: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().int().nonnegative(),
  summary: z.unknown().nullable(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Session = z.infer<typeof Session>;

export const TranscriptSegment = z.object({
  id: z.string(),
  sessionId: z.string(),
  seq: z.number().int(),
  /** milliseconds since session start */
  startedMs: z.number().int().nonnegative(),
  endedMs: z.number().int().nonnegative(),
  rawText: z.string(),
  cleanedText: z.string().nullable(),
  translation: z.string().nullable(),
  language: Language,
  isFinal: z.boolean(),
  editedByUser: z.boolean(),
  provider: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  ingestedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegment>;

export const Thought = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: ThoughtType,
  text: z.string(),
  status: ItemStatus,
  provenance: Provenance,
  confidence: z.number().min(0).max(1),
  sourceSegmentIds: z.array(z.string()),
  /** the thought this one revises / supersedes */
  revisesThoughtId: z.string().nullable(),
  conceptIds: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Thought = z.infer<typeof Thought>;

export const Concept = z.object({
  id: z.string(),
  sessionId: z.string(),
  label: z.string(),
  kind: ConceptKind,
  description: z.string().nullable(),
  status: ItemStatus,
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Concept = z.infer<typeof Concept>;

export const Relation = z.object({
  id: z.string(),
  sessionId: z.string(),
  fromId: z.string(),
  toId: z.string(),
  type: RelationType,
  label: z.string().nullable(),
  status: ItemStatus,
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Relation = z.infer<typeof Relation>;

export const ModelSnapshot = z.object({
  conceptIds: z.array(z.string()),
  relationIds: z.array(z.string()),
  /** denormalized copy so a version stays readable even if items later change */
  concepts: z.array(z.object({ id: z.string(), label: z.string(), kind: ConceptKind })),
  relations: z.array(
    z.object({ id: z.string(), fromId: z.string(), toId: z.string(), type: RelationType, label: z.string().nullable() }),
  ),
});
export type ModelSnapshot = z.infer<typeof ModelSnapshot>;

export const SystemModel = z.object({
  id: z.string(),
  sessionId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentVersion: z.number().int(),
  status: ItemStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SystemModel = z.infer<typeof SystemModel>;

export const ModelVersion = z.object({
  id: z.string(),
  modelId: z.string(),
  sessionId: z.string(),
  version: z.number().int(),
  snapshot: ModelSnapshot,
  changeEventId: z.string().nullable(),
  createdAt: z.string(),
});
export type ModelVersion = z.infer<typeof ModelVersion>;

export const ChangeEvent = z.object({
  id: z.string(),
  sessionId: z.string(),
  modelId: z.string().nullable(),
  kind: ChangeKind,
  description: z.string(),
  beforeVersion: z.number().int().nullable(),
  afterVersion: z.number().int().nullable(),
  sourceSegmentIds: z.array(z.string()),
  implications: z.array(z.string()),
  unresolved: z.array(z.string()),
  /** ids of items touched, for before/after highlighting */
  diff: z.object({
    addedConceptIds: z.array(z.string()),
    removedConceptIds: z.array(z.string()),
    addedRelationIds: z.array(z.string()),
    removedRelationIds: z.array(z.string()),
  }),
  createdAt: z.string(),
});
export type ChangeEvent = z.infer<typeof ChangeEvent>;

export const Scene = z.object({
  id: z.string(),
  sessionId: z.string(),
  title: z.string(),
  description: z.string(),
  kind: SceneKind,
  prompt: z.string(),
  status: SceneStatus,
  assetId: z.string().nullable(),
  /** earlier version of this scene (iterative edit chain) */
  parentSceneId: z.string().nullable(),
  conceptIds: z.array(z.string()),
  sourceSegmentIds: z.array(z.string()),
  provider: z.string().nullable(),
  error: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Scene = z.infer<typeof Scene>;

export const Asset = z.object({
  id: z.string(),
  sessionId: z.string(),
  kind: z.enum(["image", "svg"]),
  mime: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  /** served at /api/assets/:id */
  url: z.string(),
  provider: z.string(),
  simulated: z.boolean(),
  createdAt: z.string(),
});
export type Asset = z.infer<typeof Asset>;

export const ActionItem = z.object({
  id: z.string(),
  sessionId: z.string(),
  text: z.string(),
  status: ActionStatus,
  priority: Priority.nullable(),
  dueDate: z.string().nullable(),
  dependsOn: z.array(z.string()),
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
  thoughtId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ActionItem = z.infer<typeof ActionItem>;

export const SessionSummary = z.object({
  headline: z.string(),
  whatIThoughtAbout: z.array(z.string()),
  conclusions: z.array(z.string()),
  decisions: z.array(z.object({ text: z.string(), sourceSegmentIds: z.array(z.string()) })),
  actionItems: z.array(z.object({ id: z.string(), text: z.string(), priority: Priority.nullable() })),
  nextSteps: z.array(z.string()),
  openQuestions: z.array(z.string()),
  ideasToExplore: z.array(z.string()),
  dependencies: z.array(z.string()),
  priorities: z.array(z.string()),
  systemsToChange: z.array(z.string()),
  /** suggestions the engine inferred, kept apart from confirmed conclusions */
  suggestions: z.array(z.string()),
  generatedAt: z.string(),
  simulated: z.boolean(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

/** Full materialized state of one session (what the client store holds). */
export const SessionSnapshot = z.object({
  session: Session,
  segments: z.array(TranscriptSegment),
  thoughts: z.array(Thought),
  concepts: z.array(Concept),
  relations: z.array(Relation),
  models: z.array(SystemModel),
  versions: z.array(ModelVersion),
  changes: z.array(ChangeEvent),
  scenes: z.array(Scene),
  assets: z.array(Asset),
  actions: z.array(ActionItem),
  lastEventSeq: z.number().int(),
});
export type SessionSnapshot = z.infer<typeof SessionSnapshot>;
