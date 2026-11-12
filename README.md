# War Room (v5)

Egor's command center. Vanilla JS PWA, offline-first, syncs through Supabase (`warroom_sync`). Phone layout (tab bar) and desktop layout (sidebar, multi-column).

- **HQ**: the mission right now, three rings (Company · Body · Mind), rank and XP, streaks, the week, today's checklist.
- **Dial**: the call queue, tap-to-call, outcome buttons that log dials and owner talks, the script filled for the current call.
- **Train**: sessions and sets.
- **Food**: snap a meal, AI estimates calories and macros, one tap to save. Saved meals, daily totals, 7-day view.
- **Stats**: dials, pipeline, consistency, standards, weight, study, training, food, money.
- **Plan** (plan · tasks · goals · review) and **Me** (settings, weight, stakes, sync).

Files: `index.html` (shell + base CSS), `v5.css` (design system, desktop layout), `core.js` (state, data model, sync), `dial.js`, `pipeline.js`, `train.js`, `game.js` (rings, XP, ranks, medals, chart helpers), `food.js`, `stats.js`, `views.js` (navigation, HQ, init), `sw.js`.

Food photo AI runs from the device with the user's own key (Gemini or Anthropic). The key is stored in `localStorage` on that device only and is never synced. Meal photos stay on the device (IndexedDB); meals themselves live in the day record and sync.

`classic/` is the v3 version (same data, same device storage). Old prototypes live in `archive/`.
