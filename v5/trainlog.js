/* War Room 9.1 · TRAINING LOG — one honest place for training: what counts, the past, edit, delete, add, schedule.
   Rule (shown on screen): a day counts as trained only when a session on it is marked Done.
   Sessions opened but never logged ("empty shells") never count, and can be cleaned up in one tap. */
'use strict';
let trlWeeks = 4;
function trlIsBlock(b) { return b.kind === 'train' || b.kind === 'program' || (b.kind === 'tennis' && !/lesson|grup|group|lec/i.test(b.title)); }
function trlEmpty(s) { return !!s && !s.done && !s.skipped && !s.note && !s.dur && !s.label && !Object.values(s.sets || {}).some((a) => (a || []).some((x) => x && (x.done || x.w || x.r))); }
function trlStart() { if (window._trlS && window._trlS[1] === Object.keys(S.days).length) return window._trlS[0]; const ks = Object.keys(S.days).filter((k) => { const o = S.days[k]; return o && (sessionsRO(o).length || Object.values(o.counters || {}).some(Boolean) || o.weight || (o.meals || []).length); }).sort(); window._trlS = [ks[0] || dk(new Date()), Object.keys(S.days).length]; return window._trlS[0]; }
function trlDay(d) {
  const k = dk(d), o = S.days[k], ss = sessionsRO(o), tk = dk(new Date());
  const done = ss.filter((s) => s.done), skip = ss.filter((s) => s.skipped && !s.done), empty = ss.filter(trlEmpty), plan = blocksFor(d).filter(trlIsBlock);
  const endedAll = k < tk || (k === tk && plan.every((b) => tmin(b.end) <= nowMin()));
  const state = done.length ? 'done' : skip.length ? 'skip' : k < trlStart() ? 'pre' : plan.length ? (k < tk || (k === tk && endedAll) ? 'miss' : 'plan') : 'rest';
  return { k, d, o, ss, done, skip, empty, plan, state };
}
function trlWeekCount(m) { let n = 0; for (let i = 0; i < 7; i++) if (trlDay(addDays(m, i)).done.length) n++; return n; }
function trlEmpties() { let n = 0; Object.values(S.days).forEach((o) => sessionsRO(o).forEach((s) => { if (trlEmpty(s)) n++; })); return n; }
function trlClean() {
  const n = trlEmpties(); if (!n) { toast('Nothing to clean'); return; }
  if (!window._trlCleanArm) { window._trlCleanArm = 1; toast(`Tap again to remove ${n} empty session${n === 1 ? '' : 's'} (no sets, not done)`); setTimeout(() => (window._trlCleanArm = 0), 4000); return; }
  window._trlCleanArm = 0; Object.values(S.days).forEach((o) => { if (o && o.workouts) { const b = o.workouts.length; o.workouts = o.workouts.filter((s) => !trlEmpty(s)); if (o.workouts.length !== b) touch(o); } }); trainSel = -1; save(); toast(`Removed ${n} empty session${n === 1 ? '' : 's'}`); render();
}
const TRL_ST = { pre: ['Before tracking', 'muted'], done: ['Trained', 'ok'], miss: ['Missed', 'bad'], skip: ['Skipped', 'muted'], plan: ['Planned', 'acc'], rest: ['Rest', 'muted'] };

