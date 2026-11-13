/* War Room v5 · Command layer (14 Nov 2026, War Room 7.0 phase 2 slice).
   1. Follow-up Radar: every agency that is waiting on YOU, straight from the call queue (one record per agency, no copies).
   2. Open Loops: radar + new caregiver applicants + overdue tasks, each with DO / WAIT / CLOSE and a next action.
   3. Commander's Briefing: deterministic numbers from stored data only, the bottleneck with sample sizes, 3 orders.
   Nothing here invents a number: when data is missing it says so. */
'use strict';

const RADAR_INTEREST = ['owner', 'booked', 'bulletin', 'trial'];
function lastTouch(x) { const l = (x.log || [])[x.log ? x.log.length - 1 : -1]; return l ? l.at.slice(0, 10) : (x.last_dial_at || '').slice(0, 10); }
function daysSince(k) { if (!k) return null; return Math.round((pd(dk(new Date())) - pd(k)) / 864e5); }
/* every queue item that needs a decision from me, with the reason and the kind */
function radarItems() {
  if (!Q) return []; const tk = dk(new Date()), out = [];
  qItems().forEach((x) => {
    const lt = lastTouch(x), since = daysSince(lt), na = x.next_at || '';
    if (x.status === 'callback' && na && na <= tk) out.push({ x, kind: 'overdue', rank: na < tk ? 0 : 1, why: na < tk ? `callback was due ${fmtShort(pd(na))}` : 'callback due today' });
    else if (RADAR_INTEREST.includes(x.status) && (!na || na < tk)) out.push({ x, kind: 'nonext', rank: 2, why: `${x.status === 'bulletin' ? 'on the Bulletin' : x.status === 'trial' ? 'case open' : x.status === 'booked' ? 'case call booked' : 'owner talked'}, no next step${na ? ' (was ' + fmtShort(pd(na)) + ')' : ''}` });
    else if (RADAR_INTEREST.includes(x.status) && since != null && since >= 10) out.push({ x, kind: 'quiet', rank: 3, why: `interested, quiet for ${since} days` });
    else if (['gatekeeper', 'voicemail'].includes(x.status) && (x.attempts || 0) >= 3) out.push({ x, kind: 'stuck', rank: 4, why: `${x.attempts} tries, still ${x.status === 'gatekeeper' ? 'the gatekeeper' : 'voicemail'}: email or close` });
  });
  return out.sort((a, b) => a.rank - b.rank || String(a.x.next_at || '').localeCompare(String(b.x.next_at || '')));
}
function upcomingCases() { if (!Q) return []; const tk = dk(new Date()), wk = dk(addDays(new Date(), 7)); return qItems().filter((x) => RADAR_INTEREST.includes(x.status) && x.next_at && x.next_at >= tk && x.next_at <= wk).sort((a, b) => a.next_at.localeCompare(b.next_at)); }

/* actions: each keeps the agency as the single record and writes a log line, so history stays traceable */
let radarUndo = null;
function radarAct(id, act) {
  const x = Q && Q.items[id]; if (!x) return; const prev = { status: x.status, next_at: x.next_at || '', next_step: x.next_step || '' };
  const tk = dk(new Date());
  if (act === 'snooze') { x.next_at = dk(addDays(new Date(), 2)); if (x.status === 'new') x.status = 'callback'; x.next_step = x.next_step || 'Follow up'; }
  if (act === 'tomorrow') { x.next_at = dk(addDays(new Date(), 1)); x.next_step = x.next_step || 'Follow up'; }
  if (act === 'close') { x.status = 'no'; x.next_at = ''; }
  if (act === 'call') { dialPick = x.id; benchMode = 'owners'; show('dial'); window.scrollTo(0, 0); return; }
  x.log = x.log || []; x.log.push({ at: new Date().toISOString(), r: act === 'close' ? 'Closed from the radar' : 'Next step moved to ' + x.next_at, note: '', day: tk, d: { dials: 0, owners: 0 }, prev }); x._u = now();
  radarUndo = { id, prev, at: x.log[x.log.length - 1].at }; qSave(); render();
  toast(act === 'close' ? `${x.agency}: closed · tap Undo on the radar to bring it back` : `${x.agency}: next step ${fmtShort(pd(x.next_at))}`);
}
function radarUndoLast() { const u = radarUndo; if (!u) return; const x = Q.items[u.id]; if (!x) return; Object.assign(x, u.prev); x.log = (x.log || []).filter((l) => l.at !== u.at); x._u = now(); radarUndo = null; qSave(); render(); toast('Undone'); }

