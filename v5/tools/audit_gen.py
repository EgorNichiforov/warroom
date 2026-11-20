# One ledger for every prompt Egor sent. Writes v5/ALL_PROMPTS_AUDIT.md and v5/audit.js (the in-app page).
# Status: B built in this mission with a test · E existed before, its own note claims it and its tests pass, NOT re-checked
# line by line · P partly · N not built · Y needs Egor · X an instruction about method, not a feature.
import json, re
import os; R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
L = []
def brief(key, title, sent, rows): L.append({'k': key, 't': title, 'sent': sent, 'rows': [dict(zip(('s', 'st', 'w', 'n', 'o'), (r + ('',) * 5)[:5])) for r in rows]})
brief('P01', 'Complete personal operating system and human development', 'before 19 Nov', [
 ('2 Personal reality model', 'E', 'reality.js, mission.js (season), model.js, fidelity.js', 'CHECKED LINE BY LINE 20 Nov: circumstances, the season with all eleven fields, the seven fact statuses with dates, all nine kinds of constraint, and patterns from records are in the code. One line missing: which routines support your execution.', 'rlOpen'),
 ('3 Life strategy and campaigns', 'P', 'reality.js (direction), intel.js (campaigns), future.js (the chain)', 'CHECKED LINE BY LINE 20 Nov: life direction and the cap of three active campaigns were there; a campaign had 7 of the 15 fields you listed, and now has all of them (13.64). Still thin: the questions in 3C (which campaign is behind and why) are answered only through Mission Control, and campaign-to-calendar (3E) was not verified.'),
 ('4 Personal intelligence layer', 'E', 'intel.js, reality.js', ''),
 ('5 Judgment lab', 'E', 'judge.js', 'CHECKED LINE BY LINE 20 Nov: all fourteen decision fields, predictions written before the outcome, the review, the six quality questions (not graded by outcome) and scenario practice with a transfer question are in the code.', 'jlOpen'),
 ('6 Red team and reality check', 'B', 'judge.js, agents.js (Red Team role)', 'CHECKED LINE BY LINE 20 Nov: the ten checks, the risk register with all nine fields and the pre-mortem were there. The intervention that says stop refining and do the task was missing; built in 13.65 and 13.66; it speaks only when your records show it, and it counts War Room versions released against dials recorded.', 'rtOpen'),
 ('7 Attention defense and self-regulation', 'B', 'defense.js, mission.js (day modes)', 'CHECKED LINE BY LINE 20 Nov: triggers, if-then protocols with review date and evidence, protocol results, lapse recovery and attention measures were there. What each of Full, Minimum and Recovery means in practice was one line each; 13.65 spells it out from your Playbook and lets you set your own restart condition.', 'dfOpen'),
 ('8 Personal field manual', 'E', 'defense.js, ops.js', 'CHECKED LINE BY LINE 20 Nov: all thirteen fields, the six kinds of source, turning a lesson into an entry and flagging old or doubtful entries are in the code.', 'fmOpen'),
 ('9 Connected personal knowledge system', 'P', 'capmap.js, entity.js, finish.js (link kinds), kpipe.js', 'Read 20 Nov, not settled line by line: links, search, source and verification status exist; I did not find a field for limitations or for the date last checked, and the upkeep list (duplicates, outdated, never used) was only partly found.'),
 ('10 The complete Bootcamp, nine areas', 'P', 'capmap.js, bootcamp.js, mastery.js, blueprint.js', 'CHECKED LINE BY LINE 20 Nov: nine areas, six ways of training and the six-step ladder are there. Of about 130 capabilities you listed, ten had no home in the map; 13.65 adds eight entries for them (92 in all). Each is linked to the nearest existing lessons; its own lesson is still missing, and the map says so. Review scheduling and course states were found but not checked line by line.', 'cmOpen'),
 ('11 Real-world experience and after-action', 'B', 'capability.js (reviews), journal.js, capmap.js, defense.js', 'CHECKED LINE BY LINE 20 Nov: the review had six of your seven questions; What did I learn is added in 13.68. A review whose change was tested and kept can now become a Field Manual procedure, filed as a personal experiment. The timeline exists; filtering by period was not checked.'),
 ('12 Personal resource planner', 'P', 'reality.js (capacity), money modules', 'Read 20 Nov: time against commitments, the over-full week with a proposed fix, and money from the Money hub are there. Not found: a check for a week with no recovery time, estimates corrected from how long things really took, and support or equipment as resources.', 'rlCapOpen'),
 ('13 Contingency and readiness center', 'E', 'defense.js', 'CHECKED LINE BY LINE 20 Nov: all eleven plans you listed plus a medical one, the eight parts of a plan with its review date, and the five readiness checks are in the code. Contacts are left for you to fill in; none are invented.', 'fmContOpen'),
 ('14 Contextual operating modes', 'E', 'mission.js (lens and day mode), expand.js (money lens)', 'CHECKED LINE BY LINE 20 Nov: my earlier note was wrong. All six exist: Business, Study, Training, Money and Life as a lens for the day, and Recovery as a day mode. Fixed commitments stay visible in every one.'),
 ('15 Complete BAC preparation', 'P', 'bac.js, life.js (error notebook), expand.js (diagnostic)', 'CHECKED LINE BY LINE 20 Nov: the error notebook kept four of your eight fields; 13.68 adds the question, why I was wrong, the misunderstanding underneath and the correct reasoning, and shows the next review date. The topic map, the diagnostic and the board were found but not checked line by line, and the official sources were not re-verified in this pass.'),
 ('16 Practical life competence program', 'P', 'bootcamp.js, blueprint.js', 'Same gap as section 10.'),
 ('17 Weekly review and personal board meeting', 'E', 'engine.js (12-minute board meeting), strategy.js, the Sunday audit task', 'Read 20 Nov, found, not checked question by question against your eight areas.'),
 ('18 Development metrics', 'P', 'reality.js, depth.js (scorecard), life.js', 'Read 20 Nov: the indicators exist and system overhead is measured against logged work. One conflict for you to decide: this prompt says to avoid a single grand score, and the Study tab still shows one weekly Life score from an earlier build. I left it in place.', 'scOpen'),
 ('19 All systems work together', 'B', 'cohere.js, entity.js, mission.js as the one recommender', ''),
 ('1, 20, 23, 25 Mission, rules, deliverables, standard', 'X', '', 'Followed as rules of work.')])
