/* War Room v5 · Drill-down: every number opens the story behind it.
   dayDetail(k)      everything about one day (and arrows to walk through days)
   weekDetail(mk)    one week, day by day
   metricDetail(id)  one metric over time: chart, averages, best, streak, by weekday, insights, every day tappable
   pipeDetail(stage) the agencies behind a pipeline number · mrrDetail() the money behind MRR */
'use strict';

const MET = {
  dials: { t: 'Dials', u: '', v: (k) => cOf(pd(k), 'dials'), tg: (k) => dialTargetFor(pd(k)) || null, sum: true, cls: 'co', go: "startSession()", act: 'Start dialing' },
  owners: { t: 'Owner conversations', u: '', v: (k) => cOf(pd(k), 'owners'), sum: true, cls: 'co' },
  bac: { t: 'BAC study', u: ' min', v: (k) => cOf(pd(k), 'bac'), tg: (k) => { const c = counterDef('bac'); return c ? c.targets[dow(pd(k))] || null : null; }, sum: true, cls: 'mind' },
  deep: { t: 'Deep work', u: ' min', v: (k) => cOf(pd(k), 'deep'), tg: (k) => { const c = counterDef('deep'); return c ? c.targets[dow(pd(k))] || null : null; }, sum: true, cls: 'mind' },
  weight: { t: 'Weight', u: ' kg', v: (k) => { const o = S.days[k]; return o && o.weight != null && o.weight !== '' ? Number(o.weight) : null; }, dec: 1, line: true, cls: 'body', go: 'weightModal()', act: 'Log today’s weight' },
  sleep: { t: 'Sleep', u: ' h', v: (k) => { const o = S.days[k]; if (!o || !o.bedAt || !o.wokeAt) return null; let m = tmin(o.wokeAt) - tmin(o.bedAt); if (m < 0) m += 1440; return Math.round((m / 60) * 10) / 10; }, tg: () => 8, dec: 1, cls: 'mind' },
  train: { t: 'Training', u: '', v: (k) => (S.days[k] && dayTrained(S.days[k]) ? 1 : 0), bin: true, sum: true, cls: 'body', go: "show('train')", act: 'Open Train' },
  kcal: { t: 'Calories', u: ' kcal', v: (k) => { const t = foodTotals(k); return t.n ? Math.round(t.kcal) : null; }, tg: () => foodTargets().kcal, cls: 'body', go: "show('food')", act: 'Open Food' },
  protein: { t: 'Protein', u: ' g', v: (k) => { const t = foodTotals(k); return t.n ? Math.round(t.p) : null; }, tg: () => foodTargets().p, cls: 'body', go: "show('food')", act: 'Open Food' },
  income: { t: 'Money made', u: '', v: (k) => Number((S.days[k] || {}).income) || 0, sum: true, cls: 'body', cur: true },
  spent: { t: 'Money spent', u: '', v: (k) => Number((S.days[k] || {}).spent) || 0, sum: true, cls: 'bad', cur: true, low: true },
  xp: { t: 'XP', u: '', v: (k) => dayXp(k), sum: true, cls: 'co', go: 'openRank()', act: 'Rank & rules' },
  score: { t: 'Day score', u: '%', v: (k) => (S.days[k] ? dayScore(pd(k)) : null), cls: 'mind', go: 'gradeInfo()', act: 'How the score works' },
};
function metDef(id) { if (id.startsWith('std:')) { const h = S.habits.items.find((x) => x.id === id.slice(4)); return { t: h ? h.title : 'Standard', u: '', v: (k) => (S.days[k] && S.days[k].habits && S.days[k].habits[id.slice(4)] ? 1 : 0), bin: true, sum: true, cls: 'body' }; } return MET[id]; }
function mfmt(m, v) { if (v == null) return '—'; if (m.bin) return v ? '✓' : '·'; return (m.cur ? '' : '') + fmt(v, m.dec || 0) + (m.u || '') + (m.cur ? ' ' + S.settings.currency : ''); }
function dayList(n) { const t = new Date(); t.setHours(0, 0, 0, 0); return Array.from({ length: n }, (_, i) => dk(addDays(t, i - n + 1))); }
function hitDay(m, k, v) { const tg = m.tg ? m.tg(k) : null; if (v == null) return null; if (m.bin) return !!v; if (!tg) return null; return m.low ? v <= tg : v >= tg; }

