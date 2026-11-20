/* War Room v5 · Playbook: the plan, rules, offer, scripts, SOPs and numbers, in one place you can read and edit.
   Pages ship with the app (PB_SEED). Your edits are stored in S.playbook (synced) and win over the shipped text.
   The dialer reads the scripts from here, so editing a script changes what you see on the next call.
   v4 sales system (17 Nov 2026): this file is the single source of truth; the Drive doc is a mirror of it. */
'use strict';

const PB_CATS = [['system', 'How it works', 'hq'], ['mission', 'Mission', 'target'], ['rules', 'Rules', 'shield'], ['scripts', 'Scripts', 'dial'], ['sops', 'SOPs', 'check'], ['business', 'Business', 'stats'], ['body', 'Body & BAC', 'train'], ['mine', 'My notes', 'pen']];
const PB_SEED_V = 4;
const PB_SEED = [
/* ───────── SYSTEM ───────── */
{ id: 'system', cat: 'system', title: 'One job per tool', body: `The whole system is five tools. Each one does one job. If information has two homes, one of them is wrong.

| Tool | Its one job | Source of truth for |
| **Google Calendar** | WHEN. Anything at a set time | Schedule: blocks, lessons, school, appointments, the day's dial number ("DIALS: 90") |
| **Todoist** | WHAT. Anything to do that isn't at a set time | Tasks, deadlines, reminders, ideas parked for later (project Later) |
| **War Room** | DO and MEASURE | Every number you log (dials, owner talks, food, weight, training, money, standards), the Playbook, your rank and stats |
| **Google Sheets** | Archive and mirror. Never typed in | Nothing. The War Room sheet and the Tracker are copies the hourly sync writes |
| **Claude** | Check-ins and heavy lifting | Nothing. Reads the others; notes land in Ask → From Claude |

## How they connect
- **Calendar → War Room:** HQ "Now", Up next and the day's dial target come from the calendar (once connected in the Calendar tab). Refreshes on open and every 10 minutes.
- **Todoist ⇄ War Room:** "To do today" on HQ and Plan → Tasks are your Todoist. Tick or add in either place; both update. Every 5 minutes.
- **War Room → Sheets:** hourly copy, so the sheet is a readable archive. Don't type in it.
- **Phone ⇄ laptop:** the same War Room on both (More → Devices & sync).
- **Claude:** 06:00 morning brief, 20:40 close the day, Sunday 10:40 review (each leaves a note in Ask), hourly sheet sync, new-applicant alerts, Monday Bulletin draft. Also: lead loading and owner names on request.

## The physical whiteboard
One job: what you need to see without opening a phone. Rewritten every Sunday: **this week's dial number, the ONE change, the next 3 hard deadlines.** Nothing else, so it never goes stale.` },
{ id: 'where', cat: 'system', title: 'Where things go', body: `| Situation | Where | What happens next |
| I wake up: what's today? | **War Room → HQ** | The top card is what to do now. "Today's orders" are the day's jobs, "To do today" is Todoist. The 06:00 note from Claude is under Ask |
| A new task pops up | **+ → Task** (or Todoist's own quick add) | It goes to Todoist. Write the date in words: "call Maria fri 10am" |
| Something must happen on a date | **+ → Task with the date** ("pay rent 1 dec") | Todoist reminds you that day. If it's at a set time with other people, put it in Google Calendar instead |
| A recurring responsibility | At a set time → **Google Calendar repeating event**. No set time → **Todoist** ("every month on the 1st") | A daily habit (sleep, sun, digital) is not a task: it's a Standard you tick in the War Room |
| A new appointment | **Google Calendar** (+ → "New calendar event") | It appears in the War Room Calendar tab and on HQ |
| Planning the week | **Sunday 11:00, Plan → Review** | The week report shows every number against its target. Change the calendar blocks, write ONE change, rewrite the whiteboard |
| A new project with tasks and deadlines | **Todoist: a project** with dated tasks | It shows up in War Room Tasks grouped by project. Its goal number (if it has one) goes in Plan → Goals |
| I finished a task | **Tick it** (HQ, Tasks or Todoist) | Closed in both. Logged work (dials, meals, workouts) counts toward XP and stats by itself |
| Review goals and progress | **Stats** (numbers, Intel, funnel) and **Mission → The plan backward** (the ladder to $20k) | Sunday's Claude review writes the summary |
| An idea I don't want to forget | **+ → Idea** | Parked in Todoist "Later". Looked at only on Sunday. No new business ideas until 100 owner conversations |
| Something to remember (a fact, a name, a number) | **+ → Note** | Kept in Playbook → My notes, searchable |
| Spent cash | **+ → Spent cash** | Money out by category; the sheet copies it |` },
{ id: 'sync', cat: 'system', title: 'One source of truth: how a change travels', body: `Every plan, offer, script and SOP lives in ONE place: **this Playbook.** Everything else is a mirror or a pointer. If two places disagree, the Playbook wins and the other one is a bug.

## When something changes (Sunday review, or when you say "change it now")
1. **Playbook first.** The page is rewritten here. The dialer reads the scripts from here, so the next call shows the new words.
2. **Calendar:** block descriptions that quote the change are updated (dial blocks, review, bench block).
3. **Todoist:** tasks that depend on it are added, changed or closed.
4. **Drive mirror:** the doc "Caregiver Bench: Sales Playbook (mirror)" in 01 Caregiver Bench / 0 START HERE is regenerated from these pages.
5. **Old version:** renamed "OLD date:" and moved to 01 Caregiver Bench / 9 Archive. Never two live versions.
6. **Changelog:** one line on the page System → Changelog (what changed, why, which course rule).

Claude does steps 1–6. You only decide the change.

## What lives where (nothing else)
| Thing | Its only home |
| Offer, prices, guarantees | Business → What we sell |
| Every word said on a call or written in an email | Scripts |
| How a process runs, step by step | SOPs |
| When it happens | Google Calendar |
| What to do that isn't at a set time | Todoist |
| Every number | War Room log (the Sheet is a copy) |
| Research, competitors | Market Intel sheet |
| Course notes | Drive → 06 Learning Library (reference only, never a plan) |
| Course frameworks as working tools (stage, offer, leads, money model, sales drill, mindset) | War Room → Work → Courses · Wealth in Money → Wealth |` },
{ id: 'changelog', cat: 'system', title: 'Changelog', body: `Newest first. One line per change: what, why, which rule.

| Date | Change | Why |
| 21 Nov | **War Room 13.73.0 · search now finds what you are learning** | Checking the personal-development prompt, I typed its own words into the search: negotiation, cooking, contracts, humour. It found nothing, although the Blueprint has every one of them. The search only looked at places, agencies, money, tasks and the Playbook. It now also answers with capabilities, competences and lessons, says which kind each result is, and reads humor as humour. Places still come first, and a search ranks nothing for your day. **Counts the ledger now carries, taken from the data:** the Blueprint has 115 competencies, 92 with a lesson, 20 with none, 32 complete. Market intelligence: 18 entries, each with source, link and date. The company operating system: 31 steps, all still untested. The three books: Lost Chapters 161 pages with two sections unread and 5 lessons; Gym Launch Secrets 430 pages read in excerpts and 2 lessons. Most of those books is still unread. | built on Egor\'s written instruction of 20 Nov 21:30 |
| 21 Nov | **War Room 13.72.0 · the content and research prompts, checked against the data** | Your question was: does every lesson have a video of the person teaching it? Counted from the lesson file: **all 250 lessons have a video.** For 139 the content of the video was inspected. For 40 only the title was matched. For 71 the link exists and its fit was never confirmed. 7 are a video on the topic, not by the named teacher. So the best teacher for every lesson is proven for 139 of 250, not for all. The verification screen already said most of this; it now also counts the 7, and you can reach it from Where do I…? → video verification. **Present as you asked:** the fourteen library sections under the names you gave, the nine durations from 5 to 120 minutes, and the line Do not consume, go execute. **Unchanged and still open:** research on the server is off because no search service is paid for, so a new need waits for the next daily run instead of triggering a search at once. | built on Egor\'s written instruction of 20 Nov 21:30 |
| 21 Nov | **War Room 13.71.0 · the 13.24.3 execution brief, checked against the code and your laptop** | **Two faults found on your laptop, both fixed.** (1) Your goal says: pass the BAC with an average not lower than 7. The BAC board still said Target average 8+ and gave Romanian and History a target of 8, a leftover from 8 Nov. The default is now your floor of 7, and the board says so in words. A target you save yourself still wins; none was saved, so nothing of yours was changed. (2) Saving BAC targets used to wipe your confirmed profile (humanist) and certificate marks. It now keeps them. **Also:** the mission card now shows the why-it-matters line you write on a campaign, not just its objective. **Present as asked:** one recommender, three campaigns at most with progress only from evidence, replanning as keep, move or drop that waits for your yes, sources from ance.gov.md with four points still listed as unverified, and no on-track verdict without mock scores. **A correction to the note below:** 23 emails feed a lesson in the library file; on your laptop it is 47 of 58. | built on Egor\'s written instruction of 20 Nov 21:30 |
| 21 Nov | **War Room 13.70.0 · the email and Hormozi-library prompts, checked against the library** | You asked that anything which could not be opened be put on a list, rather than passed off as studied. That list did not exist. It does now: Where do I…? → not fully opened. **What it shows, from the library itself:** 184 sources; 58 emails from Acquisition.com are recorded, 23 of them feed a lesson in the library file (47 on your laptop, where your own records add links), and 56 were only partly opened (the text was read, the linked video or file was not). The three workbooks (Offers, Leads, Money Models) and the playbook bundle are listed but were never opened and feed no lesson. **The mailbox:** a read-only Gmail search on 20 Nov estimates about 204 emails from these senders; about 114 are from before 1 Sep and none of those is in the library. The daily scan takes six a run, so the old ones are weeks of work, not days. Not finished, and now visible instead of hidden. | built on Egor\'s written instruction of 20 Nov 21:30 |
| 21 Nov | **War Room 13.69.0 · the unified prompt, checked against the code** | All four parts, read line by line late on 20 Nov and released just after midnight. **Present as you asked:** the eight coherence stages (Mission Control sees overdue tasks, waiting agencies, falling numbers, the next company step and your energy; one learning planner; I have N minutes; one capture with an Unprocessed list), the attendance task without the sync id, and a scorecard that states meaning, source, target and leading or lagging for every number. **Found and fixed:** (1) I asked the finder your nine questions in your own words: record training sent you to the call screen and review money to business performance. Both now go to the right place, and all nine questions and twelve tasks are tested. (2) A goal kept ten of the eleven parts you listed; it now also keeps what it needs from you (skills and resources). **Still open:** lessons are missing for some capabilities; caregiver supply and business economics have little real data behind them; a screen-by-screen redesign was not done; nothing here is tested on your phone. | built on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.68.0 · the rest of the oldest prompt, checked against the code** | Sections 11 to 24, read line by line. **Present as you asked:** all eleven contingency plans with the five readiness checks, the six contextual modes (I had wrongly marked them missing: Business, Study, Training, Money and Life are a lens for the day, Recovery is a day mode), the 12-minute board meeting, and system overhead measured against logged work. **Was missing, now built:** (1) the BAC error notebook kept 4 of your 8 fields; it now also keeps the question, why you were wrong, the misunderstanding underneath and the correct reasoning, and shows the next review date. (2) The after-action review now asks What did I learn. (3) A review whose change you tested and kept can become a Field Manual procedure in one tap, filed as a personal experiment, not as a verified rule. **Still open, written in the ledger:** the resource planner has no check for a week without recovery time and does not correct estimates from how long things really took; the knowledge system has no field for limitations or date last checked; and one conflict for you to decide: this prompt says no single grand score, and the Study tab still shows a weekly Life score. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.67.0 · dates corrected** | The notes for 13.65 and 13.66 were dated 21 Nov. They were built late on 20 Nov; I had the date a day ahead. Corrected here, in the ledger of all prompts and in the build log. Nothing else changed. | correction, 20 Nov 23:20 |
| 20 Nov | **War Room 13.66.0 · the reality check now sees the system-building too** | Checked on your laptop with your real records, 13.65 stayed silent: it only counted plans written inside the app, and the refining of the last week did not happen there. It happened here, as War Room versions. So it now also counts versions released in the last 7 days, read from this changelog. The rule: five or more versions in a week while under a quarter of the planned dials are recorded. On your records late on 20 Nov that reads: 2 of 350 planned dials recorded, and it speaks. Record the dials and it goes quiet. It lives on the Red Team screen only; Mission Control still decides what comes first. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.65.0 · sections 5 to 10 of the oldest prompt, checked against the code** | **Present as you asked:** the Judgment Lab (fourteen decision fields, predictions before the outcome, six quality questions, scenarios), the Red Team\'s ten checks, risk register and pre-mortem, Attention Defense (triggers, if-then protocols, lapse recovery) and the Field Manual with all thirteen fields. **Was missing, now built:** (1) the reality check you asked for in these words: Stop refining the system. Do the actual task now. It appears on the Red Team screen only when your records show it (the same mission skipped three times in two weeks, or five or more plans written while under a quarter of the planned dials are recorded), and it goes quiet when the work is recorded. (2) What Full, Minimum and Recovery mean in practice: what must happen, what is reduced, what is postponed and what is never given up, taken from your Playbook, plus a line for your own restart condition. (3) Eight capabilities you listed that had no place in the map (sales management, cultural awareness, travel and practical readiness, logical reasoning and hypotheses, debt and insurance, housing and transport, coordination, reading and note-making): 92 in all. Each is linked to the nearest lessons you already have; a lesson of its own is still missing for each, and the map says so. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.64.0 · first findings from reading the oldest prompt line by line** | Sections 1 to 3 of your first big prompt, checked against the code itself. **Present as you asked:** your circumstances with a status and a date on each fact, the season with all eleven fields, the seven statuses (confirmed, reported, historical, estimated, assumption, unknown, needs verification), all nine kinds of constraint, patterns worked out from your records, life direction, and the limit of three active campaigns. **Was missing, now built:** a campaign had 7 of the 15 fields you listed; it now also has why it matters, its season, its stage, the next action, what is blocking it, leading indicators, the capabilities it needs, your resources for it and what it depends on, and the card shows stage, next action and blocker. **A fault found on the way:** editing a campaign used to drop the evidence written on its milestones; it no longer does. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.63.0 · the older systems can now be found by name** | Checking the oldest prompt line by line against the running app showed that many things built earlier could not be found in Where do I…? by the names you used for them: typing \"judgment lab\", \"attention defense\", \"field manual\", \"contingency\", \"personal reality\" or \"life direction\" found nothing, although each screen exists. Twenty-one of them are now listed by those names, and their rows on the \"everything you asked for\" page have an Open button. Nothing else changed. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.62.0 · everything you asked for, on one page** | Where do I…? → **everything you asked for**. All seventeen prompts you sent, section by section (180 sections): what is built, what exists, what is only partly there, what is not built, and what waits on you; each with where it lives, what is missing, and an Open button for the parts built this week. Filters for Partly, Not built and Needs you. It says plainly what it is: a check by section, not a re-reading of every line. The same ledger is in the repo as ALL_PROMPTS_AUDIT.md. | built 20 Nov on Egor\'s written instruction of 20 Nov 21:30 |
| 20 Nov | **War Room 13.61.0 · Communication: levels 4 to 6, and coming back to what was corrected** | **Levels 4 to 6:** fifteen more exercises in both languages (cause against coincidence, a position and its best counter-argument, persuading in 60 seconds, refusing and offering, bad news said straight, the same decision for two audiences, a system explained so it can be passed on). A level opens only after three coached attempts in that area all score 7 or more; never because days passed. **Habits to hold:** the one thing the coach asked you to fix becomes a card for that language and skill, and comes back after 2, 5, 12 and 30 days with a fresh exercise. With a coach it is marked from what happens next: if the coach does not name that skill again, it held. The card says plainly that this is a sign, not proof. **Corrected:** the \"entered after the day\" line from 13.60 now says it counts any later change and cannot tell yours from the hourly sync, so it is no measure of you typing late. | built 20 Nov on Egor\'s written instruction of 20 Nov 19:56 |
| 20 Nov | **War Room 13.60.0 · every main number now says what kind of thing it is** | War Room keeps eight kinds of statement apart: observed, your report, outside source, worked out, inference, hypothesis, forecast, recommendation. Each scorecard row now starts its source line with its kind, and one button on the scorecard opens a page listing today’s main numbers with their kind. Dials are split into those with a call record, your outside report, and counter presses with no record. The first thing Mission Control shows is labelled a recommendation, and forecasts are labelled forecasts. The page also counts day records that were changed on a later day: shown, not held against you. Not yet: the labels inside the day header, the money screen and Mission Control itself. | built 20 Nov on Egor\'s written instruction of 20 Nov 19:56 |
| 20 Nov | **War Room 13.59.0 · Communication: today’s session, and progress with history** | **Today’s session:** five blocks, about 23 minutes (warm-up, organize a thought, words, main challenge, say it again). Do one or all; a block is ticked when you have said something for it, never because time passed, and there is no streak. Each block’s exercise comes from your record; the main challenge is a conversation when an AI key is present. **Progress and history:** Romanian and English apart, each skill apart, no single score. Attempts per week, each scored skill then and now, what the coach kept naming, words, real-life moments, a note when a skill may have slipped (ten scores needed), search over everything you said, and first attempt next to second. | built 20 Nov on Egor\'s written instruction of 20 Nov 19:56 |
| 20 Nov | **War Room 13.58.0 · War Room now commits to a forecast and gets marked on it** | Where do I…? → **forecasts**. Each Monday the app writes down what it expects for the week (dials made, BAC minutes, average weight) as a range, with the method named, before the week's records exist. The Monday after, it is marked against what you recorded and against the dumbest rule there is: \"same as last week\". It also replays its method over your past weeks and says plainly if it does not beat that rule. A forecast made after Monday is kept but never scored, and with fewer than three recorded weeks it makes none. This is the first piece of the Personal Reality / Future Lab brief; the gap analysis and backlog are in the repo (WAR_ROOM_INTELLIGENCE_BASELINE.md and WAR_ROOM_INTELLIGENCE_IMPLEMENTATION_BACKLOG.md). | built 20 Nov on Egor\'s written instruction of 20 Nov 19:56 |
| 20 Nov | **War Room 13.57.0 · Communication: a partner that answers back, and one idea five ways** | **Conversation:** pick one of eight situations (defend a decision, disagree, an unexpected objection from an agency owner, negotiate, teach, debate…). The other person opens, you answer by voice or typing, and they reply to what you actually said; they never correct you mid-talk. Up to six of your turns, you can switch language in the middle, and an unfinished conversation is kept. When you end it the coach reads only your side. **Explain it differently:** one idea said naturally, more simply, more precisely, for someone who knows nothing, and in the other language; saved as one attempt. **Question in the other language:** the question comes in English while you answer in Romanian, or the reverse. Without an AI key there is no partner (it says so) and each situation becomes a solo exercise. | built 20 Nov on Egor\'s written instruction of 20 Nov 19:56 |
| 20 Nov | **War Room 13.56.0 · the coach, corrected after its first real answer** | One real coaching answer was run on your laptop with your own AI key (nothing was saved to your record). It came back in 4 seconds and passed the checks, but it was a weak coach: it copied your text back as the \"summary\", treated mixing in English as a problem, and missed the vague \"pot să fac lucruri\". The instructions now say: one-sentence summary, mixing languages is never a breakdown, name vague words and repeated fillers when they are really there, and give the other-language equivalent for each word. A copied-back summary is no longer shown. **Also seen:** your chosen model (the main one in More → AI) did not answer at all today, so the app waits a full minute before trying the next; the lighter model answered. | improvement, same instruction |
| 20 Nov | **War Room 13.55.0 · the AI works again on a device that has its own key** | Testing the new Communication coach on your laptop with your real AI key, every AI call failed. **Cause:** since the laptop got its own key at 12:53, the app sent that key along with AI requests too, and the AI relay on the server refuses requests carrying a header it does not know. So every AI feature on the laptop (roles, recall questions, food photos, the coach) was dead for about three hours, silently. **Fixed:** the device key goes with your data only. A test now checks it. The phone was never affected: it has no key yet. | repair, same instruction |
| 20 Nov | **War Room 13.54.0 · Communication, first working loop (Romanian and English)** | Where do I…? → **communication**. Pick Română or English (one tap, remembered). You get one exercise chosen from your own record, speak it (your browser turns speech into text; you start and stop it, and you can type instead) and correct the text. With an AI key, a coach shows what you communicated, what worked, **where it broke down quoted in your own words**, the same thought said better without changing its meaning, and one thing to fix; then you say it again and both attempts are kept. Words that would have helped are kept only if you tap Keep, and come back after 1, 3, 7 and 16 days to be *used*, not recognised. \"The words did not come\" turns a moment from real life into your next exercise and, with a key, shows how to say it in both languages. **Built-in limits:** nothing judges pronunciation or pace (it only sees text); a point whose quote is not in what you said is dropped; without a key there are counted facts and no score. **Not built yet:** a partner that answers back, kept audio, levels 4 to 6, charts. | built 20 Nov on Egor\'s written instruction of 20 Nov 14:50 |
| 20 Nov | **War Room 13.53.0 · repair of 13.52.0** | 13.52.0 was live for about four minutes with a fault: two of its new function names were already in use, so the Reality question screen and the \"connect it\" screen were silently replaced, and the new \"sources that disagree\" list read a store that belongs to the capability notes. Renamed and given its own store; nothing of yours was written in those minutes. The release check that catches this exists; it ran after the push instead of before it. It now runs first. | repair, same instruction |
| 20 Nov | **War Room 13.52.0 · how well War Room knows you; sources that disagree; AI use** | Three things the briefs ask for. **How well War Room knows you** (Where do I…? → that phrase): seven parts of life, each showing what the evidence is (measured by the app, your own entries, outside sources), on how many of the last 30 days there is a record, how old the newest one is, what is NOT known, and which missing information would help most. No single score, on purpose. **Sources that disagree:** you record that two things in your library say opposite things and later which you go with; War Room does not detect it, because it has not read your sources. **AI use:** every AI call from a device is counted there (calls, failures, rough size), kept on that device; the server's calls are shown beside it. It is not a bill. | built 20 Nov on Egor\'s written instruction of 20 Nov 13:21 |
| 20 Nov | **War Room 13.51.0 · the four missing roles** | The second brief names twelve roles; the app had eight. Added: **Recruiting Operations** (the caregiver bench, from counts only: no names, phones or emails leave the device), **Knowledge Curator** (your library: evidence against opinion, finished but never used, ideas that disagree), **Research Analyst** (what to find out; it cannot browse, so it turns gaps into learning requests for the daily scan) and **Operations Architect** (where work gets stuck, what is done by hand). Same rules as the others: they read a fixed set of records, their answers are checked, and they can only propose. They need an AI key on the device, like the rest. | built 20 Nov on Egor\'s written instruction of 20 Nov 12:59 |
| 20 Nov | **War Room 13.50.0 · a real bug found by enrolling a real device** | Claude gave your laptop its own key from your own Chrome, as you asked. The key disappeared within seconds. **Cause:** the device key and the older \"which devices share this War Room\" record were saved under the same name in the browser, so each wiped the other: the key vanished at the next sync and the laptop appeared twice in the devices list. No test had caught it because none enrolled a device and then synced. **Fixed:** the key has its own slot; a test now does exactly that. Your laptop was put back as it was (one entry) and the lost key was removed on the server. | built 20 Nov on Egor\'s written instruction of 20 Nov 12:33 |
| 20 Nov | **War Room 13.49.0 · device keys and the lock proven over the real connection; two honest dial numbers** | **Proven live, over the real connection, with a throwaway room (24 checks):** a device key alone reads and writes its room; a wrong key gets nothing; jobs queued from a device run within seconds (backup and brief); the lock shuts out the sync code alone for reading, writing and enrolling; unlocking restores it; a removed device is shut out; the audit list records each step. Your own room was not touched. **Dials, settled by what each number is for:** *dials made* (compared with 350 a week) include presses on the day counter; *conversion* is still worked out from call records only. The scorecard shows dials made and says how many have no call record; the server brief does the same and can no longer count a dial twice. **Still only you:** give the phone and the laptop their own keys, and the vault passphrase if you want it. | built 20 Nov on Egor\'s written instruction of 20 Nov 11:10 |
| 20 Nov | **War Room 13.48.0 · proven offline, measured for speed, and looked at** | **Offline:** a real test now loads the app once, cuts the network completely and opens it again from the cache; you can keep working and the change is saved on the device. **Speed:** first load about 1.1 s on the test machine (97 scripts, 2.7 MB of code); with two years of heavy use in it (730 days, 3,000 tasks, 1,500 journal entries, 660 KB of data) Mission Control still answers in about 12 ms and the Day screen redraws in about 0.3 s. A phone is slower than the test machine: these numbers show there is no hidden cliff, not what your handset will do. **Looked at by eye:** screenshots of Server, Vault, About me, People and Water at phone size, in the dark and the graphite look. That found button rows covering the text under them on the Server and Vault screens; fixed. **Scorecard:** the Dials row now says when presses on the day counter have no call record and are therefore not counted there (your morning and evening reviews do count them). | built 20 Nov on Egor\'s written instruction of 20 Nov 08:43 |
| 20 Nov | **War Room 13.47.0 · the freeze is withdrawn** | **Correction (your message of 20 Nov, 08:27):** War Room and Caregiver Bench are two separate projects. War Room development is **not** tied to your dial count or to a first paying client; Claude builds it on its own while you work on the business. The "Feature freeze" rule is removed from Mission, the Build Gate file is retired, and the three scheduled reviews that enforced it no longer do. **Open question, not changed:** the app counts a day's dials from the call records and shows hand-counter extras apart (its rule since 13.24); your scheduled reviews count "the larger of the counter and the call records". They give different numbers when you press the counter without logging the call. One of the two rules should win everywhere: your decision. **Scheduled tasks:** four prompts corrected to the current offer and to "BAC: average not lower than 7", the Bulletin no longer states a price, and the 06:00 morning brief is paused (05:03 stays). | built 20 Nov on Egor\'s written instruction of 20 Nov 08:27 |
| 20 Nov | **War Room 13.46.0 · the server is on, and the last seven pieces** | **The server is switched on** (you confirmed it at 07:36): the timer runs every 10 minutes, the nightly backup, weekly check and morning brief are scheduled, and the first brief with a Chief of Staff read from your real AI key is in the inbox. Server research is the one job that does not work: your AI key has no quota for web search. **New in the app:** Connect it now asks **how** two ideas relate (works with, depends on, contradicts, example of). **Compare scenarios** side by side. **Water**: one tap per glass against a number you set. **Missed training**: move it or let it go, never stacked. **Where do I…?** folds away what you have not opened in 14 days. **People and commitments**: who you owe what, who owes you. **A new-situation question** written by the AI from a lesson you learned, harder after three good answers, plainer after a miss, graded by you into the same recall log. | built 20 Nov · dials at the time: 0 logged on 19 Nov, 2 on 14 Nov by the day counter · built on Egor\'s written instruction of 20 Nov 07:33 |
| 20 Nov | **War Room 13.45.0 · what War Room believes about you** | One page (Where do I…? → “about me”) that puts **what you said** beside **what your records show**: your season priority, goals in focus and learning setting; how often you did the first thing of the day, the skip reason you give most, how well recalls stick; and your own targets beside your own last 7 days. Every counted line says how much it rests on, and below a minimum it says **“not enough to say”** instead of guessing. Tap **not true** on any line to replace it with your correction. It guesses nothing about mood, character or health, changes no setting, and stores only your corrections. | built overnight 19–20 Nov · dials at the time: 0 logged on 19 Nov · built on Egor\'s written instruction of 19 Nov 22:32 |
| 20 Nov | **War Room 13.44.0 · the vault: private records sealed before they sync** | **Vault** (Where do I…? → Vault), off until you switch it on. With a passphrase only you know, this device encrypts the journal, transactions, accounts, money plan, reality checks, decisions, risks, wealth records, boards and protocols before they are synced; the server keeps a block it cannot read. Every other device asks for the passphrase once; until then it keeps syncing everything else and leaves the block alone. Cloud snapshots are sealed too. If sealing ever fails, nothing is sent. Change the passphrase or switch it off from any open device. **Honest limits, also on the screen:** it does not encrypt the rest of the document (the server jobs need it), it does not protect an unlocked device, copies made before it was on stay unsealed until they roll over, and **there is no reset if you forget the passphrase on every device.** | built overnight 19–20 Nov · dials at the time: 0 logged on 19 Nov · built on Egor\'s written instruction of 19 Nov 22:32 |
| 19 Nov | **War Room 13.43.0 · the server: jobs while the app is closed, a key per device, a lock, an audit list** | **Server** (Where do I…? → Server) is the window onto the part of War Room that runs when this app is shut: a **morning brief**, a **weekly check**, **daily research** for your open learning requests and a **nightly backup**, each on a timer you set, plus **ask one role a question on the server**. What a server-side role suggests arrives in the note as **Approve / Dismiss**, through the same path as an in-app role: nothing exists until you approve it. **A key per device** and an optional **lock** that makes the sync code alone useless; **who did what**. The automation list now says the content scan is **daily** (it is, since 19 Nov) and tells the truth about the server. **Honest state: the server side is written and proven on a copy of the database (68 + 41 checks), but NOT switched on.** Supabase asked for a confirmation while you slept and nobody answered. Until you confirm, the Server screen says “Not switched on yet” and nothing about your sync has changed. | built overnight 19–20 Nov · dials at the time: 0 logged on 19 Nov · built on Egor\'s written instruction of 19 Nov 22:32 |
| 19 Nov | **War Room 13.42.0 · back from the goal, forward into what might happen, and roles that can only propose** | **Work backwards** from any goal: what counts as done, what must be true, what could stop it, the first assumption to test, the next action. **The chain** shows the season\'s priority, goals in focus, what each depends on and the tasks toward it, and says where a link is missing. **Scenarios:** the funnel as numbers you can change. Each number says whether it is measured, from your plan, or your assumption; no rate is assumed for you. Five cases side by side, what each number alone would have to be to reach the goal, and a draft experiment for the least certain one. **Compare options** in words, eight questions each, no score. **Ask a role** (chief of staff, analyst, sales coach, strategist, learning, finance, red team, quality): each reads a briefing built from your records, answers in a fixed shape, and can only propose; a proposal becomes a record when you tap Approve. Runs are logged and capped per day. Without an AI key you get the briefing; the quality check needs no AI. **Is War Room working?** Four weeks against the four before, what was recommended against what was done, and what you never open. **Graphite** look added in Settings; the default is unchanged. | built 19 Nov · dials at the time: 0 logged today · built on Egor\'s written instruction of 19 Nov 21:46 |
| 19 Nov | **War Room 13.41.0 · one model of reality** | First release of the \"100% vision\" brief. **One model:** every goal, task, agency, caregiver, lesson, decision, source and review now has one identity, a note of where it came from and how sure it is, and its connections both ways. **Find a record** by words and walk from it to what it is connected to. **Records that disagree:** ten checks (goals with no action, counters with no records behind them, marks above the evidence, reviews that are due, follow-ups past their date); each is explained and nothing is changed for you. **Reality brief:** what you should know now, by importance, every line from your records. **System health:** errors on this device, storage, sync and its merge memory, backups. **Backup proven** by restoring one in a test. **Yearly review.** Goals can name what they depend on and what could stop them. The one-minute tour opens once by itself on your devices. War Room now counts what you open, on the device only, so later we can fold away what you never use. Architecture decision recorded: extend, do not rebuild (reasons in ARCHITECTURE_DECISIONS.md). | built 19 Nov · dials at the time: 0 logged this week · built on Egor\'s written instruction of 19 Nov 21:46 |
| 19 Nov | **War Room 13.40.0 · two loose ends** | **Personal development \"as much as needed\"** is now set by the app itself, once, on each device that syncs your data (a setting changed only in the cloud was overwritten by a device within the hour). If you later choose minutes or \"No guarantee\", that choice stands. **Caregivers:** marking a candidate \"not a fit\" asks why in one tap (pay, distance, hours, papers, another job, screening); the economics page counts the reasons. | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.39.0 · every area to the same depth, and a back button that works** | **Why owners say no:** after an owner talk ends in "no", one tap records the reason; the funnel counts them and says when there are too few to act on. **Planned against done:** the funnel shows each day\'s dial target next to what was dialled. **Business economics:** revenue, concentration, costs, result, cost so far per client, time on the phone and caregiver supply from your records, with a named list of what cannot be measured yet. Nothing is forecast. **Goals:** each can be a commitment, target, experiment or ambition, and gets one of four attention levels; more than three in focus is flagged. **Body:** what your own log suggests about training gaps and bedtime regularity; your call, not advice. **Monthly review:** your change becomes a dated check, and next month asks whether it happened. **The map:** nine areas answering the same questions, with Mission Control\'s own next action for each. **Getting around:** the phone\'s back button now closes the sheet, steps back through screens, then returns to Day. Five workflows step by step, a tour that walks the real screens, and "Task, goal or note?". | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.38.0 · learning has to prove itself** | **Recall accuracy** is now a real number: every recall you grade is logged, and the weekly scorecard shows the share that came back and how many are waiting. **Misconceptions:** when you miss a lesson, what you said is kept and shown next time AFTER you answer, so you can check the mistake is gone. **Harder questions:** once a lesson has been recalled after a gap, the question changes from "what is it" to "where does it fail and how will you use it this week", checked against the card\'s trap and move. **Weak spots** (Learn, or "Where do I…?"): missed, fading, finished but never tested, the weakest module, and one tap to recall exactly those. **Connect it:** tie an idea to one from another course in a sentence; the link shows on both lessons. **"I did not know how"** as a skip reason now asks what was missing and saves it as a learning request. **How progress is measured:** the four ladders in one place. **Cleanup:** 33 functions nothing called were removed after a caller check; the automation list says truthfully what runs. | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.37.0 · your decisions, applied** | **BAC:** the goal now reads "pass, average not lower than 7" (you said 7 is fine); the Playbook, the campaign template and the assistant say the same. **Weight:** 80 kg stands; the two 77 kg records were removed. **Goals:** 30 records became 13: fifteen exact copies and the two 77 kg records were soft-deleted in the cloud after a full backup; nothing else was touched. **Personal development:** new choice "as much as needed": no fixed minutes, Learn picks by need and never lets a whole week pass at zero while something personal is waiting. **Sync:** a fresh install no longer brings starter goals back as duplicates. **Cloud:** 11 old or test rows were copied to the backup table and removed; the attendance task no longer carries the sync row id in its text. The daily research schedule was refused by the permission system: it is still weekly. | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.36.0 · a bill that is due shows up on the Day** | A payment you planned in Money → Planned items, due today or overdue, now reaches Mission Control as one ordinary maintenance line (the oldest one), below sleep, the season priority and protected work. Marking it paid or skipped removes it. Planned income and future items never appear. Mission Control is still the only thing that ranks. | built 19 Nov · dials at the time: 0 logged this week (you log calls elsewhere and enter them later) · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.35.0 · where it stops, the trend, the quarter** | **Your funnel, last 28 days:** dials, answered, owner talks, case calls, trials and paying agencies from your own records (outside report included). A rate is shown only when the sample is big enough (100 dials, 20 answered, 20 owner talks); otherwise it says how many more are needed. It names the stage where things stop. Dials needed for the goal are not calculated until your own rates exist. **Body trend:** the 7-day average, kilos per week over two weeks, training days, and the pace each weight goal needs; conflicting targets are shown as they are, for you to decide. Arithmetic, not advice. **Quarterly review:** thirteen weeks against the thirteen before, the monthly changes you chose, and one question: is the main priority still right? The scorecard links to all of them. | built 19 Nov · dials at the time: 0 logged this week (you log calls elsewhere and enter them later) · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.34.0 · reality in, reasons out** | **Calls made elsewhere:** from the + button, the Day card or "Where do I…?" you enter a day\'s dials, answered and owner talks noted outside the app. They are saved as your report, kept apart from calls logged in the dialer, and counted in the day, the week and the funnel. A count you did not keep is saved as "not counted", never as zero. Nothing is entered for you. **Why a plan failed:** skipping or missing a mission asks one question with eight answers; the weekly review counts them and names the fix for the one that repeats. **This week in numbers:** twelve numbers, each with its meaning, source, last week, your own target if you set one, and what to do when it is low. No composite score. **Goal check:** what each goal lacks (reason, baseline, date, measurement, next action); it merges and deletes nothing. **Money:** business and personal apart, from the ledger\'s own categories; a tax reserve only from a percentage you set, labelled as arithmetic, not advice. **Monthly review:** four weeks against the four before, then one keep, one stop, one change. **Learn:** lessons you got wrong come first in recall and subjects are mixed. **One-minute tour** in "Where do I…?". Mission Control is still the only recommender. | built 19 Nov · dials at the time: 0 logged this week (you log calls elsewhere and enter them later) · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.33.0 · knowing where things live** | **"Where do I…?"** on the Day card, in the search (⌘) and behind every screen\'s ? : thirty-four everyday jobs (make a call, follow up an agency, record a caregiver, study, record a workout, understand my money, find a goal, record an idea…) each with its one home, said in plain words, with where the record is kept. Any of them is two taps from Day. **Every main screen now opens with one line saying what it is for**; tap ? for purpose, when to use it, what to do, what it records and what comes next; dismiss the line once and it stays gone on that screen. **Operator** went from thirty-one loose tiles to four headed groups (Direction, Business, Learning, Review and decide) with Protect and System folded. **One capture:** the top-right + opened an older, different sheet than the bottom +; both now open the same one. Nothing was removed and no data was changed. Not done: this was checked in a desktop browser at phone size, not on a phone; whether it is actually clearer to you is yours to say | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.32.0 · the parts now work as one** | Mission Control is still the only thing that ranks your day, and it now sees more: an agency left waiting, a falling answer rate (as one corrective action with its lesson), the next company step, the oldest overdue task, and one Learn candidate. Two low energy checks propose a Minimum day and change nothing by themselves. **Day card: "I have 5 · 10 · 20 · 30 · 60 minutes"** picks the best thing that fits before your next fixed commitment, says what ranked higher and does not fit, and hands learning to Learn. **Learn** no longer takes turns between business and personal: it follows your stage and evidence, and protects personal development only through a weekly minimum that you set (none is set yet). The Library planner and the old 25-minute mission now open the same planner. **Done is not outcome:** marking a mission done asks what you expected and what happened; the weekly review lists each day as marked / evidence in the logs / outcome, and needs one change to be saved. **+ sheet:** any line can be sent as a task, market note, decision, journal entry, resource, money or note; what cannot be placed waits in Unprocessed and nothing is dropped. BAC wording changed from "8+ average" to a pass. Operator → Automation shows what really runs by itself. Not done: your goals and cloud rows were only examined; no real-phone test | built 19 Nov · dials at the time: 0 logged this week · gate overridden by Egor in writing for this plan |
| 19 Nov | **War Room 13.31.1** | Removed the old "Content library · I have X minutes" banner from Learn and Courses. Learn → Now is the single entry point and the Library is its last tab | built 19 Nov · dials at the time: 0 this week |
| 19 Nov | **War Room 13.31.0 · one way to learn, and an honest map of what is missing** | **Learn → Now**: "How much time do you have?" (5 to 120 min or custom) builds one session from what already exists: Bootcamp lesson, recall test, capability practice, real-world mission, a library resource. The session is saved after every step and resumes after closing the app. Rules it follows: reviews that are due come along; lessons opened but never practised turn the session into practice; after two business sessions the next is personal; the 10-dial rule for new lessons still holds; a video too long for the slot is left for later; a competency with no lesson gets a research request instead of a made-up lesson. The Library is now a tab of Learn. **Development Blueprint** (Operator): 107 competencies in ten areas, each with what competent looks like, and for each one whether a lesson, written test, exercise and inspected video exist. 23 have no lesson of their own. **16 new lessons**: caregiver matching, humour, de-escalation, taxes, living costs; seven from the Lost Chapters and Gym Launch pages that were actually read; four from emails. None of the new videos has been watched: they are marked "title checked". **Owner discovery**: nine questions only owners can answer; after you log an owner talk the app asks what they said. Owner answers, your notes, published facts and assumptions are counted apart. **Market**: BLS 2025–35 figures with definition and dates, the 2024–34 edition kept as history, Florida's 6,056 broken down, competitors in six types with sources, deal activity. **Knowledge → execution**: 15 principles from the two books judged for Caregiver Bench with a status each. **Fixed**: the Day screen could reopen over a page you had just opened in the first seconds after launch (9 of 18 trial runs before, 0 of 18 after). Not done: nobody has tested this on a real phone; most of Gym Launch and two sections of Lost Chapters are unread; the daily research schedule is still not approved | built 19 Nov · dials at the time: 0 this week |
| 19 Nov | **War Room 13.30.0 · research and content quality**: (1) Research jobs show their real state: queued (not run), sent to Claude, answered. "Research now" opens the job in Claude as a ready prompt and imports the pasted result; urgent jobs sort first. The scheduled scan is still Mondays only: the daily schedule was denied and is not running. (2) Every lesson video shows four separate checks: link works, content inspected, fits the lesson, quality reviewed. Course clips count as content-inspected; the rest either match by title on an official channel or only exist (fit not confirmed); none is called reviewed until you watch and rate it; "does not fit" queues a replacement job. (3) Florida licensing lesson now rests on three official AHCA pages and the statutes; the only official video is about background screening and the card says so. (4) Market intelligence (Strategy): 14 sourced statements split into official, reported, vendor claim, plus unknowns and a 7-question research plan. Nothing was written into the A/B/C matrix. (5) Lost Chapters and Gym Launch Secrets: no legitimate text found; marked blocked until you provide your own copy. built 13.30.0 · dials at the time: 0 this week · asked for by Egor |
| 19 Nov | **War Room 13.29.0 · Company operating system + right knowledge at the right time**: (1) Operating system (Operator → Operating system): three engines (sales 12 steps, recruitment 9, team 10). Each step shows its procedure in the Playbook, the lessons it is built on, the number that judges it, when it applies (now · with evidence · later) and its stage from Learned to Delegated. Lessons alone reach Understood; higher stages need written proof, a number, a procedure, a name. Ten new v0 procedures (prospect research, account management, retention, sourcing, candidate experience, matching, handoff, bench, team roles, team rhythm), all marked untested. Four expert disagreements open as experiments with today's baseline. A standardised step becomes an asset. (2) Every lesson shows where the business uses it and turns into a task, experiment, procedure or drill in one tap. (3) Now · Next · Later: capabilities and resources are ranked by business stage, real misses and season; three unused ideas switch the planner to "apply first". (4) Research jobs are written automatically from real needs (max 3 open), a direction snapshot is synced for the cloud scan, which runs on Mondays. Switching it to a daily check for urgent jobs was blocked and needs your approval. built 13.29.0 · dials at the time: 0 this week · asked for by Egor |
| 19 Nov | **War Room 13.28.0 · Strategy layer + a video on every lesson**: (1) Strategy (Operator → Strategy, quick actions): market notes as evidence (also read live from your call-log notes), opportunities classified 1–6 with an evidence grade and at most two in validation, an asset register with maturity stages, the A/B/C company decision as 36 cells that start unknown and keep the reason for every change, a 90-day strategic review, signals computed from records (repeated problems, results worth documenting, falling answer rate, activity without results, repeating tasks) and seven questions answered from the data. One line and at most one risk reach the Day screen; it never opens a project by itself. (2) 233 of 234 lessons now open with a video: 107 added today, each checked on YouTube; when it is an interview, another teacher or the nearest course lesson, the card says so. No video: Florida licensing. (3) Business stage now steers which capabilities and content are recommended. (4) Content is the second tab under You and has a button on top of Bootcamp and Courses. (5) BAC: humanist profile and accepted certificates recorded as confirmed by you. built 13.28.0 · dials at the time: 0 this week · asked for by Egor |
| 19 Nov | **War Room 13.27.1 · it updates itself**: (1) The library: what the weekly scan and the monthly review find is added automatically as "new" (switch in Content → Settings, with a 7-day undo); each scan also reads up to 6 of the emails that were only listed and fills in their lesson. Unverified finds stay in exploration. Offers, scripts, procedures and plans are never changed by it. (2) The app: it now also checks for a new version every time you return to it and every 30 minutes while open, and applies it silently as before. built 13.27.1 · dials at the time: 0 this week · asked for by Egor |
| 19 Nov | **War Room 13.27.0 · Content Command Center + the pieces 13.26 left out**: (1) Content (You → Content): one finite queue for today, "I have X minutes" sessions with every step explained, 14 library sections, mentor profiles with their limits, a gate that says "go execute" while a dial window or a fixed commitment is live, capture → recall test → task / experiment / Field Manual, analytics that count only confirmed minutes and real use. (2) Library: 181 sources: 26 verified lectures, 42 official audiobook parts from The Game podcast feed (26 Lost Chapters with exact lengths; their content is NOT summarised), 41 official links, 58 emails of which 17 are read in full. (3) 31 new sourced lesson cards (8 from the emails; judgment, safety, money, people), four new life modules, 17 scenarios; capabilities without a lesson: 5 left, still listed. (4) BAC: the official 2027 timetable read from the scan, topic maps for Romanian and History from the official programmes, diagnostic flow, weekly sequence to 8 and 15 June, certificate deadlines 10 and 15 April. Profile assumed humanist until you confirm. (5) Campaigns: milestone → project → next action, calendar link, plain warnings. Energy check-ins. Money lens. Training flows per capability with arithmetic-checked money drills. Five branching scenarios. Source audit. Lessons that are costly to forget are reviewed earlier. (6) Tests: 74 new checks incl. offline start, a simulated two-device sync and restore; the old 303-check suite runs again. NOT done: real phone test; 41 emails only catalogued; no linked email video opened; Lost Chapters not summarised. built 13.27.0 · dials at the time: 0 this week · gate overridden by Egor ("I'll do the calls today at 16:00") |
| 19 Nov | **War Room 13.26.0 · Operator layer + capability map + knowledge pipeline**: (1) Capability map: nine domains, each capability with what it means, observable behaviour, evidence and next step; knowledge (the ladder of its ideas) and real performance are shown apart; capabilities with no lesson are listed as missing content. (2) After-action reviews record effort, outcome and skill separately; only skill shown to standard with evidence counts as real use. Two shortfalls on one skill make it the next thing to train. (3) You → Engine → Operator: personal reality (facts with a status), season with purpose and must-not-sacrifice, life direction, one journal and history, Judgment Lab (decisions, predictions with calibration, scenarios), Red Team checks, risk register and pre-mortem, Attention Defense (trigger log, if-then protocols, lapse restart), Field Manual and contingency plans (112 for emergencies), capacity for 7 days with a confirmed week fix, indicators, search. (4) Mission Control gets conflicts, stagnation and due reviews as facts (two alerts at most) and a nudge to execute when War Room time is high and nothing started; a lens for the day; a fixed commitment now wins when blocks overlap. (5) Knowledge pipeline with 72 researched sources (books, workbooks, $100M Lost Chapters, Gym Launch Secrets, 58 Acquisition.com emails). (6) BAC board cites the official Moldovan orders (MEC 2046 and 2051 of 8 Oct 2026). | Egor's expansion briefs, 19 Nov. Gate overridden by Egor in chat · dials at the time: 0 this week |
| 19 Nov | **War Room 13.25.4 · Smarter spacing (B2)**: reviews now use importance and blind-spot history. Ideas from your current-mission modules come back earlier (under 80% estimated memory) and get shorter gaps; expansion ideas wait longer. Every time you were sure and wrong on an idea, its next gaps shrink by 15% (up to 40%) and it moves up the queue. Again, Hard, Good and Easy work as before; retention stays labelled an estimate. | Execution brief, phase B2 · dials at the time: 0 · gate overridden |
| 19 Nov | **War Room 13.25.3 · Course states (B1)**: Learn → Progress → Courses shows every course and lesson as Watched, Learned or Demonstrated, with what evidence is missing and a button for the next step. Watching a video never counts as learning; finishing a course never counts as competence. | Execution brief, phase B1 · dials at the time: 0 · gate overridden |
| 19 Nov | **War Room 13.25.2 · Controlled replanning (A3)**: Replan now shows three lists, KEEP, MOVE and DROP, each line with its reason. Fixed commitments never move. Calls are only placed inside real Florida hours, and dropped with the reason when the window is gone. The minimum dials and BAC minutes are protected first. Nothing changes until you tap Use this plan; Keep my plan leaves everything as it was; the last replan can be undone. | Execution brief, phase A3 · dials at the time: 0 · gate overridden |
| 19 Nov | **War Room 13.25.1 · Campaigns drive the day (A2)**: the mission shows which campaign it advances, the next milestone and why it matters. A milestone counts only with evidence: dial and owner-conversation milestones are read from the call log; every other one asks what proves it when you tick it. At most three campaigns can be active; Pause/Activate is in the campaign editor. | Execution brief, phase A2 · dials at the time: 0 · gate overridden |
| 19 Nov | **War Room 13.25.0 · One recommendation (A1)**: the mission is the only thing that tells you what to do on the Day screen. Stage and the 14-day engine now hand it facts (shown under Why this, each with its owner). The attention list always starts with the same line as the mission. ONE and the stage chain count dials from the call log. | Execution brief, phase A1 · dials at the time: 0 · gate overridden by Egor (\"DO IT\") |
| 19 Nov | **War Room 13.24.3 · Done on the mission**: next to Skip and Missed there is now Done, for things you did earlier or in advance. It takes the mission off today and the next one moves up. Measured things stay honest: marking the dial mission done does not add dials, those still come from the call log. | Egor: \"if I do something in advance or earlier I should be able to say done\" |
| 19 Nov | **War Room 13.24.2 · Skip or Missed on the mission**: the mission strip at the top of the Day screen has Skip and Missed. Either one removes it for today and the next mission moves up; both are counted in the weekly review; \"undo\" brings them back. | Egor: \"the upper part in the home screen, I should be able to skip or put it as missed\" |
| 19 Nov | **War Room 13.24.1 · Morning fixes**: the Day screen is back to one block: the mission is a slim strip above the step you are on (tap it for why, done condition and options), and the stage strip, week contract, dial numbers and attention list sit behind one More button. Forgot to tap sleep? The mission shows \"Last night's sleep is not logged · Enter times\". BAC board: Change targets; exam subjects default to 8. Drive mode: the natural AI voice now goes first when you are online (pick between five voices or the phone voice); it is not a copy of any real person's voice. | Egor, 07:36: targets 8 not 9, easy sleep entry, better car voice, why two of everything on the Day screen |
| 19 Nov | **War Room 13.24.0 · Mission Control (built overnight, waiting for your OK to go live)**: one mission on the Day screen answers five questions: what matters today, why, the next physical action, how long, and what done means. One engine ranks by plain rules (fixed commitment → season priority → protected floors → maintenance), shows the facts it used, what it does not know, and lets you overrule it. Calls are only recommended while Florida is open. Dials now come from the call log; hand-counter extras are shown apart. Three day modes: Full, Minimum, Recovery (never breaks a streak). Focus contract with an interruption restart. Season. Weekly review built from the records, with time spent inside War Room. One six-stage mastery ladder everywhere; a sales skill reaches Applied only through a real call. BAC board: mocks, trend, recurring errors, on-track only when it can be judged, due errors become the study mission. Backups no longer contain the sync code. | Egor: "focus on building the best system through the night" (overnight master build) |
| 18 Nov | **War Room 13.23.2 · Integrity (audit fixes, no new features)**: (1) Sync: two devices editing the same day no longer erase each other. Days and settings now merge per field against the last cloud copy; before, the newest device won the whole day, so a stale laptop could wipe the phone's dials. A pull that finds this device ahead now pushes; CRM and bench pushes read and merge first (they used to overwrite blindly). (2) Time Machine restore now really restores money, learning and the rest, not only days/tasks/goals. (3) Mastery tells the truth: Proven needs a successful recall 21+ real days after learning (was 3 review steps); recalling no longer counts as Understanding; teaching back no longer counts as Integrating; the mission's Apply step can't be ticked by hand, it closes on evidence and records what happened. (4) The in-app AI follows the Playbook territory (Tampa Bay first) instead of the old Naples text. (5) '70/20/10' is labelled for what it measures: lessons, not minutes. Server-side backup of all 22 sync rows taken first. | Master audit, 18 Nov. Built under Build Gate rule 3 (data integrity only) · dials at the time: 0 this week, 3 since 22 Oct |
| 18 Nov | **War Room 13.23.1 · Drive mode is never silent** + **Android app 1.9**: Drive mode was silent (the phone voice failed without an error, and Chrome on Android drops speech that is cancelled and restarted instantly). Now it tests voices in order and switches automatically: Android app voice → phone/browser voice (only if real voices exist) → Gemini AI voice (your AI key, any phone, next sentence prefetched) → reading mode that says exactly why there is no sound and how to fix it. 🔊 shows which voice is speaking; Test voice re-checks. App 1.9: the voice engine falls back to Google's engine and other English voices, reports its error, plays at full volume as speech, and opens the phone's voice settings. | Egor: "I like Drive mode but make it work right now, it's just silent" |
| 18 Nov | **War Room 13.23.0 · The Capability engine (learning doctrine)**: optimise for capability per hour, not content consumed. Every idea is proven on 4 dimensions by evidence, never by reading: Understand (own words, Feynman test, teach-back) · Retain (recalled after a gap, memory ≥70%) · Apply (right decision under a 30-second clock, or used for real) · Integrate (transfer to a different part of life, or taught at 4★). Status Unlearned → Learning → Competent → Maintained; tap any square on the map for the idea's dossier and its next proof. Confidence calibration: every recall and decision asks how sure you are first; sure + wrong = blind spot, flagged and brought back; Progress charts confidence vs reality. Training ground: decision sims (interleaved, every wrong option explained), Tell them apart, AI-fresh scenarios, transfer tests, Feynman test, blind-spot review. The daily mission (25 min, or 40 with more practice): brief → reviews → learn → rebuild from memory → apply → debrief. Reality loop: after-action reviews become experiments you mark kept / modified / dropped. 70/20/10 measured from real lessons. Lessons start with 'you'll be able to' + the learning mode, end with 'where else could this work?'. After 21:00 new lessons ask first: sleep stores learning. The 15-law doctrine sits behind the ? button. | Egor sent the full learning doctrine: "apply it to my life and especially the Bootcamp, think outside the box, don't be afraid of changes" |
| 18 Nov | **War Room 13.22.0 · The memory engine**: exposure is not knowledge. Every learned idea now has a memory strength (retention ≈ e^(−days/stability)): Strong, OK, Fading, Forgotten. Reviews are blank-page ACTIVE RECALL (explain it from memory, then the card, then grade yourself Again / Hard / Good / Easy, optional AI grading), replacing the multiple-choice warm-up. Spacing adapts to how much you remembered: Again = back tomorrow + a 60-second fix-it step; Good/Easy = weeks to months. The Path opens with a knowledge panel (learned, due, fading, used for real, mastered) and today's retention mission: the idea closest to being forgotten, its 4-step mastery ladder and its next review days. Progress shows your memory bands and the forgetting curve (learned once vs spaced recall). | Egor shared the spacing + active-recall research: "apply this in my learning, especially the bootcamp, make something exceptional" |
| 18 Nov | **War Room 13.21.0 · Drive mode + Teach it back**: Learn → Path → 🎧 Drive mode reads your lessons out loud in the car (idea, picture, example, your move, trap, memory hook), then quizzes you out loud with a pause to answer: due reviews first, then new lessons, Business and Life mixed; giant buttons, speed control, screen stays on (Android voice needs app 1.8). In every lesson's Recall step, Teach it back has the AI grade your own-words explanation (stars, what you got, what you missed, how to say it, how to use it tonight). | Egor: "go, be even more creative… how I can learn all that in the best way" |
| 18 Nov | **War Room 13.20.8 · Learning limits switch + exact clips**: Learn → Path has a "Learning limits" switch. ON = 1 Business + 1 Life lesson a day, more after 10 dials, modules in order. OFF = every module and lesson open, unlimited. The Watch step now plays only the part of the course video where the idea is taught (from its moment to the next one), not the whole lesson. | Egor: "make it so I can do unlimited lessons or switch it on and off" |\n| 18 Nov | **War Room 13.20.7 · Videos never restart**: every course video now plays in one docked player at the bottom that lives outside the screens, so syncs, the clock, unlocking or switching screens can't restart it; it keeps playing while you read or move around (▾ shrinks it to a bar, keep listening). It remembers where you stopped in each video and resumes there (YouTube to the second, acquisition.com videos approximately), with Start over. | Egor: "halfway through the video it just closes and I have to open it from zero again" |
| 18 Nov | **War Room 13.20.6 · Mindset videos attached + Android 1.7**: 33 Mindset lessons now open with their video and 1,140 key moments (tap one, it plays from that second; bold ideas get a ▶). Android app 1.7 blocks the YouTube player's hand-off to the YouTube app, so Sales Teams and every YouTube video keeps playing inside War Room; older app versions show a one-tap update prompt. | Egor: "in Sales Teams the videos still go to YouTube… and attach the Mindset videos" |
| 18 Nov | **War Room 13.20.5 · Attendance: tap who came**: after a group, every kid starts unticked; tap the ones who were there and everyone else is saved as absent (a quick check asks before saving a lesson where nobody is ticked). | Egor: "I like it how it was earlier, where I just check who was present" |
| 18 Nov | **War Room 13.20.4 · Videos can't leave the app**: every in-app player (Learn lessons, Bootcamp watch step, course moments, exercise videos) is locked so a tap on the YouTube logo, the title or "Watch on YouTube" can no longer replace War Room with youtube.com. Android app 1.6 also catches any jump to YouTube or Mux and plays it in War Room's own player. | Egor: "when I click the video in Learn it still shows it in YouTube" |
| 18 Nov | **War Room 13.20.3 · Readable lessons**: 18 lessons that were one wall of text (10 of 13 Scaling, plus 2 Offers, 5 Leads, 1 Money Models) now have a highlighted bottom line, a heading per section, short paragraphs and bullet lists (same words, laid out). Every Scaling stage lesson gets a stage map: the 10-stage staircase with this stage lit, team size, your role, the one job of the stage, and the fix per function. | Egor: "in the scaling roadmap the text is not formatted… make it readable, add diagrams" |
| 18 Nov | **War Room 13.20.2 · Every course moment**: all 73 Scaling, Offers, Leads and Money Models lesson videos transcribed; 1,025 key moments across the courses (incl. 271 in Sales Teams), each starting at the sentence where he explains the idea. Spot-check: 5 of 6 exact, the miss lands in the right part of the lesson. | Egor: "select the exact sequences for each training" |
| 18 Nov | **War Room 13.20.1 · One Learn tab**: Bootcamp + Courses merged into Work → Learn: Path · Courses · Practice · Missions · Progress. Courses tab = 8 course tiles with progress + search across every course. Every course page: header, progress, Continue, then Lessons (each with its video + key moments) · Key ideas (deep cards) · Tools (diagrams, calculators, scorecard). Every lesson: clean title, video on top, readable notes, Done → next lesson (synced). One readable font, no all-caps. | Egor: "it's confusing… make it like a professional app… unite bootcamp with courses" |
| 18 Nov | **War Room 13.20.0 · Bootcamp, clear**: rebuilt like a learning app. Four tabs: **Path** (today's checklist, one big Continue button for the next Business and Life lesson, the module path with ✓ / ▶ / 🔒 lessons and a boss at the end), **Practice** (warm-up, mixed drill, weak spots, short day, owner simulator, final exam, each with when to use it), **Missions** (active missions + every idea you used for real), **Progress** (rank ladder, 4-week streak, the 5 steps, the map). Lessons show Step x of y, one line on what to do now, and a sticky Continue. A ? guide explains how it works and why this order. Lessons with a course lesson now play the real acquisition.com video (from 13.19.1) in the Watch step. |
| 18 Nov | **War Room 13.19.2 · Sales + Wealth videos**: Sales Teams lessons now play Hormozi's full $100M Sales Team System course (YouTube, 3h22) inside War Room, each lesson starting at its own chapter, with 271 key moments matched to the exact second. Wealth lessons show acquisition.com's own lesson page (their player) inside War Room. Android app 1.5: anything loading inside a page stays in the app. | Egor: "the sales teams… is a 3-hour video on his YouTube… and wealth, work around it" |
| 18 Nov | **War Room 13.19.1 · Videos inside War Room**: Courses → every Scaling, Offers, Leads and Money Models lesson now has its real acquisition.com course video playing inside the app, with a Key moments list (each key idea in the notes → the exact second he explains it, found from the lesson transcript); bold ideas in the notes are tappable. Every YouTube link anywhere opens the in-app player. Android app 1.4 stops handing videos to the YouTube app. Wealth + Sales Teams videos are locked to acquisition.com's own site, so those still open there. | Egor: "why are the videos still playing on YouTube… take them from the actual trainings on acquisition.com" |
| 18 Nov | **War Room 13.19.0 · Bootcamp v2**: everything in the library, two tracks. Business (15 modules): mindset → execution system → stage → your market (home care) → opener → discovery → objections & close → offer → outbound → money models → lead engine 2 → unbreakable → build the machine → the long game → wealth. Life (7 modules): sleep, habits, learning (BAC), body, tennis, people & persuasion, mind. 203 ideas (+42 business cards from Jocko, Leila, Robbins, Paul Graham, Munger, Naval, Kennedy, Tweed, Savage, NEPQ; +35 life cards from Library II). Each day: 1 Business lesson (call mission on Dial) + 1 Life lesson (mission on the Day screen); more lessons unlock only after 10 dials. All Bootcamp questions, number drills and the owner simulator now use offer v3 (First Hire Free → Priority Bench $2,500 / 4 weeks, Pay When They Work $1,500, Tampa Bay first). |
| 18 Nov | **War Room 13.18.0 · Bootcamp**: Work → Bootcamp, zero to operator. 12 modules in the order your business needs them (mindset → stage → offer → leads → opener → discovery → objections & close → money models → lead engine 2 → unbreakable → build the machine → wealth), covering all 126 cards. Each idea: predict → learn → watch → recall (closed book) → use (tonight's call mission, shown on the Dial screen). Boss fights open the next module (80%), test out early (90%), red-line questions (honesty and legal) fail a test on their own. 5-rung mastery map: learned, recalled, judged, used on a call, proven. Warm-up reviews, mixed drill, weak spots, 10-minute short day, number drills, and the owner simulator (AI plays a Naples owner at 5 difficulty levels, then grades you against the cards). |
| 18 Nov | **War Room 13.17.1 · Exact clips**: every video segment in the deep cards now starts at the exact moment the idea is explained and lasts 1–4 min (avg ~3), instead of long chunks up to 30 min. Transcript-checked: mental toughness, SPCL, blocks exercise, value equation, hooks, lead magnets, proof, CTAs, market, show rates, time study, Sharran's equity, 30MPC sequence and discovery agenda. One off-topic clip removed. |
| 18 Nov | **War Room 13.17.0 · Mentors**: new Courses → Mentors tab with 26 deep cards from your library (Josh Braun 9, 30MPC 8, Chris Voss 9), each with the segment playing in the app (whole short videos or chaptered parts of the masterclasses). 126 cards, 172 segments in total. Next: Leila, Jocko, Naval, Paul Graham, Munger, Kennedy, Robbins | You asked to extend the deep cards beyond Hormozi to the whole mentor library |
| 18 Nov | **War Room 13.16.0 · How it all works**: Courses → Overview opens with the money machine (Market → Offer → Leads → Sales → Money model → Scale → Wealth, Mindset as the engine, the cash loop, 'you are here' on Leads + Sales) and your 16-card learning path with Next card. Every deep card now links its free full acquisition.com lesson (51 cards); 144 in-app segments (new: Ultimate Sales Training for the close, BAMFAM, money objection and show rates; Sharran on inflation, taxes and fees; the lonely chapter) | You said you don't yet see how the courses fit together |
| 17 Nov | **War Room 13.15.1 · Deep cards**: tap any idea in any course (Mindset, Scaling, Offers, Leads, Money Models, Sales Teams, Wealth) → a panel with the matching deep card, the video moment playing inside the app (only that segment, nothing opens YouTube) and 'Explain it deeper' (written on the spot with your AI key, saved). 100 hand-written cards: hook, a visual made for the concept, plain words, tennis analogy, worked example with numbers, your move for Caregiver Bench, the trap, a memory hook and self-test questions; 132 video segments (incl. Sharran's money milestones). Got it / Shaky → spaced review (1-3-7-21-60 days), synced. Every ▶ minute link now plays inline | You asked to understand and remember each concept, not just read it, with the exact video moment |
| 17 Nov | **War Room 13.14.0 · Mindset batch 2**: 4 Modern Wisdom marathons (41 Harsh Truths, Be Ruthless, Raise Your Standards, Success Is a Side Effect), Diary of a CEO 2026 and 2 Ed Mylett interviews read in full → 525 ideas across 13 source pages with minute links; best-of gains 3 sections (mental toughness, standards & reps, building it); 4 new diagrams (four dials of toughness, the tower, bad days are statistics, 100 golden BBs); new tool 'Will it change my day?'. Plus all 20 of his 2025-26 live streams read in full (621 ideas, one page each, minute links), a new best-of section 'The hotline' and 2 diagrams (Influence · SPCL, Get out of the bottleneck). Mindset 2026 now holds 1,146 ideas from 33 sources | You asked for everything from his podcasts in the app, as visuals and tools, not just text |
| 17 Nov | **War Room 13.13.0 · Mindset 2026**: Courses → Mindset gets 207 new ideas from his 2026 live streams + the latest Modern Wisdom episode (a curated 'best of' + one page per source, every idea linked to the minute), 8 new diagrams (courage, hopeless/anxious/quest, push vs pivot, pick your regrets, whip behind, lonely chapter, POWERS/HEARTED, story frame) and 4 tools that save and sync: Pick your regrets (10 life areas), Fear → specific, Decision document, Bad-day check | You asked for his real mindset from the lives and podcasts, presented visually and usable |
| 17 Nov | **War Room 13.12.0 · Stage scorecard**: the Scaling Roadmap applied per function. 8 functions (Sales, Product, Leads, Recruiting, Client service, Finance, Team, IT) each get their own stage from evidence: 39 exit tests for Improvise → Monetize → Advertise. Business stage = the lowest function = the constraint; its next test sits at the top of the Day screen. New page: System → Stage scorecard | You: stages aren't only headcount and functions grow unevenly; score them separately and keep pointing at the constraint |
| 17 Nov | **War Room 13.11.1 · smooth open**: (1) no more "Update ready · Reload": a new version installs silently. If it arrives before you touch anything it applies instantly (no PIN); otherwise it waits until you leave the app and you come back to the same screen. (2) No flash of the old layout on open: the screen stays dark for ~0.5 s while the real Day screen (with the guided day) is fully built, then appears in one step | You: the app reloaded after you'd opened it and asked for the PIN again; on the laptop it flicked from an old screen to the new one |
| 17 Nov | **War Room 13.11.0 · Course library**: Work → Courses now holds every course in full, lesson by lesson (Scaling 16 · Offers 11 · Leads 19 · Money Models 34 · Sales Teams 5 · Wealth 8 · Mindset 15 sections), 'from his videos' pages (2,600+ ideas from 252 videos, each linked to its source), search across all of it, Ask about any lesson, and 👁 See it: 29 diagrams of the core frameworks (stage staircase, Value Equation, Core Four, 4 prongs, CLOSER, M-O-N-E-Y ladder…) | You asked to go through every course fully and read it inside War Room, visually; Hormozi: study your stage ±1, then act |
| 17 Nov | **Courses implemented in the plan** (not just the app): Rules → Money rules (Wealth Roadmap with your real numbers), System → Courses → my system (map), daily drill themes in Practice, the 3 mindset questions in Shutdown, course KPIs + money count in the Sunday review, proof capture + 4 R's in the trial SOP, two decisions for 23 Nov | Applying the courses to every part of the day, not reading them |
| 17 Nov | **War Room 13.10.0 · Time ranges everywhere**: every chart has 7 d · 30 d · 90 d · 1 yr · All (Money: You have with start, now, in, out, margin; Reports by months; Stats; Wealth margin). Each chart remembers its choice; Settings → Time ranges sets the default for all. Balance before your first count is rebuilt from where you started (0 on your first entry, editable) and marked estimated | See change over any period, one control, same on phone and laptop |
| 17 Nov | **War Room 13.9.0 · Courses** (Work → Courses): every Acquisition.com course as a working module fed by your data. Scaling (stage from the log, 8 functions, the constraint now) · Offers (starving crowd, Value Equation, dream-outcome sentence, problems→solutions trim & stack, enhancers, MAGIC, 80% margin) · Leads (Rule of 100 grid, Open to Goal, Core Four, engaged leads vs benchmark, cold outreach + lead magnet checklists, 7 levels) · Money Models (CAC/GP/payback, levels 1–3, your 4 prongs, 5 upsell moments) · Sales (daily drill theme, 25 reads, role-play, game tape, funnel diagnostics, 8-second silence, loops) · Mindset (rule of the day, decision test, 27 situations, 3 questions). Wealth: your own minimum monthly living + 6/9/12 targets side by side | Study only your stage ±1 (the course's own rule): later parts show what opens them |
| 17 Nov | **War Room 13.8.0 · Wealth + phone parity**: Money → **Wealth** runs the Wealth Roadmap (M-O-N-E-Y) from your ledger: margin (in, out, what's left, every category in detail, monthly nut, 90-day test, lifestyle-inflation check, one lever), optionality (transition fund vs 6–12 months of essentials), $100k net financial assets (freeze lifestyle, balance sheet, automatic monthly statement), equity rich + the 4 money monsters, your terms (coverage ratio). **Phone = laptop**: the laptop's side panels and Day column now show on the phone; Settings has Jump to (App lock one tap) | Wealth course: margin first, one milestone at a time. Every element on both devices |
| 17 Nov | **War Room 13.7.0 · Script Lab** (Work → Playbook → Scripts): a personal markup layer over Call 1, Case call, Gatekeeper, Voicemail and Loops. Rewrite lines, highlight (gold key · green works · red fix · blue note), flag ✓ ? ✎, margin notes, add/hide lines, Compare, Lock for calls. Nothing reaches the dialer until **Apply to Playbook** on a line; applied lines go into the Drive mirror at the nightly review | Practise and refine the words without ever breaking the live script (dev freeze overridden by Egor for this one tool) |
| 17 Nov | **War Room 13.6.2 · smart unlock**: fixed the app reloading itself seconds after you unlock (a new version auto-reloaded the page, which asked for the PIN again). Unlocking now holds for the "Lock again after" window even across reloads or closing the app (new options 4 h / 12 h / 24 h). Trusted places: save Home etc. and the app opens without a PIN within ~250 m | Fewer PIN taps, same protection when the phone is somewhere else |
| 17 Nov | **War Room 13.6.0 · simpler guided day**: every step is just **Done** or **Missed**. plus a small Move link (free slots later today, tomorrow, any day and time). Whatever is missed and not moved, the nightly review (21:13) reschedules | One tap per step, no decisions mid-day |
| 17 Nov | **War Room 13.5.0 · guided day**: Todoist tasks due today (and overdue) now sit in the step-by-step flow, untimed ones slotted into free gaps. Skip opens a sheet: move to a free slot found in the calendar (today/tomorrow), +30 min/+1 h/+2 h, pick a day and time, or drop it. ▲▼ reorders steps. Moving a block to another day turns it into a timed Todoist task, so the reminder fires | Nothing gets silently forgotten: every skipped item is either dropped on purpose or has a new time |
| 17 Nov | **Whole business v4**: added Marketing (Core Four, both sides), Scaling (6 gates), Business setup, Hiring Snapshot, Hiring a screener, Life audit from the War Room log | Scaling Roadmap: study your stage; one source of truth |
| 17 Nov | **Sales system v4**: one offer ladder (First Hire Free → Priority Bench $2,500 / 4 weeks or $1,500 per caregiver), every script rewritten to the $100M Sales Teams structure (Intro → Disco → Pitch → Close → Loops → BAMFAM), new pages: sales map, case call, emails, results call, exit call, caregiver side, practice | Model v3 fixed the offer to 80% margin and one ask; Sales Teams: one script, then practise it |
| 17 Nov | Metro stays **Tampa Bay** (813 number, ~750 agencies), Collier and Lee are the second wave. Week stays **350 dials** | Local number = pickup; Collier and Lee have 212 agencies, which a 7-attempt cadence uses up in ~4 weeks at 350 a week |
| 17 Nov | Founding Offer ($500 after 5 shifts) retired. "Founding 5" now = first 5 paying agencies lock their price for 12 months for a case study + 2 intros | Money Models: never discount the core; trade, not discount |
| 17 Nov | Old docs (CALL SCRIPT v3, KNOW IT COLD, EgorFlow offer, sales playbook, THE PLAN v2, Delivery SOP, whole-business doc) moved to 9 Archive | One source of truth |
| 14 Nov | Reset after the 4-AI review: Tampa Bay, 350 a week, bench of 15 by 30 Nov, payment via dad's company | See Mission → Decisions |` },
{ id: 'audit', cat: 'system', title: 'System status · 13 Nov', body: `## Done
- War Room v5 is the app (Android app 1.1 + web). v4 retired.
- Morning brief (06:00), close the day (20:40), Sunday review (10:40): all on the 350 week (since 14 Nov).
- Hourly sheet sync and Monday Bulletin draft: on the new sync row.
- Old check-ins and the Todoist DIAL BLOCK task: retired.
- Calendar: no overlaps (checked 16–22 Nov and 7–13 Dec). From 1 Dec the BAC morning block is 06:15–07:30.
- HQ trimmed: rings, campaign, medals, coach quote, money card gone.
- Lead DB (all Florida) + 3,500 open leads in Dial.

## Open
- Archive the old sheets (Dubai leads, DaviDan, 5 gym trackers, 100 Days, MasterTracker, Bench tracker) into one Archive folder.
- The whiteboard: this week's dial number, the ONE change, the next 3 deadlines.
- CloudTalk sign-up (2 minutes, Google + code).` },
/* ───────── MISSION ───────── */
{ id: 'why', cat: 'mission', title: 'Why I do this', body: `Read before the first block every day.

- For the kids and family I'll have. Remember Markus, Lukas and Lia hanging on my hand in the training gym.
- For my family to be proud of me: mum, dad, grandpa, grandma.
- To be useful to the world and make a positive impact.` },
{ id: 'goals', cat: 'mission', title: 'Goals for 1 July 2027', body: `# The mission
| Goal | Target |
| Company (#1) | **$20,000 MRR**, Caregiver Bench |
| BAC | **Pass, with an average not lower than 7** (your floor, set 19 Nov: 7 is fine, an 8+ is not the goal). English and IT by certificates |
| Body | **85 kg lean**, trained every day, best tennis I can play |
| Character | Clean. Phone rules kept. In bed at 21:00 |
| Money | **Wealth Roadmap, one milestone at a time:** M = 3 months in a row of real margin (log every lei), then O = a transition fund of 6 months of essentials. Make more each month (Rules → Money rules) |

## Priority order
The company is #1. When things clash, the cut order decides (see Rules → When the day doesn't fit).` },
{ id: 'now', cat: 'mission', title: 'This week: the current rules', body: `# v4 · 17 Nov (overrides anything older)
0 owner conversations so far. The plan is done. **The work is dialing, screening and delivering.**

## The 5 numbers that run the business
| What | Rule |
| Where | **Tampa Bay first** (Tampa, St. Pete, Clearwater, Brandon and around: ~750 agencies, the 813 number). Collier and Lee are the second wave, switched on at 3 paying agencies or when Tampa Bay runs out |
| Volume | **350 dials a week**, max 100 a day per number while it warms up. From 30 Nov, if the number is clean: Thursday 150 (= 400) |
| Offer | **First Hire Free** on one open case → **Priority Bench** $2,500 every 4 weeks or **Pay When They Work** $1,500 per caregiver (Business → What we sell) |
| Script | **Call 1** books a 10-minute case call. **Call 2** (day 25) turns the free win into a plan. Nothing else is sold on the phone |
| Supply | **15 phone-screened caregivers in Tampa Bay by 30 Nov**, plus ads for every case the day it's taken |

## The week
| Day | Dials | When (Moldova) | Florida |
| Mon | 10 | 20:30–20:45 | 13:30 |
| Tue | 100 | 15:30–16:55 + 17:00–17:55 | 8:30–10:55 |
| Wed | 10 | 20:30–20:45 | 13:30 |
| Thu | 100 | 15:00–18:20 | 8:00–11:20 |
| Fri | 50 | 19:30–20:40 | 12:30–13:40 |
| Sat | 80 + callbacks | 15:00–17:00 and 18:45–20:30 (cap 100) | 8:00–10:00 and 11:45–13:30 |
| Sat | **Caregivers** | 17:00–18:30: ads + screening calls | 10:00–11:30 |
| Sun | 0 | No cold calls. Review, plan, applicants, Bulletin | |

**Floor on a broken day: 10 dials. Never 0.**

## Promises you may make right now
- Profiles **within 3 days** of the case call (48 hours only once the bench has 15).
- The first caregiver who works the case is free.
- Show-Up Guarantee and 90-Day Stay-or-Replace.
- Never: a date for an interview you can't fill, a number of caregivers you don't have, "agencies like yours" before you have them.

## Blocks revenue, not dials (needed before day 30 of the first trial)
1. Payment route: dad's company invoices in USD (accountant's OK).
2. One-page agreement checked by a Florida healthcare lawyer.
3. A person who sees the dial number every night.

## War Room development (corrected 20 Nov)
War Room and Caregiver Bench are **two separate projects.** Caregiver Bench is my focus during the day. Claude develops War Room on its own while I work on the business. **War Room development is not tied to my dial count or to a first paying client.** The old rule here ("no new War Room features until 1,000 dials or the first paying client") is withdrawn.

Business plan changes still happen at the Sunday review only (System → One source of truth).` },
{ id: 'life', cat: 'mission', title: 'Life audit · 17 Nov (from your War Room log)', body: `Every area, measured against its target, from the numbers you actually logged 1–17 Nov. **One test for each: does it make 1 July 2027 more or less likely?**

| Area | Target | Logged reality | Verdict | The one fix |
| **Dials** | 350 a week | **3 dials** from 9 to 17 Nov, 0 owner conversations | **Off track. This is the whole business.** | First dial inside 2 minutes of every block. Today 15:30: 60 |
| **Caregiver bench** | 15 screened by 30 Nov | 0 on the bench | Off track | Saturday block: post the ad (Leila structure), call every applicant same day |
| **Sleep / wake** | Up 05:20, bed 21:00 | Woke 09:15, 09:30, 10:00, 10:00 on 4 of the last 8 logged days; 05:29 and 06:27 since Monday | Improving | Phone out of the bedroom at 20:45, no exceptions. Wake logged in the app every day |
| **Training** | Every day | Trained Mon 16 and Tue 17 | On track this week | Keep the 10-minute floor on bad days |
| **Weight** | Nov avg 77 → 85 by June | 77.0 → 78.0 (79.1 peak), month avg 77.7 | **Ahead** of the curve | No change. Weekly average, not the daily number |
| **BAC** | Daily block + Anki; Python exam 14–18 Dec | 123 min logged this month; today's block skipped | Behind | The 06:15 block is not optional: 25 min, phone in another room |
| **Money** | Spend < earn, earn more each month | Nov: made 6,000 MDL, spent 1,770 (30%) | **On track** | Log every cash spend the same minute |
| **Standards** | 7 a day | Average day score 32% | Off track | Tick them in the shutdown honestly: what you measure moves |
| **Learning** | Card daily, applied same day | Running | On track | Every lesson ends in one line tried on today's calls |
| **Accountability** | One person sees the dial number nightly | Not named | Missing | Name them this week. The stake starts that day |
| **Tennis coaching** | Income + attendance | Groups running | On track | Attendance through the guided day |

## The honest read
Body, money and learning are on track. **The business has not started: 3 dials in 9 days.** Everything else in this system exists to make the dial block happen. The plan doesn't need changing. The behaviour does: the block starts, the first number is dialed within 2 minutes, and the phone stays on the dialer until the count is hit.

## This week's contract vs the plan
Your board says 300 dials; the plan says 350. 300 is the floor you signed; 350 is the target in the calendar. Hit 300 and you kept your word; hit 350 and you're on plan.` },
{ id: 'backward', cat: 'mission', title: 'The plan backward', body: `Read from the bottom up: for the top line to be true, every line below it must be true by its date. **Proof first, then plans.**

## Company: checkpoints
| By | Must be true |
| 30 Jun 2027 | **$20,000 MRR**: 8 Priority Bench (≈ $21,700 a month) or 6 Priority Bench + 1 Multi-site |
| 31 Mar | 5 paying agencies (≈ $13,500 MRR) · screener #1 hired |
| 1 Mar | **Reality rule:** fewer than 2 paying agencies = the July target becomes $10,000 and the plan is rebuilt |
| 28 Feb | 3 paying agencies (≈ $8,100 MRR) · Collier and Lee switched on |
| 31 Jan | **First paying agency** (first invoice cleared) · 3 agencies where a caregiver of mine worked |
| 31 Dec | **First caregiver worked a shift** (free trial) · 2 trials running · 2,000+ dials |
| 8 Dec | 100 owner conversations (then, and only then, new ideas are allowed) |
| 30 Nov | **15 screened caregivers in Tampa Bay** · first trial started · number clean · payment route agreed · lawyer booked |

## The honest math
~2,000 dials per paying agency (the 14 Nov estimate). At 350 a week that is one new agency every ~6 weeks = **about 5 by June: not enough.** The gap closes only by (1) a clean local number that doubles pickup, (2) a disco that finds the open case, (3) going to 400 then 550 dials from December. Real rates replace these after 300 dials.

## Body: weekly average weight
| End of | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| kg | 77 | 78 | 79.5 | 80.5 | 81.5 | 82.5 | 84 | 85 |

Every 2 weeks: gaining under 0.25 kg a week = +200 kcal. Over 0.5 kg a week = −200 kcal.

## BAC: the hard dates
See Body & BAC → BAC deadlines.` },
{ id: 'proposals', cat: 'mission', title: 'Decisions', body: `## Decided 17 Nov (sales system v4)
| Question | Decision | Rule behind it |
| Offer on the phone | **First Hire Free** on one open case. No price talk on call 1 unless asked | Scaling Roadmap stage 0–1: get people to try it free |
| Prices after the free win | Priority Bench **$2,500 every 4 weeks** (2 caregivers who work) · Pay When They Work **$1,500** ($2,000 hard case) · Multi-site $6,000 at gate 4 | Money Models: 80%+ gross margin; Offers: premium price |
| Founding Offer $500 | **Retired.** First 5 paying agencies lock their price for 12 months in exchange for a case study + 2 owner intros | Never discount the core; trade, not discount |
| Metro | **Tampa Bay** first, Collier and Lee second wave | Sell where you can deliver; local 813 number |
| Volume | **350 a week** (100 a day per number), 400 from 30 Nov if the number is clean | Rule of 100; number warm-up |
| Scripts | Sales Teams structure, 25 reads before the first block, game tape every evening | One script, then practise it |

## Decided 14 Nov (4-AI review, still true unless changed above)
| Biggest risk | **No caregivers to deliver.** 15 screened in Tampa Bay by 30 Nov |
| Funnel | Plan with ~2,000 dials per paying client |
| Getting paid | Dad's company invoices in USD now; US LLC later |
| Calling | US local number, Free Caller Registry, max 100 a day a number, manual dialing, 20-second voicemail + same-day email |
| Lawyer | One-page check by a Florida healthcare lawyer before the first invoice |
| Texting | No cold SMS. Only after consent and with a registered business number |
| Cold email | After the first client or ~1,000 dials, from spare domains, never from caregiverbench.com |

## Still open (Sunday review)
- **Rule of 100 (Leads):** the course's baseline is 100 primary actions every day; the plan is 350 dials a week with 10 on Mon and Wed. Option: count follow-up emails and voicemails as primary actions and add 20 minutes of caregiver outreach on Mon/Wed so every weekday reaches ~100. Decide on 23 Nov.
- **Transition fund (Wealth):** target 60,000 MDL (6 × 10,000). Move the ~17,000 you have into a separate savings account or sealed envelope, then 5,000 MDL every payday until full (~9 months). Decide on 23 Nov.
- **Accountability partner:** who sees the dial number every night?
- **Team:** a commission caller only after one paid placement.` },
/* ───────── RULES ───────── */
{ id: 'daily8', cat: 'rules', title: 'The Daily 8 and the minimum day', body: `| # | What | In War Room |
| 1 | **Sleep** 21:00 → 05:20. Phone outside the bedroom from 20:45 | Sleep |
| 2 | **Train** at 05:30 every day. Bad day: 10 minutes. Never 0 | Train |
| 3 | **Food:** 5 fixed meals, about 3,400 kcal, 170 g protein, 3 L water | Food & Water · Food tab |
| 4 | **Sun:** 10+ minutes outside before 10:00 | Sun |
| 5 | **Digital protocol:** blockers on, no phone in study blocks | Digital |
| 6 | **BAC:** today's block + Anki | BAC minutes |
| 7 | **Dials:** today's number (350 a week) | Dial tab |
| 8 | **Honor:** I did what I said I would do today | Honor |

## The minimum day
**10 minutes of training + 25 minutes of Anki + 10 dials + bed at 21:00.** Sick: silent lead prep replaces the 10 dials. A minimum day is a win. A zero day is the only loss.

## The 2-minute rule
The first action of every block happens within 2 minutes. No messages first.` },
{ id: 'cutorder', cat: 'rules', title: "When the day doesn't fit", body: `Cut from the bottom. Never from the top.

1. Sleep (never cut)
2. Morning training (10 minutes, never 0)
3. BAC morning block
4. Dials (10, never 0)
5. Tennis lessons (my income)
6. Company deep work
7. Extra gym sessions
8. My own tennis training (TT)

Behind for 2 months in a row = use the cut order, not more hours.` },
{ id: 'rules', cat: 'rules', title: 'House rules', body: `- **One plan:** this playbook. Every other doc is a mirror or an archive (System → One source of truth). EGOR OS is frozen.
- **Changes only on Sunday.** One change per week, written in Plan → Review and on System → Changelog.
- **No new business ideas until 100 owner conversations** (review 8 Dec).
- **A slip is not a reset.** Three honest lines (what happened, the real cause, the one fix), then the next right action.
- **The stake** (500 MDL per day under the minimum) starts only on the day I name an accountability partner.
- **If I don't know something on a call:** "Good question. I don't want to guess. I'll find out and email you today."
- **Never inflate a number.** Not agencies, not caregivers, not years.` },
{ id: 'money', cat: 'rules', title: 'Money rules (Wealth Roadmap)', body: `Acquisition.com Wealth Roadmap: **M-O-N-E-Y, one milestone at a time.** War Room → Money → Wealth measures every line from your log.

## Where you are (17 Nov)
| Milestone | Done when | Now |
| **M · Margin** | 3 months in a row: money in > money out | **Not measurable yet.** Earned ~129,000 MDL since April, logged spending ~41,000, you have ~17,000. About 70,000 is unaccounted: part may be tennis pay not received yet, the rest was spent without a log line |
| O · Optionality | 6 × your minimum monthly living (10,000 MDL) = **60,000 MDL** in a separate place | ~17,000 = 1.7 months covered (28%). At 5,000 a month: full in ~9 months |
| N · Net financial assets | $100k | Later |
| E · Equity rich | $1M without your home | Later: the business is the route |
| Y · Your terms | Passive income ≥ spending | 0% |

## The rules
1. **Know every lei (lever 1 of margin).** Log each spend the minute you pay: "spent 120 taxi". Count every account every Sunday; the app turns the gap into "not logged" so nothing hides. Margin is only real when the log is.
2. **Monthly nut.** Your minimum monthly living is **10,000 MDL** (set by you in Money → Wealth). Essentials marked ★: food, transport, phone, gym, school. Change the number there when life changes.
3. **One lever a month.** Cut the biggest category, or raise income. Income has no ceiling: the dials.
4. **Freeze the lifestyle.** When tennis or the agency pays more, spending stays where it is. The difference goes to the fund, then the business.
5. **Transition fund (O):** essentials × 6 in a separate place (a savings account or a sealed envelope), never touched for wants. Fixed transfer on payday: **5,000 MDL a month** (your savings goal) until it is full.
6. **After the fund, the first ~$10k goes into the skill and the business that raise active income** (Hormozi: learn a skill before you invest). Caregiver Bench costs are logged as Business.
7. **Business money separate** from the first agency payment (SOPs → Business setup).
8. **Net-worth statement every month,** written automatically in Money → Wealth; read it on the first Sunday. You can't grow what you don't measure.
9. **The 4 money monsters (from milestone N):** no idle cash beyond the fund (inflation) · a tax strategist, not only a preparer (taxes) · written rules before the first investment (interruption) · ask every product and advisor how they get paid (fees).
10. **Impulse test:** anything outside essentials: does it make 1 July more likely? No = the wait list for 7 days.` },
{ id: 'stage-scorecard', cat: 'system', title: 'Stage scorecard (how we score our stage)', body: `> Not headcount. Each of the 8 functions has its own stage: **0 Improvise → 1 Monetize → 2 Advertise**. A function moves up only when every exit test of its tier passes. **The business stage = the lowest function. That function is the constraint**; its first failing test is the next action (shown on the Day screen and in Courses → Scaling). Auto tests read the app's data; manual ones are ticked with a date, only with proof.

## Rules
- Ties: the function nearest to cash goes first: Sales → Product → Leads → Recruiting → Client service → Finance → Team → IT.
- A function ahead of the business stage is held there: no new work on it until the constraint moves. (This is about the functions of the business. War Room is a separate project that Claude builds on its own: it is not held.)
- Studying: only your stage ±1 (Hormozi). Stages 3+ get their tests when we stand on stage 2.
- Live version with your progress: Work → Courses → Scaling.

## Sales
> Turn owner conversations into paying agencies

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | Owner script written and read out loud on 5+ days | auto |
| Improvise → Monetize | 10 qualified decision-maker conversations (written down, never email) | auto |
| Improvise → Monetize | First offer made with the price said out loud, then 8 seconds of silence | tick with proof |
| Monetize → Advertise | 3 paying agencies | auto |
| Monetize → Advertise | Close rate known over at least 10 offers | tick with proof |
| Monetize → Advertise | 2 written client results you can say on every call | tick with proof |

## Product
> The bench offer delivers a result agencies feel

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | Offer written: dream outcome, guarantee, price, 30-Day Bench Trial terms | auto |
| Improvise → Monetize | First concrete demand: a stated need + agreement to receive profiles | auto |
| Improvise → Monetize | A caregiver from your bench worked a shift for an agency (free is fine) | auto |
| Monetize → Advertise | 3 different agencies had a bench caregiver work | auto |
| Monetize → Advertise | First paying agency stays for month 2 | tick with proof |
| Monetize → Advertise | The #1 complaint is known and fixed | tick with proof |

## Leads
> Enough of the right owners hear about you, every week

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | 300+ agencies with a phone number in the list | auto |
| Improvise → Monetize | Rule of 100 started: 350 logged attempts in the last 7 days | auto |
| Monetize → Advertise | 4 weeks in a row at 350+ dials | auto |
| Monetize → Advertise | Funnel rates known from 500+ logged attempts | auto |
| Monetize → Advertise | 4 weeks of fresh leads ready (1,400 numbers not yet called) | auto |
| Monetize → Advertise | A second lead source tested: referral ask or a partner | tick with proof |

## Recruiting
> Screened caregivers ready before they are needed

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | Caregiver screening script written | auto |
| Improvise → Monetize | 5 screened caregivers with consent in the focus area | auto |
| Monetize → Advertise | 15 screened and ready caregivers | auto |
| Monetize → Advertise | 10+ applicants a week, 3 weeks running | auto |

## Client service
> What happens after yes: fast, predictable, visible

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | After-yes steps written (what happens in the first 24 hours) | auto |
| Improvise → Monetize | First agency onboarded within 24 hours of yes | tick with proof |
| Monetize → Advertise | First candidate sent within 72 hours on 3 requests | tick with proof |
| Monetize → Advertise | Weekly update sent to every client, 4 weeks running | tick with proof |

## Finance
> Get paid legally, know every lei, know your unit economics

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | A legal way to get paid confirmed (invoicing route + accountant OK) | tick with proof |
| Improvise → Monetize | Price and gross margin per plan written | auto |
| Improvise → Monetize | Every lei logged: ledger entries on 10 of the last 14 days | auto |
| Monetize → Advertise | First cleared payment received | auto |
| Monetize → Advertise | CAC and LTGP : CAC worked out from real numbers (≥ 3 : 1) | tick with proof |
| Monetize → Advertise | 30-day gross profit beats CAC (client-financed acquisition, level 2) | tick with proof |

## Team
> Your own role first, then the first hire

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | Your own role card: what only you do, and the weekly hours for it | tick with proof |
| Improvise → Monetize | Dial, bench and study blocks in the calendar at fixed times | tick with proof |
| Monetize → Advertise | First hire defined: screener role, scorecard, pay tied to results | auto |
| Monetize → Advertise | 5 delivery steps documented so someone else could run them | auto |

## IT & systems
> Only the tools sales and delivery need

| Tier | Exit test | Auto? |
|---|---|---|
| Improvise → Monetize | Every call attempt logged in the dialer | auto |
| Improvise → Monetize | Bench tracker in use (caregivers recorded) | auto |
| Monetize → Advertise | Invoices and payments tracked in the app | auto |` },
{ id: 'courses-map', cat: 'system', title: 'Courses → my system (where each one lives)', body: `Every course is a tool in War Room → Work → Courses, and every rule below has a home in the plan. **Study only your stage, one before and one after** (Scaling Roadmap).

| Course | The rule that runs my life | Where it lives |
| **Scaling Roadmap** | Stage 0 Improvise: get agencies to try it free. Fix only the constraint | Business → Scaling gates · Courses → Scaling (the constraint now) |
| **$100M Offers** | Value Equation: my weakest lever is **likelihood** (no proof yet) → the proof plan | Business → What we sell · SOPs → After a yes (proof capture) · Courses → Offers |
| **$100M Leads** | Volume negates luck. Rule of 100. One channel: the phone. More before better before new | Rules → This week · SOPs → Dial block · Courses → Leads (Rule of 100 grid) |
| **$100M Money Models** | Attraction (First Hire Free) → upsell at the first win → downsell after a no → continuity. One prong at a time | Business → What we sell · SOPs → After a yes · Courses → Money models |
| **$100M Sales Teams** | Frame + script. Daily drill theme. The rep who asks most closes most. 8 seconds of silence | Scripts · SOPs → Practice · Courses → Sales (drill, reads, game tape) |
| **Wealth Roadmap** | M-O-N-E-Y: know every lei, freeze the lifestyle, transition fund, monthly net worth | Rules → Money rules · Money → Wealth |
| **Hormozi mindset** | One test for every choice: more or less likely? Do the obvious thing for an unusually long time | Shutdown (3 questions) · Courses → Mindset |

## The rhythm that enforces it
| When | What | Where |
| Every dial day | Today's drill theme + 3 objections, first dial inside 2 minutes | SOPs → Practice · Dial block |
| Every evening | Shutdown: numbers, worst call, the 3 mindset questions | SOPs → Shutdown |
| 21:13 nightly | Missed items rescheduled; applied script lines copied to Drive | Scheduled review (Claude) |
| Sunday 11:00 | Course KPIs: Rule of 100 days, weakest funnel step, the constraint, margin, fund. ONE change | SOPs → Sunday review |
| First Sunday | Net-worth statement + Wealth milestone + plan backward | SOPs → Sunday review |` },
{ id: 'legal', cat: 'rules', title: 'Legal lines (never cross)', body: `- **We only recruit caregivers.** Never bring agencies clients, never charge per family, client, lead or referral, never take a share of their billing (Florida Patient Brokering Act). Fees are only per caregiver who works for the agency, or a monthly plan.
- **We never employ, pay, schedule or place caregivers.** The agency hires them as its own W-2 employees. Never send a caregiver to a family.
- **Caregivers never pay us anything.** Ever.
- **No reference or background checks.** The agency runs them (Level 2, I-9, E-Verify). We pass on only what the caregiver tells us and what we observe (FCRA).
- **No call recording.** Florida needs everyone's consent.
- **No text messages** without consent and a registered business number (A2P 10DLC). No cold texts, no texting after a voicemail.
- **Calls:** 8am–8pm their time, max 3 calls per number per 24 hours, no prerecorded voicemails, "don't call me" = do-not-call immediately.
- **Fair job ads:** no words about age, sex, origin, religion, family or health.
- **No fake scarcity:** "max 2 members per town area" is a real rule, so enforce it. "Founding 5" ends at the fifth paying agency.
- **Nurse registries (1099 contractors):** not for now.
- **The agreement** is reviewed by a Florida lawyer before anyone signs. One page that says: we recruit employees for the agency; nothing is paid for patients, clients or referrals; the agency does its own Level 2 screening, I-9 and E-Verify.
- **Telemarketing registration:** Florida exempts most business-to-business calls, but the exemption has conditions. Ask the lawyer in the same check. Calling-hour and 3-calls-a-day limits apply either way.
- **Caregiver data:** names and phones of caregivers stay in War Room and go to an agency only with the caregiver's OK. Ask dad's accountant whether Moldova's data law needs anything for sending them to the US.
- **Payments:** not on a friend's card. Dad's company invoices and receives USD, with his accountant's OK, until I can take them myself. The agency gets a W-8BEN-E from that company, not a W-9. Stripe does not work for Moldova.` },
/* ───────── SCRIPTS (the dialer reads these) ───────── */
{ id: 'script-map', cat: 'scripts', title: 'The sales system on one page', body: `Zoom out first. Every step of the business has one goal, one script and one number. If a number is low, fix that step only.

| # | Step | Goal | Script | Number to watch |
| 1 | Lead prep | Owner name + hook for the next 20 calls | SOPs → Dial block | Calls with an owner name |
| 2 | **Call 1 · the dial** | Book a 10-minute case call | Scripts → Call 1 | Dials → connects → owner conversations |
| 3 | Gatekeeper | A name and a time | Scripts → Gatekeeper | Names collected |
| 4 | Voicemail + email | A callback | Scripts → Voicemail · Emails E1 | Callbacks |
| 5 | **Case call** | Trial terms agreed, case written down | Scripts → Case call | Trials started |
| 6 | Recruit for the case | 2–3 screened profiles in 3 days | Scripts → Caregiver side · SOPs → After a yes | Profiles sent |
| 7 | Interviews + first shift | The caregiver shows up | Scripts → Caregiver side (confirmations) | Show rate |
| 8 | **Call 2 · results (day 25)** | A paying plan | Scripts → Call 2 | Trials → paying |
| 9 | Retention | They stay and buy more | SOPs → After a yes (check-ins, Friday note) | Months kept |
| 10 | Referrals | One owner intro per happy agency | Scripts → Call 2 (referral) · SOPs → Referrals | Intros |
| 11 | Exit call | Save it or learn why | Scripts → Exit call | Saves |
| 12 | "Not now" | Stay in touch until it's now | Emails E6–E7 · Bulletin | Recalls booked |

## The rules on every call (Sales Teams)
- **Loud, slow, clear.** Pause before what matters. Raise your pitch on questions.
- **Questions, not statements.** They believe what they say, not what you say.
- **The pain is the pitch.** No pitch until there's an open case and a number.
- **Ask, then shut up for 8 seconds.**
- **Every no gets at least 3 asks** (loop, then a universal close, AAA between).
- **BAMFAM:** never hang up without the next step booked on a date.
- **Every sentence true.** No fake numbers, no "agencies like yours" until you have them.` },
{ id: 'script-owner', cat: 'scripts', title: 'Call 1 · the dial (book the case call)', body: `Shown in the dialer for every call. {name}, {hook} and {town} fill in from the agency. Aim: **a booked 10-minute case call** (or the case call right now). 3–6 minutes.

## 1 · Intro (under 20 seconds) · name, company, reason, small yes
> Hi **{name}**, this is Egor with Caregiver Bench. I recruit caregivers for home care agencies around **{town}**. The reason I'm calling: **{hook}**.
> I'll be quick: two questions to see if I can even help, and if not, I'll let you go. Fair?
- Wait for the yes. Then: "Are you the one who handles caregiver hiring there?" Not them → Scripts → Gatekeeper.

## 2 · Disco (most of the call) · find the open case and its price
> In a normal month, how many caregivers do you hire?
> Is there a case open right now that's hard to staff? Which town, which shift?
- None open → "When did you last have one open for more than a week, or turn one down?"
> How long has it been open?
> What is that costing you?
- Help with the math if they don't know: "A 24/7 case is 168 hours a week. At about $32 an hour that's ~$5,400 a week you can't bill. Is that close?"
- Dig: **"Tell me more about that."** · **"Can you give me an example?"** Stay here until there's a number.
> Is the hard part getting applicants, or getting them to show up and stay?
> What have you tried so far: Indeed, a recruiter, referrals? How did that go?
> If that case were covered by someone reliable by next week, what would that change for you?

## 3 · Recap, label, confirm
> So if I heard you right: **[case]** has been open **[time]**, it's costing you about **[$]**, and the real problem isn't applicants, it's people who actually show up. Is that fair?
- No gap = no pitch. Go to "Not now".

## 4 · Pitch (under 90 seconds) · problem → solution → benefit, 3 times
> Given what you said, I think I can help. Mind if I walk you through it in 60 seconds?
> **No-shows:** I call every caregiver myself and confirm her the evening before and the morning of the interview, and again before the first shift. If she doesn't show, you get a replacement profile within 24 hours. That's my Show-Up Guarantee. Would that help?
> **Speed:** I post ads for your exact case the same day and phone-screen everyone who applies, so you get 2 to 3 local, screened profiles within 3 days, not a pile of résumés. Would that help with [case]?
> **Staying:** I check in with her on days 1, 3, 7, 14, 30 and 90. If she leaves in the first 90 days, I replace her free. Would that help?

## 5 · The ask · then silence
> Here's how I'd start, and it's simple: I recruit for that **[Tuesday overnight in Brandon]** this week. **The first caregiver who works it for you is free.** You only pay if you want me to keep going after you've seen it work. **Would you be against trying it on that one case?**
- **Stop talking. Count to 8.** Whoever speaks first loses the frame.

## 6 · Yes → BAMFAM
> Perfect. I need 10 minutes for the case details: town, hours, pay, must-haves. Do you have 10 minutes right now?
- Not now: "Today at 2 or tomorrow at 10, your time?" Get the email. Same day: Emails → E3.

## 7 · Not now → stay in the game
> No problem. Every Monday I send a short email with the screened caregivers I have, by town and shift, no names. Would it be a bad idea if I added you?
> And who around here would you guess is having the hardest time staffing right now?
> When's the right time to check back: early next month?
- Log the recall date. Never hang up without a date.

## Voicemail
See Scripts → Voicemail + same-day email.` },
{ id: 'objections', cat: 'scripts', title: 'Loops and objections', body: `Shown in the dialer under the script.

**The job is handling no.** Ask at least 3 times. Between asks: **AAA** = Acknowledge ("Totally fair"), Associate ("honestly, the owners who end up keeping us asked exactly that"), Ask again.

## Loop 1 · confirm value, then find the fear
> Totally hear you. Quick question: do you think having someone who confirms every interview would get you closer to a fully staffed schedule?
> What's your main concern? **What are you afraid of having happen?**

## The 5 universal closes
| Close | Say |
| Reason | "You're slammed? That's exactly why: this takes the hiring off your desk." |
| Hypothetical | "If [their concern] weren't an issue, would you try it on that one case?" |
| Zoom out | "You need that case covered, I cover cases, and the first one is free. What am I missing?" |
| 1 to 10 | "On 1 to 10, how sure are you this would help with that case?" Then: "What would make it a 10?" or "Why not a 1?" |
| Best / worst case | "Best case, the case is covered next week and you don't pay for it. Worst case, you saw 3 screened profiles for free and kept your process. Doing nothing guarantees it stays open." |

## Objections by type
| They say | You say |
| **Money** · "How much?" (call 1) | "The first caregiver who works the case is free, so you see it before you pay a dollar. After that most agencies your size pay less than one recruiter fee. Can I ask about the case first, so I know if I can even help?" |
| **Money** · "But after?" | "Two ways: $2,500 every 4 weeks for 2 caregivers who work, first pick in your towns. Or $1,500 per caregiver as you go. Recruiters charge $4,800 to $8,000 a hire." |
| **Money** · "Too expensive" (call 2) | "Compared with what? A lost caregiver costs you about $2,600, and that case is ~$5,400 a week of billing. If all it did was keep [case] covered, would it be worth it?" |
| **Money** · "Can you do it cheaper?" | Smile: "I could do it for more!" Then: "I keep one price for everyone. If it's too much, I'll put you on the plan that fits better." Change the plan, never the number |
| **Time** · "I'm busy / no time" | "That's exactly why. The case call is 10 minutes and takes the hiring off you. Today at 2 or tomorrow at 10?" |
| **Time** · "Call me later" | "Sure. Let's put it in now so neither of us has to remember: Thursday 10 or 2?" |
| **Decision maker** · "Ask my partner" | "Makes sense. What do you think they'd object to?" → "What if they say no?" → "Let's grab 10 minutes with both of you: tomorrow 10 or 2?" Ask for support, not permission |
| **Fit** · "We use Indeed / a recruiter" | "Most agencies do. Keep them. How many of those interviews actually show up?" |
| **Fit** · "We're fully staffed" | "Good to hear. Have you turned down a 24/7 or live-in case this year?" |
| **Fit** · "Recruiters burned us" | "Fair. Did you marry the first person you dated? Don't let one bad recruiter burn you twice. That's why the first one is free. What happened with them?" |
| **Fit** · "Are you a staffing agency?" | "No. A staffing agency sends a temp and bills by the hour. I find people you hire yourself, as your own employees." |
| **Stall** · "Send me info" | "Happy to. So it's not a brochure: which case should I build it around?" Then book the call that walks through it |
| **Stall** · "Let me think" | "Of course. What information do you still need to decide?" |
| **Stall** · "Maybe next month" | "What happens to [case] between now and then?" |
| "Where are you based?" | "In Europe, in Moldova. I work Florida hours. The caregivers are local to you; only the recruiting and screening is remote." |
| "How many caregivers do you have?" | The real number from the bench. While building: "I'm building the bench this month, so I recruit for your case specifically." |
| "How long have you done this?" | "Honestly, I'm new. You'd be one of my first agencies. That's exactly why the first caregiver is free." |
| "Is this legal? Patient brokering?" | "Yes. That's about paying for clients. I never touch clients or referrals, only caregivers you hire as employees." |
| "Are you licensed?" | "Florida licenses companies that provide care or place contractors. I do neither: I recruit, you hire your own W-2 employees." |
| "How did you get my number?" | "From your public listing." |
| "Is this AI?" | "No, it's me, Egor. I make my own calls." |
| Anything you don't know | "Good question. I don't want to guess. I'll find out and email you today." |` },
{ id: 'script-gatekeeper', cat: 'scripts', title: 'Gatekeeper', body: `Goal: **a name and a time.** That counts as a win.

> Hi, this is Egor with Caregiver Bench. I recruit caregivers for home care agencies in the Tampa Bay area. Who handles caregiver hiring there?

- **You have the owner's name (Sunbiz):** "Hi, is Maria in?" beats "who's the owner?". Calm, like you've spoken before.
- **They give a name:** "Thank you. And your name?" Write both.
- **Not in:** "When is the best time to catch her? And may I have her email, so I can send her the caregivers I have this week?"
- **"What's it regarding?":** "Caregivers for your hard-to-staff cases. Is she the right person, or is that someone else?"
- Next call: "**[Receptionist]** at your front desk said you handle caregiver hiring." True, because you spoke to them.
- The **scheduler** feels the pain first and is often your best way to the owner.

Log it as Gatekeeper with both names and the callback day.` },
{ id: 'script-vm', cat: 'scripts', title: 'Voicemail + same-day email', body: `Voicemail only on attempt 3 (cadence: SOPs → Dial block). **20 seconds.** Then the same-day email if you have an address.

> Hi **{name}**, Egor with Caregiver Bench. **{hook}**. I recruit and phone-screen caregivers for agencies around **{town}**, and the first caregiver who works a case for you is free. I'll try you again on **[day]**. My number is 561-556-0536, again 561-556-0536. Thanks.

(Swap in the 813 number once it's live.) Then call again on that day: owners notice when you do what you said.

Same-day email: Scripts → Emails → E1.` },
{ id: 'script-case', cat: 'scripts', title: 'Case call (10 min): start the free trial', body: `After a yes on call 1. Same day if you can. Goal: the case written down + the trial terms agreed out loud.

## 1 · Frame (10 seconds)
> Thanks for the time. 10 minutes: I'll ask about the case, tell you exactly what happens next, and we're done. Good?

## 2 · The case (never client names or health details)
- Town (and how far is OK), days and hours, live-in or shifts
- Pay rate
- Must-haves: HHA or CNA, car, language, experience with dementia or lifts
- Start date
- Who interviews, and when they're free this week
- **Confirm: it's a W-2 job with your agency.** (1099 / nurse registry = stop, politely)

## 3 · The terms, said out loud
> Here's how it works. I post ads for this case today and phone-screen everyone. **Within 3 days you get 2 to 3 Profile Cards.** You reply within 24 hours and interview within 72 hours, and you tell me how it went. **The first caregiver who works this case is free.** Every caregiver comes with the Show-Up Guarantee and 90-Day Stay-or-Replace. Around day 25 we do a 10-minute results call, and you decide if you want me to keep going. If you miss two of those steps, the trial ends. Fair?
- Fair-play: one agency at a time per caregiver; no fee if she applied to you directly in the 60 days before; if you hire someone I introduced within 12 months, the fee applies.

## 4 · Close the step
> I'll email you this in writing within the hour. What's the best email, and the best time for the results call around **[day 25 date]**?

Then: Emails → E3 within 1 hour. In War Room: Pipeline → "Case call done → trial starts today" (creates the tasks).` },
{ id: 'script-emails', cat: 'scripts', title: 'Emails (owners)', body: `Plain text, 3 to 6 lines, from the main address, no attachments, no links except the agreement. One ask per email. **Texts are for logistics only, and only after consent.**

## E1 · Same day after a voicemail
Subject: {town} caregivers
> Hi {name}, I left you a short voicemail today. I recruit and phone-screen caregivers for home care agencies around {town}, and I confirm every interview and first shift so they actually show up. If a case is hard to staff right now, the first caregiver who works it is free. Is there one I could recruit for this week?
> Egor · Caregiver Bench · 561-556-0536

## E2 · Within 1 hour of an owner conversation
Subject: our call today
> Hi {name}, thanks for the time today. You said **[their exact words]**. Next step: **[what you'll do]** by **[date]**. We're talking again on **[date, time]**.
> Egor

## E3 · Within 1 hour of the case call (the trial in writing)
Subject: your [case] · next 30 days
> Hi {name}, here's what we agreed.
> **The case:** [town · days and hours · pay · must-haves · start date]
> **What I do:** ads today, phone screens, 2–3 Profile Cards by [date], confirmations before every interview and first shift.
> **What you do:** reply to cards within 24 hours, interview within 72, tell me the outcome.
> **Price:** the first caregiver who works this case is free. Results call on [date]; you decide then.
> **Guarantees:** Show-Up Guarantee (replacement profile within 24 hours), 90-Day Stay-or-Replace.
> Egor

## E4 · Profile Cards
Subject: 3 caregivers for your [case]
> Hi {name}, here are [3] screened caregivers for the [case]. Each one told me she wants exactly this kind of shift. Which ones would you like to interview? I'll book it and confirm them.
> [Card 1 · Card 2 · Card 3: first name + last initial, town and commute, shifts, live-in, certificate as she stated it, experience, why she wants this case, my screening note. No phone numbers.]

## E5 · Update every 2 days during an open case (even when nothing is new)
> Hi {name}, quick update on the [case]: [N] applicants, [N] screened, [N] cards sent, next interview [day]. Next update [day].

## E6 · Follow-ups for an interested owner who went quiet
- Day 2: call. Day 7: call + "Hi {name}, still keen to get the [case] covered? I can have profiles to you by [day]."
- Day 14: **"Are you still looking to fill the [case]?"** (one line, nothing else). Then monthly.

## E7 · Monday Bench Bulletin (only owners who said yes to it)
Subject: Bench Bulletin · [date] · [N] caregivers available
> Screened caregivers available this week, no names:
> [town · shift · live-in yes/no · certificate · start date] × N
> Reply with the line number and I'll send the full Profile Card.
> Caregiver Bench · [postal address] · Unsubscribe: reply "stop".` },
{ id: 'script-results', cat: 'scripts', title: 'Call 2 · results call (day 25): the sale', body: `The first caregiver is working, the owner is happy, the next case is coming: **the point of greatest deprivation.** Aim: a paying plan. 15 minutes.

## 1 · Intro + agenda
> Hi {name}, Egor. As promised, 10 minutes on how the trial went and what's next. Sound good?

## 2 · Recap the win (get their words: that's your future testimonial)
> **[Caregiver]** has worked **[N] shifts** on the **[case]** and confirmed every one. How's she doing from your side?
- "Tell me more." Write down their exact sentence.

## 3 · Disco the next gap
> What's the next case you're worried about?
> How many caregivers will you need in the next two months?
> What happens if those sit open the way [first case] did?

## 4 · Anchor, then the menu (A or B)
> For context: recruiters charge 15 to 25% of first-year pay, $4,800 to $8,000 a hire, and a lost caregiver costs you about $2,600.
> Most agencies your size go with **Priority Bench**: 2 caregivers who work every 4 weeks, first pick of every new caregiver in your towns 24 hours before anyone else, and I only take 2 agencies per area. **It is an investment: $2,500 every 4 weeks.** Or you pay **$1,500 per caregiver** as you go, no plan. **Which fits better?**
- **Silence. 8 seconds or more.**
- 6+ hires a month or 2+ locations (only after gate 4): Multi-site, $6,000 every 4 weeks, 6 caregivers, fully staffed in 90 days or no fee until reached.

## 5 · Founding 5 (only while true: first 5 paying agencies)
> You're one of my first five agencies, so if you start now your price is locked for 12 months. In exchange I'd ask for a short written case study and two intros to owners you know. Fair?

## 6 · Close
> Great. I'll send the agreement and the first invoice dated [day 30]. Bank transfer in USD.
- No → Loops and objections (Loop 1, then the 5 closes, AAA between). End with a date: BAMFAM.

## 7 · Referral (every yes, and every happy owner)
> Who else do you know who's as good at this as you and has a case they can't fill?
> Would you be against a quick email intro right now? I'll write it, you just hit send.
- Never pay for a referral (legal lines). A thank-you, not money.` },
{ id: 'script-exit', cat: 'scripts', title: 'Exit call (when they want to stop)', body: `Never argue. Hear, then offer a better path (Hormozi: HEAR, then a rollover).

> Totally understand, and thank you for telling me directly. Before you go, can I ask what didn't work?

1. **Hear:** let them talk. Short "mm, I see". Write their words.
2. **Empathize:** "That would frustrate me too." Be more upset about it than they are.
3. **Own it:** "That's on me."
4. **Resolve with 3 options:**
> I could close it today, no hard feelings. Or we pause for one cycle and I come back with profiles for your next case. Or we switch you to pay per caregiver, and what you paid this cycle counts toward the next one. Which sounds best, or did I miss something?
- Whatever they pick: confirm by email the same day. Log the reason (Pipeline → Lost).` },
{ id: 'script-screen', cat: 'scripts', title: 'Caregiver side: ad, reply, screen, confirm, check in', body: `Supply is the #1 risk. Speed wins: an applicant called the same day is twice as likely to be hired. **Never charge caregivers. Never social security numbers or medical information. Never references or background checks.**

## The job ad (Leila Hormozi: hook → values → the meat → reinforce)
Title: **Caregiver / HHA · steady hours near [town] · weekly pay**
> **Tired of last-minute cancellations and agencies that never call back?** I match caregivers with licensed home care agencies near [town] that are hiring now, for the shifts you actually want.
> **Who this is for:** caregivers who show up, treat clients like family, and want steady hours close to home.
> **What you get:** jobs that fit your shifts (days, nights, weekends, live-in), interviews within a few days, and one person (me) who answers your calls. You're hired by the agency as its own employee. **I never charge you anything.**
> **What we need:** HHA, CNA or companion experience, reliable transport, and to be able to work in the US.
> **Apply in 1 minute:** [link]. I call every applicant within 24 hours.
- Facebook: Employment category. English and Spanish. No words about age, sex, origin, religion, family or health.

## First reply (the moment they apply)
> Hi [name], thanks for applying! I'm Egor from Caregiver Bench. I'd like a quick 10-minute call to understand what shifts you want, so I only send you jobs that fit. Does [time 1] or [time 2] today work? I never charge caregivers anything.

## The screening call (10 minutes, same for everyone)
> Hi [name], it's Egor from Caregiver Bench. You applied for caregiver work near [town]. Got 10 minutes? I'll ask a few questions so I only send you jobs that fit.
1. Town, and how far will you drive?
2. Do you have a car?
3. Certificate: HHA, CNA or none? (as they say it)
4. Years of experience, and what kind of care?
5. Which shifts? Weekends? Overnights?
6. Live-in: yes or no?
7. Hours wanted a week?
8. Pay wanted?
9. Languages?
10. Why are you looking right now?
11. When can you start?
12. Are you legally allowed to work in the US? (yes or no only)
> **Consent:** Is it OK if I share your profile (first name, town, shifts, experience, no phone number) with agencies that are hiring?
> **Next step:** When I have a job that fits, I'll call you first and book the interview. You'll hear from me every week either way.
- Note what you saw: answered on time, kept the call she booked, spoke clearly. Score 1–5. Log in Dial → Caregivers.

## Confirmation calls (this is the product)
- **Evening before the interview:** "Hi [name], quick check for tomorrow at [time] with [agency] in [town]. Still good? Do you have the address? Anything that could stop you?"
- **Morning of:** "Good morning [name], you're on for [time]. Leave by [time]. Call me if anything changes."
- **Night before the first shift:** same as the evening call. No-show → replacement profile to the owner within 24 hours.

## Check-in calls (days 1, 3, 7, 14, 30, 90)
> How's it going with [client situation, no names]? Anything that would make you leave? Anything the office should know?
- After each: a 2-line note to the owner with only what she agreed to share. Problems come up before she quits.` },
{ id: 'script-al', cat: 'scripts', title: 'Assisted living opener (parked)', body: `**Parked.** Assisted living and memory care are the backup segment, tested only if 100 owner conversations produce no paying agency.

Shown in the dialer for tier AL:
> Hi, is this the Executive Director? This is Egor with Caregiver Bench. I recruit caregivers and CNAs for communities in the Tampa Bay area. A lot of communities end up paying agency staff to cover shifts. Is that something you deal with, or are you fully staffed?

## Their words
Residents (not clients), community or building (not agency), shifts, the floor. Decision maker: the Executive Director (sometimes the Director of Nursing or HR).

## If they use temps
> Then every caregiver you hire permanently cuts that bill. How much agency staffing did you pay last month?` },
/* ───────── SOPs ───────── */
{ id: 'sop-dial', cat: 'sops', title: 'Dial block', body: `1. **Open War Room → Dial session.** Nothing else opens first.
2. **First dial inside 2 minutes.**
3. Callbacks due first, then the queue top-down (Tampa Bay sorts to the top).
4. Tap the outcome after every call. That logs the dial and the owner talk.
5. **5-minute break every 50 dials** (water, stand up).
6. Hit the number, or the block ends, whichever comes later. Never stop at 0.
7. End session. Anything you couldn't answer: write it down, ask Claude.

## Cadence per agency (Sales Teams: 7 attempts beat 14)
| Day | Attempts |
| 1 | 2 dials back to back (double-dial) |
| 2 | 2 dials |
| 3 | 1 dial + voicemail + same-day email (E1) |
| 4 | 1 dial, then the Monday Bulletin (if they agreed) and a 30-day recall |

Max 3 calls a number in 24 hours. 8am–8pm their time.

Florida = Moldova − 7 h (the Panhandle, west of the Apalachicola River, is − 8 h). Owners pick up best 8–11am Florida time.

## Calling setup (so they pick up)
- **A real US local number** in the area code you call (Tampa Bay: 813 / 727). Never spoof, never hide the number.
- **Register it** on freecallerregistry.com. Ask the provider for STIR/SHAKEN "A" attestation.
- **Max 100 dials a day per number** for the first 2 weeks, then up to 200.
- **Check the label weekly:** call your own phone from it. "Spam Likely" = stop that number, get a new one.
- **Dial by hand**, one number at a time.` },
{ id: 'sop-practice', cat: 'sops', title: 'Practice and game tape', body: `Hormozi: "Practise until you can't get it wrong." The script only works if the words are automatic, so you can listen.

## Before the first block of v4 (once)
- Read **Call 1** out loud **25 times** (about 1 hour). Boredom means it's working.
- Blackout method: read it, black out one word, read again. Repeat.

## Before every dial block (10 minutes): the daily drill
$100M Sales Teams trains one part of the call each day. Courses → Sales shows today's theme, counts your reads, and opens the section in Script Lab.
| Day | Theme | Drill |
| Mon | Intro | Name, company, reason, small yes, agenda: under 20 seconds |
| Tue | Disco | Current vs desired, "tell me more", "give me an example", get a number |
| Wed | Pitch | Problem → solution → benefit ×3, under 2 minutes |
| Thu | Close | The price line, then 8 seconds of silence, then the loops with AAA |
| Fri | Hot topic | The objection that killed most calls this week, 25 times |
| Sat | Pipeline | Every callback has a date; every "not now" has a recall |
- Read today's section out loud **5 times**, then **3 objections** out loud with Claude (Ask → "spar me on 3 objections").
- The course's bootcamp standard is 25 reads a day for a new rep; this is the time-boxed version. Log reads in Courses → Sales.

## After every owner conversation (1 minute)
Three lines in the agency's notes: **what they said (exact words) · where it stalled · next step.**

## Every evening (in the shutdown, 2 minutes)
Pick the worst call of the day. Rewrite the one line that lost it.

## Every Sunday
- Score: average call review /5 (Call Lab).
- **Script version:** v4.0 from 17 Nov. Change ONE line only after 300+ dials on the current version and a clear pattern. Log it on System → Changelog.
- The number that dropped most this week = the step you train next week.` },
{ id: 'sop-after-yes', cat: 'sops', title: 'After an owner says yes (the trial)', body: `Recruiting starts only after a yes, for that exact case. **The product is the confirmation calls:** a caregiver who shows up.

| When | You do | Script |
| Day 0, same day as the yes | 10-minute case call + E3 in writing within 1 hour. War Room → Pipeline → trial starts | Case call · E3 |
| Day 0 evening | Facebook job ad for that case (EN + ES, Employment category) + free Indeed, Employ Florida, local caregiver groups | Caregiver side → the ad |
| Days 1–3 | Call every applicant the same day. Profile Card for each fit, only with consent | Caregiver side → screening |
| By day 3 | 2–3 Profile Cards to the owner. Update every 2 days, even with nothing new | E4 · E5 |
| Interview | Confirm the evening before and the morning of. No-show → replacement profile within 24 hours | Caregiver side → confirmations |
| First shift | Confirm the night before. War Room → Pipeline → first shift (creates the check-in tasks) | |
| After the first shift (gate 2) | **Proof capture (the likelihood lever):** 5 questions to the owner: what was hiring like before, what worried you about trying us, why did you try anyway, what happened (numbers: days to a start, shows), what is different now. Written, plus a 30-second voice note if they agree. Raw beats polished. This becomes the proof line on every call | Offers · Sales Teams (proof) |
| Days 1, 3, 7, 14, 30, 90 | Check-in calls with the caregiver, 2-line note to the owner | Caregiver side → check-ins |
| Every Friday | 5 lines to the owner: cases open, candidates sent, interviews, starts, next week | |
| Day 25 | **Results call: the sale.** Then the **4 R's**: review (the proof capture), referral ("who else do you know who's struggling to staff a case?", live intro), retention (the plan), resale (the next case) | Call 2 |
| Day 30 | Plan starts (first 4-week invoice) or the per-caregiver invoice goes out | |
| Day 56 (cycle 2) | Halfway check: "what case is next?" → extras, or Multi-site if they hire 6+ a month | |
| Cancel request | Exit call | Exit call |

**Before day 30 of the first trial:** a payment route (dad's company invoices, with the accountant's OK) and a lawyer-checked one-page agreement. No bill goes out before both.` },
{ id: 'sop-bench', cat: 'sops', title: 'Building the bench', body: `1. **Ads:** Facebook job ads in the Employment category, English and Spanish, **Tampa Bay** (Tampa, St. Pete, Clearwater, Brandon), plus the town of every case you take. Free backups: Indeed posts, Employ Florida, local caregiver groups, CNA and HHA schools. Wording: Scripts → Caregiver side → the ad.
2. **Application:** 1-minute form with consent to share the profile.
3. **First reply** the moment they apply (Scripts → Caregiver side).
4. **Screening call** the same day: Scripts → Caregiver side → screening.
5. **Score 1–5 → bench.** Every bench caregiver gets a call every week so the information stays fresh.
6. **Note the source of every applicant.** Each Sunday: the source with the lowest cost per screened caregiver gets more money; the worst one is cut.

**Target: 15 phone-screened caregivers in Tampa Bay by 30 Nov.** Until then, no 48-hour promises: "within 3 days".` },
{ id: 'sop-snapshot', cat: 'sops', title: 'Hiring Snapshot (the lead magnet, 15 min)', body: `A complete solution to a narrow problem that reveals the next one (Hormozi: lead magnet). Only for owners who say "not now" or "send me info". **Never the ask on Call 1.**

## What it is (one page, by email)
1. **Their live job posts** (Indeed, their site): title, pay, shifts.
2. **Local pay range** for the same role (from the Market Intel sheet).
3. **3 fixes** you can see in 15 minutes, e.g. pay hidden, no shift info in the title, no "weekly pay", apply process longer than 2 minutes.
4. **The next problem it reveals:** "Even with a better ad, about 4 in 10 applicants won't show up to the interview. That's the part I do."
5. **One line ask:** "Want me to recruit for your hardest case this week? The first caregiver who works it is free."

## Steps
1. Owner says "send me info" → "Happy to. Which case should I build it around?"
2. Build it the same day (15 minutes max, the template is the email itself).
3. Send. Book the call that walks through it (BAMFAM): "I'll call you Thursday at 10 to walk you through it: 5 minutes."` },
{ id: 'sop-followup', cat: 'sops', title: 'After every owner conversation', body: `1. **Log it** in Dial (outcome + their exact words + next step + date).
2. **E2 within 1 hour** (Scripts → Emails).
3. **Callback or case call in the queue** on the day agreed. Never "I'll call you sometime".
4. **Interested but quiet:** day 2 call, day 7 call + email, day 14 one-line email (E6), then monthly.
5. **Not now:** Bulletin (if they agreed) + a recall date in 30 days.

Cold email to strangers waits for the warmed-up spare domains. Never from caregiverbench.com.` },
{ id: 'sop-referral', cat: 'sops', title: 'Referrals', body: `Referrals should become 20–30% of new agencies (Sales Teams). Ask at three moments. **Never pay for a referral** (legal lines).

| When | Say |
| Every "not now" or no | "Who's the one agency around here you'd guess is having the hardest time staffing right now?" |
| Every yes on the results call | "Who else do you know who's as good at this as you and has a case they can't fill? Would you be against a quick email intro right now? I'll write it, you just hit send." |
| Any thank-you, any good check-in | "Glad it's working. Is there one owner you'd introduce me to?" |

## Then
- Same day: call or email the name. Open with "[Name] suggested I call" only if they agreed to it.
- Write who referred them in the agency's notes.
- Tell the referrer when the intro turned into a conversation. A thank-you, never money.` },
{ id: 'sop-ops', cat: 'sops', title: 'Business setup and money (what must exist)', body: `Revenue is blocked by these, dials are not. Each has an owner, a deadline, a status.

| Item | Why | Status | Deadline |
| **Payment route:** dad's company signs and invoices in USD, with its accountant's OK. Agency gets a W-8BEN-E | You can't take payments in your own name until ~July 2027; Stripe doesn't support Moldova | To do: talk to dad this week | Before day 30 of the first trial |
| **One-page agreement** checked by a Florida healthcare lawyer (~$300–500): we recruit employees; nothing paid for clients or referrals; agency runs Level 2, I-9, E-Verify; the 60-day and 12-month rules | Patient Brokering Act, FCRA | To do: book it | Before the first invoice |
| **Telemarketing exemption** question to the same lawyer | B2B calls are mostly exempt, with conditions | With the lawyer | same |
| **Caller number:** CloudTalk 813, Free Caller Registry, STIR/SHAKEN "A" | Pickup rate doubles conversations | To do | This week |
| **Business email** on caregiverbench.com, plain signature (name, phone, postal address) | Bulletin needs a postal address (CAN-SPAM) | Check | This week |
| **Application form** (1 minute, consent to share profile) live on caregiverbench.com, landing in War Room → Caregivers | Supply | Check it end to end once | This week |
| **Business cash separate** from personal from the first payment | Wealth Roadmap: margin first | — | First payment |
| US LLC + EIN | Card on file, texting registration, cleaner invoicing | Later | After proof (gate 3–4) |

## Monthly costs (keep under ~$300 until gate 3)
CloudTalk number · caregiver ads ($15 a day only while a case or the bench build runs) · domain + email · lawyer once. Every cost is logged in War Room → Money → Business.` },
{ id: 'sop-hire', cat: 'sops', title: 'Hiring a screener (gate 5, not before)', body: `Sales Teams: prove the process yourself first, then hire several at once. **Locked until gate 5 (~$10k MRR).** Written now so it's ready.

## The role
Phone-screens applicants the same day, books interviews, runs confirmation calls and check-ins. Never sells to owners. Never charges caregivers.

## The job ad (Leila Hormozi: hook → values → meat → reinforce)
- **Hook:** "Remote, part-time, US hours: help caregivers find jobs that fit, and make sure they show up."
- **Values:** speed (calls within the hour), honesty (write what they said, not what you think), warmth.
- **Meat:** 10-minute screening calls, Profile Cards, confirmation calls, check-ins. 15–25 hours a week.
- **Reinforce:** pay per screen + a bonus for every caregiver who works 30 days.
- **Required:** a 60-second selfie video. No video, no interview.

## Process
1. Group first call (expectations, hours, pay). 2. Skills call = the first training session: role-play the screening script, interrupt 20 times, watch how fast they apply feedback. 3. Paid trial week.

## Training (bootcamp, 7 days)
Script read out loud 25× a day · role-play 3× a day · shadow 10 of your calls · graduate on day 7 (script, tone, 5 objections). Performance seat: 60 days, numbers known from day 1.

## Pay rule
Paid on outcomes (caregivers who work), with a base small enough to keep cash positive. Talent LTGP:cost ≥ 3:1.` },
{ id: 'sop-shutdown', cat: 'sops', title: 'Shutdown (20:45, 7 minutes)', body: `1. **War Room → Start shutdown:** numbers (dials, owner talks, BAC, money), the 7 standards, debrief.
2. Daily log (2 min): numbers, what happened in one sentence, the worst call and the one line you'd change, tomorrow's first action.
3. **The 3 questions** (Courses → Mindset): did I do the hard thing first? What made 1 July more likely today, and what made it less likely? One thing I do better tomorrow?
4. Magnesium + water.
5. Look at tomorrow: the first action is 05:30 train.
6. Phone charges outside the bedroom. **Bed 21:00.**` },
{ id: 'sop-review', cat: 'sops', title: 'Sunday review (11:00, 30 min)', body: `1. Open **Plan → Review**. The week report is at the top.
2. Dials vs 350, connects, owner conversations, open cases stated, trials started, caregivers who worked, money collected. Caregivers screened (Tampa Bay, /15 by 30 Nov). Open leads left (under 700 = ask Claude for more).
3. The funnel: which stage dropped most? That's next week's ONE fix (Business → The funnel math).
4. Script: version + dials on it. 300+ dials and a clear pattern = change one line (SOPs → Practice).
5. BAC hours and the Saturday test score. Training days. Weight vs the checkpoint. Money made vs spent.
6. **Courses check (5 min):** Rule of 100: days at 100+ this week (Courses → Leads) · weakest funnel step (Courses → Sales) · the constraint (Courses → Scaling): is it still the same?
7. **Money (5 min):** count every account (Money → Count). Then Money → Wealth: margin this week and month, the fund %, the one lever for next week. Unlogged gap above 10% = log harder, not a new budget.
8. Read Mission → Decisions → Still open. Decide one.
9. Write **ONE change** for next week. Claude carries it everywhere (System → One source of truth).

Monthly, first Sunday: compare with the plan backward. Behind 2 months in a row = cut order, not more hours. Read the **net-worth statement** and the **Wealth milestone** (Money → Wealth): one sentence on what moved.` },
{ id: 'sop-morning', cat: 'sops', title: 'Morning', body: `05:20 toilet → scale → weigh in War Room → teeth, water, dressed.
05:30 train (bad day: 10 minutes).
06:00 shower.
06:15 BAC: Anki, 25 minutes. Phone in another room.
06:40 lead prep: owner names for today's calls (until 30 Nov). From 1 Dec: BAC 06:15–07:30 instead.
07:30 breakfast. 07:50 sunlight, 10 minutes. Pack lunch, snack, dinner, 1 L water.` },
/* ───────── BUSINESS ───────── */
{ id: 'offer', cat: 'business', title: 'What we sell', body: `**Local caregivers, phone-screened by a person and confirmed twice, who show up, or you don't pay.**
Buyers: owners and GMs of private-pay home care agencies (Home Health + Homemaker & Companion, W-2 caregivers) in **Tampa Bay**, then Collier and Lee.

## The ladder (one layer at a time: Money Models)
| Step | Name | Price | What they get | Role |
| Free | **Bench Bulletin + Hiring Snapshot** | $0 | Monday email of screened caregivers by town and shift; how their job ads compare with local pay | Lead magnet, for "not now" only |
| Front door | **First Hire Free** (30 days, one open case) | $0 | 2–3 screened profiles within 3 days (48 hours once the bench has 15); the first caregiver who works the case costs nothing | Attraction offer (free, with terms) |
| Core | **Priority Bench** | **$2,500 every 4 weeks** | 2 caregivers who work each cycle (unused carry over 1 cycle); extras $1,000; first pick in their towns 24 hours before anyone; max 2 members per town area | Continuity, sold at the first win |
| Pay as you go | **Pay When They Work** | **$1,500** per caregiver who works a first shift · **$2,000** hard case | No contract, no monthly fee | Downsell (menu option B) |
| Premium (gate 4) | **Multi-site: Fully Staffed in 90 Days** | $6,000 every 4 weeks | 6 caregivers who work each cycle; extras $900; first pick in all their towns; fully staffed in 90 days or no fee until reached | Upsell for 6+ hires a month or 2+ locations |

## Trial terms
The agency agrees in writing to: a 10-minute case call, replies to profiles within 24 hours, interviews within 72 hours, telling you the outcome. Two misses end the trial. Once a payment route exists: card on file and a $250 fee per interview the agency itself skips.

## Two guarantees on every caregiver (name them on every pitch)
- **Show-Up Guarantee:** she misses the interview or first shift → a replacement profile within 24 hours, and she never counts against the plan.
- **90-Day Stay-or-Replace:** she leaves within 90 days → free replacement; if you can't replace within 21 days, that cycle's share is credited.
Check-ins on days 1, 3, 7, 14, 30, 90 are how you deliver them.

## Pricing rules
- **Free or full price, never a discount.** If they push, change the plan, never the number.
- **Founding 5:** the first five paying agencies lock their price for 12 months for a written case study + two owner intros. A trade, not a discount.
- Bill every 4 weeks (13 bills a year), quoted as "every 4 weeks".
- Anchor out loud: recruiters charge 15–25% of first-year pay ($4,800–8,000 a hire); one lost caregiver costs about $2,600.

## Fair play
One agency at a time per caregiver (she chooses). No fee if she applied to them directly in the 60 days before. Hiring someone we introduced within 12 months = the fee is owed.

## Hard cases
24/7, live-in, overnight, weekends-only, bilingual required, far-out areas.` },
{ id: 'marketing', cat: 'business', title: 'Marketing: the Core Four for both sides', body: `Two markets, two engines. **Owners buy; caregivers are the product.** Hormozi's Core Four: warm outreach, content, cold outreach, paid ads.

## Owners (buyers)
| Channel | Now | Rule |
| **Cold calls** | **ON** · 350 a week | Rule of 100. The only channel until gate 4 |
| Warm outreach | none exists yet | Every owner you've spoken to is warm: Bulletin + 30-day recall |
| Lead magnet | **Hiring Snapshot** + **Monday Bench Bulletin** | Only for "not now". Never the ask (SOPs → Hiring Snapshot) |
| Referrals | ON from the first happy owner | Ask after every win (SOPs → Referrals). Target: 20–30% of new agencies |
| Cold email | OFF until gate 4 | Spare domains, warmed 3–4 weeks, never caregiverbench.com |
| Content / paid ads to owners | OFF until gate 6 | Not where the money is at this stage |

## Caregivers (supply)
| Channel | Cost | When |
| Facebook job ad from the Caregiver Bench page (EN + ES, Employment category) | $15 a day per open case → $20 once under $6 per applicant | From today for the bench (Tampa Bay), plus one ad per case taken |
| Indeed free post, Employ Florida, local caregiver Facebook groups | $0 | Every week, refreshed every Sunday |
| CNA / HHA schools in Tampa Bay (career offices) | $0 | From 1 Dec: one email + one call to each school |
| Caregiver referrals ("know someone like you?") | a thank-you | Only after the lawyer says yes |

## The message (one sentence each, used everywhere)
- **Owners:** "Local caregivers, phone-screened by a person and confirmed twice, who show up, or you don't pay."
- **Caregivers:** "Steady hours close to home with agencies that actually call back. I never charge you."

## Numbers to track every Sunday
Owner side: dials, connects, owner conversations, open cases, trials. Caregiver side: ad spend, applicants, cost per applicant, % called within 24 h, screened, cost per screened caregiver, caregivers who worked.` },
{ id: 'scale', cat: 'business', title: 'Scaling: the 6 gates', body: `Hormozi's Scaling Roadmap: **study only your stage, one before and one after.** You are at **Improvise → Monetize** (0 → first sale). Each layer of the business switches on only when its gate is passed: complexity grows with proof, not with plans.

| Gate | Passed when | What switches ON | What stays OFF | Target |
| **1 · Proof of conversation** | 20 owner conversations | One change to the script allowed (after 300 dials on it) | New offers, new markets, app features | ~1 Dec |
| **2 · A caregiver works** | First trial caregiver works a shift | Case study draft, the "proof line" opens every call | Paid owner ads, cold email | mid-Dec |
| **3 · First payment** | First invoice cleared (needs payment route + lawyer-checked agreement) | Founding 5 pricing, referral ask on every win, card on file once possible | Hiring | ~20 Jan |
| **4 · 3 paying agencies** | 3 agencies paying | **Collier and Lee** (second metro), **Multi-site** offer (reprice if real cost per working caregiver > $250), cold email from spare domains, CNA-school partnerships | A second product | 31 Mar |
| **5 · ~$10k MRR** | ~4 Priority Bench | **Screener #1** (SOPs → Hiring a screener), the 6-month term with a waived setup fee | Your own agency (roll-up) | 30 Apr |
| **6 · $20k MRR** | 7–8 paying agencies, bench of 100+ | Second screener, a setter for owner calls, the roll-up plan (buy or start a licensed agency) | — | 1 Jul 2027 |

## The constraint at each stage (fix only this)
- **Now:** dials. 3 dials logged from 9 to 17 Nov. Nothing else matters until the 350 a week happen.
- **Gate 1–2:** supply. A yes you can't staff in 3 days is lost: the bench and same-day applicant calls.
- **Gate 3–4:** conversion at day 25 (Call 2) and getting paid.
- **Gate 5–6:** your hours. Templates, then people. Track "hours per caregiver placed" falling every month.

## Rule
Being ahead in a function means it's not the constraint. Building ahead of the gate is hiding from the constraint.` },
{ id: 'funnel', cat: 'business', title: 'The funnel math and the scoreboard', body: `**Plan estimates. Your real rates replace them after 300 dials (Stats → Intel).** Each stage counted separately; each has one usual fix.

| Stage | Per 350-dial week | If it's low, the fix |
| Dials | 350 | Schedule, not skill: protect the block, first dial within 2 minutes |
| Connects (a person answers) | ~30% → ~105 | List or time: 8–11am Florida, double-dial, a clean local number |
| Owner conversations (3+ min with the decision maker) | ~9 | The first 20 seconds: intro + hook |
| Open cases stated | ~3 | Disco too shallow: ask for the case, the time open, the cost |
| Trials started (case call done) | ~1 | The ask: no-oriented, then 8 seconds of silence |
| Caregivers who worked | count | Supply: same-day applicant calls, confirmation calls |
| Paying agencies | count | Call 2: anchor, menu, silence |
| Hours per caregiver placed | down each month | Templates, then screener #1 at gate 5 |

Emails, positive chats and "send me info" never count as owner conversations.

## Unit economics (assumes ~$300 of ads per caregiver who works)
| Offer | Price | Cost if fully used | Gross margin |
| Pay When They Work | $1,500 | $300 | 80% |
| Hard case | $2,000 | $300 | 85% |
| Priority Bench | $2,500 / 4 weeks | $600 | 76% full use, 88% at 1 caregiver |
| Multi-site | $6,000 / 4 weeks | $1,800 | 70%: reprice at gate 4 if real cost is above $250 |

Cost to win an agency: ~$600 of ads (the free caregiver plus misses) + dial time. The first Priority Bench bill ($2,500) lands at day 30, so 30-day gross profit is ~3× the cash cost to win: each customer pays for the next.

## What $20k means
8 Priority Bench ≈ $21,700 a month, or 6 Priority Bench + 1 Multi-site ≈ $22,750. **7–8 paying agencies**, about 16 caregivers starting every 4 weeks: a real delivery operation with a screener by spring.` },
{ id: 'pricewhy', cat: 'business', title: 'Why the price makes sense', body: `Say it with numbers (and only true ones):
- One lost caregiver costs an agency **about $2,600** to replace.
- Recruiters charge **15–25% of first-year pay: $4,800–8,000 a hire.**
- Indeed is about **$561 per hire**, and they still do all the calling and chasing.
- **One 24/7 case ≈ 168 hours a week ≈ $5,400 a week of billing** at ~$32 an hour. $1,500 to staff it pays back in days.
- One caregiver at 25 hours a week brings the agency about **$350 a week** of margin.
- **Priority Bench:** 2 caregivers at $1,500 = $3,000. The plan is $2,500 every 4 weeks, plus first pick and the 2-per-area limit.
- Competitor monthly services charge $1,300–3,400 a month whether anyone works or not, often with a 6-month minimum. None publishes a show-up guarantee.` },
{ id: 'industry', cat: 'business', title: 'The industry in 5 minutes', body: `## Who you call
| Type | What they do | Fit |
| Home Health Agency (licensed) | Hands-on care, W-2 HHAs/CNAs | **Main buyer** |
| Homemaker & Companion (registered) | Company, meals, housework, no hands-on care | Good buyer |
| Nurse Registry | 1099 contractors | **Not for now** |
| Assisted living / memory care | One building, fixed shifts | Backup segment (parked) |

Florida (state list, 13 Nov): 2,716 home health agencies, 2,768 homemaker & companion, 1,257 nurse registries (parked). Ask early: "Are your caregivers W-2 employees?"

## The words they use
Client (never ask about them) · case · open case · start of care · hourly visit (3–4 hour minimum) · 24/7 case (168 hours a week, 4–5 caregivers) · live-in (days in a row, paid per day) · overnight (awake or asleep) · respite · scheduler / staffing coordinator · referral sources (hospital discharge planners: if an agency can't staff cases, they stop sending families; the owner's deepest fear).

## The numbers you'll quote
| Fact | Number |
| Caregiver turnover a year | **75.5%** |
| Turnover at $15–17.99 vs $18+ | 84% vs 53% |
| Turnover in the first 90 days | 57% |
| Applicants who get hired | 12.8% (about 8 per hire) |
| Interview no-shows | **40%** |
| Interviewed within 4 days | 2× as likely to be hired |
| Cost to replace one caregiver | **~$2,600** |
| Indeed cost per hire | ~$561 |
| Agencies that turned down cases for lack of caregivers | 85%+ |
| Florida minimum wage | $15 since 30 Sep 2026 |
| Families pay | ~$30–42/h · agency gross margin ~40% |
| One 24/7 case | ~168 h a week, 4–5 caregivers, ~$5,400 a week of billing |

## Who picks up
Owner (revenue, not turning down cases) · Administrator · **Scheduler** (tonight's shifts, your ally) · Recruiter/HR · Receptionist (gatekeeper). Franchises (Home Instead, BrightStar, Comfort Keepers, Visiting Angels, Griswold): each location's franchisee picks its own vendors.` },
{ id: 'aboutme', cat: 'business', title: 'Questions about me', body: `| They ask | I say |
| "Who are you?" | "I'm Egor. I run Caregiver Bench: I recruit and phone-screen caregivers for private-pay home care agencies in Florida." |
| "Where are you based?" | "In Europe, in Moldova. I work Florida hours. The caregivers are local to you; only the recruiting and screening is remote. You always get me directly." |
| "How long have you done this?" | "Honestly, I'm new. You'd be one of my first agencies. That's exactly why the first caregiver is free: you don't have to trust me, just look at who shows up." |
| "How many agencies do you work with?" | The real number. Never inflate it. |
| "Do you have insurance?" | "The caregivers are your employees, covered by your insurance and your screening, the same as anyone you hire from Indeed." |
| "Where do I pay?" | "Nothing during the trial. After, one invoice every 4 weeks, bank transfer in USD." |
| "References?" | "Not yet. After 30 days I'd love you to be my reference, if I earn it." |
| "Can we meet?" | "On a video call, any time. In person, not before mid-2027." |
| "Is this AI?" | "No, it's me, Egor. I make my own calls." |
| "How did you get my number?" | "From your public listing." |
| "Who does the background check?" | "You do, the same as for any applicant: Level 2, I-9, E-Verify. I pass on only what the caregiver tells me and what I observe." |` },
/* ───────── BODY & BAC ───────── */
{ id: 'food', cat: 'body', title: 'Meal plan (~3,400 kcal · 170 g protein)', body: `| Meal | When | What | kcal / protein |
| Breakfast | 07:30 | 3 eggs · 100 g oats in 300 ml milk · banana + 15 g honey | 940 / 43 g |
| Lunch box | 12:55 | 200 g chicken or lean beef · 150 g rice (dry) · 200 g veg + 15 ml olive oil · 50 g sauerkraut | 965 / 60 g |
| Snack | 16:00 | 200 g Greek yogurt or kefir · 200 g fruit + 20 g honey | 400 / 34 g |
| Dinner (packed) | 18:30 | 200 g salmon or beef · 400 g sweet potato · mushrooms, carrots, 10 g butter · 50 g fermented veg | 915 / 50 g |
| Kefir | after tennis | 300 ml | 200 / 10 g |

**Supplements:** vitamin D3 2,000 IU (Oct–Apr) · creatine 5 g · fish oil on days without fish · magnesium glycinate 200–300 mg at 20:45.

On lesson days pack dinner and eat it between blocks. Never skip it.` },
{ id: 'training', cat: 'body', title: 'Training', body: `**Home, 05:30:** Tue/Thu/Sat calisthenics · Mon/Wed/Fri light mobility + neck. The Train tab has the full programs and logs every set.

## Team OFP 15:30–16:30, then TT
| Day | Session |
| Mon · real gym · strength | Trap-bar deadlift or squat 3×5 · Bulgarian split squat 3×6/leg · weighted pull-ups 4×5 · DB overhead press 3×6 · farmer carries 3×30 m · neck 2×15 |
| Wed · club room · speed | Sprints 6×10–20 m · side bounds + broad jumps 3×5 · KB swings 3×10 · rotational throws 3×6 · back extensions 2×12 |
| Fri · real gym · power + upper | Box jumps 4×3 · front squat 3×5 fast · cable woodchops 3×8/side · heavy rows 4×6–8 · incline DB press 3×8 · shrugs 3×10 + face pulls 2×15 |

## Rules
- Legs stay low-volume and never to failure: TT is right after.
- Add a little weight or one rep every week.
- Fast reps: power over size. Both sides evenly.
- First sign of getting sick: sleep more, mobility only, no hard sessions.` },
{ id: 'bac', cat: 'body', title: 'BAC deadlines', body: `**Strategy:** English and IT by certificates, then everything on Romanian and History. Target: pass, average not lower than 7.

| Date | What |
| **Sun 15 Nov** | **Python exam booked** (UTM Certiport) |
| Sat 12 Dec | Cambridge paper exam |
| 14–18 Dec | **Python exam** (700/1000) |
| Sun 10 Jan | Databases booked |
| 25–29 Jan | Databases exam |
| Fri 5 Feb | Networking booked |
| 22–26 Feb | Networking exam |
| Sun 28 Feb | Gate: under 2 of 3 IT certificates = Geography |
| Fri 26 Mar | All certificates in hand |
| Thu 1 Apr | Target: both dossiers handed in |
| **Sat 10 Apr** | **HARD: English dossier** (certificate, request, 2 ID copies, 3 certificate copies) |
| **Thu 15 Apr** | **HARD: IT dossier** |
| June | BAC exams |

English needs B2 First or C1 with **Reading 160+ AND Writing 160+**. IT needs 3 Certiport certificates at 700/1000.` },
];

