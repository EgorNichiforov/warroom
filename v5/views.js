/* War Room v5 · views: HQ, Train, Plan, Me. Navigation + init. Food, Stats and the game layer live in their own files. */
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

/* ───────── v5 migration: the 150-dial week (Mon 5 · Tue 50 · Wed 5 · Thu 70 · Fri 20), food state ───────── */
function migrateV5() {
  S.migrations = S.migrations || {}; foodState();
  if (S.migrations.m20261112) return;
  const t = now(), dc = S.counters.items.find((c) => c.id === 'dials');
  if (dc && dc.weekly === 225) { dc.targets = [0, 5, 50, 5, 70, 20, 0, 0]; dc.weekly = 150; S.counters._u = t; }
  for (const id in S.goals) { const g = S.goals[id]; if (g && !g._del && g.source === 'counter:dials:week' && g.target === 225) { g.title = '150 dials'; g.target = 150; g._u = t; } }
  S.migrations.m20261112 = t; save(true);
}

/* ───────── coach lines (paraphrased from Egor's own KB summaries; [#N] = knowledge/video_index.md) ───────── */
function coachLine(ctx) {
  const L = {
    behind: ['Hormozi', 'Volume negates luck. Judge yourself on the inputs you control: dials, not outcomes.', '#1 · #8'],
    hit: ['Hormozi', 'Target hit. Patience is a behavior: do the obvious thing for an unusually long time.', '#9 · #16'],
    morning: ['Hormozi', 'Real work starts when motivation runs out. Tap Done, then the next one.', '#168'],
    weekend: ['Hormozi', 'New ideas look best exactly when you hit the hard level. Ignore the shiny object; prep the queue.', '#126 · #230'],
    evening: ['Jocko', 'Own the loss, name the fix. One sentence each, then phone out.', 'mentors/INDEX'],
    study: ['Hormozi', 'Most productivity systems are guilt-free procrastination. Do only the task you set out to do.', '#46 · #75'],
  }[ctx];
  return L ? `<div class="coach" title="From your notes: ${L[2]}">${L[0]}'s idea, from your notes: <b>${esc(L[1])}</b></div>` : '';
}

