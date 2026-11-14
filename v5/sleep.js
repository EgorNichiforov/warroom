/* War Room · sleep.js (6.1) — sleep as a live session you can steer.
   Lights out starts the night. In the night: "I'm awake" pauses it, "Back to sleep" resumes it.
   "Up for the day" stops it. Undo steps back one action, Edit fixes any time, Cancel removes the night.
   Data (on the day the night belongs to, see nightKey): segs [{s,e}] in ms, sleepState
   'asleep' | 'awake' | 'done', sleepQ 1–5. bedAt / wokeAt stay filled for the charts and the Sheet.
   The night screen opens by itself when the app is opened during a running night. */
'use strict';
const SLEEP_LBL = { asleep: 'Asleep', awake: 'Awake in the night', done: 'Night logged' };

/* the night that is running (asleep or awake), else null */
function sleepLive() {
  const ks = [nightKey(), dk(new Date()), dk(addDays(new Date(), -1)), dk(addDays(new Date(), 1))];
  for (const k of ks) { const o = S.days[k]; if (o && (o.sleepState === 'asleep' || o.sleepState === 'awake') && Array.isArray(o.segs) && o.segs.length) { if (now() - o.segs[0].s > 20 * 3600e3) continue; return { k, o }; } }
  return null;
}
function sleepSync(o) {
  const sg = o.segs || []; o.bedAt = sg.length ? hmNow(new Date(sg[0].s)) : '';
  const last = sg[sg.length - 1]; o.wokeAt = o.sleepState === 'done' && last && last.e ? hmNow(new Date(last.e)) : '';
  o.sleepSrc = 'tap'; touch(o);
}
function sleepAsleepMs(o) { return (o.segs || []).reduce((a, s) => a + Math.max(0, (s.e || now()) - s.s), 0); }
function sleepWakes(o) { const sg = o.segs || []; let n = 0, ms = 0; for (let i = 1; i < sg.length; i++) { if (sg[i - 1].e) { n++; ms += sg[i].s - sg[i - 1].e; } } const last = sg[sg.length - 1]; if (o.sleepState === 'awake' && last && last.e) { n++; ms += now() - last.e; } return { n, min: Math.round(ms / 60000) }; }
const hmDur = (min) => `${Math.floor(min / 60)}h ${pad(Math.round(min % 60))}m`;
function sleepBuzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } }

