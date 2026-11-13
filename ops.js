/* War Room v5 · operations layer: daily orders, the weekly operation, the campaign, intel (insights),
   records, promotions, and the field manual. All of it is computed from what is logged. */
'use strict';

/* ───────── daily orders: the five or six jobs of the day ───────── */
const SWEEP_XP = 150;
function ordersFor(d) {
  const k = dk(d), o = S.days[k] || {}, c = o.counters || {}, w = dow(d), L = [];
  const tg = dialTarget(d), dials = Number(c.dials) || 0, deepC = counterDef('deep'), deepT = deepC ? deepC.targets[w] || 50 : 50, deep = Number(c.deep) || 0;
  const bc = counterDef('bac'), bt = (bc ? bc.targets[w] : 0) || S.settings.minBac || 25, bac = Number(c.bac) || 0;
  const ft = foodTotals(k), tt = foodTargets(), trained = dayTrained(o), weighed = o.weight != null && o.weight !== '';
  if (tg) { L.push({ id: 'dials', icon: 'dial', t: `Dial ${tg}`, v: dials, of: tg, xp: 100, go: 'startSession()' }); L.push({ id: 'owner', icon: 'target', t: 'Reach 1 owner', v: Number(c.owners) || 0, of: 1, xp: 60, go: "show('dial')" }); }
  else L.push({ id: 'deep', icon: 'bolt', t: `${deepT} min deep work`, v: deep, of: deepT, u: ' min', xp: 60, go: "startTimer('deep',50)" });
  L.push({ id: 'bac', icon: 'timer', t: `Study ${bt} min`, v: bac, of: bt, u: ' min', xp: 40, go: "startTimer('bac',25)" });
  L.push({ id: 'train', icon: 'train', t: 'Train', v: trained ? 1 : 0, of: 1, xp: 40, go: "show('train')" });
  L.push({ id: 'weigh', icon: 'scale', t: 'Weigh in', v: weighed ? 1 : 0, of: 1, xp: 20, go: 'goToday();weightModal()' });
  L.push({ id: 'fuel', icon: 'food', t: `Eat ${tt.p} g protein`, v: Math.round(ft.p), of: tt.p, u: ' g', xp: 40, go: 'foodSnap()' });
  L.forEach((x) => (x.done = x.v >= x.of));
  return L;
}
function ordersXp(d) { const L = ordersFor(d), done = L.filter((x) => x.done); return done.reduce((a, x) => a + x.xp, 0) + (done.length === L.length ? SWEEP_XP : 0); }
function ordersCard(d) {
  const L = ordersFor(d), done = L.filter((x) => x.done).length, today = isToday(d), sweep = done === L.length, earned = ordersXp(d);
  return `<div class="card orders"><div class="card-h"><div class="card-t">${today ? "Today's orders" : 'Orders · ' + fmtShort(d)}</div><div class="card-r"><b>${done}</b> / ${L.length}${earned ? ` · <span class="ok">+${earned} XP</span>` : ''}</div></div>
    ${L.map((x) => `<div class="ord ${x.done ? 'done' : ''}" ${today ? `onclick="${x.go}"` : ''}><div class="oi">${x.done ? ic('check', 18) : ic(x.icon, 18)}</div><div class="ob"><div class="ot"><span>${x.t}</span>${x.of > 1 ? `<span class="ov">${Math.min(x.v, 99999)} / ${x.of}${x.u || ''}</span>` : ''}</div>${x.of > 1 ? `<div class="bar"><i style="width:${clamp((x.v / x.of) * 100, 0, 100)}%"></i></div>` : ''}</div><div class="ox">+${x.xp}</div></div>`).join('')}
    <div class="sweep ${sweep ? 'on' : ''}">${ic('star', 15)}<span>${sweep ? `Clean sweep. +${SWEEP_XP} XP` : `Clean sweep: all ${L.length} done = +${SWEEP_XP} XP`}</span>${today ? `<a href="#" onclick="event.stopPropagation();openManual();return false">how it works</a>` : ''}</div></div>`;
}

