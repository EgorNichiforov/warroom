/* War Room · cmove.js (13.6.0, owner request 17 Nov 2026): "Let Claude move"
   "When I click move I want an option: let Claude move. Analyse where it can go. If the step is part of a longer
    process, don't move only that step: move the whole process, or make it work somehow."
   How it works:
     1. The step you tap + the steps chained to it (same kind back to back, e.g. dials part 1 → part 2, or a review /
        log right after it) are the "process".
     2. Fixed blocks never move: group lessons, school, TT / OFP, travel, sleep, wake, weigh-in, shutdown.
     3. Claude (your AI key, the same one as food photos) plans the move with the whole day and tomorrow in view.
        No key, or the answer doesn't check out → the app's own planner moves the chain to the first free gap.
     4. You see the plan first. Nothing changes until you tap Apply. Later today = moved in the guided day;
        another day = a Todoist task at that time (same as the normal Move). */
'use strict';

let cmPlan = null, cmRunning = false;
const CM_FIXED_TYPES = ['wake', 'weight', 'shutdown', 'group', 'weighblk', 'shutdownblk'];
const CM_FIXED_KINDS = ['school', 'sleep', 'travel', 'tennis'];
const CM_FIXED_RE = /grup|group|lesson|lec(ț|t)i|școal|scoal|school|liceu|consulta|^\s*tt\b|\bofp\b|^\s*sleep\s*$|shutdown/i;
const CM_DIAL_WIN = [15 * 60, 20 * 60 + 45]; /* Moldova time = Florida 8:00–13:45: owners answer */

function cmFixed(x) {
  if (!x) return true;
  if (CM_FIXED_TYPES.includes(x.type)) return true;
  const b = x.b || x, t = gdClean(b.title || x.title || '');
  return CM_FIXED_KINDS.includes(b.kind) || /^\d+\.\s/.test(t) || CM_FIXED_RE.test(t);
}
function cmEnd(s) { return s.end ? tmin(s.end) : tmin(s.t) + gdDur(s); }
/* two neighbouring steps belong to the same process */
function cmLinked(a, b) {
  if (cmFixed(b) || b.type === 'shutdown') return false;
  const gap = tmin(b.t) - cmEnd(a); if (gap > 15 || gap < -5) return false;
  if (a.type === b.type && a.type !== 'todo' && a.type !== 'task') return true;
  return /review|recap|debrief|log\b|part\s*\d|\(\d+\s*\/\s*\d+\)|\d+\s*of\s*\d+/i.test(b.title);
}
/* the process: the step itself + every open step chained after it */
function cmChain(id) {
  const L = gdSteps().filter((s) => !s.st || s.id === id), i = L.findIndex((s) => s.id === id); if (i < 0) return [];
  const out = [L[i]];
  for (let j = i + 1; j < L.length; j++) { if (!cmLinked(out[out.length - 1], L[j])) break; out.push(L[j]); }
  return out;
}
/* everything that takes time on day k, with its real (moved) times; ids in `skip` are left out */
function cmBusy(k, skip) {
  skip = skip || new Set(); const d = pd(k), o = S.days[k] || {}, mv = o.mv || {}, blk = o.blk || {};
  const L = typeof arcBlocks === 'function' ? arcBlocks(d) : blocksFor(d), out = [];
  L.forEach((b) => {
    if (skip.has(b.id) || blk[b.id] === 'moved') return;
    const s0 = tmin(b.start), e0 = b.end === '24:00' ? 1440 : (tmin(b.end) || s0 + 30), s = mv[b.id] ? tmin(mv[b.id]) : s0;
    out.push({ id: b.id, s, e: s + (e0 - s0), title: gdClean(b.title), fixed: cmFixed({ b, type: typeof gdType === 'function' ? gdType(b) : '' }) });
  });
  Object.values(S.tasks || {}).forEach((t) => { if (t && !t._del && !t.done && t.due === k && t.time && !skip.has('td:' + t.id)) { const s = tmin(mv['td:' + t.id] || t.time); out.push({ id: 'td:' + t.id, s, e: s + 15, title: t.title, fixed: false }); } });
  return out.sort((a, b) => a.s - b.s);
}
function cmFrame(k) { const d = pd(k); return [tmin((typeof wakeFor === 'function' ? wakeFor(d) : S.settings.wake) || '05:20') + 30, tmin(S.settings.bed || '21:00') - 15]; }

/* ── the app's own planner (no AI key, or the AI answer failed the checks) ──
   1. Shift the whole chain by one delta into a gap long enough for all of it (later today first, then earlier, then tomorrow).
   2. Doesn't fit in one piece and it's dials? Split the dials across the free windows in Florida hours today
      (e.g. 60 before the lesson, 40 after), the rest of the process right after the last part.
   Dials always stay in Florida calling hours. */
