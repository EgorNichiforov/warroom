/* War Room 9.4 · MONEY v2: professional, animated, interactive.
   Copilot: spending pace vs your normal month, budgets with a pace marker, month in review, recurring detection.
   Monarch: Sankey cash flow (where every lei came from and went), net-worth line over time.
   Monzo / Revolut: spending calendar heatmap, daily totals, no-spend days.
   YNAB: runway (how many days your money lasts at your pace).
   Interactive charts: drag across any line to scrub; tap bars, days and categories to drill in. All charts animate in. */
'use strict';
window._mc = window._mc || {};
const MC_GREEN = 'var(--green,#8fae8b)', MC_RED = 'var(--red,#d06a5e)', MC_ACC = 'var(--acc,#c8935a)';

/* ═════════ chart toolkit ═════════ */
function mcLine(id, series, opt) {
  opt = opt || {}; const W = 600, H = opt.h || 180, P = { l: 8, r: 8, t: 14, b: 22 }, n = Math.max(...series.map((s) => s.v.length)), all = series.flatMap((s) => s.v.filter((v) => v != null));
  let lo = Math.min(opt.min ?? Infinity, ...all), hi = Math.max(opt.max ?? -Infinity, ...all); if (!isFinite(lo)) lo = 0; if (!isFinite(hi)) hi = 1; if (hi === lo) hi = lo + 1; const pad0 = (hi - lo) * 0.08; lo -= pad0; hi += pad0;
  const X = (i) => P.l + (i / Math.max(1, n - 1)) * (W - P.l - P.r), Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  window._mc[id] = { n, X, Y, series, labels: opt.labels || [], fmt: opt.fmt || ((v) => fmt(Math.round(v))), W, H };
  const path = (v) => { let d = '', pen = false; v.forEach((y, i) => { if (y == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1); pen = true; }); return d; };
  const zero = lo < 0 && hi > 0 ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}" class="mc-zero"/>` : '';
  const band = opt.band ? `<path d="${path(opt.band.hi)} ${opt.band.lo.map((y, i) => 'L' + X(opt.band.lo.length - 1 - i).toFixed(1) + ' ' + Y(opt.band.lo[opt.band.lo.length - 1 - i]).toFixed(1)).join('')} Z" class="mc-band"/>` : '';
  const area = series[0] && series[0].area ? `<path d="${path(series[0].v)} L${X(n - 1)} ${H - P.b} L${X(0)} ${H - P.b} Z" class="mc-area" style="--c:${series[0].c}"/>` : '';
  const xl = (opt.xticks || []).map(([i, l]) => `<text x="${X(i)}" y="${H - 6}" class="mc-xl" text-anchor="${i === 0 ? 'start' : i >= n - 1 ? 'end' : 'middle'}">${esc(l)}</text>`).join('');
  const marks = (opt.marks || []).map((m) => `<circle cx="${X(m.i)}" cy="${Y(m.v)}" r="4" class="mc-mark ${m.cls || ''}"><title>${esc(m.t || '')}</title></circle>`).join('');
  return `<div class="mc-wrap"><svg viewBox="0 0 ${W} ${H}" class="mc" data-mc="${id}" onpointermove="mcScrub(event,'${id}')" onpointerdown="mcScrub(event,'${id}')" onpointerleave="mcEnd('${id}')">${zero}${band}${area}${series.map((s) => `<path d="${path(s.v)}" pathLength="1" class="mc-ln ${s.dash ? 'dash' : 'draw'}" style="--c:${s.c}"/>`).join('')}${marks}${xl}<g class="mc-cur" id="mcc-${id}" style="display:none"><line y1="${P.t}" y2="${H - P.b}"/>${series.map((s, k) => `<circle r="4.5" id="mcd-${id}-${k}" style="--c:${s.c}"/>`).join('')}</g></svg><div class="mc-tip" id="mct-${id}"></div></div>`;
}
function mcScrub(ev, id) {
  const M = window._mc[id], svg = ev.currentTarget; if (!M || !svg) return; const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * M.W;
  let i = 0, best = Infinity; for (let k = 0; k < M.n; k++) { const dd = Math.abs(M.X(k) - x); if (dd < best) { best = dd; i = k; } }
  const g = document.getElementById('mcc-' + id); if (!g) return; g.style.display = ''; g.querySelector('line').setAttribute('x1', M.X(i)); g.querySelector('line').setAttribute('x2', M.X(i));
  M.series.forEach((s, k) => { const c = document.getElementById(`mcd-${id}-${k}`), v = s.v[i]; if (!c) return; if (v == null) c.style.display = 'none'; else { c.style.display = ''; c.setAttribute('cx', M.X(i)); c.setAttribute('cy', M.Y(v)); } });
  const tip = document.getElementById('mct-' + id); if (tip) { tip.innerHTML = `<b>${esc(M.labels[i] || '')}</b>${M.series.map((s) => (s.v[i] == null ? '' : `<span><i style="background:${s.c}"></i>${esc(s.name || '')} ${M.fmt(s.v[i])}</span>`)).join('')}`; tip.style.left = Math.min(78, Math.max(4, (M.X(i) / M.W) * 100 - 10)) + '%'; tip.classList.add('on'); }
}
function mcEnd(id) { const g = document.getElementById('mcc-' + id), t = document.getElementById('mct-' + id); if (g) g.style.display = 'none'; if (t) t.classList.remove('on'); }
function mcCount(root) {
  (root || document).querySelectorAll('[data-count]').forEach((el) => {
    if (el._mcd) return; el._mcd = 1; const to = Number(el.dataset.count) || 0, cur = el.dataset.cur || 'MDL', sign = el.dataset.sign === '1';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = mnF(to, cur, sign); return; }
    const t0 = performance.now(), D = 900; const step = (t) => { const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3); el.textContent = mnF(to * e, cur, sign); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  });
}
function mcNum(v, cur, sign, cls) { return `<span class="${cls || ''}" data-count="${Math.round(v)}" data-cur="${cur || 'MDL'}" data-sign="${sign ? 1 : 0}">${mnF(0, cur)}</span>`; }

