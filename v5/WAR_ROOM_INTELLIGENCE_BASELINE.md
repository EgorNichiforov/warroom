# War Room · intelligence baseline and gap analysis

Written 20 Nov 2026 against the brief "Personal Reality, World Intelligence and Future Lab" (the addendum to the
84621 master mission). Its section 26 asks for this first: what already exists, what is missing, what depends on what.
Every "exists" below names the file that does it. Nothing here is a promise; the backlog is the plan.

## What the brief asks for, against what is in the app (13.58.0)

| Brief section | Exists | Where | Gap |
|---|---|---|---|
| 3 Eight kinds of claim (observed, reported, external, derived, inference, hypothesis, forecast, recommendation) | Partly | `entity.js` (origin and confidence per record), `fidelity.js` (how each part of life is evidenced), `forecast.js` (forecasts labelled as forecasts), content library (claim class per source) | No single field with the eight kinds on every record; older screens show numbers without their kind |
| 3.1 Temporal ledger (when it happened against when it was recorded) | Partly | `S.days` by date, `entity.js` event log, `_u` stamps | "Happened at" and "recorded at" are not kept apart; late entries look like on-time ones |
| 3.2 Source and provenance | Partly | `entity.js`, content `claim`/`stat`, outside dial reports marked as his own word | No provenance on values typed into the day record |
| 3.3 History and change detection | Partly | `entity.js` event log, server nightly backup, `fidelity.js` freshness | No "what changed since last week" view |
| 4 Deep domain models | Yes, uneven | `reality.js`, `domain.js`, `model.js`, money, body, learning modules | Health and relationships are thin by design (no inference) |
| 4.1 Cross-domain interaction | Partly | `reality.js` conflict detection, `capability.js` | No tested links (sleep → dials and the like) |
| 4.2 Fidelity map | Yes | `fidelity.js` | — |
| 5 Learning without questionnaires | Partly | Log anything, `ask.js`, calendar and Todoist links, Sheet sync, `fidelity.js` "what would help most", `model.js` corrections | No passive sources beyond those |
| 6 Hardware and sensing | No | — | Research only; nothing to buy without his approval. Not started |
| 7 World intelligence | Partly | Content library, daily content scan, Sunday intel sheet, `sdx*` sources that disagree | No world-model validation; server web research has no search quota |
| 8 Knowledge graph and causal hypotheses | Partly | `entity.js` relations, link kinds in `finish.js`, `S.experiments` | Hypotheses are not first-class records tied to experiments |
| 9 Knowing the limits of its knowledge | Partly | Minimum-evidence rules (`model.js`, `fidelity.js`, `forecast.js` refuses under three weeks) | The six uncertainty types are not named anywhere |
| 10 Future Lab simulation | Partly | `future.js` (backwards from a goal, the chain), scenarios in `finish.js` | No simulation with ranges; rightly waits on section 11 |
| 11 Prediction, backtesting, calibration | Yes, first piece | `judge.js` (his predictions, Brier), `forecast.js` (the system's own weekly forecasts, marked against records, against a naive rule, with a replay over past weeks) | Three variables only; probability forecasts by the system not yet; no drift detection |
| 12 Decisions and experiments | Yes | `judge.js`, `intel.js` | — |
| 13 Specialist agents | Yes | `agents.js` (12 roles), server worker (6) | Collaboration is one red-team pass |
| 15 Intelligence gap engine | Partly | `fidelity.js` `fdmNext` | Does not yet weigh a gap by the decision it blocks |
| 16 Architecture | Yes | Offline-first app, Supabase sync, server jobs | — |
| 17 Privacy, safety, human authority | Yes, with open items | Device keys, lock (off), vault (off), proposals need approval | Lock untested on real devices; AI relay must be checked before the lock is used |
| 22 Testing and evaluation | Yes | 21 suites, about 1,150 checks; real laptop checks since 20 Nov | No phone testing |

## Dependencies (what must be true before what)

1. Claim kinds and "happened at / recorded at" (section 3) come before any simulation: a model fed mixed facts and guesses cannot be checked.
2. The forecast register (section 11) comes before the Future Lab (section 10): a simulation is only worth showing once simpler forecasts have a measured track record.
3. Call records come before every business model. Today there are none: no conversion rate, forecast or scenario about the business can be trusted, and the app says so.
4. World intelligence beyond the library needs a search service, which costs money or a sign-up: his decision.

## Hardware (section 6)

Not started. It is a research task with web sources and no purchase. It should answer one question first: which single measurement, if captured automatically, would change a decision he makes? On present evidence the largest gap is not a sensor at all: it is calls that are made but not recorded.
