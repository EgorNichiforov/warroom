/* War Room 13.10 · TIME RANGES — one control for every chart: 7 d · 30 d · 90 d · 1 yr · All time.
   Each chart remembers its own choice (S.settings.ranges[key], synced); Settings → Time ranges sets the default for all
   and can reset every chart to it. "All" starts at your first piece of data (money: the first transaction). */
'use strict';
const WR_RANGES = [['7', '7 d'], ['30', '30 d'], ['90', '90 d'], ['365', '1 yr'], ['all', 'All']];
const WR_MRANGES = [['3', '3 mo'], ['6', '6 mo'], ['12', '12 mo'], ['all', 'All']];
function wrRangeGet(key, months) { const r = (S.settings.ranges || {})[key]; if (r) return r; const d = S.settings.rangeDef || '30'; if (!months) return d; return d === 'all' ? 'all' : d === '365' ? '12' : d === '90' ? '3' : '6'; }
function wrRangeSet(key, v) { S.settings.ranges = S.settings.ranges || {}; S.settings.ranges[key] = v; S.settings._u = now(); save(); render(); }
function wrDaysSince(k) { const a = pd(k), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5) + 1; }
function wrFirstMoney() { try { return mnTx().map((t) => t.date).filter(Boolean).sort()[0] || null; } catch (e) { return null; } }
function wrFirstDay() { const ks = Object.keys(S.days || {}).filter((k) => { const o = S.days[k]; return o && (o.weight || (o.counters && Object.values(o.counters).some(Boolean)) || (o.habits && Object.values(o.habits).some(Boolean)) || (o.meals && o.meals.length)); }).sort(); return ks[0] || null; }
function wrRangeDays(key, first) { const v = wrRangeGet(key); if (v === 'all') return Math.max(7, first ? wrDaysSince(first) + 1 : 365); /* +1: the day before your first entry, so All starts where you started */ return Number(v) || 30; }
function wrRangeMonths(key, firstK) { const v = wrRangeGet(key, true); if (v === 'all') { if (!firstK) return 12; const a = pd(firstK), b = new Date(); return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1); } return Number(v) || 12; }
function wrRangeLabel(key, first) { const v = wrRangeGet(key); return v === 'all' ? (first ? 'since ' + fmtShort(pd(first)) : 'all time') : v === '365' ? 'in 1 year' : `in ${v} days`; }
function wrRangeBar(key, months) { const L = months ? WR_MRANGES : WR_RANGES, cur = wrRangeGet(key, months); return `<div class="wr-rg" role="group" aria-label="Time range">${L.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" onclick="event.stopPropagation();wrRangeSet('${key}','${v}')">${l}</button>`).join('')}</div>`; }
function wrRangeCard() {
  const d = S.settings.rangeDef || '30', n = Object.keys(S.settings.ranges || {}).length;
  return `<div class="card" id="range-card"><div class="card-h"><div class="card-t">Time ranges</div><div class="card-r">every chart</div></div>
    <div class="small muted" style="margin-bottom:10px">The default period for every chart and number (Money, Stats, Wealth). Each chart also has its own switch; it remembers what you pick there.</div>
    <div class="wr-rg big">${WR_RANGES.map(([v, l]) => `<button class="${d === v ? 'on' : ''}" onclick="S.settings.rangeDef='${v}';S.settings._u=now();save();render()">${l}</button>`).join('')}</div>
    ${n ? `<button class="btn sm ghost" style="margin-top:10px" onclick="S.settings.ranges={};S.settings._u=now();save();render();toast('Every chart uses the default again')">Reset ${n} chart${n === 1 ? '' : 's'} to the default</button>` : ''}</div>`;
}


/* ── balance history over any range. From your first count on: exact (counted, then everything logged).
   Before it: rebuilt forward from where you started (default 0 on your first transaction, editable), adding what you
   logged; any gap to the first count is spread evenly over that time and marked estimated. ── */
function wrStart() { const s = S.settings.mnStart; if (s && s.k) return { k: s.k, amt: Number(s.amt) || 0, set: true }; const f = wrFirstMoney(); return f ? { k: f, amt: 0, set: false } : null; }
function wrFirstBal() { const L = [wrFirstMoney(), (S.settings.mnStart || {}).k].concat((typeof mn4Cfg === 'function' ? mn4Cfg().snaps || [] : []).map((x) => x && x.d)).filter(Boolean).sort(); return L[0] || null; }
function wrRepMarks(P) { return P.map((p, i) => (p.rep ? { i, v: p.b, t: fmtShort(pd(p.k)) + ': you reported about ' + mnF(p.b) } : null)).filter(Boolean); }
function wrHistory(n) {
  const T = mnTotal(), tx = mnTx(), byDay = {}; tx.forEach((t) => { const f = typeof mn2Flow === 'function' ? mn2Flow(t) : 0; byDay[t.date] = (byDay[t.date] || 0) + f; });
  const fc = tx.filter((t) => t.type === 'count').map((t) => t.date).sort()[0], st = wrStart(), today = new Date();
  const N = Math.max(n, st ? wrDaysSince(st.k) : 0, fc ? wrDaysSince(fc) : 0, ...((typeof mn4Cfg === 'function' ? mn4Cfg().snaps || [] : []).filter((x) => x && x.d).map((x) => wrDaysSince(x.d)))), back = []; let b = T.t;
  for (let i = 0; i < N; i++) { const k = dk(addDays(today, -i)); back.unshift({ k, b }); b -= byDay[k] || 0; }
  /* anchors before the first count: where you started + every past balance you reported (Money → "+ add one").
     Between two anchors the line follows what you logged, and the gap to the next anchor is spread evenly, so the
     curve passes through every number you gave. All of it is marked estimated. */
  const snaps = (typeof mn4Cfg === 'function' ? mn4Cfg().snaps || [] : []).filter((x) => x && x.d && Number(x.a) > 0 && (!fc || x.d < fc)).map((x) => ({ k: x.d, amt: Number(x.a), rep: true }));
  const A = (st && (st.set || !snaps.length) ? [st] : []).concat(snaps).filter((a) => !fc || a.k < fc).sort((a, x) => (a.k < x.k ? -1 : 1)).filter((a, i, L) => !i || a.k !== L[i - 1].k);
  if (fc && A.length) {
    const ifc = back.findIndex((p) => p.k >= fc), ie = ifc - 1, idx = A.map((a) => back.findIndex((p) => p.k >= a.k));
    if (ie >= 0 && idx[0] >= 0 && idx[0] <= ie) {
      for (let s2 = 0; s2 < A.length; s2++) {
        const ia = idx[s2]; if (ia < 0 || ia > ie) continue;
        const nx = idx[s2 + 1], last = s2 === A.length - 1 || nx < 0 || nx > ie, ib = last ? ie : nx, target = last ? back[ie].b : A[s2 + 1].amt;
        let f = A[s2].amt; const fwd = [f]; for (let i = ia + 1; i <= ib; i++) { f += byDay[back[i].k] || 0; fwd.push(f); }
        const D = target - fwd[fwd.length - 1], span = ib - ia || 1, stop = last ? ib : ib - 1;
        for (let i = ia; i <= stop; i++) { back[i].b = fwd[i - ia] + (D * (i - ia)) / span; back[i].est = true; if (i === ia && A[s2].rep) back[i].rep = true; }
      }
      for (let i = 0; i < idx[0]; i++) { back[i].b = A[0].amt; back[i].est = true; }
    }
  } else if (fc) { const ifc = back.findIndex((p) => p.k >= fc); for (let i = 0; i < ifc; i++) back[i].est = true; }
  return { pts: back.slice(-n), firstCount: fc, start: st };
}
function wrStartModal() { const s = wrStart() || { k: dk(new Date()), amt: 0 }; openModal(`<h2>Where you started</h2><div class="small muted" style="margin-bottom:10px">Your balance before you began logging. Everything before your first count is rebuilt from this point plus what you logged, and marked estimated.</div><div class="g2"><div class="field"><label>Date</label><input id="ms-k" type="date" value="${s.k}"></div><div class="field"><label>You had (MDL)</label><input id="ms-a" type="number" inputmode="decimal" value="${s.amt}"></div></div><button class="btn primary block" onclick="S.settings.mnStart={k:$('ms-k').value,amt:Number($('ms-a').value)||0};S.settings._u=now();save();closeModal();render()">Save</button>`); }
function wrHistNote(H) { const st = H.start; if (!H.firstCount) return 'Count once to anchor this to reality.'; const nr = (typeof mn4Cfg === 'function' ? mn4Cfg().snaps || [] : []).filter((x) => x && x.d < H.firstCount).length; if (nr) return `Exact from your first count (${fmtShort(pd(H.firstCount))}). Before it: drawn through ${nr} balance${nr === 1 ? '' : 's'} you reported (dots)${st && st.set ? ' and where you started' : ''}, following what you logged in between. Estimated. <a href="#" onclick="wrStartModal();return false">Change the start</a>`; return `Exact from your first count (${fmtShort(pd(H.firstCount))}).${st && st.k < H.firstCount ? ` Before it: rebuilt from ${mnF(st.amt)} on ${fmtShort(pd(st.k))}${st.set ? '' : ' (assumed)'} plus what you logged, estimated. <a href="#" onclick="wrStartModal();return false">Change the start</a>` : ''}`; }

/* ── Money → Overview: "You have" over any range, with what changed ── */
if (typeof mnOver === 'function' && !mnOver._rg) {
  const _f = mnOver;
  mnOver = function () {
    const h = _f.apply(this, arguments); try {
      const T = mnTotal(); if (!T.any) return h;
      const first = wrFirstBal(), n = wrRangeDays('money', first), H = wrHistory(n), hv = H.pts.map((p) => p.b), start = hv[0], end = hv[hv.length - 1], ch = end - start;
      const R = typeof wlRange === 'function' ? wlRange(H.pts[0].k, dk(new Date())) : null, lab = wrRangeLabel('money', first);
      const hero = `<div class="mn2-hero"><div class="rg-top"><span class="k">You have</span>${wrRangeBar('money')}</div><div class="v">${mcNum(T.t)}</div><div class="d ${ch >= 0 ? 'ok' : 'bad'}">${ch >= 0 ? '▲' : '▼'} ${mnF(Math.abs(ch))} ${lab}</div>
        ${mcLine('nw', [{ v: hv, c: MC_ACC, area: true, name: 'Balance' }], { h: 130, labels: H.pts.map((p) => fmtShort(pd(p.k)) + (p.est ? ' (estimated)' : '')), fmt: (v) => mnF(v), marks: wrRepMarks(H.pts), xticks: [[0, fmtShort(pd(H.pts[0].k))], [hv.length - 1, 'today']] })}
        <div class="rg-kv"><div><span>Start</span><b>${mnF(start)}</b></div><div><span>Now</span><b>${mnF(end)}</b></div><div><span>Came in</span><b class="ok">${R ? mnF(R.inn) : '–'}</b></div><div><span>Went out</span><b class="bad">${R ? mnF(R.out) : '–'}</b></div><div><span>Margin</span><b class="${R && R.m >= 0 ? 'ok' : 'bad'}">${R ? mnF(R.m, 'MDL', true) : '–'}</b></div></div><div class="xs muted" style="margin-top:6px">${wrHistNote(H)}</div></div>`;
      const i = h.indexOf('<div class="mn2-hero">'), j = h.indexOf('<div class="mn2-kpis">'); return i >= 0 && j > i ? h.slice(0, i) + hero + h.slice(j) : h;
    } catch (e) { console.warn('range', e); return h; }
  };
  mnOver._rg = 1;
}

/* ── Money → Reports: months by range (3 / 6 / 12 / all) ── */
if (typeof mnRepTab === 'function' && !mnRepTab._rg) {
  mnRepTab = function () {
    const t = new Date(), first = wrFirstBal(), nM = wrRangeMonths('report', first), M = []; for (let i = nM - 1; i >= 0; i--) M.push(mnMonth(mnYm(new Date(t.getFullYear(), t.getMonth() - i, 1))));
    const live = M.filter((m) => m.n), sel = M.find((m) => m.ym === mn2Sel) || M[M.length - 1], mx = Math.max(1, ...M.map((m) => Math.max(m.earned, m.spent)));
    const avgE = live.reduce((a, m) => a + m.earned, 0) / (live.length || 1), avgS = live.reduce((a, m) => a + m.spent, 0) / (live.length || 1), totE = M.reduce((a, m) => a + m.earned, 0), totS = M.reduce((a, m) => a + m.spent, 0);
    const sr = M.map((m) => (m.earned ? Math.round(((m.earned - m.spent) / m.earned) * 100) : null)), days = Math.max(31, wrDaysSince(dk(new Date(t.getFullYear(), t.getMonth() - nM + 1, 1))));
    const H = wrHistory(days), step = Math.max(1, Math.round(days / 60)), nwPts = H.pts.filter((p, i) => i % step === 0 || p.rep || i === H.pts.length - 1), best = live.slice().sort((a, b) => b.earned - b.spent - (a.earned - a.spent))[0];
    const span = nM === 1 ? 'this month' : `${nM} months`;
    return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Earned vs spent · ${span}</div><div class="card-r">${wrRangeBar('report', true)}</div></div>
      <div class="mn2-bars" style="${M.length > 14 ? 'overflow-x:auto' : ''}">${M.map((m, i) => `<button class="${m.ym === sel.ym ? 'sel' : ''}" style="${M.length > 14 ? 'min-width:34px' : ''}" onclick="mn2Sel='${m.ym}';render()"><div class="col"><i class="e" style="height:${(m.earned / mx) * 100}%;animation-delay:${i * 30}ms"></i><i class="s" style="height:${(m.spent / mx) * 100}%;animation-delay:${i * 30 + 15}ms"></i></div><b class="${m.earned - m.spent >= 0 ? 'ok' : 'bad'}">${m.n ? (m.earned - m.spent >= 0 ? '+' : '−') + fmt(Math.abs(Math.round((m.earned - m.spent) / 100) / 10)) + 'k' : ''}</b><span>${mnMonthName(m.ym).split(' ')[0]}</span></button>`).join('')}</div>
      <div class="mn2-fk"><div><span>Avg earned / month</span><b class="ok">${mcNum(avgE)}</b></div><div><span>Avg spent / month</span><b class="bad">${mcNum(avgS)}</b></div><div><span>Kept, ${span}</span><b>${mcNum(totE - totS, 'MDL', true)}</b><em>${totE ? Math.round(((totE - totS) / totE) * 100) + '% savings rate' : ''}</em></div><div><span>Earned, ${span}</span><b class="ok">${mnF(totE)}</b><em>spent ${mnF(totS)}</em></div></div></div>
      <div class="card"><div class="card-h"><div class="card-t">${new Date(sel.ym + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div><div class="card-r">tap a month above</div></div>
        <div class="mn2-fk"><div><span>Earned</span><b class="ok">${mnF(sel.earned)}</b></div><div><span>Spent</span><b class="bad">${mnF(sel.spent)}</b></div><div><span>Kept</span><b>${mnF(sel.earned - sel.spent, 'MDL', true)}</b></div></div>${mn2Sankey(sel)}
        ${best && best.ym === sel.ym && live.length > 2 ? '<div class="lf-call">Your best month so far for money kept.</div>' : ''}</div>
      <div class="card"><div class="card-h"><div class="card-t">Savings rate</div><div class="card-r">% of income kept</div></div>
        ${mcLine('sr', [{ v: sr, c: MC_GREEN, name: 'Kept %' }], { h: 150, min: 0, max: 100, labels: M.map((m) => mnMonthName(m.ym)), fmt: (v) => Math.round(v) + '%', xticks: [[0, mnMonthName(M[0].ym)], [M.length - 1, mnMonthName(M[M.length - 1].ym)]] })}
        <div class="sec-h" style="margin-top:12px">Balance over time · ${span}</div>
        ${mcLine('nw2', [{ v: nwPts.map((p) => p.b), c: MC_ACC, area: true, name: 'Balance' }], { h: 130, labels: nwPts.map((p) => fmtShort(pd(p.k)) + (p.est ? ' (estimated)' : '')), fmt: (v) => mnF(v), marks: wrRepMarks(nwPts), xticks: [[0, fmtShort(pd(nwPts[0].k))], [nwPts.length - 1, 'today']] })}
        <div class="xs muted">${wrHistNote(H)}</div></div></div>`;
  };
  mnRepTab._rg = 1;
}

