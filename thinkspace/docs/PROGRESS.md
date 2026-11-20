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

## Lead — integration pass (2026-11-20, after A/B/C)
- Verified independently: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` 35/35, `pnpm build` green (23 routes, proxy).
- Drove the app in Chromium with the scripted demo: 6 segments → 11 thoughts, 11 concepts, 10 relations, 1 model with 4 versions, 4 change events, 2 scenes, 2 actions, summary; correction (scenario 3) left one active `advises` relation and no `controls`; brainstorm (scenario 4) produced alternatives + a question and no decision; scenario 5 produced exactly one decision and two undated actions.
- Fixed from the visual review: layered system diagrams used step edges that looped around the top for upward relations → straight floating edges with arrows everywhere; the timeline listed partial/final/annotation events as separate "Said" rows and in a mixed order → one row per spoken segment, sorted chronologically; relation rows now name both endpoints.
- The Next.js dev "1 issue" badge seen during screenshots is a hydration warning caused by Playwright's screenshot caret-hiding style; a plain page load reports zero console errors or warnings.
- Build warning about dynamic `path.resolve` for the PGlite directory silenced with `turbopackIgnore`.

## Agent D — done (Quality Assurance, Playwright e2e)

### What was built
- `tests/e2e/helpers.ts` — session creation (UI `Start thinking` or `POST /api/sessions`), open `/s/:id`, select the "Demo script (simulated)" provider, start/pause/stop, wait for N finals, poll the snapshot (`GET /api/sessions/:id/snapshot`) until a predicate holds / segments are ingested, type a thought, range-input setter for sliders, screenshots to `tests/e2e/__screens__/` (gitignored), console/pageerror tracker.
- Specs (all `data-testid` based): `scenario-1-multilingual`, `scenario-2-modification`, `scenario-3-correction`, `scenario-4-5-decisions`, `scenario-6-long-session` (serial, 4 tests), `scenario-7-failure` (engine error + offline), `auth` (own `next dev` on :3124 with a passphrase), `mobile` (iPhone 13 metrics in Chromium).
- Minimal selector hooks added (no behaviour change): `data-testid="graph-node"` + `data-label` + `data-diff` on mind-map/system nodes (`src/components/mindmap/FlowGraph.tsx`), `data-testid="view-tabs-bottom"` on the phone tab bar (`ViewTabs.tsx`), `data-testid="viewing-past"` on the time-travel bar (`Workspace.tsx`). `.gitignore`: `tests/e2e/__screens__/`.
- `pnpm test:e2e`: **12/12 green in 2.9 min** (Playwright starts `next dev` on :3123 itself). `pnpm exec eslint tests/e2e` clean; the specs also type-check with `tsc --noEmit` (tests/e2e is excluded from the root tsconfig, checked with a temporary config).

### Results per scenario
| # | Scenario | Spec | How the lines are fed | Result |
|---|----------|------|-----------------------|--------|
| 1 | Multilingual thinking | scenario-1-multilingual | demo speech, lines 1–2 | PASS — transcript rows with MIXED / RO tags, raw text byte-identical (diacritics intact, also via API), Research + Central Intelligence (+ Execuție, Operațiuni) concepts, active Research→Central Intelligence relation, "Departments model" with a version, diagram scene card on the Canvas, nodes in the Mind Map |
| 2 | System modification | scenario-2-modification | demo speech, lines 1–3 then Pause | PASS — ≥2 versions (v1→v2 add, v2→v3 replace), slider shows v1 (no Finance), Compare on the replace highlights Finance + Marketing as added (`data-diff="added"`, "4 added"), change log row with implication + "? Who leads Finance and Marketing?", snapshot keeps v1 and the pre-replace version with the three departments |
| 3 | Correction | scenario-3-correction | typed (lines 1, 2, 4) | PASS — no active `controls` Research→Execuție, only `advises` active, relation count only grows, correction change recorded on the model, no decision; a retracted thought stays in the snapshot with `status: retracted`, is hidden by default and shown struck-through with "Show revised" |
| 4 | Brainstorm ≠ decision | scenario-4-5-decisions | typed (line 5) | PASS — 3 alternatives, 1 open question, 0 decisions, 0 actions; Decisions & Actions shows only "Open questions" |
| 5 | Decision + actions | scenario-4-5-decisions | typed (line 6) | PASS — exactly 1 decision (stated, source = that segment), 2 actions with `dueDate: null`, `priority: null`, source links; question becomes `revised` + conclusion; checkbox → done persists across reload |
| 6 | Long session | scenario-6-long-session | full demo speech + typed line | PASS — pause (clock + finals stop, server status paused) / resume, typed segment (`provider: typed`) ingested, Stop → confirm → summary with Decisions / Action items / Open questions + "simulated" badge, status ended; reload restores identical counts (segments/thoughts/actions/concepts/relations/versions); timeline scrubber + "Viewing the past" bar hide later items, `?t=` deep link; History card, case-insensitive search "central intelligence" → result link opens the session, Markdown export file (title + RO transcript line + decision), delete → card gone + 404 |
| 7a | Engine failure | scenario-7-failure | typed `[[fail]] …` | PASS — `engine.error` toast "Simulated LLM failure" (extract · retryable) with Retry, segment kept in transcript + snapshot (`ingestedAt: null`) + persisted event, pills settle (no "thinking…", saved, online); Retry with the same text fails again; edit the segment → Retry succeeds (thought appears, `editedByUser`, `ingestedAt` set) |
| 7b | Offline | scenario-7-failure | demo speech + `context.setOffline` | PASS — connection pill "offline", save pill "unsaved · N", "Connection lost" banner, RECORDING continues; back online → "online", "saved", every row shown offline is on the server |
| – | Passphrase auth | auth | separate server :3124 | PASS — `/sessions` → `/login?next=%2Fsessions`, wrong passphrase → "That passphrase is not right.", right one → `/sessions` with `ts_session` cookie, anonymous `GET/POST /api/sessions` → 401 `unauthorized`, `/api/health` open, bad login 401 |
| – | Mobile (390×844) | mobile | demo speech | PASS — History renders, Start thinking works, 7-button bottom tab bar, no horizontal overflow on /sessions, idle, recording and Actions views, tabs switch views, Pause reachable |

Scenarios 3/4/5 use the "Type a thought" input: it goes through the same save → ingest → mock-LLM rule path as speech (and gets language-annotated), and it avoids 40 ms/char replay so the whole suite stays under 3 minutes. Speech is exercised by 1, 2, 6, 7b and mobile.

### Test-infrastructure notes for the lead
- `next dev` takes an exclusive lock on `<project>/.next/dev/lock`; a second instance from the same directory refuses to start. `auth.spec.ts` therefore builds a throwaway project in `os.tmpdir()` (hard-linked `node_modules` via `cp -al`, ~0.5 s; copies of `src/public/drizzle` + config files), starts it with `THINKSPACE_PASSPHRASE=test-pass`, polls `/api/health` (≤120 s), kills the process group in `afterAll` and removes the directory. Symlinked `src`/`node_modules` do not work: Turbopack refuses files outside the workspace root.
- Use `http://localhost:<port>` for that server, not `127.0.0.1`: Next blocks its dev resources (HMR, chunks) for other host names unless `allowedDevOrigins` is set, and the login page never hydrates.
- The login form is a controlled React input behind Suspense; on a cold dev server a value filled before hydration is reset to "" (helper `fillWhenHydrated`). `getByRole("alert")` must be scoped to the form because Next's route announcer is also `role=alert`.
- On a phone viewport the Next dev-overlay badge (`<nextjs-portal>`, bottom-left) covers the "Live" bottom tab and swallows taps; the mobile spec removes it before tapping (dev-only element).
- The e2e PGlite dirs (`.data/pglite-e2e`, `.data/pglite-e2e-auth`, ~40 MB each) persist between runs; tests never rely on counts of sessions, only on their own session ids.

