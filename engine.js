/* War Room 8.0 · ENGINE — what ChatGPT, Grok and Perplexity independently agreed the best app for this life is:
   not a dashboard, an execution engine. One next action (ONE) + a loop that changes the system when reality breaks the plan.
   1 Bottleneck of the week · 2 If-then protocols · 3 Value per action · 4 Replan the rest of today
   5 Commitment simulator · 6 Weekly board meeting (one system change + next week's 3 outcomes). */
'use strict';
const EN_PER_DIAL = 5; /* $20k MRR ÷ ~4,000 dials (100 owner talks at 2.5%) ≈ $5 of MRR per dial */

/* ═════════ 1 · BOTTLENECK: the single weakest link across business and life ═════════ */
function enSum(id, n) { let s = 0; for (let i = 0; i < n; i++) { const o = S.days[dk(addDays(new Date(), -i))]; s += Number(o && o.counters && o.counters[id]) || 0; } return s; }
function enTarget(fn, n) { let s = 0; for (let i = 0; i < n; i++) s += fn(addDays(new Date(), -i)) || 0; return s; }
function enBottleneck() {
  const C = [], bac = S.counters.items.find((c) => c.id === 'bac');
  const dT = enTarget((d) => dialTargetFor(d), 14), d14 = enSum('dials', 14);
  C.push({ k: 'dials', area: 'Company', name: 'Dial volume', v: dT ? d14 / dT : 1, line: `${d14} of ${dT} planned dials in 14 days`, fix: 'First block of every dial day: the call block, phone in hand within 2 minutes of ONE showing it.', act: 'oneGo("dial")', btn: 'Dial now' });
  if (typeof funnelCounts === 'function' && typeof bottleneck === 'function' && Q) { const f = funnelCounts(), b = bottleneck(f); if (b && b.stage !== 'Not enough data') C.push({ k: 'funnel', area: 'Company', name: b.stage, v: b.stage === 'Follow-up' ? 0.3 : 0.5, line: b.why, fix: b.stage === 'Follow-up' ? 'Clear every overdue callback before new dials.' : 'Fix this stage before adding volume.', act: 'show("crm")', btn: 'Open pipeline' }); }
  const bT = bac ? enTarget((d) => bac.targets[dow(d)], 14) : 0, b14 = enSum('bac', 14);
  if (bT) C.push({ k: 'bac', area: 'Mind', name: 'BAC study time', v: b14 / bT, line: `${b14} of ${bT} planned BAC minutes in 14 days`, fix: 'Morning BAC block starts before the phone is touched. Anki first.', act: 'oneGo("timer","bac",25)', btn: 'Start 25 min' });
  let tr = 0; for (let i = 0; i < 14; i++) if (dayTrained(S.days[dk(addDays(new Date(), -i))])) tr++;
  C.push({ k: 'train', area: 'Body', name: 'Training days', v: tr / 12, line: `${tr} of 12 training days in 14 days`, fix: 'Missed session → 15-minute home version the same day.', act: 'show("train")', btn: 'Open training' });
  let rs = 0, rn = 0; for (let i = 0; i < 7; i++) { const r = typeof readiness === 'function' ? readiness(addDays(new Date(), -i)) : null; if (r) { rs += r.s; rn++; } }
  if (rn >= 3) C.push({ k: 'sleep', area: 'Sleep', name: 'Recovery', v: rs / rn / 80, line: `average readiness ${Math.round(rs / rn)} over ${rn} nights`, fix: 'Lights out at 21:00. Phone charges outside the bedroom.', act: 'oneGo("sleep")', btn: 'Lights out' });
  C.forEach((c) => (c.v = Math.max(0, Math.min(1.5, c.v))));
  C.sort((a, b) => a.v - b.v || (a.area === 'Company' ? -1 : 1));
  return C;
}

