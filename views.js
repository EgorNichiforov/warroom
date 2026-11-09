/* War Room v4 · views: Now (cockpit), Train, Week, Me. Navigation + init. */
'use strict';

/* ───────── v4 migration: a deep-work counter, the Dial tab ───────── */
function migrateV4() {
  S.migrations = S.migrations || {};
  if (S.migrations.m20261109) return;
  const t = now();
  if (!S.counters.items.find((c) => c.id === 'deep')) {
    S.counters.items.push({ id: 'deep', title: 'Company deep work', unit: 'min', targets: [0, 50, 50, 50, 50, 50, 90, 120], weekly: 400, steps: [25, 50], color: 'purple' });
    S.counters._u = t;
  }
  for (const id in S.goals) { const g = S.goals[id]; if (g && !g._del && /^(Priority Bench clients|Multi-site clients)$/.test(g.title)) { g._del = true; g._u = t; } }
  S.migrations.m20261109 = t; save(true);
}

/* ───────── coach lines (paraphrased from Egor's own KB summaries; [#N] = knowledge/video_index.md) ───────── */
function coachLine(ctx) {
  const L = {
    behind: ['Volume negates luck. Judge yourself on the inputs you control: dials, not outcomes.', '#1 · #8'],
    hit: ['Target hit. Patience is a behavior: do the obvious thing for an unusually long time.', '#9 · #16'],
    morning: ['Real work starts when motivation runs out. Tap Done, then the next one.', '#168'],
    weekend: ['New ideas look best exactly when you hit the hard level. Ignore the shiny object; prep the queue.', '#126 · #230'],
    evening: ["Jocko's idea: own the loss, name the fix. One sentence each, then phone out.", 'mentors/INDEX'],
    study: ['Most productivity systems are guilt-free procrastination. Do only the task you set out to do.', '#46 · #75'],
  }[ctx];
  return L ? `<div class="coach">His idea: <b>${esc(L[0])}</b> <span class="ref">[${L[1]}]</span></div>` : '';
}

/* ───────── navigation ───────── */
const NAV = [['now', '◉', 'Now'], ['dial', '☏', 'Dial'], ['train', '▲', 'Train'], ['week', '▦', 'Week'], ['me', '☰', 'Me']];
let moreTab = 'home', weekTab = 'plan';
function show(v) {
  const map = { today: 'now', more: 'me', plan: 'week', goals: 'week', tasks: 'week' };
  if (v === 'plan' || v === 'goals' || v === 'tasks') weekTab = v;
  if (v === 'more' && moreTab === 'home') moreTab = 'home';
  view = map[v] || v; closeModal(); render(); window.scrollTo(0, 0);
}
function shiftDay(n) { curDate = addDays(curDate, n); render(); }
function goToday() { curDate = new Date(); curDate.setHours(0, 0, 0, 0); render(); }
function renderNav() { const d = new Date(), o = day(d), dc = S.counters.items.find((c) => c.id === 'dials'), tg = dc ? dc.targets[dow(d)] || 0 : 0, left = Math.max(0, tg - (Number(o.counters.dials) || 0)); const nm = nowMin(); const inBlock = blocksFor(d).some((b) => b.kind === 'dials' && tmin(b.start) <= nm && nm < tmin(b.end)); $('nav').innerHTML = NAV.map(([v, ic, l]) => `<button class="${view === v ? 'on' : ''}" onclick="show('${v}')"><span class="ic">${ic}</span>${l}${v === 'dial' && left && (inBlock || nm >= 15 * 60) ? `<span class="badge">${left}</span>` : ''}</button>`).join(''); }
function renderTop() {
  const titles = { now: isToday(curDate) ? 'Now' : fmtShort(curDate), dial: 'Dial', train: 'Train', week: 'Week', me: 'Me' };
  $('top-title').textContent = titles[view];
  const sub = $('top-sub');
  if (view === 'now') sub.textContent = fmtDate(curDate) + (isToday(curDate) ? '' : ' · not today');
  else if (view === 'dial') { const dc = S.counters.items.find((c) => c.id === 'dials'); sub.textContent = `${counterWeek('dials', new Date())} / ${dc ? dc.weekly : 225} this week · ${counterTotal('owners')} owner talks`; }
  else if (view === 'train') sub.textContent = fmtDate(curDate);
  else if (view === 'week') sub.textContent = 'Week of ' + fmtShort(monday(curDate));
  else sub.textContent = 'v' + APP_VERSION + (syncReady() ? ' · ' + syncLabel() : '');
  const nav = (view === 'now' || view === 'train' || view === 'week') ? `<div class="datenav"><button onclick="shiftDay(-1)">‹</button><div class="cur" onclick="goToday()">${isToday(curDate) ? 'Today' : fmtShort(curDate)}<small>${DAY_SHORT[dow(curDate)]}</small></div><button onclick="shiftDay(1)">›</button></div>` : '';
  $('top-right').innerHTML = nav + `<button class="iconbtn" onclick="openSpend()" title="Spent cash" aria-label="Spent cash">💸</button>`;
}
function render() {
  renderNav(); renderTop();
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + view));
  ({ now: renderNow, dial: renderDial, train: renderTrainView, week: renderWeek, me: renderMe })[view]();
}

