# War Room · master architecture (13.24.0, 19 Nov 2026)

Authoritative map of the app as built. Supersedes sections 1 and 2 of `ARCHITECTURE.md` (its runbook parts still apply).
Plain-JavaScript PWA, no build step, offline-first. 71 scripts loaded in order by `index.html`.

## The six layers and who owns them

| Layer | Question | Owner files | Data |
|---|---|---|---|
| 1 Direction | What am I trying to do? | `mission.js` (season), `intel.js` (campaigns), `core.js` (goals) | `S.settings.season`, `S.campaigns`, `S.goals` |
| 2 Organization | What do I have and owe? | `calendar.js`, `todoist.js`, `dial.js` + `crm.js` (CRM), `pipeline.js` (bench), `money*.js`, `train*.js`, `life.js` (study log) | `S.schedule`, `S.tasks`, `Q` (own row), `B` (own row), `S.txns`, day records |
| 3 Intelligence | What does it imply? | **`mission.js` `mcBuild()`** is the one recommender. `bac.js` `bacNext()` and `stage.js` `sgEvidence()` feed it facts. | computed, never stored |
| 4 Execution | What happens now? | `mission.js` (mission card, day modes, focus contract, restart), `arc.js` + `guide.js` (guided day), `adapt.js` + `engine.js` (replan) | day record: `mode`, `mc`, `mcDone`, `mcPick`, `fc[]` |
| 5 Development | What am I becoming able to do? | `bootcamp.js` (ladder, lessons), `mastery.js` (spacing), `capability.js` (evidence, sims, daily learning mission), `bac.js` (BAC loop), `drive.js` | `S.boot`, `S.cards`, `S.lifeTests`, `S.lifeErrors` |
| 6 Feedback | What happened, what changes? | `mission.js` (weekly review, overhead), `capability.js` (after-action reviews), `intel.js` (decisions, experiments) | `S.reviews`, `S.boot.aar`, `S.decisions`, `S.experiments`, day `appMin` |

## Sources of truth

| Fact | Source | Not a source |
|---|---|---|
| Dials, answered calls, owner conversations | the call log: `Q.items[].log` (`mcDialLog`, `sgEvidence`) | the hand counter `day.counters.dials` (shown apart as "not in the log"; healed upward if below the log) |
| Study done | timed mocks and the error log (`bac.js`) | BAC minutes (a floor only) |
| Mastery stage | `bcRung(id)` in `bootcamp.js`, from evidence in `S.boot` | lesson completion, video watched |
| Money | `S.txns` + money4 rules (earned ≠ received; payout ≠ income) | day money fields |
| Today's plan | `blocksFor(date)` = calendar + schedule + one-off overrides | Todoist |
| What comes first | `S.settings.season.dom` | any other screen |

## Recommendation flow (mission.js)

facts (call log, Florida clock, calendar blocks, study counter, error log, mocks, training log, memory model)
→ candidates (each: outcome, why, next action, minutes, done condition, evidence, cost of delay, confidence)
→ ranking by tier: 0 fixed commitment · 1 season priority · 2 protected floor · 3 maintenance; bigger open gap first inside a tier
→ day mode filter (Full / Minimum = floors / Recovery = fixed commitments only)
→ one mission card, "Why this?" (facts, unknowns, ranking), "Not this" (your override, recorded)
→ evidence back on the day record → weekly review.
All local. No AI, nothing leaves the device. Missing facts are listed as unknown.

Other advisers still in the code and their status: `command.js` briefing (replaced on the Day screen by the mission),
`engine.js` bottleneck + protocols (still shown in Life), `stage.js` constraint strip (still shown under the mission),
`one.js`, `cockpit.js`, `brief.js` (still wrapped into the guided day). Merging these into `mcBuild` is the next unify step.

## Time zones
Device local time decides day keys (`dk`). Florida time is always computed with `America/New_York` (`mcFlorida`, `ops.js flHour`): calls are only recommended 09:00 to 17:00 Florida time, Monday to Friday. Calendar events are written as `Europe/Chisinau`.

## Sync and security boundaries
See `SECURITY_AND_RECOVERY.md`. In short: three documents (main `S`, queue `Q`, bench `B`), each one row in `warroom_sync`, row id derived from the sync code (a bearer password). Records merge by timestamp; days and settings merge per field against the last cloud copy seen.

## Module ownership rule
A change goes in the file that owns the function. 13.24 edited owners directly (`arc.js`, `views.js`, `core.js`, `bootcamp.js`, `mastery.js`, `capability.js`, `intel.js`). Still wrapped (legacy, to unwind): `arcHtml` (9 files), `render` (8), `show` (5), `bcPath` (4).
