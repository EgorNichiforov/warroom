/* War Room 13.31 · learnx.js — ONE way to learn.
   Work → Learn opens on "Now": how much time do you have → one session → what you got done → what is next.
   Nothing here is a second system. A session is a short list of steps, and every step runs the part that already
   exists and already keeps the record:
     lesson   → the Bootcamp lesson (video, explanation, questions; sets "learned" and the review date)
     review   → the recall test (forgetting curve)
     practice → the capability training flow (writes capability evidence)
     mission  → the lesson's real-world move (evidence only if you write what you did; or a task)
     apply    → "what will you do with it" for a finished resource
     consume  → a library resource, resumed where you stopped
   Progress therefore lives in one place per kind, as before. The session itself is saved after every step, so closing
   the app loses nothing. Watching a video never counts as mastery: only tests, practice and missions move a stage. */
const LX_MIN = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const LX_FOCUS = { auto: 'Best use', biz: 'Business', life: 'Personal', review: 'Review' };
const LX_KIND = { lesson: 'Lesson', review: 'Recall', rebuild: 'Rebuild', practice: 'Practice', mission: 'Mission', apply: 'Use it', consume: 'Resource', debrief: 'Debrief', research: 'Research' };
/* learning paths: [id, name, who you become, Bootcamp modules in order, Blueprint areas, track] */
const LX_PATHS = [
  ['cb', 'Build and scale Caregiver Bench', 'An owner who knows the market, the offer and the numbers.', ['m1', 'mk', 'm2', 'm7', 'lg'], ['I'], 'biz'],
  ['sell', 'Become an excellent salesperson', 'Opens, diagnoses, handles objections and closes on the phone.', ['m4', 'm5', 'm6', 'm3', 'm8'], ['I', 'D'], 'biz'],
  ['lead', 'Become a recruiter and manager', 'Builds a recruiting machine and, later, a team that runs it.', ['m10'], ['I'], 'biz'],
  ['self', 'Self-leadership', 'Does the work on the bad days.', ['m0', 'ex', 'm9', 'l2'], ['A'], 'biz'],
  ['social', 'Social intelligence and humour', 'Good company; clear, warm, hard to push around.', ['l6', 'l11'], ['C', 'D'], 'life'],
  ['money', 'Financial independence', 'Runs money and paperwork like an adult.', ['l10', 'm11'], ['H'], 'life'],
  ['indep', 'Practical independent living', 'Can move out and run a life alone, safely.', ['l9'], ['E', 'F'], 'life'],
  ['body', 'Physical development', 'Strong, rested, fit for tennis.', ['l1', 'l4', 'l5'], ['B'], 'life'],
  ['world', 'Thinking and understanding the world', 'Learns fast, judges well, knows how things work.', ['l3', 'l7', 'l8'], ['G', 'J'], 'life']];
let LXF = 'auto', LXP = null;
function lxReady() { return typeof XC !== 'undefined' && XC && XC.byId && typeof BC !== 'undefined' && BC && BC.cardMod && typeof KPL !== 'undefined' && KPL; }
function lxLog() { return bcV('lx:log', []) || []; }
function lxCur() { const s = bcV('lx:cur', null); return s && s.steps && s.steps.length ? s : null; }
function lxSaveCur(s) { bcW('lx:cur', s || 0); try { save(true); } catch (e) { } /* written at once: closing the app a second later must not lose the step */ }
function lxVid(c) { const x = (c.clip || [])[0]; if (!x) return 0; return x[2] > x[1] ? Math.max(1, Math.ceil((x[2] - x[1]) / 60)) : Number(c.clipMin) || 0; }
function lxTr(cardId) { const m = BC.mod[BC.cardMod[cardId]]; return m && m.tr === 'life' ? 'life' : 'biz'; }
/* 13.32 · which track a session serves is decided by evidence, never by taking turns:
   1. your own weekly personal minimum, if you set one and this week is under it;
   2. a capability the current business stage needs that has weak evidence;
   3. a personal competency your Blueprint marks NOW that has an unopened lesson;
   4. otherwise the business path. Unused learning and due reviews are handled inside lxBuild for either track. */