/* ═════════ money maths v2 ═════════ */
function mn2Flow(t) { const b = mnB(t.amt, mnAccCur(t.acc)); return t.type === 'in' ? b : t.type === 'out' ? -b : t.type === 'count' && t.diff != null ? mnB(t.diff, mnAccCur(t.acc)) : t.type === 'move' && t.toAmt ? mnB(t.toAmt, mnAccCur(t.to)) - b : 0; }
function mn2History(days) {
  const T = mnTotal(), tx = mnTx(), firstCount = tx.filter((t) => t.type === 'count').map((t) => t.date).sort()[0], out = [], byDay = {};
  tx.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + mn2Flow(t); }); let b = T.t;
  for (let i = 0; i < days; i++) { const k = dk(addDays(new Date(), -i)); out.unshift({ k, b, est: !firstCount || k < firstCount }); b -= byDay[k] || 0; }
  return { pts: out, firstCount };
}
function mn2Spend(k) { return mnTx().filter((t) => t.type === 'out' && t.date === k).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); }
function mn2Cum(y, m) { const n = new Date(y, m + 1, 0).getDate(), v = []; let c = 0; for (let d = 1; d <= n; d++) { c += mn2Spend(`${y}-${pad(m + 1)}-${pad(d)}`); v.push(c); } return v; }
function mn2Pace() {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth(), cur = mn2Cum(y, m), today = t.getDate(), prev = [1, 2, 3].map((i) => { const d = new Date(y, m - i, 1); return mn2Cum(d.getFullYear(), d.getMonth()); }).filter((a) => a[a.length - 1] > 0);
  const n = cur.length, typ = Array.from({ length: n }, (_, i) => (prev.length ? prev.reduce((a, p) => a + (p[Math.min(i, p.length - 1)] || 0), 0) / prev.length : null));
  const now = cur[today - 1] || 0, usual = typ[today - 1]; return { cur: cur.map((v, i) => (i < today ? v : null)), typ, now, usual, diff: usual ? (now - usual) / usual : null, n, today };
}
function mn2Budgets() { return S.settings.mnBudgets || {}; }
function mn2Note(t) { return t && t.note && t.note !== 'from the day log' ? t.note : ''; }
function mn2Recurring() {
  const tx = mnTx().filter((t) => t.type === 'out' && mn2Note(t)), g = {}, plans = mnPlans().map((p) => (p.note || '').toLowerCase());
  tx.forEach((t) => { const key = t.note.toLowerCase().trim() + '|' + Math.round(t.amt / 5) * 5; (g[key] = g[key] || []).push(t); });
  return Object.values(g).filter((L) => { if (L.length < 2) return false; const ms = new Set(L.map((t) => t.date.slice(0, 7))); return ms.size >= 2 && !plans.includes(L[0].note.toLowerCase().trim()); }).map((L) => L.sort((a, b) => (a.date < b.date ? 1 : -1))[0]).slice(0, 3);
}
function mn2Insights() {
  const t = new Date(), ym = mnYm(t), cm = mnMonth(ym), pm = mnMonth(mnYm(new Date(t.getFullYear(), t.getMonth() - 1, 1))), I = [], P = mn2Pace();
  if (P.diff != null && Math.abs(P.diff) > 0.1) I.push([P.diff < 0 ? 'good' : 'warn', `Spending is ${Math.round(Math.abs(P.diff) * 100)}% ${P.diff < 0 ? 'under' : 'over'} your usual pace for day ${P.today}.`]);
  const cats = Object.entries(cm.cats).map(([c, v]) => [c, v, pm.cats[c] || 0]).filter((x) => x[2] > 0 && x[1] > x[2] * 1.3 && x[1] - x[2] > 200).sort((a, b) => b[1] - b[2] - (a[1] - a[2]))[0];
  if (cats) I.push(['warn', `${mnCatName(cats[0])} is already ${mnF(cats[1])}, more than all of last month (${mnF(cats[2])}).`]);
  let ns = 0; for (let d = 1; d <= t.getDate(); d++) if (!mn2Spend(`${ym}-${pad(d)}`)) ns++; if (t.getDate() > 3) I.push(['info', `${ns} no-spend day${ns === 1 ? '' : 's'} this month.`]);
  const big = mnTx().filter((x) => x.type === 'out' && x.date.slice(0, 7) === ym).sort((a, b) => mnB(b.amt, mnAccCur(b.acc)) - mnB(a.amt, mnAccCur(a.acc)))[0]; if (big) I.push(['info', `Biggest expense: ${mnF(big.amt, mnAccCur(big.acc))} · ${mnCatName(big.cat)}${big.note ? ' (' + big.note + ')' : ''}.`]);
  if (pm.earned && cm.earned) { const ep = cm.earned / Math.max(1, t.getDate()) * new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); I.push([ep >= pm.earned ? 'good' : 'warn', `Income is on track for ≈ ${mnF(ep)} this month (last month ${mnF(pm.earned)}).`]); }
  const leak = mnTx().filter((x) => x.type === 'count' && x.diff < 0 && x.date.slice(0, 7) === ym).reduce((a, x) => a + mnB(-x.diff, mnAccCur(x.acc)), 0); if (leak) I.push(['warn', `${mnF(leak)} left your accounts unlogged this month (found by counting).`]);
  return I;
}