brief('P02', 'Email intelligence and complete integration', 'before 19 Nov', [
 ('2 Integrate everything', 'E', 'content.js, kpipe.js, the daily content scan (Gmail read-only)', ''),
 ('3 Connections, not isolated content', 'E', 'kpipe.js, capmap.js', ''),
 ('5 Final requirement: every email processed', 'P', 'daily scan', 'The backlog is worked off six emails a run. It is not finished.')])
brief('P03', 'Complete Alex Hormozi library', 'before 19 Nov', [
 ('1 Deep research into the material', 'E', 'lib/sources.json, acq.js', ''),
 ('2 ALL companion workbooks and bonus playbooks', 'P', 'lib/sources.json', 'I have not verified that every workbook that exists is in the library.'),
 ('3 Resource inventory', 'E', 'lib/sources.json, content.js', ''),
 ('4-5 Into the Bootcamp as learning experiences', 'E', 'bootcamp.js, explain.js, clips.js, acqviz.js', ''),
 ('6 Connected to your business', 'E', 'opsys.js, blueprint.js', ''),
 ('7 Mastery architecture kept', 'E', 'mastery.js, proof.js', ''),
 ('8 Research quality and honesty', 'E', 'claim class and status on every source', '')])
brief('P04', 'War Room 13.24.3 execution brief', 'before 19 Nov', [
 ('Phase A Unify the daily execution system', 'E', 'mission.js, guide.js', ''),
 ('3 Complete the Bootcamp', 'P', 'bootcamp.js, blueprint.js', 'See P01 section 10.'),
 ('4 Finish the BAC system', 'E', 'bac.js', ''),
 ('5 One real-life learning journal', 'E', 'journal.js', ''),
 ('7 UX requirements', 'E', 'ux.js, wayfind.js', ''),
 ('1, 2, 6, 8, 9 Rules, method, report', 'X', '', 'Followed. Section 6 (no security changes) was later lifted by you.')])
