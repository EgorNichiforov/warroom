/* War Room · stats2.js (6.3) — Stats in detail.
   Tabs: Overview · Calls · Body · Sleep · Mind · Money · Habits · Day log.
   Every section compares the chosen period with the one before it (▲▼ vs previous),
   shows the numbers behind each chart in a table, and every row opens that day. */
'use strict';
let statsTab = 'overview';
const STATS_TABS = [['overview', 'Overview'], ['calls', 'Calls'], ['body', 'Body'], ['sleep', 'Sleep'], ['mind', 'Mind'], ['money', 'Money'], ['habits', 'Habits'], ['log', 'Day log']];

/* ───────── data ───────── */
function stDays(n, offset) { const t = new Date(); t.setHours(0, 0, 0, 0); const out = []; for (let i = n - 1 + (offset || 0); i >= (offset || 0); i--) out.push(addDays(t, -i)); return out; }
function stRow(d) {
  const k = dk(d), o = S.days[k] || {}, c = o.counters || {}, ft = typeof foodTotals === 'function' ? foodTotals(k) : { kcal: 0, p: 0, n: 0 };
  const sm = typeof sleepMin === 'function' ? sleepMin(o) : null, wk = typeof sleepWakes === 'function' && o.segs ? sleepWakes(o).n : 0;
  return { d, k, has: !!S.days[k], dials: Number(c.dials) || 0, tg: dialTargetFor(d), owners: Number(c.owners) || 0, bac: Number(c.bac) || 0, deep: Number(c.deep) || 0,
    weight: o.weight != null && o.weight !== '' ? Number(o.weight) : null, sleep: sm, bed: o.bedAt || '', woke: o.wokeAt || '', wakes: wk, sq: o.sleepQ || null,
    std: S.habits.items.filter((h) => o.habits && o.habits[h.id]).length, kcal: ft.n ? ft.kcal : null, prot: ft.n ? ft.p : null, trained: S.days[k] ? !!dayTrained(o) : false,
    inc: Number(o.income) || 0, sp: Number(o.spent) || 0, score: S.days[k] ? dayScore(d) : 0 };
}
function stCalls(from, to) {
  const out = []; if (typeof Q === 'undefined' || !Q || !Q.items) return out;
  Object.values(Q.items).forEach((x) => (x.log || []).forEach((e) => { const k = e.day || (e.at || '').slice(0, 10); if (k >= from && k <= to && e.d && e.d.dials) out.push({ x, e, k }); }));
  return out.sort((a, b) => (a.e.at < b.e.at ? 1 : -1));
}
const ST_OUT = [['No answer', /no answer|no_answer/i, 'var(--dim)'], ['Voicemail', /voicemail/i, 'var(--info)'], ['Gatekeeper', /gatekeeper|front desk/i, 'var(--purple)'], ['Owner talk', /owner|book|case|interested|trial|bulletin|yes|not interested|callback/i, 'var(--ok)'], ['Bad number', /bad|wrong|disconnected/i, 'var(--bad)']];
function stOutcome(e) { if (e.d && e.d.owners) return 'Owner talk'; const r = e.r || ''; for (const [l, re] of ST_OUT) if (re.test(r)) return l; return 'Other'; }
function stSum(rows, f) { return rows.reduce((a, r) => a + (f(r) || 0), 0); }
function stAvg(rows, f) { const v = rows.map(f).filter((x) => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function stPeriod() { const n = statsRange, cur = stDays(n), prev = stDays(n, n); return { n, cur, prev, R: cur.map(stRow), P: prev.map(stRow), from: dk(cur[0]), to: dk(cur[cur.length - 1]), pfrom: dk(prev[0]), pto: dk(prev[prev.length - 1]) }; }

/* ───────── pieces ───────── */
function stDelta(a, b, higherIsBetter, unit) {
  if (a == null || b == null) return '<span class="st-dl">no earlier data</span>';
  if (b === 0 && a === 0) return '<span class="st-dl">same as before</span>';
  const df = a - b, pc = b ? Math.round((df / Math.abs(b)) * 100) : null, good = higherIsBetter == null ? null : (df > 0) === higherIsBetter;
  const txt = unit === 'pp' ? `${df > 0 ? '+' : ''}${fmt(df, 1)} pts` : unit ? `${df > 0 ? '+' : ''}${fmt(df, Math.abs(df) < 10 ? 1 : 0)}${unit}` : pc != null && Math.abs(pc) < 1000 ? `${df > 0 ? '+' : ''}${pc}%` : `${df > 0 ? '+' : ''}${fmt(df, Math.abs(df) < 10 ? 1 : 0)}${unit || ''}`;
  return `<span class="st-dl ${df === 0 ? '' : good === null ? '' : good ? 'up' : 'down'}">${df > 0 ? '▲' : df < 0 ? '▼' : '='} ${txt} <em>vs previous ${statsRange} d</em></span>`;
}
function stK(label, val, sub, delta, go) { return `<div class="st-k ${go ? 'go' : ''}" ${go ? `onclick="${go}"` : ''}><div class="l">${label}</div><div class="n">${val}</div>${sub ? `<div class="s">${sub}</div>` : ''}${delta || ''}</div>`; }
function stCard(title, right, body, cls) { return `<div class="card ${cls || ''}"><div class="card-h"><div class="card-t">${title}</div>${right ? `<div class="card-r">${right}</div>` : ''}</div>${body}</div>`; }
function stTable(head, rows, opt) {
  opt = opt || {};
  return `<div class="st-tw"><table class="st-t"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr ${r.go ? `class="go" onclick="${r.go}"` : ''}>${r.c.map((x) => `<td>${x == null || x === '' ? '<span class="muted">—</span>' : x}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="muted">${opt.empty || 'Nothing logged in this period.'}</td></tr>`}</tbody>${opt.foot ? `<tfoot><tr>${opt.foot.map((x) => `<td>${x == null ? '' : x}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function stDayLbl(d) { return `${DAY_SHORT[dow(d)]} ${d.getDate()}.${pad(d.getMonth() + 1)}`; }
function stBars(R, f, opt) { return vbars(R.map((r) => ({ l: R.length <= 14 || dow(r.d) === 1 ? (R.length <= 14 ? DAY_SHORT[dow(r.d)].slice(0, 2) : r.d.getDate() + '.' + pad(r.d.getMonth() + 1)) : '', v: f(r) || 0, t: opt && opt.t ? opt.t(r) : 0, cls: opt && opt.cls ? opt.cls(r) : (opt && opt.c) || '', top: R.length <= 10 && f(r) ? (opt && opt.top ? opt.top(r) : f(r)) : '', today: r.k === dk(new Date()), go: `dayDetail('${r.k}')` })), { h: (opt && opt.h) || 150, max: opt && opt.max }); }
function stHm(m) { return m == null ? null : `${Math.floor(m / 60)}h ${pad(Math.round(m % 60))}m`; }
function stStreak(rows, f) { let cur = 0, best = 0, run = 0; rows.forEach((r) => { if (f(r)) { run++; best = Math.max(best, run); } else run = 0; }); for (let i = rows.length - 1; i >= 0; i--) { if (f(rows[i])) cur++; else if (rows[i].k === dk(new Date())) continue; else break; } return { cur, best }; }

/* ═════════ CALLS ═════════ */
function statsCallsTab(p) {
  const { R, P } = p, dialDays = R.filter((r) => r.tg && r.k <= dk(new Date())), pdialDays = P.filter((r) => r.tg);
  const D = stSum(R, (r) => r.dials), pD = stSum(P, (r) => r.dials), O = stSum(R, (r) => r.owners), pO = stSum(P, (r) => r.owners);
  const rate = D ? (O / D) * 100 : null, prate = pD ? (pO / pD) * 100 : null, hit = dialDays.filter((r) => r.dials >= r.tg).length, phit = pdialDays.filter((r) => r.dials >= r.tg).length;
  const best = R.slice().sort((a, b) => b.dials - a.dials)[0], st = stStreak(stDays(120).map(stRow).filter((r) => r.tg), (r) => r.dials >= r.tg);
  const C = stCalls(p.from, p.to), PC = stCalls(p.pfrom, p.pto), mix = {}, pmix = {}; C.forEach((c) => { const o = stOutcome(c.e); mix[o] = (mix[o] || 0) + 1; }); PC.forEach((c) => { const o = stOutcome(c.e); pmix[o] = (pmix[o] || 0) + 1; });
  const outs = ST_OUT.map((x) => x[0]).concat(['Other']).filter((l) => mix[l] || pmix[l]), cols = Object.fromEntries(ST_OUT.map((x) => [x[0], x[2]]).concat([['Other', 'var(--line2)']]));
  const wd = [1, 2, 3, 4, 5, 6, 7].map((w) => { const rs = stDays(84).map(stRow).filter((r) => dow(r.d) === w && r.tg); return { w, avg: rs.length ? stSum(rs, (r) => r.dials) / rs.length : 0, tg: rs.length ? stSum(rs, (r) => r.tg) / rs.length : 0, own: stSum(rs, (r) => r.owners), dials: stSum(rs, (r) => r.dials) }; });
  const hrs = {}; C.forEach((c) => { const t = new Date(c.e.at), fh = (t.getHours() - 7 + 24) % 24; const h = hrs[fh] = hrs[fh] || { n: 0, o: 0 }; h.n++; if (c.e.d.owners) h.o++; });
  const hk = Object.keys(hrs).map(Number).sort((a, b) => a - b), hmax = Math.max(1, ...hk.map((h) => hrs[h].n));
  const sess = []; R.forEach((r) => ((S.days[r.k] || {}).sessions || []).forEach((s) => sess.push(Object.assign({ k: r.k }, s))));
  sess.sort((a, b) => b.start - a.start);
  return `<div class="st-kpis">
      ${stK('Dials', fmt(D), `${statsRange} days · ${dialDays.length ? Math.round(D / Math.max(1, dialDays.length)) : 0} per dial day`, stDelta(D, pD, true), "metricDetail('dials')")}
      ${stK('Owner talks', O, rate != null ? `1 in ${Math.round(100 / Math.max(rate, 0.01))} dials` : 'no dials yet', stDelta(O, pO, true), "metricDetail('owners')")}
      ${stK('Owner rate', rate != null ? fmt(rate, 1) + '<small>%</small>' : '—', 'owner talks ÷ dials · plan 2.5%', stDelta(rate, prate, true, 'pp'))}
      ${stK('Target days hit', `${hit}<small>/ ${dialDays.length}</small>`, `streak ${st.cur} · best ${st.best}`, stDelta(hit, phit, true))}
      ${stK('Best day', best && best.dials ? best.dials : '—', best && best.dials ? stDayLbl(best.d) : '', '', best && best.dials ? `dayDetail('${best.k}')` : '')}
    </div>
    <div class="sgrid st-g">${statsDials()}
    ${stCard('How calls ended', `${C.length} calls tapped · <a href="#" onclick="ledgerOpen();return false">call log</a>`, C.length ? `<div class="st-stack">${outs.map((l) => mix[l] ? `<i style="flex:${mix[l]};background:${cols[l]}" title="${l} ${mix[l]}"></i>` : '').join('')}</div>${stTable(['Outcome', 'Calls', 'Share', `Previous ${statsRange} d`], outs.map((l) => ({ c: [`<span class="dot" style="background:${cols[l]}"></span>${l}`, mix[l] || 0, C.length ? Math.round(((mix[l] || 0) / C.length) * 100) + '%' : '', pmix[l] || 0] })))}` : '<div class="empty">Outcomes appear when calls are tapped in the dialer (not typed into the counter).</div>')}
    ${stCard('By weekday', 'average of the last 12 weeks, dial days only', `<div class="st-wd">${wd.map((x) => `<div><div class="b"><i style="height:${Math.min(100, x.tg ? (x.avg / Math.max(x.tg, x.avg)) * 100 : 0)}%"></i>${x.tg ? `<s style="bottom:${Math.min(100, (x.tg / Math.max(x.tg, x.avg)) * 100)}%"></s>` : ''}</div><b>${x.tg ? Math.round(x.avg) : '·'}</b><span>${DAY_SHORT[x.w].slice(0, 2)}</span><em>${x.dials ? fmt((x.own / x.dials) * 100, 1) + '%' : ''}</em></div>`).join('')}</div><div class="xs muted">Bar = average dials, line = average target, % = owner rate on that weekday.</div>`)}
    ${stCard('By Florida hour', 'when owners pick up', hk.length ? `<div class="st-hr">${hk.map((h) => `<div><div class="b"><i style="height:${(hrs[h].n / hmax) * 100}%"></i><u style="height:${(hrs[h].o / hmax) * 100}%"></u></div><b>${hrs[h].n}</b><span>${h}h</span><em>${hrs[h].o ? Math.round((hrs[h].o / hrs[h].n) * 100) + '%' : ''}</em></div>`).join('')}</div><div class="legend"><span><i style="background:var(--co)"></i>calls</span><span><i style="background:var(--ok)"></i>owner talks</span><span>% = owner rate</span></div>` : '<div class="empty">Needs tapped calls in this period.</div>')}
    ${stCard('Dial sessions', `${sess.length} in ${statsRange} d`, stTable(['Day', 'Start', 'Length', 'Dials', 'Owners', 'Per hour'], sess.slice(0, 20).map((s) => { const m = Math.max(1, (s.end - s.start) / 60000); return { go: `dayDetail('${s.k}')`, c: [stDayLbl(pd(s.k)), hmNow(new Date(s.start)), stHm(m), s.dials, s.owners, Math.round((s.dials / m) * 60)] }; }), { empty: 'No dial sessions in this period. Start one in the dialer or Reactor.' }), 'w2')}
    ${stCard('Calls, newest first', `${Math.min(C.length, 25)} of ${C.length}`, stTable(['When', 'Agency', 'Result'], C.slice(0, 25).map((c) => ({ go: `ledgerOpen('${c.k}')`, c: [`${stDayLbl(pd(c.k))} ${hmNow(new Date(c.e.at))}`, esc(c.x.agency), esc(c.e.r) + (c.e.note ? ` <span class="muted">· ${esc(c.e.note)}</span>` : '')] })), { empty: 'No tapped calls in this period.' }), 'w2')}
    ${statsFunnel()}${statsCalls()}</div>`;
}

/* ═════════ BODY ═════════ */
function statsBodyTab(p) {
  const { R, P } = p, tt = foodTargets(), w = R.filter((r) => r.weight != null), pw = P.filter((r) => r.weight != null);
  const wAvg = stAvg(w, (r) => r.weight), pwAvg = stAvg(pw, (r) => r.weight), tr = R.filter((r) => r.trained).length, ptr = P.filter((r) => r.trained).length;
  const kc = stAvg(R, (r) => r.kcal), pkc = stAvg(P, (r) => r.kcal), pr = stAvg(R, (r) => r.prot), ppr = stAvg(P, (r) => r.prot), prHit = R.filter((r) => r.prot != null && r.prot >= tt.p).length;
  const weeks = weeksBack(Math.max(4, Math.ceil(statsRange / 7))).map((m) => { const rs = [0, 1, 2, 3, 4, 5, 6].map((i) => stRow(addDays(m, i))); return { m, w: stAvg(rs.filter((r) => r.weight != null), (r) => r.weight), tr: rs.filter((r) => r.trained).length, kc: stAvg(rs, (r) => r.kcal), pr: stAvg(rs, (r) => r.prot), n: rs.filter((r) => r.weight != null).length }; });
  const ses = []; R.forEach((r) => sessionsRO(S.days[r.k]).filter((s) => s.done).forEach((s) => ses.push({ k: r.k, s })));
  return `<div class="st-kpis">
      ${stK('Weight · period avg', wAvg ? fmt(wAvg, 1) + '<small>kg</small>' : '—', `${w.length} weigh-ins · goal ${S.settings.weightTarget} kg`, stDelta(wAvg, pwAvg, true, ' kg'), "metricDetail('weight',84)")}
      ${stK('Training days', `${tr}<small>/ ${statsRange}</small>`, `${ses.length} sessions logged`, stDelta(tr, ptr, true), "metricDetail('train')")}
      ${stK('Calories', kc ? fmt(kc) + '<small>kcal</small>' : '—', `avg on logged days · target ${fmt(tt.kcal)}`, stDelta(kc, pkc, true), "metricDetail('kcal')")}
      ${stK('Protein', pr ? Math.round(pr) + '<small>g</small>' : '—', `${prHit} days at ${tt.p} g+`, stDelta(pr, ppr, true), "metricDetail('protein')")}
    </div>
    <div class="sgrid st-g">${statsWeight()}
    ${stCard('Week by week', 'averages', stTable(['Week of', 'Weight', 'Change', 'Weigh-ins', 'Trained', 'kcal', 'Protein'], weeks.slice().reverse().map((x, i, a) => { const prev = a[i + 1]; return { go: `weekDetail('${dk(x.m)}')`, c: [wkLabel(x.m), x.w ? fmt(x.w, 1) : null, x.w && prev && prev.w ? `${x.w - prev.w >= 0 ? '+' : ''}${fmt(x.w - prev.w, 2)}` : null, x.n, `${x.tr}/7`, x.kc ? fmt(x.kc) : null, x.pr ? Math.round(x.pr) + ' g' : null] }; })), 'w2')}
    ${statsTrain()}
    ${stCard('Training sessions', `${ses.length} in ${statsRange} d`, stTable(['Day', 'Session', 'Minutes', 'Sets'], ses.slice().reverse().slice(0, 25).map(({ k, s }) => ({ go: `dayDetail('${k}')`, c: [stDayLbl(pd(k)), esc(s.name || s.title || 'Session'), (() => { try { return sessionMinutes(s) || null; } catch (e) { return null; } })(), (s.ex || s.exercises || []).reduce((a, e) => a + ((e.sets || []).filter((x) => x.done || x.reps).length), 0) || null] })), { empty: 'No finished sessions in this period.' }))}
    ${statsFood()}
    ${stCard('Protein by day', `target ${tt.p} g`, stBars(R, (r) => r.prot, { t: () => tt.p, cls: (r) => (r.prot >= tt.p ? 'hit' : ''), h: 130, max: tt.p * 1.3, top: (r) => Math.round(r.prot) }), 'w2')}</div>`;
}

/* ═════════ SLEEP ═════════ */
function statsSleepTab(p) {
  const { R, P } = p, N = R.filter((r) => r.sleep != null), PN = P.filter((r) => r.sleep != null), avg = stAvg(N, (r) => r.sleep), pavg = stAvg(PN, (r) => r.sleep);
  const bedM = (r) => { if (!r.bed) return null; const m = tmin(r.bed); return m < 720 ? m + 1440 : m; }, bAvg = stAvg(R.filter((r) => r.bed), bedM), pbAvg = stAvg(P.filter((r) => r.bed), bedM);
  const tgtBed = tmin(S.settings.bed || '21:00'), onTime = R.filter((r) => r.bed && bedM(r) <= tgtBed + 15).length, logged = R.filter((r) => r.bed).length;
  const wk = stAvg(N, (r) => r.wakes), q = stAvg(R.filter((r) => r.sq), (r) => r.sq), long = N.filter((r) => r.sleep >= 480).length;
  return `<div class="st-kpis">
      ${stK('Average sleep', avg ? stHm(avg) : '—', `${N.length} nights logged · 8 h target`, stDelta(avg, pavg, true, ' min'), "metricDetail('sleep')")}
      ${stK('Average bedtime', bAvg ? hmNow(new Date(2000, 0, 1, 0, Math.round(bAvg))) : '—', `target ${S.settings.bed || '21:00'}`, bAvg && pbAvg ? stDelta(bAvg, pbAvg, false, ' min') : '')}
      ${stK('In bed on time', `${onTime}<small>/ ${logged}</small>`, 'within 15 min of the target', '')}
      ${stK('8 h nights', `${long}<small>/ ${N.length}</small>`, `wake-ups avg ${wk != null ? fmt(wk, 1) : '—'} · rating ${q ? fmt(q, 1) + '/5' : '—'}`, '')}
    </div>
    <div class="sgrid st-g">
    ${stCard('Hours slept per night', '8 h line', stBars(R, (r) => r.sleep, { t: () => 480, cls: (r) => (r.sleep >= 480 ? 'hit' : r.sleep ? 'miss' : ''), h: 170, max: 600, top: (r) => (r.sleep / 60).toFixed(1) }), 'w2')}
    ${stCard('Bedtime and wake-up', 'each night as a bar from bed to up', `<div class="st-night">${R.map((r) => { const b = bedM(r), u = r.woke ? tmin(r.woke) + 1440 : null, lo = 1140, hi = 1440 + 600, X = (m) => ((m - lo) / (hi - lo)) * 100; return `<div class="go" onclick="dayDetail('${r.k}')"><span>${R.length <= 14 ? DAY_SHORT[dow(r.d)].slice(0, 2) + ' ' + r.d.getDate() : r.d.getDate()}</span><div>${b && u ? `<i style="left:${X(b)}%;width:${Math.max(1, X(u) - X(b))}%"></i>` : b ? `<i class="open" style="left:${X(b)}%;width:2%"></i>` : ''}<s style="left:${X(tgtBed < 720 ? tgtBed + 1440 : tgtBed)}%"></s><s class="w" style="left:${X(tmin(S.settings.wake || '05:20') + 1440)}%"></s></div></div>`; }).join('')}<div class="ax"><span>19:00</span><span>22:00</span><span>01:00</span><span>04:00</span><span>07:00</span><span>10:00</span></div></div><div class="xs muted">Lines: target bed and wake time. Tap a night to open the day.</div>`, 'w2')}
    ${stCard('Every night', `${N.length} logged`, stTable(['Night', 'Bed', 'Up', 'Slept', 'Wake-ups', 'Rating', ''], R.slice().reverse().filter((r) => r.bed || r.woke).map((r) => ({ c: [stDayLbl(r.d), r.bed, r.woke, stHm(r.sleep), r.wakes || (r.sleep != null ? 0 : null), r.sq ? r.sq + '/5' : null, `<a href="#" onclick="event.stopPropagation();sleepEdit('${r.k}');return false">edit</a>`] })), { empty: 'No nights logged in this period. Lights out starts one.' }), 'w2')}</div>`;
}

/* ═════════ MIND ═════════ */
function statsMindTab(p) {
  const { R, P } = p, B = stSum(R, (r) => r.bac), pB = stSum(P, (r) => r.bac), Dp = stSum(R, (r) => r.deep), pDp = stSum(P, (r) => r.deep), bd = R.filter((r) => r.bac > 0).length;
  const bc = counterDef('bac'), wT = (bc && bc.weekly) || 0, F = (typeof live === 'function' ? live(S.focus || {}) : Object.values(S.focus || {})).filter((x) => x && !x.active && x.start && dk(new Date(x.start)) >= p.from);
  return `<div class="st-kpis">
      ${stK('BAC study', `${Math.round(B / 6) / 10}<small>h</small>`, `${bd} study days · plan ${wT ? fmt((wT * statsRange) / 7 / 60, 1) + ' h' : '—'}`, stDelta(B, pB, true), "metricDetail('bac')")}
      ${stK('Deep work', `${Math.round(Dp / 6) / 10}<small>h</small>`, 'company focus blocks', stDelta(Dp, pDp, true), "metricDetail('deep')")}
      ${stK('Days to the first exam', daysUntil(S.settings.bacDate), fmtShort(pd(S.settings.bacDate)), '')}
      ${stK('Lockdown sessions', F.length, `${F.reduce((a, x) => a + (x.interrupts || []).length, 0)} interruptions`, '')}
    </div>
    <div class="sgrid st-g">
    ${stCard('BAC minutes by day', 'study', stBars(R, (r) => r.bac, { c: 'mind', h: 150, top: (r) => r.bac }), 'w2')}
    ${statsStudy()}
    ${stCard('Deep work by day', 'minutes', stBars(R, (r) => r.deep, { c: 'mind', h: 120, top: (r) => r.deep }))}
    ${typeof statsScreen === 'function' ? statsScreen() : ''}</div>`;
}

/* ═════════ MONEY ═════════ */
function statsMoneyTab(p) {
  const { R, P } = p, cur = S.settings.currency, I = stSum(R, (r) => r.inc), pI = stSum(P, (r) => r.inc), Sp = stSum(R, (r) => r.sp), pSp = stSum(P, (r) => r.sp);
  const cat = (rows, id) => rows.reduce((a, r) => a + (Number(((S.days[r.k] || {}).money || {})[id]) || 0), 0);
  const weeks = weeksBack(Math.max(4, Math.ceil(statsRange / 7))).map((m) => { const rs = [0, 1, 2, 3, 4, 5, 6].map((i) => stRow(addDays(m, i))); return { m, i: stSum(rs, (r) => r.inc), s: stSum(rs, (r) => r.sp) }; });
  const mx = Math.max(1, ...weeks.map((w) => Math.max(w.i, w.s)));
  return `<div class="st-kpis">
      ${stK('Made', `${fmt(I)}<small>${cur}</small>`, `${fmt(I / statsRange)} a day`, stDelta(I, pI, true), "metricDetail('income')")}
      ${stK('Spent', `${fmt(Sp)}<small>${cur}</small>`, `${fmt(Sp / statsRange)} a day`, stDelta(Sp, pSp, false), "metricDetail('spent')")}
      ${stK('Net', `${I - Sp >= 0 ? '+' : ''}${fmt(I - Sp)}<small>${cur}</small>`, I - Sp >= 0 ? 'spent less than made' : 'spent more than made', stDelta(I - Sp, pI - pSp, true))}
    </div>
    <div class="sgrid st-g">
    ${stCard('Made vs spent by week', cur, `<div class="st-mw">${weeks.map((w) => `<div class="go" onclick="weekDetail('${dk(w.m)}')"><div class="b"><i class="in" style="height:${(w.i / mx) * 100}%"></i><i class="out" style="height:${(w.s / mx) * 100}%"></i></div><span>${wkLabel(w.m)}</span></div>`).join('')}</div><div class="legend"><span><i style="background:var(--ok)"></i>made</span><span><i style="background:var(--bad)"></i>spent</span></div>`, 'w2')}
    ${stCard('By category', `${statsRange} d vs previous`, stTable(['Category', 'This period', 'Share', 'Previous'], MONEY_IN.map(([id, l]) => ({ c: [`<span class="ok">+</span> ${l}`, fmt(cat(R, id)), I ? Math.round((cat(R, id) / I) * 100) + '%' : '', fmt(cat(P, id))] })).concat(MONEY_OUT.map(([id, l]) => ({ c: [`<span class="bad">−</span> ${l}`, fmt(cat(R, id)), Sp ? Math.round((cat(R, id) / Sp) * 100) + '%' : '', fmt(cat(P, id))] })).filter((r) => r.c[1] !== '0' || r.c[3] !== '0')), { foot: ['Net', fmt(I - Sp), '', fmt(pI - pSp)] }), 'w2')}
    ${stCard('Every day', 'tap to open', stTable(['Day', 'Made', 'Spent', 'Net'], R.slice().reverse().filter((r) => r.inc || r.sp).map((r) => ({ go: `dayDetail('${r.k}')`, c: [stDayLbl(r.d), r.inc ? fmt(r.inc) : null, r.sp ? fmt(r.sp) : null, `${r.inc - r.sp >= 0 ? '+' : ''}${fmt(r.inc - r.sp)}`] })), { foot: ['Total', fmt(I), fmt(Sp), `${I - Sp >= 0 ? '+' : ''}${fmt(I - Sp)}`] }), 'w2')}</div>`;
}

/* ═════════ HABITS ═════════ */
function statsHabitsTab(p) {
  const { R, P } = p, long = stDays(365).map(stRow), short = (t) => t.replace(/(?:\p{Extended_Pictographic}|[\u2600-\u27BF])(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?\s?/gu, '').replace(/\s*\(.*?\)\s*/g, '').replace(/ Protocol| Check/g, '').trim();
  const on = (r, h) => !!((S.days[r.k] || {}).habits || {})[h.id];
  const rows = S.habits.items.map((h) => { const pc = R.length ? (R.filter((r) => on(r, h)).length / R.length) * 100 : 0, ppc = P.length ? (P.filter((r) => on(r, h)).length / P.length) * 100 : 0, st = stStreak(long, (r) => on(r, h)); return { h, pc, ppc, st }; });
  const sc = stAvg(R.filter((r) => r.has), (r) => r.score), psc = stAvg(P.filter((r) => r.has), (r) => r.score), full = R.filter((r) => r.std >= S.habits.items.length).length;
  const mxDays = R.length > 28 ? R.slice(-28) : R;
  const line = R.filter((r) => r.has).length >= 2 ? lineChart({ raw: R.map((r, i) => ({ x: i / Math.max(1, R.length - 1), v: r.score })), target: 85, showTarget: true, xl: [[0, fmtShort(R[0].d), 'start'], [1, fmtShort(R[R.length - 1].d), 'end']] }) : '<div class="empty">Needs two logged days.</div>';
  return `<div class="st-kpis">
      ${stK('Day score', sc != null ? Math.round(sc) + '<small>%</small>' : '—', `average over ${R.filter((r) => r.has).length} logged days`, stDelta(sc, psc, true, 'pp'), "metricDetail('score')")}
      ${stK('All 7 kept', `${full}<small>/ ${statsRange}</small>`, 'perfect days', '')}
      ${stK('Best habit', rows.slice().sort((a, b) => b.pc - a.pc)[0] ? esc(short(rows.slice().sort((a, b) => b.pc - a.pc)[0].h.title)) : '—', 'highest % kept', '')}
      ${stK('Weakest habit', rows.slice().sort((a, b) => a.pc - b.pc)[0] ? esc(short(rows.slice().sort((a, b) => a.pc - b.pc)[0].h.title)) : '—', 'fix this one first', '')}
    </div>
    <div class="sgrid st-g">
    ${stCard('Each standard', `${statsRange} d vs previous`, stTable(['Standard', 'Kept', 'Previous', 'Streak now', 'Best (1 yr)'], rows.map((x) => ({ go: `metricDetail('std:${x.h.id}')`, c: [esc(short(x.h.title)), `<span class="st-pc"><i style="width:${x.pc}%"></i></span> ${Math.round(x.pc)}%`, Math.round(x.ppc) + '%', x.st.cur ? x.st.cur + ' d' : 0, x.st.best + ' d'] }))), 'w2')}
    ${stCard(`Matrix · last ${mxDays.length} days`, 'tap a day', `<div class="mx" style="grid-template-columns:minmax(84px,auto) repeat(${mxDays.length},1fr) auto">${S.habits.items.map((h) => `<span class="nm go" onclick="metricDetail('std:${h.id}')">${esc(short(h.title))}</span>${mxDays.map((r) => `<i class="${on(r, h) ? 'on' : ''} go" onclick="dayDetail('${r.k}')"></i>`).join('')}<span class="pc">${Math.round((mxDays.filter((r) => on(r, h)).length / mxDays.length) * 100)}%</span>`).join('')}</div>`, 'w2')}
    ${stCard('Day score trend', '85% line', line, 'w2')}
    ${statsHeat()}</div>`;
}

/* ═════════ DAY LOG ═════════ */
function statsLogTab(p) {
  const R = p.R.slice().reverse(), n = S.habits.items.length;
  const tot = { d: stSum(R, (r) => r.dials), o: stSum(R, (r) => r.owners), b: stSum(R, (r) => r.bac), i: stSum(R, (r) => r.inc), s: stSum(R, (r) => r.sp) };
  return `<div class="row sb" style="margin-bottom:10px"><div class="small muted">One row per day, newest first. Tap a row to open that day.</div><button class="btn sm" onclick="statsCsv()">Export CSV</button></div>
    ${stCard(`Day log · ${statsRange} days`, '', stTable(['Day', 'Score', 'Dials', 'Owners', 'BAC', 'Weight', 'Sleep', 'Std', 'kcal', 'Prot', 'Trained', 'Money'], R.map((r) => ({ go: `dayDetail('${r.k}')`, c: [stDayLbl(r.d), r.has ? `<span class="st-sc s${r.score >= 85 ? 4 : r.score >= 60 ? 3 : r.score >= 35 ? 2 : 1}">${r.score}</span>` : null, r.tg || r.dials ? `<b class="${r.tg && r.dials >= r.tg ? 'ok' : r.tg && r.k < dk(new Date()) ? 'bad' : ''}">${r.dials}</b><span class="muted">/${r.tg || 0}</span>` : null, r.owners || null, r.bac || null, r.weight != null ? fmt(r.weight, 1) : null, stHm(r.sleep), r.has ? `${r.std}/${n}` : null, r.kcal != null ? fmt(r.kcal) : null, r.prot != null ? Math.round(r.prot) : null, r.trained ? '✓' : null, r.inc || r.sp ? `${r.inc - r.sp >= 0 ? '+' : ''}${fmt(r.inc - r.sp)}` : null] })), { foot: ['Total', '', tot.d, tot.o, tot.b, '', '', '', '', '', '', `${tot.i - tot.s >= 0 ? '+' : ''}${fmt(tot.i - tot.s)}`] }), 'st-log')}`;
}
function statsCsv() {
  const R = stPeriod().R, H = ['date', 'score', 'dials', 'target', 'owners', 'bac_min', 'deep_min', 'weight_kg', 'sleep_min', 'bed', 'up', 'standards', 'kcal', 'protein_g', 'trained', 'made', 'spent'];
  const L = [H.join(',')].concat(R.map((r) => [r.k, r.has ? r.score : '', r.dials, r.tg, r.owners, r.bac, r.deep, r.weight ?? '', r.sleep ?? '', r.bed, r.woke, r.std, r.kcal ?? '', r.prot ?? '', r.trained ? 1 : 0, r.inc, r.sp].join(',')));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/csv' })); a.download = `war-room-${R[0].k}-to-${R[R.length - 1].k}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* ═════════ the page ═════════ */
function renderStats() {
  if (![7, 14, 28, 84].includes(statsRange)) statsRange = 28;
  const p = stPeriod();
  const head = `<div class="st-head"><div class="st-tabs" role="tablist">${STATS_TABS.map(([k, l]) => `<button role="tab" aria-selected="${statsTab === k}" class="${statsTab === k ? 'on' : ''}" onclick="statsTab='${k}';render()">${l}</button>`).join('')}</div>
    <div class="row" style="gap:8px"><div class="seg">${[[7, '7 d'], [14, '14 d'], [28, '4 wk'], [84, '12 wk']].map(([v, l]) => `<button class="${statsRange === v ? 'on' : ''}" onclick="statsRange=${v};render()">${l}</button>`).join('')}</div><button class="btn sm" onclick="openRank()">${ic('medal', 16)} Rank</button></div></div>
    <div class="st-period">${fmtShort(p.cur[0])} – ${fmtShort(p.cur[p.cur.length - 1])} · compared with ${fmtShort(p.prev[0])} – ${fmtShort(p.prev[p.prev.length - 1])}</div>`;
  let body;
  if (statsTab === 'overview') body = statsKpis() + `<div class="sgrid">${statsIntel()}${statsDials()}${statsFunnel()}${statsCalls()}${statsRecords()}${statsXp()}${statsHeat()}${statsStandards()}${statsTrain()}${statsWeight()}${statsStudy()}${statsScreen()}${statsFood()}${statsMoney()}</div>`;
  else body = ({ calls: statsCallsTab, body: statsBodyTab, sleep: statsSleepTab, mind: statsMindTab, money: statsMoneyTab, habits: statsHabitsTab, log: statsLogTab }[statsTab] || statsCallsTab)(p);
  $('view-stats').innerHTML = head + body;
}
