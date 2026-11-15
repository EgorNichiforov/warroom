# War Room · architecture, status and runbook (14 Nov 2026, v5.12)

## 1. Map

| Layer | What | Where |
|---|---|---|
| Web app | Plain JS PWA, no build step, offline via service worker | `index.html`, `*.js`, `v5.css`, `sw.js` · published to GitHub Pages `/warroom/v5/` |
| Android | Capacitor shell that loads the live web app; native plugin `WrNative` | `native/android/...` · APK 1.2 in `main:download/WarRoom.apk` |
| Sync | Supabase table `warroom_sync`, one row per War Room (id = sync code), plus `:queue` and `:bench` rows | RLS: a row is readable/writable only with header `x-warroom-key` = its id |
| Server functions | `warroom-cal` (Google Calendar iCal bridge), `warroom-ai` (AI proxy, holds the key) | `supabase/functions/` |
| Server-only secrets | `warroom_secret` (AI key). RLS on, no policies: no browser can read it | migration `warroom_secret_table` |
| Scheduled tasks (Claude) | Morning brief 06:00, Sheet sync hourly, Close the day 20:40, Sunday review 10:40, Bench Bulletin Mon, applications alert | Claude Code Remote |

## 2. Areas (7.0)

| Area | Phone tab | Contains |
|---|---|---|
| NOW | Now | Commander's briefing, warnings, lockdown banner, recovery, open loops, orders, routines, shutdown (AI re-plans tomorrow) |
| OPERATIONS | Ops | Dialer + call queue (= CRM, one record per agency), follow-up radar, caregivers (bench), clients link |
| PERSONAL | Personal | Train · Food · Stats & body · Weight (chip bar on top), sleep in HQ |
| INTELLIGENCE | Intel | Overview, Next action, Funnel/bottleneck, Sales intel + objection library, Wargame, Campaigns, Decisions, Experiments, Day replay + evidence, Future Egor, Friction, Clients & money, Opportunity map, Search, Doctrine |
| Everywhere | ⌘ button or `/` | Universal Command: parse → preview → confirm → undo |

## 3. Implementation inventory

| Subsystem | Status | Notes |
|---|---|---|
| Daily log, habits, counters, XP, ranks with real gates | Implemented + tested | XP derived from data, daily caps, owners ≤ dials, Corporal gate 300 dials (tests/run.py) |
| Sync (merge newest `_u`, never delete) | Implemented + tested (merge) | Real two-device conflict test still manual |
| Call queue / CRM / radar / open loops | Implemented + tested | ~6,800 agencies; Tampa Bay sorted first |
| Commander's briefing | Implemented + tested | Deterministic; AI version = morning scheduled task |
| Universal Command | Implemented + tested | Regex parser first; AI fallback validated against an allow-list |
| AI key on server | Implemented + tested (mocked) | **Needs one real food photo + one recording on the phone** |
| Tomorrow planner, sleep tracker | Implemented + tested | Phone sleep guess needs APK 1.2 on the Asus |
| Campaigns, decisions, experiments, lockdown, recovery, doctrine, replay, wargame, future, friction, clients, economics, search, map | Implemented, smoke-tested | Value grows with data |
| Google Sheets ⇄ app | Hourly scheduled task (last 7 days) + one-time history import (Mar–Nov) | Not live two-way inside the app |
| Recording (Android) | Implemented earlier | Physical reliability on the Asus: manual test below |
| Screen time | Implemented earlier | Physical test on the Asus |

## 4. Security findings

| Finding | Severity | Status |
|---|---|---|
| Device link put the sync code (= full access) in `?query` → server logs | Medium | Fixed 5.10.4: `#fragment` |
| A shared AI key was stored inside synced data (readable with the sync code) | High (design) | Fixed 5.11: key lives in `warroom_secret`, calls go through `warroom-ai`. Checked 14 Nov: no key was in synced data |
| Sync code is a bearer secret (no accounts) | Accepted for now | Anyone with the code can read the War Room. Next step if ever shared with a team: Supabase Auth + per-user RLS |
| Anon insert allowed for any id ≥ 16 chars | Low | Can create junk rows, cannot read others. Two staging rows from 14 Nov imports remain (`staging-sheet-…`, `staging-leads-…`): delete with SQL when convenient |
| Recording of Florida owner calls | Rule | Never. Recorder keeps its consent prompt; sales intel reads typed notes only |
| Todoist token, Gemini key on "this device only" | Local storage on the device | Not synced |

## 5. Source of truth