function cmFreeWins(kk, skip, from, lo, hi) {
  const busy = cmBusy(kk, skip).map((x) => [x.s, x.e]).filter((x) => x[1] > x[0]).sort((a, b) => a[0] - b[0]), out = [];
  let t = Math.max(from, lo);
  busy.forEach((x) => { if (x[0] > t && Math.min(x[0], hi) - t >= 20) out.push([Math.ceil(t / 5) * 5, Math.min(x[0], hi)]); t = Math.max(t, x[1]); });
  if (hi - t >= 20) out.push([Math.ceil(t / 5) * 5, hi]);
  return out.filter((w) => w[1] - w[0] >= 20);
}
function cmLocalPlan(chain) {
  const d = gdDayDate(), k = dk(d), k1 = dk(addDays(d, 1)), ids = new Set(chain.map((s) => s.id)), isT = k === dk(new Date());
  const st = tmin(chain[0].t), span = cmEnd(chain[chain.length - 1]) - st, dials = chain.some((s) => s.type === 'dials');
  const okDial = (hm) => !dials || (tmin(hm) >= CM_DIAL_WIN[0] && tmin(hm) + span <= CM_DIAL_WIN[1]);
  const slotsOn = (kk, from) => gdFindSlots(cmBusy(kk, kk === k ? ids : new Set()).map((x) => [x.s, x.e]), span, from, 12, kk).filter((hm) => tmin(hm) !== st && okDial(hm));
  const today = slotsOn(k, isT ? nowMin() + 10 : 0);
  let kk = k, hm = today.find((h) => tmin(h) > st) || today[0];
  if (hm) { const dl = tmin(hm) - st; return { by: 'app', why: `The whole process (${span} min) fits ${tmin(hm) > st ? 'later' : 'earlier'} today at ${hm}, clear of every fixed block.`, moves: chain.map((s) => ({ id: s.id, k, t: hmOf(tmin(s.t) + dl) })) }; }
  if (dials) {
    const dSteps = chain.filter((s) => s.type === 'dials'), rest = chain.filter((s) => s.type !== 'dials');
    const need = dSteps.reduce((a, s) => a + (cmEnd(s) - tmin(s.t)), 0), restMin = rest.reduce((a, s) => a + (cmEnd(s) - tmin(s.t)), 0);
    const wins = cmFreeWins(k, ids, Math.max(isT ? nowMin() + 10 : 0, st + 30), CM_DIAL_WIN[0], CM_DIAL_WIN[1]);
    const have = wins.reduce((a, w) => a + (w[1] - w[0]), 0);
    if (have >= Math.min(need, 60)) {
      const moves = []; let left = need, wi = 0, ws = wins.length ? wins[0][0] : 0, lastEnd = 0;
      dSteps.forEach((s) => {
        let m = Math.round((cmEnd(s) - tmin(s.t)) * Math.min(1, have / need));
        while (m > 0 && wi < wins.length) { const room = wins[wi][1] - ws; if (room < 20) { wi++; if (wi < wins.length) ws = wins[wi][0]; continue; } const take = Math.min(room, m); moves.push({ id: s.id, k, t: hmOf(ws), min: take }); ws += take; lastEnd = ws; m -= take; left -= take; if (ws >= wins[wi][1] - 19) { wi++; if (wi < wins.length) ws = wins[wi][0]; } }
      });
      const tail = gdFindSlots(cmBusy(k, ids).map((x) => [x.s, x.e]).concat(moves.map((x) => [tmin(x.t), tmin(x.t) + x.min])), Math.max(10, restMin), lastEnd, 1, k)[0];
      let t2 = tail ? tmin(tail) : null, restTom = false;
      if (t2 == null && rest.length) { const tt = gdFindSlots(cmBusy(k1).map((x) => [x.s, x.e]), Math.max(10, restMin), 0, 1, k1)[0]; if (tt) { t2 = tmin(tt); restTom = true; } }
      rest.forEach((s) => { if (t2 == null) return; moves.push({ id: s.id, k: restTom ? k1 : k, t: hmOf(t2) }); t2 += cmEnd(s) - tmin(s.t); });
      const dm = moves.filter((x) => x.min);
      if (dm.length) { const got = dm.reduce((a, x) => a + x.min, 0), cut = need - got;
        const head = dm.length > 1 ? `It doesn't fit in one piece, so the dials are split into ${dm.length} parts around your fixed blocks (${dm.map((x) => x.t + '–' + hmOf(tmin(x.t) + x.min)).join(', ')}), all inside Florida hours` : `Only ${got} min of calling time is free in Florida hours today, so the dials run ${dm[0].t}–${hmOf(tmin(dm[0].t) + got)}`;
        if (dm.length === 1 && dSteps.length === 1) dm[0].min = got;
        return { by: 'app', why: head + (cut > 0 && dm.length > 1 ? ` (${cut} min less than planned: that's all the free time left)` : '') + (rest.length ? (restTom ? '. The rest of the process goes to tomorrow (Todoist).' : '. The rest of the process follows straight after.') : '.'), moves }; }
    }
  }
  const tom = slotsOn(k1, 0); if (!tom.length) return null;
  const dl = tmin(tom[0]) - st;
  return { by: 'app', why: `Nothing free today fits it, so the whole process goes to tomorrow ${tom[0]} (as Todoist tasks, so you get the reminder).`, moves: chain.map((s) => ({ id: s.id, k: k1, t: hmOf(tmin(s.t) + dl) })) };
}

