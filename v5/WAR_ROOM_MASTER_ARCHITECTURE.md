# War Room · master architecture (13.60.0, 19 Nov 2026)

**This is the one current architecture document.** It describes `main:v5/` as deployed. `ARCHITECTURE.md` keeps the
Build Gate, the runbook and history only. `IMPLEMENTATION_LOG.md` is the per-release record; `NEXT_PHASE_ROADMAP.md` is what is open.
Written from a read of the code and the live synced data on 19 Nov 2026 (audit: Claude doc "War Room 13.31.1 · whole-system coherence audit").

## 1. Shape

- Plain JavaScript, no build step, offline-first PWA. 88 scripts loaded in order by `index.html`; `sw.js` caches the shell.
- State: one object `S` (`core.js`) in `localStorage`, synced to one Supabase row per sync code (`warroom_sync`), merged per record.
  The call queue and the caregiver bench are separate documents and separate rows (`<code>:queue`, `<code>:bench`).
- Authoritative source: branch `main`, folder `v5/`. GitHub Pages deploys from `main`. Branch `v5` is a mirror with old extra files; nothing deploys from it.
- Navigation: four hubs (Day · Work · Money · You) and the + sheet (`shell.js`). Day (`arc.js`) is the only home.

## 2. Lifecycle and owners

| Stage | System | Owner | Source of truth |
|---|---|---|---|
| Direction | Season, priorities | `mission.js` | `settings.season` |
| Direction | Goals | `core.js`, `ops.js` | `goals` |
| Direction | Life direction; strategy A/B/C; assets | `reality.js`, `strategy.js` | `reality`, `opps`, `assets`, `settings.strategy` |
| Reality | Call queue, call log | `dial.js`, `ledger.js` | queue row |
| Reality | Pipeline, bench | `pipeline.js`, `crm.js` | queue row, bench row |
| Reality | Day: counters, blocks, sleep, food, mode, energy | `core.js`, `night.js`, `food.js`, `expand.js` | `days` |
| Reality | Calendar (read-only feed) | `calendar.js` | Google Calendar |
| Reality | Tasks (two-way) | `todoist.js` | Todoist; copy in `tasks` |
| Reality | Money | `money*.js`, `wealth.js`, `keep.js` | `txns`, `accounts` |
| Reality | Training | `train.js`, `trainlog.js` | `programs`, day record |
| Reality | Market evidence, owner answers | `strategy.js`, `blueprint.js` | `obs` |
| Understanding | Stage, bottleneck, insights, signals | `stage.js`, `engine.js`, `intel.js`, `strategy.js` | derived from the call log |
| **Prioritization** | **Mission Control** | **`mission.js` · `mcBuild()`** | derived; pick, skips, done, expected/observed in the day record |
| Planning | Day plan, replanning | `guide.js`, `adapt.js` | day blocks |
| Planning | Campaigns | `ops.js`, `expand.js` | `campaigns` |
| Execution | Dialer, training player, timers | `cockpit.js`, `body.js`, `flow.js` | write to the records above |
| Execution | Learn session (the one timed learning planner) | `learnx.js` · `lxBuild()` | `boot` keys `lx:cur`, `lx:log` |
| Evidence | Lessons, memory | `bootcamp.js`, `mastery.js` | `lib/cards.json`, `boot`, `cards` |
| Evidence | Capability evidence (the one capability record) | `capmap.js` | `boot` keys `cx:` |
| Evidence | Company operating system | `opsys.js` | `settings.opsys`, Playbook pages |
| Evidence | Decisions, predictions | `judge.js` | `decisions` |
| Learning | Library, research | `content.js`, `kpipe.js`, `research.js` | `lib/sources.json`, `sources`, `content`, `research`, `inbox` |
| Learning | Blueprint (a view, not a store) | `blueprint.js` | derived from the capability map and lessons |
| Adaptation | Weekly, season, strategy reviews | `mission.js`, `reality.js`, `strategy.js`, `cohere.js` | `reviews`, `settings` |
| Capture | The + sheet, Unprocessed | `shell.js`, `cohere.js` | `boot` keys `cap:` plus the owner's record |

## 3. Recommendation flow: one authority

`mcBuild()` is the only function that ranks what to do now. Order: tier (0 fixed commitment or sleep · 1 season priority ·
2 protected commitment · 3 maintenance), then urgency. Your pick, skips and reasons are kept per day.

