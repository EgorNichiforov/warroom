/* War Room 13.24 · mission.js — MISSION CONTROL. One place decides what today is for.
   Layers (WAR_ROOM_MASTER_ARCHITECTURE.md): Direction (season) → Organization (calendar, counters, CRM, BAC) →
   Intelligence (mcBuild: facts → candidates → transparent ranking) → Execution (mission card, focus contract, restart)
   → Feedback (evidence on the day record, weekly review).
   Rules of the engine, in order. No blended score: a lower tier never outranks a higher one.
     0 Fixed commitment  school, tennis lessons, travel, sleep. Never traded.
     1 Season priority   the domain the current season puts first (business, BAC, body…).
     2 Protected         the daily floor of the other domains, callbacks due, the Sunday review.
     3 Maintenance       fading ideas to recall, preparation.
   Inside a tier the larger remaining gap goes first. Every candidate carries: outcome, why, next physical action,
   minutes, definition of done, evidence (measured facts with their source), what happens if delayed, confidence.
   Facts are measured from the app's own records. Anything missing is listed as unknown, never guessed.
   Sources of truth: dials = the CALL LOG (dial.js Q.items[].log). The hand counter is shown apart as "not in the log".
   Day modes: Full · Minimum (floors only) · Recovery (nothing but fixed commitments; never breaks a streak).
   Stored on the day record (syncs per field): o.mode, o.mc {k, at}, o.mcDone, o.mcPick, o.fc [contracts], o.appMin.
   Season: S.settings.season {kind, dom, primary, secondary, paused, review}. */
'use strict';

