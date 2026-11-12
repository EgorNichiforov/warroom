/* War Room v5 · Stats: the dashboard. Every number comes from what was logged. */
'use strict';
let statsRange = window.innerWidth < 700 ? 14 : 28;
function rangeDays(n) { const t = new Date(); t.setHours(0, 0, 0, 0); const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(t, -i)); return out; }
function cOf(d, id) { const o = S.days[dk(d)]; return o && o.counters ? Number(o.counters[id]) || 0 : 0; }
function weeksBack(n) { const m = monday(new Date()); const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(m, -7 * i)); return out; }
function wkSum(m, fn) { let s = 0; for (let i = 0; i < 7; i++) s += fn(addDays(m, i)) || 0; return s; }
function wkLabel(m) { return m.getDate() + '.' + pad(m.getMonth() + 1); }

function statsKpis() {
  const t = new Date(), dc = counterDef('dials'), wkT = dc ? dc.weekly || 150 : 150, wk = counterWeek('dials', t), owners = counterTotal('owners'), dials = counterTotal('dials');
  let m = 0, cl = 0, tr = 0; try { m = mrr(); cl = members().length; tr = trials().length; } catch (e) { }
  const a7 = avgWeight(7), a7p = avgWeight(7, dk(addDays(t, -7))), wT = S.settings.weightTarget;
  const days = rangeDays(statsRange).filter((d) => S.days[dk(d)]), avgSc = days.length ? Math.round(days.reduce((a, d) => a + dayScore(d), 0) / days.length) : 0;
  const og = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners'), oT = og ? og.target : 100;
  const K = (l, n, d, pct, col) => `<div class="kpi"><div class="l">${l}</div><div class="n">${n}</div><div class="d">${d}</div><div class="bar"><i style="width:${clamp(pct, 0, 100)}%;background:${col}"></i></div></div>`;
  return `<div class="kpis">
    ${K('Dials this week', `${wk}<small>/ ${wkT}</small>`, `${Math.max(0, wkT - wk)} to go · ${fmt(dials)} all time`, (wk / wkT) * 100, 'linear-gradient(90deg,var(--co),var(--co2))')}
    ${K('Owner talks', `${owners}<small>/ ${oT}</small>`, dials ? `1 in ${Math.round(dials / Math.max(1, owners))} dials reaches an owner` : 'no dials logged yet', (owners / oT) * 100, 'linear-gradient(90deg,var(--co),var(--co2))')}
    ${K('MRR', `$${fmt(m)}<small>/ 20k</small>`, `${cl} paying · ${tr} on trial`, (m / 20000) * 100, 'linear-gradient(90deg,var(--co),var(--co2))')}
    ${K('Weight · 7-day', a7 ? `${fmt(a7, 1)}<small>kg</small>` : '—', a7 && a7p ? `${a7 - a7p >= 0 ? '+' : ''}${fmt(a7 - a7p, 1)} kg vs last week · goal ${wT}` : `goal ${wT} kg`, a7 ? (a7 / wT) * 100 : 0, 'linear-gradient(90deg,var(--body2),var(--body))')}
    ${K('Day score', `${avgSc}<small>%</small>`, `average over ${days.length} logged day${days.length === 1 ? '' : 's'}`, avgSc, 'linear-gradient(90deg,var(--mind2),var(--mind))')}</div>`;
}
function statsDials() {
  const dc = counterDef('dials'), tk = dk(new Date()); let items, total = 0, hit = 0, due = 0, owners = 0;
  if (statsRange <= 28) {
    items = rangeDays(statsRange).map((d) => { const k = dk(d), v = cOf(d, 'dials'), tg = dialTargetFor(d); total += v; owners += cOf(d, 'owners'); if (tg && k <= tk) { due++; if (v >= tg) hit++; }
      return { l: dow(d) === 1 ? d.getDate() + '.' + pad(d.getMonth() + 1) : '', v, t: tg, cls: tg && v >= tg ? 'hit' : (k < tk && tg ? 'miss' : ''), top: statsRange <= 14 ? v : '', today: k === tk, tip: `${fmtShort(d)}: ${v}${tg ? ' / ' + tg : ''}` }; });
    items.forEach((x) => { if (x.today) x.l = 'today'; });
  } else {
    const wkT = dc ? dc.weekly || 150 : 150;
    items = weeksBack(12).map((m, i, a) => { const v = wkSum(m, (d) => cOf(d, 'dials')); total += v; owners += wkSum(m, (d) => cOf(d, 'owners')); if (i < a.length - 1 || v >= wkT) { due++; if (v >= wkT) hit++; } return { l: wkLabel(m), v, t: wkT, cls: v >= wkT ? 'hit' : (i < a.length - 1 ? 'miss' : ''), top: v, today: i === a.length - 1 }; });
  }
  return `<div class="card w2"><div class="card-h"><div class="card-t">Dials · ${statsRange <= 28 ? 'by day' : 'by week'}</div><div class="card-r">last ${statsRange <= 28 ? statsRange + ' days' : '12 weeks'}</div></div>
    <div class="statline"><div><div class="sub-n">${fmt(total)}</div><div class="l">dials</div></div><div><div class="sub-n">${owners}</div><div class="l">owner talks</div></div><div><div class="sub-n">${hit}<small>/ ${due}</small></div><div class="l">${statsRange <= 28 ? 'dial days hit' : 'weeks hit'}</div></div></div>
    ${vbars(items, { h: 170 })}<div class="legend"><span><i class="ln" style="background:var(--text);opacity:.5"></i>target</span><span><i style="background:var(--body)"></i>hit</span><span><i style="background:var(--bad)"></i>missed</span><span><i style="background:var(--co)"></i>in progress</span></div></div>`;
}
function statsFunnel() {
  let q = []; try { q = qItems(); } catch (e) { }
  const dialed = q.filter((x) => (x.log && x.log.length) || x.attempts).length, reached = q.filter((x) => ['owner', 'booked', 'bulletin', 'trial', 'member'].includes(x.status) || (x.log || []).some((e) => e.d && e.d.owners)).length;
  const booked = q.filter((x) => ['booked', 'trial', 'member'].includes(x.status)).length, tr = q.filter((x) => ['trial', 'member'].includes(x.status)).length, mem = q.filter((x) => x.status === 'member').length, cb = q.filter((x) => x.status === 'callback').length;
  const rows = [['On the list', q.length], ['Dialed', dialed], ['Owner reached', reached], ['Meeting booked', booked], ['Trial', tr], ['Paying', mem]], mx = Math.max(1, q.length);
  return `<div class="card"><div class="card-h"><div class="card-t">Pipeline</div><div class="card-r">${cb} callback${cb === 1 ? '' : 's'} open</div></div><div class="funnel">${rows.map(([l, v]) => `<div class="f"><span class="l">${l}</span><div class="bar">${v ? `<i style="width:${Math.max(1.5, (v / mx) * 100)}%"></i>` : ''}</div><span class="v">${v}</span></div>`).join('')}</div>
    <div class="xs muted" style="margin-top:8px">${q.length ? `${q.length - dialed} agencies have never been called.` : 'The call list has not loaded on this device yet.'}</div></div>`;
}
function statsHeat() {
  const weeks = weeksBack(12), tk = dk(new Date()); let cells = '';
  weeks.forEach((m) => { for (let i = 0; i < 7; i++) { const d = addDays(m, i), k = dk(d); if (k > tk) { cells += '<i class="fut"></i>'; continue; } const sc = S.days[k] ? dayScore(d) : 0, l = !S.days[k] || sc < 10 ? '' : sc < 35 ? 'l1' : sc < 60 ? 'l2' : sc < 85 ? 'l3' : 'l4'; cells += `<i class="${l} ${k === tk ? 'td' : ''}" title="${fmtShort(d)} · ${sc}%"></i>`; } });
  const logged = Object.keys(S.days).filter((k) => k >= dk(weeks[0]) && k <= tk && dayScore(pd(k)) >= 10).length;
  return `<div class="card"><div class="card-h"><div class="card-t">Consistency · 12 weeks</div><div class="card-r"><b>${logged}</b> days worked</div></div><div class="heatwrap"><div class="dl"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span></div><div class="heat">${cells}</div></div>
    <div class="legend"><span>day score:</span><span><i style="background:var(--bg3)"></i>0</span><span><i style="background:#7a4d12"></i>35%</span><span><i style="background:#c97a16"></i>60%</span><span><i style="background:var(--co2)"></i>85%+</span></div></div>`;
}
function statsStandards() {
  const days = rangeDays(14), short = (t) => t.replace(/\s*\(.*?\)\s*/g, '').replace(/ Protocol| Check/g, '');
  const rows = S.habits.items.map((h) => { const on = days.map((d) => { const o = S.days[dk(d)]; return !!(o && o.habits && o.habits[h.id]); }); return `<span class="nm">${esc(short(h.title))}</span>${on.map((x) => `<i class="${x ? 'on' : ''}"></i>`).join('')}<span class="pc">${Math.round((on.filter(Boolean).length / days.length) * 100)}%</span>`; }).join('');
  return `<div class="card"><div class="card-h"><div class="card-t">Standards · 14 days</div><div class="card-r">% of days kept</div></div><div class="mx" style="grid-template-columns:minmax(84px,auto) repeat(14,1fr) auto">${rows}</div></div>`;
}
function statsWeight() {
  const all = weightEntries(), n = Math.max(statsRange, 28), from = dk(addDays(new Date(), -n + 1)), pts = all.filter((x) => x.k >= from), tg = S.settings.weightTarget;
  if (pts.length < 2) return `<div class="card w3"><div class="card-h"><div class="card-t">Weight</div><div class="card-r">goal ${tg} kg</div></div><div class="empty" style="padding:30px 0">${pts.length ? 'One weigh-in so far. The line starts with the second.' : 'No weigh-ins in this window. Morning: toilet, scale, type it in.'}</div></div>`;
  const t0 = pd(pts[0].k).getTime(), t1 = pd(pts[pts.length - 1].k).getTime(), X = (k) => (pd(k).getTime() - t0) / Math.max(1, t1 - t0);
  const avg = pts.map((p) => { const lo = dk(addDays(pd(p.k), -6)); const w = all.filter((x) => x.k >= lo && x.k <= p.k); return { x: X(p.k), v: w.reduce((a, b) => a + b.w, 0) / w.length }; });
  const a7 = avgWeight(7), wks = Math.max(1, daysUntil(S.settings.weightTargetDate) / 7), pace = a7 ? (tg - a7) / wks : null, first = pts[0].w, last = pts[pts.length - 1].w;
  return `<div class="card w3"><div class="card-h"><div class="card-t">Weight</div><div class="card-r">goal ${tg} kg</div></div>
    <div class="statline"><div><div class="sub-n">${a7 ? fmt(a7, 1) : fmt(last, 1)}<small>kg</small></div><div class="l">7-day average</div></div><div><div class="sub-n ${last - first >= 0 ? 'ok' : 'bad'}">${last - first >= 0 ? '+' : ''}${fmt(last - first, 1)}</div><div class="l">in this window</div></div><div><div class="sub-n">${pace != null ? (pace >= 0 ? '+' : '') + fmt(pace, 2) : '—'}</div><div class="l">kg / week needed</div></div></div>
    ${lineChart({ raw: pts.map((p) => ({ x: X(p.k), v: p.w })), avg, target: tg, showTarget: Math.abs(tg - last) < 4, xl: [[0, fmtShort(pd(pts[0].k)), 'start'], [1, fmtShort(pd(pts[pts.length - 1].k)), 'end']] })}
    <div class="legend"><span><i class="ln" style="background:var(--body)"></i>7-day average</span><span><i class="ln" style="background:var(--dim)"></i>daily</span></div></div>`;
}
function statsStudy() {
  const bc = counterDef('bac'), dp = counterDef('deep'), wT = (bc ? bc.weekly : 0) || 0;
  const items = weeksBack(8).map((m, i, a) => { const v = wkSum(m, (d) => cOf(d, 'bac')); return { l: wkLabel(m), v, t: wT, cls: 'mind', top: v ? (v >= 60 ? (v / 60).toFixed(1) + 'h' : v + 'm') : '', today: i === a.length - 1 }; });
  const wk = counterWeek('bac', new Date()), dwk = counterWeek('deep', new Date());
  return `<div class="card w3"><div class="card-h"><div class="card-t">Study · BAC by week</div><div class="card-r">8 weeks</div></div>
    <div class="statline"><div><div class="sub-n">${wk}<small>/ ${wT} min</small></div><div class="l">BAC this week</div></div><div><div class="sub-n">${dwk}<small>/ ${dp ? dp.weekly : 0} min</small></div><div class="l">deep work this week</div></div><div><div class="sub-n">${daysUntil(S.settings.bacDate)}</div><div class="l">days to first exam</div></div></div>
    ${vbars(items, { h: 160 })}</div>`;
}
function statsTrain() {
  const items = weeksBack(8).map((m, i, a) => { const v = wkSum(m, (d) => (S.days[dk(d)] && dayTrained(S.days[dk(d)]) ? 1 : 0)); return { l: wkLabel(m), v, t: 6, cls: 'body', top: v, today: i === a.length - 1 }; });
  let sess = 0, mins = 0; rangeDays(statsRange).forEach((d) => sessionsRO(S.days[dk(d)]).filter((s) => s.done).forEach((s) => { sess++; try { mins += sessionMinutes(s) || 0; } catch (e) { } }));
  return `<div class="card"><div class="card-h"><div class="card-t">Training · days per week</div><div class="card-r">goal 6</div></div>
    <div class="statline"><div><div class="sub-n">${workoutsWeek(new Date())}<small>/ 6</small></div><div class="l">this week</div></div><div><div class="sub-n">${sess}</div><div class="l">sessions · ${statsRange} d</div></div>${mins ? `<div><div class="sub-n">${Math.round(mins / 60)}<small>h</small></div><div class="l">logged time</div></div>` : ''}</div>
    ${vbars(items, { h: 110, max: 7 })}</div>`;
}
function statsFood() {
  const tt = foodTargets(), n = Math.min(statsRange, 28), ds = rangeDays(n); let days = 0, kc = 0, pr = 0, hitP = 0;
  const items = ds.map((d) => { const t = foodTotals(d); if (t.n) { days++; kc += t.kcal; pr += t.p; if (t.p >= tt.p) hitP++; } return { l: dow(d) === 1 ? d.getDate() + '.' + pad(d.getMonth() + 1) : '', v: t.kcal, t: tt.kcal, cls: t.kcal >= tt.kcal * 0.9 ? 'hit' : '', today: dk(d) === dk(new Date()) }; });
  return `<div class="card w2"><div class="card-h"><div class="card-t">Food · calories by day</div><div class="card-r">${n} days</div></div>
    <div class="statline"><div><div class="sub-n">${days ? fmt(kc / days) : '—'}<small>kcal</small></div><div class="l">avg on logged days</div></div><div><div class="sub-n">${days ? Math.round(pr / days) : '—'}<small>g</small></div><div class="l">avg protein</div></div><div><div class="sub-n">${hitP}<small>/ ${days}</small></div><div class="l">protein days hit</div></div></div>
    ${vbars(items, { h: 170, max: tt.kcal * 1.1 })}<div class="legend"><span><i class="ln" style="background:var(--text);opacity:.5"></i>${fmt(tt.kcal)} kcal target</span><span><i style="background:var(--body)"></i>within 10%</span></div></div>`;
}
function statsMoney() {
  const cur = S.settings.currency; let inc = 0, sp = 0, tennis = 0, agency = 0; const cats = {};
  rangeDays(statsRange).forEach((d) => { const o = S.days[dk(d)]; if (!o) return; inc += Number(o.income) || 0; sp += Number(o.spent) || 0; const m = o.money || {}; tennis += Number(m.tennis) || 0; agency += Number(m.agency) || 0; MONEY_OUT.forEach(([id, l]) => { if (Number(m[id])) cats[l] = (cats[l] || 0) + Number(m[id]); }); });
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const items = weeksBack(8).map((m, i, a) => ({ l: wkLabel(m), v: wkSum(m, (d) => Number((S.days[dk(d)] || {}).income) || 0), cls: 'body', today: i === a.length - 1 }));
  return `<div class="card"><div class="card-h"><div class="card-t">Money · ${cur}</div><div class="card-r">${statsRange} days</div></div>
    <div class="statline"><div><div class="sub-n ok">${fmt(inc)}</div><div class="l">made</div></div><div><div class="sub-n bad">${fmt(sp)}</div><div class="l">spent</div></div><div><div class="sub-n">${inc - sp >= 0 ? '+' : ''}${fmt(inc - sp)}</div><div class="l">net</div></div></div>
    ${vbars(items, { h: 80 })}<div style="margin-top:10px"><div class="moneyrow"><span class="muted">Tennis</span><b>${fmt(tennis)}</b></div><div class="moneyrow"><span class="muted">Agency</span><b>${fmt(agency)}</b></div>${top.map(([l, v]) => `<div class="moneyrow"><span class="muted">Spent · ${l}</span><b>${fmt(v)}</b></div>`).join('')}</div></div>`;
}
function renderStats() {
  const seg = `<div class="row sb" style="margin-bottom:14px"><div class="seg">${[[14, '2 wk'], [28, '4 wk'], [84, '12 wk']].map(([v, l]) => `<button class="${statsRange === v ? 'on' : ''}" onclick="statsRange=${v};render()">${l}</button>`).join('')}</div><button class="btn sm" onclick="openRank()">${ic('medal', 16)} Rank &amp; medals</button></div>`;
  $('view-stats').innerHTML = seg + statsKpis() + `<div class="sgrid">${statsIntel()}${statsDials()}${statsFunnel()}${statsCalls()}${statsRecords()}${statsXp()}${statsHeat()}${statsStandards()}${statsTrain()}${statsWeight()}${statsStudy()}${statsFood()}${statsMoney()}</div>`;
}
