# Progress Log

## 2026-11-20 — Phase 0
- Environment: Node 22, pnpm 10, Next.js 16.4, Playwright 1.63 + Chromium preinstalled. No AI credentials present. Reachable hosts: api.anthropic.com, generativelanguage.googleapis.com, registry.npmjs.org. Blocked: OpenAI, Deepgram, AssemblyAI, ElevenLabs, Replicate, fal.
- Integrations: Supabase MCP (5 projects, none dedicated to THINKSPACE), Vercel MCP (one team), GitHub (this repo only).
- Decision: isolated `thinkspace/` app; PGlite locally; Supabase/Postgres via `DATABASE_URL` in production.
- Scaffolded Next.js app, installed dependencies, wrote docs.

## Agent A — done (Audio & Intelligence engine)
Files (all new):
- `src/lib/engine/digest.ts` — `buildDigest()`, `snapshotFocus()`, `segmentText()`.
- `src/lib/engine/apply.ts` — `applyExtraction()` (pure; ref resolution, label dedupe, revisions, corrections → retract + correction version, versioned change engine incl. conservative implicit `rewire`, scenes, actions, segment annotations, ordered events, ambiguity flags) + `normalizeLabel()`.
- `src/lib/engine/snapshot.ts` — `applyToSnapshot(snapshot, result)` merge helper (tests; client store can mirror it).
- `src/lib/engine/summary.ts` — `buildDeterministicSummary()`, `buildSummaryContext()` (compact digest for the LLM summary).
- `src/lib/engine/prompts.ts` — stable (cacheable) `EXTRACTION_SYSTEM_PROMPT` / `SUMMARY_SYSTEM_PROMPT` + JSON user-message builders.
- `src/lib/providers/llm/anthropic.ts` — `AnthropicLlmProvider` (`client.beta.messages.parse`, `zodOutputFormat`, effort via `output_config`, no `thinking` param, `fallbacks: "default"` + `server-side-fallback-2026-07-01`, prompt-cached system block, refusal → non-retryable, SDK error mapping, price table, AbortSignal).
- `src/lib/providers/llm/mock.ts` — `MockLlmProvider` (rule-based, deterministic for the demo script, generic fallback with RO/EN/mixed detection, `[[fail]]` / `MOCK_LLM_FAIL=1`, `latencyMs` option).
- `src/lib/providers/llm/index.ts` — `createLlmProvider()` (anthropic when key present, else mock with one warning).
- `tests/unit/engine/{fixtures,scenarios.test,apply.test,mock.test}.ts`.

Results: `pnpm test` 20/20 green (scenarios 1–6, summary, failure mode, unresolved-ref ambiguity, dedupe, versioning, rewire, scenes, actions). `pnpm exec eslint` clean on owned dirs. `tsc --noEmit` clean for owned files (remaining errors are in `src/lib/server/http.ts` and `src/app/api/sessions/[id]/route.ts`, not mine).

Notes for integrators:
- Ingest route: `buildDigest(snapshot, segmentIds, config.llm.maxContextSegments)` → `provider.extract` → `applyExtraction({...})`; `ApplyResult.events` are already ordered, assign `seq`/`createdAt` when persisting.
- `applyExtraction` mutates nothing in the input snapshot; rows in `updates.*` are full replacement rows.
- Mock latency is 150 ms per call by default; pass `new MockLlmProvider({ latencyMs: 0 })` in tests.
- Model names: the mock creates "Departments model"; the summary's `systemsToChange` names models with `vN → vM`.

Agent A requests: none (no contract changes needed).

