# War Room · architecture decisions

Each decision: the question, the evidence, what was chosen, what it costs, and what would reopen it.

## ADR-001 · Rebuild, or extend the existing app? → Extend, in layers (19 Nov 2026)

**Evidence for a rebuild.** 93 script files share one global scope; newer modules wrap older functions, so load order matters and a wrapper can hide a flag another module checks (this happened twice on 19 Nov and was caught by tests). All state is one JSON document in `localStorage` and one cloud row per device group; a full storage can silently drop the sync merge memory. There is no type checking and no build step.

**Evidence against.** The app works and is in daily use. About 800 automated checks pass on every release, at phone size. A rebuild in TypeScript with a component framework would need 93 modules (2.5 MB of code) re-implemented and the data migrated before it reached today's capability; nothing the brief asks for is *impossible* in the current structure. The business the app exists to serve has not yet had its first paying customer: weeks spent on a rewrite are weeks not spent on that. The brief itself says a rebuild is conditional on engineering evidence and that the app must not become a distraction from the business.

**Decision.** Keep the vanilla PWA. Add the missing layers as modules with a narrow contract: a read model over existing stores (`entity.js`), an event log, reconciliation, health checks, scenarios, an agent layer. Do not add new global recommenders. Remove dead code only after a caller check.

**Cost.** The global-scope fragility stays. Mitigation: every wrapper copies existing flags; each release runs every suite; `tools/inventory.py` keeps an honest map.

**Reopen when** any of these is true: a second person works on the code; the state document passes ~60% of device storage; a needed feature requires a server process the app controls; a paying customer needs access.

## ADR-002 · A canonical data model without migrating data → a read model

The brief asks for canonical entities with identity, provenance, confidence, relations and history. Migrating twenty stores to a new schema would risk real data for no user-visible gain today. Chosen: `entity.js` adapts each store on read into one shape (`type:id`, title, status, created, changed, origin, confidence, relations) and computes two-way relations. Stores keep their owners. Cost: provenance is derived per store type, not stored per field. Reopen when records need per-field history or a server needs to query them.

## ADR-003 · Storage → stay on `localStorage` + cloud row, but measure it

`hxStore()` reports bytes used and warns from 45% and 70% of an assumed 10 MB. IndexedDB would lift the limit but changes every read and write from synchronous to asynchronous: a rewrite of the save path. Not justified until usage approaches the limit.

## ADR-004 · Sync and conflicts → keep the existing merge; never edit `settings` from the cloud

Per-record maps merge by newest timestamp; `days` and single objects merge field by field against a stored base. Verified on 19 Nov: goal edits made with SQL survived two device syncs; a `settings` edit made the same way was overwritten within the hour. Rule: `settings` changes are made by the app on a device (one-time steps keyed in `S.migrations`).

## ADR-005 · Background work → Claude scheduled tasks now; no in-browser pretence

A PWA cannot run scheduled work while closed. What actually runs unattended are Claude scheduled tasks (content scan, curriculum review, Dial Guard, attendance report) that read and write the cloud row. The app's automation list states for each one whether it runs alone, needs a tap, or is blocked. A server-side worker the app controls (Supabase cron + edge functions) is the next step if in-app agents prove useful; it needs credentials handling that Egor must approve.

## ADR-006 · AI layer → one provider-neutral call, roles on top, proposals only

`aiText(system, messages)` already hides the provider (direct key on the device, or the `warroom-ai` edge function holding the key server-side). The agent layer (`agents.js`) adds roles with contracts on top of that one call. Agents read a context pack built by deterministic functions and return structured proposals; they cannot write. A proposal becomes a record only when Egor taps Approve, through the store's existing owner function. No vector store: the whole corpus is a few hundred short records that fit in a context pack chosen by rules.

## ADR-007 · Security → state plainly what exists; do not migrate without approval

What exists: TLS in transit; a sync code that is the only key to the cloud row, checked by row-level security; an app lock that is not encryption; backups in a table no public role can read. What does not exist: per-device accounts, encryption at rest under a user key, token rotation. Adding them is a database migration that can lock devices out; it waits for a written plan and Egor's approval.

## ADR-008 · Visual identity → add the brief's graphite palette as a look, keep the default

The app already has three looks (dark, light, classic) held as CSS variables. The brief's suggested tokens are added as a fourth look, "Graphite · teal". The default is not switched from a test browser: colour and contrast need to be judged on the real screen.


## ADR-009 · Server worker (extends ADR-005) · 19 Nov 2026

**Decision.** Background work moves to a job queue in Postgres, a timer (`pg_cron`, every 10 minutes) and one edge function. Claude's scheduled tasks stay for what needs a connector (Gmail, Viber on the laptop).
**Why.** A queue with idempotency keys, retries and an audit row is observable and cheap; a scheduled Claude task is neither observable from the app nor cancellable from it.
**Limits kept.** The worker's only write to user data is one inbox note. AI calls are capped per room per day on the server. Records are sent to the model marked as data; its output is validated and anything outside the role's allowed kinds is dropped.
**Status.** Proven locally (109 checks). Not applied: needs Egor's confirmation in Supabase.

## ADR-010 · A key per device, and an optional lock (extends ADR-007) · 19 Nov 2026

**Decision.** Keep the shared sync code working. Add device keys as a second way in (extra permissive policies). Add one restrictive policy that only bites for a room that chose to lock key-only access. Locking is a tap from an enrolled device and is undone the same way.
**Why not replace the code outright.** Replacing it is the change that can lock every device out at once. Adding a second way in cannot.
**Not done.** The AI helper function still authenticates by sync code. Cut-over is never automatic.
**Encryption.** Nothing here encrypts the data. The app lock is not encryption.


## ADR-011 · Encryption: a vault for the private stores, not the whole document · 20 Nov 2026

**Decision.** Encrypt on the device, before sync, only the stores that are private and that no server job needs. Do it at the transport edge (a `fetch` wrapper), so the merge code and every screen stay as they are.
**Why not everything.** The server worker, the content scan, the attendance report and the dial guard all read the document on the server. Encrypting it all would switch them off.
**Why a passphrase and not the sync code.** The sync code is known to the server; a key made from it would protect nothing from the server.
**Cost accepted.** No recovery without an open device. Stated on the screen before the switch.
**Claim allowed.** "Private records are end-to-end encrypted between your devices when the vault is on." Not allowed: "War Room is encrypted."
