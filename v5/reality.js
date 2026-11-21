/* War Room 13.26 · reality.js — THE LIFE LAYER: personal reality model, life direction, capacity and resources,
   conflict and stagnation detection, development indicators, the Operator screen (You → Engine → Operator).
   Loop: REALITY → UNDERSTANDING → PRIORITIES → DECISIONS → ACTION → EVIDENCE → LEARNING → ADAPTATION.
   Rules:
   · mission.js mcBuild() stays the one recommender. lxAugment() only adds facts, risks and an execution nudge to it.
   · Every personal fact carries a status (confirmed · user-reported · historical · estimated · assumption · unknown ·
     needs verification) and a date. An assumption is never shown as a fact.
   · Patterns come from records (focus contracts, skips, call log), with the sample size. No labels, no diagnoses.
   · Weekly replanning changes only one-off day overrides (day.sched), after confirmation, and can be undone.
     The calendar and the weekly schedule are never written.
   Data: S.reality (map of facts), S.settings.direction, S.settings.season (mission.js), S.journal (journal.js). */
'use strict';

const RL_ST = { confirmed: ['Confirmed', 'ok'], user: ['User-reported', 'acc'], hist: ['Historical', 'muted'], est: ['Estimated', 'warn'], assume: ['Assumption', 'warn'], unknown: ['Unknown', 'bad'], verify: ['Needs verification', 'bad'] };
const RL_AREA = { who: 'Circumstances', con: 'Constraints', opp: 'Opportunities', dl: 'Deadlines & transitions' };
const RL_CTYPE = { fixed: 'Fixed commitment', hours: 'Available hours', energy: 'Energy', money: 'Money', deadline: 'Deadline', dep: 'Dependency', legal: 'Legal / age', geo: 'Geography / time zone', recovery: 'Recovery' };

