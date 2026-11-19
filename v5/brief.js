/* War Room 11.0 · THE BRIEF. The home screen answers three questions before anything else:
   what needs my attention (with the reason), am I on the line toward each objective, what is the one move now (ARC already answers that).
   Everything here is computed from the log: facts, not suggestions; every item says why it is there and has one action. */
'use strict';
function bfAttention() {
  const A = [], tk = dk(new Date()), add = (lv, t, why, act, btn) => A.push({ lv, t, why, act, btn });
  try { const M = typeof mcBuild === 'function' ? mcBuild() : null; if (M && M.top) add(3, M.top.out, M.top.why, "mcGo('" + M.top.k + "')", M.top.next || 'Open'); } catch (e) { }   /* 13.25.0: same first line as the mission, always */
  try { const B = typeof enBottleneck === 'function' ? enBottleneck()[0] : null; if (B && B.v < 0.8) add(2, `14-day trend · ${B.area}: ${B.name}`, B.line, B.act, B.btn); } catch (e) { }
  try { const cb = qItems().filter((x) => x.status === 'callback' && x.next_at && x.next_at <= tk).length; if (cb) add(3, `${cb} callback${cb > 1 ? 's' : ''} due`, 'You promised to call back. Warm leads go cold in days.', "show('dial')", 'Call them'); } catch (e) { }
  try { Object.values(S.goals || {}).filter((g) => g && !g._del && !g.done && g.deadline && g.horizon !== 'long').forEach((g) => { const n = daysUntil(g.deadline); if (n <= 3 && goalPct(g) < 100) add(n <= 0 ? 3 : 2, g.title, n < 0 ? `Deadline passed ${-n} day${n === -1 ? '' : 's'} ago` : n === 0 ? 'Deadline is today' : `Deadline in ${n} day${n > 1 ? 's' : ''}`, "weekTab='goals';show('week')", 'Open'); }); } catch (e) { }
  try { const od = tasksList().filter((t) => !t.done && t.due && t.due < tk).length; if (od) add(od > 4 ? 2 : 1, `${od} overdue task${od > 1 ? 's' : ''}`, 'Do, reschedule or delete. A stale list stops being trusted.', "weekTab='tasks';show('week')", 'Clear'); } catch (e) { }
  try { if (typeof mnTotal === 'function') { const T = mnTotal(), c = mnBal('cash'); if (!T.any) add(1, 'Money never counted', 'Without one count no balance in the app is real.', "shGoHub('money');mnCountModal()", 'Count'); else if (c.days != null && c.days >= 10) add(1, `Money counted ${c.days} days ago`, 'Counting weekly keeps unlogged spending visible.', "shGoHub('money');mnCountModal()", 'Count'); } } catch (e) { }
  try { const W = weightEntries(), last = W[W.length - 1], n = last ? Math.round((new Date(tk) - new Date(last.k)) / 864e5) : null; if (n == null || n >= 4) add(1, n == null ? 'No weigh-in yet' : `No weigh-in for ${n} days`, 'The 85 kg line cannot be checked without it.', "cmdOpen('weighed ')", 'Log'); } catch (e) { }
  try { const wk = Object.values(S.boards || {}).some((b) => b && b.done && b.id === (typeof enWeekKey === 'function' ? enWeekKey() : '')); if (!wk && dow(new Date()) >= 6) add(2, 'No contract for this week', 'The weekly review is where the plan changes. 12 minutes.', 'enBoard()', 'Review'); } catch (e) { }
  try { if (typeof syncSummary === 'function' && /not synced/.test(syncSummary().short)) add(1, 'This device is not synced', 'Its data lives only here.', "moreTab='home';show('me')", 'Link'); } catch (e) { }
  return A.sort((a, b) => b.lv - a.lv);
}
function bfObjectives() {
  const u = (g, v) => (g.unit === '$' ? '$' + fmt(Math.round(v)) : fmt(Math.round(v * 10) / 10) + (g.unit ? ' ' + g.unit : ''));
  return Object.values(S.goals || {}).filter((g) => g && !g._del && !g.done).map((g) => { let r = null; try { r = roadOf(g); } catch (e) { } return { g, r }; }).filter((x) => x.r)
    .map(({ g, r }) => { const b = Math.round(r.buf), pct = Math.max(0, Math.min(100, goalPct(g))); return { g, r, b, pct, now: u(g, r.c), tgt: u(g, g.target), st: b < 0 ? 'bad' : b === 0 ? 'mid' : 'ok', label: b < 0 ? `${-b}d behind` : b === 0 ? 'on the line' : `${b}d ahead`, need: r.left && r.need > 0 ? `${Math.abs(r.need) < 1 ? fmt(r.need, 2) + (g.unit ? ' ' + g.unit : '') : u(g, r.need)}/${r.per}` : '' }; })
    .sort((a, b) => (a.g.horizon === 'week' ? 0 : 1) - (b.g.horizon === 'week' ? 0 : 1) || a.b - b.b);
}
function bfAttHtml(max) { const A = bfAttention(); if (!A.length) return '<div class="bf-clear"><b>Clear.</b><span>Nothing is falling behind right now.</span></div>'; return A.slice(0, max || 9).map((a, i) => `<div class="bf-a lv${a.lv}" style="animation-delay:${i * 50}ms"><i></i><div><b>${esc(a.t)}</b><span>${esc(a.why)}</span></div><button onclick="closeModal();${typeof arcGo === 'function' && typeof shArcOn === 'function' && shArcOn() ? `arcGo('${a.act.replace(/'/g, '&quot;').replace(/"/g, '&quot;')}')` : a.act.replace(/"/g, '&quot;')}">${a.btn}</button></div>`).join('') + (A.length > (max || 9) ? `<button class="bf-more" onclick="bfSheet()">${A.length - max} more</button>` : ''); }
function bfObjHtml(max) { const O = bfObjectives(); if (!O.length) return `<div class="bf-clear"><span>No objective has a target and a date yet.</span></div>`; return O.slice(0, max || 12).map((o) => `<div class="bf-o ${o.st}" onclick="closeModal();weekTab='goals';${typeof arcHide === 'function' ? 'arcHide(true);' : ''}show('week')"><div class="bf-ot"><b>${esc(o.g.title.replace(/\s*\(.*\)$/, ''))}</b><em>${o.label}</em></div><div class="bf-ob"><u style="width:${o.pct}%"></u></div><div class="bf-os"><span>${o.now} of ${o.tgt}</span><span>${o.need ? 'need ' + o.need : ''}</span></div></div>`).join(''); }
function bfSheet() { openModal(`<h2>The brief</h2><div class="bf-h">Needs attention</div>${bfAttHtml()}<div class="bf-h" style="margin-top:18px">Objectives · are you on the line</div>${bfObjHtml()}<div class="xs muted" style="margin-top:12px">Each objective is a straight line from start to target date. Behind = the days you would need to make up.</div>`, true); }
function bfStrip() { const A = bfAttention(), O = bfObjectives(), off = O.filter((o) => o.b < 0).length, top = A[0]; return `<button class="bf-strip ${top ? 'lv' + top.lv : 'ok'}" onclick="bfSheet()"><i></i><span><b>${A.length ? A.length + ' need' + (A.length === 1 ? 's' : '') + ' attention' : 'All clear'}</b>${top ? esc(top.t) : 'nothing falling behind'}</span><em>${O.length ? `${O.length - off}/${O.length} on line` : ''} ›</em></button>`; }
/* phone: one strip under the day meters. desktop: full lists in the side column */
if (typeof arcHtml === 'function' && !arcHtml._bf) {
  const _h = arcHtml;
  arcHtml = function () {
    let h = _h(); try {
      if (typeof dkWide === 'function' && dkWide() && h.indexOf('dk-col3') > 0) h = h.replace('<div class="dk-col3">', `<div class="dk-col3"><div class="card bf-card"><div class="dk-k">Needs attention</div>${bfAttHtml(4)}</div><div class="card bf-card"><div class="dk-k">Objectives</div>${bfObjHtml(5)}</div>`);
      else { const i = h.indexOf('<div class="arc-line">'); if (i > 0) h = h.slice(0, i) + bfStrip() + h.slice(i); }
    } catch (e) { } return h;
  };
  arcHtml._bf = 1;
}
document.addEventListener('keydown', (e) => { if (e.key === 'b' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '') && !document.querySelector('.modal.on,.modal-bg.on')) bfSheet(); });

