/**
 * Repository: all database access for THINKSPACE goes through here.
 * Rows are mapped to the shared contracts (src/lib/contracts) with ISO timestamps.
 * Works unchanged on PGlite (local/tests) and postgres-js (production) because both
 * expose the same Drizzle PgDatabase API; `Executor` is the common supertype of a
 * database handle and a transaction handle.
 */
import "server-only";
import type { SearchResult } from "@/lib/contracts/api";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import type { AnyPgColumn, PgDatabase, PgQueryResultHKT, PgTable } from "drizzle-orm/pg-core";
import { getDb, schema, type Db } from "./client";
import { newId, nowIso } from "@/lib/ids";
import type {
  ActionItem,
  Asset,
  ChangeEvent,
  Concept,
  ModelSnapshot,
  ModelVersion,
  Relation,
  Scene,
  Session,
  SessionSnapshot,
  SystemModel,
  Thought,
  TranscriptSegment,
} from "@/lib/contracts/domain";
import type { NewSessionEvent, SessionEvent } from "@/lib/contracts/events";
import type { ApplyResult } from "@/lib/engine/types";

export type Executor = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Run `fn` inside one transaction. */
export async function withTx<T>(db: Db, fn: (tx: Executor) => Promise<T>): Promise<T> {
  return (db as Executor).transaction((tx) => fn(tx));
}

// ---------- mapping helpers ----------

const iso = (x: string | Date): string => new Date(x).toISOString();
const isoOrNull = (x: string | Date | null | undefined): string | null => (x == null ? null : iso(x));
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);

type SessionRow = typeof schema.sessions.$inferSelect;
type SegmentRow = typeof schema.transcriptSegments.$inferSelect;
type ThoughtRow = typeof schema.thoughts.$inferSelect;
type ConceptRow = typeof schema.concepts.$inferSelect;
type RelationRow = typeof schema.relations.$inferSelect;
type ModelRow = typeof schema.systemModels.$inferSelect;
type VersionRow = typeof schema.modelVersions.$inferSelect;
type ChangeRow = typeof schema.changeEvents.$inferSelect;
type SceneRow = typeof schema.scenes.$inferSelect;
type AssetRow = typeof schema.assets.$inferSelect;
type ActionRow = typeof schema.actionItems.$inferSelect;
type EventRow = typeof schema.events.$inferSelect;