const MC_MODES = { full: ['Full', 'Normal capacity. Run the whole plan.'], min: ['Minimum', 'Limited capacity. Floors only: the minimum dials and BAC minutes. Nothing extra.'], rec: ['Recovery', 'Recover on purpose. Only fixed commitments. Not a failure, and it never breaks a streak.'] };
const MC_SEASONS = { build: 'Build', exam: 'Exam', recovery: 'Recovery', transition: 'Transition', explore: 'Exploration' };
const MC_DOMS = { biz: 'Business', bac: 'BAC', body: 'Body', life: 'Life' };
const MC_TIER = ['Fixed commitment', 'Season priority', 'Protected commitment', 'Maintenance'];
let mcLast = null, mcOpenCard = false;
function mcToggle() { mcOpenCard = !mcOpenCard; mcRefresh(); }
/* 13.24.1: everything on the Day screen that is not the mission or the step you are on sits behind one More fold */
function mcMoreBtn() { const on = (document.getElementById('arc') || { classList: { contains: () => false } }).classList.contains('more'); return `<button class="arc-more" onclick="arcMoreToggle(this)">${on ? 'Less ▴' : 'Supporting facts ▾'}</button>`; }
function arcMoreToggle(btn) { const a = document.getElementById('arc'); if (!a) return; const on = a.classList.toggle('more'); if (btn) btn.textContent = on ? 'Less ▴' : 'Supporting facts ▾'; }
/* 13.24.1: forgot to tap "going to sleep"? type last night's times in ten seconds */
function mcSleepOpen() { const o = S.days[dk(new Date())] || {}; openModal(`<h2>Last night's sleep</h2><div class="hint">Type the two times. Saved as typed, exactly like a tapped night.</div><label class="xs muted">In bed, asleep around</label><input class="aq-in" type="time" id="sl-b" value="${esc(o.bedAt || S.settings.bed || '21:00')}"><label class="xs muted">Woke up</label><input class="aq-in" type="time" id="sl-w" value="${esc(o.wokeAt || S.settings.wake || '05:00')}"><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="mcSleepSave()">Save</button></div>`, true); }
function mcSleepSave() { const b = ($('sl-b') || {}).value, w = ($('sl-w') || {}).value; if (!b || !w) { toast('Enter both times'); return; } const o = day(new Date()); o.bedAt = b; o.wokeAt = w; o.sleepSrc = 'typed'; touch(o); closeModal(); toast('Sleep saved'); mcRefresh(); }
const mcHm = (m) => pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m) % 60);
function mcRefresh() { try { render(); } catch (e) { } try { if (typeof arcRender === 'function') arcRender(); } catch (e) { } }
function mcSeason() { const s = (S.settings || {}).season; return s && (s.primary || s.dom) ? s : null; }
function mcMode(d) { const o = S.days[dk(d || new Date())]; return (o && MC_MODES[o.mode] && o.mode) || 'full'; }
function mcSetMode(m) { const o = day(new Date()); o.mode = m; touch(o); closeModal(); toast(MC_MODES[m][0] + ' day. ' + MC_MODES[m][1]); mcRefresh(); }
function mcModeOpen() {
  const cur = mcMode(), rd = typeof readiness === 'function' ? (() => { try { return readiness(new Date()); } catch (e) { return null; } })() : null;
  openModal(`<h2>Today's mode</h2>${rd && rd.lvl ? `<div class="hint">Readiness ${rd.s}/100 suggests: <b>${esc(rd.lvl[1])}</b>. A suggestion from last night's sleep log, not a measurement of you. You choose.</div>` : '<div class="hint">No sleep logged, so there is no readiness suggestion today. <a onclick="closeModal();mcSleepOpen()">Enter last night\'s times</a>. You choose.</div>'}
    ${Object.keys(MC_MODES).map((m) => `<button class="mc-opt ${cur === m ? 'on' : ''}" onclick="mcSetMode('${m}')"><b>${MC_MODES[m][0]}</b><span>${MC_MODES[m][1]}</span></button>`).join('')}`, true);
}

/* ── facts ── */
/* Dials come from the call log. One pass over the log, grouped by local day. */
function mcDialLog() {
  const by = {}; let items = []; try { items = typeof qItems === 'function' && typeof Q !== 'undefined' && Q ? qItems() : []; } catch (e) { }
  items.forEach((x) => (x.log || []).forEach((l) => { if (!l || !l.at) return; const t = new Date(l.at); if (isNaN(t)) return; const k = dk(t), r = by[k] || (by[k] = { logged: 0, conv: 0, dm: 0 });
    if (!l.d || l.d.dials) r.logged++; if (/^(gatekeeper|owner talk)/i.test(l.r || '')) r.conv++; if (/^owner talk/i.test(l.r || '')) r.dm++; }));
  return by;
}
function mcDialEvidence(k, by) { const r = (by || mcDialLog())[k] || { logged: 0, conv: 0, dm: 0 }, counter = Number(((S.days[k] || {}).counters || {}).dials) || 0; return { logged: r.logged, conv: r.conv, dm: r.dm, counter, manual: Math.max(0, counter - r.logged) }; }
/* the counter may never be lower than the log (a sync conflict or an undo can leave it behind) */
function mcReconcile() { try { const k = dk(new Date()), E = mcDialEvidence(k); if (E.logged > E.counter) { const o = day(new Date()); o.counters.dials = E.logged; touch(o); } } catch (e) { } }
function mcFlorida() {
  const n = new Date(); let h = null, wd = '', t = '';
  try { h = Number(n.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24; wd = n.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' }); t = n.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' }); } catch (e) { }
  const m = h == null ? 0 : h * 60 + Number((t.split(':')[1]) || 0), work = !/Sat|Sun/.test(wd), open = h != null && work && m >= 540 && m < 1020;
  return { h, t, wd, open, known: h != null, closeIn: open ? 1020 - m : 0, opensIn: !open && work && m < 540 ? 540 - m : null };
}
function mcCallbacks(k) { try { return qItems().filter((x) => x.status === 'callback' && x.next_at && x.next_at <= k).length; } catch (e) { return 0; } }

/* ── the engine ── */
function mcBuild() {
  const d = new Date(), k = dk(d), o = S.days[k] || { counters: {} }, c = o.counters || {}, nm = nowMin(), mode = mcMode(d), ssn = mcSeason(), dom = ssn ? ssn.dom : null;
  let L = []; try { L = blocksFor(d).slice().sort((a, b) => tmin(a.start) - tmin(b.start)); } catch (e) { }
  const fixed = (b) => ['school', 'tennis', 'travel'].includes(b.kind), cur = L.find((b) => tmin(b.start) <= nm && nm < tmin(b.end) && b.kind !== 'sleep');
  const bedM = tmin(S.settings.bed || '21:00'), night = typeof oneNight === 'function' ? oneNight() : nm >= bedM;
  const nextFixed = L.find((b) => tmin(b.start) > nm && fixed(b)), free = Math.max(0, (nextFixed ? tmin(nextFixed.start) : Math.max(bedM, nm)) - nm);
  const C = [], unk = [], risks = [], ttl = (b) => String(b.title || '').replace(/^[^\p{L}\p{N}]+/u, '');
  const tierOf = (x) => (dom === x ? 1 : 2), go = (w) => () => mcOpen(w);
  if (!ssn) unk.push('No season set, so business and BAC are ranked as equals. Set one in 30 seconds.');

  if (night) C.push({ k: 'sleep', dom: 'fixed', tier: 0, urg: 1, out: 'Sleep', why: `It is past ${S.settings.bed || '21:00'}. Sleep is when today's learning is stored and tomorrow's energy is made.`, next: 'Lights out', go: () => (typeof oneGo === 'function' ? oneGo('sleep') : null), min: 0, dod: 'Phone down, lights out', ev: [`Bedtime in Settings: ${S.settings.bed || '21:00'}`], late: 'Every late hour is taken from tomorrow.', conf: 'measured' });
  if (cur && fixed(cur)) C.push({ k: 'fixed', sid: 'fixed:' + cur.id, dom: 'fixed', tier: 0, urg: 0.9, out: `Be fully at: ${ttl(cur)}`, why: `A fixed commitment until ${cur.end}. Everything else waits.`, next: '', go: null, min: tmin(cur.end) - nm, dod: `Present until ${cur.end}`, ev: [`Calendar block ${cur.start} to ${cur.end}`], late: 'Other people are counting on this one.', conf: 'measured' });
  else if (nextFixed && tmin(nextFixed.start) - nm <= 20) C.push({ k: 'fixed', sid: 'fixed:' + nextFixed.id, dom: 'fixed', tier: 0, urg: 0.8, out: `Get to: ${ttl(nextFixed)} by ${nextFixed.start}`, why: `It starts in ${tmin(nextFixed.start) - nm} minutes and cannot move.`, next: '', go: null, min: tmin(nextFixed.start) - nm, dod: `There at ${nextFixed.start}`, ev: [`Calendar block ${nextFixed.start} to ${nextFixed.end}`], late: 'Being late to a fixed commitment costs trust.', conf: 'measured' });

  /* business: the call log is the evidence */
  const by = mcDialLog(), E = mcDialEvidence(k, by), tgRaw = (typeof dialTargetFor === 'function' ? dialTargetFor(d) : 0) || 0, minD = Number(S.settings.minDials) || 10;
  const tg = mode === 'full' ? tgRaw : mode === 'min' ? Math.min(tgRaw, minD) : 0, left = Math.max(0, tg - E.logged), cb = mode === 'rec' ? 0 : mcCallbacks(k), fl = mcFlorida();
  let nextCall = null; try { nextCall = typeof currentCall === 'function' ? currentCall() : null; } catch (e) { }
  if (!fl.known) unk.push('Florida time could not be read on this device.');
  if (left > 0 || cb > 0) {
    const ev = [`Call log today: ${E.logged} dials, ${E.conv} answered, ${E.dm} owner conversations (source: logged calls)`, E.manual ? `${E.manual} more on the hand counter with no call behind them: not counted` : '', fl.known ? `Florida time ${fl.t} ${fl.wd}: agencies ${fl.open ? `open for ${fl.closeIn} more minutes` : 'closed'}` : '', cb ? `${cb} callback${cb > 1 ? 's' : ''} promised for today or earlier` : ''].filter(Boolean);
    if (fl.open || !fl.known) C.push({ k: 'dial', dom: 'biz', tier: tierOf('biz'), urg: tg ? Math.min(1, left / tg + (cb ? 0.1 : 0)) : 0.6, out: left ? `${left} more dials in the call log (${E.logged} of ${tg})` : `Return ${cb} callback${cb > 1 ? 's' : ''}`, why: cb ? 'A promised callback is the warmest call you have. Then the block.' : 'Owner conversations only come from logged dials. This is the one input you control.', next: nextCall && (nextCall.name || nextCall.agency) ? `Call ${nextCall.name || nextCall.agency}` : 'Open the dialer', go: go('dial'), min: Math.max(10, Math.min(free || 60, left * 2 || 15)), dod: left ? `${tg} dials in the log, every outcome recorded` : 'Every due callback attempted and logged', ev, late: fl.open ? `Florida closes in ${fl.closeIn} minutes. Today's window does not come back.` : 'The window is short. Unmade calls do not roll over.', conf: fl.known ? 'measured' : 'partly unknown: Florida time' });
    else if (dom === 'biz' || cb) C.push({ k: 'dialprep', dom: 'biz', tier: 3, urg: 0.3, out: 'Line up the first 10 calls for the next window', why: `Florida is closed (${fl.t} there${fl.opensIn != null ? `, opens in ${Math.floor(fl.opensIn / 60)} h ${fl.opensIn % 60} min` : ''}). Calling now reaches voicemail.`, next: 'Open the queue', go: go('dial'), min: 10, dod: 'Ten agencies picked, callbacks first', ev, late: 'A cold start wastes the first minutes of the window.', conf: 'measured' });
  }
  /* BAC: minutes are a floor, the error log and mocks decide what to study */
  const bc = (S.counters.items || []).find((x) => x.id === 'bac'), bTRaw = bc ? Number(bc.targets[dow(d)]) || 0 : 0, minB = Number(S.settings.minBac) || 25, bMin = Number(c.bac) || 0;
  const bT = mode === 'full' ? bTRaw : mode === 'min' ? Math.min(bTRaw || minB, minB) : 0, bd = S.settings.bacDate ? daysUntil(S.settings.bacDate) : null, BN = typeof bacNext === 'function' ? bacNext() : null;
  if (bd == null) unk.push('BAC exam date is not set.');
  if (BN && BN.unknown) unk.push(BN.unknown);
  if (mode !== 'rec' && (bMin < bT || (BN && BN.urgent))) C.push({ k: 'bac', dom: 'bac', tier: tierOf('bac'), urg: bT ? Math.min(1, (bT - bMin) / bT + (BN && BN.urgent ? 0.1 : 0)) : 0.5, out: BN ? BN.out : `${bT - bMin} minutes of BAC study (${bMin} of ${bT})`, why: BN ? BN.why : 'The daily floor protects the 8+ average. Spacing only works if the sessions happen.', next: BN ? BN.next : 'Start a 25-minute block: one topic, closed book', go: go('bac'), min: Math.max(15, Math.min(free || 60, Math.max(25, bT - bMin))), dod: BN ? BN.dod : `${bT} minutes logged and one topic rebuilt from memory`, ev: [`BAC minutes today: ${bMin} of ${bT} (source: study counter)`, bd != null ? `${bd} days to the exam date in Settings` : ''].concat(BN ? BN.ev : []).filter(Boolean), late: 'A skipped day pushes every scheduled review later and the gaps grow.', conf: BN ? BN.conf : 'measured' });
  /* body */
  const tb = L.find((b) => ['train', 'program'].includes(b.kind));
  if (mode === 'full' && tb && typeof dayTrained === 'function' && !dayTrained(o) && tmin(tb.end) + 180 > nm) C.push({ k: 'train', dom: 'body', tier: tierOf('body'), urg: 0.5, out: `Train: ${ttl(tb)}`, why: 'Planned session, not done yet. Consistency builds the body, not intensity.', next: 'Open the session', go: go('train'), min: Math.max(15, tmin(tb.end) - tmin(tb.start)), dod: 'Session finished and logged', ev: [`Calendar block ${tb.start} to ${tb.end}`, 'No finished session in the training log today'], late: 'One missed session is nothing. Two in a row starts a pattern.', conf: 'measured' });
  /* maintenance + feedback */
  const q = mode === 'rec' || typeof msQueue !== 'function' || typeof BC === 'undefined' || !BC ? 0 : (() => { try { return msQueue(8).length; } catch (e) { return 0; } })();
  if (q) C.push({ k: 'recall', dom: 'life', tier: 3, urg: Math.min(1, q / 8), out: `Recall ${q} fading idea${q > 1 ? 's' : ''}`, why: 'They are close to being forgotten. Five minutes now saves relearning later.', next: 'Start recall review', go: () => { mcOpen('boot'); setTimeout(() => { try { msReview(); } catch (e) { } }, 300); }, min: 5, dod: 'Each one recalled from a blank page and graded', ev: [`${q} learned ideas due or under 70% estimated memory (a model estimate)`], late: 'Forgotten ideas cost a full relearn.', conf: 'estimate' });
  if (dow(d) === 7 && !((S.reviews || {})[weekKey(d)] || {}).text) C.push({ k: 'weekly', dom: 'life', tier: 2, urg: 0.4, out: 'Weekly review: 10 minutes', why: 'One honest look at what happened, so next week is chosen and not drifted into.', next: 'Open the weekly review', go: () => mcWeekOpen(), min: 10, dod: 'Three answers saved', ev: ['No review saved for this week'], late: 'Without it the same week repeats.', conf: 'measured' });
  if (mode === 'rec') C.push({ k: 'recover', dom: 'body', tier: 1, urg: 1, out: 'Recover: eat, rest, in bed on time', why: 'You chose a recovery day. Recovering well is the work today.', next: '', go: null, min: 0, dod: `In bed by ${S.settings.bed || '21:00'}`, ev: ['Recovery mode chosen today'], late: 'Half-recovering costs tomorrow too.', conf: 'your choice' });

  /* 13.24.2: anything you skipped or marked missed today leaves the mission; the next one moves up */
  const gone = (o.mcSkip || []).map((x) => x.s); for (let i = C.length - 1; i >= 0; i--) { C[i].sid = C[i].sid || C[i].k; if (gone.includes(C[i].sid)) C.splice(i, 1); }
  C.sort((a, b) => a.tier - b.tier || b.urg - a.urg);
  /* risks: conflicts found before they break the day */
  const planned = L.filter((b) => tmin(b.start) > nm && ['dials', 'bac', 'train', 'program', 'agency', 'learn'].includes(b.kind)).reduce((s, b) => s + tmin(b.end) - tmin(b.start), 0), avail = Math.max(0, bedM - nm);
  if (planned > avail && !night) risks.push({ t: `Today no longer fits: ${planned} minutes planned, ${avail} minutes before bed.`, btn: 'Replan', act: "typeof enReplanModal==='function'&&enReplanModal()" });
  if (fl.open && left > 0 && fl.closeIn <= 60) risks.push({ t: `Florida closes in ${fl.closeIn} minutes with ${left} dials still to log.` });
  if (bd != null && bd <= 120 && bc && typeof counterWeek === 'function') { const wT = Object.values(bc.targets || {}).reduce((s, v) => s + (Number(v) || 0), 0), wM = counterWeek('bac', d); if (wT && dow(d) >= 4 && wM < wT * 0.4) risks.push({ t: `BAC is ${bd} days away and this week has ${wM} of ${wT} planned study minutes.` }); }
  if (typeof syncState !== 'undefined' && Math.abs(syncState.skew || 0) > 120) risks.push({ t: `This device's clock is off by about ${Math.round(Math.abs(syncState.skew) / 60)} minutes. Sync decides "newest" by the clock: fix the time setting.` });
  if (!night && !o.bedAt) risks.push({ t: "Last night's sleep is not logged.", btn: 'Enter times', act: 'mcSleepOpen()' });
  if (ssn && ssn.review && ssn.review <= k) risks.push({ t: 'Season review date reached.', btn: 'Review', act: 'mcSeasonOpen()' });
  /* 13.25.0: the other advisers supply facts, each with its owner. They no longer recommend on the Day screen. */
  const facts = [];
  try { if (typeof sgState === 'function') { const st = sgState(); facts.push({ owner: 'stage.js', t: `Business stage ${st.i + 1} of ${st.n}: ${st.s.name} (${st.cur} of ${st.s.need}, from the call log)` }); } } catch (e) { }
  try { if (typeof enBottleneck === 'function') { const b = enBottleneck()[0]; if (b) facts.push({ owner: 'engine.js', t: `Widest 14-day gap: ${b.area}, ${b.name} (${b.line})` }); } } catch (e) { }
  const pick = o.mcPick && C.find((x) => x.k === o.mcPick), top = pick || C[0] || null;
  return (mcLast = { C, top, picked: !!pick && pick !== C[0], rec: C[0] || null, unk, risks, mode, ssn, fl, E, free, k, skips: gone.length, facts });
}
function mcOpen(w) { try { if (typeof arcHide === 'function') arcHide(true); } catch (e) { } if (w === 'bac') { if (typeof bacOpen === 'function') bacOpen(); return; } try { show(w); } catch (e) { } }
function mcGo(k) { const M = mcLast || mcBuild(), c = M.C.find((x) => x.k === k); if (!c) return; const o = day(new Date()); if (!o.mc || o.mc.k !== k) { o.mc = { k, t: c.out, at: now() }; touch(o); } if (c.go) c.go(); }
function mcPickSet(k) { const o = day(new Date()); o.mcPick = k || null; touch(o); closeModal(); mcRefresh(); }
/* 13.24.3: how = 0 skip · 1 missed · 2 done (did it earlier or in advance). A hand "done" never changes measured numbers:
   dials still come from the call log, BAC minutes from the counter, training from the log. */