/* ───────── NOW: the cockpit ───────── */
function heroCard(d) {
  const nm = nowMin(), bl = blocksFor(d), o = day(d), w = dow(d);
  const cur = bl.filter((b) => tmin(b.start) <= nm && nm < tmin(b.end)).sort((a, b) => tmin(b.start) - tmin(a.start))[0];
  const next = bl.find((b) => tmin(b.start) > nm);
  const wake = tmin(S.settings.wake), bed = tmin(S.settings.bed); const pct = clamp(((nm - wake) / (bed - wake)) * 100, 0, 100);
  const left = cur ? tmin(cur.end) - nm : null;
  const dc = S.counters.items.find((c) => c.id === 'dials'), tg = dc ? dc.targets[w] || 0 : 0, v = Number(o.counters.dials) || 0;
  const kind = cur ? cur.kind : 'free';
  let action = '', line = '';
  if (nm >= tmin(S.settings.shutdown || '20:45')) { action = `<button class="btn primary lg block" onclick="startShutdown()">🌙 Start shutdown</button>`; }
  else if (kind === 'dials') { action = `<button class="btn primary lg block" onclick="startSession()">📞 Open the dialer · ${Math.max(0, tg - v)} left today</button>`; }
  else if (kind === 'bac') { action = S.timer ? '' : `<div class="row" style="gap:6px"><button class="btn primary lg grow" onclick="startTimer('bac',25)">▶ 25 min BAC</button><button class="btn lg" onclick="startTimer('bac',50)">▶ 50</button></div>`; }
  else if (kind === 'agency') { action = S.timer ? '' : `<button class="btn primary lg block" onclick="startTimer('deep',50)">▶ 50 min deep work · phone away</button>`; }
  else if (kind === 'train') { action = `<button class="btn primary lg block" onclick="show('train')">🏋️ Open today's workout</button>`; }
  else if (kind === 'tennis' && !/lesson|grupa/i.test(cur.title) && unloggedBlocks(d).some((b) => b.id === cur.id)) { action = `<div class="row" style="gap:6px"><button class="btn primary lg grow" onclick="logBlock('${cur.id}',true)">✓ Done: ${esc(cur.title)}</button><button class="btn lg" onclick="logBlock('${cur.id}',false)">Didn't</button></div>`; }
  else if (kind === 'routine' && /weigh/i.test(cur.title) && (o.weight == null || o.weight === '')) { action = `<button class="btn primary lg block" onclick="editWeight()">⚖️ Weigh in</button>`; }
  else if (tg && v < tg && nm >= 12 * 60) { action = `<button class="btn lg block" onclick="startSession()">📞 ${tg - v} dials still open today</button>`; }
  const top = o.top3.find((x) => x.t && !x.d);
  if (!action && top) line = `Next on the list: <b>${esc(top.t)}</b>`;
  const unl = unloggedBlocks(d).filter((b) => !cur || b.id !== cur.id); if (unl.length && !line) line = `Not logged yet: <b>${unl.map((b) => esc(b.title)).join(' · ')}</b> <a href="#" onclick="show('train');return false">log ›</a>`;
  return `<div class="card ac hero">
    <div class="kicker"><span>${cur ? 'Now' : 'Free'}</span><span class="mono">${pad(Math.floor(nm / 60))}:${pad(nm % 60)}</span></div>
    <div class="title">${cur ? esc(cur.title) : (next ? 'Nothing scheduled' : 'Day is done')}</div>
    <div class="when">${cur ? `${cur.start}–${cur.end === '24:00' ? '…' : cur.end} · <b>${left} min left</b>${cur.note ? ' · ' + esc(cur.note) : ''}` : ''}</div>
    ${action ? `<div class="action">${action}</div>` : ''}
    ${line ? `<div class="next">${line}</div>` : ''}
    ${next ? `<div class="next">Then <b>${esc(next.title)}</b> at ${next.start} <span class="dim">(in ${tmin(next.start) - nm} min)</span></div>` : ''}
    <div class="dayline"><i style="width:${pct}%"></i></div>
    <div class="row sb xs dim" style="margin-top:4px"><span>${S.settings.wake}</span><span>${Math.round(pct)}% of the day</span><span>${S.settings.bed}</span></div></div>`;
}
function tilesCard(o, d) {
  const w = dow(d), dc = S.counters.items.find((c) => c.id === 'dials'), bc = S.counters.items.find((c) => c.id === 'bac');
  const tg = dc ? dc.targets[w] || 0 : 0, v = Number(o.counters.dials) || 0, bt = bc ? bc.targets[w] || 0 : 0, bv = Number(o.counters.bac) || 0;
  const owners = counterTotal('owners'), og = Object.values(S.goals).find((g) => !g._del && g.source === 'counter:owners');
  const wt = o.weight != null && o.weight !== '' ? Number(o.weight) : null, lw = latestWeight(dk(d));
  const past = dk(d) < dk(new Date());
  return `<div class="tiles">
    <div class="tile ${tg && v >= tg ? 'hit' : (past && tg && v < tg ? 'miss' : '')}" onclick="show('dial')"><div class="n num">${v}<small>/${tg || '—'}</small></div><div class="l">dials</div></div>
    <div class="tile" onclick="show('dial')"><div class="n num">${owners}<small>/${og ? og.target : 100}</small></div><div class="l">owners</div></div>
    <div class="tile ${bt && bv >= bt ? 'hit' : (past && bt && bv < bt ? 'miss' : '')}" onclick="toggleSec('study');var e=document.getElementById('sec-study');e&&e.scrollIntoView({behavior:'smooth',block:'center'})"><div class="n num">${bv}<small>/${bt || '—'}</small></div><div class="l">BAC min</div></div>
    <div class="tile" onclick="editWeight()"><div class="n num">${wt != null ? fmt(wt, 1) : (lw ? `<span class="muted">${fmt(lw.w, 1)}</span>` : '—')}</div><div class="l">${wt != null ? 'kg today' : 'kg · last'}</div></div></div>`;
}
function renderNow() {
  const d = curDate, k = dk(d), o = day(k), today = isToday(d), ph = phaseFor(d), nm = nowMin(), w = dow(d);
  const parts = {};
  parts.timer = timerBanner();
  parts.stake = today ? stakeAlert() : '';
  parts.weigh = weighCard(o, k, d);
  parts.focus = ph === 'morning' ? focusMorning(o, d) : '';
  parts.hero = today && ph !== 'morning' ? heroCard(d) : '';
  parts.tiles = tilesCard(o, d);
  parts.shutdown = (ph === 'evening' || ph === 'past') ? shutdownCard(o, d) : '';
  parts.change = oneChangeBanner(d);
  parts.morning = routineCard('morning', d, o, ph === 'morning' || ph === 'future');
  parts.evening = routineCard('evening', d, o, ph === 'evening');
  parts.study = sec('study', '📚 Study & deep work', `${Number(o.counters.bac) || 0} min BAC · ${Number(o.counters.deep) || 0} deep`, countersBody(o, d), (() => { const b = blocksFor(d).find((x) => (x.kind === 'bac' || x.kind === 'agency') && tmin(x.start) <= nm && nm < tmin(x.end)); return !!b && today; })());
  parts.top3 = top3Card(o, k, d);
  parts.standards = standardsCard(o);
  parts.money = moneyCard(o, d);
  parts.log = sec('log', 'Sleep times', `${o.bedAt && o.wokeAt ? sleepDur(o.bedAt, o.wokeAt) : ''}`, sleepMoneyBody(o), false);
  parts.debrief = sec('debrief', 'Debrief', o.win || o.loss || o.fix ? '✓' : '30 seconds, honest', debriefBody(o), ph === 'evening' || ph === 'past');
  parts.grade = gradeCard(d);
  const dc = S.counters.items.find((c) => c.id === 'dials'), tg = dc ? dc.targets[w] || 0 : 0, v = Number(o.counters.dials) || 0;
  parts.coach = !today ? '' : ph === 'morning' ? coachLine('morning') : ph === 'evening' ? coachLine('evening') : (tg ? (v >= tg ? coachLine('hit') : nm >= 15 * 60 ? coachLine('behind') : coachLine('study')) : coachLine('weekend'));
  const order = {
    morning: ['timer', 'stake', 'weigh', 'focus', 'tiles', 'coach', 'top3', 'change', 'morning', 'study', 'standards', 'money', 'evening', 'log', 'debrief', 'grade'],
    day: ['timer', 'stake', 'hero', 'tiles', 'coach', 'top3', 'study', 'standards', 'money', 'change', 'weigh', 'morning', 'evening', 'log', 'debrief', 'grade'],
    evening: ['timer', 'stake', 'shutdown', 'tiles', 'coach', 'money', 'standards', 'debrief', 'study', 'top3', 'weigh', 'evening', 'morning', 'log', 'change', 'grade'],
    past: ['grade', 'tiles', 'weigh', 'money', 'standards', 'study', 'top3', 'debrief', 'shutdown', 'morning', 'evening', 'log'],
    future: ['tiles', 'top3', 'weigh', 'morning', 'evening', 'standards', 'log'],
  }[ph];
  $('view-now').innerHTML = order.map((p) => parts[p] || '').join('');
}

