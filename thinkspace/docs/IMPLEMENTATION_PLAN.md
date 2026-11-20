# Implementation Plan

Phases follow the brief. Each phase ends with running code and tests, not a document.

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| 0 Discovery | Environment, research, docs, contracts, schema | Docs in `docs/`, contracts compile |
| 1 Foundation | App shell, auth gate, DB + migrations, session CRUD, workspace layout, health endpoint | `pnpm dev` serves workspace; sessions persist across restarts |
| 2 Live speech | Mic lifecycle, 4 speech adapters, segment persistence, provider switch, reconnect | Browser adapter transcribes RO and EN; mock drives tests |
| 3 Intelligence | Context digest, Claude structured extraction, mock LLM, apply engine, events | Scenario 1, 4, 5 unit tests pass |
| 4 Visual | Mind map, system diagram, scene cards, image provider (Gemini + mock), continuity | Scenes render placeholders → images |
| 5 Change engine | Versions, change events, corrections, before/after diff view | Scenario 2, 3 tests pass |
| 6 Execution & history | Actions panel, summary, history list, search, timeline, export, delete | Scenario 6 e2e passes |
| 7 Integration QA | Full e2e, failure scenario, performance, cleanup | All suites green, build clean |
| 8 Delivery | README, .env.example, PR, report | Deliverables sent |

Workstreams run in parallel where files do not overlap:
- **A Audio & Intelligence**: `src/lib/engine/**`, `src/lib/providers/llm/**`, prompts, mock LLM, unit tests for the engine.
- **B Visual & Frontend**: `src/app/(app)/**`, `src/components/**`, `src/store/**`, `src/lib/speech/**`.
- **C Backend & Infra**: `src/lib/db/**`, `src/app/api/**`, `src/lib/auth.ts`, `src/proxy.ts`, image providers, export, search.
- **D QA**: `tests/**`, Playwright config, scenario fixtures, bug reports.
The lead owns `src/lib/contracts/**` and `src/lib/db/schema.ts` and integrates.