function mcSkip(k, how) {
  const M = mcLast || mcBuild(), c = M.C.find((x) => x.k === k); if (!c) return; const o = day(new Date()), measured = ['dial', 'bac', 'train', 'recall'].includes(k);
  o.mcSkip = (o.mcSkip || []).concat([{ s: c.sid || c.k, t: c.out, miss: how === 1 ? 1 : 0, done: how === 2 ? 1 : 0, at: now() }]);
  if (how === 2) { if (!o.mc || o.mc.k !== k) o.mc = { k, t: c.out, at: now() }; if (!measured) o.mcDone = { k, at: now() }; }
  if (o.mcPick === k) o.mcPick = null; touch(o);
  toast(how === 2 ? (measured ? 'Marked done for today. The numbers still come from what is logged.' : 'Done. Next one.') : how === 1 ? 'Marked as missed. On to the next one.' : 'Skipped for today.'); mcRefresh();
}
function mcSkipUndo() { const o = day(new Date()); if ((o.mcSkip || []).some((x) => x.done)) o.mcDone = null; o.mcSkip = []; touch(o); toast('Brought back'); mcRefresh(); }
function mcDoneToggle(k) { const o = day(new Date()); o.mcDone = o.mcDone && o.mcDone.k === k ? null : { k, at: now() }; touch(o); mcRefresh(); }

