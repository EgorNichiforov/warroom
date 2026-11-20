# Tasks

Legend: [ ] todo · [~] in progress · [x] done · [!] blocked

## Phase 0 — Discovery
- [x] Inspect environment, repo, integrations, network policy
- [x] Research speech, LLM, image providers (DECISIONS D-05, D-06, D-08, D-16)
- [x] Brief, architecture, plan, decisions, test plan
- [x] Shared contracts, DB schema, provider interfaces

## Phase 1 — Foundation
- [x] Next.js 16 app, Tailwind v4 theme (dark + light), PWA manifest
- [x] Drizzle schema + migrations, PGlite locally, Postgres via DATABASE_URL
- [x] Session CRUD, snapshot, event log, auth proxy (passphrase + signed cookie)
- [x] Responsive workspace shell with resizable panels and seven views

## Phase 2 — Live speech
- [x] Mic lifecycle, level meter, explicit activation, recording indicator
- [x] Browser Web Speech adapter (real, no key)
- [x] Soniox adapter (stt-rt-v5, language hints ro+en, temporary tokens)
- [x] Deepgram adapter (nova-3 multi, bearer subprotocol, grant tokens)
- [x] Scripted mock adapter + "type a thought" input
- [x] Segment persistence with retry/backoff, partial/final handling, inline editing
- [!] Real-microphone verification of the browser adapter and live Soniox/Deepgram runs — needs a device with a mic and vendor keys (not available in the build environment)

## Phase 3 — Intelligence
- [x] Context digest, structured extraction contract, Claude provider (structured outputs, cache, fallbacks)
- [x] Rule-based mock provider covering the demo script and generic speech
- [x] Apply engine: provenance, dedupe, revisions, corrections, ambiguities, actions, scenes
- [!] Live run with Claude — needs ANTHROPIC_API_KEY

## Phase 4 — Visual
- [x] Mind map (React Flow, deterministic radial layout), system diagrams (layered layout)
- [x] Scene planner directives, placeholder cards, image provider (Gemini + mock), continuity via edit chains
- [!] Live image generation — needs GEMINI_API_KEY

## Phase 5 — Change engine
- [x] Versioned models, change events, before/after compare, correction as revision

## Phase 6 — Execution & history
- [x] Decisions & actions panel, action editing, end-of-session summary (confirmed vs suggestions)
- [x] History list with counts, cross-session search with deep links, timeline scrubber, Markdown/JSON export, delete

## Phase 7 — Quality
- [x] 20 engine unit tests, 15 API tests (PGlite)
- [~] Playwright end-to-end suite for scenarios 1–7, auth, mobile (Agent D)
- [x] Lead visual review and fixes (diagram edges, timeline)

## Phase 8 — Delivery
- [x] README, .env.example, USER_GUIDE, PROGRESS
- [x] Draft PR #3
- [ ] Final report + email
- [!] Deployment — needs authorization plus a Postgres DATABASE_URL (Supabase) and the API keys above
