/* War Room 13.22 · mastery.js — the memory engine. Exposure is not knowledge: an idea is yours when you can pull it
   out of your head, use it, and still have it weeks later.
   1. MEMORY MODEL. Every learned idea has a stability S (days). Retention now ≈ e^(−days since last recall / S).
      Strong ≥ 85% · OK ≥ 70% · Fading ≥ 40% · Forgotten < 40%. Reviews are scheduled before it fades (due ≈ S days).
   2. RECALL REVIEW (replaces the multiple-choice warm-up). Blank page first: explain it from memory (what, why, how
      you'd use it on a call). Then the card. Then you grade honestly: Again / Hard / Good / Easy.
      Again → back tomorrow + a Fix-it step (the trap, the example, the memory hook) · Hard → S×1.3 · Good → S×2.5 ·
      Easy → S×3.5. Optional: the AI grades your explanation (same as Teach it back).
   3. KNOWLEDGE PANEL on the Path: learned · due today · fading · mastered · used for real, today's retention mission
      (the idea closest to being forgotten, with its 5-level ladder) and its next reviews.
   4. MEMORY CURVE in Progress: how many ideas are Strong / OK / Fading / Forgotten right now, and the forgetting curve
      of your weakest idea vs one that has been reviewed (why spacing works, drawn from your own data). */
'use strict';

const MS_DAY = 864e5;
function msCard(id) { return (S.cards || {})[id] || null; }
function msLearned() { return typeof BC !== 'undefined' && BC && BC.cardMod ? Object.keys(BC.cardMod).filter((id) => bcV('l:' + id, null)) : []; }
function msStab(id) { const c = msCard(id); if (!c) return 1; if (c.st) return c.st; return [1, 3, 7, 21, 60][Math.max(0, Math.min(4, c.step || 0))] || 1; }
function msLast(id) { const c = msCard(id), l = bcV('l:' + id, null); const t = c && c.last ? Date.parse(c.last) : c && c.due ? Date.parse(c.due) - msStab(id) * MS_DAY : l && l.at ? Date.parse(l.at) : Date.now(); return isNaN(t) ? Date.now() : t; }
function msR(id) { const d = Math.max(0, (Date.now() - msLast(id)) / MS_DAY); return Math.exp(-d / Math.max(0.5, msStab(id))); }
function msBand(r) { return r >= 0.85 ? 'strong' : r >= 0.7 ? 'ok' : r >= 0.4 ? 'fading' : 'gone'; }
const MS_BANDS = [['strong', 'Strong', '85%+'], ['ok', 'OK', '70–85%'], ['fading', 'Fading', '40–70%'], ['gone', 'Forgotten', 'under 40%']];

/* scheduling: every review moves stability and the due date */
/* new stability: a recall that succeeds when memory was weak counts less than one that succeeds right before fading
   is impossible (it was due), so the multiplier grows with how much was still there. Forgotten + Hard = short gap. */
function msNewStab(st, r, g) {
  const good = r >= 0.85 ? 2.5 : r >= 0.7 ? 2.3 : r >= 0.4 ? 1.7 : 1.15;
  const ns = g === 0 ? Math.max(1, st * 0.4) : g === 1 ? Math.max(1, Math.min(st, st * good * 0.55)) : g === 2 ? Math.max(2, st * good) : Math.max(4, st * good * 1.4);
  return Math.min(365, Math.round(ns * 10) / 10);
}
function msSchedule(id, g) {
  S.cards = S.cards || {}; const c = Object.assign({ step: 0, seen: 0 }, S.cards[id] || {}), st = msStab(id), r = msR(id);
  let ns = msNewStab(st, r, g), step = c.step || 0;
  if (g >= 2) { const im = msImp(id), bl = msBlind(id); ns = Math.max(1, Math.round(ns * (im >= 3 ? 0.85 : im === 2 ? 1 : 1.25) * (1 - Math.min(0.4, 0.15 * bl)) * 10) / 10); }   /* 13.25.4 */
  if (g === 0) { step = 0; c.lap = (c.lap || 0) + 1; } else if (g >= 2) step = Math.min(4, step + 1);
  const due = new Date(); due.setDate(due.getDate() + (g === 0 ? 1 : Math.max(1, Math.round(ns))));
  S.cards[id] = Object.assign(c, { st: ns, step, last: new Date().toISOString(), due: dk(due), seen: (c.seen || 0) + 1, g, _u: now() });
  if (g === 0 && typeof bcW === 'function') bcW('x:' + id, (bcV('x:' + id, 0) || 0) + 1);
  save();
}
/* first learning sets the clock (lesson finished) */
(function () {
  if (typeof bcSrs !== 'function') return; const _s = bcSrs;
  bcSrs = function (id, ok) { const had = msCard(id); _s(id, ok); const c = S.cards[id]; if (c && !had) { c.st = ok ? 1 : 0.6; c.last = new Date().toISOString(); } else if (c && had) { c.st = ok ? Math.max(c.st || 1, [1, 3, 7, 21, 60][c.step] || 1) : 1; c.last = new Date().toISOString(); } };
})();

