# THINKSPACE — Project Brief

**One line:** a voice-first thinking environment. The user speaks (Romanian, English, or both mid-sentence); THINKSPACE transcribes, understands, visualizes, organizes, versions, and turns the thinking into decisions, questions and actions — all live, all saved.

## Who it is for
A single primary user (the product owner) who thinks out loud, code-switches Romanian/English, speaks in unfinished and self-correcting sentences, and wants to revisit how an idea evolved rather than only its summary.

## Core loop
1. Press **Start thinking**. Microphone is explicitly activated, with a visible recording indicator.
2. Speech streams in as partial and final transcript segments (original language preserved).
3. Final segments are batched and sent to the intelligence engine, which incrementally updates the session: thoughts (typed, with stated/inferred provenance), the knowledge graph (concepts + relations), system models (versioned), scenes (diagrams or generated images), actions, questions, decisions.
4. Every change is an event on the session timeline with a link to the source segment(s).
5. **Stop** produces an end-of-session summary: conclusions, decisions, actions, next steps, open questions, ideas to explore, dependencies, priorities, systems to change.
6. Sessions are searchable, re-openable, exportable, deletable.

## Non-goals for release 1
- Multi-user collaboration and sharing.
- Native mobile apps (the PWA-style responsive web app is the target).
- Storing raw audio (transcripts and derived knowledge only).

## Principles (from the product vision)
Clarity over decoration. Understanding over transcription alone. Visual communication over walls of text. Organization without restricting free thinking. Continuity over disconnected outputs. Actionability over passive storage. Accuracy over impressive-but-misleading AI output. Preservation of ideas over premature summarization. Never record silently.

## Product areas
Live Thinking · Visual Canvas · Mind Map · Systems · Transcript · Decisions & Actions · History (all synchronized views over one session state).

## Repository placement
This repository (`warroom`) hosts an unrelated existing product at its root. THINKSPACE lives entirely in `thinkspace/` and does not touch any other file or any existing database.
