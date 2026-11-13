// War Room AI proxy (14 Nov 2026). The AI key (Gemini or Claude) lives only on the server, in public.warroom_secret
// (RLS on, no policies: the browser can never read it). The app sends the AI request here with its sync code in
// x-warroom-key; this checks the code belongs to a real War Room, adds the key and forwards the request.
// Only Google's Generative Language API and Anthropic's Messages API can be reached through it.
// The key is never returned to anyone.
// @ts-nocheck
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-warroom-key', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Expose-Headers': 'x-goog-upload-url' };
const json = (b, s = 200, extra = {}) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } });
const SB = Deno.env.get('SUPABASE_URL'), SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const db = (path, opt = {}) => fetch(`${SB}/rest/v1/${path}`, { ...opt, headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const ALLOW = [/^https:\/\/generativelanguage\.googleapis\.com\/(upload\/)?v1beta\/(models|files)(\/|\?|$)/, /^https:\/\/api\.anthropic\.com\/v1\/messages$/];

async function room(code) {
  if (!code || code.length < 16 || code.includes(':') || code.startsWith('staging-')) return null;
  const r = await db(`warroom_sync?id=eq.${encodeURIComponent(code)}&select=id,ai:data->secrets->ai`);
  if (!r.ok) return null; const rows = await r.json(); return rows[0] || null;
}
async function secret(code, row) {
  const r = await db(`warroom_secret?id=eq.${encodeURIComponent(code)}&select=ai`); const rows = r.ok ? await r.json() : [];
  if (rows[0] && rows[0].ai && rows[0].ai.key) return rows[0].ai;
  // one-time move: a key that is still inside the synced data is copied here
  const ai = row && row.ai; if (ai && ai.key) { await save(code, ai); return ai; }
  return null;
}
async function save(code, ai) {
  const clean = { provider: ai.provider === 'anthropic' ? 'anthropic' : 'gemini', key: String(ai.key || '').trim(), model: String(ai.model || ''), alts: Array.isArray(ai.alts) ? ai.alts.slice(0, 6).map(String) : [] };
  await db('warroom_secret', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: code, ai: clean, updated_at: new Date().toISOString() }) });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const code = req.headers.get('x-warroom-key') || '';
  const row = await room(code); if (!row) return json({ error: 'Unknown War Room. Link this device first (More → Devices & sync).' }, 401);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const op = String(b.op || '');

  if (op === 'status') { const s = await secret(code, row); return json({ server: !!s, provider: s ? s.provider : null, model: s ? s.model : null, alts: s ? s.alts : [], inSync: !!(row.ai && row.ai.key) }); }
  if (op === 'store') { if (!b.key || String(b.key).length < 20) return json({ error: 'That key looks too short' }, 400); await save(code, b); return json({ ok: true }); }
  if (op === 'forget') { await db(`warroom_secret?id=eq.${encodeURIComponent(code)}`, { method: 'DELETE' }); return json({ ok: true }); }
  if (op !== 'call') return json({ error: 'unknown op' }, 400);

  const s = await secret(code, row); if (!s) return json({ error: 'No AI key on the server yet. Add it once in More → Food photo AI.' }, 412);
  const url = String(b.url || ''); if (!ALLOW.some((re) => re.test(url))) return json({ error: 'That address is not allowed through the AI proxy' }, 400);
  const google = url.startsWith('https://generativelanguage.googleapis.com/');
  if (google && s.provider !== 'gemini') return json({ error: 'The saved key is a Claude key; this needs a Gemini key' }, 412);
  if (!google && s.provider !== 'anthropic') return json({ error: 'The saved key is a Gemini key; this needs a Claude key' }, 412);
  const h = {}; for (const [k, v] of Object.entries(b.headers || {})) { const lk = k.toLowerCase(); if (/^(content-type|x-goog-upload-[a-z-]+|anthropic-version)$/.test(lk)) h[k] = String(v); }
  if (google) h['x-goog-api-key'] = s.key; else { h['x-api-key'] = s.key; h['anthropic-version'] = h['anthropic-version'] || '2023-06-01'; }
  const method = b.method === 'GET' ? 'GET' : 'POST';
  let up; try { up = await fetch(url, { method, headers: h, body: method === 'GET' ? undefined : (b.body == null ? undefined : String(b.body)) }); }
  catch (e) { return json({ error: 'Could not reach the AI service: ' + String(e && e.message || e).slice(0, 160) }, 502); }
  const text = await up.text(); const out = { ...CORS, 'Content-Type': up.headers.get('content-type') || 'application/json' };
  const uu = up.headers.get('x-goog-upload-url'); if (uu) out['x-goog-upload-url'] = uu;
  return new Response(text.split(s.key).join('[key]'), { status: up.status, headers: out });
});
