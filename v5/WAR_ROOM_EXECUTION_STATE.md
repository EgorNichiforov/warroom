# War Room · execution state (the 100% vision mission)

**Read this first if you are resuming.** It is kept current at every release. Mission brief: "WAR ROOM: THE 100% VISION" (Egor, 19 Nov 2026, 21:46). Earlier brief: "UNIFIED IMPLEMENTATION PROMPT" (same day).

## Where things stand

| Item | Value |
|---|---|
| Repo / branch / folder | `EgorNichiforov/warroom` · `main` · `v5/` (GitHub Pages serves `main`) |
| Rollback point before this mission | commit `af27d0b` (13.40.0). Tags and side branches cannot be pushed from the build environment; use `git revert` on `main`. |
| Current release | see `APP_VERSION` in `core.js` and the last entry of `IMPLEMENTATION_LOG.md` |
| Architecture decision | Keep the vanilla PWA and extend it in layers. Reasons and alternatives: `ARCHITECTURE_DECISIONS.md` |
| Coverage of the brief, part by part | `VISION_COVERAGE.md` |
| One current architecture document | `WAR_ROOM_MASTER_ARCHITECTURE.md` |

## How to work here (rules that cost time when forgotten)

1. Bump the version in `core.js`, `sw.js` (cache name and shell list), every `?v=` in `index.html`, the phone-checklist line in `blueprint.js`, and the version strings in `tests/test_1327.py`, `test_1331.py`, `test_1333.py`, `test_1334.py`.
2. Add a changelog row at the top of the table in `playbook.js`, an entry in `IMPLEMENTATION_LOG.md`, and update the master architecture document.
3. Run every suite in `tests/` (`test_13xx.py` need a server on port 8765 at the repo root; `run.py` needs 8766 inside `v5/` and must run alone, at a daytime clock: `TZ=Etc/GMT+6` in the evening).
4. New modules wrap existing functions. When wrapping a function that other wrappers flagged (`show`, `lxCandidates`, `saveOwner`), copy the flags across.
5. Never print the sync row id. Never change `settings` from the cloud side: a device overwrote it within the hour. Goals, tasks and other per-record maps merge by newest `_u` and can be changed with SQL after a backup into `warroom_backup`.
6. `mission.js mcBuild()` is the only recommender. `learnx.js lxBuild()` is the only learning-session planner.
7. Nothing is "tested on a phone" unless Egor pressed it.

## Stages of the vision brief

| Stage | State | Where |
|---|---|---|
| 0 Discovery and preservation | Done: inventory by script (`tools/inventory.py` → `INVENTORY.md`), rollback point, backup restore proven | this file, `INVENTORY.md` |
| 1 Architecture and foundation | Decision made and recorded; foundations = entity read model, event log, health | `ARCHITECTURE_DECISIONS.md`, `entity.js` |
| 2 Canonical data and reality engine | Built as a read model over existing stores (13.41) | `entity.js` |
| 3 Strategy and execution | Existed (mission.js, strategy.js, fn.js, engine.js) + goal chain and backward plan built in 13.42 | `future.js` |
| 4 Decision intelligence | Existed (judge.js: decisions, predictions, calibration, red team, pre-mortem); option comparison added in 13.42 | `judge.js`, `future.js` |
| 5 Capability and learning | Existed + proof layer 13.38 | `proof.js` |
| 6 Knowledge and content | Existed (content.js, sources) + record graph 13.41 | `entity.js` |
| 7 Business intelligence | Existed + 13.39 | `domain.js` |
| 8 Simulation | Built for the business funnel (13.42) | `future.js` |
| 9 Agent orchestration | Built, bounded (13.42); never run against a live model by the build | `agents.js` |
| 10 Personal domains | Existed + 13.34 to 13.39 | `depth.js`, `domain.js` |
| 11 Evolution | Built (13.42); needs weeks of real use to say anything | `agents.js` |
| 12 Final integration and release | 13.45.0 tested and deployed; acceptance report written, with what is not verified | `ACCEPTANCE_REPORT.md` |

A stage listed for a later release than the current `APP_VERSION` is NOT built yet.

## Blocked, with the exact reason

- **Server migration (13.43.0): written, proven locally, NOT applied.** `apply_migration` made Supabase ask Egor for a confirmation at about 23:00 on 19 Nov; he was asleep and it timed out. Do not run the same SQL through another tool: that would go around his confirmation.
- Real-phone verification: only Egor can do it.
- Vault (13.44.0): built and live in the app, off. Only Egor can switch it on (it needs a passphrase only he knows). Rule learned: any on-device change to `settings` must call `touch(S.settings)` or other devices ignore it.

## Switching the server on (do this WITH Egor present; about 5 minutes)

1. `apply_migration` name `warroom_server_v1_devices_jobs_audit`, body = `supabase/warroom_server_v1.sql`. He taps Confirm.
2. `apply_migration` name `warroom_server_v1_policies_cron`, body = `supabase/warroom_server_v1_policies_cron.sql`.
3. `deploy_edge_function` name `warroom-worker`, `verify_jwt` false, file `supabase/functions/warroom-worker/index.ts`.
4. Check as the browser role inside a transaction that rolls back (headers via `set_config('request.headers', …, true)`, a scratch `staging-…` row): key still reads its row; private tables refuse; `warroom_server_status()` answers.
5. Insert the timers for his room by SQL (room id through a subquery, never printed): backup 03:00, research 05:40, quality 05:50 Mondays (`dow = '{1}'`), brief 06:10.
6. Queue one `quality` and one `brief` job by SQL, run `select public.warroom_tick()`, then read `warroom_job` and `net._http_response`. This is also the first run of a role against a real model: read the note before telling him it works.
7. Run `get_advisors` (security) and fix anything it reports about the new objects.
8. He opens Server in the app, gives each device its own key. The lock is his decision, later.

Rollback: `select cron.unschedule('warroom-tick')`; drop the four `warroom_*_by_device` / `warroom_gate_locked` policies and the trigger; the new tables can stay (nothing reads them).

## Next action

1. Switch the server on with Egor (above).
2. Egor presses the phone checklist and reports what breaks.
3. After two weeks of use, open "Is War Room working?" and fold away what was never opened.