/* ── screen ── */
function renderTrlog() {
  const el = $('view-trlog'); if (!el) return;
  const t = new Date(), m0 = monday(t), wk = trlWeekCount(m0), goal = 6, E = trlEmpties();
  const weeks = []; for (let i = trlWeeks - 1; i >= -1; i--) weeks.push(addDays(m0, -7 * i));
  const cell = (d) => { const x = trlDay(d), lbl = x.done.length ? x.done.map(sessionLabel).join(' + ') : x.skip.length ? x.skip[0].skipped : x.state !== 'pre' && x.plan.length ? x.plan.map((b) => b.title.replace(EMO_RE, '').replace(/^Train:\s*/i, '').trim()).join(' + ') : ''; return `<button class="trl-c s-${x.state} ${dk(d) === dk(t) ? 'today' : ''}" onclick="trlOpen('${x.k}')" title="${esc(lbl)}"><b>${d.getDate()}</b><i>${x.state === 'done' ? '✓' : x.state === 'miss' ? '✗' : x.state === 'skip' ? '–' : x.state === 'plan' ? '○' : ''}</i><span>${esc(lbl)}</span></button>`; };
  const recent = []; for (let i = 0; i < 21; i++) { const x = trlDay(addDays(t, -i)); x.ss.filter((s) => !trlEmpty(s)).forEach((s) => recent.push([x, s])); }
  el.innerHTML = `<div class="sgrid st-g">
    <div class="card trl-head"><div class="card-h"><div class="card-t">This week</div><div class="card-r">week ${isoWeek(t)}</div></div>
      <div class="lf-big"><b>${wk}</b><span>of ${goal} training days</span></div>
      <div class="trl-rule">Counts only days with a session marked <b>Done</b>. Opening the Train screen doesn't count; neither does a planned block.</div>
      ${E ? `<button class="btn sm" style="margin-top:10px" onclick="trlClean()">Clean up ${E} empty session${E === 1 ? '' : 's'}</button>` : ''}
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn grow primary" onclick="trlEdit('${dk(t)}')">+ Log a session</button><button class="btn grow" onclick="trlSched()">Schedule</button></div></div>
    <div class="card w2"><div class="card-h"><div class="card-t">Calendar</div><div class="card-r"><span class="trl-lg s-done">✓ trained</span><span class="trl-lg s-miss">✗ missed</span><span class="trl-lg s-skip">– skipped</span><span class="trl-lg s-plan">○ planned</span></div></div>
      <div class="trl-gh"><span></span>${[1, 2, 3, 4, 5, 6, 7].map((w) => `<span>${DAY_SHORT[w].slice(0, 2)}</span>`).join('')}<span>days</span></div>
      ${weeks.map((m) => `<div class="trl-row"><span class="wk">${fmtShort(m).replace(/^\w+\s/, '')}</span>${[0, 1, 2, 3, 4, 5, 6].map((i) => cell(addDays(m, i))).join('')}<span class="n ${m > t ? 'muted' : trlWeekCount(m) >= goal ? 'ok' : ''}">${m > t ? '' : trlWeekCount(m)}</span></div>`).join('')}
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn sm ghost" onclick="trlWeeks+=6;render()">Show older weeks</button></div></div>
    <div class="card w2"><div class="card-h"><div class="card-t">Sessions · last 3 weeks</div><div class="card-r">tap to edit or delete</div></div>
      ${recent.length ? recent.map(([x, s]) => `<div class="trl-s" onclick="trlEdit('${x.k}','${s.id}')"><span class="d">${fmtShort(x.d)}</span><span class="n">${esc(sessionLabel(s))}${s.note ? `<em>${esc(s.note)}</em>` : ''}</span><span class="m">${[s.startedAt, sessionMinutes(s) ? sessionMinutes(s) + ' min' : '', sessionSets(s) ? sessionSets(s) + ' sets' : ''].filter(Boolean).join(' · ')}</span><b class="${s.done ? 'ok' : 'muted'}">${s.done ? 'Done' : s.skipped ? 'Skipped' : 'Not done'}</b></div>`).join('') : '<div class="empty">No real sessions in the last 3 weeks. Log one with "+ Log a session"; past days work too.</div>'}</div></div>`;
}

