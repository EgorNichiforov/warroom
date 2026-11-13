/* War Room v5 · Playbook: the plan, rules, offer, scripts, SOPs and numbers, in one place you can read and edit.
   Pages ship with the app (PB_SEED). Your edits are stored in S.playbook (synced) and win over the shipped text.
   The dialer reads the scripts from here, so editing a script changes what you see on the next call. */
'use strict';

const PB_CATS = [['system', 'How it works', 'hq'], ['mission', 'Mission', 'target'], ['rules', 'Rules', 'shield'], ['scripts', 'Scripts', 'dial'], ['sops', 'SOPs', 'check'], ['business', 'Business', 'stats'], ['body', 'Body & BAC', 'train'], ['mine', 'My notes', 'pen']];
const PB_SEED_V = 1;
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
| BAC | **Pass with an 8+ average** (changed 8 Nov: finish it, don't perfect it). English and IT by certificates |
| Body | **85 kg lean**, trained every day, best tennis I can play |
| Character | Clean. Phone rules kept. In bed at 21:00 |
| Money | Spend less than I make every month, and make more than the month before |

## Priority order
The company is #1. When things clash, the cut order decides (see Rules → When the day doesn't fit).` },
{ id: 'backward', cat: 'mission', title: 'The plan backward', body: `Read from the bottom up: for the top line to be true, every line below it must be true by its date. **Proof first, then retainers.**

## Company: checkpoints
| By | Must be true |
| 30 Jun 2027 | **$20,000 MRR** (8 Priority Bench + 3 Multi-site). Reality rule 1 Mar: under $3,750 MRR = the July target becomes $10,000 |
| 31 Mar | $9,000 MRR · screener #1 |
| 28 Feb | $4,500 MRR (3 Priority Bench) |
| 31 Jan | **3 agencies where my caregiver worked** · first $750 deal · first Priority Bench offered |
| 31 Dec | **First caregiver worked 5 shifts + first invoice paid** ($500) · 2,000+ dials |
| 8 Dec | 100 owner conversations (then, and only then, new ideas are allowed) |
| 30 Nov | **15 screened caregivers in Tampa Bay** · payment route working · number clean (no Spam Likely) · lawyer check booked |

## Body: weekly average weight
| End of | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| kg | 77 | 78 | 79.5 | 80.5 | 81.5 | 82.5 | 84 | 85 |

Every 2 weeks: gaining under 0.25 kg a week = +200 kcal. Over 0.5 kg a week = −200 kcal.

## BAC: the hard dates
See Body & BAC → BAC deadlines.` },
{ id: 'now', cat: 'mission', title: 'This week: the current rules', body: `# Reset 14 Nov (overrides anything older)
Reviewed by Claude, ChatGPT, Grok and Perplexity on 14 Nov. All four agreed on the same three things: **supply first, one simple offer, a way to get paid.** 0 owner conversations so far. The plan is done. The work is dialing and screening.

## The week: 350 dials + a caregiver block
| Day | Dials | When (Moldova) | Florida |
| Mon | 10 | 20:30–20:45 | 13:30 |
| Tue | 100 | 15:30–16:55 + 17:00–17:55 | 8:30–10:55 |
| Wed | 10 | 20:30–20:45 | 13:30 |
| Thu | 100 | 15:00–18:20 (spare time: emails, callbacks, caregivers) | 8:00–11:20 |
| Fri | 50 | 19:30–20:40 | 12:30–13:40 |
| Sat | 80 | 15:00–17:00 | 8:00–10:00 |
| Sat | **Caregivers** | 17:00–18:30: Tampa Bay ads + screening calls | 10:00–11:30 |
| Sun | 0 | No cold calls. Plan, BAC, applicants, meal prep | |

**Why 350 and not 550:** a brand-new US number that jumps to 200+ calls a day gets labelled "Spam Likely" within days, and then nobody picks up. **Max 100 dials a day per number** for the first 2 weeks. From 30 Nov, if the number is clean and the bench has 15 caregivers: Thursday back to 150 (= 400), then a second number for 550.

**Floor on a broken day: 10 dials. Never 0.**

## One metro first: Tampa Bay
Tampa, St. Pete, Clearwater, Brandon and around: ~750 licensed agencies, the biggest metro in Florida, English-speaking caregivers, one time zone. The dialer puts Tampa Bay leads at the top automatically. Caregiver ads go to Tampa Bay only. Agencies and caregivers in the same place = you can actually deliver.

## This week's 5 moves, in order
1. **Bench:** 15 phone-screened caregivers in Tampa Bay by 30 Nov. No promise of interviews within 48 hours until then.
2. **Get paid:** talk to dad this week. His company signs the agreement and invoices in USD to its account, with his accountant's OK. A US LLC can come later, once money comes in. (Stripe does not support Moldova: don't plan on it.)
3. **One offer on the phone:** the Founding Offer (Business → What we sell). The monthly plans are not mentioned on cold calls.
4. **Calling setup:** CloudTalk number with a Tampa area code (813), registered on freecallerregistry.com, max 100 dials a day. Voicemail: 20 seconds, then a same-day email.
5. **Measure 4 numbers daily:** dials, owner conversations, interested owners, caregivers screened.

## Kept on purpose
Own tennis Mon/Wed/Fri (paid, ~€250 a month). Sleep 21:00–05:20. School. All groups.

## Feature freeze
No new War Room features until **1,000 dials or the first paying client.** Changes to the plan only at the Sunday review.

## Still missing
1. A person who sees my dial number every day. Name them.
2. The payment route (move 2 above).
3. A one-page check by a Florida healthcare lawyer (~$300–500) before the first invoice.` },
{ id: 'proposals', cat: 'mission', title: 'Decisions · 14 Nov', body: `## Decided 14 Nov (4-AI review: Claude, ChatGPT, Grok, Perplexity)
| Question | Decision | Who agreed |
| First paying client by 31 Jan? | ~25% as the plan was. ~45% with the changes below | ChatGPT 30% · Grok 15–25% · Perplexity 35–45% |
| Biggest risk | **No caregivers to deliver.** 15 screened in Tampa Bay by 30 Nov | All four |
| Offer on the phone | **One Founding Offer:** $500 per caregiver, paid after 5 worked shifts, first 5 agencies. Monthly plans only after proof | All four: simplify. Price: ChatGPT $500, Grok $500–600, Perplexity $750 |
| Funnel | Plan with **~2,000 dials per paying client** (was 900) | ChatGPT ~3,300 · Grok 1,500–2,500 · Perplexity 1,200–2,500 |
| Dials | **350 a week** for 2 weeks (number warm-up), then 400, then 550 with a second number | ChatGPT 250–300 · Perplexity 300 · Grok 150–200 · Claude 350 |
| Saturday 230 | Cut to 80. Saturday 10:00–11:30 Florida = caregiver screening | All four |
| Metro | **Tampa Bay first** (~750 agencies, biggest metro) | Claude, from the lead data. ChatGPT, Grok: "one metro" |
| Getting paid | Dad's company invoices in USD now; US LLC later | ChatGPT, Perplexity. Grok preferred a US LLC now |
| Calling | US local number, Free Caller Registry, max 100/day/number, manual dialing, 20-sec voicemail + email | All four |
| Lawyer | One-page check by a Florida healthcare lawyer before the first invoice | Grok, ChatGPT, Perplexity |

## Decided 13 Nov (still true)
| Leads | Whole state of Florida, home health + homemaker & companion. Nurse registries parked (1099). 2,059 licensed home health agencies added 14 Nov |
| Texting | No cold SMS. Texting only after a yes, and only with a registered business number |
| Cold email | After the first client or ~1,000 dials: 2 spare domains, 4 inboxes, 3–4 weeks warm-up. Never from caregiverbench.com |
| War Room | Feature freeze until 1,000 dials or the first client |

## Still open (Sunday review)
- **Accountability partner:** who sees the dial number every night?
- **Team:** a commission caller only after one paid placement (ChatGPT: not before).
- **Age check:** if I am under 18, I can't register a business myself in Moldova or the US. Dad's company is the route either way for now.` },

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
{ id: 'rules', cat: 'rules', title: 'House rules', body: `- **One plan:** this playbook. EGOR OS is frozen. Old plans live in the archive.
- **Changes only on Sunday.** One change per week, written in Plan → Review.
- **No new business ideas until 100 owner conversations** (review 8 Dec).
- **A slip is not a reset.** Three honest lines (what happened, the real cause, the one fix), then the next right action.
- **The stake** (500 MDL per day under the minimum) starts only on the day I name an accountability partner.
- **If I don't know something on a call:** "Good question. I don't want to guess. I'll find out and email you today."
- **Never inflate a number.** Not agencies, not caregivers, not years.` },
{ id: 'legal', cat: 'rules', title: 'Legal lines (never cross)', body: `- **We only recruit caregivers.** Never bring agencies clients, never charge per family, client, lead or referral, never take a share of their billing (Florida Patient Brokering Act).
- **We never employ, pay, schedule or place caregivers.** The agency hires them as its own W-2 employees.
- **Caregivers never pay us anything.** Ever.
- **No reference or background checks.** The agency runs them (Level 2, I-9, E-Verify). We pass on only what the caregiver tells us and what we observe (FCRA).
- **No call recording.** Florida needs everyone's consent.
- **No text messages** without consent and a registered business number (A2P 10DLC). No cold texts, no texting after a voicemail.
- **Calls:** 8am–8pm their time, max 3 calls per number per 24 hours, no prerecorded voicemails, "don't call me" = do-not-call immediately.
- **Fair job ads:** no words about age, sex, origin, religion, family or health.
- **Nurse registries (1099 contractors):** not for now.
- **The agreement** is reviewed by a Florida lawyer before anyone signs. One page that says: we recruit employees for the agency; nothing is paid for patients, clients or referrals; the agency does its own Level 2 screening, I-9 and E-Verify.
- **Telemarketing registration:** Florida exempts most business-to-business calls, but the exemption has conditions. Ask the lawyer in the same check. Calling-hour and 3-calls-a-day limits apply either way.
- **Caregiver data:** names and phones of caregivers stay in War Room and go to an agency only with the caregiver's OK. Ask dad's accountant whether Moldova's data law needs anything for sending them to the US.
- **Payments:** not on a friend's card. Dad's company invoices and receives USD, with his accountant's OK, until I can take them myself. The agency gets a W-8BEN-E from that company, not a W-9. Stripe does not work for Moldova.` },

/* ───────── SCRIPTS (the dialer reads these) ───────── */
{ id: 'script-owner', cat: 'scripts', title: 'Owner call script', body: `Shown in the dialer for every call. {name}, {hook} and {town} fill in from the agency you are calling.

## 1 · Opener: permission + hook
> Hi **{name}**, this is Egor with Caregiver Bench. We've never spoken, and I know you weren't expecting my call. **{hook}**, which is why I'm calling. Can I take 30 seconds to tell you why, and then you decide if it's worth talking?

## 2 · Right person
> Are you the one who handles caregiver hiring, or is that someone else?

## 3 · The problem, not the product · then count to 4
> From the agencies I've looked at around {town}, the hard part usually isn't getting applicants. It's that they don't show up to the interview, or they quit in the first couple of weeks. **I'm not sure that's true for you. Is it?**
> Hard case: Live-in, weekend and Marco cases stay open the longest. About 4 in 10 don't show up to the interview, and the good ones get hired by someone else first. **Is that happening with this one, or have you got it covered?**

## 4 · One follow-up
> When a new case comes in and you're short a caregiver, what do you do today: pull someone from your team, post on Indeed, or something else?

## 5 · One sentence + a no-oriented ask
> **I recruit and phone-screen caregivers for agencies around {town}. You pay $500 only after one of them has worked 5 shifts for you. Nothing up front, no monthly fee.** I run my own ads, call every caregiver myself, confirm them twice before the interview. **What's the hardest shift you're trying to cover right now? Would you be against me recruiting for that one this week?**

## 6 · Yes → the case
> Let's do 10 minutes on the case: town, hours, pay, must-haves, who interviews. Now, or tomorrow at [time]?
- Then: "If I can't send you 2 screened candidates within 7 days, you owe nothing." Email the one-page agreement the same day.

## 7 · Not now
> Fair enough. Every Monday I send a short email with the screened caregivers I have, by town and shift, no names. Would it be a bad idea if I added you?

## Last question after a no
> Who's the one agency around here you'd guess is having the hardest time staffing right now?

## Voicemail
> Hi {name}, Egor with Caregiver Bench. {hook}. I recruit caregivers in your area, live-in and weekends especially, and you only pay once a caregiver has worked 5 shifts. I'll try you again on [day]. If it's easier, I'm at 561-556-0536.` },
{ id: 'script-al', cat: 'scripts', title: 'Assisted living opener', body: `Shown in the dialer for assisted living and memory care (tier AL).

> Hi, is this the Executive Director? This is Egor with Caregiver Bench. We've never spoken. I recruit caregivers and CNAs in Collier and Lee. I know a lot of communities end up paying agency staff to cover shifts. Is that something you deal with, or are you fully staffed?

## Their words
Residents (not clients), community or building (not agency), shifts, the floor. Decision maker: the Executive Director (sometimes the Director of Nursing or HR).

## If they use temps
> Then every caregiver you hire permanently cuts that bill. How much agency staffing did you pay last month?` },
{ id: 'script-gatekeeper', cat: 'scripts', title: 'Gatekeeper', body: `> I recruit caregivers for home care agencies in Florida. Who handles caregiver hiring there?

If you have the owner's name (from Sunbiz): "Is Maria in?" beats "Who's the owner?".

If they're not in:
> Thank you. When is the best time to reach her? And may I have her email so I can send her the caregivers I have this week?

Log it as Gatekeeper with the name and the callback day. The scheduler is often your best ally to reach the owner.` },
{ id: 'objections', cat: 'scripts', title: 'Objections', body: `Shown in the dialer under the script.

| They say | You say |
| "How much?" | "Free for 30 days. If none of my caregivers works a shift, nothing. If one does, $1,500 a month with 3 included, or $750 each if you only hire now and then." |
| "Too expensive." | "Compared with what? Replacing a caregiver costs most agencies about $2,600. Indeed is about $561 per hire, and you still do all the work." |
| "Send me info." | "Sure. What would make it worth reading: the live-in case, or weekends?" Then a 3-line email about that case. |
| "We have a recruiter / Indeed." | "Keep them. Just so I know: how fast did your last live-in case get staffed?" |
| "We're fine on caregivers." | "Good to hear. Have you turned down a 24/7 or live-in case this year?" |
| "Recruiters burned us." | "Fair, most charge whether anyone works. That's why I don't charge until someone works a shift. What happened with them?" |
| "I'm busy." | "Sorry for the timing. When's better: tomorrow morning or afternoon?" Book it, hang up. |
| "Where are you based?" | "In Europe. I work Florida hours. The caregivers are local, only the screening is remote." |
| "How many caregivers do you have?" | The real number. While building: "I'm building the bench this month, so I recruit for your case specifically." |
| "Are you a staffing agency?" | "No. A staffing agency sends a temp and bills by the hour. I find people you hire yourself, permanently." |
| "Is this legal? Patient brokering?" | "Yes. That's about paying for clients. I never touch clients or referrals, only caregivers, for a flat recruiting fee." |
| "I need to think about it." | "Of course. What's the main thing you'd want to think through?" |
| "Can you do it cheaper?" | "I keep one price for everyone. If it's too much, I'll put you on the plan that fits better." |
| "Are you licensed?" | "Florida licenses companies that provide care or place contractors. We do neither: we recruit, you hire your own W-2 employees." |
| Anything you don't know | "Good question. I'll find out and email you today." |` },
{ id: 'script-screen', cat: 'scripts', title: 'Caregiver screening call (10 min)', body: `Same questions for everyone. Never social security numbers, never medical information.

1. Town, and how far will you drive?
2. Do you have a car?
3. Certificate: HHA, CNA or none? (as they state it)
4. Years of experience, and what kind of care?
5. Which shifts? Weekends? Overnights?
6. Live-in: yes or no?
7. Hours wanted per week?
8. Pay wanted?
9. Languages?
10. Why are you looking?
11. When can you start?
12. Legally allowed to work in the US? (yes/no only)

## Also note what you observe
Answered on time · showed up for the call they chose · speaks clearly.

## Then
Score 1–5, log it in Dial → Caregivers, tag town, shifts, live-in, language, certificate.` },
{ id: 'script-case', cat: 'scripts', title: 'Case call (10 min, after a yes)', body: `- Town, days and hours
- Live-in or not
- Pay
- Must-haves: CNA/HHA, car, language
- Start date
- Who interviews, and when
- Confirm: **it's a W-2 job**

**Never client names or health details.**

Within 1 hour: a one-page recap by email (the case, the plan, the dates).` },

/* ───────── SOPs ───────── */
{ id: 'sop-dial', cat: 'sops', title: 'Dial block', body: `1. **Open War Room → Dial session.** Nothing else opens first.
2. **First dial inside 2 minutes.**
3. Callbacks due first, then the queue top-down.
4. Tap the outcome after every call. That logs the dial and the owner talk.
5. **5-minute break every 50 dials** (water, stand up).
6. Hit the number, or the block ends, whichever comes later. Never stop at 0.
7. End session. Anything you couldn't answer: write it down, ask Claude.

Florida = Moldova − 7 h (the Panhandle, west of the Apalachicola River, is − 8 h). Call 8am–8pm their time. Owners pick up best mid-morning Florida time (check Stats → Intel once 50 calls are logged).

## Calling setup (so they pick up)
- **A real US local number** in the area code you call (Tampa Bay: 813 / 727). Never spoof, never hide the number.
- **Register it** on freecallerregistry.com (feeds AT&T, T-Mobile, Verizon's spam filters). Ask the provider for STIR/SHAKEN "A" attestation.
- **Max 100 dials a day per number** for the first 2 weeks, then up to 200. A sudden jump gets the number labelled "Spam Likely".
- **Check the label weekly:** call your own phone from it. If it says Spam Likely: stop that number, get a new one.
- **Dial by hand** (click to call), one number at a time. No automatic dialer that picks numbers by itself until a lawyer has looked at it.
- **Voicemail:** 20 seconds, then the same-day email that mentions it.` },
{ id: 'sop-after-yes', cat: 'sops', title: 'After an owner says yes', body: `| When | What happens |
| Case call (10 min) | Town, hours, live-in, pay, must-haves, start date, who interviews. W-2 confirmed |
| Within 1 hour | One-page recap by email |
| Within 4 hours | Caregiver Profile Cards (first name + last initial, towns, shifts, live-in, certificate as stated, experience, screening notes). **No phone numbers** |
| Within 48 hours | Interviews on their calendar |
| Day before + morning of | Confirm every caregiver by phone (the 40% no-show problem) |
| No-show | Replacement candidate within 24 hours, free |
| Every evening, open case | A 3-line email update |
| First shift | The agency tells us within 2 business days |
| Days 1, 3, 7, 14, 30 | Check-in calls with the caregiver (First 30 Days Shield) |
| Every Friday | One page: "your hiring this week" |
| Day 25 | Results call + written reminder |
| Day 30 | A caregiver worked → the plan starts. None did → they pay nothing, ever |` },
{ id: 'sop-bench', cat: 'sops', title: 'Building the bench', body: `1. **Ads:** Facebook job ads in the Employment category, English and Spanish, Collier and Lee, plus the county of every agency that says yes (recruit for their case). Free backups: Indeed posts, local job groups, CNA schools.
2. **Application:** 1-minute form. Consent to share the profile with employers.
3. **Instant reply:** every applicant gets a link to book a 10-minute call.
4. **Screening call:** see Scripts → Caregiver screening call.
5. **Score 1–5 → bench.** Every bench caregiver gets a call every week so the information stays fresh.

Caregivers apply to 10–20 agencies at once. **Speed wins:** interviewed within 4 days = 2× as likely to be hired.` },
{ id: 'sop-shutdown', cat: 'sops', title: 'Shutdown (20:45, 7 minutes)', body: `1. **War Room → Start shutdown:** numbers (dials, owner talks, BAC, money), the 7 standards, debrief.
2. Daily log (2 min): numbers, what happened in one sentence, the lesson, tomorrow's first action.
3. Magnesium + water.
4. Look at tomorrow: the first action is 05:30 train.
5. Phone charges outside the bedroom. **Bed 21:00.**` },
{ id: 'sop-review', cat: 'sops', title: 'Sunday review (11:00, 30 min)', body: `1. Open **Plan → Review**. The week report is at the top.
2. Dials vs 350, owner conversations, interested owners, caregivers screened (Tampa Bay, /15 by 30 Nov), money collected. Open leads left (under 700 = ask Claude for more).
3. BAC hours and the Saturday test score.
4. Training days. Weight vs the checkpoint.
5. Money made vs spent.
6. Read Mission → Decisions → Still open. Decide one.
7. Write **ONE change** for next week. That's the only change allowed.

Monthly, first Sunday: compare with the plan backward. Behind 2 months in a row = cut order, not more hours.` },
{ id: 'sop-morning', cat: 'sops', title: 'Morning', body: `05:20 toilet → scale → weigh in War Room → teeth, water, dressed.
05:30 train (bad day: 10 minutes).
06:00 shower.
06:15 BAC: Anki, 25 minutes. Phone in another room.
06:40 lead prep: owner names for today's calls (until 30 Nov). From 1 Dec: BAC 06:15–07:30 instead.
07:30 breakfast. 07:50 sunlight, 10 minutes. Pack lunch, snack, dinner, 1 L water.` },

{ id: 'sop-referral', cat: 'sops', title: 'Referrals', body: `Ask at three moments. Never pay for a referral (legal lines).

| When | Say |
| Every "not a fit" | "Who's the one agency around here you'd guess is having the hardest time staffing right now?" |
| Day 30 of a trial, after a caregiver worked | "Who else do you know who'd want this? I'll take care of them the same way." |
| Any thank-you | "Glad it helped. Is there one owner you'd introduce me to?" |

## Then
- Same day: call or email the name. Open with "[Name] suggested I call."
- Write who referred them in the agency's notes (and the Lead DB column "Referred by").
- Tell the referrer when the intro turned into a conversation. A thank-you, never money.` },
{ id: 'sop-followup', cat: 'sops', title: 'After every owner conversation', body: `1. **Log it** in Dial (outcome + one line: name, case, next step, date).
2. **Email within 1 hour,** from my main address, 3 lines: what they said, what I'll do, the next date. No attachments.
3. **Callback in the queue** on the day they named.
4. **Not now** → ask to add them to the Monday Bench Bulletin.

Cold email to strangers waits for the warmed-up spare domains. Never send cold email from caregiverbench.com.` },
/* ───────── BUSINESS ───────── */
{ id: 'offer', cat: 'business', title: 'What we sell', body: `**Screened caregivers for private-pay Florida home care agencies and assisted living.** They hire, we recruit.

## On the phone now: the Founding Offer (first 5 agencies)
> **$500 per caregiver, invoiced only after they've worked 5 shifts for you.** Nothing up front, no monthly fee, no contract length. If I can't send you 2 screened candidates for your open case within 7 days, you owe nothing. All I ask: an honest review if it works.

- One price for every case while I collect proof. Live-in and 24/7 too.
- Why 5 shifts, not 1: the owner's real fear is the caregiver who quits in week one. Paying after 5 shifts removes it.
- Why $500: proof beats price. Five agencies saying "he delivered" is worth more than $250 more per hire (Hormozi: proof beats promise [#102]).
- **Qualifying question:** "What's the hardest caregiver shift you're struggling to cover right now?" Sell that one case, not a plan.
- **No 48-hour or 24-hour promises** until the Tampa Bay bench has 15 screened caregivers.

## After proof (3 caregivers who worked, or 5 founding agencies): the full ladder below
Monthly plans are offered only to agencies where at least 2 of my caregivers already worked. Never on a cold call.

## Routing question (after proof)
> In a normal month, how many caregivers do you hire?

| Answer | Offer |
| 0–1 | **Pay When They Work:** $750 per caregiver who works a first shift, $1,200 for a hard case. No monthly fee |
| 2–5 | **30-Day Bench Trial → Priority Bench**, $1,500 a month, 3 caregivers who work included (extras $400 / $600) |
| 6+, or 2+ locations | **30-Day Bench Trial → Multi-site**, $3,000 a month, 7 included, Fully Staffed in 90 Days guarantee |

## The trial: "staffed or it's free"
30 days on their open cases. If at least one of our caregivers works a shift, the plan starts month to month. If none does, they pay nothing, ever. Trial caregivers stay free if they keep the plan for 2 paid months.

## With every caregiver
- **No-Show Insurance:** a replacement candidate within 24 hours.
- **Stay-or-Replace 90:** leaves within 90 days → free replacement, or a refund of the unused part after 21 days.
- **First 30 Days Shield:** check-in calls on days 1, 3, 7, 14, 30.

## Fair play
One agency at a time per caregiver. No fee if the caregiver applied to them directly in the 60 days before. Hiring someone we introduced within 12 months = the fee is owed.

## Hard cases
24/7, live-in, overnight, weekends-only, bilingual required, Marco Island, Sanibel and remote areas.` },
{ id: 'funnel', cat: 'business', title: 'The funnel math', body: `**Plan estimates (reset 14 Nov after the 4-AI review). Your real rates replace these in Stats → Intel after 100 dials.**

Planning number: **~2,000 dials per paying client.** (ChatGPT said ~3,300, Grok 1,500–2,500, Perplexity 1,200–2,500. The old plan said 900: too optimistic for a new number calling from abroad.)

| Step | Rate | Per 350-dial week |
| Dials | — | 350 |
| Owner conversations | ~2.5% | ~9 |
| "Send me candidates" | ~15% | ~1.3 |
| Case taken (agreement sent) | ~40% | ~0.5 |
| Caregiver works 5 shifts → paid | ~35% | ~0.2 |

About **1 paying agency every 5–6 weeks at 350**, every 3–4 weeks at 550. First paid placement by 31 Dec is realistic only if the bench exists by 30 Nov.

## The real levers (bigger than more dials)
1. **Pickup rate:** a clean local number (Free Caller Registry, ≤100/day) can double owner conversations.
2. **Delivery:** every yes that I can't staff in 7 days is lost. Bench first.
3. **Proof:** the first 3 agencies who say "he delivered" make every next call easier.

## What $20k means
8 Priority Bench ($12,000) + 3 Multi-site ($9,000) = $21,000. That is ~45 caregiver starts a month (ChatGPT's point): a real delivery operation with screeners, not just 11 sales. The July target stands; the 1 March reality rule decides if it moves to $10,000.` },
{ id: 'pricewhy', cat: 'business', title: 'Why the price makes sense', body: `- **$750 is under a third** of the ~$2,600 it costs to replace a caregiver.
- Indeed costs about **$561 per hire**, and they still do all the calling and chasing.
- One caregiver at 25 hours a week brings the agency about **$350 a week** of margin. $750 pays back in about 2 weeks.
- **Priority Bench:** 3 caregivers at $750 = $2,250. The plan is $1,500, plus first pick.
- **One 24/7 case ≈ $25,000 a month** of billing. $1,200 to staff it is nothing.
- Recruiters charge 15–25% of first-year pay. Monthly services charge $1,400–3,400 whether anyone works or not.` },
{ id: 'industry', cat: 'business', title: 'The industry in 5 minutes', body: `## Who you call
| Type | What they do | Fit |
| Home Health Agency (licensed) | Hands-on care, W-2 HHAs/CNAs | **Main buyer** |
| Homemaker & Companion (registered) | Company, meals, housework, no hands-on care | Good buyer |
| Nurse Registry | 1099 contractors | **Not for now** |
| Assisted living / memory care | One building, fixed shifts | Second buyer |

Florida (state list, 13 Nov): 2,716 home health agencies, 2,768 homemaker & companion, 1,257 nurse registries (parked). Ask early: "Are your caregivers W-2 employees?"

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
| Naples aide median pay | $16.90/h · Florida minimum $15 |
| Families pay | ~$32–42/h · agency gross margin ~40% |
| One 24/7 case | ~168 h a week, 4–5 caregivers, ~$25k a month |

## Who picks up
Owner (revenue, not turning down cases) · Administrator · **Scheduler** (tonight's shifts, your ally) · Recruiter/HR · Receptionist (gatekeeper) · Executive Director (assisted living).` },
{ id: 'aboutme', cat: 'business', title: 'Questions about me', body: `| They ask | I say |
| "Who are you?" | "I'm Egor. I run Caregiver Bench, a caregiver recruiting service for private-pay home care agencies in Florida." |
| "Where are you based?" | "In Europe, in Moldova. I work Florida hours. The caregivers are local; only the recruiting and screening is remote." |
| "How long have you done this?" | "Honestly, I'm new. You'd be one of my first agencies. That's exactly why you pay nothing until a caregiver has worked 5 shifts." |
| "Do you have insurance?" | "The caregivers are your employees, covered by your insurance and your screening." |
| "Where do I pay?" | "Nothing until the caregiver has worked 5 shifts. Then one invoice, by bank transfer in USD." |
| "References?" | "Not yet. After 30 days I'd love you to be my reference, if I earn it." |
| "Can we meet?" | "On a video call, any time. In person, not before mid-2027." |
| "Is this AI?" | "No, it's me, Egor. I make my own calls." |
| "How did you get my number?" | "From your public listing." |` },

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
{ id: 'bac', cat: 'body', title: 'BAC deadlines', body: `**Strategy:** English and IT by certificates, then everything on Romanian and History. Target: pass with 8+.

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
    <div class="xs muted" style="text-align:center;margin:6px 0 14px">Your edits sync to every linked device. Source docs: <a href="https://docs.google.com/document/d/1JGpxGNLf87kr3_du8vHpHfgCiKEaAO1BQ8cnYSRpx9k/edit" target="_blank" rel="noopener">EGOR OS</a> · <a href="https://docs.google.com/document/d/1WV3FgYsYk05rcHlcVfNj94hMNYoJ2VlxbSjkKaVhuMU/edit" target="_blank" rel="noopener">KNOW IT COLD</a> · <a href="https://docs.google.com/document/d/1vJ7_gF0XiOyYWNRRiWYke7QWfdT477AoUK6DTvIOb4k/edit" target="_blank" rel="noopener">CALL SCRIPT v3</a></div>`}`;
}
function pbEdit(id) {
  const p = pb(id) || { id, title: '', body: '', cat: 'mine' };
  openModal(`<h2>Edit page</h2><div class="field"><label>Title</label><input id="pe-t" value="${esc(p.title)}"></div>
    <div class="field"><label>Text</label><textarea id="pe-b" style="min-height:52vh;font-family:var(--mono);font-size:13.5px;line-height:1.5">${esc(p.body)}</textarea></div>
    <div class="xs muted" style="margin-bottom:6px"># heading · ## label · &gt; a line to say out loud · - list · | table | row | · **bold**${p.cat === 'scripts' ? ' · {name} {hook} {town} fill in on calls' : ''}</div>
    <div class="actions">${p.seed && p.edited ? `<button class="btn" onclick="if(confirm('Go back to the original text?')){pbReset('${id}');closeModal();render()}">Original</button>` : ''}${!p.seed && pb(id) ? `<button class="btn danger" onclick="if(confirm('Delete this page?')){pbDelete('${id}');pbOpen='';closeModal();render()}">Delete</button>` : ''}<button class="btn primary" onclick="pbSave('${id}',document.getElementById('pe-t').value.trim()||'Untitled',document.getElementById('pe-b').value,'${p.cat}');closeModal();pbOpen='${id}';render();toast('Saved · syncs to your devices')">Save</button></div>`, true);
}
function pbNew() { const id = 'n' + uid(); pbEdit(id); }
function pbFor(ids) { return ids.map(pb).filter(Boolean); }
