/* War Room 13.32 · cohere.js — coordination, not another engine.
   mission.js / mcBuild() stays the ONLY place that ranks "what now". This file only:
   1. supplies candidates and one risk line to mcBuild through the hooks it already calls (lxCandidates, exAugment):
      waiting follow-ups, a falling answer rate, the next company-OS step, the oldest overdue task, one Learn candidate;
   2. answers "I have N minutes" on the Day card by FILTERING mcBuild's own ranking for what fits (no second planner);
      a learning answer is handed to learnx.js lxBuild, the one timed learning planner;
   3. asks expected vs observed when a mission is marked done, and fills the weekly review from the records;
   4. keeps every captured line: routes it to the owner you pick, or holds it in Unprocessed;
   5. shows what really runs by itself, what needs a tap and what is blocked.
   Records stay with their owners: calls in the call log, lessons in Bootcamp, evidence in the capability map. */

/* ───────── 1 · suppliers to Mission Control ───────── */
let CO_LEARN = { t: 0, v: null };
function coLearnCand(X) {
  if (typeof lxReady !== 'function' || !lxReady()) return null;
  if (Date.now() - CO_LEARN.t < 45000 && CO_LEARN.k === X.k) return CO_LEARN.v;
  let v = null;
  try {
    const P = lxBuild(20, 'auto', { dry: 1 }), s = P.steps[0], under = lxPersUnder();
    if (s) { const apply = P.mode === 'apply', prot = !!under && P.dom === 'life';
      v = { k: 'learn', sid: 'learn', dom: P.dom === 'life' ? 'life' : 'biz', tier: prot ? 2 : 3, urg: prot ? Math.min(0.6, 0.3 + under.def * 0.3) : apply ? 0.45 : s.k === 'review' ? 0.2 : 0.25,
        out: (apply ? 'Use what you learned: ' : prot ? 'Personal development: ' : 'Learn: ') + s.t.replace(/^(Use it|Practise): /, ''), why: (prot ? (under.need ? 'No personal session yet this week (your setting: as much as needed, never zero). ' : `Your weekly personal minimum is ${under.min} minutes; this week has ${under.got}. `) : '') + (P.why || s.why),
        next: 'Plan the session', go: () => { mcOpen('boot'); setTimeout(() => { try { lxGo(); lxPlanOpen(20); } catch (e) { } }, 250); }, min: Math.max(5, Math.min(20, P.planned)), dod: 'The session is finished and its steps are recorded', ev: [prot ? `Learn log: ${under.got} personal minutes this week (source: finished sessions)` : apply ? 'Lessons or resources finished with nothing practised or used yet (source: Learn records)' : 'Next step chosen by the Learn planner from stage, evidence and reviews'], late: apply ? 'Unused learning fades within days.' : 'Nothing breaks today; skills compound slowly.', conf: 'your records', src: 'learn' }; }
  } catch (e) { console.warn('co learn', e); }
  CO_LEARN = { t: Date.now(), k: X.k, v }; return v;
}
function coCandidates(X) {
  const out = []; if (X.night || X.mode === 'rec') return out; const bizT = X.dom === 'biz' ? 1 : 2;
  /* follow-ups that are NOT today's callbacks (those already sit inside the dial mission) */
  try { if (typeof radarItems === 'function') { const R = radarItems().filter((r) => r.kind !== 'overdue'); if (R.length) { const r = R[0], x = r.x; out.push({ k: 'follow', sid: 'follow:' + x.id, dom: 'biz', tier: bizT, urg: 0.5, out: `Follow up: ${x.agency || x.name || 'agency'}`, why: `${r.why}. ${R.length > 1 ? R.length + ' agencies are waiting on you; this one first.' : 'It is waiting on you.'}`, next: 'Open the pipeline', go: () => mcOpen('crm'), min: 10, dod: 'This agency has a next step with a date, or is closed', ev: [`Call queue: status "${x.status}", ${x.attempts || 0} attempts (source: logged calls)`], late: 'Interest that gets no answer goes cold.', conf: 'measured', src: 'queue:' + x.id }); } } } catch (e) { }
  /* a KPI that fell becomes one corrective action, with the lesson that teaches the skill */
  try { if (typeof stSignals === 'function') { const sg = stSignals().find((s) => s.k === 'kpi'); if (sg) { let card = ''; try { const cap = cmCap('b-cold'); if (cap && typeof XC !== 'undefined' && XC && XC.byId) { const C = cmCards(cap); card = C.find((id) => !bcV('l:' + id, null)) || C[0] || ''; } } catch (e) { }
    out.push({ k: 'fix', sid: 'fix:answer-rate', dom: 'biz', tier: bizT, urg: 0.65, out: 'Find why the answer rate fell, and change one thing', why: `${sg.t} ${sg.why}`, next: card ? 'Check the causes, then the lesson: ' + XC.byId[card].t : 'Open the funnel', go: () => { mcOpen('intel'); if (card) setTimeout(() => { try { xcOpen(card); } catch (e) { } }, 400); }, min: 15, dod: 'One cause named with its evidence and one change chosen for the next block', ev: [sg.t + ' (source: call log)'], late: 'Every block dialled into the same problem repeats the loss.', conf: 'measured', src: 'signal:kpi', lesson: card, cap: 'b-cold' }); } } } catch (e) { }
  /* the company operating system's next step: protected work, never above the dial block */
  try { if (typeof osNextStep === 'function') { const s = osNextStep(); if (s) out.push({ k: 'os', sid: 'os:' + s.id, dom: 'biz', tier: 2, urg: 0.3, out: `Company step: ${s.n}`, why: s.why, next: 'Open the step', go: () => { try { osView(s.id); } catch (e) { osOpen(); } }, min: 20, dod: s.test, ev: [`Operating system: this step is at "${OS_ST[osStage(s)]}" (source: your stage records)`], late: 'A step that lives in your head cannot be handed to anyone.', conf: 'your records', src: 'os:' + s.id }); } } catch (e) { }
  /* overdue tasks: one line, the oldest, never the whole list */
  try { const T = Object.values(S.tasks || {}).filter((t) => t && !t._del && !t.done && t.due && String(t.due).slice(0, 10) < X.k).sort((a, b) => String(a.due).localeCompare(String(b.due))); if (T.length) { const t = T[0]; out.push({ k: 'task', sid: 'task:' + t.id, dom: 'life', tier: 2, urg: Math.min(0.45, 0.2 + T.length * 0.03), out: `Clear the oldest overdue task: ${String(t.title || '').slice(0, 60)}`, why: `${T.length} task${T.length === 1 ? ' is' : 's are'} past the date. Do it, give it a new date, or drop it.`, next: 'Open tasks', go: () => mcOpen('tasks'), min: 10, dod: 'Done, re-dated or deleted', ev: [`Task list: due ${String(t.due).slice(0, 10)}`, `${T.length} overdue in total (source: tasks)`], late: 'Old tasks bury the ones that matter.', conf: 'measured', src: 'task:' + t.id }); } } catch (e) { }
  const L = coLearnCand(X); if (L) out.push(L);
  return out;
}
if (typeof lxCandidates === 'function' && !lxCandidates._co) { const f = lxCandidates; lxCandidates = function (X) { let a = []; try { a = f.apply(this, arguments) || []; } catch (e) { } try { return a.concat(coCandidates(X)); } catch (e) { console.warn('co', e); return a; } }; lxCandidates._co = 1; }
/* energy: two low readings in a row add a risk line. It proposes; it never changes the mode. */
function coEnergy() { const L = []; for (let i = 0; i < 3 && L.length < 2; i++) { const o = S.days[dk(addDays(new Date(), -i))]; ((o && o.energy) || []).slice().reverse().forEach((e) => { if (L.length < 2) L.push(e.v); }); } return L; }
function coAugment(M) { try { const L = coEnergy(); if (M.mode === 'full' && L.length === 2 && L.every((v) => v <= 2)) M.risks.push({ t: 'Your last two energy checks were low. A Minimum day keeps the floors and drops the rest. Your call.', btn: 'Choose', act: 'mcModeOpen()' }); } catch (e) { } }
(function () { const f = typeof exAugment === 'function' ? exAugment : null; exAugment = function (M, X) { if (f) { try { f(M, X); } catch (e) { } } coAugment(M); }; })();

