/* 13.29 · The right knowledge at the right time.
   NOW  = solves a present problem or blocks the current business stage.   NEXT = needed for the next milestone or a foundation for it.
   LATER = everything else, kept but not pushed.
   This file (a) classifies every capability and resource into those three, (b) writes research jobs from real needs
   (a weak capability, a bottleneck with no good resource, a procedure with no lesson, a falling number), and (c) keeps a small
   synced snapshot of your direction (S.settings.rsnap) that the cloud scan reads before it searches.
   Honest limit: the app cannot search the internet. A Claude scheduled task does, every Monday. (A daily run for urgent jobs was prepared
   but the change to the schedule was not authorised from the build session.) The app decides daily from what is already in the library. */
function rsStageIdx() { let i = 0; try { const s = typeof sgState === 'function' ? sgState() : null; if (s) i = s.i; const f = stFunnel(28, 0); if (f.d < 100) i = 0; else if (f.o < 5) i = Math.min(i, 1); } catch (e) { } return Math.max(0, Math.min(ST_STAGE_CAPS.length - 1, i)); }
function rsHorizonCaps() {
  const i = rsStageIdx(), now = new Set(ST_STAGE_CAPS[i]), next = new Set(ST_STAGE_CAPS[Math.min(ST_STAGE_CAPS.length - 1, i + 1)]);
  try { cmWeak().slice(0, 4).forEach((w) => now.add(w.c.id)); } catch (e) { }
  try { const ssn = typeof mcSeason === 'function' ? mcSeason() : null, lens = typeof mcLens === 'function' ? mcLens() : ''; if ((lens || (ssn && ssn.dom)) === 'bac') ['l-howto', 'l-recall', 'l-deep'].forEach((c) => now.add(c)); else ['l-recall', 'l-howto'].forEach((c) => next.add(c)); } catch (e) { }
  ['p-recover', 'r-start', 'r-focus'].forEach((c) => next.add(c)); try { const e = typeof enStats === 'function' ? enStats(14) : null; if (e && e.n >= 6 && e.avg < 2.6) now.add('p-recover'); } catch (e) { }
  now.forEach((c) => next.delete(c)); return { now: Array.from(now).filter((c) => cmCap(c)), next: Array.from(next).filter((c) => cmCap(c)), stage: i };
}
function rsHorizon(x) { const H = rsHorizonCaps(), caps = x.caps || []; return caps.some((c) => H.now.includes(c)) ? 'now' : caps.some((c) => H.next.includes(c)) ? 'next' : 'later'; }
const RS_H = { now: ['Now', 'Solves a present problem or the current business stage'], next: ['Next', 'Needed for the next milestone'], later: ['Later', 'Kept for when it becomes useful'] };
/* learning debt: finished resources whose idea was never used. Above three, the right recommendation is to stop and apply. */
function rsUnapplied() { try { return ccAll().filter((x) => x.u.st === 'done' && x.u.ins && !x.u.impl && !x.man && !x.exp && !x.task); } catch (e) { return []; } }
function rsApplyFirst() { const L = rsUnapplied(); return L.length >= 3 ? L : null; }
/* research jobs from real needs. At most three automatic jobs are open at a time. */
function rsNeeds() {
  const out = [], A = (() => { try { return ccAll().filter(ccOpenable); } catch (e) { return []; } })(), H = rsHorizonCaps(), has = (cap) => A.filter((x) => (x.caps || []).includes(cap) && (x.yt || x.mp3 || x.fmt === 'watch' || x.fmt === 'listen') && !x.clip).length;
  try { cmWeak().slice(0, 2).forEach((w) => out.push({ key: 'weak:' + w.c.id, cap: w.c.id, urgent: 1, q: `Best practical instruction for "${w.c.n}": I fell short ${w.p.fails} time${w.p.fails === 1 ? '' : 's'} on real attempts. Standard: ${w.c.beh}`, why: 'Repeated real-world misses on this capability.' })); } catch (e) { }
  try { (typeof stSignals === 'function' ? stSignals() : []).filter((s) => s.k === 'kpi').forEach((s) => out.push({ key: 'kpi:answer', cap: 'b-cold', urgent: 1, q: 'Cold calls to owners of small private-pay home care agencies: answer rate fell. Find practical, recent instruction on call timing, caller-ID and spam flags, and first-sentence design for outbound to small business owners.', why: s.t })); } catch (e) { }
  H.now.forEach((c) => { const cap = cmCap(c); if (cap && has(c) < 2) out.push({ key: 'thin:' + c, cap: c, urgent: 0, q: `One or two excellent practical videos or demonstrations for "${cap.n}" as it applies to recruiting caregivers for, or selling to, private-pay home care agencies. Standard to reach: ${cap.beh}`, why: 'Needed at the current business stage and the library has fewer than two video or audio resources for it.' }); });
  try { cmGaps().slice(0, 5).forEach((g) => { if (H.now.includes(g.id) || H.next.includes(g.id)) out.push({ key: 'gap:' + g.id, cap: g.id, urgent: 0, q: `"${g.n}" has no lesson at all. Find a primary or official source that teaches it properly. ${g.nx || ''}`, why: 'A capability on the map with no lesson.' }); }); } catch (e) { }
  try { osSteps().filter((s) => s.when === 'now' && !s.cards.some((c) => XC.byId[c] && (XC.byId[c].clip || []).length)).forEach((s) => out.push({ key: 'os:' + s.id, cap: '', urgent: 0, q: `Practical demonstration for the business step "${s.n}" in a small recruiting or outbound sales company.`, why: 'A procedure needed now with no video lesson behind it.' })); } catch (e) { }
  try { const m = typeof XC !== 'undefined' && XC ? XC.cards.filter((c) => !(c.clip || []).length) : []; m.slice(0, 2).forEach((c) => out.push({ key: 'novid:' + c.id, cap: '', card: c.id, urgent: 0, q: `A verified video for the lesson "${c.t}" (${c.who || ''}).`, why: 'A lesson without a video.' })); } catch (e) { }
  return out;
}
function rsAutoJobs() {
  if (!S || !S.settings || !(typeof KPL !== 'undefined' && KPL) || !(typeof XC !== 'undefined' && XC && XC.byId)) return 0; if (ccCfg().freq === 'off') return 0;
  S.research = S.research || {}; const all = Object.values(S.research).filter((r) => r && !r._del), openAuto = all.filter((r) => r.auto && r.st === 'open'), seen = new Set(all.filter((r) => r.key && (r.st === 'open' || now() - (r.at || 0) < 30 * 864e5)).map((r) => r.key)); let n = 0;
  rsNeeds().sort((a, b) => b.urgent - a.urgent).forEach((d) => { if (openAuto.length + n >= 3 || seen.has(d.key)) return; const id = 'rq' + uid() + n; S.research[id] = { id, _u: now(), at: now(), q: d.q.slice(0, 400), why: d.why.slice(0, 200), cap: d.cap || '', card: d.card || '', key: d.key, auto: 1, urgent: d.urgent ? 1 : 0, st: 'open' }; seen.add(d.key); n++; });
  if (n) save(); return n;
}
/* the picture the cloud scan reads: who, what, where stuck, what next. Facts from records only. */
function rsSnapshot() {
  if (!S || !S.settings || !(typeof XC !== 'undefined' && XC && XC.byId)) return null; const H = rsHorizonCaps(), nm = (c) => (cmCap(c) || {}).n || c, f = (() => { try { return stFunnel(28, 0); } catch (e) { return { d: 0, c: 0, o: 0 }; } })();
  let stage = '', bott = ''; try { const s = sgState(); stage = `${s.i + 1}/${s.n} ${s.s.name} (${s.cur}/${s.s.need})`; } catch (e) { } try { const b = enBottleneck()[0]; if (b) bott = b.name + ': ' + b.line; } catch (e) { }
  const D = (S.settings.direction || {}), ssn = (() => { try { return mcSeason(); } catch (e) { return null; } })();
  const snap = { at: dk(new Date()), becoming: String(D.become || '').slice(0, 200), building: 'Caregiver Bench: caregiver recruiting for private-pay home care agencies in Florida; long-term a major company serving home care (own agencies vs infrastructure: undecided)', season: ssn ? (ssn.kind + ' / ' + (ssn.primary || ssn.dom || '')) : '', stage, bottleneck: bott, last28: `${f.d} dials, ${f.c} answered, ${f.o} owner conversations`, now: H.now.map(nm), next: H.next.map(nm), weak: (() => { try { return cmWeak().slice(0, 4).map((w) => w.c.n); } catch (e) { return []; } })(), gaps: (() => { try { return cmGaps().map((g) => g.n); } catch (e) { return []; } })(), unapplied: rsUnapplied().length, done: (() => { try { return ccAll().filter((x) => x.u.st === 'done').map((x) => x.t).slice(-12); } catch (e) { return []; } })(), disliked: (() => { try { return ccAll().filter((x) => x.u.st === 'arch').map((x) => x.t).slice(-8); } catch (e) { return []; } })(), bac: 'June 2027, humanist: Romanian 8 Jun, History 15 Jun; minimum effective preparation', body: 'lean bulk, tennis, sleep 21:00', minutes: ccCfg().dayMin };
  const old = S.settings.rsnap || {}; if (JSON.stringify(Object.assign({}, old, { at: '' })) !== JSON.stringify(Object.assign({}, snap, { at: '' }))) { S.settings.rsnap = snap; S.settings._u = now(); save(); } return snap;
}
function rsOpen() {
  const H = rsHorizonCaps(), sn = rsSnapshot() || {}, J = Object.values(S.research || {}).filter((r) => r && !r._del).sort((a, b) => (b.at || 0) - (a.at || 0)), ap = rsApplyFirst(), A = (() => { try { return ccAll().filter(ccOpenable).filter((x) => !x.clip); } catch (e) { return []; } })(), F = ccFocus(), top = (h) => A.filter((x) => rsHorizon(x) === h).map((x) => ({ x, s: ccScore(x, F, 'any').s })).sort((a, b) => b.s - a.s).slice(0, 3);
  openModal(`<h2>Right knowledge, right time</h2><div class="hint">Decided from your records: stage ${H.stage + 1}, ${esc(sn.last28 || '')}.</div>
    ${ap ? `<div class="cc-gate"><b>Stop learning. Apply.</b><div>${ap.length} finished resources whose idea you have not used yet.</div>${ap.slice(0, 3).map((x) => `<button class="lnk" onclick="ccDone('${esc(x.id)}')">${esc(x.u.ins.slice(0, 90))} ›</button>`).join('')}</div>` : ''}
    ${['now', 'next', 'later'].map((h) => `<div class="mc-wl"><span>${RS_H[h][0]} · ${RS_H[h][1]}</span>${h === 'later' ? `<div class="xs muted">${A.filter((x) => rsHorizon(x) === 'later').length} resources waiting. Exploration budget ${ccCfg().explore} min a week.</div>` : `<div class="xs">${(h === 'now' ? H.now : H.next).map((c) => `<button class="lnk" style="display:inline;margin-right:10px" onclick="cmCapOpen('${c}')">${esc((cmCap(c) || {}).n || c)}</button>`).join('')}</div>`}</div>${h === 'later' ? '' : top(h).map((r) => ccRow(r.x, ccScore(r.x, F, 'any').why)).join('') || '<div class="xs muted">No resource in the library for this yet: a research job is queued.</div>'}`).join('')}
    <div class="mc-wl"><span>Research jobs (${J.filter((r) => r.st === 'open').length} open)</span><div class="xs muted">Written from real needs. The cloud scan answers them on Monday morning. For an answer today, ask Claude directly.</div></div>${J.slice(0, 8).map((r) => `<div class="cc-rq ${r.st}"><span>${r.urgent ? '⚡ ' : ''}${esc(r.q.slice(0, 150))}<br><em>${esc(r.why || '')}${r.auto ? ' · automatic' : ' · yours'}</em></span><em>${r.st === 'done' ? 'answered' : 'waiting'}</em><button class="lnk" onclick="ccResearchDel('${esc(r.id)}');rsOpen()">×</button></div>`).join('') || '<div class="xs">None.</div>'}
    <div class="actions wrap"><button class="btn" onclick="ccResearchNew()">＋ Ask for research</button><button class="btn" onclick="ccOpen('rec')">Library</button><button class="btn primary" onclick="closeModal()">Close</button></div>`, true);
}
(function w() { if (typeof S !== 'undefined' && S && S.settings) { const run = () => { try { rsAutoJobs(); rsSnapshot(); } catch (e) { } }; setTimeout(run, 6000); setInterval(run, 10 * 60000); } else setTimeout(w, 600); })();