function radarRow(r) {
  const x = r.x, tag = { overdue: 'bad', nonext: 'acc', quiet: 'purple', stuck: 'muted' }[r.kind];
  return `<div class="kv" style="align-items:flex-start;gap:8px"><div class="grow" style="min-width:0"><div class="small" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.agency)}</div><div class="xs ${tag}">${esc(r.why)}${x.next_step ? ' · ' + esc(x.next_step) : ''}</div></div>
    <div class="row" style="gap:4px;flex-shrink:0"><button class="btn sm primary" onclick="radarAct(${x.id},'call')">Call</button><button class="btn sm" onclick="radarAct(${x.id},'snooze')">+2d</button>${r.kind === 'stuck' || r.kind === 'quiet' ? `<button class="btn sm" onclick="radarAct(${x.id},'close')">Close</button>` : ''}</div></div>`;
}
function radarCard(limit) {
  if (!Q) return ''; const rs = radarItems(), up = upcomingCases(); if (!rs.length && !up.length) return '';
  const n = (k) => rs.filter((r) => r.kind === k).length;
  return `<div class="card" style="border-color:rgba(255,79,94,.35)"><div class="card-h"><div class="card-t">📡 Follow-up radar</div><div class="card-r">${[n('overdue') && `<b class="bad">${n('overdue')}</b> overdue`, n('nonext') && `${n('nonext')} no next step`, n('quiet') && `${n('quiet')} gone quiet`, n('stuck') && `${n('stuck')} stuck`].filter(Boolean).join(' · ')}</div></div>
    <div class="xs muted" style="margin-bottom:6px">People who already talked to you come before new dials. One record per agency; every action is logged and can be undone.</div>
    ${rs.slice(0, limit || 8).map(radarRow).join('')}${rs.length > (limit || 8) ? `<div class="xs muted" style="margin-top:6px">+ ${rs.length - (limit || 8)} more</div>` : ''}
    ${up.length ? `<div class="sec-h">Coming up (7 days)</div>${up.slice(0, 5).map((x) => `<div class="kv"><span class="small">${esc(x.agency)}</span><span class="xs muted">${fmtShort(pd(x.next_at))}${x.next_step ? ' · ' + esc(x.next_step) : ''}</span></div>`).join('')}` : ''}
    ${radarUndo ? `<button class="btn sm" style="margin-top:8px" onclick="radarUndoLast()">Undo last radar action</button>` : ''}</div>`;
}

/* ───────── Open loops: everything waiting on me, in one place ───────── */
function openLoops() {
  const L = []; const tk = dk(new Date());
  radarItems().forEach((r) => L.push({ state: r.kind === 'stuck' ? 'CLOSE' : 'DO', area: 'Agency', title: r.x.agency, why: r.why, act: `radarAct(${r.x.id},'call')` }));
  upcomingCases().forEach((x) => L.push({ state: 'WAIT', area: 'Agency', title: x.agency, why: `${x.next_step || 'next step'} on ${fmtShort(pd(x.next_at))}`, act: `radarAct(${x.id},'call')` }));
  if (typeof bItems === 'function') bItems().filter((c) => c.status === 'new').forEach((c) => { const h = c.created_at ? Math.round((now() - new Date(c.created_at).getTime()) / 3600000) : null; L.push({ state: 'DO', area: 'Caregiver', title: c.name || 'Applicant', why: `new applicant${h != null ? ', ' + (h < 48 ? h + ' h' : Math.round(h / 24) + ' days') + ' waiting' : ''}${c.town ? ' · ' + c.town : ''}`, act: `benchMode='caregivers';show('dial')` }); });
  tasksList().filter((t) => !t.done && t.due && t.due < tk).forEach((t) => L.push({ state: 'DO', area: 'Task', title: t.title, why: 'overdue since ' + fmtShort(pd(t.due)), act: `show('tasks')` }));
  return L;
}
function openLoopsCard() {
  const L = openLoops(); if (!L.length) return '';
  const c = (s) => L.filter((x) => x.state === s).length, col = { DO: 'bad', WAIT: 'muted', CLOSE: 'purple' };
  return `<div class="card"><div class="card-h"><div class="card-t">🔁 Open loops</div><div class="card-r"><b>${c('DO')}</b> do · ${c('WAIT')} wait · ${c('CLOSE')} close</div></div>
    ${L.slice(0, 6).map((x) => `<div class="kv" style="cursor:pointer" onclick="${x.act}"><span class="small"><span class="xs ${col[x.state]}" style="font-weight:700;display:inline-block;width:44px">${x.state}</span>${esc(x.area)} · ${esc(x.title)}</span><span class="xs muted" style="text-align:right;max-width:45%">${esc(x.why)}</span></div>`).join('')}
    ${L.length > 6 ? `<div class="xs muted" style="margin-top:6px">+ ${L.length - 6} more in Dial → radar, Bench and Tasks</div>` : ''}</div>`;
}

