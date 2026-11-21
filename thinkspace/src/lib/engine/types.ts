/**
 * Contract between the intelligence engine (pure functions) and the persistence layer.
 * applyExtraction() is pure: it receives the current snapshot and an Extraction and returns
 * the rows to insert/update plus the ordered events (without seq). The server persists them
 * in one transaction, assigns seqs and streams the events.
 */
import type {
  ActionItem,
  ChangeEvent,
  Concept,
  Language,
  ModelVersion,
  Relation,
  Scene,
  SessionSnapshot,
  SystemModel,
  Thought,
} from "@/lib/contracts/domain";
import type { Extraction } from "@/lib/contracts/extraction";
import type { NewSessionEvent } from "@/lib/contracts/events";

export type ApplyInput = {
  snapshot: SessionSnapshot;
  extraction: Extraction;
  /** the segments this extraction was produced from */
  segmentIds: string[];
  nowIso: string;
  /** session-relative ms of the last segment in the batch */
  atMs: number;
  newId: (prefix: string) => string;
  /** provider metadata for events */
  provider: { name: string; simulated: boolean };
};

export type SegmentPatch = {
  id: string;
  cleanedText: string | null;
  translation: string | null;
  language: Language;
};

export type ApplyResult = {
  inserts: {
    thoughts: Thought[];
    concepts: Concept[];
    relations: Relation[];
    models: SystemModel[];
    versions: ModelVersion[];
    changes: ChangeEvent[];
    scenes: Scene[];
    actions: ActionItem[];
  };
  updates: {
    thoughts: Thought[];
    concepts: Concept[];
    relations: Relation[];
    models: SystemModel[];
    scenes: Scene[];
    actions: ActionItem[];
    segments: SegmentPatch[];
  };
  /** ordered; the server assigns seq and createdAt */
  events: NewSessionEvent[];
  /** new running focus for the session */
  focus: string;
  /** human-readable notes on things the engine refused to do (unresolved refs etc.) */
  warnings: string[];
};