function lxWeekMin(dom) { const m = dk(monday(new Date())); return lxLog().filter((s) => (s.d || '') >= m && (!dom || s.dom === dom)).reduce((a, s) => a + (Number(s.spent) || 0), 0); }
function lxPersMin() { const v = Number((((S.settings || {}).learn) || {}).persMin); return v > 0 ? v : null; }
function lxPersUnder() { const m = lxPersMin(); if (!m) return null; const got = lxWeekMin('life'); return got < m ? { min: m, got, def: (m - got) / m } : null; }
function lxBlocking() { let H = { now: [] }; try { H = rsHorizonCaps(); } catch (e) { } return H.now.map((id) => cmCap(id)).filter((c) => c && cmCards(c).some((id) => BC.cardMod[id] && lxTr(id) === 'biz')).map((c) => ({ c, lv: cmPerf(c.id).lv })).filter((r) => r.lv < 3).sort((a, b) => a.lv - b.lv); }
function lxDomain() {
  const u = lxPersUnder(); if (u) return { dom: 'life', why: `Personal development has ${u.got} of your ${u.min} weekly minutes.` };
  const B = lxBlocking(); if (B.length) return { dom: 'biz', cap: B[0].c.id, why: `"${B[0].c.n}" is needed at your current business stage and the record shows "${CM_PERF[B[0].lv].toLowerCase()}".` };
  let pn = null; try { pn = bpAll().find((x) => x.hz === 'now' && x.area !== 'I' && bpCards(x).some((id) => !bcV('l:' + id, null) && BC.cardMod[id] && lxTr(id) === 'life')); } catch (e) { }
  if (pn) return { dom: 'life', why: `"${pn.n}" is marked NOW in your Blueprint and has an unopened lesson.` };
  return { dom: 'biz', why: 'Nothing is blocking right now, so the next lesson on the business path.' };
}
function lxTurn() { return lxDomain().dom; } /* kept for old callers */
function lxPersSet() { const cur = lxPersMin(); openModal(`<h2>Weekly personal minimum</h2><div class="hint">Minutes of personal development (body, mind, people, practical life) you want Learn to protect each week. While a week is under it, the next session is personal. Empty or 0 = no guarantee.</div><input class="aq-in" id="lx-pm" type="number" inputmode="numeric" min="0" max="600" value="${cur || ''}" placeholder="minutes per week"><div class="xs muted">This week so far: ${lxWeekMin('life')} personal minutes in finished sessions.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="lxPersSave()">Save</button></div>`); }
function lxPersSave() { const v = Math.max(0, Math.min(600, Math.round(Number(($('lx-pm') || {}).value) || 0))); S.settings.learn = Object.assign({}, S.settings.learn || {}, { persMin: v || null, _u: now() }); save(); closeModal(); toast(v ? `Protected: ${v} personal minutes a week` : 'No weekly minimum set'); render(); }
function lxLearned(ids) { return ids.filter((id) => bcV('l:' + id, null)); }
/* learned but never practised (or practice skipped twice in sessions): action before more input */
function lxUnpracticed() {
  const skips = {}; lxLog().slice(-12).forEach((s) => (s.skipped || []).forEach((c) => { skips[c] = (skips[c] || 0) + 1; }));
  let H = { now: [] }; try { H = rsHorizonCaps(); } catch (e) { }
  return cmAll().map((c) => ({ c, n: lxLearned(cmCards(c)).length, ev: cmLog(c.id).length, sk: skips[c.id] || 0 })).filter((r) => (r.n >= 2 && !r.ev) || r.sk >= 2).sort((a, b) => b.sk - a.sk || (H.now.includes(b.c.id) ? 1 : 0) - (H.now.includes(a.c.id) ? 1 : 0) || b.n - a.n);
}
function lxPathOf(id) { return LX_PATHS.find((p) => p[0] === id) || null; }
function lxPathCards(p) { return p[3].map((m) => BC.mod[m]).filter(Boolean).flatMap((m) => m.cards).filter((c) => XC.byId[c]); }
function lxPathProg(p) { const C = lxPathCards(p), d = lxLearned(C).length; return { n: C.length, d, pct: C.length ? Math.round(d / C.length * 100) : 0, next: C.find((c) => !bcV('l:' + c, null)) || null }; }
/* next new lesson: inside a chosen path, else an open module of the track, capabilities that matter NOW first */
function lxNextCard(tr, skip, path, cap) {
  let pool = []; const p = path && lxPathOf(path);
  if (p) pool = lxPathCards(p); else { try { pool = bcTrack(tr).filter((m) => bcOpen(m)).flatMap((m) => m.cards); } catch (e) { pool = []; } }
  pool = pool.filter((id) => XC.byId[id] && !bcV('l:' + id, null) && !skip.has(id)); if (!pool.length) return null;
  let H = { now: [] }; try { H = rsHorizonCaps(); } catch (e) { }
  const blk = cap ? pool.find((id) => cmCapsOfCard(id).some((c) => c.id === cap)) : null, hot = pool.find((id) => cmCapsOfCard(id).some((c) => H.now.includes(c.id)));
  return XC.byId[p ? pool[0] : blk || hot || pool[0]];
}
/* a Blueprint competency that matters soon and has no lesson of its own */
function lxGap(tr) { const A = tr === 'life' ? 'ABCDEFGHJ' : 'I'; return bpAll().filter((x) => A.includes(x.area) && x.hz !== 'later' && !bpCards(x).length && !bpRes(x).length).sort((a, b) => (a.hz === 'now' ? 0 : 1) - (b.hz === 'now' ? 0 : 1))[0] || null; }
function lxGapRes() { for (const x of bpAll()) { if (bpCards(x).length && x.cap) continue; const r = bpRes(x).find((r) => r.u && r.u.st !== 'done' && r.u.st !== 'arch'); if (r && (!bpCards(x).length || !x.cap)) return { x, r }; } return null; }

/* library resources worth opening, best first (the Content planner's own score) */
function lxRes() { try { const F = ccFocus(); return ccAll().filter(ccOpenable).filter((x) => !x.clip).map((x) => { const sc = ccScore(x, F, 'any'); return { x, s: sc.s, why: sc.why }; }).sort((a, b) => b.s - a.s).slice(0, 25); } catch (e) { return []; } }

