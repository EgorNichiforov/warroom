/* War Room 13.18 · BOOTCAMP — zero to operator, step by step.
   Work → Bootcamp. 12 modules in the order your business needs them (Hormozi: study your stage first),
   built on the 126 deep cards (lib/cards.json) + scenarios and script mistakes (lib/boot.json).
   Every idea climbs 5 rungs: Learned → Recalled → Judged → Used on a call → Proven (still there after 21+ days).
   Lesson loop (~8 min): Predict → Learn → Watch → Recall (closed book) → Use (tonight's call mission).
   A module opens after the boss fight of the one before (80%). You can test out of a module early (90%).
   State: S.boot (synced per record, _u). Questions are generated from each card + hand-written scenarios. */
'use strict';
let BC = null, bcLoading = false, bcS = { scr: 'home' };
function bcLoad() {
  if (BC || bcLoading) return; bcLoading = true; if (typeof xcLoad === 'function') xcLoad();
  fetch('./lib/boot.json').then((r) => r.json()).then((d) => { BC = d; BC.mod = {}; const tk = {}; d.modules.forEach((m, i) => { m.i = i; m.tr = m.tr || 'biz'; m.k = (tk[m.tr] = (tk[m.tr] == null ? -1 : tk[m.tr]) + 1); BC.mod[m.id] = m; m.cards.forEach((c) => { BC.cardMod = BC.cardMod || {}; BC.cardMod[c] = m.id; }); }); bcLoading = false; const t = setInterval(() => { if (typeof XC !== 'undefined' && XC && XC.byId) { clearInterval(t); if (view === 'boot') render(); } }, 120); }).catch(() => { bcLoading = false; });
}
const bcReady = () => BC && typeof XC !== 'undefined' && XC && XC.byId;

/* ── store ── */
function bcV(k, d) { const r = (S.boot || {})[k]; return r && !r._del && r.v !== undefined ? r.v : d; }
function bcW(k, v) { S.boot = S.boot || {}; S.boot[k] = { id: k, v, _u: now() }; save(); }
function bcDay(kind) { const k = 'd:' + dk(new Date()), o = Object.assign({ l: 0, q: 0 }, bcV(k, {})); o[kind] = (o[kind] || 0) + 1; bcW(k, o); }
function bcSrs(id, ok) { S.cards = S.cards || {}; const r = S.cards[id] || { step: -1 }, step = ok ? Math.min(XC_STEPS.length - 1, r.step + 1) : 0, d = new Date(); d.setDate(d.getDate() + XC_STEPS[step]); S.cards[id] = { step, due: dk(d), seen: (r.seen || 0) + 1, _u: now() }; }

/* ── mastery ── */
const BC_RUNG = [['New', ''], ['Learned', 'did the lesson'], ['Recalled', 'said it from memory'], ['Judged', 'picked it right in a scenario'], ['Used', 'used it on a real call'], ['Proven', 'still there after 21+ days']];
function bcRung(id) {
  const l = bcV('l:' + id, null); if (!l) return 0; const s = (S.cards || {})[id] || {}, j = bcV('j:' + id, 0), u = bcV('u:' + id, null);
  if (u && (s.step || 0) >= 3) return 5; if (u) return 4; if (j > 0) return 3; if ((l.r || 0) >= 1 || (s.step || 0) >= 1) return 2; return 1;
}
const bcLearned = (m) => m.cards.filter((c) => bcV('l:' + c, null)).length;
const bcCleared = (m) => !!(bcV('b:' + m.id, {}) || {}).pass;
const bcTrack = (tr) => BC.modules.filter((m) => m.tr === tr);
const bcPrev = (m) => bcTrack(m.tr)[m.k - 1] || null;
const bcNo = (m) => (m.tr === 'life' ? 'L' : '') + (m.k + 1);
function bcOpen(m) { return m.k === 0 || bcCleared(bcPrev(m)) || bcCleared(m); }
/* earned learning: 1 new Business + 1 new Life lesson a day are free; more unlock after today's dials */
const BC_DIAL_GATE = 10;
function bcDials() { try { return Number(((S.days || {})[dk(new Date())] || {}).counters.dials) || 0; } catch (e) { return 0; } }
function bcToday(tr) { const t = dk(new Date()); return Object.keys(BC.cardMod).filter((id) => { const l = bcV('l:' + id, null); return l && l.at === t && BC.mod[BC.cardMod[id]].tr === tr; }).length; }
function bcGate(tr) { const done = bcToday(tr), d = bcDials(); return { done, d, ok: done < 1 || d >= BC_DIAL_GATE }; }
function bcRank() { const n = BC.modules.filter(bcCleared).length; let r = BC.ranks[0]; BC.ranks.forEach((x) => { if (n >= x[0]) r = x; }); const nx = BC.ranks.find((x) => x[0] > n); return { n, name: r[1], next: nx }; }
function bcStreak() { let n = 0; const d = new Date(); if (!bcV('d:' + dk(d), null)) d.setDate(d.getDate() - 1); while (bcV('d:' + dk(d), null)) { n++; d.setDate(d.getDate() - 1); } return n; }
function bcNextLesson(tr) { for (const m of bcTrack(tr || 'biz')) { if (!bcOpen(m)) return null; const c = m.cards.find((x) => !bcV('l:' + x, null)); if (c) return { m, c }; } return null; }
function bcWeak() { return Object.keys(BC.cardMod).filter((id) => bcV('x:' + id, 0) > 0).sort((a, b) => bcV('x:' + b, 0) - bcV('x:' + a, 0)); }
function bcDueCards() { const t = dk(new Date()); return Object.keys(BC.cardMod).filter((id) => bcV('l:' + id, null) && S.cards && S.cards[id] && S.cards[id].due <= t); }

