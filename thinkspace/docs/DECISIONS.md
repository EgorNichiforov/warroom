# Architecture Decisions

Format: ID · decision · why · consequences. Dates are 2026-11-20 unless noted.

**D-01 · Isolated product inside the existing repo.** THINKSPACE lives in `thinkspace/`; nothing outside is modified. The War Room Supabase project is not reused for data (separate schema would still share a project's quota and risk). Consequence: own database configuration.

**D-02 · Next.js 16 (App Router, TypeScript) + Tailwind v4.** Single codebase for UI and API routes, streams responses natively, deploys to the connected Vercel account. `cacheComponents` is disabled (D-07).

**D-03 · Postgres everywhere via Drizzle ORM; PGlite when no `DATABASE_URL`.** One schema and one SQL dialect. Local development and automated tests run on an embedded Postgres (PGlite, file-persisted under `.data/`). Production points `DATABASE_URL` at Supabase (or any Postgres). Consequence: no SQLite/Postgres dialect drift; tests exercise the real schema.

**D-04 · Real-time transport = streamed NDJSON responses per request, plus an append-only event log.** The client posts transcript segments and reads a stream of engine events from the same request. Image rendering is a separate streamed request. This works on serverless (no long-lived sockets needed), and the event log (`events` table) makes every update recoverable and gives the timeline. Multi-tab live sync is out of scope for release 1 (reload restores from the snapshot).

**D-05 · Speech provider adapters run in the browser; the server only mints short-lived tokens.** Adapters: `browser` (Web Speech API — real, no key, Chrome/Edge/Safari), `soniox` (real-time WebSocket, language hints ro+en, native code-switching — research pointed to it as the strongest Romanian–English streaming option), `deepgram` (Nova-3 `language=multi`), `mock` (scripted, clearly labeled). Vendor API keys never reach the client. The Web Speech adapter cannot code-switch inside one utterance; this is documented in the UI, and the user can pick the recognition language and switch mid-session.

**D-06 · LLM = Anthropic Claude via `@anthropic-ai/sdk` with structured outputs (zod schema), behind a provider interface.** Default model `claude-opus-5-5` (configurable through `THINKSPACE_LLM_MODEL`; `claude-sonnet-5-5` and `claude-haiku-5-5` are cheaper options documented in README). Live extraction runs at `effort: low` for latency; summaries at `medium`. Server-side refusal fallbacks enabled. A `mock` LLM provider (rule-based) powers development and the automated scenario tests without credentials and is labeled "simulated" in the UI.

**D-07 · Next.js `cacheComponents` off.** The workspace is request-time, user-specific data; prerender validation adds friction with no benefit here.

**D-08 · Image generation = Google Gemini image model (`gemini-3.1-flash-image`, GA) via `@google/genai`, behind a provider interface, plus `mock`.** Chosen because it supports conversational editing with a reference image (scene continuity) and its host is reachable from this environment. OpenAI `gpt-image-1` is a documented alternative adapter slot. Generated images are stored as assets in the database (bytea) for release 1; a storage bucket is a drop-in later.

**D-09 · Knowledge model.** `concepts` + `relations` form the session knowledge graph (mind map). A `system_model` is a named view over a subset of the graph with immutable `model_versions` snapshots; every structural modification is a `change_event` that produces a new version and preserves the previous one. `thoughts` carry a type (idea, concept, question, hypothesis, observation, insight, decision, contradiction, alternative, assumption, system_component, proposed_modification, action_item) and `provenance` (stated | inferred). Everything references `source_segment_ids`.

**D-10 · Corrections are revisions, not additions.** The extractor returns `corrections` (retract/revise prior thoughts or relations). The engine marks the previous items `revised`/`retracted`, records a `correction` change event and keeps history.

**D-11 · Brainstorm ≠ decision.** The schema and prompt force `decision` only for explicit commitment language; exploratory statements become `idea`/`alternative`/`question`. Alternatives stay as alternatives with an `open question` when none is chosen. Tests cover this (Scenario 4).

**D-12 · Authentication = single-owner passphrase + signed cookie (jose HS256).** `THINKSPACE_PASSPHRASE` + `THINKSPACE_SECRET`. Enforced by `proxy.ts` for every page and API route. If the passphrase is unset in development, the app runs in open mode and shows a banner. Supabase Auth is a later option; the data layer already scopes everything by `owner_id`.

**D-13 · Cost controls.** Final segments are batched (≥ 2 segments or 4 s window) before an LLM call; identical batch text is deduplicated; the context sent to the model is a compact session digest, not the full transcript; image generation only fires on an explicit `scene_directive` from the extractor, is debounced per scene and capped per session (`THINKSPACE_MAX_IMAGES_PER_SESSION`, default 12); all provider calls log tokens and estimated cost to `usage_log`.

**D-14 · Privacy.** No raw audio is stored. Recording starts only on explicit user action and is always indicated. Sessions can be deleted (hard delete, cascading) and exported (JSON, Markdown). API keys exist only on the server.

**D-15 · Testing.** Vitest for engine/unit tests (mock LLM, scenario fixtures), Playwright for end-to-end flows against the running app with `mock` speech and `mock` LLM providers. The seven mandatory scenarios from the brief are encoded as tests.

**D-16 · Speech provider research notes (2026-11-20).** Soniox real-time (`stt-rt-v5`, language hints ro+en, token-level language identification) is the strongest documented option for Romanian–English code-switching in streaming. Deepgram Nova-3 `language=multi` now covers 55 languages, but Romanian's inclusion in the code-switching set could not be confirmed from the reachable sources; the adapter is kept because it is cheap to maintain and the user may already hold a key. AssemblyAI (32 streaming languages incl. Romanian) and Speechmatics are credible alternatives not implemented in release 1. OpenAI `gpt-4o-transcribe` is viable but its host is blocked from the build environment and community reports mention delayed deltas; deferred. Browser Web Speech remains the zero-cost default.
