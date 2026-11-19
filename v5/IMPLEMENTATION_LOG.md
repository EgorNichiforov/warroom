# Implementation log

## 19 Nov 2026 · 13.30.0 · research and content quality (and 13.29.0 operating system)

| Item | Status |
|---|---|
| Research job states (queued / sent / answered), Research Now via a Claude chat with paste-back import | implemented + tested |
| Daily scheduled research | BLOCKED: the schedule change was denied by the permission system. The scan runs Mondays 07:37 only |
| Video verification in four separate levels; user rating; bad video → replacement job | implemented + tested. Transcripts of the 19 Nov videos were NOT inspected: YouTube refused automated page requests from the build environment |
| Florida licensing lesson | three official AHCA pages + statutes linked; official video covers background screening only |
| Email backlog (one-off cloud task, 14:25–14:34) | ran: 116 emails in 10 notes: 41 listed ones processed (11 were promotions), 75 older ones added. Verified in the database. Content of the lessons was written by that task, not reviewed here |
| Lost Chapters, Gym Launch Secrets | BLOCKED: no legitimate text or official captioned video found. Needs his own copy |
| Market intelligence: 14 sourced statements, unknowns, 7-question plan | implemented + tested. Five web searches on 19 Nov; benchmark figures come through secondary citations; A/B/C matrix untouched |
| 13.29: operating system (31 steps, 10 v0 procedures), now/next/later, automatic research jobs, direction snapshot | implemented + tested; procedures untested on a real case |

## 19 Nov 2026 · 13.28.0 · Strategy layer, a video on every lesson, self-updating library (13.27.1)

Audit before building (what already existed and was reused): call log and funnel (`mcDialLog`, `sgState`, `enBottleneck`), experiments and decisions (`intel.js`, `judge.js`), Field Manual, campaigns with projects, capability map, content index. Missing: a place for market evidence, opportunities tied to evidence, an asset register, a way to compare business models without deciding early, and signals that connect them.

| Built | Where | Status |
|---|---|---|
| Market notes, also read live from call-log notes | `strategy.js` `stObs*`, `stCallNotes` | implemented + tested |
| Opportunities (6 classes, evidence grade, max 2 validating, opens a real experiment) | `stOpp*` | implemented + tested |
| Asset register with maturity stages; fed from experiments and procedures | `stAsset*` | implemented + tested |
| A/B/C decision: 36 cells, confidence per cell, change log, 90-day review, lean refused on thin evidence | `stModels*`, `stReview*` | implemented + tested |
| Signals from records; seven questions | `stSignals`, `stAnswers` | implemented + tested on synthetic records; no real owner data exists yet |
| Stage → capabilities → content focus | `stFocusCaps`, `ccFocus` | implemented + tested |
| Video on every lesson (233/234), video first on the card | `lib/cards.json`, `explain.js` | each id checked by YouTube oEmbed on 19 Nov; fit of video to lesson was matched by title, not by watching |
| Library imports scan notes by itself; app checks for updates in the foreground | `content.js`, `views.js` | implemented + tested |
| One-off cloud task reads all listed emails into the library | scheduled task | created; result not yet observed |

Needs a backend or permission (not built): automatic capture of what owners say (needs call recording + transcription), competitor monitoring, any market-size data.

## 19 Nov 2026 · 13.27.0 · Content Command Center and the declared gaps of 13.26

Build gate: 0 dials this week. Overridden by Egor in writing ("I'll do the calls today at 16:00"). Logged in the changelog.

| Stage | Built | Where | Status |
|---|---|---|---|
| 1 Architecture | Index over `lib/sources.json` + card clips; per-user state `S.content`, `S.research`, `S.settings.discovery`, `day.content` | `content.js` | implemented + tested |
| 2 Curriculum mapping | every resource carries `cards` and `caps`; "Best resources for this lesson" on every deep card, with the gap stated | `content.js` `ccForCard`, `explain.js` | implemented + tested |
| 3 Initial library | 109 library entries + 14 Hormozi items + 58 emails; `lib/mentors.json` (44 profiles) | `lib/` | implemented; link and video-id checks done 19 Nov; durations of videos are estimates and flagged |
| 4 Ongoing discovery | weekly scan + monthly curriculum review as Claude scheduled tasks; notes carry a `WR-IMPORT:` list the app imports on tap | scheduled tasks, `ccInbox*` | implemented; first real run not yet observed |
| 5 Recommendations | `ccPlan`, `ccToday`, `ccGate`, `ccScore` (explained) | `content.js` | implemented + tested |
| 6 Experience | Life → Content tab, quick action, Operator tile, in-app audio with resume | `content.js` | implemented; tested at 390 px in Chrome only |
| 7 Testing | `tests/test_1327.py` (74), `tests/test_1326.py` (55), `tests/run.py` (old suite, 3 checks updated to the 13.26 evidence rule) | `tests/` | see results in the release note |
| 8 Loop | capture → journal lesson → task / experiment / manual; analytics; exploration budget | `content.js` | implemented + tested |