export const mapSession = (r: SessionRow): Session => ({
  id: r.id,
  ownerId: r.ownerId,
  title: r.title,
  status: r.status as Session["status"],
  languageHint: r.languageHint,
  startedAt: iso(r.startedAt),
  endedAt: isoOrNull(r.endedAt),
  durationMs: r.durationMs,
  summary: r.summary ?? null,
  settings: obj(r.settings),
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

export const mapSegment = (r: SegmentRow): TranscriptSegment => ({
  id: r.id,
  sessionId: r.sessionId,
  seq: r.seq,
  startedMs: r.startedMs,
  endedMs: r.endedMs,
  rawText: r.rawText,
  cleanedText: r.cleanedText,
  translation: r.translation,
  language: r.language as TranscriptSegment["language"],
  isFinal: r.isFinal,
  editedByUser: r.editedByUser,
  provider: r.provider,
  confidence: r.confidence,
  ingestedAt: isoOrNull(r.ingestedAt),
  createdAt: iso(r.createdAt),
});

const mapThought = (r: ThoughtRow): Thought => ({
  id: r.id,
  sessionId: r.sessionId,
  type: r.type as Thought["type"],
  text: r.text,
  status: r.status as Thought["status"],
  provenance: r.provenance as Thought["provenance"],
  confidence: r.confidence,
  sourceSegmentIds: r.sourceSegmentIds,
  revisesThoughtId: r.revisesThoughtId,
  conceptIds: r.conceptIds,
  metadata: obj(r.metadata),
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapConcept = (r: ConceptRow): Concept => ({
  id: r.id,
  sessionId: r.sessionId,
  label: r.label,
  kind: r.kind as Concept["kind"],
  description: r.description,
  status: r.status as Concept["status"],
  provenance: r.provenance as Concept["provenance"],
  sourceSegmentIds: r.sourceSegmentIds,
  metadata: obj(r.metadata),
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapRelation = (r: RelationRow): Relation => ({
  id: r.id,
  sessionId: r.sessionId,
  fromId: r.fromId,
  toId: r.toId,
  type: r.type as Relation["type"],
  label: r.label,
  status: r.status as Relation["status"],
  provenance: r.provenance as Relation["provenance"],
  sourceSegmentIds: r.sourceSegmentIds,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapModel = (r: ModelRow): SystemModel => ({
  id: r.id,
  sessionId: r.sessionId,
  name: r.name,
  description: r.description,
  currentVersion: r.currentVersion,
  status: r.status as SystemModel["status"],
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapVersion = (r: VersionRow): ModelVersion => ({
  id: r.id,
  modelId: r.modelId,
  sessionId: r.sessionId,
  version: r.version,
  snapshot: r.snapshot as ModelSnapshot,
  changeEventId: r.changeEventId,
  createdAt: iso(r.createdAt),
});

const mapChange = (r: ChangeRow): ChangeEvent => {
  const d = obj(r.diff);
  return {
    id: r.id,
    sessionId: r.sessionId,
    modelId: r.modelId,
    kind: r.kind as ChangeEvent["kind"],
    description: r.description,
    beforeVersion: r.beforeVersion,
    afterVersion: r.afterVersion,
    sourceSegmentIds: r.sourceSegmentIds,
    implications: strs(r.implications),
    unresolved: strs(r.unresolved),
    diff: {
      addedConceptIds: strs(d.addedConceptIds),
      removedConceptIds: strs(d.removedConceptIds),
      addedRelationIds: strs(d.addedRelationIds),
      removedRelationIds: strs(d.removedRelationIds),
    },
    createdAt: iso(r.createdAt),
  };
};

export const mapScene = (r: SceneRow): Scene => ({
  id: r.id,
  sessionId: r.sessionId,
  title: r.title,
  description: r.description,
  kind: r.kind as Scene["kind"],
  prompt: r.prompt,
  status: r.status as Scene["status"],
  assetId: r.assetId,
  parentSceneId: r.parentSceneId,
  conceptIds: r.conceptIds,
  sourceSegmentIds: r.sourceSegmentIds,
  provider: r.provider,
  error: r.error,
  metadata: obj(r.metadata),
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapAsset = (r: Omit<AssetRow, "data">): Asset => ({
  id: r.id,
  sessionId: r.sessionId,
  kind: r.kind as Asset["kind"],
  mime: r.mime,
  width: r.width,
  height: r.height,
  url: `/api/assets/${r.id}`,
  provider: r.provider,
  simulated: r.simulated,
  createdAt: iso(r.createdAt),
});

const mapAction = (r: ActionRow): ActionItem => ({
  id: r.id,
  sessionId: r.sessionId,
  text: r.text,
  status: r.status as ActionItem["status"],
  priority: r.priority as ActionItem["priority"],
  dueDate: r.dueDate,
  dependsOn: r.dependsOn,
  provenance: r.provenance as ActionItem["provenance"],
  sourceSegmentIds: r.sourceSegmentIds,
  thoughtId: r.thoughtId,
  createdAt: iso(r.createdAt),
  updatedAt: iso(r.updatedAt),
});

const mapEvent = (r: EventRow): SessionEvent =>
  ({
    seq: r.seq,
    sessionId: r.sessionId,
    atMs: r.atMs,
    createdAt: iso(r.createdAt),
    type: r.type,
    payload: r.payload,
  }) as SessionEvent;

const assetColumns = {
  id: schema.assets.id,
  sessionId: schema.assets.sessionId,
  kind: schema.assets.kind,
  mime: schema.assets.mime,
  width: schema.assets.width,
  height: schema.assets.height,
  provider: schema.assets.provider,
  simulated: schema.assets.simulated,
  createdAt: schema.assets.createdAt,
};

// ---------- sessions ----------

export async function createSession(input: {
  ownerId: string;
  title: string;
  languageHint?: string | null;
  settings?: Record<string, unknown>;
}): Promise<Session> {
  const db = await getDb();
  const now = nowIso();
  const [row] = await db
    .insert(schema.sessions)
    .values({
      id: newId("ses"),
      ownerId: input.ownerId,
      title: input.title,
      languageHint: input.languageHint ?? null,
      settings: input.settings ?? {},
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return mapSession(row);
}

export type SessionCounts = { segments: number; thoughts: number; concepts: number; actions: number };
export type SessionWithCounts = Session & { counts: SessionCounts };

/** Sessions of an owner (optionally title-filtered), newest first, each with per-table row counts. */
export async function listSessions(ownerId: string, q?: string): Promise<SessionWithCounts[]> {
  const db = await getDb();
  const where = q?.trim()
    ? and(eq(schema.sessions.ownerId, ownerId), sql`${schema.sessions.title} ilike ${"%" + q.trim() + "%"}`)
    : eq(schema.sessions.ownerId, ownerId);
  const rows = await db.select().from(schema.sessions).where(where).orderBy(desc(schema.sessions.updatedAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const countBy = async (table: PgTable, col: AnyPgColumn) => {
    const out = await db
      .select({ sessionId: col, n: sql<number>`count(*)::int` })
      .from(table)
      .where(inArray(col, ids))
      .groupBy(col);
    return new Map(out.map((r) => [String(r.sessionId), Number(r.n)]));
  };
  const [segments, thoughts, concepts, actions] = await Promise.all([
    countBy(schema.transcriptSegments, schema.transcriptSegments.sessionId),
    countBy(schema.thoughts, schema.thoughts.sessionId),
    countBy(schema.concepts, schema.concepts.sessionId),
    countBy(schema.actionItems, schema.actionItems.sessionId),
  ]);
  return rows.map((r) => ({
    ...mapSession(r),
    counts: {
      segments: segments.get(r.id) ?? 0,
      thoughts: thoughts.get(r.id) ?? 0,
      concepts: concepts.get(r.id) ?? 0,
      actions: actions.get(r.id) ?? 0,
    },
  }));
}

/** Returns null when the session does not exist or belongs to a different owner. */
export async function getSession(id: string, ownerId?: string, ex?: Executor): Promise<Session | null> {
  const db = ex ?? (await getDb());
  const [row] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
  if (!row) return null;
  if (ownerId !== undefined && row.ownerId !== ownerId) return null;
  return mapSession(row);
}

export type SessionPatch = Partial<{
  title: string;
  status: Session["status"];
  durationMs: number;
  languageHint: string | null;
  settings: Record<string, unknown>;
  summary: unknown;
  endedAt: string | null;
  focus: string;
}>;

export async function updateSession(id: string, patch: SessionPatch, ex?: Executor): Promise<Session | null> {
  const db = ex ?? (await getDb());
  const values: Partial<typeof schema.sessions.$inferInsert> = { updatedAt: nowIso() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.durationMs !== undefined) values.durationMs = patch.durationMs;
  if (patch.languageHint !== undefined) values.languageHint = patch.languageHint;
  if (patch.settings !== undefined) values.settings = patch.settings;
  if (patch.summary !== undefined) values.summary = patch.summary;
  if (patch.endedAt !== undefined) values.endedAt = patch.endedAt;
  if (patch.focus !== undefined) values.focus = patch.focus;
  const [row] = await db.update(schema.sessions).set(values).where(eq(schema.sessions.id, id)).returning();
  return row ? mapSession(row) : null;
}

/** Hard delete; child rows cascade through foreign keys. */
export async function deleteSession(id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(schema.sessions).where(eq(schema.sessions.id, id)).returning();
  return rows.length > 0;
}

// ---------- events ----------

/**
 * Persist events for a session, assigning consecutive seqs. The seq counter lives on the
 * session row and is incremented in a single UPDATE, so concurrent writers never collide.
 */
export async function emitEvents(ex: Executor, sessionId: string, events: NewSessionEvent[]): Promise<SessionEvent[]> {
  if (events.length === 0) return [];
  const createdAt = nowIso();
  const [row] = await ex
    .update(schema.sessions)
    .set({ lastEventSeq: sql`${schema.sessions.lastEventSeq} + ${events.length}` })
    .where(eq(schema.sessions.id, sessionId))
    .returning({ lastEventSeq: schema.sessions.lastEventSeq });
  if (!row) throw new Error(`session ${sessionId} not found`);
  const firstSeq = row.lastEventSeq - events.length + 1;
  const out: SessionEvent[] = events.map((e, i) => ({ ...e, seq: firstSeq + i, createdAt }) as SessionEvent);
  await ex.insert(schema.events).values(
    out.map((e) => ({
      id: newId("evt"),
      sessionId,
      seq: e.seq,
      type: e.type,
      atMs: e.atMs,
      payload: e.payload,
      createdAt,
    })),
  );
  return out;
}

export async function listEvents(sessionId: string, sinceSeq = 0): Promise<SessionEvent[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.sessionId, sessionId), gt(schema.events.seq, sinceSeq)))
    .orderBy(asc(schema.events.seq));
  return rows.map(mapEvent);
}

/** Session-relative position (ms) to stamp on events produced outside of ingest. */
export async function currentAtMs(ex: Executor, sessionId: string): Promise<number> {
  const [seg] = await ex
    .select({ endedMs: schema.transcriptSegments.endedMs })
    .from(schema.transcriptSegments)
    .where(eq(schema.transcriptSegments.sessionId, sessionId))
    .orderBy(desc(schema.transcriptSegments.endedMs))
    .limit(1);
  const [ses] = await ex.select({ durationMs: schema.sessions.durationMs }).from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  return Math.max(seg?.endedMs ?? 0, ses?.durationMs ?? 0);
}

// ---------- segments ----------

export type SegmentInputRow = {
  id: string;
  startedMs: number;
  endedMs: number;
  rawText: string;
  language?: TranscriptSegment["language"];
  isFinal: boolean;
  provider: string;
  confidence?: number | null;
};

/**
 * Upsert segments by client id. A partial (non-final) row may be updated until it becomes
 * final; a final row is immutable here (re-POSTing it is a no-op, which makes retries safe).
 */
export async function appendSegments(
  sessionId: string,
  inputs: SegmentInputRow[],
): Promise<{ segments: TranscriptSegment[]; events: SessionEvent[] }> {
  const db = await getDb();
  return withTx(db, async (tx) => {
    const ids = inputs.map((s) => s.id);
    const existing = await tx.select().from(schema.transcriptSegments).where(inArray(schema.transcriptSegments.id, ids));
    const byId = new Map(existing.map((r) => [r.id, r]));
    const [maxRow] = await tx
      .select({ max: sql<number | null>`max(${schema.transcriptSegments.seq})` })
      .from(schema.transcriptSegments)
      .where(eq(schema.transcriptSegments.sessionId, sessionId));
    let nextSeq = (maxRow?.max ?? 0) + 1;
    const now = nowIso();
    const segments: TranscriptSegment[] = [];
    const pending: NewSessionEvent[] = [];
    let atMs = 0;

    for (const s of inputs) {
      const prev = byId.get(s.id);
      if (prev) {
        if (prev.sessionId !== sessionId) throw new RepoError("segment id belongs to another session", 409, "conflict");
        if (prev.isFinal) {
          segments.push(mapSegment(prev));
          continue;
        }
        const [row] = await tx
          .update(schema.transcriptSegments)
          .set({
            startedMs: s.startedMs,
            endedMs: s.endedMs,
            rawText: s.rawText,
            language: s.language ?? prev.language,
            isFinal: s.isFinal,
            provider: s.provider,
            confidence: s.confidence ?? prev.confidence,
          })
          .where(eq(schema.transcriptSegments.id, s.id))
          .returning();
        const seg = mapSegment(row);
        segments.push(seg);
        pending.push({ type: "segment.updated", sessionId, atMs: seg.endedMs, payload: seg });
      } else {
        const [row] = await tx
          .insert(schema.transcriptSegments)
          .values({
            id: s.id,
            sessionId,
            seq: nextSeq++,
            startedMs: s.startedMs,
            endedMs: s.endedMs,
            rawText: s.rawText,
            language: s.language ?? "unknown",
            isFinal: s.isFinal,
            provider: s.provider,
            confidence: s.confidence ?? null,
            createdAt: now,
          })
          .returning();
        const seg = mapSegment(row);
        segments.push(seg);
        pending.push({ type: "segment.added", sessionId, atMs: seg.endedMs, payload: seg });
      }
      atMs = Math.max(atMs, s.endedMs);
    }

    if (pending.length > 0) {
      await tx
        .update(schema.sessions)
        .set({ updatedAt: now, durationMs: sql`greatest(${schema.sessions.durationMs}, ${atMs})` })
        .where(eq(schema.sessions.id, sessionId));
    }
    const events = await emitEvents(tx, sessionId, pending);
    return { segments, events };
  });
}

export async function getSegment(sessionId: string, segmentId: string): Promise<TranscriptSegment | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.transcriptSegments)
    .where(and(eq(schema.transcriptSegments.id, segmentId), eq(schema.transcriptSegments.sessionId, sessionId)));
  return row ? mapSegment(row) : null;
}

/** User edit: marks editedByUser and clears cleanedText unless a new one is provided. */
export async function updateSegment(
  sessionId: string,
  segmentId: string,
  patch: { rawText?: string; cleanedText?: string | null; language?: TranscriptSegment["language"] },
): Promise<{ segment: TranscriptSegment; events: SessionEvent[] } | null> {
  const db = await getDb();
  return withTx(db, async (tx) => {
    const values: Partial<typeof schema.transcriptSegments.$inferInsert> = { editedByUser: true };
    if (patch.rawText !== undefined) values.rawText = patch.rawText;
    values.cleanedText = patch.cleanedText !== undefined ? patch.cleanedText : null;
    if (patch.language !== undefined) values.language = patch.language;
    const [row] = await tx
      .update(schema.transcriptSegments)
      .set(values)
      .where(and(eq(schema.transcriptSegments.id, segmentId), eq(schema.transcriptSegments.sessionId, sessionId)))
      .returning();
    if (!row) return null;
    const segment = mapSegment(row);
    await tx.update(schema.sessions).set({ updatedAt: nowIso() }).where(eq(schema.sessions.id, sessionId));
    const events = await emitEvents(tx, sessionId, [{ type: "segment.updated", sessionId, atMs: segment.endedMs, payload: segment }]);
    return { segment, events };
  });
}

// ---------- snapshot ----------

export async function getSnapshot(sessionId: string, ex?: Executor): Promise<SessionSnapshot | null> {
  const db = ex ?? (await getDb());
  const [ses] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  if (!ses) return null;
  const by = eq;
  const [segments, thoughts, concepts, relations, models, versions, changes, scenes, assets, actions] = await Promise.all([
    db.select().from(schema.transcriptSegments).where(by(schema.transcriptSegments.sessionId, sessionId)).orderBy(asc(schema.transcriptSegments.seq)),
    db.select().from(schema.thoughts).where(by(schema.thoughts.sessionId, sessionId)).orderBy(asc(schema.thoughts.createdAt), asc(schema.thoughts.id)),
    db.select().from(schema.concepts).where(by(schema.concepts.sessionId, sessionId)).orderBy(asc(schema.concepts.createdAt), asc(schema.concepts.id)),
    db.select().from(schema.relations).where(by(schema.relations.sessionId, sessionId)).orderBy(asc(schema.relations.createdAt), asc(schema.relations.id)),
    db.select().from(schema.systemModels).where(by(schema.systemModels.sessionId, sessionId)).orderBy(asc(schema.systemModels.createdAt)),
    db.select().from(schema.modelVersions).where(by(schema.modelVersions.sessionId, sessionId)).orderBy(asc(schema.modelVersions.createdAt), asc(schema.modelVersions.version)),
    db.select().from(schema.changeEvents).where(by(schema.changeEvents.sessionId, sessionId)).orderBy(asc(schema.changeEvents.createdAt), asc(schema.changeEvents.id)),
    db.select().from(schema.scenes).where(by(schema.scenes.sessionId, sessionId)).orderBy(asc(schema.scenes.createdAt), asc(schema.scenes.id)),
    db.select(assetColumns).from(schema.assets).where(by(schema.assets.sessionId, sessionId)).orderBy(asc(schema.assets.createdAt)),
    db.select().from(schema.actionItems).where(by(schema.actionItems.sessionId, sessionId)).orderBy(asc(schema.actionItems.createdAt), asc(schema.actionItems.id)),
  ]);
  return {
    session: mapSession(ses),
    segments: segments.map(mapSegment),
    thoughts: thoughts.map(mapThought),
    concepts: concepts.map(mapConcept),
    relations: relations.map(mapRelation),
    models: models.map(mapModel),
    versions: versions.map(mapVersion),
    changes: changes.map(mapChange),
    scenes: scenes.map(mapScene),
    assets: assets.map(mapAsset),
    actions: actions.map(mapAction),
    lastEventSeq: ses.lastEventSeq,
  };
}

// ---------- apply result persistence ----------

function thoughtValues(t: Thought): typeof schema.thoughts.$inferInsert {
  return {
    id: t.id,
    sessionId: t.sessionId,
    type: t.type,
    text: t.text,
    status: t.status,
    provenance: t.provenance,
    confidence: t.confidence,
    sourceSegmentIds: t.sourceSegmentIds,
    revisesThoughtId: t.revisesThoughtId,
    conceptIds: t.conceptIds,
    metadata: t.metadata,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
function conceptValues(c: Concept): typeof schema.concepts.$inferInsert {
  return {
    id: c.id,
    sessionId: c.sessionId,
    label: c.label,
    kind: c.kind,
    description: c.description,
    status: c.status,
    provenance: c.provenance,
    sourceSegmentIds: c.sourceSegmentIds,
    metadata: c.metadata,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
function relationValues(r: Relation): typeof schema.relations.$inferInsert {
  return {
    id: r.id,
    sessionId: r.sessionId,
    fromId: r.fromId,
    toId: r.toId,
    type: r.type,
    label: r.label,
    status: r.status,
    provenance: r.provenance,
    sourceSegmentIds: r.sourceSegmentIds,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
function modelValues(m: SystemModel): typeof schema.systemModels.$inferInsert {
  return {
    id: m.id,
    sessionId: m.sessionId,
    name: m.name,
    description: m.description,
    currentVersion: m.currentVersion,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
function sceneValues(s: Scene): typeof schema.scenes.$inferInsert {
  return {
    id: s.id,
    sessionId: s.sessionId,
    title: s.title,
    description: s.description,
    kind: s.kind,
    prompt: s.prompt,
    status: s.status,
    assetId: s.assetId,
    parentSceneId: s.parentSceneId,
    conceptIds: s.conceptIds,
    sourceSegmentIds: s.sourceSegmentIds,
    provider: s.provider,
    error: s.error,
    metadata: s.metadata,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
function actionValues(a: ActionItem): typeof schema.actionItems.$inferInsert {
  return {
    id: a.id,
    sessionId: a.sessionId,
    text: a.text,
    status: a.status,
    priority: a.priority,
    dueDate: a.dueDate,
    dependsOn: a.dependsOn,
    provenance: a.provenance,
    sourceSegmentIds: a.sourceSegmentIds,
    thoughtId: a.thoughtId,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/** Drop the immutable identity columns from an insert shape so it can be used in an UPDATE. */
function stripKeys<T extends { id: unknown; sessionId: unknown; createdAt?: unknown }>(v: T): Omit<T, "id" | "sessionId" | "createdAt"> {
  const copy: Record<string, unknown> = { ...v };
  delete copy.id;
  delete copy.sessionId;
  delete copy.createdAt;
  return copy as Omit<T, "id" | "sessionId" | "createdAt">;
}

/**
 * Write everything an ApplyResult describes, in the caller's transaction, then assign seqs
 * to its events. Also updates the session focus/updatedAt and marks the segments ingested.
 */
export async function persistApplyResult(
  tx: Executor,
  sessionId: string,
  result: ApplyResult,
  atMs: number,
  segmentIds: string[] = [],
): Promise<SessionEvent[]> {
  const { inserts, updates } = result;
  const now = nowIso();

  if (inserts.concepts.length) await tx.insert(schema.concepts).values(inserts.concepts.map(conceptValues));
  if (inserts.thoughts.length) await tx.insert(schema.thoughts).values(inserts.thoughts.map(thoughtValues));
  if (inserts.relations.length) await tx.insert(schema.relations).values(inserts.relations.map(relationValues));
  if (inserts.models.length) await tx.insert(schema.systemModels).values(inserts.models.map(modelValues));
  if (inserts.changes.length)
    await tx.insert(schema.changeEvents).values(
      inserts.changes.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        modelId: c.modelId,
        kind: c.kind,
        description: c.description,
        beforeVersion: c.beforeVersion,
        afterVersion: c.afterVersion,
        sourceSegmentIds: c.sourceSegmentIds,
        implications: c.implications,
        unresolved: c.unresolved,
        diff: c.diff,
        createdAt: c.createdAt,
      })),
    );
  if (inserts.versions.length)
    await tx.insert(schema.modelVersions).values(
      inserts.versions.map((v) => ({
        id: v.id,
        modelId: v.modelId,
        sessionId: v.sessionId,
        version: v.version,
        snapshot: v.snapshot,
        changeEventId: v.changeEventId,
        createdAt: v.createdAt,
      })),
    );
  if (inserts.scenes.length) await tx.insert(schema.scenes).values(inserts.scenes.map(sceneValues));
  if (inserts.actions.length) await tx.insert(schema.actionItems).values(inserts.actions.map(actionValues));

  for (const t of updates.thoughts) {
    const rest = stripKeys(thoughtValues(t));
    await tx.update(schema.thoughts).set(rest).where(and(eq(schema.thoughts.id, t.id), eq(schema.thoughts.sessionId, sessionId)));
  }
  for (const c of updates.concepts) {
    const rest = stripKeys(conceptValues(c));
    await tx.update(schema.concepts).set(rest).where(and(eq(schema.concepts.id, c.id), eq(schema.concepts.sessionId, sessionId)));
  }
  for (const r of updates.relations) {
    const rest = stripKeys(relationValues(r));
    await tx.update(schema.relations).set(rest).where(and(eq(schema.relations.id, r.id), eq(schema.relations.sessionId, sessionId)));
  }
  for (const m of updates.models) {
    const rest = stripKeys(modelValues(m));
    await tx.update(schema.systemModels).set(rest).where(and(eq(schema.systemModels.id, m.id), eq(schema.systemModels.sessionId, sessionId)));
  }
  for (const s of updates.scenes) {
    const rest = stripKeys(sceneValues(s));
    await tx.update(schema.scenes).set(rest).where(and(eq(schema.scenes.id, s.id), eq(schema.scenes.sessionId, sessionId)));
  }
  for (const a of updates.actions) {
    const rest = stripKeys(actionValues(a));
    await tx.update(schema.actionItems).set(rest).where(and(eq(schema.actionItems.id, a.id), eq(schema.actionItems.sessionId, sessionId)));
  }
  for (const p of updates.segments) {
    await tx
      .update(schema.transcriptSegments)
      .set({ cleanedText: p.cleanedText, translation: p.translation, language: p.language })
      .where(and(eq(schema.transcriptSegments.id, p.id), eq(schema.transcriptSegments.sessionId, sessionId)));
  }
  if (segmentIds.length) {
    await tx
      .update(schema.transcriptSegments)
      .set({ ingestedAt: now })
      .where(and(eq(schema.transcriptSegments.sessionId, sessionId), inArray(schema.transcriptSegments.id, segmentIds)));
  }

  await tx
    .update(schema.sessions)
    .set({ focus: result.focus, updatedAt: now, durationMs: sql`greatest(${schema.sessions.durationMs}, ${atMs})` })
    .where(eq(schema.sessions.id, sessionId));

  return emitEvents(tx, sessionId, result.events);
}

/** Convenience for callers that need the raw focus string (not part of the Session contract). */
export async function getSessionFocus(sessionId: string): Promise<string> {
  const db = await getDb();
  const [row] = await db.select({ focus: schema.sessions.focus }).from(schema.sessions).where(eq(schema.sessions.id, sessionId));
  return row?.focus ?? "";
}

// ---------- single-entity mutations ----------

export async function updateAction(
  sessionId: string,
  actionId: string,
  patch: { text?: string; status?: ActionItem["status"]; priority?: ActionItem["priority"]; dueDate?: string | null },
): Promise<{ action: ActionItem; events: SessionEvent[] } | null> {
  const db = await getDb();
  return withTx(db, async (tx) => {
    const values: Partial<typeof schema.actionItems.$inferInsert> = { updatedAt: nowIso() };
    if (patch.text !== undefined) values.text = patch.text;
    if (patch.status !== undefined) values.status = patch.status;
    if (patch.priority !== undefined) values.priority = patch.priority;
    if (patch.dueDate !== undefined) values.dueDate = patch.dueDate;
    const [row] = await tx
      .update(schema.actionItems)
      .set(values)
      .where(and(eq(schema.actionItems.id, actionId), eq(schema.actionItems.sessionId, sessionId)))
      .returning();
    if (!row) return null;
    const action = mapAction(row);
    await tx.update(schema.sessions).set({ updatedAt: nowIso() }).where(eq(schema.sessions.id, sessionId));
    const atMs = await currentAtMs(tx, sessionId);
    const events = await emitEvents(tx, sessionId, [{ type: "action.updated", sessionId, atMs, payload: action }]);
    return { action, events };
  });
}

export async function updateThought(
  sessionId: string,
  thoughtId: string,
  patch: { text?: string; status?: Thought["status"] },
): Promise<{ thought: Thought; events: SessionEvent[] } | null> {
  const db = await getDb();
  return withTx(db, async (tx) => {
    const values: Partial<typeof schema.thoughts.$inferInsert> = { updatedAt: nowIso() };
    if (patch.text !== undefined) values.text = patch.text;
    if (patch.status !== undefined) values.status = patch.status;
    const [row] = await tx
      .update(schema.thoughts)
      .set(values)
      .where(and(eq(schema.thoughts.id, thoughtId), eq(schema.thoughts.sessionId, sessionId)))
      .returning();
    if (!row) return null;
    const thought = mapThought(row);
    await tx.update(schema.sessions).set({ updatedAt: nowIso() }).where(eq(schema.sessions.id, sessionId));
    const atMs = await currentAtMs(tx, sessionId);
    const events = await emitEvents(tx, sessionId, [{ type: "thought.updated", sessionId, atMs, payload: thought }]);
    return { thought, events };
  });
}

// ---------- scenes ----------

export async function getScene(sessionId: string, sceneId: string, ex?: Executor): Promise<Scene | null> {
  const db = ex ?? (await getDb());
  const [row] = await db
    .select()
    .from(schema.scenes)
    .where(and(eq(schema.scenes.id, sceneId), eq(schema.scenes.sessionId, sessionId)));
  return row ? mapScene(row) : null;
}

/** Insert a scene directly (used by tests and by the engine when it plans a scene outside ingest). */
export async function insertScene(
  input: Omit<Scene, "createdAt" | "updatedAt"> & Partial<Pick<Scene, "createdAt" | "updatedAt">>,
): Promise<Scene> {
  const db = await getDb();
  const now = nowIso();
  const [row] = await db
    .insert(schema.scenes)
    .values(sceneValues({ ...input, createdAt: input.createdAt ?? now, updatedAt: input.updatedAt ?? now }))
    .returning();
  return mapScene(row);
}

export async function updateScene(
  sessionId: string,
  sceneId: string,
  patch: Partial<Pick<Scene, "status" | "assetId" | "provider" | "error" | "metadata" | "title" | "description" | "prompt">>,
  ex?: Executor,
): Promise<Scene | null> {
  const db = ex ?? (await getDb());
  const [row] = await db
    .update(schema.scenes)
    .set({ ...patch, updatedAt: nowIso() })
    .where(and(eq(schema.scenes.id, sceneId), eq(schema.scenes.sessionId, sessionId)))
    .returning();
  return row ? mapScene(row) : null;
}

// ---------- assets ----------

export async function countAssets(sessionId: string, kind?: Asset["kind"]): Promise<number> {
  const db = await getDb();
  const where = kind ? and(eq(schema.assets.sessionId, sessionId), eq(schema.assets.kind, kind)) : eq(schema.assets.sessionId, sessionId);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.assets).where(where);
  return Number(row?.n ?? 0);
}

export async function insertAsset(
  input: {
    sessionId: string;
    kind: Asset["kind"];
    mime: string;
    width: number | null;
    height: number | null;
    bytes: Uint8Array;
    provider: string;
    simulated: boolean;
  },
  ex?: Executor,
): Promise<Asset> {
  const db = ex ?? (await getDb());
  const [row] = await db
    .insert(schema.assets)
    .values({
      id: newId("ast"),
      sessionId: input.sessionId,
      kind: input.kind,
      mime: input.mime,
      width: input.width,
      height: input.height,
      // Buffer is a Uint8Array; postgres-js serializes it natively, PGlite accepts it as well.
      data: Buffer.from(input.bytes.buffer, input.bytes.byteOffset, input.bytes.byteLength),
      provider: input.provider,
      simulated: input.simulated,
      createdAt: nowIso(),
    })
    .returning(assetColumns);
  return mapAsset(row);
}

export async function getAsset(assetId: string): Promise<{ asset: Asset; bytes: Uint8Array; ownerId: string } | null> {
  const db = await getDb();
  const [row] = await db
    .select({ asset: schema.assets, ownerId: schema.sessions.ownerId })
    .from(schema.assets)
    .innerJoin(schema.sessions, eq(schema.sessions.id, schema.assets.sessionId))
    .where(eq(schema.assets.id, assetId));
  if (!row) return null;
  const { data, ...rest } = row.asset;
  return { asset: mapAsset(rest), bytes: data, ownerId: row.ownerId };
}

// ---------- usage ----------

export async function logUsage(input: {
  sessionId: string | null;
  provider: string;
  model: string;
  kind: "extract" | "summary" | "image";
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  durationMs?: number;
}): Promise<void> {
  const db = await getDb();
  await db.insert(schema.usageLog).values({
    id: newId("usg"),
    sessionId: input.sessionId,
    provider: input.provider,
    model: input.model,
    kind: input.kind,
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    costUsd: input.costUsd ?? 0,
    durationMs: input.durationMs ?? 0,
    createdAt: nowIso(),
  });
}

// ---------- search ----------

export type { SearchResult };

export async function searchAll(ownerId: string, q: string, limit = 50): Promise<SearchResult[]> {
  const term = q.trim();
  if (!term) return [];
  const db = await getDb();
  const like = `%${term.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
  const owned = eq(schema.sessions.ownerId, ownerId);

  const [sessionsHit, segmentsHit, thoughtsHit, conceptsHit, actionsHit] = await Promise.all([
    db
      .select({ id: schema.sessions.id, title: schema.sessions.title, createdAt: schema.sessions.updatedAt })
      .from(schema.sessions)
      .where(and(owned, sql`${schema.sessions.title} ilike ${like}`))
      .orderBy(desc(schema.sessions.updatedAt))
      .limit(limit),
    db
      .select({
        id: schema.transcriptSegments.id,
        sessionId: schema.transcriptSegments.sessionId,
        sessionTitle: schema.sessions.title,
        text: schema.transcriptSegments.rawText,
        cleaned: schema.transcriptSegments.cleanedText,
        atMs: schema.transcriptSegments.startedMs,
        createdAt: schema.transcriptSegments.createdAt,
      })
      .from(schema.transcriptSegments)
      .innerJoin(schema.sessions, eq(schema.sessions.id, schema.transcriptSegments.sessionId))
      .where(
        and(
          owned,
          or(sql`${schema.transcriptSegments.rawText} ilike ${like}`, sql`${schema.transcriptSegments.cleanedText} ilike ${like}`),
        ),
      )
      .orderBy(desc(schema.transcriptSegments.createdAt))
      .limit(limit),
    db
      .select({
        id: schema.thoughts.id,
        sessionId: schema.thoughts.sessionId,
        sessionTitle: schema.sessions.title,
        text: schema.thoughts.text,
        sourceSegmentIds: schema.thoughts.sourceSegmentIds,
        createdAt: schema.thoughts.createdAt,
      })
      .from(schema.thoughts)
      .innerJoin(schema.sessions, eq(schema.sessions.id, schema.thoughts.sessionId))
      .where(and(owned, sql`${schema.thoughts.text} ilike ${like}`))
      .orderBy(desc(schema.thoughts.createdAt))
      .limit(limit),
    db
      .select({
        id: schema.concepts.id,
        sessionId: schema.concepts.sessionId,
        sessionTitle: schema.sessions.title,
        text: schema.concepts.label,
        sourceSegmentIds: schema.concepts.sourceSegmentIds,
        createdAt: schema.concepts.createdAt,
      })
      .from(schema.concepts)
      .innerJoin(schema.sessions, eq(schema.sessions.id, schema.concepts.sessionId))
      .where(and(owned, or(sql`${schema.concepts.label} ilike ${like}`, sql`${schema.concepts.description} ilike ${like}`)))
      .orderBy(desc(schema.concepts.createdAt))
      .limit(limit),
    db
      .select({
        id: schema.actionItems.id,
        sessionId: schema.actionItems.sessionId,
        sessionTitle: schema.sessions.title,
        text: schema.actionItems.text,
        sourceSegmentIds: schema.actionItems.sourceSegmentIds,
        createdAt: schema.actionItems.createdAt,
      })
      .from(schema.actionItems)
      .innerJoin(schema.sessions, eq(schema.sessions.id, schema.actionItems.sessionId))
      .where(and(owned, sql`${schema.actionItems.text} ilike ${like}`))
      .orderBy(desc(schema.actionItems.createdAt))
      .limit(limit),
  ]);

  // Deep-link position for derived items: the first source segment's startedMs (one extra query).
  const firstSeg = (ids: string[]) => ids[0] ?? null;
  const wantedSegIds = [...thoughtsHit, ...conceptsHit, ...actionsHit].map((r) => firstSeg(r.sourceSegmentIds)).filter((x): x is string => !!x);
  const segStart = new Map<string, number>();
  if (wantedSegIds.length) {
    const segs = await db
      .select({ id: schema.transcriptSegments.id, startedMs: schema.transcriptSegments.startedMs })
      .from(schema.transcriptSegments)
      .where(inArray(schema.transcriptSegments.id, [...new Set(wantedSegIds)]));
    for (const sg of segs) segStart.set(sg.id, sg.startedMs);
  }
  const atFor = (ids: string[]): number | null => {
    const id = firstSeg(ids);
    return id ? segStart.get(id) ?? null : null;
  };

  const results: SearchResult[] = [
    ...sessionsHit.map((r) => ({ kind: "session" as const, id: r.id, sessionId: r.id, sessionTitle: r.title, text: r.title, atMs: null, createdAt: iso(r.createdAt) })),
    ...segmentsHit.map((r) => ({ kind: "segment" as const, id: r.id, sessionId: r.sessionId, sessionTitle: r.sessionTitle, text: r.cleaned ?? r.text, atMs: r.atMs, createdAt: iso(r.createdAt) })),
    ...thoughtsHit.map((r) => ({ kind: "thought" as const, id: r.id, sessionId: r.sessionId, sessionTitle: r.sessionTitle, text: r.text, atMs: atFor(r.sourceSegmentIds), createdAt: iso(r.createdAt) })),
    ...conceptsHit.map((r) => ({ kind: "concept" as const, id: r.id, sessionId: r.sessionId, sessionTitle: r.sessionTitle, text: r.text, atMs: atFor(r.sourceSegmentIds), createdAt: iso(r.createdAt) })),
    ...actionsHit.map((r) => ({ kind: "action" as const, id: r.id, sessionId: r.sessionId, sessionTitle: r.sessionTitle, text: r.text, atMs: atFor(r.sourceSegmentIds), createdAt: iso(r.createdAt) })),
  ];
  results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return results.slice(0, limit);
}

// ---------- retention ----------

/** Delete sessions whose updatedAt is older than `days` days. Returns the number deleted. */
export async function deleteSessionsOlderThan(days: number): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db
    .delete(schema.sessions)
    .where(sql`${schema.sessions.updatedAt} < ${cutoff}`)
    .returning();
  return rows.length;
}

// ---------- errors ----------

export class RepoError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "RepoError";
  }
}