Candidates built inside `mcBuild`: sleep, fixed commitment, dials, dial prep, BAC floor, training, recall, weekly review, recovery.
Candidates supplied through its hook `lxCandidates` (`expand.js`, extended by `cohere.js`): money (money lens), campaign next action,
follow-up (`command.js` radar, minus today's callbacks), corrective action for a fallen answer rate (`strategy.js` signal, with the
lesson for `b-cold`), next company-OS step (`opsys.js`, tier 2), oldest overdue task (tier 2, low urgency), one Learn candidate
(`learnx.js`; tier 3, or tier 2 while your weekly personal minimum is unmet).
Facts and risks only, never candidates: `stage.js`, `engine.js`, `reality.js` (`lxAugment`), `expand.js` (`exAugment`),
`strategy.js` (`stAugment`), energy (`cohere.js`: two low readings propose a Minimum day).

Specialist "next" functions that stay local: next call (`dial.js`), next lesson (`bootcamp.js`), next capability (`capmap.js`),
next exercise (`trnow.js`), next research (`research.js`), next block on the timeline (`guide.js`).
"I have N minutes" on the Day card (`cohere.js` `coFit`) filters `mcBuild`'s list for what fits before the next fixed
commitment. A learning answer is passed to `lxBuild`. There is no second planner.

## 4. Learn

One planner, `lxBuild(min, focus, opt)`. The Library's old time prompt (`ccPlanOpen`) and the 25-minute capability mission
(`cpMissionStart`) open it; a capability mission already in progress still opens its own screen. Step kinds: lesson, review,
rebuild, practice, mission, apply, consume, debrief. Each runs the component that owns the record.
Which track a session serves (`lxDomain`): your weekly personal minimum if set and unmet (`settings.learn.persMin`) → a
capability the current business stage needs with weak evidence → a personal competency marked NOW → the business path.
No turn-taking. Until a minimum is set, nothing guarantees personal sessions and the Learn screen says so.

## 5. Ladders

Lesson: `BC_RUNG` (`bootcamp.js`). Capability: `CM_PERF` evidence in `capmap.js` is the record; the Blueprint's eight stages
are a display of it, and a stage set by hand with proof is also written as capability evidence. Business step: `OS_ST`
(`opsys.js`); knowledge-to-execution statuses (`KX_ST`) point at those steps. Resource: `KP_ST` (`kpipe.js`); `CC_CHAIN` is its display.
Known leftover: `CP_ST` in `capability.js` is an older per-capability state still used by that file's own screens.

## 6. Feedback

Marking a mission done asks expected vs observed (`day.mcDone.exp/.obs`) and states whether the logs agree (`mcMet`).
The weekly review lists each day's mission as marked / evidence in the logs / outcome written, needs one change to be
saved, and can put that change on Monday's tasks. Decisions, campaigns and experiments are created only by you.

## 7. Automation (also shown in Operator → Automation)

Runs alone: weekly content scan (Mon 07:37), monthly curriculum review (1st), Dial Guard push, cloud sync, calendar feed,
Todoist sync when connected, import of scan notes when the app opens. Needs a tap: Research now, video inspection, the
real-phone checklist. Blocked: daily research (schedule change not approved).

## 8. Tests and release

Suites (Playwright, system Chrome, throwaway profile, cloud blocked): `tests/run.py` (legacy), `test_1326.py`, `test_1327.py`,
`test_1331.py` (Learn scenarios A–G), `test_1332.py` (whole-system journeys A–H), `test_1333.py` (twelve usability journeys). None is a real-phone test.
Release: bump `APP_VERSION` (`core.js`), cache name and shell list (`sw.js`), `?v=` (`index.html`); changelog row in
`playbook.js` with the dial count at the time; log entry; all suites; commit to `main`; verify the live cache name.

## 8b. Finding your way (13.33)

`wayfind.js` holds the one list of everyday activities and their homes (`WF`) and what each screen is for (`WF_SCREEN`).
It is a navigation aid: it never ranks. Entry points: Day mission card, the ⌘ palette, the ? at the top of each screen.
The top-right + and the bottom + open the same capture sheet. Operator tiles are grouped by purpose.

## 8c. Reality in, reasons out (13.34)