function rlFacts() { return Object.values(S.reality || {}).filter((x) => x && !x._del); }
function rlSeed() {
  S.migrations = S.migrations || {}; if (S.migrations.m1326r) return; S.reality = S.reality || {};
  const t = now(), at = '2026-11-19', F = (area, txt, st, src, ctype) => { const id = 'rf' + uid(); S.reality[id] = { id, _u: t, area, t: txt, st, src, ctype: ctype || '', at }; };
  if (!rlFacts().length) {
    F('who', 'Final school year in Moldova; the national BAC is in June 2027.', 'user', 'execution brief, 19 Nov 2026');
    F('who', 'Age 17. Some contracts, bank and investment products may need a parent or be unavailable: check Moldovan rules before acting.', 'user', 'expansion brief, 19 Nov 2026', 'legal');
    F('who', 'Lives in Chisinau (Europe/Chisinau time).', 'user', 'profile');
    F('who', 'Business: Caregiver Bench. Cold-calls private-pay home care agency owners in Florida; recruits and places caregivers.', 'user', 'Hormozi brief, 19 Nov 2026');
    F('who', 'Territory: Tampa Bay first (decided 17 Nov 2026; 813 number; ~875 agencies in the queue). Collier + Lee (Naples, Fort Myers) are the second wave after 3 paying agencies. Re-check after 300 dials.', 'confirmed', 'decision 17 Nov, re-checked 19 Nov');
    F('who', 'Earns money coaching tennis groups.', 'user', 'profile');
    F('con', 'Owners can only be reached 09:00–17:00 Florida time, Monday to Friday (16:00–24:00 Chisinau in winter).', 'confirmed', 'computed from time zones', 'geo');
    F('con', 'School on weekdays; tennis groups and team training are fixed commitments.', 'user', 'calendar', 'fixed');
    F('con', 'Bed 21:00, wake 05:20 (Settings). Sleep is never cut.', 'user', 'Settings', 'recovery');
    F('dl', 'Goals to 1 July 2027: $20k MRR, BAC passed, 85 kg body weight.', 'user', 'goals');
    F('dl', 'Planned move out of Chisinau around July 2027.', 'user', 'profile');
    F('dl', 'BAC 2027 timetable is set by MEC Order 2051 of 8 Oct 2026 (on ance.gov.md; the PDF is a scan, not yet read). A private guide reads it as 2–18 June. Confirm in the PDF.', 'verify', 'ance.gov.md, checked 19 Nov 2026');
  }
  S.migrations.m1326r = t; save();
}
function rlOpen(area) {
  rlSeed(); const A = area || 'who', L = rlFacts().filter((x) => x.area === A).sort((a, b) => (a.st === 'verify' ? -1 : 0) - (b.st === 'verify' ? -1 : 0));
  openModal(`<h2>Personal reality</h2><div class="hint">The context every recommendation uses. Each fact has a status: an assumption is never treated as a fact.</div>
    <div class="chips">${Object.keys(RL_AREA).map((k) => `<button class="chip ${k === A ? 'on' : ''}" onclick="rlOpen('${k}')">${RL_AREA[k]}</button>`).join('')}<button class="chip" onclick="rlPatternsOpen()">Patterns</button></div>
    ${L.map((x) => `<button class="rl-f" onclick="rlEdit('${x.id}')"><b>${esc(x.t)}</b><span><i class="${RL_ST[x.st] ? RL_ST[x.st][1] : ''}">${RL_ST[x.st] ? RL_ST[x.st][0] : x.st}</i>${x.ctype ? ' · ' + esc(RL_CTYPE[x.ctype] || x.ctype) : ''} · ${esc(x.at || '')}${x.src ? ' · ' + esc(x.src) : ''}</span></button>`).join('') || '<div class="empty">Nothing here yet.</div>'}
    <div class="actions"><button class="btn primary" onclick="rlEdit('','${A}')">Add a fact</button></div>`, true);
}
function rlEdit(id, area) {
  const x = (S.reality || {})[id] || { area: area || 'who', st: 'user', t: '', ctype: '' }, sel = (i, m, v) => `<select class="aq-in" id="${i}">${Object.keys(m).map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${Array.isArray(m[k]) ? m[k][0] : m[k]}</option>`).join('')}</select>`;
  openModal(`<h2>${id ? 'Edit' : 'New'} fact</h2><textarea class="aq-in" id="rl-t" placeholder="The fact, in one sentence">${esc(x.t)}</textarea><label class="xs muted">Area</label>${sel('rl-a', RL_AREA, x.area)}<label class="xs muted">Status</label>${sel('rl-s', RL_ST, x.st)}<label class="xs muted">Constraint type (if a constraint)</label>${sel('rl-c', Object.assign({ '': '—' }, RL_CTYPE), x.ctype || '')}<input class="aq-in" id="rl-src" placeholder="Source (who said it, where it was checked)" value="${esc(x.src || '')}">
    <div class="actions">${id ? `<button class="btn danger" onclick="rlDel('${id}')">Delete</button>` : ''}<button class="btn" onclick="rlOpen('${x.area}')">Cancel</button><button class="btn primary" onclick="rlSave('${id || ''}')">Save</button></div>`, true);
}
function rlSave(id) { const g = (i) => (($(i) || {}).value || '').trim(), t = g('rl-t'); if (!t) { toast('Write the fact'); return; } S.reality = S.reality || {}; const nid = id || 'rf' + uid(), old = S.reality[nid] || {}; S.reality[nid] = Object.assign({}, old, { id: nid, area: g('rl-a'), t, st: g('rl-s'), ctype: g('rl-c'), src: g('rl-src'), at: dk(new Date()), prev: old.t && old.t !== t ? old.t : old.prev, _u: now() }); save(); rlOpen(g('rl-a')); }
function rlDel(id) { const x = (S.reality || {})[id]; if (!x) return; x._del = true; x._u = now(); save(); rlOpen(x.area); }
/* observed operating patterns, from records only, with sample sizes */
function rlPatterns() {
  const P = [], days = [...Array(28)].map((_, i) => addDays(new Date(), -i)), fc = [];
  days.forEach((d) => { const o = S.days[dk(d)]; (o && o.fc || []).forEach((f) => fc.push(Object.assign({ k: dk(d) }, f))); });
  const done = fc.filter((f) => f.t1 && !f.dropped && f.min);
  if (done.length >= 3) { const r = done.reduce((s, f) => s + (f.t1 - f.t0) / 60000 / f.min, 0) / done.length; P.push([`Focus blocks take ${Math.round(r * 100)}% of the planned time on average.`, `${done.length} finished focus contracts, 28 days`, r]); }
  const byH = {}; done.filter((f) => f.ok === 2).forEach((f) => { const h = new Date(f.t0).getHours(); byH[h] = (byH[h] || 0) + 1; }); const bh = Object.entries(byH).sort((a, b) => b[1] - a[1])[0];
  if (bh && bh[1] >= 2) P.push([`Most kept focus contracts started around ${pad(bh[0])}:00.`, `${bh[1]} kept contracts at that hour`]);
  const intr = {}; fc.forEach((f) => (f.intr || []).forEach((x) => { const w = String(x.why || 'unspecified').toLowerCase().slice(0, 40); intr[w] = (intr[w] || 0) + 1; })); const ti = Object.entries(intr).sort((a, b) => b[1] - a[1])[0];
  if (ti && ti[1] >= 2) P.push([`Most common interruption: "${ti[0]}".`, `${ti[1]} times in 28 days`]);
  const sk = {}; days.forEach((d) => { const o = S.days[dk(d)]; (o && o.mcSkip || []).forEach((x) => { if (!x.done) sk[x.s] = (sk[x.s] || 0) + 1; }); }); const ts = Object.entries(sk).sort((a, b) => b[1] - a[1])[0];
  if (ts && ts[1] >= 3) P.push([`Most often skipped or missed: the "${ts[0]}" mission.`, `${ts[1]} times in 28 days`]);
  const trig = (typeof jnTriggerStats === 'function' ? jnTriggerStats(28) : []).slice(0, 1); trig.forEach((t) => P.push([`Most logged trigger: ${t.trig} (most often ${t.when}).`, `${t.n} entries`]));
  try { if (typeof friction === 'function') { const R = friction(14).filter((r) => r.delay != null); if (R.length >= 3) { const a = Math.round(R.reduce((s, r) => s + r.delay, 0) / R.length); P.push([`First dial starts ${a >= 0 ? a + ' min after' : -a + ' min before'} the planned block on average.`, `${R.length} dial days, 14 days`]); } } } catch (e) { }
  return P;
}
function rlPatternsOpen() { const P = rlPatterns(); openModal(`<h2>Operating patterns</h2><div class="hint">Observed from your records, with the sample size. Small samples are not trends. No labels, no diagnoses.</div>${P.length ? P.map((p) => `<div class="mc-wr"><span>${esc(p[0])}</span><em>${esc(p[1])}</em></div>`).join('') : '<div class="empty">Not enough records yet. Patterns appear from focus contracts, skipped missions, interruptions and the trigger log.</div>'}<div class="actions"><button class="btn" onclick="rlOpen()">Back</button></div>`, true); }

/* ── life direction: statements that help decide ── */
const RL_DIR = [['become', 'What I am trying to become'], ['life', 'The life I want to build'], ['caps', 'Capabilities I want to have'], ['resp', 'Responsibilities I carry'], ['vals', 'What I consider important'], ['yes', 'Trade-offs I accept'], ['no', 'Trade-offs I refuse']];
function rlDirOpen() {
  const D = (S.settings || {}).direction || {};
  openModal(`<h2>Life direction</h2><div class="hint">Not slogans: statements you can test a decision against. "Does this choice fit what I refuse to trade?"</div>${RL_DIR.map(([k, l]) => `<label class="xs muted">${l}</label><textarea class="aq-in" id="rd-${k}" rows="2">${esc(D[k] || '')}</textarea>`).join('')}<div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="rlDirSave()">Save</button></div>`, true);
}
function rlDirSave() { const D = {}; RL_DIR.forEach(([k]) => (D[k] = (($('rd-' + k) || {}).value || '').trim())); D.at = dk(new Date()); S.settings.direction = D; S.settings._u = now(); save(); closeModal(); toast('Direction saved'); try { render(); } catch (e) { } }

/* ── capacity and resources: what the next 7 days ask vs what they allow ── */
const RL_FLEX = ['dials', 'bac', 'train', 'program', 'agency', 'learn', 'deep'], RL_FIXED = ['school', 'tennis', 'travel'];
/* a clash = two blocks that each need you fully: commitments and work. Travel with a packed meal is not a clash. */
const RL_CLASH = ['school', 'tennis', 'dials', 'bac', 'train', 'program', 'agency', 'learn', 'deep'];
function rlOverrun() { const fc = []; for (let i = 0; i < 30; i++) { const o = S.days[dk(addDays(new Date(), -i))]; (o && o.fc || []).forEach((f) => { if (f.t1 && !f.dropped && f.min) fc.push((f.t1 - f.t0) / 60000 / f.min); }); } if (fc.length < 3) return { r: 1, n: fc.length }; const r = fc.reduce((a, b) => a + b, 0) / fc.length; return { r: Math.max(0.6, Math.min(2.5, r)), n: fc.length }; }
function rlDay(d) {
  let L = []; try { L = blocksFor(d).filter((b) => b.kind !== 'sleep'); } catch (e) { }
  const wake = tmin(S.settings.wake || '05:20'), bed = tmin(S.settings.bed || '21:00'), win = Math.max(0, bed - wake), isToday = dk(d) === dk(new Date()), from = isToday ? Math.max(wake, nowMin()) : wake;
  const len = (b) => Math.max(0, Math.min(bed, tmin(b.end)) - Math.max(from, tmin(b.start)));
  const fixed = L.filter((b) => RL_FIXED.includes(b.kind)).reduce((s, b) => s + len(b), 0), flex = L.filter((b) => RL_FLEX.includes(b.kind)).reduce((s, b) => s + len(b), 0), other = L.filter((b) => !RL_FIXED.includes(b.kind) && !RL_FLEX.includes(b.kind)).reduce((s, b) => s + len(b), 0);
  const avail = Math.max(0, bed - from), free = Math.max(0, avail - fixed - flex - other);
  const ov = []; const S2 = L.slice().sort((a, b) => tmin(a.start) - tmin(b.start)); for (let i = 0; i < S2.length; i++) for (let j = i + 1; j < S2.length; j++) { if (tmin(S2[j].start) >= tmin(S2[i].end)) break; if (RL_CLASH.includes(S2[i].kind) && RL_CLASH.includes(S2[j].kind)) ov.push([S2[i], S2[j]]); }
  return { d, k: dk(d), L, fixed, flex, other, avail, free, win, ov, over: flex > Math.max(0, avail - fixed - other - 30) };
}
/* recovery: unscheduled waking minutes plus rest-type blocks. A day under 60 minutes, or a week with no 3-hour stretch of it, is flagged. */
const RL_REST = ['rest', 'free', 'meal', 'family', 'walk', 'recovery'];
function rlRecovery(x) { const rest = (x.L || []).filter((b) => RL_REST.includes(b.kind)).reduce((s, b) => s + Math.max(0, tmin(b.end) - tmin(b.start)), 0); return Math.max(0, x.free) + rest; }
function rlRecoveryWeek(W) { const D = W.map((x) => ({ k: x.k, d: x.d, m: rlRecovery(x) })); return { D, low: D.filter((r) => r.m < 60), noLong: !D.some((r) => r.m >= 180) }; }
/* support, skills and equipment: the user's own list, nothing invented */
const RL_RK = { support: 'Support (people)', skill: 'Skill', equip: 'Equipment', other: 'Other' };
function rlRes() { return ((S.settings || {}).resources || []).filter((r) => r && !r._del); }
function rlResAdd() { const t = (($('rl-rt') || {}).value || '').trim(), k = (($('rl-rk') || {}).value || 'other'), n = (($('rl-rn') || {}).value || '').trim(); if (!t) return toast('Name it first'); S.settings.resources = (S.settings.resources || []).concat([{ id: uid(), t: t.slice(0, 80), k: RL_RK[k] ? k : 'other', n: n.slice(0, 160), at: dk(new Date()) }]); S.settings._u = now(); save(); rlCapOpen(); }
function rlResDel(id) { S.settings.resources = (S.settings.resources || []).filter((r) => r.id !== id); S.settings._u = now(); save(); rlCapOpen(); }
function rlWeek(n) { const out = []; for (let i = 0; i < (n || 7); i++) out.push(rlDay(addDays(new Date(), i))); return out; }
function rlCapOpen() {
  const W = rlWeek(7), ovr = rlOverrun(), lbl = (b) => String(b.title || '').replace(/^[^\p{L}\p{N}]+/u, '');
  const money = rlMoney();
  openModal(`<h2>Capacity: next 7 days</h2><div class="hint">Waking hours minus fixed commitments, compared with planned flexible work. A day needs at least 30 minutes of buffer. ${ovr.n >= 3 ? `Your focus blocks take ${Math.round(ovr.r * 100)}% of the planned time (${ovr.n} contracts), so real load is shown with that factor.` : 'Real overrun is unknown until a few focus contracts are finished.'}</div>
    ${W.map((x) => { const real = Math.round(x.flex * ovr.r); return `<div class="rl-day ${x.over ? 'bad' : ''}"><b>${fmtShort(x.d)}</b><span>fixed ${x.fixed} · planned ${x.flex}${ovr.n >= 3 ? ` (≈${real} real)` : ''} · free ${x.free} min</span>${x.ov.length ? `<em>Overlap: ${esc(lbl(x.ov[0][0]))} and ${esc(lbl(x.ov[0][1]))}</em>` : ''}${x.over ? '<em>Plan exceeds the time available</em>' : ''}</div>`; }).join('')}
    <div class="mc-wl"><span>Money (from the Money hub)</span><div>${esc(money)}</div></div>
    ${(() => { const R = rlRecoveryWeek(W); return `<div class="mc-wl" id="rl-rec"><span>Recovery</span><div class="xs">${R.low.length ? `<b>${R.low.length} day${R.low.length > 1 ? 's' : ''} with under an hour of unplanned or rest time:</b> ${R.low.map((r) => esc(fmtShort(r.d))).join(', ')}.` : 'Every day keeps at least an hour of unplanned or rest time.'} ${R.noLong ? '<b>No day this week has three free hours in it.</b> Plan one before adding work.' : ''} Counted from the calendar: unscheduled waking time plus rest, meal, family or walk blocks. It does not know how tired you are.</div></div>`; })()}
    <div class="mc-wl" id="rl-res"><span>Support, skills and equipment</span><div class="xs">Only what you add here. Nothing is guessed.</div>${rlRes().length ? rlRes().map((r) => `<div class="mc-wr"><span><b>${esc(r.t)}</b> · ${esc(RL_RK[r.k] || 'Other')}${r.n ? ` · ${esc(r.n)}` : ''}</span><button class="btn sm" onclick="rlResDel('${r.id}')">Remove</button></div>`).join('') : '<div class="empty">Nothing listed yet. Examples of what belongs here: a person who checks your dial count, a working headset, a quiet room, a skill you can trade.</div>'}
      <div class="row"><input class="aq-in" id="rl-rt" placeholder="Name"><select id="rl-rk">${Object.entries(RL_RK).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><input class="aq-in" id="rl-rn" placeholder="Note (optional)"><button class="btn sm" onclick="rlResAdd()">Add</button></div>
    <div class="actions">${W.some((x) => x.over) ? `<button class="btn primary" onclick="rlReplanWeek()">Propose a fix</button>` : ''}<button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
function rlMoney() {
  try { const m = dk(new Date()).slice(0, 7), T = Object.values(S.txns || {}).filter((x) => x && !x._del && String(x.date || x.d || '').slice(0, 7) === m); if (!T.length) return 'No transactions this month yet.'; let i = 0, o = 0; T.forEach((x) => { const a = typeof mnB === 'function' ? mnB(x.amt != null ? x.amt : (x.amount || x.a), typeof mnAccCur === 'function' ? mnAccCur(x.acc) : 'MDL') : Number(x.amt || x.amount || x.a) || 0; if (x.type === 'in') i += a; else if (x.type === 'out') o += a; }); return `This month: in ${Math.round(i)} · out ${Math.round(o)} ${S.settings.currency || ''} (${T.length} transactions). Earned is not received; see Money for obligations.`; } catch (e) { return 'Not readable.'; }
}
/* Florida calling window in local minutes for a given date (weekdays only) */
function rlFlWindow(d) { try { const noon = new Date(d); noon.setHours(12, 0, 0, 0); const ny = new Date(noon.toLocaleString('en-US', { timeZone: 'America/New_York' })), off = Math.round((noon - ny) / 60000), wd = ny.getDay(); if (wd === 0 || wd === 6) return null; return [9 * 60 + off, 17 * 60 + off]; } catch (e) { return null; } }
function rlGap(dd, dur, kind) {
  const x = rlDay(dd), wake = tmin(S.settings.wake || '05:20'), bed = tmin(S.settings.bed || '21:00'); let lo = wake, hi = bed;
  if (kind === 'dials') { const w = rlFlWindow(dd); if (!w) return null; lo = Math.max(lo, w[0]); hi = Math.min(hi, w[1]); }
  if (dk(dd) === dk(new Date())) lo = Math.max(lo, nowMin() + 15);
  const busy = x.L.map((b) => [tmin(b.start), tmin(b.end)]).sort((a, b) => a[0] - b[0]); let t = lo;
  for (const [s, e] of busy) { if (s - t >= dur + 10 && t + dur <= hi) return t; t = Math.max(t, e); } return hi - t >= dur ? t : null;
}
/* Workflow E: overloaded week → proposal (KEEP / MOVE / REDUCE / DROP) → confirm → day overrides → undo */
let RLP = null;
function rlReplanWeek() {
  const W = rlWeek(7), P = [], spare = {}; W.forEach((x) => (spare[x.k] = x.free - 30));
  W.filter((x) => x.over).forEach((x) => {
    let need = x.flex - Math.max(0, x.avail - x.fixed - x.other - 30);
    x.L.filter((b) => RL_FIXED.includes(b.kind)).forEach((b) => P.push({ k: x.k, b, act: 'keep', why: 'Fixed commitment: never moved.' }));
    const flex = x.L.filter((b) => RL_FLEX.includes(b.kind)).sort((a, b) => tmin(b.start) - tmin(a.start));
    for (const b of flex) {
      if (need <= 0) { P.push({ k: x.k, b, act: 'keep', why: 'Fits once the others are handled.' }); continue; }
      const dur = tmin(b.end) - tmin(b.start), floor = b.kind === 'bac' ? Number(S.settings.minBac) || 25 : b.kind === 'dials' ? 30 : 0;
      const tgt = W.find((y) => y.k > x.k && !y.over && spare[y.k] >= dur && rlGap(y.d, dur, b.kind) != null);
      if (tgt) { const st = rlGap(tgt.d, dur, b.kind); spare[tgt.k] -= dur; need -= dur; P.push({ k: x.k, b, act: 'move', to: tgt.k, st: mcHm(st), why: `${fmtShort(tgt.d)} has ${tgt.free} free minutes${b.kind === 'dials' ? ' inside the Florida window' : ''}.` }); }
      else if (floor && dur > floor) { need -= dur - floor; P.push({ k: x.k, b, act: 'reduce', min: floor, why: `No room elsewhere. Keep the ${floor}-minute floor so the streak and spacing hold.` }); }
      else { need -= dur; P.push({ k: x.k, b, act: 'drop', why: 'No free slot this week. Dropping it is honest; pretending it fits is not.' }); }
    }
  });
  RLP = P; const lbl = (b) => String(b.title || '').replace(/^[^\p{L}\p{N}]+/u, ''), tag = { keep: 'KEEP', move: 'MOVE', reduce: 'REDUCE', drop: 'DROP' };
  if (!P.some((p) => p.act !== 'keep')) { openModal('<h2>No change needed</h2><div class="hint">Every day fits with its buffer.</div>', true); return; }
  openModal(`<h2>Proposed week fix</h2><div class="hint">Nothing changes until you confirm. Only one-off day overrides are written; the calendar and weekly schedule stay as they are. You can undo it.</div>
    ${P.map((p) => `<div class="en-rp ${p.act}"><b>${tag[p.act]}</b><span>${fmtShort(pd(p.k))} ${p.b.start}–${p.b.end} · ${esc(lbl(p.b))}${p.act === 'move' ? ` → ${fmtShort(pd(p.to))} ${p.st}` : p.act === 'reduce' ? ` → ${p.min} min` : ''}</span><em>${esc(p.why)}</em></div>`).join('')}
    <div class="xs muted">Consequence: moved work lands on a lighter day; reduced work keeps only the floor; dropped work is not done this week.</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Decline: keep the plan</button><button class="btn primary" onclick="rlReplanApply()">Apply</button></div>`, true);
}
function rlReplanApply() {
  if (!RLP) return; const prev = {}, touched = new Set();
  const keep = (k) => { if (!(k in prev)) { const o = S.days[k]; prev[k] = o && o.sched ? JSON.parse(JSON.stringify(o.sched)) : null; } };
  RLP.forEach((p) => {
    if (p.act === 'keep') return; const d = pd(p.k); keep(p.k); const sc = dayOnce(d); if (!sc.skip.includes(p.b.id)) sc.skip.push(p.b.id); touched.add(p.k);
    if (p.act === 'move') { keep(p.to); const st = dayOnce(pd(p.to)), dur = tmin(p.b.end) - tmin(p.b.start); st.add.push(Object.assign({}, p.b, { id: 'mv' + uid(), start: p.st, end: mcHm(tmin(p.st) + dur), note: (p.b.note || '') + ' (moved from ' + p.k + ')' })); touched.add(p.to); }
    if (p.act === 'reduce') sc.add.push(Object.assign({}, p.b, { id: 'rd' + uid(), end: mcHm(tmin(p.b.start) + p.min), note: 'Reduced to the floor in the week fix' }));
  });
  touched.forEach((k) => { S.days[k]._u = now(); });
  const id = 'j' + uid(); S.journal = S.journal || {}; S.journal[id] = { id, _u: now(), at: dk(new Date()), kind: 'replan', dom: 'life', text: `Week fix applied: ${RLP.filter((p) => p.act !== 'keep').length} changes`, undo: prev, imp: 1 };
  save(); RLP = null; closeModal(); toast('Week fix applied. Undo from the journal entry.', 'Undo', () => rlReplanUndo(id)); try { render(); } catch (e) { }
}
function rlReplanUndo(id) { const j = (S.journal || {})[id]; if (!j || !j.undo) return; Object.keys(j.undo).forEach((k) => { const o = day(pd(k)); if (j.undo[k]) o.sched = j.undo[k]; else delete o.sched; o._u = now(); }); j.undone = dk(new Date()); delete j.undo; j._u = now(); save(); toast('Week fix undone'); try { render(); } catch (e) { } }

/* ── signals into Mission Control (facts and risks only) ── */
function lxDue() {
  const t = dk(new Date()), D = typeof live === 'function' ? live(S.decisions) : [];
  return { dec: D.filter((x) => x.review && x.review <= t && !x.result && x.kind !== 'pred').length, pred: D.filter((x) => x.kind === 'pred' && x.review && x.review <= t && x.hit == null).length,
    risk: Object.values(S.risks || {}).filter((x) => x && !x._del && x.status !== 'closed' && x.review && x.review <= t).length, man: typeof fmFlagged === 'function' ? fmFlagged().length : 0 };
}
function lxAugment(M, X) {
  /* at most two extra alerts on the card; the rest become facts under Why this (no alert storms) */
  let nAdd = 0; const fact = (t) => M.facts.push({ owner: 'reality.js', t }), add = (t, btn, act) => { if (nAdd++ < 2) M.risks.push(btn ? { t, btn, act } : { t }); else fact(t); };
  /* conflicts */
  try { const T = rlDay(X.d); if (T.ov.length) { const lbl = (b) => String(b.title || '').replace(/^[^\p{L}\p{N}]+/u, ''); add(`Two commitments overlap today: ${lbl(T.ov[0][0])} (${T.ov[0][0].start}) and ${lbl(T.ov[0][1])} (${T.ov[0][1].start}).`); } } catch (e) { }
  try { const W = rlWeek(7).slice(1).filter((x) => x.over); if (W.length) add(`${W.length} of the next 6 days plan more than the time available.`, 'Fix the week', 'rlReplanWeek()'); } catch (e) { }
  /* repeated postponement of the same mission */
  const sk = {}; for (let i = 1; i <= 7; i++) { const o = S.days[dk(addDays(X.d, -i))]; (o && o.mcSkip || []).forEach((x) => { if (!x.done) sk[x.s] = (sk[x.s] || 0) + 1; }); }
  if (M.top && (sk[M.top.sid || M.top.k] || 0) >= 3) add(`Reality check: "${M.top.out}" was skipped or missed on ${sk[M.top.sid || M.top.k]} of the last 7 days. Do the smallest real version now: 10 minutes.`);
  /* protected domain starved */
  try { const ss = M.ssn, bc = (S.counters.items || []).find((x) => x.id === 'bac'); if (ss && /bac|study|exam/i.test((ss.protect || '') + ' ' + (ss.secondary || '')) && bc && dow(X.d) >= 4 && typeof counterWeek === 'function') { const wT = Object.values(bc.targets || {}).reduce((s, v) => s + (Number(v) || 0), 0), wM = counterWeek('bac', X.d); if (wT && wM < wT * 0.4) add(`BAC is protected this season, and this week has ${wM} of ${wT} planned study minutes.`); } } catch (e) { }
  /* training crowding recovery */
  try { let tr = 0, sl = [], n = 0; for (let i = 1; i <= 6; i++) { const o = S.days[dk(addDays(X.d, -i))]; if (!o) continue; n++; if (typeof dayTrained === 'function' && dayTrained(o)) tr++; if (typeof sleepMin === 'function' && sleepMin(o) != null) sl.push(sleepMin(o)); } if (tr >= 6 && sl.length >= 3 && sl.reduce((a, b) => a + b, 0) / sl.length < 7 * 60) add('Trained 6 days running on under 7 hours of sleep on average. Recovery is part of the plan.'); } catch (e) { }
  /* due reviews */
  const du = lxDue(), dn = du.dec + du.pred + du.risk; if (dn) add(`${dn} review${dn > 1 ? 's' : ''} due: ${[du.dec ? du.dec + ' decision' + (du.dec > 1 ? 's' : '') : '', du.pred ? du.pred + ' prediction' + (du.pred > 1 ? 's' : '') : '', du.risk ? du.risk + ' risk' + (du.risk > 1 ? 's' : '') : ''].filter(Boolean).join(', ')}.`, 'Review', 'jlDueOpen()');
  /* campaign behind its time */
  try { (typeof mcCampaigns === 'function' ? mcCampaigns() : []).forEach((c) => { if (!c.deadline) return; const left = daysUntil(c.deadline), pr = campaignProgress(c); if (left != null && left >= 0 && left <= 45 && pr < 50) fact(`Campaign ${c.title}: ${left} days to its deadline, ${pr}% of milestones evidenced.`); }); } catch (e) { }
  /* stagnation */
  try { const S7 = lxStag(); S7.forEach((s) => fact(s)); } catch (e) { }
  /* execution intervention: plenty of system time today, the next action is clear, nothing started */
  try { const o = X.o || {}, E = M.E || { logged: 0 }, work = (E.logged || 0) * 2 + (Number((o.counters || {}).bac) || 0), app = Number(o.appMin) || 0; if (M.top && M.top.go && app >= 20 && work < app && !(o.fc || []).some((f) => !f.dropped && f.t0 > now() - 3 * 3600e3)) M.nudge = M.top.k === 'dial' ? `You have enough information. ${app} minutes in War Room today. Next step: make the calls.` : `You have enough information. ${app} minutes in War Room today. Next step: ${M.top.next || M.top.out}.`; } catch (e) { }
  /* readiness */
  const ex = S.settings.lastExport ? Math.floor((now() - S.settings.lastExport) / 864e5) : null; if (ex == null || ex > 35) fact(ex == null ? 'No offline backup file exported yet (Settings → Export).' : `Last offline backup file: ${ex} days ago.`);
}
function lxStag() {
  const out = [], since = dk(addDays(new Date(), -14));
  let les = 0, use = 0; try { if (typeof BC !== 'undefined' && BC && BC.cardMod) Object.keys(BC.cardMod).forEach((id) => { const l = bcV('l:' + id, null); if (l && l.at >= since) les++; const u = bcV('u:' + id, null); if (u && (u.log || []).some((x) => x.at >= since)) use++; }); } catch (e) { }
  let real = 0; try { if (typeof cmAll === 'function') cmAll().forEach((c) => { real += cmLog(c.id).filter((x) => x.at >= since && x.src !== 'sim').length; }); } catch (e) { }
  if (les >= 5 && !use && !real) out.push(`Learning without application: ${les} new lessons in 14 days and no real use logged. Pick one idea and use it on a real call or situation.`);
  let rec = 0; try { if (typeof BC !== 'undefined' && BC && BC.cardMod) Object.keys(BC.cardMod).forEach((id) => { if ((bcV('rh:' + id, []) || []).some((x) => x >= since)) rec++; }); } catch (e) { }
  if (les >= 5 && !rec) out.push(`Reading without recall: ${les} lessons in 14 days, no recall review. Five minutes of recall protects them.`);
  try { const by = mcDialLog(); const sum = (a, b) => { let d = 0, m = 0; for (let i = a; i < b; i++) { const e = mcDialEvidence(dk(addDays(new Date(), -i)), by); d += e.logged; m += e.dm; } return { d, m }; }; const A = sum(0, 14), B = sum(14, 28); if (A.d >= 60 && B.d >= 60 && A.m / A.d <= B.m / B.d) out.push(`Calling without improving: owner-conversation rate ${Math.round((A.m / A.d) * 1000) / 10}% now vs ${Math.round((B.m / B.d) * 1000) / 10}% the 14 days before (${A.d} and ${B.d} dials). Review one call in an after-action review.`); } catch (e) { }
  let app = 0, work = 0; for (let i = 0; i < 7; i++) { const k = dk(addDays(new Date(), -i)), o = S.days[k]; if (!o) continue; app += Number(o.appMin) || 0; try { work += mcDialEvidence(k).logged * 2; } catch (e) { } work += Number((o.counters || {}).bac) || 0; }
  if (app >= 120 && app > work) out.push(`System overhead: ${app} minutes in War Room in 7 days vs about ${work} minutes of logged work. Use it less, do more.`);
  try { const T = Object.values(S.tasks || {}).filter((t) => t && !t._del), open = T.filter((t) => !t.done && t.due && t.due < dk(addDays(new Date(), -7))).length; if (open >= 8) out.push(`${open} tasks are more than a week overdue. Delete or schedule them; an overdue list stops being read.`); } catch (e) { }
  return out;
}

/* ── weekly board meeting rows (mission.js mcWeekOpen calls this) ── */
function lxWeekFacts(d) {
  d = d || new Date(); const m = dk(monday(d)), e = dk(addDays(monday(d), 6)), inW = (x) => x && x >= m && x <= e, D = typeof live === 'function' ? live(S.decisions) : [];
  const J = Object.values(S.journal || {}).filter((x) => x && !x._del && inW(x.at));
  let demo = 0, fell = 0; try { cmAll().forEach((c) => cmLog(c.id).forEach((x) => { if (!inW(x.at)) return; if (x.comp === 'yes' && (x.ev || '').length >= 3) demo++; else if (x.comp === 'no') fell++; })); } catch (er) { }
  const errs = Object.values(S.lifeErrors || {}).filter((x) => x && !x._del && inW(x.date || x.at)).length;
  return { decMade: D.filter((x) => inW(x.date || (x._u ? dk(new Date(x._u)) : ''))).length, decRev: D.filter((x) => x.result && inW(x.revAt)).length, lessons: J.filter((x) => x.kind === 'lesson' || x.kind === 'event').length, triggers: J.filter((x) => x.kind === 'trigger').length, interrupted: J.filter((x) => x.kind === 'trigger' && x.ok === 1).length, demo, fell, errs, risksOpen: Object.values(S.risks || {}).filter((x) => x && !x._del && x.status !== 'closed').length, over: (() => { try { return rlWeek(7).filter((x) => x.over).length; } catch (er) { return 0; } })() };
}
function lxWeekRows(d) {
  const F = lxWeekFacts(d), W = typeof cmWeak === 'function' ? cmWeak().slice(0, 2) : [], ss = typeof mcSeason === 'function' ? mcSeason() : null, row = (l, v, n) => `<div class="mc-wr"><span>${l}</span><b>${v}</b>${n ? `<em>${n}</em>` : ''}</div>`;
  return `<div class="mc-wl"><span>Board meeting: the rest of life</span></div>${row('Decisions made · reviewed', `${F.decMade} · ${F.decRev}`)}${row('Skills shown to standard · fell short', `${F.demo} · ${F.fell}`, W.length ? 'recurring weakness: ' + W.map((x) => esc(x.c.n)).join(', ') : '')}${row('BAC errors logged', F.errs)}${row('Triggers logged · interrupted', `${F.triggers} · ${F.interrupted}`)}${row('Lessons and events', F.lessons)}${row('Open risks', F.risksOpen)}${row('Days next week over capacity', F.over, F.over ? '<a onclick="closeModal();rlReplanWeek()">fix it</a>' : '')}${ss ? row('Season', esc(MC_SEASONS[ss.kind] || ss.kind), ss.review ? 'review on ' + esc(ss.review) + ' · still right?' : 'no review date') : row('Season', 'not set')}${typeof exWeekRows === 'function' ? exWeekRows(row) : ''}`;
}

/* ── development indicators: a few interpretable numbers, no grand score ── */
function lxMetrics() {
  const R = [], ds = [...Array(28)].map((_, i) => addDays(new Date(), -i)); let mis = 0, met = 0, zero = 0, back = 0, over = 0, app = 0, work = 0;
  const by = (() => { try { return mcDialLog(); } catch (e) { return {}; } })();
  ds.forEach((d, i) => { const k = dk(d), o = S.days[k]; if (!o) return; const E = (() => { try { return mcDialEvidence(k, by); } catch (e) { return { logged: 0 }; } })(); if (o.mc) { mis++; if (typeof mcMet === 'function' && mcMet(o, E)) met++; } app += Number(o.appMin) || 0; work += E.logged * 2 + (Number((o.counters || {}).bac) || 0); });
  for (let i = 1; i < 27; i++) { const a = S.days[dk(ds[i + 1])], b = S.days[dk(ds[i])]; const z = (o) => o && !(Number((o.counters || {}).bac) || 0) && !(o.mc && o.mcDone); if (z(a)) { zero++; if (!z(b)) back++; } }
  R.push(['Priority completion', mis ? `${met} of ${mis}` : '–', 'missions met by evidence, 28 days']);
  R.push(['Recovery after a zero day', zero ? `${back} of ${zero}` : '–', 'next day not zero']);
  const D = typeof live === 'function' ? live(S.decisions) : [], due = D.filter((x) => x.review && x.review <= dk(new Date())), rev = due.filter((x) => x.result || x.hit != null);
  R.push(['Decision reviews done', due.length ? `${rev.length} of ${due.length}` : '–', 'reviewed by their date']);
  try { const cal = jlCalib(); if (cal.n) R.push(['Prediction calibration', `${cal.score}/100`, `${cal.n} resolved predictions (Brier-based)`]); } catch (e) { }
  try { let dem = 0, ev = 0; cmAll().forEach((c) => { const p = cmPerf(c.id); if (p.lv >= 3) dem++; ev += p.n; }); R.push(['Capabilities demonstrated', dem, `${ev} real events judged`]); } catch (e) { }
  try { const P = typeof dfProtoStats === 'function' ? dfProtoStats() : []; const best = P.filter((p) => p.n >= 3).sort((a, b) => b.rate - a.rate)[0]; R.push(['Most effective protocol', best ? `${Math.round(best.rate * 100)}%` : '–', best ? esc(best.t) + ` (${best.n} uses)` : 'needs 3 logged uses']); } catch (e) { }
  try { const W = rlWeek(7); over = W.filter((x) => x.over).length; R.push(['Overcommitted days ahead', over, 'next 7 days']); } catch (e) { }
  R.push(['System overhead', app ? `${app} min` : '–', app ? `in War Room vs ≈${work} min logged work, 28 days` : 'measured from 13.24']);
  const ex = S.settings.lastExport ? Math.floor((now() - S.settings.lastExport) / 864e5) : null; R.push(['Backup file age', ex == null ? 'never' : ex + ' d', 'Settings → Export']);
  return R;
}
function lxMetricsOpen() { openModal(`<h2>Indicators</h2><div class="hint">A few honest numbers from records. No single score: a life is not one number. Small samples are not trends.</div>${lxMetrics().map((r) => `<div class="mc-wr"><span>${r[0]}</span><b>${r[1]}</b><em>${r[2]}</em></div>`).join('')}`, true); }

/* ── the Operator screen (You → Engine → Operator) ── */
function lfOpTab() {
  rlSeed(); const du = lxDue(), ss = typeof mcSeason === 'function' ? mcSeason() : null, D = (S.settings || {}).direction || {}, nx = typeof cmNext === 'function' ? (() => { try { return cmNext(); } catch (e) { return null; } })() : null, ver = rlFacts().filter((x) => x.st === 'verify' || x.st === 'unknown').length;
  const W = (() => { try { return rlWeek(7); } catch (e) { return []; } })(), over = W.filter((x) => x.over).length, wk = typeof cmWeak === 'function' ? cmWeak() : [], dn = du.dec + du.pred + du.risk;
  const tile = (t, s, act, warn) => `<button class="op-t ${warn ? 'warn' : ''}" onclick="${act}"><b>${t}</b><span>${s}</span></button>`;
  return `<div class="op">
    <button class="btn primary block op-cap" onclick="jnNew()">＋ Capture: event · lesson · decision · trigger</button>
    ${dn || over || du.man ? `<div class="op-due">${dn ? `<button onclick="jlDueOpen()">${dn} review${dn > 1 ? 's' : ''} due ›</button>` : ''}${over ? `<button onclick="rlCapOpen()">${over} overloaded day${over > 1 ? 's' : ''} ahead ›</button>` : ''}${du.man ? `<button onclick="fmOpen()">${du.man} Field Manual entr${du.man > 1 ? 'ies' : 'y'} to review ›</button>` : ''}</div>` : ''}
    <div class="op-g">
      ${tile('Season & reality', ss ? `${esc(MC_SEASONS[ss.kind] || ss.kind)} · ${ver} fact${ver === 1 ? '' : 's'} to verify` : 'Set the season', 'rlOpen()', !ss || ver)}
      ${tile('Direction', D.become ? esc(String(D.become).slice(0, 60)) : 'Write what you are becoming', 'rlDirOpen()')}
      ${tile('Capability map', nx ? 'Next: ' + esc(nx.cap.n) : 'Nine domains', 'cmOpen()', wk.length)}
      ${tile('Journal & history', `${Object.values(S.journal || {}).filter((x) => x && !x._del).length} entries · one timeline`, 'jnTimeline()')}
      ${tile('Judgment Lab', `decisions · predictions · scenarios`, 'jlOpen()', du.dec + du.pred)}
      ${tile('Red Team & risks', `${Object.values(S.risks || {}).filter((x) => x && !x._del && x.status !== 'closed').length} open risks`, 'rtOpen()', du.risk)}
      ${tile('Attention Defense', 'triggers · if-then protocols · lapse', 'dfOpen()')}
      ${tile('Field Manual', `${typeof fmAll === 'function' ? fmAll().filter((x) => x.kind !== 'cont').length : 0} procedures`, 'fmOpen()', du.man)}
      ${tile('Contingency & readiness', 'plans · backups · checks', 'fmContOpen()')}
      ${tile('Knowledge pipeline', `${typeof kpAll === 'function' ? kpAll().length : 0} sources`, 'kpOpen()')}
      ${tile('Capacity & resources', over ? `${over} day${over > 1 ? 's' : ''} over capacity` : 'next 7 days fit', 'rlCapOpen()', over)}
      ${tile('Indicators', 'a few honest numbers', 'lxMetricsOpen()')}
      ${tile('Learn now', 'time you have → one session', 'lxGo()')}
      ${tile('Blueprint', (() => { try { const u = bpAudit(); return u.lessons + '/' + u.total + ' with own lesson'; } catch (e) { return 'ten areas'; } })(), 'bpOpen()')}
      ${tile('Owner discovery', (() => { try { return odAnswers().length + ' owner answers'; } catch (e) { return '9 questions'; } })(), 'odOpen()')}
      ${tile('Knowledge → execution', 'books → Caregiver Bench', 'kxOpen()')}
      ${tile('Competitors', 'by type, with sources', 'mkCompOpen()')}
      ${tile('Email lessons', (() => { try { return emLessons().length + ' lessons'; } catch (e) { return 'from your inbox'; } })(), 'emOpen()')}
      ${tile('Automation', 'what really runs by itself', 'coAuto()')}
      ${tile('Unprocessed', (() => { try { return coOpenCaps().length + ' captured lines waiting'; } catch (e) { return 'captured lines'; } })(), 'coInbox()')}
      ${tile('Phone test', 'real-device checklist', 'ptOpen()')}
      ${tile('Test records', 'kept out of signals', 'dgOpen()')}
      ${tile('Operating system', (() => { try { const n = osNextStep(); return n ? 'next: ' + esc(n.n) : 'three engines'; } catch (e) { return 'three engines'; } })(), 'osOpen()')}
      ${tile('Right knowledge, right time', 'now · next · later · research jobs', 'rsOpen()')}
      ${tile('Strategy', 'evidence · opportunities · assets · A/B/C', 'stOpen()', typeof stSignals === 'function' && stSignals().some((s) => s.w >= 3))}
      ${tile('Content', 'today\'s queue · I have X minutes · library', 'ccOpen()')}
      ${tile('Campaigns', `${typeof campActive === 'function' ? campActive().length : 0} active · projects · next actions`, 'cxList()')}
      ${tile('Branching scenarios', `${typeof JL_BR !== 'undefined' ? JL_BR.length : 0} multi-step situations`, 'jlBrList()')}
      ${tile('Source audit', 'duplicates · unverified · unused', 'kpAuditOpen()')}
      ${tile('Energy', (() => { const e = typeof enToday === 'function' ? enToday() : null; return e ? 'last check-in ' + e.v + '/5' : 'no check-in today'; })(), 'enCheck()')}
      ${tile('Search everything', 'cards · manual · journal · sources', 'jnSearchOpen()')}
    </div>
    <div class="xs muted" style="margin-top:10px">War Room is a tool, not the work. The Day screen holds the one recommendation; this screen holds the records that make it better.</div></div>`;
}

(function () {
  const st = document.createElement('style'); st.id = 'rl-css';
  st.textContent = `.op{display:grid;gap:10px}.op-cap{min-height:52px;font-size:15px}.op-due{display:flex;flex-wrap:wrap;gap:6px}.op-due button{min-height:40px;border:1px solid var(--warn,#e5a50a);color:var(--warn,#e5a50a);background:none;border-radius:20px;padding:0 12px;font:inherit;font-size:13px;cursor:pointer}
  .op-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(min-width:900px){.op-g{grid-template-columns:repeat(3,1fr)}}.op-t{display:grid;gap:4px;text-align:left;min-height:72px;border:1px solid var(--ln,#2a2a2e);border-radius:12px;background:transparent;color:var(--ink,#eee);font:inherit;padding:10px 12px;cursor:pointer;align-content:start}.op-t.warn{border-color:var(--warn,#e5a50a)}.op-t b{font-size:14px}.op-t span{font-size:12px;line-height:1.35;color:var(--muted,#aaa);overflow-wrap:anywhere}
  .rl-f{display:grid;gap:3px;width:100%;text-align:left;border:1px solid var(--ln,#2a2a2e);border-radius:10px;background:transparent;color:var(--ink,#eee);font:inherit;padding:9px 12px;margin:6px 0;min-height:48px;cursor:pointer}.rl-f b{font-weight:500;font-size:14px;line-height:1.35}.rl-f span{font-size:11.5px;color:var(--muted,#999)}.rl-f i{font-style:normal;font-weight:600}.rl-f i.ok{color:var(--good,#3fb950)}.rl-f i.acc{color:var(--acc,#C9A24A)}.rl-f i.warn{color:var(--warn,#e5a50a)}.rl-f i.bad{color:var(--bad,#e5484d)}
  .rl-day{display:grid;gap:2px;padding:8px 0;border-bottom:1px solid var(--ln,#222)}.rl-day span{font-size:12.5px;color:var(--muted,#aaa)}.rl-day em{font-style:normal;font-size:12px;color:var(--warn,#e5a50a)}.rl-day.bad b{color:var(--warn,#e5a50a)}
  .en-rp{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;padding:7px 0;border-bottom:1px solid var(--ln,#222);font-size:13px}.en-rp b{font:600 11px var(--mono,monospace);align-self:start;padding-top:2px}.en-rp.move b{color:var(--acc,#C9A24A)}.en-rp.drop b{color:var(--bad,#e5484d)}.en-rp.reduce b{color:var(--warn,#e5a50a)}.en-rp em{grid-column:2;font-style:normal;font-size:11.5px;color:var(--muted,#999)}`;
  document.head.appendChild(st);
})();

/* 15.0: campaigns competing for the same hours. A campaign's hours are its actions placed on the calendar (blocks linked to a
   task of that campaign). Its tasks with no time on the calendar are counted as "no estimate"; no time is invented for them.
   Room = waking time minus fixed commitments minus 30 minutes' buffer a day. Over = all planned flexible time beyond that.
   The fix is a proposal only: nothing is moved, and no campaign or calendar entry is changed. */
function rlcDays(w) { const t = new Date(); t.setHours(0, 0, 0, 0); const m = monday(t), a = w === 0 ? t : addDays(m, 7), e = addDays(m, w === 0 ? 6 : 13), D = []; for (let d = new Date(a); d <= e; d = addDays(d, 1)) D.push(new Date(d)); return D; }
function rlcWeek(w) { const D = rlcDays(w).map((d) => rlDay(d)), C = {}, cname = (id) => { const c = (S.campaigns || {})[id]; return c ? c.title || 'Campaign' : 'Campaign'; };
  D.forEach((x) => (x.L || []).forEach((b) => { const t = b.task && S.tasks && S.tasks[b.task]; if (!t || !t.camp) return; const m = Math.max(0, tmin(b.end) - tmin(b.start)); const c = C[t.camp] = C[t.camp] || { id: t.camp, n: cname(t.camp), min: 0, B: [] }; c.min += m; c.B.push({ k: x.k, t: t.title, m }); }));
  const act = (typeof campActive === 'function' ? campActive() : []); act.forEach((c) => { const T = Object.values(S.tasks || {}).filter((t) => t && !t._del && !t.done && t.camp === c.id && t.due && rlcDays(w).some((d) => dk(d) === t.due)); const placed = new Set(((C[c.id] || {}).B || []).map((b) => b.t)); const ne = T.filter((t) => !placed.has(t.title)).length; if (ne) { C[c.id] = C[c.id] || { id: c.id, n: c.title || 'Campaign', min: 0, B: [] }; C[c.id].noEst = ne; } });
  const room = D.reduce((s, x) => s + Math.max(0, x.avail - x.fixed - 30), 0), planned = D.reduce((s, x) => s + x.flex + x.other, 0);
  const L = Object.values(C).sort((a, b) => b.min - a.min), withH = L.filter((c) => c.min > 0); return { w, D, C: L, room, planned, over: Math.max(0, planned - room), clash: withH.length >= 2 }; }
function rlcFix(A, B) { if (!A.over || !A.clash) return null; const c = A.C.filter((x) => x.min > 0).sort((a, b) => a.min - b.min)[0]; if (!c) return null; const roomNext = B ? Math.max(0, B.room - B.planned) : 0, to = B && roomNext >= c.min ? 'next week' : 'the week after';
  return { c, to, text: `Move ${c.n}'s ${c.B.length} block${c.B.length === 1 ? '' : 's'} (${Math.round(c.min / 6) / 10} h) to ${to}${B && roomNext >= c.min ? `, which has ${Math.round(roomNext / 6) / 10} h of room` : ''}. This frees ${Math.round(Math.min(c.min, A.over) / 6) / 10} of the ${Math.round(A.over / 6) / 10} h over.` }; }
function rlcBlock() { const A = rlcWeek(0), B = rlcWeek(1), h = (m) => Math.round(m / 6) / 10 + ' h', wk = (W, lbl) => { const f = W === A ? rlcFix(A, B) : rlcFix(B, null);
    return `<div class="xs" style="margin-top:6px"><b>${lbl}</b>: room ${h(W.room)}, planned ${h(W.planned)}${W.over ? ` · <b class="bad">${h(W.over)} over</b>` : ''}</div>${W.C.length ? W.C.map((c) => `<div class="xs">• ${esc(c.n)}: ${c.min ? h(c.min) + ' on the calendar' : 'nothing on the calendar'}${c.noEst ? ` · ${c.noEst} task${c.noEst === 1 ? '' : 's'} due with no estimate` : ''}</div>`).join('') : '<div class="xs muted">No campaign work this week.</div>'}${W.clash && W.over ? `<div class="xs"><b>${W.C.filter((c) => c.min).length} campaigns compete for the same week.</b> ${f ? 'Proposal (nothing is moved): ' + esc(f.text) : ''}</div>` : ''}`; };
  return `<div class="mc-wl" id="rl-camp"><span>Campaigns competing for the same hours</span><div class="xs muted">Hours are campaign actions placed on the calendar. Tasks with no time placed are counted as no estimate, never guessed.</div>${wk(A, 'This week')}${wk(B, 'Next week')}</div>`; }
if (typeof rlCapOpen === 'function' && !rlCapOpen._camp) { const f = rlCapOpen; rlCapOpen = function () { const r = f.apply(this, arguments); try { const m = $('modal'), x = $('rl-rec'); if (m && !$('rl-camp')) (x ? x.insertAdjacentHTML('beforebegin', rlcBlock()) : m.insertAdjacentHTML('beforeend', rlcBlock())); } catch (e) { } return r; }; rlCapOpen._camp = 1; }

/* 15.2: money commitments against the Money hub. Commitments are planned payments (S.mplan, out, active) and decisions or
   campaigns whose cost or resources note you wrote with an amount and a currency. Each is checked in date order against the
   cash you can use now (mnSafe().spendable) plus planned income before it, minus the commitments before it: covered, tight
   (it takes more than half of what is left), or not covered. Nothing is moved or changed; a note without an amount says so. */
function rlmAmt(txt) { const m = String(txt || '').replace(/(\d)[ .](?=\d{3}\b)/g, '$1').match(/(\d+(?:[.,]\d+)?)\s*(lei|mdl|\$|usd|eur|€)|(\$|€)\s*(\d+(?:[.,]\d+)?)/i); if (!m) return null; const v = Number(String(m[1] || m[4]).replace(',', '.')), c = String(m[2] || m[3] || '').toLowerCase(), cur = /\$|usd/.test(c) ? 'USD' : /eur|€/.test(c) ? 'EUR' : 'MDL'; return v > 0 ? { v, cur, mdl: typeof mnB === 'function' ? mnB(v, cur) : v } : null; }
function rlmList() { const tk = dk(new Date()), L = [];
  Object.values(S.mplan || {}).filter((p) => p && !p._del && p.active !== false && p.next).forEach((p) => L.push({ ref: 'plan:' + p.id, kind: p.type === 'in' ? 'in' : 'out', what: p.note || p.cat || 'Planned payment', date: p.next < tk ? tk : p.next, amt: mnB(p.amt, mnAccCur(p.acc)), src: 'planned payment in Money' }));
  Object.values(S.decisions || {}).filter((d) => d && !d._del && d.cost && !d.result).forEach((d) => { const a = rlmAmt(d.cost); L.push({ ref: 'decision:' + d.id, kind: 'out', what: d.title || 'Decision', date: d.review || tk, amt: a ? a.mdl : null, note: d.cost, src: 'your cost note on the decision' }); });
  Object.values(S.campaigns || {}).filter((c) => c && !c._del && !c.outcome && c.res && rlmAmt(c.res)).forEach((c) => { const a = rlmAmt(c.res); L.push({ ref: 'project:' + c.id, kind: 'out', what: c.title || 'Campaign', date: c.deadline || tk, amt: a.mdl, note: c.res, src: 'the resources note on the campaign' }); });
  return L.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); }
