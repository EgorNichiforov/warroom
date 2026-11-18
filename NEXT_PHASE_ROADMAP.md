# Next phase roadmap (after 13.24.0)

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