`depth.js` adds no candidate and ranks nothing. It wraps existing functions:

- `mcDialLog()` also counts `S.days[k].ext[]` (calls made outside the app, entered by you: `{id,d,c,o,cu,ou,src,note,at,del}`). Everything downstream (`mcDialEvidence`, `mcWeek`, `stFunnel`, the dial mission) reads them through that one function. `cu`/`ou` = "not counted". The Day card states how many of today's dials are your report.
- `mcSkip()` asks why (`DX_WHY`, eight reasons) and stores `why` on the skip entry. `dxWhyWeek()` feeds the weekly review (`coWeekHtml` wrapped) and the monthly review.
- `scRows()`/`scOpen()`: the weekly scorecard. Rows read `mcWeek`, the pipeline, the bench, the Learn log, energy checks and tasks. Targets only from your weekly goals. Money is left off (currencies are not summed there).
- `gcRows()`/`gcOpen()`/`gcEdit()`: goal completeness. Writes only `why`, `start`, `next` on the one goal you edit.
- `mbMonth()`/`mbOpen()`: business (income "agency", spending "business") apart from personal, three months. `S.settings.mnTaxPct` is unset until you set it.
- `mrOpen()`/`mrSave()`: monthly review in `S.boot['mr:YYYY-MM']`; offered from the weekly review in the last week of a month.
- `dxReviewIds()`: the Learn recall step takes lessons answered wrong first, then due ones, interleaved by module.
- `wfTour()`: six-line tour. `DX_OFF` disables the skip question and the Day-card link.
- 13.35: `beData()`/`beStuck()`/`beOpen()` (28-day funnel; rates only above `BE_MIN` samples; the stage where it stops), `bwData()`/`bwOpen()` (weight trend and needed pace per weight goal; never chooses between targets), `qrOpen()`/`qrSave()` (quarter in `S.boot['qr:YYYY-Qn']`). All read-only views except the review text. None adds a Mission Control candidate.
- 13.36: `dxBillCand(X)` supplies ONE candidate (`k:'bill'`, tier 3) through the existing `lxCandidates` hook when a planned outgoing payment is due or overdue. `mcBuild()` ranks it like any other.

## 8d. Decisions applied on 19 Nov (13.37)

- BAC floor: average not lower than 7 (Egor, 19 Nov). Starter goal, Playbook, campaign template and assistant prompt agree.
- Personal learning: `S.settings.learn.persMode = 'need'` ("as much as needed"). `lxPersUnder()` then returns `{need:1}` only when the week has no personal minutes AND `lxPersWaiting()` finds a personal NOW competency with an unopened lesson or a personal lesson due for recall. A number in `persMin` still takes precedence.
- Starter goals carry `seed: 1`. `merge()` drops a seeded local goal when the cloud already holds a goal with that title (live or deleted), or any BAC-pass / November-weight goal. Goals you create are never dropped.
- Cloud: goal cleanup and row archive were done with SQL after copying the main row and each removed row into `warroom_backup` (RLS on, no policies). Restore = copy `data` back from that table.
- The legacy test suite no longer reaches `warroom_sync` (it used to leave a real test row behind, which could be picked up by scheduled-task lookups that order by `updated_at`).
- Scheduled tasks: the Acvila attendance task finds the row inside its query (largest main row); no literal id in its text. The discovery scan is still weekly: the write to make it daily was refused by the permission system.

## 8e. Learning proof (13.38, `proof.js`)

Wraps the recall engine; plans nothing. `msGrade` → `rlog` (`[day, card, grade, level]`, last 400) and `mis:<card>` (last 3 wrong answers). `msShow` → level 2 prompt when `bcRung(id) >= 3`; after the confidence step the card shows trap/move (level 2), the last miss, and "Connect it". `pfWeak()`/`pfOpen()` = missed, fading (`msBand`), finished-never-tested, weakest module; `cpRecallSet(pfWeakIds())` starts the recall. `ln:<card>` holds two-way links. `dxReviewIds` also pulls two never-tested lessons into the Learn recall step. `dxWhySet(…,'skill')` → `S.research` record with `src:'skip'`. `scRows` gains recall accuracy and recalls waiting. `pfLadders()` explains the four ladders: lesson idea (`BC_RUNG`), competence (`BP_ST`), stage capability (`CM_PERF`), company process (`OS_ST`). `CP_ST` is only a colour bucket inside capability.js; its labels are not shown anywhere.