/* ── Claude's planner ── */
const CM_SYSTEM = `You reschedule Egor's day inside his War Room app. He is a student in Moldova who coaches tennis and cold-calls Florida home-care agencies (#1 goal: $20k MRR by 1 July 2027).
He tapped "move" on one step. Move it, and every step that belongs to the same process, so the day still works.
Rules:
- Never move a FIXED block, never put anything on top of one. Fixed = school, group lessons, TT / OFP (his own training), travel, sleep, wake-up, weigh-in, shutdown.
- Keep a process together and in order: if a step is part of a chain (dials part 1 then part 2, then a call review), move the chain and keep the small gaps between its steps. If the whole chain cannot fit in one place, you may split it around a fixed block, keeping the order.
- Dial blocks only between 15:00 and 20:45 Moldova time (Florida owners answer then). Sleep at 21:00 is protected: nothing ends after 20:45.
- Today: nothing earlier than the current time + 10 min. Prefer the earliest good spot today; if it truly does not fit, use tomorrow.
- Flexible steps not in the process can be shifted only if that is the only way, and say so.
- At most 8 moves. Times as HH:MM, 24-hour, start times only.
Reply with ONLY this JSON, no other text:
{"why":"one or two plain sentences: what you moved and why","moves":[{"id":"<step id>","day":"today|tomorrow","t":"HH:MM"}]}`;

