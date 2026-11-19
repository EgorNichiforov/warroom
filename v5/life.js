/* War Room 7.1 · LIFE OS — the rest of the day, measured like the best app for each job.
   Roads (Beeminder) · Day plan vs actual (Sunsama + Rize) · Body: adaptive calories (MacroFactor) + overload (Hevy)
   · BAC: mock tests + error notebook on spaced re-checks · Focus log (Forest/Rize) · one weekly Life score. */
'use strict';
let lifeTab = 'score';

/* ═════════ shared ═════════ */
function lfToday() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function lfDays(a, b) { return Math.round((b - a) / 864e5); }
function lfKcal(o) { return (o && o.meals || []).reduce((a, m) => a + (Number(m.kcal) || 0), 0); }
function lfBars(rows, opt) { opt = opt || {}; const mx = Math.max(opt.max || 0, ...rows.map((r) => r.v), 0.0001); return `<div class="lab-b lf-b">${rows.map((r) => `<div title="${esc(r.t || '')}"><i style="height:${Math.max(2, (r.v / mx) * 100)}%" class="${r.cls || ''}"></i><b>${r.lbl != null ? r.lbl : fmt(r.v)}</b><span>${r.k}</span></div>`).join('')}</div>`; }

/* ═════════ 1 · LIFE SCORE (one number per week) ═════════ */
function lifeWeek(m, upto) {
  let n = 0; const A = { company: [0, 0], mind: [0, 0], body: [0, 0], sleep: [0, 0], standards: [0, 0] }, bacC = S.counters.items.find((c) => c.id === 'bac');
  for (let i = 0; i < 7; i++) {
    const d = addDays(m, i); if (d > upto) break; n++; const o = S.days[dk(d)] || {}, c = o.counters || {};
    A.company[0] += Number(c.dials) || 0; A.company[1] += dialTargetFor(d);
    A.mind[0] += Number(c.bac) || 0; A.mind[1] += bacC ? bacC.targets[dow(d)] || 0 : 0;
    A.body[0] += dayTrained(o) ? 1 : 0; A.body[1] += 6 / 7;
    const r = typeof readiness === 'function' ? readiness(d) : null; if (r) { A.sleep[0] += r.s; A.sleep[1] += 100; }
    A.standards[0] += S.habits.items.filter((h) => o.habits && o.habits[h.id]).length; A.standards[1] += S.habits.items.length;
  }
  const parts = Object.entries(A).map(([k, [a, b]]) => [k, b ? Math.min(1, a / b) : null]), have = parts.filter((p) => p[1] != null);
  return { n, parts, s: have.length ? Math.round((have.reduce((a, p) => a + p[1], 0) / have.length) * 100) : 0 };
}
const LF_AREA = { company: ['Company', 'dials vs target'], mind: ['Mind', 'BAC minutes vs plan'], body: ['Body', 'training days (6/wk)'], sleep: ['Sleep', 'average readiness'], standards: ['Standards', 'habits ticked'] };

