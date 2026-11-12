/* War Room v4 · Dial: the call queue, the dialer, outcomes, the script. */
'use strict';

/* ───────── queue document (own sync row: <code>:queue) ───────── */
const QSTORE = 'warroom-queue';
let Q = null;
const qState = { status: 'off', last: 0, msg: '' };
let qPushTimer = null;
function qKey() { return S.settings.sync.code + ':queue'; }
function qHdr() { const s = S.settings.sync; return { apikey: s.key, Authorization: 'Bearer ' + s.key, 'x-warroom-key': qKey(), 'Content-Type': 'application/json' }; }
function qSave(push) { try { localStorage.setItem(QSTORE, JSON.stringify(Q)); } catch (e) { console.error(e); } if (push !== false) qSchedulePush(); }
function qSchedulePush() { if (!syncReady()) return; clearTimeout(qPushTimer); qPushTimer = setTimeout(qPush, 2000); }
function qMerge(remote) {
  let changed = false; if (!remote || !remote.items) return false;
  for (const id in remote.items) { const r = remote.items[id], l = Q.items[id]; if (!l || (r._u || 0) > (l._u || 0)) { Q.items[id] = r; changed = true; } }
  return changed;
}
async function qPull(silent) {
  if (!syncReady()) return; const s = S.settings.sync;
  try {
    const r = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(qKey())}&select=data`, { headers: qHdr() });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    if (rows.length && rows[0].data && rows[0].data.items) { if (qMerge(rows[0].data)) { qSave(false); if (view === 'dial') render(); } }
    else await qPush();
    qState.status = 'ok'; qState.last = now(); qState.msg = '';
  } catch (e) { qState.status = 'err'; qState.msg = String(e.message || e); if (!silent) toast('Queue sync failed: ' + qState.msg); }
}
async function qPush() {
  if (!syncReady() || !Q) return; const s = S.settings.sync; clearTimeout(qPushTimer);
  try {
    const r = await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(qHdr(), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: qKey(), data: Q, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error('HTTP ' + r.status); qState.status = 'ok'; qState.last = now(); qState.msg = '';
  } catch (e) { qState.status = 'err'; qState.msg = String(e.message || e); }
}
async function qLoad() {
  try { const raw = localStorage.getItem(QSTORE); if (raw) Q = JSON.parse(raw); } catch (e) { }
  if (!Q || !Q.items) {
    Q = { v: 1, items: {}, _u: 0 };
    try { const r = await fetch('./queue_seed.json'); if (r.ok) { const seedDoc = await r.json(); qMerge(seedDoc); qSave(false); } } catch (e) { console.error('seed', e); }
  }
  await qPull(true);
  if (view === 'dial') render();
}
function qItems() { return Q ? Object.values(Q.items).filter((x) => !x._del) : []; }
const Q_OPEN = ['new', 'callback', 'gatekeeper', 'voicemail'];
const TIER_RANK = { T1: 0, '': 1, AL: 2, AL2: 3 };
function qPriority(x, tk) {
  if (x.status === 'callback' && x.next_at && x.next_at <= tk) return 0;        // due callbacks first
  if (x.status === 'callback') return 5;                                       // not due yet
  if (!x.phone) return 6;                                                      // no number: find it first
  if (x.status === 'gatekeeper' || x.status === 'voicemail') return 1 + (TIER_RANK[x.tier] ?? 1) * 0.1 + Math.min(x.attempts, 3) * 0.3;
  return 2 + (TIER_RANK[x.tier] ?? 1);
}
function qNextList(filter) {
  const tk = dk(new Date());
  let list = qItems().filter((x) => Q_OPEN.includes(x.status));
  if (filter === 'T1') list = list.filter((x) => x.tier === 'T1');
  else if (filter === 'callback') list = list.filter((x) => x.status === 'callback' || x.status === 'gatekeeper' || x.status === 'voicemail');
  else if (filter === 'local') list = list.filter((x) => /Collier|Lee/.test(x.county) && x.tier !== 'AL' && x.tier !== 'AL2');
  else if (filter === 'AL') list = list.filter((x) => x.tier === 'AL' || x.tier === 'AL2');
  return list.sort((a, b) => qPriority(a, tk) - qPriority(b, tk) || a.id - b.id);
}
function telHref(p) { const m = String(p || '').match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/); if (!m) return ''; return 'tel:+1' + m[0].replace(/\D/g, ''); }
function phonePretty(p) { const m = String(p || '').match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/); if (!m) return p || '—'; const d = m[0].replace(/\D/g, ''); return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; }
function phoneNote(p) { const s = String(p || ''); const i = s.indexOf('('); const j = s.indexOf(')'); const rest = s.replace(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, '').replace(/^[\s/·-]+|[\s/·-]+$/g, ''); return rest; }
function firstName(c) { const s = String(c || '').trim(); if (!s || /^ask/i.test(s)) return ''; return s.split(/[\s(\/,]+/)[0]; }
function hookFor(x) { if (x.opener) return x.opener; return `You're one of the agencies in ${x.city.split(/[\/(;]/)[0].trim()}`; }

/* ───────── outcomes ───────── */
let dialFilter = 'all', dialPick = null, dialSearch = '', scriptOpen = false, queueOpen = false;
function currentCall() { if (dialPick && Q.items[dialPick] && Q_OPEN.includes(Q.items[dialPick].status)) return Q.items[dialPick]; const l = qNextList(dialFilter); return l[0] || null; }
function countDial(owner) { const o = day(new Date()); o.counters.dials = (Number(o.counters.dials) || 0) + 1; if (owner) o.counters.owners = (Number(o.counters.owners) || 0) + 1; touch(o); try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } }
let lastEntry = null; // {id, at} of the last logged outcome, for one-tap undo
function logCall(id, result, patch, note, owner) {
  const x = Q.items[id]; if (!x) return;
  const prev = { status: x.status, attempts: x.attempts || 0, next_at: x.next_at || '', next_step: x.next_step || '', contact: x.contact || '', notes: x.notes || '', email: x.email || '', receptionist: x.receptionist || '' };
  const dur = x._tap && now() - x._tap < 30 * 60000 ? Math.round((now() - x._tap) / 1000) : null; delete x._tap;
  const e = { at: new Date().toISOString(), r: result, note: note || '', day: dk(new Date()), d: { dials: 1, owners: owner ? 1 : 0 }, prev, dur };
  x.log = x.log || []; x.log.push(e);
  x.attempts = (x.attempts || 0) + 1; x.last_dial_at = e.at; x._u = now();
  if (note) x.notes = (x.notes ? x.notes + ' · ' : '') + note;
  Object.assign(x, patch || {});
  lastEntry = { id, at: e.at };
  qSave();
}
function undoEntry(id, at, quiet) {
  const x = Q.items[id]; if (!x) return; const i = (x.log || []).findIndex((l) => l.at === at); if (i < 0) return;
  const e = x.log[i];
  if (e.d && e.day) { const o = day(e.day); o.counters.dials = Math.max(0, (Number(o.counters.dials) || 0) - (e.d.dials || 0)); o.counters.owners = Math.max(0, (Number(o.counters.owners) || 0) - (e.d.owners || 0)); touch(o); }
  if (e.task && S.tasks[e.task]) { S.tasks[e.task]._del = true; S.tasks[e.task]._u = now(); save(); taskHook('delete', S.tasks[e.task]); }
  x.log.splice(i, 1);
  if (i === x.log.length && e.prev) Object.assign(x, e.prev); else if (e.prev) { x.attempts = Math.max(0, (x.attempts || 1) - 1); }
  if (!x.log.length) { x.status = 'new'; x.attempts = 0; x.next_at = ''; x.next_step = ''; }
  x._u = now(); qSave(); if (lastEntry && lastEntry.at === at) lastEntry = null;
  if (!quiet) toast('Undone: ' + e.r); render();
}
function undoLast() { if (!lastEntry) { toast('Nothing to undo'); return; } undoEntry(lastEntry.id, lastEntry.at); }
function resetAgency(id) { const x = Q.items[id]; if (!x) return; if (!confirm('Reset ' + x.agency + '? Every logged call is removed and the dials are taken back out of your counters.')) return; (x.log || []).slice().reverse().forEach((e) => undoEntry(id, e.at, true)); closeModal(); toast('Reset'); render(); }
function lastEntryHtml() {
  if (!lastEntry || !Q.items[lastEntry.id]) return '';
  const x = Q.items[lastEntry.id], e = (x.log || []).find((l) => l.at === lastEntry.at); if (!e) return '';
  return `<div class="card flat"><div class="row sb"><div class="small muted">Last: <b>${esc(x.agency)}</b> · ${esc(e.r)}${e.dur ? ` · ${fmtEl(e.dur)} on the line` : ''}</div><button class="btn sm" onclick="undoLast()">↶ Undo</button></div></div>`;
}
function outcome(id, kind) {
  const x = Q.items[id]; if (!x) return;
  if (kind === 'noanswer') { logCall(id, 'No answer', { status: x.attempts >= 2 ? 'voicemail' : 'new' }); countDial(); dialPick = null; toast('No answer · logged'); render(); return; }
  if (kind === 'voicemail') { logCall(id, 'Voicemail left', { status: 'voicemail', next_at: dk(addDays(new Date(), 2)) }); countDial(); dialPick = null; toast('Voicemail · call again in 2 days'); render(); return; }
  if (kind === 'bad') { logCall(id, 'Bad number / closed', { status: 'bad' }); countDial(); dialPick = null; toast('Marked bad number'); render(); return; }
  if (kind === 'skip') { dialPick = null; x._skip = (x._skip || 0) + 1; x._u = now(); qSave(false); toast('Skipped (no dial counted)'); render(); return; }
  if (kind === 'gatekeeper') return gatekeeperModal(id);
  if (kind === 'owner') return ownerModal(id);
}
function gatekeeperModal(id) {
  const x = Q.items[id];
  openModal(`<h2>Gatekeeper · ${esc(x.agency)}</h2>
    <div class="script"><div class="say">"Hi, I'm Egor with Caregiver Bench. I recruit caregivers for agencies in Collier and Lee. Who handles caregiver hiring there?"</div>
    <div class="small muted" style="margin-bottom:10px">They give a name → "Thank you. And your name?" Write both. Not in → "When's the best time to catch them?"</div></div>
    <div class="field"><label>Who handles hiring (name + role)</label><input id="gk-who" value="${esc(x.contact && !/^ask/i.test(x.contact) ? x.contact : '')}" placeholder="e.g. Maria Lopez, office manager"></div>
    <div class="field"><label>Receptionist's name</label><input id="gk-rec" placeholder="for the next opener: '[name] at your front desk said…'"></div>
    <div class="field"><label>Call back</label><div class="chips">${[['Later today', 0], ['Tomorrow', 1], ['In 2 days', 2], ['Next week', 7]].map(([l, n]) => `<span class="chip" onclick="document.getElementById('gk-when').value='${dk(addDays(new Date(), n))}'">${l}</span>`).join('')}</div><input id="gk-when" type="date" value="${dk(addDays(new Date(), 1))}" style="margin-top:8px"></div>
    <div class="field"><label>Note (their exact words)</label><input id="gk-note" placeholder="optional"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveGatekeeper(${id})">Log it</button></div>`);
}
function saveGatekeeper(id) {
  const who = $('gk-who').value.trim(), rec = $('gk-rec').value.trim(), when = $('gk-when').value, note = $('gk-note').value.trim();
  const patch = { status: 'callback', next_at: when || dk(addDays(new Date(), 1)), next_step: `Call back${who ? ' for ' + who : ''}` };
  if (who) patch.contact = who; if (rec) patch.receptionist = rec;
  logCall(id, 'Gatekeeper' + (who ? ': ' + who : ''), patch, note); countDial(); dialPick = null; closeModal(); toast('Logged · callback set'); render();
}
function ownerModal(id) {
  const x = Q.items[id];
  openModal(`<h2>Owner talk · ${esc(x.agency)}</h2>
    <div class="hint" style="margin-bottom:10px">Counts as 1 of your 100 owner conversations. Write their exact words about the problem; you reuse them in the next openers.</div>
    <div class="field"><label>Who did you talk to</label><input id="ow-who" value="${esc(x.contact && !/^ask/i.test(x.contact) ? x.contact : '')}" placeholder="name, role"></div>
    <div class="field"><label>Their words (problem, hard case, objection)</label><textarea id="ow-note" placeholder="e.g. 'nobody wants Marco', 'call-offs on weekends', 'we use Indeed'"></textarea></div>
    <div class="field"><label>Result</label><div class="chips" id="ow-res">${[['booked', '📅 Case call booked'], ['bulletin', '📧 Bulletin: yes'], ['callback', '🔁 Call back'], ['no', '🚫 Not now / no']].map(([v, l], i) => `<span class="chip ${i === 0 ? 'on' : ''}" data-v="${v}" onclick="document.querySelectorAll('#ow-res .chip').forEach(c=>c.classList.toggle('on',c===this));document.getElementById('ow-when-wrap').classList.toggle('hidden',!['booked','callback'].includes('${v}'))">${l}</span>`).join('')}</div></div>
    <div class="field" id="ow-when-wrap"><label>When (call / callback)</label><input id="ow-when" type="date" value="${dk(addDays(new Date(), 1))}"><input id="ow-time" type="time" value="16:00" style="margin-top:6px"></div>
    <div class="field"><label>Email (for the Bulletin)</label><input id="ow-email" type="email" placeholder="optional" value="${esc(x.email || '')}"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn ok" onclick="saveOwner(${id})">Log owner talk</button></div>`);
}
function saveOwner(id) {
  const res = (document.querySelector('#ow-res .chip.on') || {}).dataset?.v || 'callback';
  const who = $('ow-who').value.trim(), note = $('ow-note').value.trim(), when = $('ow-when').value, time = $('ow-time').value, email = $('ow-email').value.trim();
  const patch = { status: res === 'booked' ? 'booked' : res === 'bulletin' ? 'bulletin' : res === 'callback' ? 'callback' : 'no' };
  if (who) patch.contact = who; if (email) patch.email = email;
  if (res === 'booked' || res === 'callback') { patch.next_at = when; patch.next_step = (res === 'booked' ? 'Case call ' : 'Call back ') + when + ' ' + time; }
  if (res === 'bulletin') patch.next_step = 'Monday Bulletin';
  logCall(id, 'OWNER TALK → ' + res, patch, note, true); countDial(true);
  if (res === 'booked') { const t = { id: uid(), _u: now(), title: `Case call: ${Q.items[id].agency}${who ? ' (' + who + ')' : ''} at ${time}`, due: when, done: false, note }; S.tasks[t.id] = t; save(); taskHook('create', t); const x = Q.items[id]; x.log[x.log.length - 1].task = t.id; qSave(); }
  dialPick = null; closeModal(); toast(res === 'booked' ? 'Booked. Case call added to tasks.' : 'Owner talk logged'); render();
}
function offListDial() { countDial(); render(); toast('+1 dial (off-list)', 'Undo', () => { bumpToday('dials', -1); }); }
function offListOwner() { countDial(true); render(); toast('+1 dial, +1 owner talk (off-list)', 'Undo', () => { bumpToday('dials', -1); bumpToday('owners', -1); }); }
function bumpToday(id, n) { const o = day(new Date()); o.counters[id] = Math.max(0, (Number(o.counters[id]) || 0) + n); touch(o); render(); }
function setToday(id) { const o = day(new Date()); const c = S.counters.items.find((x) => x.id === id); const v = prompt('Set ' + c.title + ' for today (exact number)', o.counters[id] || 0); if (v == null) return; o.counters[id] = Math.max(0, num(v) || 0); touch(o); render(); }
function addQueueItem() {
  openModal(`<h2>Add an agency</h2><div class="field"><label>Agency</label><input id="aq-a" placeholder="Name"></div><div class="g2"><div class="field"><label>City</label><input id="aq-c" placeholder="Naples"></div><div class="field"><label>County</label><input id="aq-co" placeholder="Collier"></div></div><div class="field"><label>Phone</label><input id="aq-p" type="tel" placeholder="(239) 555-0100"></div><div class="field"><label>Who to ask for</label><input id="aq-w"></div><div class="field"><label>Hook (the one true specific thing)</label><input id="aq-h" placeholder="I saw your post for a live-in caregiver in Bonita"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveQueueItem()">Add</button></div>`);
}
function saveQueueItem() {
  const a = $('aq-a').value.trim(); if (!a) { toast('Agency name'); return; }
  const id = Math.max(1000, ...Object.keys(Q.items).map(Number)) + 1;
  Q.items[id] = { id, agency: a, city: $('aq-c').value.trim(), county: $('aq-co').value.trim(), phone: $('aq-p').value.trim(), contact: $('aq-w').value.trim(), opener: $('aq-h').value.trim(), tier: '', status: 'new', attempts: 0, log: [], _u: now() };
  qSave(); closeModal(); dialPick = id; render();
}
function editQueueItem(id) {
  const x = Q.items[id];
  openModal(`<h2>${esc(x.agency)}</h2>
    <div class="g2"><div class="field"><label>Phone</label><input id="eq-p" value="${esc(x.phone)}"></div><div class="field"><label>Status</label><select id="eq-s">${['new', 'callback', 'voicemail', 'gatekeeper', 'owner', 'booked', 'bulletin', 'trial', 'member', 'no', 'bad'].map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
    <div class="field"><label>Who to ask for</label><input id="eq-w" value="${esc(x.contact)}"></div>
    <div class="field"><label>Hook / opener</label><textarea id="eq-h">${esc(x.opener)}</textarea></div>
    <div class="g2"><div class="field"><label>Next date</label><input id="eq-n" type="date" value="${esc(x.next_at || '')}"></div><div class="field"><label>Email</label><input id="eq-e" value="${esc(x.email || '')}"></div></div>
    <div class="field"><label>Notes</label><textarea id="eq-note">${esc(x.notes || '')}</textarea></div>
    ${(x.log || []).length ? `<div class="sec-h">Log · tap × to remove a call (its dial comes off the counter)</div>${x.log.slice().reverse().map((l) => `<div class="kv"><span class="small">${new Date(l.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span class="small" style="text-align:right">${esc(l.r)}${l.note ? ' · ' + esc(l.note) : ''}${l.dur ? ' · ' + fmtEl(l.dur) : ''} <button class="btn sm ghost" style="color:var(--bad)" onclick="undoEntry(${id},'${l.at}');editQueueItem(${id})">×</button></span></div>`).join('')}<button class="btn sm danger" style="margin-top:8px" onclick="resetAgency(${id})">Reset this agency</button>` : ''}
    <div class="actions"><button class="btn" onclick="dialPick=${id};closeModal();render()">Dial next</button><button class="btn" onclick="pipelineModal(${id})">Pipeline ›</button><button class="btn primary" onclick="saveQueueEdit(${id})">Save</button></div>`);
}
function saveQueueEdit(id) { const x = Q.items[id]; Object.assign(x, { phone: $('eq-p').value.trim(), status: $('eq-s').value, contact: $('eq-w').value.trim(), opener: $('eq-h').value.trim(), next_at: $('eq-n').value, email: $('eq-e').value.trim(), notes: $('eq-note').value.trim(), _u: now() }); qSave(); closeModal(); render(); }