/* ── global search inside the command bar: screens, agencies, playbook, tasks, money. "/" or Ctrl/⌘+K ── */
const BF_GO = [['Day', "show('now')"], ['Dial', "show('dial')"], ['Pipeline', "show('crm')"], ['Intel', "show('intel')"], ['Playbook', "show('book')"], ['Money', "show('money')"], ['Transactions', "mnTab='tx';show('money')"], ['Overview · life', "show('life')"], ['Train', "show('train')"], ['Training log', "show('trlog')"], ['Food', "show('food')"], ['Stats', "show('stats')"], ['Plan', "weekTab='plan';show('week')"], ['Tasks', "weekTab='tasks';show('week')"], ['Goals', "weekTab='goals';show('week')"], ['Weekly review', 'enBoard()'], ['Calendar', "show('cal')"], ['Ask', "show('ask')"], ['Settings', "moreTab='home';show('me')"], ['The brief · what needs attention', 'bfSheet()'], ['Count my money', "show('money');mnCountModal()"], ['Change today', 'adChange()'], ['Log anything', 'shCapture()']];
function bfSearch(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return ''; const hit = (s) => String(s || '').toLowerCase().includes(q), R = [], row = (k, t, s, act) => R.push(`<button class="bf-r" onclick="closeModal();${typeof arcHide === 'function' ? 'try{arcHide(true)}catch(e){};' : ''}${act.replace(/"/g, '&quot;')}"><em>${k}</em><b>${esc(t)}</b><span>${esc(s || '')}</span></button>`);
  BF_GO.filter((x) => hit(x[0])).slice(0, 4).forEach((x) => row('Go', x[0], '', x[1]));
  try { qItems().filter((x) => hit(x.agency) || hit(x.contact) || hit(x.city)).slice(0, 5).forEach((x) => row('Agency', x.agency, [x.city, x.contact, x.status].filter(Boolean).join(' · '), `show('crm');crmOpen(${typeof x.id === 'number' ? x.id : `'${x.id}'`})`)); } catch (e) { }
  try { pbAll().filter((p) => hit(p.title) || hit(p.body)).slice(0, 4).forEach((p) => row('Playbook', p.title, '', `pbOpen='${p.id}';show('book')`)); } catch (e) { }
  try { tasksList().filter((t) => !t.done && hit(t.title)).slice(0, 4).forEach((t) => row('Task', t.title, t.due || '', "weekTab='tasks';show('week')")); } catch (e) { }
  try { mnTx().filter((t) => hit(t.note) || hit(mnCatName(t.cat))).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4).forEach((t) => row('Money', (t.note && t.note !== 'from the day log' ? t.note : mnCatName(t.cat)), `${t.date} · ${mnF(t.amt, mnAccCur(t.acc))}`, `show('money');mnEdit('${t.id}')`)); } catch (e) { }
  return R.length ? R.join('') : '<div class="bf-none">No match. Press Enter to run it as a command.</div>';
}
if (typeof cmdOpen === 'function' && !cmdOpen._bf) {
  const _c = cmdOpen;
  cmdOpen = function (pre) { _c(pre); setTimeout(() => { const i = document.getElementById('cmd-in'), o = document.getElementById('cmd-out'); if (!i || !o || document.getElementById('bf-res')) return; i.placeholder = 'Search anything, or type what happened: "35 dials", "weighed 78.4"'; o.insertAdjacentHTML('beforebegin', '<div id="bf-res"></div>'); i.addEventListener('input', () => { const r = document.getElementById('bf-res'); if (r) r.innerHTML = bfSearch(i.value); }); if (i.value) i.dispatchEvent(new Event('input')); }, 30); };
  cmdOpen._bf = 1;
}
document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen(); } });
