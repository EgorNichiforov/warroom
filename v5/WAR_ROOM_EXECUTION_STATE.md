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
| 12 Final integration and release | 13.50.0 tested and deployed; acceptance report written, with what is not verified | `ACCEPTANCE_REPORT.md` |

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

## No freeze, no build gate (Egor, 20 Nov 2026, 08:27)

War Room and Caregiver Bench are separate projects. **War Room development is not gated on dials or on a first paying client.** Do not check the dial count before building and do not ask him to dial first. (At 08:20 he tapped "It stands" on a question about the freeze; at 08:27 he wrote that this was recorded wrongly and withdrew the freeze. The written message is the decision.) See `BUILD_GATE.md`.

Scheduled tasks on 20 Nov: prompts corrected in Weekly review, Morning brief 06:00 (now paused), Nightly review, Bench Bulletin (no price line); the freeze and the build-gate check removed from Weekly review, Morning brief 05:03 and the Sunday audit (see `IMPLEMENTATION_LOG.md` for which of these went through). Server timers: backup on, weekly check on, brief off, research off.

Dials, settled 20 Nov (13.50.0, worker v4): dials MADE = per day max(call records + outside reports, day counter), compared with the 350 target (scorecard, server brief, his reviews). Dials WITH AN OUTCOME = call records + outside reports, used for conversion (Mission Control evidence, funnel, bottleneck). Do not merge the two.

NEVER create a non-`staging-` room row on the live project without renaming it at once (see `supabase/tests/live_http.sh`): every scheduled task takes the newest row that has `days`.

## Before every release

- Check for a function name defined twice: `grep -ohE "^(async )?function [A-Za-z0-9_]+" *.js | sed -E 's/^(async )?function //' | sort | uniq -d` must print only `cmOpen endSession renderStats startSession` (old, intended). On 20 Nov a new `bpOpen` silently replaced the Blueprint screen; the 13.31 suite caught it.
- Run the legacy suite at a daytime clock for the moment of the run (`TZ=Etc/GMT-6` in the Chisinau morning, `TZ=Etc/GMT+6` in the evening). At night three checks fail on any version.
- Run suites that failed under 14 parallel browsers once more alone before believing them.

## Next action

1. Everything listed in the two briefs has a built counterpart as of 13.50.0. What remains is use and verification, not building.
2. Egor presses the phone checklist and reports what breaks.
3. After two weeks of use, open "Is War Room working?" and fold away what was never opened.


## Scheduled tasks · state on 20 Nov 11:30

