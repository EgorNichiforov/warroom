/* War Room 15.9.0 · ATTENDANCE HUB (owner request 28 Nov 2026)
   "I want to click somewhere so I can easily check attendance, click the reports and copy-paste them,
    check presence, put it in for an earlier day, all that stuff."
   One place, one tap from the Day screen (🎾 next to +), from the + sheet and from the guided group step:
     MARK    any day (today or earlier): tap who came, all present, add a kid, didn't happen, clear.
     REPORTS ready-to-paste Romanian text: the day's report for "Acvila Manageri", the week, the month
             (group lessons held, for the manager / payment). Copy, Share or straight into Viber.
     KIDS    per group and per kid: present / held and absences for a week or month, as bars.
   Data: the same record the guided day already writes, S.days[k].att[blockId] = { group, date, at, kids{name:1|0} }
   or { cancel:1 }, so the guided day, the laptop report agent and the Sheet keep reading it unchanged.
   Lessons on a day come from the calendar (it covers ~7 days back) or the app plan; older days can be added by hand
   from the groups you already have, with their last roster. Nothing is ever invented: unmarked stays unmarked. */
'use strict';

let AT = { tab: 'mark', k: null, edit: {}, extra: {}, rep: 'day', per: 'month', off: 0, addOpen: false };

/* ── helpers ── */
const AT_RO_DAY = ['', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'];
const AT_RO_MON = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
function atRoDate(k) { const d = pd(k); return `${AT_RO_DAY[dow(d)]}, ${d.getDate()} ${AT_RO_MON[d.getMonth()]}`; }
function atToday() { return typeof gdDayDate === 'function' ? gdDayDate() : new Date(); }
function atTk() { return dk(atToday()); }
function atStrip(t) { return String(t || '').replace(typeof EMO_RE !== 'undefined' ? EMO_RE : /^\W+/, '').replace(/\(lesson\)/i, '').replace(/\s+/g, ' ').trim(); }
function atName(t) { const n = atStrip(t); return /^grup/i.test(n) ? n.replace(/^grup[aă]?\s*/i, 'Grupa ') : 'Grupa ' + n; }
function atKey(t) { return atName(t).toLowerCase().replace(/^grupa\s*/, '').trim(); }
function atEmo(t) { const k = atKey(t); return /green|verde/.test(k) ? '🟢' : /orange|portocal/.test(k) ? '🟠' : /red|roș|ros/.test(k) ? '🔴' : /yellow|galb/.test(k) ? '🟡' : /blue|alb/.test(k) ? '🔵' : '🎾'; }
function atKid(n) { return String(n || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
function atIsGroup(t) { return /grup/i.test(String(t || '')); }
function atRosterFrom(desc) { return String(desc || '').split('\n').map((l) => l.trim()).filter((l) => /^[☐✅❌✔✓✗□▢-]\s*\S/.test(l)).map((l) => l.replace(/^[☐✅❌✔✓✗□▢-]\s*/, '').trim()).filter(Boolean); }
function atAtt(k) { const o = S.days[k]; return (o && o.att) || {}; }
function atDays() { return Object.keys(S.days || {}).filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)).sort(); }
function atBuzz(p) { try { navigator.vibrate && navigator.vibrate(p || 8); } catch (e) { } }

/* the most recent roster saved for a group (before day k if given) */
function atLastRoster(key, beforeK) {
  const ks = atDays().reverse();
  for (const k of ks) { if (beforeK && k >= beforeK) continue; const A = atAtt(k); for (const id in A) { const a = A[id]; if (a && a.kids && atKey(a.group) === key && Object.keys(a.kids).length) return Object.keys(a.kids); } }
  for (const k of ks) { const A = atAtt(k); for (const id in A) { const a = A[id]; if (a && a.kids && atKey(a.group) === key && Object.keys(a.kids).length) return Object.keys(a.kids); } }
  return [];
}
/* every group you have: from the calendar and from saved attendance */
function atGroups() {
  const G = {};
  const add = (title, start, roster, when) => { const key = atKey(title); if (!key) return; const g = G[key] || (G[key] = { key, name: atName(title), start: start || '', roster: [], when: '' }); if ((when || '') >= g.when) { g.when = when || ''; if (start) g.start = start; g.name = atName(title); if (roster && roster.length) g.roster = roster; } };
  try { if (typeof CAL !== 'undefined' && CAL && CAL.events) CAL.events.forEach((e) => { if (!e.allDay && atIsGroup(e.title)) add(e.title, e.s, atRosterFrom(e.desc), e.date); }); } catch (e) { }
  atDays().forEach((k) => { const A = atAtt(k); for (const id in A) { const a = A[id]; if (a && a.group) add(a.group, a.time || '', a.kids ? Object.keys(a.kids) : [], k); } });
  return Object.values(G).sort((a, b) => a.name.localeCompare(b.name));
}
/* the group lessons of one day: calendar (or plan) + whatever was saved + added by hand */
function atLessons(k) {
  const out = [], seen = new Set(), A = atAtt(k), d = pd(k);
  const fromCal = typeof calCovers === 'function' && calCovers(k) && typeof calUsesSchedule === 'function' && calUsesSchedule();
  /* calendar connected but this day is outside what it loaded (older than ~7 days): don't guess from the old app plan */
  const skipPlan = typeof calOn === 'function' && calOn() && !fromCal;
  let bl = []; if (!skipPlan) { try { bl = (typeof blocksFor === 'function' ? blocksFor(d) : []).filter((b) => atIsGroup(b.title) && !/shutdown/i.test(b.title)); } catch (e) { bl = []; } }
  bl.forEach((b) => {
    const ev = String(b.id).startsWith('cal:') && typeof calFind === 'function' ? calFind(String(b.id).slice(4)) : null;
    let roster = atRosterFrom((ev && ev.desc) || ''); if (!roster.length) roster = atLastRoster(atKey(b.title), k);
    out.push({ id: b.id, title: atName(b.title), start: b.start || '', end: b.end || '', roster, src: fromCal && ev ? 'cal' : 'plan' }); seen.add(b.id);
  });
  for (const id in A) { if (seen.has(id)) continue; const a = A[id]; if (!a) continue; out.push({ id, title: atName(a.group || 'Grupa'), start: a.time || '', end: '', roster: a.kids ? Object.keys(a.kids) : atLastRoster(atKey(a.group || ''), k), src: 'saved' }); seen.add(id); }
  (AT.extra[k] || []).forEach((x) => { if (!seen.has(x.id)) { out.push(x); seen.add(x.id); } });
  return out.sort((a, b) => (a.start || '99').localeCompare(b.start || '99') || a.title.localeCompare(b.title));
}
function atEnded(k, L) { const tk = dk(new Date()); if (k < tk) return true; if (k > tk) return false; return tmin(L.end || L.start || '23:59') + (L.end ? 0 : 60) <= nowMin(); }
function atState(k, L) { const a = atAtt(k)[L.id]; if (a) return a.cancel ? 'cancel' : 'done'; return atEnded(k, L) ? 'missing' : 'later'; }
/* lessons that already happened in the last 7 days and still have no attendance (only real calendar lessons count) */
function atMissing() {
  const out = [], t = new Date();
  for (let i = 0; i < 7; i++) { const k = dk(addDays(t, -i)); atLessons(k).forEach((L) => { if ((L.src === 'cal' || (L.src === 'plan' && i === 0)) && atState(k, L) === 'missing') out.push({ k, L }); }); }
  return out;
}

/* ── open / render ── */
function atOpen(k, tab) {
  atBuzz(10); AT.addOpen = false; AT.edit = {};
  if (k) AT.k = k; else { const m = atMissing(); AT.k = m.length && (!tab || tab === 'mark') ? m[m.length - 1].k : atTk(); }
  AT.tab = tab || 'mark';
  if (typeof calOn === 'function' && calOn() && typeof calFetch === 'function' && typeof CAL !== 'undefined' && (!CAL || (CAL.at && Date.now() - new Date(CAL.at).getTime() > 10 * 60e3))) { try { calFetch(true); } catch (e) { } }
  openModal(`<div id="at-root"></div>`, true); atRender();
}
function atRender() {
  const el = document.getElementById('at-root'); if (!el) return;
  const tabs = [['mark', 'Mark'], ['rep', 'Reports'], ['kids', 'Kids']];
  const miss = atMissing().length;
  el.innerHTML = `<div class="at-h"><div><b>Attendance</b><span>${miss ? `<em class="at-bad">${miss} lesson${miss === 1 ? '' : 's'} not marked</em>` : 'All lessons marked'}</span></div></div>
    <div class="at-tabs">${tabs.map(([id, l]) => `<button class="${AT.tab === id ? 'on' : ''}" onclick="AT.tab='${id}';atBuzz(5);atRender()">${l}${id === 'mark' && miss ? `<i>${miss}</i>` : ''}</button>`).join('')}</div>
    ${AT.tab === 'mark' ? atMarkHtml() : AT.tab === 'rep' ? atRepHtml() : atKidsHtml()}`;
  const st = document.getElementById('at-strip'), sel = st && st.querySelector('.at-day.sel');
  if (st) st.scrollLeft = sel ? Math.max(0, sel.offsetLeft - st.offsetLeft - st.clientWidth / 2 + sel.clientWidth / 2) : st.scrollWidth;
}

/* ── MARK ── */
function atStripHtml() {
  const t = new Date(), tk = dk(t); let h = '';
  for (let i = 13; i >= -1; i--) {
    const d = addDays(t, -i), k = dk(d), L = atLessons(k); let dot = '';
    if (L.length) { const st = L.map((x) => atState(k, x)); dot = L.some((x, j) => st[j] === 'missing' && x.src === 'cal') ? 'bad' : st.every((s) => s === 'done' || s === 'cancel') ? 'ok' : 'mid'; }
    h += `<button class="at-day ${k === AT.k ? 'sel' : ''} ${k === tk ? 'today' : ''}" onclick="atGoDay('${k}')"><span>${DAY_SHORT[dow(d)]}</span><b>${d.getDate()}</b><i class="${dot}"></i></button>`;
  }
  return `<div class="at-strip" id="at-strip">${h}</div>`;
}
function atGoDay(k) { if (!k) return; AT.k = k; AT.addOpen = false; atBuzz(5); atRender(); }
function atShift(n) { atGoDay(dk(addDays(pd(AT.k), n))); }
function atMarkHtml() {
  const k = AT.k, L = atLessons(k), tk = atTk();
  const head = `<div class="at-dh"><button class="at-ar" onclick="atShift(-1)" aria-label="Previous day">‹</button><div><b>${DAY_LONG[dow(pd(k))]} ${fmtShort(pd(k))}</b><span>${k === tk ? 'today' : k < tk ? Math.round((pd(tk) - pd(k)) / 864e5) + ' day' + (Math.round((pd(tk) - pd(k)) / 864e5) === 1 ? '' : 's') + ' ago' : 'upcoming'}</span></div><input type="date" value="${k}" max="${dk(addDays(new Date(), 7))}" onchange="atGoDay(this.value)"><button class="at-ar" onclick="atShift(1)" aria-label="Next day">›</button></div>`;
  const cards = L.length ? L.map((x) => atLessonCard(k, x)).join('') : `<div class="at-empty">No group lessons ${typeof calCovers === 'function' && !calCovers(k) ? 'known for this day (the calendar only reaches about a week back)' : 'on this day'}.<br>Add one below if it happened.</div>`;
  const G = atGroups(), have = new Set(L.map((x) => atKey(x.title)));
  const add = AT.addOpen ? `<div class="at-add"><div class="at-k">Add a lesson on ${fmtShort(pd(k))}</div>${G.length ? `<div class="at-gchips">${G.map((g, i) => `<button class="${have.has(g.key) ? 'dim' : ''}" onclick="atAddLesson(${i})">${atEmo(g.name)} ${esc(g.name)}${g.start ? ` <em>${g.start}</em>` : ''}</button>`).join('')}</div>` : '<div class="at-s">No groups known yet. Mark one lesson from the guided day first.</div>'}
      <div class="at-row2"><input id="at-add-t" type="time" value="${(G[0] && G[0].start) || '18:00'}" aria-label="Start time"><span class="at-s">time for the lesson you tap</span></div><button class="at-lnk" onclick="AT.addOpen=false;atRender()">Cancel</button></div>`
    : `<button class="at-ghost" onclick="AT.addOpen=true;atRender()">+ Add a lesson on this day</button>`;
  return atStripHtml() + head + cards + add;
}
function atLessonCard(k, L) {
  const st = atState(k, L), a = atAtt(k)[L.id], E = AT.edit[L.id];
  const pill = { done: '<span class="at-pill ok">marked</span>', cancel: '<span class="at-pill">didn\'t happen</span>', missing: '<span class="at-pill bad">not marked</span>', later: '<span class="at-pill">later</span>' }[st];
  const src = L.src === 'plan' ? ' · from the app plan' : L.src === 'manual' ? ' · added by hand' : '';
  const top = `<div class="at-ch"><div><b>${atEmo(L.title)} ${esc(L.title)}</b><span>${L.start ? L.start + (L.end ? '–' + L.end : '') : 'time not set'}${src}</span></div>${pill}</div>`;
  if (E) {
    const p = E.v.filter(Boolean).length;
    return `<div class="at-card open">${top}<div class="at-s">Tap who came. Everyone you don't tap counts as absent.</div>
      <div class="at-kids">${E.names.map((n, i) => `<button class="${E.v[i] ? 'on' : ''}" onclick="atTog('${L.id}',${i})"><i>${E.v[i] ? '✓' : ''}</i>${esc(n)}</button>`).join('') || '<div class="at-s">No names yet. Add the kids below.</div>'}</div>
      <div class="at-row2"><input id="at-nk-${atSafe(L.id)}" placeholder="+ Add a kid (one-off or new)" autocomplete="off" onkeydown="if(event.key==='Enter')atAddKid('${L.id}')"><button class="at-sm" onclick="atAddKid('${L.id}')">Add</button></div>
      <div class="at-two"><button class="at-sm" onclick="atAll('${L.id}',1)">All present</button><button class="at-sm" onclick="atAll('${L.id}',0)">None</button></div>
      <button class="at-btn" onclick="atSave('${k}','${L.id}')">Save · ${p}/${E.names.length} present</button>
      <div class="at-two"><button class="at-lnk" onclick="atCancelLesson('${k}','${L.id}')">Lesson didn't happen</button><button class="at-lnk" onclick="delete AT.edit['${L.id}'];atRender()">Close</button></div></div>`;
  }
  let body = '';
  if (st === 'done') {
    const names = Object.keys(a.kids || {}), pr = names.filter((n) => a.kids[n]), ab = names.filter((n) => !a.kids[n]);
    body = `<div class="at-sum"><div class="at-bar"><u style="width:${names.length ? (pr.length / names.length) * 100 : 0}%"></u></div><b>${pr.length}/${names.length}</b></div>
      <div class="at-names">${pr.map((n) => `<span class="ok">✓ ${esc(atKid(n))}</span>`).join('')}${ab.map((n) => `<span class="no">✗ ${esc(atKid(n))}</span>`).join('')}</div>
      <div class="at-two"><button class="at-sm" onclick="atEdit('${k}','${L.id}')">Edit</button><button class="at-sm" onclick="atClear('${k}','${L.id}')">Clear</button></div>`;
  } else if (st === 'cancel') body = `<div class="at-two"><button class="at-sm" onclick="atEdit('${k}','${L.id}')">It did happen · mark</button><button class="at-sm" onclick="atClear('${k}','${L.id}')">Clear</button></div>`;
  else body = `<button class="at-btn ${st === 'later' ? 'soft' : ''}" onclick="atEdit('${k}','${L.id}')">Mark attendance</button>`;
  return `<div class="at-card ${st}">${top}${body}</div>`;
}
function atSafe(id) { return String(id).replace(/[^a-zA-Z0-9_-]/g, '_'); }
function atFind(k, id) { return atLessons(k).find((x) => x.id === id); }
function atEdit(k, id) {
  const L = atFind(k, id); if (!L) return; const a = atAtt(k)[id];
  let names = a && a.kids ? Object.keys(a.kids) : L.roster.slice();
  L.roster.forEach((n) => { if (!names.includes(n) && !names.some((m) => atKid(m) === atKid(n))) names.push(n); });
  AT.edit[id] = { names, v: names.map((n) => (a && a.kids && a.kids[n] ? 1 : 0)) }; atBuzz(6); atRender();
  setTimeout(() => { const c = document.querySelector('#at-root .at-card.open'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 40);
}
function atTog(id, i) { const E = AT.edit[id]; if (!E) return; E.v[i] = E.v[i] ? 0 : 1; atBuzz(6); atRender(); }
function atAll(id, v) { const E = AT.edit[id]; if (!E) return; E.v = E.names.map(() => v); atBuzz(8); atRender(); }
function atAddKid(id) {
  const E = AT.edit[id], inp = document.getElementById('at-nk-' + atSafe(id)); if (!E || !inp) return; const n = inp.value.replace(/\s+/g, ' ').trim(); if (!n) return;
  if (E.names.some((m) => atKid(m).toLowerCase() === atKid(n).toLowerCase())) { toast('Already on the list'); return; }
  E.names.push(n); E.v.push(1); atBuzz(6); atRender();
}
function atSave(k, id) {
  const L = atFind(k, id), E = AT.edit[id]; if (!L || !E) return;
  if (E.names.length && !E.v.some(Boolean) && !confirm(`Nobody came to ${L.title} on ${fmtShort(pd(k))}? Everyone will be marked absent.`)) return;
  const o = day(k); o.att = o.att || {};
  o.att[id] = { group: L.title, date: k, at: now(), time: L.start || '', kids: Object.fromEntries(E.names.map((n, i) => [n, E.v[i] ? 1 : 0])) };
  if (k !== atTk()) o.att[id].late = 1;
  o.blk = o.blk || {}; o.blk[id] = 'done'; touch(o);
  delete AT.edit[id]; if (typeof gdAtt !== 'undefined') delete gdAtt[id]; if (AT.extra[k]) AT.extra[k] = AT.extra[k].filter((x) => x.id !== id);
  const p = E.v.filter(Boolean).length; atBuzz([12, 40, 12]); toast(`${L.title} · ${fmtShort(pd(k))}: ${p}/${E.names.length} present`);
  atRender(); atRefreshDay();
}
function atCancelLesson(k, id) {
  const L = atFind(k, id); if (!L || !confirm(`${L.title} on ${fmtShort(pd(k))} didn't happen?`)) return;
  const o = day(k); o.att = o.att || {}; o.att[id] = { group: L.title, date: k, at: now(), time: L.start || '', cancel: 1 }; o.blk = o.blk || {}; o.blk[id] = 'skip'; touch(o);
  delete AT.edit[id]; if (AT.extra[k]) AT.extra[k] = AT.extra[k].filter((x) => x.id !== id); atBuzz(10); toast('Marked as not held'); atRender(); atRefreshDay();
}
function atClear(k, id) {
  const o = S.days[k]; if (!o || !o.att || !o.att[id]) return; if (!confirm('Clear this attendance? The lesson goes back to "not marked".')) return;
  const keep = o.att[id]; delete o.att[id]; if (o.blk) delete o.blk[id]; touch(o); atBuzz(8);
  if (String(id).startsWith('man:')) { AT.extra[k] = (AT.extra[k] || []).concat([{ id, title: atName(keep.group || 'Grupa'), start: keep.time || '', end: '', roster: Object.keys(keep.kids || {}), src: 'manual' }]); }
  toast('Cleared', 'Undo', () => { const d = day(k); d.att = d.att || {}; d.att[id] = keep; d.blk = d.blk || {}; d.blk[id] = keep.cancel ? 'skip' : 'done'; touch(d); if (AT.extra[k]) AT.extra[k] = AT.extra[k].filter((x) => x.id !== id); atRender(); atRefreshDay(); });
  atRender(); atRefreshDay();
}
function atAddLesson(i) {
  const g = atGroups()[i], k = AT.k; if (!g) return; const t = (document.getElementById('at-add-t') || {}).value || g.start || '';
  const id = `man:${g.key.replace(/[^a-z0-9]+/g, '-')}:${k}:${(t || '0000').replace(':', '')}`;
  if (atLessons(k).some((x) => x.id === id)) { toast('That lesson is already on this day'); return; }
  const L = { id, title: g.name, start: t, end: '', roster: atLastRoster(g.key, k).length ? atLastRoster(g.key, k) : g.roster.slice(), src: 'manual' };
  AT.extra[k] = (AT.extra[k] || []).concat([L]); AT.addOpen = false; atEdit(k, id);
}
function atRefreshDay() { try { if (typeof arcRender === 'function') arcRender(); } catch (e) { } }

/* ── REPORTS (Romanian, ready to paste) ── */
function atHeld(k0, k1) { /* saved, held lessons between two days, inclusive */
  const out = []; atDays().forEach((k) => { if (k < k0 || k > k1) return; const A = atAtt(k); for (const id in A) { const a = A[id]; if (a && !a.cancel && a.kids) out.push({ k, id, a, key: atKey(a.group), name: atName(a.group), time: a.time || ((atLessons(k).find((x) => x.id === id) || {}).start || '') }); } });
  return out.sort((x, y) => x.k.localeCompare(y.k) || (x.time || '').localeCompare(y.time || ''));
}
function atRange() {
  const base = pd(AT.k || atTk());
  if (AT.rep === 'day') return { k0: dk(base), k1: dk(base), lbl: `${DAY_SHORT[dow(base)]} ${fmtShort(base)}` };
  if (AT.rep === 'week') { const m = monday(base), s = addDays(m, 6); return { k0: dk(m), k1: dk(s), lbl: `${fmtShort(m)} – ${fmtShort(s)}` }; }
  const a = new Date(base.getFullYear(), base.getMonth(), 1), b = new Date(base.getFullYear(), base.getMonth() + 1, 0); return { k0: dk(a), k1: dk(b), lbl: a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
}
function atReportText() {
  const R = atRange();
  if (AT.rep === 'day') {
    const k = R.k0, L = atLessons(k), A = atAtt(k), sat = dow(pd(k)) === 6;
    if (!L.length) return '';
    const parts = L.map((x) => {
      const a = A[x.id], hd = `${atEmo(x.title)} ${x.title}${x.start ? ` (${x.start})` : ''}`;
      if (!a) return `${hd} — prezența încă nu e completată`;
      if (a.cancel) return `${hd} — lecția nu a avut loc`;
      const n = Object.keys(a.kids || {}), p = n.filter((m) => a.kids[m]);
      return `${hd} — ${p.length}/${n.length}\n` + n.filter((m) => a.kids[m]).map((m) => `✅ ${atKid(m)}`).concat(n.filter((m) => !a.kids[m]).map((m) => `❌ ${atKid(m)}`)).join('\n');
    });
    return `${sat ? 'Bună ziua' : 'Bună seara'}! Prezența la grupe pentru ${atRoDate(k)}:\n\n` + parts.join('\n\n');
  }
  const H = atHeld(R.k0, R.k1); if (!H.length) return '';
  const by = {}; H.forEach((h) => { (by[h.key] = by[h.key] || { name: h.name, list: [] }).list.push(h); });
  const G = Object.values(by).sort((a, b) => a.name.localeCompare(b.name));
  if (AT.rep === 'week') {
    const m = pd(R.k0), s = pd(R.k1);
    return `Prezența la grupe, săptămâna ${m.getDate()}${m.getMonth() !== s.getMonth() ? ' ' + AT_RO_MON[m.getMonth()] : ''} – ${s.getDate()} ${AT_RO_MON[s.getMonth()]}:\n\n` + G.map((g) => {
      const kids = {}; g.list.forEach((h) => Object.keys(h.a.kids).forEach((n) => { const kk = atKid(n); kids[kk] = kids[kk] || [0, 0]; kids[kk][1]++; if (h.a.kids[n]) kids[kk][0]++; }));
      return `${atEmo(g.name)} ${g.name} — ${g.list.length} ${g.list.length === 1 ? 'lecție' : 'lecții'}\n` + Object.entries(kids).sort((a, b) => b[1][0] - a[1][0] || a[0].localeCompare(b[0])).map(([n, [p, t]]) => `${p === t ? '✅' : p ? '◐' : '❌'} ${n} ${p}/${t}`).join('\n');
    }).join('\n\n');
  }
  const mo = pd(R.k0), tot = H.length;
  return `Bună ziua! Raportul lecțiilor de grup pentru ${AT_RO_MON[mo.getMonth()]} ${mo.getFullYear()}:\n\n` + G.map((g) => `${atEmo(g.name)} ${g.name} — ${g.list.length} ${g.list.length === 1 ? 'lecție' : 'lecții'}: ${g.list.map((h) => pd(h.k).getDate()).join(', ')} ${AT_RO_MON[mo.getMonth()]}`).join('\n') + `\n\nTotal: ${tot} ${tot === 1 ? 'lecție' : 'lecții'} de grup.`;
}
function atRepHtml() {
  const R = atRange(), txt = atReportText(), miss = AT.rep === 'day' ? atLessons(R.k0).filter((x) => atState(R.k0, x) === 'missing').length : atMissing().filter((m) => m.k >= R.k0 && m.k <= R.k1).length;
  const nav = `<div class="at-dh"><button class="at-ar" onclick="atRepShift(-1)" aria-label="Previous">‹</button><div><b>${R.lbl}</b><span>${{ day: "the day's report for the club managers", week: 'who came this week, per group', month: 'group lessons held, for your manager' }[AT.rep]}</span></div><button class="at-ar" onclick="atRepShift(1)" aria-label="Next">›</button></div>`;
  return `<div class="at-seg">${[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([id, l]) => `<button class="${AT.rep === id ? 'on' : ''}" onclick="AT.rep='${id}';atRender()">${l}</button>`).join('')}</div>${nav}
    ${miss ? `<div class="at-warn">${miss} lesson${miss === 1 ? '' : 's'} in this ${AT.rep} ${miss === 1 ? 'is' : 'are'} not marked yet. <button onclick="atFixFirst('${R.k0}','${R.k1}')">Mark now →</button></div>` : ''}
    ${txt ? `<textarea id="at-txt" class="at-txt" rows="${Math.min(18, txt.split('\n').length + 1)}">${esc(txt)}</textarea>
      <div class="at-three"><button class="at-btn" onclick="atCopy()">Copy</button>${navigator.share ? `<button class="at-btn soft" onclick="atShare()">Share</button>` : ''}<a class="at-btn soft only-phone" href="viber://forward?text=${encodeURIComponent(txt)}" onclick="atBuzz(8)">Viber</a></div>
      <div class="at-s" style="margin-top:8px">You can edit the text before copying. ${AT.rep === 'month' ? 'Counts every group lesson you marked as held. Individual lessons are not in here.' : ''}</div>`
    : `<div class="at-empty">Nothing marked for this ${AT.rep} yet.</div>`}`;
}
function atRepShift(n) {
  const b = pd(AT.k || atTk());
  AT.k = dk(AT.rep === 'day' ? addDays(b, n) : AT.rep === 'week' ? addDays(b, 7 * n) : new Date(b.getFullYear(), b.getMonth() + n, Math.min(b.getDate(), 28)));
  atBuzz(5); atRender();
}
function atFixFirst(k0, k1) {
  let k = null; if (AT.rep === 'day') k = k0; else { const m = atMissing().filter((x) => x.k >= k0 && x.k <= k1); if (m.length) k = m[m.length - 1].k; }
  if (k) { AT.k = k; AT.tab = 'mark'; atRender(); }
}
function atTextNow() { const t = document.getElementById('at-txt'); return t ? t.value : atReportText(); }
async function atCopy() {
  const t = atTextNow(); let ok = false;
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); ok = true; } } catch (e) { ok = false; }
  if (!ok) { const ta = document.getElementById('at-txt'); if (ta) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { ok = false; } } }
  atBuzz([10, 30, 10]); toast(ok ? 'Copied. Paste it in Viber.' : 'Select the text and copy it');
}
function atShare() { const t = atTextNow(); try { navigator.share({ text: t }).catch(() => { }); } catch (e) { atCopy(); } }

