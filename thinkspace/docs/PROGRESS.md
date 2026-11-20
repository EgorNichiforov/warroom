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
