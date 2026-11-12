/* War Room v5 · Calendar: your Google Calendar inside the app.
   The app reads your calendar's private iCal address through a small Supabase function (browsers can't read it directly).
   When it is connected, the calendar becomes the schedule: HQ "Now", Up next, the dial target ("DIALS: 90") all follow it.
   Edits happen in Google Calendar (one tap opens the exact event) or by asking Claude. */
'use strict';

const CAL_CACHE = 'wr-cal-cache';
let CAL = null, calState = { status: 'off', msg: '', busy: false }, calSel = null, calWeek = 0;
try { CAL = JSON.parse(localStorage.getItem(CAL_CACHE) || 'null'); } catch (e) { CAL = null; }
function calUrl() { return (S.settings && S.settings.calUrl) || ''; }
function calOn() { return !!calUrl(); }
function calEmail() { const m = calUrl().match(/\/ical\/([^/]+)\//); return m ? decodeURIComponent(m[1]) : ''; }
function calUsesSchedule() { return calOn() && CAL && CAL.events && (S.settings.schedSource || 'calendar') === 'calendar'; }
function calCovers(k) { return CAL && CAL.from && k >= dk(new Date(CAL.from)) && k < dk(new Date(CAL.to)); }
const CAL_KIND = [[/DIAL/i, 'dials'], [/📚|BAC|Anki|engle|Python|Română|Romana|Istorie|CS50|Cambridge|Certiport/i, 'bac'], [/🏋|Train:|calisthen|mobility/i, 'train'], [/Grup|lesson|lecți|lectie|\bTT\b|OFP|tenis(?!\s*→)|🎾/i, 'tennis'], [/Breakfast|Lunch|Dinner|Snack|Kefir|mic dejun|prânz|cină/i, 'food'], [/deep work|Applicant|bench|screener|Caregiver|Company|EgorFlow/i, 'agency'], [/Sleep|😴/i, 'sleep'], [/🚗|→|drive|Spre/i, 'travel'], [/🏫|școal|scoal|school|Consulta/i, 'school'], [/Shutdown|Weigh|Shower|Sun|☀|⚖|🌙/i, 'routine']];
function calKind(t) { const r = CAL_KIND.find(([re]) => re.test(t)); return r ? r[1] : 'other'; }
function calEventsOn(k) { return CAL && CAL.events ? CAL.events.filter((e) => e.date === k) : []; }
let _calTg = null;
function calDialTarget(k) {
  if (!calUsesSchedule() || !calCovers(k)) return null;
  if (!_calTg || _calTg.at !== CAL.at) { _calTg = { at: CAL.at, m: {} }; CAL.events.forEach((e) => { const m = String(e.title).match(/DIALS?\s*:?\s*(\d{1,3})/i); if (m && !e.cont) _calTg.m[e.date] = (_calTg.m[e.date] || 0) + Number(m[1]); }); }
  return _calTg.m[k] != null ? _calTg.m[k] : 0;
}
/* the calendar as schedule blocks (same shape the app already uses) */
function calBlocks(d) {
  const k = dk(d); if (!calUsesSchedule() || !calCovers(k)) return null;
  return calEventsOn(k).filter((e) => !e.allDay).map((e) => ({ id: 'cal:' + e.uid, title: e.title, start: e.s, end: e.e || e.s, days: [dow(d)], kind: calKind(e.title), note: (e.desc || '').split('\n')[0].slice(0, 140), cal: true, eid: e.eid }));
}
async function calFetch(silent) {
  if (!calOn() || calState.busy) return; const s = S.settings.sync; calState.busy = true;
  try {
    const r = await fetch(`${s.url}/functions/v1/warroom-cal`, { method: 'POST', headers: { apikey: s.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: calUrl(), days: 28, back: 7, tz: 'Europe/Chisinau' }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || (r.status === 404 ? 'the calendar bridge is not installed yet' : 'HTTP ' + r.status));
    CAL = j; try { localStorage.setItem(CAL_CACHE, JSON.stringify(j)); } catch (e) { }
    calState.status = 'ok'; calState.msg = ''; if (!silent) toast(`Calendar updated · ${j.events.length} events`);
  } catch (e) { calState.status = 'err'; calState.msg = String(e.message || e).slice(0, 160); if (!silent) toast('Calendar: ' + calState.msg); }
  calState.busy = false; render();
}
function calGoogleLink(e) { return e && e.eid ? 'https://www.google.com/calendar/event?eid=' + encodeURIComponent(e.eid) : 'https://calendar.google.com/calendar/u/0/r/day'; }

/* ───────── view ───────── */
function calSetup() {
  return `<div class="card"><div class="card-h"><div class="card-t">Connect Google Calendar</div><span class="pill warn">not connected</span></div>
    <div class="small" style="margin-bottom:12px">Once connected, this tab shows your real calendar, and HQ follows it: “Now”, Up next and the day's dial target (a block called “DIALS: 90” sets 90).</div>
    <ol class="small steps2"><li>On a laptop, open <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noopener">Google Calendar settings</a>.</li><li>On the left, under <b>Settings for my calendars</b>, click your calendar (your name).</li><li>Scroll to <b>Integrate calendar</b>. Copy <b>Secret address in iCal format</b> (it ends with <span class="mono">basic.ics</span>).</li><li>Paste it below. It syncs to your linked devices, so you do this once.</li></ol>
    <div class="field" style="margin-top:12px"><div class="inline"><input id="cal-url" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocapitalize="off" autocomplete="off"><button class="btn primary" onclick="calConnect()">Connect</button></div></div>
    <div class="xs muted">Treat that address like a password: anyone with it can read your calendar. If it ever leaks, “Reset” it in the same Google settings and paste the new one.</div>
    ${calState.msg ? `<div class="hint" style="margin-top:10px;border:1px solid rgba(255,79,94,.45)"><b class="bad">Did not work.</b> ${esc(calState.msg)}</div>` : ''}</div>`;
}
function calConnect() { const v = ($('cal-url').value || '').trim(); if (!/^(https|webcal):\/\/calendar\.google\.com\/calendar\/ical\/.+\/basic\.ics$/.test(v)) { toast('Paste the secret address that ends with basic.ics'); return; } S.settings.calUrl = v.replace(/^webcal:/, 'https:'); S.settings._u = now(); save(true); calFetch(false); }
function calDisconnect() { if (!confirm('Disconnect Google Calendar on all linked devices? HQ goes back to the plan in the app.')) return; S.settings.calUrl = ''; S.settings._u = now(); CAL = null; try { localStorage.removeItem(CAL_CACHE); } catch (e) { } save(true); render(); }
function calDayCol(k) {
  const evs = calEventsOn(k), nm = nowMin(), today = k === dk(new Date());
  if (!evs.length) return '<div class="empty">Nothing in the calendar.</div>';
  const all = evs.filter((e) => e.allDay), timed = evs.filter((e) => !e.allDay);
  return `${all.length ? `<div class="chips" style="margin-bottom:8px">${all.map((e) => `<span class="chip" onclick="calOpen('${e.uid}')">${esc(e.title)}</span>`).join('')}</div>` : ''}<div class="tl">${timed.map((e) => { const past = today && tmin(e.e || e.s) <= nm, cur = today && tmin(e.s) <= nm && nm < tmin(e.e || e.s); return `<div class="blk tap ${past ? 'past' : ''} ${cur ? 'now' : ''}" onclick="calOpen('${e.uid}')"><div class="t">${e.s}–${e.e === '24:00' ? '…' : e.e}</div><div class="b"><div class="n"><span class="tag ${calKind(e.title)}"></span>${esc(e.title)}</div>${e.desc && !e.cont ? `<div class="k">${esc(e.desc.split('\n')[0].slice(0, 120))}</div>` : ''}</div></div>`; }).join('')}</div>`;
}
function calWeekGrid(m) {
  const H0 = 5, H1 = 22, ph = 34, tk = dk(new Date()), nm = nowMin();
  const days = ALL.map((i) => addDays(m, i - 1));
  const cols = days.map((d) => { const k = dk(d); return `<div class="wg-col ${k === tk ? 'today' : ''}"><div class="wg-h" onclick="calSel='${k}';render()"><span>${DAY_SHORT[dow(d)]}</span><b>${d.getDate()}</b>${calDialTarget(k) ? `<i>${calDialTarget(k)} dials</i>` : ''}</div><div class="wg-body" style="height:${(H1 - H0) * ph}px">${k === tk && nm >= H0 * 60 && nm < H1 * 60 ? `<div class="wg-now" style="top:${((nm - H0 * 60) / 60) * ph}px"></div>` : ''}${calEventsOn(k).filter((e) => !e.allDay && e.s).map((e) => { const s = Math.max(tmin(e.s), H0 * 60), en = Math.min(tmin(e.e || e.s), H1 * 60); if (en <= H0 * 60 || s >= H1 * 60) return ''; return `<div class="wg-ev k-${calKind(e.title)}" style="top:${((s - H0 * 60) / 60) * ph}px;height:${Math.max(16, ((en - s) / 60) * ph - 2)}px" onclick="calOpen('${e.uid}')" title="${esc(e.s + ' ' + e.title)}"><b>${esc(e.title)}</b><span>${e.s}</span></div>`; }).join('')}</div></div>`; }).join('');
  return `<div class="wg"><div class="wg-hours"><div class="wg-h"></div>${Array.from({ length: H1 - H0 }, (_, i) => `<div style="height:${ph}px">${pad(H0 + i)}</div>`).join('')}</div>${cols}</div>`;
}
function renderCal() {
  const el = $('view-cal'); if (!calOn()) { el.innerHTML = calSetup(); return; }
  if (!CAL && !calState.busy) calFetch(true);
  const t = new Date(); t.setHours(0, 0, 0, 0); const sel = calSel || dk(t), m = addDays(monday(t), calWeek * 7);
  const strip = Array.from({ length: 14 }, (_, i) => addDays(t, i - 1)).map((d) => { const k = dk(d), tg = calDialTarget(k); return `<div class="wday ${k === dk(t) ? 'today' : ''} ${k === sel ? 'sel' : ''}" onclick="calSel='${k}';render()"><div class="d">${DAY_SHORT[dow(d)]}</div><div class="n">${d.getDate()}</div><div class="s">${tg ? tg + '📞' : '·'}</div></div>`; }).join('');
  const head = `<div class="row sb" style="margin-bottom:12px;gap:8px;flex-wrap:wrap"><div class="small muted">${calState.status === 'err' ? `<span class="bad">${esc(calState.msg)}</span>` : CAL ? `From Google Calendar · updated ${agoText(CAL.at)}` : 'Loading…'}</div><div class="row" style="gap:6px"><button class="btn sm" onclick="calFetch(false)">${calState.busy ? 'Updating…' : 'Refresh'}</button><a class="btn sm" href="https://calendar.google.com/calendar/u/0/r/week" target="_blank" rel="noopener">Open Google Calendar ↗</a></div></div>`;
  const phone = `<div class="card" style="padding:12px;overflow-x:auto"><div class="wstrip" style="grid-template-columns:repeat(14,minmax(44px,1fr))">${strip}</div></div><div class="card"><div class="card-h"><div class="card-t">${DAY_LONG[dow(pd(sel))]} ${fmtShort(pd(sel))}</div><div class="card-r">${calDialTarget(sel) ? `<b>${calDialTarget(sel)}</b> dials planned` : ''}</div></div>${CAL ? calDayCol(sel) : '<div class="empty">Loading the calendar…</div>'}</div>`;
  const desk = `<div class="card"><div class="card-h"><div class="row" style="gap:6px"><button class="btn sm" onclick="calWeek--;render()">‹</button><div class="card-t">Week of ${fmtShort(m)}</div><button class="btn sm" onclick="calWeek++;render()">›</button>${calWeek ? `<button class="btn sm ghost" onclick="calWeek=0;render()">This week</button>` : ''}</div><div class="card-r">tap an event to open it</div></div>${CAL ? calWeekGrid(m) : '<div class="empty">Loading…</div>'}</div>`;
  const settings = `<div class="card flat"><div class="row sb" style="gap:10px;flex-wrap:wrap"><div><div class="lab">HQ follows</div><div class="small muted" style="margin-top:3px">${calUsesSchedule() ? 'Google Calendar. “Now”, Up next and dial targets come from it.' : 'the plan inside the app (Plan tab).'}</div></div><div class="row" style="gap:6px"><div class="seg"><button class="${(S.settings.schedSource || 'calendar') === 'calendar' ? 'on' : ''}" onclick="S.settings.schedSource='calendar';S.settings._u=now();save();render()">Calendar</button><button class="${S.settings.schedSource === 'app' ? 'on' : ''}" onclick="S.settings.schedSource='app';S.settings._u=now();save();render()">App plan</button></div><button class="btn sm ghost" onclick="calDisconnect()">Disconnect</button></div></div></div>`;
  el.innerHTML = head + `<div class="only-phone">${phone}</div><div class="only-desk">${desk}</div>` + settings;
}
function calFind(uid) { return CAL && CAL.events ? CAL.events.find((e) => e.uid === uid) : null; }
function calOpen(uid) {
  const e = calFind(uid); if (!e) return; const k = e.date, tg = calDialTarget(k);
  openModal(`<h2>${esc(e.title)}</h2><div class="small muted" style="margin:-6px 0 12px">${DAY_LONG[dow(pd(k))]} ${fmtShort(pd(k))}${e.allDay ? ' · all day' : ` · ${e.s}–${e.e === '24:00' ? '…' : e.e}`}${e.loc ? ' · ' + esc(e.loc) : ''}</div>
    ${e.desc ? `<div class="hint" style="white-space:pre-wrap;margin-bottom:12px;max-height:34vh;overflow:auto">${esc(e.desc)}</div>` : ''}
    ${calKind(e.title) === 'dials' ? `<div class="hint" style="margin-bottom:12px">This block sets <b>${tg}</b> dials for ${fmtShort(pd(k))}. Change the number in the title (e.g. “DIALS: 60”) and the app follows.</div>` : ''}
    <a class="btn primary block" href="${calGoogleLink(e)}" target="_blank" rel="noopener" style="margin-bottom:8px">Edit, move or delete in Google Calendar ↗</a>
    <button class="btn block" onclick="askQuick(${JSON.stringify(`Change my calendar: "${e.title}" on ${fmtShort(pd(k))} ${e.s ? 'at ' + e.s : ''}. `).replace(/"/g, '&quot;')}, true)">Ask Claude to change it</button>
    <div class="xs muted" style="margin-top:10px">The app refreshes the calendar when you open it, every 10 minutes, or with Refresh.</div>`, true);
}