function countersBody(o, d) {
  const w = dow(d); const cs = S.counters.items.filter((c) => !['dials', 'owners'].includes(c.id)).filter((c) => (c.targets[w] || 0) > 0 || (o.counters[c.id] || 0) > 0 || c.weekly > 0);
  if (!cs.length) return '<div class="empty">No study targets today.</div>';
  return cs.map((c) => { const v = Number(o.counters[c.id]) || 0, tg = c.targets[w] || 0, wk = counterWeek(c.id, d), tot = counterTotal(c.id); const timed = c.unit === 'min';
    return `<div class="counter"><div class="top"><div class="name">${esc(c.title)}</div><div class="cnum">${v}${tg ? `<small> / ${tg}${c.unit ? ' ' + c.unit : ''}</small>` : (c.unit ? `<small> ${c.unit}</small>` : '')}</div></div>
      ${tg ? `<div class="bar"><i class="${c.color || ''}" style="width:${clamp((v / tg) * 100, 0, 100)}%"></i></div>` : ''}
      <div class="btns">${timed ? `<button class="btn" onclick="startTimer('${c.id}',25)">▶ 25</button><button class="btn" onclick="startTimer('${c.id}',50)">▶ 50</button>` : ''}${c.steps.slice(0, timed ? 2 : 3).map((s) => `<button class="btn" onclick="bump('${c.id}',${s})">+${s}</button>`).join('')}<button class="btn" onclick="bump('${c.id}',-${c.steps[0]})">−${c.steps[0]}</button><button class="btn" onclick="setCounter('${c.id}')">=</button></div>
      <div class="wk">${c.weekly ? `<span>week <b>${wk}</b> / ${c.weekly}${c.unit ? ' ' + c.unit : ''} ${wk >= c.weekly ? '✓' : `· ${c.weekly - wk} left`}</span>` : `<span>week <b>${wk}</b></span>`}<span>all time <b>${tot}</b></span></div></div>`; }).join('');
}

