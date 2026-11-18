# Bootcamp system spec (13.24.0)

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
After-action review (`cpAar`) links a real event to an idea and counts as real use. Call transcripts → coaching → next lesson is blocked on the Quo setup. A recorded call never awards a stage by itself: the review does.

## BAC loop (bac.js + life.js)
error → error card (spaced 1/3/7/14/30) → due errors become the day's BAC mission → timed mock every 14 days per subject → last-3 average vs target → weakest subject + most-missed topic gets the study block. "On track" is stated only when every subject has a mock. Subjects/targets come from `LF_SUBJ` and are NOT verified against the ministry's 2027 rules.

## Provenance
Each idea shows its source (`who` / course) and claim type. Default label: "practitioner advice, paraphrased, not independently verified". A `kind` field on a card overrides it (research finding · legal requirement · practitioner advice · business heuristic · personal experiment). No card has been re-verified yet.