brief('P05', 'Content intelligence, multimedia learning, knowledge to execution (sent twice)', 'before 19 Nov', [
 ('1 Central content command center', 'E', 'content.js', ''),
 ('2 Every lesson has the best teaching resource', 'P', 'clips.js, lib/sources.json', 'You asked for a video of the person teaching on every lesson. I have not counted how many lessons still have none.'),
 ('4 Personal daily content queue', 'E', 'content.js', ''),
 ('5-6 Continuous research and library updates', 'E', 'daily content scan, monthly curriculum review', 'Run as scheduled Claude tasks, not by the app.'),
 ('7 Email as a discovery source', 'E', 'daily content scan', ''),
 ('8 Universal intake pipeline', 'E', 'kpipe.js', ''),
 ('9 Quality and prioritisation', 'E', 'claim class, tier', ''),
 ('10 A content diet instead of scrolling', 'E', 'content.js (a finite queue)', ''),
 ('11 Short video, long lecture, audio', 'E', 'vplay.js, drive.js', ''),
 ('12-13 Connected to knowledge, execution and the rest', 'E', 'kpipe.js, capmap.js', ''),
 ('14 Learning analytics', 'E', 'content.js, proof.js', ''),
 ('15 Knowledge and content roadmap', 'E', 'research.js', '')])
brief('P06', 'Continuous personalised research', 'before 19 Nov', [
 ('1 Understand direction before searching', 'E', 'research.js', ''),
 ('2 Cadence: daily, weekly, on an event, monthly', 'P', 'daily scan, monthly review, learning requests', 'An event does not trigger a search at once: a request waits for the next daily run. Server research is off (no search quota).'),
 ('3-4 Exact resources, all areas of life', 'E', 'research.js, content.js', ''),
 ('5 Research queue', 'E', 'S.research', ''),
 ('6 Improves the Bootcamp', 'E', 'kpipe.js', ''),
 ('7 Adaptive research priority', 'E', 'research.js (now, next, later)', ''),
 ('8 Connected to execution', 'E', 'capmap.js', ''),
 ('9 Quality and safeguards', 'E', 'verification rules in the scan', ''),
 ('10 Technical implementation', 'P', 'scheduled tasks', 'It lives in Claude tasks; inside the app and server only the queue and the import exist.')])
brief('P07', 'Business knowledge base as the operating system', 'before 19 Nov', [
 ('1 Audit and use the whole library', 'E', 'opsys.js, blueprint.js', ''),
 ('2 The operating playbook: recruiting, sales, team', 'E', 'opsys.js, playbook.js', ''),
 ('3 Knowledge into implementation', 'E', 'opsys.js', ''),
 ('4 Continuous improvement', 'E', 'opsys.js, lab.js', ''),
 ('5 Bootcamp tied to real execution', 'E', 'capmap.js', ''),
 ('6 An increasingly valuable company', 'E', 'strategy.js', '')])
brief('P08', 'New source material (the three books)', 'before 19 Nov', [
 ('1 Inspect every file', 'P', 'earlier session', 'Done in an earlier session; I did not re-read the three books today.'),
 ('2-4 Extract, connect, turn into lessons', 'E', 'kpipe.js, bootcamp.js', ''),
 ('5-6 Apply to Caregiver Bench; adapt Gym Launch', 'E', 'blueprint.js (knowledge to execution)', ''),
 ('7 Knowledge-to-execution map', 'E', 'blueprint.js', ''),
 ('8-9 Update priorities and library', 'E', 'research.js, lib/sources.json', ''),
 ('10 Verify the result', 'P', '', 'Not re-verified today.')])