### Agent D — findings (product; not fixed, only reported)
1. **Ingests that fail while offline are never retried automatically** (`src/lib/speech/controller.ts`). Repro: start the demo, go offline after the first final (`context.setOffline(true)`), wait for the next final, go back online. Expected: once the save queue drains, the segment whose ingest failed with "Failed to fetch" is re-ingested. Actual: segments are saved, but `ingestedAt` stays null until the user clicks Retry on the toast (observed on every run: `[observation] offline ingests auto-recovered after reconnect: false`); the toast text is the raw `Failed to fetch`. Suggest: on the `online` event (or when `saveStatus` returns to saved) re-queue the segment ids of non-dismissed retryable extract errors, and map network errors to a friendlier message.
2. **Timeline visibility of a segment differs live vs after reload** (`src/lib/db/repo.ts` stamps `segment.added` with `atMs = endedMs`; `session-store.addLocalSegment` uses `startedMs`). Repro: scrub to a cursor between a line's `startedMs` and `endedMs` — during the live session the row is visible, after a reload it is hidden, while its timestamp column shows `startedMs` (e.g. row "00:08" hidden at cursor 00:12). Expected: the same rule in both cases (either value, consistently). Low severity; the e2e test follows the server rule.
3. **`/icon.svg` is auth-gated** (`src/proxy.ts` matcher excludes `/icons/` and `favicon.ico` but not `/icon.svg`, which `manifest.ts`/layout reference). In passphrase mode the browser's request is redirected to `/login?next=%2Ficon.svg` (seen in the auth server log). Expected: PWA icon served without a cookie. Add `icon\\.svg` (and `manifest.webmanifest` is already there) to the exclusion.
4. **The demo script never produces a `controls` relation**, so scenario 3's "retract the controls relation" path is only covered by the unit test (which seeds one). In the e2e the correction records the change + adds `advises`, but retracts nothing. Consider a demo line that states "research controls execution" before the correction (brief Part 15 reads as if it existed), so the retraction is visible in the product demo.
5. **Typed thoughts while idle all get `startedMs = 0`** (`controller.typeThought` uses the stopped clock): every typed segment before Start shows "00:00" and sorts by `seq` only. Fine functionally; the timestamp column becomes meaningless for keyboard-only sessions.
6. **Latency floor of the batching rule (D-13)**: a single final waits 0.8 s (save flush) + 4 s (ingest window) before the engine runs; see perf below. Not a bug, but the first thought lands ~6.5 s after the first sentence is finished, which feels slow in the demo. A shorter window for the very first segment of a session (or ingest-on-sentence-end when idle) would make the first reaction feel immediate.
7. Earlier hydration warning on `/sessions` (`caret-color: transparent` on the search input) is the Playwright screenshot caret style, as the lead noted; a plain page load has zero console errors/warnings (re-verified on a fresh server). Not a bug.