/* the queue: due first (lowest retention first), then fading ones that aren't due yet */
/* 13.25.4 · importance and blind-spot history. Predictable rules, no hidden score:
   importance 3 = current-mission modules, 2 = next stage, 1 = expansion (from CP_ALLOC; a card's own `imp` overrides).
   Review threshold (estimated memory): importance 3 comes back under 80%, 2 under 70%, 1 under 60%.
   Gap after a pass: importance 3 ×0.85, 1 ×1.25; each past blind spot (sure and wrong) −15%, at most −40%.
   Queue order: (1 − estimated memory) × importance, plus 0.1 per past blind spot (max 0.3), plus 0.3 while a blind spot is open. */
function msImp(id) { const c = (typeof XC !== 'undefined' && XC.byId[id]) || {}; if (c.imp) return Math.max(1, Math.min(3, Number(c.imp))); const m = BC.mod[BC.cardMod[id]], b = m && typeof cpBucket === 'function' ? cpBucket(m.id) : 'wide'; return b === 'now' ? 3 : b === 'next' ? 2 : 1; }
function msBlind(id) { return Number(bcV('bsn:' + id, 0)) || 0; }
function msFloor(id) { const i = msImp(id); return i >= 3 ? 0.8 : i === 2 ? 0.7 : 0.6; }
function msPrio(id) { return (1 - msR(id)) * msImp(id) + Math.min(0.3, 0.1 * msBlind(id)) + (bcV('bs:' + id, null) ? 0.3 : 0); }
function msWhyDue(id) { return `estimated memory ${Math.round(msR(id) * 100)}% · importance ${msImp(id)}/3${msBlind(id) ? ` · ${msBlind(id)} past blind spot${msBlind(id) > 1 ? 's' : ''}` : ''}`; }
function msQueue(max) {
  const t = dk(new Date()), L = msLearned();
  const due = L.filter((id) => { const c = msCard(id); return c && c.due && c.due <= t; }), fade = L.filter((id) => !due.includes(id) && msR(id) < msFloor(id));
  return due.concat(fade).sort((a, b) => msPrio(b) - msPrio(a)).slice(0, max || 8);
}
function msStats() {
  const L = msLearned(), t = dk(new Date()), rs = L.map(msR);
  return { learned: L.length, due: L.filter((id) => { const c = msCard(id); return c && c.due && c.due <= t; }).length, fading: rs.filter((r) => r < 0.7).length, mastered: L.filter((id) => bcRung(id) >= 6).length, used: L.filter((id) => !!bcV('u:' + id, null)).length, bands: MS_BANDS.map((b) => L.filter((id) => msBand(msR(id)) === b[0]).length) };
}

