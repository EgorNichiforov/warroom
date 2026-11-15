/* War Room 10.2 · Money truth: earned − have = spent. What was never logged gets estimated, spread over the months, marked, editable.
   Pattern from YNAB "reconcile" + Copilot "untracked": the count is the truth, the gap becomes explicit estimated transactions. */
'use strict';
const MN3_W = { food: 35, transport: 25, out: 25, other: 15 };
function mn3Est() { return mnTx().filter((t) => t.est); }
function mn3Life() {
  const T = mnTx(), b = (t) => mnB(t.amt, mnAccCur(t.acc)); let inn = 0, out = 0, est = 0;
  T.forEach((t) => { if (t.type === 'in') inn += b(t); else if (t.type === 'out') { if (t.est) est += b(t); else out += b(t); } else if (t.type === 'count' && t.diff) { if (t.diff < 0) out += -mnB(t.diff, mnAccCur(t.acc)); else inn += mnB(t.diff, mnAccCur(t.acc)); } });
  const tot = mnTotal(); return { inn, out, est, have: tot.t, any: tot.any, gap: Math.round(inn - out - est - tot.t) };
}
function mn3Build(gap, W) {
  const T = mnTx().filter((t) => (t.type === 'in' || t.type === 'out') && !t.est), counts = mnTx().filter((t) => t.type === 'count').sort((a, b) => (mnSeq(a) < mnSeq(b) ? -1 : 1));
  if (!T.length || !counts.length || gap <= 0) return [];
  const first = T.map((t) => t.date).sort()[0], c0 = counts[0], end = c0.date, months = {};
  for (let d = pd(first); dk(d) <= end; d = addDays(d, 1)) { const ym = dk(d).slice(0, 7); months[ym] = months[ym] || { days: 0, inn: 0, out: 0 }; months[ym].days++; }
  T.forEach((t) => { const m = months[t.date.slice(0, 7)]; if (!m || t.date > end) return; const v = mnB(t.amt, mnAccCur(t.acc)); if (t.type === 'in') m.inn += v; else m.out += v; });
  const K = Object.keys(months).sort(), totDays = K.reduce((a, k) => a + months[k].days, 0), totIn = K.reduce((a, k) => a + months[k].inn, 0) || 1, totOut = K.reduce((a, k) => a + months[k].out, 0);
  /* a month's true spending ≈ half by time, half by what came in that month; the estimate is what is missing from the log */
  let miss = K.map((k) => Math.max(0, (0.5 * months[k].days / totDays + 0.5 * months[k].inn / totIn) * (totOut + gap) - months[k].out)); const sm = miss.reduce((a, b) => a + b, 0) || 1; miss = miss.map((v) => v * gap / sm);
  const ws = Object.entries(W).filter((x) => x[1] > 0), wt = ws.reduce((a, x) => a + x[1], 0) || 1, out = []; let used = 0;
  K.forEach((k, i) => { const same = k === end.slice(0, 7), date = same ? end : k + '-15', at = same ? (c0.at || now()) - 1000 : new Date(date + 'T12:00:00').getTime();
    ws.forEach(([c, w]) => { const amt = Math.round(miss[i] * w / wt / 10) * 10; if (amt > 0) { out.push({ id: 'est-' + k + '-' + c, date, at, type: 'out', acc: c0.acc && mnAccCur(c0.acc) === 'MDL' ? c0.acc : mnDefAcc('MDL'), amt, cat: c, note: '≈ estimate · not logged at the time', est: true }); used += amt; } }); });
  if (out.length) { const big = out.slice().sort((a, b) => b.amt - a.amt)[0]; big.amt = Math.max(0, big.amt + Math.round(gap - used)); }
  return out;
}
function mn3Apply(W, quiet) {
  mnInit(); mn3Est().forEach((t) => { t._del = true; t._u = now(); });
  const L = mn3Life(), gap = L.gap; W = W || (S.settings.mnEst && S.settings.mnEst.w) || MN3_W;
  const E = mn3Build(gap, W); E.forEach((t) => { t._u = now(); delete t._del; S.txns[t.id] = t; });
  S.settings.mnEst = { at: now(), gap: E.length ? gap : 0, w: W, off: false }; touch(S.settings); save(); if (!quiet) { closeModal(); render(); toast(E.length ? `Estimated ${mnF(gap)} of unlogged spending across ${new Set(E.map((t) => t.date.slice(0, 7))).size} months` : 'Nothing to estimate: the log already matches your count'); }
  return E.length;
}
function mn3Remove() { mn3Est().forEach((t) => { t._del = true; t._u = now(); }); S.settings.mnEst = Object.assign({}, S.settings.mnEst, { off: true, gap: 0 }); touch(S.settings); save(); closeModal(); render(); toast('Estimates removed'); }
function mn3Modal() {
  const L = mn3Life(), W = (S.settings.mnEst && S.settings.mnEst.w) || MN3_W, g = L.gap + L.est;
  openModal(`<h2>Unlogged spending</h2><div class="small muted" style="margin-bottom:12px">You logged <b>${mnF(L.inn)}</b> earned and <b>${mnF(L.out)}</b> spent, and you counted <b>${mnF(L.have)}</b>. The other <b>${mnF(g)}</b> was spent without being logged. It is spread over the months as estimates you can edit one by one.</div>
    <div class="card-t" style="margin-bottom:6px">Where it mostly went (shares, any numbers)</div>
    <div class="g2">${Object.keys(MN3_W).map((c) => `<div class="field"><label>${esc(mnCatName(c))}</label><input type="number" inputmode="numeric" id="m3-${c}" value="${W[c] != null ? W[c] : 0}"></div>`).join('')}</div>
    <div class="hint" style="margin:8px 0 12px">Earned less than the log says? Fix the income entries in Log first, then come back: the estimate always equals earned − spent − counted.</div>
    <div class="row" style="gap:8px"><button class="btn primary grow" onclick="mn3Apply({${Object.keys(MN3_W).map((c) => `${c}:Number($('m3-${c}').value)||0`).join(',')}})">${L.est ? 'Re-estimate' : 'Estimate it'}</button>${L.est ? '<button class="btn" onclick="mn3Remove()">Remove</button>' : ''}</div>`);
}
function mn3Card() {
  const L = mn3Life(); if (!L.any || L.inn <= 0) return '';
  const parts = [['Logged spending', L.out, 'var(--red,#d06a5e)'], ['Estimated spending', L.est, 'color-mix(in srgb,var(--red,#d06a5e) 45%,var(--line))'], ['You have', L.have, 'var(--green,#8fae8b)']], tot = Math.max(1, L.out + L.est + L.have), un = L.gap;
  return `<div class="card mn3"><div class="card-h"><div class="card-t">Everything you earned, and where it is</div><div class="card-r"><a href="#" onclick="mn3Modal();return false">${L.est ? 'adjust estimate' : 'estimate'}</a></div></div>
    <div class="mn3-big">${mcNum(L.inn)}<span>earned since ${fmtShort(pd(mnTx().map((t) => t.date).sort()[0]))}</span></div>
    <div class="mn3-bar">${parts.map(([n, v, c], i) => v > 0 ? `<i style="flex:${v / tot};background:${c};animation-delay:${i * 120}ms" title="${n}"></i>` : '').join('')}</div>
    <div class="mn3-leg">${parts.map(([n, v, c]) => `<div><u style="background:${c}"></u><span>${n}</span><b>${mnF(v)}</b><em>${Math.round(v / tot * 100)}%</em></div>`).join('')}</div>
    ${Math.abs(un) > 200 ? `<div class="hint" style="margin-top:10px">${un > 0 ? `${mnF(un)} is still unexplained.` : `The log shows ${mnF(-un)} more spent than is possible.`} <a href="#" onclick="mn3Modal();return false">Re-estimate</a></div>` : `<div class="xs muted" style="margin-top:10px">You kept <b>${Math.round(L.have / Math.max(1, L.inn) * 100)}%</b> of what you earned. Estimates are marked ≈ in the log and editable.</div>`}</div>`;
}
/* estimates never distort a single day: out of the day log, the heat map and the recurring detector */
if (typeof mnRecalcDay === 'function' && !mnRecalcDay._m3) { const _f = mnRecalcDay; mnRecalcDay = function (k) { const E = mnTx().filter((t) => t.est && t.date === k); E.forEach((t) => { t._hold = t.type; t.type = 'est'; }); try { return _f(k); } finally { E.forEach((t) => { t.type = t._hold; delete t._hold; }); } }; mnRecalcDay._m3 = 1; }
if (typeof mn2Spend === 'function') mn2Spend = function (k) { return mnTx().filter((t) => t.type === 'out' && !t.est && t.date === k).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); };
if (typeof mn2Recurring === 'function' && !mn2Recurring._m3) { const _f = mn2Recurring; mn2Recurring = function () { return _f().filter((t) => !t.est); }; mn2Recurring._m3 = 1; }
if (typeof mnOver === 'function' && !mnOver._m3) { const _f = mnOver; mnOver = function () { const h = _f(), c = mn3Card(); const i = h.indexOf('<div class="sgrid st-g">'); return c && i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c; }; mnOver._m3 = 1; }
/* once, automatically: the first time a count exists and the log does not explain the money */
function mn3Auto() { try { mnInit(); const st = S.settings.mnEst; if (st) return; const L = mn3Life(); if (!L.any || L.gap < 500) return; if (mn3Apply(MN3_W, true)) setTimeout(() => toast(`Your count is in. ${mnF(L.gap)} of unlogged spending is now estimated in Money`), 1500); } catch (e) { } }
if (typeof mnCountSave === 'function' && !mnCountSave._m3) { const _f = mnCountSave; mnCountSave = function (ids) { const r = _f(ids); mn3Auto(); return r; }; mnCountSave._m3 = 1; }
window.addEventListener('load', () => setTimeout(mn3Auto, 2500));
if (typeof applyRemote === 'function' && !applyRemote._m3) { const _f = applyRemote; applyRemote = function () { const r = _f.apply(this, arguments); setTimeout(mn3Auto, 800); return r; }; applyRemote._m3 = 1; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(mn3Auto, 3000); });
