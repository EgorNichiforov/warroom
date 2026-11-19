# War Room · master architecture (13.37.0, 19 Nov 2026)

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

## 9. Known gaps

- Goals: duplicate-looking records and no link to campaigns (no campaigns exist). Cleanup needs your approval.
- More than one main-type row and three queue rows exist in the cloud; which devices use them is unknown.
- One scheduled task holds a sync identifier in its prompt; a replacement is proposed, not applied.
- Retired home code (`nova.js`, parts of `ops.js`) still loads; `one.js` is live (`oneNight`, `oneGo`).
- `CP_ST` ladder not folded in. Money reaches Mission Control under the money lens, when a campaign names it, or when a planned payment is due (13.36).
- No real-phone test of 13.31 to 13.37.
- Outside calls are a daily total, not call-by-call: they cannot feed per-agency history, callbacks or owner discovery answers (the capture is offered once after saving).
- Body plan adaptation (the plan does not change itself from the trend), a focus protocol, tab renaming and a back-navigation audit are not built.
