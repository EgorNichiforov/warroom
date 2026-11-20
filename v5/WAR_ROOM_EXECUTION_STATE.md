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
| 12 Final integration and release | 13.46.0 tested and deployed; acceptance report written, with what is not verified | `ACCEPTANCE_REPORT.md` |

A stage listed for a later release than the current `APP_VERSION` is NOT built yet.

## The server is ON (since 20 Nov 2026, 07:36 Chisinau)

- Applied with Egor's confirmation: `warroom_server_v1_devices_jobs_audit`, `warroom_server_v1_policies_cron`, `warroom_server_v1_tidy_grants`. Worker `warroom-worker` deployed (version 3). `pg_cron` job `warroom-tick` every 10 minutes: first automatic run observed at 05:40 UTC.
- Timers for his room: backup 03:00, research 05:40, quality 05:50 Mondays, brief 06:10 (Europe/Chisinau).
- Verified live, in a transaction that rolled back: the sync code still reads and writes its row; private tables and worker functions refuse the browser role; a device key reads the room's 9 rows; the lock shuts out the code alone; with no header nothing is readable.
- Real jobs run: quality (note left), backup (3 rows), brief with the Chief of Staff from his real Gemini key (1 call, about 1.9 s), one role answer.
- Found on the first live run and fixed in worker v2/v3: failed AI tries counted against the daily cap; a failed search was marked handled; dials were read only from the per-agency call log and not from `days[k].counters.dials` (the big dial button), so the brief said 0 where the counter had 2.
- **Server research does not work with his key:** Gemini answers "exceeded your current quota" for search-grounded calls. The job reports it in its summary, leaves no note, retries daily. Needs a key with search quota, or stays off.
- To redeploy the worker the whole file must be sent in the tool call (about 22 KB). Batch worker changes.
- Rollback: `select cron.unschedule('warroom-tick')`; drop policies `warroom_*_by_device`, `warroom_gate_locked` and trigger `warroom_sync_audit_t`.

## Blocked, with the exact reason

- Real-phone verification: only Egor can do it.
- Vault (13.44.0): built and live in the app, off. Only Egor can switch it on (it needs a passphrase only he knows). Rule learned: any on-device change to `settings` must call `touch(S.settings)` or other devices ignore it.
- A morning-brief Claude scheduled task was refused by the scheduler's permission system; the server brief replaces it.

## Claude's scheduled tasks (all 15 read on 20 Nov)

No literal row id anywhere. Six use a looser main-row lookup that is safe only because `staging-`/`share-` rows carry a 2000-01-01 stamp. Three still coach from the old offer and the old BAC target, and there are two overlapping morning briefs. Table in `IMPLEMENTATION_LOG.md`. Prompt edits were refused by the scheduler on 19 Nov; ask Egor before trying again. The server's own brief timer is OFF so it does not add a third brief.

## Freeze (Egor, 20 Nov 2026, 08:20): IT STANDS

No new War Room features and no new architecture mission until **1,000 dials or the first paying client** (the Playbook's rule). Allowed: fixes, verification, switching things on that are already built (device keys, vault). If asked to build, say this first and check the dial count.

Scheduled tasks on 20 Nov: prompts corrected in Weekly review, Morning brief 06:00 (now paused), Nightly review, Bench Bulletin (no price line). Prompt edits were accepted once Egor approved them in the conversation. Server timers: backup on, weekly check on, brief off, research off.

## Before every release

- Check for a function name defined twice: `grep -ohE "^(async )?function [A-Za-z0-9_]+" *.js | sed -E 's/^(async )?function //' | sort | uniq -d` must print only `cmOpen endSession renderStats startSession` (old, intended). On 20 Nov a new `bpOpen` silently replaced the Blueprint screen; the 13.31 suite caught it.
- Run the legacy suite at a daytime clock for the moment of the run (`TZ=Etc/GMT-6` in the Chisinau morning, `TZ=Etc/GMT+6` in the evening). At night three checks fail on any version.
- Run suites that failed under 14 parallel browsers once more alone before believing them.

## Next action

1. Everything listed in the two briefs has a built counterpart as of 13.46.0. What remains is use and verification, not building.
2. Egor presses the phone checklist and reports what breaks.
3. After two weeks of use, open "Is War Room working?" and fold away what was never opened.