Stage 8 cleanup: 33 top-level functions with no reference in any script, the HTML shell or the lesson data were removed by parser range (three passes). `nova.js` stays loaded: six of its functions are still referenced from eight files. Modules that only hook in through wrappers were not touched.

## 8f. Domain depth and getting around (13.39, `domain.js`, `ux.js`)

`domain.js` (ranks nothing): `saveOwner` wrapped → `slWhyAsk` when the talk ended in status `no` (`log[].why`, `item.lostWhy`), then the owner-answer capture; `slWhyStats()`. `pdWeek()` = `dialTargetFor(day)` against `mcDialLog()`. `ecData()`/`ecOpen()` read `members()`, `PLANS`, `trials()`, `placements()`, the ledger (`mbMonth`, `mnTx`), call durations and the bench; `D.miss` names what cannot be measured. Goals gain `kind`, `prio`, `ms[]`, `review` (edited one goal at a time; `gcOpen` shows the attention split). `bwSuggest()` reads training gaps and bedtime spread. `mrSave` adds one task for the month's change; `mrOpen` asks whether last month's happened (`kept`). `DM` + `dmOpen(id)`: nine areas, each with purpose, reality, goals, Mission Control's candidate for that domain (`mcLast.C`), homes, scorecard rows, what to do when it slips.

`ux.js`: `NB` back handling (`popstate` → sheet, drive mode, Learn sub-screen, previous screen, Day; a guard history entry is re-armed on every `show`/`openModal`). `UX_FLOW` + `wfFlow(id)`: five workflows whose steps are wayfinding ids. `wfTour` with "Show me". `wfKinds()`.

## 8g. 13.40

- `lxPersMigrate()` (learnx.js, runs at load): on a device with a sync code and no recorded choice, sets `settings.learn.persMode = 'need'` once (`S.migrations.m20261119learn`). "No guarantee" is now stored as `persMode: 'none'` so it is a recorded choice. Lesson learned: a cloud-side edit of a `settings` field did not survive a device sync within the hour; settings must be changed on a device, where the merge base is correct.
- `cgOutcome(id,'no')` wrapped → `cgWhyAsk` (`CG_WHY`, `item.dropWhy`); `cgWhyStats()` shown in `ecOpen()`.

## 8h. One model of reality (13.41, `entity.js`)

Read model over existing stores (ADR-002). `EN_SRC` has one adapter per type (goal, task, project, decision, risk, experiment, opp, fact, journal, agency, candidate, lesson, cap, comp, source, research, process, asset, review, protocol) → `{ref, type, title, status, at, upd, origin, conf, rel[], home}`. `enAll()` caches 4 s and makes relations two-way. `enFind`, `enOpen`, `enSearch`. Event log `evLog/evAll/evFor` in `S.boot.evlog` (last 300), fed by wrappers on `gcSave`, `mrSave`, `qrSave`, `dxSave`, `slWhySet`, `lxPersSave`, `logCall`. `rcRun()` = reconciliation (read-only). `rbData()/rbOpen()` = reality brief. `hxNote/hxErrs/hxStore/hxData/hxOpen` = health; errors live in `localStorage['wr-errlog']`. Usage counts in `localStorage['wr-use']` (`uxUse`, `uxUnused`). `yrOpen/yrSave` yearly review in `S.boot['yr:YYYY']`. `uxTourAuto()` opens the tour once on a device with a sync code.

Mission documents: `WAR_ROOM_EXECUTION_STATE.md` (resume here), `ARCHITECTURE_DECISIONS.md`, `VISION_COVERAGE.md`, `INVENTORY.md` (generated).

## 8i. Strategy, scenarios, roles, evolution (13.42)

`future.js`: `bkOpen/bkSave` store `goal.plan = {measure, must[], caps, res, obst, unknown, assume}`; `ocData/ocOpen` build the chain (season priority → goals by attention → `dep` → tasks with `task.goal`); `ocTaskSave` links a new task. Scenario model: `smSeed()` takes only measured or planned values (thresholds `BE_MIN`), `smCalc`, `smCases`, `smNeed`, `smWeak`, `smExp` (draft in `S.experiments`, `src:'scenario'`), saved in `S.boot['sm:<id>']`. Options in `S.boot['opt:<id>']` (`OP_Q`, no score). Decisions, predictions, calibration, red team, pre-mortems: unchanged in `judge.js`.

