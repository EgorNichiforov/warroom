# Bootcamp system spec (13.26.0)

Goal: from not knowing → understanding → remembering → using. Nothing counts because it was read or watched.

## One mastery ladder (`bcRung` in bootcamp.js)
A stage is reached only when every stage before it is.

| # | Stage | Evidence (any one) | Stored as |
|---|---|---|---|
| 1 | Exposed | lesson finished | `l:<id>` |
| 2 | Understood | Feynman test 4/5 · teach-back 3★+ (AI graded) · closed-book reconstruction 3/5 · written lesson recall graded partly or better | `fy:` `tb:` `rk:` `l:.rc` |
| 3 | Retained | a blank-page recall graded Good/Easy on a later day than the lesson, AND estimated memory ≥ 70% now | `rh:` + `S.cards` |
| 4 | Applied | knowledge/problem/judgment ideas: a right decision inside 30 s, or a logged real use. **Performance ideas (opener, discovery, objections, people): a logged real use only. Simulations are practice.** | `j:` `u:` |
| 5 | Integrated | transfer test 3/5+ in a different part of life | `tr:` |
| 6 | Maintained | a successful recall 30+ real days after the lesson | `rh:` dates |

Never counts: watching a video, finishing a lesson (beyond Exposed), confidence, recall for Understood, teach-back for Integrated, a simulation for a performance skill, a hand-ticked step.

## Adaptive spacing (mastery.js)
Estimated retention R = e^(−days since last recall / stability S). It is a model estimate, labelled as such.
Grades: Again → S×0.4, back tomorrow, fix-it step, weak-spot +1 · Hard → shorter gap · Good → S×(1.15–2.5, larger when more was remembered) · Easy → ×1.4 more.
Queue = due + anything under 70%, lowest retention first. Confidence is asked before the answer; sure-and-wrong = blind spot, returns the next day.
Not yet used by the scheduler: importance of the idea, response time. Planned, see roadmap.

## Six learning modes (capability.js `CP_MOD_MODE`)
knowledge · performance · problem-solving · physical · self-regulation · judgment. Each module declares its mode and its proof.

## Learning mission (capability.js)
25 min: briefing → due reviews → one new lesson → closed-book reconstruction → application (closes only on evidence) → debrief. One mission a day; the Day mission (mission.js) points to it when ideas are fading.

## Course states
Watched (video position saved) · Learned (lesson reached Understood) · Demonstrated (Applied+). Today only the ladder shows this; a per-course view is on the roadmap.

## Application evidence from real work
13.26: after-action review (`cpAar`) links a real event to a capability and an idea. Effort (did / partly / avoided), outcome (good / mixed / bad) and skill to standard (yes / partly / no) are recorded separately. The idea counts as real use (Applied) only when the skill was performed to standard WITH written evidence. Before 13.26 any review counted. Call transcripts → coaching → next lesson is blocked on the Quo setup. A recorded call never awards a stage by itself: the review does.

## BAC loop (bac.js + life.js)
error → error card (spaced 1/3/7/14/30) → due errors become the day's BAC mission → timed mock every 14 days per subject → last-3 average vs target → weakest subject + most-missed topic gets the study block. "On track" is stated only when every subject has a mock. Subjects/targets come from `LF_SUBJ` and are NOT verified against the ministry's 2027 rules.

## Provenance
Each idea shows its source (`who` / course) and claim type. Default label: "practitioner advice, paraphrased, not independently verified". A `kind` field on a card overrides it (research finding · legal requirement · practitioner advice · business heuristic · personal experiment). No card has been re-verified yet.


## Capability map (13.26, capmap.js)
Nine domains (business, communication, judgment, safety, decisions, self-regulation, money and adult life, physical, learning), about 95 capabilities. Each defines: meaning, observable competent behaviour, knowledge, practice, real-world evidence, assessment, next step, training mode, and the existing cards that teach it. A capability with no card is shown as **missing content**; nothing is invented to fill it.
Two separate levels per capability:
- **Knowledge** = how many of its mapped ideas are Understood / Retained / Applied on the ladder.
- **Performance** = judged real events in `cx:<id>`: 0 none · 1 attempted · 2 partly · 3 demonstrated (skill to standard with evidence) · 4 reliable (3+ on 3+ days) · 5 transferred (2+ contexts). Simulations, scenarios and call-log activity never raise it.
`cmNext()` picks one capability to develop with its reasons: season domain, active campaign, 2+ shortfalls in 45 days (→ targeted practice), avoidance, theory known but no performance.


## 13.27 additions

- Cards may carry `src` (source), `kind` (claim class), `cf` (consequence of forgetting, 3 = safety/law/money → memory floor 0.85), `added`.
- Modules l8 Think clearly, l9 Safety & readiness, l10 Money & adult life, l11 People II. Safety cards contain no physical technique: first aid is a course.
- Training flows: `cmTrain(capId)` by domain; money drills generate numbers and check the arithmetic; branching scenarios `JL_BR` store runs in `jb:<id>`.
- Every deep card ends with "Best resources for this lesson" from the content index, or states that none is verified and offers a research request.