/* ── question generators ── */
const bcShuf = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bcPick = (a, n) => bcShuf(a).slice(0, n);
const bcTxt = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const bcFirst = (s) => { const t = bcTxt(s); const m = t.match(/^.{25,220}?[.!?](\s|$)/); return m ? m[0].trim() : t.slice(0, 200); };
function bcMcq(cid, kind, q, right, wrongs, w, ctx) { const o = bcShuf([right].concat(wrongs.filter((x) => x && x !== right).slice(0, 3))); if (o.length < 2) return null; return { t: 'mcq', kind, cid, q, o, a: o.indexOf(right), w, ctx }; }
function bcGen(c, pool, kinds) {
  const others = (f) => pool.filter((x) => x.id !== c.id).map(f).filter(Boolean);
  const v = c.vis || {}, G = [];
  G.push(['which', () => bcMcq(c.id, 'Which idea?', `Which idea is this: “${bcFirst(c.plain || c.hook)}”`, c.t, bcPick(others((x) => x.t), 3), bcTxt(c.hook))]);
  if (c.trap) G.push(['trap', () => bcMcq(c.id, 'Spot the trap', `What's the trap in “${c.t}”?`, bcTxt(c.trap), bcPick(others((x) => bcTxt(x.trap)), 3), bcTxt(c.memo || c.hook))]);
  if (c.move) G.push(['move', () => bcMcq(c.id, 'Apply it', `Which move applies “${c.t}” to Caregiver Bench?`, bcTxt(c.move), bcPick(others((x) => bcTxt(x.move)), 3), bcTxt(c.hook))]);
  if (c.memo) G.push(['memo', () => bcMcq(c.id, 'Memory line', `Which memory line belongs to “${c.t}”?`, bcTxt(c.memo), bcPick(others((x) => bcTxt(x.memo)), 3), bcTxt(c.hook))]);
  const seq = v.type === 'flow' ? v.steps.map((x) => x[0]) : v.type === 'ladder' ? v.rungs.map((x) => x[0]) : v.type === 'funnel' ? v.rows.map((x) => x[0]) : v.type === 'acro' && v.items.every((x) => /^[A-Z]$/.test(x[0])) ? v.items.map((x) => x[1]) : null;
  if (seq && seq.length >= 3 && seq.length <= 7 && new Set(seq).size === seq.length) G.push(['order', () => ({ t: 'order', kind: 'Put it in order', cid: c.id, q: `${c.t}: tap the steps in the right order.`, items: seq, w: seq.join(' → ') })]);
  if (v.type === 'acro' && v.items.length >= 3) G.push(['acro', () => { const it = bcPick(v.items, 1)[0]; return bcMcq(c.id, 'Match it', `In “${c.t}”, which one means: “${it[2] || it[1]}”?`, it[1], v.items.filter((x) => x !== it).map((x) => x[1]), `${it[0]} · ${it[1]}: ${it[2] || ''}`); }]);
  if (v.type === 'vs') G.push(['vs', () => { const side = Math.random() < 0.5 ? v.a : v.b, s = bcPick(side.slice(1), 1)[0]; if (!s) return null; return { t: 'mcq', kind: 'Which side?', cid: c.id, q: `${c.t}: which side does “${s}” belong to?`, o: [v.a[0], v.b[0]], a: side === v.a ? 0 : 1, w: `${v.a[0]}: ${v.a.slice(1).join(', ')}. ${v.b[0]}: ${v.b.slice(1).join(', ')}.` }; }]);
  if (v.type === 'eq') G.push(['eq', () => { const top = Math.random() < 0.5, it = bcPick(top ? v.top : v.bottom, 1)[0]; return { t: 'mcq', kind: 'The formula', cid: c.id, q: `${v.title || c.t}: to raise ${v.lhs[0].toLowerCase()}, what do you do with “${it[0]}”?`, o: ['Push it up', 'Push it toward zero'], a: top ? 0 : 1, w: `Top: ${v.top.map((x) => x[0]).join(' × ')}. Bottom: ${v.bottom.map((x) => x[0]).join(' × ')}.` }; }]);
  if (v.type === 'grid') G.push(['grid', () => { const i = Math.floor(Math.random() * 4), xs = v.x[i % 2], ys = v.y[i < 2 ? 0 : 1]; return bcMcq(c.id, 'The 2×2', `${c.t}: ${ys} + ${xs} = ?`, v.cells[i][0], v.cells.filter((_, j) => j !== i).map((x) => x[0]), `${v.cells[i][0]}: ${v.cells[i][1]}`); }]);
  if ((c.q || []).length) G.push(['self', () => { const x = bcPick(c.q, 1)[0]; return { t: 'self', kind: 'Say it out loud', cid: c.id, q: x[0], ans: x[1] }; }]);
  const use = G.filter((g) => !kinds || kinds.includes(g[0]));
  for (const g of bcShuf(use)) { const q = g[1](); if (q) return q; }
  return null;
}
function bcScen(mid) { return ((BC.sc || {})[mid] || []).map((s) => bcMcq(s.a, 'Scenario', s.s, XC.byId[s.a].t, s.o.map((x) => XC.byId[x].t), s.w)).filter(Boolean); }
function bcRisk(mid) { return (BC.risk || []).filter((r) => !mid || r.m === mid).map((r) => ({ t: 'mcq', kind: '⛔ Red line', cid: null, q: r.s, o: r.o.slice(), a: r.a, w: r.w, crit: 1 })).map((q) => { const right = q.o[q.a], o = bcShuf(q.o); return Object.assign(q, { o, a: o.indexOf(right) }); }); }
function bcSpot(mid) { return (BC.spot || []).filter((s) => s.m === mid).map((s) => ({ t: 'mcq', kind: "What's wrong?", cid: null, q: s.s, o: s.o, a: s.a, w: s.o[s.a] })); }
/* number drills: the maths the courses expect you to do in your head */
function bcNum(kind) {
  const P = (a) => a[Math.floor(Math.random() * a.length)], money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const opts = (right, fmt, spread) => { const s = new Set([fmt(right)]); let g = 0; while (s.size < 4 && g++ < 40) s.add(fmt(right * P(spread))); const o = bcShuf([...s]); return { o, a: o.indexOf(fmt(right)) }; };
  const K = kind || P(['ltgp', 'gm', 'pay', 'r100']);
  if (K === 'ltgp') { const p = P([2500, 6000]), gm = P([0.7, 0.8, 0.85]), mo = P([6, 9, 12]), cac = P([1500, 2500, 4000]), r = (p * gm * mo) / cac, f = (x) => x.toFixed(1) + ' : 1', x = opts(r, f, [0.5, 0.7, 1.4, 2, 0.33]); return { t: 'mcq', kind: 'Numbers', cid: 'mm-ltgp', q: `An agency pays ${money(p)} every 4 weeks at ${Math.round(gm * 100)}% gross margin and stays ${mo} cycles. It cost ${money(cac)} to win them. LTGP : CAC?`, o: x.o, a: x.a, w: `LTGP = ${money(p)} × ${gm} × ${mo} = ${money(p * gm * mo)}. ÷ ${money(cac)} = ${f(r)}. ${r >= 3 ? 'Above 3 : 1, healthy.' : 'Below 3 : 1, fix price, retention or CAC.'}` }; }
  if (K === 'gm') { const p = P([2500, 1500, 6000]), c = P([200, 400, 600, 900]), r = (p - c) / p * 100, f = (x) => Math.round(x) + '%', x = opts(r, f, [0.7, 0.85, 1.1, 0.6]); return { t: 'mcq', kind: 'Numbers', cid: 'mm-gm', q: `You charge ${money(p)} and it costs you ${money(c)} to deliver (ads, screening, your time paid out). Gross margin?`, o: x.o, a: x.a, w: `(${money(p)} − ${money(c)}) ÷ ${money(p)} = ${f(r)}. Service businesses aim for 80%+.` }; }
  if (K === 'pay') { const p = P([2500, 6000]), gm = P([0.8, 0.85]), cac = P([600, 1000, 1500, 2500, 4000]), gp = p * gm, lv = gp > 2 * cac ? 2 : gp > cac ? 1 : 0, L = ['No: you fund it from your own pocket', 'Yes: level 2, 30-day profit > CAC', 'Yes, level 3: 30-day profit > 2× CAC, money stops being a limit']; return { t: 'mcq', kind: 'Numbers', cid: 'mm-payback', q: `First 4 weeks: ${money(p)} at ${Math.round(gm * 100)}% margin. CAC ${money(cac)}. Do clients pay for their own acquisition?`, o: L, a: lv, w: `30-day gross profit = ${money(gp)} vs CAC ${money(cac)}.` }; }
  const d = P([50, 80, 100]), cn = P([0.08, 0.1, 0.15]), cv = P([0.3, 0.4]), st = P([0.2, 0.25]), r = Math.round(d * 5 * cn * cv * st * 10) / 10, f = (x) => (Math.round(x * 10) / 10) + ' sets', x = opts(r, f, [0.5, 2, 1.5, 0.7]);
  return { t: 'mcq', kind: 'Numbers', cid: 'ld-rule100', q: `${d} dials a day, 5 days. ${Math.round(cn * 100)}% connect, ${Math.round(cv * 100)}% of connects become real conversations, ${Math.round(st * 100)}% of conversations book a call. Booked calls per week?`, o: x.o, a: x.a, w: `${d * 5} × ${cn} × ${cv} × ${st} = ${r}. Volume is linear: double the dials, double the sets.` };
}
function bcCardsOf(m) { return m.cards.map((id) => XC.byId[id]).filter(Boolean); }
function bcBoss(m, test) {
  const pool = bcCardsOf(m), qs = [].concat(bcScen(m.id), bcSpot(m.id)), risk = bcRisk(m.id);
  for (const c of bcShuf(pool)) { if (qs.length >= (test ? 14 : 11)) break; const q = bcGen(c, pool, ['which', 'trap', 'move', 'order', 'acro', 'vs', 'eq', 'grid']); if (q) qs.push(q); }
  if (m.id === 'm3') qs.push(bcNum('r100')); if (m.id === 'm7') qs.push(bcNum('ltgp'), bcNum('gm'), bcNum('pay'));
  const prev = bcTrack(m.tr).slice(0, m.k).flatMap(bcCardsOf), all = prev.length ? prev : pool;
  bcPick(prev, Math.min(2, prev.length)).forEach((c) => { const q = bcGen(c, all, ['which', 'trap', 'move', 'order', 'vs', 'eq']); if (q) { q.kind += ' · from earlier'; qs.push(q); } });
  return bcShuf(bcShuf(qs).slice(0, (test ? 15 : 13) - risk.length).concat(risk));
}

