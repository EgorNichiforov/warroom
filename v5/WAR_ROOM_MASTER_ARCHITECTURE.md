# War Room · master architecture (13.26.0, 19 Nov 2026)

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


## 13.26 · master map of the life systems (single source of truth per system)

Loop: reality → understanding → priorities → decisions → action → evidence → learning → adaptation. `mcBuild()` stays the only recommender; every system below feeds it facts or records evidence.

| System | Source of truth | Owner file | Feeds / reads | Status (19 Nov) |
|---|---|---|---|---|
| Personal reality (facts with status, constraints) | `S.reality` | reality.js | Red Team, Operator, search | Implemented, tested |
| Season (purpose, priorities, must-not-sacrifice, review) | `S.settings.season` | mission.js | mcBuild tier 1, cmNext, weekly review | Implemented, tested |
| Lens for today | `day.lens` | mission.js | mcBuild tier 1 (fixed commitments still first) | Implemented, tested |
| Life direction | `S.settings.direction` | reality.js | Operator | Implemented (UI only, no logic) |
| Campaigns + milestones (evidence only, max 3) | `S.campaigns` | intel.js | mcBuild, Red Team, journal history | Implemented (13.25.1) |
| Capacity, conflicts, week fix | computed from `blocksFor`; changes in `day.sched` | reality.js | mcBuild risks, weekly review | Implemented, tested |
| Stagnation + execution nudge | computed | reality.js | mcBuild facts / card | Implemented, tested |
| Capability map (9 domains) | `CM_CAPS` in capmap.js + `S.boot['cx:*']` | capmap.js | Bootcamp, AAR, journal, Judgment Lab, Field Manual, pipeline | Implemented, tested |
| Mastery ladder | `bcRung` (bootcamp.js) from `S.boot` evidence | bootcamp.js | capability knowledge level | Implemented (13.24) |
| After-action review | `S.boot.aar` | capability.js | capability performance, journal | Implemented, tested |
| Reality Journal + history + search | `S.journal` (+ reads all owners) | journal.js | protocols, Field Manual, practice | Implemented, tested |
| Decisions + predictions | `S.decisions` | judge.js (intel.js legacy form) | calibration, weekly review, mcBuild due reviews | Implemented, tested |
| Red Team + risks + pre-mortem | `S.risks` (+ computed checks) | judge.js | tasks, mcBuild due reviews | Implemented, tested |
| Attention Defense | triggers in `S.journal`, protocols `S.protocols` (t 'attn') | defense.js | indicators, patterns | Implemented, tested |
| Field Manual + Contingency | `S.manual` | defense.js | capabilities, pipeline | Implemented, tested |
| Knowledge pipeline | `lib/sources.json` + `S.sources` | kpipe.js | cards, capabilities, manual, experiments, tasks | Implemented, tested; weekly discovery task NOT created (needs approval) |
| BAC loop + official sources | `S.lifeTests`, `S.lifeErrors`, `BAC_OFFICIAL` | bac.js, life.js | mcBuild | Loop implemented; topic map pending the official programmes PDF |
| Indicators | computed | reality.js | Operator | Implemented |

Entry points: You → Engine → **Operator** (one screen of tiles), the global ＋ (Journal, Trigger), the Day mission (Why this, mode/lens), Progress → Capability map.

### Continuous discovery (approved design, scheduled task not yet created)
Weekly, Monday 07:37 Chisinau: Gmail read-only search for Acquisition.com / Hormozi mail of the last 8 days → process each educational email in own words (no long quotes), mark linked videos "not accessed" unless a transcript is reachable → de-duplicate against `lib/sources.json` and `lib/cards.json` → one "📥 Knowledge discovery" note in the in-app inbox (same SQL pattern as the nightly review) with a one-line JSON list → Egor pastes it into Knowledge pipeline → Import. Nothing is imported, operationalized or changed without him. The full prompt is in the session report of 19 Nov 2026.


## 13.27 · Content and the rest of the map

| Need | Owner | Data | Feeds |
|---|---|---|---|
| What to learn now | `content.js` (`ccPlan`, `ccToday`) | `lib/sources.json`, `lib/mentors.json`, `S.content` | reads `mcBuild` (gate), `cmNext` (focus); writes journal, tasks, experiments, manual |
| Discovery | Claude scheduled tasks (weekly scan, monthly review) | `S.research`, `S.settings.discovery`, inbox notes | proposes only; `ccInboxImport` adds on tap |
| Campaign execution | `expand.js` (`cx*`) | `S.campaigns[].projects`, `S.tasks[].camp` | `lxCandidates` → `mcBuild` |
| Extra candidates | `expand.js` `lxCandidates` | money log, campaign actions | the single ranking in `mcBuild` |
| Practice | `expand.js` `cmTrain`, `JL_BR` | `S.boot['cx:*']`, `S.boot['jb:*']` | capability log as `src:'sim'` (never evidence) |
| BAC plan | `expand.js` (`bac*`) + `bac.js` | `lib/bac.json`, `S.boot['bt:*']`, `S.lifeErrors` | `bacNext` → `mcBuild` |

Rule kept: one recommender. Content, campaigns and money add candidates or facts; none of them shows a second "do this now".