function callbacksCard() { let due = 0; try { const k = dk(new Date()); due = qItems().filter((x) => x.status === 'callback' && x.next_at && x.next_at <= k).length; } catch (e) { } if (!due) return ''; return `<div class="card flat" onclick="show('dial')" style="cursor:pointer;border-color:rgba(255,165,31,.4)"><div class="row sb"><div><div class="lab" style="color:var(--acc)">${due} callback${due === 1 ? '' : 's'} due</div><div class="small muted" style="margin-top:3px">Warm calls first: they told you when to ring back.</div></div><span class="pill warn">open dialer</span></div></div>`; }

/* ───────── week report: the numbers for the Sunday review ───────── */
function weekReportCard(d) {
  const m = monday(d), days = ALL.map((i) => addDays(m, i - 1)), tk = dk(new Date()), dc = counterDef('dials'), bc = counterDef('bac'), sum = (id) => days.reduce((a, x) => a + cOf(x, id), 0);
  const dials = sum('dials'), owners = sum('owners'), bac = sum('bac'), deep = sum('deep'), wkT = dc ? dc.weekly || 150 : 150, bT = bc ? bc.weekly || 0 : 0;
  const logged = days.filter((x) => S.days[dk(x)] && dk(x) <= tk), sc = logged.length ? Math.round(logged.reduce((a, x) => a + dayScore(x), 0) / logged.length) : 0, tr = days.filter((x) => S.days[dk(x)] && dayTrained(S.days[dk(x)])).length;
  const fd = days.map((x) => foodTotals(x)).filter((x) => x.n), kc = fd.length ? fd.reduce((a, x) => a + x.kcal, 0) / fd.length : 0, pr = fd.length ? fd.reduce((a, x) => a + x.p, 0) / fd.length : 0, tt = foodTargets();
  const wE = avgWeight(7, dk(days[6])), wS = avgWeight(7, dk(addDays(m, -1))), xp = days.reduce((a, x) => a + dayXp(dk(x)), 0), inc = days.reduce((a, x) => a + (Number((S.days[dk(x)] || {}).income) || 0), 0), sp = days.reduce((a, x) => a + (Number((S.days[dk(x)] || {}).spent) || 0), 0);
  const R = (v, l, s, cls) => `<div class="rec"><div class="rv ${cls || ''}">${v}</div><div class="rl">${l}</div><div class="rs">${s}</div></div>`, hit = (a, b) => (b && a >= b ? 'ok' : b && a < b * 0.6 ? 'bad' : '');
  const miss = [[dials / wkT, `Dials: ${dials} of ${wkT}`], [bT ? bac / bT : 1, `BAC: ${bac} of ${bT} min`], [tr / 6, `Training: ${tr} of 6 days`], [fd.length ? kc / tt.kcal : 1, `Food: ${fmt(kc)} of ${fmt(tt.kcal)} kcal a day`]].sort((a, b) => a[0] - b[0])[0];
  return `<div class="card"><div class="card-h"><div class="card-t">Week report · ${fmtShort(m)} – ${fmtShort(days[6])}</div><div class="card-r">from what you logged</div></div><div class="recs">
    ${R(dials, 'dials', 'target ' + wkT, hit(dials, wkT))}${R(owners, 'owner conversations', dials ? '1 per ' + Math.round(dials / Math.max(1, owners)) + ' dials' : 'no dials')}${R((bac / 60).toFixed(1) + 'h', 'BAC study', bT ? 'target ' + (bT / 60).toFixed(1) + 'h' : '', hit(bac, bT))}${R(deep + 'm', 'deep work', 'company')}
    ${R(tr, 'training days', 'target 6', hit(tr, 6))}${R(sc + '%', 'average day score', logged.length + ' days logged')}${R(wE && wS ? (wE - wS >= 0 ? '+' : '') + fmt(wE - wS, 1) : '—', 'kg vs last week', wE ? '7-day avg ' + fmt(wE, 1) : 'no weigh-ins')}${R(fd.length ? fmt(kc) : '—', 'kcal a day', fd.length ? Math.round(pr) + ' g protein · ' + fd.length + ' days' : 'no meals logged', fd.length ? hit(kc, tt.kcal * 0.9) : '')}
    ${R('+' + fmt(xp), 'XP earned', rankInfo().name)}${R(fmt(inc - sp), 'net ' + S.settings.currency, `made ${fmt(inc)} · spent ${fmt(sp)}`)}${(() => { const w = scrWeek(m); return w.avg != null ? R(hm(w.avg), 'screen a day', 'distracting ' + hm(w.dist) + '/day', w.dist > 90 ? 'bad' : '') : ''; })()}</div>
    <div class="hint" style="margin-top:12px"><b>Biggest gap this week:</b> ${miss[0] >= 1 ? 'none. Every tracked target was met.' : miss[1] + '. Start the review there.'}</div></div>`;
}

