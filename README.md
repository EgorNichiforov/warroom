# War Room (v4)

Egor's command center. Vanilla JS PWA, offline-first, syncs through Supabase (`warroom_sync`).

- **Now**: what to do right now (current block, one action), today's numbers, top 3, standards, money.
- **Dial**: the call queue (212 agencies from the tracker sheet), tap-to-call, outcome buttons that log dials and owner talks, the script filled for the current call.
- **Train**, **Week** (plan · tasks · goals · review), **Me** (settings, weight, stakes, sync).

Files: `index.html` (shell + CSS), `core.js` (state, data model, sync), `dial.js` (queue + dialer), `views.js` (screens), `queue_seed.json` (initial call queue), `sw.js`.
`classic/` is the previous version (same data, same device storage). Old prototypes live in `archive/`.