| Data | Truth | Copies |
|---|---|---|
| Day log (habits, counters, money, weight, sleep) | `warroom_sync` MAIN row `days` | Google Sheet (hourly, app wins for last 7 days) |
| Agencies, calls, cases, clients | `:queue` row, one item per agency | Tracker sheet (one-way) |
| Caregivers | `:bench` row | — |
| Tasks | Todoist when connected; app copy when not | — |
| Schedule | Google Calendar (iCal read via `warroom-cal`); day overrides in `days[k].sched` | — |
| Campaigns, decisions, experiments, lockdown sessions, doctrine | `warroom_sync` (`campaigns`, `decisions`, `experiments`, `focus`, `doctrine`) | — |
| Derived numbers (XP, funnel, bottleneck, forecasts) | Never stored: recomputed from the above | — |

## 6. Deploy · rollback

- Deploy: commit on branch `v5`, then copy the app files into `main:v5/` and push (GitHub Pages serves `main`).
- Roll back the app: `git checkout main && git revert <publish commit> && git push` (each release is one commit).
- Roll back the AI proxy: delete function `warroom-ai`; `drop table public.warroom_secret;` The app falls back to a key on the device.
- Data: More → Backup → Export (JSON). Import restores it. The System status card shows the last export.

- **Look (5.13 MONOLITH):** visual only. Rollback per device: More → Appearance → Classic. For everyone: default `lookGet()` to `classic`. Spec: `MONOLITH.md`.

## 7. Tests

`python3 -m http.server 8765 &` then `python3 tests/run.py` (51 checks: XP, sync merge, radar/CRM, briefing honesty, AI routing + validation, link security, tomorrow planner, command, intel, lockdown, every screen renders).

## 8. Manual checklist · Asus phone (not testable from the cloud)

1. Install APK 1.2 (download link in More). Open War Room → More → System status: all green except what you never set up.
2. Food: take one photo → estimate appears (proves the server AI key path).
3. Recording: Ask → Record a talk (not an owner call) 2 min with the screen off → stop → summary appears. Then 20+ min (long upload path).
4. Screen time: More → Screen time → Allow usage access → numbers appear next day.
5. Sleep: next morning, HQ → Sleep shows bed/wake "from the phone".
6. Dial session: Ops → Start session: the screen stays on.
7. Command: ⌘ → "3 dials" → Confirm → Undo.
8. Second device: open the same War Room on the laptop; log 1 dial on each; both show 2 after sync.

## 9. Open decisions (need Egor)

- Staff Sergeant rank still requires "first 30-day trial"; the Founding Offer replaced trials. Change the gate to "first case taken"? (XP rules are not changed without approval.)
- Development-tax limit is 10% of logged work time (`S.settings.devTaxPct`).

## 6.5 · System layer (system.js, share.html)
- **Time machine:** a full copy (S + queue + bench) per weekday in rows `<code>:snap1`…`:snap7`, plus `:snapmanual` and `:snapundo` (state before the last restore). Written once a day when the app is open. Restore: More → Time machine.
- **Accountability link:** row `share-<random>` (no colon) holds a numbers-only summary; `share.html#share-…` reads it with the publishable key. Admin SQL that finds MAIN must also exclude `id like 'share-%'`.
- **Readiness:** computed from last night's sleep, bedtime, wake-ups, rating and yesterday's dials; never stored.
- **Nudges:** in-app toasts 5 minutes before and at the start of dial, BAC, training and company blocks.

## 7.1 · Life OS (life.js)
New view `#view-life` (sidebar "Life", phone: Personal → Life chip, NOVA: All systems). Tabs:
- **Score & roads**: `lifeWeek(monday, upto)` scores five areas (dials, BAC, training days, readiness, habits) → one 0–100 number + 8-week trend. `roadOf(goal)` gives every goal a Beeminder line (start → target by deadline; week goals by weekday) with days ahead/behind and the pace needed.
- **Day**: `blkStatus` marks each calendar block done/missed from logged numbers (dials, bac, deep, workouts); manual override in `day.blk[id]`. Shutdown: obstacles (`day.obst`) and tomorrow's top 3. 14-day kept-plan %.
- **Body**: EMA weight trend; `lfTdee` = adaptive TDEE from 21 days of intake + trend; recommended kcal toward the long weight goal (capped +0.5/−0.75 kg/wk), one tap to set Food's target. `lfNextSet` progressive-overload targets + Epley e1RM.
- **BAC**: mock tests (`S.lifeTests`, map) per subject vs targets → projected average; error notebook (`S.lifeErrors`, map) with re-checks at 1/3/7/14/30 days.
- **Focus**: `stopTimer` wrapped to record `day.focus[]` {at, mins, c, ok, plan}; 14-day stacked minutes, finish rate, best hour.
`lifeTests` and `lifeErrors` were added to the merge maps.

