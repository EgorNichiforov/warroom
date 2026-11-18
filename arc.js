/* War Room 9.0 · ARC — the app is your day.
   Challenge everything: no tabs, no dashboards, no XP on the main surface. One vertical line from wake to sleep.
   Above the line: what happened (honest stamps). On the line: NOW, huge, with one button. Below: what's coming.
   The screen changes with the sun: paper in the morning, dusk after 17:00, black after bedtime.
   Logging is one sentence ("12 dials 1 owner bac 45 76.4kg"). Everything else lives behind one door: Rooms. */
'use strict';
function arcOn() { try { return localStorage.getItem('wr-arc') !== 'off'; } catch (e) { return true; } }
function arcSet(on) { try { localStorage.setItem('wr-arc', on ? 'on' : 'off'); } catch (e) { } if (on) arcShow(); else { arcHide(); toast('ARC off. Turn it back on in Me → Appearance'); } }
function arcPhase() { const nm = nowMin(), wake = tmin(S.settings.wake || '05:20'); if (oneNight()) return 'night'; return nm < 17 * 60 && nm >= wake ? 'paper' : 'dusk'; }
const ARC_KIND = { dials: 'Company', bac: 'Mind', agency: 'Company', train: 'Body', program: 'Body', tennis: 'Tennis', food: 'Fuel', routine: 'Routine', travel: 'Move', sleep: 'Sleep' };