/* ───────── the weekly operation: pace to the weekly dial target ───────── */
function weekOp(d) {
  const dc = counterDef('dials'), wkT = dc ? dc.weekly || 150 : 150, wk = counterWeek('dials', d), m = monday(d), tk = dk(new Date()); let n = 0;
  for (let i = 0; i < 7; i++) { const dd = addDays(m, i), k = dk(dd), tg = dialTargetFor(dd); if (tg && k >= tk && !(k === tk && cOf(dd, 'dials') >= tg)) n++; }
  const left = Math.max(0, wkT - wk), cur = weekKey(d) === weekKey(new Date());
  const line = wk >= wkT ? 'Operation complete. Everything from here is extra.' : !cur ? (dk(addDays(m, 6)) < tk ? `Closed ${left} short of ${wkT}.` : `${wkT} dials to make.`) : n ? `${left} to go · ${n} dial day${n === 1 ? '' : 's'} left · <b>${Math.ceil(left / n)} a day</b> closes it` : `${left} short and no dial days left this week.`;
  return { wk, wkT, left, n, need: n ? Math.ceil(left / n) : null, line, done: wk >= wkT };
}

/* ───────── the campaign: the ladder from the first dial to $20k MRR ───────── */
function campaignSteps() {
  const owners = counterTotal('owners'), dials = counterTotal('dials'); let m = 0, cl = 0, tr = 0; try { m = mrr(); cl = members().length; tr = trials().length + cl; } catch (e) { }
  const og = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners'), oT = og ? og.target : 100, g3 = S.goals['g-first3'];
  const st = [
    { t: 'Log the first dial', v: Math.min(dials, 1), of: 1 }, { t: 'First owner conversation', v: Math.min(owners, 1), of: 1 },
    { t: `${oT} owner conversations`, v: owners, of: oT, dl: og && og.deadline }, { t: 'First agency on trial', v: Math.min(tr, 1), of: 1 },
    { t: 'First paying agency', v: Math.min(cl, 1), of: 1 }, { t: '3 paying agencies', v: cl, of: 3, dl: g3 && !g3._del ? g3.deadline : '' },
    { t: '$5,000 MRR', v: m, of: 5000, money: 1 }, { t: '$20,000 MRR', v: m, of: 20000, money: 1, dl: S.settings.bigDate },
  ];
  st.forEach((x) => (x.done = x.v >= x.of)); return st;
}
function campaignCard() {
  const st = campaignSteps(), i = st.findIndex((x) => !x.done), cur = i < 0 ? st[st.length - 1] : st[i], left = daysUntil(S.settings.bigDate), wT = S.settings.weightTarget;
  const we = weightEntries(), a7 = avgWeight(7), wNow = a7 || (we.length ? we[we.length - 1].w : null), w0 = we.length ? we[0].w : null, wp = wNow != null && w0 != null && wT !== w0 ? clamp(((wNow - w0) / (wT - w0)) * 100, 0, 100) : 0;
  const val = (x) => (x.money ? '$' + fmt(x.v) : x.v) + `<small> / ${x.money ? '$' + fmt(x.of) : x.of}</small>`;
  return `<div class="card" onclick="openCampaign()" style="cursor:pointer"><div class="dday"><div class="n">${left}<small>DAYS</small></div><div class="t">to ${fmtShort(pd(S.settings.bigDate))} ${pd(S.settings.bigDate).getFullYear()}<br><b style="color:var(--sub)">$20k MRR · BAC · ${wT} kg</b></div></div>
    <div class="lab" style="color:var(--acc)">Campaign · objective ${i < 0 ? st.length : i + 1} of ${st.length}</div>
    <div class="camp-t">${i < 0 ? 'Mission complete' : cur.t}</div>
    <div class="prog" style="margin-top:8px"><div class="h"><span class="l">${cur.dl ? 'by ' + fmtShort(pd(cur.dl)) + (daysUntil(cur.dl) >= 0 ? ` · ${daysUntil(cur.dl)} days` : ' · overdue') : 'next objective'}</span><span class="v">${val(cur)}</span></div><div class="bar"><i style="width:${clamp((cur.v / cur.of) * 100, 0, 100)}%"></i></div></div>
    <div class="camp-dots">${st.map((x, j) => `<i class="${x.done ? 'done' : j === i ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="prog"><div class="h"><span class="l">Weight</span><span class="v">${wNow != null ? fmt(wNow, 1) : '—'}<small> → ${wT} kg</small></span></div><div class="bar"><i class="body" style="width:${wp}%"></i></div></div></div>`;
}
function openCampaign() {
  const st = campaignSteps(), i = st.findIndex((x) => !x.done);
  openModal(`<h2>Campaign</h2><div class="hint" style="margin-bottom:12px">One objective at a time. Each one is unlocked by the one before it, and every one of them starts with a dial.</div>
    <div class="camp-list">${st.map((x, j) => `<div class="cs ${x.done ? 'done' : j === i ? 'cur' : ''}"><div class="cn">${x.done ? ic('check', 16) : j + 1}</div><div class="cb"><div class="ct">${x.t}</div><div class="cd2">${x.done ? 'done' : (x.money ? '$' + fmt(x.v) + ' / $' + fmt(x.of) : x.v + ' / ' + x.of) + (x.dl ? ' · by ' + fmtShort(pd(x.dl)) + ' ' + pd(x.dl).getFullYear() : '')}</div>${j === i ? `<div class="bar" style="margin-top:6px"><i style="width:${clamp((x.v / x.of) * 100, 0, 100)}%"></i></div>` : ''}</div></div>`).join('')}</div>`, true);
}