/* ───────── store ───────── */
function pbAll() {
  const own = S.playbook || {}, out = [];
  PB_SEED.forEach((p, i) => { const o = own[p.id]; if (o && o._del) return; out.push(Object.assign({ order: i, seed: true }, p, o && o.edited ? { title: o.title, body: o.body, edited: true, _u: o._u } : {})); });
  Object.values(own).forEach((o) => { if (!o || o._del || PB_SEED.some((p) => p.id === o.id)) return; out.push(Object.assign({ order: 1000 + (o.created || 0) / 1e13 }, o)); });
  return out;
}
function pb(id) { return pbAll().find((p) => p.id === id); }
function pbSave(id, title, body, cat) {
  S.playbook = S.playbook || {}; const seed = PB_SEED.find((p) => p.id === id), old = S.playbook[id] || {};
  S.playbook[id] = Object.assign({}, old, { id, _u: now(), title, body, cat: cat || old.cat || (seed && seed.cat) || 'mine', edited: true, created: old.created || now() });
  save();
}
function pbReset(id) { if (!S.playbook || !S.playbook[id]) return; S.playbook[id] = { id, _u: now(), reset: true }; save(); }
function pbDelete(id) { S.playbook = S.playbook || {}; S.playbook[id] = { id, _u: now(), _del: true }; save(); }

