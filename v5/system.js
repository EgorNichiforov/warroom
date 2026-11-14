/* War Room · system.js (6.5) — system-level ideas taken from professional apps:
   · Time machine (Notion page history / Apple Time Machine): one full copy of the War Room per weekday,
     7 days back, kept in the cloud. Restore any day in two taps; the state before a restore is kept too.
   · Accountability link (Beeminder / stickK / Strava followers): a read-only page with today's dials,
     the week, the minimum-day streak and the stake, for whoever holds you to account. Numbers only, no names.
   · Readiness (Whoop / Oura): one morning score from last night's sleep and yesterday's load, with the
     day it recommends (full, normal, minimum) and a one-tap switch to the minimum day.
   · Nudges (Duolingo / calendar apps): when the app is open, a heads-up 5 minutes before each block and
     at its start, with the block's one job. */
'use strict';

/* ═════════ 1 · TIME MACHINE ═════════ */
function snapKey(slot) { return S.settings.sync.code + ':snap' + slot; }
function snapHdr(key) { const s = S.settings.sync; return { apikey: s.key, Authorization: 'Bearer ' + s.key, 'x-warroom-key': key, 'Content-Type': 'application/json' }; }
function snapSummary(d) { const days = (d.S && d.S.days) || {}; const dials = Object.values(days).reduce((a, o) => a + (Number((o.counters || {}).dials) || 0), 0); const ag = d.Q && d.Q.items ? Object.values(d.Q.items).filter((x) => (x.log || []).length).length : 0; return { dials, days: Object.keys(days).length, called: ag, bench: d.B && d.B.items ? Object.keys(d.B.items).length : 0 }; }
async function snapWrite(slot, why) {
  if (!syncReady()) return false; const s = S.settings.sync, key = snapKey(slot);
  const data = { at: new Date().toISOString(), why: why || 'daily', v: APP_VERSION, S, Q: typeof Q !== 'undefined' ? Q : null, B: typeof B !== 'undefined' ? B : null };
  data.sum = snapSummary(data);
  try { const r = await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(snapHdr(key), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: key, data, updated_at: data.at }) }); return r.ok; } catch (e) { return false; }
}
async function snapDaily() {
  if (!syncReady() || typeof Q === 'undefined' || !Q) return; const k = dk(new Date());
  try { if (localStorage.getItem('wr-snap-day') === k) return; } catch (e) { }
  if (await snapWrite(dow(new Date()), 'daily')) { try { localStorage.setItem('wr-snap-day', k); } catch (e) { } }
}
async function snapList() {
  const s = S.settings.sync, out = [];
  await Promise.all(['1', '2', '3', '4', '5', '6', '7', 'undo', 'manual'].map(async (slot) => { try { const r = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(snapKey(slot))}&select=data->at,data->why,data->sum,data->v`, { headers: snapHdr(snapKey(slot)) }); if (r.ok) { const j = await r.json(); if (j[0] && j[0].at) out.push(Object.assign({ slot }, j[0])); } } catch (e) { } }));
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
async function snapOpen() {
  if (!syncReady()) { toast('Turn on sync first: the time machine lives in the cloud'); return; }
  openModal(`<h2>Time machine</h2><div class="hint">One full copy of your War Room per weekday, 7 days back: days, habits, money, food, every agency and call, the bench. Restoring replaces what is on this device and in the cloud; the current state is saved first as "before restore", so you can go back.</div><div id="snap-list" class="small muted">Loading…</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Close</button><button class="btn primary" onclick="snapNow()">Save a copy now</button></div>`, true);
  const L = await snapList(), el = $('snap-list'); if (!el) return;
  el.innerHTML = L.length ? L.map((x) => `<div class="snap-row"><div><b>${x.slot === 'undo' ? 'Before restore' : x.slot === 'manual' ? 'Saved by hand' : DAY_SHORT[Number(x.slot)] + ' (daily)'}</b><span>${new Date(x.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · v${esc(x.v || '?')}</span><em>${x.sum ? `${fmt(x.sum.dials)} dials · ${x.sum.days} days · ${x.sum.called} agencies called · ${x.sum.bench} caregivers` : ''}</em></div><button class="btn sm" onclick="snapRestore('${x.slot}',this)">Restore</button></div>`).join('') : 'No copies yet. The first one is saved today, then one a day.';
}
async function snapNow() { toast('Saving a copy…'); toast((await snapWrite('manual', 'manual')) ? 'Copy saved' : 'Could not save the copy (offline?)'); snapOpen(); }
async function snapRestore(slot, btn) {
  if (!btn.dataset.arm) { btn.dataset.arm = '1'; btn.textContent = 'Tap again to restore'; btn.classList.add('danger'); setTimeout(() => { if (btn.isConnected) { delete btn.dataset.arm; btn.textContent = 'Restore'; btn.classList.remove('danger'); } }, 4000); return; }
  const s = S.settings.sync; toast('Restoring…');
  try {
    const r = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(snapKey(slot))}&select=data`, { headers: snapHdr(snapKey(slot)) }); const j = await r.json(); const d = j[0] && j[0].data; if (!d || !d.S) throw new Error('empty copy');
    if (slot !== 'undo') await snapWrite('undo', 'before restore');
    const keepSync = S.settings.sync; const stamp = now();
    S = d.S; S.settings.sync = keepSync; const bump = (o) => { if (o && typeof o === 'object') o._u = stamp; };
    Object.keys(S).forEach((k) => { if (S[k] && typeof S[k] === 'object') { bump(S[k]); if (k === 'days' || k === 'tasks' || k === 'goals') Object.values(S[k]).forEach(bump); } });
    save(true); await pushCloud();
    if (d.Q && typeof Q !== 'undefined') { Q = d.Q; Object.values(Q.items || {}).forEach(bump); qSave(); if (typeof qPush === 'function') await qPush(); }
    if (d.B && typeof B !== 'undefined') { B = d.B; Object.values(B.items || {}).forEach(bump); bSave(); }
    closeModal(); render(); toast('Restored to ' + new Date(d.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '. "Before restore" holds the old state.');
  } catch (e) { toast('Restore failed: ' + (e.message || e)); }
}

/* ═════════ 2 · ACCOUNTABILITY LINK ═════════ */
function shareCfg() { S.settings.share = S.settings.share || { on: false, code: '' }; return S.settings.share; }
function shareUrl() { const c = shareCfg(); return c.code ? `${location.origin}${location.pathname.replace(/[^/]*$/, '')}share.html#${c.code}` : ''; }
function shareMin(r) { return !r.tg || r.dials >= Math.min(10, r.tg); }
function shareData() {
  const t = new Date(), rows = []; for (let i = 27; i >= 0; i--) { const d = addDays(t, -i), o = S.days[dk(d)] || {}, c = o.counters || {}; rows.push({ k: dk(d), dials: Number(c.dials) || 0, tg: dialTargetFor(d), owners: Number(c.owners) || 0, bac: Number(c.bac) || 0, w: o.weight != null && o.weight !== '' ? Number(o.weight) : null, tr: S.days[dk(d)] ? !!dayTrained(o) : false, logged: !!S.days[dk(d)] }); }
  let streak = 0; for (let i = rows.length - 1; i >= 0; i--) { const r = rows[i]; if (i === rows.length - 1 && !shareMin(r)) continue; if (shareMin(r)) streak++; else break; }
  const dc = counterDef('dials'), wk = counterWeek('dials', t), missed = rows.slice(-7, -1).filter((r) => r.tg && !shareMin(r)).length;
  return { at: new Date().toISOString(), v: APP_VERSION, goal: '$20K MRR by 1 Jul 2027', d: daysUntil(S.settings.bigDate), today: rows[rows.length - 1], week: { dials: wk, target: (dc && dc.weekly) || 350 }, streak, totals: { dials: counterTotal('dials'), owners: counterTotal('owners') }, stake: { mdl: 500, missed7: missed }, last: rows.slice(-14).map((r) => [r.k, r.dials, r.tg, r.owners]), bench: typeof bItems === 'function' ? bItems().filter((c) => ['hot', 'screened', 'later', 'placed'].includes(c.status)).length : null };
}
let shareT = 0;
async function sharePush() {
  const c = shareCfg(); if (!c.on || !c.code || !syncReady()) return; const s = S.settings.sync;
  try { await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(snapHdr(c.code), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: c.code, data: shareData(), updated_at: new Date().toISOString() }) }); } catch (e) { }
}
function shareOn() { const c = shareCfg(); if (!c.code) c.code = 'share-' + genCode(); c.on = true; S.settings._u = now(); save(true); sharePush(); render(); toast('Accountability link is live'); }
function shareOff() { const c = shareCfg(); c.on = false; S.settings._u = now(); save(true); render(); toast('Link paused: the page stops updating'); }
function shareNew() { const c = shareCfg(); c.code = 'share-' + genCode(); c.on = true; S.settings._u = now(); save(true); sharePush(); render(); toast('New link made: the old one stops updating'); }
function shareCopy() { const u = shareUrl(); try { navigator.clipboard.writeText(u); toast('Link copied'); } catch (e) { prompt('Copy the link', u); } }
function shareCard() {
  const c = shareCfg(), u = shareUrl(), d = shareData();
  return `<div class="card"><div class="card-h"><div class="card-t">Accountability link</div><div class="card-r">${c.on ? '<b class="ok">live</b>' : 'off'}</div></div>
    <div class="small muted" style="margin-bottom:10px">A read-only page for the person who holds you to account (your dad, a friend). It shows today's dials against the target, this week, the minimum-day streak and the 500 MDL stake. Numbers only: no agency names, no money, no health data. It updates when you log.</div>
    ${c.on ? `<div class="share-url mono">${esc(u)}</div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primary" onclick="shareCopy()">Copy link</button><a class="btn" href="${esc(u)}" target="_blank" rel="noopener">Open</a><button class="btn" onclick="shareNew()">New link</button><button class="btn ghost" onclick="shareOff()">Pause</button></div>
      <div class="xs muted" style="margin-top:8px">Now showing: ${d.today.dials}/${d.today.tg || 0} today · ${d.week.dials}/${d.week.target} this week · streak ${d.streak} · ${d.stake.missed7} missed minimum day${d.stake.missed7 === 1 ? '' : 's'} in the last 6.</div>`
    : `<button class="btn primary" onclick="shareOn()" ${syncReady() ? '' : 'disabled'}>Make my link</button>${syncReady() ? '' : '<div class="xs muted" style="margin-top:6px">Needs sync turned on.</div>'}`}</div>`;
}
if (typeof save === 'function' && !save._sys) { const _s = save; save = function () { const r = _s.apply(this, arguments); if (shareCfg().on) { clearTimeout(shareT); shareT = setTimeout(sharePush, 4000); } return r; }; save._sys = true; }

/* ═════════ 3 · READINESS ═════════ */
function readiness(d) {
  d = d || new Date(); const k = dk(d), o = S.days[k] || {}, m = typeof sleepMin === 'function' ? sleepMin(o) : null; if (m == null) return null;
  const why = []; let s = 0; const add = (n, t) => { s += n; why.push([Math.round(n), t]); };
  add(Math.min(1, m / 480) * 50, `${Math.floor(m / 60)}h ${pad(m % 60)}m asleep (8 h = 50)`);
  if (o.bedAt) { const late = (tmin(o.bedAt) - tmin(S.settings.bed || '21:00') + 1440) % 1440, l = late > 720 ? 0 : late; add(l <= 15 ? 15 : l <= 60 ? 7 : 0, l <= 15 ? 'in bed on time' : `in bed ${l} min late`); }
  const wk = typeof sleepWakes === 'function' && o.segs ? sleepWakes(o).n : null; add(wk == null ? 5 : wk === 0 ? 10 : wk === 1 ? 6 : 2, wk == null ? 'wake-ups not tracked' : `${wk} wake-up${wk === 1 ? '' : 's'}`);
  add(o.sleepQ ? ((o.sleepQ - 1) / 4) * 15 : 8, o.sleepQ ? `rated ${o.sleepQ}/5` : 'not rated');
  const y = addDays(d, -1), yo = S.days[dk(y)] || {}, ytg = dialTargetFor(y), yd = Number((yo.counters || {}).dials) || 0; add(!ytg || yd >= ytg ? 10 : yd >= Math.min(10, ytg) ? 6 : 2, !ytg ? 'yesterday: no dial target' : yd >= ytg ? 'yesterday: target hit' : yd ? `yesterday: ${yd}/${ytg}` : 'yesterday: 0 dials');
  s = Math.round(Math.max(0, Math.min(100, s)));
  const lvl = s >= 70 ? ['full', 'Full day', 'Green light. Run the whole plan.'] : s >= 45 ? ['normal', 'Normal day', 'Protect the dial block and BAC; cut extra gym before anything else.'] : ['min', 'Minimum day', 'Do the minimum (10 min training, 25 min Anki, 10 dials) and be in bed on time. A minimum day is a win.'];
  return { s, why, lvl };
}
function readinessCard(d) {
  const r = readiness(d); if (!r) return `<div class="card flat rd-card"><div class="small"><b>Readiness</b> appears after a logged night. <a href="#" onclick="lightsOut();return false">Lights out</a> tonight, "Up" tomorrow.</div></div>`;
  return `<div class="card rd-card rd-${r.lvl[0]}"><div class="rd-top"><div class="rd-n">${r.s}</div><div><div class="card-t">Readiness · ${r.lvl[1]}</div><div class="small muted">${r.lvl[2]}</div></div></div>
    <div class="rd-why">${r.why.map(([n, t]) => `<span><b>+${n}</b> ${esc(t)}</span>`).join('')}</div>${r.lvl[0] === 'min' && typeof recoveryOn === 'function' ? `<button class="btn sm" style="margin-top:10px" onclick="recoveryOn()">Switch today to the minimum</button>` : ''}</div>`;
}

/* ═════════ 4 · NUDGES ═════════ */
const NUDGE_JOB = { dials: (b) => `${dialTargetFor(new Date()) - (Number((day(new Date()).counters || {}).dials) || 0)} dials. List open, phone charged, first dial inside 2 minutes.`, bac: () => 'BAC: phone in another room, Anki first.', train: () => 'Training: 10 minutes counts.', agency: () => 'Deep work on the company: one thing, start now.' };
function nudgeTick() {
  if (document.hidden || typeof blocksFor !== 'function') return; const d = new Date(), nm = d.getHours() * 60 + d.getMinutes(), k = dk(d); let seen = {}; try { seen = JSON.parse(localStorage.getItem('wr-nudge') || '{}'); } catch (e) { } if (seen._k !== k) seen = { _k: k };
  (blocksFor(d) || []).forEach((b) => { if (!NUDGE_JOB[b.kind]) return; const st = tmin(b.start), id = b.id || b.start + b.title;
    const fire = (tag, msg) => { if (seen[id + tag]) return; seen[id + tag] = 1; toast(msg); try { navigator.vibrate && navigator.vibrate([30, 80, 30]); } catch (e) { } };
    if (nm >= st - 5 && nm < st) fire(':5', `In ${st - nm} min: ${b.title.replace(/^\S+\s/, '')} · ${NUDGE_JOB[b.kind](b)}`);
    else if (nm >= st && nm < st + 3) fire(':0', `Now: ${b.title.replace(/^\S+\s/, '')} · ${NUDGE_JOB[b.kind](b)}`); });
  try { localStorage.setItem('wr-nudge', JSON.stringify(seen)); } catch (e) { }
}
setInterval(nudgeTick, 30000);
setTimeout(function sysBoot() { if (typeof S === 'undefined' || !S || !S.days) return setTimeout(sysBoot, 400); nudgeTick(); setTimeout(snapDaily, 8000); setInterval(snapDaily, 3 * 3600e3); if (shareCfg().on) setTimeout(sharePush, 6000); }, 1500);