/* ───────── navigation ───────── */
const NAV = [['now', 'hq', 'HQ'], ['dial', 'dial', 'Dial'], ['train', 'train', 'Train'], ['food', 'food', 'Food'], ['stats', 'stats', 'Stats'], ['cal', 'cal', 'Calendar'], ['book', 'book', 'Playbook'], ['ask', 'chat', 'Ask'], ['week', 'plan', 'Plan'], ['me', 'me', 'Me']];
let moreTab = 'home', weekTab = 'plan';
function show(v) {
  const map = { today: 'now', hq: 'now', more: 'me', plan: 'week', goals: 'week', tasks: 'week', review: 'week' };
  if (v === 'plan' || v === 'goals' || v === 'tasks' || v === 'review') weekTab = v;
  if (v === 'me' && view === 'me') moreTab = 'home';
  view = map[v] || v; closeModal(); render(); window.scrollTo(0, 0);
}
function shiftDay(n) { curDate = addDays(curDate, n); render(); }
function goToday() { curDate = new Date(); curDate.setHours(0, 0, 0, 0); render(); }
function dialBadge() { const d = new Date(), o = day(d), tg = dialTarget(d), left = Math.max(0, tg - (Number(o.counters.dials) || 0)), nm = nowMin(); const inBlock = blocksFor(d).some((b) => b.kind === 'dials' && tmin(b.start) <= nm && nm < tmin(b.end)); return left && (inBlock || nm >= 15 * 60) ? left : 0; }
function renderNav() {
  const badge = dialBadge();
  // phone: five screens + More (Plan and Me live behind it)
  const phone = NAV.slice(0, 5).concat([['me', 'more', 'More']]);
  $('nav').innerHTML = phone.map(([v, icn, l]) => `<button class="${view === v || (v === 'me' && ['week', 'cal', 'book', 'ask'].includes(view)) ? 'on' : ''}" onclick="show('${v}')">${ic(icn, 23)}${l}${v === 'dial' && badge ? `<span class="badge">${badge}</span>` : ''}</button>`).join('');
  // desktop: sidebar
  const r = rankInfo(), left = daysUntil(S.settings.bigDate), t = new Date();
  $('side').innerHTML = `<div class="brand"><div class="mk">${ic('hq', 20)}</div><div><b>WAR ROOM</b><span>$20K MRR · ${fmtShort(pd(S.settings.bigDate)).toUpperCase()} ${pd(S.settings.bigDate).getFullYear()}</span></div></div>
    <div class="dd"><b>D-${left}</b><span>${DAY_SHORT[dow(t)]} ${t.getDate()} ${t.toLocaleDateString('en-GB', { month: 'short' })}<br>week ${isoWeek(t)}</span></div>
    <nav>${NAV.map(([v, icn, l]) => `<button class="${view === v ? 'on' : ''}" onclick="show('${v}')">${ic(icn, 20)}${l}${v === 'dial' && badge ? `<span class="badge">${badge}</span>` : v === 'ask' && inboxUnread() ? `<span class="badge">${inboxUnread()}</span>` : ''}</button>`).join('')}</nav>
    <div class="sp"></div>
    <div class="srank" onclick="openRank()"><div class="rank"><div class="ins">${insignia(r.i)}</div><div class="bd"><div class="nm">${r.name}</div><div class="lv">Level ${r.i + 1}</div></div></div><div class="xpbar"><i style="width:${r.pct}%"></i></div><div class="ft"><span>${fmt(r.xp)} XP</span><span>${r.next != null ? fmt(r.toNext) + ' to go' : 'top rank'}</span></div></div>
    <div class="sync ${syncSummary().ok ? 'ok' : 'err'}" onclick="moreTab='home';view='me';render()" style="cursor:pointer" title="Devices and sync"><i></i>v${APP_VERSION} · ${syncSummary().short}</div>`;
}
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 86400000 + 1) / 7); }
function renderTop() {
  const titles = { now: isToday(curDate) ? 'HQ' : fmtShort(curDate), dial: 'Dial', train: 'Train', food: 'Food', stats: 'Stats', week: 'Plan', cal: 'Calendar', book: 'Playbook', ask: 'Ask', me: view === 'me' && moreTab !== 'home' ? 'Settings' : 'More' };
  $('top-title').innerHTML = view === 'now' && isToday(curDate) ? '<span class="only-phone">HQ</span><span class="only-desk">Headquarters</span>' : esc(titles[view]);
  const sub = $('top-sub'), t = new Date();
  if (view === 'now') sub.textContent = `${DAY_SHORT[dow(curDate)]} ${curDate.getDate()} ${curDate.toLocaleDateString('en-GB', { month: 'short' })}${window.innerWidth >= 1000 ? ' · week ' + isoWeek(curDate) : ' · D-' + daysUntil(S.settings.bigDate)}` + (isToday(curDate) || window.innerWidth < 700 ? '' : ' · not today');
  else if (view === 'dial') { const dc = counterDef('dials'); sub.textContent = `${counterWeek('dials', t)} / ${dc ? dc.weekly : 150} this week · ${counterTotal('owners')} owner talks`; }
  else if (view === 'train') sub.textContent = fmtDate(curDate);
  else if (view === 'food') { const ft = foodTotals(curDate), tt = foodTargets(); sub.textContent = ft.kcal >= tt.kcal ? `target hit · ${Math.round(ft.p)} / ${tt.p} g protein` : `${fmt(tt.kcal - ft.kcal)} kcal · ${Math.max(0, Math.round(tt.p - ft.p))} g P left`; }
  else if (view === 'stats') sub.textContent = `${fmt(counterTotal('dials'))} dials · ${counterTotal('owners')} owner talks · ${rankInfo().name}`;
  else if (view === 'week') sub.textContent = 'Week of ' + fmtShort(monday(curDate));
  else if (view === 'cal') sub.textContent = calOn() ? (calUsesSchedule() ? 'Google Calendar · HQ follows it' : 'Google Calendar') : 'not connected yet';
  else if (view === 'book') sub.textContent = `${pbAll().length} pages · plan, rules, scripts, SOPs`;
  else if (view === 'ask') sub.textContent = 'your playbook + your numbers';
  else sub.textContent = 'v' + APP_VERSION + ' · ' + syncSummary().short;
  const nav = (view === 'now' || view === 'train' || view === 'week' || view === 'food') ? `<div class="datenav"><button onclick="shiftDay(-1)" aria-label="Previous day">‹</button><div class="cur" onclick="goToday()">${isToday(curDate) ? 'Today' : fmtShort(curDate)}<small>${DAY_SHORT[dow(curDate)]}</small></div><button onclick="shiftDay(1)" aria-label="Next day">›</button></div>` : '';
  $('top-right').innerHTML = nav + (view === 'ask' ? '' : `<button class="iconbtn askbtn" onclick="show('ask')" title="Ask" aria-label="Ask">${ic('chat', 19)}${inboxUnread() ? `<i class="dot"></i>` : ''}</button>`) + `<button class="iconbtn capbtn" onclick="openCapture()" title="Add (task, idea, note, spend, meal)" aria-label="Add">+</button>`;
}
function renderRail() {
  const el = $('rail'); if (!el) return; if (['now', 'stats', 'food', 'cal', 'book'].includes(view)) { el.innerHTML = ''; return; }
  const t = new Date(); el.innerHTML = ringsCard(t, true) + rankCard() + weekCard(t);
}
function render() {
  document.body.dataset.view = view;
  renderNav(); renderTop();
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + view));
  ({ now: renderNow, dial: renderDial, train: renderTrainView, food: renderFood, stats: renderStats, week: renderWeek, me: renderMe, cal: renderCal, book: renderBook, ask: renderAsk })[view]();
  renderRail();
  checkGame();
}