## 7.2 · ONE (one.js)
The app now opens on one full-screen overlay (`#one`, z 47): the current calendar block turned into one action plus one button (dials → Reactor/Ops, bac/agency → focus timer, train → session, anything else → Done). Between blocks it shows the next hard block and a countdown. After bedtime it shows only "Sleep." with Lights out. The footer shows the never-0 minimum and the chain $20k ← clients ← talks ← dials. It shows on launch and after 20+ min away, and stays hidden while asleep or while call capture is pending. Turn it off in Me → Appearance → Start screen (`localStorage wr-one`). It is also in NOVA under All systems → ONE.

## 8.0 · Engine (engine.js)
This design came out of a neutral first-principles prompt to ChatGPT (Think), Grok and Perplexity. All three converged on the same answer: an execution engine, not a dashboard. New tab Life → Engine (now the default Life tab):
- `enBottleneck()` ranks dial volume against plan, the CRM funnel `bottleneck()`, BAC minutes, training days and readiness. The weakest one gets the week.
- If-then protocols (`S.protocols` map, triggers in `EN_TRIG`) are pre-committed responses. The first firing one shows on ONE with its action button; `day.protoDone` dismisses it for the day.
- `enReplan()` rebuilds the rest of today: remaining dials, BAC and training are placed into free gaps around the fixed blocks (dials after 16:00, when Florida opens). It is stored in `day.replan`, and ONE follows it via the wrapped `oneNow`.
- `enSimModal()` is the commitment simulator: the overlap of a new commitment with dial, BAC, deep-work, training and sleep minutes per week, plus the dials and MRR it costs.
- `enBoard()` is the weekly board meeting (5 steps). It is stored in `S.boards` keyed by the Monday date and suggested on ONE on Sundays.
- ONE shows ≈ $5 of MRR per dial (`EN_PER_DIAL`) and a "Replan the day" link.

