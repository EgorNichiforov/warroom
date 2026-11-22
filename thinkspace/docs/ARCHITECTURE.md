# THINKSPACE Architecture

## Overview

```
Browser (Next.js client)                          Server (Next.js route handlers)
┌──────────────────────────────┐                  ┌──────────────────────────────────┐
│ Mic → SpeechProvider adapter │  POST segments   │ /api/sessions/:id/segments       │
│  (browser | soniox | deepgram│ ───────────────► │   persist raw/partial/final       │
│   | mock)                    │                  │                                  │
│ Session store (zustand)      │  POST ingest     │ /api/sessions/:id/ingest  (NDJSON│
│  ├ transcript                │ ───────────────► │   stream) → engine.extract (LLM) │
│  ├ thoughts / graph / models │ ◄─── events ──── │   → engine.apply (tx) → events   │
│  ├ scenes / actions          │                  │                                  │
│  └ timeline                  │  POST render     │ /api/sessions/:id/scenes/:s/render│
│ Views: Live · Canvas · Mind  │ ───────────────► │   → ImageProvider (gemini | mock) │
│  Map · Systems · Transcript  │ ◄─── events ──── │                                  │
│  · Actions · History         │                  │ /api/sessions/:id/summary        │
│                              │  GET snapshot    │ /api/sessions, /search, /export  │
└──────────────────────────────┘                  └──────────────┬───────────────────┘
                                                                 │ Drizzle ORM
                                                   ┌─────────────▼─────────────┐
                                                   │ Postgres (PGlite locally, │
                                                   │ Supabase/any PG in prod)  │
                                                   └───────────────────────────┘
```

## Layers (and who owns them)
| # | Layer | Location | Notes |
|---|-------|----------|-------|
| 1 | Frontend & interaction | `src/app/(app)/**`, `src/components/**`, `src/store/**` | Client components; one zustand store per open session. |
| 2 | Audio capture & streaming | `src/lib/speech/**` | `SpeechProvider` interface, adapters, mic lifecycle, reconnect. |
| 3 | Transcription provider adapters | `src/lib/speech/providers/*` + `src/app/api/speech/token` | Browser-side; server mints temporary keys only. |
| 4 | Thought understanding engine | `src/lib/engine/extract.ts`, `prompts.ts` | Builds context digest, calls `LlmProvider.extract`. |
| 5 | Structured extraction | `src/lib/contracts/extraction.ts` | Zod schema = model output contract; validated server-side. |
| 6 | Knowledge graph | `concepts`, `relations` tables; `src/lib/engine/apply.ts` | Incremental patching, provenance. |
| 7 | Change management | `system_models`, `model_versions`, `change_events`; `src/lib/engine/changes.ts` | Versioned, never overwrite. |
| 8 | Visual generation adapters | `src/lib/providers/image/*` | `ImageProvider.generate / edit`. |
| 9 | Diagram & canvas renderer | `src/components/canvas/**`, `mindmap/**`, `systems/**` | React Flow for graphs; SVG for structured renders; images for scenes. |
| 10 | Session management | `src/app/api/sessions/**`, `src/lib/db/repo.ts` | |
| 11 | Persistence | `src/lib/db/schema.ts`, `client.ts`, `migrate.ts` | Drizzle; transactions for related writes. |
| 12 | Action management | `action_items` table, `/api/sessions/:id/items/:itemId` | Edit, complete, reprioritize. |
| 13 | Auth & security | `src/proxy.ts`, `src/lib/auth.ts` | Passphrase + signed cookie; keys server-only. |

## Event stream contract
Every server-side mutation emits `SessionEvent` (see `src/lib/contracts/events.ts`), persisted to `events` with a monotonically increasing `seq` per session and streamed to the client as one JSON object per line. The client applies events to the store; the same reducer rebuilds state from the log when a session is reopened (`GET /api/sessions/:id/snapshot` returns both the materialized state and the event log tail).

## Ingest pipeline
1. Client batches final segments (≥2 or 4 s) → `POST /ingest {segmentIds}`.
2. Server acquires a per-session lock (serialized processing), loads the **context digest**: active concepts/relations (ids + labels), active thoughts (last N), system models with current version, open questions, last 12 transcript segments, scene list.
3. `LlmProvider.extract(digest, newSegments)` returns an `Extraction` (validated by zod).
4. `applyExtraction()` runs in one DB transaction: resolve temp ids, insert/update thoughts, concepts, relations; apply changes through the change engine (new version + change event); apply corrections (revise/retract); create/update scenes (status `planned`); create action items; emit events.
5. Events stream back as they are committed. The client then requests renders for `planned` scenes (respecting the image cap).

## Visual strategy
- **Fast structured rendering**: mind map and system diagrams render from the graph immediately (React Flow, deterministic layout). A new scene appears first as a structured placeholder card (title, concepts, planned kind).
- **AI scenes**: `ImageProvider.generate(prompt)` or `edit(previousAsset, instruction)` when the extractor marks `op: update` on an existing scene, keeping continuity. Previous asset versions are kept.
- **Spatial composition**: the canvas lists scenes as cards (latest focused) with a strip of earlier scenes and branches; each card links back to the concepts and the segments that produced it.

## Failure handling
- Speech adapter errors → `status: error` with a human message; mic capture keeps the local buffer; the user can switch provider without losing the session.
- LLM/image provider errors → event `engine.error` with retryable flag; segments are already persisted before ingest; the UI offers retry.
- DB unavailable → API returns 503 with a clear message; the client keeps unsent segments in memory and retries with backoff.

## Configuration
See `.env.example`. Providers are selected by `SPEECH_PROVIDER`, `LLM_PROVIDER`, `IMAGE_PROVIDER`; `GET /api/health` reports which are real and which are mocked so the UI can label simulated features.