/* ── RECALL REVIEW: blank page → card → honest grade ── */
let MSR = null;
function msReview() {
  const q = msQueue(8); if (!q.length) { toast('Nothing due or fading. Learn something new, or come back tomorrow.'); return; }
  MSR = { q, i: 0, phase: 'recall', said: '', res: [] }; msShow();
}
function msShow() {
  if (!MSR) return; const id = MSR.q[MSR.i];
  if (!id) { const g = MSR.res, ok = g.filter((x) => x >= 2).length; const fix = g.filter((x) => x === 0).length; MSR = null;
    openModal(`<div class="ms-done"><b>${ok}/${g.length} recalled</b><span>${fix ? fix + ' come back tomorrow with a fix-it step. That is the system working, not failing.' : 'Every one came back. Their next reviews are spaced further out.'}</span></div><div class="actions"><button class="btn primary" onclick="closeModal();render()">Done</button></div>`); return; }
  const c = XC.byId[id], r = msR(id), head = `<div class="ms-h"><span>Recall ${MSR.i + 1}/${MSR.q.length}</span><span class="ms-b ${msBand(r)}">${Math.round(r * 100)}% · ${MS_BANDS.find((b) => b[0] === msBand(r))[1]}</span></div><div class="ms-t">${esc(c.t)}</div><div class="ms-w">${esc(c.who || XC_COURSES[c.c] || '')}</div>`;
  if (MSR.phase === 'recall') {
    openModal(`${head}<div class="ms-p">From memory, no peeking: <b>what is it, why does it work, and how would you use it on a call or today?</b> Write it, or say it out loud and type a few words.</div>
      <textarea class="aq-in ms-in" id="ms-in" placeholder="Explain it like you're teaching it">${esc(MSR.said)}</textarea>
      <div class="actions"><button class="btn" onclick="MSR.said=($('ms-in')||{}).value||'';MSR.blank=1;MSR.phase='card';msShow()">I can't remember</button><button class="btn primary" onclick="MSR.said=($('ms-in')||{}).value||'';MSR.phase='card';msShow()">Show the card</button></div>`);
    setTimeout(() => { const t = $('ms-in'); if (t) t.focus(); }, 60); return;
  }
  if (MSR.phase === 'card') {
    openModal(`${head}${MSR.said ? `<div class="ms-said"><span>You said</span>${esc(MSR.said)}</div>` : ''}
      <div class="ms-card"><div class="xc-hook">${pbInline(c.hook)}</div>${c.memo ? `<div class="xc-memo"><span>Lock it in</span><b>${pbInline(c.memo)}</b></div>` : ''}${(c.q || []).slice(0, 2).map((x) => `<div class="bc-qa"><b>${esc(x[0])}</b><span>${pbInline(x[1])}</span></div>`).join('')}</div>
      ${MSR.said && MSR.said.length > 12 && typeof aiOn === 'function' && aiOn() ? `<div class="tb ms-ai"><button class="btn sm" onclick="msAi(this)">🧑‍🏫 Let the AI grade it</button></div>` : ''}
      <div class="ms-gq">How well did you recall it?</div>
      <div class="ms-g"><button onclick="msGrade(0)"><b>Again</b><em>missed it · tomorrow</em></button><button onclick="msGrade(1)"><b>Hard</b><em>partly · ${msNext(id, 1)}</em></button><button onclick="msGrade(2)"><b>Good</b><em>got it · ${msNext(id, 2)}</em></button><button onclick="msGrade(3)"><b>Easy</b><em>instant · ${msNext(id, 3)}</em></button></div>`);
    return;
  }
  if (MSR.phase === 'fix') {
    openModal(`${head}<div class="ms-fix"><span>Fix it now · 60 seconds</span>
      ${c.plain ? `<div class="xc-s"><div class="xc-l">In plain words</div><div class="xc-b">${pbInline(c.plain)}</div></div>` : ''}${c.ex ? `<div class="xc-s"><div class="xc-l">The example</div><div class="xc-b">${pbInline(c.ex)}</div></div>` : ''}${c.trap ? `<div class="xc-s"><div class="xc-l">The trap</div><div class="xc-b">${pbInline(c.trap)}</div></div>` : ''}${c.memo ? `<div class="xc-memo"><span>Lock it in</span><b>${pbInline(c.memo)}</b></div>` : ''}</div>
      <div class="ms-p">Now close your eyes and say the hook once, out loud. It comes back tomorrow.</div>
      <div class="actions"><button class="btn primary" onclick="MSR.i++;MSR.phase='recall';MSR.said='';msShow()">Said it · next</button></div>`);
  }
}
function msNext(id, g) { const d = Math.max(1, Math.round(msNewStab(msStab(id), msR(id), g))); return d === 1 ? 'tomorrow' : d < 14 ? `in ${d} days` : d < 60 ? `in ${Math.round(d / 7)} weeks` : `in ${Math.round(d / 30)} months`; }
function msGrade(g) {
  const id = MSR.q[MSR.i]; msSchedule(id, g); MSR.res.push(g);
  if (g >= 2 && MSR.said && MSR.said.length > 12 && typeof bcW === 'function') bcW('rc:' + id, { at: dk(new Date()), g });
  if (g === 0) { MSR.phase = 'fix'; msShow(); return; }
  MSR.i++; MSR.phase = 'recall'; MSR.said = ''; msShow();
}
async function msAi(btn) {
  const id = MSR.q[MSR.i], c = XC.byId[id], box = btn.closest('.tb'); box.innerHTML = '<span class="xs muted">Grading…</span>';
  try {
    const out = await aiText(TB_SYS, [{ role: 'user', text: `Reference card:\nIdea: ${c.t}\nCore: ${c.hook}\nPlain: ${c.plain || ''}\nExample: ${c.ex || ''}\nMove: ${c.move || ''}\n\nHis explanation from memory:\n${MSR.said}` }]);
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)), s = Math.max(1, Math.min(5, +j.score || 1));
    box.innerHTML = `<div class="tb-s"><b>${'★'.repeat(s)}${'☆'.repeat(5 - s)}</b><span>AI suggests: ${s >= 5 ? 'Easy' : s >= 4 ? 'Good' : s >= 3 ? 'Hard' : 'Again'}</span></div>${(j.missed || []).length ? `<div class="tb-l bad"><span>You missed</span><ul>${j.missed.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
  } catch (e) { box.innerHTML = `<span class="xs red">Couldn't grade (${esc(e.message || 'error')}). Grade yourself below.</span>`; }
}