/* ── the card: five answers at a glance ── */
function mcCard() {
  let M; try { M = mcBuild(); } catch (e) { console.error(e); return ''; }
  const t = M.top, o = S.days[M.k] || {}, run = (o.fc || []).find((x) => x.id === o.fcRun && !x.t1);
  const chips = `<div class="mc-h"><button onclick="mcModeOpen()" class="mc-chip ${M.mode}">${MC_MODES[M.mode][0]} day ▾</button><button onclick="mcSeasonOpen()" class="mc-chip">${M.ssn ? esc(MC_SEASONS[M.ssn.kind] || 'Season') + ' season' : 'Set season'}</button>${typeof bacOpen === 'function' && S.settings.bacDate ? `<button onclick="bacOpen()" class="mc-chip">BAC D-${daysUntil(S.settings.bacDate)}</button>` : ''}<button onclick="mcToggle()" class="mc-chip">Hide ▴</button><span class="mc-fl">${M.fl.known ? `Florida ${M.fl.t}${M.fl.open ? '' : ' · closed'}` : ''}</span></div>`;
  if (run) { const el = Math.max(0, Math.round((now() - run.t0) / 60000));
    return `<div class="mc">${chips}<div class="mc-k">Focus contract · ${el} of ${run.min} min</div><div class="mc-out">${esc(run.res)}</div><div class="mc-meta"><span>Done when: ${esc(run.dod)}</span></div><div class="mc-row"><button class="btn primary" onclick="fcFinishOpen()">Finish</button><button class="btn" onclick="fcInterrupt()">I got interrupted</button></div></div>`; }
  if (!t) return `<div class="mc">${chips}<div class="mc-k">Mission</div><div class="mc-out">Nothing required right now.</div><div class="mc-why">Every floor for today is met by the evidence. Rest, or pick something on purpose.</div>${mcFoot(M)}</div>`;
  if (!mcOpenCard) return `<div class="mc mc-s"><button class="mc-sb" onclick="mcToggle()"><span class="mc-k">${MC_MODES[M.mode][0]} day · mission${M.picked ? ' · your pick' : ''}</span><b>${esc(t.out)}</b><em>${t.min ? t.min + ' min · ' : ''}tap for why, done condition, options ▾</em></button><div class="mc-row">${t.go && t.next ? `<button class="btn primary sm mc-sgo" onclick="mcGo('${t.k}')">${esc(t.next)} ›</button>` : ''}<button class="btn sm" onclick="mcSkip('${t.k}',2)">Done</button><button class="btn sm" onclick="mcSkip('${t.k}')">Skip</button><button class="btn sm" onclick="mcSkip('${t.k}',1)">Missed</button></div>${M.skips ? `<div class="mc-unk" onclick="mcSkipUndo()">${M.skips} done, skipped or missed today · undo</div>` : ''}${M.risks.map((r) => `<div class="mc-risk">${esc(r.t)}${r.btn ? ` <button onclick="${r.act}">${r.btn}</button>` : ''}</div>`).join('')}</div>`;
  const sec = M.C.filter((x) => x !== t).slice(0, 3), done = o.mcDone && o.mcDone.k === t.k;
  return `<div class="mc ${done ? 'done' : ''}">${chips}
    <div class="mc-k">${M.picked ? 'Your pick today' : "Today's mission"} · ${MC_TIER[t.tier]}${t.conf !== 'measured' ? ` · ${esc(t.conf)}` : ''}</div>
    <div class="mc-out">${esc(t.out)}</div><div class="mc-why">${esc(t.why)}</div>
    <div class="mc-meta">${t.min ? `<span>${t.min} min</span>` : ''}<span>Done when: ${esc(t.dod)}</span></div>
    ${t.go && t.next ? `<button class="btn primary block mc-go" onclick="mcGo('${t.k}')">${esc(t.next)} ›</button>` : ''}
    <div class="mc-row">${t.go ? `<button class="btn sm" onclick="fcOpen('${t.k}')">Focus contract</button>` : ''}<button class="btn sm" onclick="mcWhy()">Why this?</button><button class="btn sm" onclick="mcPickOpen()">Not this</button><button class="btn sm" onclick="mcSkip('${t.k}',2)">Done</button><button class="btn sm" onclick="mcSkip('${t.k}')">Skip</button><button class="btn sm" onclick="mcSkip('${t.k}',1)">Missed</button></div>
    ${sec.length ? `<div class="mc-sec"><span>Also today</span>${sec.map((x) => `<button onclick="mcGo('${x.k}')"><b>${esc(x.out)}</b><em>${x.min ? x.min + ' min · ' : ''}${MC_TIER[x.tier]}</em></button>`).join('')}</div>` : ''}${mcFoot(M)}</div>`;
}
function mcFoot(M) { return `${M.risks.map((r) => `<div class="mc-risk">${esc(r.t)}${r.btn ? ` <button onclick="${r.act}">${r.btn}</button>` : ''}</div>`).join('')}${M.skips ? `<div class="mc-unk" onclick="mcSkipUndo()">${M.skips} done, skipped or missed today · undo</div>` : ''}${M.unk.length ? `<div class="mc-unk" onclick="mcWhy()">${M.unk.length} thing${M.unk.length > 1 ? 's' : ''} unknown ›</div>` : ''}`; }
function mcWhy() {
  const M = mcLast || mcBuild(), t = M.top; if (!t) { openModal(`<h2>Why nothing?</h2><div class="hint">No candidate has an open gap today.</div>${M.unk.map((u) => `<div class="mc-risk">${esc(u)}</div>`).join('')}`, true); return; }
  openModal(`<h2>Why this?</h2><div class="mc-out" style="font-size:17px">${esc(t.out)}</div>
    <div class="mc-wl"><span>Measured facts</span>${t.ev.map((e) => `<div>${esc(e)}</div>`).join('')}</div>
    ${M.facts.length ? `<div class="mc-wl"><span>Supporting facts</span>${M.facts.map((f) => `<div>${esc(f.t)} <em>${f.owner}</em></div>`).join('')}</div>` : ''}
    <div class="mc-wl"><span>If it is delayed</span><div>${esc(t.late)}</div></div>
    <div class="mc-wl"><span>Confidence</span><div>${esc(t.conf)}${M.unk.length ? '. Unknown: ' + M.unk.map(esc).join(' ') : ''}</div></div>
    <div class="mc-wl"><span>How it was ranked</span>${M.C.map((x, i) => `<div class="${x === t ? 'on' : ''}">${i + 1}. ${esc(x.out)} <em>${MC_TIER[x.tier]}${x.tier === 1 && M.ssn ? ' (' + esc(MC_DOMS[M.ssn.dom] || '') + ' comes first this season)' : ''} · gap ${Math.round(x.urg * 100)}%</em></div>`).join('')}<div class="xs muted" style="margin-top:6px">A fixed commitment always outranks the season priority, which outranks protected floors, which outrank maintenance. Inside a tier the bigger open gap goes first. Computed on this device from your own records. Nothing was sent anywhere.</div></div>
    ${M.picked ? `<div class="hint">You chose this over the recommendation (${esc(M.rec.out)}). <a onclick="mcPickSet('')">Back to the recommendation</a></div>` : ''}`, true);
}
function mcPickOpen() { const M = mcLast || mcBuild(); openModal(`<h2>Pick today's mission</h2><div class="hint">The recommendation is first. Choosing another is your call; the reason stays visible under Why this.</div>${M.C.map((x, i) => `<button class="mc-opt ${x === M.top ? 'on' : ''}" onclick="mcPickSet('${i ? x.k : ''}')"><b>${esc(x.out)}</b><span>${MC_TIER[x.tier]}${i ? '' : ' · recommended'}</span></button>`).join('')}`, true); }