/* ───────── renderer: a small, safe subset of markdown ───────── */
function pbInline(s, tok) {
  let h = esc(s);
  if (tok) h = h.replace(/\{(\w+)\}/g, (m, k) => (tok[k] != null ? `<b class="tok">${esc(tok[k])}</b>` : m));
  return h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function pbRender(md, tok) {
  const L = String(md || '').split('\n'); let out = '', list = null, table = null;
  const flush = () => { if (list) { out += `<${list.t}>${list.items.map((x) => `<li>${x}</li>`).join('')}</${list.t}>`; list = null; } if (table) { out += `<div class="pbt"><table>${table.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</table></div>`; table = null; } };
  L.forEach((raw) => { const l = raw.trimEnd(); let m;
    if (/^\|/.test(l)) { if (list) { const t = table; table = null; flush(); table = t; } table = table || []; table.push(l.replace(/^\||\|$/g, '').split('|').map((c) => pbInline(c.trim(), tok))); return; }
    if ((m = l.match(/^(-|\d+\.)\s+(.*)/))) { if (table) { const k = list; list = null; flush(); list = k; } const t = m[1] === '-' ? 'ul' : 'ol'; if (!list || list.t !== t) { flush(); list = { t, items: [] }; } list.items.push(pbInline(m[2], tok)); return; }
    flush();
    if (!l.trim()) return;
    if ((m = l.match(/^# (.*)/))) out += `<div class="pbh">${pbInline(m[1], tok)}</div>`;
    else if ((m = l.match(/^## (.*)/))) out += `<div class="lab pbl">${pbInline(m[1], tok)}</div>`;
    else if ((m = l.match(/^> ?(.*)/))) out += `<div class="say">${pbInline(m[1], tok)}</div>`;
    else out += `<p>${pbInline(l, tok)}</p>`;
  });
  flush(); return `<div class="pb">${out}</div>`;
}

/* ───────── view ───────── */
let pbOpen = '', pbQuery = '';
function pbSnippet(p, q) { const b = p.body.replace(/[#>*|]/g, ' ').replace(/\s+/g, ' '); const i = b.toLowerCase().indexOf(q); return i < 0 ? '' : '…' + esc(b.slice(Math.max(0, i - 40), i + 80)) + '…'; }
function renderBook() {
  const all = pbAll(), el = $('view-book');
  if (pbOpen) { const p = all.find((x) => x.id === pbOpen); if (!p) { pbOpen = ''; return renderBook(); }
    const used = { 'script-owner': 'The dialer shows this on every owner call.', 'script-al': 'The dialer shows this for assisted living.', objections: 'The dialer shows these under the script.' }[p.id];
    el.innerHTML = `<div class="row" style="gap:8px;margin-bottom:12px"><button class="btn sm ghost" onclick="pbOpen='';render()">‹ Playbook</button><span class="grow"></span><button class="btn sm" onclick="askAbout('${p.id}')">${ic('bolt', 16)} Ask about this</button><button class="btn sm" onclick="pbEdit('${p.id}')">${ic('pen', 16)} Edit</button></div>
      <div class="card pbpage"><div class="lab" style="color:var(--acc)">${esc((PB_CATS.find((c) => c[0] === p.cat) || ['', 'Notes'])[1])}${p.edited ? ' · edited by you' : ''}</div><h2 class="pbtitle">${esc(p.title)}</h2>${used ? `<div class="hint" style="margin-bottom:12px">${used} Edit it here and the next call shows the new version.</div>` : ''}${pbRender(p.body, p.cat === 'scripts' ? { name: '[name]', hook: '[hook]', town: '[town]' } : null)}</div>`;
    return; }
  const q = pbQuery.trim().toLowerCase(), hits = q ? all.filter((p) => (p.title + ' ' + p.body).toLowerCase().includes(q)) : null;
  const card = (p) => `<button class="pbi" onclick="pbOpen='${p.id}';render();window.scrollTo(0,0)"><div class="t">${esc(p.title)}${p.edited ? ' <span class="dim">·  edited</span>' : ''}</div>${q ? `<div class="s">${pbSnippet(p, q)}</div>` : ''}</button>`;
  el.innerHTML = `<div class="pbsearch">${ic('target', 18)}<input placeholder="Search the playbook: price, voicemail, Python, dinner…" value="${esc(pbQuery)}" oninput="pbQuery=this.value;renderBook();var i=document.querySelector('.pbsearch input');i.focus();i.setSelectionRange(i.value.length,i.value.length)"></div>
    ${q ? `<div class="card">${hits.length ? hits.map(card).join('') : `<div class="empty">Nothing found for “${esc(pbQuery)}”. <a href="#" onclick="askQuick(${JSON.stringify('Where in my plan is: ' + pbQuery).replace(/"/g, '&quot;')});return false">Ask instead</a></div>`}</div>`
    : `<div class="pbgrid">${PB_CATS.map(([c, l, icn]) => { const ps = all.filter((p) => p.cat === c).sort((a, b) => a.order - b.order); if (!ps.length && c !== 'mine') return ''; return `<div class="card pbcat"><div class="card-h"><div class="card-t">${ic(icn, 16)} ${l}</div><div class="card-r">${ps.length}</div></div>${ps.map(card).join('')}${c === 'mine' ? `<button class="pbi add" onclick="pbNew()">+ New page</button>` : ''}</div>`; }).join('')}</div>
    <div class="xs muted" style="text-align:center;margin:6px 0 14px">Your edits sync to every linked device. This Playbook is the only live plan. Drive mirror + archive: <a href="https://drive.google.com/drive/folders/1UEuHwqQHNtufTQNpnGBBBkHFrWhYXOSN" target="_blank" rel="noopener">01 Caregiver Bench · 0 START HERE</a></div>`}`;
}
function pbEdit(id) {
  const p = pb(id) || { id, title: '', body: '', cat: 'mine' };
  openModal(`<h2>Edit page</h2><div class="field"><label>Title</label><input id="pe-t" value="${esc(p.title)}"></div>
    <div class="field"><label>Text</label><textarea id="pe-b" style="min-height:52vh;font-family:var(--mono);font-size:13.5px;line-height:1.5">${esc(p.body)}</textarea></div>
    <div class="xs muted" style="margin-bottom:6px"># heading · ## label · &gt; a line to say out loud · - list · | table | row | · **bold**${p.cat === 'scripts' ? ' · {name} {hook} {town} fill in on calls' : ''}</div>
    <div class="actions">${p.seed && p.edited ? `<button class="btn" onclick="if(confirm('Go back to the original text?')){pbReset('${id}');closeModal();render()}">Original</button>` : ''}${!p.seed && pb(id) ? `<button class="btn danger" onclick="if(confirm('Delete this page?')){pbDelete('${id}');pbOpen='';closeModal();render()}">Delete</button>` : ''}<button class="btn primary" onclick="pbSave('${id}',document.getElementById('pe-t').value.trim()||'Untitled',document.getElementById('pe-b').value,'${p.cat}');closeModal();pbOpen='${id}';render();toast('Saved · syncs to your devices')">Save</button></div>`, true);
}
function pbNew() { const id = 'n' + uid(); pbEdit(id); }
