/* War Room v5 · Nights & tomorrow.
   1. Sleep: one tap "Lights out" / "I'm up", the phone's own guess (Android app 1.2+: longest screen-off stretch
      overnight), a 14-night picture, sleep debt and "be in bed by" for tonight.
      A night belongs to the day you wake up on: day k holds bedAt (the evening before) and wokeAt (morning of k).
   2. Tomorrow: in the shutdown, write what changed ("it's late, I wake at 8:30") and the AI rewrites tomorrow.
      You see the changes first; nothing applies until you tap Apply. Undo restores the regular day. */
'use strict';

const NIGHT_NEED = 8 * 60, NIGHT_LATENCY = 15;
function hmNow(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function hmOf(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function wakeFor(d) { const o = S.days[dk(d)]; return (o && o.wakePlan) || S.settings.wake || '05:20'; }
function sleepMin(o) {
  if (o && Array.isArray(o.segs) && o.segs.length && o.sleepState === 'done') { const m = Math.round(o.segs.reduce((a, s) => a + Math.max(0, (s.e || s.s) - s.s), 0) / 60000); return m > 0 && m <= 16 * 60 ? m : null; }
  if (!o || !o.bedAt || !o.wokeAt) return null; let m = tmin(o.wokeAt) - tmin(o.bedAt); if (m <= 0) m += 1440; return m > 16 * 60 ? null : m; }
/* the day the coming (or current) night belongs to */
function nightKey() { const n = new Date(); return n.getHours() < 12 ? dk(n) : dk(addDays(n, 1)); }
function bedBy(d) { return hmOf(tmin(wakeFor(d)) - NIGHT_NEED - NIGHT_LATENCY); }

/* Lights out / I'm up now live in sleep.js (start · pause · resume · stop · undo · edit). */
/* the phone's guess (Android app 1.2+). Never overwrites a time you tapped or typed. */
async function sleepPull(silent) {
  if (typeof WRN === 'undefined' || !WRN || !WRN.sleepGuess) return;
  try {
    const r = await WRN.sleepGuess({ days: 10 }); let n = 0;
    (r.nights || []).forEach((x) => {
      const k = dk(new Date(x.day)), o = day(k); if (o.sleepSrc && o.sleepSrc !== 'phone') { o.phoneSleep = { off: hmNow(new Date(x.off)), on: hmNow(new Date(x.on)) }; return; }
      const b = hmNow(new Date(x.off)), w = hmNow(new Date(x.on)); if (o.bedAt === b && o.wokeAt === w) return;
      o.bedAt = b; o.wokeAt = w; o.sleepSrc = 'phone'; o._u = now(); n++;
    });
    if (n) { save(); if (!silent) toast(`Sleep read from the phone · ${n} night${n > 1 ? 's' : ''}`); render(); }
  } catch (e) { /* older app without sleepGuess, or no usage access: the taps still work */ }
}

function nightsBack(n, from) { const out = []; const end = from || new Date(); for (let i = n - 1; i >= 0; i--) { const d = addDays(end, -i), k = dk(d), o = S.days[k]; out.push({ d, k, o, m: sleepMin(o) }); } return out; }
function sleepStats() {
  const ns = nightsBack(7).filter((x) => x.m != null); if (!ns.length) return null;
  const avg = ns.reduce((s, x) => s + x.m, 0) / ns.length, debt = ns.reduce((s, x) => s + Math.max(0, NIGHT_NEED - x.m), 0);
  const rel = (t) => ((tmin(t) - 18 * 60) + 1440) % 1440; const beds = ns.map((x) => rel(x.o.bedAt)); const mb = beds.reduce((a, b) => a + b, 0) / beds.length;
  const sd = Math.sqrt(beds.reduce((s, b) => s + (b - mb) * (b - mb), 0) / beds.length);
  const onTime = ns.filter((x) => rel(x.o.bedAt) <= rel(S.settings.bed || '21:00') + 15).length;
  return { n: ns.length, avg, debt, bedAvg: hmOf(mb + 18 * 60), spread: Math.round(sd), onTime };
}
/* 14 nights as bars on an 18:00 → 14:00 axis, the target night shaded */
function sleepChart() {
  const ns = nightsBack(14), W = 330, rowH = 13, top = 16, H = top + ns.length * rowH + 4, x0 = 34, span = 20 * 60, sx = (W - x0 - 6) / span;
  const rel = (t) => ((tmin(t) - 18 * 60) + 1440) % 1440, X = (t) => x0 + rel(t) * sx;
  const tb = rel(S.settings.bed || '21:00'), tw = rel(S.settings.wake || '05:20');
  const ticks = ['18:00', '21:00', '00:00', '03:00', '06:00', '09:00', '12:00'];
  const col = (m) => (m >= 7.5 * 60 ? 'var(--ok)' : m >= 6.5 * 60 ? 'var(--acc)' : 'var(--bad)');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;margin:6px 0 2px" role="img" aria-label="Last 14 nights">
    <rect x="${x0 + tb * sx}" y="${top - 2}" width="${(tw - tb) * sx}" height="${ns.length * rowH}" fill="currentColor" opacity=".07" rx="3"/>
    ${ticks.map((t) => `<text x="${X(t)}" y="10" font-size="8" fill="currentColor" opacity=".5" text-anchor="middle">${t.slice(0, 2)}</text><line x1="${X(t)}" x2="${X(t)}" y1="${top - 2}" y2="${H - 4}" stroke="currentColor" opacity=".08"/>`).join('')}
    ${ns.map((x, i) => { const y = top + i * rowH; const lbl = `<text x="0" y="${y + 9}" font-size="8" fill="currentColor" opacity=".6">${DAY_SHORT[dow(x.d)]} ${x.d.getDate()}</text>`;
      if (x.m == null) return lbl + `<line x1="${x0}" x2="${W - 6}" y1="${y + 6}" y2="${y + 6}" stroke="currentColor" opacity=".1" stroke-dasharray="2 3"/>`;
      const a = X(x.o.bedAt), w = x.m * sx; return lbl + `<rect x="${a}" y="${y + 2}" width="${Math.max(2, w)}" height="${rowH - 4}" rx="3" fill="${col(x.m)}" opacity="${x.o.sleepSrc === 'phone' ? .7 : 1}"/><text x="${Math.min(a + w + 3, W - 30)}" y="${y + 9}" font-size="8" fill="currentColor" opacity=".7">${Math.floor(x.m / 60)}h${pad(x.m % 60)}</text>`; }).join('')}
  </svg>`;
}
function sleepMoneyBody(o) {
  const st = sleepStats(), nk = nightKey(), late = new Date().getHours() >= 12 || new Date().getHours() < 4, tonight = pd(nk);
  const src = o.sleepSrc === 'phone' ? '<span class="xs muted">from the phone</span>' : o.sleepSrc === 'tap' ? '<span class="xs muted">tapped</span>' : '';
  return `${typeof sleepControls === 'function' ? sleepControls(late) : ''}
    <div class="small" style="margin-bottom:6px">Tonight: alarm <b>${wakeFor(tonight)}</b> → in bed by <b>${bedBy(tonight)}</b> for 8 h.${S.days[nk] && S.days[nk].wakePlan ? ' <span class="xs muted">(tomorrow was adjusted)</span>' : ''}</div>
    ${sleepChart()}
    ${st ? `<div class="g2" style="margin:6px 0 10px"><div class="kv"><span>7-night average</span><b>${Math.floor(st.avg / 60)}h ${pad(Math.round(st.avg % 60))}m</b></div><div class="kv"><span>Sleep debt</span><b class="${st.debt > 180 ? 'bad' : ''}">${Math.floor(st.debt / 60)}h ${pad(Math.round(st.debt % 60))}m</b></div><div class="kv"><span>Usual bedtime</span><b>${st.bedAvg} <span class="xs muted">±${st.spread}m</span></b></div><div class="kv"><span>In bed by ${S.settings.bed}</span><b>${st.onTime}/${st.n}</b></div></div>` : '<div class="xs muted" style="margin:6px 0 10px">Tap Lights out tonight and I\'m up tomorrow. After a few nights this shows your average, your debt and how steady your bedtime is.</div>'}
    <div class="g2"><div class="field"><label>In bed (night before)</label><input type="time" value="${esc(o.bedAt || '')}" onchange="setDayField('bedAt',this.value);day(curDate).sleepSrc='typed';touch(day(curDate))"></div><div class="field"><label>Woke up ${src}</label><input type="time" value="${esc(o.wokeAt || '')}" onchange="setDayField('wokeAt',this.value);day(curDate).sleepSrc='typed';touch(day(curDate))"></div></div>
    ${o.phoneSleep ? `<div class="xs muted">Phone saw the screen off ${o.phoneSleep.off}–${o.phoneSleep.on}.</div>` : ''}`;
}

/* ───────── TOMORROW, ADJUSTED BY AI ───────── */
let tmrProp = null, tmrBusy = false;
const TMR_SYS = `You re-plan ONE day of Egor's schedule. He is a final-year student in Moldova (BAC exams June 2027) who also coaches tennis and cold-calls Florida home-care agency owners (his company, the #1 priority). Reply with JSON only, no prose, no code fences.
Rules:
- Follow what he wrote. Typical case: he goes to bed late and will wake later, so everything before the new wake time has to move or go.
- Fixed, never move unless he says so: school (🏫), tennis lessons he teaches (titles with Grup/Grupa or a person's name), appointments, travel tied to them.
- Movable: study (📚/BAC), dial blocks (📞 DIALS: N), training, deep work, meals, routines. Keep the morning routine right after waking.
- Dial blocks only make sense 16:00–01:00 Moldova time (Florida business hours). Never drop the day's dials below 10. If time is short, shrink a block and keep "📞 DIALS: N" in its title with the new N.
- When a day breaks, cut in this order (first = cut first): his own tennis training, gym, deep work, tennis lessons, dials, BAC mornings, sleep. Sleep is protected: aim for 8 h before the wake time.
- No overlaps. 24-hour HH:MM times. Keep titles short and in the same style.
JSON shape: {"summary":"one or two plain sentences","wake":"HH:MM" or null,"bed":"HH:MM" or null (when to sleep the night AFTER this day, if it changes),"dials":number or null,"remove":["block id",...],"add":[{"title":"...","start":"HH:MM","end":"HH:MM","kind":"bac|dials|train|tennis|food|travel|other"}]}
To move a block: put its id in remove and add it again with the new times.`;
function tmrBlocks(d) { return blocksFor(d).map((b) => ({ id: b.id, title: b.title, start: b.start, end: b.end, kind: b.kind })); }
async function tmrAdjust(tk) {
  const inp = $('sd-adj'), txt = (inp && inp.value || '').trim(); if (!txt) { toast('Write what changed first'); if (inp) inp.focus(); return; }
  if (!aiOn()) { toast('The AI key is not set (More → Food photo AI). Ask Claude instead.'); return; }
  const d = pd(tk), bl = tmrBlocks(d); tmrBusy = true; tmrProp = null; renderShutdown();
  const ctx = { date: tk, weekday: DAY_LONG[dow(d)], now: hmNow(), wake: wakeFor(d), bed: S.settings.bed, dialTarget: dialTargetFor(d), blocks: bl };
  try {
    const raw = await aiText(TMR_SYS, [{ role: 'user', text: `Day to re-plan:\n${JSON.stringify(ctx)}\n\nWhat Egor wrote:\n${txt}` }]);
    const j = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]); const ids = new Set(bl.map((b) => b.id)), okT = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
    tmrProp = { tk, text: txt, summary: String(j.summary || '').slice(0, 400), wake: okT(j.wake) ? j.wake : null, bed: okT(j.bed) ? j.bed : null,
      dials: j.dials != null && isFinite(j.dials) ? Math.max(0, Math.round(j.dials)) : null,
      remove: (j.remove || []).filter((x) => ids.has(x)), add: (j.add || []).filter((b) => b && b.title && okT(b.start) && okT(b.end)).slice(0, 20).map((b) => ({ id: 'ai:' + uid(), title: String(b.title).slice(0, 80), start: b.start, end: b.end, kind: b.kind || calKindSafe(b.title), days: [dow(d)] })) };
    if (tmrProp.dials != null && tmrProp.dials < 10 && dialTargetFor(d) >= 10) tmrProp.dials = 10;
  } catch (e) { tmrProp = { err: String(e.message || e).slice(0, 160) }; }
  tmrBusy = false; renderShutdown();
}
function calKindSafe(t) { return typeof calKind === 'function' ? calKind(t) : 'other'; }
function tmrDiff(p, d) {
  const bl = tmrBlocks(d), byId = Object.fromEntries(bl.map((b) => [b.id, b])), rows = [], used = new Set();
  p.remove.forEach((id) => { const b = byId[id]; if (!b) return; const a = p.add.find((x) => !used.has(x.id) && x.title.replace(/\d+/g, '') === b.title.replace(/\d+/g, '')); if (a) { used.add(a.id); rows.push(`<div class="small">↔ <b>${esc(a.title)}</b> <span class="muted">${b.start}–${b.end} →</span> ${a.start}–${a.end}</div>`); } else rows.push(`<div class="small bad">✕ ${esc(b.title)} <span class="muted">${b.start}–${b.end}</span></div>`); });
  p.add.filter((a) => !used.has(a.id)).forEach((a) => rows.push(`<div class="small ok">＋ ${esc(a.title)} <span class="muted">${a.start}–${a.end}</span></div>`));
  if (p.wake && p.wake !== wakeFor(d)) rows.unshift(`<div class="small">⏰ Wake <span class="muted">${wakeFor(d)} →</span> <b>${p.wake}</b></div>`);
  if (p.dials != null && p.dials !== dialTargetFor(d)) rows.push(`<div class="small">📞 Dials <span class="muted">${dialTargetFor(d)} →</span> <b>${p.dials}</b></div>`);
  return rows.join('') || '<div class="small muted">No changes needed.</div>';
}
function tmrApply() {
  const p = tmrProp; if (!p || p.err) return; const d = pd(p.tk), o = day(p.tk), sc = dayOnce(d);
  const rmAi = new Set(p.remove.filter((x) => String(x).startsWith('ai:')));
  sc.add = (sc.add || []).filter((b) => !rmAi.has(b.id)).concat(p.add); sc.skip = Array.from(new Set((sc.skip || []).concat(p.remove.filter((x) => !rmAi.has(x)))));
  if (p.wake) o.wakePlan = p.wake; if (p.dials != null) { o.targets = o.targets || {}; o.targets.dials = p.dials; }
  o.adjust = { text: p.text, summary: p.summary, at: now() }; touch(o); tmrProp = null;
  toast('Tomorrow adjusted in the app. Google Calendar keeps the old times.'); renderShutdown();
}
function tmrUndo(tk) { const o = day(tk); delete o.sched; delete o.wakePlan; delete o.adjust; if (o.targets) delete o.targets.dials; touch(o); tmrProp = null; toast('Tomorrow is back to the regular plan'); renderShutdown(); }
/* which day "tomorrow" is: after midnight and before 05:00 it is the day that already started */
function sdTomorrow(d) { return (isToday(d) && new Date().getHours() < 5) ? d : addDays(d, 1); }
function tomorrowStep(d) {
  const tmr = sdTomorrow(d), tk = dk(tmr), ot = S.days[tk] || {}, bl = blocksFor(tmr), prog = S.programs[S.programByDay.map[dow(tmr)]];
  const late = new Date().getHours() >= 23 || new Date().getHours() < 5;
  const tasks = (typeof tdToday === 'function' ? tdToday(tk).filter((t) => t.due === tk) : []);
  return `<div class="hint" style="margin-bottom:8px">${DAY_LONG[dow(tmr)]} ${fmtShort(tmr)} · wake <b>${wakeFor(tmr)}</b> · ${dialTargetFor(tmr) ? `📞 <b>${dialTargetFor(tmr)} dials</b>` : 'no dial target'}${prog ? ` · 🏋️ ${esc(prog.name)}` : ''}</div>
    ${ot.adjust ? `<div class="card flat" style="margin:0 0 8px;padding:10px;border-color:rgba(169,140,255,.4)"><div class="xs purple" style="font-weight:700">Adjusted</div><div class="small">${esc(ot.adjust.summary || ot.adjust.text)}</div><button class="btn sm" style="margin-top:6px" onclick="tmrUndo('${tk}')">Undo · back to the regular day</button></div>` : ''}
    <div class="tl" style="max-height:38vh;overflow:auto">${bl.map((b) => `<div class="blk"><div class="t">${b.start}–${b.end}</div><div class="b"><div class="n"><span class="tag ${b.kind}"></span>${esc(b.title)}${b.once ? ' <span class="xs purple">new</span>' : ''}</div></div></div>`).join('') || '<div class="small muted">Nothing planned.</div>'}</div>
    <div class="field" style="margin-top:10px"><label>Anything change for tomorrow?</label><textarea id="sd-adj" rows="2" placeholder="${late ? "It's already late. I wake up at 8:30, move what has to move." : 'e.g. No school tomorrow · sore throat, no tennis · lesson moved to 17:00'}">${esc((tmrProp && tmrProp.text) || '')}</textarea>
      <button class="btn ${late ? 'primary' : ''} block" style="margin-top:6px" ${tmrBusy ? 'disabled' : ''} onclick="tmrAdjust('${tk}')">${tmrBusy ? 'Re-planning…' : '✨ Adjust tomorrow'}</button></div>
    ${tmrProp && tmrProp.err ? `<div class="small bad">Could not re-plan: ${esc(tmrProp.err)}</div>` : ''}
    ${tmrProp && !tmrProp.err ? `<div class="card flat" style="margin:6px 0 0;padding:10px"><div class="small" style="margin-bottom:6px">${esc(tmrProp.summary)}</div>${tmrDiff(tmrProp, tmr)}<div class="row" style="gap:8px;margin-top:8px"><button class="btn primary grow" onclick="tmrApply()">Apply</button><button class="btn" onclick="tmrProp=null;renderShutdown()">Discard</button></div></div>` : ''}
    <div class="field" style="margin-top:10px"><label>Tomorrow in Todoist</label>${tasks.map((t) => `<div class="small" style="padding:4px 0">· ${esc(t.title)}${t.time ? ' <span class="muted">' + t.time + '</span>' : ''}</div>`).join('') || '<div class="small muted">Nothing due.</div>'}
      <div class="inline" style="margin-top:8px"><input id="sd-task" placeholder="+ task for tomorrow" onkeydown="if(event.key==='Enter'){captureTask(this.value+(tdOn()?' ${tk === dk(new Date()) ? 'today' : 'tomorrow'}':''),'${tk}');this.value='';renderShutdown()}"></div></div>`;
}