/* ───────── records ───────── */
function records() {
  const keys = Object.keys(S.days).sort(); let bd = [0, ''], bo = [0, ''], bb = [0, ''], bx = [0, ''], bs = [0, '']; const wk = {};
  let run = 0, best = 0, prev = null;
  keys.forEach((k) => { const o = S.days[k], c = o.counters || {}, d = pd(k), dl = Number(c.dials) || 0, ow = Number(c.owners) || 0, ba = Number(c.bac) || 0, xp = dayXp(k), sc = dayScore(d);
    if (dl > bd[0]) bd = [dl, k]; if (ow > bo[0]) bo = [ow, k]; if (ba > bb[0]) bb = [ba, k]; if (xp > bx[0]) bx = [xp, k]; if (sc > bs[0]) bs = [sc, k];
    if (dl) { const w = weekKey(d); wk[w] = (wk[w] || 0) + dl; }
    const ok = (dl || ba) && minimumMet(d).met; if (ok) { run = prev && dk(addDays(pd(prev), 1)) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; } else if (S.days[k]) { run = 0; prev = null; } });
  const bw = Math.max(0, ...Object.values(wk)), on = (k) => (k ? fmtShort(pd(k)) : 'not set yet');
  return [['Most dials in a day', bd[0], on(bd[1])], ['Most dials in a week', bw, bw ? 'best week' : 'not set yet'], ['Most owner talks in a day', bo[0], on(bo[1])], ['Longest minimum streak', best, best ? 'days in a row' : 'not set yet'], ['Most XP in a day', fmt(bx[0]), on(bx[1])], ['Best day score', bs[0] + '%', on(bs[1])]];
}
function statsRecords() { return `<div class="card"><div class="card-h"><div class="card-t">Records</div><div class="card-r">yours to beat</div></div><div class="recs">${records().map(([l, v, s]) => `<div class="rec"><div class="rv">${v}</div><div class="rl">${l}</div><div class="rs">${s}</div></div>`).join('')}</div></div>`; }