/* ── Stats: the range comes from wrRangeDays('stats') inside renderStats (stats2.js) ── */

/* ── Wealth → Margin: add 1 year and all time ── */
if (typeof wlPeriod === 'function' && !wlPeriod._rg) {
  const _p = wlPeriod;
  wlPeriod = function (p) {
    if (p !== '365' && p !== 'all') return _p(p);
    const t = new Date(), today = dk(t), first = wrFirstMoney() || dk(addDays(t, -364)), n = p === '365' ? 365 : wrDaysSince(first), f = dk(addDays(t, -(n - 1))), pf = dk(addDays(t, -(2 * n - 1))), pt = dk(addDays(t, -n));
    return { cur: wlRange(f, today), prev: wlRange(pf, pt), label: p === '365' ? 'last 12 months' : 'all time, since ' + fmtShort(pd(first)), vs: p === '365' ? 'the year before' : 'nothing before it' };
  };
  wlPeriod._rg = 1;
}
if (typeof wlMargin === 'function' && !wlMargin._rg) { const _m = wlMargin; wlMargin = function () { return _m.apply(this, arguments).replace(`<button class="${wlPer === '182' ? 'on' : ''}" onclick="wlPer='182';wlOpen='M';render()">6 months</button>`, `<button class="${wlPer === '182' ? 'on' : ''}" onclick="wlPer='182';wlOpen='M';render()">6 months</button><button class="${wlPer === '365' ? 'on' : ''}" onclick="wlPer='365';wlOpen='M';render()">1 year</button><button class="${wlPer === 'all' ? 'on' : ''}" onclick="wlPer='all';wlOpen='M';render()">All time</button>`); }; wlMargin._rg = 1; }

