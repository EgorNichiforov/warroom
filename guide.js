/* War Room · guide.js (13.4.0, owner request 17 Nov 2026)
   "The home screen walks me through the whole day. One step at a time, Done → next, so I never forget to track anything."
   GUIDE sits on top of the Day screen (ARC). It turns today into an ordered list of steps:
     wake → weigh-in → every training (with its exercises and videos) → every block that needs a tick → attendance after
     every group lesson → … → SHUTDOWN.
   The step on screen is always the earliest one that isn't handled yet, so a missed step can't scroll out of sight:
   you do it or you skip it. Shutdown walks through whatever is still open, then numbers, money, standards, the daily
   log, tomorrow and lights out. Everything else in the app is untouched and still one tap away. */
'use strict';

let gdSD = false, gdFocusId = null, gdAtt = {}, gdW = null;
function gdOn() { try { return localStorage.getItem('wr-guide') !== 'off'; } catch (e) { return true; } }
function gdSet(on) { try { localStorage.setItem('wr-guide', on ? 'on' : 'off'); } catch (e) { } if (typeof arcRender === 'function') arcRender(); }
function gdDayDate() { const n = new Date(); return n.getHours() < 4 ? addDays(n, -1) : n; }
function gdClean(t) { return String(t || '').replace(typeof EMO_RE !== 'undefined' ? EMO_RE : /^\W+/, '').trim(); }
function gdEvent(b) { if (!b || !String(b.id).startsWith('cal:') || typeof calFind !== 'function') return null; return calFind(String(b.id).slice(4)); }
function gdDesc(b) { const e = gdEvent(b); return (e && e.desc) || b.note || ''; }
function gdBuzz(p) { try { navigator.vibrate && navigator.vibrate(p || 10); } catch (e) { } }

/* ── what kind of step a block is ── */
function gdType(b) {
  const t = b.title || '';
  if (/shutdown/i.test(t)) return 'shutdownblk';
  if (/weigh/i.test(t)) return 'weighblk';
  if (/grup/i.test(t)) return 'group';
  if (typeof isTrainBlock === 'function' && isTrainBlock(b)) return 'train';
  if (b.kind === 'dials') return 'dials';
  if (b.kind === 'bac') return 'bac';
  if (/sun/i.test(t) || /☀/.test(t)) return 'sun';
  if (b.kind === 'learn' || /^(Learn|Deep dive|Call review)\b|Story Card/i.test(gdClean(t))) return 'learn';
  if (b.kind === 'food') return 'food';
  return 'task';
}
function gdSkipBlock(b) { const t = b.title || ''; return b.kind === 'travel' || /🏫|^\s*shower\s*$|😴|^\s*sleep\s*$/i.test(t) || /usually skipped/i.test(b.note || ''); }

/* ── the steps of a day ── */
function gdSteps(d) {
  d = d || gdDayDate(); const k = dk(d), o = day(k), out = [], blk = o.blk || {};
  const wake = (typeof wakeFor === 'function' ? wakeFor(d) : S.settings.wake) || '05:20';
  const L = (typeof arcBlocks === 'function' ? arcBlocks(d) : blocksFor(d)).filter((b) => !gdSkipBlock(b));
  out.push({ id: 'wake', t: wake, type: 'wake', title: "I'm up", st: o.wokeAt || o.sleepState === 'done' ? 'done' : blk.wake === 'skip' ? 'skip' : '' });
  const wb = L.find((b) => gdType(b) === 'weighblk');
  out.push({ id: 'weight', t: wb ? wb.start : wake, type: 'weight', title: 'Weigh in', st: o.weight != null && o.weight !== '' ? 'done' : o.weightSkipped ? 'skip' : '' });
  let dialsCum = 0; const dialsNow = Number((o.counters || {}).dials) || 0;
  L.forEach((b) => {
    const ty = gdType(b); if (ty === 'weighblk' || ty === 'shutdownblk') return;
    let st = blk[b.id] === 'done' ? 'done' : blk[b.id] === 'skip' || blk[b.id] === 'miss' ? 'skip' : '';
    if (ty === 'train') { const s = sessionsRO(o).find((x) => x.block === b.id || (x.blockTitle && x.blockTitle === b.title)); if (s && s.done) st = 'done'; else if (s && s.skipped) st = 'skip'; }
    if (ty === 'group') { const a = (o.att || {})[b.id]; if (a) st = a.cancel ? 'skip' : 'done'; }
    if (ty === 'dials') { const m = b.title.match(/DIALS?:\s*(\d+)/i); dialsCum += m ? +m[1] : 0; if (!st && dialsCum && dialsNow >= dialsCum) st = 'done'; }
    if (ty === 'sun' && o.habits && o.habits.sun && !st) st = 'done';
    out.push({ id: b.id, t: b.start, end: b.end, type: ty, title: gdClean(b.title), b, st, dialsCum });
  });
  out.push({ id: 'shutdown', t: (L.find((b) => gdType(b) === 'shutdownblk') || {}).start || hmOf(tmin(S.settings.bed || '21:00') - 15), type: 'shutdown', title: 'Shutdown', st: o.shutdownAt ? 'done' : '' });
  return out.sort((a, b) => (a.type === 'shutdown') - (b.type === 'shutdown') || tmin(a.t) - tmin(b.t));
}
/* the step on screen: one you picked, else the earliest open step whose time has come, else the next one */
function gdCurrent(S2, d) {
  const nm = nowMin(), isT = dk(d) === dk(new Date()), open = S2.filter((s) => !s.st);
  if (gdFocusId) { const f = S2.find((s) => s.id === gdFocusId); if (f) return { s: f, early: false, picked: true }; gdFocusId = null; }
  const due = open.filter((s) => !isT || tmin(s.t) <= nm + 10 || s.type === 'wake' || s.type === 'weight');
  const hit = due.filter((s) => s.type !== 'shutdown')[0] || (due.find((s) => s.type === 'shutdown')) || null;
  if (hit) return { s: hit, early: false };
  const nx = open[0]; return nx ? { s: nx, early: true } : null;
}