## Agent C — done (Backend & Infrastructure)
Files (all new):
- `src/lib/auth.ts` — passphrase login (SHA-256 both sides, constant-time XOR compare), HS256 cookie via `jose` (`SignJWT`/`jwtVerify`), secret derived from the passphrase with a fixed salt + console warning when `THINKSPACE_SECRET` is empty, OPEN mode when the passphrase is empty, `getOwnerId()`, `requireOwner(req)` (throws a 401 JSON `Response`), cookie header builders.
- `src/proxy.ts` — Next 16 proxy (named `proxy` export + literal matcher excluding `/login`, `/api/auth/*`, `/api/health`, `/_next/*`, favicon, manifest, `/icons/*`). API → 401 JSON, pages → `/login?next=…`, OPEN mode passes everything.
- `src/lib/db/repo.ts` — all persistence: sessions CRUD, `appendSegments` (upsert by client id, partial rows upgradable, final rows immutable, per-session seq), `updateSegment`, `getSnapshot`, `listEvents`, `emitEvents` (seq allocated by a single atomic `UPDATE … RETURNING` on `sessions.last_event_seq`), `persistApplyResult`, `updateAction`/`updateThought`, scenes (`getScene`/`insertScene`/`updateScene`), assets (`insertAsset`/`getAsset`/`countAssets`), `logUsage`, `searchAll` (ILIKE across sessions/segments/thoughts/concepts/actions, limit 50), `deleteSessionsOlderThan`. `Executor` = common Drizzle type for db + tx; `withTx(db, fn)`. All timestamps normalised to ISO.
- `src/lib/server/{ingest,render,summary,stream,http,export,speech-token,retention}.ts` — pipelines and helpers (per-session promise-chain mutex, 5-minute batch dedupe, 60 s extract timeout via `AbortSignal.any`, persisted `engine.error` on failure; image cap; deterministic summary fallback; NDJSON streaming with `stream.end`/`stream.error`; Markdown export; speech token minting; startup + retention).
- `src/lib/providers/image/{mock,gemini,index}.ts` — deterministic SVG mock (hash-seeded shapes, "SIMULATED IMAGE" label, `MOCK_IMAGE_FAIL=1`), Gemini via `@google/genai` (`responseModalities: ['TEXT','IMAGE']`, `imageConfig.aspectRatio: '16:9'`, first `inlineData` part, edit = `[{text}, {inlineData}]`, 429/5xx retryable, 400/403 not, cost estimate 0.039 USD/image), factory with mock fallback when the key is missing.
- `src/app/api/**` — 18 route files: health, auth login/logout, sessions (list/create/get/patch/delete), snapshot, events, segments (+ patch), ingest / render / summary (NDJSON), actions, thoughts, export (json|md), assets, search, speech/token. Every handler: `runtime = 'nodejs'`, `requireOwner`/`requireSession`, zod validation, `{error, code}` JSON errors, goes through `handle()` which also runs `ensureStartup()`.
- `tests/api/{helpers,sessions,ingest,render,summary,auth,health}.test.ts` — 14 tests.