/* ───────── calls: what happens when you dial (from the call log) ───────── */
function callLog() { const out = []; try { qItems().forEach((x) => (x.log || []).forEach((e) => out.push(e))); } catch (e) { } return out; }
function flHour(iso) { try { return Number(new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24; } catch (e) { return null; } }
function callKind(e) { const r = String(e.r || ''); return e.d && e.d.owners ? 'Owner' : /gatekeeper/i.test(r) ? 'Gatekeeper' : /voicemail/i.test(r) ? 'Voicemail' : /bad|closed/i.test(r) ? 'Bad number' : 'No answer'; }
function statsCalls() {
  const log = callLog(), n = log.length, kinds = ['No answer', 'Voicemail', 'Gatekeeper', 'Owner', 'Bad number'], cnt = {}; kinds.forEach((k) => (cnt[k] = 0)); log.forEach((e) => cnt[callKind(e)]++);
  const mx = Math.max(1, ...Object.values(cnt)); let hours = '';
  if (n >= 20) { const by = {}; log.forEach((e) => { const h = flHour(e.at); if (h == null) return; by[h] = by[h] || { c: 0, o: 0 }; by[h].c++; if (e.d && e.d.owners) by[h].o++; }); const hs = Object.keys(by).map(Number).sort((a, b) => a - b);
    hours = `<div class="sec-h" style="margin:16px 0 0">Calls by Florida hour · green = an owner picked up</div>${vbars(hs.map((h) => ({ l: h + 'h', v: by[h].c, cls: by[h].o ? 'hit' : 'dim', top: by[h].o ? by[h].o + '★' : '' })), { h: 90 })}`; }
  return `<div class="card"><div class="card-h"><div class="card-t">What happens when you dial</div><div class="card-r">${n} logged call${n === 1 ? '' : 's'}</div></div>
    ${n ? `<div class="funnel">${kinds.map((k) => `<div class="f"><span class="l">${k}</span><div class="bar">${cnt[k] ? `<i style="width:${(cnt[k] / mx) * 100}%;${k === 'Owner' ? 'background:linear-gradient(90deg,var(--body2),var(--body))' : ''}"></i>` : ''}</div><span class="v">${cnt[k]}</span></div>`).join('')}</div>${hours || `<div class="xs muted" style="margin-top:8px">The by-hour view opens at 20 logged calls (${n} so far).</div>`}` : `<div class="empty" style="padding:26px 0">Nothing logged yet. Every outcome you tap in Dial lands here by itself.</div>`}</div>`;
}
function statsXp() {
  const n = Math.min(statsRange, 28), tk = dk(new Date()), items = rangeDays(n).map((d) => ({ l: dow(d) === 1 ? d.getDate() + '.' + pad(d.getMonth() + 1) : '', v: dayXp(dk(d)), cls: '', today: dk(d) === tk }));
  items.forEach((x) => { if (x.today) x.l = 'today'; }); const tot = items.reduce((a, x) => a + x.v, 0), r = rankInfo(), wk = rangeDays(7).reduce((a, d) => a + dayXp(dk(d)), 0), per = wk / 7;
  return `<div class="card"><div class="card-h"><div class="card-t">XP · by day</div><div class="card-r">${n} days</div></div>
    <div class="statline"><div><div class="sub-n">${fmt(tot)}</div><div class="l">XP in ${n} days</div></div><div><div class="sub-n">${fmt(per)}</div><div class="l">a day this week</div></div><div><div class="sub-n">${r.next != null && per > 0 ? Math.ceil(r.toNext / per) + '<small>d</small>' : '—'}</div><div class="l">${r.next != null ? 'to ' + r.nextName : 'top rank'}</div></div></div>${vbars(items, { h: 110 })}</div>`;
}

/* ───────── intel: plain-language findings. Each one unlocks once there is enough data to trust it. ───────── */
function intel() {
  const open = [], locked = [], t = new Date(), dials = counterTotal('dials'), owners = counterTotal('owners'), log = callLog(), dc = counterDef('dials'), wkT = dc ? dc.weekly || 150 : 150;
  const add = (icon, h, d, tone) => open.push({ icon, h, d, tone: tone || '' }), lock = (h, have, of, u) => locked.push({ h, have: Math.min(have, of), of, u });
  // 1 · this week's pace
  const op = weekOp(t); add('bolt', op.done ? `Week done: ${op.wk} dials` : op.need ? `${op.need} dials a day closes the week` : `${op.left} dials short this week`, op.done ? 'The operation is complete. Extra dials now are pure advantage.' : op.need ? `${op.wk} of ${op.wkT} done with ${op.n} dial day${op.n === 1 ? '' : 's'} left.` : 'No dial days are left on the plan. The next block is where it restarts.', op.done ? 't-good' : op.need && op.need > 70 ? 't-bad' : '');
  // 2 · contact rate and the road to 100 conversations
  const og = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners'), oT = og ? og.target : 100;
  if (dials >= 30) { if (owners) { const per = dials / owners, more = Math.max(0, oT - owners) * per, wks = more / wkT; add('target', `1 owner every ${Math.round(per)} dials`, owners >= oT ? `${oT} conversations reached.` : `${oT} conversations needs about ${fmt(more)} more dials: ${wks < 1 ? 'under a week' : '~' + Math.ceil(wks) + ' weeks'} at ${wkT} a week, around ${fmtShort(addDays(t, Math.ceil(wks * 7)))}.`); } else add('target', `${dials} dials, no owner yet`, 'That is normal early. Change the hour you call before you change the script.', 't-bad'); }
  else lock('Your real contact rate, and the date you hit ' + oT + ' conversations', dials, 30, 'dials');
  // 3 · best hour to reach owners
  if (log.length >= 50) { const by = {}; log.forEach((e) => { const h = flHour(e.at); if (h == null) return; by[h] = by[h] || { c: 0, o: 0 }; by[h].c++; if (e.d && e.d.owners) by[h].o++; }); const c = Object.entries(by).filter(([, v]) => v.c >= 8).map(([h, v]) => [Number(h), v.o / v.c, v]).sort((a, b) => b[1] - a[1]);
    if (c.length && c[0][1] > 0) add('timer', `Owners pick up most at ${c[0][0]}:00 Florida`, `${c[0][2].o} of ${c[0][2].c} calls in that hour reached an owner (${Math.round(c[0][1] * 100)}%).${c.length > 1 ? ` Weakest hour: ${c[c.length - 1][0]}:00.` : ''} That is ${(c[0][0] + 7) % 24}:00 your time.`, 't-good'); else add('timer', 'No hour stands out yet', 'Owner pickups are spread too thin to call a best hour. Keep logging.'); }
  else lock('The hour owners actually pick up', log.length, 50, 'logged calls');
  // 4 · callbacks and the size of the list
  try { const q = qItems(), k = dk(t), due = q.filter((x) => x.status === 'callback' && x.next_at && x.next_at <= k).length, fresh = q.filter((x) => !(x.log && x.log.length) && !x.attempts && Q_OPEN.includes(x.status)).length;
    if (due) add('dial', `${due} callback${due === 1 ? '' : 's'} due`, 'Warm calls first. Somebody already told you when to ring back.', 't-bad');
    if (q.length) add('plan', `${fresh} agencies never called`, fresh ? `At ${wkT} dials a week that is about ${Math.max(1, Math.round(fresh / wkT))} week${Math.round(fresh / wkT) > 1 ? 's' : ''} of first calls before the list needs new names.` : 'Every agency on the list has been tried. Time to add names.', fresh < wkT ? 't-bad' : ''); } catch (e) { }
  // 5 · weight trend against the pace needed
  const we = weightEntries(), tg = S.settings.weightTarget;
  if (we.length >= 8) { const a = avgWeight(7), b = avgWeight(7, dk(addDays(t, -7))); if (a && b) { const rate = a - b, need = (tg - a) / Math.max(1, daysUntil(S.settings.weightTargetDate) / 7); add('scale', `${rate >= 0 ? '+' : ''}${fmt(rate, 2)} kg a week`, rate > 0 ? `You need +${fmt(need, 2)}. At this rate ${tg} kg lands around ${fmtShort(addDays(t, Math.ceil(((tg - a) / rate) * 7)))} ${addDays(t, Math.ceil(((tg - a) / rate) * 7)).getFullYear()}.` : `You need +${fmt(need, 2)} a week and the average is not rising. More food, not more training.`, rate >= need ? 't-good' : 't-bad'); } else lock('Your weekly gain against the pace to ' + tg + ' kg', we.length, 14, 'weigh-ins'); }
  else lock('Your weekly gain against the pace to ' + tg + ' kg', we.length, 8, 'weigh-ins');
  // 6 · fuel
  const fd = rangeDays(14).map((d) => foodTotals(d)).filter((x) => x.n), tt = foodTargets();
  if (fd.length >= 5) { const kc = fd.reduce((a, x) => a + x.kcal, 0) / fd.length, pr = fd.reduce((a, x) => a + x.p, 0) / fd.length; add('food', `${fmt(kc)} kcal on an average logged day`, kc < tt.kcal * 0.9 ? `${fmt(tt.kcal - kc)} under target, protein ${Math.round(pr)} of ${tt.p} g. The scale follows this number.` : `On target. Protein ${Math.round(pr)} of ${tt.p} g.`, kc < tt.kcal * 0.9 ? 't-bad' : 't-good'); }
  else lock('What you really eat on an average day', fd.length, 5, 'days with meals');
  // 7 · weakest standard
  const ld = rangeDays(14).filter((d) => S.days[dk(d)] && Object.keys(S.days[dk(d)].habits || {}).length);
  if (ld.length >= 7) { const sc = S.habits.items.map((h) => [h.title.replace(/\s*\(.*?\)\s*/g, ''), ld.filter((d) => S.days[dk(d)].habits[h.id]).length / ld.length]).sort((a, b) => a[1] - b[1]); add('shield', `Weakest standard: ${sc[0][0]}`, `Kept ${Math.round(sc[0][1] * 100)}% of the last ${ld.length} logged days. Strongest: ${sc[sc.length - 1][0]} at ${Math.round(sc[sc.length - 1][1] * 100)}%.`); }
  else lock('Your weakest and strongest standard', ld.length, 7, 'days with standards ticked');
  // 8 · sleep against the day's score
  const sl = Object.keys(S.days).filter((k) => S.days[k].bedAt && S.days[k].wokeAt).map((k) => { const o = S.days[k]; let m = tmin(o.wokeAt) - tmin(o.bedAt); if (m <= 0) m += 1440; return [m / 60, dayScore(pd(k))]; });
  if (sl.length >= 10) { const hi = sl.filter((x) => x[0] >= 8), lo = sl.filter((x) => x[0] < 8), av = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x[1], 0) / a.length) : null); if (hi.length >= 3 && lo.length >= 3) add('flame', `8 h+ nights: ${av(hi)}% days. Short nights: ${av(lo)}%`, `${hi.length} long nights against ${lo.length} short ones. Average sleep ${fmt(sl.reduce((s, x) => s + x[0], 0) / sl.length, 1)} h.`, av(hi) >= av(lo) ? 't-good' : ''); else add('flame', `Average sleep ${fmt(sl.reduce((s, x) => s + x[0], 0) / sl.length, 1)} h`, 'Not enough of both long and short nights yet to compare the days after.'); }
  else lock('What a full night does to the next day', sl.length, 10, 'nights with bed and wake times');
  // 9 · best and worst weekday
  const byW = {}; Object.keys(S.days).forEach((k) => { const d = pd(k), sc = dayScore(d); if (sc >= 10 && k < dk(t)) { const w = dow(d); (byW[w] = byW[w] || []).push(sc); } }); const nW = Object.values(byW).reduce((a, x) => a + x.length, 0);
  if (nW >= 21) { const av = Object.entries(byW).filter(([, a]) => a.length >= 2).map(([w, a]) => [Number(w), a.reduce((s, x) => s + x, 0) / a.length]).sort((a, b) => b[1] - a[1]); if (av.length >= 2) add('stats', `Strongest day: ${DAY_LONG[av[0][0]]}`, `${Math.round(av[0][1])}% average score. Weakest: ${DAY_LONG[av[av.length - 1][0]]} at ${Math.round(av[av.length - 1][1])}%. Guard that one.`); }
  else lock('Your strongest and weakest day of the week', nW, 21, 'worked days');
  // 10 · rank pace
  const r = rankInfo(), per = rangeDays(7).reduce((a, d) => a + dayXp(dk(d)), 0) / 7;
  if (r.next != null) add('medal', per > 0 ? `${r.nextName} in about ${Math.ceil(r.toNext / per)} days` : `${fmt(r.toNext)} XP to ${r.nextName}`, per > 0 ? `You earned ${fmt(per)} XP a day this week. A full dial day is worth more than everything else put together.` : 'No XP earned in the last 7 days. One logged dial starts the count.');
  return { open, locked };
}
function statsIntel() {
  const it = intel();
  return `<div class="card wf"><div class="card-h"><div class="card-t">Intel</div><div class="card-r"><b>${it.open.length}</b> live · ${it.locked.length} locked</div></div>
    <div class="intel">${it.open.map((x) => `<div class="in ${x.tone}"><div class="ii">${ic(x.icon, 18)}</div><div><div class="ih">${x.h}</div><div class="id">${x.d}</div></div></div>`).join('')}
    ${it.locked.map((x) => `<div class="in lock"><div class="ii"><svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div><div class="grow"><div class="ih">${x.h}</div><div class="id">Unlocks at ${x.of} ${x.u} · ${x.have} so far</div><div class="bar"><i style="width:${(x.have / x.of) * 100}%"></i></div></div></div>`).join('')}</div></div>`;
}

