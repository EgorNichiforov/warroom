# Next phase roadmap (status at 13.25.4, 19 Nov 2026)

## Done since 13.24.0
| Item | Version | Commit |
|---|---|---|
| 1 Deploy 13.24 | 13.24.0 to 13.24.3 live | 7c05245 … 84241a2 |
| 2 Other advisers feed the mission (A1). Stage strip, 14-day engine and attention list are facts under one fold; they are not deleted | 13.25.0 | afd243f |
| 5 Campaigns linked to the mission, evidence-only milestones, max three active (A2) | 13.25.1 | cd5cf6a |
| 6 Replanning with KEEP / MOVE / DROP, confirm, undo (A3) | 13.25.2 | 12bf3c4 |
| 7 Course states: watched / learned / demonstrated (B1) | 13.25.3 | b54fdad |
| 8 Spacing uses importance and blind-spot history (B2) | 13.25.4 | d27b193 |

## Still open, in order
| # | Item | Why it is open | Needs |
|---|---|---|---|
| B3 | Capability map: nine domains, each capability with meaning, observable behaviour, evidence, assessment, mapped to existing lessons, gaps listed | Not started | A content pass over 203 cards and 22 modules; no new engine |
| B4 | After-action review linked to a capability; repeated errors recommend practice | `cpAar` links to an idea only | B3 |
| BAC | Subjects, rules and dates verified against ANCE and the Ministry; topic lists with sources | Board runs on the user's own setup, labelled unverified | Reading the official 2027 documents |
| Journal | One entry flow over decisions, experiments, after-action reviews | Four stores remain | none |
| 3 | Per-device tokens and revoke | Changes the live database | Approval of the migration in SECURITY_AND_RECOVERY.md |
| 4 | Restore that rewinds + guided drill | Not started | none |
| 9 | Call coach | Blocked | Quo invoice, recording notice, webhook |
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