/* ── one day ── */
function trlOpen(k) {
  const x = trlDay(pd(k)), tk = dk(new Date()), fut = k > tk;
  openModal(`<div class="xs muted">${fmtDate(pd(k))}</div><h2 style="margin:4px 0 4px">${TRL_ST[x.state][0]}</h2>
    <div class="small muted" style="margin-bottom:12px">${x.state === 'done' ? 'This day counts as trained.' : x.state === 'miss' ? 'A training block was planned and no session was marked done.' : x.state === 'plan' ? 'Planned. It counts once a session is marked done.' : x.state === 'skip' ? 'Logged as skipped.' : x.state === 'pre' ? 'Before you started logging in the War Room. You can still add a session here.' : 'Nothing planned.'}</div>
    ${x.plan.length ? `<div class="sec-h">Planned</div>${x.plan.map((b) => `<div class="trl-p"><span>${b.start}–${b.end} · ${esc(b.title.replace(EMO_RE, '').trim())}</span><span>${fut ? '' : `<button class="btn sm" onclick="trlFromBlock('${k}','${b.id}',true)">Did it ✓</button>`}<button class="btn sm ghost" onclick="trlUnplan('${k}','${b.id}')">${b.once ? 'Unschedule' : 'Not this day'}</button></span></div>`).join('')}` : ''}
    <div class="sec-h" style="margin-top:12px">Sessions</div>
    ${x.ss.length ? x.ss.map((s) => `<div class="trl-p ${trlEmpty(s) ? 'empty' : ''}"><span><b>${esc(sessionLabel(s))}</b>${trlEmpty(s) ? ' <em>· empty, never logged</em>' : ''}<br><span class="xs muted">${[s.startedAt, sessionMinutes(s) ? sessionMinutes(s) + ' min' : '', sessionSets(s) ? sessionSets(s) + ' sets' : '', s.skipped ? 'skipped: ' + esc(s.skipped) : ''].filter(Boolean).join(' · ')}</span></span>
      <span><button class="btn sm ${s.done ? 'primary' : ''}" onclick="trlToggle('${k}','${s.id}')">${s.done ? 'Done ✓' : 'Mark done'}</button><button class="btn sm ghost" onclick="trlEdit('${k}','${s.id}')">Edit</button><button class="btn sm ghost" id="trl-del-${s.id}" onclick="trlDel('${k}','${s.id}')">Delete</button></span></div>`).join('') : '<div class="empty">No sessions logged.</div>'}
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn grow primary" onclick="trlEdit('${k}')">+ ${fut ? 'Add' : 'Log'} a session</button>${fut || k === tk ? `<button class="btn grow" onclick="trlSched('${k}')">Schedule a block</button>` : ''}${!fut ? `<button class="btn grow" onclick="closeModal();curDate=pd('${k}');trainSel=-1;show('train')">Open sets</button>` : ''}</div>`, true);
}
function trlFind(k, id) { const o = day(pd(k)); return { o, ss: sessionsOf(o), s: sessionsOf(o).find((x) => x.id === id) }; }
function trlAfter(o, k) { syncTrainFlags(o); touch(o); render(); if (k) trlOpen(k); }
function trlToggle(k, id) { const { o, s } = trlFind(k, id); if (!s) return; s.done = !s.done; if (s.done) delete s.skipped; trlAfter(o, k); }
function trlDel(k, id) {
  const b = $('trl-del-' + id); if (b && !b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Tap again'; b.classList.add('danger'); setTimeout(() => { if (b) { delete b.dataset.arm; b.textContent = 'Delete'; b.classList.remove('danger'); } }, 3500); return; }
  const { o } = trlFind(k, id); o.workouts = sessionsOf(o).filter((x) => x.id !== id); trainSel = -1; toast('Session deleted'); trlAfter(o, k);
}
function trlFromBlock(k, bid, did) { const d = pd(k), b = blocksFor(d).find((x) => x.id === bid), o = day(d); if (!b) return; const ss = sessionsOf(o); const s = ss.find((x) => x.block === bid) || ss.find(trlEmpty); const prog = b.kind === 'tennis' ? '' : (S.programByDay.map[dow(d)] || ''); const base = { kind: b.kind === 'tennis' ? 'tennis' : 'program', program: prog, label: b.kind === 'tennis' ? b.title.replace(EMO_RE, '').trim() : '', block: b.id, blockTitle: b.title, startedAt: b.start, endedAt: b.end, done: !!did }; if (s) Object.assign(s, base); else ss.push(Object.assign({ id: uid(), sets: {}, note: '' }, base)); toast('Logged: ' + b.title.replace(EMO_RE, '').trim()); trlAfter(o, k); }
function trlUnplan(k, bid) { const d = pd(k), sc = dayOnce(d); if (bid.startsWith('once:') || (sc.add || []).some((b) => b.id === bid)) sc.add = sc.add.filter((b) => b.id !== bid); else if (!sc.skip.includes(bid)) sc.skip.push(bid); touch(day(d)); toast('Removed from ' + fmtShort(d)); render(); trlOpen(k); }

/* ── add / edit ── */
function trlEdit(k, id) {
  const s = id ? trlFind(k, id).s : null, kind = s ? s.kind : 'program', d = pd(k);
  openModal(`<h2>${s ? 'Edit session' : 'Log a session'}</h2>
    <div class="field"><label>Date</label><input id="te-k" type="date" value="${k}"></div>
    <div class="field"><label>What</label><select id="te-kind" onchange="document.getElementById('te-pw').classList.toggle('hidden',this.value!=='program')">${SESSION_KINDS.map(([v, , l]) => `<option value="${v}" ${v === kind ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field ${kind === 'program' ? '' : 'hidden'}" id="te-pw"><label>Program</label><select id="te-prog">${Object.keys(S.programs).filter((p) => !S.programs[p]._del).map((p) => `<option value="${p}" ${(s ? s.program : S.programByDay.map[dow(d)]) === p ? 'selected' : ''}>${esc(S.programs[p].name)}</option>`).join('')}<option value="" ${s && !s.program ? 'selected' : ''}>— free session —</option></select></div>
    <div class="field"><label>Name (optional)</label><input id="te-l" value="${esc(s ? s.label || '' : '')}" placeholder="e.g. TT, OFP, 5 km"></div>
    <div class="g3"><div class="field"><label>Start</label><input id="te-s" type="time" value="${s && s.startedAt ? s.startedAt : ''}"></div><div class="field"><label>Minutes</label><input id="te-m" type="number" inputmode="numeric" value="${s ? sessionMinutes(s) || '' : ''}"></div><div class="field"><label>RPE</label><input id="te-r" type="number" inputmode="numeric" value="${s && s.rpe ? s.rpe : ''}"></div></div>
    <div class="field"><label>Note</label><input id="te-n" value="${esc(s ? s.note || '' : '')}"></div>
    <label class="row" style="gap:8px;margin:6px 0 12px"><input type="checkbox" id="te-d" ${!s || s.done ? 'checked' : ''}> <span>Done (counts as trained)</span></label>
    <button class="btn primary block" onclick="trlSave('${k}','${id || ''}')">Save</button>`);
}
function trlSave(k0, id) {
  const k = $('te-k').value || k0, kind = $('te-kind').value; let s;
  if (id) { const f = trlFind(k0, id); s = f.s; if (k !== k0) { f.o.workouts = f.ss.filter((x) => x.id !== id); syncTrainFlags(f.o); touch(f.o); } }
  const o = day(pd(k)), ss = sessionsOf(o); if (!s || k !== k0) { const e = ss.find(trlEmpty); s = Object.assign(s || { id: uid(), sets: {} }, {}); if (e && !id) ss.splice(ss.indexOf(e), 1); if (!ss.includes(s)) ss.push(s); }
  const m = Number($('te-m').value) || 0;
  Object.assign(s, { kind, program: kind === 'program' ? $('te-prog').value : '', label: $('te-l').value.trim(), startedAt: $('te-s').value, dur: m, rpe: Number($('te-r').value) || 0, note: $('te-n').value.trim(), done: $('te-d').checked });
  if (s.startedAt && m) s.endedAt = (() => { const e = tmin(s.startedAt) + m; return pad(Math.floor(e / 60) % 24) + ':' + pad(e % 60); })();
  if (s.done) delete s.skipped; trainSel = -1; closeModal(); toast(id ? 'Session updated' : 'Session logged'); trlAfter(o, k);
}

/* ── schedule ── */
function trlSched(k) {
  k = k || dk(addDays(new Date(), 1));
  openModal(`<h2>Schedule training</h2><div class="xs muted" style="margin-bottom:10px">Adds a block to that day's plan. It shows on ARC and in the calendar, and counts only once you mark it done.</div>
    <div class="field"><label>Date</label><input id="ts-k" type="date" value="${k}"></div>
    <div class="field"><label>What</label><select id="ts-kind"><option value="train">Strength / gym</option><option value="tennis">Own tennis training</option><option value="train:mobility">Mobility / recovery</option><option value="train:cardio">Run / zone 2</option></select></div>
    <div class="field"><label>Title</label><input id="ts-t" placeholder="e.g. Upper A, TT with coach, 5 km"></div>
    <div class="g2"><div class="field"><label>From</label><input id="ts-s" type="time" value="05:30"></div><div class="field"><label>To</label><input id="ts-e" type="time" value="06:15"></div></div>
    <button class="btn primary block" onclick="trlSchedSave()">Schedule</button>`);
}
function trlSchedSave() {
  const k = $('ts-k').value, kv = $('ts-kind').value, s = $('ts-s').value, e = $('ts-e').value, t = $('ts-t').value.trim();
  if (!k || !s || !e || tmin(e) <= tmin(s)) { toast('Pick a date and a valid time'); return; }
  const d = pd(k), kind = kv.startsWith('train') ? 'train' : 'tennis', label = t || (kv === 'tennis' ? 'Own tennis training' : kv === 'train:mobility' ? 'Mobility' : kv === 'train:cardio' ? 'Zone 2' : 'Strength');
  dayOnce(d).add.push({ id: 'once:' + uid(), title: (kind === 'tennis' ? '🎾 ' : '🏋️ ') + (kind === 'train' ? 'Train: ' : '') + label, start: s, end: e, days: [dow(d)], kind });
  touch(day(d)); closeModal(); toast(`Scheduled ${label} · ${fmtShort(d)} ${s}`); render();
}
