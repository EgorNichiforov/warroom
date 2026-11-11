/* War Room coach: Cloudflare Worker.
   - scheduled(): places the 05:25 morning call (Europe/Chisinau) through Vapi.
   - POST /vapi: Vapi server URL (tool calls, inbound assistant requests, end-of-call reports).
   - POST /llm/chat/completions: optional custom LLM endpoint (Claude Opus 5.5 via the Anthropic SDK).
   - POST /admin/call, /admin/assistant, GET /admin/brief: operator endpoints, protected by ADMIN_SECRET. */
import { loadState, saveState, loadQueue, buildContext, localNow, setWeight, addCounter, setTop3, setDebrief, appendCall } from './warroom.js';
import { buildAssistant, placeCall, upsertStoredAssistant, listPhoneNumbers } from './vapi.js';
import { handleChatCompletions } from './llm.js';

const CALL_TIME = '05:25';
const WINDOW_MIN = 20; // scheduled() fires at several UTC minutes; only the one landing inside this local window calls.

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(morningCall(env, false)); },
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') return Response.json({ ok: true, mode: env.MODEL_MODE || 'native', now: localNow() });
      if (url.pathname === '/vapi' && request.method === 'POST') return vapiWebhook(request, env);
      if (url.pathname.startsWith('/llm/') && request.method === 'POST') {
        if (request.headers.get('x-warroom-secret') !== env.VAPI_SERVER_SECRET) return new Response('forbidden', { status: 403 });
        return handleChatCompletions(request, env);
      }
      if (url.pathname.startsWith('/admin/')) {
        if (request.headers.get('x-admin-secret') !== env.ADMIN_SECRET) return new Response('forbidden', { status: 403 });
        if (url.pathname === '/admin/brief') return new Response(buildContext(await loadState(env), localNow(), await loadQueue(env).catch(() => null)), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        if (url.pathname === '/admin/call') return Response.json(await morningCall(env, true, url.searchParams.get('kind') || 'morning'));
        if (url.pathname === '/admin/assistant') return Response.json(await upsertStoredAssistant(env));
        if (url.pathname === '/admin/numbers') return Response.json(await listPhoneNumbers(env));
      }
      return new Response('War Room coach', { status: 404 });
    } catch (e) { console.error(e); return Response.json({ error: String(e.message || e) }, { status: 500 }); }
  },
};

async function morningCall(env, force, kind = 'morning') {
  const now = localNow();
  if (!force) {
    const [h, m] = CALL_TIME.split(':').map(Number); const diff = now.min - (h * 60 + m);
    if (diff < 0 || diff >= WINDOW_MIN) return { skipped: true, reason: `local time ${now.hm} outside window` };
    if ((env.SKIP_DAYS || '').split(',').includes(String(now.dow))) return { skipped: true, reason: 'skip day' };
  }
  const [S, Q] = await Promise.all([loadState(env), loadQueue(env).catch(() => null)]);
  if (!force && S.days?.[now.date]?.calls?.some((c) => c.kind === 'morning')) return { skipped: true, reason: 'already called today' };
  const assistant = buildAssistant(env, buildContext(S, now, Q), kind);
  const call = await placeCall(env, assistant);
  appendCall(S, now.date, { kind, id: call.id, at: Date.now(), status: 'placed' });
  await saveState(env, S);
  return { placed: true, id: call.id, kind };
}

async function vapiWebhook(request, env) {
  if (request.headers.get('x-warroom-secret') !== env.VAPI_SERVER_SECRET) return new Response('forbidden', { status: 403 });
  const { message } = await request.json();
  const type = message?.type;
  if (type === 'assistant-request') {
    // Inbound call to the Vapi number (or any call without an assistant): answer as the check-in coach.
    const from = message.customer?.number || message.call?.customer?.number || '';
    if (env.EGOR_PHONE && from && from !== env.EGOR_PHONE) return Response.json({ error: 'This number is private.' });
    const [S, Q] = await Promise.all([loadState(env), loadQueue(env).catch(() => null)]);
    return Response.json({ assistant: buildAssistant(env, buildContext(S, localNow(), Q), 'checkin') });
  }
  if (type === 'tool-calls') {
    const S = await loadState(env); const today = localNow().date; let dirty = false; const results = [];
    for (const tc of message.toolCallList || []) {
      const name = tc.function?.name; let args = tc.function?.arguments || {}; if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
      let result;
      try {
        if (name === 'log_weight') { const kg = Number(args.kg); if (!(kg > 30 && kg < 200)) throw new Error('weight out of range'); result = `saved ${setWeight(S, today, kg)} kg`; dirty = true; }
        else if (name === 'log_dials') { const d = addCounter(S, today, 'dials', Number(args.dials) || 0, args.mode); let s = `dials today now ${d}`; if (args.owner_conversations != null) s += `, owner conversations today now ${addCounter(S, today, 'owners', Number(args.owner_conversations) || 0, args.mode)}`; result = s; dirty = true; }
        else if (name === 'log_bac_minutes') { result = `BAC minutes today now ${addCounter(S, today, 'bac', Number(args.minutes) || 0, args.mode)}`; dirty = true; }
        else if (name === 'set_top3') { result = 'top 3 saved: ' + setTop3(S, today, Array.isArray(args.items) ? args.items : [String(args.items)]).join(' | '); dirty = true; }
        else if (name === 'log_note') { setDebrief(S, today, args); result = 'saved'; dirty = true; }
        else if (name === 'get_status') { result = buildContext(S, localNow(), await loadQueue(env).catch(() => null)); }
        else result = `unknown tool ${name}`;
      } catch (e) { result = 'error: ' + (e.message || e); }
      results.push({ name, toolCallId: tc.id, result: String(result) });
    }
    if (dirty) await saveState(env, S);
    return Response.json({ results });
  }
  if (type === 'end-of-call-report') {
    try {
      const S = await loadState(env); const today = localNow().date; const kind = message.assistant?.metadata?.kind || message.call?.assistant?.metadata?.kind || 'call';
      appendCall(S, today, { kind, id: message.call?.id, at: Date.now(), status: 'ended', endedReason: message.endedReason, seconds: message.durationSeconds ?? null, summary: (message.analysis?.summary || message.summary || '').slice(0, 600) });
      await saveState(env, S);
    } catch (e) { console.error('end-of-call-report', e); }
    return Response.json({ ok: true });
  }
  return Response.json({ ok: true });
}
