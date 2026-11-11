# War Room coach

A phone-call accountability partner for Egor, on top of the War Room data.

- **05:25 every morning** a real phone call: yesterday's scoreboard, weigh-in, today's non-negotiables, top 3, first action. Under three minutes.
- **Call coach** button in the app: a voice call in the browser whenever he needs it (no phone bill).
- **He can also phone the number** and get the same coach (optional, needs a Twilio number).
- Everything the coach hears is logged straight into War Room (weight, dials, owner conversations, BAC minutes, top 3, debrief).

## How it works

```
Cloudflare Worker (this folder)                      Vapi (voice platform)
  cron 05:25 Europe/Chisinau ──► reads War Room ──► POST /call with the morning prompt ──► Twilio ──► Egor's phone
  POST /vapi  ◄─────────────── tool calls (log_weight, log_dials, …), end-of-call report
  POST /vapi  ◄─────────────── assistant-request when Egor phones the number
  POST /llm/… ◄─────────────── optional: Claude Opus 5.5 through the Anthropic SDK (MODEL_MODE=custom)
Supabase warroom_sync row  ◄──► the same row the phone app syncs
```

Default model mode is `native`: Vapi calls Anthropic itself (its list currently tops out at `claude-opus-4-6`), so no Anthropic key is needed. `MODEL_MODE=custom` routes the model through this worker's `/llm` endpoint and the official Anthropic SDK on `claude-opus-5-5` (needs `ANTHROPIC_API_KEY`).

## One-time setup (about 30 minutes)

1. **Accounts**: Cloudflare (free), Vapi (free credits to start), Twilio (pay as you go; needed only for real phone calls, because free Vapi numbers cannot call outbound or internationally).
2. **Twilio**: buy a number (a US number is fine), enable international calling for Moldova in Voice → Geo permissions. Import it into Vapi: Dashboard → Phone Numbers → Import from Twilio.
3. **Deploy the worker** from this folder:
   ```
   npm install
   npx wrangler login
   npx wrangler deploy            # prints the workers.dev URL
   ```
   Put that URL in `wrangler.toml` as `PUBLIC_URL`, then set the secrets:
   ```
   npx wrangler secret put VAPI_API_KEY
   npx wrangler secret put VAPI_PHONE_NUMBER_ID   # GET /admin/numbers lists them once VAPI_API_KEY is set
   npx wrangler secret put EGOR_PHONE             # +373…
   npx wrangler secret put WARROOM_SYNC_CODE      # from the app, More → Sync
   npx wrangler secret put VAPI_SERVER_SECRET     # any long random string
   npx wrangler secret put ADMIN_SECRET           # any long random string
   npx wrangler deploy
   ```
4. **Create the stored assistant** (for the in-app button and inbound calls):
   ```
   curl -X POST https://<worker>/admin/assistant -H "x-admin-secret: …"
   ```
   Copy the returned `id` into `VAPI_ASSISTANT_ID` (secret) and into the app: More → Coach → Assistant id, together with the Vapi **public** key.
5. **Inbound calls** (optional): in Vapi, open the imported number and point its Server URL at `https://<worker>/vapi` with header `x-warroom-secret: <VAPI_SERVER_SECRET>`, and leave its assistant empty. The worker answers each inbound call with a fresh check-in prompt, and only picks up for `EGOR_PHONE`.
6. **Test**: `curl -X POST https://<worker>/admin/call -H "x-admin-secret: …"` places the morning call right now.

## Operating

- `GET /admin/brief` shows exactly what the coach will read before the next call.
- `SKIP_DAYS = "7"` in `wrangler.toml` skips Sundays, or any ISO weekday list.
- Change the call time with `CALL_TIME` in `src/worker.js` and the crons in `wrangler.toml` (UTC; both winter and summer offsets are listed so it stays at 05:25 local).
- The persona and the call scripts live in `src/prompt.js`. Edit the text, redeploy.
- `npm test` runs the unit tests. `node test/live.mjs brief|tools|assistant-request|call` runs the worker handler locally against the real Supabase row using `.dev.vars` (never commit that file).

## Cost (rough)

Vapi platform ≈ $0.05–0.10 per minute plus the voice model, Twilio to a Moldovan mobile ≈ $0.30–0.45 per minute. A 3-minute morning call every day is roughly $1–1.5 a day. The in-app button has no telephony cost.