/* ═════════ Overview v2 ═════════ */
mnOver = function () {
  const T = mnTotal(), S0 = mnSafe(), now0 = new Date(), cm = mnMonth(mnYm(now0)), pm = mnMonth(mnYm(new Date(now0.getFullYear(), now0.getMonth() - 1, 1))), A = mnAccs();
  const H = mn2History(90), hv = H.pts.map((p) => p.b), d30 = hv[hv.length - 1] - hv[Math.max(0, hv.length - 31)], burn = mnAvgOut(30), runway = burn > 0 ? Math.floor(S0.spendable / burn) : null;
  const P = mn2Pace(), B = mn2Budgets(), cats = Object.entries(cm.cats).sort((a, b) => b[1] - a[1]), dayFrac = now0.getDate() / new Date(now0.getFullYear(), now0.getMonth() + 1, 0).getDate();
  const rec = mn2Recurring(), ins = mn2Insights();
  const hero = T.any ? `<div class="mn2-hero"><span class="k">You have</span><div class="v">${mcNum(T.t)}</div><div class="d ${d30 >= 0 ? 'ok' : 'bad'}">${d30 >= 0 ? '▲' : '▼'} ${mnF(Math.abs(d30))} in 30 days</div>
      ${mcLine('nw', [{ v: hv, c: MC_ACC, area: true, name: 'Balance' }], { h: 120, labels: H.pts.map((p) => fmtShort(pd(p.k)) + (p.est ? ' (before your first count, estimated)' : '')), fmt: (v) => mnF(v), xticks: [[0, fmtShort(pd(H.pts[0].k))], [89, 'today']] })}</div>`
    : `<div class="mn2-hero"><span class="k">You have</span><div class="v muted">?</div><div class="small muted">Count once and every number here comes alive.</div></div>`;
  return `<div class="mn2">
    <div class="card mn2-top">${hero}
      <div class="mn2-kpis"><div><span>Safe to spend today</span><b>${T.any ? mcNum(S0.perDay) : '–'}</b><em>${T.any ? `${mnF(S0.safe)} until ${fmtShort(S0.eom)}` : ''}</em></div><div><span>Runway</span><b>${runway != null && T.any ? runway + ' days' : '–'}</b><em>${burn ? `at ${mnF(burn)}/day` : 'log spending to see'}</em></div><div><span>Kept this month</span><b>${mcNum(cm.earned - cm.spent, 'MDL', true)}</b><em>${cm.earned ? Math.round(((cm.earned - cm.spent) / cm.earned) * 100) + '% of income' : ''}</em></div></div>
      <div class="mn2-accs">${A.map((a) => { const b = mnBal(a.id); return `<button onclick="mnCountModal('${a.id}')"><span>${esc(a.name)}</span><b>${b.counted ? mnF(b.bal, a.cur) : 'count'}</b><em>${b.counted ? (b.days ? b.days + ' d ago' : 'today') : ''}</em></button>`; }).join('')}<button class="add" onclick="mnAccEdit()">+</button></div>
      <button class="btn primary block" onclick="mnCountModal()">${T.any ? 'Count again' : 'Count my money now'}</button></div>
    ${ins.length ? `<div class="mn2-ins">${ins.map(([k, t]) => `<div class="${k}">${esc(t)}</div>`).join('')}</div>` : ''}
    <div class="sgrid st-g">
    <div class="card"><div class="card-h"><div class="card-t">Spending pace</div><div class="card-r">${P.diff == null ? 'needs a past month' : `<b class="${P.diff <= 0 ? 'ok' : 'bad'}">${P.diff <= 0 ? '' : '+'}${Math.round(P.diff * 100)}%</b> vs usual`}</div></div>
      ${mcLine('pace', [{ v: P.cur, c: MC_RED, name: 'This month' }, { v: P.typ, c: 'var(--muted)', dash: true, name: 'Usual' }], { h: 150, labels: P.cur.map((_, i) => 'Day ' + (i + 1)), fmt: (v) => mnF(v), xticks: [[0, '1'], [P.n - 1, String(P.n)]] })}
      <div class="xs muted">Red = what you've spent so far this month, day by day. Dashed = your usual month (last 3 months). Drag across to compare any day.</div></div>
    <div class="card"><div class="card-h"><div class="card-t">${now0.toLocaleDateString('en-GB', { month: 'long' })} cash flow</div><div class="card-r">earned ${mnF(cm.earned)} · spent ${mnF(cm.spent)}</div></div>${mn2Sankey(cm)}</div>
    <div class="card"><div class="card-h"><div class="card-t">Spending calendar</div><div class="card-r">tap a day</div></div>${mn2Heat(now0)}</div>
    <div class="card"><div class="card-h"><div class="card-t">Categories & budgets</div><div class="card-r"><a href="#" onclick="mn2BudgetModal();return false">set budgets</a></div></div>
      ${cats.length || Object.keys(B).length ? Array.from(new Set(cats.map((c) => c[0]).concat(Object.keys(B).filter((k) => B[k])))).map((c) => { const v = cm.cats[c] || 0, b = Number(B[c]) || 0, pct = b ? v / b : null, mx = Math.max(...cats.map((x) => x[1]), 1); return `<div class="mn2-cat" onclick="mnFilter={q:'',type:'out',acc:'',m:'${cm.ym}',cat:'${c}'};mnTab='tx';render()"><div class="r"><span>${esc(mnCatName(c))}</span><b>${mnF(v)}${b ? `<em> / ${mnF(b)}</em>` : ''}</b></div><div class="bar"><u class="${b ? (pct > 1 ? 'over' : pct > dayFrac + 0.1 ? 'fast' : 'ok') : ''}" style="width:${Math.min(100, (b ? pct : v / mx) * 100)}%"></u>${b ? `<i style="left:${dayFrac * 100}%"></i>` : ''}</div>${b ? `<div class="s">${pct > 1 ? `${mnF(v - b)} over` : `${mnF(b - v)} left · ${pct > dayFrac + 0.1 ? 'ahead of pace' : 'on pace'}`}</div>` : ''}</div>`; }).join('') : '<div class="empty">No spending this month yet.</div>'}
      ${B && Object.values(B).some(Boolean) ? '<div class="xs muted" style="margin-top:6px">The tick on each bar = how far through the month you are. Bar past the tick = spending faster than the budget allows.</div>' : ''}</div>
    ${rec.length ? `<div class="card w2"><div class="card-h"><div class="card-t">Looks recurring</div><div class="card-r">add them so the forecast knows</div></div>${rec.map((t) => `<div class="mn-pl"><span><b>${esc(t.note)}</b><em>${esc(mnCatName(t.cat))} · seen in several months</em></span><b class="bad">${mnF(-t.amt, mnAccCur(t.acc), true)}</b><span class="ac"><button class="btn sm primary" onclick="mn2AddRecurring('${t.id}')">Add as planned</button></span></div>`).join('')}</div>` : ''}
    <div class="card w2"><div class="card-h"><div class="card-t">Latest</div><div class="card-r"><a href="#" onclick="mnTab='tx';render();return false">all →</a></div></div>${mnRows(mnTx().filter((t) => t.type !== 'count').sort((a, b) => (mnSeq(a) < mnSeq(b) ? 1 : -1)).slice(0, 6))}</div></div></div>`;
};
function mn2AddRecurring(id) { const t = S.txns[id]; if (!t) return; mnInit(); const pid = uid(); S.mplan[pid] = { id: pid, _u: now(), type: 'out', amt: t.amt, acc: t.acc, cat: t.cat, note: t.note, every: 'month', next: dk(new Date(pd(t.date).getFullYear(), pd(t.date).getMonth() + 1, Math.min(pd(t.date).getDate(), 28))), active: true }; save(); render(); toast(`${t.note} added as a monthly payment`); }
function mn2BudgetModal() {
  const B = mn2Budgets(), avg = {}; for (let i = 1; i <= 3; i++) { const d = new Date(); const m = mnMonth(mnYm(new Date(d.getFullYear(), d.getMonth() - i, 1))); Object.entries(m.cats).forEach(([c, v]) => (avg[c] = (avg[c] || 0) + v / 3)); }
  openModal(`<h2>Monthly budgets</h2><div class="xs muted" style="margin-bottom:10px">A limit per category. Empty = no limit. Grey = your average of the last 3 months.</div>${MN_OUT.map(([c, l]) => `<div class="lk-row"><span>${l}<em> ${avg[c] ? '≈ ' + mnF(avg[c]) : ''}</em></span><input id="bd-${c}" type="number" inputmode="numeric" value="${B[c] || ''}" style="width:110px"></div>`).join('')}
    <button class="btn primary block" style="margin-top:10px" onclick="S.settings.mnBudgets=Object.fromEntries(MN_OUT.map(([c])=>[c,Number($('bd-'+c).value)||0]).filter(x=>x[1]));S.settings._u=now();save();closeModal();render()">Save</button>`);
}