/* ── season: what comes first until a review date ── */
function mcSeasonOpen() {
  const s = mcSeason() || { kind: 'build', dom: 'biz', primary: '', secondary: '', paused: '', review: dk(addDays(new Date(), 28)) }, sel = (id, m, v) => `<select class="aq-in" id="${id}">${Object.keys(m).map((x) => `<option value="${x}" ${x === v ? 'selected' : ''}>${m[x]}</option>`).join('')}</select>`;
  openModal(`<h2>Season</h2><div class="hint">Not every goal gets equal attention all the time. A season says what comes first until a review date. Nothing else is dropped: the other domains keep their daily floor.</div>
    <label class="xs muted">Kind</label>${sel('ss-k', MC_SEASONS, s.kind)}<label class="xs muted">What comes first</label>${sel('ss-d', MC_DOMS, s.dom)}
    <input class="aq-in" id="ss-p" placeholder="Primary outcome, e.g. first paying agency" value="${esc(s.primary || '')}"><input class="aq-in" id="ss-s" placeholder="Protected alongside it, e.g. BAC floor every day" value="${esc(s.secondary || '')}"><input class="aq-in" id="ss-x" placeholder="Deliberately paused" value="${esc(s.paused || '')}">
    <label class="xs muted">Review on</label><input class="aq-in" type="date" id="ss-r" value="${esc(s.review || '')}">
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="mcSeasonSave()">Save season</button></div>`, true);
}
function mcSeasonSave() { const g = (i) => (($(i) || {}).value || '').trim(); S.settings.season = { kind: g('ss-k'), dom: g('ss-d'), primary: g('ss-p'), secondary: g('ss-s'), paused: g('ss-x'), review: g('ss-r'), set: dk(new Date()) }; S.settings._u = now(); save(); closeModal(); toast('Season set. The mission now ranks by it.'); mcRefresh(); }