/* ═════════ 2 · ROADS (Beeminder): every goal gets a line it must stay on ═════════ */
function roadOf(g) {
  const c = goalCurrent(g); if (c == null || !g.target) return null; const t = lfToday();
  if (g.horizon === 'week') { const m = monday(t), el = lfDays(m, t) + 1, rate = g.target / 7, exp = rate * el; return { c, exp, rate, need: Math.max(0, g.target - c) / Math.max(1, 8 - el), per: 'day', left: 8 - el, buf: (c - exp) / rate, start: 0 }; }
  if (!g.deadline) return null;
  const end = pd(g.deadline), sd = g.horizon === 'month' ? new Date(end.getFullYear(), end.getMonth(), 1) : pd(S.settings.commitStart || dk(t));
  let start = g.start; if (start == null) { if (g.source === 'weight') { const w = weightEntries(), b = w.filter((x) => x.k <= dk(sd)).pop() || w[0]; start = b ? b.w : c; } else start = 0; }
  const total = Math.max(1, lfDays(sd, end)), el = clamp(lfDays(sd, t), 0, total), dir = g.target >= start ? 1 : -1, rate = Math.abs(g.target - start) / total || 0.0001;
  const exp = start + (g.target - start) * (el / total), left = Math.max(0, lfDays(t, end));
  return { c, exp, rate, start, need: Math.abs(g.target - c) / Math.max(1, left / 7), per: 'week', left, buf: ((c - exp) * dir) / rate, dir };
}
function roadSvg(g, r) {
  const W = 260, H = 46, lo = Math.min(r.start, g.target, r.c), hi = Math.max(r.start, g.target, r.c), y = (v) => H - 6 - ((v - lo) / ((hi - lo) || 1)) * (H - 12);
  const pos = r.left != null && r.per === 'day' ? (7 - r.left + 1) / 7 : (() => { const tot = (r.left || 0) + (r.rate ? Math.abs(r.exp - r.start) / r.rate : 0); return tot ? 1 - r.left / tot : 1; })();
  const x = 6 + clamp(pos, 0, 1) * (W - 12), ok = r.buf >= 0;
  return `<svg viewBox="0 0 ${W} ${H}" class="lf-road"><path d="M6 ${y(r.start)}L${W - 6} ${y(g.target)}" class="ln"/><path d="M6 ${y(r.start) - 5}L${W - 6} ${y(g.target) - 5}M6 ${y(r.start) + 5}L${W - 6} ${y(g.target) + 5}" class="lane"/><circle cx="${x}" cy="${y(r.c)}" r="5" class="${ok ? 'ok' : 'bad'}"/></svg>`;
}
function lfRoads() {
  const G = Object.values(S.goals || {}).filter((g) => g && !g._del && !g.done).map((g) => [g, roadOf(g)]).filter((x) => x[1]);
  const u = (g, v) => (g.unit === '$' ? '$' + fmt(Math.round(v)) : fmt(Math.round(v * 10) / 10) + (g.unit ? ' ' + g.unit : ''));
  G.sort((a, b) => a[1].buf - b[1].buf);
  return `<div class="card" style="margin-top:14px"><div class="card-h"><div class="card-t">Roads</div><div class="card-r">${G.filter((x) => x[1].buf < 0).length} off the road · ${G.length} goals</div></div>
    <div class="xs muted" style="margin-bottom:8px">Each goal is a straight line from where you started to the target on its date. The dot is you today. Behind the line = red, with the exact days you are behind and what it takes to get back on.</div>
    ${G.length ? G.map(([g, r]) => { const b = Math.round(r.buf); return `<div class="lf-rd ${b < 0 ? 'off' : ''}"><div class="lf-rt"><b>${esc(g.title)}</b><span>${u(g, r.c)} now · line says ${u(g, r.exp)}</span></div>${roadSvg(g, r)}
      <div class="lf-rs"><b class="${b < 0 ? 'bad' : 'ok'}">${b < 0 ? `${-b} day${b === -1 ? '' : 's'} behind` : b === 0 ? 'on the line' : `${b} day${b === 1 ? '' : 's'} ahead`}</b><span>${r.left ? `need ${Math.abs(r.need) < 1 && r.need ? fmt(r.need, 2) + (g.unit ? ' ' + g.unit : '') : u(g, r.need)}/${r.per} · ${r.left} ${r.per === 'day' ? 'days left this week' : 'days left'}` : 'deadline today'}</span></div></div>`; }).join('') : '<div class="empty">No goals with a target and a date yet. Add them in Plan → Goals.</div>'}</div>`;
}
function lfScoreTab() {
  const t = lfToday(), m = monday(t), cur = lifeWeek(m, t), hist = []; for (let i = 7; i >= 0; i--) { const mm = addDays(m, -7 * i); hist.push({ k: 'w' + isoWeek(mm), v: i ? lifeWeek(mm, addDays(mm, 6)).s : cur.s, cls: i ? '' : 'now' }); }
  const weak = cur.parts.filter((p) => p[1] != null).sort((a, b) => a[1] - b[1])[0];
  return `<div class="sgrid st-g"><div class="card lf-score"><div class="card-h"><div class="card-t">Life score · week ${isoWeek(m)}</div><div class="card-r">${cur.n}/7 days in</div></div>
    <div class="lf-big"><b>${cur.s}</b><span>/100</span></div>
    <div class="lf-parts">${cur.parts.map(([k, v]) => `<div><span>${LF_AREA[k][0]}<em>${LF_AREA[k][1]}</em></span><i><u style="width:${v == null ? 0 : v * 100}%" class="${v == null ? '' : v >= 0.8 ? 'ok' : v >= 0.5 ? 'mid' : 'bad'}"></u></i><b>${v == null ? '–' : Math.round(v * 100)}</b></div>`).join('')}</div>
    ${weak ? `<div class="lf-call">Weakest: <b>${LF_AREA[weak[0]][0]}</b> at ${Math.round(weak[1] * 100)}. Fix that one before polishing anything else.</div>` : ''}</div>
    <div class="card"><div class="card-h"><div class="card-t">8 weeks</div><div class="card-r">same five areas, equal weight</div></div>${lfBars(hist, { max: 100 })}</div></div>${lfRoads()}`;
}

