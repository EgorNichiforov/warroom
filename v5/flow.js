/* War Room v5 · One-step actions: doing a thing and recording it are the same tap.
   A routine step with a link opens the input it needs; confirming saves the data, ticks the step,
   ticks the matching standard and updates stats/XP (all derived from the same data). Unticking undoes what it added. */
'use strict';

/* Which steps record what. Matched by link first, then by id/title, so renamed or new steps still connect. */
function stepKind(r) {
  if (!r) return '';
  if (r.link === 'weight' || /weigh/i.test(r.title)) return 'weight';
  if (r.link === 'train' || r.id === 'train' || /🏋|^\W*train\b/i.test(r.title)) return 'train';
  if (r.id === 'eat' || /breakfast|mic dejun/i.test(r.title)) return 'meal';
  if (r.id === 'bac' || /BAC study/i.test(r.title)) return 'bac';
  if (r.id === 'bacmin' || /BAC minutes/i.test(r.title)) return 'bac';
  if (r.id === 'sun' || /sunlight|☀/i.test(r.title)) return 'sun';
  if (r.id === 'dials' || /dials .*logged/i.test(r.title)) return 'dials';
  return '';
}
function routineAll() { return S.routines.morning.concat(S.routines.evening); }
function stepHint(r) { return { weight: 'opens the weight box', train: 'logs today’s session', meal: 'logs your planned breakfast', bac: 'adds the study minutes', sun: 'ticks the Sun standard', dials: 'confirms today’s numbers' }[stepKind(r)] || ''; }

/* the single entry point for tapping a step */
function routineDo(id) {
  const r = routineAll().find((x) => x.id === id); const o = day(curDate);
  if (rState(o, id)) { routineUndo(id); return; }
  const k = stepKind(r);
  if (k === 'weight') return weightModal(id);
  if (k === 'bac') return bacModal(id);
  if (k === 'dials') return dialsModal(id);
  if (k === 'train') return trainDone(id);
  if (k === 'meal') return mealDone(id);
  if (k === 'sun') { o.habits.sun = 1; o.rdata = Object.assign(o.rdata || {}, { [id]: { habit: 'sun' } }); }
  o.routine[id] = 1; touch(o); render(); stepToast(r);
}
function stepToast(r) { const o = day(curDate), items = routineFor(S.routines.morning, curDate), nxt = items.find((x) => !rState(o, x.id)); toast('✓ ' + r.title.replace(/^[^\w]+/, '').slice(0, 40) + (nxt && items.includes(r) ? ' · next: ' + nxt.title.replace(/^[^\w]+/, '').slice(0, 30) : ''), 'Undo', () => routineUndo(r.id)); }
function routineUndo(id) {
  const o = day(curDate), d = (o.rdata || {})[id] || {};
  if (d.bac) o.counters.bac = Math.max(0, (Number(o.counters.bac) || 0) - d.bac);
  if (d.habit) delete o.habits[d.habit];
  if (d.meal && o.meals) o.meals = o.meals.filter((m) => m.id !== d.meal);
  if (d.session) { const ss = sessionsOf(o); const i = ss.findIndex((s) => s.id === d.session); if (i >= 0) ss.splice(i, 1); syncTrainFlags(o); }
  if (o.rdata) delete o.rdata[id];
  o.routine[id] = 0; touch(o); render();
}
function stepMark(id, data) { const o = day(curDate); o.routine[id] = 1; if (data) o.rdata = Object.assign(o.rdata || {}, { [id]: data }); touch(o); render(); stepToast(routineAll().find((x) => x.id === id)); }

/* ⚖️ weight: one sheet, one confirm → weight saved, step ticked, history/avg/streak/XP follow */
function weightModal(id) {
  const o = day(curDate), last = latestWeight(dk(curDate)), v = o.weight != null && o.weight !== '' ? o.weight : (last ? last.w : 75);
  openModal(`<h2>⚖️ Weigh in</h2><div class="small muted" style="margin:-4px 0 10px">${last ? `last ${fmt(last.w, 1)} kg · ${fmtShort(pd(last.k))}` : 'first entry'} · before food and water</div>
    <div class="weigh-big"><button class="stepbtn" onclick="stepWeight(-0.1)">−</button><input id="w-inp" type="number" inputmode="decimal" step="0.1" value="${Number(v).toFixed(1)}" onkeydown="if(event.key==='Enter')weightSave('${id || ''}')"><span class="unit">kg</span><button class="stepbtn" onclick="stepWeight(0.1)">+</button></div>
    <button class="btn primary block lg" onclick="weightSave('${id || ''}')">Save</button><button class="btn ghost block" style="margin-top:6px" onclick="metricDetail('weight',84)">Weight history &amp; trend ›</button>`, true);
  setTimeout(() => { const i = $('w-inp'); if (i) { i.focus(); i.select(); } }, 80);
}
function weightSave(id) {
  const v = num($('w-inp').value); if (v == null || v < 30 || v > 200) { toast('Enter a weight between 30 and 200 kg'); return; }
  const o = day(curDate), prev = latestWeight(dk(addDays(curDate, -1))); o.weight = Math.round(v * 10) / 10; delete o.weighEdit; delete o.weightSkipped;
  routineAll().filter((r) => stepKind(r) === 'weight').forEach((r) => { o.routine[r.id] = 1; });
  touch(o); closeModal(); render();
  const a7 = avgWeight(7, dk(curDate)); toast(`${fmt(v, 1)} kg saved${prev ? ` · ${v - prev.w >= 0 ? '+' : ''}${fmt(v - prev.w, 1)} vs last` : ''}${a7 ? ` · 7-day avg ${fmt(a7, 1)}` : ''}`);
}

