/* War Room 13.0 · STAGES — the app is as big as the business is real.
   The product verdict: the system had grown ahead of the operator. Pipeline, intelligence, cases and economics were all on
   screen while the evidence said "0 owner conversations". A tool for a later stage is a place to hide from this one.
   So Work shows only what the current stage needs. The rest is not deleted: it waits under "Later" with the exact evidence
   that opens it, and can always be opened by hand. Stages come from the log only. */
'use strict';
/* Evidence, from the log only. Each level is a different thing and is counted separately:
   attempt (a dial) · answered (a person picked up) · decision-maker conversation · stated staffing requirement ·
   request for profiles · caregiver working · payment received. A friendly call is not demand. */
function sgEvidence() {
  let items = []; try { items = qItems(); } catch (e) { }
  const today = dk(new Date()), logs = items.flatMap((x) => (x.log || []).map((l) => ({ x, l }))), uniq = (L) => new Set(L.map((e) => e.x.id)).size;
  const att = logs.filter((e) => !e.l.d || e.l.d.dials).length, counter = counterTotal('dials');           /* attempts: logged calls; a bare counter is shown but proves nothing */
  const answered = logs.filter((e) => /^(gatekeeper|owner talk)/i.test(e.l.r || '')).length;
  const conv = logs.filter((e) => e.l.d && e.l.d.owners);                                                    /* live conversations with a decision-maker: phone or meeting, never email */
  const qual = conv.filter((e) => (e.l.note || '').trim().length >= 12 || (e.l.demand && (e.l.demand.need || '').trim())); /* qualified = what they said is written down */
  const need = (e) => e.l.demand && (e.l.demand.need || '').trim().length >= 8, ask = (e) => e.l.demand && e.l.demand.profiles;
  const needAg = new Set(logs.filter(need).map((e) => e.x.id)), askAg = new Set(logs.filter(ask).map((e) => e.x.id)), demand = [...needAg].filter((id) => askAg.has(id)).length;
  const shifts = items.flatMap((x) => (x.placements || []).filter((p) => (p.cg || '').trim() && p.at && String(p.at).slice(0, 10) <= today)); /* a named caregiver from our bench, shift date not in the future */
  const paidInv = items.flatMap((x) => ((x.client || {}).invoices || []).filter((v) => v.status === 'paid' && v.paidAt && Number(v.amount) > 0));
  let bench = 0, benchOk = 0; try { const B_ = bItems().filter((c) => ['hot', 'screened'].includes(c.status)); bench = B_.length; benchOk = B_.filter((c) => c.consent).length; } catch (e) { }
  const cb = items.filter((x) => x.status === 'callback').length;
  return { attempts: att, counterOnly: Math.max(0, counter - att), answered, conv: conv.length, dm: qual.length, dmAgencies: uniq(qual), needs: needAg.size, requests: askAg.size, demand, working: shifts.length, paid: paidInv.length, paidSum: paidInv.reduce((a, v) => a + Number(v.amount), 0), bench, benchOk, cb };
}
/* The validation journey. It ends at the first payment; it is not the destination. After it the ladder continues toward
   $20k MRR (SG_NEXT): those stages get their evidence definitions when stage 5 is reached, and nothing is built for them before. */
const SG_LADDER = [
  { id: 'contact', phase: 'validation', name: 'First decision-maker conversation', why: 'Discovery. Nothing about their staffing problem is known until one owner has described it.', val: (e) => e.dm, need: 1, unit: 'qualified conversation', rule: 'A live call or meeting with the person who decides on hiring, with what they said written down.' },
  { id: 'learn', phase: 'validation', name: 'Ten decision-maker conversations', why: 'Ten show which need repeats: shifts, towns, requirements, and whether they would work with you.', val: (e) => e.dm, need: 10, unit: 'qualified conversations', rule: 'Ten qualified conversations. Unique agencies are shown beside it; emails never count.' },
  { id: 'demand', phase: 'validation', name: 'First concrete demand', why: 'A pleasant call is not demand.', val: (e) => e.demand, need: 1, unit: 'agency with concrete demand', rule: 'The same agency has stated a specific staffing need and explicitly agreed to receive suitable candidate profiles. Source and time recorded.' },
  { id: 'match', phase: 'validation', name: 'First caregiver completes a shift', why: 'Supply matched to a real requirement, with the caregiver\'s consent.', val: (e) => e.working, need: 1, unit: 'completed shift', rule: 'A named caregiver you sourced or introduced has worked a shift on a date that has passed.' },
  { id: 'paid', phase: 'validation', name: 'First payment received', why: 'The only proof that someone wants to buy this.', val: (e) => e.paid, need: 1, unit: 'cleared payment', rule: 'An invoice to an agency marked paid, with the date the money arrived. A promise or a sent invoice does not count.' }];