/* ── screens ── */
function bcBlur() { const a = document.activeElement; if (a && a.blur && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur(); }
function bcGo(scr, extra) { bcBlur(); bcS = Object.assign({ scr }, extra || {}); render(); window.scrollTo(0, 0); }
function bcHead(t, sub, back) { return `<div class="bc-hd">${back ? `<button class="bc-back" onclick="${back}">‹</button>` : ''}<div><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`; }
function bcMap() {
  return `<div class="card bc-map"><div class="aq-t">The map <span>each square is one idea · tap it</span></div>
    ${BC.modules.map((m) => `${m.k === 0 ? `<div class="bc-trk">${m.tr === 'life' ? 'Life track' : 'Business track'}</div>` : ''}<div class="bc-row ${bcOpen(m) ? '' : 'lock'}"><button class="bc-rl" onclick="bcGo('mod',{m:'${m.id}'})"><u>${bcNo(m)}</u>${esc(m.n)}${bcCleared(m) ? ' <i>✓</i>' : ''}</button><div class="bc-cells">${m.cards.map((id) => `<button class="r${bcRung(id)}" title="${esc((XC.byId[id] || {}).t || id)} · ${BC_RUNG[bcRung(id)][0]}" onclick="xcOpen('${id}')"></button>`).join('')}</div></div>`).join('')}
    <div class="bc-leg">${BC_RUNG.slice(1).map((r, i) => `<span><i class="r${i + 1}"></i>${r[0]}</span>`).join('')}</div></div>`;
}
function bcChain() {
  const ids = Object.keys(BC.cardMod), n = [1, 2, 3, 4, 5].map((k) => ids.filter((id) => bcRung(id) >= k).length);
  return `<div class="bc-chain">${BC_RUNG.slice(1).map((r, i) => `<div><b>${n[i]}</b><span>${r[0]}</span><em>${r[1]}</em></div>`).join('<i>›</i>')}</div>`;
}
function bcHome() {
  const rk = bcRank(), nb = bcNextLesson('biz'), nl = bcNextLesson('life'), due = bcDueCards(), st = bcStreak(), total = Object.keys(BC.cardMod).length, learned = Object.keys(BC.cardMod).filter((id) => bcV('l:' + id, null)).length;
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); const o = bcV('d:' + dk(d), null); return `<i class="${o ? 'on' : ''}" title="${dk(d)}"></i>`; }).join('');
  const biz = bcTrack('biz'), allClear = biz.every(bcCleared), fx = bcV('fx', null), gb = bcGate('biz'), gl = bcGate('life');
  const lessonBtn = (n, tr, g, num) => {
    if (!n) { const m = bcTrack(tr).find((x) => !bcCleared(x) && bcOpen(x)); return m ? `<button class="bc-big boss" onclick="bcQuizStart('boss','${m.id}')"><b>⚔ Boss fight: ${esc(m.n)}</b><span>all lessons done · 80% to clear and open the next module</span></button>` : ''; }
    const c = XC.byId[n.c], lab = tr === 'life' ? 'Life' : 'Business';
    if (!g.ok) return `<div class="bc-big lockd"><b>🔒 ${lab}: next lesson is earned by dials</b><span>${g.d}/${BC_DIAL_GATE} dials today. One lesson per track a day is free; the next one is paid for in dials. Learning never replaces the work.</span></div>`;
    return `<button class="bc-big ${tr === 'life' ? 'life' : ''}" onclick="bcLesson('${n.c}')"><b>${num} · ${lab}: ${esc(c.t)}</b><span>${g.done ? "bonus lesson, earned with today's dials · " : ''}Module ${bcNo(n.m)} · ${esc(n.m.n)} · ${tr === 'life' ? 'use it today' : "use it on tonight's calls"}</span></button>`;
  };
  return `${bcHead('Bootcamp', 'Zero to operator: every course, every mentor and your life library, in the order your business needs it. Learn it, then use it the same day.')}
    <div class="card bc-hero"><div class="bc-rank"><span>Rank</span><b>${rk.name}</b><em>${rk.n}/${BC.modules.length} modules cleared${rk.next ? ` · ${rk.next[1]} at ${rk.next[0]}` : ''}</em></div>
      <div class="bc-stat"><b>${learned}<small>/${total}</small></b><span>ideas learned</span></div><div class="bc-stat"><b>${st}</b><span>day streak</span></div>
      <div class="bc-days">${days}</div></div>
    <div class="card bc-today"><div class="aq-t">Today's session <span>about 20 minutes</span></div>
      ${due.length ? `<button class="bc-big alt" onclick="bcReviewStart()"><b>1 · Warm-up: ${Math.min(due.length, 6)} quick questions</b><span>ideas due for review · retrieval, not rereading</span></button>` : `<div class="bc-ok">✓ No reviews due</div>`}
      ${lessonBtn(nb, 'biz', gb, due.length ? 2 : 1)}
      ${lessonBtn(nl, 'life', gl, due.length ? 3 : 2)}
      ${allClear ? `<button class="bc-big boss" onclick="bcQuizStart('final')"><b>🏁 Final exam · Business</b><span>${fx ? `best ${fx.best}%${fx.pass ? ' · certified ' + fx.at : ''}` : '30 questions from everything · 85% to certify'}</span></button>` : ''}
      <div class="bc-two"><button class="bc-big ghost" onclick="bcQuizStart('drill')"><b>Mixed drill</b><span>10 questions, shuffled across everything open</span></button><button class="bc-big ghost" onclick="bcQuizStart('mini')"><b>⚡ Short day: 10 min</b><span>3 reviews + 1 hard scenario. Never zero.</span></button></div>
      ${bcWeak().length ? `<button class="bc-big alt" onclick="bcQuizStart('weak')"><b>Weak spots · ${Math.min(8, bcWeak().length)} ideas</b><span>the ideas you've missed most: ${bcWeak().slice(0, 3).map((id) => esc(XC.byId[id].t)).join(', ')}</span></button>` : ''}
      <button class="bc-big sim" onclick="bcGo('sim')"><b>🎙 Owner simulator</b><span>AI plays a Tampa agency owner. You reply. Then you get graded against the cards.</span></button></div>
    ${bcMisCard(bcV('mis', null), 'mis')}${bcMisCard(bcV('misL', null), 'misL')}
    <div class="card"><div class="aq-t">How an idea becomes yours</div>${bcChain()}</div>
    ${bcMap()}
    <div class="card"><div class="aq-t">Business track <span>courses + sales mentors + your market</span></div><div class="bc-mods">${biz.map(bcModBtn).join('')}</div></div>
    <div class="card"><div class="aq-t">Life track <span>sleep, habits, study, body, tennis, people, mind</span></div><div class="bc-mods">${bcTrack('life').map(bcModBtn).join('')}</div></div>
    <div class="aq-note">How it works: each lesson is about 8 minutes. Every day: one Business lesson (use it on tonight's calls) and one Life lesson (use it today). More lessons unlock after ${BC_DIAL_GATE} dials. A module opens when you beat the boss fight of the one before (80%); already know it? Test out (90%). Wrong answers come back in tomorrow's warm-up. Paraphrased study notes, not quotes; health and money notes are educational, not medical or financial advice.</div>`;
}
function bcModBtn(m) {
  const o = bcOpen(m), L = bcLearned(m), b = bcV('b:' + m.id, null), p = bcV('p:' + m.id, null);
  return `<button class="bc-mod ${o ? '' : 'lock'} ${bcCleared(m) ? 'clr' : ''} ${m.tr}" onclick="bcGo('mod',{m:'${m.id}'})"><u>${bcNo(m)}</u><span><b>${esc(m.n)}</b><em>${o ? `${L}/${m.cards.length} lessons${b ? ` · boss best ${b.best}%` : ''}${p ? ' · proven for real' : ''}` : '🔒 beat the boss of module ' + bcNo(bcPrev(m))}</em></span><i style="--p:${Math.round(L / m.cards.length * 100)}%"></i></button>`;
}
function bcMod(mid) {
  const m = BC.mod[mid]; if (!m) return bcHome(); const o = bcOpen(m), L = bcLearned(m), all = L === m.cards.length, b = bcV('b:' + m.id, null), p = bcV('p:' + m.id, null);
  return `${bcHead(`${bcNo(m)} · ${esc(m.n)}`, esc(m.why), "bcGo('home')")}
    ${o ? '' : `<div class="aq-lock"><b>Locked</b><span>Beat the boss of module ${bcNo(bcPrev(m))} (“${esc(bcPrev(m).n)}”) to open this. You can still look at each card.</span></div>`}
    <div class="card"><div class="aq-t">The job this module trains <span>${m.tr === 'life' ? 'prove it in your day' : 'prove it on a real call'}</span></div><div class="aq-line">${esc(m.job)}</div>
      ${p ? `<div class="bc-ok">✓ Proven ${esc(p.at)}${p.note ? ': ' + esc(p.note) : ''}</div>` : `<textarea class="aq-in" id="bc-pn" placeholder="What happened when you did it?"></textarea><button class="btn sm" onclick="bcProve('${m.id}')">${m.tr === 'life' ? 'Did it for real' : 'Did it on a real call'}</button>`}</div>
    <div class="card"><div class="aq-t">Lessons <span>${L}/${m.cards.length}</span></div><div class="bc-ls">${m.cards.map((id, i) => { const c = XC.byId[id], r = bcRung(id), done = !!bcV('l:' + id, null), nxt = o && !done && m.cards.slice(0, i).every((x) => bcV('l:' + x, null)); return `<button class="bc-l ${done ? 'done' : ''} ${nxt ? 'nx' : ''}" onclick="${o ? `bcLesson('${id}')` : `xcOpen('${id}')`}"><i class="r${r}"></i><span><b>${esc(c.t)}</b><em>${esc(c.who || XC_COURSES[c.c] || '')} · ${BC_RUNG[r][0]}${(c.clip || []).length ? ' · ▶ ' + c.clip.length : ''}</em></span>${nxt ? '<u>next</u>' : ''}</button>`; }).join('')}</div></div>
    ${o ? `<div class="card bc-bossc"><div class="aq-t">Boss fight</div><div class="aq-line">${all ? 'All lessons done. 13 questions: scenarios, script mistakes, order the steps, plus 2 from earlier modules.' : `Finish the lessons, or test out now if you already know this (15 questions, 90%).`}</div>
      ${b ? `<div class="aq-note">Best ${b.best}% · ${b.pass ? 'cleared ' + esc(b.at) : 'not cleared yet'}</div>` : ''}
      <button class="btn ${all ? 'primary' : ''} block" onclick="bcQuizStart('${all ? 'boss' : 'test'}','${m.id}')">${all ? '⚔ Start the boss fight' : 'Test out of this module'}</button></div>` : ''}`;
}
function bcProve(mid) { const n = (document.getElementById('bc-pn') || {}).value || ''; if (!n.trim()) { toast('Write one line about what happened first'); return; } bcBlur(); bcW('p:' + mid, { at: dk(new Date()), note: n.trim() }); toast('Proven. That is the point of all this.'); render(); }

/* ── lesson stepper ── */
const BC_STEPS = [['predict', 'Predict'], ['learn', 'Learn'], ['watch', 'Watch'], ['recall', 'Recall'], ['use', 'Use']];
function bcLesson(id) { const c = XC.byId[id]; if (!c) return; if (!bcV('l:' + id, null)) { const g = bcGate(BC.mod[BC.cardMod[id]].tr); if (!g.ok) { toast(`Earned by dials: ${g.d}/${BC_DIAL_GATE} today. Dial first, then learn.`); return; } } const pool = bcCardsOf(BC.mod[BC.cardMod[id]]); bcGo('lesson', { id, st: 0, pq: bcGen(c, pool.length > 3 ? pool : XC.cards, ['order', 'vs', 'eq', 'grid', 'acro', 'trap', 'move']), pick: null, ord: [] }); }
function bcSteps(c) { return BC_STEPS.filter((s) => s[0] !== 'watch' || (c.clip || []).length); }
function bcLessonHtml() {
  const c = XC.byId[bcS.id], m = BC.mod[BC.cardMod[c.id]], steps = bcSteps(c), s = steps[bcS.st][0];
  const bar = `<div class="bc-steps">${steps.map((x, i) => `<span class="${i < bcS.st ? 'done' : i === bcS.st ? 'on' : ''}">${x[1]}</span>`).join('')}</div>`;
  const next = (lab) => `<button class="btn primary block" onclick="bcS.st++;render();window.scrollTo(0,0)">${lab || 'Next ›'}</button>`;
  let body = '';
  if (s === 'predict') body = `<div class="card"><div class="aq-t">Predict first <span>guessing before you learn makes it stick, even when you're wrong</span></div>${bcS.pq ? bcQHtml(bcS.pq, 'lp') : '<div class="aq-line">What do you think this idea says? Guess in one sentence, out loud.</div>'}</div>${bcS.pq && bcS.pick == null && bcS.pq.t !== 'self' ? '<button class="btn ghost block" onclick="bcS.st++;render()">Skip the guess</button>' : next()}`;
  if (s === 'learn') body = `<div class="card bc-learn xc-card"><div class="xc-hook">${pbInline(c.hook)}</div>${xcVis(c.vis)}
      ${[['In plain words', c.plain], ['Picture it', c.analogy], ['Worked example', c.ex], ['The trap', c.trap]].filter((x) => x[1]).map((x) => `<div class="xc-s"><div class="xc-l">${x[0]}</div><div class="xc-b">${pbInline(x[1])}</div></div>`).join('')}
      ${c.lesson ? `<a class="xc-lesson" href="${esc(c.lesson[0])}" target="_blank" rel="noopener"><i>🎓</i><span><b>Full course lesson: ${esc(c.lesson[1])}</b><em>free on acquisition.com</em></span></a>` : ''}</div>${next()}`;
  if (s === 'watch') body = `<div class="card"><div class="aq-t">Watch him explain it <span>${c.clip.length} clip${c.clip.length > 1 ? 's' : ''} · 1–4 min each</span></div><div class="xc-clips">${c.clip.map((x) => xcClipBtn(x[0], x[1], x[2], x[3])).join('')}</div></div>${next()}`;
  if (s === 'recall') body = `<div class="card"><div class="aq-t">Closed book <span>no scrolling up</span></div><div class="aq-line">In your own words: what is “${esc(c.t)}”, and when would it help you on a call?</div>
      <textarea class="aq-in bc-rc" id="bc-rc" placeholder="Write it, or say it out loud and type a few words">${esc(bcS.rc || '')}</textarea>
      ${bcS.show ? `<div class="bc-cmp"><span>Compare</span><div class="xc-hook">${pbInline(c.hook)}</div>${c.memo ? `<div class="xc-memo"><span>Lock it in</span><b>${pbInline(c.memo)}</b></div>` : ''}${(c.q || []).map((x) => `<div class="bc-qa"><b>${esc(x[0])}</b><span>${pbInline(x[1])}</span></div>`).join('')}</div>
        <div class="bc-grade"><button class="btn sm" onclick="bcGrade(0)">Missed it</button><button class="btn sm" onclick="bcGrade(1)">Partly</button><button class="btn sm primary" onclick="bcGrade(2)">Nailed it</button></div>`
      : `<button class="btn primary block" onclick="bcS.rc=(document.getElementById('bc-rc')||{}).value;bcBlur();bcS.show=1;render()">Compare with the card</button>`}</div>`;
  if (s === 'use') { const L = m.tr === 'life'; body = `<div class="card"><div class="aq-t">Use it <span>${L ? 'knowledge only counts once it changes your day' : 'knowledge only counts once it changes a call'}</span></div><div class="xc-s move"><div class="xc-l">${L ? 'Your move · today' : 'Your move · Caregiver Bench'}</div><div class="xc-b">${pbInline(c.move || '')}</div></div>
      <textarea class="aq-in" id="bc-use" placeholder="${L ? 'Exactly what you will do today, and when' : "Exactly what you'll say or do on tonight's calls"}"></textarea>
      <div class="bc-grade"><button class="btn sm" onclick="bcFinish(0)">Finish lesson</button><button class="btn sm primary" onclick="bcFinish(1)">🎯 ${L ? "Today's mission" : 'Call mission'}</button></div></div>`; }
  return `${bcHead(esc(c.t), `Module ${bcNo(m)} · ${esc(m.n)} · lesson ${m.cards.indexOf(c.id) + 1}/${m.cards.length}`, `bcGo('mod',{m:'${m.id}'})`)}${bar}${body}`;
}
function bcGrade(r) { bcBlur(); bcS.r = r; bcSrs(bcS.id, r >= 1); bcS.st = Math.min(bcS.st + 1, bcSteps(XC.byId[bcS.id]).length - 1); render(); window.scrollTo(0, 0); }
function bcFinish(mission) {
  if (!bcS.id || !BC.cardMod[bcS.id]) { bcGo('home'); return; }
  const id = bcS.id, use = ((document.getElementById('bc-use') || {}).value || '').trim();
  bcW('l:' + id, { at: dk(new Date()), r: bcS.r != null ? bcS.r : 1, rc: (bcS.rc || '').slice(0, 600), use: use.slice(0, 400) });
  if (!(S.cards || {})[id]) bcSrs(id, true);
  const mk = BC.mod[BC.cardMod[id]].tr === 'life' ? 'misL' : 'mis'; if (mission) bcW(mk, { id, at: dk(new Date()), say: use.slice(0, 300) });
  bcDay('l'); save();
  const m = BC.mod[BC.cardMod[id]];
  toast(mission ? (mk === 'misL' ? '🎯 Mission set: it shows on your Day screen' : '🎯 Mission set: it shows on the Dial screen tonight') : 'Lesson done');
  if (m.cards.every((x) => bcV('l:' + x, null)) && !bcCleared(m)) bcGo('mod', { m: m.id }); else bcGo('home');
}

