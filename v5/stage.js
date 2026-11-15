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
  const logs = items.flatMap((x) => (x.log || []).map((l) => ({ x, l })));
  const attempts = Math.max(counterTotal('dials'), logs.filter((e) => !e.l.d || e.l.d.dials).length);
  const answered = logs.filter((e) => /^(gatekeeper|owner talk)/i.test(e.l.r || '')).length;
  const dm = Math.max(counterTotal('owners'), logs.filter((e) => e.l.d && e.l.d.owners).length);
  const dem = logs.filter((e) => e.l.demand), ag = (f) => new Set(dem.filter(f).map((e) => e.x.id)).size;
  const needs = ag((e) => (e.l.demand.need || '').trim()), requests = ag((e) => e.l.demand.profiles), demand = ag((e) => (e.l.demand.need || '').trim() && e.l.demand.profiles);
  const working = items.reduce((a, x) => a + (x.placements || []).length, 0);
  const paid = items.filter((x) => ((x.client || {}).invoices || []).some((v) => v.paid || v.status === 'paid')).length;
  let bench = 0, benchOk = 0; try { const B_ = bItems().filter((c) => ['hot', 'screened'].includes(c.status)); bench = B_.length; benchOk = B_.filter((c) => c.consent).length; } catch (e) { }
  let cb = 0; try { cb = items.filter((x) => x.status === 'callback').length; } catch (e) { }
  return { attempts, answered, dm, needs, requests, demand, working, paid, bench, benchOk, cb };
}
const SG_LADDER = [
  { id: 'contact', name: 'First decision-maker conversation', why: 'Discovery. Nothing about their staffing problem is known until one owner has described it.', val: (e) => e.dm, need: 1, unit: 'owner conversation' },
  { id: 'learn', name: 'Ten decision-maker conversations', why: 'Ten show which need repeats: shifts, towns, requirements, and whether they would work with you.', val: (e) => e.dm, need: 10, unit: 'owner conversations' },
  { id: 'demand', name: 'First concrete demand', why: 'An owner names a staffing requirement and agrees to receive suitable profiles. A pleasant call does not count.', val: (e) => e.demand, need: 1, unit: 'agency with a stated need + profile request' },
  { id: 'match', name: 'First caregiver working a shift', why: 'Supply matched to a real requirement, with the caregiver\'s consent.', val: (e) => e.working, need: 1, unit: 'caregiver working' },
  { id: 'paid', name: 'First payment received', why: 'The only proof that someone wants to buy this.', val: (e) => e.paid, need: 1, unit: 'paid invoice' }];