brief('P09', 'Implementation specification: nine systems', 'before 19 Nov', [
 ('System 1 Personal Development Blueprint', 'E', 'blueprint.js', ''),
 ('System 2 Adaptive learning engine', 'E', 'learnx.js, capability.js', ''),
 ('System 3 Content intelligence and research', 'E', 'content.js, research.js', ''),
 ('System 4 Unified content library', 'E', 'content.js', ''),
 ('System 5 Learning and mastery', 'E', 'mastery.js, proof.js', ''),
 ('System 6 Practical capability', 'E', 'capability.js, capmap.js', ''),
 ('System 7 Personal development planner', 'E', 'research.js, learnx.js', ''),
 ('System 8 Business knowledge to execution', 'E', 'opsys.js, blueprint.js', ''),
 ('System 9 Strategic intelligence', 'E', 'strategy.js, intel.js', '')])
brief('P10', 'Complete personal development, knowledge and strategic intelligence', 'before 19 Nov', [
 ('Part 1 Blueprint and curriculum, ten areas A to J', 'P', 'blueprint.js', 'The ten areas exist. The content under each is not complete; the Blueprint shows which.'),
 ('Part 2 Roadmap; assess capability, not content', 'E', 'capability.js', ''),
 ('Part 3 Intelligent research and one library', 'E', 'research.js, content.js', ''),
 ('9 Market intelligence', 'E', 'blueprint.js, the Sunday brief', ''),
 ('10 Synthetic test data', 'P', '', 'Not re-checked today.'),
 ('11 Email backlog', 'P', 'daily scan', 'Six a run; not finished.'),
 ('12 Five missing capabilities', 'E', 'expand.js', ''),
 ('13 Content quality review', 'P', 'monthly curriculum review', 'First monthly run is 1 Dec.'),
 ('14 Lost Chapters and Gym Launch Secrets', 'E', 'see P08', ''),
 ('15 Physical-device testing', 'Y', '', 'Laptop tested by me since 20 Nov. The phone has never been tested by anyone but you.'),
 ('Part 5 Coherence; protection against overwhelm', 'B', 'cohere.js, content.js, finish.js (folded finder)', '')])
brief('P11', 'Unified learning experience and learning engine', 'before 19 Nov', [
 ('1-2 One Learn place, time-aware Learn Now', 'E', 'learnx.js', ''),
 ('3 Roadmap, paths, courses, lessons, library, practice, missions, review, mastery connected', 'E', 'learnx.js, learn.js, mastery.js', ''),
 ('4-5 The workflow and one learning session', 'E', 'learnx.js', ''),
 ('6 One recommendation engine', 'E', 'learnx.js for learning, mission.js for everything', ''),
 ('7-8 Content connected automatically; paths visible', 'E', 'kpipe.js, learn.js', ''),
 ('9-10 Simpler experience; data architecture', 'E', '', ''),
 ('11 Acceptance tests', 'E', 'tests/', '')])
brief('P12', 'Coherence plan 13.31.1', 'before 19 Nov', [
 ('Stages 1 to 8', 'E', 'cohere.js and others', 'Stage 7 was investigation only, as instructed.'),
 ('1 Build Gate', 'X', '', 'Withdrawn by you on 20 Nov.'),
 ('4 Security item: investigate only', 'E', '', '')])
brief('P13', 'Unified implementation prompt', '19 Nov', [
 ('Part 1 Coherence stages and the Acvila security item', 'E', 'cohere.js', ''),
 ('Part 2 Learning and Bootcamp architecture A to F', 'P', 'bootcamp.js, blueprint.js, learnx.js', 'Architecture yes; Bootcamp content not complete (P01 section 10).'),
 ('Part 3 One depth standard for every domain (2 to 12)', 'P', 'domain.js', 'Business, money, execution, body, focus, learning are deep. School beyond BAC, health and people are thin.'),
 ('Part 4 Redesign for clarity (1 to 8)', 'P', 'ux.js, wayfind.js, shell.js', 'One home per activity and a finder exist. A screen-by-screen redesign was not done; I advised against rewriting a working app.'),
 ('Part 4.9 Mobile-first testing', 'Y', '', 'Needs your phone.'),
 ('Part 4.10 Measurable usability criteria', 'P', 'tests/test_1348.py', 'Speed and offline are measured; taps-to-task only for a few journeys.')])