function lightsOut() {
  const live = sleepLive(); if (live) { sleepScreen(); return; }
  const k = nightKey(), o = day(k);
  const recent = o.sleepState === 'done' && o.segs && o.segs.length && now() - o.segs[o.segs.length - 1].e < 3 * 3600e3;
  if (recent) { o.segs.push({ s: now(), e: null }); o.sleepState = 'asleep'; sleepSync(o); toast('Back to sleep · the night continues'); }
  else { o.segs = [{ s: now(), e: null }]; o.sleepState = 'asleep'; o.sleepQ = null; sleepSync(o);
    const w = wakeFor(pd(k)), m = tmin(w) - tmin(o.bedAt) + (tmin(w) < tmin(o.bedAt) ? 1440 : 0);
    toast(`Lights out ${o.bedAt}. Alarm ${w} = ${hmDur(m)}. Phone out of the room.`, 'Undo', sleepUndo); }
  sleepBuzz([20, 60, 20]); render(); sleepScreen();
}
function sleepPause() { const L = sleepLive(); if (!L || L.o.sleepState !== 'asleep') return; const sg = L.o.segs[L.o.segs.length - 1]; sg.e = now(); L.o.sleepState = 'awake'; sleepSync(L.o); sleepBuzz(10); render(); sleepScreen(); }
function sleepResume() { const L = sleepLive(); if (!L || L.o.sleepState !== 'awake') return; L.o.segs.push({ s: now(), e: null }); L.o.sleepState = 'asleep'; sleepSync(L.o); sleepBuzz([10, 40, 10]); render(); sleepScreen(); }
function wokeUp() {
  const L = sleepLive();
  if (L) { const sg = L.o.segs[L.o.segs.length - 1]; if (!sg.e) sg.e = now(); L.o.sleepState = 'done'; sleepSync(L.o); sleepBuzz([30, 50, 30]); render(); sleepScreen(L.k); return; }
  const k = dk(new Date()), o = day(k); o.wokeAt = hmNow(); o.sleepSrc = 'tap'; touch(o);
  const m = sleepMin(o); toast(m != null ? `Up ${o.wokeAt} · slept ${hmDur(m)}` : `Up ${o.wokeAt}. Add when you went to bed.`, 'Edit', () => sleepEdit(k)); render();
}
/* one step back: stop → asleep again, awake → asleep again, asleep → back to the pause (or no night at all) */
function sleepUndo(k) {
  let o; if (k) o = S.days[k]; else { const L = sleepLive(); o = L ? L.o : S.days[nightKey()] && S.days[nightKey()].sleepState === 'done' ? S.days[nightKey()] : S.days[dk(new Date())]; }
  if (!o || !o.segs || !o.segs.length) { toast('Nothing to undo'); return; }
  const sg = o.segs[o.segs.length - 1];
  if (o.sleepState === 'done' || o.sleepState === 'awake') { sg.e = null; o.sleepState = 'asleep'; toast('Undone · you are asleep again'); }
  else if (o.segs.length > 1) { o.segs.pop(); o.sleepState = 'awake'; toast('Undone · back to awake'); }
  else { o.segs = []; o.sleepState = ''; toast('Night removed'); }
  sleepSync(o); render(); if (document.getElementById('night')) sleepScreen();
}
function sleepCancel(k) {
  const o = S.days[k]; if (!o) return; const keep = { segs: o.segs, sleepState: o.sleepState, bedAt: o.bedAt, wokeAt: o.wokeAt, sleepQ: o.sleepQ };
  o.segs = []; o.sleepState = ''; o.bedAt = ''; o.wokeAt = ''; o.sleepQ = null; touch(o); sleepClose(); closeModal(); render();
  toast('Night deleted', 'Restore', () => { Object.assign(o, keep); touch(o); render(); });
}
function sleepRate(k, q) { const o = day(k); o.sleepQ = q; touch(o); sleepBuzz(8); render(); if (document.getElementById('night')) sleepScreen(k); }

