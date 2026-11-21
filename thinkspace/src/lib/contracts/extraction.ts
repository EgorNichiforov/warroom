/**
 * Extraction contract: what the intelligence engine must return for a batch of new
 * transcript segments. This is the LLM structured-output schema. Every item carries
 * sourceSegmentIds so it can be traced back to speech.
 *
 * Ids: existing entities are referenced by their real id. New entities get a tempId
 * (e.g. "c1", "t2"); the apply step maps tempIds to real ids.
 */
import { z } from "zod";
import {
  ChangeKind,
  ConceptKind,
  Language,
  Priority,
  Provenance,
  RelationType,
  SceneKind,
  ThoughtType,
} from "./domain";

export const SegmentAnnotation = z.object({
  segmentId: z.string(),
  language: Language,
  /** punctuation/casing fixes only; never a translation; never changes meaning */
  cleanedText: z.string(),
  /** optional English translation when the segment is not English; original is kept */
  translation: z.string().nullable(),
});

export const ExtractedThought = z.object({
  tempId: z.string(),
  type: ThoughtType,
  text: z.string(),
  provenance: Provenance,
  confidence: z.number().min(0).max(1),
  sourceSegmentIds: z.array(z.string()),
  /** existing thought id this revises (correction / refinement) */
  revisesThoughtId: z.string().nullable(),
  /** concept refs: existing ids or tempIds */
  conceptRefs: z.array(z.string()),
});

export const ExtractedConcept = z.object({
  tempId: z.string(),
  label: z.string(),
  kind: ConceptKind,
  description: z.string().nullable(),
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
  /** set when this is the same thing as an existing concept (use existing id, do not create) */
  existingId: z.string().nullable(),
});

export const ExtractedRelation = z.object({
  tempId: z.string(),
  fromRef: z.string(),
  toRef: z.string(),
  type: RelationType,
  label: z.string().nullable(),
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
});

export const ExtractedChange = z.object({
  kind: ChangeKind,
  /** existing model id, or null to create a model named newModelName */
  modelId: z.string().nullable(),
  newModelName: z.string().nullable(),
  description: z.string(),
  removeConceptRefs: z.array(z.string()),
  addConceptRefs: z.array(z.string()),
  removeRelationRefs: z.array(z.string()),
  addRelationRefs: z.array(z.string()),
  renames: z.array(z.object({ conceptRef: z.string(), newLabel: z.string() })),
  implications: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  sourceSegmentIds: z.array(z.string()),
});

export const ExtractedCorrection = z.object({
  /** what the user corrected, in their words */
  description: z.string(),
  retractThoughtIds: z.array(z.string()),
  retractRelationIds: z.array(z.string()),
  retractConceptIds: z.array(z.string()),
  sourceSegmentIds: z.array(z.string()),
});

export const ExtractedAction = z.object({
  tempId: z.string(),
  text: z.string(),
  priority: Priority.nullable(),
  /** ISO date only when the user said one */
  dueDate: z.string().nullable(),
  dependsOnRefs: z.array(z.string()),
  provenance: Provenance,
  sourceSegmentIds: z.array(z.string()),
});

export const SceneDirective = z.object({
  op: z.enum(["new", "update"]),
  /** required when op = update */
  sceneId: z.string().nullable(),
  title: z.string(),
  kind: SceneKind,
  /** what to show; for diagrams this describes the structure, for images the picture */
  description: z.string(),
  /** full image-generation prompt (English), empty for structured/diagram kinds */
  imagePrompt: z.string(),
  conceptRefs: z.array(z.string()),
  reason: z.string(),
  sourceSegmentIds: z.array(z.string()),
});

export const Ambiguity = z.object({
  text: z.string(),
  candidates: z.array(z.string()),
  sourceSegmentIds: z.array(z.string()),
});

export const Extraction = z.object({
  segmentAnnotations: z.array(SegmentAnnotation),
  thoughts: z.array(ExtractedThought),
  concepts: z.array(ExtractedConcept),
  relations: z.array(ExtractedRelation),
  changes: z.array(ExtractedChange),
  corrections: z.array(ExtractedCorrection),
  actions: z.array(ExtractedAction),
  sceneDirectives: z.array(SceneDirective),
  ambiguities: z.array(Ambiguity),
  /** 1–2 sentences: what the user is currently exploring (used as running context) */
  focus: z.string(),
});
export type Extraction = z.infer<typeof Extraction>;
export type SegmentAnnotation = z.infer<typeof SegmentAnnotation>;
export type ExtractedThought = z.infer<typeof ExtractedThought>;
export type ExtractedConcept = z.infer<typeof ExtractedConcept>;
export type ExtractedRelation = z.infer<typeof ExtractedRelation>;
export type ExtractedChange = z.infer<typeof ExtractedChange>;
export type ExtractedCorrection = z.infer<typeof ExtractedCorrection>;
export type ExtractedAction = z.infer<typeof ExtractedAction>;
export type SceneDirective = z.infer<typeof SceneDirective>;
export type Ambiguity = z.infer<typeof Ambiguity>;

export const emptyExtraction = (): Extraction => ({
  segmentAnnotations: [],
  thoughts: [],
  concepts: [],
  relations: [],
  changes: [],
  corrections: [],
  actions: [],
  sceneDirectives: [],
  ambiguities: [],
  focus: "",
});

/** Compact session context handed to the LLM (never the full transcript). */
export const ContextDigest = z.object({
  sessionTitle: z.string(),
  focus: z.string(),
  concepts: z.array(z.object({ id: z.string(), label: z.string(), kind: ConceptKind })),
  relations: z.array(
    z.object({ id: z.string(), fromId: z.string(), toId: z.string(), type: RelationType, label: z.string().nullable() }),
  ),
  models: z.array(
    z.object({ id: z.string(), name: z.string(), version: z.number().int(), conceptIds: z.array(z.string()) }),
  ),
  recentThoughts: z.array(z.object({ id: z.string(), type: ThoughtType, text: z.string() })),
  openQuestions: z.array(z.object({ id: z.string(), text: z.string() })),
  scenes: z.array(z.object({ id: z.string(), title: z.string(), kind: SceneKind, conceptIds: z.array(z.string()) })),
  recentSegments: z.array(z.object({ id: z.string(), text: z.string(), language: Language })),
});
export type ContextDigest = z.infer<typeof ContextDigest>;

export const SegmentInput = z.object({
  id: z.string(),
  text: z.string(),
  startedMs: z.number().int(),
  endedMs: z.number().int(),
});
export type SegmentInput = z.infer<typeof SegmentInput>;