### Visual / usability review (screenshots in `tests/e2e/__screens__/`, 1280×720 and 390×844, scale 1)
- **Live view mind-map mini panel** (`scenario6-live-mid-session.png`): at ~300×270 px twelve nodes render with ~6 px labels and crossing edges — unreadable; it works as a "something is happening" indicator only. Consider showing just the focused concept + neighbours, or the node count, in mini mode.
- **Mind Map full view** (`scenario1-mindmap.png`): "Central Intellige…" truncates the most important label (node width 150 px); merged parallel edges produce labels like "connected directly · reports to" that overlap the edge and neighbouring labels; the three "alternative" labels around CRM collide. The kind legend sits bottom-left under the dev badge.
- **Systems Compare** (`scenario2-systems-compare.png`): the "After" diagram is fit-to-view into the half-width pane, so nodes are ~half the size of the "Before" pane's and the green "added" highlight is small; the two panes also use different layouts (before: 2 rows, after: 3 rows), so the eye cannot match nodes left/right. A shared layout/zoom for both panes would make the diff legible. The "0 removed" text in red reads like a warning when nothing was removed.
- **Canvas** (`scenario6-canvas.png`, `05-canvas`): the scene strip thumbnail title "Five departments" and "diagram · 2 versions" are clipped by the panel bottom edge in the full Canvas view (strip has no bottom padding, panel body overflows); illustration scenes show "Queued for rendering…" for several seconds with no progress indication (`scenario6-live-mid-session.png`).
- **Decisions & Actions / summary** (`scenario6-summary.png`): after Stop the view auto-switches here but the summary section is below the fold (six list sections first) — the user has to scroll to find the thing the Stop dialog promised; the per-action "No priority" select + "00:32" + pencil row looks like a form, and "00:32" has no label (it is a source link). Timestamps of typed-while-idle items read "00:00".
- **Transcript** (`scenario6-viewing-past.png`): in "Viewing the past" the "Live" button in the bar is disabled-looking but highlighted blue, next to "Jump to live" which does the same thing — two controls for one action. The transcript input placeholder "Type a thought (session ended — it will still be processed)" is useful; good.
- **History** (`scenario6-history.png`): default titles ("Thinking session — 20 Nov 2026 19:00") repeat for sessions created in the same minute, so cards are indistinguishable except by counts; status pill is lowercase-capitalised ("Ended") while the duration "00:00" for typed-only sessions suggests nothing happened. Cards lack any preview of the focus/summary headline.
- **Mobile** (`mobile-live.png`, `mobile-actions.png`): the header stacks title + pills + controls into ~120 px; title truncates to "Thinking session — 2…"; pills wrap to two lines; bottom tab labels at 10 px are tiny; the dev badge overlaps "Live". No horizontal overflow (verified).
- **Error toast** (`scenario7-engine-error.png`): clear message + Retry; but the toast does not say *which* segment failed and the transcript row carries no error marker, so with several segments the user cannot tell what to edit.
- **Offline** (`scenario7-offline.png`): good — red "offline" pill, "unsaved · 1", banner; the extra "Failed to fetch — Extract · Retryable" toast is noise while offline (see finding 1).

### Performance (mock providers, dev server, in-browser MutationObserver timestamps)
- First final segment row rendered **6.9–7.0 s after Start** (that is the 40 ms/char replay of the first demo line, 150 chars).
- **First thought card rendered 6.3–6.6 s after the first final** (three runs: 6309 / 6639 / 6.6 s). Breakdown: ≈0.8 s save flush + 4.0 s ingest window (D-13, only one pending final) + ≈0.25 s ingest (mock 150 ms + persist) + stream/render. With two finals pending, ingest starts immediately after the save.
- Ingest round-trip on the server: ~230 ms per batch (mock LLM); scene render (mock SVG) ~1.6 s cold / ~0.3 s warm; snapshot GET ~90 ms for a full session.
- Suite runtime: 2.9 min for 12 tests (auth server boot ≈10 s with hard-linked node_modules).
