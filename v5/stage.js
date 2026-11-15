/* War Room 13.0 · STAGES — the app is as big as the business is real.
   The product verdict: the system had grown ahead of the operator. Pipeline, intelligence, cases and economics were all on
   screen while the evidence said "0 owner conversations". A tool for a later stage is a place to hide from this one.
   So Work shows only what the current stage needs. The rest is not deleted: it waits under "Later" with the exact evidence
   that opens it, and can always be opened by hand. Stages come from the log only. */
'use strict';
const SG_LADDER = [
  { id: 'contact', name: 'First owner conversation', why: 'Nothing about the offer is known until an owner has heard it.', val: (f) => f.owners, need: 1, unit: 'owner talk' },
  { id: 'signal', name: 'Ten owner conversations', why: 'Ten conversations show which objection is real and whether the hook works.', val: (f) => f.owners, need: 10, unit: 'owner talks' },
  { id: 'interest', name: 'First owner who wants it', why: 'One real yes proves the offer can be bought.', val: (f) => f.interested + f.cases, need: 1, unit: 'interested owner' },
  { id: 'client', name: 'First paying client', why: 'Revenue is the only proof that counts.', val: (f) => f.clients, need: 1, unit: 'paying client' },
  { id: 'scale', name: '$20k a month', why: 'The mission.', val: (f) => f.clients, need: 11, unit: 'clients' }];
function sgState() {
  let f; try { f = funnelCounts(); } catch (e) { f = { dials: 0, owners: 0, interested: 0, cases: 0, clients: 0 }; }
  let i = SG_LADDER.findIndex((s) => s.val(f) < s.need); if (i < 0) i = SG_LADDER.length - 1; const s = SG_LADDER[i];
  let cb = 0; try { cb = qItems().filter((x) => x.status === 'callback').length; } catch (e) { }
  const rooms = [
    { v: 'crm', label: 'Pipeline', open: f.owners >= 1 || cb > 0 || f.interested > 0, need: 'your first owner conversation or scheduled callback', have: `${f.owners} owner talks, ${cb} callbacks`, why: 'A pipeline with nothing in it is a place to rearrange instead of dial.' },
    { v: 'intel', label: 'Intel', open: f.dials >= 300, need: '300 dials', have: `${f.dials} of 300`, why: 'Below 300 dials every rate on that screen is noise, and reading noise feels like work.' }];
  return { f, i, s, n: SG_LADDER.length, cur: s.val(f), rooms, all: !!(S.settings && S.settings.stageAll) };
}
function sgApply() { try { const H = SH_HUBS.find((h) => h.id === 'work'), st = sgState(), segs = [['dial', 'Dial']]; st.rooms.forEach((r) => { if (r.open || st.all) segs.push([r.v, r.label]); }); segs.push(['book', 'Playbook']); if (!st.all && st.rooms.some((r) => !r.open)) segs.push(['later', 'Later']); H.segs = segs; } catch (e) { } }
function sgSheet() {
  const st = sgState();
  openModal(`<h2>Stage ${st.i + 1} of ${st.n}</h2><div class="sg-now"><b>${esc(st.s.name)}</b><span>${st.cur} of ${st.s.need} · ${esc(st.s.why)}</span></div>
    <div class="sg-lad">${SG_LADDER.map((s, i) => `<div class="${i < st.i ? 'done' : i === st.i ? 'cur' : ''}"><i>${i + 1}</i><span>${esc(s.name)}</span><em>${i < st.i ? 'done' : i === st.i ? `${st.cur}/${s.need}` : ''}</em></div>`).join('')}</div>
    <div class="bf-h" style="margin-top:18px">Waiting for evidence</div>
    ${st.rooms.filter((r) => !r.open).map((r) => `<div class="sg-room"><div><b>${r.label}</b><span>Opens at ${esc(r.need)} · now ${esc(r.have)}. ${esc(r.why)}</span></div><button onclick="closeModal();shRawGo('${r.v}')">Open anyway</button></div>`).join('') || '<div class="xs muted">Everything is open.</div>'}
    <div class="row" style="gap:8px;margin-top:16px"><button class="btn primary grow" onclick="closeModal();show('dial')">Back to the dialer</button><button class="btn" onclick="S.settings.stageAll=${st.all ? 'false' : 'true'};touch(S.settings);save();closeModal();render();toast('${st.all ? 'Stages on' : 'Everything shown'}')">${st.all ? 'Use stages' : 'Show everything'}</button></div>
    <div class="xs muted" style="margin-top:10px">Stages are read from your call log. Nothing is deleted or hidden for good.</div>`);
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
      const line = `<button class="sg-chain" onclick="sgSheet()"><span><b>${done}/${tg || 0}</b> dials today</span><i>→</i><span><b>${wk}${wt ? '/' + wt : ''}</b> this week</span><i>→</i><span><b>${st.cur}/${st.s.need}</b> ${esc(st.s.unit)}${st.s.need > 1 && !/s$/.test(st.s.unit) ? 's' : ''}</span><i>→</i><span>${esc(String(S.settings.bigGoal || '$20k MRR'))}</span></button>`;
      const k = h.indexOf('<button class="bf-strip'); const j = k > 0 ? k : h.indexOf('<div class="arc-line">'); if (j > 0) h = h.slice(0, j) + line + h.slice(j); } catch (e) { } return h; }; arcHtml._sg = 1; }
  sgApply(); try { renderNav(); if (typeof arcRender === 'function' && document.querySelector('#arc.on')) arcRender(); } catch (e) { }
})();