const SG_NEXT = ['Repeatable acquisition', 'Reliable placements and delivery', 'Retention', 'Unit economics', '$20k MRR'];
function sgState() {
  const e = sgEvidence(); let i = SG_LADDER.findIndex((s) => s.val(e) < s.need); const done = i < 0; if (done) i = SG_LADDER.length - 1; const s = SG_LADDER[i];
  const rooms = [
    { v: 'crm', label: 'Pipeline', open: e.conv >= 1 || e.cb > 0 || e.needs > 0 || e.requests > 0, need: 'your first decision-maker conversation, callback or recorded evidence', have: `${e.conv} conversations, ${e.cb} callbacks`, why: 'A pipeline with nothing in it is a place to rearrange instead of dial.' },
    { v: 'intel', label: 'Intel', open: e.attempts >= 300, need: '300 call attempts', have: `${e.attempts} of 300`, why: 'Below 300 attempts every rate on that screen is noise, and reading noise feels like work.' }];
  return { e, f: e, i, s, done, n: SG_LADDER.length, cur: s.val(e), rooms, all: !!(S.settings && S.settings.stageAll) };
}
function sgApply() { try { const H = SH_HUBS.find((h) => h.id === 'work'), st = sgState(), segs = [['dial', 'Dial']]; st.rooms.forEach((r) => { if (r.open || st.all) segs.push([r.v, r.label]); }); segs.push(['book', 'Playbook']); if (!st.all && st.rooms.some((r) => !r.open)) segs.push(['later', 'Later']); H.segs = segs; } catch (e) { } }
function sgSheet() {
  const st = sgState(), e = st.e, row = (l, v, h) => `<div><span>${l}</span><b>${v}</b><em>${h}</em></div>`;
  openModal(`<h2>Stage ${st.i + 1} of ${st.n}</h2><div class="sg-now"><b>${esc(st.s.name)}</b><span>${st.cur} of ${st.s.need} · ${esc(st.s.why)}</span></div>
    <div class="sg-lad">${SG_LADDER.map((s, i) => `<div class="${i < st.i || st.done ? 'done' : i === st.i ? 'cur' : ''}"><i>${i + 1}</i><span>${esc(s.name)}</span><em>${i < st.i || st.done ? 'done' : i === st.i ? `${st.cur}/${s.need}` : ''}</em></div>`).join('')}</div>
    <div class="bf-h" style="margin-top:18px">Evidence in your log</div>
    <div class="sg-ev">${row('Call attempts', e.attempts, e.counterOnly ? `logged calls · ${e.counterOnly} more were only counted, without a record` : 'each one a logged call')}${row('Answered', e.answered, 'a person picked up')}${row('Decision-maker conversations', e.dm, `qualified: live, with their words written down · ${e.dmAgencies} unique agenc${e.dmAgencies === 1 ? 'y' : 'ies'}${e.conv > e.dm ? ` · ${e.conv - e.dm} more without notes do not count` : ''}`)}${row('Specific staffing needs', e.needs, 'agencies that named one, from a call, email or meeting')}${row('Requests for profiles', e.requests, 'agencies that explicitly agreed to receive candidates')}${row('Concrete demand', e.demand, 'the same agency has both')}${row('Completed shifts', e.working, 'a named caregiver from your bench, date passed')}${row('Payments received', e.paid, e.paid ? `$${fmt(e.paidSum)} cleared` : 'an invoice marked paid, with its date')}</div>
    <button class="btn block" style="margin-top:10px" onclick="sgEvModal()">Record evidence (email · call · meeting)</button>
    <div class="xs muted" style="margin-top:8px">${esc(st.s.rule)}</div>
    <div class="bf-h" style="margin-top:18px">Supply, built in parallel</div>
    <div class="sg-ev">${row('Screened caregivers', e.bench, 'on the bench')}${row('With consent to share', e.benchOk, 'only these can be sent to an agency')}</div>
    <div class="xs muted" style="margin-top:8px">Not a gate. Screen against real criteria and get consent before sharing; source for an agency's actual requirement once it exists.</div>
    <div class="bf-h" style="margin-top:18px">After the first payment</div><div class="xs muted">${SG_NEXT.join(' → ')}. These five stages validate the business; the destination stays $20k MRR. Later stages get defined, and built for, when you reach them.</div>
    <div class="bf-h" style="margin-top:18px">Always open</div><div class="xs muted">Dial (owners) · Caregivers (add, call, screen, the bench) · Playbook.</div>
    <div class="bf-h" style="margin-top:14px">Waiting for evidence</div>
    ${st.rooms.filter((r) => !r.open).map((r) => `<div class="sg-room"><div><b>${r.label}</b><span>Opens at ${esc(r.need)} · now ${esc(r.have)}. ${esc(r.why)}</span></div><button onclick="closeModal();shRawGo('${r.v}')">Open anyway</button></div>`).join('') || '<div class="xs muted">Everything is open.</div>'}
    <div class="row" style="gap:8px;margin-top:16px"><button class="btn primary grow" onclick="closeModal();show('dial')">Back to the dialer</button><button class="btn" onclick="S.settings.stageAll=${st.all ? 'false' : 'true'};touch(S.settings);save();closeModal();render();toast('${st.all ? 'Stages on' : 'Everything shown'}')">${st.all ? 'Use stages' : 'Show everything'}</button></div>
    <div class="xs muted" style="margin-top:10px">Every number above is counted from logged calls, placements and invoices. Nothing is typed in by hand, deleted or hidden for good.</div>`, true);
}
/* Evidence that did not arrive in a logged call: an email, a meeting, a call made outside the dialer. It keeps its real source
   and time. An email is never a conversation; a meeting or call is one only if you say it was live with the decision-maker. */