/* ── focus contract: result → definition of done → first action; then what actually happened ── */
function fcOpen(k) {
  const M = mcLast || mcBuild(), c = M.C.find((x) => x.k === k) || M.top || { out: '', dod: '', min: 25, next: '' };
  openModal(`<h2>Focus contract</h2><input type="hidden" id="fc-k" value="${esc(c.k || '')}"><label class="xs muted">The result I will produce</label><textarea class="aq-in" id="fc-r">${esc(c.out)}</textarea><label class="xs muted">Done means</label><textarea class="aq-in" id="fc-d">${esc(c.dod)}</textarea>
    <label class="xs muted">Minutes</label><input class="aq-in" id="fc-m" inputmode="numeric" value="${c.min || 25}"><label class="xs muted">First physical action</label><input class="aq-in" id="fc-f" value="${esc(c.next || '')}">
    <div class="hint">Phone on silent, other tabs closed. Output is measured, not minutes.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="fcStart()">Start</button></div>`, true);
}
function fcStart() {
  const g = (i) => (($(i) || {}).value || '').trim(), res = g('fc-r'); if (!res) { toast('Write the result first'); return; }
  const o = day(new Date()), id = uid(), k = g('fc-k'); o.fc = (o.fc || []).concat([{ id, k, res, dod: g('fc-d'), min: Math.max(5, Number(g('fc-m')) || 25), first: g('fc-f'), t0: now(), intr: [] }]); o.fcRun = id; if (k && (!o.mc || o.mc.k !== k)) o.mc = { k, t: res, at: now() }; touch(o); closeModal();
  const c = (mcLast || mcBuild()).C.find((x) => x.k === k); if (c && c.go) c.go(); else mcRefresh();
}
function fcRun() { const o = day(new Date()); return (o.fc || []).find((x) => x.id === o.fcRun && !x.t1) || null; }
function fcFinishOpen() {
  const f = fcRun(); if (!f) return;
  openModal(`<h2>Contract finished</h2><div class="hint">Planned: ${esc(f.res)}<br>Done means: ${esc(f.dod)}</div><label class="xs muted">What I actually produced</label><textarea class="aq-in" id="fc-a"></textarea>
    <label class="xs muted">Did it meet "done"?</label><select class="aq-in" id="fc-o"><option value="2">Yes</option><option value="1">Partly</option><option value="0">No</option></select><input class="aq-in" id="fc-l" placeholder="One thing I learned (optional)">
    <div class="actions"><button class="btn primary" onclick="fcFinishSave()">Save</button></div>`, true);
}
function fcFinishSave() { const f = fcRun(); if (!f) return; const o = day(new Date()), act = (($('fc-a') || {}).value || '').trim(); if (!act) { toast('Write what you actually produced'); return; } Object.assign(f, { t1: now(), act, ok: Number(($('fc-o') || {}).value), lesson: (($('fc-l') || {}).value || '').trim() }); o.fcRun = null; touch(o); closeModal(); toast(f.ok === 2 ? 'Contract kept.' : 'Logged. Honest results are the point.'); mcRefresh(); }
function fcInterrupt() {
  const f = fcRun(); if (!f) return;
  openModal(`<h2>Interrupted. It happens.</h2><div class="hint">You were producing: <b>${esc(f.res)}</b></div><input class="aq-in" id="fc-w" placeholder="What interrupted you?"><input class="aq-in" id="fc-n" placeholder="Smallest next action to restart" value="${esc(f.first || '')}">
    <div class="actions"><button class="btn" onclick="fcDrop()">No longer relevant · drop it</button><button class="btn primary" onclick="fcResume()">Restart now</button></div><div class="xs muted" style="margin-top:8px">If the whole day moved, use Replan on the Day screen instead of squeezing this in.</div>`, true);
}
function fcResume() { const f = fcRun(); if (!f) return; const o = day(new Date()); f.intr = (f.intr || []).concat([{ at: now(), why: (($('fc-w') || {}).value || '').trim() }]); f.first = (($('fc-n') || {}).value || '').trim() || f.first; touch(o); closeModal(); toast('Restart: ' + (f.first || 'the first small step')); mcRefresh(); }
function fcDrop() { const f = fcRun(); if (!f) return; const o = day(new Date()); Object.assign(f, { t1: now(), act: '', ok: 0, dropped: 1, intr: (f.intr || []).concat([{ at: now(), why: (($('fc-w') || {}).value || '').trim() }]) }); o.fcRun = null; touch(o); closeModal(); toast('Dropped on purpose. No penalty.'); mcRefresh(); }