/* ───────── one metric ───────── */
let metRange = 28;
function metricDetail(id, range) {
  const m = metDef(id); if (!m) return; if (range) metRange = range; const n = metRange, ks = dayList(n), tk = dk(new Date());
  const vals = ks.map((k) => ({ k, v: m.v(k), tg: m.tg ? m.tg(k) : null }));
  const have = vals.filter((x) => x.v != null && (m.bin || m.sum ? true : x.v !== 0)), logged = have.filter((x) => m.sum ? x.v : true);
  const avg = (arr) => (arr.length ? arr.reduce((a, x) => a + x.v, 0) / arr.length : null);
  const last7 = have.filter((x) => x.k > dk(addDays(new Date(), -7))), prev7 = have.filter((x) => x.k <= dk(addDays(new Date(), -7)) && x.k > dk(addDays(new Date(), -14)));
  const a7 = m.sum ? last7.reduce((a, x) => a + x.v, 0) : avg(last7), p7 = m.sum ? prev7.reduce((a, x) => a + x.v, 0) : avg(prev7);
  const best = logged.length ? logged.reduce((a, x) => (m.low ? (x.v < a.v ? x : a) : (x.v > a.v ? x : a))) : null;
  const tgDays = vals.filter((x) => x.k <= tk && (m.bin || x.tg)), hits = tgDays.filter((x) => hitDay(m, x.k, x.v)).length;
  let st = 0; for (let i = vals.length - 1; i >= 0; i--) { const x = vals[i]; if (x.k === tk && !hitDay(m, x.k, x.v)) continue; if (hitDay(m, x.k, x.v) || (!m.bin && !x.tg && x.v)) st++; else break; }
  const today = m.v(tk);
  // by weekday
  const wd = {}; Object.keys(S.days).filter((k) => k <= tk && k > dk(addDays(new Date(), -84))).forEach((k) => { const v = m.v(k); if (v == null || (!m.sum && !m.bin && v === 0)) return; const w = dow(pd(k)); (wd[w] = wd[w] || []).push(v); });
  const wdAvg = ALL.map((w) => ({ w, v: wd[w] ? wd[w].reduce((a, b) => a + b, 0) / wd[w].length : 0, n: wd[w] ? wd[w].length : 0 }));
  const bestWd = wdAvg.filter((x) => x.n >= 2).sort((a, b) => (m.low ? a.v - b.v : b.v - a.v))[0];
  // chart
  const chart = m.line ? metLine(vals) : vbars(vals.map((x) => ({ l: dow(pd(x.k)) === 1 ? pd(x.k).getDate() + '.' + pad(pd(x.k).getMonth() + 1) : '', v: m.bin ? (x.v ? 1 : 0) : (x.v || 0), t: x.tg || 0, cls: hitDay(m, x.k, x.v) ? 'hit' : (x.k < tk && x.tg ? 'miss' : ''), today: x.k === tk, tip: fmtShort(pd(x.k)) + ': ' + mfmt(m, x.v), go: `dayDetail('${x.k}')` })), { h: 150, every: n > 30 ? 2 : 1 });
  const ins = metInsights(id, m, vals, wdAvg);
  openModal(`<div class="dd-h"><h2>${esc(m.t)}</h2><div class="seg sm">${[[14, '2 wk'], [28, '4 wk'], [84, '12 wk']].map(([v, l]) => `<button class="${n === v ? 'on' : ''}" onclick="metricDetail('${id}',${v})">${l}</button>`).join('')}</div></div>
    <div class="dd-kpis">${[['Today', mfmt(m, today)], [m.sum ? 'Last 7 days' : '7-day avg', a7 == null ? '—' : mfmt(m, m.bin ? a7 : a7) + (p7 != null && p7 !== 0 && !m.bin ? ` <span class="${(a7 >= p7) !== !!m.low ? 'ok' : 'bad'}">${a7 >= p7 ? '▲' : '▼'}${Math.abs(Math.round(((a7 - p7) / Math.abs(p7)) * 100))}%</span>` : '')], [m.sum ? `Total · ${n} d` : `Avg · ${n} d`, m.sum ? mfmt(m, vals.reduce((a, x) => a + (x.v || 0), 0)) : mfmt(m, avg(have))], [m.bin || tgDays.length ? 'Days on target' : 'Best day', m.bin || tgDays.length ? `${hits}<small>/${tgDays.length}</small>` : (best ? mfmt(m, best.v) : '—')], ['Streak', st + ' d']].map(([l, v]) => `<div><div class="n">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="dd-chart">${chart}</div><div class="xs muted" style="margin:-4px 0 12px">Tap a ${m.line ? 'point' : 'bar'} to open that day.</div>
    ${ins.length ? `<div class="dd-ins">${ins.map((x) => `<div>${x}</div>`).join('')}</div>` : ''}
    ${bestWd ? `<div class="sec-h">By day of the week · ${m.sum || m.bin ? 'average' : 'average'}</div>${vbars(wdAvg.map((x) => ({ l: DAY_SHORT[x.w], v: m.bin ? Math.round(x.v * 100) : Math.round(x.v * (m.dec ? 10 : 1)) / (m.dec ? 10 : 1), top: x.n ? (m.bin ? Math.round(x.v * 100) + '%' : fmt(x.v, m.dec || 0)) : '', cls: x.w === bestWd.w ? 'hit' : '' })), { h: 90 })}` : ''}
    <div class="sec-h" style="margin-top:12px">Day by day</div><div class="dd-list">${vals.slice().reverse().filter((x) => x.k <= tk).slice(0, 21).map((x) => `<div class="dd-row" onclick="dayDetail('${x.k}')"><span>${DAY_SHORT[dow(pd(x.k))]} ${fmtShort(pd(x.k))}</span><span class="${hitDay(m, x.k, x.v) === true ? 'ok' : hitDay(m, x.k, x.v) === false && x.k < tk ? 'bad' : ''}">${mfmt(m, x.v)}${x.tg && !m.bin ? ` <small class="muted">/ ${fmt(x.tg)}</small>` : ''}</span><span class="arr">›</span></div>`).join('')}</div>
    ${m.go ? `<button class="btn primary block" style="margin-top:12px" onclick="closeModal();${m.go}">${m.act}</button>` : ''}`, true);
}
function metLine(vals) {
  const pts = vals.filter((x) => x.v != null); if (pts.length < 2) return '<div class="empty" style="padding:20px 0">Not enough entries in this window yet.</div>';
  const t0 = pd(pts[0].k).getTime(), t1 = pd(pts[pts.length - 1].k).getTime(), X = (k) => (pd(k).getTime() - t0) / Math.max(1, t1 - t0);
  const all = weightEntries(), avg = pts.map((p) => { const lo = dk(addDays(pd(p.k), -6)); const w = all.filter((x) => x.k >= lo && x.k <= p.k); return { x: X(p.k), v: w.reduce((a, b) => a + b.w, 0) / w.length }; });
  const svg = lineChart({ raw: pts.map((p) => ({ x: X(p.k), v: p.v })), avg, target: S.settings.weightTarget, showTarget: false, xl: [[0, fmtShort(pd(pts[0].k)), 'start'], [1, fmtShort(pd(pts[pts.length - 1].k)), 'end']] });
  return `<div style="position:relative">${svg}<div class="dd-hits">${pts.map((p) => `<span style="left:${(3 + X(p.k) * 94).toFixed(1)}%" onclick="dayDetail('${p.k}')" title="${fmtShort(pd(p.k))}: ${fmt(p.v, 1)}"></span>`).join('')}</div></div>`;
}
/* honest insights: only when there are enough days to say something */
function metInsights(id, m, vals, wdAvg) {
  const out = [], tk = dk(new Date()), days = Object.keys(S.days).filter((k) => k < tk).sort().slice(-84);
  const best = wdAvg.filter((x) => x.n >= 2).sort((a, b) => b.v - a.v), worst = best.slice().reverse();
  if (best.length >= 3 && !m.bin && best[0].v > 0) out.push(`Best day of the week: <b>${DAY_LONG[best[0].w]}</b> (avg ${fmt(best[0].v, m.dec || 0)}${m.u || ''}). Weakest: <b>${DAY_LONG[worst[0].w]}</b> (${fmt(worst[0].v, m.dec || 0)}${m.u || ''}).`);
  if (best.length >= 3 && m.bin) out.push(`Most often on <b>${DAY_LONG[best[0].w]}</b> (${Math.round(best[0].v * 100)}% of them). Least on <b>${DAY_LONG[worst[0].w]}</b> (${Math.round(worst[0].v * 100)}%).`);
  const split = (cond, metric) => { const a = [], b = []; days.forEach((k) => { const c = cond(k); if (c == null) return; const v = metric(k); if (v == null) return; (c ? a : b).push(v); }); return a.length >= 4 && b.length >= 4 ? [a.reduce((x, y) => x + y, 0) / a.length, b.reduce((x, y) => x + y, 0) / b.length, a.length, b.length] : null; };
  if (['dials', 'owners', 'score', 'xp', 'bac'].includes(id)) { const r = split((k) => MET.sleep.v(k) == null ? null : MET.sleep.v(k) >= 7.5, m.v); if (r) out.push(`After a 7.5 h+ night you average <b>${fmt(r[0])}${m.u || ''}</b>, after a shorter one <b>${fmt(r[1])}${m.u || ''}</b> (${r[2]} vs ${r[3]} days).`); }
  if (['dials', 'score', 'xp'].includes(id)) { const r = split((k) => { const o = S.days[k]; return o ? routineFor(S.routines.morning, pd(k)).every((x) => rState(o, x.id) === 'done') : null; }, m.v); if (r) out.push(`On days the full morning routine is done: <b>${fmt(r[0])}${m.u || ''}</b> vs <b>${fmt(r[1])}${m.u || ''}</b> on the others.`); }
  if (id === 'dials') { const tot = counterTotal('dials'), ow = counterTotal('owners'); if (tot >= 30) out.push(`All time: ${fmt(tot)} dials → ${ow} owner conversations: <b>1 owner every ${Math.round(tot / Math.max(1, ow))} dials</b>. 100 owner conversations needs about ${fmt(Math.max(0, 100 - ow) * Math.round(tot / Math.max(1, ow)))} more dials.`); }
  if (id === 'weight') { const a7 = avgWeight(7), a28 = avgWeight(28), wk = Math.max(1, daysUntil(S.settings.weightTargetDate) / 7); if (a7 && a28) { const rate = (a7 - avgWeight(7, dk(addDays(new Date(), -21)))) / 3; out.push(`Gaining <b>${rate >= 0 ? '+' : ''}${fmt(rate, 2)} kg a week</b> (last 3 weeks). Needed for ${S.settings.weightTarget} kg by the deadline: <b>+${fmt((S.settings.weightTarget - a7) / wk, 2)} kg a week</b>.`); } }
  if (id === 'protein' || id === 'kcal') { const r = split((k) => (S.days[k] && dayTrained(S.days[k]) ? true : S.days[k] ? false : null), m.v); if (r) out.push(`Training days: <b>${fmt(r[0])}${m.u}</b> · rest days: <b>${fmt(r[1])}${m.u}</b>.`); }
  return out;
}

/* ───────── one day ───────── */
function dayDetail(k) {
  const d = pd(k), o = S.days[k], tk = dk(new Date()), prev = dk(addDays(d, -1)), next = dk(addDays(d, 1));
  const nav = `<div class="dd-h"><button class="btn sm" onclick="dayDetail('${prev}')">‹</button><h2 style="flex:1;text-align:center;margin:0">${DAY_LONG[dow(d)]} ${fmtShort(d)}</h2>${next <= tk ? `<button class="btn sm" onclick="dayDetail('${next}')">›</button>` : '<span style="width:38px"></span>'}</div>`;
  if (!o) { openModal(nav + `<div class="empty" style="padding:30px 0">Nothing was logged on this day.</div>${k <= tk ? `<button class="btn primary block" onclick="closeModal();curDate=pd('${k}');show('now')">Log it now</button>` : ''}`, true); return; }
  const c = o.counters || {}, p = dayXpParts(k), g = gradeFor(d), sc = dayScore(d), tg = dialTargetFor(d), mm = minimumMet(d), ft = foodTotals(k), tt = foodTargets();
  const calls = []; try { qItems().forEach((x) => (x.log || []).forEach((e) => { if (e.at && dk(new Date(e.at)) === k) calls.push({ x, e }); })); } catch (e) { }
  calls.sort((a, b) => String(a.e.at).localeCompare(String(b.e.at)));
  const sess = sessionsRO(o), meals = (o.meals || []).slice().sort((a, b) => String(a.t).localeCompare(String(b.t))), money = o.money || {};
  const rt = (key) => routineFor(S.routines[key], d).map((r) => { const s = rState(o, r.id); return `<span class="dd-chip ${s === 'done' ? 'on' : s === 'skip' ? 'skip' : ''}">${s === 'done' ? '✓' : s === 'skip' ? '–' : '·'} ${esc(r.title.replace(/^[^\w]+/, ''))}</span>`; }).join('');
  const S_ = (t, body, go) => `<div class="dd-sec" ${go ? `onclick="${go}"` : ''}><div class="dd-st">${t}${go ? '<span class="arr">›</span>' : ''}</div>${body}</div>`;
  openModal(nav + `
    <div class="dd-kpis"><div onclick="gradeInfo()"><div class="n" style="color:${g === 'A' ? 'var(--body)' : g === 'B' ? 'var(--co2)' : g === 'C' ? 'var(--acc)' : 'var(--bad)'}">${g}</div><div class="l">grade · ${sc}%</div></div><div onclick="metricDetail('dials')"><div class="n">${c.dials || 0}<small>/${tg || 0}</small></div><div class="l">dials</div></div><div onclick="metricDetail('xp')"><div class="n">+${fmt(p.total)}</div><div class="l">XP</div></div><div><div class="n ${mm.met ? 'ok' : 'bad'}">${mm.met ? '✓' : '✗'}</div><div class="l">minimum</div></div></div>
    ${S_('📞 Company', `<div class="kv"><span>Dials · owner conversations</span><span>${c.dials || 0} · ${c.owners || 0}</span></div>${(o.sessions || []).map((s) => `<div class="kv"><span>Dial session ${new Date(s.start).toTimeString().slice(0, 5)}–${new Date(s.end).toTimeString().slice(0, 5)}</span><span>${s.dials} dials · ${s.owners} owners</span></div>`).join('')}${calls.length ? `<div class="dd-calls">${calls.slice(0, 40).map(({ x, e }) => `<div class="dd-call" onclick="event.stopPropagation();editQueueItem('${x.id}')"><span class="t">${new Date(e.at).toTimeString().slice(0, 5)}</span><span class="a">${esc(x.agency)}</span><span class="r ${/owner|booked/i.test(e.r) ? 'ok' : ''}">${esc(e.r)}</span></div>`).join('')}${calls.length > 40 ? `<div class="xs muted">+${calls.length - 40} more</div>` : ''}</div>` : ''}${c.applicants ? `<div class="kv"><span>Applicants called</span><span>${c.applicants}</span></div>` : ''}`, "metricDetail('dials')")}
    ${S_('📚 Study', `<div class="kv"><span>BAC</span><span>${c.bac || 0} min</span></div><div class="kv"><span>Deep work</span><span>${c.deep || 0} min</span></div>`, "metricDetail('bac')")}
    ${S_('🏋️ Body', `${o.weight != null && o.weight !== '' ? `<div class="kv"><span>Weight</span><span>${fmt(o.weight, 1)} kg</span></div>` : ''}${sess.length ? sess.map((s) => `<div class="kv"><span>${s.done ? '✓' : s.skipped ? '✗' : '·'} ${esc(sessionLabel(s))}</span><span class="small muted">${s.skipped ? esc(s.skipped) : (sessionMinutes(s) ? sessionMinutes(s) + ' min' : '') + (sessionSets(s) ? ' · ' + sessionSets(s) + ' sets' : '')}</span></div>`).join('') : '<div class="small muted">No training logged.</div>'}${MET.sleep.v(k) != null ? `<div class="kv"><span>Sleep</span><span>${o.bedAt}–${o.wokeAt} · ${sleepDur(o.bedAt, o.wokeAt)}</span></div>` : ''}`, "metricDetail('train')")}
    ${S_('🍽 Food', `${meals.length ? meals.map((x) => `<div class="kv"><span>${esc(x.t || '')} ${esc(x.name)}</span><span>${fmt(x.kcal)} kcal · ${fmt(x.p)} g</span></div>`).join('') + `<div class="kv"><b>Total</b><b>${fmt(ft.kcal)} / ${fmt(tt.kcal)} kcal · ${fmt(ft.p)} / ${tt.p} g</b></div>` : '<div class="small muted">No meals logged.</div>'}`, "metricDetail('protein')")}
    ${S_('✅ Routines & standards', `<div class="dd-chips">${rt('morning')}</div><div class="dd-chips">${rt('evening')}</div><div class="dd-chips">${S.habits.items.map((h) => `<span class="dd-chip ${o.habits && o.habits[h.id] ? 'on' : ''}" onclick="event.stopPropagation();metricDetail('std:${h.id}')">${o.habits && o.habits[h.id] ? '✓' : '·'} ${esc(h.title.replace(/^[^\w]+/, '').replace(/\s*\(.*\)/, ''))}</span>`).join('')}</div>`)}
    ${Number(o.income) || Number(o.spent) ? S_('💰 Money', `<div class="kv"><span>Made</span><span class="ok">${fmt(o.income || 0)} ${S.settings.currency}</span></div>${MONEY_OUT.filter(([id]) => Number(money[id])).map(([id, l]) => `<div class="kv"><span>Spent · ${l}</span><span>${fmt(money[id])}</span></div>`).join('')}`, "metricDetail('income')") : ''}
    ${o.win || o.loss || o.fix ? S_('📝 Debrief', `${o.win ? `<div class="small"><b>Win:</b> ${esc(o.win)}</div>` : ''}${o.loss ? `<div class="small"><b>Miss:</b> ${esc(o.loss)}</div>` : ''}${o.fix ? `<div class="small"><b>Fix:</b> ${esc(o.fix)}</div>` : ''}`) : ''}
    ${o.screen ? S_('📱 Screen', `<div class="kv"><span>Total · unlocks</span><span>${hm(o.screen.t)} · ${o.screen.u}</span></div><div class="kv"><span>Distracting</span><span>${hm((o.screen.c || {}).distract || 0)}</span></div>`) : ''}
    ${S_('⭐ XP breakdown', Object.entries({ dials: 'Dials', owners: 'Owner talks', study: 'Study', workout: 'Workout', weigh: 'Weigh-in', standards: 'Standards', meals: 'Meals', minimum: 'Minimum', orders: 'Orders' }).filter(([x]) => p[x]).map(([x, l]) => `<div class="kv"><span>${l}</span><span>+${fmt(p[x])}</span></div>`).join('') || '<div class="small muted">No XP.</div>', 'openRank()')}
    <button class="btn primary block" style="margin-top:12px" onclick="closeModal();curDate=pd('${k}');show('now')">Open this day on HQ to edit</button>`, true);
}

/* ───────── one week ───────── */
function weekDetail(mk) {
  const m = pd(mk), tk = dk(new Date()), ds = ALL.map((i) => addDays(m, i - 1));
  const rows = ds.map((d) => { const k = dk(d), o = S.days[k] || null, c = (o && o.counters) || {}, ft = foodTotals(k); if (k > tk) return `<div class="dd-row muted"><span>${DAY_SHORT[dow(d)]} ${fmtShort(d)}</span><span>${dialTargetFor(d) ? dialTargetFor(d) + ' dials planned' : ''}</span><span></span></div>`;
    return `<div class="dd-row wk" onclick="dayDetail('${k}')"><span>${DAY_SHORT[dow(d)]} ${fmtShort(d)}</span><span class="wkv"><b class="${dialTargetFor(d) ? ((c.dials || 0) >= dialTargetFor(d) ? 'ok' : 'bad') : ''}">${c.dials || 0}${dialTargetFor(d) ? '/' + dialTargetFor(d) : ''}📞</b> ${c.bac ? c.bac + 'm📚 ' : ''}${o && dayTrained(o) ? '🏋️ ' : ''}${o && o.weight ? fmt(o.weight, 1) + 'kg ' : ''}${ft.n ? fmt(ft.p) + 'g P ' : ''}<span class="muted">${o ? gradeFor(d) + ' · +' + fmt(dayXp(k)) + 'XP' : '—'}</span></span><span class="arr">›</span></div>`; }).join('');
  openModal(`<div class="dd-h"><button class="btn sm" onclick="weekDetail('${dk(addDays(m, -7))}')">‹</button><h2 style="flex:1;text-align:center;margin:0">Week of ${fmtShort(m)}</h2>${dk(addDays(m, 7)) <= tk ? `<button class="btn sm" onclick="weekDetail('${dk(addDays(m, 7))}')">›</button>` : '<span style="width:38px"></span>'}</div>
    <div class="dd-list" style="margin-bottom:12px">${rows}</div>${weekReportCard(m)}`, true);
}

/* ───────── pipeline & money ───────── */
const PIPE = { list: ['On the list', () => true], dialed: ['Dialed', (x) => (x.log && x.log.length) || x.attempts], reached: ['Owner reached', (x) => ['owner', 'booked', 'bulletin', 'trial', 'member'].includes(x.status) || (x.log || []).some((e) => e.d && e.d.owners)], booked: ['Meeting booked', (x) => ['booked', 'trial', 'member'].includes(x.status)], trial: ['Trial', (x) => ['trial', 'member'].includes(x.status)], member: ['Paying', (x) => x.status === 'member'], callback: ['Callbacks open', (x) => x.status === 'callback'], never: ['Never called', (x) => !((x.log && x.log.length) || x.attempts)] };
function pipeDetail(stage) {
  const [t, f] = PIPE[stage] || PIPE.list; let q = []; try { q = qItems().filter(f); } catch (e) { }
  const last = (x) => (x.log || []).slice(-1)[0];
  q.sort((a, b) => String((last(b) || {}).at || '').localeCompare(String((last(a) || {}).at || '')));
  openModal(`<h2>${t} · ${q.length}</h2><div class="dd-chips" style="margin-bottom:10px">${Object.entries(PIPE).map(([k, [l]]) => `<span class="dd-chip ${k === stage ? 'on' : ''}" onclick="pipeDetail('${k}')">${l}</span>`).join('')}</div>
    <div class="dd-list">${q.slice(0, 80).map((x) => { const e = last(x); return `<div class="dd-row" onclick="editQueueItem('${x.id}')"><span><b>${esc(x.agency)}</b><small class="muted" style="display:block">${esc((x.city || '').split(/[\/(;]/)[0])} · ${esc(x.status)}${x.attempts ? ' · ' + x.attempts + ' tries' : ''}</small></span><span class="small">${e ? esc(e.r) + '<small class="muted" style="display:block">' + fmtShort(new Date(e.at)) + '</small>' : '<span class="muted">not called</span>'}${x.next_at ? `<small class="acc" style="display:block">next ${esc(x.next_at)}</small>` : ''}</span><span class="arr">›</span></div>`; }).join('') || '<div class="empty">None here yet.</div>'}${q.length > 80 ? `<div class="xs muted">${q.length - 80} more</div>` : ''}</div>`, true);
}
function mrrDetail() {
  let mem = [], tr = [], m = 0; try { mem = members(); tr = trials(); m = mrr(); } catch (e) { }
  const need = Math.max(0, 20000 - m);
  openModal(`<h2>MRR · $${fmt(m)} of $20,000</h2><div class="xpbar" style="margin:6px 0 14px"><i style="width:${clamp((m / 20000) * 100, 0, 100)}%"></i></div>
    <div class="dd-ins"><div>To $20k: <b>$${fmt(need)}</b> more = about <b>${Math.ceil(need / 1500)} Priority Bench</b> clients, or ${Math.ceil(need / 3000)} Multi-site. ${daysUntil('2027-07-01')} days left.</div><div>The road: dials → owner conversations → 30-Day Trials → paying. ${(() => { const d = counterTotal('dials'), o = counterTotal('owners'); return d >= 30 && o ? `Right now 1 owner every ${Math.round(d / o)} dials.` : 'Log dials and owner talks to see your conversion.'; })()}</div></div>
    <div class="sec-h">Paying · ${mem.length}</div><div class="dd-list">${mem.map((x) => `<div class="dd-row" onclick="editQueueItem('${x.id}')"><span>${esc(x.agency)}</span><span>${PLANS[x.plan] ? PLANS[x.plan][0] + ' · $' + fmt(PLANS[x.plan][1]) : esc(x.plan || '')}</span><span class="arr">›</span></div>`).join('') || '<div class="small muted">None yet. The first one changes everything.</div>'}</div>
    <div class="sec-h" style="margin-top:12px">On trial · ${tr.length}</div><div class="dd-list">${tr.map((x) => `<div class="dd-row" onclick="editQueueItem('${x.id}')"><span>${esc(x.agency)}</span><span class="small muted">${x.next_at ? 'next ' + esc(x.next_at) : ''}</span><span class="arr">›</span></div>`).join('') || '<div class="small muted">No trials yet.</div>'}</div>
    <button class="btn block" style="margin-top:12px" onclick="pipeDetail('reached')">Owners reached so far</button>`, true);
}

function callsDetail(kind) {
  const L = []; try { qItems().forEach((x) => (x.log || []).forEach((e) => { if (!kind || callKind(e) === kind) L.push({ x, e }); })); } catch (er) { }
  L.sort((a, b) => String(b.e.at).localeCompare(String(a.e.at)));
  openModal(`<h2>${kind || 'All calls'} · ${L.length}</h2><div class="dd-chips" style="margin-bottom:10px">${['No answer', 'Voicemail', 'Gatekeeper', 'Owner', 'Bad number'].map((k) => `<span class="dd-chip ${k === kind ? 'on' : ''}" onclick="callsDetail('${k}')">${k}</span>`).join('')}</div>
    <div class="dd-list">${L.slice(0, 100).map(({ x, e }) => `<div class="dd-row" onclick="editQueueItem('${x.id}')"><span><b>${esc(x.agency)}</b><small class="muted" style="display:block">${esc(e.r)}${e.note ? ' · ' + esc(String(e.note).slice(0, 60)) : ''}</small></span><span class="small muted">${fmtShort(new Date(e.at))} ${new Date(e.at).toTimeString().slice(0, 5)}</span><span class="arr">›</span></div>`).join('') || '<div class="empty">No calls like this yet.</div>'}</div>`, true);
}