/* ───────── the night screen ───────── */
let sleepTick = 0;
function sleepClose() { const n = document.getElementById('night'); if (n) n.remove(); clearInterval(sleepTick); sleepTick = 0; }
function sleepScreen(doneKey) {
  const L = sleepLive(); let k, o;
  if (L) { k = L.k; o = L.o; } else if (doneKey) { k = doneKey; o = S.days[k]; } else { sleepClose(); return; }
  let el = document.getElementById('night');
  if (!el) { el = document.createElement('div'); el.id = 'night'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Night screen'); document.body.appendChild(el); }
  const nw = new Date(), alarm = wakeFor(pd(k)), toAlarm = (tmin(alarm) - (nw.getHours() * 60 + nw.getMinutes()) + 1440) % 1440;
  const asleep = Math.round(sleepAsleepMs(o) / 60000), wk = sleepWakes(o), st = o.sleepState;
  const segs = (o.segs || []).map((s) => `${hmNow(new Date(s.s))}–${s.e ? hmNow(new Date(s.e)) : 'now'}`).join(' · ');
  const bedOk = o.bedAt && ((tmin(o.bedAt) - tmin(S.settings.bed || '21:00') + 1440) % 1440 <= 15 || (tmin(o.bedAt) - tmin(S.settings.bed || '21:00') + 1440) % 1440 > 1200);
  let body;
  if (st === 'done') {
    const tot = sleepMin(o) || asleep, need = NIGHT_NEED;
    body = `<div class="nt-k">GOOD MORNING</div><div class="nt-big">${hmDur(tot)}</div><div class="nt-sub">asleep · ${o.bedAt} → ${o.wokeAt}${wk.n ? ` · ${wk.n} wake-up${wk.n > 1 ? 's' : ''} (${wk.min} min)` : ' · no wake-ups'}</div>
      <div class="nt-bars"><div><small>vs 8 h</small><b class="${tot >= need ? 'ok' : 'bad'}">${(() => { const df = Math.abs(tot - need), t = df < 60 ? df + ' min' : hmDur(df); return tot >= need ? '+' + t : t + ' short'; })()}</b></div><div><small>bed on time</small><b class="${bedOk ? 'ok' : 'bad'}">${bedOk ? 'yes' : 'no'}</b></div><div><small>wake-ups</small><b>${wk.n}</b></div></div>
      <div class="nt-q"><small>How did you sleep?</small><div>${[1, 2, 3, 4, 5].map((q) => `<button class="${o.sleepQ === q ? 'on' : ''}" onclick="sleepRate('${k}',${q})" aria-label="${q} of 5">${q}</button>`).join('')}</div></div>
      <div class="nt-act"><button class="nt-main" onclick="sleepClose()">Start the day</button></div>
      <div class="nt-minor"><button onclick="sleepUndo('${k}')">Undo: still asleep</button><button onclick="sleepEdit('${k}')">Edit times</button><button onclick="sleepCancel('${k}')">Delete night</button></div>`;
  } else {
    body = `<div class="nt-clock">${hmNow(nw)}</div>
      <div class="nt-k">${st === 'asleep' ? 'ASLEEP' : 'AWAKE IN THE NIGHT'} · ${hmDur(asleep)} so far</div>
      <div class="nt-sub">Alarm ${alarm} · in ${hmDur(toAlarm)}${wk.n ? ` · ${wk.n} wake-up${wk.n > 1 ? 's' : ''}, ${wk.min} min awake` : ''}</div>
      <div class="nt-ring" aria-hidden="true"><i style="--p:${Math.min(1, asleep / NIGHT_NEED)}"></i></div>
      <div class="nt-act">${st === 'asleep' ? `<button class="nt-main" onclick="sleepPause()">I'm awake <small>pause the night</small></button>` : `<button class="nt-main" onclick="sleepResume()">Back to sleep <small>resume</small></button>`}
        <button class="nt-up" onclick="wokeUp()">Up for the day</button></div>
      <div class="nt-minor"><button onclick="sleepUndo()">Undo last</button><button onclick="sleepEdit('${k}')">Edit</button><button onclick="sleepCancel('${k}')">Cancel night</button><button onclick="sleepClose()">Hide</button></div>
      <div class="nt-segs">${segs}</div>`;
  }
  el.className = 'night ' + (st === 'done' ? 'morning' : st);
  el.innerHTML = `<div class="nt-wrap">${body}</div>`;
  if (st !== 'done' && !sleepTick) sleepTick = setInterval(() => { if (document.getElementById('night') && sleepLive()) sleepScreen(); }, 30000);
}

/* ───────── edit any night: every stretch, add, delete ───────── */
function sleepEdit(k) {
  sleepClose(); const o = day(k); if (!o.segs || !o.segs.length) { if (o.bedAt && o.wokeAt) { const base = pd(k), b = new Date(base), w = new Date(base); b.setHours(...o.bedAt.split(':').map(Number)); if (tmin(o.bedAt) > tmin(o.wokeAt)) b.setDate(b.getDate() - 1); w.setHours(...o.wokeAt.split(':').map(Number)); o.segs = [{ s: +b, e: +w }]; o.sleepState = 'done'; } else o.segs = []; }
  const rows = o.segs.map((s, i) => `<div class="row" style="gap:8px;align-items:end;margin-bottom:8px"><div class="field grow" style="margin:0"><label>${i ? 'Back asleep' : 'Asleep from'}</label><input type="time" id="se-s${i}" value="${hmNow(new Date(s.s))}"></div><div class="field grow" style="margin:0"><label>${i < o.segs.length - 1 ? 'Woke in the night' : 'Up'}</label><input type="time" id="se-e${i}" value="${s.e ? hmNow(new Date(s.e)) : ''}" placeholder="still asleep"></div><button class="btn sm" onclick="sleepSegDel('${k}',${i})" aria-label="Delete this stretch">✕</button></div>`).join('');
  openModal(`<h2>Edit night · ${fmtShort(pd(k))}</h2><div class="hint">Each line is one stretch of sleep. A wake-up in the night is the gap between two lines.</div>
    ${rows || '<div class="small muted" style="margin-bottom:10px">No sleep logged for this night yet.</div>'}
    <div class="row" style="gap:8px"><button class="btn sm" onclick="sleepSegAdd('${k}')">+ Add a stretch</button>${o.segs.length ? `<button class="btn sm danger" onclick="sleepCancel('${k}')">Delete the night</button>` : ''}</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="sleepEditSave('${k}')">Save</button></div>`);
}
function sleepAt(k, hm, ref) { const base = pd(k), d = new Date(base); const [h, m] = hm.split(':').map(Number); d.setHours(h, m, 0, 0); if (h >= 12) d.setDate(d.getDate() - 1); if (ref && +d < ref) d.setDate(d.getDate() + 1); return +d; }
function sleepEditRead(k) { const o = day(k); let prev = 0; o.segs.forEach((s, i) => { const a = $('se-s' + i), b = $('se-e' + i); if (a && a.value) s.s = sleepAt(k, a.value, prev); if (b) s.e = b.value ? sleepAt(k, b.value, s.s) : null; prev = s.e || s.s; }); }
function sleepEditSave(k) {
  const o = day(k); sleepEditRead(k); o.segs = o.segs.filter((s) => s.s).sort((a, b) => a.s - b.s);
  for (let i = 0; i < o.segs.length; i++) { const s = o.segs[i]; if (s.e && s.e <= s.s) { toast('A stretch ends before it starts: check line ' + (i + 1)); return; } if (i && o.segs[i - 1].e && s.s < o.segs[i - 1].e) { toast('Two stretches overlap: check line ' + (i + 1)); return; } }
  const open = o.segs.length && !o.segs[o.segs.length - 1].e;
  o.sleepState = !o.segs.length ? '' : open ? 'asleep' : 'done'; sleepSync(o); closeModal(); render(); toast('Night saved' + (o.sleepState === 'done' ? ' · ' + hmDur(sleepMin(o) || 0) : ''));
}
function sleepSegDel(k, i) { const o = day(k); sleepEditRead(k); o.segs.splice(i, 1); sleepEdit(k); }
function sleepSegAdd(k) { const o = day(k); sleepEditRead(k); const last = o.segs[o.segs.length - 1]; const s = last ? (last.e || now()) + 15 * 60000 : sleepAt(k, S.settings.bed || '21:00'); o.segs.push({ s, e: s + 60 * 60000 }); if (!o.sleepState) o.sleepState = 'done'; sleepEdit(k); }

/* buttons shown in the Sleep card (classic screens) */
function sleepControls(late) {
  const L = sleepLive(), k = nightKey(), ko = S.days[dk(new Date())];
  if (L) return `<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn primary grow" onclick="sleepScreen()">${L.o.sleepState === 'asleep' ? 'Asleep' : 'Awake'} · ${hmDur(Math.round(sleepAsleepMs(L.o) / 60000))} · open</button>${L.o.sleepState === 'asleep' ? '<button class="btn" onclick="sleepPause()">Pause</button>' : '<button class="btn" onclick="sleepResume()">Resume</button>'}<button class="btn" onclick="wokeUp()">Up</button></div>`;
  const doneToday = ko && ko.sleepState === 'done' && !late;
  return `<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn ${late ? 'primary' : ''} grow" onclick="lightsOut()">Lights out</button><button class="btn ${late ? '' : 'primary'} grow" onclick="wokeUp()">I'm up</button><button class="btn" onclick="sleepEdit('${doneToday || !late ? dk(new Date()) : k}')">Edit</button></div>${doneToday ? `<div class="xs muted" style="margin:-4px 0 8px">Last night: ${hmDur(sleepMin(ko) || 0)}${sleepWakes(ko).n ? ' · ' + sleepWakes(ko).n + ' wake-ups' : ''}${ko.sleepQ ? ' · rated ' + ko.sleepQ + '/5' : ''} · <a href="#" onclick="sleepUndo('${dk(new Date())}');return false">undo "up"</a></div>` : ''}`;
}
/* open the night screen if the app is opened during a running night */
setTimeout(function sleepBoot() { if (typeof S === 'undefined' || !S || !S.days) return setTimeout(sleepBoot, 300); if (sleepLive()) sleepScreen(); }, 600);
document.addEventListener('visibilitychange', () => { if (!document.hidden && typeof S !== 'undefined' && S && sleepLive()) sleepScreen(); });