/* ── the engine ── opt: { skip: [card ids], path: id, dry: no side effects } */
function lxBuild(min, focus, opt) {
  opt = opt || {}; min = Math.max(3, Math.min(180, Math.round(Number(min) || 20))); focus = focus || 'auto';
  const skip = new Set(opt.skip || []), steps = [], notes = []; let left = min;
  const add = (s) => { s.min = Math.max(1, Math.min(s.min, Math.max(1, left))); steps.push(Object.assign({ done: 0, res: '' }, s)); left -= s.min; };
  const p = opt.path && lxPathOf(opt.path), D = focus === 'biz' || focus === 'life' || p ? null : lxDomain(), dom = focus === 'biz' || focus === 'life' ? focus : p ? p[5] : D.dom;
  let due = []; try { due = msQueue(8); } catch (e) { }
  let un = []; try { un = rsUnapplied(); } catch (e) { }
  const unp = lxUnpracticed(), g = bcGate(dom); let obj = '', why = '', after = '', mode = 'learn', lesson = null;
  /* A · use before more input */
  if (focus !== 'review' && !p && (un.length >= 3 || unp.length)) {
    mode = 'apply';
    if (un.length >= 3) { add({ k: 'apply', id: un[0].id, min: min <= 10 ? min : 10, t: 'Use it: ' + un[0].t, why: `You finished ${un.length} resources and have used none of them. Turn this one into a task, an experiment or a procedure.` }); obj = 'Put one finished idea to work.'; }
    else { const r = unp[0]; add({ k: 'practice', cap: r.c.id, min: min <= 10 ? Math.max(3, min - 2) : 8, t: 'Practise: ' + r.c.n, why: r.sk >= 2 ? `You skipped practising this ${r.sk} times.` : `You opened ${r.n} lessons on this and have not practised it once.` }); obj = 'Practise ' + r.c.n + ' once.'; }
    why = 'You have taken in more than you have used. Another video would feel like progress and change nothing.'; after = 'One thing done or scheduled, instead of one more thing watched.';
  }
  /* B · reviews that are due */
  if (due.length && left >= 2) { const n = Math.min(due.length, 8, focus === 'review' ? Math.max(3, left) : min <= 5 ? 3 : Math.max(2, Math.floor(min * 0.2))); add({ k: 'review', ids: due.slice(0, n), min: Math.max(2, Math.ceil(n * 0.75)), t: `Recall ${n} lesson${n === 1 ? '' : 's'} that ${n === 1 ? 'is' : 'are'} fading`, why: 'Due by the forgetting curve. Recalling now is what keeps them.' }); }
  if (focus === 'review') { if (!steps.length) notes.push('No reviews are due. Nothing to recall today.'); obj = 'Keep what you already learned.'; why = 'You asked for review only.'; after = 'Fading lessons are back above their memory floor.'; }
  /* C · a new lesson, or practice when new lessons are not earned yet */
  if (mode === 'learn' && focus !== 'review' && left >= 5) {
    if (!g.ok) { notes.push(`New lessons are earned by dials: ${g.d}/${typeof BC_DIAL_GATE !== 'undefined' ? BC_DIAL_GATE : 10} today and ${g.done} already opened. This session uses what you have.`); let w = null; try { w = (cmWeak()[0] || {}).c || null; } catch (e) { } const L = cmAll().find((c) => lxLearned(cmCards(c)).length && (!w || c.id === w.id)); if (L) { add({ k: 'practice', cap: L.id, min: Math.min(8, left), t: 'Practise: ' + L.n, why: w ? 'Your weakest capability by the record.' : 'Practice does not need new lessons.' }); obj = obj || 'Practise ' + L.n + '.'; } }
    else {
      const gr = !p && dom === 'life' ? lxGapRes() : null;
      if (gr) { add({ k: 'consume', id: gr.r.id, min: Math.min(left, gr.r.min || 10), t: gr.r.t, why: `Found by research for "${gr.x.n}", which has no lesson of its own yet.` }); obj = 'Get a first grounding in: ' + gr.x.n + '.'; why = 'It is a gap in your Blueprint and a resource for it has just been found.'; after = 'Afterwards, write the one thing you will try.'; }
      const c = left >= 5 ? lxNextCard(dom, skip, opt.path, D && D.cap) : null;
      if (c) { const v = lxVid(c), withV = v > 0 && v + 5 <= left, caps = cmCapsOfCard(c.id), hz = caps.some((k) => { try { return rsHorizonCaps().now.includes(k.id); } catch (e) { return false; } });
        add({ k: 'lesson', id: c.id, vid: v, withV, min: 5 + (withV ? v : 0), t: c.t, why: (p ? `Next on the path "${p[1]}".` : D ? D.why : hz ? 'Next lesson for a capability you need now.' : dom === 'life' ? 'You chose personal.' : 'You chose business.') + (v && !withV ? ` Its video is ${v} min: too long for this slot, so read and test now, watch later.` : '') });
        lesson = c; if (!gr) obj = 'Learn "' + c.t + '" well enough to answer its questions without looking.'; if (!gr) why = caps.length ? 'It builds: ' + caps.slice(0, 2).map((k) => k.n).join(', ') + '.' : 'It is the next lesson in order.'; after = c.move ? 'Afterwards you can: ' + c.move.split('. ')[0] + '.' : ''; }
      else if (!gr) notes.push(p ? 'This path has no unopened lesson left.' : 'No unopened lesson is available on this track right now.');
    }
  }
  /* D · practise what the lesson teaches · E · do it for real */
  if (lesson && left >= 3) { const cap = cmCapsOfCard(lesson.id)[0]; if (cap) add({ k: 'practice', cap: cap.id, min: left >= 8 ? 6 : Math.min(4, left), t: 'Practise: ' + cap.n, why: 'A lesson is only "Introduced" until you practise it.' }); }
  if (lesson && lesson.move && min >= 20 && left >= 5) add({ k: 'mission', id: lesson.id, min: left >= 15 ? 10 : 5, t: 'Do it for real', why: lesson.move });
  /* E2 · the two steps taken over from the old 25-minute capability mission */
  if (lesson && min >= 15 && left >= 3) add({ k: 'rebuild', ids: [lesson.id], min: 3, t: 'Rebuild from memory: ' + lesson.t, why: 'Closed book. What you can rebuild is what you own.' });
  /* F · a longer resource from the library; a resource found for a competency that has no lesson goes first */
  if (focus !== 'review' && left >= 8) {
    if (left >= 10) { const cap5 = min >= 90 ? 5 : 3, have = new Set(steps.map((s) => s.id)); let n = 0; lxRes().forEach((r) => { if (n >= cap5 || left < 8 || have.has(r.x.id)) return; const L = ccLeft(r.x); if (L < 5 && min > 15) return; if (L <= left) { add({ k: 'consume', id: r.x.id, min: L, t: r.x.t, why: r.why }); n++; } else if (!n && left >= 15) { add({ k: 'consume', id: r.x.id, min: left, t: r.x.t, why: r.why + ` · ${left} of ${L} min now; it resumes where you stop` }); n++; } }); }
  }
  /* G · a second lesson in a long session */
  if (lesson && g.ok && left >= 6) { skip.add(lesson.id); const c2 = lxNextCard(dom, skip, opt.path); if (c2) add({ k: 'lesson', id: c2.id, vid: lxVid(c2), withV: false, min: 6, t: c2.t, why: 'Time for one more. Read and test; its video can wait.' }); }
  /* H · a competency with no lesson: ask for research instead of pretending */
  const gap = !p ? lxGap(dom) : null;
  if (gap) { const had = Object.values(S.research || {}).some((r) => r && !r._del && r.key === 'bp:' + gap.id), j = opt.dry ? null : bpJob(gap.id, true); if (j || had) notes.push(`"${gap.n}" has no lesson yet. Research ${had ? 'is already requested' : 'was requested just now'}; it will appear here when a resource is found.`); else notes.push(`"${gap.n}" has no lesson yet.`); }
  if (min >= 20 && steps.length && focus !== 'review' && left >= 1) add({ k: 'debrief', min: 1, t: 'Debrief: one sentence', why: 'What will you do differently because of this session?' });
  if (!obj && steps.length) obj = steps[0].t;
  return { id: 'lx' + Date.now().toString(36), at: new Date().toISOString(), min, focus, dom, mode, path: opt.path || '', obj, why, after, notes, steps, i: 0, planned: steps.reduce((a, s) => a + s.min, 0), card: lesson ? lesson.id : '' };
}