/* ───────── 2 · "I have N minutes" on the Day card ───────── */
const CO_FIT = [5, 10, 20, 30, 60];
let COF = null;
/* the least time in which a candidate is still worth starting */
function coNeed(c) { return c.k === 'dial' ? 10 : c.k === 'learn' || c.k === 'recall' ? 5 : c.k === 'bac' ? 15 : c.k === 'weekly' ? 10 : Math.max(5, Number(c.min) || 10); }
function coFitPick(min, M) {
  M = M || mcBuild(); const top = M.C[0], fixed = top && top.tier === 0 ? top : null, cap = M.free > 0 ? Math.min(min, M.free) : min, rest = M.C.filter((c) => c.tier > 0), skipped = [];
  if (fixed) return { min, cap, fixed, pick: null, skipped, M };
  let pick = null; for (const c of rest) { if (coNeed(c) <= cap) { pick = c; break; } skipped.push(c); }
  return { min, cap, fixed: null, pick, skipped, M };
}
function coFit(min) {
  if (!min) { openModal(`<h2>How many minutes?</h2><input class="aq-in" id="co-fm" type="number" inputmode="numeric" min="3" max="240"><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="const m=Number($('co-fm').value);if(m>=3&&m<=240)coFit(m);else toast('Between 3 and 240')">Show</button></div>`); return; }
  const lessons = typeof lxReady === 'function' && lxReady(); if (!lessons) { try { XC || xcLoad(); BC || bcLoad(); ccLoad(() => { CO_LEARN.t = 0; }); } catch (e) { } }
  const R = coFitPick(min); COF = R; const c = R.pick;
  openModal(`<h2>${min} minutes</h2>
    ${R.fixed ? `<div class="mc-wl"><span>Not free time</span><div><b>${esc(R.fixed.out)}</b></div><div class="xs">${esc(R.fixed.why)}</div></div>` : ''}
    ${!R.fixed && R.cap < min ? `<div class="xs muted">Only ${R.cap} minutes are free before your next fixed commitment, so this fits ${R.cap}.</div>` : ''}
    ${c ? `<div class="mc-wl"><span>Best use · ${esc(MC_DOMS[c.dom] || c.dom)}${c.k === 'dial' ? ' · about ' + Math.max(1, Math.floor(R.cap / 2)) + ' dials' : ''}</span><div><b>${esc(c.out)}</b></div><div class="xs">${esc(c.why)}</div><div class="xs muted">Done when: ${esc(c.dod || '')}</div>${(c.ev || []).slice(0, 2).map((e) => `<div class="xs muted">• ${esc(e)}</div>`).join('')}</div>` : R.fixed ? '' : `<div class="mc-wl"><span>Best use</span><div><b>Rest.</b></div><div class="xs">Nothing on today's list is worth starting in ${R.cap} minutes. Water, a walk, eyes off the screen.</div></div>`}
    ${R.skipped.length ? `<div class="mc-wl"><span>Ranked higher, does not fit</span>${R.skipped.slice(0, 3).map((s) => `<div class="xs">• ${esc(s.out)} (needs ${coNeed(s)} min)</div>`).join('')}</div>` : ''}
    <div class="xs muted">Chosen by Mission Control's own ranking, filtered by time.${lessons ? '' : ' Lessons are still loading, so Learn is not in this list yet: tap again in a moment.'}</div>
    <div class="actions wrap"><button class="btn" onclick="closeModal()">Close</button>${c ? `<button class="btn primary" onclick="coFitGo()">${c.k === 'learn' || c.k === 'recall' ? 'Plan ' + R.cap + ' min in Learn' : 'Start'}</button>` : ''}</div>`, true);
}
function coFitGo() { const R = COF; if (!R || !R.pick) return; const c = R.pick; closeModal(); if (c.k === 'learn' || c.k === 'recall') { mcOpen('boot'); setTimeout(() => { try { lxGo(); lxPlanOpen(R.cap, c.k === 'recall' ? 'review' : undefined); } catch (e) { } }, 250); return; } try { mcGo(c.k); } catch (e) { if (c.go) c.go(); } }
if (typeof mcCard === 'function' && !mcCard._co) { const f = mcCard; mcCard = function () { const h = f.apply(this, arguments); if (!h || window.CO_OFF) return h; const row = `<div class="co-fit"><span>I have</span>${CO_FIT.map((m) => `<button onclick="coFit(${m})">${m}</button>`).join('')}<button onclick="coFit(0)">…</button><em>min</em></div>`; const i = h.lastIndexOf('</div>'); return i < 0 ? h : h.slice(0, i) + row + h.slice(i); }; mcCard._co = 1; }

/* ───────── 3 · done is not the same as it worked ───────── */
function coEvidence(o, k) { try { const E = mcDialEvidence(k); const saved = o.mcDone; o.mcDone = null; const met = mcMet(o, E); o.mcDone = saved; return met; } catch (e) { return false; } }
if (typeof mcDoneToggle === 'function' && !mcDoneToggle._co) { const f = mcDoneToggle; mcDoneToggle = function (k) { const r = f.apply(this, arguments); try { const o = S.days[dk(new Date())]; if (o && o.mcDone && o.mcDone.k === k && !window.CO_OFF) setTimeout(() => coDoneAsk(), 150); } catch (e) { } return r; }; mcDoneToggle._co = 1; }
function coDoneAsk() {
  const kk = dk(new Date()), o = S.days[kk]; if (!o || !o.mcDone) return; const ev = coEvidence(o, kk), t = (o.mc && o.mc.k === o.mcDone.k && o.mc.t) || o.mcDone.k;
  openModal(`<h2>Marked done</h2><div class="hint">${esc(t)}</div><div class="st-o"><em class="${ev ? 'ok' : 'warn'}">${ev ? 'The records agree' : 'Marked by hand'}</em><div class="xs">${ev ? 'Logged evidence meets this mission\'s done condition.' : 'Nothing in the logs shows it yet. That is fine if it happened off the app; it stays labelled "by hand".'}</div></div>
    <input class="aq-in" id="co-exp" placeholder="What did you expect to happen?"><input class="aq-in" id="co-obs" placeholder="What actually happened?">
    <div class="xs muted">Two lines. Sunday's review compares them. Leave empty if there is nothing to say yet.</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Skip</button><button class="btn primary" onclick="coDoneSave()">Save</button></div>`);
}
function coDoneSave() { const o = day(new Date()); if (!o.mcDone) { closeModal(); return; } const e = $('co-exp').value.trim(), b = $('co-obs').value.trim(); if (e) o.mcDone.exp = e.slice(0, 240); if (b) o.mcDone.obs = b.slice(0, 240); touch(o); save(); closeModal(); if (e || b) toast('Saved for the review'); }
/* the week, action by action: marked done · evidence in the logs · outcome you wrote. Read-only over the day records. */
function coWeekActions(d) {
  const out = [], mon = monday(d || new Date()), by = typeof mcDialLog === 'function' ? mcDialLog() : {};
  for (let i = 0; i < 7; i++) { const dd = addDays(mon, i), k = dk(dd); if (k > dk(new Date())) break; const o = S.days[k]; if (!o || !o.mc) continue; const saved = o.mcDone; let ev = false; try { o.mcDone = null; ev = mcMet(o, mcDialEvidence(k, by)); } catch (e) { } o.mcDone = saved;
    out.push({ k, t: o.mc.t || o.mc.k, kind: o.mc.k, marked: !!(saved && saved.k === o.mc.k), ev, exp: (saved && saved.exp) || '', obs: (saved && saved.obs) || '' }); }
  return out;
}
function coWeekHtml(d) {
  const A = coWeekActions(d), hand = A.filter((a) => a.marked && !a.ev).length, noOut = A.filter((a) => (a.marked || a.ev) && !a.obs).length, miss = A.filter((a) => a.exp && a.obs).length;
  let ses = []; try { const m = dk(monday(d || new Date())); ses = lxLog().filter((s) => s.d >= m); } catch (e) { }
  return `<div class="mc-wl" id="co-week"><span>Action by action (from the records)</span>${A.length ? A.map((a) => `<div class="co-wa"><b>${esc(fmtShort(pd(a.k)))}</b><span>${esc(String(a.t).slice(0, 70))}<em>${a.marked ? 'marked done' : 'not marked'} · ${a.ev ? 'evidence in the logs' : 'no evidence in the logs'} · ${a.obs ? 'outcome: ' + esc(a.obs) : 'no outcome written'}${a.exp ? ' · expected: ' + esc(a.exp) : ''}</em></span></div>`).join('') : '<div class="xs">No mission was started this week, so there is nothing to compare.</div>'}
    <div class="xs muted">${hand} marked done with no evidence in the logs · ${noOut} finished with no outcome written · ${miss} with both an expectation and a result.${ses.length ? ` Learn: ${ses.length} session${ses.length === 1 ? '' : 's'}, ${ses.reduce((a, s) => a + (s.spent || 0), 0)} min, ${ses.filter((s) => (s.kinds || []).some((x) => x === 'practice' || x === 'mission')).length} with practice.` : ' No Learn session this week.'}</div></div>`;
}
if (typeof mcWeekOpen === 'function' && !mcWeekOpen._co) { const f = mcWeekOpen; mcWeekOpen = function () { const r = f.apply(this, arguments); try { const a = $('wk-a'); if (a && !document.getElementById('co-week')) { a.insertAdjacentHTML('beforebegin', coWeekHtml(new Date())); const c = $('wk-c'); if (c) c.insertAdjacentHTML('afterend', '<label class="xs" style="display:block;margin:2px 0 8px"><input type="checkbox" id="wk-task" checked> Put this change on Monday\'s tasks</label>'); } } catch (e) { console.warn('co week', e); } return r; }; mcWeekOpen._co = 1; }
if (typeof mcWeekSave === 'function' && !mcWeekSave._co) { const f = mcWeekSave; mcWeekSave = function (board) { const c = (($('wk-c') || {}).value || '').trim(), a = (($('wk-a') || {}).value || '').trim(), mk = !!($('wk-task') && $('wk-task').checked); if (a && !c && !window.CO_OFF) { toast('Name the ONE change for next week. A review that changes nothing is a diary.'); return; } const r = f.apply(this, arguments); try { const wk = weekKey(new Date()), R = (S.reviews || {})[wk]; if (R && c) { R.acts = coWeekActions(new Date()); if (mk && !R.changeTask) { const d = addDays(monday(new Date()), 7), t = { id: uid(), _u: now(), title: 'Weekly change: ' + c.slice(0, 80), due: dk(d), done: false, note: 'From the weekly review of ' + wk.slice(1) }; S.tasks = S.tasks || {}; S.tasks[t.id] = t; R.changeTask = t.id; try { if (typeof taskHook === 'function') taskHook('create', t); } catch (e) { } } R._u = now(); save(); } } catch (e) { console.warn('co week save', e); } return r; }; mcWeekSave._co = 1; }

/* ───────── 4 · one capture, nothing lost ───────── */
const CO_KIND = { task: ['Task', 'Todoist or the task list'], market: ['Market note', 'what an owner or caregiver said or did'], decision: ['Decision', 'a choice, with what you expect'], journal: ['Journal', 'an event, lesson, win or mistake'], resource: ['Resource', 'a link or a book to learn from'], money: ['Money', 'spent or earned'], note: ['Note', 'Playbook → My notes'] };
function coCaps() { return Object.keys(S.boot || {}).filter((k) => k.indexOf('cap:') === 0).map((k) => Object.assign({ key: k }, bcV(k, null) || {})).filter((x) => x.raw).sort((a, b) => (b.at || 0) - (a.at || 0)); }
function coOpenCaps() { return coCaps().filter((x) => x.st !== 'routed' && x.st !== 'dropped'); }
function coGuess(v) { if (/https?:\/\/|www\./i.test(v)) return 'resource'; if (/\b(spent|paid|bought|earned|lei|mdl|usd|eur)\b|[$€]/i.test(v)) return 'money'; if (/\b(owner|agency|caregiver|they said|she said|he said|competitor)\b|["“]/i.test(v)) return 'market'; if (/\b(decid|i will choose|should i|either|option)\w*/i.test(v)) return 'decision'; if (/\b(call|email|send|buy|book|pay|remind|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(v)) return 'task'; return ''; }
function coCapNew(raw, kind) { const id = 'cap:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); bcW(id, { at: now(), raw: String(raw).slice(0, 2000), kind: kind || '', st: 'new' }); return id; }
function coCapSet(id, patch) { const v = bcV(id, null); if (!v) return; bcW(id, Object.assign({}, v, patch)); }
function coPrefill(v) { setTimeout(() => { try { const m = $('modal'), el = m && (m.querySelector('textarea') || m.querySelector('input[type=text], input:not([type])')); if (el && !el.value) { el.value = v; el.dispatchEvent(new Event('input')); } } catch (e) { } }, 120); }
/* route one captured line. Direct owners finish it; form owners open pre-filled and it waits in Unprocessed until you confirm. */
function coRoute(id, kind) {
  const c = bcV(id, null); if (!c || !CO_KIND[kind]) return; const v = c.raw; window.COCAP = null;
  if (kind === 'task') { closeModal(); try { captureTask(v, ''); coCapSet(id, { kind, st: 'routed', to: 'task' }); toast('Task added. Original kept'); } catch (e) { coCapSet(id, { kind, st: 'new' }); toast('Could not add the task. It is in Unprocessed'); } return; }
  if (kind === 'note') { try { const p = pb('notes') || { title: 'Notes', body: '' }, stamp = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); pbSave('notes', p.title || 'Notes', `- **${stamp}** ${v}\n` + (p.body || ''), 'mine'); coCapSet(id, { kind, st: 'routed', to: 'playbook:notes' }); closeModal(); toast('Saved in Playbook → My notes'); } catch (e) { coCapSet(id, { kind, st: 'new' }); toast('Could not save the note. It is in Unprocessed'); } return; }
  coCapSet(id, { kind, st: 'sent' }); window.COCAP = { id, kind, n: Object.keys(S.obs || {}).length, d: Object.keys(S.decisions || {}).length, j: Object.keys(S.journal || {}).length };
  try {
    if (kind === 'market') stObsNew({ kind: 'problem', text: v });
    else if (kind === 'decision') { jlDecEdit(''); coPrefill(v); }
    else if (kind === 'journal') { jnEdit('', 'event'); coPrefill(v); }
    else if (kind === 'resource') { ccCapture(); setTimeout(() => { try { const u = $('cc-cu'), t = $('cc-ct'); if (/https?:\/\//.test(v) && u) u.value = (v.match(/https?:\/\/\S+/) || [''])[0]; if (t) t.value = v.replace(/https?:\/\/\S+/, '').trim().slice(0, 120); } catch (e) { } }, 120); }
    else if (kind === 'money') { closeModal(); mnEdit(null, { type: /earn|received|got paid/i.test(v) ? 'in' : 'out', note: v }); }
  } catch (e) { console.warn('co route', e); toast('That form could not open. The line is in Unprocessed'); }
}
/* when the owner's form is saved, link the record to the captured line and close it */
function coAfterSave() { const P = window.COCAP; if (!P) return; try { const find = (map, n) => { const K = Object.keys(map || {}); return K.length > n ? K.map((k) => map[k]).filter((r) => r && !r._del).sort((a, b) => (b._u || 0) - (a._u || 0))[0] : null; }; const r = P.kind === 'market' ? find(S.obs, P.n) : P.kind === 'decision' ? find(S.decisions, P.d) : P.kind === 'journal' ? find(S.journal, P.j) : null; if (r) { r.cap = P.id; coCapSet(P.id, { st: 'routed', to: P.kind + ':' + r.id }); window.COCAP = null; save(); } } catch (e) { } }
['stObsSave', 'jlDecSave', 'jnSave'].forEach((n) => { try { const f = window[n]; if (typeof f !== 'function' || f._co) return; const g = function () { const r = f.apply(this, arguments); coAfterSave(); return r; }; g._co = 1; window[n] = g; } catch (e) { } });
function coCap(kind) { const el = $('arc-in'), v = ((el || {}).value || '').trim(); if (v.length < 3) { toast('Type it first'); return; } const id = coCapNew(v, kind); if (kind) coRoute(id, kind); else { closeModal(); toast('Kept in Unprocessed. Nothing is lost'); } }
function coInbox() {
  const L = coOpenCaps();
  openModal(`<h2>Unprocessed</h2><div class="hint">${L.length} captured line${L.length === 1 ? '' : 's'} not yet filed. The original text is kept exactly as you wrote it.</div>
    ${L.map((c) => { const g = c.kind || coGuess(c.raw); return `<div class="st-o"><em class="${c.st === 'sent' ? 'warn' : ''}">${new Date(c.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${c.st === 'sent' ? ' · opened as ' + esc(CO_KIND[c.kind][0]) + ', not confirmed saved' : ''}</em><div>${esc(c.raw)}</div><div class="co-kinds">${Object.entries(CO_KIND).map(([k, l]) => `<button class="${g === k ? 'on' : ''}" onclick="coRoute('${c.key}','${k}')">${l[0]}</button>`).join('')}</div><div class="actions"><button class="btn xs" onclick="coCapSet('${c.key}',{st:'routed',to:'filed by hand'});coInbox()">Already filed</button><button class="btn xs" onclick="coCapSet('${c.key}',{st:'dropped'});coInbox()">Not needed</button></div></div>`; }).join('') || '<div class="hint">Nothing is waiting.</div>'}
    <div class="xs muted">Dropped lines are kept, marked "not needed". Nothing here is deleted.</div><div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
/* the + sheet: the same box, plus "send it as…" and the Unprocessed count. Text the number-parser cannot read is kept, not refused. */
if (typeof shCapture === 'function' && !shCapture._co) { const f = shCapture; shCapture = function () { const r = f.apply(this, arguments); try { const pv = document.getElementById('arc-pv'), n = coOpenCaps().length; if (pv && !document.getElementById('co-cap')) pv.insertAdjacentHTML('afterend', `<div id="co-cap"><div class="xs muted">Not a number to log? Send the line as:</div><div class="co-kinds" id="co-ck">${Object.entries(CO_KIND).map(([k, l]) => `<button data-k="${k}" title="${l[1]}" onclick="coCap('${k}')">${l[0]}</button>`).join('')}<button onclick="coCap('')">Not sure</button></div><button class="co-un" onclick="coInbox()">Unprocessed${n ? ' · ' + n : ''} ›</button></div>`); const el = $('arc-in'); if (el && !el._co) { el._co = 1; el.addEventListener('input', () => { const g = coGuess(el.value); document.querySelectorAll('#co-ck button').forEach((b) => b.classList.toggle('on', !!g && b.dataset.k === g)); }); } } catch (e) { console.warn('co cap', e); } return r; }; shCapture._co = 1; }
if (typeof arcLogSave === 'function' && !arcLogSave._co) { const f = arcLogSave; arcLogSave = function () { const v = (($('arc-in') || {}).value || '').trim(); try { if (v.length >= 3 && typeof arcParse === 'function' && !arcParse(v).length && document.getElementById('co-cap')) { coCapNew(v, coGuess(v)); closeModal(); toast('Not a number I can log, so it is kept in Unprocessed', 'Open', () => coInbox()); return; } } catch (e) { } return f.apply(this, arguments); }; arcLogSave._co = 1; }

/* ───────── 5 · automation: what really runs ───────── */
function coAutoRows() {
  const R = [], cfg = (() => { try { return ccCfg(); } catch (e) { return {}; } })(), notes = Object.values(S.inbox || {}).filter((n) => n && !n._del), last = (re) => { const L = notes.filter((n) => re.test(n.title || '')).sort((a, b) => (b.at || 0) - (a.at || 0))[0]; return L ? new Date(L.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : null; };
  const sc = last(/Discovery scan/), cr = last(/Curriculum review/);
  R.push(['Weekly content scan', cfg.freq === 'off' ? 'blocked' : 'alone', cfg.freq === 'off' ? 'Switched off in Content settings.' : 'Mondays 07:37. Last note in this app: ' + (sc || 'none yet') + '.']);
  R.push(['Adding scan results to the library', cfg.auto === false ? 'tap' : 'alone', cfg.auto === false ? 'You add them from the note.' : 'Happens when this app opens after a scan.']);
  R.push(['Monthly curriculum review', 'alone', 'The 1st of each month. Last note in this app: ' + (cr || 'none yet') + '.']);
  R.push(['Daily research', 'blocked', 'Asked for; the schedule change was not approved. Nothing runs daily.']);
  R.push(['Research now', 'tap', 'Opens a prepared request. Nothing happens until you send it and paste the answer.']);
  R.push(['Dial Guard push', 'alone', 'Mon–Sat during dial blocks. The app cannot see whether it fired; your phone can.']);
  R.push(['Tasks ↔ Todoist', (() => { try { return tdOn() ? 'alone' : 'tap'; } catch (e) { return 'tap'; } })(), (() => { try { return tdOn() ? 'Two-way while the app is open.' : 'Not connected on this device.'; } catch (e) { return 'State unknown on this device.'; } })()]);
  R.push(['Calendar', S.settings.calUrl ? 'alone' : 'tap', S.settings.calUrl ? 'Read-only feed, refreshed while the app is open.' : 'No calendar address saved.']);
  R.push(['Cloud sync', (() => { try { return syncReady() ? 'alone' : 'blocked'; } catch (e) { return 'blocked'; } })(), (() => { try { return syncReady() ? 'While the app is open and online.' : 'No sync code on this device.'; } catch (e) { return 'State unknown.'; } })()]);
  R.push(['Lesson videos checked', 'tap', 'A video counts as inspected only after someone watches it. Most new ones are "title checked".']);
  R.push(['Real-phone test', 'tap', (() => { const p = bcV('pt:1331', {}) || {}; return Object.values(p).filter((v) => v === 'ok').length + ' checks passed by you on a phone.'; })()]);
  return R;
}
function coAuto() { const L = { alone: ['Runs by itself', 'ok'], tap: ['Needs your tap', 'warn'], blocked: ['Blocked', 'bad'] }; openModal(`<h2>What runs by itself</h2><div class="hint">Stated from what this app can actually see. A scheduled task that ran but left no note here shows "none yet".</div>${coAutoRows().map(([n, s, d]) => `<div class="st-o"><em class="${L[s][1]}">${L[s][0]}</em><div><b>${esc(n)}</b></div><div class="xs">${esc(d)}</div></div>`).join('')}<div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true); }

/* ───────── one door each ───────── */
/* the timed planners that existed before Learn → Now now open Learn's planner. Old missions in progress stay readable. */
if (typeof ccPlanOpen === 'function' && !ccPlanOpen._co) { ccPlanOpen = function (min) { try { closeModal(); lxGo(); if (min) lxPlanOpen(min); else lxCustom(); } catch (e) { } }; ccPlanOpen._co = 1; }
if (typeof ccPlanRun === 'function' && !ccPlanRun._co) { ccPlanRun = function (min) { try { closeModal(); lxGo(); lxPlanOpen(Number(min) || 20); } catch (e) { } }; ccPlanRun._co = 1; }
if (typeof cpMissionStart === 'function' && !cpMissionStart._co) { const f = cpMissionStart; cpMissionStart = function (long) { try { if (cpMission()) return f.apply(this, arguments); } catch (e) { } try { lxGo(); lxPlanOpen(long ? 45 : 25); } catch (e) { return f.apply(this, arguments); } }; cpMissionStart._co = 1; }

(function () { const st = document.createElement('style'); st.textContent = `.co-fit{display:flex;align-items:center;gap:5px;margin-top:10px;flex-wrap:wrap}.co-fit span,.co-fit em{font-size:11.5px;opacity:.6;font-style:normal}.co-fit button{min-width:38px;padding:6px 0;border-radius:9px;border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;font:inherit;font-size:13px;font-weight:600}
.co-wa{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--ln,#2a2a2e);font-size:13px}.co-wa b{flex:none;width:52px;font-size:11.5px;opacity:.7}.co-wa span{min-width:0;overflow-wrap:anywhere}.co-wa em{display:block;font-style:normal;font-size:11px;opacity:.65}
.co-kinds{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.co-kinds button{border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;font:inherit;font-size:12px;border-radius:999px;padding:5px 10px}.co-kinds button.on{border-color:var(--good,#3fb950);color:var(--good,#3fb950)}
.co-un{background:none;border:0;color:inherit;font:inherit;font-size:12px;opacity:.7;padding:4px 0 8px}#co-cap{margin:6px 0 4px;text-align:left}.lx-lib .cc-min{display:none}`; document.head.appendChild(st); })();
