/* War Room state helpers for the coach worker.
   Reads and writes the same JSON blob the phone app syncs to Supabase (table warroom_sync). */

export const TZ = 'Europe/Chisinau';
const DAY_LONG = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const WK = [1, 2, 3, 4, 5];

/* ── dates (all as 'YYYY-MM-DD' strings in Egor's time zone) ── */
export function localNow(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = p.hour === '24' ? '00' : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${hour}:${p.minute}`, min: Number(hour) * 60 + Number(p.minute), dow: DOW[p.weekday] };
}
export function addDays(k, n) { const [y, m, d] = k.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
export function dowOf(k) { const [y, m, d] = k.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 ? 7 : w; }
export function monday(k) { return addDays(k, -(dowOf(k) - 1)); }
export function daysUntil(k, today) { const [y, m, d] = k.split('-').map(Number); const [y2, m2, d2] = today.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y2, m2 - 1, d2)) / 864e5); }
export function fmtDay(k) { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
const tmin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };

/* ── Supabase row ── */
function headers(env) { return { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + env.SUPABASE_KEY, 'x-warroom-key': env.WARROOM_SYNC_CODE, 'Content-Type': 'application/json' }; }
export async function loadState(env) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(env.WARROOM_SYNC_CODE)}&select=data`, { headers: headers(env) });
  if (!r.ok) throw new Error('supabase read ' + r.status);
  const rows = await r.json();
  if (!rows.length || !rows[0].data) throw new Error('no War Room data under this sync code yet');
  return rows[0].data;
}
export async function saveState(env, S) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/warroom_sync`, { method: 'POST', headers: { ...headers(env), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: env.WARROOM_SYNC_CODE, data: S, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error('supabase write ' + r.status);
}

/* ── day records ── */
export function day(S, k) {
  if (!S.days) S.days = {};
  if (!S.days[k]) S.days[k] = { _u: 0, routine: {}, habits: {}, counters: {}, top3: [{ t: '', d: 0 }, { t: '', d: 0 }, { t: '', d: 0 }] };
  const o = S.days[k];
  for (const f of ['routine', 'habits', 'counters']) if (!o[f]) o[f] = {};
  if (!o.top3) o.top3 = [{ t: '', d: 0 }, { t: '', d: 0 }, { t: '', d: 0 }];
  return o;
}
const touch = (o) => { o._u = Date.now(); };
const rState = (o, id) => { const v = o?.routine?.[id]; if (typeof v === 'string' && v.startsWith('skip')) return 'skip'; return v ? 'done' : ''; };

export function setWeight(S, k, kg) { const o = day(S, k); o.weight = Math.round(kg * 10) / 10; delete o.weightSkipped; (S.routines?.morning || []).filter((r) => r.link === 'weight').forEach((r) => (o.routine[r.id] = 1)); touch(o); return o.weight; }
export function addCounter(S, k, id, n, mode = 'add') { const o = day(S, k); const cur = Number(o.counters[id]) || 0; o.counters[id] = Math.max(0, mode === 'set' ? n : cur + n); touch(o); return o.counters[id]; }
export function setTop3(S, k, items) { const o = day(S, k); items.slice(0, 3).forEach((t, i) => { o.top3[i] = { t: String(t).trim(), d: o.top3[i]?.t === String(t).trim() ? o.top3[i].d : 0 }; }); touch(o); return o.top3.filter((x) => x.t).map((x) => x.t); }
export function setDebrief(S, k, f) { const o = day(S, k); for (const key of ['win', 'loss', 'fix']) if (f[key]) o[key] = String(f[key]); touch(o); }
export function appendCall(S, k, entry) { const o = day(S, k); if (!o.calls) o.calls = []; o.calls.push(entry); touch(o); }

/* ── derived numbers (same rules as the app) ── */
function routineFor(list, k) { const w = dowOf(k); return (list || []).filter((r) => !r.days || r.days.includes(w)); }
export function dayScore(S, k) {
  const o = S.days?.[k] || { routine: {}, habits: {}, counters: {}, top3: [] }; let tot = 0, done = 0;
  routineFor(S.routines?.morning, k).concat(routineFor(S.routines?.evening, k)).forEach((r) => { const st = rState(o, r.id); if (st === 'skip') return; tot++; if (st === 'done') done++; });
  (S.habits?.items || []).forEach((h) => { tot++; if (o.habits?.[h.id]) done++; });
  (S.counters?.items || []).forEach((c) => { const tg = c.targets?.[dowOf(k)] || 0; if (tg > 0) { tot++; if ((Number(o.counters?.[c.id]) || 0) >= tg) done++; } });
  (o.top3 || []).forEach((x) => { if (x.t) { tot++; if (x.d) done++; } });
  return tot ? Math.round((done / tot) * 100) : 0;
}
export function minimumMet(S, k) {
  const o = S.days?.[k], st = S.settings || {}, w = dowOf(k);
  const dials = Number(o?.counters?.dials) || 0, bac = Number(o?.counters?.bac) || 0;
  const needDials = WK.includes(w) ? (st.minDials || 0) : 0, needBac = st.minBac || 0;
  return { met: dials >= needDials && bac >= needBac, dials, bac, needDials, needBac };
}
export function gradeFor(S, k, today) { const sc = dayScore(S, k); let g = sc >= 85 ? 'A' : sc >= 70 ? 'B' : sc >= 50 ? 'C' : sc >= 30 ? 'D' : 'F'; if (k < today && S.days?.[k] && !minimumMet(S, k).met && 'ABC'.includes(g)) g = 'D'; return g; }
export function counterWeek(S, id, k) { const m = monday(k); let s = 0; for (let i = 0; i < 7; i++) s += Number(S.days?.[addDays(m, i)]?.counters?.[id]) || 0; return s; }
export function counterTotal(S, id) { let s = 0; for (const k in S.days || {}) s += Number(S.days[k].counters?.[id]) || 0; return s; }
export function dayTrained(o) { if (!o) return false; const ss = o.workouts || (o.workout ? [o.workout] : []); return ss.some((s) => s && s.done); }
export function workoutsWeek(S, k) { const m = monday(k); let n = 0; for (let i = 0; i < 7; i++) if (dayTrained(S.days?.[addDays(m, i)])) n++; return n; }
export function blocksFor(S, k) { const w = dowOf(k), sc = S.days?.[k]?.sched; let list = (S.schedule?.blocks || []).filter((b) => b.days?.includes(w)); if (sc) { const skip = new Set(sc.skip || []); list = list.filter((b) => !skip.has(b.id)).concat(sc.add || []); } return list.sort((a, b) => tmin(a.start) - tmin(b.start)); }
export function weightEntries(S) { return Object.keys(S.days || {}).filter((k) => S.days[k].weight != null && S.days[k].weight !== '').sort().map((k) => ({ k, w: Number(S.days[k].weight) })); }
export function avgWeight(S, days, endKey) { const start = addDays(endKey, -(days - 1)); const e = weightEntries(S).filter((x) => x.k >= start && x.k <= endKey); return e.length ? e.reduce((a, b) => a + b.w, 0) / e.length : null; }
export function stakesOwed(S) { return Object.values(S.stakes || {}).filter((s) => !s.paid && !s.waived).reduce((a, s) => a + (s.amount || 0), 0); }
function streak(S, today, pred) { let k = today; if (!pred(k)) k = addDays(k, -1); let n = 0; while (n < 3650 && pred(k)) { n++; k = addDays(k, -1); } return n; }
export const streakWeigh = (S, today) => streak(S, today, (k) => { const o = S.days?.[k]; return !!(o && o.weight != null && o.weight !== ''); });
export const streakMinimum = (S, today) => streak(S, today, (k) => { const o = S.days?.[k]; return !!o && minimumMet(S, k).met && !!(Number(o.counters?.dials) || Number(o.counters?.bac)); });
const f1 = (n) => (n == null ? '—' : Number(n).toFixed(1));

/* ── call queue + pipeline (separate row: <code>:queue, written by the Dial tab) ── */
const PLANS = { pb: ['Priority Bench', 1500], ms: ['Multi-site', 3000], pw: ['Pay When They Work', 0] };
export async function loadQueue(env) {
  const key = env.WARROOM_SYNC_CODE + ':queue';
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(key)}&select=data`, { headers: { ...headers(env), 'x-warroom-key': key } });
  if (!r.ok) return null; const rows = await r.json(); return rows[0]?.data || null;
}
export function pipelineLine(Q, today) {
  const items = Q?.items ? Object.values(Q.items).filter((x) => !x._del) : []; if (!items.length) return '';
  const members = items.filter((x) => x.status === 'member'), trials = items.filter((x) => x.status === 'trial');
  const mrr = members.reduce((a, x) => a + (PLANS[x.plan] ? PLANS[x.plan][1] : 0), 0);
  const due = items.filter((x) => x.next_at && x.next_at <= today && !['member', 'bad'].includes(x.status));
  const fresh = items.filter((x) => x.status === 'new').length;
  return `Pipeline: MRR $${mrr.toLocaleString('en-US')} (${members.length} member${members.length === 1 ? '' : 's'}), ${trials.length} trial${trials.length === 1 ? '' : 's'}, ${due.length} callback${due.length === 1 ? '' : 's'} due${due.length ? ': ' + due.slice(0, 4).map((x) => x.agency).join(', ') : ''}, ${fresh} fresh numbers in the queue.`;
}

