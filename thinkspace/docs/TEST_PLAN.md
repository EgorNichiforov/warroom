# Test Plan

## Levels
1. **Unit (Vitest)** — `tests/unit/**`. Engine logic: extraction → patch application, change engine versioning, correction handling, brainstorm-vs-decision classification with the mock LLM, context digest building, export rendering, auth token signing.
2. **API integration (Vitest, PGlite)** — route handlers invoked against an isolated PGlite database: session CRUD, segment append/edit, ingest stream, snapshot, export, delete cascade, auth gate.
3. **End-to-end (Playwright, Chromium)** — app running with `SPEECH_PROVIDER=mock`, `LLM_PROVIDER=mock`, `IMAGE_PROVIDER=mock`: start a session, feed scripted speech, verify panels update, stop, verify summary, reopen from history, search, export, delete.
4. **Manual real-provider checks** — require credentials (see README); documented as a checklist with results recorded in `docs/PROGRESS.md`.

## Mandatory scenarios (from the brief)
| # | Scenario | Automated by |
|---|----------|--------------|
| 1 | Multilingual thinking (RO→EN sentence, three departments, research→central intelligence) | unit + e2e |
| 2 | System modification (3 → 5 departments, old version preserved, diff shown) | unit + e2e |
| 3 | Correction ("No, that's not what I meant… advise, not control") | unit + e2e |
| 4 | Brainstorming vs decision (alternatives, no false decision, open question) | unit |
| 5 | Action extraction (no invented deadlines, source refs) | unit |
| 6 | Long session (topic changes, pauses, references back) | e2e script |
| 7 | Service failure (provider error → status visible, segments preserved, recovery) | unit + e2e |

## Definition of pass
All unit and e2e suites green on `pnpm test` and `pnpm test:e2e`; `pnpm build` succeeds; `pnpm lint` clean.