## 9.0 · ARC (arc.js): the day is the app
ARC is the new main surface (`#arc`, z 46), on by default (`localStorage wr-arc`). It replaces ONE as the start screen; `oneShow` is wrapped to open ARC instead.
- **The line:** today's blocks on one vertical rail. Past blocks are folded under "Earlier today" with honest ✓/✗ stamps (`blkStatus`). NOW is the hero card (ONE's action, a firing if-then protocol or the Sunday board meeting, a running timer). Future blocks sit below. It follows `day.replan`.
- **Contract:** this week's board-meeting outcomes and its rule sit at the top.
- **Log:** one sentence (`arcParse`): "12 dials 1 owner bac 45 76.4kg ate 900 deep 50", plus quick +1 buttons.
- **Rooms:** every old screen is behind one door (`arcRooms`). Leaving shows a "Day" pill to return. ARC also comes back after 20+ minutes away.
- **Sun phases:** paper (wake–17:00), dusk (17:00–bed), night (only "Sleep." + Lights out + tomorrow's first block).

## 9.1 · Training log (trainlog.js) and honest training counts
- Fix: Life (7.1), Engine (8.0) and ARC (9.0) counted any session object as training, including the empty shells `curSession()` creates when the Train screen opens. All of them now use `dayTrained(o)` (a session marked done).
- New view `#view-trlog` (Personal → Training log; ARC Rooms → Training log):
  - This week's count, with the rule spelled out.
  - A calendar grid with ✓ trained / ✗ missed / – skipped / ○ planned; days before the first logged data show as "before tracking".
  - Last 3 weeks of sessions.
  - Day sheet: planned blocks (Did it / Not this day / Unschedule) and sessions (Mark done / Edit / Delete with tap-twice confirm).
  - Log a session on any date (including the past), edit it, or move it to another date.
  - Schedule: a one-off block via `dayOnce(d).add`.
  - Clean up empty shells (tap twice).

## 9.2 · Money (money.js)
Based on YNAB (reconcile), PocketGuard ("In My Pocket" safe to spend), Monarch/Copilot (cash flow, recurring, month review) and Wallet by BudgetBakers (manual multi-currency accounts, planned payments, forecast).
- Data: `S.accounts` (cash/card/savings/owed; MDL/USD/EUR), `S.txns` (in/out/move/count), `S.mplan` (planned/recurring). All three are merge maps. Rates live in `S.settings.fx`, the monthly savings goal in `S.settings.mnSave`.
- Balance = last count + flows after it (`mnBal`). A count records `diff`, the unlogged money since the previous count; Reports totals the leak.
- Safe to spend until month end = spendable (non-savings) + planned income − planned payments − savings still to move; also shown per day.
- Forecast, 60 days: balance + planned occurrences − average discretionary spend over the last 30 days.
- Legacy: the old per-day `o.money` fields migrate into the ledger (deterministic `lg-<day>-<cat>` ids). `setMoney` is wrapped, so quick spend, the HQ money card and the command bar write the ledger, and `mnRecalcDay` keeps `o.money/income/spent` derived for the old screens.
- Quick entry `mnParse`: "spent 120 taxi", "+750 tennis", "45$ claude", "… card". It also works from ARC's Log sheet.

## 9.3 · Adapt (adapt.js): the plan bends to the real day
Every change is a one-day override (`dayOnce(d).skip/add`); the weekly plan never changes. "Undo all changes for today" deletes `day.sched`.
- `adFixed(b)` decides what never moves: school periods ("1. …"), lessons he teaches (Grup/lesson), tennis practice, dial blocks (Florida window), travel and sleep.
- **Woke up late** (`adShiftPreview/adShift`): movable morning blocks are refit into the window before the next fixed block, by priority BAC → breakfast → training → company → routine. Whatever doesn't fit opens "Rebuild the rest of today" (`enReplanModal`).
- **Block sheet** (ARC tap): Done/Missed, move to a time, +30 min/+1 h/+2 h, Skip today, and for training blocks "Trained at another time" (`adTrainAt` logs a done session at the real time, so it counts).
- **Change sheet** (ARC footer "Change", ONE "Change today"): woke up late, trained at a different time, add a block, rebuild the rest of today, undo all.
- **Say it** (ARC Log, `adSay`): "woke up 7:10", "move bac to 18:00" (warns if it overlaps a fixed block), "skip gym", "add walk 17:00 30", "trained 17:30 45".

## 9.4 · Money v2 (money2.js) + App lock (lock.js)
**Money v2** replaces `mnOver/mnTxTab/mnPlanTab/mnRepTab`.
- Chart toolkit: `mcLine` draws animated, scrubbable SVG line charts (drag to read values, `mcScrub`); `mcCount` animates numbers counting up.
- Overview: "You have" with a 90-day balance line, rebuilt backwards from flows (counts anchor it); KPIs for safe today, runway in days (spendable ÷ 30-day burn) and kept this month; account chips; an insight carousel; spending pace vs your usual month (Copilot); a Sankey cash flow (Monarch); a spending calendar heatmap (Monzo); categories with budgets and a pace tick (`S.settings.mnBudgets`); recurring detection with one-tap "Add as planned".
- Transactions: search, type and account chips, sticky month headers with totals, day totals, category avatars, and a floating + button.
- Planned & forecast: 30/60/90-day scrubbable forecast with a variation band and planned markers, lowest point, a next-30-days list with running balance, and the planned monthly net.
- Reports: 12 months of tappable bars, the selected month's Sankey, a savings-rate line, balance over time, and year to date.

**App lock** (`lock.js`, loaded in `<head>`): a PIN (SHA-256 with salt) and/or a WebAuthn platform credential (Face ID, fingerprint, Windows Hello), stored per device in `localStorage wr-lock`. `html.wr-locked` hides the app until unlocked. It relocks after 0/1/5/15/60 minutes in the background. After 5 wrong PINs it waits 15 seconds. "Forgot" unlocks with the sync code. Settings live in Me → Appearance → App lock. It is a device gate, not encryption.

## 9.5 · One system (unify.js)
NOVA, Classic and the ONE overlay are retired as separate interfaces.
- ARC is the only home (`arcOn` is always true). `show('now'|'hq'|'today')` opens ARC. Sidebar and phone bar say "Day".
- Every other screen is a room (ARC → Rooms, sidebar, phone bar). The "Day" pill returns home.
- `nvOn` is always false, so NOVA never mounts. `wr-ui` is forced to `monolith` and the Classic orange look is removed.
- One look, three choices (`wr-look`): `auto` (default) follows ARC's phase, light from wake to 17:00 and dark after, for home and rooms alike; `dark`; `light`. ARC respects the choice; night stays black.
- Me → Appearance holds only the look choice (plus App lock).