/* ───────── session (replaces the old modal) ───────── */
function startSession() { if (!S.session || !S.session.active) { const o = day(new Date()); S.session = { _u: now(), active: true, start: now(), date: dk(new Date()), d0: Number(o.counters.dials) || 0, o0: Number(o.counters.owners) || 0 }; save(true); } show('dial'); }
function endSession() { const s = S.session; if (!s || !s.active) return; const o = day(s.date); const sd = (Number(o.counters.dials) || 0) - s.d0, so = (Number(o.counters.owners) || 0) - s.o0; if (!o.sessions) o.sessions = []; o.sessions.push({ start: s.start, end: now(), dials: sd, owners: so }); S.session = { _u: now(), active: false }; touch(o); save(true); toast(`Session: ${sd} dials · ${so} owner talks`); render(); }

/* ───────── the script (v3, Caregiver Bench) ───────── */
function scriptHtml(x) {
  const P = typeof pb === 'function' ? pb(x && (x.tier === 'AL' || x.tier === 'AL2') ? 'script-al' : 'script-owner') : null, ob = typeof pb === 'function' ? pb('objections') : null;
  if (P) { const tok = { name: x ? firstName(x.contact) || '[name]' : '[name]', hook: x ? hookFor(x) : '[hook]', town: x ? x.city.split(/[\/(;]/)[0].trim() : '[town]' }; return `<div class="script">${pbRender(P.body.split('\n').filter((l) => !/^Shown in the dialer/.test(l)).join('\n'), tok)}${ob ? `<div class="lab">Objections</div>${pbRender(ob.body.split('\n').filter((l) => !/^Shown in the dialer/.test(l)).join('\n'))}` : ''}<div class="xs muted" style="margin-top:10px">Edit these in Playbook → Scripts. <a href="#" onclick="pbOpen='script-owner';show('book');return false">Open</a></div></div>`; }
  return scriptHtmlOld(x);
}
function scriptHtmlOld(x) {
  const name = x ? firstName(x.contact) : '', hook = x ? hookFor(x) : '[HOOK]', town = x ? x.city.split(/[\/(;]/)[0].trim() : '[town]';
  const nm = name ? name : '[name]';
  const al = x && (x.tier === 'AL' || x.tier === 'AL2');
  return `<div class="script">
    ${al ? `<div class="lab">Assisted living opener</div><div class="say">"Hi, is this the Executive Director? This is Egor with Caregiver Bench. We've never spoken. I recruit caregivers and CNAs in Collier and Lee. I know a lot of communities end up paying agency staff to cover shifts. Is that something you deal with, or are you fully staffed?"</div>` : `
    <div class="lab">1 · Opener: permission + hook</div>
    <div class="say">"Hi <b>${esc(nm)}</b>, this is Egor with Caregiver Bench. We've never spoken, and I know you weren't expecting my call. <b>${esc(hook)}</b>, which is why I'm calling. Can I take 30 seconds to tell you why, and then you decide if it's worth talking?"</div>
    <div class="lab">2 · Right person</div><div class="say">"Are you the one who handles caregiver hiring, or is that someone else?"</div>
    <div class="lab">3 · The problem, not the product · then count to 4</div>
    <div class="say">"From the agencies I've looked at around ${esc(town)}, the hard part usually isn't getting applicants. It's that they don't show up to the interview, or they quit in the first couple of weeks. <b>I'm not sure that's true for you. Is it?</b>"</div>
    <div class="say">Hard case: "Live-in / weekend / Marco cases stay open the longest. About 4 in 10 don't show up to the interview, and the good ones get hired by someone else first. <b>Is that happening with this one, or have you got it covered?</b>"</div>
    <div class="lab">4 · One follow-up</div><div class="say">"When a new case comes in and you're short a caregiver, what do you do today: pull someone from your team, post on Indeed, or something else?"</div>
    <div class="lab">5 · One sentence + a no-oriented ask</div>
    <div class="say">"<b>I help private-pay agencies get interviews with screened caregivers for live-in and weekend cases within 48 hours, without paying anything unless a caregiver actually works a shift.</b> I run my own ads, call every caregiver myself, confirm them twice before the interview. The first 30 days are free. <b>Would you be against me recruiting for that case this week and sending you a couple of profiles?</b>"</div>
    <div class="lab">6 · Yes → route + book</div><div class="say">"In a normal month, how many caregivers do you hire?" (0–1 → Pay When They Work · 2+ → 30-day trial · several offices → Multi-site) "Let's do 10 minutes on the case: town, hours, pay, must-haves. Now, or tomorrow at [time]?"</div>
    <div class="lab">7 · Not now</div><div class="say">"Fair enough. Every Monday I send a short email with the screened caregivers I have, by town and shift, no names. Would it be a bad idea if I added you?"</div>
    <div class="lab">Voicemail</div><div class="say">"Hi ${esc(nm)}, Egor with Caregiver Bench. ${esc(hook)}. I recruit caregivers in Collier and Lee, live-in and weekends especially, and the first 30 days are free. I'll try you again on [day]. If it's easier, I'm at 561-556-0536."</div>`}
    <div class="lab">Objections</div>
    <div class="obj">
      <div><b>"How much?"</b>"Free for 30 days. If none of my caregivers works a shift, nothing. If one does, $1,500 a month with 3 included, or $750 each if you only hire now and then."</div>
      <div><b>"Send me info"</b>"Sure. What would make it worth reading: the live-in case, or weekends?" Then a 3-line email about that case.</div>
      <div><b>"We have a recruiter / Indeed"</b>"Keep them. Just so I know: how fast did your last live-in case get staffed?"</div>
      <div><b>"Recruiters burned us"</b>"Fair, most charge whether anyone works. That's why I don't charge until someone works a shift. What happened with them?"</div>
      <div><b>"I'm busy"</b>"Sorry for the timing. When's better: tomorrow morning or afternoon?" Book it, hang up.</div>
      <div><b>"Where are you based?"</b>"In Europe. I work Florida hours. The caregivers are local, only the screening is remote."</div>
      <div><b>"How many caregivers do you have?"</b>The real number. While building: "I'm building the bench this month, so I recruit for your case specifically."</div>
      <div><b>Anything you don't know</b>"Good question. I'll find out and email you today."</div>
    </div>
    <div class="lab">Last question after a no</div><div class="say">"Who's the one agency around here you'd guess is having the hardest time staffing right now?" Franchise owners: "Do you know another [brand] owner in a nearby territory who's struggling with live-in cases?"</div>
  </div>`;
}

/* ───────── the Dial view ───────── */
function florida(nm) { const f = (nm - 7 * 60 + 1440) % 1440; return pad(Math.floor(f / 60)) + ':' + pad(f % 60); }
function renderDial() {
  const modeBar = `<div class="chips" style="margin-bottom:12px"><span class="chip ${benchMode === 'owners' ? 'on' : ''}" style="flex:1;text-align:center" onclick="benchMode='owners';render()">☏ Owners</span><span class="chip ${benchMode === 'caregivers' ? 'on' : ''}" style="flex:1;text-align:center" onclick="benchMode='caregivers';render()">🧑‍⚕️ Caregivers${B && cgNext().length ? ' · ' + cgNext().length : ''}</span></div>`;
  if (benchMode === 'caregivers') { $('view-dial').innerHTML = modeBar + (B ? renderBench() : '<div class="card"><div class="empty">Loading the bench…</div></div>'); return; }
  const d = new Date(), k = dk(d), o = day(k), w = dow(d), nm = nowMin();
  const dc = S.counters.items.find((c) => c.id === 'dials'), tg = dialTargetFor(d), weekly = dc ? dc.weekly : 150;
  const v = Number(o.counters.dials) || 0, wk = counterWeek('dials', d), owners = counterTotal('owners'), ow = Number(o.counters.owners) || 0;
  const ownersGoal = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners');
  const need = dc ? paceNeed(dc, d) : null;
  const blk = blocksFor(d).find((b) => b.kind === 'dials' && tmin(b.start) <= nm && nm < tmin(b.end));
  const nextBlk = blocksFor(d).find((b) => b.kind === 'dials' && tmin(b.start) > nm);
  const sess = S.session && S.session.active ? S.session : null;
  const x = Q ? currentCall() : null;
  const list = Q ? qNextList(dialFilter) : [];
  const dueCb = Q ? qItems().filter((y) => y.status === 'callback' && y.next_at && y.next_at <= k).length : 0;

  const tiles = `<div class="tiles">
    <div class="tile ${tg && v >= tg ? 'hit' : ''}" onclick="setToday('dials')"><div class="n num">${v}<small>/${tg || '—'}</small></div><div class="l">today · tap to fix</div></div>
    <div class="tile"><div class="n num">${wk}<small>/${weekly}</small></div><div class="l">week</div></div>
    <div class="tile" onclick="setToday('owners')"><div class="n num">${owners}<small>/${ownersGoal ? ownersGoal.target : 100}</small></div><div class="l">owner talks</div></div>
    <div class="tile"><div class="n num">${Math.max(0, weekly - wk)}</div><div class="l">left · week</div></div></div>`;

  const sessHtml = sess ? `<div class="card ac flat"><div class="row sb"><div><div class="card-t">Session · <span class="mono" id="sess-el">${fmtEl(Math.floor((now() - sess.start) / 1000))}</span></div><div class="small">${v - sess.d0} dials · ${ow - sess.o0} owner talks · ${v - sess.d0 ? Math.round(((ow - sess.o0) / (v - sess.d0)) * 100) : 0}% reach${blk ? ` · block ends ${blk.end} (${tmin(blk.end) - nm} min)` : ''}</div></div><button class="btn sm danger" onclick="endSession()">End</button></div></div>`
    : `<div class="card flat"><div class="row sb"><div class="small muted">${blk ? `<b class="acc">Dial block now</b> · until ${blk.end} · Florida ${florida(nm)}` : nextBlk ? `Next dial block <b>${nextBlk.start}</b> (${esc(nextBlk.title)}) · Florida now ${florida(nm)}` : `No dial block left today · Florida now ${florida(nm)}`}</div><button class="btn sm primary" onclick="startSession()">▶ Start session</button></div></div>`;

  const nextCard = !Q ? `<div class="card"><div class="empty">Loading the call queue…</div></div>` : !x ? `<div class="card"><div class="empty">Nothing left in this filter. Switch filter or add an agency.</div></div>` : (() => {
    const last = (x.log || []).slice(-1)[0]; const tel = telHref(x.phone); const note = phoneNote(x.phone);
    const tierChip = x.tier === 'T1' ? '<span class="chip on">TIER 1</span>' : x.tier === 'AL' ? '<span class="chip info">Assisted living</span>' : x.tier === 'AL2' ? '<span class="chip info">AL · chain</span>' : '';
    const stChip = x.status === 'callback' ? `<span class="chip ${x.next_at <= k ? 'on' : ''}">↩ callback ${x.next_at ? fmtShort(pd(x.next_at)) : ''}</span>` : x.status === 'voicemail' ? '<span class="chip">voicemail left</span>' : x.status === 'gatekeeper' ? '<span class="chip">gatekeeper</span>' : '';
    return `<div class="card ac" id="dial-next">
      <div class="card-h"><div class="card-t">Next call · #${x.id}${x.attempts ? ` · attempt ${x.attempts + 1}` : ''}</div><div class="row" style="gap:6px"><button class="btn sm ghost" onclick="editQueueItem(${x.id})">✎</button><button class="btn sm ghost" onclick="outcome(${x.id},'skip')">Skip ›</button></div></div>
      <div class="agency">${esc(x.agency)}</div>
      <div class="small muted" style="margin:2px 0 8px">${esc(x.city)}${x.county ? ' · ' + esc(x.county) + ' County' : ''}</div>
      <div class="chips" style="margin-bottom:10px">${tierChip}${stChip}</div>
      <div class="dial-num">${tel ? `<a href="${tel}" onclick="markDialing(${x.id})">${phonePretty(x.phone)}</a>` : '<span class="bad" style="font-size:16px">No phone on file: find it, tap ✎ to add it</span>'}</div>
      ${note ? `<div class="xs muted">${esc(note)}</div>` : ''}
      ${tel ? `<div class="row" style="margin-top:8px;gap:6px"><a class="btn primary grow" href="${tel}" onclick="markDialing(${x.id})">📞 Call</a><button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${phonePretty(x.phone)}');toast('Number copied')">Copy</button></div>` : ''}
      <div class="sec-h" style="margin-top:14px">Ask for</div><div style="font-weight:600">${esc(x.contact || 'Whoever handles caregiver hiring')}${x.receptionist ? ` <span class="small muted">· front desk: ${esc(x.receptionist)}</span>` : ''}</div>
      <div class="sec-h">Hook · one true, specific thing</div><div class="small" style="line-height:1.5">${esc(hookFor(x))}</div>
      ${last ? `<div class="sec-h">Last time</div><div class="small muted">${new Date(last.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${esc(last.r)}${last.note ? ' · ' + esc(last.note) : ''}</div>` : ''}
      ${x.notes && !last ? `<div class="sec-h">Notes</div><div class="small muted">${esc(x.notes)}</div>` : ''}
      <div class="sec-h" style="margin-top:14px">What happened</div>
      <div class="outcomes">
        <button class="btn" onclick="outcome(${x.id},'noanswer')">📵 No answer<small>+1 dial</small></button>
        <button class="btn" onclick="outcome(${x.id},'voicemail')">📼 Voicemail left<small>+1 dial · retry in 2 days</small></button>
        <button class="btn" onclick="outcome(${x.id},'gatekeeper')">🧑‍💼 Gatekeeper<small>+1 dial · get the name</small></button>
        <button class="btn ok" onclick="outcome(${x.id},'owner')">🗣 Owner talk<small>+1 dial · +1 owner</small></button>
      </div>
      <div class="row" style="margin-top:8px"><button class="btn sm ghost grow" onclick="outcome(${x.id},'bad')">Bad number / closed</button></div>
    </div>`; })();

  const filters = [['all', 'All'], ['T1', 'Tier 1'], ['callback', `Callbacks${dueCb ? ' · ' + dueCb : ''}`], ['local', 'Collier · Lee'], ['AL', 'Assisted living']];
  const listHtml = `<div class="card"><div class="card-h" onclick="queueOpen=!queueOpen;render()" style="cursor:pointer"><div class="card-t">Queue · ${list.length} open${Q ? ` of ${qItems().length}` : ''}</div><div class="card-r">${queueOpen ? '▾' : '▸'}</div></div>
    ${queueOpen ? `<div class="chips" style="margin-bottom:10px">${filters.map(([v, l]) => `<span class="chip ${dialFilter === v ? 'on' : ''}" onclick="dialFilter='${v}';dialPick=null;render()">${l}</span>`).join('')}</div>
    <input placeholder="Search agency, city, name" value="${esc(dialSearch)}" oninput="dialSearch=this.value;renderDialList()" style="margin-bottom:8px">
    <div id="dial-list">${dialListHtml(list)}</div>
    <div class="row" style="margin-top:10px;gap:6px"><button class="btn sm grow" onclick="addQueueItem()">+ Add agency</button><button class="btn sm grow" onclick="offListDial()">+1 off-list dial</button><button class="btn sm grow" onclick="offListOwner()">+1 off-list owner</button></div>` : ''}</div>`;

  const scriptCard = `<div class="card"><div class="card-h" onclick="scriptOpen=!scriptOpen;render()" style="cursor:pointer"><div class="card-t">Script v3 · filled for this call</div><div class="card-r">${scriptOpen ? '▾' : '▸'}</div></div>${scriptOpen ? scriptHtml(x) : '<div class="small muted">Opener with the hook, the problem question, the ask, objections.</div>'}</div>`;

  const ownersDone = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners');
  const gate = ownersDone ? `<div class="coach">Rule from the plan: <b>no new business ideas until ${ownersDone.target} owner conversations</b> (${owners} so far · review ${ownersDone.deadline ? fmtShort(pd(ownersDone.deadline)) : '8 Dec'}). Hormozi’s idea: volume negates luck <span class="ref">[#1]</span>.</div>` : '';

  const clients = qItems().filter((x) => ['booked', 'trial', 'member', 'bulletin'].includes(x.status));
  const clientsHtml = clients.length ? `<div class="card"><div class="card-h"><div class="card-t">Pipeline · ${clients.length}</div><div class="card-r">MRR <b>$${mrr().toLocaleString()}</b></div></div>${clients.map((x) => `<div class="qrow" onclick="pipelineModal(${x.id})"><div class="grow"><div class="a">${esc(x.agency)}</div><div class="m">${x.status === 'member' ? (PLANS[x.plan] || [''])[0] + (x.memberSince ? ' since ' + fmtShort(pd(x.memberSince)) : '') : x.status === 'trial' ? 'trial day ' + Math.round((now() - pd(x.trialStart || dk(new Date()))) / 86400000) + (x.case ? ' · ' + esc(x.case) : '') : x.next_step ? esc(x.next_step) : x.status}</div></div><span class="st ${x.status}">${x.status === 'member' ? 'paying' : x.status}</span></div>`).join('')}<div class="xs muted" style="margin-top:8px">Tap an agency to move it: trial started · first shift · paying · lost.</div></div>` : '';
  $('view-dial').innerHTML = modeBar + tiles + sessHtml + nextCard + lastEntryHtml() + clientsHtml + scriptCard + listHtml + gate;
  clearInterval(sessTimer); if (sess) sessTimer = setInterval(() => { const el = $('sess-el'); if (!el) { clearInterval(sessTimer); return; } el.textContent = fmtEl(Math.floor((now() - sess.start) / 1000)); }, 1000);
}
function dialListHtml(list) {
  const q = dialSearch.trim().toLowerCase(); const items = (q ? qItems().filter((x) => (x.agency + ' ' + x.city + ' ' + x.contact).toLowerCase().includes(q)) : list).slice(0, q ? 40 : 25);
  if (!items.length) return '<div class="empty">Nothing here.</div>';
  return items.map((x) => `<div class="qrow" onclick="dialPick=${x.id};queueOpen=false;render();window.scrollTo(0,0)"><div class="grow"><div class="a">${x.tier === 'T1' ? '★ ' : ''}${esc(x.agency)}</div><div class="m">${esc(x.city)}${x.phone ? '' : ' · no phone'}${x.attempts ? ` · ${x.attempts} attempt${x.attempts > 1 ? 's' : ''}` : ''}${x.next_at && x.status === 'callback' ? ' · ' + fmtShort(pd(x.next_at)) : ''}</div></div><span class="st ${x.status}">${x.status}</span></div>`).join('');
}
function renderDialList() { const el = $('dial-list'); if (el) el.innerHTML = dialListHtml(qNextList(dialFilter)); }
function markDialing(id) { const x = Q.items[id]; if (x) { x._tap = now(); } }