/* ── KNOWLEDGE PANEL (top of the Path) ── */
function msPanel() {
  if (typeof BC === 'undefined' || !BC || typeof XC === 'undefined' || !XC) return '';
  const s = msStats(), q = msQueue(1), id = q[0], c = id && XC.byId[id];
  const stat = (n, l, cls) => `<div class="ms-st ${cls || ''}"><b>${n}</b><span>${l}</span></div>`;
  let mission = '';
  if (c) {
    const rg = bcRung(id), r = msR(id), steps = [['Understood: explained in your own words', rg >= 2], ['Retained: recalled after a gap', rg >= 3], ['Applied: used correctly, for real where it is a skill', rg >= 4], ['Integrated: used somewhere new', rg >= 5], ['Maintained: still there 30+ days later', rg >= 6]];
    const nx = (() => { let st = msStab(id), d = 0; return [1, 2, 3, 4].map(() => { st = Math.max(2, st * 2.5); d += Math.round(st); return d; }); })();
    mission = `<div class="ms-mis"><div class="ms-mh"><span>Today's retention mission</span><span class="ms-b ${msBand(r)}">${Math.round(r * 100)}% · ${MS_BANDS.find((b) => b[0] === msBand(r))[1]}</span></div>
      <b class="ms-mt">${esc(c.t)}</b><div class="ms-mp">Explain it without looking: what it is, why it works, how you'd use it tonight.</div>
      <div class="ms-ck">${steps.map((x) => `<div class="${x[1] ? 'on' : ''}"><i>${x[1] ? '✓' : ''}</i>${x[0]}</div>`).join('')}</div>
      <div class="ms-sch">If you get it: ${nx.map((d) => `<span>day ${d}</span>`).join('')}</div>
      <button class="btn primary block" onclick="msReview()">Start recall review · ${Math.max(s.due, Math.min(8, msQueue(8).length))} idea${msQueue(8).length === 1 ? '' : 's'}</button></div>`;
  } else if (s.learned) mission = `<div class="ms-mis calm"><b>Nothing due or fading.</b><span>Your ${s.learned} ideas are holding. Learn the next lesson, or use one on a call.</span></div>`;
  else mission = `<div class="ms-mis calm"><b>Your memory starts with the first lesson.</b><span>Finish a lesson below; it comes back for recall tomorrow, then in 3, 7, 21 and 60 days, spaced by how well you remember.</span></div>`;
  return `<div class="ms-panel"><div class="ms-row">${stat(s.learned, 'learned')}${stat(s.due, 'due today', s.due ? 'hot' : '')}${stat(s.fading, 'fading', s.fading ? 'warn' : '')}${stat(s.used, 'used for real')}${stat(s.mastered, 'maintained')}</div>${mission}</div>`;
}