/* ───────── promotions and medals: say it once, when it happens ───────── */
const GAME_SEEN = 'wr-game-seen', _gameBoot = Date.now();
function checkGame() {
  let seen = null; try { seen = JSON.parse(localStorage.getItem(GAME_SEEN) || 'null'); } catch (e) { }
  const r = rankInfo(), md = medalsList().filter((x) => x[2]).map((x) => x[0]), put = (o) => { try { localStorage.setItem(GAME_SEEN, JSON.stringify(o)); } catch (e) { } };
  if (!seen || Date.now() - _gameBoot < 6000) { put({ rank: r.i, medals: md }); return; }   // first seconds: cloud data is still arriving
  const fresh = md.filter((x) => !(seen.medals || []).includes(x)), up = r.i > seen.rank;
  if (!up && !fresh.length && r.i === seen.rank && md.length === (seen.medals || []).length) return;
  put({ rank: r.i, medals: md });
  if (up) { if ($('modal-bg').classList.contains('open')) toast(`Promoted: ${r.name}`, 'See', openRank); else openModal(`<div class="promo"><div class="lab" style="color:var(--acc)">Promoted</div><div class="pi">${insignia(r.i)}</div><div class="pn">${r.name}</div><div class="small muted">Level ${r.i + 1} · ${fmt(r.xp)} XP${r.next != null ? ` · next: ${r.nextName} at ${fmt(r.next)}` : ''}</div><div class="actions"><button class="btn primary" onclick="closeModal()">Back to work</button></div></div>`, true); }
  else if (fresh.length) toast(`Medal earned: ${fresh[0]}${fresh.length > 1 ? ' +' + (fresh.length - 1) : ''}`, 'See', openRank);
}

