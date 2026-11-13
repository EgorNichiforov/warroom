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