/* ── the brief the coach reads before every call ── */
export function buildContext(S, now = localNow(), Q = null) {
  const today = now.date, y = addDays(today, -1), w = now.dow, st = S.settings || {};
  const od = S.days?.[today] || {}, oy = S.days?.[y];
  const dialsC = (S.counters?.items || []).find((c) => c.id === 'dials'), bacC = (S.counters?.items || []).find((c) => c.id === 'bac');
  const L = [];
  L.push(`Now: ${fmtDay(today)} ${now.hm} (${TZ}).`);
  if (oy) {
    const m = minimumMet(S, y);
    L.push(`Yesterday (${fmtDay(y)}): grade ${gradeFor(S, y, today)} (${dayScore(S, y)}%). Dials ${m.dials}${dialsC ? '/' + (dialsC.targets?.[dowOf(y)] || 0) : ''}, owner conversations ${Number(oy.counters?.owners) || 0}, BAC ${m.bac}${bacC ? '/' + (bacC.targets?.[dowOf(y)] || 0) : ''} min, weight ${oy.weight ? f1(oy.weight) + ' kg' : 'not logged'}. Minimum day ${m.met ? 'met' : 'MISSED'}. Shutdown ${oy.shutdownAt ? 'done' : 'not done'}.${oy.win ? ` Win: ${oy.win}.` : ''}${oy.loss ? ` Loss: ${oy.loss}.` : ''}${oy.fix ? ` Fix: ${oy.fix}.` : ''}`);
  } else L.push(`Yesterday (${fmtDay(y)}): nothing logged.`);
  const owed = stakesOwed(S); const missed = Object.values(S.stakes || {}).filter((s) => !s.paid && !s.waived).length;
  L.push(`Stakes owed: ${owed} ${st.currency || 'MDL'}${missed ? ` (${missed} missed day${missed > 1 ? 's' : ''})` : ''}. Minimum day rule: ${st.minDials || 0} dials Mon–Fri + ${st.minBac || 0} min BAC, ${st.stake || 0} ${st.currency || 'MDL'} per miss.`);
  L.push(`Streaks: weigh-ins ${streakWeigh(S, today)}d, minimum days ${streakMinimum(S, today)}d.`);
  const we = weightEntries(S); const last = we.length ? we[we.length - 1] : null; const a7 = avgWeight(S, 7, today);
  L.push(`Weight: ${last ? `latest ${f1(last.w)} kg (${fmtDay(last.k)}), 7-day avg ${f1(a7)}` : 'no entries yet'}, target ${st.weightTarget || 85} kg by ${st.weightTargetDate || '2027-07-01'}${a7 ? ` (${f1((st.weightTarget || 85) - a7)} kg to go)` : ''}. Weighed in today: ${od.weight ? 'yes, ' + f1(od.weight) + ' kg' : 'no'}.`);
  if (dialsC) { const wk = counterWeek(S, 'dials', today); const rem = [1, 2, 3, 4, 5, 6, 7].filter((x) => x >= w && (dialsC.targets?.[x] || 0) > 0).length; L.push(`Week so far: dials ${wk}/${dialsC.weekly || 225}${rem && dialsC.weekly ? ` (need ${Math.ceil(Math.max(0, dialsC.weekly - wk) / rem)}/day over ${rem} remaining dial day${rem > 1 ? 's' : ''})` : ''}, BAC ${(counterWeek(S, 'bac', today) / 60).toFixed(1)}h/${((bacC?.weekly || 1200) / 60).toFixed(0)}h, training days ${workoutsWeek(S, today)}, owner conversations all time ${counterTotal(S, 'owners')}/100.`); }
  const prog = S.programs?.[S.programByDay?.map?.[w]]; const blocks = blocksFor(S, today);
  const dialBlocks = blocks.filter((b) => b.kind === 'dials').map((b) => `${b.start}–${b.end} ${b.title.replace(/^[^\w]*/, '')}`);
  L.push(`Today (${DAY_LONG[w]}): training ${prog ? prog.name : 'rest'}. Dial target ${dialsC?.targets?.[w] || 0}. BAC target ${bacC?.targets?.[w] || 0} min. Today so far: dials ${Number(od.counters?.dials) || 0}, owners ${Number(od.counters?.owners) || 0}, BAC ${Number(od.counters?.bac) || 0} min.`);
  L.push(`First blocks: ${blocks.slice(0, 5).map((b) => `${b.start} ${b.title}`).join('; ') || 'none'}.${dialBlocks.length ? ` Dial blocks: ${dialBlocks.join('; ')}.` : ''}`);
  const t3 = (od.top3 || []).filter((x) => x.t); L.push(`Top 3 for today: ${t3.length ? t3.map((x, i) => `${i + 1}) ${x.t}${x.d ? ' (done)' : ''}`).join(' ') : 'NOT SET'}.`);
  const due = Object.values(S.tasks || {}).filter((t) => !t._del && !t.done && t.due && t.due <= today).map((t) => t.title); if (due.length) L.push(`Tasks due or overdue: ${due.slice(0, 6).join('; ')}.`);
  const goals = Object.values(S.goals || {}).filter((g) => !g._del && g.horizon === 'long' && g.source === 'manual' && g.target).map((g) => `${g.title}: ${g.current ?? '—'}/${g.target} ${g.unit || ''}`.trim()); if (goals.length) L.push(`Campaign goals: ${goals.join('; ')}.`);
  const pl = pipelineLine(Q, today); if (pl) L.push(pl);
  L.push(`Countdown: ${daysUntil(st.bigDate || '2027-07-01', today)} days to July 1 2027 ($20k MRR), ${daysUntil(st.bacDate || '2027-06-01', today)} days to BAC.`);
  const prevReview = S.reviews?.['w' + addDays(monday(today), -7)]; if (prevReview?.change) L.push(`This week's one change (from the Sunday review): ${prevReview.change}.`);
  return L.join('\n');
}