/* ── MEMORY CURVE (Progress tab) ── */
function msCurve() {
  const s = msStats(), L = msLearned(); if (!L.length) return '';
  const tot = Math.max(1, s.learned), bars = MS_BANDS.map((b, i) => `<div class="ms-bb ${b[0]}"><i style="width:${Math.round(s.bands[i] / tot * 100)}%"></i><span>${b[1]} <em>${b[2]}</em></span><b>${s.bands[i]}</b></div>`).join('');
  const weak = L.slice().sort((a, b) => msR(a) - msR(b))[0], st = msStab(weak), W = 300, H = 110, X = (d) => 30 + d / 30 * (W - 40), Y = (r) => 10 + (1 - r) * (H - 30);
  const once = Array.from({ length: 31 }, (_, d) => `${d ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(Math.exp(-d / 1)).toFixed(1)}`).join(' ');
  let path = '', cur = 1, t0 = 0; [0, 1, 3, 7, 14, 30].forEach((rv, k, a) => { const end = a[k + 1] != null ? a[k + 1] : 30; for (let d = rv; d <= end; d += 0.5) path += `${path ? 'L' : 'M'}${X(d).toFixed(1)} ${Y(Math.exp(-(d - rv) / cur)).toFixed(1)} `; cur *= 2.5; t0 = rv; });
  return `<div class="card ms-curve"><div class="bcx-sec" style="margin:0 0 8px">Your memory right now <span>${s.learned} ideas learned</span></div>${bars}
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Forgetting curve: learned once versus reviewed on a spaced schedule"><line x1="30" y1="${Y(0)}" x2="${W - 10}" y2="${Y(0)}" stroke="var(--ln,#333)"/><line x1="30" y1="${Y(1)}" x2="30" y2="${Y(0)}" stroke="var(--ln,#333)"/>
      <path d="${once}" fill="none" stroke="var(--bad,#e5484d)" stroke-width="1.5" opacity=".8"/><path d="${path}" fill="none" stroke="var(--acc,#C9A24A)" stroke-width="2"/>
      ${[1, 3, 7, 14, 30].map((d) => `<circle cx="${X(d)}" cy="${Y(1)}" r="2.5" fill="var(--acc,#C9A24A)"/>`).join('')}
      <text x="26" y="${Y(1) + 4}" text-anchor="end" font-size="9" fill="var(--muted,#999)">100%</text><text x="26" y="${Y(0) + 3}" text-anchor="end" font-size="9" fill="var(--muted,#999)">0</text>
      ${[0, 7, 14, 30].map((d) => `<text x="${X(d)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="var(--muted,#999)">day ${d}</text>`).join('')}</svg>
    <div class="ms-leg"><span><i style="background:var(--bad,#e5484d)"></i>learned once, never reviewed</span><span><i style="background:var(--acc,#C9A24A)"></i>recalled on days 1, 3, 7, 14, 30</span></div>
    <div class="aq-note">Each recall resets the curve and makes it flatter, so the next gap can be longer. Weakest idea now: <b>${esc(XC.byId[weak].t)}</b> (${Math.round(msR(weak) * 100)}%, holds about ${Math.round(st)} day${Math.round(st) === 1 ? '' : 's'}).</div></div>`;
}

/* ── wire it in ── */
(function () {
  if (typeof bcPath === 'function') { const _p = bcPath; bcPath = function () { return msPanel() + _p.apply(this, arguments); }; }
  if (typeof bcProgress === 'function') { const _g = bcProgress; bcProgress = function () { return msCurve() + _g.apply(this, arguments); }; }
  if (typeof bcReviewStart === 'function') { bcReviewStart = function () { msReview(); }; }
  const st = document.createElement('style'); st.id = 'mastery-css';
  st.textContent = `.ms-panel{margin:0 0 12px}.ms-row{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.ms-st{border:1px solid var(--ln,#2a2a2e);border-radius:10px;padding:8px 4px;text-align:center}.ms-st b{display:block;font-size:20px;line-height:1.1}.ms-st span{font-size:10.5px;color:var(--muted,#999)}.ms-st.hot{border-color:var(--acc,#C9A24A)}.ms-st.hot b{color:var(--acc,#C9A24A)}.ms-st.warn b{color:var(--warn,#e5a50a)}
  .ms-mis{border:1px solid var(--acc,#C9A24A);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}.ms-mis.calm{border-color:var(--ln,#2a2a2e)}.ms-mis.calm span{font-size:13px;color:var(--muted,#999)}.ms-mh{display:flex;justify-content:space-between;align-items:center;font:600 11px/1 var(--mono,monospace);text-transform:uppercase;color:var(--muted,#999)}.ms-mt{font-size:17px}.ms-mp{font-size:13px;color:var(--muted,#bbb)}
  .ms-b{font:600 11px/1 var(--mono,monospace);padding:4px 7px;border-radius:6px;text-transform:none}.ms-b.strong{color:var(--good,#3fb950);background:rgb(63 185 80 / .12)}.ms-b.ok{color:var(--acc,#C9A24A);background:rgb(201 162 74 / .12)}.ms-b.fading{color:var(--warn,#e5a50a);background:rgb(229 165 10 / .14)}.ms-b.gone{color:var(--bad,#e5484d);background:rgb(229 72 77 / .14)}
  .ms-ck{display:grid;gap:4px}.ms-ck div{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted,#aaa)}.ms-ck div.on{color:var(--ink,#eee)}.ms-ck i{width:18px;height:18px;border:1px solid var(--ln,#444);border-radius:5px;display:grid;place-items:center;font-style:normal;font-size:11px}.ms-ck div.on i{background:var(--acc,#C9A24A);border-color:var(--acc,#C9A24A);color:#000}
  .ms-sch{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted,#999)}.ms-sch span{border:1px solid var(--ln,#2a2a2e);border-radius:12px;padding:2px 8px;font-family:var(--mono,monospace)}
  .ms-h{display:flex;justify-content:space-between;align-items:center;font:600 11px/1 var(--mono,monospace);color:var(--muted,#999);margin-bottom:8px}.ms-t{font-size:20px;font-weight:700}.ms-w{font-size:12px;color:var(--muted,#999);margin-bottom:10px}.ms-p{font-size:14px;margin:6px 0 8px}.ms-in{min-height:120px}
  .ms-said{border-left:2px solid var(--ln,#444);padding:6px 10px;margin:4px 0 10px;font-size:13px;color:var(--muted,#bbb)}.ms-said span,.ms-fix>span{display:block;font:600 11px/1.4 var(--mono,monospace);text-transform:uppercase;color:var(--muted,#999)}.ms-card{border:1px solid var(--ln,#2a2a2e);border-radius:10px;padding:10px;margin-bottom:10px}
  .ms-gq{font-size:13px;color:var(--muted,#999);margin:8px 0 6px}.ms-g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.ms-g button{min-height:62px;border:1px solid var(--ln,#2a2a2e);border-radius:10px;background:transparent;color:var(--ink,#eee);font:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.ms-g b{font-size:14px}.ms-g em{font-style:normal;font-size:10.5px;color:var(--muted,#999);text-align:center}.ms-g button:nth-child(1){border-color:var(--bad,#e5484d)}.ms-g button:nth-child(3){border-color:var(--acc,#C9A24A)}
  .ms-fix{border:1px solid var(--warn,#e5a50a);border-radius:10px;padding:10px;margin:6px 0}.ms-done{display:flex;flex-direction:column;gap:6px;padding:8px 0}.ms-done b{font-size:22px}.ms-done span{font-size:14px;color:var(--muted,#bbb)}
  .ms-curve svg{width:100%;height:auto;margin-top:10px}.ms-bb{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;margin:6px 0;position:relative}.ms-bb i{grid-column:1/-1;display:block;height:6px;border-radius:3px;background:currentColor;opacity:.85;min-width:2px}.ms-bb span{font-size:12px}.ms-bb em{font-style:normal;color:var(--muted,#999);font-size:11px}.ms-bb b{font-size:13px}.ms-bb.strong{color:var(--good,#3fb950)}.ms-bb.ok{color:var(--acc,#C9A24A)}.ms-bb.fading{color:var(--warn,#e5a50a)}.ms-bb.gone{color:var(--bad,#e5484d)}.ms-bb span,.ms-bb b{color:var(--ink,#eee)}
  .ms-leg{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:var(--muted,#999);margin-top:4px}.ms-leg i{display:inline-block;width:10px;height:3px;margin-right:4px;vertical-align:middle}
  .bcx-warm{display:none}@media (max-width:380px){.ms-row{grid-template-columns:repeat(3,1fr)}}`;
  document.head.appendChild(st);
})();