let sgEvPick = null;
function sgEvModal(id) {
  sgEvPick = id != null ? id : null; const d = new Date(), loc = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  openModal(`<h2>Record evidence</h2><div class="small muted" style="margin-bottom:12px">Only what actually happened, from its real source. This is how a need stated by email counts without pretending it was a call.</div>
    <div class="field"><label>Agency</label><input id="se-q" placeholder="type the agency name" oninput="sgEvFind(this.value)" value="${sgEvPick != null && Q.items[sgEvPick] ? esc(Q.items[sgEvPick].agency) : ''}"><div id="se-res"></div></div>
    <div class="field"><label>Source</label><div class="chips" id="se-src">${[['email', 'Email'], ['phone', 'Phone call'], ['meeting', 'Meeting / video']].map(([v, l], i) => `<span class="chip ${i === 0 ? 'on' : ''}" data-v="${v}" onclick="document.querySelectorAll('#se-src .chip').forEach(c=>c.classList.toggle('on',c===this));document.getElementById('se-live-w').classList.toggle('hidden','${v}'==='email')">${l}</span>`).join('')}</div></div>
    <div class="field"><label>When it happened</label><input id="se-at" type="datetime-local" value="${loc}" max="${loc}"></div>
    <div class="field"><label>Their words</label><textarea id="se-note" placeholder="quote or paste the relevant line"></textarea></div>
    <div class="field sg-dem"><label>What it establishes</label><input id="se-need" placeholder="Specific staffing need: role, shift, town. Leave empty if none."><label class="sg-ck"><input type="checkbox" id="se-prof"> They explicitly agreed to receive suitable candidate profiles</label>
      <label class="sg-ck hidden" id="se-live-w"><input type="checkbox" id="se-live"> This was a live conversation with the decision-maker</label></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="sgEvSave()">Save evidence</button></div>`, true);
}
function sgEvFind(q) { q = q.trim().toLowerCase(); const el = document.getElementById('se-res'); if (!el) return; sgEvPick = null; if (q.length < 2) { el.innerHTML = ''; return; } el.innerHTML = qItems().filter((x) => (x.agency || '').toLowerCase().includes(q)).slice(0, 6).map((x) => `<button class="bf-r" onclick="sgEvPick=${typeof x.id === 'number' ? x.id : `'${x.id}'`};document.getElementById('se-q').value='${esc(x.agency).replace(/'/g, '&#39;')}';document.getElementById('se-res').innerHTML=''"><em>Agency</em><b>${esc(x.agency)}</b><span>${esc(x.city || '')}</span></button>`).join('') || '<div class="bf-none">No agency with that name in your queue.</div>'; }
function sgEvSave() {
  const x = sgEvPick != null ? Q.items[sgEvPick] : null; if (!x) { toast('Pick the agency from the list'); return; }
  const src = (document.querySelector('#se-src .chip.on') || {}).dataset.v || 'email', at = $('se-at').value ? new Date($('se-at').value) : new Date(), note = $('se-note').value.trim(), need = $('se-need').value.trim(), prof = $('se-prof').checked, live = src !== 'email' && $('se-live').checked;
  if (at > new Date()) { toast('The time cannot be in the future'); return; } if (!note && !need && !prof) { toast('Write what they said'); return; } if (live && note.length < 12) { toast('A conversation counts only with their words written down'); return; }
  x.log = x.log || []; x.log.push({ at: at.toISOString(), day: dk(at), r: 'Evidence · ' + src + (live ? ' · decision-maker conversation' : ''), note, src, manual: true, added: new Date().toISOString(), d: { dials: 0, owners: live ? 1 : 0 }, demand: need || prof ? { need, profiles: prof } : undefined });
  x.log.sort((a, b) => (a.at < b.at ? -1 : 1)); x._u = now(); qSave(); closeModal(); render(); toast('Evidence saved · ' + src); setTimeout(sgSheet, 250);
}
/* 'later' is a door, not a screen */
let shRawGo = function (v) { show(v); };
(function () {
  const _show = show; show = function (v) { if (v === 'later') { sgSheet(); return; } return _show.apply(this, arguments); }; shRawGo = function (v) { _show(v); };
  ['renderNav', 'render'].forEach((n) => { const f = window[n]; if (typeof f === 'function' && !f._sg) { window[n] = function () { sgApply(); return f.apply(this, arguments); }; window[n]._sg = 1; } });
  /* the spine, on the dialer: where you are, and the one number that moves you */
  const _r = render; render = function () { const x = _r.apply(this, arguments); try { if (view === 'dial' && !(typeof shArcOn === 'function' && shArcOn())) { const v = document.getElementById('view-dial'), st = sgState(), h = `<b>Stage ${st.i + 1}/${st.n}</b><span>${esc(st.s.name)} · ${st.cur}/${st.s.need}</span><em>why ›</em>`; let el = v.querySelector(':scope > .sg-strip'); if (!el) { el = document.createElement('button'); el.className = 'sg-strip'; el.onclick = sgSheet; const seg = v.querySelector(':scope > .sh-seg'); if (seg) seg.after(el); else v.prepend(el); } if (el.innerHTML !== h) el.innerHTML = h; } } catch (e) { } return x; };
  /* the spine, on Day: today's number → the week → the stage → the mission, in one line */
  if (typeof arcHtml === 'function' && !arcHtml._sg) { const _h = arcHtml; arcHtml = function () { let h = _h(); try { const st = sgState(), d = new Date(), tg = dialTargetFor(d), o = day(d), done = Number((o.counters || {}).dials) || 0, wk = counterWeek('dials', d), g = Object.values(S.goals || {}).find((x) => x && !x._del && x.horizon === 'week' && /dial/i.test(x.title || '')), wt = g ? g.target : 0;
      const line = `<button class="sg-chain" onclick="sgSheet()"><span><b>${done}/${tg || 0}</b> dials today</span><i>→</i><span><b>${wk}${wt ? '/' + wt : ''}</b> this week</span><i>→</i><span><b>${st.cur}/${st.s.need}</b> ${esc(st.i < 2 ? st.s.unit : st.s.name.toLowerCase().replace(/^first /, ''))}</span><i>→</i><span>${esc(String(S.settings.bigGoal || '$20k MRR'))}</span></button>`;
      const k = h.indexOf('<button class="bf-strip'); const j = k > 0 ? k : h.indexOf('<div class="arc-line">'); if (j > 0) h = h.slice(0, j) + line + h.slice(j); } catch (e) { } return h; }; arcHtml._sg = 1; }
  sgApply(); try { renderNav(); if (typeof arcRender === 'function' && document.querySelector('#arc.on')) arcRender(); } catch (e) { }
})();

