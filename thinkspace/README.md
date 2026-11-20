# THINKSPACE

A voice-first thinking environment. Speak in Romanian, English, or both in the same sentence; THINKSPACE transcribes, understands, visualizes, organizes, versions and turns your thinking into decisions, questions and actions — live, and saved for later.

- **Live Thinking** — press *Start thinking*, speak, watch the transcript, thoughts, mind map and scenes update.
- **Visual Canvas** — structured diagrams instantly, AI-generated scenes when a picture communicates more.
- **Mind Map / Systems** — a living knowledge graph plus versioned system models with before/after comparison.
- **Transcript** — original language preserved, cleaned version kept apart, editable, searchable.
- **Decisions & Actions** — decisions, action items, open questions, end-of-session summary.
- **History / Timeline** — reopen, scrub through time, search, export, delete.

Documentation: [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md) · [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) · [`docs/PROGRESS.md`](docs/PROGRESS.md)

## Quick start (local)

Requirements: Node 22+, pnpm 10+. No database server needed (an embedded Postgres, PGlite, is used when `DATABASE_URL` is empty).

```bash
cd thinkspace
pnpm install
cp .env.example .env.local      # fill in what you have (see "Providers" below)
pnpm dev                        # http://localhost:3000
```

Without any API keys the app runs fully, with clearly labeled **simulated** intelligence and images:
- Speech: the browser's built-in recognition (Chrome, Edge, Safari) works for real with no key. A scripted *Demo* speech provider is also available.
- Intelligence: a rule-based mock extractor (good enough to demonstrate the flows; not real understanding).
- Images: placeholder SVG scenes marked "SIMULATED IMAGE".

## Providers and credentials

| Capability | Provider | Env | Notes |
|---|---|---|---|
| Thought extraction, summaries | Anthropic Claude | `ANTHROPIC_API_KEY`, `THINKSPACE_LLM_MODEL` (default `claude-opus-5-5`) | Structured outputs, provenance, corrections. `claude-sonnet-5-5` / `claude-haiku-5-5` are cheaper options. |
| Scene images | Google Gemini image model | `GEMINI_API_KEY`, `THINKSPACE_IMAGE_MODEL` (default `gemini-3.1-flash-image`) | Generation + reference-image editing for scene continuity. Capped per session by `THINKSPACE_MAX_IMAGES_PER_SESSION`. |
| Streaming speech, Romanian–English code-switching | Soniox (recommended) or Deepgram Nova-3 | `SONIOX_API_KEY` or `DEEPGRAM_API_KEY` | Keys stay on the server; the browser receives a 10-minute temporary token. |
| Speech without keys | Web Speech API | — | One recognition language at a time (pick RO or EN); mixed sentences may be imperfect. |
| Database | PGlite (default) or Postgres | `DATABASE_URL` | Supabase works: use the connection pooler URL. Migrations run automatically on start. |
| Access control | Passphrase | `THINKSPACE_PASSPHRASE`, `THINKSPACE_SECRET` | Required for any deployment reachable by others. |

`GET /api/health` reports which providers are real and which are simulated; the UI shows "simulated" badges accordingly.

## Scripts

```bash
pnpm dev          # development server
pnpm build && pnpm start
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test         # Vitest: engine + API tests (embedded DB, mock providers)
pnpm test:e2e     # Playwright end-to-end (mock speech + mock intelligence)
pnpm db:generate  # regenerate Drizzle migrations after editing src/lib/db/schema.ts
```

## Deploying

Any Node host works. For Vercel: import the repo, set the root directory to `thinkspace`, add the env vars above (`DATABASE_URL` pointing at a Postgres such as Supabase, plus `THINKSPACE_PASSPHRASE` and `THINKSPACE_SECRET`). Image bytes are stored in the database for release 1.

## Privacy

Audio is never stored. Recording starts only on an explicit *Start* and is always indicated. Sessions can be exported (JSON, Markdown) and permanently deleted. API keys never reach the browser.