function sgState() {
  const e = sgEvidence(); let i = SG_LADDER.findIndex((s) => s.val(e) < s.need); const done = i < 0; if (done) i = SG_LADDER.length - 1; const s = SG_LADDER[i];
  const rooms = [
    { v: 'crm', label: 'Pipeline', open: e.dm >= 1 || e.cb > 0, need: 'your first decision-maker conversation or scheduled callback', have: `${e.dm} conversations, ${e.cb} callbacks`, why: 'A pipeline with nothing in it is a place to rearrange instead of dial.' },
    { v: 'intel', label: 'Intel', open: e.attempts >= 300, need: '300 call attempts', have: `${e.attempts} of 300`, why: 'Below 300 attempts every rate on that screen is noise, and reading noise feels like work.' }];
  return { e, f: e, i, s, done, n: SG_LADDER.length, cur: s.val(e), rooms, all: !!(S.settings && S.settings.stageAll) };
}
function sgApply() { try { const H = SH_HUBS.find((h) => h.id === 'work'), st = sgState(), segs = [['dial', 'Dial']]; st.rooms.forEach((r) => { if (r.open || st.all) segs.push([r.v, r.label]); }); segs.push(['book', 'Playbook']); if (!st.all && st.rooms.some((r) => !r.open)) segs.push(['later', 'Later']); H.segs = segs; } catch (e) { } }
function sgSheet() {
  const st = sgState(), e = st.e, row = (l, v, h) => `<div><span>${l}</span><b>${v}</b><em>${h}</em></div>`;
  openModal(`<h2>Stage ${st.i + 1} of ${st.n}</h2><div class="sg-now"><b>${esc(st.s.name)}</b><span>${st.cur} of ${st.s.need} · ${esc(st.s.why)}</span></div>
    <div class="sg-lad">${SG_LADDER.map((s, i) => `<div class="${i < st.i || st.done ? 'done' : i === st.i ? 'cur' : ''}"><i>${i + 1}</i><span>${esc(s.name)}</span><em>${i < st.i || st.done ? 'done' : i === st.i ? `${st.cur}/${s.need}` : ''}</em></div>`).join('')}</div>
    <div class="bf-h" style="margin-top:18px">Evidence in your log</div>
    <div class="sg-ev">${row('Call attempts', e.attempts, 'every dial')}${row('Answered', e.answered, 'a person picked up')}${row('Decision-maker conversations', e.dm, 'owner or the person who hires')}${row('Stated staffing requirements', e.needs, 'a concrete need, in their words')}${row('Requests for profiles', e.requests, 'agreed to receive suitable caregivers')}${row('Caregivers working', e.working, 'a placement with a shift')}${row('Payments received', e.paid, 'an invoice marked paid')}</div>
    <div class="bf-h" style="margin-top:18px">Supply, built in parallel</div>
    <div class="sg-ev">${row('Screened caregivers', e.bench, 'on the bench')}${row('With consent to share', e.benchOk, 'only these can be sent to an agency')}</div>
    <div class="xs muted" style="margin-top:8px">Not a gate. Screen against real criteria and get consent before sharing; source for an agency's actual requirement once it exists.</div>
    <div class="bf-h" style="margin-top:18px">Always open</div><div class="xs muted">Dial (owners) · Caregivers (add, call, screen, the bench) · Playbook.</div>
    <div class="bf-h" style="margin-top:14px">Waiting for evidence</div>
    ${st.rooms.filter((r) => !r.open).map((r) => `<div class="sg-room"><div><b>${r.label}</b><span>Opens at ${esc(r.need)} · now ${esc(r.have)}. ${esc(r.why)}</span></div><button onclick="closeModal();shRawGo('${r.v}')">Open anyway</button></div>`).join('') || '<div class="xs muted">Everything is open.</div>'}
    <div class="row" style="gap:8px;margin-top:16px"><button class="btn primary grow" onclick="closeModal();show('dial')">Back to the dialer</button><button class="btn" onclick="S.settings.stageAll=${st.all ? 'false' : 'true'};touch(S.settings);save();closeModal();render();toast('${st.all ? 'Stages on' : 'Everything shown'}')">${st.all ? 'Use stages' : 'Show everything'}</button></div>
    <div class="xs muted" style="margin-top:10px">Every number above is counted from logged calls, placements and invoices. Nothing is typed in by hand, deleted or hidden for good.</div>`, true);
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
  const d = new Date(), m = monday(d), wk = (id) => counterWeek(id, d), bacC = S.counters.items.find((c) => c.id === 'bac'), bacT = bacC ? bacC.targets.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  let tests = []; try { tests = lfTests(); } catch (e) { } const lt = tests[tests.length - 1];
  let tr = 0, wi = 0; for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(m, i))]; if (!o) continue; if (dayTrained(o)) tr++; if (o.weight != null && o.weight !== '') wi++; }
  const W = weightEntries(), lw = W[W.length - 1], old = W.filter((x) => lw && x.k <= dk(addDays(pd(lw.k), -21)))[0] || W[0], rate = lw && old && old.k !== lw.k ? (lw.w - old.w) / Math.max(1, (new Date(lw.k) - new Date(old.k)) / 864e5) * 7 : null;
  const bar = (a, b) => `<i><u style="width:${b ? Math.min(100, a / b * 100) : 0}%"></u></i>`;
  return `<div class="card sg-you"><div class="card-h"><div class="card-t">This week · school and body</div><div class="card-r">week of ${fmtShort(m)}</div></div>
    <div class="sg-y"><div class="sg-yh"><b>School</b><span>Outcome: pass the BAC</span></div>
      <div class="sg-yr"><span>Latest mock</span><b>${lt ? esc(String(lt.score)) : 'none logged'}</b><em>${lt ? esc((lt.subj || '') + ' · ' + fmtShort(pd(lt.date))) : 'log one to have a measure'}</em></div>
      <div class="sg-yr"><span>Commitment</span><b>${wk('bac')} / ${bacT} min</b><em>study minutes this week</em>${bar(wk('bac'), bacT)}</div>
      <div class="sg-yr"><span>Evidence</span><b>${tests.length} mock test${tests.length === 1 ? '' : 's'}</b><em>logged in total</em></div></div>
    <div class="sg-y"><div class="sg-yh"><b>Body</b><span>Outcome: ${esc(String((Object.values(S.goals || {}).find((g) => g && !g._del && /kg/i.test((g.unit || '') + (g.title || ''))) || {}).target || 85))} kg, playing your best tennis</span></div>
      <div class="sg-yr"><span>Weight</span><b>${lw ? fmt(lw.w, 1) + ' kg' : 'not weighed'}</b><em>${rate != null ? (rate >= 0 ? '+' : '') + fmt(rate, 2) + ' kg a week, last 3 weeks' : lw ? 'needs a second weigh-in for a trend' : 'weigh in to have a measure'}</em></div>
      <div class="sg-yr"><span>Commitment</span><b>${tr} / 6 sessions</b><em>finished this week</em>${bar(tr, 6)}</div>
      <div class="sg-yr"><span>Evidence</span><b>${wi} weigh-in${wi === 1 ? '' : 's'}</b><em>this week</em></div></div></div>`;
}
if (typeof lfScoreTab === 'function' && !lfScoreTab._sg) { const _f = lfScoreTab; lfScoreTab = function () { let c = ''; try { c = sgYou(); } catch (e) { } return c + _f(); }; lfScoreTab._sg = 1; }