V = [l for l in open(R + 'VISION_COVERAGE.md').read().split('\n') if l.startswith('| ') and not l.startswith('| Part') and not l.startswith('|---')]
rows = []
for l in V:
    c = [x.strip() for x in l.strip('|').split('|')]
    if len(c) >= 2:
        s = c[1].lower() if len(c) > 2 else ''
        st = 'P' if 'partial' in s or 'partly' in s else ('N' if s.startswith('not') else ('B' if 'built' in s else 'E'))
        if len(c) == 2: st = 'B'
        rows.append((re.sub(r'[*`]', '', c[0])[:90], st, re.sub(r'[*`]', '', c[2] if len(c) > 2 else '')[:70], re.sub(r'[*`]', '', c[3] if len(c) > 3 else c[1])[:230]))
brief('P14', 'The 100% vision', '19 Nov', rows)
brief('P15', 'Personal Reality, World Intelligence and Future Lab', '20 Nov', [
 ('3 Eight kinds of claim', 'P', 'claims.js, entity.js', 'On the scorecard and one page; not inside the day header, money screen or Mission Control.', 'ckOpen'),
 ('3.1 Happened-at against recorded-at', 'N', 'claims.js (a count only)', 'Day-level change stamps cannot tell your typing from the hourly sync. Needs a time on each entry.'),
 ('3.2 Source and provenance', 'P', 'entity.js, content library', 'Per record type, not per typed value.'),
 ('3.3 History and change detection', 'P', 'entity.js event log, nightly server backup', 'No "what changed since last week" view yet.'),
 ('4 Deep domain models; 4.2 fidelity map', 'B', 'reality.js, domain.js, model.js, fidelity.js', '', 'fdmOpen'),
 ('4.1 Cross-domain interaction', 'N', '', 'No tested links yet (for example sleep and next-day dials).'),
 ('5 Learning without questionnaires', 'P', 'Log anything, ask.js, calendar, Todoist, Sheet sync', 'No passive sources beyond those.'),
 ('6 Hardware and sensing', 'N', '', 'A research document, no purchase. Not started.'),
 ('7 World intelligence', 'P', 'content library, daily scan, sources that disagree', 'No world-model validation; server search has no quota.', 'sdxOpen'),
 ('8 Knowledge graph and causal hypotheses', 'P', 'entity.js, link kinds, experiments', 'Hypotheses are not yet records tied to experiments.'),
 ('9 Limits of its own knowledge', 'P', 'minimum-evidence rules in model.js, fidelity.js, forecast.js', 'The six kinds of uncertainty are not named.'),
 ('10 Future Lab simulation', 'P', 'future.js, scenarios', 'No simulation with ranges. Deliberately waits until forecasts have a track record.'),
 ('11 Prediction, backtesting, calibration', 'B', 'judge.js, forecast.js', 'Three variables; first real marked week comes after Monday 23 Nov.', 'fctOpen'),
 ('12 Decisions and experiments', 'E', 'judge.js, intel.js', '', 'jlOpen'),
 ('13 Specialist agents', 'B', 'agents.js (12 roles), server worker (6)', '', 'agOpen'),
 ('15 Intelligence gap engine', 'P', 'fidelity.js', 'Does not yet weigh a gap by the decision it blocks.'),
 ('16-17 Architecture, privacy, human authority', 'B', 'server, device keys, vault, approvals', 'Lock and vault are off; lock untested on real devices.', 'svOpen'),
 ('20 Required documents', 'P', 'baseline and backlog written', 'The other documents the brief lists are not written.'),
 ('22 Testing and evaluation', 'P', '25 suites; laptop checks', 'No phone testing.')])