/* ── KIDS: who comes, who misses ── */
function atKidsHtml() {
  const base = pd(AT.k || atTk()); let k0, k1, lbl;
  if (AT.per === 'week') { const m = monday(base); k0 = dk(m); k1 = dk(addDays(m, 6)); lbl = `${fmtShort(m)} – ${fmtShort(addDays(m, 6))}`; }
  else if (AT.per === 'all') { k0 = '0000-00-00'; k1 = '9999-99-99'; lbl = 'everything marked so far'; }
  else { const a = new Date(base.getFullYear(), base.getMonth(), 1); k0 = dk(a); k1 = dk(new Date(base.getFullYear(), base.getMonth() + 1, 0)); lbl = a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
  const H = atHeld(k0, k1), by = {};
  H.forEach((h) => { const g = by[h.key] || (by[h.key] = { name: h.name, n: 0, pres: 0, seats: 0, kids: {} }); g.n++; Object.keys(h.a.kids).forEach((n) => { const kk = atKid(n), x = g.kids[kk] || (g.kids[kk] = { p: 0, t: 0, miss: [] }); x.t++; g.seats++; if (h.a.kids[n]) { x.p++; g.pres++; } else x.miss.push(pd(h.k).getDate() + ' ' + pd(h.k).toLocaleDateString('en-GB', { month: 'short' })); }); });
  const G = Object.values(by).sort((a, b) => a.name.localeCompare(b.name));
  const nav = AT.per === 'all' ? `<div class="at-dh"><div><b>${lbl}</b></div></div>` : `<div class="at-dh"><button class="at-ar" onclick="atKidsShift(-1)" aria-label="Previous">‹</button><div><b>${lbl}</b><span>present / lessons held</span></div><button class="at-ar" onclick="atKidsShift(1)" aria-label="Next">›</button></div>`;
  const tot = G.reduce((s, g) => s + g.seats, 0), pr = G.reduce((s, g) => s + g.pres, 0);
  return `<div class="at-seg">${[['week', 'Week'], ['month', 'Month'], ['all', 'All']].map(([id, l]) => `<button class="${AT.per === id ? 'on' : ''}" onclick="AT.per='${id}';atRender()">${l}</button>`).join('')}</div>${nav}
    ${G.length ? `<div class="at-kpis"><div><b>${H.length}</b><span>lessons held</span></div><div><b>${tot ? Math.round((pr / tot) * 100) : 0}%</b><span>attendance</span></div><div><b>${tot - pr}</b><span>absences</span></div></div>` + G.map((g) => `<div class="at-card"><div class="at-ch"><div><b>${atEmo(g.name)} ${esc(g.name)}</b><span>${g.n} lesson${g.n === 1 ? '' : 's'} · ${g.seats ? Math.round((g.pres / g.seats) * 100) : 0}% came</span></div></div>
      ${Object.entries(g.kids).sort((a, b) => (b[1].p / b[1].t) - (a[1].p / a[1].t) || a[0].localeCompare(b[0])).map(([n, x]) => `<div class="at-kr"><span>${esc(n)}</span><div class="at-bar ${x.t - x.p >= 2 ? 'warn' : ''}"><u style="width:${(x.p / x.t) * 100}%"></u></div><b>${x.p}/${x.t}</b>${x.miss.length ? `<em title="missed">${x.miss.length >= 2 ? '⚠ ' : ''}missed ${esc(x.miss.join(', '))}</em>` : ''}</div>`).join('')}</div>`).join('')
      + `<div class="at-s">⚠ = 2 or more absences. In a 10-lesson pack the first absence is free; from the second on, missed lessons count as used.</div>`
    : '<div class="at-empty">No lessons marked in this period.</div>'}`;
}
function atKidsShift(n) { const b = pd(AT.k || atTk()); AT.k = dk(AT.per === 'week' ? addDays(b, 7 * n) : new Date(b.getFullYear(), b.getMonth() + n, Math.min(b.getDate(), 28))); atBuzz(5); atRender(); }

/* ── doors: Day screen top (🎾 + count), the + sheet, the guided group step ── */
function atDoorHtml() {
  let n = 0; try { n = atMissing().length; } catch (e) { n = 0; }
  return `<button class="arc-ic at-door" onclick="atOpen()" aria-label="Attendance" title="Attendance · reports">🎾${n ? `<i>${n}</i>` : ''}</button>`;
}
if (typeof arcHtml === 'function' && !arcHtml._at) {
  const _h = arcHtml;
  arcHtml = function () {
    let h = _h();
    try {
      const re = /<button class="arc-ic"[^>]*>[\s\S]*?<\/button>/; if (re.test(h)) h = h.replace(re, (m) => `<div class="at-tops">${atDoorHtml()}${m}</div>`);
      h = h.replace(/(<button class="gd-lnk" onclick="gdAttCancel\('[^']*'\)">Lesson didn't happen<\/button>)/, `$1<button class="gd-lnk" onclick="atOpen(null,'mark')">Another day · reports →</button>`);
    } catch (e) { console.warn('attend', e); }
    return h;
  };
  arcHtml._at = 1;
}
try { if (typeof SH_QUICK !== 'undefined' && !SH_QUICK.some((q) => q[0] === 'Attendance')) SH_QUICK.splice(4, 0, ['Attendance', 'closeModal();atOpen()', 'check']); } catch (e) { }
document.addEventListener('keydown', (e) => { if (e.key === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test((e.target.tagName || '')) && !document.getElementById('modal-bg').classList.contains('open')) { e.preventDefault(); atOpen(); } });

/* ── look ── */
(function atCss() {
  if (document.getElementById('at-css')) return; const s = document.createElement('style'); s.id = 'at-css';
  s.textContent = `
  .at-tops{display:flex;gap:8px;align-items:flex-start}
  .at-door{position:relative;font-size:20px;line-height:1}
  .at-door i{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ff4f5e;color:#fff;font:700 11px/18px var(--mono,monospace);font-style:normal}
  #at-root{--at-ln:var(--ln,#2a2a2e);--at-acc:var(--acc,#d6ff3f);--at-mut:var(--mut,var(--muted,#8a8a90));color:var(--ink,#eee)}
  #at-root button{font:inherit;cursor:pointer}
  .at-h{display:flex;justify-content:space-between;align-items:flex-end;margin:-6px 0 12px}.at-h b{display:block;font-size:22px;font-weight:700;letter-spacing:-.01em}.at-h span{font-size:13px;color:var(--at-mut)}
  .at-bad{color:#ff4f5e;font-style:normal;font-weight:600}
  .at-tabs,.at-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border:1px solid var(--at-ln);border-radius:12px;margin-bottom:12px}
  .at-tabs button,.at-seg button{min-height:40px;border:0;border-radius:9px;background:transparent;color:var(--at-mut);font-weight:600;position:relative}
  .at-tabs button.on,.at-seg button.on{background:var(--at-acc);color:var(--acc-ink,#000)}
  .at-tabs i{display:inline-block;margin-left:6px;min-width:18px;height:18px;border-radius:9px;background:#ff4f5e;color:#fff;font:700 11px/18px var(--mono,monospace);font-style:normal}
  .at-seg{grid-template-columns:repeat(3,1fr);border-radius:999px}.at-seg button{min-height:34px;border-radius:999px;font-size:13px}
  .at-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;scrollbar-width:none}.at-strip::-webkit-scrollbar{display:none}
  .at-day{flex:0 0 46px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 0 6px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:var(--ink,#eee)}
  .at-day span{font-size:11px;color:var(--at-mut)}.at-day b{font-size:16px}.at-day i{width:6px;height:6px;border-radius:3px;background:transparent}
  .at-day i.ok{background:#3ddc84}.at-day i.bad{background:#ff4f5e}.at-day i.mid{background:var(--at-mut)}
  .at-day.today{border-color:var(--at-mut)}.at-day.sel{background:var(--at-acc);border-color:var(--at-acc);color:var(--acc-ink,#000)}.at-day.sel span{color:inherit}
  .at-dh{display:flex;align-items:center;gap:8px;margin:2px 0 12px}.at-dh>div{flex:1;min-width:0}.at-dh b{display:block;font-size:16px}.at-dh span{font-size:12px;color:var(--at-mut)}
  .at-dh input[type=date]{width:auto;max-width:140px;min-height:38px;padding:0 8px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:13px}
  .at-ar{width:38px;height:38px;flex:0 0 38px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:inherit;font-size:20px!important;line-height:1}
  .at-card{border:1px solid var(--at-ln);border-radius:14px;padding:12px;margin-bottom:10px;background:var(--card,transparent)}
  .at-card.missing{border-color:rgba(255,79,94,.55)}.at-card.open{border-color:var(--at-acc)}
  .at-ch{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}.at-ch b{display:block;font-size:16px}.at-ch span{font-size:12px;color:var(--at-mut)}
  .at-pill{flex:0 0 auto;font:600 11px/1 var(--mono,monospace);letter-spacing:.03em;padding:5px 8px;border-radius:999px;border:1px solid var(--at-ln);color:var(--at-mut);white-space:nowrap}
  .at-pill.ok{color:#3ddc84;border-color:rgba(61,220,132,.45)}.at-pill.bad{color:#ff4f5e;border-color:rgba(255,79,94,.5)}
  .at-s{font-size:13px;color:var(--at-mut);margin-bottom:8px}
  .at-kids{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px}
  .at-kids button{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 12px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:inherit;font-size:16px;text-align:left}
  .at-kids button i{width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:6px;border:1px solid var(--at-ln);font-style:normal;font-weight:700}
  .at-kids button.on i{background:var(--at-acc);border-color:var(--at-acc);color:var(--acc-ink,#000)}
  .at-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border:0;border-radius:10px;background:var(--at-acc);color:var(--acc-ink,#000)!important;font-weight:700;font-size:15px;letter-spacing:.03em;text-transform:uppercase;text-decoration:none;margin-top:4px}
  .at-btn.soft{background:transparent;border:1px solid var(--at-ln);color:var(--ink,#eee)!important}
  .at-btn:active,.at-sm:active,.at-day:active{transform:scale(.97)}
  .at-sm{min-height:40px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:inherit;font-size:14px;padding:0 12px}
  .at-lnk{background:none;border:0;color:var(--at-mut);font-size:13px;padding:12px 0 4px;width:100%}
  .at-ghost{width:100%;min-height:46px;border:1px dashed var(--at-ln);border-radius:12px;background:transparent;color:var(--at-mut);font-size:14px;margin-top:2px}
  .at-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.at-three{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px}
  .at-row2{display:flex;gap:8px;align-items:center;margin:6px 0}.at-row2 input{flex:1;min-width:0;min-height:42px;padding:0 10px;border:1px solid var(--at-ln);border-radius:10px;background:transparent;color:inherit;font:inherit}.at-row2 input[type=time]{flex:0 0 120px}.at-row2 .at-s{margin:0}
  .at-sum{display:flex;align-items:center;gap:10px;margin-bottom:8px}.at-sum b{font:700 15px var(--mono,monospace)}
  .at-bar{flex:1;height:8px;border-radius:4px;background:rgba(127,127,127,.18);overflow:hidden;min-width:40px}.at-bar u{display:block;height:100%;background:#3ddc84;border-radius:4px}.at-bar.warn u{background:#ffb020}
  .at-names{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}.at-names span{font-size:13px;padding:4px 8px;border-radius:8px;border:1px solid var(--at-ln)}.at-names .ok{color:#3ddc84}.at-names .no{color:#ff4f5e;opacity:.9}
  .at-empty{padding:18px 12px;text-align:center;color:var(--at-mut);font-size:14px;border:1px dashed var(--at-ln);border-radius:12px;margin-bottom:10px;line-height:1.5}
  .at-add{border:1px solid var(--at-ln);border-radius:14px;padding:12px}.at-k{font-weight:700;margin-bottom:8px}
  .at-gchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}.at-gchips button{min-height:40px;padding:0 12px;border:1px solid var(--at-ln);border-radius:999px;background:transparent;color:inherit;font-size:14px}.at-gchips button.dim{opacity:.55}.at-gchips em{font-style:normal;color:var(--at-mut);font-size:12px}
  .at-warn{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid rgba(255,79,94,.5);border-radius:12px;font-size:13px;margin-bottom:10px}.at-warn button{border:0;background:none;color:#ff4f5e;font-weight:700;white-space:nowrap}
  .at-txt{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--at-ln);border-radius:12px;background:rgba(127,127,127,.06);color:inherit;font:14px/1.5 var(--sans,inherit);resize:vertical;margin-bottom:8px}
  .at-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.at-kpis div{border:1px solid var(--at-ln);border-radius:12px;padding:10px;text-align:center}.at-kpis b{display:block;font:700 20px var(--mono,monospace)}.at-kpis span{font-size:11px;color:var(--at-mut)}
  .at-kr{display:grid;grid-template-columns:minmax(0,1.3fr) 1fr auto;gap:4px 10px;align-items:center;padding:7px 0;border-top:1px solid var(--at-ln);font-size:14px}.at-kr>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.at-kr b{font:600 13px var(--mono,monospace)}
  .at-kr em{grid-column:1/-1;font-style:normal;font-size:12px;color:var(--at-mut)}
  @media (min-width:1000px){.at-strip{flex-wrap:wrap}.at-day{flex:0 0 52px}}`;
  document.head.appendChild(s);
})();
try { if (typeof arcRender === 'function') setTimeout(arcRender, 50); } catch (e) { }