/* ── weekly review: facts first (from evidence), then three answers ── */
function mcWeek(d) {
  d = d || new Date(); const m = monday(d), by = mcDialLog(), W = { logged: 0, manual: 0, conv: 0, dm: 0, bac: 0, trained: 0, modes: { full: 0, min: 0, rec: 0 }, mis: 0, misDone: 0, skipped: 0, missed: 0, hand: 0, fc: 0, fcKept: 0, appMin: 0, days: 0 };
  for (let i = 0; i < 7; i++) { const dd = addDays(m, i), k = dk(dd), o = S.days[k]; if (dk(dd) > dk(new Date())) break; W.days++; const E = mcDialEvidence(k, by); W.logged += E.logged; W.manual += E.manual; W.conv += E.conv; W.dm += E.dm; if (!o) continue;
    W.bac += Number((o.counters || {}).bac) || 0; if (typeof dayTrained === 'function' && dayTrained(o)) W.trained++; W.modes[MC_MODES[o.mode] ? o.mode : 'full']++; if (o.mc) { W.mis++; if (mcMet(o, E)) W.misDone++; } (o.fc || []).forEach((f) => { if (f.t1 && !f.dropped) { W.fc++; if (f.ok === 2) W.fcKept++; } }); (o.mcSkip || []).forEach((x) => { if (x.done) W.hand++; else if (x.miss) W.missed++; else W.skipped++; }); W.appMin += Number(o.appMin) || 0; }
  try { W.tests = Object.values(S.lifeTests || {}).filter((x) => x && !x._del && x.date >= dk(m) && x.date <= dk(addDays(m, 6))).length; } catch (e) { W.tests = 0; }
  try { const ids = typeof BC !== 'undefined' && BC && BC.cardMod ? Object.keys(BC.cardMod) : []; W.lessons = ids.filter((id) => { const l = bcV('l:' + id, null); return l && l.at >= dk(m) && l.at <= dk(addDays(m, 6)); }).length; } catch (e) { W.lessons = 0; }
  return W;
}
/* was the mission's outcome met? from evidence where it can be measured, else the explicit mark */
function mcMet(o, E) { const k = (o.mc || {}).k; if (o.mcDone && o.mcDone.k === k) return true; if (k === 'dial') { const tg = typeof dialTargetFor === 'function' ? dialTargetFor(new Date(o.mc.at)) : 0; return !!tg && E.logged >= (o.mode === 'min' ? Math.min(tg, Number(S.settings.minDials) || 10) : tg); } if (k === 'bac') { const bc = (S.counters.items || []).find((x) => x.id === 'bac'), t = bc ? Number(bc.targets[dow(new Date(o.mc.at))]) || 0 : 0; return (Number((o.counters || {}).bac) || 0) >= Math.max(1, o.mode === 'min' ? Math.min(t || 25, Number(S.settings.minBac) || 25) : t); } if (k === 'train') return typeof dayTrained === 'function' && dayTrained(o); return false; }
function mcWeekOpen() {
  const d = new Date(), W = mcWeek(d), wk = weekKey(d), r = (S.reviews || {})[wk] || {}, row = (l, v, n) => `<div class="mc-wr"><span>${l}</span><b>${v}</b>${n ? `<em>${n}</em>` : ''}</div>`;
  const work = W.logged * 2 + W.bac, oh = W.appMin ? `${W.appMin} min inside War Room · about ${work} min of logged work (dials × 2 min + BAC minutes)` : 'Time inside War Room is measured from this version on.';
  openModal(`<h2>Weekly review</h2><div class="hint">Week of ${fmtShort(monday(d))}. Facts first, from the records. Small numbers are not trends.</div>
    ${row('Dials in the call log', W.logged, W.manual ? `${W.manual} more on the hand counter, not counted` : '')}${row('Answered · owner conversations', `${W.conv} · ${W.dm}`)}${row('BAC minutes · mock tests', `${W.bac} · ${W.tests}`)}${row('Training days', `${W.trained} of ${W.days}`)}${row('Missions met', `${W.misDone} of ${W.mis}`, W.mis ? '' : 'no mission started yet')}${row('Marked done by hand · skipped · missed', `${W.hand} · ${W.skipped} · ${W.missed}`)}${row('Focus contracts kept', `${W.fcKept} of ${W.fc}`)}${row('Day modes', `${W.modes.full} full · ${W.modes.min} minimum · ${W.modes.rec} recovery`)}${row('Bootcamp lessons', W.lessons)}
    <div class="mc-wl"><span>Is War Room helping or consuming?</span><div>${oh}</div></div>
    <textarea class="aq-in" id="wk-a" placeholder="What moved forward, and what did not?">${esc(r.text || '')}</textarea><textarea class="aq-in" id="wk-b" placeholder="The biggest bottleneck this week was…">${esc(r.neck || '')}</textarea><textarea class="aq-in" id="wk-c" placeholder="The ONE change for next week">${esc(r.change || '')}</textarea>
    <div class="actions" style="flex-wrap:wrap">${typeof enBoard === 'function' ? `<button class="btn" onclick="mcWeekSave(1)">Save + plan next week</button>` : ''}<button class="btn primary" onclick="mcWeekSave()">Save review</button></div>`, true);
}
function mcWeekSave(board) { const g = (i) => (($(i) || {}).value || '').trim(), wk = weekKey(new Date()); if (!g('wk-a')) { toast('Answer the first question at least'); return; } S.reviews = S.reviews || {}; S.reviews[wk] = Object.assign({}, S.reviews[wk] || {}, { text: g('wk-a'), neck: g('wk-b'), change: g('wk-c'), facts: mcWeek(new Date()), _u: now() }); save(); closeModal(); toast('Review saved'); if (board) { try { enBoard(); } catch (e) { } } else mcRefresh(); }

