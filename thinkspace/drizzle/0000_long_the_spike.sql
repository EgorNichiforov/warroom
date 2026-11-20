CREATE TABLE "action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text,
	"due_date" text,
	"dependsOn" text[] DEFAULT '{}' NOT NULL,
	"provenance" text DEFAULT 'stated' NOT NULL,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"thought_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"kind" text DEFAULT 'image' NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"data" "bytea" NOT NULL,
	"provider" text NOT NULL,
	"simulated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"model_id" text,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"before_version" integer,
	"after_version" integer,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"implications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unresolved" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'concept' NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"provenance" text DEFAULT 'stated' NOT NULL,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"at_ms" integer DEFAULT 0 NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"session_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relations" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"from_id" text NOT NULL,
	"to_id" text NOT NULL,
	"type" text DEFAULT 'related_to' NOT NULL,
	"label" text,
	"status" text DEFAULT 'active' NOT NULL,
	"provenance" text DEFAULT 'stated' NOT NULL,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'structured' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"asset_id" text,
	"parent_scene_id" text,
	"conceptIds" text[] DEFAULT '{}' NOT NULL,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"provider" text,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"language_hint" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"focus" text DEFAULT '' NOT NULL,
	"last_event_seq" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_models" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"current_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thoughts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provenance" text DEFAULT 'stated' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"sourceSegmentIds" text[] DEFAULT '{}' NOT NULL,
	"revises_thought_id" text,
	"conceptIds" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"seq" integer NOT NULL,
	"started_ms" integer NOT NULL,
	"ended_ms" integer NOT NULL,
	"raw_text" text NOT NULL,
	"cleaned_text" text,
	"translation" text,
	"language" text DEFAULT 'unknown' NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"edited_by_user" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'unknown' NOT NULL,
	"confidence" real,
	"ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_log" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"kind" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_model_id_system_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."system_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_models" ADD CONSTRAINT "system_models_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thoughts" ADD CONSTRAINT "thoughts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_session_idx" ON "action_items" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "changes_session_idx" ON "change_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "concepts_session_idx" ON "concepts" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_session_seq_idx" ON "events" USING btree ("session_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "model_versions_idx" ON "model_versions" USING btree ("model_id","version");--> statement-breakpoint
CREATE INDEX "relations_session_idx" ON "relations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "scenes_session_idx" ON "scenes" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_owner_idx" ON "sessions" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "thoughts_session_idx" ON "thoughts" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_session_seq_idx" ON "transcript_segments" USING btree ("session_id","seq");