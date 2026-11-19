# Implementation log

## 19 Nov 2026 · 13.26.0 · capability map, evidence loop, operator layer, knowledge pipeline · NOT deployed
Built under an explicit gate override from Egor (chat, 19 Nov). Dials logged this week at the time: 0 (floor 80).

| Change | Files | Data model |
|---|---|---|
| B3 capability map: 9 domains, ~95 capabilities, each with meaning, observable behaviour, knowledge, practice, real evidence, assessment, next step, training mode, mapped existing cards. Missing content listed, never invented. Knowledge (ladder of mapped ideas) and performance (judged real events) kept apart. `cmNext` recommends one capability with its reasons. | new `capmap.js`; `capability.js` (Progress button, dossier buttons) | `S.boot['cx:<capId>'] = {log:[{at,eff,out,comp,ev,note,ctx,src}]}` |
| B4 after-action review: capability link, what was supposed to happen / attempted / worked / failed / change; effort, outcome and skill judged separately. Idea counts as real use only with skill to standard + evidence (before: any AAR counted). | `capability.js` `cpAar`, `cpAarSave` | AAR records gain `cap, tried, worked, eff, out, comp, proof` (old records read as before) |
| Personal reality model (facts with status), life direction, capacity for 7 days, week fix (KEEP/MOVE/REDUCE/DROP, confirm, undo, Florida window), conflict + stagnation detection, indicators, Operator screen | new `reality.js`; `life.js` (Operator tab) | new map `S.reality`; `S.settings.direction`, `S.settings.ready`, `S.settings.seasonLog`; week fix writes only `day.sched` overrides + a journal entry with the undo copy |
| Mission Control: lens for today, season fields (purpose, priorities, must-not-sacrifice, constraints, resources, success, cadence), override reason recorded, life-layer facts/risks (max 2 extra alerts), execution nudge, fixed commitment wins when blocks overlap (bug fix), time-to-restart measured | `mission.js` | day: `lens`, `mcPickWhy`, `mcPickLog`; focus interruption gains `back` |
| Weekly review → board meeting rows (decisions, skills shown/fell short, BAC errors, triggers, risks, overloaded days, season) + next-week outcomes, development priority, risk | `mission.js`, `reality.js` | review record gains `outcomes, dev, risk, life` |
| Reality Journal: one capture flow over every owner store, one timeline + personal history, search across cards/capabilities/manual/journal/sources/playbook/reality, lesson → protocol / procedure / practice | new `journal.js`; `shell.js` (+ Journal, Trigger quick buttons) | new map `S.journal` |
| Judgment Lab (decisions with options/evidence/assumptions/reversibility/confidence, review with quality checklist and reason vs luck; predictions with Brier calibration; 9 scenarios with transfer), Red Team rule checks on real records, risk register, pre-mortem → risks → tasks | new `judge.js` | `S.decisions` gains fields (+ `kind:'pred'`); new map `S.risks` |
| Attention Defense (trigger log, suggested protocols after 3 triggers in 14 days, if-then protocols with effectiveness, lapse restart), Field Manual (quality labels, uses, review flags), Contingency Center (12 plans, readiness checks; 112 verified on gov.md) | new `defense.js`; `engine.js` (keeps its list to data-triggered protocols) | `S.protocols` gains `t:'attn'` records; new map `S.manual` |
| Knowledge pipeline: 11 stages, mostly derived from linked records; approval with a reason before a procedure is "operationalized"; de-dup by link/title/card match; import of discoveries | new `kpipe.js`, new `lib/sources.json` (72 researched sources) | new map `S.sources` (progress only) |
| BAC: official Moldovan sources on the board (MEC Orders 2046 and 2051 of 8 Oct 2026 on ance.gov.md; timetable PDF located but a scan, not read). Romania's calendar deliberately excluded. | `bac.js` | none |
| Sync: `journal, risks, manual, reality, sources` added to `MERGE_MAPS` | `core.js` | additive |

Tests: `python3 v5/tests/test_1326.py` → 55/55 passed (new file; Playwright + system Chrome, 390×844, fixed clock Thu 19 Nov 17:00 Chisinau). Earlier suite (`tests/run.py`, 303 checks) is not in the repository and was NOT run. Baseline smoke load of 13.25.4: no page errors.
Phone-size checks: 32 new screens opened at 390 px with no horizontal overflow; Operator tab and Day screenshotted.
Not verified: real Android device, offline use, two devices syncing the new maps, restore with the new maps, AI paths.
Known risk: a device still on 13.25.x that pushes before updating drops the five new maps from the cloud row; the updated device pushes them back on its next sync (detected as "ahead"). Update all devices.
Pushed to branch `v13.26-operator` (commits f750a83, ca23f32). NOT merged to main, so NOT live: deploying needs Egor's approval.

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
