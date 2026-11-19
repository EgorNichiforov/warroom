# Security and recovery (13.24.0)

## Threat model, plainly
- **The sync code is a password.** Whoever has it (plus the public project key that ships in the app) can read and write the main, queue, bench and snapshot rows. It is 18 random characters and sent as a request header; row-level security compares it to the row id.
- **The app lock (PIN / biometrics) is a device lock, not encryption.** Data in the browser's storage and in the cloud row is not encrypted by War Room.
- **A stolen unlocked phone** exposes everything on it and the sync code in local storage.

## What 13.23.2 and 13.24.0 changed
- Backups exported from Settings no longer contain the sync code or the share-link code.
- Two devices editing the same day no longer overwrite each other (per-field 3-way merge).
- CRM and bench pushes merge before writing. A pull that finds the device ahead pushes.
- Time Machine restore makes every record of the copy win.
- Device clock vs server clock is measured on each pull; a gap over 2 minutes shows as a risk on the mission card (only if the server exposes its `Date` header; not verified against the live project).
- The sales-notes AI analysis states what it sends, and to which provider, before sending.

## Still open
1. **No per-device revocation.** All devices share one code. Rotating the code cuts off every device at once and is not the same as revoking one. Not built.
2. **Restore does not rewind.** Records created after a snapshot survive a restore.
3. **Agency records merge whole**, newest wins.
4. **"Newest" trusts device clocks.**
5. **AI calls**: Ask, Explain, teach-back, Feynman grading, fresh scenarios, sales-notes analysis and food photos send the text or image involved to the provider behind your key (Gemini or Anthropic), directly or through the `warroom-ai` relay. Mission Control, BAC board and weekly review send nothing.

## Plan for per-device authorization (NOT applied; needs your approval, it changes the live database)
1. Table `warroom_device(id uuid pk, room text, name text, token_hash text, created_at, revoked_at)`; RLS on, no anon policies.
2. Edge function `warroom-auth`: `link` (code → new device token, stored hashed), `revoke` (device id), `list`.
3. `warroom_sync` policies change from "header equals row id" to "header token hash exists in `warroom_device`, not revoked, for this room".
4. App: store the device token instead of the code after linking; Settings lists devices with Revoke.
5. Migration is reversible by restoring the three old policies (kept in `supabase/warroom_sync.sql`).
Risk: a mistake locks every device out. Do it with the server-side backup fresh and one device kept on the old policy until verified.

## Backups
| Layer | Where | How |
|---|---|---|
| Live | browser storage + cloud rows | automatic |
| Time Machine | cloud rows `…:snap1-7`, `undo`, `manual` | daily when the app is opened; Settings → Time machine |
| Server-side | table `warroom_backup` (RLS on, no policies; taken 18 Nov before the sync change: 22 rows, checksums verified) | taken by Claude before risky changes |
| Offline file | Settings → Export | manual; no credentials inside since 13.24 |

## Recovery
- **Lost or stolen phone:** on another device, Settings → Devices & sync: generate a new code, re-link the devices you still hold. The old code keeps working for whoever has it until the old rows are deleted; ask Claude to delete them.
- **Bad data after a sync or an update:** Settings → Time machine → restore the last good weekday. The state before the restore is kept as "Before restore".
- **Cloud row damaged:** restore from Time Machine; if those are damaged too, Claude restores from `warroom_backup`.
- **Failed update / blank screen:** the service worker keeps the previous version if an install fails. Close and reopen. Code rollback points: `741f7a8` (13.23.1), `5088e8f` (13.23.2).
- **Restore drill (do once a month):** Save a copy now → change one harmless thing → restore the copy → check it is back.
