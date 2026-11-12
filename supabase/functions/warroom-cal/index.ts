// War Room calendar bridge. The app sends the private iCal address of the user's Google Calendar;
// this fetches it server-side (browsers can't, no CORS) and returns the next weeks as plain JSON.
// Only Google Calendar iCal addresses are accepted, so this cannot be used to fetch anything else.
// @ts-nocheck
import ICAL from 'npm:ical.js@2.1.0';
import { expandIcs } from './expand.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-warroom-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const url = String(body.url || '').trim().replace(/^webcal:/, 'https:');
  const m = url.match(/^https:\/\/calendar\.google\.com\/calendar\/ical\/([^/]+)\/(private-[a-f0-9]+|public)\/basic\.ics$/);
  if (!m) return json({ error: 'Not a Google Calendar iCal address. It should start with https://calendar.google.com/calendar/ical/ and end with /basic.ics' }, 400);
  const days = Math.min(Math.max(Number(body.days) || 21, 1), 60), back = Math.min(Math.max(Number(body.back) || 2, 0), 14);
  const tz = String(body.tz || 'Europe/Chisinau');
  const r = await fetch(url, { headers: { 'User-Agent': 'WarRoom/5' } });
  if (!r.ok) return json({ error: r.status === 404 ? 'Google says this address does not exist. Copy the secret address again (it changes if you reset it).' : 'Google answered ' + r.status }, 502);
  const text = await r.text();
  const now = Date.now(), from = now - back * 864e5, to = now + days * 864e5;
  try {
    const events = expandIcs(ICAL, text, from, to, tz, decodeURIComponent(m[1]));
    return json({ at: now, tz, from, to, events });
  } catch (e) { return json({ error: 'Could not read the calendar: ' + String(e && e.message || e).slice(0, 200) }, 500); }
});