/* ───────── NOW: the cockpit ───────── */
function heroCard(d) {
  const nm = nowMin(), bl = blocksFor(d), o = day(d), w = dow(d);
  const cur = bl.filter((b) => tmin(b.start) <= nm && nm < tmin(b.end)).sort((a, b) => tmin(b.start) - tmin(a.start))[0];
  const next = bl.find((b) => tmin(b.start) > nm);
  const wake = tmin(S.settings.wake), bed = tmin(S.settings.bed); const pct = clamp(((nm - wake) / (bed - wake)) * 100, 0, 100);
  const left = cur ? tmin(cur.end) - nm : null;
  const dc = S.counters.items.find((c) => c.id === 'dials'), tg = dialTargetFor(d), v = Number(o.counters.dials) || 0;
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
    <div class="when">${cur ? `${cur.start}–${cur.end === '24:00' ? '…' : cur.end} · <b>${left} min left</b> · <a href="#" onclick="blockSheet('${cur.id}','${dk(d)}');return false">cancel / move</a>${cur.note ? '<br><span class="muted">' + esc(cur.note) + '</span>' : ''}` : ''}</div>
    ${action ? `<div class="action">${action}</div>` : ''}
    ${line ? `<div class="next">${line}</div>` : ''}
    ${next ? `<div class="next">Then <b>${esc(next.title)}</b> at ${next.start} <span class="dim">(in ${tmin(next.start) - nm} min)</span> · <a href="#" onclick="blockSheet('${next.id}','${dk(d)}');return false">cancel / move</a></div>` : ''}
    <div class="dayline"><i style="width:${pct}%"></i></div><div class="daycap"><span>${Math.round(pct)}% of the day used</span><span>${(() => { const m = tmin(S.settings.shutdown || '20:45') - nm; return m > 0 ? `${m >= 60 ? Math.floor(m / 60) + ' h ' : ''}${m % 60} min to shutdown` : 'shutdown time'; })()}</span></div></div>`;
}
function renderNow() {
  const d = curDate, k = dk(d), o = day(k), today = isToday(d), ph = phaseFor(d), nm = nowMin(), w = dow(d);
  const parts = {};
  parts.timer = timerBanner();
  parts.stake = today ? stakeAlert() : '';
  parts.weigh = weighCard(o, k, d);
  parts.focus = ph === 'morning' ? focusMorning(o, d) : '';
  parts.hero = today && ph !== 'morning' ? heroCard(d) : '';
  parts.callbacks = today ? callbacksCard() : '';
  parts.rings = ringsCard(d);
  parts.quick = ordersCard(d);
  parts.shutdown = (ph === 'evening' || ph === 'past') ? shutdownCard(o, d) : '';
  parts.change = oneChangeBanner(d);
  parts.morning = routineCard('morning', d, o, ph === 'morning' || ph === 'future');
  parts.evening = routineCard('evening', d, o, ph === 'evening');
  parts.study = sec('study', 'Study &amp; deep work', `${Number(o.counters.bac) || 0} min BAC · ${Number(o.counters.deep) || 0} deep`, countersBody(o, d), (() => { const b = blocksFor(d).find((x) => (x.kind === 'bac' || x.kind === 'agency') && tmin(x.start) <= nm && nm < tmin(x.end)); return !!b && today; })());
  parts.top3 = todayTasksCard(d);
  parts.standards = standardsCard(o);
  parts.money = moneyCard(o, d);
  parts.log = sec('log', 'Sleep · bed and wake time', `${o.bedAt && o.wokeAt ? sleepDur(o.bedAt, o.wokeAt) : 'feeds the sleep intel'}`, sleepMoneyBody(o), false);
  parts.debrief = sec('debrief', 'Debrief', o.win || o.loss || o.fix ? '✓' : '30 seconds, honest', debriefBody(o), ph === 'evening' || ph === 'past');
  const tg = dialTarget(d), v = Number(o.counters.dials) || 0;
  parts.coach = !today ? '' : ph === 'morning' ? coachLine('morning') : ph === 'evening' ? coachLine('evening') : (tg ? (v >= tg ? coachLine('hit') : nm >= 15 * 60 ? coachLine('behind') : coachLine('study')) : coachLine('weekend'));
  // A: what to do now · B: today's checklist · C: where you stand
  parts.week = weekCard(d);
  const A = { morning: ['timer', 'stake', 'weigh', 'focus', 'callbacks', 'rings', 'quick', 'week'], day: ['timer', 'stake', 'hero', 'callbacks', 'rings', 'quick', 'week'], evening: ['timer', 'stake', 'shutdown', 'callbacks', 'rings', 'quick', 'week'], past: ['rings', 'quick', 'shutdown', 'week'], future: ['rings', 'week'] }[ph];
  const B = { morning: ['top3', 'change', 'morning', 'study', 'standards', 'money', 'evening', 'log', 'debrief', 'coach'], day: ['top3', 'standards', 'study', 'money', 'change', 'weigh', 'morning', 'evening', 'log', 'debrief', 'coach'], evening: ['standards', 'money', 'debrief', 'study', 'top3', 'weigh', 'evening', 'morning', 'log', 'change', 'coach'], past: ['weigh', 'money', 'standards', 'study', 'top3', 'debrief', 'morning', 'evening', 'log'], future: ['top3', 'weigh', 'morning', 'evening', 'standards', 'log'] }[ph];
  const _ss = syncSummary(), C = (inboxUnread() ? inboxCard(2) : '') + (today && !_ss.ok ? `<div class="card flat" onclick="moreTab='home';show('me')" style="cursor:pointer;border-color:rgba(255,165,31,.4)"><div class="row sb"><div><div class="lab" style="color:var(--acc)">Sync: ${_ss.short}</div><div class="small muted" style="margin-top:3px">Phone and laptop are not linked yet. Tap to link them.</div></div><span class="pill warn">fix</span></div></div>` : '') + rankCard() + gradeStreaksCard(d) + (today ? upNextCard() : '') + campaignCard() + nextMedalsCard();
  $('view-now').innerHTML = `<div class="hq"><div class="hq-a">${A.map((p) => parts[p] || '').join('')}</div><div class="hq-b">${B.map((p) => parts[p] || '').join('')}</div><div class="hq-c">${C}</div></div>`;
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
  const body = weekTab === 'plan' ? renderPlan() : weekTab === 'tasks' ? renderTasks() + (tdOn() ? `<div class="xs muted" style="text-align:center;margin:6px 0">Todoist · ${esc(tdLabel())} · <a href="#" onclick="tdPull(false);return false">sync</a></div>` : `<div class="xs muted" style="text-align:center;margin:6px 0"><a href="#" onclick="moreTab='home';show('me');return false">Connect Todoist</a> to keep tasks in both places.</div>`) : weekTab === 'goals' ? renderGoals() : weekReportCard(curDate) + businessCard() + renderReview();
  $('view-week').innerHTML = head + body;
}

/* ───────── ME: settings & tools ───────── */
function renderMe() {
  const t = moreTab, sync = S.settings.sync;
  const back = t === 'home' ? '' : `<button class="btn sm ghost" style="margin-bottom:10px" onclick="moreTab='home';render()">‹ Back</button>`;
  let html = back;
  if (t === 'home') {
    html += `<div class="launch">${[['book', 'book', 'Playbook', 'plan, scripts, SOPs'], ['cal', 'cal', 'Calendar', calOn() ? 'Google Calendar' : 'connect it'], ['ask', 'chat', 'Ask', inboxUnread() ? inboxUnread() + ' new from Claude' : 'questions, answered'], ['week', 'plan', 'Plan', 'week · tasks · review']].map(([v, icn, l, d]) => `<button onclick="show('${v}')">${ic(icn, 24)}<b>${l}</b><span>${d}</span></button>`).join('')}</div>` + devicesCard() + `<div class="card only-phone">${[['plan', 'Week plan', 'the schedule, block by block'], ['tasks', 'Tasks', 'everything with a due date'], ['goals', 'Goals', 'long, month and week targets'], ['review', 'Sunday review', 'the only place the plan changes']].map(([v, a, b]) => `<div class="setting-row" onclick="show('${v}')"><div><div class="t">${a}</div><div class="d">${b}</div></div><div class="arr">›</div></div>`).join('')}</div>` + rankCard() + `<div class="card"><div class="setting-row" onclick="openManual()"><div><div class="t">How it works</div><div class="d">the whole app on one screen</div></div><div class="arr">›</div></div><div class="setting-row" onclick="foodAiModal()"><div><div class="t">Food photo AI</div><div class="d">${aiOn() ? 'on · key saved on this device' : 'off · add a key so photos fill calories and macros'}</div></div><div class="arr">›</div></div><div class="setting-row" onclick="foodSavedModal()"><div><div class="t">Food targets &amp; saved meals</div><div class="d">${foodTargets().kcal} kcal · ${foodTargets().p} g protein a day</div></div><div class="arr">›</div></div></div>`;
    html += `<div class="card">${[['weight', 'Weight history', 'chart, averages, pace to ' + S.settings.weightTarget + ' kg'], ['stakes', 'Stakes & minimum day', stakesOwed() ? fmt(stakesOwed()) + ' ' + S.settings.currency + ' owed' : 'never zero · ' + S.settings.stake + ' ' + S.settings.currency + ' per missed day'], ['routines', 'Routines & standards', 'edit the morning / evening lists and the 7 standards'], ['counters', 'Daily targets', 'dials, BAC minutes, deep work, per weekday'], ['programs', 'Training programs & split', 'edit the weekly programs and which day gets which'], ['sync', 'Sync & backup', sync.code ? 'connected · ' + syncLabel() : 'phone ↔ laptop'], ['install', 'Install on home screen', 'iPhone & Android steps']].map(([v, a, b]) => `<div class="setting-row" onclick="moreTab='${v}';render()"><div><div class="t">${a}</div><div class="d">${b}</div></div><div class="arr">›</div></div>`).join('')}</div>
      <div class="card"><div class="card-t" style="margin-bottom:8px">Settings</div>
      <div class="kv"><span>Wake</span><input type="time" value="${S.settings.wake}" onchange="S.settings.wake=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Bed</span><input type="time" value="${S.settings.bed}" onchange="S.settings.bed=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Shutdown starts</span><input type="time" value="${S.settings.shutdown}" onchange="S.settings.shutdown=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Weight target (kg)</span><input type="number" inputmode="decimal" value="${S.settings.weightTarget}" onchange="S.settings.weightTarget=Number(this.value)||85;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>BAC first exam</span><input type="date" value="${S.settings.bacDate}" onchange="S.settings.bacDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Big date</span><input type="date" value="${S.settings.bigDate}" onchange="S.settings.bigDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Currency</span><input value="${esc(S.settings.currency)}" onchange="S.settings.currency=this.value||'MDL';S.settings._u=Date.now();save()"></div></div>
      ${tdCard()}
      
      <div class="xs dim" style="text-align:center;margin:10px 0">War Room v${APP_VERSION} · data on this device${sync.code ? ' + cloud' : ''}${Q ? ` · queue ${qItems().length} agencies` : ''}</div>`;
  } else if (t === 'weight') html += renderWeight();
  else if (t === 'stakes') html += renderStakes();
  else if (t === 'routines') html += renderRoutinesEditor();
  else if (t === 'counters') html += renderCountersEditor();
  else if (t === 'programs') html += programsCard();
  else if (t === 'sync') html += renderSync() + `<div class="card flat"><div class="row sb"><div class="small">Call queue${qState.status === 'ok' ? ' · <span class="ok">synced</span>' : qState.status === 'err' ? ' · <span class="bad">' + esc(qState.msg) + '</span>' : ''}</div><button class="btn sm" onclick="qPull(false).then(()=>render())">Sync queue</button></div></div>`;
  else if (t === 'install') html += `<div class="card"><div class="card-t" style="margin-bottom:8px">iPhone (Safari)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in <b>Safari</b>.</li><li>Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.</li></ol></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Android (Chrome)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in Chrome.</li><li><b>⋮</b> → <b>Add to Home screen</b> / <b>Install app</b>.</li><li>Long-press the icon for the <b>Dial</b> and <b>Spend</b> shortcuts.</li></ol></div>`;
  $('view-me').innerHTML = html;
}

/* ───────── init ───────── */
load(); migrateV4(); migrateV5(); evaluateStakes();
const _qs = location.search;
if (/[?&]dial\b/.test(_qs)) view = 'dial';
if (/[?&]meal\b/.test(_qs)) view = 'food';
render();
linkFromUrl();
if (/[?&]spend\b/.test(_qs)) setTimeout(openSpend, 150);
if (_qs) history.replaceState(null, '', location.pathname);
qLoad(); bLoad();
if (syncReady()) pullCloud(true).then(() => { devHeartbeat(); aiAutoShare(); calFetch(true); });
else calFetch(true);
setInterval(() => { if (document.visibilityState === 'visible') calFetch(true); }, 10 * 60000);
setInterval(devHeartbeat, 5 * 60000);
if (tdOn()) { tdFlush(); tdPull(true); }
setInterval(() => { if (tdOn() && document.visibilityState === 'visible') tdPull(true); }, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const t = new Date(); t.setHours(0, 0, 0, 0); if (view === 'now' && dk(curDate) < dk(t) && dk(curDate) === dk(addDays(t, -1)) && t.getHours() < 12) curDate = t; evaluateStakes(); render(); if (syncReady()) { pullCloud(true); qPull(true); bPull(true); } calFetch(true); if (tdOn()) { tdFlush(); tdPull(true); } } });
setInterval(() => { if (view === 'now' && isToday(curDate) && !document.activeElement.matches('input,textarea') && !$('modal-bg').classList.contains('open')) render(); }, 60000);
document.addEventListener('keydown', (e) => { if (e.metaKey || e.ctrlKey || e.altKey || $('modal-bg').classList.contains('open') || (e.target && e.target.matches && e.target.matches('input,textarea,select'))) return; const i = '1234567890'.indexOf(e.key); if (i >= 0 && e.key.length === 1 && NAV[i]) { show(NAV[i][0]); } else if (e.key === '/') { e.preventDefault(); show('ask'); setTimeout(() => { const a = $('ask-in'); if (a) a.focus(); }, 50); } else if (e.key === 't' || e.key === 'T') goToday(); });
if ('serviceWorker' in navigator) {
  let wrReloaded = false; const hadSW = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', () => { if (wrReloaded || !hadSW) return; wrReloaded = true; location.reload(); });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready', 'Reload', () => location.reload()); }); }); }).catch(() => {});
}
