# Next phase roadmap (status at 13.26.0, 19 Nov 2026)

## Done since 13.24.0

**13.27.0 (19 Nov):** Content Command Center, 31 lessons, BAC topic map and verified dates, campaign projects, energy, Money lens, training flows, branching scenarios, source audit, offline and simulated-sync tests. Next, in order: (1) real-phone pass by Egor, (2) process the remaining 41 emails a few per week through the scheduled scan, (3) summarise the Lost Chapters only after listening, (4) lessons for the five remaining capability gaps from verified sources (Moldovan tax service, a certified first-aid course, de-escalation training).
| Item | Version | Commit |
|---|---|---|
| 1 Deploy 13.24 | 13.24.0 to 13.24.3 live | 7c05245 … 84241a2 |
| 2 Other advisers feed the mission (A1). Stage strip, 14-day engine and attention list are facts under one fold; they are not deleted | 13.25.0 | afd243f |
| 5 Campaigns linked to the mission, evidence-only milestones, max three active (A2) | 13.25.1 | cd5cf6a |
| 6 Replanning with KEEP / MOVE / DROP, confirm, undo (A3) | 13.25.2 | 12bf3c4 |
| 7 Course states: watched / learned / demonstrated (B1) | 13.25.3 | b54fdad |
| 8 Spacing uses importance and blind-spot history (B2) | 13.25.4 | d27b193 |
|## Still open, in order
| # | Item | Why it is open | Needs |
|---|---|---|---|
| D | Deploy 13.26.0 | On branch `v13.26-operator`, not merged | Your approval; then merge to main (GitHub Pages serves main/v5) and check on the phone |
| BAC-2 | Topic hierarchy per subject from the 2027 exam programmes | The programmes PDF (Order 2046) must be read; the timetable PDF (Order 2051) is a scan | Open both PDFs on ance.gov.md; confirm your profile's subjects; then enter topics with the source |
| K-1 | Weekly discovery scheduled task (Gmail → processed list → in-app note → Import) | Creating the scheduled task was refused in this session | Your OK to create it (prompt saved in WAR_ROOM_MASTER_ARCHITECTURE.md) |
| K-2 | Process the remaining ~54 cataloged Acquisition.com emails and their linked videos/PDFs | Only 4 were processed; links are tracked redirects | Time; opening links in the browser |
| K-3 | Lessons for capability gaps (listed in the map as missing content) | No verified source yet | A source per gap, added through the pipeline |
| 3 | Per-device tokens and revoke | Changes the live database | Approval of the migration in SECURITY_AND_RECOVERY.md |
| 4 | Restore that rewinds + guided drill | Not started | none |
| 9 | Call coach | Blocked | Quo invoice, recording notice, webhook |
| 12 | Remove NOVA and classic paths, bundle per hub | Not started; now 77 scripts | none |
| T | Restore the 303-check suite (tests/run.py) into the repo | It is not in the repository | The file from wherever it lives |

ng notice, webhook |
| 12 | Remove NOVA and classic paths, bundle per hub | Not started | none |
| New (expansion directive, 19 Nov) | Personal reality model, life direction, Judgment Lab scenarios and predictions, Red Team risk register, attention defense protocols, Field Manual, knowledge links and search, resource planner, contingency center, contextual modes, life-competence curriculum, board-meeting review, development metrics | Not started. Existing pieces to extend: season, campaigns, decisions, experiments, protocols, Red Team prompt, weekly review, day modes | A build plan per system; several depend on B3 |

## Original table (13.24.0)

Order is by value × risk reduction ÷ effort. Each item ships alone, tested.

| # | Item | Why | Depends on | Size | Done when |
|---|---|---|---|---|---|
| 1 | Verify 13.24 on the real phone, then deploy | Nothing here has run on a device | your approval | S | Day screen, focus contract, BAC board checked on Android |
| 2 | Fold the remaining advisers into `mcBuild` (stage constraint strip, engine bottleneck, ONE, cockpit, brief) and delete them | Still more than one voice on the Day screen | 1 | M | Day shows one recommendation; `arcHtml` wrapped by ≤ 3 files |
| 3 | Per-device tokens + revoke | Biggest open security gap | your approval of the DB change | M | A revoked device gets 401; others keep syncing |
| 4 | Restore that rewinds + guided monthly drill | Restore is the last line of defence | none | M | Records made after the copy are gone after a restore, in a test |
| 5 | Campaigns linked to the mission (max 3 active; next milestone shown in "why") | Direction layer is one line today | none | S | Mission names the campaign and milestone |
| 6 | Replanning that shows keep / move / drop with reasons and asks before changing | Day mode + risks exist; the plan itself is not rebuilt yet | 2 | M | A broken day yields a proposal and changes nothing until confirmed |
| 7 | Course view: watched / learned / demonstrated | Spec'd, not built | none | S | Each course lesson shows its ladder stage |
| 8 | Spacing uses importance and blind-spot history | Spec'd, not built | none | S | Blind-spot ideas get shorter gaps in a test |
| 9 | Call coach | Real calls → targeted practice | Quo: invoice, recording notice, webhook | M | Coaching note cites a transcript line |
| 10 | BAC: verify subjects, dates and rules against the ministry's documents; topic lists per subject | The board runs on your own setup, unverified | official sources | M | Each subject has a verified topic list with a source link |
| 11 | Journal: one log merging decisions, experiments, after-action reviews | Four stores today | none | M | One entry screen; old records still readable |
| 12 | Cleanup: remove NOVA and classic paths, bundle per hub | 71 requests on open | 2 | M | Fewer scripts, all tests pass |

## Deliberately not built yet
Knowledge graph · scenario simulator · personal history · new life modules (198 lessons unread) · client-side encryption (would blind the scheduled tasks) · a second planner or habit tracker.

## Blockers that need you
Quo invoice + recording notice + webhook · approval for the device-token migration · a decision on deploy.

## After 13.31.0 (19 Nov 2026)

Open, in order of value:
1. Real-phone test of 13.31 (Operator → Phone test). Not done by anyone yet.
2. Lessons for the 23 Blueprint competencies with none (cooking, home, documents, travel, health system, first aid course, writing, speaking, relationships, world, reading, culture, languages…). Research requests are raised one at a time by Learn.
3. Watch-and-rate the 36 lesson videos that are only "title checked" (16 of them new).
4. Read the unread book parts: Lost Chapters sections A and C; Gym Launch ch. 1–3, 5–12, 14–15, 20–26. An official copy is preferable.
5. Owner discovery needs owner conversations: 0 answers today.
6. Competitor prices (not public), Tampa Bay-local recruiters, staffing firms: not researched.
7. Accountant: seller form and tax regime before the first invoice; status of the 2027 Moldovan rate proposal.
8. Daily research schedule: still waiting for approval; weekly scan runs.

## After 13.32.0 (19 Nov 2026)

1. Real-phone check of the Day card ("I have N minutes"), the + sheet and Learn. Not done.
2. Your decisions: the weekly personal minimum (minutes); the BAC goal record's wording; the goals merge (dry run delivered); the scheduled-task prompt fix.
3. Reconcile today's calls: none are in the call log or the day counter.
4. Remaining fragmentation: `CP_ST` ladder, retired home code, money as a standing candidate, Operator tiles grouped by lifecycle.
5. From the 13.31 list, still open: lessons for 23 Blueprint competencies, unwatched videos, unread book parts, competitor prices, accountant, daily research approval.