/* ── field mission ── */
function bcMisCard(mis, k) {
  k = k || 'mis'; const c = mis && XC.byId[mis.id]; if (!c) return ''; const L = k === 'misL';
  return `<div class="card bc-mis ${L ? 'life' : ''}"><div class="aq-t">🎯 ${L ? "Today's mission" : 'Call mission'} <span>set ${esc(mis.at)}</span></div><b>${esc(c.t)}</b><div class="aq-note">${esc(mis.say || bcTxt(c.move))}</div>
    <div class="bc-grade"><button class="btn sm" onclick="xcOpen('${c.id}')">Open the card</button><button class="btn sm" onclick="bcW('${k}',null);render()">Drop it</button><button class="btn sm primary" onclick="bcUsed('${k}')">${L ? 'Did it ✓' : 'Used it on a call ✓'}</button></div></div>`;
}
let bcUK = 'mis';
function bcUsed(k) {
  bcUK = k || 'mis'; const mis = bcV(bcUK, null); if (!mis) return; const c = XC.byId[mis.id], L = bcUK === 'misL';
  openModal(`<div class="bc-modal"><div class="aq-t">${L ? 'Did it' : 'Used it'}: ${esc(c.t)}</div><div class="aq-line">What happened? One line is enough. This is your proof, and you will learn more from it than from the card.</div>${L ? '' : `<div class="bc-two"><label class="aq-lb">Calls you tried it on<input class="aq-in" id="bc-ut" type="number" min="0" inputmode="numeric"></label><label class="aq-lb">Moved the call forward<input class="aq-in" id="bc-uf" type="number" min="0" inputmode="numeric"></label></div>`}<textarea class="aq-in" id="bc-un" placeholder="${L ? 'What I did… what changed…' : 'Owner said… I said… result… what I would change'}"></textarea><button class="btn primary block" onclick="bcUsedSave()">Save</button></div>`);
}
function bcUsedSave() { const mis = bcV(bcUK, null), n = ((document.getElementById('bc-un') || {}).value || '').trim(); if (!mis) return; const u = bcV('u:' + mis.id, null) || { n: 0, log: [] }; u.n++; const nt = Number((document.getElementById('bc-ut') || {}).value) || 0, nf = Number((document.getElementById('bc-uf') || {}).value) || 0; u.tried = (u.tried || 0) + nt; u.fwd = (u.fwd || 0) + nf; u.log = (u.log || []).concat([{ at: dk(new Date()), note: n, tried: nt, fwd: nf }]).slice(-5); bcW('u:' + mis.id, u); bcW(bcUK, null); bcDay('q'); closeModal(); toast('Logged. That idea is now Used.'); render(); }

