# THINKSPACE — User Guide

## The one-minute version
1. Open THINKSPACE and press **Start thinking** (History page or the top bar of a session).
2. Confirm the privacy note. The red **RECORDING** indicator shows whenever the microphone is on.
3. Speak naturally in Romanian, English or both. Do not organize your thoughts first; corrections and half sentences are fine.
4. Watch the transcript, thoughts, mind map and scenes update as you go. Press **Pause** to think silently, **Resume** to continue.
5. Press **Stop**. The session ends and the **Decisions & Actions** view shows what you concluded, decided, still need to answer, and need to do.

## Choosing how your speech is recognized
The provider selector sits in the top bar before you start (and while paused):

| Provider | Needs | Best for |
|---|---|---|
| Browser (built in) | nothing | Zero setup. Pick Romanian or English as the main language; mixed sentences are recognized in the chosen language and may be imperfect. |
| Soniox | `SONIOX_API_KEY` on the server | Real Romanian–English code-switching within one sentence, token-level language detection. |
| Deepgram | `DEEPGRAM_API_KEY` on the server | Alternative multilingual streaming. |
| Demo script | nothing | A scripted session that shows every feature without a microphone. Clearly labeled as simulated. |

You can also type a thought at any time in the box under the transcript; it goes through the same understanding pipeline.

## The views
- **Live** — the working layout: canvas in the center, mind map and execution summary on the left, transcript and thoughts on the right. Drag the gutters to resize; collapse or expand any panel.
- **Canvas** — scenes. Structured scenes (diagrams) render instantly from the knowledge graph. Image scenes show a placeholder while the picture is generated; iterative edits appear as v1, v2… chips so earlier versions stay available.
- **Mind Map** — every concept and relation the engine has extracted. Dashed edges are alternatives, red edges are contradictions, arrows show direction (reports to, advises, controls…). "Show revised" reveals items you have since changed.
- **Systems** — named system models with a version slider. **Compare** shows two versions side by side: green = added, red = removed. The change log lists every modification with its implications and unresolved questions.
- **Transcript** — the original words, never rewritten. A cleaned version appears underneath when it differs; translations are a toggle. Click a segment to edit it. Filter with the search box.
- **Decisions & Actions** — decisions (with the sentence that produced them), action items (check off, set priority, edit), open questions, conclusions, ideas to explore, systems to change, and the end-of-session summary with **confirmed** items separated from **suggestions**.
- **Timeline** — the chronological log. Drag the scrubber to travel back: every panel shows only what existed at that moment. "Live" returns to now.

## What the engine will and will not do
- It marks every item **stated** (you said it) or **inferred** (the engine derived it).
- "I wonder whether…" / "mă întreb dacă…" stays an idea or a question. Only explicit commitment ("I've decided", "am decis") becomes a decision.
- "No, that's not what I meant…" revises the earlier interpretation instead of adding a second one; the earlier version stays in history.
- "Replace / move / combine / add…" on something you already described creates a new version of that system model; the previous version is preserved.
- It never invents owners, dates or deadlines. Due dates appear only when you say one.
- When a reference such as "that one" cannot be resolved, it flags an ambiguity instead of guessing.

## History
The History page lists every session with its counts. Search looks through transcripts, thoughts, concepts and actions across sessions; a result opens the session at that moment. Each session can be exported as Markdown or JSON, reopened and continued (**Continue thinking**), or permanently deleted.

## Privacy
Audio is never stored. Only transcripts and the derived knowledge are saved, in your own database. API keys live on the server only. Sessions are yours to export or delete at any time.