/* ───────── field manual: the whole app on one screen ───────── */
function openManual() {
  const R = (icn, h, d) => `<div class="man"><div class="mi">${ic(icn, 20)}</div><div><div class="mh">${h}</div><div class="md">${d}</div></div></div>`;
  openModal(`<h2>How it works</h2>
    ${R('hq', 'HQ tells you what to do now', 'The top card is the block you are in. Its button is the next action. Tap <b>cancel / move</b> to change a block for one day.')}
    ${R('check', "Today's orders", 'Five or six jobs a day. Tap one to do it. They tick themselves as you log. All done is a clean sweep.')}
    ${R('target', 'Three rings', '<b class="c-co">Company</b>: the dial target. <b class="c-body">Body</b>: train, weigh in, protein. <b class="c-mind">Mind</b>: BAC minutes. Close all three.')}
    ${R('dial', 'Logging is one tap', 'Dials log themselves when you tap an outcome in Dial. Meals: snap a photo in Food. Weight: the morning card. Spending: the wallet button.')}
    ${R('medal', 'XP, rank and medals', 'Only logged work counts. A dial is 10 XP, an owner conversation 100, a paying client 5,000. Rank and medals follow from that.')}
    ${R('stats', 'Stats and intel', 'Charts for everything you track. Intel turns the numbers into findings, and each one unlocks when there is enough data to trust it.')}
    ${R('plan', 'The plan changes on Sunday', 'Plan → Review opens with the week report: every number against its target, and the biggest gap. Monday to Saturday the app is for doing.')}
    <div class="man only-desk"><div class="mi">${ic('bolt', 20)}</div><div><div class="mh">Keyboard</div><div class="md">Keys <b>1</b> to <b>7</b> switch screens. <b>T</b> jumps back to today.</div></div></div>
    <div class="actions"><button class="btn" onclick="openRank()">Rank &amp; medals</button><button class="btn primary" onclick="closeModal()">Got it</button></div>`, true);
}