/* ── choosing and starting ── */
function lxGo() { if (typeof bcS !== 'undefined') bcS = { scr: 'home', tab: 'now' }; show('boot'); window.scrollTo(0, 0); }
function lxSetFocus(f) { LXF = f; render(); }
function lxCustom() { openModal(`<h2>How many minutes?</h2><input class="aq-in" id="lx-cm" type="number" inputmode="numeric" min="3" max="180" placeholder="3 to 180"><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="const m=Number($('lx-cm').value);if(m>=3&&m<=180)lxPlanOpen(m);else toast('Between 3 and 180')">Plan it</button></div>`); setTimeout(() => { const i = $('lx-cm'); if (i) i.focus(); }, 80); }
function lxPlanOpen(min, focus, opt) {
  if (!lxReady()) { toast('Still loading the lessons'); return; } const P = lxBuild(min, focus || LXF, opt); LXP = { P, min, focus: focus || LXF, opt: opt || {} }; let gate = null; try { gate = ccGate(); } catch (e) { }
  openModal(`<h2>${P.min} minutes · ${esc(P.path ? lxPathOf(P.path)[1] : LX_FOCUS[P.focus] || 'Best use')}</h2>
    ${gate ? `<div class="cc-gate"><b>Before this:</b> ${esc(gate.out)}<div class="xs">${esc(gate.why)}</div></div>` : ''}
    ${P.steps.length ? `<div class="mc-wl"><span>Objective</span><div><b>${esc(P.obj)}</b></div>${P.why ? `<div class="xs">${esc(P.why)}</div>` : ''}</div>
    <div class="cc-steps">${P.steps.map((s, i) => `<div class="cc-st lx-pst"><i>${i + 1}</i><span><b>${esc(s.t)}</b><em>${s.min} min · ${LX_KIND[s.k]}${s.k === 'lesson' ? (s.withV ? ` · video ${s.vid} min + read + questions` : ' · read + questions') : ''}</em><u>${esc(s.why)}</u></span></div>`).join('')}</div>
    <div class="hint">${P.planned} of ${P.min} minutes planned.${P.after ? ' ' + esc(P.after) : ''}</div>` : '<div class="hint">Nothing fits this choice right now.</div>'}
    ${P.notes.map((n) => `<div class="xs muted">• ${esc(n)}</div>`).join('')}
    <div class="actions wrap"><button class="btn" onclick="lxAnother()">Another</button><button class="btn" onclick="lxTopic()">Choose a topic</button>${P.steps.length ? '<button class="btn primary" onclick="lxStart()">Start</button>' : '<button class="btn" onclick="closeModal()">Close</button>'}</div>`, true);
}
function lxAnother() { if (!LXP) return; const sk = (LXP.opt.skip || []).concat(LXP.P.steps.filter((s) => s.k === 'lesson').map((s) => s.id)); lxPlanOpen(LXP.min, LXP.focus, Object.assign({}, LXP.opt, { skip: sk })); }
function lxTopic() { const min = LXP ? LXP.min : 20; openModal(`<h2>Choose a path</h2><div class="hint">The session will take its lesson from the path you pick. Reviews that are due still come along.</div>${LX_PATHS.map((p) => { const g = lxPathProg(p); return `<button class="bp-row" onclick="lxPlanOpen(${min},'${p[5]}',{path:'${p[0]}'})"><span><b>${esc(p[1])}</b><em>${g.d}/${g.n} lessons${g.next ? ' · next: ' + esc(XC.byId[g.next].t) : ' · all opened'}</em></span></button>`; }).join('')}<div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true); }
function lxStart() { if (!LXP || !LXP.P.steps.length) return; const P = LXP.P; P.t0 = now(); P.spent = 0; lxSaveCur(P); LXP = null; closeModal(); lxGo(); render(); }

/* ── running a session ── */
function lxTick(s) {
  let ch = false;
  s.steps.forEach((st) => { if (st.done || !st.t0) return; let ok = false;
    if (st.k === 'lesson') { const c = (S.cards || {})[st.id]; ok = !!bcV('l:' + st.id, null) && (st.wasNew || !!(c && c._u >= st.t0 - 1000)); }
    if (st.k === 'review' || st.k === 'rebuild') ok = st.ids.every((id) => { const c = (S.cards || {})[id]; return c && c._u >= st.t0 - 1000; });
    if (st.k === 'practice') ok = cmLog(st.cap).length > (st.n0 || 0);
    if (st.k === 'apply' || st.k === 'consume') { try { const x = ccGet(st.id); ok = st.k === 'apply' ? !!(x && (x.u.impl || x.man || x.exp || x.task)) : !!(x && x.u.st === 'done'); } catch (e) { } }
    if (ok) { st.done = 1; st.res = st.res || 'done'; st.t1 = now(); ch = true; } });
  if (ch) { while (s.i < s.steps.length && s.steps[s.i].done) s.i++; lxSaveCur(s); } return s;
}
function lxSpent(s) { return Math.round(s.steps.reduce((a, st) => a + (st.t0 ? Math.min(st.min * 2, Math.max(0.5, ((st.t1 || now()) - st.t0) / 60000)) : 0), 0)); }
function lxDo(i) {
  const s = lxCur(); if (!s) return; const st = s.steps[i]; if (!st) return; st.t0 = st.t0 || now(); s.i = i;
  if (st.k === 'lesson') { st.wasNew = !bcV('l:' + st.id, null) || st.wasNew; lxSaveCur(s); bcLesson(st.id); return; }
  if (st.k === 'practice') { st.n0 = cmLog(st.cap).length; lxSaveCur(s); cmTrain(st.cap); return; }
  lxSaveCur(s);
  if (st.k === 'review' || st.k === 'rebuild') cpRecallSet(st.ids);
  else if (st.k === 'debrief') lxDebrief(i);
  else if (st.k === 'apply') ccDone(st.id);
  else if (st.k === 'consume') ccPlay(st.id);
  else if (st.k === 'mission') lxMission(i);
}
function lxMission(i) { const s = lxCur(), st = s.steps[i], c = XC.byId[st.id]; openModal(`<h2>Mission</h2><div class="hint">From "${esc(c.t)}". A mission counts when it happened in the real world.</div><div class="mc-wl"><span>Do this</span><div>${esc(c.move)}</div></div><textarea class="aq-in" id="lx-mn" rows="3" placeholder="What you did, with whom, what happened (needed to count it as done)"></textarea><div class="actions wrap"><button class="btn" onclick="closeModal()">Back</button><button class="btn" onclick="lxMissionTask(${i})">Schedule it</button><button class="btn primary" onclick="lxMissionDone(${i})">I did it</button></div>`); }
function lxMissionDone(i) { const n = $('lx-mn').value.trim(); if (n.length < 15) { toast('Write what you did: that is the evidence'); return; } const s = lxCur(), st = s.steps[i], cap = cmCapsOfCard(st.id)[0]; if (cap) cmRecord(cap.id, { src: 'real', eff: 'tried', out: '', comp: '', ev: n.slice(0, 300), note: 'Learn session mission' }); closeModal(); lxStepDone(i, 'did it'); }
function lxMissionTask(i) { const s = lxCur(), st = s.steps[i], c = XC.byId[st.id], d = new Date(); d.setDate(d.getDate() + 1); const t = { id: uid(), _u: now(), title: 'Mission: ' + c.t, due: dk(d), done: false, note: c.move }; S.tasks = S.tasks || {}; S.tasks[t.id] = t; save(); try { if (typeof taskHook === 'function') taskHook('create', t); } catch (e) { } closeModal(); lxStepDone(i, 'scheduled'); toast('On tomorrow\'s tasks'); }
function lxDebrief(i) { openModal(`<h2>Debrief</h2><div class="hint">One sentence. What will you do differently because of this session?</div><textarea class="aq-in" id="lx-db" rows="2"></textarea><div class="actions"><button class="btn" onclick="closeModal();lxStepDone(${i},'skipped')">Skip</button><button class="btn primary" onclick="const v=$('lx-db').value.trim();if(v.length<8){toast('One real sentence')}else{closeModal();lxStepDone(${i},v.slice(0,200))}">Save</button></div>`); }
function lxStepDone(i, res) { const s = lxCur(); if (!s) return; const st = s.steps[i]; st.done = 1; st.res = res || 'done'; st.t0 = st.t0 || now(); st.t1 = now(); while (s.i < s.steps.length && s.steps[s.i].done) s.i++; lxSaveCur(s); if (s.i >= s.steps.length) lxEnd(); else render(); }
function lxPause() { toast('Saved. It is waiting under Learn'); if (typeof show === 'function') show('now'); }
function lxEnd(early) {
  const s = lxCur(); if (!s) return; const done = s.steps.filter((x) => x.done && x.res !== 'skipped'), out = s.steps.filter((x) => !x.done || x.res === 'skipped' || x.res === 'scheduled'), spent = lxSpent(s);
  const L = lxLog().concat([{ at: s.at, d: dk(new Date()), min: s.min, spent, dom: s.dom, mode: s.mode, path: s.path, done: done.length, total: s.steps.length, kinds: s.steps.map((x) => x.k), card: s.card, skipped: s.steps.filter((x) => x.k === 'practice' && (!x.done || x.res === 'skipped')).map((x) => x.cap), note: ((s.steps.find((x) => x.k === 'debrief' && x.done && x.res !== 'skipped') || {}).res) || '', early: early ? 1 : 0 }]).slice(-60);
  bcW('lx:log', L); lxSaveCur(null); let nx = null; try { nx = lxBuild(s.min, 'auto', { dry: 1 }); } catch (e) { }
  const tests = s.steps.filter((x) => x.k === 'review' && x.done).reduce((a, x) => a + x.ids.length, 0), les = s.steps.filter((x) => x.k === 'lesson' && x.done);
  openModal(`<h2>Session ${early ? 'ended' : 'complete'}</h2><div class="bp-sum"><div><b>${done.length}/${s.steps.length}</b><span>steps done</span></div><div><b>${spent}</b><span>minutes (planned ${s.planned})</span></div><div><b>${tests + les.length}</b><span>lessons tested</span></div></div>
    <div class="mc-wl"><span>Done</span>${done.map((x) => `<div class="xs">✓ ${LX_KIND[x.k]}: ${esc(x.t)}${x.res && x.res !== 'done' ? ' · ' + esc(x.res) : ''}</div>`).join('') || '<div class="xs">Nothing was finished.</div>'}</div>
    ${out.length ? `<div class="mc-wl"><span>Still open</span>${out.map((x) => `<div class="xs">○ ${LX_KIND[x.k]}: ${esc(x.t)}${x.res === 'scheduled' ? ' · on tomorrow\'s tasks' : ''}</div>`).join('')}</div>` : ''}
    <div class="xs muted">${les.length ? 'A lesson opened and tested is "Introduced" or "Understood". It becomes a capability only through practice and real use.' : ''}</div>
    ${nx && nx.steps.length ? `<div class="mc-wl"><span>Next time</span><div><b>${esc(nx.steps[0].t)}</b></div><div class="xs">${esc(nx.steps[0].why)}</div></div>` : ''}
    <div class="actions"><button class="btn primary" onclick="closeModal();render()">Done</button></div>`, true); render();
}
function lxRunHtml(s) {
  s = lxTick(s); if (s.i >= s.steps.length) { setTimeout(() => lxEnd(), 50); }
  const spent = lxSpent(s), left = Math.max(0, s.planned - spent), cur = s.steps[Math.min(s.i, s.steps.length - 1)], ci = Math.min(s.i, s.steps.length - 1);
  return `<div class="lx"><div class="lx-run"><div class="lx-k">Session · ${s.min} min · ${esc(s.path ? lxPathOf(s.path)[1] : LX_FOCUS[s.focus] || '')}</div><b class="lx-obj">${esc(s.obj)}</b>
    <div class="lx-dots">${s.steps.map((x, i) => `<i class="${x.done ? 'on' : i === ci ? 'cur' : ''}"></i>`).join('')}</div><div class="xs muted">Step ${Math.min(ci + 1, s.steps.length)} of ${s.steps.length} · about ${left} min left</div></div>
    <div class="card lx-step"><div class="lx-k">${LX_KIND[cur.k]} · ${cur.min} min</div><b>${esc(cur.t)}</b><div class="xs">${esc(cur.why)}</div>
      ${cur.k === 'lesson' && cur.withV && XC.byId[cur.id] && (XC.byId[cur.id].clip || []).length ? '<div class="xs muted">The lesson opens with its video.</div>' : ''}
      <div class="actions wrap"><button class="btn primary" onclick="lxDo(${ci})">${cur.t0 ? 'Open again' : 'Start step'}</button><button class="btn" onclick="lxStepDone(${ci},'done')">Done</button><button class="btn" onclick="lxStepDone(${ci},'skipped')">Skip</button></div></div>
    <div class="lx-list">${s.steps.map((x, i) => `<div class="${x.done ? 'done' : i === ci ? 'cur' : ''}"><i>${x.done ? (x.res === 'skipped' ? '–' : '✓') : i + 1}</i><span>${LX_KIND[x.k]} · ${esc(x.t)}</span><em>${x.min}′</em></div>`).join('')}</div>
    <div class="actions wrap"><button class="btn" onclick="lxPause()">Pause</button><button class="btn" onclick="lxEnd(1)">End session</button></div></div>`;
}

/* ── Learn → Now ── */
function lxHome() {
  if (!lxReady()) { try { if (typeof ccLoad === 'function') ccLoad(() => render()); } catch (e) { } return '<div class="lx"><div class="card">Loading your lessons…</div></div>'; }
  const cur = lxCur(); if (cur) return lxRunHtml(cur);
  let P = null; try { P = lxBuild(20, LXF, { dry: 1 }); } catch (e) { console.warn('lx', e); }
  let due = []; try { due = msQueue(8); } catch (e) { } let un = []; try { un = rsUnapplied(); } catch (e) { }
  const unp = lxUnpracticed(), mis = (bcV('mis', null) ? 1 : 0) + (bcV('misL', null) ? 1 : 0), jobs = Object.values(S.research || {}).filter((r) => r && !r._del && r.st === 'open').length, U = bpAudit(), last = lxLog().slice(-1)[0];
  let gate = null; try { gate = ccGate(); } catch (e) { }
  const top = P && P.steps[0], row = (n, t, sub, act) => `<button class="lx-row" onclick="${act}"><b>${n}</b><span>${t}<em>${sub}</em></span><i>›</i></button>`;
  const paths = LX_PATHS.map((p) => ({ p, g: lxPathProg(p) })).sort((a, b) => (b.g.d > 0 && b.g.d < b.g.n ? 1 : 0) - (a.g.d > 0 && a.g.d < a.g.n ? 1 : 0)).slice(0, 4);
  return `<div class="lx">
    <div class="lx-q">How much time do you have?</div>
    <div class="lx-chips">${LX_MIN.map((m) => `<button onclick="lxPlanOpen(${m})">${m}</button>`).join('')}<button onclick="lxCustom()">…</button></div>
    <div class="lx-foc">${Object.entries(LX_FOCUS).map(([k, l]) => `<button class="${LXF === k ? 'on' : ''}" onclick="lxSetFocus('${k}')">${l}</button>`).join('')}</div>
    ${gate ? `<div class="cc-gate"><b>First:</b> ${esc(gate.out)}<div class="xs">${esc(gate.why)}</div></div>` : ''}
    ${top ? `<div class="card lx-rec"><div class="lx-k">Next · ${LX_KIND[top.k]} · ${top.min} min</div><b>${esc(top.t)}</b><div class="xs">${esc(top.why)}</div><div class="actions"><button class="btn primary" onclick="lxPlanOpen(20)">Plan 20 minutes</button><button class="btn" onclick="lxPlanOpen(${Math.max(5, top.min)})">Just this · ${Math.max(5, top.min)} min</button></div></div>` : `<div class="card lx-rec"><b>Nothing is waiting.</b><div class="xs">${esc((P && P.notes[0]) || 'Pick a path below.')}</div></div>`}
    <div class="lx-sec">Also waiting</div>
    ${row(due.length, 'Reviews due', due.length ? 'lessons fading from memory' : 'nothing is fading', due.length ? "lxPlanOpen(5,'review')" : "bcGo('home',{tab:'practice'})")}
    ${row(unp.length, 'To practise', unp.length ? esc(unp[0].c.n) + ': learned, never practised' : 'no lesson is waiting for practice', unp.length ? `cmTrain('${unp[0].c.id}')` : "bcGo('home',{tab:'practice'})")}
    ${row(un.length + mis, 'To use in real life', (mis ? mis + ' mission' + (mis === 1 ? '' : 's') + ' active' : 'no active mission') + (un.length ? ' · ' + un.length + ' finished, unused' : ''), "bcGo('home',{tab:'missions'})")}
    ${jobs ? row(jobs, 'Research requested', 'lessons that do not exist yet', 'rsOpen()') : ''}
    <div class="lx-sec">Your paths</div>
    ${paths.map(({ p, g }) => `<button class="lx-path" onclick="lxPath('${p[0]}')"><span><b>${esc(p[1])}</b><em>${g.d}/${g.n} lessons</em></span><div class="lx-bar"><i style="width:${g.pct}%"></i></div></button>`).join('')}
    <button class="lx-more" onclick="lxPaths()">All ${LX_PATHS.length} paths and how they connect ›</button>
    <div class="lx-sec">What you can actually do</div>
    <button class="lx-row" onclick="bpOpen()"><b>${U.evidence}</b><span>of ${U.total} competencies have real practice on record<em>${U.noLesson + U.kwOnly} still have no lesson of their own</em></span><i>›</i></button>
    <button class="lx-row" onclick="lxPersSet()"><b>${lxPersMin() ? lxWeekMin('life') : '–'}</b><span>${lxPersMin() ? `of ${lxPersMin()} personal minutes this week` : 'No weekly personal minimum is set'}<em>${lxPersMin() ? (lxPersUnder() ? 'under it: the next session is personal' : 'met: business leads again') : 'so nothing guarantees personal sessions. Tap to set one.'}</em></span><i>›</i></button>
    ${last ? `<div class="xs muted lx-last">Last session ${esc(last.d || '')}: ${last.done}/${last.total} steps, ${last.spent} min, ${last.dom === 'biz' ? 'business' : 'personal'}.</div>` : ''}
    <div class="lx-sec">Browse</div>
    <div class="lx-br"><button onclick="bcGo('home',{tab:'path'})">Path</button><button onclick="bcGo('home',{tab:'courses'})">Courses</button><button onclick="bcGo('home',{tab:'library'})">Library</button><button onclick="bcGo('home',{tab:'progress'})">Progress</button><button onclick="rsOpen()">Research</button><button onclick="bpOpen()">Blueprint</button></div></div>`;
}
function lxPaths() {
  openModal(`<h2>Your development map</h2><div class="hint">Nine paths, two tracks. Business paths feed the company; personal paths build the person who runs it. Which one a session serves follows your stage, your evidence and the weekly personal minimum you set.</div>
    ${['biz', 'life'].map((tr) => `<div class="mc-wl"><span>${tr === 'biz' ? 'Business' : 'Personal'}</span></div>` + LX_PATHS.filter((p) => p[5] === tr).map((p) => { const g = lxPathProg(p), A = bpAll().filter((x) => p[4].includes(x.area)), ev = A.filter((x) => bpStage(x) >= 3).length; return `<button class="lx-path" onclick="lxPath('${p[0]}')"><span><b>${esc(p[1])}</b><em>${g.d}/${g.n} lessons · ${ev}/${A.length} competencies practised · areas ${p[4].join(', ')}</em></span><div class="lx-bar"><i style="width:${g.pct}%"></i></div></button>`; }).join('')).join('')}
    <div class="xs muted">Areas are the Blueprint's ten letters. A lesson can sit on a path and feed several competencies; a library resource can serve several lessons.</div>
    <div class="actions wrap"><button class="btn" onclick="bpOpen()">Blueprint</button><button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
function lxPath(id) {
  const p = lxPathOf(id), g = lxPathProg(p), A = bpAll().filter((x) => p[4].includes(x.area)), mods = p[3].map((m) => BC.mod[m]).filter(Boolean);
  openModal(`<h2>${esc(p[1])}</h2><div class="hint">${esc(p[2])}</div><div class="lx-bar big"><i style="width:${g.pct}%"></i></div><div class="xs muted">${g.d} of ${g.n} lessons opened</div>
    <div class="mc-wl"><span>Modules, in order</span>${mods.map((m) => { const d = lxLearned(m.cards).length, open = (() => { try { return bcOpen(m); } catch (e) { return true; } })(), cl = (() => { try { return bcCleared(m); } catch (e) { return false; } })(); return `<button class="bp-row" onclick="closeModal();bcGo('mod',{m:'${m.id}'})"><span><b>${cl ? '✓ ' : open ? '' : '🔒 '}${esc(m.n)}</b><em>${d}/${m.cards.length} lessons${cl ? ' · boss test passed' : open ? '' : ' · opens after the module before it'}</em></span></button>`; }).join('')}</div>
    <div class="mc-wl"><span>Competencies this path builds (${A.length})</span>${A.slice(0, 8).map((x) => `<button class="bp-row" onclick="bpComp('${x.id}')"><span><b>${esc(x.n)}</b><em>${BP_ST[bpStage(x)]}</em></span></button>`).join('')}${A.length > 8 ? `<div class="xs muted">and ${A.length - 8} more in the Blueprint.</div>` : ''}</div>
    <div class="actions wrap"><button class="btn" onclick="lxPaths()">All paths</button><button class="btn primary" onclick="lxPlanOpen(20,'${p[5]}',{path:'${p[0]}'})">Study this · 20 min</button></div>`, true);
}

/* ── wire into the existing Learn view: "Now" first, the Library as a tab ── */
(function () {
  if (typeof BC_TABS !== 'undefined') { if (!BC_TABS.some((t) => t[0] === 'now')) BC_TABS.unshift(['now', 'Now']); if (!BC_TABS.some((t) => t[0] === 'library')) BC_TABS.push(['library', 'Library']); }
  if (typeof bcHome === 'function' && !bcHome._lx) {
    const f = bcHome; const g = function () {
      if (!window.LN_OFF && !window.LX_OFF && typeof bcTop === 'function') { const tab = bcS.tab || 'now'; if (tab === 'now') { bcS.tab = 'now'; return bcTop() + lxHome(); } if (tab === 'library') return bcTop() + `<div class="lx-lib">${typeof ccTab === 'function' ? ccTab() : ''}</div>`; }
      else if (bcS.tab === 'now' || bcS.tab === 'library') bcS.tab = 'path';
      return f.apply(this, arguments);
    }; g._lx = 1; bcHome = g;
  }
  const st = document.createElement('style'); st.textContent = `.lx{padding:2px 0 24px}.lx-q{font-size:19px;font-weight:700;margin:10px 2px 8px}.lx-chips{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.lx-chips button{padding:11px 0;border-radius:11px;border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;font:inherit;font-weight:700;font-size:15px}
.lx-foc{display:flex;gap:5px;margin:8px 0 10px;flex-wrap:wrap}.lx-foc button{border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;font:inherit;font-size:12px;border-radius:999px;padding:5px 11px;opacity:.7}.lx-foc button.on{opacity:1;border-color:var(--good,#3fb950);color:var(--good,#3fb950)}
.lx-k{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin-bottom:3px}.lx-rec b,.lx-step b{display:block;font-size:16px;line-height:1.25;margin-bottom:4px;overflow-wrap:anywhere}.lx-rec .actions{margin-top:9px;flex-wrap:wrap}
.lx-sec{font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.55;margin:16px 2px 4px}
.lx-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--ln,#2a2a2e);padding:10px 2px;color:inherit;font:inherit}.lx-row>b{font-size:18px;min-width:26px;text-align:center}.lx-row span{flex:1;min-width:0;font-size:14px}.lx-row em{display:block;font-style:normal;font-size:11.5px;opacity:.6;overflow-wrap:anywhere}.lx-row i{font-style:normal;opacity:.4}
.lx-path{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--ln,#2a2a2e);padding:9px 2px;color:inherit;font:inherit}.lx-path span{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.lx-path b{font-size:14px;min-width:0;overflow-wrap:anywhere}.lx-path em{font-style:normal;font-size:11px;opacity:.6;flex:none;max-width:55%;text-align:right}
.lx-bar{height:5px;border-radius:3px;background:var(--ln,#2a2a2e);margin-top:6px;overflow:hidden}.lx-bar i{display:block;height:100%;background:var(--good,#3fb950)}.lx-bar.big{height:8px}
.lx-more{background:none;border:0;color:inherit;font:inherit;font-size:12.5px;opacity:.7;padding:9px 2px;text-align:left;width:100%}.lx-last{margin:8px 2px}
.lx-br{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.lx-br button{padding:9px 0;border-radius:10px;border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;font:inherit;font-size:13px}
.lx-run{margin:8px 2px 10px}.lx-obj{display:block;font-size:17px;line-height:1.25;overflow-wrap:anywhere}.lx-dots{display:flex;gap:4px;margin:9px 0 5px}.lx-dots i{flex:1;height:6px;border-radius:3px;background:var(--ln,#2a2a2e)}.lx-dots i.on{background:var(--good,#3fb950)}.lx-dots i.cur{background:var(--warn,#d29922)}
.lx-list{margin:12px 0}.lx-list div{display:flex;gap:8px;align-items:center;padding:7px 2px;border-bottom:1px solid var(--ln,#2a2a2e);font-size:13px;opacity:.6}.lx-list div.cur{opacity:1;font-weight:600}.lx-list div.done{opacity:.45}.lx-list i{font-style:normal;width:20px;text-align:center;flex:none}.lx-list span{flex:1;min-width:0;overflow-wrap:anywhere}.lx-list em{font-style:normal;font-size:11px;flex:none}
.lx-pst{cursor:default}.bcx-tabs{overflow-x:auto;scrollbar-width:none}.bcx-tabs::-webkit-scrollbar{display:none}.bcx-tabs button{flex:none}`; document.head.appendChild(st);
})();