brief('P16', 'Bilingual communication, articulation and verbal intelligence', '20 Nov', [
 ('2 Philosophy: ability over information', 'B', 'speak.js', 'Every exercise makes you produce something.', 'spkOpen'),
 ('3 Five domains A to E', 'P', 'speak.js, speak4.js (30 exercises)', 'PREP, problem-cause-consequence-solution, claim-evidence-reasoning and situation-complication-resolution are exercises. MECE is not.'),
 ('4.1 Four language modes', 'B', 'speak.js, speak2.js', 'Romanian, English, switch mid-conversation, question in the other language.'),
 ('4.2 Cross-language thought transfer', 'B', 'speak.js ("The words did not come")', 'Needs an AI key.'),
 ('4.3 Code-switching analysis', 'P', 'coach rules', 'Mixing is never marked as a mistake and both full versions are given; there is no separate breakdown of the mixed sentence.'),
 ('4.4-4.5 Romanian and English quality', 'P', 'coach instructions', 'Depends on the AI model. Two real answers checked, on the lighter model.'),
 ('5.1 Daily session', 'B', 'speak3.js', '', 'spdOpen'),
 ('5.2 Voice first', 'P', 'speak.js', 'Browser speech-to-text with editable text. No recording kept, no playback. Never tested with a real microphone.'),
 ('5.3 Conversation simulation', 'B', 'speak2.js', 'One real reply checked on your laptop.', 'spcOpen'),
 ('5.4 Explain it differently', 'B', 'speak2.js', '', 'spxOpen'),
 ('6 Feedback engine', 'B', 'speak.js', 'Seven parts; a point whose quote is not in what you said is dropped; nothing about pronunciation.'),
 ('7 Personal communication profile', 'P', 'speak3.js', 'Per language and per skill: yes. Fillers and repeated words are counted per attempt but not gathered into the profile; interference patterns are not tracked.', 'sppOpen'),
 ('8 Adaptive learning and spaced repetition', 'P', 'speak.js, speak4.js', 'Words, corrected habits, exercise choice, levels, a slip note: yes. Grammar patterns and sentence structures as their own review: no.', 'sphOpen'),
 ('9 Six-stage curriculum', 'B', 'speak4.js', 'A level opens on scores, never on time.'),
 ('10 Real-world integration', 'P', 'speak.js, speak2.js', 'Capturing a moment: yes. Eight situations exist; the eleven scenario families are not all there.'),
 ('11 Overview, train, vocabulary, progress, history', 'B', 'speak.js, speak3.js', 'Text and a small weekly bar; no charts.', 'sppOpen'),
 ('12 Data architecture', 'B', 'synced records, no audio stored', ''),
 ('13 Coach quality', 'P', 'rules and checks', 'Not evaluated beyond two real answers.'),
 ('14 Quality assurance', 'P', 'tests 1354, 1357, 1359, 1361', 'Microphone refusal and recognition failure are handled in code, not tested with a real microphone. Android not tested.'),
 ('15 Definition of done', 'P', '', 'Every step exists. Speaking by voice on your devices is unverified.')])
OPN = {('P01','2 Personal reality'):'rlOpen', ('P01','3 Life strategy'):'stOpen', ('P01','5 Judgment'):'jlOpen', ('P01','6 Red team'):'rtOpen', ('P01','7 Attention'):'dfOpen', ('P01','8 Personal field manual'):'fmOpen', ('P01','9 Connected'):'cmOpen', ('P01','10 The complete Bootcamp'):'bpOpen', ('P01','12 Personal resource'):'rlCapOpen', ('P01','13 Contingency'):'fmContOpen', ('P01','15 Complete BAC'):'bacOpen', ('P01','16 Practical life'):'bpOpen', ('P03','6 Connected to your business'):'kxOpen', ('P04','4 Finish the BAC'):'bacOpen', ('P05','8 Universal intake'):'kpOpen', ('P05','15 Knowledge and content roadmap'):'rsOpen', ('P06','5 Research queue'):'rsOpen', ('P06','7 Adaptive research'):'rsOpen', ('P07','2 The operating playbook'):'osOpen', ('P07','6 An increasingly'):'stOpen', ('P08','7 Knowledge-to-execution'):'kxOpen', ('P09','System 1'):'bpOpen', ('P09','System 5'):'pfOpen', ('P09','System 6'):'cmOpen', ('P09','System 8'):'kxOpen', ('P09','System 9'):'stOpen', ('P10','Part 1 Blueprint'):'bpOpen', ('P10','9 Market'):'mktOpen', ('P11','1-2 One Learn'):'lxPlanOpen', ('P13','Part 3 One depth'):'dmOpen'}
for b in L:
    for r in b['rows']:
        for (k, pre), fn in OPN.items():
            if b['k'] == k and r['s'].startswith(pre) and not r['o']: r['o'] = fn