/* ── Settings: the default for every chart (next to Appearance) ── */
window.addEventListener('load', () => { if (typeof appearanceCard === 'function' && !appearanceCard._rg) { const _a = appearanceCard; appearanceCard = function () { return wrRangeCard() + _a.apply(this, arguments); }; appearanceCard._rg = 1; } });

(function () {
  const st = document.createElement('style'); st.id = 'range-css';
  st.textContent = `.wr-rg{display:inline-flex;gap:0;border:1px solid #262B32;border-radius:4px;overflow:hidden;flex:none}.wr-rg button{min-height:30px;padding:0 10px;background:transparent;border:0;border-right:1px solid #262B32;color:var(--muted);font-weight:600;font-size:11.5px;font-family:inherit;cursor:pointer;white-space:nowrap}.wr-rg button:last-child{border-right:0}.wr-rg button.on{color:var(--text);background:rgb(var(--acc-rgb) / .16);box-shadow:inset 0 -2px 0 var(--acc)}
  .wr-rg.big{display:flex}.wr-rg.big button{flex:1;min-height:40px;font-size:13px}
  .rg-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
  .rg-kv{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}.rg-kv>div{border:1px solid #1B1F24;border-radius:4px;padding:6px 8px;min-width:0}.rg-kv span{display:block;font-size:10.5px;color:var(--muted)}.rg-kv b{display:block;font-size:13px;font-variant-numeric:tabular-nums;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rg-kv .ok{color:var(--green,#8fae8b)}.rg-kv .bad{color:var(--red,#d06a5e)}
  @media (max-width:560px){.rg-kv{grid-template-columns:repeat(3,1fr)}.wr-rg button{padding:0 8px;font-size:11px}}`;
  document.head.appendChild(st);
})();