/* ═════════ 2 · IF-THEN PROTOCOLS: decided calm, fired automatically ═════════ */
const EN_TRIG = {
  miss_dials: ['A dial block passed without the dials', (R) => R.L.some((b) => b.kind === 'dials' && blkStatus(b, R.d, R.o, R.L) === 'miss')],
  miss_bac: ['A BAC block passed without the minutes', (R) => R.L.some((b) => b.kind === 'bac' && blkStatus(b, R.d, R.o, R.L) === 'miss')],
  miss_train: ['Training block missed', (R) => R.L.some((b) => (b.kind === 'train' || b.kind === 'program') && blkStatus(b, R.d, R.o, R.L) === 'miss')],
  low_ready: ['Readiness under 55 this morning', () => { const r = typeof readiness === 'function' ? readiness(new Date()) : null; return !!r && r.s < 55; }],
  zero_yday: ['Yesterday the minimum was missed', () => { const y = addDays(new Date(), -1); return !!S.days[dk(y)] && !minimumMet(y).met && (dialTargetFor(y) > 0); }],
  evening_zero: ['It is after 18:00 and today is still 0', () => nowMin() >= 18 * 60 && !minimumMet(new Date()).met],
};
const EN_DEF = [
  ['zero_yday', 'Never twice. The first block today is the call block, no exceptions. Log the stake, then dial.', 'oneGo("dial")', 'Dial'],
  ['miss_dials', '20 dials in the next free slot before anything optional. 10 is the floor.', 'oneGo("dial")', 'Dial 20'],
  ['miss_bac', '25 min Anki before shutdown. Never 0.', 'oneGo("timer","bac",25)', 'Start 25 min'],
  ['miss_train', '15-minute home session: push-ups, squats, core. Done counts.', 'oneGo("train")', 'Open training'],
  ['low_ready', 'Minimum day: 10 dials + 25 BAC, lights out 30 min early. No guilt, no zero.', 'oneGo("dial")', 'Do the minimum'],
  ['evening_zero', 'Minimum now, before dinner: 10 dials or 25 min BAC, whichever is open first.', 'oneGo("dial")', 'Minimum'],
];
function enProtocols() {
  if (!S.protocols || !Object.keys(S.protocols).length) { S.protocols = {}; EN_DEF.forEach(([t, txt, act, btn], i) => { const id = 'p' + i; S.protocols[id] = { id, _u: 1, t, txt, act, btn, on: true }; }); }
  Object.values(S.protocols).forEach((p) => { if (p && p.t === 'miss_train' && /deep/.test(p.act || '')) { p.act = 'oneGo("train")'; p.btn = 'Open training'; } });
  return Object.values(S.protocols).filter((p) => p && !p._del);
}
function enFiring() {
  const d = new Date(), o = S.days[dk(d)] || { counters: {} }, L = blocksFor(d), R = { d, o, L };
  return enProtocols().filter((p) => p.on && EN_TRIG[p.t] && (() => { try { return EN_TRIG[p.t][1](R); } catch (e) { return false; } })() && !((o.protoDone || {})[p.id]));
}
function enProtoDone(id) { const o = day(new Date()); o.protoDone = Object.assign(o.protoDone || {}, { [id]: now() }); touch(o); }
function enProtoEdit(id) {
  const p = S.protocols[id] || { id: uid(), t: 'miss_dials', txt: '', act: '', btn: 'Do it', on: true };
  openModal(`<h2>If-then protocol</h2><div class="xs muted" style="margin-bottom:8px">Written once, while calm. ONE shows it the moment the "if" happens.</div>
    <div class="field"><label>If</label><select id="pe-t">${Object.entries(EN_TRIG).map(([k, [l]]) => `<option value="${k}" ${p.t === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>Then</label><input id="pe-x" value="${esc(p.txt)}"></div>
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="enProtoSave('${p.id}')">Save</button>${S.protocols[id] ? `<button class="btn" onclick="enProtoDel('${p.id}')">Delete</button>` : ''}</div>`);
}
function enProtoSave(id) { const t = $('pe-t').value, x = $('pe-x').value.trim(); if (!x) { toast('Write the "then"'); return; } const d = EN_DEF.find((z) => z[0] === t) || []; S.protocols[id] = Object.assign(S.protocols[id] || { id, on: true }, { t, txt: x, act: (S.protocols[id] && S.protocols[id].act) || d[2] || '', btn: (S.protocols[id] && S.protocols[id].btn) || d[3] || 'Do it', _u: now() }); save(); closeModal(); render(); }
function enProtoDel(id) { if (S.protocols[id]) { S.protocols[id]._del = true; S.protocols[id]._u = now(); save(); } closeModal(); render(); }
function enProtoToggle(id) { const p = S.protocols[id]; if (!p) return; p.on = !p.on; p._u = now(); save(); render(); }

/* ═════════ 4 · REPLAN: rebuild the rest of today around what is left ═════════ */
function enReplan() {
  const d = new Date(), o = day(d), nm = nowMin(), bed = tmin(S.settings.bed || '21:00'), c = o.counters || {};
  const fixed = blocksFor(d).filter((b) => !['dials', 'bac', 'agency', 'train', 'program'].includes(b.kind)).map((b) => [tmin(b.start), tmin(b.end)]).sort((a, b) => a[0] - b[0]);
  const free = []; let t = Math.ceil(nm / 5) * 5; fixed.forEach(([s, e]) => { if (e <= t) return; if (s > t) free.push([t, Math.min(s, bed - 15)]); t = Math.max(t, e); }); if (t < bed - 15) free.push([t, bed - 15]);
  const need = []; const dl = Math.max(0, dialTargetFor(d) - (Number(c.dials) || 0)); if (dl) need.push(['dials', `Dials · ${dl} left`, Math.min(180, Math.ceil(dl * 2.5)), 16 * 60]);
  const bc = S.counters.items.find((x) => x.id === 'bac'), bl = Math.max(0, (bc ? bc.targets[dow(d)] || 0 : 0) - (Number(c.bac) || 0)); if (bl) need.push(['bac', `BAC · ${bl} min left`, Math.min(120, bl), 0]);
  if (!dayTrained(o) && blocksFor(d).some((b) => b.kind === 'train' || b.kind === 'program')) need.push(['train', 'Training · short version', 30, 0]);
  const plan = []; free.forEach((f) => (f.c = f[0]));
  need.forEach(([k, title, mins, after]) => { let rem = mins; for (const f of free) { if (rem <= 0) break; const s = Math.max(f.c, after), e = Math.min(f[1], s + rem); if (e - s >= 10) { plan.push({ k, title, s, e }); f.c = e; rem -= e - s; } } });
  plan.sort((a, b) => a.s - b.s);
  return { plan, freeMin: free.reduce((a, f) => a + Math.max(0, f[1] - f[0]), 0), need };
}
function enReplanModal() {
  const R = enReplan(), hm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  openModal(`<h2>Rest of today, rebuilt</h2><div class="xs muted" style="margin-bottom:10px">${R.freeMin} free minutes before bed around your fixed blocks. Dials go after 16:00 (Florida open); the rest fills the gaps.</div>
    ${R.plan.length ? `<div class="lf-blks">${R.plan.map((p) => `<div class="lf-blk"><span class="tm">${hm(p.s)}–${hm(p.e)}</span><span class="tt">${esc(p.title)}</span><b></b><span></span></div>`).join('')}</div>` : `<div class="empty">${R.need.length ? 'Not enough free time left for the rest. Do the minimum: 10 dials or 25 min BAC.' : 'Nothing left to do today. Close the day.'}</div>`}
    ${R.plan.length ? `<button class="btn primary block" style="margin-top:12px" onclick="enReplanUse()">Use this plan</button>` : ''}`);
}
function enReplanUse() { const R = enReplan(), o = day(new Date()), hm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60); o.replan = R.plan.map((p) => ({ id: 'rp' + p.s, kind: p.k === 'train' ? 'train' : p.k, title: p.title, start: hm(p.s), end: hm(p.e) })); touch(o); closeModal(); toast('New plan set. ONE follows it.'); if (typeof oneShow === 'function') oneShow(true); }

/* ═════════ 5 · COMMITMENT SIMULATOR ═════════ */
function enSimModal() {
  openModal(`<h2>Before you say yes</h2><div class="xs muted" style="margin-bottom:10px">A new client, lesson group, trip or project. See what it takes from the hours that build July.</div>
    <div class="field"><label>What</label><input id="sm-n" placeholder="e.g. extra tennis group"></div>
    <div class="field"><label>Days</label><div class="lf-chips" id="sm-d">${[1, 2, 3, 4, 5, 6, 7].map((w) => `<button onclick="this.classList.toggle('on')" data-w="${w}">${DAY_SHORT[w]}</button>`).join('')}</div></div>
    <div class="row" style="gap:8px"><div class="field grow"><label>From</label><input id="sm-s" type="time" value="17:00"></div><div class="field grow"><label>To</label><input id="sm-e" type="time" value="18:30"></div></div>
    <div class="field"><label>Pays per week (MDL, optional)</label><input id="sm-p" type="number" inputmode="numeric"></div>
    <button class="btn primary block" onclick="enSimRun()">Show the cost</button><div id="sm-out" style="margin-top:12px"></div>`);
}
function enSimRun() {
  const days = [...document.querySelectorAll('#sm-d button.on')].map((b) => Number(b.dataset.w)), s = tmin($('sm-s').value), e = tmin($('sm-e').value), pay = num($('sm-p').value) || 0;
  if (!days.length || !(e > s)) { $('sm-out').innerHTML = '<div class="bad small">Pick the days and a time range.</div>'; return; }
  const cost = { dials: 0, bac: 0, agency: 0, train: 0, sleep: 0 }, m = monday(new Date());
  days.forEach((w) => { const d = addDays(m, w - 1); blocksFor(d).forEach((b) => { const k = b.kind === 'program' ? 'train' : b.kind; if (!(k in cost)) return; const ov = Math.max(0, Math.min(e, tmin(b.end)) - Math.max(s, tmin(b.start))); cost[k] += ov; }); const bed = tmin(S.settings.bed || '21:00'); cost.sleep += Math.max(0, e - bed); });
  const dialsLost = Math.round(cost.dials / 2.5), mrr = dialsLost * EN_PER_DIAL, rows = [['Dial time', cost.dials, dialsLost ? `≈ ${dialsLost} dials/week ≈ $${fmt(mrr)} of future MRR` : ''], ['BAC study', cost.bac, ''], ['Company deep work', cost.agency, ''], ['Training', cost.train, ''], ['Sleep', cost.sleep, cost.sleep ? 'after your 21:00 lights-out' : '']];
  const hit = rows.filter((r) => r[1] > 0), name = esc($('sm-n').value.trim() || 'This');
  $('sm-out').innerHTML = `${hit.length ? hit.map(([l, mn, x]) => `<div class="lf-kv"><span>${l}${x ? `<br><span class="xs muted">${x}</span>` : ''}</span><b class="bad">−${mn} min/wk</b></div>`).join('') : '<div class="lf-kv"><span>Overlaps nothing that builds July</span><b class="ok">free time</b></div>'}
    <div class="lf-call">${!hit.length ? `${name} fits in genuinely free time.` : cost.dials || cost.sleep ? `${name} eats ${cost.dials ? 'calling hours' : 'sleep'}. Only a yes if it is worth more than what it replaces${pay ? ` (it pays ${fmt(pay)} MDL/week)` : ''}, or if you move it.` : `${name} costs study or training time. Move it, or decide on purpose what gets less.`}</div>`;
}

/* ═════════ 6 · WEEKLY BOARD MEETING ═════════ */
let enBm = null;
function enWeekKey(d) { return dk(monday(d || new Date())); }
function enBoardDone(d) { const b = (S.boards || {})[enWeekKey(d)]; return !!(b && b.done); }
function enBoard() {
  const m = monday(new Date()), t = new Date(); let dials = 0, owners = 0, bac = 0, tr = 0, kept = [], wk = [];
  for (let i = 0; i < 7; i++) { const d = addDays(m, i); if (d > t) break; const o = S.days[dk(d)] || {}, c = o.counters || {}; dials += Number(c.dials) || 0; owners += Number(c.owners) || 0; bac += Number(c.bac) || 0; if (dayTrained(o)) tr++; const a = typeof lfAdh === 'function' ? lfAdh(d) : null; if (a) kept.push(a.v); }
  const W = weightEntries().filter((x) => x.k >= dk(addDays(m, -7))); const dw = W.length >= 2 ? W[W.length - 1].w - W[0].w : null;
  const prev = (S.boards || {})[dk(addDays(m, -7))];
  enBm = { step: 0, k: enWeekKey(), nums: { dials, owners, bac, tr, kept: kept.length ? Math.round(kept.reduce((a, x) => a + x, 0) / kept.length * 100) : null, dw }, prev, bn: enBottleneck()[0], moved: '', didnt: '', change: '', out: ['', '', ''] };
  enBoardStep();
}
function enBoardStep() {
  const B = enBm, n = B.nums, st = ['Numbers', 'What moved', 'The bottleneck', 'Next week', 'Done'];
  const head = `<div class="en-steps">${st.map((s, i) => `<span class="${i === B.step ? 'on' : i < B.step ? 'ok' : ''}">${s}</span>`).join('')}</div>`;
  const val = (id) => ($(id) ? $(id).value : '');
  let body = '';
  if (B.step === 0) body = `<h2>Board meeting · week ${isoWeek(new Date())}</h2><div class="xs muted" style="margin-bottom:10px">12 minutes. The app has the numbers; you bring the judgment.</div>
    <div class="en-nums">${[['Dials', n.dials], ['Owner talks', n.owners], ['BAC min', n.bac], ['Training days', n.tr], ['Plan kept', n.kept == null ? '–' : n.kept + '%'], ['Weight', n.dw == null ? '–' : (n.dw >= 0 ? '+' : '') + fmt(n.dw, 1) + ' kg']].map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    ${B.prev && B.prev.change ? `<div class="lf-call">Last week's system change: <b>${esc(B.prev.change)}</b>. Did it work? Keep it or replace it below.</div>` : ''}`;
  if (B.step === 1) body = `<h2>What moved the needle?</h2><div class="field"><label>What produced real progress this week</label><textarea id="bm-m" rows="3">${esc(B.moved)}</textarea></div><div class="field"><label>What didn't (be specific, no excuses, no self-attack)</label><textarea id="bm-d" rows="3">${esc(B.didnt)}</textarea></div>`;
  if (B.step === 2) body = `<h2>The bottleneck</h2>${B.bn ? `<div class="en-bn"><span>${esc(B.bn.area)}</span><b>${esc(B.bn.name)}</b><em>${esc(B.bn.line)}</em></div><div class="xs muted" style="margin:10px 0 6px">Suggested fix: ${esc(B.bn.fix)}</div>` : ''}<div class="field"><label>One system change for next week (a rule, a time, a removal; not "try harder")</label><input id="bm-c" value="${esc(B.change || (B.bn ? B.bn.fix : ''))}"></div>`;
  if (B.step === 3) body = `<h2>Next week's 3 outcomes</h2><div class="xs muted" style="margin-bottom:8px">Outcomes, not tasks. The first one is the business.</div>${[0, 1, 2].map((i) => `<input class="lf-in" id="bm-o${i}" value="${esc(B.out[i])}" placeholder="${['e.g. 300 dials, 8 owner talks', 'e.g. 2 timed BAC tests, error deck at 0', 'e.g. +0.4 kg trend, 6 sessions'][i]}">`).join('')}`;
  if (B.step === 4) body = `<h2>Meeting closed</h2><div class="lf-call">System change: <b>${esc(B.change || '–')}</b></div><div style="margin-top:10px">${B.out.filter(Boolean).map((o, i) => `<div class="lf-kv"><span>${i + 1}</span><b>${esc(o)}</b></div>`).join('')}</div>`;
  const nav = B.step < 4 ? `<div class="row" style="gap:8px;margin-top:14px">${B.step ? '<button class="btn" onclick="enBoardNav(-1)">Back</button>' : ''}<button class="btn grow primary" onclick="enBoardNav(1)">${B.step === 3 ? 'Close the meeting' : 'Next'}</button></div>` : `<button class="btn primary block" style="margin-top:14px" onclick="closeModal();render()">Done</button>`;
  openModal(head + body + nav, true);
  window._enVal = val;
}
function enBoardNav(dir) {
  const B = enBm; if (B.step === 1) { B.moved = $('bm-m').value; B.didnt = $('bm-d').value; } if (B.step === 2) B.change = $('bm-c').value.trim(); if (B.step === 3) B.out = [0, 1, 2].map((i) => $('bm-o' + i).value.trim());
  if (dir > 0 && B.step === 3) { S.boards = S.boards || {}; S.boards[B.k] = { id: B.k, _u: now(), done: true, nums: B.nums, moved: B.moved, didnt: B.didnt, change: B.change, out: B.out, bn: B.bn ? B.bn.name : '' }; save(); }
  B.step = Math.max(0, Math.min(4, B.step + dir)); enBoardStep();
}

/* ═════════ screen: Life → Engine ═════════ */
function lfEngineTab() {
  const C = enBottleneck(), top = C[0], F = enFiring(), P = enProtocols(), last = Object.values(S.boards || {}).filter((b) => b && b.done).sort((a, b) => (a.id < b.id ? 1 : -1))[0];
  return `<div class="sgrid st-g"><div class="card w2 en-top"><div class="card-h"><div class="card-t">Bottleneck now</div><div class="card-r">the weakest link gets the week</div></div>
    ${top ? `<div class="en-bn"><span>${esc(top.area)}</span><b>${esc(top.name)}</b><em>${esc(top.line)}</em></div><div class="lf-call">${esc(top.fix)}</div><button class="btn primary" style="margin-top:10px" onclick='${top.act}'>${top.btn}</button>` : ''}
    <div class="en-links">${C.map((c) => `<div><span>${esc(c.area)} · ${esc(c.name)}</span><i><u style="width:${Math.min(100, c.v * 100)}%" class="${c.v >= 0.8 ? 'ok' : c.v >= 0.5 ? 'mid' : 'bad'}"></u></i><b>${Math.round(c.v * 100)}%</b></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><div class="card-t">If-then protocols</div><div class="card-r">${F.length ? `<b class="bad">${F.length} firing</b>` : 'none firing'}</div></div>
      ${P.map((p) => `<div class="en-pr ${F.includes(p) ? 'fire' : ''} ${p.on ? '' : 'off'}"><div onclick="enProtoEdit('${p.id}')"><span>If ${esc((EN_TRIG[p.t] || ['?'])[0].toLowerCase())}</span><b>→ ${esc(p.txt)}</b></div><button onclick="enProtoToggle('${p.id}')">${p.on ? 'on' : 'off'}</button></div>`).join('')}
      <button class="btn sm" style="margin-top:8px" onclick="enProtoEdit('new')">+ Protocol</button></div>
    <div class="card"><div class="card-h"><div class="card-t">Tools</div></div>
      <button class="btn block" onclick="enBoard()">${enBoardDone() ? 'Board meeting ✓ · open again' : 'Weekly board meeting · 12 min'}</button>
      <button class="btn block" style="margin-top:8px" onclick="enReplanModal()">Replan the rest of today</button>
      <button class="btn block" style="margin-top:8px" onclick="enSimModal()">Before you say yes: commitment simulator</button>
      ${last ? `<div class="sec-h" style="margin-top:14px">This week's system change</div><div class="small">${esc(last.change || '–')}</div><div class="sec-h" style="margin-top:10px">Outcomes</div>${(last.out || []).filter(Boolean).map((o) => `<div class="small">· ${esc(o)}</div>`).join('')}` : ''}</div></div>`;
}
if (typeof renderLife === 'function' && !renderLife._en) {
  const _r = renderLife;
  renderLife = function () {
    const el = $('view-life'); if (!el) return;
    if (lifeTab === 'engine') { const tabs = [['engine', 'Engine'], ['score', 'Score & roads'], ['day', 'Day'], ['body', 'Body'], ['study', 'BAC'], ['focus', 'Focus']]; el.innerHTML = `<div class="crm-top"><div class="st-tabs">${tabs.map(([k, l]) => `<button class="${lifeTab === k ? 'on' : ''}" onclick="lifeTab='${k}';render()">${l}</button>`).join('')}</div></div>${lfEngineTab()}`; return; }
    _r(); const t = el.querySelector('.st-tabs'); if (t) t.insertAdjacentHTML('afterbegin', `<button onclick="lifeTab='engine';render()">Engine</button>`);
  };
  renderLife._en = 1; lifeTab = 'engine';
}

/* ═════════ ONE gets the engine: replan blocks, firing protocol, value per dial, Sunday board meeting ═════════ */
if (typeof oneNow === 'function' && !oneNow._en) {
  const _n = oneNow;
  oneNow = function () { const R = _n(), rp = (R.o.replan || []).filter((b) => tmin(b.end) > R.nm); if (rp.length) { const cur = rp.find((b) => tmin(b.start) <= R.nm && R.nm < tmin(b.end)); if (cur) R.cur = cur; else if (!R.cur) R.next = rp[0]; } return R; };
  oneNow._en = 1;
}
if (typeof oneHtml === 'function' && !oneHtml._en) {
  const _h = oneHtml;
  oneHtml = function () {
    let h = _h(); if (oneNight()) return h;
    const F = enFiring()[0], sun = dow(new Date()) === 7 && !enBoardDone();
    const extra = F ? `<div class="one-pr"><span>If-then · ${esc(EN_TRIG[F.t][0])}</span><b>${esc(F.txt)}</b><div><button onclick='enProtoDone("${F.id}");${F.act || ''}'>${esc(F.btn || 'Do it')}</button><button class="g" onclick='enProtoDone("${F.id}");oneShow(true)'>Handled</button></div></div>`
      : sun ? `<div class="one-pr"><span>Sunday</span><b>Weekly board meeting · 12 minutes. One system change, three outcomes.</b><div><button onclick="oneHide();enBoard()">Start</button></div></div>` : '';
    h = h.replace('<div class="one-mid">', `<div class="one-mid">${extra}`);
    h = h.replace(/(<div class="one-sub">)(\d+ of \d+ today)/, `$1≈ $${EN_PER_DIAL} of MRR per dial · $2`);
    return h.replace('<button class="one-exit"', `<button class="one-exit" onclick="oneHide(true);(typeof adChange==='function'?adChange:enReplanModal)()">Change today</button><button class="one-exit"`);
  };
  oneHtml._en = 1;
}
