/* War Room v4 · Train: any number of sessions a day, any kind, logged any time. */
'use strict';
const SESSION_KINDS = [['program', '🏋️', 'Strength (program)'], ['tennis', '🎾', 'Tennis: own training / OFP'], ['match', '🏆', 'Match / competition'], ['cardio', '🏃', 'Run · bike · zone 2'], ['mobility', '🧘', 'Mobility / recovery'], ['other', '✨', 'Other sport']];
function kindIcon(k) { return (SESSION_KINDS.find((x) => x[0] === k) || ['', '🏋️'])[1]; }
function sessionLabel(s) { if (s.label) return s.label; if (s.kind === 'program') { const p = S.programs[s.program]; return p ? p.name : 'Strength'; } return (SESSION_KINDS.find((x) => x[0] === s.kind) || [, , 'Session'])[2].split(':')[0]; }
function sessionMinutes(s) { if (s.dur) return Number(s.dur) || 0; if (s.startedAt && s.endedAt) return Math.max(0, tmin(s.endedAt) - tmin(s.startedAt)); return 0; }
function sessionSets(s) { return Object.values(s.sets || {}).reduce((a, x) => a + (x || []).filter((y) => y && y.done).length, 0); }
function sessionVolume(s) { return Object.values(s.sets || {}).reduce((a, x) => a + (x || []).reduce((b, y) => b + (y && y.done ? (num(y.w) || 0) * (parseInt(y.r) || 0) : 0), 0), 0); }