/* ═════════ 3 · DAY: plan vs actual (Sunsama shutdown + Rize honesty) ═════════ */
const LF_TRACK = { dials: 'dials', bac: 'bac', train: 'train', agency: 'deep' };
const LF_OBST = ['Phone / videos', 'Tired', 'Started late', 'Overplanned', 'School / family', 'Avoided the calls', 'Sick', 'Other'];
function blkStatus(b, d, o, list) {
  const man = o.blk && o.blk[b.id]; if (man) return man;
  const k = dk(d), tk = dk(new Date()), ended = k < tk || (k === tk && tmin(b.end) <= nowMin()), started = k < tk || (k === tk && tmin(b.start) <= nowMin()), c = o.counters || {};
  const cum = (kind) => list.filter((x) => x.kind === kind && tmin(x.start) <= tmin(b.start)).reduce((a, x) => a + Math.max(0, tmin(x.end) - tmin(x.start)), 0);
  let ev = false;
  if (b.kind === 'dials') { const tg = dialTargetFor(d); ev = tg > 0 && (Number(c.dials) || 0) >= Math.min(tg, Math.round(tg * cum('dials') / Math.max(1, list.filter((x) => x.kind === 'dials').reduce((a, x) => a + tmin(x.end) - tmin(x.start), 0)))); }
  else if (b.kind === 'bac') ev = (Number(c.bac) || 0) >= cum('bac') * 0.6;
  else if (b.kind === 'agency') ev = (Number(c.deep) || 0) >= cum('agency') * 0.6;
  else if (b.kind === 'train' || b.kind === 'program') ev = dayTrained(o);
  if (ev) return 'done'; if (!started) return 'next'; if (!ended) return 'now';
  return LF_TRACK[b.kind] || b.kind === 'program' ? 'miss' : 'open';
}
function lfAdh(d) { const o = S.days[dk(d)] || {}, L = blocksFor(d); let dn = 0, ms = 0; L.forEach((b) => { const s = blkStatus(b, d, o, L); if (s === 'done') dn++; else if (s === 'miss') ms++; }); return dn + ms ? { dn, ms, v: dn / (dn + ms) } : null; }
function lfBlk(id, s) { const o = day(curDate); o.blk = o.blk || {}; if (o.blk[id] === s) delete o.blk[id]; else o.blk[id] = s; touch(o); render(); }
function lfObst(x) { const o = day(curDate); o.obst = o.obst || []; const i = o.obst.indexOf(x); if (i >= 0) o.obst.splice(i, 1); else o.obst.push(x); touch(o); render(); }
function lfTop(i, v) { const o = day(addDays(curDate, 1)); o.top3[i] = Object.assign(o.top3[i] || { d: 0 }, { t: v }); touch(o); }
function lfDayTab() {
  const d = curDate, o = day(d), L = blocksFor(d).slice().sort((a, b) => tmin(a.start) - tmin(b.start)), a = lfAdh(d), hist = [];
  for (let i = 13; i >= 0; i--) { const dd = addDays(lfToday(), -i), r = lfAdh(dd); hist.push({ k: DAY_SHORT[dow(dd)].slice(0, 2), v: r ? r.v * 100 : 0, lbl: r ? Math.round(r.v * 100) : '–', cls: r && r.v < 0.5 ? 'thin' : '' }); }
  const ob = {}; for (let i = 0; i < 30; i++) { const x = S.days[dk(addDays(lfToday(), -i))]; (x && x.obst || []).forEach((z) => (ob[z] = (ob[z] || 0) + 1)); }
  const obT = Object.entries(ob).sort((x, y) => y[1] - x[1]), tm = day(addDays(d, 1)).top3;
  const lab = { done: ['✓', 'ok'], miss: ['missed', 'bad'], now: ['now', 'acc'], next: ['later', 'muted'], open: ['–', 'muted'], skip: ['skipped', 'muted'] };
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Plan vs actual · ${isToday(d) ? 'today' : fmtShort(d)}</div><div class="card-r">${a ? `<b class="${a.v >= 0.8 ? 'ok' : a.v >= 0.5 ? '' : 'bad'}">${Math.round(a.v * 100)}%</b> kept · ${a.dn} done · ${a.ms} missed` : 'no tracked blocks finished yet'}</div></div>
    <div class="xs muted" style="margin-bottom:8px">The calendar is the plan. What you logged is the truth. Dials, BAC, company deep work and training blocks tick themselves from your numbers; tap to correct.</div>
    <div class="lf-blks">${L.map((b) => { const s = blkStatus(b, d, o, L); return `<div class="lf-blk s-${s}"><span class="tm">${b.start}–${b.end}</span><span class="tt">${esc(b.title.replace(EMO_RE, '').trim())}</span><b class="${lab[s][1]}">${lab[s][0]}</b><span class="ac"><button onclick="lfBlk('${b.id}','done')">✓</button><button onclick="lfBlk('${b.id}','miss')">✗</button><button onclick="lfBlk('${b.id}','skip')">skip</button></span></div>`; }).join('') || '<div class="empty">No blocks on this day.</div>'}</div></div>
    <div class="card"><div class="card-h"><div class="card-t">Shutdown</div><div class="card-r">2 minutes, then phone out</div></div>
      <div class="sec-h">What got in the way today?</div><div class="lf-chips">${LF_OBST.map((x) => `<button class="${(o.obst || []).includes(x) ? 'on' : ''}" onclick="lfObst('${x}')">${x}</button>`).join('')}</div>
      <div class="sec-h" style="margin-top:12px">Tomorrow's three (the first one is the hard one)</div>${[0, 1, 2].map((i) => `<input class="lf-in" placeholder="${['The call block / the hardest thing', 'Second', 'Third'][i]}" value="${esc((tm[i] || {}).t || '')}" onchange="lfTop(${i},this.value)">`).join('')}</div>
    <div class="card"><div class="card-h"><div class="card-t">Kept-plan % · 14 days</div></div>${lfBars(hist, { max: 100 })}
      <div class="sec-h" style="margin-top:12px">Top obstacles · 30 days</div>${obT.length ? obT.slice(0, 4).map(([k, v]) => `<div class="row sb small"><span>${esc(k)}</span><b>${v}×</b></div>`).join('') + `<div class="lf-call">${esc(obT[0][0])} is the pattern. Design it out, don't fight it daily.</div>` : '<div class="empty">Tick what got in the way at shutdown. After a week the pattern shows here.</div>'}</div></div>`;
}

/* ═════════ 4 · BODY: adaptive calories (MacroFactor) + progressive overload (Hevy) ═════════ */
function lfTrend() { const E = weightEntries(); let t = null; return E.map((e) => { t = t == null ? e.w : t + 0.1 * (e.w - t); return { k: e.k, w: e.w, t }; }); }
function lfTdee() {
  const T = lfTrend(), t = lfToday(), from = dk(addDays(t, -21)), win = T.filter((e) => e.k >= from);
  let n = 0, sum = 0; for (let i = 1; i <= 21; i++) { const kc = lfKcal(S.days[dk(addDays(t, -i))]); if (kc > 800) { n++; sum += kc; } }
  if (win.length < 2 || n < 10) return { ok: false, n, w: win.length, T };
  const span = Math.max(7, lfDays(pd(win[0].k), pd(win[win.length - 1].k))), dW = win[win.length - 1].t - win[0].t, intake = sum / n;
  return { ok: true, T, intake: Math.round(intake), tdee: Math.round(intake - (dW * 7700) / span), rate: (dW / span) * 7, n };
}
function lfNextSet(e, h) {
  const tgt = parseInt(e.r) || 0; if (!h || !tgt || /m\b|sec|s\b|min/.test(e.r)) return null; const s = h.sets.filter((x) => parseInt(x.r));
  if (!s.length) return null; const w = Math.max(...s.map((x) => num(x.w) || 0)), hit = s.filter((x) => (num(x.w) || 0) === w).every((x) => parseInt(x.r) >= tgt);
  return w ? (hit ? `${fmt(w + 2.5, 1)} kg × ${tgt}` : `${fmt(w, 1)} kg · beat ${Math.min(...s.map((x) => parseInt(x.r)))} reps`) : (hit ? `${tgt + 1} reps or add 5 kg` : `bodyweight × ${tgt}`);
}
function lfBodyTab() {
  const A = lfTdee(), T = A.T, last = T[T.length - 1], g = Object.values(S.goals || {}).find((x) => x && !x._del && x.source === 'weight' && x.horizon === 'long'), plan = foodState().kcal;
  let rec = null; if (A.ok && last && g) { const wks = Math.max(1, lfDays(lfToday(), pd(g.deadline || S.settings.weightTargetDate)) / 7), need = (g.target - last.t) / wks, r = clamp(need, -0.75, 0.5); rec = { need, r, kcal: Math.round((A.tdee + (r * 7700) / 7) / 10) * 10 }; }
  const pts = T.slice(-60), lo = pts.length ? Math.min(...pts.map((p) => Math.min(p.w, p.t))) - 0.3 : 0, hi = pts.length ? Math.max(...pts.map((p) => Math.max(p.w, p.t))) + 0.3 : 1, X = (i) => 10 + (i / Math.max(1, pts.length - 1)) * 580, Y = (v) => 110 - ((v - lo) / (hi - lo || 1)) * 100;
  const chart = pts.length >= 2 ? `<svg viewBox="0 0 600 120" class="lf-wt">${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.w)}" r="2.5"/>`).join('')}<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(p.t)).join('')}"/></svg>` : '<div class="empty">Two weigh-ins draw the trend.</div>';
  const progs = Object.values(S.programs || {}).filter((p) => p && p.ex && p.ex.length), nk = dk(addDays(lfToday(), 1));
  const rows = []; progs.forEach((p) => p.ex.forEach((e) => { const H = exHistory(e.n, nk, 40), nx = lfNextSet(e, H[0]); if (!H.length && !nx) return; let pr = 0; H.forEach((h) => h.sets.forEach((s) => { const w = num(s.w) || 0, r = parseInt(s.r) || 0; if (w && r) pr = Math.max(pr, w * (1 + r / 30)); })); rows.push({ c: [esc(e.n), H[0] ? fmtSets(H[0].sets) : '', nx || '', pr ? fmt(pr, 1) + ' kg' : ''] }); }));
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Weight · scale vs trend</div><div class="card-r">${last ? `trend <b>${fmt(last.t, 1)} kg</b>${A.ok ? ` · ${A.rate >= 0 ? '+' : ''}${fmt(A.rate, 2)} kg/week` : ''}` : 'no weigh-ins'}</div></div>${chart}<div class="xs muted">Dots = scale. Line = trend (water and food noise filtered out). Judge the line, never one morning.</div></div>
    <div class="card"><div class="card-h"><div class="card-t">Adaptive calories</div><div class="card-r">from your own data</div></div>${A.ok ? `<div class="lf-kv"><span>Your real burn (TDEE)</span><b>${fmt(A.tdee)} kcal</b></div><div class="lf-kv"><span>You actually eat</span><b>${fmt(A.intake)} kcal</b></div><div class="lf-kv"><span>Plan in Food</span><b>${fmt(plan)} kcal</b></div>
      ${rec ? `<div class="lf-call">${g.target} kg by ${fmtShort(pd(g.deadline))} needs ${rec.need >= 0 ? '+' : ''}${fmt(rec.need, 2)} kg/week. Eat <b>${fmt(rec.kcal)} kcal</b> a day${Math.abs(rec.r - rec.need) > 0.01 ? ` (capped at ${fmt(rec.r, 2)} kg/week so it is muscle, not fat)` : ''}.${Math.abs(rec.kcal - plan) >= 150 ? ` That is ${rec.kcal > plan ? '+' : ''}${fmt(rec.kcal - plan)} vs your plan. <a href="#" onclick="lfSetKcal(${rec.kcal});return false">Use it</a>` : ' Your plan already matches.'}</div>` : ''}`
      : `<div class="empty">Needs 3 weeks of honest data: ${A.n}/10 days of food logged and ${A.w}/2 weigh-ins in the last 21 days. Then it computes your real burn, not a formula guess, and re-checks it every day.</div>`}</div>
    <div class="card w2"><div class="card-h"><div class="card-t">Progressive overload</div><div class="card-r">next set to beat · best est. 1-rep max</div></div>${rows.length ? stTable(['Exercise', 'Last time', 'Next time', 'Best e1RM'], rows) : '<div class="empty">Log a session with weights and reps; every exercise then gets its next target here and in the session.</div>'}</div></div>`;
}
function lfSetKcal(k) { const f = foodState(); f.kcal = k; foodTouch(); toast(`Daily target set to ${fmt(k)} kcal`); render(); }