NAME = {'B': 'Built, with a test', 'E': 'Exists (not re-checked line by line)', 'P': 'Partly', 'N': 'Not built', 'Y': 'Needs you', 'X': 'A rule of work'}
tot = {k: 0 for k in NAME}
for b in L:
    for r in b['rows']: tot[r['st']] += 1
md = ['# Every prompt, section by section', '', 'Written 20 Nov 2026 at your request. Seventeen prompt files (one was sent twice), ' + str(sum(len(b['rows']) for b in L)) + ' sections.', '',
      '**What this is:** a check at the level of sections. "Exists" means a module is there whose own note says it does this and whose tests pass; it does NOT mean I re-read every sentence of that prompt against the app today. A line-by-line check of about 17,000 lines has not been done.', '',
      '| Status | Sections |', '|---|---|'] + ['| ' + NAME[k] + ' | ' + str(tot[k]) + ' |' for k in NAME] + ['']
for b in L:
    md += ['## ' + b['k'] + ' · ' + b['t'] + ' (' + b['sent'] + ')', '', '| Section | Status | Where | What is missing |', '|---|---|---|---|'] + ['| ' + r['s'] + ' | ' + NAME[r['st']] + ' | ' + r['w'] + ' | ' + r['n'] + ' |' for r in b['rows']] + ['']
