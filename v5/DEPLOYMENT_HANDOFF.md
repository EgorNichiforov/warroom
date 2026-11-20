# War Room 13.46.0 · deployment handoff (20 Nov 2026, 08:30 Chisinau)

Status: **deployed, not fully verified.** Nothing below was changed in any scheduled task. The only changes made during this handoff: the server research timer was switched off (reversible, one tap in Server).

## 1. What the server is actually doing

| Thing | State now | What happened today |
|---|---|---|
| Timer (`warroom-tick`, every 10 min) | **Running** | First run 07:40; every run since succeeded; every wake-up of the worker answered 200 |
| Nightly backup, 03:00 | **On** | Ran once at 07:37 (catch-up, because 03:00 had passed). 3 rows copied; checksums match; a restore into a scratch row matched (rolled back) |
| Weekly check, Mondays 05:50 | **On** | Has never fired by timer. Ran once at 07:37 because I queued it by hand. Left the note "10 open goals have no next action" |
| Morning brief, 06:10 | **OFF** | I set it at 07:36. It fired once at 07:40 (catch-up) with the dial-count bug; that note is removed. I re-ran it by hand at 07:43 (the note in the inbox). At about 08:00, after finding two Claude morning briefs, I switched the timer off |
| Research, 05:40 | **OFF** (switched off in this handoff) | Fired once at 07:37, failed: the AI key has no web-search quota |
| Role answer | On demand only | Ran once at 07:40 by hand; note removed (it repeated the wrong dial count) |
| Device keys | 0 enrolled | |
| Lock | Off; never used on the live room | |

## 2. Scheduled tasks with outdated text

Authority used: the Playbook in `v5/playbook.js` (no page is edited in the cloud, so the file is what the app shows) and the goals in the synced data.