/* ── demand evidence is captured where it happens: in the owner-talk log, in their words ── */
if (typeof ownerModal === 'function' && !ownerModal._sg) { const _f = ownerModal; ownerModal = function (id) { _f(id); try { const a = document.querySelector('#modal-bg .actions'); if (a && !document.getElementById('ow-need')) a.insertAdjacentHTML('beforebegin', `<div class="field sg-dem"><label>Demand evidence · only what they actually said</label><input id="ow-need" placeholder="Concrete need: role, shift, town (their words). Leave empty if none."><label class="sg-ck"><input type="checkbox" id="ow-prof"> They agreed to receive suitable caregiver profiles</label><div class="xs muted">A stated need plus this agreement is what counts as demand. A friendly call does not.</div></div>`); const h = document.querySelector('#modal-bg .hint'); if (h) h.textContent = 'A discovery conversation: their staffing needs, hiring frustrations, towns, requirements, whether they would work with you. Write their exact words.'; } catch (e) { } }; ownerModal._sg = 1; }
if (typeof saveOwner === 'function' && !saveOwner._sg) { const _f = saveOwner; saveOwner = function (id) { let need = '', prof = false; try { need = (document.getElementById('ow-need') || {}).value || ''; prof = !!(document.getElementById('ow-prof') || {}).checked; } catch (e) { } const r = _f(id); try { need = need.trim(); if (need || prof) { const x = Q.items[id], l = x.log[x.log.length - 1]; if (l && /^OWNER TALK/.test(l.r || '')) { l.demand = { need, profiles: prof }; x._u = now(); qSave(); render(); } } } catch (e) { } return r; }; saveOwner._sg = 1; }