/* ───────── TRAIN ───────── */
function renderTrainView() { $('view-train').innerHTML = renderTrain(); }

/* ───────── WEEK: plan · tasks · goals · review ───────── */
function renderWeek() {
  const tabs = [['plan', 'Plan'], ['tasks', `Tasks${(() => { const n = tasksList().filter((t) => !t.done && t.due && t.due <= dk(new Date())).length; return n ? ' · ' + n : ''; })()}`], ['goals', 'Goals'], ['review', 'Review']];
  const head = `<div class="chips" style="margin-bottom:12px">${tabs.map(([v, l]) => `<span class="chip ${weekTab === v ? 'on' : ''}" onclick="weekTab='${v}';render()">${l}</span>`).join('')}</div>`;
  const body = weekTab === 'plan' ? renderPlan() : weekTab === 'tasks' ? renderTasks() + (tdOn() ? `<div class="xs muted" style="text-align:center;margin:6px 0">Todoist · ${esc(tdLabel())} · <a href="#" onclick="tdPull(false);return false">sync</a></div>` : `<div class="xs muted" style="text-align:center;margin:6px 0"><a href="#" onclick="moreTab='home';show('me');return false">Connect Todoist</a> to keep tasks in both places.</div>`) : weekTab === 'goals' ? renderGoals() : renderReview();
  $('view-week').innerHTML = head + body;
}