/* ───────── Commander's Briefing ───────── */
function funnelCounts() {
  const items = Q ? qItems() : [], logs = items.flatMap((x) => x.log || []);
  const dials = Math.max(counterTotal('dials'), logs.filter((l) => !l.d || l.d.dials).length);
  const owners = Math.max(counterTotal('owners'), logs.filter((l) => l.d && l.d.owners).length);
  const interested = items.filter((x) => RADAR_INTEREST.concat(['member']).includes(x.status) && x.status !== 'bulletin').length;
  const bulletin = items.filter((x) => x.status === 'bulletin').length;
  const cases = items.filter((x) => ['trial', 'member'].includes(x.status) || (x.placements || []).length).length;
  const worked = items.reduce((a, x) => a + (x.placements || []).length, 0);
  const clients = items.filter((x) => x.status === 'member').length;
  return { dials, owners, interested, bulletin, cases, worked, clients };
}
/* the weakest stage, only when the sample is big enough to say anything */
function bottleneck(f) {
  const od = radarItems().filter((r) => r.kind === 'overdue' || r.kind === 'nonext').length;
  if (od) return { stage: 'Follow-up', why: `${od} ${od === 1 ? 'agency is' : 'agencies are'} waiting on you (callbacks due or talks with no next step). More dials won't help until they hear back.`, n: od };
  const bench = typeof bItems === 'function' ? bItems().filter((c) => ['screened', 'hot'].includes(c.status)).length : 0;
  if (f.interested > 0 && bench < 3) return { stage: 'Delivery', why: `${f.interested} interested ${f.interested === 1 ? 'owner' : 'owners'} but only ${bench} screened caregivers. Supply is the limit.`, n: bench };
  if (f.dials < 300) return { stage: 'Not enough data', why: `${f.dials} dials logged. Below 300 no stage can be called the bottleneck; the honest answer is: dial and log every call.`, n: f.dials };
  const r = (a, b) => (b ? a / b : 0), plan = [['Pickup → owner', r(f.owners, f.dials), 0.025, f.dials], ['Owner → interested', r(f.interested + f.bulletin, f.owners), 0.15, f.owners], ['Interested → case', r(f.cases, f.interested), 0.4, f.interested], ['Case → worked', r(f.worked, f.cases), 0.35, f.cases]];
  const ok = plan.filter((p) => p[3] >= 20); if (!ok.length) return { stage: 'Not enough data', why: 'No stage has 20+ attempts yet.', n: 0 };
  const worst = ok.map((p) => ({ p, gap: p[1] / p[2] })).sort((a, b) => a.gap - b.gap)[0].p;
  return { stage: worst[0], why: `${Math.round(worst[1] * 1000) / 10}% vs the plan's ${worst[2] * 100}% (${worst[3]} tries).`, n: worst[3] };
}
function briefingCard(d) {
  const y = addDays(d, -1), yk = dk(y), yo = S.days[yk], yd = yo ? Number((yo.counters || {}).dials) || 0 : 0, yt = dialTargetFor(y), yow = yo ? Number((yo.counters || {}).owners) || 0 : 0;
  const dc = counterDef('dials'), wk = counterWeek('dials', d), wkT = dc ? dc.weekly : 0, need = dc ? paceNeed(dc, d) : null;
  const f = funnelCounts(), bn = bottleneck(f), rs = radarItems(), bench = typeof bItems === 'function' ? bItems().filter((c) => ['screened', 'hot'].includes(c.status)).length : null;
  const nb = blocksFor(d).find((b) => b.kind === 'dials' && tmin(b.end) > nowMin());
  const st = !yt ? '' : yd >= yt ? '<b class="ok">HIT</b>' : yd >= 10 ? '<b class="acc">FLOOR</b>' : '<b class="bad">MISSED</b>';
  const orders = [];
  if (rs.length) orders.push(`Clear the radar first: ${rs.slice(0, 2).map((r) => esc(r.x.agency)).join(', ')}${rs.length > 2 ? ` + ${rs.length - 2}` : ''}.`);
  if (nb) orders.push(`${nb.start}: ${esc(nb.title)}. First dial inside 2 minutes.`); else if (dialTargetFor(d)) orders.push(`No dial block left on the calendar today: ${dialTargetFor(d)} dials still count.`);
  if (bench != null && bench < 15 && dk(d) <= '2026-11-30') orders.push(`Bench ${bench}/15: screen ${Math.min(3, 15 - bench)} caregivers today.`);
  return `<div class="card ac"><div class="card-h"><div class="card-t">🎖 Commander's briefing</div><div class="card-r">${fmtShort(d)}</div></div>
    <div class="small">${yo ? `Yesterday: <b>${yd}</b>${yt ? '/' + yt : ''} dials ${st} · ${yow} owner talk${yow === 1 ? '' : 's'}.` : 'Yesterday was not logged.'} Week: <b>${wk}</b>/${wkT}${need != null && wk < wkT ? ` · ${need} a day to finish` : wk >= wkT && wkT ? ' ✓' : ''}.</div>
    <div class="small" style="margin-top:6px"><span class="muted">Bottleneck:</span> <b>${esc(bn.stage)}</b>. ${bn.why}</div>
    ${orders.length ? `<div class="sec-h">Orders</div>${orders.map((o, i) => `<div class="small" style="padding:3px 0"><b>${i + 1}.</b> ${o}</div>`).join('')}` : ''}
    <div class="xs muted" style="margin-top:6px">Every number above comes from your log: ${f.dials} dials, ${f.owners} owner talks, ${f.interested} interested, ${f.cases} cases, ${f.worked} caregivers worked.</div></div>`;
}