/* ── system overhead: minutes with War Room on screen, folded into the day when the app is left ── */
(function () {
  let t0 = document.visibilityState === 'visible' ? Date.now() : 0;
  const fold = () => { if (!t0) return; const m = Math.round((Date.now() - t0) / 60000); t0 = 0; if (m < 1 || m > 600 || !S) return; try { const o = day(new Date()); o.appMin = (Number(o.appMin) || 0) + m; touch(o); } catch (e) { } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { t0 = Date.now(); setTimeout(mcReconcile, 1500); } else fold(); });
  window.addEventListener('pagehide', fold); setTimeout(mcReconcile, 4000);
  const st = document.createElement('style'); st.id = 'mc-css';
  st.textContent = `.mc{border:1px solid var(--acc,#C9A24A);border-radius:12px;padding:12px 14px;margin:0 0 12px;background:linear-gradient(160deg,rgb(201 162 74 / .10),transparent 60%);display:flex;flex-direction:column;gap:8px}.mc.done{border-color:var(--good,#3fb950)}
  .arc-in>.arc-top{order:-3}.arc-in>.mc{order:-2}.arc-in>.gd{order:-1}.arc-in>.arc-more{order:1}.arc-in>.sf-chip,.arc-in>.arc-wk,.arc-in>.sg-chain,.arc-in>.bf-strip{order:2}.arc-in>.arc-change{order:3}
  #arc:not(.more) .arc-in>.sf-chip,#arc:not(.more) .arc-in>.arc-wk,#arc:not(.more) .arc-in>.sg-chain,#arc:not(.more) .arc-in>.bf-strip{display:none}
  .arc-more{align-self:center;min-height:40px;margin:10px 0;padding:0 14px;background:none;border:1px solid var(--ln,#2a2a2e);border-radius:20px;color:var(--muted,#999);font:600 11px/1 var(--mono,monospace);letter-spacing:.04em;cursor:pointer}
  .mc.mc-s{padding:10px 12px;gap:6px}.mc-sb{display:block;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0}.mc-sb b{display:block;font-size:16.5px;line-height:1.3;margin:3px 0;color:var(--ink,#eee)}.mc-sb em{font-style:normal;font-size:11.5px;color:var(--muted,#999)}.mc-sgo{align-self:flex-start;min-height:40px}   /* the mission sits directly under the date bar, above every other panel, whatever else is added to the guided day */
  .mc-h{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.mc-chip{min-height:30px;padding:0 10px;border:1px solid var(--ln,#2a2a2e);border-radius:15px;background:transparent;color:var(--ink,#eee);font:600 11px/1 var(--mono,monospace);cursor:pointer}.mc-chip.min{border-color:var(--warn,#e5a50a);color:var(--warn,#e5a50a)}.mc-chip.rec{border-color:#7fb3d5;color:#7fb3d5}.mc-fl{margin-left:auto;font:11px var(--mono,monospace);color:var(--muted,#999)}
  .mc-k{font:600 10.5px/1.3 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--acc,#C9A24A)}.mc-out{font-size:20px;font-weight:700;line-height:1.25;color:var(--ink,#eee)}.mc-why{font-size:13.5px;line-height:1.45;color:var(--muted,#bbb)}
  .mc-meta{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;color:var(--ink,#ddd)}.mc-meta span:first-child{font-family:var(--mono,monospace)}.mc-go{min-height:48px;font-size:15px}.mc-row{display:flex;flex-wrap:wrap;gap:6px}.mc-row .btn{min-height:40px}
  .mc-sec{display:grid;gap:4px;border-top:1px solid var(--ln,#2a2a2e);padding-top:8px}.mc-sec>span,.mc-wl>span{font:600 10.5px/1.4 var(--mono,monospace);text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#999)}.mc-sec button{display:flex;justify-content:space-between;gap:10px;align-items:baseline;text-align:left;min-height:40px;background:none;border:0;color:var(--ink,#eee);font:inherit;cursor:pointer;padding:2px 0}.mc-sec b{font-size:13.5px;font-weight:500}.mc-sec em{font-style:normal;font-size:11px;color:var(--muted,#999);white-space:nowrap}
  .mc-risk{font-size:12.5px;line-height:1.4;color:var(--warn,#e5a50a);border-left:2px solid var(--warn,#e5a50a);padding:2px 0 2px 8px}.mc-risk button{margin-left:6px;min-height:28px;border:1px solid currentColor;border-radius:6px;background:none;color:inherit;font:inherit;font-size:12px;padding:0 8px;cursor:pointer}.mc-unk{font-size:12px;color:var(--muted,#999);cursor:pointer}
  .mc-opt{display:block;width:100%;text-align:left;border:1px solid var(--ln,#2a2a2e);border-radius:10px;background:transparent;color:var(--ink,#eee);font:inherit;padding:10px 12px;margin:6px 0;cursor:pointer;min-height:48px}.mc-opt.on{border-color:var(--acc,#C9A24A)}.mc-opt b{display:block;font-size:14.5px}.mc-opt span{display:block;font-size:12.5px;color:var(--muted,#aaa);margin-top:2px}
  .mc-wl{display:grid;gap:3px;margin:10px 0;font-size:13px;line-height:1.45}.mc-wl div.on{color:var(--acc,#C9A24A)}.mc-wl em{font-style:normal;color:var(--muted,#999);font-size:11.5px}.mc-wr{display:grid;grid-template-columns:1fr auto;gap:0 10px;padding:6px 0;border-bottom:1px solid var(--ln,#222);font-size:13.5px}.mc-wr b{font-family:var(--mono,monospace)}.mc-wr em{grid-column:1/-1;font-style:normal;font-size:11.5px;color:var(--muted,#999)}`;
  document.head.appendChild(st);
})();
