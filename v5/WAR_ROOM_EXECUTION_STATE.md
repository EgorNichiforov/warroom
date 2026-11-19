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
| 3 Strategy and execution | Existed (mission.js, strategy.js, fn.js, engine.js) + objective chain and backward plan (13.42) | `future.js` |
| 4 Decision intelligence | Existed (judge.js) + what was missing (13.42) | `future.js` |
| 5 Capability and learning | Existed + proof layer 13.38 | `proof.js` |
| 6 Knowledge and content | Existed (content.js, sources) + record graph 13.41 | `entity.js` |
| 7 Business intelligence | Existed + 13.39 | `domain.js` |
| 8 Simulation | 13.42 | `future.js` |
| 9 Agent orchestration | 13.43 | `agents.js` |
| 10 Personal domains | Existed + 13.34 to 13.39 | `depth.js`, `domain.js` |
| 11 Evolution | 13.43 | `agents.js` |
| 12 Final integration and release | Each release is tested and deployed; acceptance report at the end | `ACCEPTANCE_REPORT.md` |

A stage listed for a later release than the current `APP_VERSION` is NOT built yet.

## Blocked, with the exact reason

- Daily research schedule: the scheduler's permission system refused the change twice (19 Nov). Egor can switch that scheduled task to daily in its settings.
- Real-phone verification: only Egor can do it.
- Per-device authentication, encryption at rest, token rotation: need a database migration that can lock devices out. Not started; needs Egor's approval of a written migration plan.
- Server-side agents and jobs beyond the existing Claude scheduled tasks: there is no server the app controls except Supabase tables and one edge function. In-app agents run only while the app is open and only with an AI key on that device.

## Next action

See the last "Next" line in `IMPLEMENTATION_LOG.md`.