/* ───────── System status: is everything that should work actually working ───────── */
let aiServerState = null;
async function aiServerCheck() { if (!syncReady()) { aiServerState = { err: 'not linked' }; return; } try { const r = await aiProxy({ op: 'status' }); aiServerState = await r.json().catch(() => ({ err: 'HTTP ' + r.status })); if (!r.ok) aiServerState = { err: aiServerState.error || 'HTTP ' + r.status }; } catch (e) { aiServerState = { err: String(e.message || e).slice(0, 80) }; } render(); }
function statusCard() {
  const row = (ok, label, val) => `<div class="kv"><span>${ok === true ? '<span class="ok">●</span>' : ok === false ? '<span class="bad">●</span>' : '<span class="muted">●</span>'} ${label}</span><span class="small muted" style="text-align:right">${val}</span></div>`;
  const ss = syncSummary(), ai = aiCfg(), a = aiServerState, lastExp = S.settings.lastExport ? agoText(S.settings.lastExport) : 'never';
  const qn = Q ? qItems().length : 0, open = Q ? qItems().filter((x) => Q_OPEN.includes(x.status) && x.phone).length : 0;
  return `<div class="card"><div class="card-h"><div class="card-t">System status</div><div class="card-r">v${APP_VERSION}${typeof NATIVE !== 'undefined' && NATIVE ? ' · Android app' : ''}</div></div>
    ${row(syncReady() && syncState.status !== 'err', 'Sync', esc(ss.short))}
    ${row(ai.key ? true : false, 'AI key', !ai.key ? 'off' : ai.server ? 'on the server (not in synced data)' : 'this device only')}
    ${row(a ? (a.server === true ? true : a.err ? false : null) : null, 'AI server check', a ? (a.err ? esc(a.err) : a.server ? 'key present · ' + esc(a.provider || '') + (a.inSync ? ' · old copy still in sync data' : '') : 'no key on the server') : `<a href="#" onclick="aiServerCheck();return false">check now</a>`)}
    ${row(typeof calOn === 'function' && calOn() ? calState.status !== 'err' : null, 'Calendar', typeof calOn === 'function' && calOn() ? (calState.status === 'err' ? esc(calState.msg) : 'connected') : 'off')}
    ${row(typeof tdOn === 'function' && tdOn() ? true : null, 'Todoist', typeof tdOn === 'function' && tdOn() ? 'connected' : 'off on this device')}
    ${row(qn ? true : false, 'Call queue', `${qn} agencies · ${open} open with a phone`)}
    ${row(B ? true : null, 'Bench', B ? bItems().length + ' caregivers' : 'loading')}
    ${row(S.settings.lastExport && now() - S.settings.lastExport < 14 * 864e5 ? true : false, 'Backup file', `last export ${lastExp} · <a href="#" onclick="exportData();return false">export now</a>`)}</div>`;
}