/* ───────── ME: settings & tools ───────── */
function renderMe() {
  const t = moreTab, sync = S.settings.sync;
  const back = t === 'home' ? '' : `<button class="btn sm ghost" style="margin-bottom:10px" onclick="moreTab='home';render()">‹ Back</button>`;
  let html = back;
  if (t === 'home') {
    html += `<div class="card">${[['weight', 'Weight history', 'chart, averages, pace to ' + S.settings.weightTarget + ' kg'], ['stakes', 'Stakes & minimum day', stakesOwed() ? fmt(stakesOwed()) + ' ' + S.settings.currency + ' owed' : 'never zero · ' + S.settings.stake + ' ' + S.settings.currency + ' per missed day'], ['routines', 'Routines & standards', 'edit the morning / evening lists and the 7 standards'], ['counters', 'Daily targets', 'dials, BAC minutes, deep work, per weekday'], ['sync', 'Sync & backup', sync.code ? 'connected · ' + syncLabel() : 'phone ↔ laptop'], ['install', 'Install on home screen', 'iPhone & Android steps']].map(([v, a, b]) => `<div class="setting-row" onclick="moreTab='${v}';render()"><div><div class="t">${a}</div><div class="d">${b}</div></div><div class="arr">›</div></div>`).join('')}</div>
      <div class="card"><div class="card-t" style="margin-bottom:8px">Settings</div>
      <div class="kv"><span>Wake</span><input type="time" value="${S.settings.wake}" onchange="S.settings.wake=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Bed</span><input type="time" value="${S.settings.bed}" onchange="S.settings.bed=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Shutdown starts</span><input type="time" value="${S.settings.shutdown}" onchange="S.settings.shutdown=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Weight target (kg)</span><input type="number" inputmode="decimal" value="${S.settings.weightTarget}" onchange="S.settings.weightTarget=Number(this.value)||85;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>BAC first exam</span><input type="date" value="${S.settings.bacDate}" onchange="S.settings.bacDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Big date</span><input type="date" value="${S.settings.bigDate}" onchange="S.settings.bigDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Currency</span><input value="${esc(S.settings.currency)}" onchange="S.settings.currency=this.value||'MDL';S.settings._u=Date.now();save()"></div></div>
      ${tdCard()}
      <div class="card flat"><div class="row sb"><div><div style="font-weight:600">Classic War Room</div><div class="xs muted">The previous version, same data. If anything here is off on a dial day, use it.</div></div><a class="btn sm" href="./classic/">Open</a></div></div>
      <div class="xs dim" style="text-align:center;margin:10px 0">War Room v${APP_VERSION} · data on this device${sync.code ? ' + cloud' : ''}${Q ? ` · queue ${qItems().length} agencies` : ''}</div>`;
  } else if (t === 'weight') html += renderWeight();
  else if (t === 'stakes') html += renderStakes();
  else if (t === 'routines') html += renderRoutinesEditor();
  else if (t === 'counters') html += renderCountersEditor();
  else if (t === 'sync') html += renderSync() + `<div class="card flat"><div class="row sb"><div class="small">Call queue${qState.status === 'ok' ? ' · <span class="ok">synced</span>' : qState.status === 'err' ? ' · <span class="bad">' + esc(qState.msg) + '</span>' : ''}</div><button class="btn sm" onclick="qPull(false).then(()=>render())">Sync queue</button></div></div>`;
  else if (t === 'install') html += `<div class="card"><div class="card-t" style="margin-bottom:8px">iPhone (Safari)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in <b>Safari</b>.</li><li>Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</li></ol></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Android (Chrome)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in Chrome.</li><li><b>⋮</b> → <b>Add to Home screen</b> / <b>Install app</b>.</li><li>Long-press the icon for the <b>Dial</b> and <b>Spend</b> shortcuts.</li></ol></div>`;
  $('view-me').innerHTML = html;
}

/* ───────── init ───────── */
load(); migrateV4(); evaluateStakes();
const _qs = location.search;
if (/[?&]dial\b/.test(_qs)) view = 'dial';
render();
if (/[?&]spend\b/.test(_qs)) setTimeout(openSpend, 150);
if (_qs) history.replaceState(null, '', location.pathname);
qLoad();
if (syncReady()) pullCloud(true);
if (tdOn()) { tdFlush(); tdPull(true); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const t = new Date(); t.setHours(0, 0, 0, 0); if (view === 'now' && dk(curDate) < dk(t) && dk(curDate) === dk(addDays(t, -1)) && t.getHours() < 12) curDate = t; evaluateStakes(); render(); if (syncReady()) { pullCloud(true); qPull(true); } if (tdOn()) { tdFlush(); tdPull(true); } } });
setInterval(() => { if (view === 'now' && isToday(curDate) && !document.activeElement.matches('input,textarea')) render(); }, 60000);
if ('serviceWorker' in navigator) {
  let wrReloaded = false; const hadSW = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', () => { if (wrReloaded || !hadSW) return; wrReloaded = true; location.reload(); });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready', 'Reload', () => location.reload()); }); }); }).catch(() => {});
}
