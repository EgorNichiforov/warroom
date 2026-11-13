/* War Room v5 · game layer: icons, rings, XP, ranks, medals, small chart helpers, HQ cards.
   Everything here is derived from the data the app already keeps. Nothing is stored. */
'use strict';

/* ───────── icons (line style, 24 grid) ───────── */
const ICONS = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  hq: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  dial: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  train: '<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  food: '<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2.2 1.2-3.5 4-3.5 8H17"/>',
  stats: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  me: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2.2"/><circle cx="9" cy="12" r="2.2"/><circle cx="17" cy="18" r="2.2"/>',
  more: '<circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  flame: '<path d="M12 3c1 3.2 5 5 5 10a5 5 0 0 1-10 0c0-1.8.8-3 1.8-4 .2 1.8 1 2.8 2 3 .2-3-.6-6 1.2-9z"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9a5.5 5.5 0 0 1 8 0M12 9.5l1.6-2"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v3M4 7v10a2 2 0 0 0 2 2h14V8H6a2 2 0 0 1-2-1z"/><circle cx="16" cy="13.5" r="1.1" fill="currentColor"/>',
  bolt: '<path d="M13 2 5 14h6l-1 8 8-12h-6z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.800l1.100-6.100L3.2 9.400l6.100-.800z"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="M8.500 9 6 3h4l2 4 2-4h4l-2.500 6"/>',
  shield: '<path d="M12 3 4 6v6c0 4.500 3.200 7.800 8 9 4.800-1.200 8-4.500 8-9V6z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M16 14h0M8 17h2M12 17h2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
};
function ic(n, s) { s = s || 22; return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`; }

/* ───────── rings ───────── */
let _ringSeq = 0;
function ringsSvg(rs, size, sw, gap) {
  size = size || 200; sw = sw || 19; gap = gap == null ? 4 : gap; const c = size / 2, uid2 = ++_ringSeq; let defs = '', out = '';
  rs.forEach((r, i) => {
    const rad = c - sw / 2 - i * (sw + gap), C = 2 * Math.PI * rad, p = clamp(r.p || 0, 0, 1), id = `rg${uid2}_${i}`;
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.c2}"/><stop offset="1" stop-color="${r.c1}"/></linearGradient>`;
    out += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c1}" stroke-opacity=".17" stroke-width="${sw}"/>`;
    if (p > 0) out += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="url(#${id})" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`;
    else out += `<circle cx="${c}" cy="${c - rad}" r="${sw / 2 - 2}" fill="${r.c1}" fill-opacity=".55"/>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Today's rings"><defs>${defs}</defs>${out}</svg>`;
}
const RING_C = { co: ['#ff7d1a', '#ffc436'], body: ['#3ddc8a', '#a4ec3b'], mind: ['#5c8cff', '#33cdf3'] };
function foodTargets() { const f = S.food || {}; return { kcal: Number(f.kcal) || 3400, p: Number(f.p) || 170 }; }
function foodTotals(k) { const o = S.days[typeof k === 'string' ? k : dk(k)]; const t = { kcal: 0, p: 0, c: 0, f: 0, n: 0 }; ((o && o.meals) || []).forEach((m) => { t.kcal += Number(m.kcal) || 0; t.p += Number(m.p) || 0; t.c += Number(m.c) || 0; t.f += Number(m.f) || 0; t.n++; }); return t; }
function counterDef(id) { return S.counters.items.find((c) => c.id === id); }
function dialTarget(d) { return dialTargetFor(d); }
/* The three rings for one day. Company = the dial target (deep work on days with no dials).
   Body = train + weigh-in + protein. Mind = BAC minutes. */
