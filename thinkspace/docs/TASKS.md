# Tasks

Legend: [ ] todo · [~] in progress · [x] done · [!] blocked

## Phase 0
- [x] Inspect environment, repo, integrations, network policy
- [x] Research speech, LLM, image providers (see DECISIONS D-05, D-06, D-08)
- [x] Write brief, architecture, plan, decisions, test plan
- [~] Shared contracts (`src/lib/contracts`), DB schema

## Phase 1–8
Tracked in the lead agent's task list and mirrored in PROGRESS.md as each phase closes.

## Known credential blockers
- [!] `ANTHROPIC_API_KEY` — needed for real extraction (mock LLM otherwise)
- [!] `GEMINI_API_KEY` — needed for real image scenes (mock otherwise)
- [!] `SONIOX_API_KEY` or `DEEPGRAM_API_KEY` — needed for server-grade streaming STT with code-switching (browser Web Speech works without keys)
- [!] Network policy of this build environment blocks api.openai.com, api.deepgram.com, stt-rt.soniox.com — adapters are implemented against official docs but could not be exercised live from here.