Edited today: Nightly review, Sunday audit, Morning brief 05:03, Bench Bulletin, Sheet sync, Weekly review (facts), Content discovery (daily wording, de-dup against the app's sources), System check (strict lookup, check 7 one War Room, check 8 server jobs and 03:00 backup). Paused: Morning brief 06:00. Still on the looser lookup (same row today): Weekly review, Close the day, paused 06:00 brief.

NEXT, with Egor present (one confirmation in Supabase): migration adding `warroom_owner()` (returns the owner's room id from `warroom_config`), then replace the lookup in all fifteen task prompts with it. `update_trigger` needs each whole prompt re-sent; `list_triggers` returns about four tasks per page.


## 20 Nov 13:00 · where things stand

- App 13.54.0 live. Device key storage slot is `wr-devkey` (NOT `wr-device`, which belongs to `devices.js`).
- Laptop ("Windows laptop") enrolled and verified from his real Chrome via Claude in Chrome. Phone not enrolled: only he can tap it, and only on 13.50.0 or later. Lock off until then.
- `warroom_owner()` is live. Use `(select warroom_owner())` for the owner's room in every new task and query. Three tasks switched (Sheet sync, Dial Guard, Acvila attendance); eleven to go (list in IMPLEMENTATION_LOG).
- Vault: left off on purpose. A passphrase Claude chooses would have to be passed to him in chat, which his own rule forbids, and he must type it on the phone anyway.
- Real-device testing is now possible on the laptop: Claude in Chrome reaches his real War Room. Screenshots time out when the Chrome window is in the background; DOM reads and clicks by element still work.

## 20 Nov 13:21 · TWO NEW BRIEFS RECEIVED (read in full) · order of work set by Egor

Egor: "first continue and build everything out there [the earlier briefs], then go to these two".
1. `/mnt/user-data/uploads/413c63df-attachment.txt` = "PERSONAL REALITY, WORLD INTELLIGENCE & FUTURE LAB" addendum to the 100% vision (26 sections, 13 stages 0–12, 13 required documents, hardware strategy doc; no purchases; no custom hardware until a gap is proven; never claim accuracy without outcomes).
2. `/mnt/user-data/uploads/356a7c9c-attachment.txt` = "BILINGUAL COMMUNICATION, ARTICULATION & VERBAL INTELLIGENCE SYSTEM" (Romanian + English first-class; 5 domains A–E; 4 language modes; voice-first with fallback; feedback engine with 10 dimensions, never judge audio from text; profile per language; adaptive selection + spaced repetition; 6 stages by demonstrated competence; real-world capture; Overview/Train/Vocabulary/Progress/History; tests listed in Part 14; definition of done in Part 15).
Plan: (a) 13.52.0 = the three "Me" items (fidelity/origin map, source contradictions, AI use) → (b) communication system as its own module `speak.js`, in increments, end-to-end loop first → (c) addendum Stage 0 baseline + backlog mapped onto what exists, then stages in order.
Still pending Egor's tap in Supabase: migration `warroom_server_v1_closed` (timed out twice-asked-once; do not run another way).


## 20 Nov 16:00 · state after 13.54.0

- Live: 13.54.0. `fidelity.js` (fdm*/sdx*/au*, store `sdx:`) and `speak.js` (spk*, store `spk:`) are the two newest files, loaded last, in `index.html` by hand and in `sw.js` SHELL.
- RELEASE ORDER (learned the hard way at 13.52): tests → duplicate-name check must print exactly `cmOpen endSession renderStats startSession` → grep new boot-key prefixes against other files → commit → push.
- Communication brief: increment 1 done (see IMPLEMENTATION_LOG 13.54.0 for the exact open list). NEXT increments, in order: (2) conversation partner that answers what he said (5.3) + "explain it differently" five steps (5.4); (3) daily session of five blocks with short/long options (5.1) + modes 3 and 4 (4.1); (4) progress view per language with history search and attempt comparison (Part 11); (5) levels 4–6 and grammar-pattern review; (6) audio recording with explicit consent and retention controls, only if the phone supports it.
- Addendum brief (`413c63df`, Personal Reality / World Intelligence / Future Lab): NOT started beyond what already exists (reality.js, entity.js, model.js, fidelity.js = its 4.2 and part of 15; agents.js; decisions; experiments; content; server jobs). FIRST ACTIONS it requires: `WAR_ROOM_INTELLIGENCE_BASELINE.md` (gap analysis mapped to existing modules) and `WAR_ROOM_INTELLIGENCE_IMPLEMENTATION_BACKLOG.md`, then Stage 1 (claim types: observed / reported / external / derived / inference / hypothesis / forecast / recommendation on records; event time vs recorded time), Stage 9 prediction register is the cheapest high-value piece. No purchases, no hardware.
- Supabase migration `warroom_server_v1_closed`: asked three times in all, every time the confirmation went unanswered (120 s). Not applied. Retry only when Egor says he is looking at the screen.


## 20 Nov 20:20 · after 13.57.0

- Communication increments 1 and 2 are live (`speak.js`, `speak2.js`; tests 1354, 1357). NEXT for it: (3) daily session of five blocks + progress view per language with history search and attempt comparison; (4) levels 4–6 + grammar-pattern review + regression note; (5) audio, only with consent and only if the phone supports it.
- Supabase `warroom_server_v1_closed`: Egor wrote "Approved" in chat at 19:56; the tool's own confirmation still timed out (4th time). The card probably does not appear in the phone app. NOT applied, not run another way. Ask him to answer it from the computer, or to say explicitly how he wants it run.


## 20 Nov 20:50 · after 13.58.0

- Second brief (addendum): baseline + backlog written; backlog item 1 done (`forecast.js`). NEXT: item 2 (kind of claim on the main numbers) and item 3 (happened-at against recorded-at). Do not start simulation (item 10) before forecasts have real marked weeks.
- Newest files in load order: fidelity.js, speak.js, speak2.js, forecast.js (index.html by hand + sw.js SHELL).

- RELEASE GATE, in this order: every v5/*.js parses under node → suites → duplicate-name check → new store prefixes not used elsewhere → commit → push. (13.58: a changelog row with backticks broke playbook.js; caught by the suites before the commit.) Never put backticks in a Playbook changelog row.

## 20 Nov 21:30 · after 13.59.0

- Communication increments 1–3 live (speak.js, speak2.js, speak3.js; tests 1354, 1357, 1359). Open list is in IMPLEMENTATION_LOG 13.59.0. NEXT for it: levels 4–6 exercises + review of corrected habits; audio only with consent and phone support.
- Second brief: backlog item 1 done; NEXT items 2 and 3 (kind of claim on main numbers; happened-at against recorded-at).

## 20 Nov 21:55 · after 13.60.0

- claims.js live (ck*, no store). Backlog items 2 and 3 partly done (see backlog file). NEXT: Communication levels 4–6 + review of corrected habits; then backlog 4 (what changed since last week) and 5 (hypotheses as records).
- Gate addition: a new finder id must be unique (ux.js already had `kinds`).

## 20 Nov 22:25 · after 13.61.0

- Communication increments 1–4 live (speak.js … speak4.js; tests 1354, 1357, 1359, 1361). Left in that brief: kept audio (5.2), more scenario families (Part 10), real microphone and phone tests, quality on his main model.
- Second brief: backlog 1 done, 2 and 3 partly. NEXT: 4 (what changed since last week), 5 (hypotheses as records tied to experiments), 6 (tested cross-domain links, 20 paired days minimum).

## 20 Nov 23:00 · after 13.62.0

- audit.js + ALL_PROMPTS_AUDIT.md: every prompt, 180 sections (generator: v5/tools/audit_gen.py; rerun it after any status changes, then release). NEXT AUDIT STEP: line-by-line pass, one prompt per run, oldest first (P01 = /mnt/user-data/uploads/49b9b331-attachment.txt, 2,354 lines): read it in chunks, check each requirement against the code (not the header note), correct the ledger, build what is missing.
- test_1358 made independent of background day-record creation.

## 20 Nov 23:45 · after 13.63.0

- Line-by-line audit of P01 started (sections 1–4 read; see IMPLEMENTATION_LOG 13.63.0 for what is settled and what is not). Tools: /home/claude/work/audit/probe.py (opens screens and looks for words: its misses are questions, settle each in the code), gen.py (the ledger; copy at v5/tools/audit_gen.py). Finder gate: test_1333 requires every WF entry to have a purpose longer than 15 characters and a unique id; check duplicates in the running app, not by grep.
- NEXT in the audit: P01 sections 2A, 2D, 2E, 3B–3E (settle in code), then read P01 lines 520–2354 in chunks of about 500 lines (grep -v blank lines), section by section; build what is truly missing; correct the ledger with tools/audit_gen.py and release. Then P13 (unified prompt), then the rest oldest first.


## Resume note · 20 Nov 2026, 23:25 (after 13.67.0; 13.66 added versions-released evidence to rtReality, 13.67 corrected dates)

- Line-by-line audit of P01 (`49b9b331`): lines 1–1220 read (sections 1–10). Settled in the code and recorded in the ledger (`/home/claude/work/audit/gen.py`, rows marked CHECKED LINE BY LINE): 2, 3, 5, 6, 7, 8, 10. Section 4 row not yet annotated. Section 9: read, not settled (no field found for limitations / last checked; upkeep list partly found). 10D and 10F found, not read line by line.
- Built from the audit: 13.64 campaign fields + milestone evidence fix; 13.65 `rtReality`, `MC_OPS`/`mcModeOps`, eight capabilities (92).
- NEXT: P01 lines 1220–2354 (sections 11–19), same method; then P13, then the rest oldest first.
- Invariant learned: `cmGaps().length===0` (every capability must link at least one existing card); a capability whose own lesson is missing says so in its knowledge line.


## Resume note · 20 Nov 2026, late evening (after 13.68.0)

- P01 read in full (2,354 lines) and settled or recorded section by section in the ledger. Built from it: 13.64 (campaign fields), 13.65/13.66 (reality check, day modes in practice, eight capabilities), 13.68 (error notebook, AAR learned line, review to procedure).
- Open from P01, in order of value: (1) resource planner: no-recovery-week check and estimates from actual durations; (2) knowledge quality fields limitations / last checked + upkeep list; (3) Life score decision (his); (4) sections 15 and 17 item-by-item check; (5) lessons of their own for the eight new capabilities.
- NEXT PROMPT: P13 (`3c99950f-WAR_ROOM_UNIFIED_IMPLEMENTATION_PROMPT.md`), same method: read in chunks, settle in the code, build small gaps with a test, record large ones, correct the ledger, release through the full gate.


## Resume note · 21 Nov 2026, 00:05 (after 13.69.0)

- Audit done: P01 (full), P13 (full). Next, oldest first: P02 `b9339758`, P03 `78bd318d`, P04 `8f4f0baf`, P05 `a1c1f604`, P06 `fd126a52`, P07 `b5fd8906`, P08 `6a3a7bc8`, P09 `ba256a43`, P10 `3d6afeda`, P11 `c0fd84f7`, P12 `7997f1ef`, P14 `decf8883`, P15 `413c63df`, P16 `356a7c9c`.
- Technique that found real faults: ask the app the user's own words (finder), and compare each listed field with the form's actual inputs.
- Rule: read the clock tool BEFORE writing any date (two date errors on 20 Nov).


## Resume note · 21 Nov 2026, 00:25 (after 13.70.0)

- Audit done: P01, P13, P02, P03. Next, oldest first: P04 `8f4f0baf`, P05 `a1c1f604`, P06 `fd126a52`, P07 `b5fd8906`, P08 `6a3a7bc8`, P09 `ba256a43`, P10 `3d6afeda`, P11 `c0fd84f7`, P12 `7997f1ef`, P14 `decf8883`, P15 `413c63df`, P16 `356a7c9c`.
- A file that registers a finder entry must load after wayfind.js (index.html order); content.js does not.
- `CC_MAIL_NOTE` in content.js is a dated estimate: update it whenever the mailbox is counted again.


## Resume note · 21 Nov 2026, 00:45 (after 13.71.0)

- Audit done: P01, P13, P02, P03, P04. Next: P05 `a1c1f604` (839 lines; sent twice as `45da420e`), then P06 `fd126a52`, P07 `b5fd8906`, P08 `6a3a7bc8`, P09 `ba256a43`, P10 `3d6afeda`, P11 `c0fd84f7`, P12 `7997f1ef`, P14 `decf8883`, P15 `413c63df`, P16 `356a7c9c`.
- Third technique that found real faults: read his real settings on the laptop and compare them with what the screen would say (BAC target unset, so the fallback showed).
- Watch for `S.settings.x = { ... }` assignments that replace a whole settings object another file also writes to.
