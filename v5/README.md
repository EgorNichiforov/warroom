# War Room (branch `main`, folder `v5/` · app 13.33)

Egor's personal operating system. Plain-JavaScript PWA, no build step, offline-first, synced through Supabase.
Live: https://egornichiforov.github.io/warroom/v5/ · Android shell (Capacitor) in `native/`, APK in `main:download/WarRoom.apk`.

**Read first:** `BUILD_GATE.md` (when building is allowed), then `WAR_ROOM_MASTER_ARCHITECTURE.md` (the one current map). `ARCHITECTURE.md` is the runbook and history.
GitHub Pages deploys from `main`; the `v5` branch is a mirror and is not deployed. The latest audit (19 Nov 2026) is the Claude doc "War Room 13.31.1 · whole-system coherence audit".

## Shape
- **Four hubs:** Day · Work · Money · You, plus global capture (`shell.js`). ARC (`arc.js`) is the guided day.
- **State:** one object `S` (`core.js`), saved to `localStorage` (`warroom2`). The CRM queue (`dial.js`, `warroom-queue`)
  and the caregiver bench (`pipeline.js`, `warroom-bench`) are separate documents.
- **Sync:** table `warroom_sync`, one row per document, row id = the sync code (a bearer credential: treat it like a password).
  Records merge by timestamp; days and settings-type objects merge per field against the last cloud copy seen
  (`merge`, `merge3` in `core.js`, since 13.23.2). Every push reads and merges first.
- **Backups:** Time Machine (`system.js`): one cloud copy per weekday + "before restore" + manual. Server-side table
  `warroom_backup` (no browser access) holds copies taken before risky changes. Export/import JSON in Settings.
- **Modules:** 71 scripts loaded in order from `index.html`; later files wrap earlier functions (see the audit for the
  ownership map). Business: `dial crm pipeline stage intel autopilot playbook`. Money: `money* ledger keep wealth`.
  Body: `train trainlog food sleep body`. Learning: `bootcamp learn mastery capability drive explain clips vplay`.
- **AI:** optional, user's own key (device-local or relayed by the `warroom-ai` function). The app lock (`lock.js`)
  is a device lock, not encryption.

## Working on it
- Tests: `python3 -m http.server 8765 &` then `python3 tests/run.py` with `TZ` set so the local time is daytime (the night screen hides parts of Day; e.g. `TZ=Etc/GMT-5` in the European morning, `TZ=Etc/GMT+6` in the evening) (Playwright; 303 checks).
- Release: bump the version in `core.js` (`APP_VERSION`), `sw.js` (`CACHE`, `SHELL`), `index.html` (`?v=`); run the tests;
  add a changelog row in `playbook.js`; push `v5`; copy changed files to `main:/v5/`.
- Never print the sync code. Never count a dial that was not dialled.

`classic/` is v3, `archive/` holds old prototypes.