How to run: `pnpm test` (34/34 green incl. Agent A's 20 unit tests), `pnpm exec tsc --noEmit` (clean, whole project), `pnpm exec eslint src/lib/auth.ts src/proxy.ts src/lib/db/repo.ts src/lib/server src/lib/providers/image src/app/api tests/api` (clean; `pnpm lint` still reports errors in `src/components/**` and `src/lib/speech/controller.ts`, not mine).

Verified behaviours (tests): default title "Thinking session — …"; PATCH returns `{session, events}` and `status:'ended'` stamps `endedAt`; delete cascades; idempotent segment re-POST; `editedByUser` + cleared `cleanedText`; snapshot validates with `SessionSnapshot`; ingest stream `ingest.started … ingest.finished` with monotonic seqs and thoughts persisted (Agent A's mock, no skips needed); dedupe path emits `usage: null`; render yields `scene.updated → asset.added → scene.updated`, child scene uses `edit()` (`metadata.continuity: 'edit'`), cap → non-retryable `engine.error`, provider failure → scene `failed` + retryable error; `/api/assets/:id` serves bytes with immutable private cache; export md has title/transcript timestamps; search hits segments and sessions; auth 401/204/cookie/token verify + proxy redirect/401; health matches `HealthResponse`.

Not testable here / stubbed:
- Gemini image provider and Soniox/Deepgram token endpoints are written against the official docs and the SDK typings; the network policy blocks the speech hosts and there is no `GEMINI_API_KEY`, so neither was exercised live (see comments in `gemini.ts` and `speech-token.ts`).
- No temporary stubs were created: Agent A's `digest`, `apply`, `summary` and `createLlmProvider` landed before I finished, and my code compiles against them unchanged.

Agent C requests (contract notes, no shared file changed):
- Search result shape is not in `src/lib/contracts`; it is exported from `src/lib/db/repo.ts` as `SearchResult = { kind: 'session'|'segment'|'thought'|'concept'|'action', id, sessionId, sessionTitle, text, atMs: number|null, createdAt }` and `GET /api/search` returns `{ results: SearchResult[], q }`. Lead may want to move it into `contracts/api.ts`.
- `POST /api/speech/token` returns `{ provider, token, expiresAt }` (ISO). 501 `{error:'provider not configured', code:'not_configured'}` without a key.
- Mock image assets are stored with `kind: 'image'` (mime `image/svg+xml`, `simulated: true`) so the per-session image cap counts them like real images; `kind: 'svg'` is left for structured renders.
- `GET /api/sessions/:id/export` filename: `thinkspace-<YYYY-MM-DD>-<slug>.<md|json>`.
- Agent B: the `/login` page is not implemented by me (frontend); it should `POST /api/auth/login {passphrase}` and then navigate to `?next`.

## Agent B — done (Visual Product & Frontend)

### Files
- `src/lib/api.ts` — typed fetch client (ApiError with status/code, `readNdjson` with abort support, `runStream`, connectivity listener).
- `src/store/session-store.ts` — zustand store: snapshot-shaped state, `applyEvent` reducer for every event type, `loadSnapshot(snapshot, events)`, derived selectors, thinking state machine, mic level, speech/connection/save status, session clock (ticks while listening), time-cursor helper.
- `src/lib/speech/providers/{base,browser,mock,soniox,deepgram}.ts`, `src/lib/speech/pcm-capture.ts`, `src/lib/speech/index.ts` (`createSpeechProvider`, `SPEECH_PROVIDER_INFO`, `usableProviders`). Soniox uses model `stt-rt-v5`; Deepgram auths via `["bearer", token]` subprotocol with a one-time `access_token` query fallback. Both carry the "implemented against docs, not exercised here" comment.
- `src/lib/speech/controller.ts` — `ThinkingController`: provider lifecycle (start/pause/resume/stop/switchProvider), partial → live row, finals → save queue (≤10 per POST, 800 ms flush, backoff while offline, never dropped), ingest scheduling per D-13 (≥2 finals or 4 s, or on pause/stop), sequential scene rendering for planned photo/illustration/metaphor scenes, `retryIngest`, `retryRender`, `typeThought`, `runSummary`, durationMs PATCH every 15 s and on pause/stop, StrictMode-safe `attach()`.
- Pages: `src/app/layout.tsx`, `globals.css` (Tailwind v4 tokens + light theme), `page.tsx` (→ /sessions), `login/page.tsx`, `manifest.ts`, `public/icon.svg`, `sessions/page.tsx` (history + search + delete + export), `s/[id]/page.tsx`.
- Components: `ui/*` (Button, Pill, Select, Toggle, Dialog/ConfirmDialog), `workspace/*` (Workspace, TopBar, SessionControls, StatusPills, ViewTabs, PanelFrame, ResizableColumns, Banners, hooks), `transcript/TranscriptPanel`, `thoughts/ThoughtsPanel`, `mindmap/{layout,FlowGraph,MindMap}`, `systems/SystemsPanel`, `canvas/Canvas`, `actions/ExecutionPanel`, `timeline/Timeline`.

### Verified in Chromium (Playwright, mock speech + mock LLM + mock image, open auth)
- /sessions → Start thinking → /s/:id loads; privacy note shown once; RECORDING indicator + mic pill; live partial row then finals; segments saved ("saved" pill); ingest runs and thoughts/concepts/relations/model versions/scenes/actions stream into every panel; "Type a thought" posts a typed segment and triggers ingest.
- Pause/Resume, Stop → confirm → PATCH ended → summary stream rendered in Decisions & Actions (confirmed vs suggestions, "simulated" badge); reload restores the snapshot (12 thoughts / 8 segments) and offers "Continue thinking", which restarts the clock from durationMs.
- All seven tabs render and keep `?view=` in the URL; Systems shows version slider, Compare (before/after with added/removed colouring) and change log; Mind map radial layout with floating edges; Canvas shows the simulated image with SIMULATED ribbon, scene strip and version chips.
- Timeline scrubber + `?t=` deep link filter every panel ("Viewing the past" bar); inline segment edit (edited badge); action checkbox PATCH; search on /sessions (grouped results, kind badges); light theme; mobile layout (390px) with bottom tab bar.
- `pnpm exec tsc --noEmit` and `pnpm lint` clean. Zero console errors/warnings during the smoke run.

### Not verified / open issues
- Browser (Web Speech), Soniox and Deepgram adapters are not exercised here (no mic, hosts blocked); code follows the official docs.
- `pnpm build` not run by Agent B (dev server was running in the same tree); `useSearchParams` users are wrapped in Suspense.
- The engine.error → Retry toast path is implemented but was not triggered by the mock engine in the smoke run.
- Session list cards show counts only if the API adds `counts` to Session rows (currently absent, so they are hidden).

### Agent B requests
- `GET /api/sessions`: optional `counts: {segments, thoughts, concepts, actions}` per session would make history cards richer (UI already renders them when present).
- `GET /api/search`: `atMs` is only set for transcript hits; thoughts/actions/concepts could carry the atMs of their first source segment so result links can deep-link with `?t=`.
- PGlite client: `mkdir -p` of `THINKSPACE_PGLITE_DIR`'s parent would avoid a 500 on first run with a fresh directory (hit once with `.data/pglite-b`).

### Agent C — follow-ups for the frontend (same day)
- `GET /api/sessions` now returns each session with an extra `counts: { segments, thoughts, concepts, actions }` property (type `SessionWithCounts` in `src/lib/db/repo.ts`; four grouped `count(*)` queries over the listed ids, no N+1). Not added to the lead-owned `Session` zod type; the UI reads it when present.
- `GET /api/search`: thought / concept / action hits now carry `atMs` = `startedMs` of their first source segment (one extra `IN (...)` query), so results deep-link with `?t=`. Sessions stay `null`.
- `src/lib/db/client.ts` (lead-owned, edited with permission): `fs.mkdirSync(dir, { recursive: true })` before `new PGlite(dir)` — a fresh `THINKSPACE_PGLITE_DIR` no longer produces a 500.
- Tests: new "returns per-session counts" case in `tests/api/sessions.test.ts`; counts + search `atMs` assertions added to the ingest test. `pnpm test` 35/35, `tsc --noEmit` clean, eslint clean on owned files + `src/lib/db`.