/* ═════════ 5 · BAC: mock tests + error notebook on spaced re-checks ═════════ */
const LF_SUBJ = [['ro', 'Română', 10, 9], ['ist', 'Istorie', 10, 9], ['en', 'Engleză (Cambridge)', 230, 160], ['it', 'IT · Python ITS', 1000, 700]];
const LF_GAP = [1, 3, 7, 14, 30];
function lfTests(s) { return Object.values(S.lifeTests || {}).filter((x) => x && !x._del && (!s || x.subj === s)).sort((a, b) => (a.date < b.date ? -1 : 1)); }
function lfErrs() { return Object.values(S.lifeErrors || {}).filter((x) => x && !x._del); }
function lfTestModal(s) { openModal(`<h2>Log a test</h2><div class="field"><label>Subject</label><select id="lt-s">${LF_SUBJ.map(([k, l]) => `<option value="${k}" ${k === s ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="field"><label>Score (Română/Istorie 1–10 · Cambridge scale · ITS points)</label><input id="lt-v" type="number" inputmode="decimal" step="0.01"></div><div class="field"><label>Date</label><input id="lt-d" type="date" value="${dk(new Date())}"></div><div class="field"><label>Where you lost points (optional)</label><input id="lt-n"></div>
  <button class="btn primary block" onclick="lfTestSave()">Save</button>`); }
function lfTestSave() { const v = num($('lt-v').value); if (v == null) { toast('Enter the score'); return; } S.lifeTests = S.lifeTests || {}; const id = uid(); S.lifeTests[id] = { id, _u: now(), subj: $('lt-s').value, score: v, date: $('lt-d').value || dk(new Date()), note: $('lt-n').value.trim() }; save(); closeModal(); toast('Test logged'); render(); }
function lfErrModal() { openModal(`<h2>Error notebook</h2><div class="xs muted" style="margin-bottom:8px">One mistake per card. It comes back in 1, 3, 7, 14 and 30 days until you get it right five times.</div>
  <div class="field"><label>Subject</label><select id="le-s">${LF_SUBJ.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field"><label>Topic</label><input id="le-t" placeholder="e.g. Unirea din 1918 · comma rules · list slicing"></div>
  <div class="field"><label>What I got wrong</label><input id="le-w"></div><div class="field"><label>The correct answer / rule</label><input id="le-f"></div><button class="btn primary block" onclick="lfErrSave()">Add card</button>`); }
function lfErrSave() { const w = $('le-w').value.trim(), f = $('le-f').value.trim(); if (!w || !f) { toast('Write the mistake and the fix'); return; } S.lifeErrors = S.lifeErrors || {}; const id = uid(); S.lifeErrors[id] = { id, _u: now(), subj: $('le-s').value, topic: $('le-t').value.trim(), what: w, fix: f, lvl: 0, due: dk(addDays(new Date(), 1)), at: dk(new Date()) }; save(); closeModal(); toast('Card added · back tomorrow'); render(); }
function lfErrGrade(id, ok) { const e = S.lifeErrors[id]; if (!e) return; e.lvl = ok ? e.lvl + 1 : 0; e.due = e.lvl >= LF_GAP.length ? '' : dk(addDays(new Date(), LF_GAP[ok ? e.lvl : 0])); e._u = now(); save(); lfReview(); }
function lfReview() { const d = lfErrs().filter((e) => e.due && e.due <= dk(new Date())); if (!d.length) { closeModal(); toast('Error deck clear for today'); render(); return; } const e = d[0], s = LF_SUBJ.find((x) => x[0] === e.subj) || ['', '']; openModal(`<div class="xs muted">${d.length} due · ${esc(s[1])}${e.topic ? ' · ' + esc(e.topic) : ''}</div><h2 style="margin:6px 0 12px">${esc(e.what)}</h2>
  <details class="lf-ans"><summary>Show the fix</summary><div>${esc(e.fix)}</div></details><div class="row" style="gap:8px;margin-top:14px"><button class="btn grow" onclick="lfErrGrade('${e.id}',false)">Got it wrong</button><button class="btn grow primary" onclick="lfErrGrade('${e.id}',true)">Got it right</button></div>`); }
function lfStudyTab() {
  const left = lfDays(lfToday(), pd(S.settings.bacDate || '2027-06-01')), E = lfErrs(), due = E.filter((e) => e.due && e.due <= dk(new Date())).length, mast = E.filter((e) => !e.due).length;
  const latest = (k) => { const t = lfTests(k); return t.length ? t[t.length - 1] : null; }, ro = latest('ro'), ist = latest('ist');
  const avg = ro && ist ? (() => { const v = [ro.score, ist.score]; ['en', 'it'].forEach((k, i) => { const l = latest(k), c = LF_SUBJ[i + 2]; if (l) v.push(l.score >= c[3] ? 10 : null); }); const z = v.filter((x) => x != null); return z.reduce((a, x) => a + x, 0) / z.length; })() : null;
  const bacMin = []; for (let i = 13; i >= 0; i--) { const dd = addDays(lfToday(), -i), o = S.days[dk(dd)]; bacMin.push({ k: DAY_SHORT[dow(dd)].slice(0, 2), v: Number(o && o.counters && o.counters.bac) || 0 }); }
  return `<div class="sgrid st-g"><div class="card"><div class="card-h"><div class="card-t">BAC · ${left} days</div><div class="card-r">target average 9+</div></div>
    <div class="lf-big"><b>${avg != null ? fmt(avg, 2) : '–'}</b><span>${avg != null ? 'projected average' : 'log a Română and an Istorie test'}</span></div>
    ${avg != null ? `<div class="lf-call">${avg >= 9 ? 'On target. Keep the Saturday tests honest and timed.' : `Gap to 9: ${fmt(9 - avg, 2)}. The lowest subject gets the Friday "materia slabă" block.`}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn grow primary" onclick="lfTestModal()">Log a test</button><button class="btn grow" onclick="lfErrModal()">+ Mistake</button></div></div>
    <div class="card"><div class="card-h"><div class="card-t">Error notebook</div><div class="card-r">${E.length} cards · ${mast} mastered</div></div>
      <div class="lf-big"><b>${due}</b><span>due today</span></div>${due ? `<button class="btn primary block" onclick="lfReview()">Review ${due} now</button>` : `<div class="xs muted">Every mistake from Saturday's corrected test goes in here. It returns until it's gone for good. Anki is for facts; this is for the exact errors that cost you points.</div>`}</div>
    <div class="card w2"><div class="card-h"><div class="card-t">Tests by subject</div><div class="card-r">dashed = target</div></div><div class="lf-subj">${LF_SUBJ.map(([k, l, mx, tg]) => { const t = lfTests(k).slice(-8); return `<div><div class="row sb small"><b>${l}</b><span>${t.length ? `last <b class="${t[t.length - 1].score >= tg ? 'ok' : 'bad'}">${fmt(t[t.length - 1].score, 2)}</b> / target ${tg}` : 'no tests yet'}</span></div><div class="lf-tb"><i class="tg" style="bottom:${(tg / mx) * 100}%"></i>${t.map((x) => `<u style="height:${(x.score / mx) * 100}%" class="${x.score >= tg ? 'ok' : ''}" title="${x.date}: ${x.score}${x.note ? ' · ' + esc(x.note) : ''}"></u>`).join('')}</div></div>`; }).join('')}</div></div>
    <div class="card w2"><div class="card-h"><div class="card-t">BAC minutes · 14 days</div><div class="card-r">${bacMin.reduce((a, x) => a + x.v, 0)} min</div></div>${lfBars(bacMin)}</div></div>`;
}

/* ═════════ 6 · FOCUS (Forest/Rize): every timer becomes a record ═════════ */
if (typeof stopTimer === 'function' && !stopTimer._lf) {
  const _st = stopTimer;
  stopTimer = function (complete) { const t = S.timer; if (t) { const mins = complete ? t.mins : Math.round((now() - t.start) / 60000); if (mins > 0) { const o = day(t.date); o.focus = o.focus || []; o.focus.push({ at: t.start, mins, c: t.counter, ok: !!complete, plan: t.mins }); touch(o); } } return _st.apply(this, arguments); };
  stopTimer._lf = 1;
}
const LF_FC = { bac: ['BAC', 'f-bac'], deep: ['Company', 'f-deep'], dials: ['Dials', 'f-dial'] };
function lfFocusTab() {
  const t = lfToday(), all = [], days = []; for (let i = 13; i >= 0; i--) { const dd = addDays(t, -i), f = (S.days[dk(dd)] || {}).focus || []; f.forEach((x) => all.push(x)); days.push({ dd, f }); }
  const mx = Math.max(60, ...days.map((x) => x.f.reduce((a, z) => a + z.mins, 0))), tod = (S.days[dk(t)] || {}).focus || [], ok = all.filter((x) => x.ok).length;
  const hr = {}; all.forEach((x) => { const h = new Date(x.at).getHours(); hr[h] = (hr[h] || 0) + x.mins; }); const bestH = Object.entries(hr).sort((a, b) => b[1] - a[1])[0];
  const run = S.timer;
  return `<div class="sgrid st-g"><div class="card"><div class="card-h"><div class="card-t">Focus now</div><div class="card-r">${tod.reduce((a, x) => a + x.mins, 0)} min today</div></div>
    ${run ? `<div class="lf-call">Running: ${esc((LF_FC[run.counter] || [run.counter])[0])} · ${run.mins} min, started ${new Date(run.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</div><div class="row" style="gap:8px;margin-top:8px"><button class="btn grow primary" onclick="stopTimer(true)">Done</button><button class="btn grow" onclick="stopTimer(false)">Stop early</button></div>`
      : `<div class="lf-start">${[['bac', 25], ['bac', 50], ['deep', 25], ['deep', 50]].map(([c, m]) => `<button onclick="startTimer('${c}',${m})"><b>${m}</b><span>${LF_FC[c][0]}</span></button>`).join('')}</div><div class="xs muted" style="margin-top:8px">Phone face down. Minutes go into the counter and into this log.</div>`}</div>
    <div class="card"><div class="card-h"><div class="card-t">Honesty</div><div class="card-r">14 days</div></div><div class="lf-kv"><span>Sessions</span><b>${all.length}</b></div><div class="lf-kv"><span>Finished, not stopped early</span><b>${all.length ? Math.round((ok / all.length) * 100) + '%' : '–'}</b></div><div class="lf-kv"><span>Most focused hour</span><b>${bestH ? pad(bestH[0]) + ':00' : '–'}</b></div></div>
    <div class="card w2"><div class="card-h"><div class="card-t">Focused minutes · 14 days</div><div class="card-r">${Object.values(LF_FC).map(([l, c]) => `<span class="lf-dot ${c}"></span>${l}`).join(' ')}</div></div>
      ${all.length ? `<div class="lf-stack">${days.map(({ dd, f }) => { const by = {}; f.forEach((x) => (by[x.c] = (by[x.c] || 0) + x.mins)); return `<div><div class="col">${Object.entries(by).map(([c, m]) => `<i class="${(LF_FC[c] || ['', ''])[1]}" style="height:${(m / mx) * 100}%" title="${m} min"></i>`).join('')}</div><span>${DAY_SHORT[dow(dd)].slice(0, 2)}</span></div>`; }).join('')}</div>` : '<div class="empty">Start a timer. From 7.1 every focus session is recorded here.</div>'}</div></div>`;
}

/* ═════════ screen ═════════ */
function renderLife() {
  const el = $('view-life'); if (!el) return;
  const tabs = [['score', 'Score & roads'], ['content', 'Content'], ['day', 'Day'], ['body', 'Body'], ['study', 'BAC'], ['focus', 'Focus'], ['op', 'Operator']];
  el.innerHTML = `<div class="crm-top"><div class="st-tabs">${tabs.map(([k, l]) => `<button class="${lifeTab === k ? 'on' : ''}" onclick="lifeTab='${k}';render()">${l}</button>`).join('')}</div></div>${({ score: lfScoreTab, day: lfDayTab, body: lfBodyTab, study: lfStudyTab, focus: lfFocusTab, op: () => (typeof lfOpTab === 'function' ? lfOpTab() : ''), content: typeof ccTab === 'function' ? ccTab : () => '' }[lifeTab] || lfScoreTab)()}`;
}