function ringsFor(d) {
  const k = dk(d), o = S.days[k] || {}, c = o.counters || {}, w = dow(d);
  const tg = dialTarget(d), dials = Number(c.dials) || 0, deepC = counterDef('deep'), deepT = deepC ? deepC.targets[w] || 50 : 50, deep = Number(c.deep) || 0;
  const co = tg ? { p: dials / tg, v: dials, t: tg, u: 'dials', d: (Number(c.owners) || 0) + ' owner talks today' } : { p: deep / deepT, v: deep, t: deepT, u: 'min', d: 'No dial block today · deep work' };
  const trained = dayTrained(o) || !!(o.habits && o.habits.train), weighed = o.weight != null && o.weight !== '', ft = foodTotals(k), tt = foodTargets();
  const fp = ft.n ? Math.min(1, ft.p / tt.p) : (o.habits && o.habits.foodwater ? 1 : 0);
  const body = { p: (trained ? 0.4 : 0) + (weighed ? 0.2 : 0) + 0.4 * fp, v: Math.round(((trained ? 0.4 : 0) + (weighed ? 0.2 : 0) + 0.4 * fp) * 100), u: '%', d: `${trained ? '✓' : '○'} train · ${weighed ? '✓' : '○'} weigh · ${Math.round(ft.p)}/${tt.p}\u00a0g` };
  const bc = counterDef('bac'), bt = (bc ? bc.targets[w] : 0) || S.settings.minBac || 25, bac = Number(c.bac) || 0;
  const mind = { p: bac / bt, v: bac, t: bt, u: 'min', d: 'BAC study' };
  return { co, body, mind };
}
function ringsCard(d, compact) {
  const r = ringsFor(d), closed = [r.co, r.body, r.mind].filter((x) => x.p >= 1).length;
  const svg = ringsSvg([{ p: r.co.p, c1: RING_C.co[0], c2: RING_C.co[1] }, { p: r.body.p, c1: RING_C.body[0], c2: RING_C.body[1] }, { p: r.mind.p, c1: RING_C.mind[0], c2: RING_C.mind[1] }], 200, compact ? 20 : 19, 4);
  const row = (cls, nm, x, go) => `<div class="r" onclick="${go}"><div class="h"><span class="nm ${cls}">${nm}</span><span class="v">${x.v}${x.t ? `<small>/ ${x.t} ${x.u}</small>` : `<small>${x.u}</small>`}</span></div><div class="d">${x.d}</div></div>`;
  return `<div class="card rings-card"><div class="rg">${svg}<div class="ctr"><b>${closed}/3</b><span>closed</span></div></div><div class="rleg">${row('c-co', 'Company', r.co, "show('dial')")}${row('c-body', 'Body', r.body, "show('food')")}${row('c-mind', 'Mind', r.mind, 'goStudy()')}</div></div>`;
}

/* ───────── XP · ranks · medals ───────── */
const XP = { dial: 10, owner: 100, bac: 2, deep: 2, workout: 150, weigh: 20, standard: 15, meal: 10, minimum: 50, trial: 1000, client: 5000 };
const RANKS = [['Recruit', 0], ['Private', 1500], ['Corporal', 5000], ['Sergeant', 12000], ['Staff Sergeant', 25000], ['Lieutenant', 45000], ['Captain', 75000], ['Major', 110000], ['Colonel', 150000], ['General', 200000]];
/* XP is never stored: it is recomputed from what you logged, so editing or undoing anything moves XP with it,
   and every device shows the same number after sync. Daily caps stop farming (tapping +1 forever earns nothing). */