/* 🏋️ train: logs today's programme as done (or opens the Train tab to log sets) */
function trainDone(id) {
  const o = day(curDate), prog = S.programs[S.programByDay.map[dow(curDate)]];
  const already = sessionsRO(o).find((s) => s.done); if (already) { stepMark(id); return; }
  openModal(`<h2>🏋️ Train</h2><div class="small muted" style="margin:-4px 0 12px">${prog ? 'Today: <b>' + esc(prog.name) + '</b>' : 'No programme set for today.'}</div>
    <button class="btn primary block lg" onclick="trainDoneQuick('${id}')">Done ✓ (log the session)</button>
    <button class="btn block" style="margin-top:8px" onclick="closeModal();show('train')">Log sets and weights first</button>
    <button class="btn ghost block" style="margin-top:8px" onclick="closeModal();skipRoutine('${id}')">Didn't happen</button>`, true);
}
function trainDoneQuick(id) {
  const o = day(curDate), pid = S.programByDay.map[dow(curDate)] || '', sid = uid(), t = new Date();
  sessionsOf(o).push({ id: sid, kind: 'program', program: pid, sets: {}, done: true, note: 'logged from the routine', endedAt: pad(t.getHours()) + ':' + pad(t.getMinutes()), quick: true });
  syncTrainFlags(o); closeModal(); stepMark(id, { session: sid });
}

/* 🍳 breakfast: logs the planned breakfast (calories + protein) in one tap */
function mealDone(id) {
  const st = foodState(), x = st.saved.find((m) => /breakfast|mic dejun/i.test(m.name));
  if (!x) { stepMark(id); return; }
  const o = day(curDate), mid = uid(), t = new Date();
  meals(curDate).push({ id: mid, t: pad(t.getHours()) + ':' + pad(t.getMinutes()), name: x.name, kcal: x.kcal, p: x.p, c: x.c || 0, f: x.f || 0, src: 'routine' });
  stepMark(id, { meal: mid });
}

/* 📚 BAC: pick the minutes, they go into the BAC counter */
function bacModal(id) {
  openModal(`<h2>📚 BAC</h2><div class="small muted" style="margin:-4px 0 12px">How many minutes did you study?</div><div class="chips">${[25, 50, 75, 90].map((m) => `<span class="chip" onclick="bacSave('${id}',${m})">${m} min</span>`).join('')}</div>
    <div class="field" style="margin-top:12px"><div class="inline"><input id="bac-m" type="number" inputmode="numeric" placeholder="other"><button class="btn primary" onclick="bacSave('${id}',Number(document.getElementById('bac-m').value)||0)">Save</button></div></div>
    <button class="btn ghost block" onclick="closeModal();stepMark('${id}')">Already logged · just tick it</button>`, true);
}
function bacSave(id, m) { if (!(m > 0)) { toast('Enter the minutes'); return; } const o = day(curDate); o.counters.bac = (Number(o.counters.bac) || 0) + m; closeModal(); stepMark(id, { bac: m }); }

/* 📞 evening: confirm today's numbers in one sheet */
function dialsModal(id) {
  const o = day(curDate);
  openModal(`<h2>📞 Today's numbers</h2><div class="g2"><div class="field"><label>Dials</label><input id="dm-d" type="number" inputmode="numeric" value="${Number(o.counters.dials) || 0}"></div><div class="field"><label>Owner conversations</label><input id="dm-o" type="number" inputmode="numeric" value="${Number(o.counters.owners) || 0}"></div></div>
    <div class="xs muted" style="margin-bottom:10px">Target today: ${dialTargetFor(curDate)} dials. Logged dials from the Dial screen are already counted.</div><button class="btn primary block lg" onclick="dialsSave('${id}')">Confirm</button>`, true);
}
function dialsSave(id) { const o = day(curDate); o.counters.dials = Math.max(0, num($('dm-d').value) || 0); o.counters.owners = Math.max(0, num($('dm-o').value) || 0); closeModal(); stepMark(id); }