`agents.js` (ADR-006): `AG_PACK` (deterministic briefings), `AG` (8 roles: name, job, packs it may read, kinds it may propose), `agSystem`, `agRoute`, `agValidate` (shape check, contract filter, markup stripped), `agRun` (max one AI call; `agRun('red', q, answer)` is the one optional second), `agApprove/agDismiss` (records are created only here, through `addTaskAuto`, `S.research`, `coCapNew`, `jlDecEdit`), `aglog` in `S.boot` (last 80), daily cap `settings.agCap` (default 15). `evoRecs`, `evoTrend`, `evoOpen`: evaluation, read-only.

Look: `graphite` allowed in `unify.js` (`lookGet`, `setAppearance`, appearance card); variables in `monolith.css`.

## 8s. The server (13.43.0; written and proven locally, waiting for one confirmation)

```
 phone / laptop (app closed or open)            Supabase project
 ┌─────────────────────────┐     RPC      ┌──────────────────────────────────────────┐
 │ server.js  Server screen├─────────────▶│ warroom_enqueue / _jobs / _devices / …   │
 │ hdr(): key (+device key)│              │   warroom_job  (queue)   warroom_schedule │
 └───────────▲─────────────┘              │        ▲ claim/finish        │ every 10 min│
             │ sync: inbox note           │ warroom-worker (edge fn) ◀───┘ pg_cron→tick│
             └────────────────────────────┤   brief · quality · research · role · backup│
                                          │   writes ONE note → warroom_sync.data.inbox │
                                          └──────────────────────────────────────────┘
```

- Files: `supabase/warroom_server_v1.sql`, `supabase/warroom_server_v1_policies_cron.sql`, `supabase/functions/warroom-worker/index.ts`, proofs in `supabase/tests/`.
- Authority: the worker can read a room's synced document, leave a note, take a backup. It cannot create, change or delete a record. Suggestions travel as `WR-PROPOSE` and go through `agApprove` after a tap.
- Access: the sync code keeps working exactly as before. A device key (`x-warroom-device`, stored hashed) is a second way in. `warroom_lock(true)`, callable only by an enrolled device, makes the code alone useless; `warroom_lock(false)` undoes it.
- `mcBuild()` is untouched: nothing on the server ranks or recommends inside the app.

## 8v. The vault (13.44.0; opt-in)

```
 app (merge, screens)      vault.js (fetch wrapper)            server row
 S.journal, S.txns … ───▶ seal: stores → {} + vault{iv,ct} ──▶ journal:{}  vault:{…}  days, tasks, goals … (readable)
 ordinary document   ◀─── open: vault → stores           ◀──
```

- Stores sealed: journal, txns, accounts, mplan, reality, decisions, risks, wassets, wsnap, boards, protocols.
- Key: derived from the passphrase on the device; kept in that browser's storage; never synced. `settings.vault` holds only `{on, salt, check, at}`.
- A device without the key keeps its own copies, syncs everything else, and passes the block through unchanged.
- The server worker and Claude's scheduled tasks read none of the sealed stores.

## 9. Known gaps

- Goals: duplicate-looking records and no link to campaigns (no campaigns exist). Cleanup needs your approval.
- More than one main-type row and three queue rows exist in the cloud; which devices use them is unknown.
- One scheduled task holds a sync identifier in its prompt; a replacement is proposed, not applied.
- Retired home code (`nova.js`, parts of `ops.js`) still loads; `one.js` is live (`oneNight`, `oneGo`).
- `CP_ST` ladder not folded in. Money reaches Mission Control under the money lens, when a campaign names it, or when a planned payment is due (13.36).
- No real-phone test of 13.31 to 13.60. No role has been run against a real AI model by the build: the tests use a stand-in, so they prove the limits and the plumbing, not the quality of advice. The back button in particular behaves differently in an installed app than in a test browser and needs a real press.
- Outside calls are a daily total, not call-by-call: they cannot feed per-agency history, callbacks or owner discovery answers (the capture is offered once after saving).
- Body plan adaptation (the plan does not change itself from the trend), a focus protocol, tab renaming and a back-navigation audit are not built.
