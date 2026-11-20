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

## 13.32.0 · 19 Nov 2026 · whole-system coherence (stages 1–6 and the safe part of 8)

Build Gate: 0 dials in the records for the week; overridden by Egor in writing for this scoped plan. He reports calls made today that are not in the records.

**New:** `cohere.js`, `BUILD_GATE.md` (restored, rules unchanged), `tests/test_1332.py`. **Changed:** `learnx.js`, `mission.js` (one sentence), `reality.js`, `life.js`, `blueprint.js`, `playbook.js`, `index.html`, `sw.js`, `core.js`, the four documents, three test files.

- **Stage 1.** One current architecture file; README and `ARCHITECTURE.md` point at it; gate file back in `main:v5/`. BAC wording now says "the minimum that keeps a pass on track" (Day reason, Playbook seed row, one reality fact). The live goal record still reads "8+ average": not edited.
- **Stage 2.** `mcBuild` unchanged as the only ranker. Through `lxCandidates`: `follow` (radar minus today's callbacks), `fix` (answer-rate signal, lesson attached), `os` (tier 2, urgency 0.3), `task` (oldest overdue, tier 2, urgency ≤ 0.45), `learn` (tier 3, or tier 2 while the weekly personal minimum is unmet). Through `exAugment`: an energy risk line that proposes a Minimum day.
- **Stage 3.** `lxDomain()` replaces turn-taking. `settings.learn.persMin` (unset by default; nothing is guaranteed until set). `rebuild` and `debrief` steps taken over from the capability mission. `ccPlanOpen`, `ccPlanRun` and `cpMissionStart` open `lxPlanOpen`; an old mission in progress still opens its own screen. Old `lx:log` entries read unchanged.
- **Stage 4.** `coFit(min)` on the Day card: filters `mcBuild().C` by time and the next fixed commitment; names what ranked higher and does not fit; hands learning to `lxPlanOpen`.
- **Stage 5.** `mcDoneToggle` asks expected vs observed (`day.mcDone.exp/.obs`) and shows whether `mcMet` agrees. Weekly review: per-day rows (marked / evidence / outcome), one change required, optional task for Monday (`reviews[wk].acts`, `.changeTask`).
- **Stage 6.** + sheet: "send it as" (task, market note, decision, journal, resource, money, note, not sure), a suggestion by keywords that never routes by itself, original text kept in `boot` `cap:<id>`, link written on the owner's record (`cap`) when its form is saved, Unprocessed list. Text the number-logger cannot read is kept instead of refused.
- **Stage 8 (safe part).** Blueprint hand-set stage also writes capability evidence. You → Content points to Learn → Library. Automation status screen. Not done: removing `nova.js`/`ops.js` leftovers (callers not all proven dead), folding `CP_ST`.
- **Stage 7.** Investigation only; no data written.

Tests: `test_1332.py` 46, `test_1331.py` 74, `test_1327.py` 122, `test_1326.py` 55, legacy `run.py` 315 (the count varies by one or two with the clock: some checks are conditional). Desktop browser at phone width; no real phone.

## 13.33.0 · 19 Nov 2026 · wayfinding (usability, part 4 of the unified brief)

**New:** `wayfind.js`, `tests/test_1333.py`. **Changed:** `index.html`, `sw.js`, `core.js`, `playbook.js`, `blueprint.js` (version text), test version strings, documents.

- `WF`: 34 destinations, one per everyday activity: plain label, search words, place, purpose and record, action. `wfOpen()` (the map, with a filter), `wfFind(q)`, `wfGo(id)`. Entry points: a link on the Day mission card, a link in the ⌘ palette, and the palette's own search (`bfSearch`) now lists "Where" matches first. It ranks nothing; `mcBuild` is untouched.
- `WF_SCREEN`: purpose · use this when · do this · records · next for 17 screens. `wfStrip()` puts one line at the top of a screen after `render()`/`show()`; dismissal is per screen and per device (`localStorage` `wr-wf-h:<view>`). `wfHelp(view)` opens the full card.
- Operator (`lfOpTab` wrapped): tiles regrouped by `WF_OP` into four headed groups and two folded ones; unknown tiles fall into "Other" so none can disappear.
- `openCapture()` (top-right +) now opens `shCapture()`; "Record a talk" was the one action only the old sheet had and is added to the quick grid. The old sheet's code remains in `ask.js`, unreachable from the interface.
- `WF_OFF` disables all of it for tests that need the bare screens.

Tests: `test_1333.py` 29 (the twelve usability journeys, each: found by its plain name → lands in its one home → two taps from Day; two of them also check the record), `test_1332.py` 46, `test_1331.py` 74, `test_1327.py` 122, `test_1326.py` 55, legacy `run.py` 315/315 at a daytime clock (after bedtime one legacy check fails because the classic Day screen shows no mission card at night; the same happens on 13.32.0). No real-phone test.

Regression caught and fixed before release: the purpose line was first inserted inside each screen, which made the stable renderer rebuild whole screens on every refresh (8 legacy checks failed). It now sits before the screen element; a test compares the rebuild count with and without it.

Not done in this release (from the unified brief): per-domain operating systems beyond what exists (business economics, money management depth, body, focus), goal structure (definition, baseline, milestones), scorecards with definitions and trends, review cadence per domain, renaming of tabs, back-navigation audit. The coverage matrices that say what exists and what is missing are in the Claude doc "War Room 13.31.1 · whole-system coherence audit".

## 13.34.0 · 19 Nov 2026 · reality in, reasons out (parts 2 to 4 of the unified brief, next slice)

**New:** `depth.js`, `tests/test_1334.py`. **Changed:** `learnx.js` (recall step uses `dxReviewIds`), `index.html`, `sw.js`, `core.js`, `playbook.js`, `blueprint.js` (version text), test version strings, documents.

- Calls made outside the app: `dxOutside()`/`dxSave()`/`dxDel()`; stored on the day as `ext[]`; `mcDialLog()` wrapped so the day, week, funnel and dial mission count them; labelled "your report" on the Day card, in the weekly review and in the scorecard source. Refuses impossible numbers and future days. Never auto-filled.
- Skip reasons: `mcSkip()` wrapped; `DX_WHY`; `dxWhyWeek()`; shown in the weekly review with the fix for a reason that repeats.
- Weekly scorecard `scOpen()` (12 rows with definitions), goal check `gcOpen()` (read-only until one goal is edited; three fields), money split `mbOpen()` with a user-set tax percentage, monthly review `mrOpen()`, caregiver funnel by status, one-minute tour `wfTour()`; six new entries in "Where do I…?".
- Learn recall: wrong-answer lessons first, modules interleaved.

Tests: `test_1334.py` 38, `test_1333.py` 30, `test_1332.py` 46, `test_1331.py` 74, `test_1327.py` 122, `test_1326.py` 55, legacy `run.py` 316. Throwaway browser at phone size; not a real phone.

Caught before release: the new Day-card link reused the wayfinding link's class and broke a 13.33 check that counts it; it has its own class now.

Not done (from the unified brief): body plan adaptation, focus protocol, quarterly review, tab renaming, back-navigation audit, folding the `CP_ST` ladder, removing retired home code, money as a standing Mission Control candidate, per-call import of outside calls. Awaiting decisions: weekly personal learning minutes, BAC goal wording, goal merge, the scheduled-task prompt change, old cloud rows.

## 13.35.0 · 19 Nov 2026 · funnel rates, body trend, quarterly review

**Changed:** `depth.js` (three views appended), `tests/test_1334.py` (now 47), version strings, documents.

- `beOpen()`: 28-day funnel from `stFunnel` (so outside reports count) and `PIPE`; rates hidden below `BE_MIN`; `beStuck()` names the first stage with no throughput. No dials-to-goal projection without measured rates.
- `bwOpen()`: `avgWeight(7)` now and 14 days earlier → kg per week; needed pace per open weight goal; flags fewer than 4 weigh-ins in 7 days; shows multiple targets without choosing.
- `qrOpen()`: 13 weeks vs 13 before via `mcWeek`; lists saved monthly changes; three answers saved per quarter.
- `scOpen()` wrapped to link Funnel, Body trend, Money split, Month, Quarter. Three new "Where do I…?" entries.

Caught before release: the body-trend label contained "goal" and outranked the Goals screen in search (13.33 journey 9 failed); renamed.

Tests: `test_1334.py` 47, `test_1333.py` 30, `test_1332.py` 46, `test_1331.py` 74, `test_1327.py` 122, `test_1326.py` 55, legacy `run.py` (see commit). Not a real phone.

## 13.36.0 · 19 Nov 2026 · a due planned payment is a Mission Control candidate

**Changed:** `depth.js` (`dxBillCand`, `lxCandidates` wrapped; earlier wrapper flags are copied so older wiring checks still hold), `tests/test_1334.py` (now 50), version strings, documents.

Caught before release: the new wrapper hid the 13.32 hook flag (`lxCandidates._co`), failing a 13.32 wiring check; flags are now carried over. A vacuous assertion I had written (`|| true`) was removed before the run that counts.

Tests: `test_1334.py` 50, `test_1333.py` 30, `test_1332.py` 46, `test_1331.py` 74, `test_1327.py` 122, `test_1326.py` 55, legacy `run.py` (see commit). Not a real phone.

## 13.37.0 · 19 Nov 2026 · decisions applied (BAC 7, weight 80, learning by need, cleanup)

**Changed:** `core.js` (starter goals, `seed` flag, `merge()` guard), `learnx.js` (`lxPersMode`, `lxPersWaiting`, three-way setting), `cohere.js` (wording), `playbook.js`, `intel.js`, `ask.js` (BAC wording), `tests/run.py` (never reaches the cloud table), new `tests/test_1337.py` (14), version strings, documents.

**Data, with Egor's approval of 19 Nov 20:25:** main row copied to `warroom_backup` (id 23, md5 matched); 17 goal records soft-deleted (15 exact copies + 2 "Weight 77 kg"), BAC goal retitled with target 7; 13 live goals remain; the odd monthly "350 dials" record was left alone (not identical). 11 old or test rows copied to `warroom_backup` and deleted from `warroom_sync` (12 rows remain: main, queue, bench, 6 snapshots, 2 staging, 1 share).

**Scheduled tasks:** Acvila attendance prompt rewritten without the row id (accepted). Discovery scan → daily: refused by the permission system; unchanged.

Tests: see commit. Not a real phone.

## 13.38.0 · 19 Nov 2026 · learning proof, and the Stage 8 cleanup

**New:** `proof.js`, `tests/test_1338.py` (25). **Changed:** `cohere.js` (automation rows), 13 files lost unused functions (`core.js`, `game.js`, `intel.js`, `keep.js`, `ops.js`, `dial.js`, `drive.js`, `screen.js`, `playbook.js`, `bootcamp.js`, `learnx.js`), `index.html`, `sw.js`, version strings, documents.

Part 2 requirement by requirement, as verified in code: spaced repetition by recall performance (mastery.js, already there), active recall and teach-back prompt (already there), confidence calibration (capability.js, already there), interleaving (13.34), harder questions with progress (new), practical assignments (Learn mission/apply steps, already there), closed-book testing (already there), mastery by evidence (`BC_RUNG`, already there), misconceptions/weak areas/decay (new), connections across subjects (new).

Not built: questions generated for a new situation (needs the AI key and would be unverifiable offline), automatic difficulty inside the quiz mode.

Tests: see commit. Not a real phone.

## 13.39.0 · 19 Nov 2026 · domain depth (Part 3) and getting around (Part 4)

**New:** `domain.js`, `ux.js`, `tests/test_1339.py` (39). **Changed:** `index.html`, `sw.js`, version strings, documents.

Part 3, what was built on existing records: loss reasons, planned vs done, business economics with a "cannot be measured yet" list, goal kind/priority/milestones/review date, body log suggestions, focus row, monthly change follow-through, the nine-area map. Already in the app before today and only linked: net worth (wealth.js), forecast and runway (money2/4), focus blocks (mission.js), campaigns, decisions, the company operating system, BAC plan.

Part 4: back-button handling did not exist at all before this release. Workflows, guided tour, kinds page added. Bottom navigation was already five plain names (Day, Work, +, Money, You).

Not built: a body plan that rewrites itself, lifetime value and margin per placement (no data exists), per-screen reduction of controls (screens show 15 to 33 controls; not restructured), renaming inner tabs.

Tests: see commit. Not a real phone.

## 13.40.0 · 19 Nov 2026 · the learning decision applied on-device; caregiver drop-out reasons

**Changed:** `learnx.js` (`lxPersMigrate`, explicit `'none'`), `domain.js` (`CG_WHY`, `cgWhyAsk`, `cgWhyStats`), tests (`test_1337.py` 18, `test_1339.py` 41), version strings, documents.

Found while checking the work: the cloud-side write of `settings.learn` made at 20:43 was gone by 21:22 after a laptop sync (goal changes made the same way survived, because goals merge per record by newest timestamp). Fixed by applying the decision in the app on each synced device.

Tests: see commit. Not a real phone.

## 13.41.0 · 19 Nov 2026 · vision stages 0 to 2: discovery, architecture decision, one model of reality

**New:** `entity.js`, `tests/test_1341.py` (29), `WAR_ROOM_EXECUTION_STATE.md`, `ARCHITECTURE_DECISIONS.md`, `INVENTORY.md` + `tools/inventory.py`. **Changed:** `domain.js` (goal `dep`, `risk`), `dial.js` (an agency without a city crashed the opener line), `index.html`, `sw.js`, version strings, documents.

Leftovers from the previous brief closed here: the tour opens once by itself (synced devices only), goal dependencies and risks, yearly review, usage counting as the evidence for folding screens later. Decided, not done: `nova.js` stays (its instruments are still reachable from Intel); screens are not restructured blind.

Still blocked: daily research schedule (scheduler refused the change twice); scheduled tasks beyond the first page of the list were not read (each page costs more than it is worth mid-build).

Next: 13.42 = objective chain and backward plan, what judge.js lacks, scenario engine with sensitivity (`future.js`).

## 13.42.0 · 19 Nov 2026 · vision stages 3, 8, 9, 11 (+ what stage 4 lacked: nothing; judge.js covers it)

**New:** `future.js`, `agents.js`, `tests/test_1342.py` (41), `VISION_COVERAGE.md`, `USER_GUIDE.md`, `ACCEPTANCE_REPORT.md`. **Changed:** `unify.js` + `look.js` + `monolith.css` (graphite look), `index.html`, `sw.js`, version strings, documents.

Honest limits: scenarios model one funnel with no churn and no capacity; roles were tested with a stand-in for the AI; the evolution view needs weeks of real use before it says anything; the graphite look was checked for contrast by calculation, not by eye.

Next: nothing further is buildable without Egor: see "Blocked" in `WAR_ROOM_EXECUTION_STATE.md` and "What only you can do" in `ACCEPTANCE_REPORT.md`.


## 13.43.0 · 19–20 Nov 2026 (overnight) · the server

**Asked for (19 Nov 22:32):** backend, job queue, agents that run while the app is closed, per-device accounts.

**Built and proven locally, NOT applied to the live project:**
- `supabase/warroom_server_v1.sql`: six private tables (config, room, device, job, schedule, audit), browser RPCs (enrol, devices, revoke, lock, enqueue, jobs, cancel, schedules, audit, status), worker-only functions (claim with SKIP LOCKED, finish with retry and backoff, note, backup, AI use, tick, wake). Additive: no existing table, policy or function is changed.
- `supabase/warroom_server_v1_policies_cron.sql`: three extra permissive policies (a device key is a second way in), one restrictive gate that is open unless a room locked itself, an audit trigger that can never block a write, the 10-minute timer.
- `supabase/functions/warroom-worker/index.ts`: jobs `brief`, `quality`, `research`, `role`, `backup`; bounded AI (same contract and validation as the in-app roles, daily cap per room, key never echoed); research opens every page before keeping it and marks everything unverified.
- `supabase/tests/run.sh` (68 checks) and `worker_test.mjs` (41 checks): a stand-in for the live database in a local Postgres 16; every way in (key, device key, another room's key, revoked key, the lock), the queue, schedules, audit, and the real worker code with the network replaced.

**Why it is not live:** `apply_migration` made Supabase ask Egor to confirm, he was asleep, the request timed out. Running the same SQL another way would be going around his confirmation, so it was not done. Nothing was deployed.

**Live in the app (13.43.0):** `server.js`: Server screen, device key header (sent only when this device has a key for this sync code), `WR-PROPOSE` approve/dismiss through `agApprove`, truthful automation rows. `tests/test_1343.py` (49). `cohere.js` rows corrected: the content scan is daily since 19 Nov.

**Known limits:** the lock does not cover the AI helper function (it still accepts the sync code; it exposes no data). `pg_cron` and the HTTP wake are replaced by stand-ins in the local proof. No job has run against the live project or a real AI model.


## 13.44.0 · 20 Nov 2026 (overnight) · the vault

**Asked for (19 Nov 22:32):** encryption.

**Built:** `vault.js`, loaded before `core.js`. It wraps `fetch` for the sync table only. Going out: the eleven private stores are moved into one AES-256-GCM block (key = PBKDF2-SHA-256, 310,000 rounds, of the passphrase; salt and a check value in `settings.vault`). Coming in: the block is opened and the app sees an ordinary document, so `merge()` is untouched. Snapshots (`:snapN` rows) get the same treatment.

**Safety rules in the code:** a device that cannot open the server's block passes it through and never replaces it; if sealing throws, the request is not sent; switching off or changing the passphrase is only possible from a device that has the block open, after a fresh pull.

**Proven:** `tests/test_1344.py` (45): two browsers as two devices against a stand-in for the table, real browser crypto: what the server holds, a closed device, opening on the second device, a server-side note write, snapshots, a damaged block, a failed seal, passphrase change, switching off.

**Limits (also on the Vault screen):** the rest of the document stays readable on the server by design; an unlocked device is not protected; copies made before switching on (rolling snapshots, `warroom_backup`) are unsealed; an old app version on another device could briefly put unsealed records back (the next open device re-seals); no reset without an open device. Not tested against the live project or on a real phone. Not switched on for Egor: it needs his passphrase.

**Found on the way:** `settings` only merges when its `_u` moved, so every on-device settings change must `touch(S.settings)`.


## 13.45.0 · 20 Nov 2026 (overnight) · the personal model page

`model.js`: `pmRows()` builds stated / observed / gap / unknown lines from settings, goals, `S.days` (first thing done, skip reasons), the recall log and `scRows()`; minimums of 5 days, 3 skip reasons, 10 recalls before a line is counted. `pmFix` stores a correction in `S.boot.pmfix`. No inference beyond counts. `tests/test_1345.py` (17).

Still not built from the two briefs (kept here so nobody reports them as done): AI-written new-situation recall questions and adaptive quiz difficulty; "contradicts / depends on / example of" link kinds; a people-and-commitments model; comparing saved scenarios; hydration; a body plan that adapts after missed sessions; automatic fold-away of never-opened destinations; reading the later pages of Claude's scheduled-task list for literal ids. A morning-brief Claude task was refused by the scheduler's permission system (the server brief replaces it once the server is on).


## 20 Nov 2026, 07:36–07:50 · the server switched on

Egor confirmed in Supabase. Three migrations applied, worker deployed three times (v1, then two fixes from the first live run), timers inserted, first jobs run, access paths checked live in a rolled-back transaction, security advisor read and the grants tightened (`supabase/warroom_server_v1_tidy.sql`). Local proofs now 68 SQL + 43 worker checks. Details and the one thing that does not work (search quota on his AI key) are in `WAR_ROOM_EXECUTION_STATE.md`.


## 13.46.0 · 20 Nov 2026 · the last seven pieces

`finish.js`, `tests/test_1346.py` (46). Built from the "still not built" list above:
1. Link kinds: wrappers on `pfLink` / `pfLinkSave`; the kind is stored on both sides and written into the sentence in its own direction.
2. `smCompare()`: saved scenarios through the same `smCalc`, with the inputs that differ.
3. Water: `S.days[k].water`, `S.settings.waterGoal` (no default; no advice).
4. Missed training: `trmMissed()` over the last three days of `blocksFor().filter(isTrainBlock)`; a decision is stored in `day.trDec`; "move" creates a task for today, or tomorrow if today still has a session.
5. `wfList` folds away destinations not opened for 14 days once there are 14 days of usage data; search is untouched.
6. People and commitments: `S.boot['pp:<id>']`, `S.boot['pc:<id>']`. Not in the vault.
7. `nqAsk()` / `nqOpen()`: one AI question from one card, level from the last three grades on that card, validated, self-graded into `rlog` with level 4.

Honest limits: (7) was tested with a stand-in for the AI, so the plumbing and the limits are proven, not the quality of the questions. (4) decides nothing about load or recovery. (5) will fold most of the list for someone who uses five screens; that is the point, and "now" is never folded.

Of the list above, one item is left: reading the later pages of Claude's scheduled-task list for literal ids (see the next entry if it was done).


## 20 Nov 2026 · all 15 of Claude's scheduled tasks read (the last open item)

Read every page of the list (15 enabled recurring tasks). **No task contains the sync row id.** All find the main row by a subquery.

| Finding | Tasks | Risk today | Fix |
|---|---|---|---|
| Lookup is only `id not like '%:%' … order by updated_at desc limit 1` | Monday Bench Bulletin draft; War Room app ⇄ Google Sheet sync (hourly, **writes**) | None today: the two `staging-` rows and the `share-` row all carry the 2000-01-01 stamp the app gives them on purpose, so the main row is always newest | Add `and id not like 'staging-%' and id not like 'share-%' and data ? 'days'` to both prompts |
| Lookup excludes `staging-` but not `share-`, no `data ? 'days'` | System check 04:41; Weekly review; Close the day; Morning brief 06:00 | Same: none today | Same clause |
| Two morning briefs already existed | "Morning brief · numbers + one move" 05:03 and "Morning brief" 06:00 | Duplicate notes every morning | Egor picks one. The server brief timer was therefore switched OFF (it would have been a third); "Run one now" still works |
| Old business facts in prompts | Weekly review, Close the day, Morning brief 06:00 ("Founding Offer $500 per caregiver after 5 shifts", "15 screened caregivers by 30 Nov", BAC "8+"); Bench Bulletin (price line $750 / $1,200); Morning brief 05:03 ("app is frozen") | They coach against a plan that Playbook v5 / Model v3 replaced, and against a BAC target he changed to "not lower than 7" on 19 Nov | Prompt edits. The scheduler's permission system refused prompt edits twice on 19 Nov; needs Egor's explicit go-ahead and may need him to edit in the task's settings |
| Content scan prompt still says "weekly", "Monday morning" | Content discovery (runs daily since 19 Nov; first daily run 20 Nov 05:37 succeeded) | Wording only; it also stops if `freq` is 'monthly' | Prompt edit, same constraint |

Nothing was changed in any task.

## 13.47.0 · 20 Nov 2026 · the freeze is withdrawn (Egor's correction, 08:27)

- Playbook: "Feature freeze" replaced by "War Room development (corrected 20 Nov)": two separate projects, War Room development not tied to dials or a first paying client. The stage-scorecard line "this is why War Room is frozen" corrected. Changelog row added. `intel.js` milestone label no longer says the freeze lifts at 1,000 dials.
- `BUILD_GATE.md` rewritten: retired for War Room development; history kept. `README.md`, `WAR_ROOM_EXECUTION_STATE.md`, `DEPLOYMENT_HANDOFF.md` corrected. `tests/test_1332.py` now checks the retired wording.
- Scheduled tasks edited with his approval (each prompt re-sent in full and read back): Weekly review (ladder, BAC 7, trials wording, freeze sentence replaced), Morning brief 06:00 (ladder, BAC 7; paused), Nightly review (BAC 7), Bench Bulletin (no price), Morning brief 05:03 (freeze sentence replaced), Sunday strategy audit (Part 0 "Build gate check" replaced by "Dials first"; no gate verdict; War Room commits no longer read).
- Tried and reverted in the same session: counting a day's dials as "the larger of the counter and the call records" in the app. The legacy suite showed this reverses a deliberate rule from 13.24 ("the call log is the source of truth; hand-counter extras are shown apart and not counted"). Left as an open decision for Egor.
- Tests: 1346 47/47 and every other suite as before; legacy 315/315.


## 13.48.0 · 20 Nov 2026 · offline and speed proven, screens looked at

- `tests/test_1348.py` (12): real service worker, network cut with `set_offline`, reload from cache, work offline; speed budgets with ordinary data and with two years of synthetic heavy use.
- Screenshots (`/home/claude/work/shots.py`, not in the repo) of the new sheets at 390×844, dark and graphite. Found: a row of buttons inside a sheet's content must not use `.actions` (that class is the sticky bar at the bottom of a sheet and covers what follows). New class `.fn-inline` in `monolith.css`; inner rows in `server.js`, `vault.js`, `finish.js` moved to it. Rule for new screens: exactly one `.actions` per sheet, the last row.
- `finish.js` section 8: the scorecard's Dials row names counter-only presses. The two counting rules (app: call records; reviews: larger of counter and records) are both left as they are and both now say what they include.

## 20 Nov 2026, 09:00 · scheduled tasks, second pass (Egor: "work through it all")

- War Room app ⇄ Google Sheet sync (hourly, the one that writes days into the row it finds): main-row lookup tightened to exclude `staging-`/`share-` rows and to require `data ? 'days'`.
- Monday Bench Bulletin draft: same lookup; subject now follows the Playbook's E7 template; the old template in the egorflow repo is named as retired.
- Left as they are, on purpose: System check, Weekly review, Close the day and the paused 06:00 brief still use the lookup that excludes only `staging-`. They are safe today (the `share-` row carries the 2000-01-01 stamp) and each edit means re-sending a 5,000 to 7,000 character prompt; do them the next time one of those prompts is edited for another reason. Same for the word "weekly" in the daily content scan (cosmetic; it runs daily).
- Not changed: the dial definition in the reviews (larger of counter and call records) and in the app (call records; counter extras shown apart). Both now say what they include. Still Egor's decision.
- A note "what needs you (10 minutes)" was left in the app inbox with the phone checks, the enrolment steps and that decision.
- Worker: unchanged since version 3. Pending for the next deploy: show counter-only dials apart in the brief line, the way the app does.


## 13.49.0 · 20 Nov 2026 · live HTTP proof, worker v4, dials made vs dials with an outcome

- `supabase/tests/live_http.sh`: 24 checks with curl against the live project and a throwaway room: key and device-key access through the real gateway (the `x-warroom-device` header reaches the policies), enrol, queue → wake → worker → note (backup and brief ran in under 25 s), lock, unlock, revoke, audit, worker refusing a call with no secret. All passed.
- **Mistake caught in the same run:** the throwaway room became the newest row that has `days`, which is exactly what every scheduled task looks for. It was renamed to `staging-…` with the 2000-01-01 stamp about three minutes later; no scheduled task fired in between (checked against their schedules). The script now carries the cleanup as a mandatory step. Left over and inert: one `staging-verify…` row, one revoked device, one `verify-scratch` backup row, a few job and audit rows for that room.
- **Follow-up worth doing with Egor present:** a server function that returns the owner's room, so no task depends on "newest row". It needs a migration and then an edit to every task prompt.
- Worker version 4 deployed: calls reported from outside are added first, then the day counter can only raise a day's total (max), so nothing is counted twice; the brief names counter-only presses.
- App: `finish.js` section 8 rewritten. Scorecard Dials = dials made (records + outside + counter-only presses); Mission Control evidence, funnel and bottleneck still use records only (13.24 rule, legacy tests untouched). This closes the open question by purpose rather than by picking one rule: volume against the 350 target, records for conversion.
- Real devices: both the phone and the laptop were seen on 13.47.0 after the server went live and have synced by sync code (4 audited writes). No device key enrolled yet.

### 20 Nov, 11:30 · scheduled tasks, after 13.49.0

- **Content discovery** (`trig_011Mga…`): renamed "daily scan"; text now says it runs every day (it still said weekly, Monday); "most days 0–2 new items, nothing new is a good answer"; skips anything already in the app's own `sources` so a daily run cannot re-propose yesterday's finds.
- **System check 04:41** (`trig_01BYJ4…`): strict room lookup; BAC line corrected ("pass, average not lower than 7"); two new checks. Check 7, *one War Room*: counts the rows that are not `staging-`, not `share-` and have no colon; more than one becomes the first line of the note and of the push, and that run reads the row with the most days instead of the newest. Check 8, *server*: failed jobs in the last 24 hours, a finished `backup` job after 02:55 today, and failed cron runs. So the 03:00 backup is now verified every morning by something other than me.
- **Deliberately not edited:** Weekly review, Close the day, and the paused 06:00 brief still exclude only `staging-`. Today that picks the same row as the strict lookup (share rows carry the 2000-01-01 stamp), and "strict" would not have protected against this morning's throwaway-room mistake either. The real fix is one server function that names the owner's room, then one pass over all fifteen prompts: it needs a migration, which needs Egor's tap in Supabase. Until then check 7 is the tripwire.
- The app note "what needs you" was brought up to 13.49: the dial question is marked settled, the live proof is named.
- Seen while listing the tasks, not War Room work: the Acvila attendance task's last recorded run (19 Nov 20:10) has the status ABANDONED. Not investigated.


## 13.50.0 · 20 Nov 2026, 12:40 · the device key had been sharing a storage slot

Egor asked Claude to enrol his laptop itself. Done from his real Chrome (Claude in Chrome), app on 13.49.0, real data. The server recorded the device (12:35:25, seen 12:35:32). Seconds later a read with the device key alone returned nothing: the key was no longer in the browser.

- **Cause:** `server.js` kept the key in `localStorage['wr-device']`; `devices.js` (older) keeps this device's id and name in the same slot. `svTokSet` overwrote the identity; `devInfo()` then found no `id`, created a new identity and overwrote the key. Result: key lost, and a second "Windows (laptop)" in the devices list.
- **Why no test saw it:** `test_1343` enrolled against a fake server and never called `devStamp()` afterwards; the live HTTP proof used curl, which has no `devices.js`.
- **Fix:** the key lives in `wr-devkey`. New check in `test_1343`: enrol, sync-stamp, both the key and the same identity are still there.
- **Clean-up on his laptop:** identity put back to the earlier id, the two-minute-old duplicate entry marked deleted, the orphaned server key revoked through the app's own revoke call. Lock was never on.

### 20 Nov, 12:35–13:00 · first real device, owner function, three tasks switched

- **Laptop enrolled for real** (his Chrome, 13.50.0, his data): the key survives a sync stamp, the app's requests carry it, a read with the device key alone returns his 10 rows, a broken key 0, no header 0. A backup job queued from the laptop's own screen ran (12:53). The lock is still off: the phone is not enrolled.
- **Checked on the same real device:** 16 screens (water, people, missed training, compare scenarios, about me, vault, new-situation question, scorecard, evolution, proof, server, inbox, where-do-I, and four more) open on his real data with no error and no "undefined / NaN" text. His error log holds one entry, a failed service-worker update fetch on 13.47.0.
- **Migration `warroom_server_v1_owner` applied** (file in `supabase/`): `warroom_config.owner_room` + `warroom_owner()`. Closed to the browser roles (HTTP call with the public key: 401, permission denied).
- **Tasks now using `warroom_owner()`:** Sheet sync (the only one that copies data INTO the room), Dial Guard, Acvila attendance. **Still on "newest row":** Morning brief 05:03, Nightly review, Sunday audit, Bench Bulletin, Content discovery, Curriculum review, System check (it has the one-War-Room tripwire), Weekly review, Close the day, Monthly archive, paused 06:00 brief. Each needs its whole text re-sent; do them a few at a time.
- **Acvila attendance task:** it is tied to his computer. After the text change the reply showed it switched off with the reason "device absent"; switching it on again worked and the reason cleared. Its last recorded run (19 Nov 20:10) is "abandoned". Worth watching tonight.
- If the sync code is ever changed on purpose: `update warroom_config set v = <new id> where k = 'owner_room'`.


## 13.51.0 · 20 Nov 2026, 13:20 · twelve roles

- `agents.js`: packs `bench` (counts by status and town, consent gaps, waiting applicants, agencies with a case), `know` (library by claim class and tier, finished against used, open requests, link kinds), `auto` (automation rows). Roles `recruit`, `curator`, `research`, `ops`. Routing words added after the existing ones, so earlier routes still win.
- `test_1342`: twelve roles; packs exist; a planted name and phone number do not appear in a pack; new and old questions route correctly.
- **Pending Egor's tap:** migration `warroom_server_v1_closed` (file in `supabase/`). It asked him to confirm in Supabase and timed out after 120 s. NOT applied, and not run any other way. It closes creation of new rooms once an owner room is named, which makes the "newest row" lookup safe for every scheduled task without rewriting eleven prompts.


## 13.52.0 · 20 Nov 2026, 13:50 · fidelity map, source disagreements, AI use

- New file `fidelity.js` (loaded last). `fmRows/fmNext/fmOpen`: seven domains from the records that exist, no overall percentage. `cxAll/cxOpen/cxSave/cxSet`: `S.boot['cx:<id>']`, statuses open / a / b / both; the Knowledge Curator's pack now carries the counts. `auLog/auAdd/auSum/auOpen`: wrapper on `aiText` (flag `_au`), `localStorage['wr-aiuse']`, 60 days kept, never synced; tokens are length divided by four and labelled as an estimate.
- This is also the first piece of the addendum's "Personal Model Fidelity Map" (its section 4.2) and "Intelligence Gap Engine" (section 15): coverage, freshness, kind of evidence, resolution, unknowns, next best information. Not yet there: predictive validation per domain, consistency between sources, cost of obtaining each piece.
- `tests/test_1352.py`: 21 checks.
- `release.py` did not add the new script to `index.html` (it only handled `sw.js`); added by hand after `range.js`. Do the same for the next new file.


## 13.53.0 · 20 Nov 2026, 15:25 · repair of 13.52.0

- `fidelity.js` defined `fmOpen` and `cxOpen`, which already exist (`defense.js`, `expand.js`); loaded last, it replaced both screens. It also kept its records under `S.boot['cx:…']`, which `capability.js` uses. Renamed to `fdm*` / `sdx*`, store `sdx:<id>`. 13.52.0 was live from about 15:18 to 15:27.
- Cause in the process: the duplicate-name check was chained AFTER `git commit && git push` in one command. **Rule: run the duplicate check and stop if it prints anything but `cmOpen endSession renderStats startSession`, before committing.** Also grep a new file's boot-key prefixes against the others.


## 13.54.0 · 20 Nov 2026, 16:00 · Communication, increment 1 (`speak.js`)

Brief: `/mnt/user-data/uploads/356a7c9c-attachment.txt` (16 parts). This increment is the end-to-end loop its Part 16 asks for first.

- **Built and tested (28 checks, `tests/test_1354.py`, AI is a stand-in):** 15 exercises (domains A–E × levels 1–3, Romanian with diacritics and English); language toggle remembered (`spk:cfg`); `spkNext` picks a reported real-life moment first, then the dimension the coach kept naming (needs 2 mentions in the last 8 coached attempts), then the least-practised domain; level rises only after three coached attempts in the domain all average 7 or more; attempts `spk:a:<id>` with counted facts (words, sentences, fillers, linking words, repeats); coach output validated by `spkValidate` (quote must be in the transcript or the point and the score are dropped; anything about pronunciation, accent, pace, intonation or voice is removed; at most 2 breakdowns, 3 words, one priority); second attempt linked by `prev`; words `spk:v:<id>` kept on tap, intervals 1/3/7/16/35 days, "known" after four productions in a row; `spkObs` real-life capture; `spkObsSave(true)` cross-language "how do I say it" (idea, not word for word); separate Romanian and English profiles, no combined score.
- **Speech:** the browser's `SpeechRecognition` (`ro-RO` / `en-US`), started and stopped by tap, state always shown, consent screen first (in Chrome the audio goes to Google; War Room gets text only). No recogniser → typing. **Not tested with a real microphone anywhere.** Whether the Android shell's WebView offers `SpeechRecognition` is NOT known; if it does not, the keyboard's own microphone is the fallback.
- **Not built (parts of the brief still open):** 5.3 conversation simulation; 5.4 "explain it differently" as its own five-step exercise (d3 is a one-shot version); audio recording, playback and retention (5.2); levels 4–6 (Part 9); bilingual-switching and cross-language as session MODES (4.1 has four modes; two languages plus the "how do I say it" helper exist); the 20–25 minute five-block daily session (5.1); progress charts and searchable history (Part 11 D/E: there is a recent list and per-dimension averages); regression detection (8.10); grammar-pattern spaced repetition (only words and expressions); real coach quality with a real key (untested).
- Rule kept: it ranks nothing and adds no candidate to Mission Control.


## 13.55.0 · 20 Nov 2026, 16:25 · enrolling a device had broken its AI

- Found by running a real coach call on Egor's laptop (his key lives on the server: `aiCfg().server`). `aiNet` and `aiProxy` (food.js) sent `hdr()` to `/functions/v1/warroom-ai`; since 13.43 `hdr()` adds `x-warroom-device` on an enrolled device; the function's CORS list does not include it → pre-flight fails → "Failed to fetch". Dead from 12:53 (enrolment) to this release.
- Fix: `fnHdr()` = `hdr()` without the device key, used for both function calls. Check added to `test_1343`.
- **Before the lock is ever switched on:** read the `warroom-ai` function (its source is not in this repo) and see how it authorises a room. If it reads `warroom_sync` with the sync code under row security, the lock would shut the AI out; it would then need to accept the device key (and list the header in its CORS reply).
