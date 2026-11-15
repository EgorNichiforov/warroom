/* War Room 12.0 · PAY CYCLE — earning is not receiving.
   Concepts (one ledger, no duplicated facts):
     earning   = an 'in' transaction in a source that is paid monthly. It belongs to the month the work was done. It is NOT cash.
     payout    = a 'pay' transaction {src, period:'YYYY-MM', acc, amt}. Real cash arriving. It settles that period. It is NOT new income.
     cash in   = an 'in' transaction in a source paid on the day (or flagged cash:true). Income and cash at once.
     available = last count of each account + cash in + payouts − spending ± transfers after that count.  (mnBal)
     owed      = for every closed period after "settled through": earned − paid.   accruing = the current month's earnings.
   Periods up to S.settings.mnPay.through are treated as settled before tracking began (a setting, not invented transactions). */
'use strict';
function mn4Cfg() { const c = S.settings.mnPay = S.settings.mnPay || {}; c.src = c.src || { tennis: { monthly: true, day: null } }; if (c.through === undefined) { const fc = mnTx().filter((t) => t.type === 'count').map((t) => t.date).sort()[0]; if (fc) { const d = pd(fc); c.through = mnYm(new Date(d.getFullYear(), d.getMonth() - 2, 1)); } } return c; }
function mn4Monthly(cat) { const s = mn4Cfg().src[cat]; return !!(s && s.monthly); }
function mn4Accr(t) { return t.type === 'in' && !t.cash && mn4Monthly(t.cat); }
function mn4Periods() {
  const c = mn4Cfg(), P = {}, cur = mnYm(new Date()), key = (s, p) => s + '|' + p, get = (s, p) => (P[key(s, p)] = P[key(s, p)] || { src: s, period: p, earned: 0, paid: 0, pays: [] });
  mnTx().forEach((t) => { if (mn4Accr(t)) get(t.cat, t.date.slice(0, 7)).earned += mnB(t.amt, mnAccCur(t.acc)); else if (t.type === 'pay') { const x = get(t.src, t.period); x.paid += mnB(t.amt, mnAccCur(t.acc)); x.pays.push(t); } });
  return Object.values(P).map((x) => { x.pre = !!c.through && x.period <= c.through && !x.pays.length; x.out = x.pre ? 0 : Math.max(0, Math.round(x.earned - x.paid)); x.cur = x.period === cur; const day = (c.src[x.src] || {}).day; if (day) { const [y, m] = x.period.split('-').map(Number); x.due = dk(new Date(y, m, Math.min(28, day))); }
    x.status = x.pre ? 'before tracking' : x.cur ? 'accruing' : x.out <= 0 ? 'paid' : x.paid > 0 ? 'partially paid' : x.due && x.due < dk(new Date()) ? 'overdue' : 'awaiting payment'; return x; }).sort((a, b) => (a.period < b.period ? 1 : -1));
}
function mn4Sum() { const P = mn4Periods(); return { P, owed: P.filter((x) => !x.cur && !x.pre).reduce((a, x) => a + x.out, 0), accruing: P.filter((x) => x.cur).reduce((a, x) => a + x.out, 0), open: P.filter((x) => !x.pre && (x.cur || x.out > 0)) }; }
/* balances: earnings never touch an account, payouts do */
mnBal = function (acc) {
  const T = mnTx(), counts = T.filter((t) => t.type === 'count' && t.acc === acc).sort((a, b) => (mnSeq(a) < mnSeq(b) ? -1 : 1)), last = counts[counts.length - 1]; let bal = last ? Number(last.amt) || 0 : 0, n = 0;
  T.forEach((t) => { if (t.type === 'count' || (last && mnSeq(t) <= mnSeq(last)) || mn4Accr(t)) return; const a = Number(t.amt) || 0; if (t.acc === acc) { if (t.type === 'in' || t.type === 'pay') { bal += a; n++; } else if (t.type === 'out' || t.type === 'move') { bal -= a; n++; } } if (t.type === 'move' && t.to === acc) { bal += Number(t.toAmt) || a; n++; } });
  return { bal, counted: !!last, last, n, days: last ? lfDaysSafe(pd(last.date), new Date()) : null };
};
if (typeof mn2Flow === 'function') { const _f = mn2Flow; mn2Flow = function (t) { if (mn4Accr(t)) return 0; if (t.type === 'pay') return mnB(t.amt, mnAccCur(t.acc)); return _f(t); }; }
mnAvgIn = function (days) { const from = dk(addDays(new Date(), -days)); return mnTx().filter((t) => ((t.type === 'in' && !mn4Accr(t)) || t.type === 'pay') && t.date > from && !t.plan).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0) / days; };
if (typeof mnMonth === 'function' && !mnMonth._m4) { const _f = mnMonth; mnMonth = function (ym) { const r = _f(ym); r.received = mnTx().filter((t) => t.date.slice(0, 7) === ym && (t.type === 'pay' || (t.type === 'in' && !mn4Accr(t)))).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); return r; }; mnMonth._m4 = 1; }
/* the balance chart shows only what was counted: nothing is back-computed before the first count */
if (typeof mn2History === 'function' && !mn2History._m4) { const _f = mn2History; mn2History = function (days) { const H = _f(days); if (H.firstCount) { const first = H.pts.find((p) => p.k >= H.firstCount); H.pts.forEach((p) => { if (p.k < H.firstCount) { p.b = first ? first.b : p.b; p.est = true; } }); } return H; }; mn2History._m4 = 1; }
/* recording the paycheck */
function mn4PayModal(src, period, id) {
  const t = id ? S.txns[id] : null, P = mn4Periods().find((x) => x.src === (t ? t.src : src) && x.period === (t ? t.period : period)) || { earned: 0, paid: 0, out: 0, src, period }, A = mnAccs().filter((a) => a.type !== 'owed');
  openModal(`<h2>${t ? 'Edit payout' : 'Pay received'}</h2><div class="small muted" style="margin-bottom:12px">${esc(mnCatName(P.src))} · ${mnMonthName(P.period)} · earned <b>${mnF(P.earned)}</b>${P.paid ? ` · already paid ${mnF(P.paid)}` : ''}. This moves money you already earned into an account. It is not counted as income again.</div>
    <div class="g2"><div class="field"><label>Amount received</label><input id="m4-a" type="number" inputmode="decimal" value="${t ? t.amt : P.out || ''}"></div><div class="field"><label>Date it arrived</label><input id="m4-d" type="date" value="${t ? t.date : dk(new Date())}"></div></div>
    <div class="field"><label>Into</label><select id="m4-acc">${A.map((a) => `<option value="${a.id}" ${(t ? t.acc : mnDefAcc('MDL')) === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary grow" onclick="mn4PaySave('${P.src}','${P.period}','${id || ''}')">${t ? 'Save' : 'Record payout'}</button>${t ? `<button class="btn" id="m4-del" onclick="mn4PayDel('${id}')">Delete</button>` : ''}</div>
    <div class="xs muted" style="margin-top:10px">Less than the full amount? Type what arrived: the rest stays owed (partially paid).</div>`);
}
function mn4PaySave(src, period, id) { const a = Number($('m4-a').value); if (!(a > 0)) { toast('Type the amount that arrived'); return; } const acc = $('m4-acc').value, t = id && S.txns[id] ? S.txns[id] : { id: uid(), at: now() }; Object.assign(t, { type: 'pay', src, period, cat: src, acc, amt: a, date: $('m4-d').value || dk(new Date()), note: 'Pay received · ' + mnMonthName(period), _u: now() }); S.txns[t.id] = t; save(); closeModal(); render(); toast(`${mnF(a, mnAccCur(acc))} received · ${mnMonthName(period)} ${mn4Periods().find((x) => x.src === src && x.period === period).out > 0 ? 'partially paid' : 'settled'}`); }
function mn4PayDel(id) { const b = $('m4-del'); if (b && !b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Tap again'; b.classList.add('danger'); return; } const t = S.txns[id]; if (t) { t._del = true; t._u = now(); } save(); closeModal(); render(); toast('Payout removed · the period is owed again'); }
function mn4Setup() {
  const c = mn4Cfg(), months = [...new Set(mnTx().filter((t) => t.type === 'in').map((t) => t.date.slice(0, 7)))].sort().reverse();
  openModal(`<h2>How you get paid</h2><div class="small muted" style="margin-bottom:12px">Earnings are logged on the day you work. Tick the sources that pay you once a month: their earnings stay "owed" until you record the payout, and never inflate your cash.</div>
    ${MN_IN.map(([id, nm]) => `<div class="row sb" style="padding:8px 0;border-bottom:1px solid var(--line);gap:10px"><label class="row" style="gap:10px;flex:1"><input type="checkbox" id="m4s-${id}" ${mn4Monthly(id) ? 'checked' : ''} style="width:20px;height:20px"> <span>${esc(nm)}</span></label><input type="number" inputmode="numeric" id="m4d-${id}" min="1" max="28" placeholder="pay day" value="${(c.src[id] || {}).day || ''}" style="width:96px"></div>`).join('')}
    <div class="field" style="margin-top:14px"><label>Already paid before tracking began, through</label><select id="m4-th"><option value="">nothing</option>${months.map((m) => `<option value="${m}" ${c.through === m ? 'selected' : ''}>${mnMonthName(m)}</option>`).join('')}</select></div>
    <div class="xs muted" style="margin:6px 0 12px">Months up to this one are treated as paid in the past. Later months are owed until you record their payout.</div>
    <button class="btn primary block" onclick="mn4SetupSave()">Save</button>`);
}
function mn4SetupSave() { const c = mn4Cfg(); MN_IN.forEach(([id]) => { const on = $('m4s-' + id).checked, d = Number($('m4d-' + id).value) || null; if (on || c.src[id]) c.src[id] = { monthly: on, day: d }; }); c.through = $('m4-th').value || null; touch(S.settings); save(); closeModal(); render(); toast('Pay setup saved'); }
function mn4Card() {
  const M = mn4Sum(); if (!M.P.length) return '';
  const row = (x) => `<div class="m4-row ${x.status.replace(/ /g, '-')}"><div><b>${esc(mnCatName(x.src))} · ${mnMonthName(x.period)}</b><span>earned ${mnF(x.earned)}${x.paid ? ` · paid ${mnF(x.paid)}` : ''}${x.due && !x.cur ? ` · due ${fmtShort(pd(x.due))}` : ''}</span></div><em>${x.status}</em><strong>${mnF(x.cur ? x.earned : x.out)}</strong>${x.cur ? '<i></i>' : `<button onclick="mn4PayModal('${x.src}','${x.period}')">Received</button>`}</div>`;
  const paid = M.P.filter((x) => x.pays.length).slice(0, 3);
  return `<div class="card m4"><div class="card-h"><div class="card-t">Owed to you</div><div class="card-r"><a href="#" onclick="mn4Setup();return false">how you get paid</a></div></div>
    <div class="m4-top"><div><span>Earned, not received yet</span><b>${mcNum(M.owed)}</b></div><div><span>This month so far</span><b>${mcNum(M.accruing)}</b></div></div>
    ${M.open.length ? M.open.map(row).join('') : '<div class="xs muted">Nothing outstanding.</div>'}
    ${paid.length ? `<div class="m4-paid">${paid.map((x) => x.pays.map((t) => `<a href="#" onclick="mn4PayModal('','','${t.id}');return false">${mnMonthName(x.period)} paid ${mnF(t.amt, mnAccCur(t.acc))} on ${fmtShort(pd(t.date))}</a>`).join('')).join('')}</div>` : ''}
    <div class="xs muted" style="margin-top:10px">Not part of "You have". It becomes cash when you tap Received; it is never counted as income twice.</div></div>`;
}
/* the truth card, rebuilt on received money. No invented transactions: what the log cannot explain is shown as exactly that. */
mn3Life = function () {
  const b = (t) => mnB(t.amt, mnAccCur(t.acc)), c = mn4Cfg(), M = mn4Sum(); let earned = 0, recv = 0, out = 0;
  mnTx().forEach((t) => { if (t.type === 'in') { earned += b(t); if (!mn4Accr(t) || (c.through && t.date.slice(0, 7) <= c.through)) recv += b(t); } else if (t.type === 'pay') recv += b(t); else if (t.type === 'out' && !t.est) out += b(t); else if (t.type === 'count' && t.diff) { if (t.diff < 0) out += -mnB(t.diff, mnAccCur(t.acc)); else recv += mnB(t.diff, mnAccCur(t.acc)); } });
  const tot = mnTotal(); return { inn: earned, earned, recv, out, est: 0, have: tot.t, any: tot.any, owed: M.owed, accruing: M.accruing, gap: Math.round(recv - out - tot.t) };
};
mn3Card = function () {
  const L = mn3Life(); if (!L.any || L.earned <= 0) return ''; const fc = mnTx().filter((t) => t.type === 'count').map((t) => t.date).sort()[0];
  const seg = (parts) => { const tot = Math.max(1, parts.reduce((a, p) => a + Math.max(0, p[1]), 0)); return `<div class="mn3-bar">${parts.map(([n, v, c]) => v > 0 ? `<i style="flex:${v / tot};background:${c}" title="${n}"></i>` : '').join('')}</div><div class="mn3-leg">${parts.map(([n, v, c]) => `<div><u style="background:${c}"></u><span>${n}</span><b>${mnF(v)}</b><em>${Math.round(Math.max(0, v) / tot * 100)}%</em></div>`).join('')}</div>`; };
  return `<div class="card mn3"><div class="card-h"><div class="card-t">Everything you earned, and where it is</div><div class="card-r">since ${fmtShort(pd(mnTx().map((t) => t.date).sort()[0]))}</div></div>
    <div class="mn3-big">${mcNum(L.earned)}<span>earned in total</span></div>
    ${seg([['Received', L.recv, 'var(--ok)'], ['Owed to you', L.owed, 'var(--acc)'], ['This month, accruing', L.accruing, 'var(--line2)']])}
    <div class="dk-k" style="margin:16px 0 8px">Of the ${mnF(L.recv)} received</div>
    ${seg([['Spending you logged', L.out, 'var(--bad)'], [L.gap >= 0 ? 'Not tracked' : 'Logged more than received', Math.abs(L.gap), 'var(--dim)'], ['You have now', L.have, 'var(--ok)']])}
    <div class="hint" style="margin-top:12px">${fc ? `Expenses were not logged consistently before ${fmtShort(pd(fc))}. ` : ''}"Not tracked" is only what the log cannot explain: spending, withdrawals or anything else never recorded. It is not broken into invented transactions. Reliable spending numbers start ${fc ? fmtShort(pd(fc)) : 'at your first count'}.</div></div>`;
};
/* the earlier automatic estimate split is retired: remove what it created (once), never create it again */
mn3Auto = function () { try { mnInit(); const st = S.settings.mnEst || {}; if (st.v === 2) return; let n = 0; mnTx().forEach((t) => { if (t.est) { t._del = true; t._u = now(); n++; } }); S.settings.mnEst = { v: 2, at: now(), off: true }; if (n) { touch(S.settings); save(); if (typeof render === 'function') render(); } } catch (e) { } };
if (typeof mnOver === 'function' && !mnOver._m4) { const _f = mnOver; mnOver = function () { let h = _f(); const c = mn4Card(); const i = h.indexOf('<div class="card mn3">'); const j = i > 0 ? i : h.indexOf('<div class="sgrid st-g">'); h = c && j > 0 ? h.slice(0, j) + c + h.slice(j) : h + c; return h.replace('<span>Kept this month</span>', '<span>Earned − spent this month</span>'); }; mnOver._m4 = 1; }
/* rows: a payout reads as money arriving, an earning says it is not cash yet */
if (typeof mnRows === 'function' && !mnRows._m4) { const _f = mnRows; mnRows = function (L) { return _f(L.map((t) => t.type === 'pay' ? Object.assign({}, t, { type: 'in' }) : mn4Accr(t) ? Object.assign({}, t, { note: (t.note && t.note !== 'from the day log' ? t.note + ' · ' : '') + 'earned · paid monthly' }) : t)); }; mnRows._m4 = 1; }
if (typeof mnEdit === 'function' && !mnEdit._m4) { const _f = mnEdit; mnEdit = function (id, pre) { const t = id && S.txns[id]; if (t && t.type === 'pay') return mn4PayModal('', '', id); return _f.apply(this, arguments); }; mnEdit._m4 = 1; }
/* past balances the user reports (e.g. "end of August I had about …"): reference points, never used to infer spending */
function mn4SnapAdd() { openModal(`<h2>A past balance</h2><div class="small muted" style="margin-bottom:12px">A total you remember having on a date. It is kept as a reference point on the balance chart, marked as reported. It is never used to guess what you spent.</div><div class="g2"><div class="field"><label>Date</label><input id="m4s-d" type="date"></div><div class="field"><label>Total (MDL)</label><input id="m4s-a" type="number" inputmode="decimal"></div></div><button class="btn primary block" style="margin-top:12px" onclick="(function(){const d=$('m4s-d').value,a=Number($('m4s-a').value);if(!d||!(a>0)){toast('Date and amount');return;}const c=mn4Cfg();c.snaps=(c.snaps||[]).concat([{d:d,a:a}]);touch(S.settings);save();closeModal();render();toast('Reference saved');})()">Save</button>`); }
function mn4Snaps() { const c = mn4Cfg(), L = (c.snaps || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1)); return `<div class="m4-snaps"><span>Reported past balances</span>${L.map((s, i) => `<b>${fmtShort(pd(s.d))} · about ${mnF(s.a)}<a href="#" onclick="mn4Cfg().snaps.splice(${i},1);touch(S.settings);save();render();return false" aria-label="Remove">×</a></b>`).join('')}<a href="#" onclick="mn4SnapAdd();return false">+ add one</a></div>`; }
if (typeof mnOver === 'function' && !mnOver._m4s) { const _f = mnOver; mnOver = function () { const h = _f(), k = h.indexOf('<div class="mn2-kpis">'); return k > 0 ? h.slice(0, k) + mn4Snaps() + h.slice(k) : h; }; mnOver._m4s = 1; }
/* data honesty: until there are 30 days of consistent tracking, comparisons against "usual" are not shown as facts */
function mn4Age() { const fc = mnTx().filter((t) => t.type === 'count').map((t) => t.date).sort()[0]; return fc ? lfDaysSafe(pd(fc), new Date()) : null; }
if (typeof mnOver === 'function' && !mnOver._m4q) { const _f = mnOver; mnOver = function () { let h = _f(); const age = mn4Age(); if (age == null) return h;
    if (age < 2) h = h.replace('<div class="card mn2-top">', '<div class="card mn2-top young">').replace('<div class="m4-snaps">', `<div class="m4-young">Tracking started ${age === 0 ? 'today' : 'yesterday'}. The balance line draws itself from your counts and logged money from here on. Nothing before the first count is back-filled.</div><div class="m4-snaps">`);
    if (age < 30) { const a = h.indexOf('<div class="mn2-ins">'); if (a > 0) { const b = h.indexOf('</div></div>', a); if (b > 0) h = h.slice(0, a) + `<div class="m4-q"><b>Day ${age + 1} of consistent tracking.</b> Pace, runway and "usual month" comparisons need 30 days of complete logging before they mean anything; until then treat them as rough.</div>` + h.slice(b + 12); } }
    return h; }; mnOver._m4q = 1; }

/* ── 12.1 · estimate between two known balances. start + money that arrived − end = what left. Shown as an estimate with its
   assumptions; no transactions are created from it. ── */
function mn4Arrive(src, period) { const day = (mn4Cfg().src[src] || {}).day || 15, [y, m] = period.split('-').map(Number); return dk(new Date(y, m, Math.min(28, day))); }
function mn4Est() {
  const c = mn4Cfg(), T = mnTx(), b = (t) => mnB(t.amt, mnAccCur(t.acc)), counts = T.filter((t) => t.type === 'count').sort((a, x) => (mnSeq(a) < mnSeq(x) ? -1 : 1)); if (!counts.length) return [];
  const fc = counts[0].date, first = {}; counts.filter((t) => t.date === fc).forEach((t) => { if (!(t.acc in first)) first[t.acc] = b(t); });
  const pts = (c.snaps || []).filter((s) => s.d < fc).map((s) => ({ d: s.d, a: Number(s.a), rep: true })).sort((a, x) => (a.d < x.d ? -1 : 1)); pts.push({ d: fc, a: Object.values(first).reduce((a, v) => a + v, 0) });
  const c0 = mnSeq(counts[0]), inR = (t, A, B) => t.date > A && t.date <= B && !(t.date === fc && mnSeq(t) > c0); /* what happened after the count on the count day belongs to the tracked period */
  const per = {}; T.forEach((t) => { if (mn4Accr(t) && c.through && t.date.slice(0, 7) <= c.through) { const k = t.cat + '|' + t.date.slice(0, 7); per[k] = (per[k] || 0) + b(t); } });
  const recvIn = (A, B) => { let r = 0; Object.entries(per).forEach(([k, v]) => { const [s, p] = k.split('|'), d = mn4Arrive(s, p); if (d > A && d <= B) r += v; }); T.forEach((t) => { if (((t.type === 'in' && !mn4Accr(t)) || t.type === 'pay') && inR(t, A, B)) r += b(t); }); return r; };
  const out = [], t0 = T.filter((t) => t.type === 'in' || t.type === 'out').map((t) => t.date).sort()[0];
  if (pts.length > 1 && t0 && t0 < pts[0].d) { const recv = recvIn('0000', pts[0].d), logged = T.filter((t) => t.type === 'out' && !t.est && t.date <= pts[0].d).reduce((a, t) => a + b(t), 0); out.push({ pre: true, from: t0, to: pts[0].d, recv, logged, end: pts[0].a, extra: Math.round(pts[0].a - (recv - logged)) }); }
  for (let i = 0; i < pts.length - 1; i++) { const A = pts[i], B = pts[i + 1], recv = recvIn(A.d, B.d), logged = T.filter((t) => t.type === 'out' && !t.est && inR(t, A.d, B.d)).reduce((a, t) => a + b(t), 0), spent = Math.round(A.a + recv - B.a), days = Math.max(1, lfDaysSafe(pd(A.d), pd(B.d))); out.push({ from: A.d, to: B.d, start: A.a, end: B.a, recv, logged, spent, unlogged: Math.round(spent - logged), days, perMonth: Math.round(spent / days * 30.4), perDay: Math.round(spent / days) }); }
  return out;
}
function mn4EstCard() {
  const E = mn4Est().filter((e) => !e.pre), P = mn4Est().find((e) => e.pre); if (!E.length) return '';
  return `<div class="card m4e"><div class="card-h"><div class="card-t">What you really spent · estimate</div><div class="card-r">from your reported balances</div></div>
    ${E.map((e) => `<div class="m4e-big"><b>${mcNum(e.spent)}</b><span>left your hands between ${fmtShort(pd(e.from))} and ${fmtShort(pd(e.to))} · about <b>${mnF(e.perMonth)}</b> a month, ${mnF(e.perDay)} a day</span></div>
      <div class="m4e-eq"><div><span>You had</span><b>${mnF(e.start)}</b></div><i>+</i><div><span>Arrived</span><b>${mnF(e.recv)}</b></div><i>−</i><div><span>You have</span><b>${mnF(e.end)}</b></div><i>=</i><div class="r"><span>Gone</span><b>${mnF(e.spent)}</b></div></div>
      <div class="mn3-bar" style="margin-top:14px"><i style="flex:${Math.max(0, e.logged)};background:var(--bad)"></i><i style="flex:${Math.max(0, e.unlogged)};background:var(--dim)"></i></div>
      <div class="mn3-leg"><div><u style="background:var(--bad)"></u><span>Logged at the time</span><b>${mnF(e.logged)}</b><em>${Math.round(e.logged / Math.max(1, e.spent) * 100)}%</em></div><div><u style="background:var(--dim)"></u><span>Never logged</span><b>${mnF(e.unlogged)}</b><em>${Math.round(e.unlogged / Math.max(1, e.spent) * 100)}%</em></div></div>`).join('')}
    ${P ? `<div class="hint" style="margin-top:12px">Before ${fmtShort(pd(P.to))} the log holds up: money received minus logged spending gives ${mnF(P.recv - P.logged)}, and you reported ${mnF(P.end)}. ${P.extra >= 0 ? `The ${mnF(P.extra)} extra is money you already had, or income never logged.` : `${mnF(-P.extra)} is unexplained there too.`}</div>` : ''}
    <div class="xs muted" style="margin-top:10px">Assumptions: each month's pay arrives around the ${(Object.values(mn4Cfg().src).find((s) => s.monthly && s.day) || {}).day || 15}th of the next month; the reported balance is right; no other money came in. This is arithmetic on balances, not a list of purchases, and it adds nothing to your transactions.</div></div>`;
}
if (typeof mnOver === 'function' && !mnOver._m4e) { const _f = mnOver; mnOver = function () { const h = _f(), c = mn4EstCard(), i = h.indexOf('<div class="card mn3">'); return c && i > 0 ? h.slice(0, i) + c + h.slice(i) : h; }; mnOver._m4e = 1; }
/* the exceptions: a lesson paid in your hand on the day. Say "cash" and it counts as cash at once: "+500 tennis cash" */
if (typeof mnPut === 'function' && !mnPut._m4) { const _f = mnPut; mnPut = function (t) { if (t && t.type === 'in' && t.cash === undefined && /\b(cash|numerar|in hand)\b/i.test(t.note || '')) t.cash = true; return _f(t); }; mnPut._m4 = 1; }