function cmDescribe(k, label, ids) {
  const L = cmBusy(k).map((x) => `${hmOf(x.s)}-${hmOf(x.e)} ${x.fixed ? 'FIXED' : 'flex'} ${ids && ids.has(x.id) ? '[PROCESS] ' : ''}id=${x.id} · ${x.title}`);
  return `${label} (${k}):\n${L.join('\n') || 'nothing'}`;
}
async function cmAiPlan(target, chain) {
  const d = gdDayDate(), k = dk(d), k1 = dk(addDays(d, 1)), ids = new Set(chain.map((s) => s.id)), open = gdSteps().filter((s) => !s.st && !cmFixed(s));
  const user = `NOW: ${hmOf(nowMin())} Moldova, ${DAY_LONG[dow(d)]}.
HE TAPPED: id=${target.id} · ${target.title} · ${target.t}${target.end ? '-' + target.end : ''}
PROCESS THE APP DETECTED (check it, extend or shrink it if the titles say otherwise): ${chain.map((s) => `id=${s.id} (${s.t} ${s.title})`).join(' → ')}
MOVABLE STEPS TODAY: ${open.map((s) => `id=${s.id} ${s.t}${s.end ? '-' + s.end : ''} ${s.title}`).join('; ') || 'none'}

${cmDescribe(k, 'TODAY', ids)}

${cmDescribe(k1, 'TOMORROW')}`;
  const txt = await aiText(CM_SYSTEM, [{ role: 'user', text: user }]);
  const m = String(txt || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('No plan in the answer');
  const j = JSON.parse(m[0]);
  return { by: 'claude', why: String(j.why || '').slice(0, 400), moves: (j.moves || []).map((x) => ({ id: String(x.id || ''), k: x.day === 'tomorrow' ? k1 : k, t: String(x.t || ''), min: Number(x.min) > 0 ? Math.round(Number(x.min)) : null })) };
}

/* ── check a plan against the rules; returns the plan with warnings, or null if unusable ── */
function cmCheck(plan, target) {
  if (!plan || !plan.moves || !plan.moves.length) return null;
  const d = gdDayDate(), k = dk(d), isT = k === dk(new Date()), steps = {}; gdSteps().forEach((s) => { steps[s.id] = s; });
  const seen = new Set(), out = [];
  for (const mv of plan.moves.slice(0, 8)) {
    const s = steps[mv.id], split = !!mv.min && mv.k === k; if (!s || cmFixed(s) || (s.st && s.id !== target.id)) continue;
    if (seen.has(mv.id) && !split) continue;
    if (!/^\d\d:\d\d$/.test(mv.t)) continue;
    if (mv.k === k && isT && tmin(mv.t) < nowMin() + 5) continue;
    const full = cmEnd(s) - tmin(s.t);
    seen.add(mv.id); out.push({ id: mv.id, k: mv.k, t: mv.t, s, from: s.t, dur: split ? Math.min(mv.min, 600) : full, min: split ? Math.min(mv.min, 600) : null, full });
  }
  if (!out.some((x) => x.id === target.id)) return null;
  const moved = new Set(out.map((x) => x.id));
  out.forEach((x) => {
    const st = tmin(x.t), en = st + x.dur, fr = cmFrame(x.k), w = [];
    const others = cmBusy(x.k, x.k === k ? moved : new Set()).concat(out.filter((y) => y !== x && y.k === x.k).map((y) => ({ s: tmin(y.t), e: tmin(y.t) + y.dur, title: y.s.title, fixed: false })));
    const hit = others.find((o) => o.s < en && o.e > st); if (hit) w.push(`overlaps ${hit.title} (${hmOf(hit.s)})`);
    if (st < fr[0] || en > fr[1]) w.push('outside your day');
    if (x.s.type === 'dials' && (st < CM_DIAL_WIN[0] || en > CM_DIAL_WIN[1])) w.push('outside Florida calling hours');
    x.warn = w.join(' · ');
  });
  if (out.some((x) => x.warn && /overlaps/.test(x.warn) && cmBusy(x.k).some((o) => o.fixed && o.s < tmin(x.t) + x.dur && o.e > tmin(x.t)))) plan.fixedHit = true;
  return Object.assign({}, plan, { moves: out });
}

/* ── UI ── */
async function cmOpen(id) {
  if (cmRunning) return; const target = gdStep(id); if (!target) return;
  const chain = cmChain(id);
  openModal(`<h2 style="margin-bottom:4px">✦ Claude is planning</h2><div class="small muted" style="margin-bottom:14px">${esc(target.title)} · ${target.t}${chain.length > 1 ? ` · part of a ${chain.length}-step process` : ''}</div><div class="gd-cm-spin">Looking at today and tomorrow…</div>`, true);
  cmRunning = true; let plan = null, note = '';
  try {
    if (typeof aiOn === 'function' && aiOn()) {
      try { plan = cmCheck(await cmAiPlan(target, chain), target); if (!plan || plan.fixedHit) { note = 'Claude\'s plan clashed with a fixed block, so this is the app\'s own plan.'; plan = null; } }
      catch (e) { note = 'Claude didn\'t answer (' + String(e.message || e).slice(0, 60) + '), so this is the app\'s own plan.'; }
    } else note = 'No AI key on this device yet (More → Food photo AI), so the app planned it. Same rules, simpler.';
    if (!plan) plan = cmCheck(cmLocalPlan(chain), target);
  } finally { cmRunning = false; }
  if (!plan) { openModal(`<h2>No good spot</h2><div class="small muted" style="margin-bottom:14px">Nothing free today or tomorrow fits this without breaking a fixed block or your 21:00 bedtime.</div><button class="btn block" onclick="gdSkipSheet('${id}')">Back: move it by hand</button>`, true); return; }
  cmPlan = plan; cmShow(id, note);
}
function cmShow(id, note) {
  const p = cmPlan, d = gdDayDate(), k = dk(d), dayLbl = (kk) => kk === k ? 'Today' : kk === dk(addDays(d, 1)) ? 'Tomorrow' : fmtShort(pd(kk));
  const rows = p.moves.map((x) => `<div class="gd-cm-row${x.warn ? ' warn' : ''}"><span>${esc(x.s.title)}</span><b>${x.from} → ${dayLbl(x.k)} ${x.t}${x.min ? '–' + hmOf(tmin(x.t) + x.min) : ''}</b>${x.warn ? `<em>⚠ ${esc(x.warn)}</em>` : ''}</div>`).join('');
  openModal(`<h2 style="margin-bottom:4px">✦ ${p.by === 'claude' ? "Claude's plan" : 'The plan'}</h2>
    <div class="small" style="margin-bottom:10px">${esc(p.why || '')}</div>${note ? `<div class="xs muted" style="margin-bottom:10px">${esc(note)}</div>` : ''}
    <div class="gd-cm-list">${rows}</div>
    <div class="xs muted" style="margin:8px 0 14px">Fixed blocks (lessons, school, TT, sleep) stay where they are. Steps moved to another day become Todoist tasks at that time.</div>
    <button class="btn primary block" style="margin-bottom:8px" onclick="cmApply()">Apply · move ${p.moves.length} step${p.moves.length > 1 ? 's' : ''}</button>
    ${p.by === 'claude' ? `<button class="btn block" style="margin-bottom:8px" onclick="cmOpen('${id}')">Ask again</button>` : ''}
    <button class="btn block ghost" onclick="gdSkipSheet('${id}')">Back: move it by hand</button>`, true);
}
function cmApply() {
  const p = cmPlan; if (!p) return; closeModal();
  const d = gdDayDate(), k = dk(d), steps = {}; gdSteps().forEach((s) => { steps[s.id] = s; });
  const by = {}; p.moves.forEach((x) => { (by[x.id] = by[x.id] || []).push(x); });
  let n = 0, cut = 0;
  Object.keys(by).forEach((id) => { const s = steps[id], L = by[id].sort((a, b) => tmin(a.t) - tmin(b.t)); if (!s) return;
    if (L.some((x) => x.min) && L[0].k === k && s.b) { cmSplit(s, L); n += L.length; }
    else { gdMoveCore(s, L[0].k, L[0].t); n++; } });
  cmPlan = null; gdFocusId = null; gdBuzz([12, 40, 12]);
  gdNext(`Moved ${n} step${n > 1 ? 's' : ''}${p.moves.some((x) => x.k !== k) ? ' (tomorrow\'s are in Todoist)' : ''}.`);
}
/* split one block into parts for today only: the weekly plan and the calendar stay as they are.
   Dial counts are shared out by minutes, so the day's dial total stays the same. */
function cmSplit(s, parts) {
  const d = gdDayDate(), o = day(d), b = s.b, sc = dayOnce(d), tot = parts.reduce((a, x) => a + x.min, 0);
  const N = +((b.title.match(/DIALS?:\s*(\d+)/i) || [])[1] || 0); let given = 0;
  if ((sc.add || []).some((x) => x.id === b.id)) sc.add = sc.add.filter((x) => x.id !== b.id); else if (!sc.skip.includes(b.id)) sc.skip.push(b.id);
  parts.forEach((x, i) => {
    const c = N ? (i === parts.length - 1 ? N - given : Math.round((N * x.min) / tot)) : 0; given += c;
    const title = (N ? b.title.replace(/(DIALS?:\s*)\d+/i, '$1' + c) : b.title).replace(/\s*\(part \d+\/\d+\)$/, '') + (parts.length > 1 ? ` (part ${i + 1}/${parts.length})` : '');
    sc.add.push(Object.assign({}, b, { id: 'once:' + uid(), from: b.id, title, start: x.t, end: hmOf(tmin(x.t) + x.min), days: [dow(d)], cal: false, once: true }));
  });
  if (o.mv) delete o.mv[b.id]; touch(o);
}

/* the block sheet in ARC (tap a block → Move today) gets the same button */
if (typeof arcBlk === 'function' && !arcBlk._cm) {
  const _arcBlk = arcBlk;
  arcBlk = function (id) {
    _arcBlk(id);
    try { const s = gdStep(id), h = [...document.querySelectorAll('#modal .sec-h')].find((e) => /move today/i.test(e.textContent));
      if (s && !s.st && !cmFixed(s) && h) h.insertAdjacentHTML('beforebegin', `<button class="btn primary block" style="margin-top:12px" onclick="cmOpen('${id}')">✦ Let Claude move it (whole process)</button>`); } catch (e) { }
  };
  arcBlk._ad = _arcBlk._ad; arcBlk._cm = 1;
}

(function () {
  const css = `.gd-cm-list{border:1px solid var(--ln,var(--line));border-radius:10px;overflow:hidden}
  .gd-cm-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:10px 12px;border-bottom:1px solid var(--ln,var(--line));font-size:14px}.gd-cm-row:last-child{border-bottom:0}
  .gd-cm-row b{font-variant-numeric:tabular-nums;white-space:nowrap}.gd-cm-row em{grid-column:1/-1;font-style:normal;font-size:12px;color:var(--warn,#ffb020)}
  .gd-cm-spin{font-size:14px;color:var(--mut,var(--muted));padding:18px 0;animation:gdcm 1.2s ease-in-out infinite}@keyframes gdcm{50%{opacity:.4}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
