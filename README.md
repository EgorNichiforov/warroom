# War Room

Egor's daily command center, built as an installable web app (PWA) for the phone home screen.
No build step, no framework, no account: `index.html` + `app.js` + a service worker. Works offline.

**Live:** https://egornichiforov.github.io/warroom/ (GitHub Pages, root of `main`)

## What it does

| Tab | Purpose |
| --- | --- |
| **Today** | Phase-aware. **Morning (05:20):** the weigh-in, then one big "current step" card with a Done button that walks the morning routine. **Day:** Now/Next from the schedule and "The lever": today's dial target, weekly pace, and a **Dial session** mode (giant +1 dial, +1 owner talk, pace per minute inside the block, session summary). **20:45:** a guided 5-step **Shutdown** (numbers, standards, debrief, tomorrow's first blocks + top 3, close) that grades the day A–F. Also: focus timer (▶ 25 / ▶ 50) that logs BAC minutes, streaks (weigh-ins, minimum days, full mornings, bed on time), and the stake alert. Opens on the morning weigh-in (big number, ±0.1, Save). Then the Now/Next block from your schedule, the morning and evening routine checklists, the Scoreboard (dials, owner conversations, BAC minutes with per-weekday targets and the 225/week bar), Top 3 for the day, tasks due, daily standards, sleep, money (MDL), a 3-line debrief and a day score. |
| **Plan** | Week strip with weight and day score per day, the weekly numbers, and the full time-blocked schedule for the selected day (mirrors the recurring Google Calendar). Tap Edit to change or add blocks. |
| **Tasks** | Fast capture. Overdue / Today / Tomorrow / Upcoming / No date. Tap a task to edit, re-date, or delete. |
| **Train** | The weekly split from the calendar (Upper A, Core + prehab, Upper B, Leg accessories, Arms + prehab, Upper C, Recovery) with every exercise, sets × reps and coaching notes. Log kg/reps per set; last session shows as placeholders. Finishing a workout ticks the routine. Programs are editable as plain text. |
| **Goals** | Countdowns to July 1, 2027 and BAC. Weekly goals (225 dials, 20 h BAC, 6 training days) fill in automatically from the Scoreboard; monthly and campaign goals (Caregiver Bench MRR, first 3 paying agencies, 100 owner conversations by 8 Dec, 85 kg, BAC pass with 8+) are tracked with progress bars. |
| **More (⚙)** | **Stakes**: the minimum day (10 dials Mon–Fri + 25 min BAC, never zero) is checked automatically each morning; a missed day adds 500 MDL to the ledger (mark paid or waive). Also: Weight history with 7-day-average chart and pace to target, the Sunday weekly review, routine / standards / scoreboard editors, sync, backup, install steps. |

## Install on the phone

- **iPhone:** open the live URL in Safari → Share → **Add to Home Screen**.
- **Android:** open in Chrome → ⋮ → **Add to Home screen**.

Data is stored on the device (localStorage). Export a JSON backup from More → Sync once a week.

## Phone ↔ laptop sync (optional, one-time setup)

1. In the Supabase project (`egorflow`), open the SQL editor and run `supabase/warroom_sync.sql`.
   It creates one table, `warroom_sync`, gated by a secret sync code sent as a request header.
2. In the app: More → Sync → **Generate** a code → **Connect**. Use the same code on the other device.

Nothing else is needed. The project URL and publishable key are prefilled; they are public by design and useless without the code.

## Development

```
python3 -m http.server 8765   # then open http://localhost:8765/
```

Bump `APP_VERSION` in `app.js` and `CACHE` in `sw.js` when shipping, so installed phones pick up the update (the app shows a "Reload" toast).

## History

The `warroom_v*.html` files are earlier single-file versions kept for reference. The current app is `index.html` + `app.js`.