/* ── the line ── */
function arcBlocks(d) {
  const o = day(d), nm = nowMin(), rp = (o.replan || []).filter((b) => tmin(b.end) > nm);
  let L = blocksFor(d).slice();
  if (rp.length) { const rs = Math.min(...rp.map((b) => tmin(b.start))); L = L.filter((b) => !(['dials', 'bac', 'agency', 'train', 'program'].includes(b.kind) && tmin(b.start) >= rs)).concat(rp); }
  return L.filter((b) => !/^.{0,3}sleep$/i.test(b.title.replace(EMO_RE, '').trim())).sort((a, b) => tmin(a.start) - tmin(b.start));
}
function arcHero(R) {
  const F = typeof enFiring === 'function' ? enFiring()[0] : null, sun = typeof enBoardDone === 'function' && dow(new Date()) === 7 && !enBoardDone();
  const pr = F ? `<div class="arc-pr"><span>If-then · ${esc(EN_TRIG[F.t][0])}</span><b>${esc(F.txt)}</b><div><button onclick='enProtoDone("${F.id}");arcGo(${JSON.stringify(F.act || '')})'>${esc(F.btn || 'Do it')}</button><button class="g" onclick='enProtoDone("${F.id}");arcRender()'>Handled</button></div></div>`
    : sun ? `<div class="arc-pr"><span>Sunday</span><b>Board meeting · 12 minutes. One system change, three outcomes.</b><div><button onclick="enBoard()">Start</button></div></div>` : '';
  const run = S.timer ? (() => { const left = Math.max(0, S.timer.mins - Math.round((now() - S.timer.start) / 60000)); return `<div class="arc-run"><b>${left}</b><span>min left · ${esc(S.timer.counter === 'bac' ? 'BAC' : S.timer.counter === 'deep' ? 'company' : S.timer.counter)}</span><button onclick="stopTimer(true);arcRender()">Finish</button><button class="g" onclick="stopTimer(false);arcRender()">Stop</button></div>`; })() : '';
  let a = R.cur ? oneAction(R.cur, R) : null, k = 'Now · until ' + (R.cur ? R.cur.end : '');
  if (!a && R.next) { a = oneAction(R.next, R); const m = tmin(R.next.start) - R.nm; k = `Next · in ${m >= 60 ? Math.floor(m / 60) + 'h ' : ''}${m % 60} min`; if (a) a.btn = 'Start it early'; }
  if (!a) { const m = minimumMet(R.d); a = { big: m.met ? 'Close the day.' : 'Minimum first.', sub: m.met ? 'Shutdown, magnesium, phone out.' : `${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC. Never 0.`, btn: m.met ? 'Shutdown' : m.dials < m.needDials ? 'Dial the minimum' : 'Start 25 min BAC', go: m.met ? 'oneGo("sleep")' : m.dials < m.needDials ? 'oneGo("dial")' : 'oneGo("timer","bac",25)' }; k = 'Hard blocks done'; }
  const ev = R.cur && R.cur.kind === 'dials' && typeof EN_PER_DIAL !== 'undefined' ? `<em>≈ $${EN_PER_DIAL} of MRR per dial</em>` : '';
  return `${pr}<div class="arc-hero"><div class="arc-k">${k}</div><div class="arc-big">${a.big}</div><div class="arc-sub">${a.sub}${ev}</div>${run || `<button class="arc-btn" onclick='arcGo(${JSON.stringify(a.go)})'>${a.btn}</button>`}</div>`;
}
function arcGo(code) {
  if (!code) return; const away = /oneGo\("(dial|train|sleep)"|show\(/.test(code);
  if (away) arcHide(true);
  try { (new Function(code))(); } catch (e) { console.warn(e); }
  if (!away) setTimeout(arcRender, 50);
}
function arcLine(d) {
  const o = day(d), nm = nowMin(), L = arcBlocks(d), cur = L.find((b) => tmin(b.start) <= nm && nm < tmin(b.end));
  const st = (b) => (typeof blkStatus === 'function' ? blkStatus(b, d, o, L) : '');
  const row = (b) => { const s = st(b), past = tmin(b.end) <= nm; return `<div class="arc-row ${past ? 'past' : 'fut'} s-${s}" onclick="arcBlk('${b.id}')"><span class="t">${b.start}</span><i></i><span class="n">${esc(b.title.replace(EMO_RE, '').trim())}</span><span class="g">${past ? (s === 'done' ? '✓' : s === 'miss' ? '✗' : s === 'skip' ? '–' : '') : esc(ARC_KIND[b.kind] || '')}</span></div>`; };
  const before = L.filter((b) => tmin(b.end) <= nm), after = L.filter((b) => tmin(b.start) > nm && b !== cur);
  const pct = Math.round(clamp((nm - tmin(S.settings.wake || '05:20')) / (tmin(S.settings.bed || '21:00') - tmin(S.settings.wake || '05:20')), 0, 1) * 100);
  return { before: before.map(row).join(''), after: after.map(row).join(''), pct, kept: before.filter((b) => st(b) === 'done').length, missed: before.filter((b) => st(b) === 'miss').length };
}
function arcBlk(id) {
  const d = new Date(), o = day(d), b = arcBlocks(d).find((x) => x.id === id); if (!b) return;
  openModal(`<div class="xs muted">${b.start}–${b.end} · ${esc(ARC_KIND[b.kind] || b.kind)}</div><h2 style="margin:4px 0 14px">${esc(b.title.replace(EMO_RE, '').trim())}</h2>
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="arcMark('${id}','done')">Done</button><button class="btn grow" onclick="arcMark('${id}','miss')">Missed</button><button class="btn grow" onclick="arcMark('${id}','skip')">Skip</button></div>
    ${b.note ? `<div class="small muted" style="margin-top:12px">${esc(b.note)}</div>` : ''}<button class="btn ghost block" style="margin-top:10px" onclick="closeModal();enReplanModal()">Replan the rest of today</button>`);
}
function arcMark(id, s) { const o = day(new Date()); o.blk = o.blk || {}; o.blk[id] = s; touch(o); closeModal(); arcRender(); }

/* ── one-sentence log ── */
function arcParse(t) {
  t = ' ' + t.toLowerCase().replace(',', '.') + ' '; const out = [], m = (re) => t.match(re);
  let x;
  if ((x = m(/(\d+)\s*(?:dials?|calls?|apeluri)\b/))) out.push(['dials', +x[1], `+${x[1]} dials`]);
  if ((x = m(/(\d+)\s*(?:owners?|owner talks?|talks?|conversations?|convos?)\b/))) out.push(['owners', +x[1], `+${x[1]} owner talk${x[1] === '1' ? '' : 's'}`]);
  if ((x = m(/(?:bac|study|anki|invat\w*)\s*(\d+)/)) || (x = m(/(\d+)\s*(?:min\w*\s*)?(?:bac|study|anki)\b/))) out.push(['bac', +x[1], `+${x[1]} min BAC`]);
  if ((x = m(/(?:deep|company|agency)\s*(\d+)/)) || (x = m(/(\d+)\s*(?:min\w*\s*)?(?:deep|company)\b/))) out.push(['deep', +x[1], `+${x[1]} min company`]);
  if ((x = m(/(\d{2,3}\.\d)\s*(?:kg)?\b/)) || (x = m(/(?:weight|weigh|kg)\s*(\d{2,3}(?:\.\d)?)/))) { const v = +x[1]; if (v > 30 && v < 200) out.push(['weight', v, `weight ${v} kg`]); }
  if ((x = m(/(\d{3,4})\s*(?:kcal|cal)\b/)) || (x = m(/ate\s*(\d{3,4})/))) out.push(['kcal', +x[1], `+${x[1]} kcal`]);
  return out;
}
function arcLogOpen() {
  openModal(`<h2>Log</h2><div class="xs muted" style="margin-bottom:10px">One sentence. "12 dials 1 owner" · "bac 45" · "76.4 kg" · "ate 900" · money: "spent 120 taxi" · "+750 tennis"</div>
    <input id="arc-in" class="arc-log" autocomplete="off" placeholder="What happened?" oninput="arcPrev()" onkeydown="if(event.key==='Enter')arcLogSave()"><div id="arc-pv" class="arc-pv"></div>
    <div class="arc-quick">${[['dials', 1, '+1 dial'], ['dials', 5, '+5 dials'], ['owners', 1, '+1 owner talk'], ['bac', 25, '+25 BAC']].map(([k, v, l]) => `<button onclick="arcApply([['${k}',${v},'${l}']])">${l}</button>`).join('')}</div>
    <button class="btn primary block" style="margin-top:12px" onclick="arcLogSave()">Log it</button>`);
  setTimeout(() => { const i = $('arc-in'); if (i) i.focus(); }, 80);
}
function arcPrev() { const p = arcParse($('arc-in').value); $('arc-pv').innerHTML = p.length ? p.map((z) => `<span>${esc(z[2])}</span>`).join('') : '<em>…</em>'; }
function arcLogSave() { const p = arcParse(($('arc-in') || {}).value || ''); if (!p.length) { toast('Try: 12 dials 1 owner · bac 45 · 76.4 kg'); return; } arcApply(p); }
function arcApply(p) {
  const o = day(new Date());
  p.forEach(([k, v]) => {
    if (k === 'weight') o.weight = Math.round(v * 10) / 10;
    else if (k === 'kcal') { o.meals = o.meals || []; o.meals.push({ id: uid(), name: 'Quick log', kcal: v, p: 0, c: 0, f: 0, t: hmNow ? hmNow() : '', src: 'manual' }); }
    else o.counters[k] = (Number(o.counters[k]) || 0) + v;
  });
  touch(o); closeModal(); toast('Logged · ' + p.map((z) => z[2]).join(' · ')); try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } arcRender();
}

/* ── rooms: everything else, one door ── */
const ARC_ROOMS = [['dial', 'dial', 'Dialer'], ['crm', 'kanban', 'Pipeline'], ['money', 'wallet', 'Money'], ['life', 'life', 'Engine & Life'], ['train', 'train', 'Train (sets)'], ['trlog', 'check', 'Training log'], ['food', 'food', 'Food'], ['stats', 'stats', 'Stats'], ['intel', 'target', 'Intel'], ['cal', 'cal', 'Calendar'], ['book', 'book', 'Playbook'], ['ask', 'chat', 'Ask'], ['week', 'plan', 'Plan & goals'], ['me', 'me', 'Settings']];
function arcRooms() { openModal(`<h2>Rooms</h2><div class="nv-sys">${ARC_ROOMS.map(([v, i, l]) => `<button onclick="closeModal();arcRoom('${v}')">${ic(i, 22)}<span>${l}</span></button>`).join('')}</div><div class="xs muted" style="margin-top:12px">The day is the app. Rooms are for planning, reviewing and the dialer. "Day" in the corner brings you back.</div>`, true); }
function arcRoom(v) { arcHide(true); if (typeof nvOn === 'function' && nvOn() && typeof nvGo === 'function') nvGo(v); else show(v); }

/* ── screen ── */
function arcHtml() {
  const d = new Date(), ph = arcPhase(), R = oneNow(), C = oneChain(), m = minimumMet(d), c = R.o.counters || {}, tg = dialTargetFor(d), bc = S.counters.items.find((x) => x.id === 'bac'), bT = bc ? bc.targets[dow(d)] || 0 : 0;
  const date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), dl = daysUntil(S.settings.bigDate);
  const bar = (l, v, t) => `<div class="arc-m"><span>${l}</span><i><u style="width:${t ? Math.min(100, (v / t) * 100) : 0}%"></u></i><b>${v}${t ? '/' + t : ''}</b></div>`;
  const wk = Object.values(S.boards || {}).filter((b) => b && b.done && b.id === (typeof enWeekKey === 'function' ? enWeekKey() : '')).pop();
  const top = `<div class="arc-top"><div><b>${date}</b><span>D-${dl} · ${fmt(C.dials)} dials · ${C.own} owner talks all-time${typeof mnTotal === 'function' && mnTotal().any ? ` · <a href="#" onclick="arcRoom('money');return false">${mnF(mnTotal().t)}</a>` : ''}</span></div><button class="arc-ic" onclick="arcRooms()" aria-label="Rooms">${ic('more', 22)}</button></div>`;
  if (ph === 'night') {
    const tm = addDays(d, nowMin() < 12 * 60 ? 0 : 1), first = blocksFor(tm).filter((b) => ['dials', 'bac', 'train', 'program', 'agency'].includes(b.kind)).sort((a, b) => tmin(a.start) - tmin(b.start))[0];
    return `<div class="arc-in">${top}<div class="arc-night"><div class="arc-k">After ${S.settings.bed || '21:00'}</div><div class="arc-big">Sleep.</div><div class="arc-sub">Today: ${m.met ? '<b class="ok">minimum kept</b>' : `<b class="bad">minimum missed</b> (${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} BAC)`}.<br>Tomorrow: wake ${wakeFor(tm)}${first ? ` · first hard block ${first.start} ${esc(first.title.replace(EMO_RE, '').trim())}` : ''}.</div>
      <button class="arc-btn" onclick="arcGo('oneGo(&quot;sleep&quot;)')">Lights out</button></div>
      <div class="arc-foot"><button onclick="arcLogOpen()">Log the day</button><button onclick="arcRooms()">Rooms</button></div></div>`;
  }
  const Ln = arcLine(d);
  return `<div class="arc-in">${top}
    ${typeof mcCard === 'function' ? mcCard() : ''}
    ${wk && wk.out && wk.out.some(Boolean) ? `<div class="arc-wk" onclick="enBoard()"><span>This week's contract</span>${wk.out.filter(Boolean).map((o) => `<b>${esc(o)}</b>`).join('')}${wk.change ? `<em>Rule: ${esc(wk.change)}</em>` : ''}</div>` : dow(d) === 7 || !wk ? `<div class="arc-wk empty" onclick="enBoard()"><span>No contract for this week yet</span><b>Run the 12-minute board meeting →</b></div>` : ''}
    <div class="arc-ms">${bar('Dials', Number(c.dials) || 0, tg)}${bar('Owner talks', Number(c.owners) || 0, 0)}${bar('BAC min', Number(c.bac) || 0, bT)}</div>
    <div class="arc-line"><div class="arc-rail"><u style="height:${Ln.pct}%"></u></div>
      ${Ln.before ? `<details class="arc-past"><summary>Earlier today · ${Ln.kept} kept · ${Ln.missed} missed</summary>${Ln.before}</details>` : ''}
      <div class="arc-now">${arcHero(R)}</div>
      <div class="arc-fut">${Ln.after}</div></div>
    <div class="arc-min ${m.met ? 'ok' : ''}">Never 0 · ${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC ${m.met ? '· kept' : ''}</div>
    <div class="arc-foot"><button onclick="enReplanModal()">Replan</button><button class="main" onclick="arcLogOpen()">Log</button><button onclick="arcRooms()">Rooms</button></div></div>`;
}
function arcRender() { const el = document.getElementById('arc'); if (!el || !el.classList.contains('on')) return; el.className = 'on arc-' + arcPhase(); el.innerHTML = arcHtml(); }
function arcShow() {
  if (!arcOn()) return; if (typeof sleepLive === 'function' && sleepLive()) return; if (typeof capPending !== 'undefined' && capPending) return;
  let el = document.getElementById('arc'); if (!el) { el = document.createElement('div'); el.id = 'arc'; document.body.appendChild(el); }
  el.className = 'on arc-' + arcPhase(); document.body.classList.add('arc-open'); el.innerHTML = arcHtml(); if (typeof oneHide === 'function') oneHide();
  const p = document.getElementById('arc-pill'); if (p) p.classList.remove('on');
  clearInterval(window._arcT); window._arcT = setInterval(arcRender, 30000);
}
function arcHide(pill) { const el = document.getElementById('arc'); if (el) el.classList.remove('on'); document.body.classList.remove('arc-open'); clearInterval(window._arcT); if (pill && arcOn()) { let p = document.getElementById('arc-pill'); if (!p) { p = document.createElement('button'); p.id = 'arc-pill'; p.onclick = arcShow; p.innerHTML = '<i></i>Day'; document.body.appendChild(p); } p.classList.add('on'); } }

/* ARC replaces ONE as the start surface; the old surfaces stay one door away */
if (typeof oneShow === 'function' && !oneShow._arc) { const _o = oneShow; oneShow = function (force) { if (arcOn()) { if (force) arcShow(); return; } return _o(force); }; oneShow._arc = 1; }
if (typeof render === 'function' && !render._arc) { const _r = render; render = function () { const x = _r.apply(this, arguments); arcRender(); return x; }; render._arc = 1; }
document.addEventListener('visibilitychange', () => { if (document.hidden) { window._arcAway = Date.now(); return; } if (arcOn() && window._arcAway && Date.now() - window._arcAway > 20 * 60e3 && !(typeof capPending !== 'undefined' && capPending)) setTimeout(arcShow, 700); else arcRender(); });
try { if (arcOn()) localStorage.setItem('nv-intro', '1'); } catch (e) { }
setTimeout(() => { try { const a = document.getElementById('arc'); if (!(a && a.classList.contains('on'))) arcShow(); } catch (e) { console.warn('ARC', e); } }, 1600); /* 13.11.1: don't redraw the Day screen if it's already up (that was the second jump) */
if (typeof appearanceCard === 'function' && !appearanceCard._arc) {
  const _a = appearanceCard;
  appearanceCard = function () { const on = arcOn(); return `<div class="card"><div class="card-h"><div class="card-t">Main surface</div><div class="card-r">this device</div></div><div class="small muted" style="margin-bottom:10px">ARC: the app opens as your day on one line, and changes with the sun. Off: the classic screens and NOVA.</div><div class="row" style="gap:8px"><button class="btn grow ${on ? 'primary' : ''}" onclick="arcSet(true)">ARC</button><button class="btn grow ${on ? '' : 'primary'}" onclick="arcSet(false)">Classic / NOVA</button></div></div>` + _a(); };
  appearanceCard._arc = 1;
}