open(R + 'ALL_PROMPTS_AUDIT.md', 'w').write('\n'.join(md))
js = "/* audit.js — generated by work/audit/gen.py. Every prompt Egor sent, section by section, with an honest status.\n   Read-only: stores nothing, ranks nothing, adds no candidate to Mission Control. */\nconst AUD = " + json.dumps(L, ensure_ascii=False) + ";\nconst AUD_NAME = " + json.dumps(NAME) + ";\n"
open(R + 'audit.gen.js', 'w').write(js)
print(tot, sum(tot.values()), len(L))
tail = r"""
function audCount(st) { let n = 0; AUD.forEach((b) => b.rows.forEach((r) => { if (!st || r.st === st) n++; })); return n; }
function audOpen(f) { f = f || ''; const chip = (k, label) => `<button class="btn${f === k ? ' on' : ''}" onclick="audOpen('${k}')">${label} ${audCount(k)}</button>`, mark = { B: '✓', E: '✓', P: '◐', N: '✗', Y: '→ you', X: '·' }; openModal(`<h2>Everything you asked for</h2><div class="hint">Seventeen prompts, ${audCount('')} sections, each with where it lives and what is missing. This is a check section by section. "Exists" means a part of the app is there whose own notes say it does this and whose tests pass; it does not mean every sentence of that prompt was re-read against the app. That line-by-line check has not been done.</div><div class="fn-inline">${chip('', 'All')}${chip('P', 'Partly')}${chip('N', 'Not built')}${chip('Y', 'Needs you')}</div>${AUD.map((b) => { const R = b.rows.filter((r) => !f || r.st === f); if (!R.length) return ''; const done = b.rows.filter((r) => r.st === 'B' || r.st === 'E').length, real = b.rows.filter((r) => r.st !== 'X').length; return `<details class="mc-wl"${f ? ' open' : ''}><summary><b>${esc(b.t)}</b><div class="xs">${done} of ${real} sections in place · sent ${esc(b.sent)}</div></summary>${R.map((r) => `<div class="xs" style="padding:5px 0">${mark[r.st]} <b>${esc(r.s)}</b> · ${esc(AUD_NAME[r.st])}${r.w ? '<div style="margin-left:14px">In: ' + esc(r.w) + '</div>' : ''}${r.n ? '<div style="margin-left:14px">' + esc(r.n) + '</div>' : ''}${r.o && typeof window[r.o] === 'function' ? `<div style="margin-left:14px"><button class="btn" onclick="${r.o}()">Open it</button></div>` : ''}</div>`).join('')}</details>`; }).join('')}<div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true); }
try { if (typeof WF !== 'undefined') { const add = (x) => { if (!WF.some((y) => y[0] === x[0])) WF.push(x); };
  [['judgmentlab', 'Judgment lab: decisions and predictions', 'judgment lab decision record prediction calibration options assumptions review a decision', 'jlOpen'],
   ['redteam', 'Red team: argue against my own plan', 'red team reality check argue against challenge my plan devil advocate', 'rtOpen'],
   ['attention', 'Attention defense: triggers and if-then protocols', 'attention defense distraction trigger protocol self regulation urge phone scrolling', 'dfOpen'],
   ['fieldmanual', 'Field manual', 'field manual what to do when procedure situation playbook for life', 'fmOpen'],
   ['contingency', 'Contingency and readiness', 'contingency readiness emergency backup plan what if something breaks', 'fmContOpen'],
   ['reality', 'Personal reality: facts about my life and how sure each is', 'personal reality facts about me circumstances confirmed assumption unknown', 'rlOpen'],
   ['direction', 'Life direction', 'life direction who i am becoming trade offs what matters long term', 'rlDirOpen'],
   ['capacity', 'Capacity, resources and constraints for the next 7 days', 'capacity resources constraints hours available overloaded resource planner', 'rlCapOpen'],
   ['mypatterns', 'My operating patterns', 'operating patterns when i work best what i postpone avoid interruptions', 'rlPatternsOpen'],
   ['indicators', 'Development indicators', 'development indicators metrics personal development progress', 'lxMetricsOpen'],
   ['strategy', 'Strategy: the company, assets and opportunities', 'strategy company assets opportunities models long game', 'stOpen'],
   ['stratreview', 'Strategic review', 'strategic review quarterly review of strategy', 'stReviewOpen'],
   ['capmap', 'Capability map', 'capability map skills evidence what i can do real world', 'cmOpen'],
   ['devblueprint', 'Personal Development Blueprint', 'development blueprint ten areas competencies curriculum what is missing', 'bpOpen'],
   ['ownerq', 'Owner discovery: questions for agency owners', 'owner discovery market questions ask owners', 'odOpen'],
   ['k2e', 'Knowledge to execution', 'knowledge to execution principles from books applied to caregiver bench', 'kxOpen'],
   ['kpipeline', 'Knowledge pipeline', 'knowledge pipeline discover capture process classify sources', 'kpOpen'],
   ['rightknow', 'Right knowledge at the right time (research)', 'research queue learning requests now next later what to learn', 'rsOpen'],
   ['whoelse', 'Competitors: who else sells to these owners', 'competitors who else sells competition by type', 'mkCompOpen'],
   ['weakspots', 'Weak spots in what I learned', 'weak spots recall mistakes what i keep getting wrong proof', 'pfOpen'],
   ['winning', 'What winning agencies look like', 'winning agencies why owners said no patterns segment', 'dmOpen']
  ].forEach((e) => { if (typeof window[e[3]] === 'function') add([e[0], 'dir', e[1], e[2], 'Where do I…? → ' + e[1].split(':')[0].toLowerCase(), 'Opens the ' + e[1].split(':')[0] + ' screen, built earlier.', () => window[e[3]]()]); });
  add(['allprompts', 'dir', 'Everything you asked for, and where it stands', 'everything i asked for all prompts audit what is built what is missing not built done status coverage 100 percent', 'Where do I…? → everything you asked for', 'Every prompt you sent, section by section: built, partly, not built, or waiting on you.', () => audOpen()]);
} } catch (e) { }
"""
open(R + 'audit.js', 'w').write(open(R + 'audit.gen.js').read() + tail)
import os; os.remove(R + 'audit.gen.js')