/* schedule blocks today that look like training and have no session yet */
function unloggedBlocks(d) {
  const o = S.days[dk(d)], ss = sessionsRO(o), nm = nowMin(), today = isToday(d);
  return blocksFor(d).filter((b) => (b.kind === 'train' || b.kind === 'tennis') && !/lesson|grupa|lessons/i.test(b.title) && (!today || tmin(b.start) <= nm) && !ss.some((s) => s.block === b.id || (s.blockTitle && s.blockTitle === b.title) || (b.kind === 'train' && s.kind === 'program' && (s.done || s.skipped))));
}
function logBlock(id, happened) {
  const o = day(curDate), b = blocksFor(curDate).find((x) => x.id === id); if (!b) return; const ss = sessionsOf(o);
  if (happened) {
    let s = ss.find((x) => x.kind === 'program' && !x.done && !x.skipped && !x.block && b.kind === 'train');
    if (s) { s.block = b.id; s.blockTitle = b.title; s.done = true; s.startedAt = b.start; s.endedAt = b.end === '24:00' ? '23:59' : b.end; }
    else ss.push({ id: uid(), kind: b.kind === 'train' ? 'program' : 'tennis', program: b.kind === 'train' ? (S.programByDay.map[dow(curDate)] || '') : '', label: b.kind === 'train' ? '' : b.title.replace(/^[^\w]+/, ''), block: b.id, blockTitle: b.title, sets: {}, done: true, note: '', startedAt: b.start, endedAt: b.end === '24:00' ? '23:59' : b.end });
    toast('Logged: ' + b.title);
  } else { ss.push({ id: uid(), kind: b.kind === 'train' ? 'program' : 'tennis', program: '', label: b.title.replace(/^[^\w]+/, ''), block: b.id, blockTitle: b.title, sets: {}, done: false, skipped: 'did not happen', note: '' }); toast('Noted: ' + b.title + ' did not happen'); }
  syncTrainFlags(o); touch(o); trainSel = -1; render();
}
function addSessionModal() {
  const o = day(curDate);
  openModal(`<h2>Add a session · ${fmtShort(curDate)}</h2>
    <div class="field"><label>What</label><div class="chips" id="as-kind">${SESSION_KINDS.map(([k, ic, l], i) => `<span class="chip ${i === 0 ? 'on' : ''}" data-k="${k}" onclick="document.querySelectorAll('#as-kind .chip').forEach(c=>c.classList.toggle('on',c===this));document.getElementById('as-prog-wrap').classList.toggle('hidden','${k}'!=='program')">${ic} ${l}</span>`).join('')}</div></div>
    <div class="field" id="as-prog-wrap"><label>Program</label><select id="as-prog">${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<option value="${id}" ${id === (S.programByDay.map[dow(curDate)] || '') ? 'selected' : ''}>${esc(S.programs[id].name)}</option>`).join('')}<option value="">— free session, no program —</option></select></div>
    <div class="field"><label>Name (optional)</label><input id="as-label" placeholder="e.g. OFP, TT, evening pull-ups, 5 km"></div>
    <div class="g3"><div class="field"><label>Start</label><input id="as-start" type="time" value="${pad(Math.floor(nowMin() / 60))}:${pad(nowMin() % 60)}"></div><div class="field"><label>Minutes</label><input id="as-dur" type="number" inputmode="numeric" placeholder="45"></div><div class="field"><label>RPE 1–10</label><input id="as-rpe" type="number" inputmode="numeric" min="1" max="10" placeholder="7"></div></div>
    <div class="field"><label>Note</label><input id="as-note" placeholder="what you did, how it felt"></div>
    <div class="actions"><button class="btn" onclick="saveSessionNew(false)">Add, log sets now</button><button class="btn primary" onclick="saveSessionNew(true)">Add as done ✓</button></div>`);
}
function saveSessionNew(done) {
  const o = day(curDate), ss = sessionsOf(o); const kind = (document.querySelector('#as-kind .chip.on') || {}).dataset?.k || 'program';
  const s = { id: uid(), kind, program: kind === 'program' ? $('as-prog').value : '', label: $('as-label').value.trim(), sets: {}, done: !!done, note: $('as-note').value.trim(), startedAt: $('as-start').value, dur: Number($('as-dur').value) || 0, rpe: Number($('as-rpe').value) || 0 };
  // an empty untouched default session gets replaced instead of piling up
  const idx = ss.findIndex((x) => !x.done && !x.skipped && !Object.keys(x.sets || {}).length && !x.label && !x.block);
  if (idx >= 0 && ss.length === 1) ss.splice(idx, 1);
  ss.push(s); trainSel = ss.length - 1; syncTrainFlags(o); touch(o); closeModal(); render();
}
function deleteSession(id) { const o = day(curDate), ss = sessionsOf(o); const i = ss.findIndex((x) => x.id === id); if (i < 0) return; if (!confirm('Delete this session and its sets?')) return; ss.splice(i, 1); trainSel = -1; syncTrainFlags(o); touch(o); closeModal(); render(); }
function editSessionMeta(id) {
  const o = day(curDate), s = sessionsOf(o).find((x) => x.id === id); if (!s) return;
  openModal(`<h2>${kindIcon(s.kind)} ${esc(sessionLabel(s))}</h2>
    <div class="field"><label>Kind</label><div class="chips" id="es-kind">${SESSION_KINDS.map(([k, ic, l]) => `<span class="chip ${k === s.kind ? 'on' : ''}" data-k="${k}" onclick="document.querySelectorAll('#es-kind .chip').forEach(c=>c.classList.toggle('on',c===this))">${ic} ${l.split(':')[0]}</span>`).join('')}</div></div>
    <div class="field"><label>Name</label><input id="es-label" value="${esc(s.label || '')}" placeholder="${esc(sessionLabel(s))}"></div>
    <div class="g3"><div class="field"><label>Start</label><input id="es-start" type="time" value="${esc(s.startedAt || '')}"></div><div class="field"><label>Minutes</label><input id="es-dur" type="number" inputmode="numeric" value="${s.dur || sessionMinutes(s) || ''}"></div><div class="field"><label>RPE</label><input id="es-rpe" type="number" inputmode="numeric" min="1" max="10" value="${s.rpe || ''}"></div></div>
    <div class="field"><label>Note</label><input id="es-note" value="${esc(s.note || '')}"></div>
    <div class="actions"><button class="btn danger" onclick="deleteSession('${id}')">Delete</button><button class="btn primary" onclick="saveSessionMeta('${id}')">Save</button></div>`);
}
function saveSessionMeta(id) { const o = day(curDate), s = sessionsOf(o).find((x) => x.id === id); if (!s) return; s.kind = (document.querySelector('#es-kind .chip.on') || {}).dataset?.k || s.kind; s.label = $('es-label').value.trim(); s.startedAt = $('es-start').value; s.dur = Number($('es-dur').value) || 0; s.rpe = Number($('es-rpe').value) || 0; s.note = $('es-note').value.trim(); if (s.kind !== 'program') { s.program = ''; } touch(o); closeModal(); render(); }

function renderTrain() {
  const k = dk(curDate), o = day(k), w = dow(curDate), ss = sessionsOf(o);
  const wo = curSession(o), p = wo.kind === 'program' ? S.programs[wo.program] : null, EX = wo.kind === 'program' ? sessionEx(wo) : [];
  const unl = unloggedBlocks(curDate);
  let html = '';
  // unlogged scheduled training
  if (unl.length) html += `<div class="card"><div class="card-t" style="margin-bottom:8px">On the plan, not logged yet</div>${unl.map((b) => `<div class="row sb" style="padding:6px 0;border-bottom:1px solid var(--line)"><div><div style="font-weight:600">${esc(b.title)}</div><div class="xs muted">${b.start}–${b.end}</div></div><div class="row" style="gap:6px"><button class="btn sm ok" onclick="logBlock('${b.id}',true)">Done ✓</button><button class="btn sm ghost" onclick="logBlock('${b.id}',false)">Didn't happen</button></div></div>`).join('')}</div>`;
  // sessions strip
  const tabs = ss.map((s, i) => `<span class="chip ${s === wo ? 'on' : ''} ${s.done ? 'ok' : s.skipped ? 'bad' : ''}" onclick="trainSel=${i};render()">${kindIcon(s.kind)} ${esc(sessionLabel(s))}${s.done ? ' ✓' : s.skipped ? ' –' : ''}</span>`).join('');
  html += `<div class="card ac"><div class="card-h"><div class="card-t">${DAY_LONG[w]} · ${ss.filter((s) => s.done).length} of ${ss.length} session${ss.length > 1 ? 's' : ''} done</div><div class="card-r">${restPill()}</div></div>
    <div class="chips" style="margin-bottom:10px">${tabs}<span class="chip" onclick="addSessionModal()">+ Add session</span></div>
    ${wo.kind === 'program' ? `<div class="field" style="margin-bottom:8px"><select onchange="setProgram(this.value)"><option value="">— no program (free session) —</option>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<option value="${id}" ${id === wo.program ? 'selected' : ''}>${esc(S.programs[id].name)}</option>`).join('')}</select></div>
      ${p ? `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm grow" onclick="editSession()">✎ Today only${wo.ex ? ' · edited' : ''}</button><button class="btn sm grow" onclick="editProgram('${wo.program}')">✎ Every week</button><button class="btn sm" onclick="editSessionMeta('${wo.id}')">⋯</button></div>` : `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm grow" onclick="editSession()">✎ Add exercises for today</button><button class="btn sm" onclick="editSessionMeta('${wo.id}')">⋯</button></div>`}
      ${p && p.note ? `<div class="hint">${esc(p.note)}</div>` : ''}`
    : `<div class="row sb"><div><div style="font-size:18px;font-weight:800">${kindIcon(wo.kind)} ${esc(sessionLabel(wo))}</div><div class="small muted">${wo.startedAt ? wo.startedAt + ' · ' : ''}${sessionMinutes(wo) ? sessionMinutes(wo) + ' min' : 'no duration yet'}${wo.rpe ? ' · RPE ' + wo.rpe : ''}${wo.note ? ' · ' + esc(wo.note) : ''}</div></div><button class="btn sm" onclick="editSessionMeta('${wo.id}')">✎</button></div>`}
    ${wo.skipped ? `<div class="row" style="margin-top:10px"><div class="small muted grow">Skipped: <b>${esc(wo.skipped)}</b>. ${dayTrained(o) ? 'Another session today counts.' : 'Add a session later if you train after all.'}</div><button class="btn sm" onclick="unskipWorkout()">Undo</button></div>` : wo.done ? '' : `<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><span class="small muted">Skipping this one?</span>${['Rest day', 'Sick', 'Tennis instead', 'No time', 'Overslept', 'Later today'].map((r) => `<span class="chip" onclick="skipWorkout('${r}')">${r}</span>`).join('')}</div>`}
    ${wo.kind !== 'program' && !wo.done && !wo.skipped ? `<button class="btn primary block" style="margin-top:12px" onclick="finishWorkout()">Done ✓</button>` : wo.kind !== 'program' && wo.done ? `<button class="btn block sm" style="margin-top:12px" onclick="finishWorkout()">Mark as not done</button>` : ''}</div>`;
  // exercises
  if (wo.kind === 'program' && EX.length) {
    html += `<div class="card">${EX.map((e, ei) => { const sets = wo.sets[ei] || []; const hist = exHistory(e.n, k, 6); const last = hist[0]; const pv = last ? last.sets : []; const best = exBest(hist);
      return `<div class="ex"><div class="h"><div class="n">${esc(e.n)}</div><div class="row" style="gap:6px"><div class="tgt">${e.s} × ${esc(e.r)}</div><button class="btn sm ghost" style="min-height:28px;padding:2px 8px" onclick="exMenu(${ei})">⋯</button></div></div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:6px">${last ? `<span class="xs muted">Last ${fmtShort(pd(last.k))}: <b style="color:var(--sub)">${esc(fmtSets(last.sets))}</b></span>` : '<span class="xs dim">First time: write what you do.</span>'}${best && best.w ? `<span class="xs muted">· best ${best.w}×${best.r}</span>` : ''}${progressHint(e, last)}${hist.length > 1 ? `<span class="xs acc" onclick="exMenu(${ei})" style="cursor:pointer">history ›</span>` : ''}</div>
        <div class="sets">${Array.from({ length: e.s }, (_, si) => { const s = sets[si] || {}; const ps = pv[si]; return `<div class="set ${s.done ? 'on' : ''}"><div class="i">${si + 1}</div><input type="number" inputmode="decimal" placeholder="${ps && ps.w != null && ps.w !== '' ? ps.w : 'kg'}" value="${s.w ?? ''}" oninput="setSet(${ei},${si},'w',this.value)"><input inputmode="numeric" placeholder="${ps && ps.r ? ps.r : (/s\b|min/.test(e.r) ? 'sec' : 'reps')}" value="${s.r ?? ''}" oninput="setSet(${ei},${si},'r',this.value)"><div class="dn" onclick="toggleSet(${ei},${si})">${s.done ? '✓' : ''}</div></div>`; }).join('')}</div></div>`; }).join('')}
      <div class="field" style="margin-top:12px"><label>Session note</label><input value="${esc(wo.note || '')}" placeholder="RPE, pain, what to change" oninput="W(day('${k}')).note=this.value;touch(day('${k}'))"></div>
      <div class="row sb small muted" style="margin:12px 0 8px"><span>Sets <b>${sessionSets(wo)}</b> / ${EX.reduce((a, e) => a + e.s, 0)}</span><span>Volume <b>${Math.round(sessionVolume(wo))}</b> kg</span><span>Week <b>${workoutsWeek(curDate)}</b> days</span></div>
      <button class="btn ${wo.done ? '' : 'primary'} block" onclick="finishWorkout()">${wo.done ? 'Mark as not done' : 'Finish session ✓'}</button><div class="xs muted" style="margin-top:8px;text-align:center">Grey placeholders = your last sets for that exercise. Tick a set: a rest timer starts.</div></div>`;
  } else if (wo.kind === 'program' && !EX.length) {
    html += `<div class="card"><div class="empty">No exercises in this session. Pick a program above, or <a href="#" onclick="editSession();return false">write today's exercises</a>.</div></div>`;
  }
  // week of training
  const m = monday(curDate); let wkMin = 0, wkSets = 0, wkVol = 0, wkSess = 0;
  const cols = ALL.map((i) => { const d = addDays(m, i - 1), kk = dk(d), oo = S.days[kk], list = sessionsRO(oo).filter((s) => s.done); list.forEach((s) => { wkMin += sessionMinutes(s); wkSets += sessionSets(s); wkVol += sessionVolume(s); wkSess++; }); const skipped = sessionsRO(oo).some((s) => s.skipped) && !list.length; return `<div class="wday ${kk === dk(new Date()) ? 'today' : ''} ${kk === k ? 'sel' : ''}" onclick="curDate=pd('${kk}');trainSel=-1;render()"><div class="d">${DAY_SHORT[i]}</div><div class="n" style="font-size:15px">${list.length ? list.map((s) => kindIcon(s.kind)).join('') : skipped ? '–' : '·'}</div><div class="s">${list.length ? (sessionMinutes(list[0]) ? sessionMinutes(list.reduce((a, s) => ({ dur: sessionMinutes(a) + sessionMinutes(s) }), { dur: 0 })) + "'" : list.length + 'x') : ''}</div></div>`; }).join('');
  html += `<div class="card" style="padding:12px"><div class="card-t" style="margin-bottom:8px;padding:0 4px">This week</div><div class="wstrip">${cols}</div><div class="g4" style="margin-top:10px">${[[workoutsWeek(curDate), 'days'], [wkSess, 'sessions'], [wkMin ? Math.round(wkMin / 60 * 10) / 10 + 'h' : wkMin, 'time'], [Math.round(wkVol / 1000 * 10) / 10 + 't', 'lifted']].map(([n, l]) => `<div class="cd"><div class="n" style="font-size:18px">${n}</div><div class="l">${l}</div></div>`).join('')}</div></div>`;
  // history
  const hist = []; Object.keys(S.days).sort().reverse().some((kk) => { sessionsRO(S.days[kk]).filter((s) => s.done).forEach((s) => hist.push({ k: kk, s })); return hist.length >= 20; });
  html += programsCard();
  html += `<div class="card"><div class="card-t" style="margin-bottom:6px">Recent sessions</div>${hist.length ? hist.slice(0, 20).map(({ k: kk, s }) => `<div class="kv" onclick="curDate=pd('${kk}');trainSel=-1;render()" style="cursor:pointer"><span>${kindIcon(s.kind)} ${esc(sessionLabel(s))} <span class="xs muted">${fmtShort(pd(kk))}</span></span><span class="small muted">${sessionSets(s) ? sessionSets(s) + ' sets' : ''}${sessionMinutes(s) ? (sessionSets(s) ? ' · ' : '') + sessionMinutes(s) + ' min' : ''}${s.rpe ? ' · RPE ' + s.rpe : ''}</span></div>`).join('') : '<div class="empty">No sessions logged yet.</div>'}</div>`;
  return html;
}