/* ── quizzes: review warm-up, drill, boss, test-out, final ── */
function bcReviewStart() { const due = bcPick(bcDueCards(), 6); if (!due.length) { toast('Nothing due'); return; } const qs = due.map((id) => { const c = XC.byId[id]; return bcGen(c, bcCardsOf(BC.mod[BC.cardMod[id]]), null); }).filter(Boolean); bcGo('quiz', { mode: 'review', qs, i: 0, ok: 0, pick: null, ord: [], wrong: [] }); }
function bcQuizStart(mode, mid) {
  let qs = [];
  if (mode === 'boss' || mode === 'test') qs = bcBoss(BC.mod[mid], mode === 'test');
  else if (mode === 'drill') { const ids = Object.keys(BC.cardMod).filter((id) => bcOpen(BC.mod[BC.cardMod[id]])), pool = ids.map((x) => XC.byId[x]); qs = bcPick(pool, 9).map((c) => bcGen(c, pool, null)).filter(Boolean); if (bcOpen(BC.mod.m7) || Math.random() < 0.5) qs.push(bcNum()); qs = bcShuf(qs).slice(0, 10); }
  else if (mode === 'final') { bcTrack('biz').forEach((m) => { qs.push(...bcPick(bcScen(m.id), 1)); bcPick(bcCardsOf(m), 2).forEach((c) => { const q = bcGen(c, XC.cards, ['which', 'trap', 'move', 'order', 'vs', 'eq', 'grid', 'acro']); if (q) qs.push(q); }); }); qs.push(...bcPick(bcSpot('m6'), 2), bcNum('ltgp'), bcNum('pay')); qs = bcShuf(bcShuf(qs).slice(0, 27).concat(bcPick(bcRisk(), 3))); }
  else if (mode === 'weak') { const w = bcWeak().slice(0, 8); qs = w.map((id) => bcGen(XC.byId[id], bcCardsOf(BC.mod[BC.cardMod[id]]), null)).filter(Boolean); }
  else if (mode === 'mini') { qs = bcPick(bcDueCards(), 3).map((id) => bcGen(XC.byId[id], bcCardsOf(BC.mod[BC.cardMod[id]]), null)).filter(Boolean); const m = bcTrack('biz').filter(bcOpen).pop(); qs.push(...bcPick(bcScen(m.id).concat(bcSpot(m.id), bcRisk(m.id)), 4 - qs.length > 1 ? 4 - qs.length : 1)); }
  if (!qs.length) { toast('Open a lesson first'); return; }
  bcGo('quiz', { mode, mid, qs, i: 0, ok: 0, pick: null, ord: [], wrong: [], crit: 0 });
}
function bcQHtml(q, ns) {
  const done = bcS.pick != null;
  const ctx = `<div class="bc-kind">${esc(q.kind)}</div><div class="bc-q">${esc(q.q)}</div>`;
  if (q.t === 'mcq') return `${ctx}<div class="bc-opts">${q.o.map((o, i) => `<button class="${done ? (i === q.a ? 'ok' : i === bcS.pick ? 'bad' : 'dim') : ''}" ${done ? 'disabled' : `onclick="bcAns(${i},'${ns}')"`}>${esc(o)}</button>`).join('')}</div>${done ? bcWhy(q, bcS.pick === q.a) : ''}`;
  if (q.t === 'order') { const ord = bcS.ord || [], left = q.sh || (q.sh = bcShuf(q.items)); return `${ctx}<div class="bc-ord">${ord.map((x, i) => `<span class="${done ? (x === q.items[i] ? 'ok' : 'bad') : ''}"><u>${i + 1}</u>${esc(x)}</span>`).join('')}</div>${done ? '' : `<div class="bc-opts row">${left.filter((x) => !ord.includes(x)).map((x) => `<button onclick="bcOrd(${JSON.stringify(x).replace(/"/g, '&quot;')},'${ns}')">${esc(x)}</button>`).join('')}</div>${ord.length ? `<button class="btn sm ghost" onclick="bcS.ord=[];render()">Reset</button>` : ''}`}${done ? bcWhy(q, bcS.pick === 1) : ''}`; }
  if (q.t === 'self') return `${ctx}<div class="aq-note">Say it out loud first, then reveal.</div>${bcS.rev ? `<div class="bc-cmp"><span>Answer</span><div>${pbInline(q.ans)}</div></div>${done ? '' : `<div class="bc-grade"><button class="btn sm" onclick="bcAns(0,'${ns}',1)">Missed</button><button class="btn sm primary" onclick="bcAns(1,'${ns}',1)">Got it</button></div>`}` : `<button class="btn block" onclick="bcS.rev=1;render()">Reveal</button>`}`;
  return '';
}
function bcWhy(q, ok) { return `<div class="bc-why ${ok ? 'ok' : 'bad'}"><b>${ok ? 'Right.' : 'Not quite.'}</b> ${esc(q.w || '')}${q.cid && XC.byId[q.cid] ? ` <a onclick="xcOpen('${q.cid}')">Open “${esc(XC.byId[q.cid].t)}” ›</a>` : ''}</div>`; }
function bcOrd(x, ns) { bcS.ord = (bcS.ord || []).concat([x]); const q = ns === 'lp' ? bcS.pq : bcS.qs[bcS.i]; if (bcS.ord.length === q.items.length) { const ok = bcS.ord.every((y, i) => y === q.items[i]); bcAns(ok ? 1 : 0, ns, 2); return; } render(); }
function bcAns(i, ns, kind) {
  const q = ns === 'lp' ? bcS.pq : bcS.qs[bcS.i]; let ok;
  if (kind) { ok = i === 1; q.a = 1; } else ok = i === q.a;
  bcS.pick = i;
  if (ns !== 'lp') { if (ok) bcS.ok++; else { bcS.wrong.push(q); if (q.crit) bcS.crit = 1; } if (q.cid && BC.cardMod[q.cid]) { const x = bcV('x:' + q.cid, 0); if (!ok) bcW('x:' + q.cid, x + 1); else if (x && (bcS.mode === 'weak' || bcS.mode === 'review')) bcW('x:' + q.cid, x - 1); } bcDay('q'); if (q.cid && BC.cardMod[q.cid]) { if (ok && /Scenario|What's wrong|Numbers/.test(q.kind)) bcW('j:' + q.cid, bcV('j:' + q.cid, 0) + 1); if (bcV('l:' + q.cid, null) && (bcS.mode === 'review' || !ok)) bcSrs(q.cid, ok); } save(); }
  render();
}
function bcNextQ() { bcS.i++; bcS.pick = null; bcS.ord = []; bcS.rev = 0; if (bcS.i >= bcS.qs.length) bcQuizEnd(); else { render(); window.scrollTo(0, 0); } }
function bcQuizEnd() {
  const pct = Math.round(bcS.ok / bcS.qs.length * 100), mode = bcS.mode, m = bcS.mid ? BC.mod[bcS.mid] : null, need = mode === 'test' ? 90 : mode === 'final' ? 85 : 80;
  let pass = null;
  if (m && (mode === 'boss' || mode === 'test')) { const b = bcV('b:' + m.id, null) || { best: 0 }; pass = pct >= need && !bcS.crit; bcW('b:' + m.id, { best: Math.max(b.best || 0, pct), pass: !!(b.pass || pass), at: pass && !b.pass ? dk(new Date()) : b.at || null }); }
  if (mode === 'final') { const f = bcV('fx', null) || { best: 0 }; pass = pct >= need && !bcS.crit; bcW('fx', { best: Math.max(f.best, pct), pass: !!(f.pass || pass), at: pass && !f.pass ? dk(new Date()) : f.at || null }); }
  bcS = Object.assign(bcS, { scr: 'end', pct, pass, need }); render(); window.scrollTo(0, 0);
}
function bcQuizHtml() {
  const q = bcS.qs[bcS.i], T = { mini: '⚡ 10-minute session', weak: 'Weak spots', review: 'Warm-up', drill: 'Mixed drill', boss: '⚔ Boss fight', test: 'Test out', final: '🏁 Final exam' }[bcS.mode];
  return `${bcHead(T + (bcS.mid ? ': ' + esc(BC.mod[bcS.mid].n) : ''), `Question ${bcS.i + 1} of ${bcS.qs.length} · ${bcS.ok} right so far`, "bcGo('home')")}
    <div class="bc-prog"><i style="width:${(bcS.i / bcS.qs.length) * 100}%"></i></div>
    <div class="card bc-qc">${bcQHtml(q, 'qz')}</div>${bcS.pick != null ? `<button class="btn primary block" onclick="bcNextQ()">${bcS.i + 1 >= bcS.qs.length ? 'See result' : 'Next ›'}</button>` : ''}`;
}
function bcEndHtml() {
  const m = bcS.mid ? BC.mod[bcS.mid] : null, nm = m && bcTrack(m.tr)[m.k + 1];
  const msg = bcS.pass === true ? (bcS.mode === 'final' ? 'Certified. You know the library. Now the calls decide.' : `Cleared. ${nm ? `Module ${bcNo(nm)} “${esc(nm.n)}” is open.` : m.tr === 'life' ? 'Life track complete.' : 'That was the last Business module: the final exam is open.'}`) : bcS.pass === false ? `Not yet: ${bcS.crit && bcS.pct >= bcS.need ? 'you crossed a red line (honesty or legal). That fails the test on its own, whatever the score.' : `you need ${bcS.need}%.`} The ideas you missed are in tomorrow's warm-up. Rerun any time.` : 'Done. Misses go back into your warm-ups.';
  return `${bcHead('Result', '', "bcGo('home')")}
    <div class="card bc-res ${bcS.pass ? 'pass' : bcS.pass === false ? 'fail' : ''}"><b>${bcS.pct}%</b><span>${bcS.ok}/${bcS.qs.length} right</span><div class="aq-line">${msg}</div></div>
    ${bcS.wrong.length ? `<div class="card"><div class="aq-t">Fix these <span>tap to open the card</span></div>${bcS.wrong.map((q) => `<div class="bc-wr"><b>${esc(q.q).slice(0, 160)}</b><span>${esc(q.t === 'mcq' ? q.o[q.a] : q.t === 'order' ? q.items.join(' → ') : q.ans || '')}</span>${q.cid && XC.byId[q.cid] ? `<a onclick="xcOpen('${q.cid}')">${esc(XC.byId[q.cid].t)} ›</a>` : ''}</div>`).join('')}</div>` : ''}
    <button class="btn primary block" onclick="bcGo('home')">Back to Bootcamp</button>${m ? `<button class="btn ghost block" onclick="bcQuizStart('${bcS.mode}','${m.id}')">Run it again</button>` : ''}`;
}


/* ── owner simulator: the AI plays an agency owner, then grades the call against the cards ── */
const BC_SIMS = [
  ['cold', 'Cold open: the owner just picks up', 'Sunshine Home Care, this is Linda.'],
  ['indeed', '"We already use Indeed and Facebook."', "We already post on Indeed and Facebook. We get applicants."],
  ['busy', '"I\'m busy, just email me."', "I'm in the middle of something. Just send me an email."],
  ['price', '"How much do you charge?"', 'Okay. How much is this going to cost me?'],
  ['recruiter', '"We have an in-house recruiter."', 'We have a recruiter in-house for that.'],
  ['urgent', '"I need someone by Monday."', "Honestly? I've got a case starting Monday and nobody to staff it."],
  ['burned', '"Staffing agencies burned us before."', "We tried a staffing company last year. Waste of money. Why would you be different?"]];
const BC_LVL = [['Friendly', 'friendly and open, gives longer answers'], ['Busy', 'busy and short, 1 sentence, wants to get off the phone'], ['Skeptical', 'skeptical, questions every claim, wants proof'], ['Tough', 'raises two or three objections in a row, tests him'], ['Real', 'realistic and unpredictable: mood shifts, interruptions, may hang up if he rambles or pitches too early']];
function bcSimStart(k, lvl) { const sc = BC_SIMS.find((x) => x[0] === k) || BC_SIMS[0]; bcGo('sim', { run: { k, lvl, log: [{ role: 'assistant', text: sc[2] }], busy: 0, fb: null } }); }
function bcSimSys(r) { const sc = BC_SIMS.find((x) => x[0] === r.k), L = BC_LVL[r.lvl];
  return `You are role-playing the owner of a small private-pay home care agency in the Tampa Bay area, Florida, on a cold call from Egor of Caregiver Bench (he recruits and screens caregivers for agencies' open cases; the agency hires them W-2; offers: First Hire Free on one open case for 30 days, then Priority Bench at $2,500 every 4 weeks including 2 caregivers who work, or Pay When They Work at $1,500 per caregiver who works; Show-Up Guarantee and 90-Day Stay-or-Replace). Stay in character. Reply ONLY with what the owner says out loud: 1–3 short spoken sentences, no narration, no stage directions, never coach him, never break character. Mood: ${L[0]}, ${L[1]}. Your facts (reveal only when he asks good, open questions): about 30 caregivers, 3 open cases, turnover is high, new hires often no-show in week one, you spend evenings on job boards, a staffing company burned you last year. If he pitches before understanding you, or talks for long, get shorter and try to end the call. If he asks for a clear, small next step at a good moment, you may agree. If he claims things that sound too good, push back. Scenario: ${sc[1]}`; }
async function bcSimSend() {
  const r = bcS.run, el = document.getElementById('bc-sm'), t = (el && el.value || '').trim(); if (!t || r.busy) return;
  el.value = ''; bcBlur(); r.log.push({ role: 'user', text: t }); r.busy = 1; render();
  try { const a = await aiText(bcSimSys(r), [{ role: 'user', text: '(The phone rings and the owner picks up.)' }].concat(r.log)); r.log.push({ role: 'assistant', text: a.replace(/^["“]|["”]$/g, '') }); }
  catch (e) { r.log.push({ role: 'assistant', text: '⚠ ' + (typeof aiExplain === 'function' ? aiExplain(e.message) : e.message), err: 1 }); }
  r.busy = 0; render(); const b = document.getElementById('bc-sm'); if (b) b.focus();
}
async function bcSimGrade() {
  const r = bcS.run; if (r.busy) return; if (r.log.filter((x) => x.role === 'user').length < 2) { toast('Say at least two things first'); return; } bcBlur(); r.busy = 1; render();
  const ids = ['m4', 'm5', 'm6'].flatMap((m) => BC.mod[m].cards), list = ids.map((id) => `${id}: ${XC.byId[id].t}`).join('\n');
  const tr = r.log.map((x) => (x.role === 'user' ? 'EGOR: ' : 'OWNER: ') + x.text).join('\n');
  const sys = `You are a strict, encouraging cold-calling coach for Egor (Caregiver Bench: recruits screened caregivers for private-pay home care agencies in Florida, Tampa Bay first; offer: First Hire Free → Priority Bench $2,500 every 4 weeks, or Pay When They Work $1,500). Grade his part of this practice call. Judge: opener and permission, detachment and tone (from his words), discovery (open questions, pulling teeth, labels/mirrors), not pitching too early, handling objections without arguing, honesty, asking for a small next step (BAMFAM). Red lines (any = redline): charging per family/client/referral, claiming background or reference checks, offering to place/employ caregivers or send them to families, charging caregivers, recording calls, lying about bench size or results. Ideas he has studied (use these ids):\n${list}\nReturn ONLY JSON: {"score":0-100,"verdict":"one short line","good":["max 3"],"fix":["max 3, specific"],"better":{"moment":"what the owner said at his weakest moment","line":"a better line he could have said"},"cards":["up to 3 ids from the list"],"redline":false or "what he did"}`;
  try { const a = await aiText(sys, [{ role: 'user', text: tr }]), m = a.match(/\{[\s\S]*\}/); r.fb = JSON.parse(m ? m[0] : a); const L = bcV('sim', []) || []; bcW('sim', L.concat([{ at: dk(new Date()), k: r.k, lvl: r.lvl, score: r.fb.score, red: !!r.fb.redline }]).slice(-30)); bcDay('q'); (r.fb.cards || []).forEach((id) => { if (BC.cardMod[id]) bcW('x:' + id, bcV('x:' + id, 0) + 1); }); }
  catch (e) { r.fb = { err: typeof aiExplain === 'function' ? aiExplain(e.message) : e.message }; }
  r.busy = 0; render(); window.scrollTo(0, document.body.scrollHeight);
}
function bcSimHtml() {
  const r = bcS.run, past = bcV('sim', []) || [], on = typeof aiOn === 'function' && aiOn();
  if (!r) return `${bcHead('🎙 Owner simulator', 'Practise before the real calls. The AI plays the owner; you type what you would say (or say it out loud first, then type it).', "bcGo('home')")}
    ${on ? '' : `<div class="aq-lock"><b>Needs the AI key</b><span>Same key as Ask and the food photo (More → settings). Until then, practise the scenarios in the boss fights.</span></div>`}
    <div class="card"><div class="aq-t">Difficulty</div><div class="bc-lvls">${BC_LVL.map((l, i) => `<button class="${(bcS.lvl || 0) === i ? 'on' : ''}" onclick="bcS.lvl=${i};render()"><b>${i + 1}</b><span>${l[0]}</span></button>`).join('')}</div><div class="aq-note">${BC_LVL[bcS.lvl || 0][1]}</div></div>
    <div class="card"><div class="aq-t">Pick the call</div><div class="bc-ls">${BC_SIMS.map((x) => `<button class="bc-l" ${on ? `onclick="bcSimStart('${x[0]}',${bcS.lvl || 0})"` : 'disabled'}><span><b>${esc(x[1])}</b><em>${esc(x[2])}</em></span><u>call</u></button>`).join('')}</div></div>
    ${past.length ? `<div class="card"><div class="aq-t">Your last calls</div><div class="bc-hist">${past.slice(-12).map((x) => `<div class="${x.red ? 'red' : ''}"><i style="height:${Math.max(6, x.score || 0)}%"></i><span>${x.score}</span></div>`).join('')}</div></div>` : ''}`;
  const sc = BC_SIMS.find((x) => x[0] === r.k), f = r.fb;
  return `${bcHead(esc(sc[1]), `Level ${r.lvl + 1} · ${BC_LVL[r.lvl][0]} · you are Egor`, "bcS.run=null;render()")}
    <div class="card bc-chat">${r.log.map((x) => `<div class="${x.role === 'user' ? 'me' : 'own'} ${x.err ? 'err' : ''}"><span>${x.role === 'user' ? 'You' : 'Owner'}</span>${esc(x.text)}</div>`).join('')}${r.busy ? '<div class="own"><span>Owner</span>…</div>' : ''}</div>
    ${f ? (f.err ? `<div class="aq-lock"><b>Couldn't grade</b><span>${esc(f.err)}</span></div>` : `<div class="card bc-fb ${f.redline ? 'red' : ''}"><div class="bc-res"><b>${esc(f.score)}</b><span>${esc(f.verdict || '')}</span></div>
      ${f.redline ? `<div class="bc-why bad"><b>⛔ Red line:</b> ${esc(f.redline)}</div>` : ''}
      ${(f.good || []).length ? `<div class="aq-t">Good</div>${f.good.map((x) => `<div class="bc-qa"><span>✓ ${esc(x)}</span></div>`).join('')}` : ''}
      ${(f.fix || []).length ? `<div class="aq-t" style="margin-top:10px">Fix</div>${f.fix.map((x) => `<div class="bc-qa"><span>→ ${esc(x)}</span></div>`).join('')}` : ''}
      ${f.better && f.better.line ? `<div class="bc-cmp"><span>Better line</span><div class="aq-note">When the owner said: “${esc(f.better.moment || '')}”</div><b>“${esc(f.better.line)}”</b></div>` : ''}
      ${(f.cards || []).filter((id) => XC.byId[id]).length ? `<div class="aq-t" style="margin-top:10px">Study these <span>added to your weak spots</span></div>${f.cards.filter((id) => XC.byId[id]).map((id) => `<a class="bc-link" onclick="xcOpen('${id}')">${esc(XC.byId[id].t)} ›</a>`).join('')}` : ''}
      <div class="bc-grade"><button class="btn sm" onclick="bcSimStart('${r.k}',${r.lvl})">Same call again</button><button class="btn sm primary" onclick="bcS.run=null;render()">Another call</button></div></div>`)
    : `<textarea class="aq-in" id="bc-sm" placeholder="What do you say?" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();bcSimSend()}"></textarea>
      <div class="bc-grade"><button class="btn sm" onclick="bcSimGrade()" ${r.busy ? 'disabled' : ''}>End call · grade me</button><button class="btn sm primary" onclick="bcSimSend()" ${r.busy ? 'disabled' : ''}>Say it ›</button></div>`}`;
}

/* ── the screen ── */
function renderBoot() {
  const el = document.getElementById('view-boot'); if (!el) return;
  if (!bcReady()) { bcLoad(); el.innerHTML = '<div class="aq"><div class="card">Loading Bootcamp…</div></div>'; return; }
  let h = '';
  try { h = bcS.scr === 'mod' ? bcMod(bcS.m) : bcS.scr === 'lesson' ? bcLessonHtml() : bcS.scr === 'quiz' ? bcQuizHtml() : bcS.scr === 'end' ? bcEndHtml() : bcS.scr === 'sim' ? bcSimHtml() : bcHome(); } catch (e) { console.error(e); bcS = { scr: 'home' }; h = bcHome(); }
  el.innerHTML = `<div class="aq bc">${h}</div>`;
}
(function () {
  if (!document.getElementById('view-boot')) { const m = document.getElementById('view-acq') || document.getElementById('view-book'); if (m) { const s = document.createElement('section'); s.className = 'view'; s.id = 'view-boot'; m.before(s); } }
  const addSeg = () => { try { const H = SH_HUBS.find((h) => h.id === 'work'); if (H && !H.segs.some((x) => x[0] === 'boot')) { const i = H.segs.findIndex((x) => x[0] === 'acq'); H.segs.splice(i < 0 ? H.segs.length : i, 0, ['boot', 'Bootcamp']); } } catch (e) { } };
  addSeg(); if (typeof sgApply === 'function' && !sgApply._bc) { const _s = sgApply; sgApply = function () { const r = _s.apply(this, arguments); addSeg(); return r; }; sgApply._bc = 1; }
  /* tonight's mission on the Dial screen */
  if (typeof renderDial === 'function' && !renderDial._bc) { const f = renderDial; const g = function () { const r = f.apply(this, arguments); try { const mis = bcV('mis', null), el = document.getElementById('view-dial'); if (mis && el && !el.querySelector('.bc-dialmis')) { const c = typeof XC !== 'undefined' && XC && XC.byId ? XC.byId[mis.id] : null; el.insertAdjacentHTML('afterbegin', `<div class="bc-dialmis"><span>🎯 Bootcamp mission</span><b>${esc(c ? c.t : mis.id)}</b>${mis.say ? `<em>${esc(mis.say)}</em>` : ''}<div><button class="btn sm" onclick="show('boot');bcGo('home')">Open</button><button class="btn sm primary" onclick="bcUsed('mis')">Used it ✓</button></div></div>`); } } catch (e) { } return r; }; g._bc = 1; window.renderDial = g; renderDial = g; }
  /* today's life mission on the Day screen */
  if (typeof renderNow === 'function' && !renderNow._bc) { const f = renderNow; const g = function () { const r = f.apply(this, arguments); try { const mis = bcV('misL', null), el = document.getElementById('view-now'); if (mis && el && !el.querySelector('.bc-dialmis')) { const c = typeof XC !== 'undefined' && XC && XC.byId ? XC.byId[mis.id] : null; el.insertAdjacentHTML('afterbegin', `<div class="bc-dialmis life"><span>🎯 Today's mission · Bootcamp</span><b>${esc(c ? c.t : mis.id)}</b>${mis.say ? `<em>${esc(mis.say)}</em>` : ''}<div><button class="btn sm" onclick="show('boot');bcGo('home')">Open</button><button class="btn sm primary" onclick="bcUsed('misL')">Did it ✓</button></div></div>`); } } catch (e) { } return r; }; g._bc = 1; window.renderNow = g; renderNow = g; }
  if (typeof arcHtml === 'function' && !arcHtml._bc) { const f = arcHtml; const g = function () { const h = f.apply(this, arguments); try { const mis = bcV('misL', null), c = mis && typeof XC !== 'undefined' && XC && XC.byId ? XC.byId[mis.id] : null; if (!mis) return h; return `<div class="bc-dialmis life bc-arcmis"><span>🎯 Today's mission · Bootcamp</span><b>${esc(c ? c.t : mis.id)}</b>${mis.say ? `<em>${esc(mis.say)}</em>` : ''}<div><button class="btn sm" onclick="arcHide(true);show('boot');bcGo('home')">Open</button><button class="btn sm primary" onclick="bcUsed('misL')">Did it ✓</button></div></div>` + h; } catch (e) { return h; } }; g._bc = 1; window.arcHtml = g; arcHtml = g; }
  /* Courses overview points here */
  if (typeof acqHome === 'function' && !acqHome._bc) { const f = acqHome; const g = function () { return f.apply(this, arguments).replace('<div class="card aq-now">', `<button class="card bc-cta" onclick="show('boot')"><span>New · Bootcamp</span><b>Learn all of it, step by step →</b><em>22 modules · 203 ideas · every course, every mentor, your life library</em></button><div class="card aq-now">`); }; g._bc = 1; window.acqHome = g; acqHome = g; }
  bcLoad();
  const st = document.createElement('style'); st.id = 'bc-css';
  st.textContent = `
  .bc-hd{display:flex;gap:10px;align-items:flex-start;padding:2px}.bc-hd b{display:block;font-size:22px;color:var(--text);line-height:1.25}.bc-hd span{display:block;font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4}
  .bc-back{flex:none;width:36px;height:36px;border:1px solid #262B32;border-radius:4px;background:transparent;color:var(--text);font-size:20px;cursor:pointer}
  .bc-hero{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;align-items:center}.bc-rank span,.bc-stat span{display:block;font:600 10.5px/1.3 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .bc-rank b{display:block;font-size:26px;color:var(--acc);margin:2px 0}.bc-rank em{font-style:normal;font-size:12px;color:var(--muted)}.bc-stat b{display:block;font:700 26px/1.1 var(--mono,monospace);color:var(--text)}.bc-stat small{font-size:13px;color:var(--muted)}
  .bc-days{grid-column:1/-1;display:grid;grid-template-columns:repeat(14,1fr);gap:3px}.bc-days i{height:8px;border-radius:2px;background:#1B1F24}.bc-days i.on{background:var(--acc)}
  .bc-big{display:block;width:100%;text-align:left;background:#12161B;border:1px solid var(--acc);border-radius:6px;padding:12px 14px;margin-top:8px;cursor:pointer;font-family:inherit;color:var(--text)}.bc-big b{display:block;font-size:15px;line-height:1.35}.bc-big span{display:block;font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4}
  .bc-big.alt{border-color:#3a6f8f}.bc-big.ghost{border-color:#262B32;background:transparent}.bc-big.boss{border-color:#c9774a;background:#1a1410}
  .bc-ok{font-size:13px;color:var(--green,#8fae8b);padding:6px 0}
  .bc-chain{display:flex;align-items:stretch;gap:4px}.bc-chain>div{flex:1;min-width:0;border:1px solid #1B1F24;border-radius:4px;padding:8px}.bc-chain>i{align-self:center;color:var(--dim,#5B626B);font-style:normal}
  .bc-chain b{display:block;font:700 20px/1 var(--mono,monospace);color:var(--text)}.bc-chain span{display:block;font-size:12px;font-weight:600;color:var(--acc);margin-top:4px}.bc-chain em{display:block;font-style:normal;font-size:11px;color:var(--muted);line-height:1.3;margin-top:2px}
  .bc-row{display:grid;grid-template-columns:150px 1fr;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #12151A}.bc-row.lock{opacity:.5}
  .bc-rl{background:none;border:0;color:var(--text);font:500 12.5px/1.25 inherit;text-align:left;cursor:pointer;padding:0;display:flex;gap:6px}.bc-rl u{text-decoration:none;font-family:var(--mono,monospace);color:var(--muted);min-width:16px}.bc-rl i{color:var(--green,#8fae8b);font-style:normal}
  .bc-cells{display:flex;flex-wrap:wrap;gap:3px}.bc-cells button{width:18px;height:18px;border-radius:3px;border:1px solid #2C333C;cursor:pointer;padding:0}
  .r0{background:#1E232A}.r1{background:#2b3b4a!important}.r2{background:#2f6b8a!important}.r3{background:#3d9a8c!important}.r4{background:#a8c46a!important}.r5{background:#e8c25a!important}
  .bc-leg{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:11.5px;color:var(--muted)}.bc-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  .bc-mods{display:grid;gap:6px}.bc-mod{position:relative;display:flex;gap:10px;align-items:center;background:transparent;border:1px solid #1B1F24;border-radius:5px;padding:10px;text-align:left;cursor:pointer;color:var(--text);font-family:inherit;overflow:hidden}
  .bc-mod u{text-decoration:none;font:700 15px/1 var(--mono,monospace);color:var(--acc);min-width:22px}.bc-mod b{display:block;font-size:14px}.bc-mod em{display:block;font-style:normal;font-size:12px;color:var(--muted);margin-top:2px}.bc-mod>i{position:absolute;left:0;bottom:0;height:2px;width:var(--p);background:var(--acc)}
  .bc-mod.lock{opacity:.55}.bc-mod.clr{border-color:#2f4a33}
  .bc-ls{display:grid;gap:2px}.bc-l{display:flex;gap:10px;align-items:center;background:none;border:0;border-bottom:1px solid #15181C;padding:9px 0;text-align:left;cursor:pointer;color:var(--text);font-family:inherit}.bc-l>i{flex:none;width:14px;height:14px;border-radius:3px;border:1px solid #232830}
  .bc-l b{display:block;font-size:14px;font-weight:500}.bc-l em{display:block;font-style:normal;font-size:11.5px;color:var(--muted);margin-top:2px}.bc-l span{flex:1}.bc-l u{text-decoration:none;font:600 10px/1 var(--mono,monospace);color:var(--acc);border:1px solid var(--acc);padding:3px 5px;border-radius:3px}.bc-l.done b{color:var(--muted)}
  .bc-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:4px}.bc-steps span{text-align:center;font:600 10.5px/1 var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;padding:8px 0;border-bottom:2px solid #1B1F24;color:var(--dim,#5B626B)}.bc-steps span.done{color:var(--muted);border-color:#2f6b8a}.bc-steps span.on{color:var(--acc);border-color:var(--acc)}
  .bc-kind{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--acc);margin-bottom:8px}.bc-q{font-size:16px;line-height:1.5;color:var(--text);margin-bottom:12px}
  .bc-opts{display:grid;gap:6px}.bc-opts button{text-align:left;background:#12161B;border:1px solid #262B32;border-radius:5px;padding:11px 12px;color:var(--text);font:14px/1.4 inherit;cursor:pointer}.bc-opts.row{display:flex;flex-wrap:wrap}.bc-opts.row button{padding:8px 10px}
  .bc-opts button.ok{border-color:var(--green,#8fae8b);background:#142016}.bc-opts button.bad{border-color:#c0574f;background:#221313}.bc-opts button.dim{opacity:.45}
  .bc-ord{display:grid;gap:4px;margin-bottom:8px}.bc-ord span{display:flex;gap:8px;align-items:center;border:1px dashed #2a3038;border-radius:4px;padding:7px 10px;font-size:14px}.bc-ord u{text-decoration:none;font:700 12px/1 var(--mono,monospace);color:var(--acc)}.bc-ord span.ok{border:1px solid var(--green,#8fae8b)}.bc-ord span.bad{border:1px solid #c0574f}
  .bc-why{margin-top:10px;font-size:13.5px;line-height:1.5;color:var(--muted);border-left:2px solid #c0574f;padding:6px 10px}.bc-why.ok{border-color:var(--green,#8fae8b)}.bc-why b{color:var(--text)}.bc-why a,.bc-wr a{color:var(--acc);cursor:pointer;display:inline-block;margin-top:4px}
  .bc-prog{height:3px;background:#1B1F24;border-radius:2px;overflow:hidden}.bc-prog i{display:block;height:100%;background:var(--acc);transition:width .25s}
  .bc-cmp{margin-top:10px;border:1px solid #232830;border-radius:5px;padding:10px;display:grid;gap:8px}.bc-cmp>span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .bc-qa b{display:block;font-size:13px;color:var(--text)}.bc-qa span{display:block;font-size:13px;color:var(--muted);margin-top:2px}
  .bc-grade{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.bc-grade .btn{flex:1;white-space:normal;min-width:120px}
  .bc-rc{min-height:90px}.bc-res{text-align:center;padding:22px}.bc-res>b{display:block;font:700 46px/1 var(--mono,monospace);color:var(--text)}.bc-res.pass>b{color:var(--green,#8fae8b)}.bc-res.fail>b{color:#c0574f}.bc-res>span{display:block;color:var(--muted);margin:6px 0 10px}
  .bc-wr{border-bottom:1px solid #15181C;padding:8px 0}.bc-wr b{display:block;font-size:13px;font-weight:500;color:var(--text)}.bc-wr span{display:block;font-size:12.5px;color:var(--green,#8fae8b);margin-top:3px}
  .bc-mis{border-color:#c9774a}.bc-mis>b{display:block;font-size:16px;color:var(--text)}
  .bc-dialmis{border:1px solid #c9774a;border-radius:6px;padding:10px 12px;margin:0 0 12px;display:grid;gap:4px}.bc-dialmis span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:#e0a07a}.bc-dialmis b{font-size:15px;color:var(--text)}.bc-dialmis em{font-style:normal;font-size:12.5px;color:var(--muted)}.bc-dialmis div{display:flex;gap:6px;margin-top:4px}
  .bc-cta{display:grid;gap:3px;text-align:left;border:1px solid var(--acc)!important;cursor:pointer;font-family:inherit;color:var(--text);background:#12161B}.bc-cta span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--acc)}.bc-cta b{font-size:16px}.bc-cta em{font-style:normal;font-size:12px;color:var(--muted)}
  .bc-modal{display:grid;gap:10px}.bc-trk{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px}
  .bc-big.life{border-color:#5f9e6e;background:#111a14}.bc-big.lockd{border-color:#262B32;background:transparent;opacity:.85;cursor:default}.bc-mod.life u{color:#7fbf8c}.bc-mis.life,.bc-dialmis.life{border-color:#5f9e6e}.bc-dialmis.life span{color:#8fd19e}.bc-arcmis{margin:10px 14px 0;background:#111a14}.bc-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bc-two .bc-big{margin-top:8px}.bc-big.sim{border-color:#8a6fc9;background:#15121c}
  .bc-lvls{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.bc-lvls button{background:transparent;border:1px solid #262B32;border-radius:4px;padding:8px 2px;color:var(--muted);cursor:pointer;font-family:inherit;display:grid;gap:3px;justify-items:center}.bc-lvls b{font:700 16px/1 var(--mono,monospace)}.bc-lvls span{font-size:10.5px}.bc-lvls button.on{color:var(--acc);border-color:var(--acc)}
  .bc-chat{display:grid;gap:8px}.bc-chat>div{max-width:86%;padding:8px 11px;border-radius:8px;font-size:14.5px;line-height:1.45;color:var(--text)}.bc-chat span{display:block;font:600 10px/1 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .bc-chat .own{background:#1a1d22;justify-self:start}.bc-chat .me{background:#1d2a33;justify-self:end}.bc-chat .err{color:#e0a07a}
  .bc-fb.red{border-color:#c0574f}.bc-fb .bc-res{padding:6px 0 12px}.bc-link{display:block;color:var(--acc);cursor:pointer;padding:5px 0;font-size:14px}.bc-cmp b{font-size:15px;color:var(--text);line-height:1.45}
  .bc-hist{display:flex;gap:4px;align-items:flex-end;height:80px}.bc-hist div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px}.bc-hist i{width:100%;background:#2f6b8a;border-radius:2px 2px 0 0}.bc-hist .red i{background:#c0574f}.bc-hist span{font:600 10px/1 var(--mono,monospace);color:var(--muted)}
  @media (max-width:560px){.bc-chain>i{display:none}.bc-chain>div{padding:6px 4px}.bc-chain em{display:none}.bc-chain span{font-size:10.5px}.bc-hero{grid-template-columns:1fr 1fr}.bc-rank{grid-column:1/-1}.bc-row{grid-template-columns:1fr}.bc-cells button{width:20px;height:20px}}`;
  document.head.appendChild(st);
})();
