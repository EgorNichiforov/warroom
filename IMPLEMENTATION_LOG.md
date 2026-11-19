# Implementation log

## 19 Nov 2026 · 13.25.4 · B2 importance and blind spots in spacing
- `mastery.js`: `msImp`, `msBlind`, `msFloor`, `msPrio`, `msWhyDue`; `msQueue` uses the importance threshold and priority order; `msSchedule` scales the gap after Good/Easy.
- `capability.js`: `cpCal` counts blind spots per idea (`bsn:<id>`); the dossier shows estimated memory, importance and past blind spots.
- Data: new counter `bsn:<id>` in `S.boot`. Existing review history untouched.

## 19 Nov 2026 · 13.25.3 · B1 course states
- `capability.js`: `cpLessonState`, `cpCourseStats`, `cpCourseView`; entry button in Progress. Uses `bcRung` and the saved video positions (`vdAll`, device-local, last 80 videos). No data change.

## 19 Nov 2026 · 13.25.2 · A3 controlled replanning
- `engine.js`: `enReplan` rewritten (keep future blocks, move missed ones into free gaps, Florida window from the time zone, floors first, mode aware), `enReplanModal` (KEEP / MOVE / DROP + reasons), `enReplanUse` (stores `replanPrev`, `replanAt`, `replanLog`), new `enReplanUndo`.
- Data: day record gains `replanPrev`, `replanAt`, `replanLog`. The calendar and the weekly schedule are never written; only today's `replan` override, as before.

## 19 Nov 2026 · 13.25.1 · A2 campaigns connected to the mission
- `intel.js`: `campMsAuto`, `campMsOk`, `campaignProgress` (evidence only), `msToggle` asks for evidence, `msDone`, `campActive`, `campToggle`, cap of three in `recSave`.
- `mission.js`: `mcCampFor(dom)`; candidates carry `camp`; shown on the open mission card and in Why this.
- Data: milestones gain optional `ev`, `at`; campaigns gain optional `active`. Old records read as before; an old tick without evidence stays ticked but does not count.

## 19 Nov 2026 · 13.25.0 · A1 one recommendation
- `mission.js`: `mcBuild` returns `facts` (owner + text) from `stage.js sgState` and `engine.js enBottleneck`; shown in Why this. Fold renamed Supporting facts.
- `brief.js bfAttention`: first item is the mission's top; the engine bottleneck is a 14-day trend line.
- `stage.js` chain and `one.js oneAction`: dial count from `mcDialEvidence` (call log).
- Owners: recommend = mission.js only. stage.js = business stage facts. engine.js = 14-day gaps, protocols, replan. brief.js = attention list. one.js = full-screen view of the current calendar block. cockpit.js = the Dial screen (next call). No data change.

## 19 Nov 2026 · 13.24.0 · branch `overnight-13.24` · NOT deployed
Baseline: `v5` at `5088e8f` (13.23.2 live), working tree clean, 288 checks passing.

| Change | Files | Decision |
|---|---|---|
| Mission Control: one recommender, transparent tiers, evidence, unknowns, override | new `mission.js`; `arc.js`, `views.js` (card placed by the owners) | Rules, not a score. Local only. Replaces the command.js briefing on Day. |
| Call log is the source of truth for dials | `mission.js` (`mcDialLog`, `mcDialEvidence`, `mcReconcile`) | Counter kept as a cache; extras shown as "not in the log"; never lowered automatically. |
| Day modes Full / Minimum / Recovery | `mission.js`, `core.js` (`streakMinimum`) | Recovery never breaks the minimum-day streak. |
| Focus contract + interruption restart | `mission.js` | Stored on the day record (`fc[]`), no new sync map. |
| Season | `mission.js` | One settings object; only `dom` changes ranking. |
| Weekly review from records + time-in-app | `mission.js` | Saved into existing `S.reviews`. `appMin` counts minutes with the app on screen. |
| One six-stage mastery ladder; sales skills need a real call | `bootcamp.js` (owner), `mastery.js`, `capability.js` | Replaces both older ladders in the UI. |
| BAC feedback loop and board | new `bac.js` (reads `life.js` stores) | No new data model. Subjects unverified, stated on the board. |
| Source + claim type on each idea | `capability.js` | Default label is honest about not being verified. |
| Backups without credentials | `core.js` `exportData` | Sync code and share code stripped. |
| Clock-skew risk | `core.js` `pullCloud` | Shown only when measurable. |
| AI disclosure on sales-notes analysis | `intel.js` | Once per app session. |
| Age removed from AI prompts | `drive.js`, `capability.js` | No personal detail the model does not need. |

Tests: `TZ=Etc/GMT+6 python3 tests/run.py` → 303/303 passed (16 new for 13.24). Headless Chromium, 390×844.
Mobile check: Day, Why this, BAC board, weekly review screenshotted at phone size; no horizontal overflow, no page errors.

Not verified: real Android device, offline, two devices on the live cloud, live restore, the server `Date` header, AI-graded paths (no key in tests).
Not done from the brief: per-device revocation (needs DB change), restore rewind, replanning proposals, course-state view, campaign links, importance-weighted spacing, design-system pass across hubs, removal of legacy wrappers, BAC syllabus verification.
Known rough edge: the stage "Constraint" strip still shows under the mission and reads the hand counter.

## 18 Nov 2026 · 13.23.2 · deployed
Integrity pass: per-field sync merge, CRM/bench read-merge-write, convergence push, full restore, evidence-true mastery, Playbook territory in AI prompts. 288/288. Server-side backup of 22 rows taken first.