/* Sankey: income sources → month → categories + kept */
function mn2Sankey(m) {
  const L = Object.entries(m.src).sort((a, b) => b[1] - a[1]), R = Object.entries(m.cats).sort((a, b) => b[1] - a[1]);
  if (!L.length && !R.length) return '<div class="empty">Log income and spending to see the flow.</div>';
  const kept = m.earned - m.spent; if (kept > 0) R.push(['__kept', kept]); else if (kept < 0) L.push(['__savings', -kept]);
  const W = 600, H = Math.max(200, Math.max(L.length, R.length) * 46), tot = Math.max(L.reduce((a, x) => a + x[1], 0), R.reduce((a, x) => a + x[1], 0)), gap = 6, usable = H - gap * (Math.max(L.length, R.length) + 1), sc = usable / tot;
  const col = (list, x) => { let y = gap; return list.map(([k, v]) => { const h = Math.max(3, v * sc), o = { k, v, x, y, h }; y += h + gap; return o; }); };
  const Lc = col(L, 150), Rc = col(R, 430), mid = { x: 290, y: (H - tot * sc) / 2, h: tot * sc };
  let ly = mid.y, ry = mid.y; const name = (k) => (k === '__kept' ? 'Kept' : k === '__savings' ? 'From savings' : mnCatName(k));
  const band = (x0, y0, h0, x1, y1, h1, c, i) => `<path d="M${x0} ${y0} C${(x0 + x1) / 2} ${y0} ${(x0 + x1) / 2} ${y1} ${x1} ${y1} L${x1} ${y1 + h1} C${(x0 + x1) / 2} ${y1 + h1} ${(x0 + x1) / 2} ${y0 + h0} ${x0} ${y0 + h0} Z" class="mn2-flow" style="--c:${c};animation-delay:${i * 60}ms"/>`;
  const fl = Lc.map((n, i) => { const s = band(n.x + 8, n.y, n.h, mid.x, ly, n.h, n.k === '__savings' ? MC_ACC : MC_GREEN, i); ly += n.h; return s; }).join('') + Rc.map((n, i) => { const s = band(mid.x + 10, ry, n.h, n.x, n.y, n.h, n.k === '__kept' ? MC_ACC : MC_RED, i + Lc.length); ry += n.h; return s; }).join('');
  const nodes = Lc.map((n) => `<rect x="${n.x}" y="${n.y}" width="8" height="${n.h}" rx="2" class="mn2-node in"/><text x="${n.x - 6}" y="${n.y + n.h / 2}" text-anchor="end" class="mn2-lb">${esc(name(n.k))} <tspan>${fmt(Math.round(n.v))}</tspan></text>`).join('')
    + `<rect x="${mid.x}" y="${mid.y}" width="10" height="${mid.h}" rx="2" class="mn2-node mid"/>`
    + Rc.map((n) => `<rect x="${n.x}" y="${n.y}" width="8" height="${n.h}" rx="2" class="mn2-node ${n.k === '__kept' ? 'kept' : 'out'}"/><text x="${n.x + 14}" y="${n.y + n.h / 2}" class="mn2-lb">${esc(name(n.k))} <tspan>${fmt(Math.round(n.v))}</tspan></text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="mn2-sankey">${fl}${nodes}</svg>`;
}
/* calendar heatmap of daily spending */
function mn2Heat(d) {
  const y = d.getFullYear(), m = d.getMonth(), n = new Date(y, m + 1, 0).getDate(), first = (new Date(y, m, 1).getDay() + 6) % 7, vals = Array.from({ length: n }, (_, i) => mn2Spend(`${y}-${pad(m + 1)}-${pad(i + 1)}`)), mx = Math.max(1, ...vals), today = d.getDate();
  const cells = Array.from({ length: first }, () => '<span class="e"></span>').concat(vals.map((v, i) => { const lvl = v ? Math.min(4, 1 + Math.floor((v / mx) * 4)) : 0, k = `${y}-${pad(m + 1)}-${pad(i + 1)}`; return `<button class="l${lvl} ${i + 1 === today ? 'td' : ''} ${i + 1 > today ? 'fut' : ''}" style="animation-delay:${i * 12}ms" onclick="mnFilter={q:'',type:'',acc:'',m:'',day:'${k}'};mnTab='tx';render()" title="${fmtShort(pd(k))}: ${fmt(Math.round(v))}"><b>${i + 1}</b>${v ? `<em>${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</em>` : ''}</button>`; }));
  return `<div class="mn2-heat">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((x) => `<span class="h">${x}</span>`).join('')}${cells.join('')}</div><div class="mn2-lg"><span>less</span>${[0, 1, 2, 3, 4].map((l) => `<i class="l${l}"></i>`).join('')}<span>more</span></div>`;
}

/* ═════════ Transactions v2 ═════════ */
mnTxTab = function () {
  const f = mnFilter; f.type = f.type || ''; const months = [...new Set(mnTx().map((t) => t.date.slice(0, 7)))].sort().reverse();
  let L = mnTx().filter((t) => (!f.type || t.type === f.type) && (!f.acc || t.acc === f.acc || t.to === f.acc) && (!f.m || t.date.slice(0, 7) === f.m) && (!f.day || t.date === f.day) && (!f.cat || t.cat === f.cat) && (!f.q || (mnCatName(t.cat) + ' ' + (t.note || '') + ' ' + t.amt).toLowerCase().includes(f.q.toLowerCase())));
  L.sort((a, b) => (mnSeq(a) < mnSeq(b) ? 1 : -1)); const sum = (ty) => L.filter((t) => t.type === ty).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0);
  const chip = (k, v, l) => `<button class="${f[k] === v ? 'on' : ''}" onclick="mnFilter.${k}='${v}';render()">${l}</button>`;
  const catsUsed = [...new Set(mnTx().filter((t) => t.cat).map((t) => t.cat))];
  let html = '', lastM = '', lastD = '';
  L.slice(0, 400).forEach((t) => {
    const ym = t.date.slice(0, 7); if (ym !== lastM) { const mm = mnMonth(ym); html += `<div class="mn2-mh"><span>${mnMonthName(ym)}</span><b class="ok">+${fmt(Math.round(mm.earned))}</b><b class="bad">−${fmt(Math.round(mm.spent))}</b></div>`; lastM = ym; lastD = ''; }
    if (t.date !== lastD) { const ds = L.filter((x) => x.date === t.date && x.type === 'out').reduce((a, x) => a + mnB(x.amt, mnAccCur(x.acc)), 0), di = L.filter((x) => x.date === t.date && x.type === 'in').reduce((a, x) => a + mnB(x.amt, mnAccCur(x.acc)), 0); html += `<div class="mn2-dh"><span>${pd(t.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span><em>${di ? '+' + fmt(Math.round(di)) + ' ' : ''}${ds ? '−' + fmt(Math.round(ds)) : ''}</em></div>`; lastD = t.date; }
    const a = S.accounts[t.acc] || {}, amt = t.type === 'count' ? `= ${mnF(t.amt, a.cur)}` : t.type === 'move' ? mnF(t.amt, a.cur) : mnF((t.type === 'in' ? 1 : -1) * t.amt, a.cur, true);
    html += `<div class="mn2-row t-${t.type}" onclick="mnEdit('${t.id}')"><span class="ic c-${t.type === 'out' ? t.cat : t.type}">${esc((t.type === 'count' ? '=' : t.type === 'move' ? '⇄' : mnCatName(t.cat)).slice(0, 1).toUpperCase())}</span><span class="m"><b>${t.type === 'count' ? 'Counted' + (t.diff ? ` · ${mnF(t.diff, a.cur, true)} unlogged` : '') : t.type === 'move' ? 'Move → ' + esc((S.accounts[t.to] || {}).name || '') : esc(mn2Note(t) || mnCatName(t.cat))}</b><em>${t.type === 'in' || t.type === 'out' ? esc(mnCatName(t.cat)) + ' · ' : ''}${esc(a.name || '')}</em></span><b class="a">${amt}</b></div>`;
  });
  return `<div class="card mn2-tx"><div class="mn2-search"><input placeholder="Search notes, categories, amounts" value="${esc(f.q || '')}" oninput="clearTimeout(window._mnqs);window._mnqs=setTimeout(()=>{mnFilter.q=this.value;render();setTimeout(()=>{const i=document.querySelector('.mn2-search input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)},350)"><select onchange="mnFilter.m=this.value;render()"><option value="">All months</option>${months.map((m) => `<option value="${m}" ${f.m === m ? 'selected' : ''}>${mnMonthName(m)}</option>`).join('')}</select></div>
    <div class="mn2-chips">${chip('type', '', 'All')}${chip('type', 'out', 'Spent')}${chip('type', 'in', 'Earned')}${chip('type', 'move', 'Moves')}${chip('type', 'count', 'Counts')}<span class="sep"></span>${mnAccs().map((a) => `<button class="${f.acc === a.id ? 'on' : ''}" onclick="mnFilter.acc='${f.acc === a.id ? '' : a.id}';render()">${esc(a.name)}</button>`).join('')}</div>
    ${f.cat || f.day ? `<div class="mn2-chips">${f.cat ? `<button class="on" onclick="mnFilter.cat='';render()">${esc(mnCatName(f.cat))} ×</button>` : ''}${f.day ? `<button class="on" onclick="mnFilter.day='';render()">${fmtShort(pd(f.day))} ×</button>` : ''}</div>` : ''}
    <div class="mn2-sum"><span>${L.length} entries</span><b class="ok">+${fmt(Math.round(sum('in')))}</b><b class="bad">−${fmt(Math.round(sum('out')))}</b><b>${mnF(sum('in') - sum('out'), 'MDL', true)}</b></div>
    ${html || '<div class="empty">Nothing matches.</div>'}${L.length > 400 ? '<div class="small muted">Showing the latest 400. Filter to see more.</div>' : ''}
    <button class="mn2-fab" onclick="mnEdit()" aria-label="Add">+</button></div>`;
};

/* ═════════ Planned & forecast v2 ═════════ */
let mn2Days = 60;
mnPlanTab = function () {
  const F = mnForecast(mn2Days), pts = F.pts, vals = pts.map((p) => p.b), T = mnTotal(), sd = mn2StdDaily(), band = { hi: pts.map((p, i) => p.b + sd * Math.sqrt(i)), lo: pts.map((p, i) => p.b - sd * Math.sqrt(i)) };
  const occ = mnOcc(pts[pts.length - 1].k), marks = occ.map((o) => { const i = pts.findIndex((p) => p.k === o.k); return i >= 0 ? { i, v: pts[i].b, cls: o.p.type, t: `${fmtShort(pd(o.k))} · ${o.p.note || mnCatName(o.p.cat)} ${o.p.type === 'in' ? '+' : '−'}${o.p.amt}` } : null; }).filter(Boolean);
  const low = pts.reduce((a, p) => (p.b < a.b ? p : a), pts[0]), neg = pts.find((p) => p.b < 0), P = mnPlans().sort((a, b) => (a.next < b.next ? -1 : 1));
  const monthly = P.reduce((a, p) => a + (p.type === 'in' ? 1 : -1) * mnB(p.amt, mnAccCur(p.acc)) * (p.every === 'week' ? 4.33 : p.every === 'month' ? 1 : 0), 0);
  let run = T.t; const up = occ.filter((o) => o.k <= dk(addDays(new Date(), 30))).map((o) => { run += (o.p.type === 'in' ? 1 : -1) * mnB(o.p.amt, mnAccCur(o.p.acc)); return { o, run }; });
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Forecast</div><div class="card-r mn2-seg">${[30, 60, 90].map((d) => `<button class="${mn2Days === d ? 'on' : ''}" onclick="mn2Days=${d};render()">${d} d</button>`).join('')}</div></div>
    ${T.any ? `<div class="mn2-fk"><div><span>Today</span><b>${mnF(vals[0])}</b></div><div><span>In ${mn2Days} days</span><b class="${vals[vals.length - 1] >= vals[0] ? 'ok' : 'bad'}">${mnF(vals[vals.length - 1])}</b></div><div><span>Lowest point</span><b class="${low.b < 0 ? 'bad' : ''}">${mnF(low.b)}</b><em>${fmtShort(pd(low.k))}</em></div></div>
    ${mcLine('fc', [{ v: vals, c: MC_ACC, area: true, name: 'Expected' }], { h: 200, band, marks, labels: pts.map((p) => pd(p.k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })), fmt: (v) => mnF(v), xticks: [[0, 'today'], [Math.floor(pts.length / 2), fmtShort(pd(pts[Math.floor(pts.length / 2)].k))], [pts.length - 1, fmtShort(pd(pts[pts.length - 1].k))]] })}
    <div class="xs muted">Drag across the chart. Line = expected balance: planned items (dots) ${F.avgIn ? `+ your average income (${mnF(F.avgIn)}/day) ` : ''}− your usual day-to-day spending (${mnF(F.avg)}/day). Shaded band = normal day-to-day variation.${neg ? ` <b class="bad">Expected to go below zero around ${fmtShort(pd(neg.k))}.</b>` : ''}</div>` : '<div class="empty">Count your money first, then the forecast starts from your real balance.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">Next 30 days</div><div class="card-r">running balance</div></div>${up.length ? up.map(({ o, run: r }) => `<div class="mn2-up"><span class="d">${pd(o.k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span><span class="n">${esc(o.p.note || mnCatName(o.p.cat))}</span><b class="${o.p.type === 'in' ? 'ok' : 'bad'}">${o.p.type === 'in' ? '+' : '−'}${fmt(Math.round(mnB(o.p.amt, mnAccCur(o.p.acc))))}</b><em>${T.any ? fmt(Math.round(r)) : ''}</em></div>`).join('') : '<div class="empty">Nothing planned in the next 30 days.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">Planned items</div><div class="card-r"><button class="btn sm primary" onclick="mnPlanEdit()">+ Add</button></div></div>
      <div class="mn2-fk" style="margin-bottom:6px"><div><span>Planned per month</span><b class="${monthly >= 0 ? 'ok' : 'bad'}">${mnF(monthly, 'MDL', true)}</b></div></div>
      ${P.length ? P.map((p) => { const due = p.next <= dk(new Date()); return `<div class="mn-pl ${due ? 'due' : ''}"><span onclick="mnPlanEdit('${p.id}')"><b>${esc(p.note || mnCatName(p.cat))}</b><em>${p.every === 'once' ? 'once' : 'every ' + p.every} · ${due ? 'due now' : 'next ' + fmtShort(pd(p.next))}</em></span><b class="${p.type === 'in' ? 'ok' : 'bad'}">${mnF((p.type === 'in' ? 1 : -1) * p.amt, mnAccCur(p.acc), true)}</b><span class="ac"><button class="btn sm ${due ? 'primary' : ''}" onclick="mnPost('${p.id}')">${p.type === 'in' ? 'Got it' : 'Paid'}</button><button class="btn sm ghost" onclick="mnPost('${p.id}',true)">Skip</button></span></div>`; }).join('') : '<div class="empty">Add what repeats: phone, subscriptions, transport, lesson income.</div>'}</div></div>`;
};
function mn2StdDaily() { const v = []; for (let i = 1; i <= 30; i++) v.push(mn2Spend(dk(addDays(new Date(), -i)))); const m = v.reduce((a, x) => a + x, 0) / v.length; return Math.sqrt(v.reduce((a, x) => a + (x - m) * (x - m), 0) / v.length); }

/* ═════════ Reports v2 ═════════ */
let mn2Sel = null;
mnRepTab = function () {
  const t = new Date(), M = []; for (let i = 11; i >= 0; i--) M.push(mnMonth(mnYm(new Date(t.getFullYear(), t.getMonth() - i, 1))));
  const live = M.filter((m) => m.n), sel = M.find((m) => m.ym === mn2Sel) || M[M.length - 1], mx = Math.max(1, ...M.map((m) => Math.max(m.earned, m.spent)));
  const avgE = live.reduce((a, m) => a + m.earned, 0) / (live.length || 1), avgS = live.reduce((a, m) => a + m.spent, 0) / (live.length || 1), totE = M.reduce((a, m) => a + m.earned, 0), totS = M.reduce((a, m) => a + m.spent, 0);
  const sr = M.map((m) => (m.earned ? Math.round(((m.earned - m.spent) / m.earned) * 100) : null));
  const H = mn2History(365), nwPts = H.pts.filter((_, i) => i % 7 === 0 || i === H.pts.length - 1);
  const ytd = M.filter((m) => m.ym.startsWith(String(t.getFullYear()))), yE = ytd.reduce((a, m) => a + m.earned, 0), yS = ytd.reduce((a, m) => a + m.spent, 0);
  const best = live.slice().sort((a, b) => b.earned - b.spent - (a.earned - a.spent))[0];
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Earned vs spent · 12 months</div><div class="card-r"><span class="mn-k ok">● earned</span><span class="mn-k bad">● spent</span></div></div>
    <div class="mn2-bars">${M.map((m, i) => `<button class="${m.ym === sel.ym ? 'sel' : ''}" onclick="mn2Sel='${m.ym}';render()"><div class="col"><i class="e" style="height:${(m.earned / mx) * 100}%;animation-delay:${i * 40}ms"></i><i class="s" style="height:${(m.spent / mx) * 100}%;animation-delay:${i * 40 + 20}ms"></i></div><b class="${m.earned - m.spent >= 0 ? 'ok' : 'bad'}">${m.n ? (m.earned - m.spent >= 0 ? '+' : '−') + fmt(Math.abs(Math.round((m.earned - m.spent) / 100) / 10)) + 'k' : ''}</b><span>${mnMonthName(m.ym).split(' ')[0]}</span></button>`).join('')}</div>
    <div class="mn2-fk"><div><span>Avg earned / month</span><b class="ok">${mcNum(avgE)}</b></div><div><span>Avg spent / month</span><b class="bad">${mcNum(avgS)}</b></div><div><span>Kept, 12 months</span><b>${mcNum(totE - totS, 'MDL', true)}</b><em>${totE ? Math.round(((totE - totS) / totE) * 100) + '% savings rate' : ''}</em></div><div><span>${t.getFullYear()} so far</span><b>${mnF(yE - yS, 'MDL', true)}</b><em>earned ${mnF(yE)}</em></div></div></div>
    <div class="card"><div class="card-h"><div class="card-t">${new Date(sel.ym + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div><div class="card-r">tap a month above</div></div>
      <div class="mn2-fk"><div><span>Earned</span><b class="ok">${mnF(sel.earned)}</b></div><div><span>Spent</span><b class="bad">${mnF(sel.spent)}</b></div><div><span>Kept</span><b>${mnF(sel.earned - sel.spent, 'MDL', true)}</b></div></div>${mn2Sankey(sel)}
      ${best && best.ym === sel.ym && live.length > 2 ? '<div class="lf-call">Your best month so far for money kept.</div>' : ''}</div>
    <div class="card"><div class="card-h"><div class="card-t">Savings rate</div><div class="card-r">% of income kept</div></div>
      ${mcLine('sr', [{ v: sr, c: MC_GREEN, name: 'Kept %' }], { h: 150, min: 0, max: 100, labels: M.map((m) => mnMonthName(m.ym)), fmt: (v) => Math.round(v) + '%', xticks: [[0, mnMonthName(M[0].ym)], [11, mnMonthName(M[11].ym)]] })}
      <div class="sec-h" style="margin-top:12px">Balance over time</div>
      ${mcLine('nw2', [{ v: nwPts.map((p) => p.b), c: MC_ACC, area: true, name: 'Balance' }], { h: 130, labels: nwPts.map((p) => fmtShort(pd(p.k)) + (p.est ? ' (estimated)' : '')), fmt: (v) => mnF(v), xticks: [[0, fmtShort(pd(nwPts[0].k))], [nwPts.length - 1, 'today']] })}
      <div class="xs muted">${H.firstCount ? `Exact from your first count (${fmtShort(pd(H.firstCount))}); earlier is rebuilt backwards from what you logged.` : 'Rebuilt backwards from what you logged. Count once to anchor it to reality.'}</div></div></div>`;
};

/* animate after every Money render */
if (typeof renderMoney === 'function' && !renderMoney._v2) { const _r = renderMoney; renderMoney = function () { _r(); const el = $('view-money'); if (el) { el.classList.remove('mn2-anim'); void el.offsetWidth; el.classList.add('mn2-anim'); mcCount(el); } }; renderMoney._v2 = 1; }