Also built: 31 cards, 4 modules (`lib/cards.json`, `lib/boot.json`), `lib/bac.json`, `expand.js` (campaign projects, energy, Money lens via `lxCandidates`, `cmTrain`, `JL_BR`, `kpAudit`, BAC map/diagnostic/sequence), `mastery.js` consequence-of-forgetting floor.

Not done, stated plainly: no real-phone, installed-PWA or real two-phone test; 41 of 58 emails catalogued only; emails before 28 Aug not catalogued; no linked email video or PDF opened; Lost Chapters content not summarised; Voss/30MPC/Braun material beyond the linked pages not processed; contradictions are only the declared ones; BAC topic lists are an automatic extraction; five capabilities still have no lesson (caregiver matching, humour, de-escalation, taxes, independent living).

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

## 13.31.0 · 19 Nov 2026 · one way to learn, Blueprint audit, owner discovery, market v2

**New files:** `blueprint.js`, `learnx.js`, `tests/test_1331.py`. **Changed:** `arc.js` (startup race), `lib/cards.json` (+16, 250 total), `lib/boot.json`, `capmap.js` (five gaps filled), `lib/market.json` (v13.31), `lib/sources.json` (two book notes), `research.js` (one topic label), `reality.js` and `shell.js` (entry points), `index.html`, `sw.js`, `core.js`, `playbook.js`.

**Learn (learnx.js).** Work → Learn opens on a new first tab, "Now". `lxBuild(min, focus, opt)` returns a session: steps of kind lesson, review, practice, mission, apply, consume. Each step launches the component that already owns that record (`bcLesson`, `cpRecallSet`, `cmTrain`, `ccDone`, `ccPlay`); a mission writes capability evidence only with a written account, or becomes a task. Session state is `S.boot['lx:cur']`, the log is `S.boot['lx:log']` (last 60); both sync like every Bootcamp value. Nothing else is stored, so there is still one source of progress per kind. Order of decisions: unused or unpractised learning first → due reviews → new lesson (path order, NOW capabilities first, dial gate respected) → practice of that lesson's capability → mission → library resources → second lesson. Track rotation: after two business sessions the next is personal. A Blueprint competency with no lesson and no resource raises one research job (`key: 'bp:<id>'`, one open at a time); a resource imported for that job becomes the main block of the next personal session. The Library (`ccTab`) is rendered as a tab of Learn. `window.LX_OFF` or `LN_OFF` restores the old default tab for the legacy tests.

**Blueprint (blueprint.js).** `bpAll()` = every capability-map row placed in one of ten areas (A–J) plus 23 competencies that are not in the map yet. `bpHas`/`bpMissing` report per competency: own lesson, keyword-only match, written test questions, written exercise, inspected video, title-checked video, library resources. `bpStage` is the larger of the stage derived from records and a manual stage (proof required from "Practised"). Audit on a clean profile: 107 competencies; 84 with a lesson of their own, 5 with keyword matches only, 18 with none; 52 with written test questions; 87 with a written exercise; 51 with an inspected video, 36 more with a video nobody has watched; 0 with practice on record.

**Owner discovery.** `OD_Q` (nine questions), `odCapture` after `saveOwner` (wrapper, `OD_OFF` disables), answers saved in `S.obs` with `q`, `qi`, `src: 'owner call'`. `mktOpen` shows four counts kept apart. Playbook page `os-discovery`.

**Knowledge → execution.** `KX` (15 principles from $100M Lost Chapters and Gym Launch Secrets), verdict yes / part / later / dup / no, status in `S.boot['kx:<id>']`, proof required from "Tested". Source PDFs were supplied by the user, are not official editions, are not in the repository; only own-words summaries with chapter or page references are stored.

**Market v2.** BLS 2025–35 (current) and 2024–34 (flagged `hist`), each with definition, dates, forecast period. Florida count broken into four licence types with what it does and does not include. `comp`: 19 entries in six types, each with source class; missing prices say "Not public". Three consolidation entries.

**Fix.** `arc.js`: the 1.6 s startup fallback re-opened the Day overlay after navigation when start-up was slow. Reproduced 9/18 (2/9 at noon, 7/9 at 17:44 simulated), 0/18 after. Cause of the old "evening" test failure: a real race, more frequent in the evening in my runs; why evening is worse was not established.

**Guard.** `stEvidence()` drops records flagged `test` or `seed`; `dgAudit()` counts them. Tests run in throwaway browser contexts with the cloud blocked.

**Tests.** `test_1331.py` 72 checks including scenarios A–G of the unified-learning brief; `test_1327.py` 122; `test_1326.py` 55; legacy `run.py` 316, run at an evening clock (the one that used to fail).

**Not done / blocked.** No real-phone test (checklist in Operator → Phone test). No video among the 16 new lessons has been watched. Lost Chapters sections A and C and most of Gym Launch are unread. Competitor prices mostly not public; Tampa Bay-local recruiters and staffing firms not searched. Daily research schedule still not approved. Tax lesson: the 2027 Moldovan rate proposal's status is unverified. 23 Blueprint competencies have no lesson of their own.

## 13.31.1 · 19 Nov 2026

`content.js`: the banner that 13.28 injected above Learn and Courses is no longer added when `learnx.js` is loaded (seen on the live build: it was a second entry point next to Learn → Now). One new check in `test_1331.py`.