**Correction to my earlier report:** "Close the day" is NOT outdated (its bench target of 15 by 30 Nov is still the Playbook's). The third task is the **Nightly review**. The feature freeze and "15 screened caregivers by 30 Nov" are also still the Playbook's own words, so they are not listed as outdated.

| Task | Exact text now | What the Playbook / goals say | Proposed replacement |
|---|---|---|---|
| Weekly review (Sun 10:40) | "On the phone I sell one Founding Offer: $500 per caregiver, paid after 5 worked shifts, first 5 agencies." | "Founding Offer $500 · **Retired.** First 5 paying agencies lock their price for 12 months in exchange for a case study + 2 owner intros"; "First Hire Free → Priority Bench **$2,500 every 4 weeks** (2 caregivers who work) · Pay When They Work **$1,500** ($2,000 hard case)" | "On the phone I sell one ladder (Model v3): First Hire Free (the first caregiver who works a case is free), then Priority Bench $2,500 every 4 weeks (2 caregivers who work) or Pay When They Work $1,500 per caregiver ($2,000 hard case). The $500 Founding Offer is retired; the first 5 paying agencies lock their price for 12 months for a case study + 2 intros." |
| Weekly review | "BAC only has to be passed (8+)." | Goal: "BAC: pass, average not lower than 7"; Playbook: "Pass, with an average not lower than 7 (your floor, set 19 Nov)" | "BAC: pass, with an average not lower than 7." |
| Weekly review | "…Founding Offer cases taken, caregivers who worked…" | No Founding Offer exists | "…First Hire Free trials started, caregivers who worked…" |
| Morning brief (06:00) | "On the phone I sell one Founding Offer: $500 per caregiver, paid after 5 worked shifts." | as above | same ladder sentence as above |
| Morning brief (06:00) | "BAC only has to be passed (8+)." | as above | "BAC: pass, with an average not lower than 7." |
| Nightly review (00:00) | "BAC exam June 2027 (pass, 8+)" | as above | "BAC exam June 2027 (pass, average not lower than 7)" |
| Monday Bench Bulletin draft | "Price line: interviews free; pay only if a caregiver works a first shift: $750, $1,200 for hard cases; 30-Day Bench Trial for monthly plans." | The Playbook's own Bulletin template (Emails → E7) has **no price line**. Current prices are $1,500 / $2,000 hard case; the front door is First Hire Free | **Your decision, two options.** A (matches the Playbook template): delete the price line. B: "The first caregiver who works a case for you is free. After that: $1,500 per caregiver who works ($2,000 hard case), or Priority Bench $2,500 every 4 weeks." |
| Monday Bench Bulletin draft | subject example "Screened caregivers in Collier & Lee this week (3 available)" | "Tampa Bay first… Collier and Lee are the second wave"; E7 subject: "Bench Bulletin · [date] · [N] caregivers available" | "Bench Bulletin · [date] · [N] caregivers available" |
| Monday Bench Bulletin draft | "RULES (docs/templates/bench_bulletin.md in repo EgorNichiforov/egorflow)" | The Playbook says it is the one source of truth | "RULES: War Room Playbook → Emails → E7 · Monday Bench Bulletin" (only if you confirm the old repo template is retired) |

Not established, so not proposed: whether the bulletin phone number should change (Playbook: 561-556-0536, "swap in the 813 number once it's live"; your task list today has "CloudTalk 813 number by 14:45").

Safety: prompt edits were refused twice by the scheduler's permission system on 19 Nov. With your go-ahead I try again, one task at a time, re-reading each task after the edit. If it refuses again, the edits are made by you in each task's settings and I give you the full text to paste.

## 3. The two morning briefs (both ran today)

| | 05:03 "Morning brief · numbers + one move" | 06:00 "Morning brief" |
|---|---|---|
| Today's note | yesterday nothing logged; week 0/350; floor so far 60; callbacks due 0; ready caregivers 0; open leads 5,597; target 50; one concrete MOVE | yesterday 0/100 MISSED; week 0/350; habits 1/7; bench 0/15; dial block 19:30–20:40; two p1 tasks; money 7,250 of 20,000 MDL; link to a published page |
| Only here | callbacks due, open leads, floor, the MOVE line; Sunday: market, competitors, gaps | today's dial block time, p1 tasks, 7-day deadlines, money, habits and sleep, failed tasks overnight |
| In both | yesterday's dials, week total, bench | same |
| Prompt | current offer; written 18 Nov under your rule "the brief must take 30 seconds and send me to the dial block" | carries the retired $500 offer and BAC 8+ |
| Cost | about 1 minute | about 2.5 minutes, publishes a page every day |

They also word yesterday differently ("nothing logged" against "0/100 MISSED"), which is two voices for one fact.

**Recommendation: keep 05:03, pause 06:00** (pause, not delete). What 06:00 has alone is covered elsewhere: the first dial block and lessons are in the 04:41 System check note and on the Day screen; money and habits are in Close the day at 20:40. The one real loss is "failed tasks overnight"; add one line for it to the System check when prompts can be edited. The server brief timer stays off.

## 4. Research

- Cause: on the free tier of the Gemini API, grounding with Google Search is listed as "Not available" for current models. On the paid tier it is 5,000 free search requests a month, then $14 per 1,000.
- The server research timer is now off. No job will retry.
- **A working route already exists at no cost:** the daily Claude content scan (07:37) answers open learning requests first (up to 5 a run). It ran today and the app added 6 items.
- Options if you want research on the server as well (about 60 searches a month at 2 a day):

| Option | Cost at this volume | Work needed | Needs from you |
|---|---|---|---|
| Stay with the Claude scan only | 0 | none | nothing |
| Turn on billing for the Gemini key | search inside the 5,000 free; tokens a few cents | none: the worker already supports it | a card on the Google AI account |
| Tavily search API | 0: 1,000 free credits a month, no card | about 30 lines in the worker, one more key stored on the server | a free Tavily account and key |
| Brave Search API | about $5 per 1,000 requests; reports differ on a free allowance | same as Tavily | account and card |
| Claude API web search | $10 per 1,000 searches plus tokens | worker change | an Anthropic API key with billing |

Recommendation: the first row. Revisit only if the Claude scan proves too slow for you.

## 5. Device keys

Server: **0 devices enrolled.** The app's own device list shows three: Android (phone), last seen today 07:47 on 13.45.0; Windows (laptop), last seen 19 Nov 22:36 on 13.40.0; a second Android (phone) entry on 13.13.2, last seen 17 Nov (probably an old install or the browser beside the installed app; you confirm).

Enrolment, on each device you use:
1. Open War Room and check Settings shows 13.46.0. If not, close it fully and open it twice.
2. Day screen → Where do I…? → type "server" → open it.
3. Under Devices, name the device (Phone, Laptop) and tap "Give this device its own key".
4. Check: the list shows the name with "(this one)".
5. Change anything small (tick a habit), let it sync, and check the other device receives it.
6. Repeat on the laptop. A key belongs to one browser: the installed app and a Chrome tab on the same phone are two.
7. Tell me. I then confirm on the server that each device was seen and wrote with its own key.

The lock stays off until step 7 is done for every device you name.

## 6. Vault

- You type a passphrase on one device. The browser turns it into a key (PBKDF2-SHA-256, 310,000 rounds) and encrypts eleven private stores (journal, transactions, accounts, money plan, reality checks, decisions, risks, wealth records, boards, protocols) with AES-256-GCM before they sync.
- The passphrase is never stored or sent. The key stays in that browser's storage. The server holds a salt, a check value and the sealed block.
- **Not recoverable.** Nobody can reset it: not me, not Supabase.
- If you forget it while a device is still open: that device can set a new one (Vault → Change passphrase). Nothing is lost.
- If you forget it and no device is open (new phone, cleared browser data): the sealed copy on the server is unreadable for good. Whatever is still on a device stays readable there. The rest of War Room (days, tasks, goals, calls, learning) is not affected.
- Not sealed: everything outside those eleven stores; an unlocked device; an exported file; copies made before switch-on (cloud snapshots up to 7 days, server backups up to 14 days).
- Never send the passphrase to me or anyone. Activation is yours: Where do I…? → "vault".

## 7. What is verified and what is not

| Area | Tested how | Result | Not tested |
|---|---|---|---|
| Worker authentication | live: wrong secret | refused (401) | |
| Browser access to private tables and worker functions | live, rolled back | refused | |
| Sync code still works | live, rolled back; plus one real app write after switch-on | reads and writes | |
| Device-key isolation | live, rolled back, with a scratch second room | a device reads and writes only its own room; another room's key or device gets nothing; an altered key gets nothing | a real enrolled device in a real browser |
| Lock | live, rolled back | code alone reads nothing; device still does; other room unaffected | on real devices; the unlock tap |
| Backup | live | checksums match; restore to a scratch row matches | the 03:00 run itself (first one is tonight); a restore back into the app |
| Sync with server notes | observed once | the phone's sync at 07:47 kept the server's notes and my removals | two devices at once; the laptop (still on 13.40.0) |
| AI limit | live by accident (the first brief was blocked when the limit was reached); local tests | blocks | reaching 6 real successful calls |
| Jobs | live: check, backup, brief, role; research fails | 4 of 5 kinds work | the Monday timer; a retry after a real failure |
| Data consistency | live | 13 goals; vault off; the day counter (2 dials on 14 Nov) and the call log (0 entries) disagree and the app's scorecard reads only the log | |
| Vault | browser tests, two devices, stand-in table | passes | the live project; a real phone |
| 13.46.0 screens | browser tests | pass | a real phone; AI questions with a real model |

Phone tests for you (about 10 minutes):
1. Settings shows 13.46.0.
2. Inbox → "🧭 Morning brief · 20 Nov": you see "Suggested, not done" with Approve and Dismiss and no line of code. Tap Dismiss.
3. Where do I…? → "server": the screen opens, fits, shows "AI key on the server: yes" and "Nightly backups kept: 1".
4. Tap Weekly check under "Run one now". Within a minute a job appears in the list; after a sync a "Server check" note arrives.
5. Tick a habit on the phone; it shows on the laptop. Then the other way.
6. Airplane mode: the app still opens and you can tick something; back online it syncs.
7. Press the phone's back button inside a sheet: it closes the sheet, not the app.
8. Where do I…? → "water", "people", "missed training", "compare scenarios", "vault": each opens and fits the screen. Do not switch the vault on in this test.
9. Tell me anything that looks wrong, with the screen name.

## Decisions of 20 Nov, 08:20 (Egor) and what was done

| Decision | Done |
|---|---|
| Apply the text fixes to the four tasks | **Done, each re-read after the edit.** Weekly review: Model v3 ladder, BAC "average not lower than 7", "First Hire Free trials started". Morning brief 06:00: same ladder and BAC wording. Nightly review: BAC wording only. Nothing else in any prompt was changed |
| Bench Bulletin: delete the price line | **Done.** The task now says no price, fee or trial terms anywhere. Its subject example and its reference to the old template were left as they were (not part of the decision) |
| Keep 05:03, pause 06:00 | **Done.** 06:00 is paused, not deleted, with its text corrected in case it is resumed |
| Freeze rule | **Withdrawn (his correction at 08:27).** War Room and Caregiver Bench are separate projects; War Room development is not tied to dials or a first client. The Playbook, the Build Gate file and the scheduled reviews were updated |

Still open: the six looser row lookups; "weekly" wording in the content scan; the Bulletin's subject example and template reference; device enrolment; the phone tests.