function rlmCheck() { let left = mnSafe().spendable; const out = []; rlmList().forEach((x) => { if (x.kind === 'in') { left += x.amt; return; } if (x.amt == null) { out.push(Object.assign({ st: 'no amount', before: left }, x)); return; } const before = left, st = before < x.amt ? 'not covered' : x.amt > before / 2 ? 'tight' : 'covered'; left -= x.amt; out.push(Object.assign({ st, before, after: left }, x)); }); return { start: mnSafe().spendable, L: out }; }
function rlmBlock(only) { const R = rlmCheck(), L = only ? R.L.filter((x) => x.ref === only) : R.L; if (only && !L.length) return ''; const cls = { covered: 'ok', tight: 'warn', 'not covered': 'bad', 'no amount': 'muted' };
  return `<div class="mc-wl" id="${only ? 'en-rlm' : 'rl-mc'}"><span>${only ? 'Can the Money hub cover this?' : 'Money commitments against the Money hub'}</span><div class="xs muted">Checked in date order from ${mnF(R.start)} you can use now (cash and cards), plus planned income before each date. Nothing is moved.</div>${L.length ? L.slice(0, 12).map((x) => `<div class="xs" style="margin:4px 0"><b class="${cls[x.st]}">${esc(x.st)}</b> · ${esc(String(x.what).slice(0, 60))} · ${fmtShort(pd(x.date))} · ${x.amt == null ? `no amount in “${esc(String(x.note || '').slice(0, 60))}”` : `${mnF(x.amt)} against ${mnF(x.before)} left by then`} <span class="muted">(${esc(x.src)})</span></div>`).join('') : '<div class="xs">No planned payments, and no decision or campaign with an amount in its cost note.</div>'}</div>`; }
if (typeof rlCapOpen === 'function' && !rlCapOpen._mc) { const f = rlCapOpen; rlCapOpen = function () { const r = f.apply(this, arguments); try { const m = $('modal'), x = $('rl-camp') || $('rl-rec'); if (m && !$('rl-mc')) (x ? x.insertAdjacentHTML('afterend', rlmBlock()) : m.insertAdjacentHTML('beforeend', rlmBlock())); } catch (e) { } return r; }; rlCapOpen._mc = 1; }