/* ── You: school and body each get one outcome measure, one weekly commitment and their evidence. No score, no levels. ── */
function sgYou() {
  const d = new Date(), m = monday(d), bacC = S.counters.items.find((c) => c.id === 'bac'), bacT = bacC ? bacC.targets.reduce((a, b) => a + (Number(b) || 0), 0) : 0, bacW = counterWeek('bac', d);
  let tests = [], errs = []; try { tests = lfTests(); errs = lfErrs(); } catch (e) { }
  const lt = tests[tests.length - 1], prev = lt ? tests.filter((t) => t.subj === lt.subj && t !== lt).slice(-1)[0] : null, delta = lt && prev ? Number(lt.score) - Number(prev.score) : null;
  const fixed = errs.filter((e) => (e.lvl || 0) >= 2).length, due = errs.filter((e) => e.due && e.due <= dk(d)).length;
  /* body: consistency over four weeks, strength from the heaviest logged set of each lift then and now, weight from the scale */
  let wk4 = 0, tr = 0; for (let i = 0; i < 28; i++) { const o = S.days[dk(addDays(d, -i))]; if (o && dayTrained(o)) { wk4++; if (dk(addDays(d, -i)) >= dk(m)) tr++; } }
  const W = weightEntries(), lw = W[W.length - 1], old = lw ? (W.filter((x) => x.k <= dk(addDays(pd(lw.k), -21))).slice(-1)[0] || W[0]) : null, rate = lw && old && old.k !== lw.k ? (lw.w - old.w) / Math.max(1, (new Date(lw.k) - new Date(old.k)) / 864e5) * 7 : null;
  const best = {}; Object.keys(S.days).sort().forEach((k) => sessionsRO(S.days[k]).forEach((wo) => { if (!wo || !wo.sets || !wo.done) return; let EX = []; try { EX = sessionEx(wo); } catch (e) { } EX.forEach((e, ei) => (wo.sets[ei] || []).forEach((s2) => { const w = Number(s2.w) || 0, r = parseInt(s2.r) || 0; if (!r || !(s2.done || w)) return; const v = w ? w * (1 + r / 30) : r, b = (best[e.n] = best[e.n] || { first: null, last: null, n: 0 }); if (!b.first || k < b.firstK) { if (!b.first) { b.first = v; b.firstK = k; } } if (!b.lastK || k >= b.lastK) { b.last = k === b.lastK ? Math.max(b.last, v) : v; b.lastK = k; } b.days = b.days || new Set(); b.days.add(k); })); }));
  const lifts = Object.entries(best).filter(([n, b]) => b.days && b.days.size >= 2 && b.first), up = lifts.filter(([n, b]) => b.last > b.first * 1.01).length, top = lifts.sort((a, b) => b[1].days.size - a[1].days.size)[0];
  const bar = (a, b) => `<i><u style="width:${b ? Math.min(100, a / b * 100) : 0}%"></u></i>`, none = (t) => `<b class="sg-none">${t}</b>`;
  return `<div class="card sg-you"><div class="card-h"><div class="card-t">School and body · what the evidence says</div><div class="card-r">week of ${fmtShort(m)}</div></div>
    <div class="sg-y"><div class="sg-yh"><b>School</b><span>Outcome: pass the BAC</span></div>
      <div class="sg-yr"><span>Readiness</span>${lt ? `<b>${esc(String(lt.score))}</b>` : none('no mock yet')}<em>${lt ? `latest mock · ${esc(lt.subj || '')} · ${fmtShort(pd(lt.date))}${delta != null ? ` · ${delta >= 0 ? '+' : ''}${fmt(delta, 1)} vs the one before` : ' · one more mock shows the direction'}` : 'study minutes do not show readiness; a timed mock does'}</em></div>
      <div class="sg-yr"><span>Learning</span>${errs.length ? `<b>${fixed} of ${errs.length} fixed</b>` : none('no mistakes logged')}<em>${errs.length ? `mistakes answered right twice in review${due ? ` · ${due} due now` : ''}` : 'log each mistake from a mock with its fix'}</em></div>
      <div class="sg-yr"><span>Time</span><b>${bacW} / ${bacT} min</b><em>this week · input, not progress</em>${bar(bacW, bacT)}</div></div>
    <div class="sg-y"><div class="sg-yh"><b>Body</b><span>Outcome: ${esc(String((Object.values(S.goals || {}).find((g) => g && !g._del && /kg/i.test((g.unit || '') + (g.title || ''))) || {}).target || 85))} kg, playing your best tennis</span></div>
      <div class="sg-yr"><span>Weight</span>${lw ? `<b>${fmt(lw.w, 1)} kg</b>` : none('not weighed')}<em>${rate != null ? `${rate >= 0 ? '+' : ''}${fmt(rate, 2)} kg a week over ${Math.round((new Date(lw.k) - new Date(old.k)) / 864e5)} days` : lw ? 'a second weigh-in 3 weeks apart gives the trend' : 'the scale is the measure'}</em></div>
      <div class="sg-yr"><span>Strength</span>${lifts.length ? `<b>${up} of ${lifts.length} lifts up</b>` : none('not enough logged sets')}<em>${lifts.length ? `first logged session vs latest${top ? ` · most trained: ${esc(top[0])}` : ''}` : 'needs the same lift logged with weight and reps on two days'}</em></div>
      <div class="sg-yr"><span>Consistency</span><b>${wk4} / 24 sessions</b><em>finished in the last 4 weeks · ${tr} this week</em>${bar(wk4, 24)}</div></div>
    <div class="xs muted" style="margin-top:10px">Time and sessions are effort. Mock results, corrected mistakes, the scale and the bar are the evidence.</div></div>`;
}
if (typeof lfScoreTab === 'function' && !lfScoreTab._sg) { const _f = lfScoreTab; lfScoreTab = function () { let c = ''; try { c = sgYou(); } catch (e) { } return c + _f(); }; lfScoreTab._sg = 1; }
