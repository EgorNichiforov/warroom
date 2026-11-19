/* War Room 13.26 · journal.js — THE REALITY JOURNAL. One entry flow, one timeline, one search.
   Not a fifth journal: each kind of record keeps its owner, and this file is the single way in and the single view.
     event / lesson / win / mistake / trigger / transition → S.journal (this file; triggers are used by defense.js)
     after-action review → capability.js cpAar (S.boot.aar)      decision / prediction → judge.js (S.decisions)
     experiment → intel.js recEdit (S.experiments)                 risk → judge.js (S.risks)
   The timeline reads all of them plus milestones with evidence and capability evidence, so old records stay readable
   and nothing is copied. Personal history = entries marked important (imp 3), decisions, milestones, demonstrations.
   A lesson can become: an if-then protocol (defense.js), a Field Manual entry (defense.js), or targeted practice
   (capmap.js). That is how a real event changes future training and decisions. */
'use strict';

const JN_KIND = { event: ['Event', 'Something that happened'], lesson: ['Lesson', 'Something I learned'], win: ['Win', 'An achievement'], mistake: ['Mistake', 'What went wrong'], trigger: ['Trigger', 'A distraction or avoidance moment'], transition: ['Transition', 'A big change in life'] };
const JN_DOM = { biz: 'Business', bac: 'BAC & school', body: 'Body', money: 'Money', people: 'People', self: 'Self', life: 'Life' };
function jnLive() { return Object.values(S.journal || {}).filter((x) => x && !x._del); }
/* one entry flow: pick what it is, the right form opens */
function jnNew(pre) {
  if (pre && JN_KIND[pre]) { jnEdit('', pre); return; }
  const b = (fn, t, s) => `<button class="mc-opt" onclick="${fn}"><b>${t}</b><span>${s}</span></button>`;
  openModal(`<h2>Capture</h2><div class="hint">One place for everything that happened. Pick what it is; keep it short.</div>
    ${b("jnEdit('','event')", 'Event / lesson', 'What happened and what it taught you. 20 seconds.')}
    ${b('closeModal();cpAar()', 'After-action review', 'A call, a test, a match: what was supposed to happen vs what did. Links to a capability.')}
    ${b("closeModal();jlDecEdit('')", 'Decision', 'Options, evidence, assumptions, your call. Reviewed later.')}
    ${b("closeModal();jlPredEdit('')", 'Prediction', 'What you expect, with a %, before it happens.')}
    ${b("jnEdit('','trigger')", 'Trigger', 'Pulled toward distraction or avoidance. What helped?')}
    ${b("closeModal();dfLapse()", 'Lapse: restart now', 'Stop the spiral, one next action. Review later.')}
    ${b("closeModal();recEdit('experiments')", 'Experiment', 'Change one thing and measure it.')}
    ${b("closeModal();rtRiskEdit('')", 'Risk', 'Something that could go wrong, with prevention.')}`, true);
}
function jnLinks(x) {
  const camps = typeof live === 'function' ? live(S.campaigns) : [], decs = typeof live === 'function' ? live(S.decisions).slice(-20) : [];
  return `<details class="jn-more"><summary>Link it (optional)</summary>${typeof cmSel === 'function' ? cmSel('jn-cap', x.cap || '') : ''}
    <select class="aq-in" id="jn-camp"><option value="">Campaign (optional)</option>${camps.map((c) => `<option value="${c.id}" ${c.id === x.camp ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>
    <select class="aq-in" id="jn-dec"><option value="">Decision (optional)</option>${decs.map((c) => `<option value="${c.id}" ${c.id === x.dec ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>
    <select class="aq-in" id="jn-dom">${Object.keys(JN_DOM).map((k) => `<option value="${k}" ${k === (x.dom || 'life') ? 'selected' : ''}>${JN_DOM[k]}</option>`).join('')}</select></details>`;
}
function jnEdit(id, kind) {
  const x = (S.journal || {})[id] || { kind: kind || 'event', imp: 1 }, k = x.kind;
  if (k === 'trigger') { if (typeof dfTriggerEdit === 'function') { dfTriggerEdit(id); return; } }
  openModal(`<h2>${JN_KIND[k] ? JN_KIND[k][0] : 'Entry'}</h2>
    <div class="chips">${['event', 'lesson', 'win', 'mistake', 'transition'].map((t) => `<button class="chip ${t === k ? 'on' : ''}" onclick="jnEdit('${id || ''}','${t}')">${JN_KIND[t][0]}</button>`).join('')}</div>
    <input type="hidden" id="jn-k" value="${k}"><textarea class="aq-in" id="jn-t" placeholder="What happened? (facts)">${esc(x.text || '')}</textarea>
    <textarea class="aq-in" id="jn-l" placeholder="What I learned / would change (optional)">${esc(x.lesson || '')}</textarea>
    <label class="xs muted">How important?</label><div class="chips">${[[1, 'Small'], [2, 'Useful'], [3, 'Life history']].map(([v, l]) => `<button class="chip jn-imp ${v === (x.imp || 1) ? 'on' : ''}" data-v="${v}" onclick="document.querySelectorAll('.jn-imp').forEach(c=>c.classList.toggle('on',c===this))">${l}</button>`).join('')}</div>
    ${jnLinks(x)}
    <div class="actions">${id ? `<button class="btn danger" onclick="jnDel('${id}')">Delete</button>` : ''}<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="jnSave('${id || ''}')">Save</button></div>`);
}
function jnRead() { const g = (i) => (($(i) || {}).value || '').trim(), imp = Number(((document.querySelector('.jn-imp.on') || {}).dataset || {}).v) || 1; return { cap: g('jn-cap'), camp: g('jn-camp'), dec: g('jn-dec'), dom: g('jn-dom') || 'life', imp }; }
function jnSave(id) {
  const g = (i) => (($(i) || {}).value || '').trim(), t = g('jn-t'); if (!t) { toast('Write what happened'); return; }
  S.journal = S.journal || {}; const nid = id || 'j' + uid(), old = S.journal[nid] || { at: dk(new Date()) };
  S.journal[nid] = Object.assign({}, old, jnRead(), { id: nid, kind: g('jn-k') || 'event', text: t, lesson: g('jn-l'), _u: now() }); save(); closeModal();
  const x = S.journal[nid]; if (x.lesson && !id) jnConvertOffer(nid); else { toast('Saved to the journal'); try { render(); } catch (e) { } }
}
function jnDel(id) { const x = (S.journal || {})[id]; if (!x) return; x._del = true; x._u = now(); save(); closeModal(); toast('Deleted'); try { render(); } catch (e) { } }
/* a lesson can change future behaviour: protocol, procedure, or practice */
function jnConvertOffer(id) {
  const x = (S.journal || {})[id]; if (!x) return;
  openModal(`<h2>Make it count</h2><div class="hint">“${esc(x.lesson)}”<br>A lesson that is not turned into something is usually forgotten. Pick one, or none.</div>
    <button class="mc-opt" onclick="jnToProto('${id}')"><b>If-then protocol</b><span>When this situation comes back, I will…</span></button>
    <button class="mc-opt" onclick="jnToManual('${id}')"><b>Field Manual procedure</b><span>A repeatable way to handle it, marked as a personal experiment</span></button>
    ${x.cap && typeof cmCap === 'function' && cmCap(x.cap) ? `<button class="mc-opt" onclick="closeModal();cmPractice('${x.cap}')"><b>Targeted practice</b><span>${esc(cmCap(x.cap).n)}: drill the mapped ideas now</span></button>` : ''}
    <div class="actions"><button class="btn" onclick="closeModal()">Just keep it in the journal</button></div>`, true);
}

function jnToProto(id) { const x = (S.journal || {})[id]; if (!x) return; closeModal(); dfProtoEdit('', { trig: x.text.slice(0, 80), now: (x.lesson || '').slice(0, 160), src: id }); }
function jnToManual(id) { const x = (S.journal || {})[id]; if (!x) return; closeModal(); fmEdit('', { n: (x.lesson || x.text).slice(0, 60), sit: x.text.slice(0, 200), q: 'personal', src: 'journal ' + x.at, exp: id, caps: x.cap ? [x.cap] : [] }); }

/* ── one timeline over every owner ── */
function jnItems() {
  const I = [], push = (at, kind, dom, t, sub, act, imp) => { if (at) I.push({ at: String(at).slice(0, 10), kind, dom: dom || 'life', t: String(t || ''), sub: String(sub || ''), act, imp: imp || 1 }); };
  jnLive().forEach((x) => push(x.at, x.kind, x.dom, x.text, x.lesson || (x.kind === 'trigger' ? [x.beh, x.helped].filter(Boolean).join(' · ') : ''), x.kind === 'replan' ? (x.undo ? `rlReplanUndo('${x.id}')` : '') : `jnEdit('${x.id}')`, x.imp));
  (typeof live === 'function' ? live(S.decisions) : []).forEach((x) => push(x.date || (x._u ? dk(new Date(x._u)) : ''), x.kind === 'pred' ? 'prediction' : 'decision', x.dom || 'life', x.title, x.result ? 'result: ' + x.result : x.review ? 'review ' + x.review : '', x.kind === 'pred' ? `jlPredEdit('${x.id}')` : `jlDecEdit('${x.id}')`, 2));
  (typeof live === 'function' ? live(S.experiments) : []).forEach((x) => push(x.start, 'experiment', 'biz', x.title, x.result || x.hypothesis, `recEdit('experiments','${x.id}')`, 2));
  ((typeof bcV === 'function' ? bcV('aar', []) : []) || []).forEach((r) => push(r.at, 'review', 'biz', r.hap, r.chg ? 'change: ' + r.chg : '', '', r.comp === 'yes' ? 2 : 1));
  (typeof live === 'function' ? live(S.campaigns) : []).forEach((c) => (c.milestones || []).forEach((m) => { if (m.done && m.ev) push(m.at, 'milestone', typeof mcCampDom === 'function' ? mcCampDom(c) : 'life', `${c.title}: ${m.t}`, 'evidence: ' + m.ev, '', 3); }));
  try { if (typeof cmAll === 'function') cmAll().forEach((c) => cmLog(c.id).forEach((x) => { if (x.comp === 'yes' && (x.ev || '').length >= 3 && !x.aar) push(x.at, 'skill', c.dom === 'biz' ? 'biz' : 'self', `${c.n}: shown to standard`, x.ev, `cmCapOpen('${c.id}')`, 3); })); } catch (e) { }
  return I.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
let JNF = { dom: '', per: 30, hist: false };
function jnTimeline(f) {
  JNF = Object.assign(JNF, f || {}); const since = JNF.per ? dk(addDays(new Date(), -JNF.per)) : '', I = jnItems().filter((x) => (!JNF.dom || x.dom === JNF.dom) && (!since || x.at >= since) && (!JNF.hist || x.imp >= 3 || ['decision', 'milestone', 'skill', 'transition'].includes(x.kind)));
  const ch = (on, l, a) => `<button class="chip ${on ? 'on' : ''}" onclick='jnTimeline(${JSON.stringify(a)})'>${l}</button>`;
  openModal(`<h2>${JNF.hist ? 'Personal history' : 'Journal'}</h2>
    <div class="chips">${ch(!JNF.hist, 'Everything', { hist: false })}${ch(JNF.hist, 'History only', { hist: true })}${[[7, '7 d'], [30, '30 d'], [365, 'Year'], [0, 'All']].map(([p, l]) => ch(JNF.per === p, l, { per: p })).join('')}</div>
    <div class="chips">${ch(!JNF.dom, 'All areas', { dom: '' })}${Object.keys(JN_DOM).map((k) => ch(JNF.dom === k, JN_DOM[k], { dom: k })).join('')}</div>
    ${I.slice(0, 80).map((x) => `<div class="jn-i ${x.kind}" ${x.act ? `onclick="${x.act}"` : ''}><em>${esc(x.at)} · ${esc(x.kind)}</em><b>${esc(x.t)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div>`).join('') || '<div class="empty">Nothing in this view.</div>'}
    <div class="actions"><button class="btn primary" onclick="jnNew()">＋ Capture</button></div>`, true);
}

/* ── search across the connected systems ── */
function jnSearchOpen(q) {
  openModal(`<h2>Search</h2><input class="aq-in" id="jn-q" placeholder="e.g. vendor objection, sleep, contract, Romanian" value="${esc(q || '')}" oninput="jnSearchRun()"><div id="jn-r"></div>`);
  if (q) jnSearchRun();
}
function jnSearch(q) {
  q = String(q || '').toLowerCase().trim(); if (q.length < 2) return []; const W = q.split(/\s+/), hit = (...t) => { const s = t.join(' ').toLowerCase(); return W.every((w) => s.includes(w)); }, R = [];
  if (typeof XC !== 'undefined' && XC && XC.cards) XC.cards.forEach((c) => { if (hit(c.t, c.hook || '', (c.m || []).join(' '), c.who || '')) R.push(['Bootcamp idea', c.t, `closeModal();cpIdea('${c.id}')`]); });
  if (typeof cmAll === 'function') cmAll().forEach((c) => { if (hit(c.n, c.mean, c.beh)) R.push(['Capability', c.n, `cmCapOpen('${c.id}')`]); });
  if (typeof fmAll === 'function') fmAll().forEach((m) => { if (hit(m.n, m.sit || '', m.steps || '', m.trig || '')) R.push([m.kind === 'cont' ? 'Contingency plan' : 'Field Manual', m.n, `fmView('${m.id}')`]); });
  jnItems().forEach((x) => { if (hit(x.t, x.sub)) R.push(['Journal · ' + x.kind, `${x.at} · ${x.t}`, x.act || '']); });
  if (typeof kpAll === 'function') kpAll().forEach((s) => { if (hit(s.t, s.by || '', s.ins || '', s.topics || '')) R.push(['Source', s.t, `kpView('${s.id}')`]); });
  Object.values(S.playbook || {}).forEach((p) => { if (p && !p._del && hit(p.title || '', p.body || '')) R.push(['Playbook', p.title || p.id, "closeModal();show('book')"]); });
  rlFacts().forEach((f) => { if (hit(f.t)) R.push(['Reality', f.t, `rlEdit('${f.id}')`]); });
  return R.slice(0, 60);
}
function jnSearchRun() { const el = $('jn-r'); if (!el) return; const R = jnSearch(($('jn-q') || {}).value); el.innerHTML = R.length ? R.map(([k, t, a]) => `<div class="jn-i" ${a ? `onclick="${a}"` : ''}><em>${esc(k)}</em><b>${esc(t)}</b></div>`).join('') : '<div class="xs muted" style="margin-top:8px">Type at least two letters.</div>'; }

(function () {
  const st = document.createElement('style'); st.id = 'jn-css';
  st.textContent = `.jn-i{display:grid;gap:2px;padding:9px 0;border-bottom:1px solid var(--ln,#222);cursor:pointer}.jn-i em{font-style:normal;font:600 10.5px/1.3 var(--mono,monospace);text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#999)}.jn-i b{font-weight:500;font-size:14px;line-height:1.35}.jn-i span{font-size:12px;color:var(--muted,#aaa);line-height:1.35}.jn-i.milestone em,.jn-i.skill em{color:var(--good,#3fb950)}.jn-i.mistake em,.jn-i.trigger em{color:var(--warn,#e5a50a)}
  .jn-more{margin:8px 0}.jn-more summary{cursor:pointer;font-size:13px;color:var(--muted,#aaa);min-height:36px;display:flex;align-items:center}`;
  document.head.appendChild(st);
})();
