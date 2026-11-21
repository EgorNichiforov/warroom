/**
 * Session events: every mutation the server makes is emitted as one of these,
 * persisted in `events` (per-session monotonically increasing seq) and streamed
 * to the client as NDJSON. The client store applies them; reopening a session
 * replays them (or loads the materialized snapshot).
 */
import { z } from "zod";
import {
  ActionItem,
  Asset,
  ChangeEvent,
  Concept,
  ModelVersion,
  Relation,
  Scene,
  Session,
  SessionSummary,
  SystemModel,
  Thought,
  TranscriptSegment,
} from "./domain";

const base = { seq: z.number().int(), sessionId: z.string(), atMs: z.number().int(), createdAt: z.string() };

export const SessionEvent = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("session.updated"), payload: Session }),
  z.object({ ...base, type: z.literal("segment.added"), payload: TranscriptSegment }),
  z.object({ ...base, type: z.literal("segment.updated"), payload: TranscriptSegment }),
  z.object({ ...base, type: z.literal("ingest.started"), payload: z.object({ segmentIds: z.array(z.string()), provider: z.string(), simulated: z.boolean() }) }),
  z.object({ ...base, type: z.literal("ingest.finished"), payload: z.object({ segmentIds: z.array(z.string()), focus: z.string(), durationMs: z.number(), usage: z.object({ inputTokens: z.number(), outputTokens: z.number(), costUsd: z.number() }).nullable() }) }),
  z.object({ ...base, type: z.literal("thought.added"), payload: Thought }),
  z.object({ ...base, type: z.literal("thought.updated"), payload: Thought }),
  z.object({ ...base, type: z.literal("concept.added"), payload: Concept }),
  z.object({ ...base, type: z.literal("concept.updated"), payload: Concept }),
  z.object({ ...base, type: z.literal("relation.added"), payload: Relation }),
  z.object({ ...base, type: z.literal("relation.updated"), payload: Relation }),
  z.object({ ...base, type: z.literal("model.added"), payload: SystemModel }),
  z.object({ ...base, type: z.literal("model.updated"), payload: SystemModel }),
  z.object({ ...base, type: z.literal("version.added"), payload: ModelVersion }),
  z.object({ ...base, type: z.literal("change.recorded"), payload: ChangeEvent }),
  z.object({ ...base, type: z.literal("scene.added"), payload: Scene }),
  z.object({ ...base, type: z.literal("scene.updated"), payload: Scene }),
  z.object({ ...base, type: z.literal("asset.added"), payload: Asset }),
  z.object({ ...base, type: z.literal("action.added"), payload: ActionItem }),
  z.object({ ...base, type: z.literal("action.updated"), payload: ActionItem }),
  z.object({ ...base, type: z.literal("ambiguity.flagged"), payload: z.object({ text: z.string(), candidates: z.array(z.string()), sourceSegmentIds: z.array(z.string()) }) }),
  z.object({ ...base, type: z.literal("summary.ready"), payload: SessionSummary }),
  z.object({ ...base, type: z.literal("engine.error"), payload: z.object({ stage: z.enum(["extract", "apply", "render", "summary"]), message: z.string(), retryable: z.boolean(), segmentIds: z.array(z.string()).optional(), sceneId: z.string().optional() }) }),
]);
export type SessionEvent = z.infer<typeof SessionEvent>;
export type SessionEventType = SessionEvent["type"];

/** Event before persistence assigns seq/createdAt. */
export type NewSessionEvent = {
  [K in SessionEvent as K["type"]]: Omit<K, "seq" | "createdAt">;
}[SessionEventType];
