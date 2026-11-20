/**
 * Drizzle schema (PostgreSQL dialect; runs on PGlite locally and on Supabase/Postgres in production).
 * Column names are snake_case; TS property names camelCase, matching the domain contracts.
 */
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

const textArray = () => text().array().notNull().default([]);
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    languageHint: text("language_hint"),
    startedAt: ts("started_at").notNull().defaultNow(),
    endedAt: ts("ended_at"),
    durationMs: integer("duration_ms").notNull().default(0),
    summary: jsonb("summary"),
    settings: jsonb("settings").notNull().default({}),
    focus: text("focus").notNull().default(""),
    lastEventSeq: integer("last_event_seq").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_owner_idx").on(t.ownerId, t.updatedAt)],
);

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    startedMs: integer("started_ms").notNull(),
    endedMs: integer("ended_ms").notNull(),
    rawText: text("raw_text").notNull(),
    cleanedText: text("cleaned_text"),
    translation: text("translation"),
    language: text("language").notNull().default("unknown"),
    isFinal: boolean("is_final").notNull().default(false),
    editedByUser: boolean("edited_by_user").notNull().default(false),
    provider: text("provider").notNull().default("unknown"),
    confidence: real("confidence"),
    ingestedAt: ts("ingested_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("segments_session_seq_idx").on(t.sessionId, t.seq)],
);

export const thoughts = pgTable(
  "thoughts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull().default("active"),
    provenance: text("provenance").notNull().default("stated"),
    confidence: real("confidence").notNull().default(0.5),
    sourceSegmentIds: textArray(),
    revisesThoughtId: text("revises_thought_id"),
    conceptIds: textArray(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("thoughts_session_idx").on(t.sessionId, t.createdAt)],
);

export const concepts = pgTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind").notNull().default("concept"),
    description: text("description"),
    status: text("status").notNull().default("active"),
    provenance: text("provenance").notNull().default("stated"),
    sourceSegmentIds: textArray(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("concepts_session_idx").on(t.sessionId)],
);

export const relations = pgTable(
  "relations",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    type: text("type").notNull().default("related_to"),
    label: text("label"),
    status: text("status").notNull().default("active"),
    provenance: text("provenance").notNull().default("stated"),
    sourceSegmentIds: textArray(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("relations_session_idx").on(t.sessionId)],
);

export const systemModels = pgTable("system_models", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  currentVersion: integer("current_version").notNull().default(1),
  status: text("status").notNull().default("active"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const modelVersions = pgTable(
  "model_versions",
  {
    id: text("id").primaryKey(),
    modelId: text("model_id").notNull().references(() => systemModels.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    changeEventId: text("change_event_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("model_versions_idx").on(t.modelId, t.version)],
);

export const changeEvents = pgTable(
  "change_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    modelId: text("model_id"),
    kind: text("kind").notNull(),
    description: text("description").notNull(),
    beforeVersion: integer("before_version"),
    afterVersion: integer("after_version"),
    sourceSegmentIds: textArray(),
    implications: jsonb("implications").notNull().default([]),
    unresolved: jsonb("unresolved").notNull().default([]),
    diff: jsonb("diff").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("changes_session_idx").on(t.sessionId, t.createdAt)],
);

export const scenes = pgTable(
  "scenes",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().default("structured"),
    prompt: text("prompt").notNull().default(""),
    status: text("status").notNull().default("planned"),
    assetId: text("asset_id"),
    parentSceneId: text("parent_scene_id"),
    conceptIds: textArray(),
    sourceSegmentIds: textArray(),
    provider: text("provider"),
    error: text("error"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("scenes_session_idx").on(t.sessionId, t.createdAt)],
);

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("image"),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  data: bytea("data").notNull(),
  provider: text("provider").notNull(),
  simulated: boolean("simulated").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const actionItems = pgTable(
  "action_items",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    status: text("status").notNull().default("open"),
    priority: text("priority"),
    dueDate: text("due_date"),
    dependsOn: textArray(),
    provenance: text("provenance").notNull().default("stated"),
    sourceSegmentIds: textArray(),
    thoughtId: text("thought_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("actions_session_idx").on(t.sessionId, t.createdAt)],
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    atMs: integer("at_ms").notNull().default(0),
    payload: jsonb("payload").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_session_seq_idx").on(t.sessionId, t.seq)],
);

export const usageLog = pgTable("usage_log", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  kind: text("kind").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: ts("created_at").notNull().defaultNow(),
});