/* ── mark ── */
function gdMark(id, st) {
  const o = day(gdDayDate()); o.blk = o.blk || {};
  if (id === 'weight') { if (st === 'skip') o.weightSkipped = 1; }
  else o.blk[id] = st;
  if (st === 'done') { const s = gdSteps().find((x) => x.id === id); if (s && s.type === 'sun') o.habits.sun = 1; }
  touch(o); gdFocusId = null; gdBuzz(st === 'done' ? [12, 40, 12] : 8); gdNext(st === 'done' ? 'Done.' : 'Skipped.');
}
function gdUndo(id) { const o = day(gdDayDate()); if (id === 'weight') { delete o.weightSkipped; o.weight = ''; } else if (o.blk) delete o.blk[id]; if (o.att) delete o.att[id]; const ss = sessionsRO(o).find((x) => x.block === id); if (ss) { ss.done = false; ss.skipped = false; if (typeof syncTrainFlags === 'function') syncTrainFlags(o); } touch(o); gdFocusId = id; gdRender(); }
function gdNext(msg) {
  const L = gdSteps(), c = gdCurrent(L, gdDayDate()); toast(msg + (c && c.s ? ' Next: ' + c.s.title : ' Day handled.'));
  gdRender(); const el = document.getElementById('gd'); if (el) { el.classList.remove('gd-in'); void el.offsetWidth; el.classList.add('gd-in'); }
}
function gdRender() { if (typeof arcRender !== 'function') return; arcRender._force = 1; try { arcRender(); } finally { arcRender._force = 0; } }
function gdPick(id) { gdFocusId = id; gdBuzz(5); gdRender(); setTimeout(() => { const el = document.getElementById('gd'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); }

/* weight */
function gdWStep(dv) { const i = document.getElementById('gd-w'); if (!i) return; const v = Math.round(((parseFloat(i.value) || 0) + dv) * 10) / 10; i.value = v.toFixed(1); gdW = v; gdBuzz(4); }
function gdWSave() {
  const i = document.getElementById('gd-w'), v = num(i ? i.value : gdW); if (v == null || v < 30 || v > 200) { toast('Weight between 30 and 200 kg'); return; }
  const k = dk(gdDayDate()), o = day(k), prev = typeof latestWeight === 'function' ? latestWeight(dk(addDays(pd(k), -1))) : null;
  o.weight = Math.round(v * 10) / 10; delete o.weightSkipped; delete o.weighEdit;
  try { routineAll().filter((r) => stepKind(r) === 'weight').forEach((r) => { o.routine[r.id] = 1; }); } catch (e) { }
  touch(o); gdW = null; gdFocusId = null; gdBuzz([12, 40, 12]); gdNext(`${fmt(v, 1)} kg${prev ? ` (${v - prev.w >= 0 ? '+' : ''}${fmt(v - prev.w, 1)})` : ''}.`);
}

/* training */
function gdTrainSession(b, o) {
  const ss = sessionsOf(o), d = gdDayDate(); let s = ss.find((x) => x.block === b.id || (x.blockTitle && x.blockTitle === b.title));
  if (!s) { const prog = typeof blockProgram === 'function' ? blockProgram(b, d) : null; s = prog != null ? { id: uid(), kind: 'program', program: prog, label: '', block: b.id, blockTitle: b.title, sets: {}, done: false, note: '', startedAt: b.start } : { id: uid(), kind: 'tennis', program: '', label: gdClean(b.title), block: b.id, blockTitle: b.title, sets: {}, done: false, note: '', startedAt: b.start }; ss.push(s); }
  return s;
}
function gdTrain(id, st) {
  const o = day(gdDayDate()), b = gdSteps().find((x) => x.id === id); if (!b || !b.b) return; const s = gdTrainSession(b.b, o);
  if (st === 'done') { s.done = true; s.skipped = false; s.doneAt = now(); } else { s.skipped = true; s.done = false; }
  if (typeof syncTrainFlags === 'function') syncTrainFlags(o); o.blk = o.blk || {}; o.blk[id] = st; touch(o); gdFocusId = null; gdBuzz(st === 'done' ? [12, 40, 12] : 8); gdNext(st === 'done' ? 'Training logged.' : 'Training skipped.');
}
function gdWorkout(id) { if (typeof arcHide === 'function') arcHide(true); openBlockTraining(id, dk(gdDayDate())); }
function gdParseTrain(desc) {
  const lines = String(desc || '').split('\n').map((x) => x.trim()), vids = [], ex = [];
  let inV = false;
  lines.forEach((l) => {
    if (/^VIDEOS?$/i.test(l)) { inV = true; return; }
    const v = l.match(/^(.+?)\s*▶\s*(https?:\/\/\S+)/);
    if (v) { vids.push([v[1].replace(/^[A-Z]\d?\.\s*/, '').trim(), v[2]]); if (!inV && /^[A-Z]\d?\.\s/.test(l)) ex.push(l.replace(/\s*▶.*$/, '')); return; }
    if (inV) return;
    if (/^(WARM-UP|[A-Z]\d?\.)\s/.test(l) || /^→/.test(l)) ex.push(l);
  });
  return { ex, vids };
}
function gdVid(u) { try { window.open(u, '_blank', 'noopener'); } catch (e) { location.href = u; } }

/* group attendance: roster comes from the calendar event ("☐ Name" lines) */
function gdRoster(b) { return String(gdDesc(b)).split('\n').map((l) => l.trim()).filter((l) => /^[☐✅❌✔✓✗□▢-]\s*\S/.test(l)).map((l) => l.replace(/^[☐✅❌✔✓✗□▢-]\s*/, '').trim()).filter(Boolean); }
function gdAttTog(id, i) { const d = gdAtt[id]; if (!d) return; d[i] = d[i] ? 0 : 1; gdBuzz(6); gdRender(); }
function gdAttSave(id) {
  const s = gdSteps().find((x) => x.id === id); if (!s) return; const names = gdRoster(s.b), d = gdAtt[id] || names.map(() => 1), o = day(gdDayDate());
  o.att = o.att || {}; o.att[id] = { group: s.title, date: dk(gdDayDate()), at: now(), kids: Object.fromEntries(names.map((n, i) => [n, d[i] ? 1 : 0])) };
  o.blk = o.blk || {}; o.blk[id] = 'done'; touch(o); delete gdAtt[id]; gdFocusId = null; gdBuzz([12, 40, 12]);
  const p = names.filter((n, i) => d[i]).length; gdNext(`${s.title}: ${p}/${names.length} present.`);
}
function gdAttCancel(id) { if (!confirm('Lesson did not happen today?')) return; const s = gdSteps().find((x) => x.id === id), o = day(gdDayDate()); o.att = o.att || {}; o.att[id] = { group: s ? s.title : '', date: dk(gdDayDate()), at: now(), cancel: 1 }; o.blk = o.blk || {}; o.blk[id] = 'skip'; touch(o); gdFocusId = null; gdNext('Lesson marked as not held.'); }

/* dials / BAC */
function gdAdd(k, v) { const o = day(gdDayDate()); o.counters[k] = Math.max(0, (Number(o.counters[k]) || 0) + v); touch(o); gdBuzz(6); gdRender(); }
function gdBacDone(id, mins) { const o = day(gdDayDate()); o.counters.bac = (Number(o.counters.bac) || 0) + mins; o.blk = o.blk || {}; o.blk[id] = 'done'; touch(o); gdFocusId = null; gdBuzz([12, 40, 12]); gdNext(`+${mins} min BAC.`); }
function gdGo(code) { if (typeof arcGo === 'function') arcGo(code); }

/* ── shutdown ── */
const GD_SD = [['num', 'Numbers'], ['money', 'Money today'], ['habits', 'Standards'], ['log', 'Daily log'], ['tomorrow', 'Tomorrow']];
function gdSDStart() { gdSD = true; gdFocusId = null; gdBuzz(10); gdRender(); setTimeout(() => { const el = document.getElementById('gd'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); }
function gdSDMark(k) { const o = day(gdDayDate()); o.sd = o.sd || {}; o.sd[k] = now(); touch(o); gdBuzz(10); gdRender(); }
function gdSDBack() { const o = day(gdDayDate()), done = GD_SD.filter(([k]) => (o.sd || {})[k]); if (!done.length) { gdSD = false; gdRender(); return; } delete o.sd[done[done.length - 1][0]]; touch(o); gdRender(); }
function gdLog(f, v) { const o = day(gdDayDate()); o.dayLog = o.dayLog || {}; o.dayLog[f] = v; o._u = now(); save(); }
function gdLightsOut() {
  const o = day(gdDayDate()); o.shutdownAt = now(); ['dials', 'bacmin', 'tomorrow'].forEach((id) => { if (S.routines && S.routines.evening && S.routines.evening.find((r) => r.id === id)) o.routine[id] = 1; }); touch(o); gdSD = false;
  if (typeof lightsOut === 'function') lightsOut(); else toast('Day closed. Phone out.');
}
function gdSpendsToday() { const k = dk(gdDayDate()); return Object.values(S.txns || {}).filter((t) => t && !t._del && t.date === k && (t.type === 'out' || t.type === 'in')); }
function gdSDBody(o, d, k, openSteps) {
  if (openSteps.length) {
    const s = openSteps[0];
    return { k: `Shutdown · still open ${openSteps.length}`, h: gdStepBody(s, o, d, true) };
  }
  const sd = o.sd || {}, cur = GD_SD.find(([x]) => !sd[x]);
  if (!cur) {
    const tm = addDays(d, 1), first = blocksFor(tm).filter((b) => !gdSkipBlock(b))[0];
    return { k: 'Shutdown · done', h: `<div class="gd-t">Lights out.</div><div class="gd-s">Everything for ${DAY_LONG[dow(d)]} is tracked. Magnesium, water, phone out of the room.${first ? `<br>Tomorrow starts ${first.start}: ${esc(gdClean(first.title))}. Wake ${typeof wakeFor === 'function' ? wakeFor(tm) : ''}.` : ''}</div><button class="gd-btn" onclick="gdLightsOut()">Lights out</button><button class="gd-lnk" onclick="gdSDBack()">← Back</button>` };
  }
  const n = GD_SD.indexOf(cur) + 1, w = dow(d); let h = '';
  if (cur[0] === 'num') h = `<div class="gd-t">Today's numbers</div><div class="gd-s">Honest. Don't round up.</div>${S.counters.items.map((c) => { const v = Number(o.counters[c.id]) || 0, t = c.targets ? c.targets[w] || 0 : 0; return `<div class="gd-num"><span>${esc(gdClean(c.title))}${t ? ` <i>/ ${t}</i>` : ''}</span><button onclick="gdAdd('${c.id}',-1)">−</button><input type="number" inputmode="numeric" value="${v}" onchange="day('${k}').counters['${c.id}']=Math.max(0,Number(this.value)||0);touch(day('${k}'))"><button onclick="gdAdd('${c.id}',1)">+</button></div>`; }).join('')}`;
  if (cur[0] === 'money') { const L = gdSpendsToday(); h = `<div class="gd-t">Money today</div><div class="gd-s">Every lei you spent or earned today. Cash too.</div>${L.length ? L.map((t) => `<div class="gd-row" onclick="mnEdit('${t.id}')"><b class="${t.type === 'in' ? 'ok' : ''}">${t.type === 'in' ? '+' : '−'}${fmt(t.amt)}</b><span>${esc(t.note || t.cat || '')}</span></div>`).join('') : '<div class="gd-s" style="opacity:.7">Nothing logged yet.</div>'}<div class="gd-two"><button class="gd-btn2" onclick="mnEdit(null,{type:'out'})">+ Spent</button><button class="gd-btn2" onclick="mnEdit(null,{type:'in',cat:'tennis'})">+ Earned</button></div>`; }
  if (cur[0] === 'habits') h = `<div class="gd-t">Standards</div><div class="gd-s">Tap the ones you kept.</div><div class="gd-kids">${S.habits.items.map((x) => `<button class="${o.habits[x.id] ? 'on' : ''}" onclick="day('${k}').habits['${x.id}']=day('${k}').habits['${x.id}']?0:1;touch(day('${k}'));gdBuzz(6);gdRender()"><i>${o.habits[x.id] ? '✓' : ''}</i>${esc(x.title)}</button>`).join('')}</div>`;
  if (cur[0] === 'log') { const L = o.dayLog || {}; h = `<div class="gd-t">Daily log</div><div class="gd-s">Two minutes. One line each.</div>${[['txt', 'What happened today'], ['lesson', 'Lesson'], ['first', "Tomorrow's first action"], ['gym', 'Communication Gym: one interesting or funny thing']].map(([f, l]) => `<label class="gd-f"><span>${l}</span><textarea class="gd-live" rows="2" oninput="gdLog('${f}',this.value)">${esc(L[f] || '')}</textarea></label>`).join('')}`; }
  if (cur[0] === 'tomorrow') { const tm = addDays(d, 1), bl = blocksFor(tm).filter((b) => !gdSkipBlock(b)).slice(0, 6); h = `<div class="gd-t">Tomorrow</div><div class="gd-s">${DAY_LONG[dow(tm)]} · wake ${typeof wakeFor === 'function' ? wakeFor(tm) : ''}${typeof dialTargetFor === 'function' && dialTargetFor(tm) ? ` · ${dialTargetFor(tm)} dials` : ''}</div>${bl.map((b) => `<div class="gd-row"><b>${b.start}</b><span>${esc(gdClean(b.title))}</span></div>`).join('')}<button class="gd-lnk" onclick="startShutdown()">Something changes tomorrow? Adjust it →</button>`; }
  return { k: `Shutdown · ${n} of ${GD_SD.length} · ${cur[1]}`, h: h + `<button class="gd-btn" onclick="gdSDMark('${cur[0]}')">${cur[0] === 'money' ? 'That\'s everything' : 'Next'}</button><button class="gd-lnk" onclick="gdSDBack()">← Back</button>` };
}

/* ── the card for one step ── */
function gdStepBody(s, o, d, inSD) {
  const k = dk(d), desc = s.b ? gdDesc(s.b) : '', head = (s.end ? `${s.t}–${s.end}` : s.t), skip = `<button class="gd-lnk" onclick="gdMark('${s.id}','skip')">Skip</button>`;
  const doneBtn = (lbl) => `<button class="gd-btn" onclick="gdMark('${s.id}','done')">${lbl || 'Done'}</button>`;
  const lines = (n) => desc ? `<div class="gd-d">${esc(desc.split('\n').filter((l) => l.trim() && !/https?:\/\//.test(l)).slice(0, n).join('\n'))}</div>` : '';
  if (s.type === 'wake') return `<div class="gd-t">Good morning.</div><div class="gd-s">Tap the moment you're up. Then the scale.</div><button class="gd-btn" onclick="wokeUp();setTimeout(gdRender,60)">I'm up</button>${skip}`;
  if (s.type === 'weight') {
    const last = typeof latestWeight === 'function' ? latestWeight(dk(addDays(d, -1))) : null, v = gdW != null ? gdW : last ? last.w : 77;
    return `<div class="gd-t">Weigh in</div><div class="gd-s">Toilet → scale, before food and water.${last ? ` Last: ${fmt(last.w, 1)} kg.` : ''}</div>
      <div class="gd-w"><button onclick="gdWStep(-0.1)">−</button><input id="gd-w" class="gd-live" type="number" inputmode="decimal" step="0.1" value="${Number(v).toFixed(1)}" oninput="gdW=parseFloat(this.value)" onkeydown="if(event.key==='Enter')gdWSave()"><span>kg</span><button onclick="gdWStep(0.1)">+</button></div>
      <button class="gd-btn" onclick="gdWSave()">Save weight</button><button class="gd-lnk" onclick="gdMark('weight','skip')">Not today</button>`;
  }
  if (s.type === 'train') {
    const P = gdParseTrain(desc), prog = (() => { try { return trProgName(s.b); } catch (e) { return ''; } })();
    return `<div class="gd-k2">${head}${prog ? ' · ' + esc(prog) : ''}</div><div class="gd-t">${esc(s.title)}</div>
      ${P.ex.length ? `<ol class="gd-ex">${P.ex.slice(0, 12).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : lines(4)}
      ${P.vids.length ? `<div class="gd-vids">${P.vids.slice(0, 16).map(([n, u]) => `<button onclick='gdVid(${JSON.stringify(u)})'>▶ ${esc(n)}</button>`).join('')}</div>` : ''}
      <div class="gd-two"><button class="gd-btn2" onclick="gdWorkout('${s.id}')">Open workout · log sets</button></div>
      <button class="gd-btn" onclick="gdTrain('${s.id}','done')">Done · trained</button><button class="gd-lnk" onclick="gdTrain('${s.id}','skip')">Skip today</button>`;
  }
  if (s.type === 'group') {
    const names = gdRoster(s.b); if (!gdAtt[s.id]) gdAtt[s.id] = names.map(() => 1); const a = gdAtt[s.id], p = a.filter(Boolean).length;
    return `<div class="gd-k2">${head} · attendance</div><div class="gd-t">${esc(s.title)}</div><div class="gd-s">Everyone starts as present. Tap who was absent.</div>
      ${names.length ? `<div class="gd-kids">${names.map((n, i) => `<button class="${a[i] ? 'on' : 'off'}" onclick="gdAttTog('${s.id}',${i})"><i>${a[i] ? '✓' : '✗'}</i>${esc(n)}</button>`).join('')}</div>` : '<div class="gd-s">No names in the calendar event. Add "☐ Name" lines to its description.</div>'}
      <button class="gd-btn" onclick="gdAttSave('${s.id}')">Save · ${p}/${names.length} present</button><button class="gd-lnk" onclick="gdAttCancel('${s.id}')">Lesson didn't happen</button>`;
  }
  if (s.type === 'dials') {
    const m = s.title.match(/DIALS?:\s*(\d+)/i), c = o.counters || {}, dn = Number(c.dials) || 0, ow = Number(c.owners) || 0;
    return `<div class="gd-k2">${head}</div><div class="gd-t">${esc(s.title)}</div><div class="gd-big">${dn}<i>/ ${s.dialsCum || (m ? m[1] : '')} dials</i></div><div class="gd-s">${ow} owner talk${ow === 1 ? '' : 's'} today. First dial inside 2 minutes.</div>
      <div class="gd-two"><button class="gd-btn2" onclick="gdAdd('dials',1)">+1 dial</button><button class="gd-btn2" onclick="gdAdd('dials',5)">+5</button><button class="gd-btn2" onclick="gdAdd('owners',1)">+1 owner</button></div>
      <button class="gd-btn" onclick="gdGo('oneGo(&quot;dial&quot;)')">Open the dialer</button>${doneBtn('Block done').replace('gd-btn', 'gd-btn ghost')}${skip}`;
  }
  if (s.type === 'bac') { const mins = Math.max(5, tmin(s.end || s.t) - tmin(s.t)) || 25; return `<div class="gd-k2">${head} · ${mins} min</div><div class="gd-t">${esc(s.title)}</div>${lines(6)}${S.timer ? '<div class="gd-s"><b>Timer running.</b></div>' : `<div class="gd-two"><button class="gd-btn2" onclick="gdGo('oneGo(&quot;timer&quot;,&quot;bac&quot;,${mins})')">Start ${mins} min timer</button></div>`}<button class="gd-btn" onclick="gdBacDone('${s.id}',${mins})">Done · +${mins} min BAC</button>${skip}`; }
  if (s.type === 'sun') return `<div class="gd-k2">${head}</div><div class="gd-t">${esc(s.title)}</div><div class="gd-s">Outside, no sunglasses. Cloudy = stay longer.</div>${doneBtn('Done · got sun')}${skip}`;
  if (s.type === 'learn') { const rv = /call review/i.test(s.title); return `<div class="gd-k2">${head}</div><div class="gd-t">${esc(s.title)}</div>${lines(rv ? 6 : 7)}${doneBtn(rv ? 'Done · call scored' : /deep dive/i.test(s.title) ? 'Done · 4 lines + talk recorded' : 'Done · card written')}${skip}`; }
  if (s.type === 'food') return `<div class="gd-k2">${head}</div><div class="gd-t">${esc(s.title)}</div>${lines(5)}${doneBtn('Ate it')}<button class="gd-lnk" onclick="gdMark('${s.id}','skip')">Ate something else</button>`;
  if (s.type === 'shutdown') return `<div class="gd-t">Shutdown</div><div class="gd-s">It walks you through everything still open, then numbers, money, standards, the log and tomorrow. 7 minutes.</div><button class="gd-btn" onclick="gdSDStart()">Start shutdown</button>`;
  return `<div class="gd-k2">${head}</div><div class="gd-t">${esc(s.title)}</div>${lines(5)}${doneBtn()}${skip}`;
}

/* ── the panel ── */
function gdHtml() {
  if (!gdOn()) return '';
  const d = gdDayDate(), k = dk(d), o = day(k), L = gdSteps(d), done = L.filter((s) => s.st).length, pct = Math.round((done / L.length) * 100);
  let K = '', H = '', curId = '';
  if (o.shutdownAt && !gdSD) { K = 'Day closed'; H = `<div class="gd-t">Done for today.</div><div class="gd-s">${done}/${L.length} steps handled. Sleep.</div>`; }
  else if (gdSD) { const open = L.filter((s) => !s.st && s.type !== 'shutdown'); const r = gdSDBody(o, d, k, open); K = r.k; H = r.h; curId = open[0] ? open[0].id : 'shutdown'; }
  else {
    const c = gdCurrent(L, d);
    if (!c) { K = 'All handled'; H = `<div class="gd-t">Nothing open.</div>`; }
    else { const i = L.indexOf(c.s) + 1, m = tmin(c.s.t) - nowMin(); curId = c.s.id;
      K = c.early ? `Next · ${c.s.t} · in ${m >= 60 ? Math.floor(m / 60) + 'h ' : ''}${m % 60} min` : `Step ${i} of ${L.length}${c.s.t && tmin(c.s.t) < nowMin() - 30 && !c.picked && c.s.type !== 'shutdown' ? ' · still open from ' + c.s.t : ''}`;
      H = gdStepBody(c.s, o, d) + (c.picked ? `<button class="gd-lnk" onclick="gdFocusId=null;gdRender()">Back to the current step</button>` : ''); }
  }
  const late = nowMin() >= tmin(S.settings.bed || '21:00') - 30 || nowMin() < 240;
  const list = L.map((s) => `<button class="gd-li ${s.st ? 's-' + s.st : ''} ${s.id === curId ? 'cur' : ''}" onclick="${s.st ? `gdUndoAsk('${s.id}')` : `gdPick('${s.id}')`}"><b>${s.t}</b><span>${esc(s.title)}</span><i>${s.st === 'done' ? '✓' : s.st === 'skip' ? '–' : s.id === curId ? '●' : ''}</i></button>`).join('');
  return `<section id="gd" class="gd ${gdSD ? 'sd' : ''}">
    <div class="gd-top"><span>${esc(K)}</span>${!gdSD && !o.shutdownAt ? `<button class="gd-sdb ${late ? 'hot' : ''}" onclick="gdSDStart()">Shutdown</button>` : gdSD ? `<button class="gd-sdb" onclick="gdSD=false;gdRender()">Exit</button>` : ''}</div>
    <div class="gd-bar"><u style="width:${pct}%"></u></div><div class="gd-cnt">${done}/${L.length} tracked today</div>
    <div class="gd-card">${H}</div>
    <details class="gd-all"><summary>All steps today</summary>${list}</details></section>`;
}
function gdUndoAsk(id) { if (confirm('Open this step again?')) gdUndo(id); }

/* sits right under the date on the Day screen; the rest of the Day screen stays below it */
if (typeof arcHtml === 'function' && !arcHtml._gd) {
  const _h = arcHtml;
  arcHtml = function () {
    let h = _h(); try {
      const g = gdHtml(); if (!g) return h;
      const i = h.indexOf('<div class="arc-top">'); if (i < 0) return g + h;
      let depth = 0, j = i; const re = /<\/?div\b[^>]*>/g; re.lastIndex = i; let m;
      while ((m = re.exec(h))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) { j = m.index + m[0].length; break; } }
      h = h.slice(0, j) + g + h.slice(j);
    } catch (e) { console.warn('guide', e); }
    return h;
  };
  arcHtml._gd = 1;
}
/* don't wipe what you're typing: the Day screen refreshes every 30 s */
if (typeof arcRender === 'function' && !arcRender._gd) {
  const _r = arcRender;
  arcRender = function () { const a = document.activeElement; if (a && a.closest && a.closest('#gd') && /input|textarea/i.test(a.tagName) && !arcRender._force) return; return _r.apply(this, arguments); };
  arcRender._gd = 1;
}
/* a switch in Settings */
if (typeof appearanceCard === 'function' && !appearanceCard._gd) {
  const _a = appearanceCard;
  appearanceCard = function () { const on = gdOn(); return `<div class="card"><div class="card-h"><div class="card-t">Guided day</div><div class="card-r">this device</div></div><div class="small muted" style="margin-bottom:10px">The Day screen walks you through today one step at a time: weigh-in, training, attendance, everything, then shutdown.</div><div class="row" style="gap:8px"><button class="btn grow ${on ? 'primary' : ''}" onclick="gdSet(true);render()">On</button><button class="btn grow ${on ? '' : 'primary'}" onclick="gdSet(false);render()">Off</button></div></div>` + _a(); };
  appearanceCard._gd = 1;
}

(function () {
  const s = document.createElement('style');
  s.textContent = `#arc .gd{margin:14px 0 6px;scroll-margin-top:12px}
  #arc .gd-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
  #arc .gd-top span{font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--acc)}
  #arc .gd-sdb{border:1px solid var(--ln);background:transparent;color:var(--mut);font:inherit;font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:7px 12px;border-radius:8px;cursor:pointer}
  #arc .gd-sdb.hot{border-color:var(--acc);color:var(--acc)}
  #arc .gd-bar{height:3px;background:var(--ln);margin:10px 0 4px;overflow:hidden}#arc .gd-bar u{display:block;height:100%;background:var(--acc);transition:width .5s cubic-bezier(.2,.8,.2,1)}
  #arc .gd-cnt{font-size:11px;color:var(--mut);margin-bottom:10px;font-variant-numeric:tabular-nums}
  #arc .gd-card{background:var(--card);border:1px solid var(--ln);border-left:3px solid var(--acc);padding:18px 18px 14px}
  #arc .gd.gd-in .gd-card{animation:gdIn .35s cubic-bezier(.2,.8,.2,1)}@keyframes gdIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){#arc .gd.gd-in .gd-card{animation:none}}
  #arc .gd-k2{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums;margin-bottom:4px}
  #arc .gd-t{font-family:'Barlow Semi Condensed','Space Grotesk',sans-serif;font-weight:700;font-size:30px;line-height:1.02;text-transform:uppercase;letter-spacing:.01em;margin-bottom:8px}
  #arc .gd-s{font-size:15px;line-height:1.45;color:var(--mut);margin-bottom:14px}
  #arc .gd-d{white-space:pre-line;font-size:14px;line-height:1.5;color:var(--mut);margin-bottom:14px}
  #arc .gd-big{font-family:'Barlow Semi Condensed',sans-serif;font-size:56px;font-weight:700;line-height:1;margin:2px 0 6px;font-variant-numeric:tabular-nums}#arc .gd-big i{font-style:normal;font-size:16px;color:var(--mut);margin-left:6px;font-weight:500}
  #arc .gd-btn{display:block;width:100%;min-height:58px;border:0;border-radius:10px;background:var(--acc);color:var(--acc-ink,#000);font:inherit;font-size:17px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;margin-top:6px}
  #arc .gd-btn:active{transform:scale(.985)}#arc .gd-btn.ghost{background:transparent;border:1px solid var(--ln);color:var(--ink);min-height:48px;font-size:14px}
  #arc .gd-btn2{flex:1;min-height:46px;border:1px solid var(--ln);border-radius:10px;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
  #arc .gd-two{display:flex;gap:8px;margin:4px 0 6px}
  #arc .gd-lnk{display:block;width:100%;background:none;border:0;color:var(--mut);font:inherit;font-size:13px;padding:12px 0 2px;cursor:pointer}
  #arc .gd-w{display:flex;align-items:center;gap:10px;margin:4px 0 12px}#arc .gd-w button{width:56px;height:56px;border:1px solid var(--ln);border-radius:10px;background:transparent;color:var(--ink);font-size:26px;cursor:pointer}
  #arc .gd-w input{flex:1;min-width:0;text-align:center;font-family:'Barlow Semi Condensed',sans-serif;font-size:52px;font-weight:700;background:transparent;border:0;border-bottom:2px solid var(--acc);color:var(--ink);padding:0;font-variant-numeric:tabular-nums}#arc .gd-w span{color:var(--mut)}
  #arc .gd-ex{margin:0 0 12px;padding-left:0;list-style:none;font-size:14px;line-height:1.45}#arc .gd-ex li{padding:6px 0;border-top:1px solid var(--ln)}#arc .gd-ex li:first-child{border-top:0}
  #arc .gd-vids{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}#arc .gd-vids button{border:1px solid var(--ln);background:transparent;color:var(--ink);font:inherit;font-size:12px;padding:7px 10px;border-radius:8px;cursor:pointer}
  #arc .gd-kids{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
  #arc .gd-kids button{display:flex;align-items:center;gap:12px;min-height:50px;padding:0 14px;border:1px solid var(--ln);border-radius:10px;background:transparent;color:var(--ink);font:inherit;font-size:16px;text-align:left;cursor:pointer}
  #arc .gd-kids button i{width:26px;height:26px;display:grid;place-items:center;border-radius:6px;border:1px solid var(--ln);font-style:normal;font-weight:700}
  #arc .gd-kids button.on i{background:var(--acc);border-color:var(--acc);color:var(--acc-ink,#000)}#arc .gd-kids button.off{opacity:.6;text-decoration:line-through}#arc .gd-kids button.off i{color:var(--bad,#e5484d);border-color:var(--bad,#e5484d)}
  #arc .gd-num{display:grid;grid-template-columns:1fr 44px 74px 44px;gap:6px;align-items:center;padding:6px 0;border-top:1px solid var(--ln)}#arc .gd-num span{font-size:14px}#arc .gd-num i{font-style:normal;color:var(--mut);font-size:12px}
  #arc .gd-num button{height:44px;border:1px solid var(--ln);border-radius:8px;background:transparent;color:var(--ink);font-size:20px;cursor:pointer}#arc .gd-num input{height:44px;text-align:center;font-size:20px;font-weight:700;background:transparent;border:1px solid var(--ln);border-radius:8px;color:var(--ink)}
  #arc .gd-row{display:flex;gap:12px;padding:9px 0;border-top:1px solid var(--ln);font-size:14px;cursor:pointer}#arc .gd-row b{min-width:56px;font-variant-numeric:tabular-nums}
  #arc .gd-f{display:block;margin-bottom:10px}#arc .gd-f span{display:block;font-size:12px;color:var(--mut);margin-bottom:4px}#arc .gd-f textarea{width:100%;box-sizing:border-box;background:transparent;border:1px solid var(--ln);border-radius:8px;color:var(--ink);font:inherit;font-size:15px;padding:10px}
  #arc .gd-all{margin-top:10px}#arc .gd-all summary{font-size:12px;color:var(--mut);cursor:pointer;padding:8px 0;letter-spacing:.04em}
  #arc .gd-li{display:grid;grid-template-columns:48px 1fr 18px;gap:10px;width:100%;align-items:center;padding:9px 4px;background:none;border:0;border-top:1px solid var(--ln);color:var(--ink);font:inherit;font-size:14px;text-align:left;cursor:pointer}
  #arc .gd-li b{font-weight:500;color:var(--mut);font-variant-numeric:tabular-nums;font-size:12px}#arc .gd-li.s-done,#arc .gd-li.s-skip{opacity:.45}#arc .gd-li.cur{color:var(--acc)}#arc .gd-li span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
  document.head.appendChild(s);
})();
setTimeout(() => { try { gdRender(); } catch (e) { } }, 1800);