const XP_CAP = { dials: 150, bac: 300, deep: 240, workouts: 1, meals: 5 };
function dayXpParts(k) {
  const o = S.days[k]; if (!o) return { total: 0 }; const c = o.counters || {}; const p = {};
  const dials = Math.min(Number(c.dials) || 0, XP_CAP.dials), owners = Math.min(Number(c.owners) || 0, Number(c.dials) || 0);
  p.dials = dials * XP.dial; p.owners = owners * XP.owner;
  p.study = Math.min(Number(c.bac) || 0, XP_CAP.bac) * XP.bac + Math.min(Number(c.deep) || 0, XP_CAP.deep) * XP.deep;
  p.workout = Math.min(XP_CAP.workouts, sessionsRO(o).filter((s) => s.done).length) * XP.workout;
  p.weigh = o.weight != null && o.weight !== '' ? XP.weigh : 0;
  p.standards = S.habits.items.filter((h) => o.habits && o.habits[h.id]).length * XP.standard;
  p.meals = Math.min(XP_CAP.meals, (o.meals || []).length) * XP.meal;
  p.minimum = (Number(c.dials) || Number(c.bac)) && minimumMet(pd(k)).met ? XP.minimum : 0;
  p.orders = ordersXp(pd(k));
  p.total = Object.values(p).reduce((a, x) => a + x, 0); return p;
}
function dayXp(k) { return dayXpParts(k).total; }
function xpTotal() { let x = 0; for (const k in S.days) x += dayXp(k); try { x += trials().length * XP.trial + members().length * XP.client; } catch (e) { } return x; }
/* Ranks need XP AND a real result. XP alone stops at the gate: you cannot click your way to officer. */
function gateStats() { let m = 0, tr = 0, cl = 0; try { m = mrr(); tr = trials().length + members().length; cl = members().length; } catch (e) { } return { owners: counterTotal('owners'), dials: counterTotal('dials'), trials: tr, clients: cl, mrr: m }; }
const RANK_GATES = [null, null, ['dials', 300, '300 dials logged'], ['owners', 25, '25 owner conversations'], ['trials', 1, 'first agency on a 30-Day Trial'], ['clients', 1, 'first paying client'], ['mrr', 5000, '$5,000 MRR'], ['mrr', 10000, '$10,000 MRR'], ['mrr', 15000, '$15,000 MRR'], ['mrr', 20000, '$20,000 MRR: the goal']];
function gateMet(i, g) { const r = RANK_GATES[i]; return !r || (g[r[0]] || 0) >= r[1]; }
function rankInfo() {
  const xp = xpTotal(), g = gateStats(); let i = 0; while (i < RANKS.length - 1 && xp >= RANKS[i + 1][1] && gateMet(i + 1, g)) i++;
  const cur = RANKS[i][1], next = i < RANKS.length - 1 ? RANKS[i + 1][1] : null, gate = next != null ? RANK_GATES[i + 1] : null, locked = next != null && xp >= next && !gateMet(i + 1, g);
  return { xp, i, name: RANKS[i][0], next, nextName: next != null ? RANKS[i + 1][0] : '', pct: next != null ? clamp(((xp - cur) / (next - cur)) * 100, 0, 100) : 100, toNext: next != null ? Math.max(0, next - xp) : 0, today: dayXp(dk(new Date())), gate: gate ? { what: gate[2], have: g[gate[0]] || 0, need: gate[1], met: gateMet(i + 1, g) } : null, locked };
}
function insignia(i) {
  // enlisted: chevrons · officers: bars · senior: stars
  let g = '';
  if (i <= 4) { const n = Math.max(1, Math.min(i, 3)); for (let j = 0; j < n; j++) { const y = 20 - n * 3 + j * 6; g += `<path d="M9 ${y + 5} 20 ${y - 2} 31 ${y + 5}" ${i === 0 ? 'stroke-opacity=".55"' : ''}/>`; } if (i === 4) g += '<path d="M10 31c6 4 14 4 20 0"/>'; }
  else if (i <= 6) { const n = i - 4; for (let j = 0; j < n; j++) { const x = 20 - (n - 1) * 5 + j * 10 - 2.5; g += `<rect x="${x}" y="10" width="5" height="20" rx="1.2" fill="currentColor"/>`; } }
  else { const n = i - 6; for (let j = 0; j < n; j++) { const cx = 20 - (n - 1) * 6.5 + j * 13; g += `<path transform="translate(${cx - 6.5} 13.5) scale(.54)" fill="currentColor" stroke="none" d="m12 2 2.9 6.2 6.800.800-5 4.700 1.300 6.700L12 17.100 6 20.400l1.300-6.700-5-4.700 6.800-.800z"/>`; } }
  return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g}</svg>`;
}
function rankCard() {
  const r = rankInfo();
  return `<div class="card rk" onclick="openRank()"><div class="rank"><div class="ins">${insignia(r.i)}</div><div class="bd"><div class="top"><span class="nm">${r.name}</span><span class="lv">Level ${r.i + 1}</span></div><div class="xpbar"><i style="width:${r.pct}%"></i></div><div class="ft"><span><b>${fmt(r.xp)}</b>${r.next != null ? ' / ' + fmt(r.next) : ''} XP</span><span>${r.today ? `<span class="up">+${fmt(r.today)} today</span>` : (r.locked ? 'locked: ' + r.gate.what : r.next != null ? fmt(r.toNext) + ' to ' + r.nextName : 'top rank')}</span></div></div></div></div>`;
}
function weekDialsBest() { const byW = {}; for (const k in S.days) { const v = Number((S.days[k].counters || {}).dials) || 0; if (v) { const wk = weekKey(pd(k)); byW[wk] = (byW[wk] || 0) + v; } } return Math.max(0, ...Object.values(byW)); }
function bestWorkoutWeek() { const byW = {}; for (const k in S.days) if (dayTrained(S.days[k])) { const wk = weekKey(pd(k)); byW[wk] = (byW[wk] || 0) + 1; } return Math.max(0, ...Object.values(byW)); }
function medalsList() {
  const dials = counterTotal('dials'), owners = counterTotal('owners'), wkBest = weekDialsBest(), sm = streakMinimum(), lw = latestWeight(), w = lw ? lw.w : 0; let m = 0, tr = 0; try { m = mrr(); tr = trials().length + members().length; } catch (e) { }
  const dc = counterDef('dials'), wkT = dc ? dc.weekly || 150 : 150;
  return [
    ['First shot', 'Log the first dial', dials >= 1, 'dial'], ['Century', '100 dials', dials >= 100, 'dial'], ['Five hundred', '500 dials', dials >= 500, 'dial'], ['One thousand', '1,000 dials', dials >= 1000, 'dial'],
    ['First contact', 'First owner conversation', owners >= 1, 'target'], ['Ten talks', '10 owner conversations', owners >= 10, 'target'], ['The hundred', '100 owner conversations', owners >= 100, 'target'], ['Full week', `${wkT} dials in one week`, wkBest >= wkT, 'bolt'],
    ['Never zero', '7 minimum days in a row', sm >= 7, 'flame'], ['Thirty straight', '30 minimum days in a row', sm >= 30, 'flame'], ['Iron week', '6 training days in a week', bestWorkoutWeek() >= 6, 'train'], ['80 kg', 'Weigh in at 80 kg', w >= 80, 'scale'],
    ['First trial', 'An agency starts a trial', tr >= 1, 'shield'], ['First client', 'First paying agency', m > 0, 'medal'], ['$5k MRR', 'Quarter of the way', m >= 5000, 'star'], ['$20k MRR', 'The mission', m >= 20000, 'star'],
  ];
}
function openRank() {
  const r = rankInfo(), md = medalsList();
  openModal(`<h2>Rank</h2><div class="card rk" style="margin-bottom:14px"><div class="rank" style="cursor:default"><div class="ins">${insignia(r.i)}</div><div class="bd"><div class="top"><span class="nm">${r.name}</span><span class="lv">Level ${r.i + 1}</span></div><div class="xpbar"><i style="width:${r.pct}%"></i></div><div class="ft"><span><b>${fmt(r.xp)}</b>${r.next != null ? ' / ' + fmt(r.next) : ''} XP</span><span>${r.next != null ? fmt(r.toNext) + ' to ' + r.nextName : 'top rank'}</span></div></div></div></div>
    <div class="sec-h">How XP is earned</div><div class="hint" style="margin-bottom:14px">Dial <b>+${XP.dial}</b> · Owner conversation <b>+${XP.owner}</b> · Agency on trial <b>+${fmt(XP.trial)}</b> · Paying client <b>+${fmt(XP.client)}</b><br>BAC or deep work <b>+${XP.bac}</b> a minute · Workout <b>+${XP.workout}</b> · Weigh-in <b>+${XP.weigh}</b> · Standard kept <b>+${XP.standard}</b> · Meal logged <b>+${XP.meal}</b> · Minimum day <b>+${XP.minimum}</b><br>Each order of the day <b>+20 to +100</b> · Clean sweep (all orders) <b>+${SWEEP_XP}</b><br><span class="dim">Counted from what you log. Nothing else moves it.</span></div>
    <div class="sec-h">Medals · ${md.filter((x) => x[2]).length} of ${md.length}</div><div class="medals" style="margin-bottom:14px">${md.map(([t, d, on, icn]) => `<div class="medal ${on ? 'on' : ''}"><div class="i">${ic(icn, 24)}</div><div class="t">${t}</div><div class="d">${d}</div></div>`).join('')}</div>
    <div class="sec-h">Today · +${fmt(r.today)} XP</div><div class="hint" style="margin-bottom:14px">${(() => { const p = dayXpParts(dk(new Date())), L = [['dials', 'Dials'], ['owners', 'Owner talks'], ['study', 'BAC + deep work'], ['workout', 'Workout'], ['weigh', 'Weigh-in'], ['standards', 'Standards'], ['meals', 'Meals logged'], ['minimum', 'Minimum met'], ['orders', 'Orders + sweep']].filter(([k]) => p[k]); return L.length ? L.map(([k, l]) => `${l} <b>+${fmt(p[k])}</b>`).join(' · ') : 'Nothing logged yet today.'; })()}</div>
    <div class="sec-h">The rules</div><div class="hint" style="margin-bottom:14px">XP is recalculated from what you logged, never stored: undo or edit something and the XP follows. Daily caps: ${XP_CAP.dials} dials, ${XP_CAP.bac} min BAC, ${XP_CAP.deep} min deep work, ${XP_CAP.workouts} workout, ${XP_CAP.meals} meals. Owner talks can't exceed dials. A missed day costs no XP; it breaks your streaks and, once you have an accountability partner, costs the stake.<br><b>Ranks need XP and a real result.</b> From Corporal up, each rank has a gate: XP alone stops you at the gate.</div>
    <div class="sec-h">Ranks</div><div class="ranklist">${RANKS.map(([n, x], i) => { const gt = RANK_GATES[i]; return `<div class="rw ${i < r.i ? 'got' : i === r.i ? 'cur' : ''}">${insignia(i)}<span class="n">${n}${gt ? `<small style="display:block;color:var(--muted);font-weight:500;font-size:12px">${gt[2]}${i > r.i && gateMet(i, gateStats()) ? ' ✓' : ''}</small>` : ''}</span><span class="x">${fmt(x)} XP</span></div>`; }).join('')}</div>`, true);
}

/* ───────── HQ cards ───────── */
function goStudy() { secOpen.study = true; if (view !== 'now') { view = 'now'; } render(); const e = document.getElementById('sec-study'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function gradeInfo() { openModal(`<h2>Day grade</h2><div class="hint" style="margin-bottom:12px">The score is the share of the day's checklist that got done: the morning and evening routines, the 7 standards, the day's targets (dials, BAC, deep work) and your top 3.</div><div class="kv"><span>A</span><span class="v">85% and up</span></div><div class="kv"><span>B</span><span class="v">70%+</span></div><div class="kv"><span>C</span><span class="v">50%+</span></div><div class="kv"><span>D</span><span class="v">30%+</span></div><div class="kv"><span>F</span><span class="v">under 30%</span></div><div class="xs muted" style="margin-top:10px">A day that misses the minimum (${S.settings.minDials} dials on a dial day and ${S.settings.minBac} min of BAC) cannot grade above D, whatever else was done.</div>`, true); }
function gradeStreaksCard(d) {
  const sc = dayScore(d), g = gradeFor(d), m = minimumMet(d);
  const col = g === 'A' ? 'var(--body)' : g === 'B' ? 'var(--co2)' : g === 'C' ? 'var(--acc)' : 'var(--bad)';
  const st = [[streakMinimum(), 'minimum days'], [streakWeigh(), 'weigh-ins'], [streakMorning(), 'full mornings'], [streakBed(), 'bed on time']];
  return `<div class="card"><div class="grade-row" onclick="gradeInfo()" style="cursor:pointer"><div class="g" style="color:${col}">${g}</div><div class="grow"><div class="lab">Day grade · ${sc}% · <span style="text-transform:none;letter-spacing:0">how?</span></div><div class="small muted" style="margin-top:3px">${m.met ? 'Minimum met. The streak is alive.' : `Minimum: ${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC`}</div></div></div>
    <div class="streaks">${st.map(([n, l]) => `<div class="s ${n > 0 ? 'on' : ''}"><div class="n">${ic('flame')}${n}</div><div class="l">${l}</div></div>`).join('')}</div></div>`;
}
function weekCard(d) {
  const m = monday(d), dc = counterDef('dials'), wkT = dc ? dc.weekly : 150, wk = counterWeek('dials', d), tk = dk(new Date());
  const cols = ALL.map((i) => { const dd = addDays(m, i - 1), k = dk(dd), tg = dialTargetFor(dd), v = Number(((S.days[k] || {}).counters || {}).dials) || 0, past = k < tk;
    const cls = !tg && !v ? 'off' : tg && v >= tg ? 'hit' : past && tg ? 'miss' : '';
    return `<div class="d ${k === tk ? 'today' : ''} ${k === dk(d) ? 'sel' : ''}" onclick="curDate=pd('${k}');render()"><div class="v">${v || (tg ? '0' : '·')}${tg ? `<small>/${tg}</small>` : ''}</div><div class="col ${cls}"><i style="height:${v ? Math.max(6, Math.min(100, (v / (tg || v)) * 100)) : (cls === 'miss' ? 4 : 0)}%"></i></div><div class="n">${DAY_SHORT[i]}</div></div>`; }).join('');
  const op = weekOp(d);
  return `<div class="card wkc"><div class="card-h"><div class="card-t">Operation · week ${isoWeek(d)}</div><div class="card-r"><b>${wk}</b> / ${wkT} dials</div></div><div class="wk7">${cols}</div><div class="bar" style="margin-top:12px"><i style="width:${clamp((wk / (wkT || 1)) * 100, 0, 100)}%;background:${op.done ? 'linear-gradient(90deg,var(--body2),var(--body))' : 'linear-gradient(90deg,var(--co),var(--co2))'}"></i></div><div class="small muted" style="margin-top:9px">${op.line}</div></div>`;
}
/* ───────── one-tap schedule control: cancel or move a block for one day ───────── */
function findBlock(id, k) { const o = S.days[k], once = o && o.sched && (o.sched.add || []).find((x) => x.id === id); return once ? Object.assign({}, once, { once: true }) : S.schedule.blocks.find((x) => x.id === id); }
function blockSheet(id, k) {
  k = k || dk(curDate); if (String(id).startsWith('cal:') && typeof calOpen === 'function') { calOpen(String(id).slice(4)); return; } const b = findBlock(id, k); if (!b) return; const d = pd(k), tm = dk(addDays(d, 1)), dur = tmin(b.end) - tmin(b.start);
  const setDay = (v) => `document.getElementById('bm-date').value='${v}';document.querySelectorAll('#bm-q .chip').forEach(c=>c.classList.toggle('on',c===this))`;
  openModal(`<h2>${esc(b.title)}</h2><div class="small muted" style="margin:-6px 0 14px">${fmtDate(d)} · ${b.start}–${b.end === '24:00' ? '…' : b.end}${b.once ? ' · this day only' : ' · every ' + b.days.map((i) => DAY_SHORT[i]).join(', ')}</div>
    ${b.kind === 'dials' ? `<div class="field"><label>Dial target for ${isToday(d) ? 'today' : fmtShort(d)} only</label><div class="inline"><input type="number" inputmode="numeric" id="bm-tg" value="${dialTargetFor(d)}"><button class="btn" onclick="setDayDialTarget('${k}')">Set</button></div><div class="xs muted" style="margin-top:6px">Moving dials between days? Raise one day and lower the other. The weekly ${(counterDef('dials') || {}).weekly || 150} stays.</div></div>` : ''}
    <button class="btn lg block danger" onclick="blockCancel('${id}','${k}')">Cancel it for ${isToday(d) ? 'today' : fmtShort(d)}</button>
    <div class="sec-h" style="margin-top:18px">Or move it · this time only</div>
    <div class="chips" id="bm-q" style="margin-bottom:10px"><span class="chip" onclick="${setDay(k)}">Same day</span><span class="chip on" onclick="${setDay(tm)}">${isToday(d) ? 'Tomorrow' : 'Next day'}</span><span class="chip" onclick="${setDay(dk(addDays(d, 2)))}">${DAY_LONG[dow(addDays(d, 2))]}</span></div>
    <div class="field"><label>Day</label><input type="date" id="bm-date" value="${tm}" onchange="document.querySelectorAll('#bm-q .chip').forEach(c=>c.classList.remove('on'))"></div>
    <div class="g2"><div class="field"><label>Start</label><input type="time" id="bm-start" value="${b.start}" onchange="var m=tmin(this.value)+${dur};if(m<1440)document.getElementById('bm-end').value=pad(Math.floor(m/60))+':'+pad(m%60)"></div><div class="field"><label>End</label><input type="time" id="bm-end" value="${b.end === '24:00' ? '23:59' : b.end}"></div></div>
    <div class="xs muted">The weekly plan stays as it is. Only this one day changes.</div>
    <div class="actions"><button class="btn" onclick="curDate=pd('${k}');closeModal();editBlock('${id}')">Edit every week</button><button class="btn primary" onclick="blockMove('${id}','${k}')">Move it</button></div>`, true);
}
function setDayDialTarget(k) { const v = $('bm-tg').value, o = day(k); o.targets = o.targets || {}; o.targets.dials = Math.max(0, Math.round(Number(v) || 0)); touch(o); closeModal(); render(); toast(`Dial target for ${fmtShort(pd(k))}: ${o.targets.dials}`); }
function blockDrop(id, k) { const o = day(k); if (!o.sched) o.sched = { skip: [], add: [] }; const sc = o.sched; sc.skip = sc.skip || []; sc.add = sc.add || []; if (sc.add.some((x) => x.id === id)) sc.add = sc.add.filter((x) => x.id !== id); else if (!sc.skip.includes(id)) sc.skip.push(id); touch(o); }
function schedSnap(keys) { const snap = {}; keys.forEach((k) => (snap[k] = JSON.stringify((S.days[k] || {}).sched || null))); return () => { keys.forEach((k) => { const o = day(k), v = JSON.parse(snap[k]); if (v) o.sched = v; else delete o.sched; touch(o); }); render(); }; }
function blockCancel(id, k) { const b = findBlock(id, k); if (!b) return; const undo = schedSnap([k]); blockDrop(id, k); closeModal(); render(); toast(`${b.title} · cancelled for ${isToday(pd(k)) ? 'today' : fmtShort(pd(k))}`, 'Undo', undo); }
function blockMove(id, k) {
  const b = findBlock(id, k); if (!b) return; const to = $('bm-date').value, start = $('bm-start').value; let end = $('bm-end').value;
  if (!to || !start || !end) { toast('Pick a day and a time'); return; } if (end === '23:59') end = '24:00';
  if (tmin(end) <= tmin(start)) { toast('End must be after start'); return; }
  const undo = schedSnap(k === to ? [k] : [k, to]); blockDrop(id, k);
  const sc = dayOnce(pd(to)); sc.add = sc.add || []; sc.add.push({ id: uid(), from: b.from || (b.once ? '' : b.id), title: b.title, start, end, days: [dow(pd(to))], kind: b.kind, note: b.note || '' }); touch(day(to));
  closeModal(); render(); toast(`Moved to ${fmtShort(pd(to))} · ${start}`, 'Undo', undo);
}
function upNextCard() {
  const d = new Date(), nm = nowMin(), bl = blocksFor(d).filter((b) => tmin(b.end) > nm && b.kind !== 'sleep').slice(0, 5); if (!bl.length) return '';
  return `<div class="card"><div class="card-h"><div class="card-t">Up next</div><div class="card-r">tap to cancel or move · <a href="#" onclick="show('plan');return false">full plan</a></div></div><div class="tl">${bl.map((b) => `<div class="blk tap ${tmin(b.start) <= nm ? 'now' : ''}" onclick="blockSheet('${b.id}','${dk(d)}')"><div class="t">${b.start}–${b.end === '24:00' ? '…' : b.end}</div><div class="b"><div class="n"><span class="tag ${b.kind}"></span>${esc(b.title)}</div></div></div>`).join('')}</div></div>`;
}
function nextMedalsCard() {
  const md = medalsList(), got = md.filter((x) => x[2]).length, next = md.filter((x) => !x[2]).slice(0, 3); if (!next.length) return '';
  return `<div class="card" onclick="openRank()" style="cursor:pointer"><div class="card-h"><div class="card-t">Next medals</div><div class="card-r"><b>${got}</b> / ${md.length} earned</div></div><div class="medals" style="grid-template-columns:repeat(3,1fr)">${next.map(([t, dsc, on, icn]) => `<div class="medal" style="opacity:.75"><div class="i">${ic(icn, 22)}</div><div class="t">${t}</div><div class="d">${dsc}</div></div>`).join('')}</div></div>`;
}

/* ───────── chart helpers ───────── */
/* vertical bars: items [{l, v, t, cls, top}] */
function vbars(items, opt) {
  opt = opt || {}; const mx = Math.max(1, opt.max || 0, ...items.map((x) => Math.max(x.v || 0, x.t || 0)));
  const every = opt.every || 1;
  return `<div class="vb" style="height:${opt.h || 150}px">${items.map((x) => { const h = ((x.v || 0) / mx) * 100; return `<div class="c ${x.v ? '' : 'z'}" style="--h:${h.toFixed(1)}%;--t:${(((x.t || 0) / mx) * 100).toFixed(1)}%" title="${esc(x.tip || '')}">${x.top != null && x.v ? `<span class="tv">${x.top}</span>` : ''}${x.t ? '<span class="tg"></span>' : ''}<div class="b ${x.cls || ''}" style="height:${h.toFixed(1)}%"></div></div>`; }).join('')}</div><div class="vbx">${items.map((x, i) => `<span class="${x.today ? 't' : ''}">${i % every === 0 || x.today ? x.l : ''}</span>`).join('')}</div>`;
}
/* line chart: pts [{x (0..1), v}], optional second series and target */
function lineChart(o) {
  const W = 640, H = 220, L = 34, R = 10, T = 12, B = 24, all = o.raw.map((p) => p.v).concat(o.avg ? o.avg.map((p) => p.v) : []).concat(o.target != null && o.showTarget ? [o.target] : []);
  if (!all.length) return '<div class="empty">No data yet.</div>';
  let lo = Math.min(...all), hi = Math.max(...all); const padv = Math.max(0.5, (hi - lo) * 0.15); lo = Math.floor((lo - padv) * 2) / 2; hi = Math.ceil((hi + padv) * 2) / 2;
  const X = (x) => L + x * (W - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  return `<svg class="lc" viewBox="0 0 ${W} ${H}">${ticks.map((t) => `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${fmt(t, 1)}</text>`).join('')}
    ${o.target != null && o.showTarget ? `<line class="tg" x1="${L}" x2="${W - R}" y1="${Y(o.target)}" y2="${Y(o.target)}"/>` : ''}
    <path class="raw" d="${path(o.raw)}"/>${o.avg && o.avg.length > 1 ? `<path class="avg" d="${path(o.avg)}"/>` : ''}
    ${(o.avg && o.avg.length ? [o.avg[o.avg.length - 1]] : o.raw.slice(-1)).map((p) => `<circle class="pt" cx="${X(p.x)}" cy="${Y(p.v)}" r="4.5"/>`).join('')}
    ${(o.xl || []).map(([x, l, a]) => `<text x="${X(x)}" y="${H - 6}" text-anchor="${a || 'middle'}">${l}</text>`).join('')}</svg>`;
}
