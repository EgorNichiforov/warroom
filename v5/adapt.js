/* War Room 9.3 · ADAPT — the plan bends to the real day.
   Woke up late → shift the morning (fixed things stay: school periods, lessons you teach, team practice, Florida dial blocks, travel).
   Move, skip or add any block today. Trained later than planned → log it at the real time, it counts.
   Or just say it in ARC's Log: "woke up 7:10" · "move bac to 18:00" · "skip gym" · "add walk 17:00 30" · "trained 17:30 45". */
'use strict';
const AD_FIXED_KINDS = ['school', 'sleep', 'travel', 'dials', 'tennis'];
function adFixed(b) { const t = (b.title || '').replace(EMO_RE, '').trim(); return AD_FIXED_KINDS.includes(b.kind) || /^\d+\.\s/.test(t) || /lesson|grup|group|lec(ț|t)i|liceu|școal|scoal|school|consulta/i.test(t); }
function adHm(m) { m = Math.max(0, Math.min(24 * 60 - 1, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function adTime(s) { s = String(s || '').trim().toLowerCase().replace('.', ':'); const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/); if (!m) return null; let h = +m[1], mi = +(m[2] || 0); if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0; return h < 24 && mi < 60 ? h * 60 + mi : null; }
function adToday() { return new Date(); }
function adBlocks(d) { return blocksFor(d || adToday()).slice().sort((a, b) => tmin(a.start) - tmin(b.start)); }

/* ── primitives: everything is a one-day override, the weekly plan never changes ── */
function adMove(id, s, e, d) {
  d = d || adToday(); const sc = dayOnce(d), b = adBlocks(d).find((x) => x.id === id); if (!b) return false;
  const ex = (sc.add || []).find((x) => x.id === id);
  if (ex) Object.assign(ex, { start: adHm(s), end: adHm(e) });
  else { if (!sc.skip.includes(id)) sc.skip.push(id); sc.add.push(Object.assign({}, b, { id: 'once:' + uid(), from: id, start: adHm(s), end: adHm(e), days: [dow(d)], cal: false, once: true })); }
  touch(day(d)); return true;
}
function adClash(id, s, e) { const f = adBlocks().filter((x) => x.id !== id && adFixed(x) && x.kind !== 'sleep').find((x) => tmin(x.start) < e && tmin(x.end) > s); return f ? ` · ⚠ overlaps ${f.title.replace(EMO_RE, '').trim()} (${f.start})` : ''; }
function adSkip(id, d) { d = d || adToday(); const sc = dayOnce(d); if ((sc.add || []).some((x) => x.id === id)) sc.add = sc.add.filter((x) => x.id !== id); else if (!sc.skip.includes(id)) sc.skip.push(id); touch(day(d)); }
function adAdd(title, kind, s, e, d) { d = d || adToday(); dayOnce(d).add.push({ id: 'once:' + uid(), title, kind: kind || 'other', start: adHm(s), end: adHm(e), days: [dow(d)], once: true }); touch(day(d)); }
function adKindOf(t) { t = t.toLowerCase(); return /dial|call/.test(t) ? 'dials' : /bac|anki|study|romana|istorie|english|python|exam/.test(t) ? 'bac' : /train|gym|workout|upper|legs|arms|core|mobility|run|walk/.test(t) ? 'train' : /tennis|tt\b|ofp/.test(t) ? 'tennis' : /deep|company|agency|bench|caregiver/.test(t) ? 'agency' : /eat|lunch|dinner|breakfast|food|snack/.test(t) ? 'food' : 'other'; }

/* ── woke up late: shift the movable morning, stop at fixed blocks, report what didn't fit ── */
const AD_PRI = { bac: 1, food: 2, train: 3, program: 3, agency: 4, routine: 5, other: 6 }; /* gaining to 85 kg: breakfast beats a squeezed workout; training moves to later instead */
function adShiftPreview(upAt) {
  const d = adToday(), wake = tmin(wakeFor(d)), delta = upAt - wake, L = adBlocks(d), out = [];
  if (delta <= 0) return { delta, out };
  const fx = L.filter(adFixed).filter((f) => f.kind !== 'sleep'), firstFixed = fx.find((f) => tmin(f.start) >= wake);
  const morning = L.filter((b) => !adFixed(b) && b.kind !== 'sleep' && tmin(b.start) >= wake && (!firstFixed || tmin(b.start) < tmin(firstFixed.start)));
  const nextFixed = fx.find((f) => tmin(f.end) > upAt), winEnd = nextFixed ? Math.max(upAt, tmin(nextFixed.start)) : upAt + 180;
  let budget = winEnd - upAt; const keep = new Map();
  morning.slice().sort((a, b) => (AD_PRI[a.kind] || 6) - (AD_PRI[b.kind] || 6)).forEach((b) => { const len = tmin(b.end) - tmin(b.start); if (len <= budget) { keep.set(b.id, len); budget -= len; } else if (budget >= 10 && (AD_PRI[b.kind] || 6) <= 3) { keep.set(b.id, budget); budget = 0; } });
  let cur = upAt; morning.forEach((b) => { const len = tmin(b.end) - tmin(b.start); if (keep.has(b.id)) { const l = keep.get(b.id); out.push({ b, s: cur, e: cur + l, ok: true, short: l < len }); cur += l; } else out.push({ b, s: 0, e: 0, ok: false }); });
  return { delta, out, winEnd, nextFixed };
}
function adShift(upAt) {
  const d = adToday(), P = adShiftPreview(upAt); if (P.delta <= 0) { toast('That is not later than your planned wake-up'); return; }
  const o = day(d); o.wokeAt = adHm(upAt); P.out.forEach((x) => (x.ok ? adMove(x.b.id, x.s, x.e, d) : adSkip(x.b.id, d)));
  touch(o); save(); const lost = P.out.filter((x) => !x.ok);
  render(); if (typeof arcRender === 'function') arcRender();
  if (lost.some((x) => ['bac', 'train', 'program', 'agency', 'dials'].includes(x.b.kind)) && typeof enReplanModal === 'function') { toast(`Morning shifted · ${lost.length} didn't fit before ${P.nextFixed ? P.nextFixed.start : 'your next block'}. Here's where the rest can go today:`); setTimeout(enReplanModal, 400); }
  else toast(`Morning shifted ${P.delta} min${lost.length ? ' · dropped: ' + lost.map((x) => x.b.title.replace(EMO_RE, '').trim()).join(', ') : ''}`);
}

/* ── training done at a different time ── */
function adTrainAt(k, s, mins, label, what) {
  const d = pd(k), o = day(d), ss = sessionsOf(o), empty = ss.find((x) => typeof trlEmpty === 'function' && trlEmpty(x));
  const kind = what === 'tennis' ? 'tennis' : what === 'cardio' ? 'cardio' : what === 'mobility' ? 'mobility' : 'program';
  const sess = Object.assign(empty || { id: uid(), sets: {} }, { kind, program: kind === 'program' ? (S.programByDay.map[dow(d)] || '') : '', label: label || '', startedAt: adHm(s), dur: mins || 0, endedAt: mins ? adHm(s + mins) : '', done: true, note: (empty && empty.note) || '' });
  delete sess.skipped; if (!empty) ss.push(sess); syncTrainFlags(o); touch(o); save();
  toast(`Training logged at ${adHm(s)}${mins ? ' · ' + mins + ' min' : ''} · counts ✓`); render();
}

/* ── the Change sheet: one door for every change ── */
function adChange() {
  const nm = nowMin(), d = adToday(), up = Math.max(nm, tmin(wakeFor(d)) + 15);
  openModal(`<h2>Change today</h2><div class="xs muted" style="margin-bottom:12px">Only today changes. Your weekly plan stays as it is. Or type it in Log: "woke up 7:10", "move bac to 18:00", "skip gym", "trained 17:30 45".</div>
    <div class="ad-opt"><b>I woke up late</b><span>Movable morning blocks shift. School, lessons, practice, dial blocks and travel stay.</span><div class="row" style="gap:8px"><input id="ad-up" type="time" value="${adHm(up)}"><button class="btn primary" onclick="adShiftAsk()">Preview</button></div><div id="ad-prev"></div></div>
    <div class="ad-opt"><b>I trained at a different time</b><span>Log it at the real time. It counts as trained.</span><div class="row" style="gap:8px;flex-wrap:wrap"><input id="ad-ts" type="time" value="${adHm(Math.max(0, nm - 45))}"><input id="ad-tm" type="number" inputmode="numeric" placeholder="min" style="width:80px" value="45"><select id="ad-tw"><option value="program">Strength</option><option value="tennis">Tennis</option><option value="cardio">Run / zone 2</option><option value="mobility">Mobility</option></select><button class="btn primary" onclick="adTrainAt(dk(new Date()),adTime($('ad-ts').value),Number($('ad-tm').value)||0,'',$('ad-tw').value);closeModal()">Log</button></div></div>
    <div class="ad-opt"><b>Add a block</b><div class="row" style="gap:8px;flex-wrap:wrap"><input id="ad-at" placeholder="What" style="flex:1;min-width:140px"><input id="ad-as" type="time" value="${adHm(Math.ceil(nm / 15) * 15)}"><input id="ad-am" type="number" inputmode="numeric" value="30" style="width:70px"><button class="btn primary" onclick="adAddFromSheet()">Add</button></div></div>
    <div class="ad-opt"><b>Rebuild the rest of today</b><span>Puts what's left (dials, BAC, training) into your free gaps.</span><button class="btn" onclick="closeModal();enReplanModal()">Rebuild</button></div>
    ${(() => { const o = S.days[dk(d)]; return o && o.sched && ((o.sched.skip || []).length || (o.sched.add || []).length) ? `<button class="btn ghost block" onclick="adReset()">Undo all changes for today</button>` : ''; })()}`);
}
function adShiftAsk() {
  const up = adTime($('ad-up').value); if (up == null) return; const P = adShiftPreview(up);
  $('ad-prev').innerHTML = P.delta <= 0 ? '<div class="small muted" style="margin-top:8px">That is not later than your planned wake-up.</div>' : `${P.nextFixed ? `<div class="xs muted" style="margin-top:8px">Window: ${adHm(adTime($('ad-up').value))}–${P.nextFixed.start} (then ${esc(P.nextFixed.title.replace(EMO_RE, '').trim())}). Priority: BAC, breakfast, then training (training can move to later today).</div>` : ''}<div class="ad-pv">${P.out.map((x) => `<div class="${x.ok ? '' : 'drop'}"><span>${esc(x.b.title.replace(EMO_RE, '').trim())}</span><b>${x.ok ? `${x.b.start} → ${adHm(x.s)}${x.short ? ' (shorter)' : ''}` : 'doesn\'t fit · later'}</b></div>`).join('') || '<div class="small muted">Nothing movable in the morning.</div>'}</div>${P.out.length ? `<button class="btn primary block" style="margin-top:8px" onclick="adShift(${up});closeModal()">Shift by ${P.delta} min</button>` : ''}`;
}
function adAddFromSheet() { const t = $('ad-at').value.trim(), s = adTime($('ad-as').value), m = Number($('ad-am').value) || 30; if (!t || s == null) { toast('What and when'); return; } adAdd(t, adKindOf(t), s, s + m); save(); closeModal(); toast(`Added ${t} at ${adHm(s)}`); render(); }
function adReset() { const o = day(adToday()); delete o.sched; delete o.replan; touch(o); save(); closeModal(); toast('Today is back to the normal plan'); render(); }

/* ── block sheet in ARC: move, skip, trained-at ── */
if (typeof arcBlk === 'function' && !arcBlk._ad) {
  arcBlk = function (id) {
    const d = adToday(), b = (typeof arcBlocks === 'function' ? arcBlocks(d) : adBlocks(d)).find((x) => x.id === id); if (!b) return; const tr = b.kind === 'train' || b.kind === 'program';
    openModal(`<div class="xs muted">${b.start}–${b.end} · ${esc((typeof ARC_KIND !== 'undefined' && ARC_KIND[b.kind]) || b.kind)}${adFixed(b) ? ' · fixed' : ''}</div><h2 style="margin:4px 0 14px">${esc(b.title.replace(EMO_RE, '').trim())}</h2>
      <div class="row" style="gap:8px"><button class="btn grow primary" onclick="arcMark('${id}','done')">Done</button><button class="btn grow" onclick="arcMark('${id}','miss')">Missed</button></div>
      <div class="sec-h" style="margin-top:14px">Move today</div><div class="row" style="gap:8px"><input id="ab-s" type="time" value="${b.start}"><input id="ab-e" type="time" value="${b.end}"><button class="btn" onclick="adMoveFromSheet('${id}')">Move</button></div>
      <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${[30, 60, 120].map((m) => `<button class="btn sm ghost" onclick="adMove('${id}',${tmin(b.start) + m},${tmin(b.end) + m});save();closeModal();render()">+${m >= 60 ? m / 60 + ' h' : m + ' min'}</button>`).join('')}<button class="btn sm ghost" onclick="adSkip('${id}');save();closeModal();toast('Skipped today');render()">Skip today</button></div>
      ${tr ? `<div class="sec-h" style="margin-top:14px">Trained at another time?</div><div class="row" style="gap:8px"><input id="ab-ts" type="time" value="${adHm(Math.max(0, nowMin() - 45))}"><input id="ab-tm" type="number" inputmode="numeric" value="${tmin(b.end) - tmin(b.start)}" style="width:80px"><button class="btn primary" onclick="adTrainAt(dk(new Date()),adTime($('ab-ts').value),Number($('ab-tm').value)||0);closeModal()">Log it</button></div>` : ''}
      ${b.note ? `<div class="small muted" style="margin-top:12px">${esc(b.note)}</div>` : ''}`);
  };
  arcBlk._ad = 1;
}
function adMoveFromSheet(id) { const s = adTime($('ab-s').value), e = adTime($('ab-e').value); if (s == null || e == null || e <= s) { toast('Pick a valid time'); return; } const w = adClash(id, s, e); adMove(id, s, e); save(); closeModal(); toast(`Moved to ${adHm(s)}${w}`); render(); }

/* ── say it: sentences in ARC's Log ── */
function adSay(text) {
  const t = ' ' + text.toLowerCase().trim() + ' ', d = adToday(), L = adBlocks(d), T = '(\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm)?)';
  const find = (w) => { w = w.trim(); const fut = L.filter((b) => tmin(b.end) > nowMin() - 60); return fut.find((b) => b.title.toLowerCase().includes(w)) || fut.find((b) => b.kind === adKindOf(w)) || L.find((b) => b.title.toLowerCase().includes(w)); };
  let m;
  if ((m = t.match(new RegExp('(?:woke(?: up)?|got up|up at|i\'?m up|slept (?:in|till|until))\\s*(?:at\\s*)?' + T)))) { const v = adTime(m[1]); if (v != null) { adShift(v); return 'shift'; } }
  if ((m = t.match(new RegExp('(?:trained|did (?:my )?(?:training|workout|gym)|workout done|gym done)\\s*(?:at\\s*)?' + T + '?\\s*(?:for\\s*)?(\\d+)?\\s*(?:min)?')))) { const s = m[1] ? adTime(m[1]) : Math.max(0, nowMin() - (Number(m[2]) || 45)); adTrainAt(dk(d), s, Number(m[2]) || 0, '', /tennis|tt\b/.test(t) ? 'tennis' : /run|walk|zone/.test(t) ? 'cardio' : 'program'); return 'train'; }
  if ((m = t.match(new RegExp('^\\s*move\\s+(.+?)\\s+to\\s+' + T)))) { const b = find(m[1]), s = adTime(m[2]); if (b && s != null) { const e2 = s + (tmin(b.end) - tmin(b.start)), w = adClash(b.id, s, e2); adMove(b.id, s, e2); save(); toast(`Moved ${b.title.replace(EMO_RE, '').trim()} to ${adHm(s)}${w}`); render(); return 'move'; } toast('Which block? Try "move bac to 18:00"'); return 'x'; }
  if ((m = t.match(/^\s*(?:skip|cancel)\s+(?:the\s+)?(.+?)\s*(?:today)?\s*$/))) { const b = find(m[1]); if (b) { adSkip(b.id); save(); toast(`Skipped: ${b.title.replace(EMO_RE, '').trim()}`); render(); return 'skip'; } toast(`Nothing called "${m[1].trim()}" left today`); return 'x'; }
  if ((m = t.match(new RegExp('^\\s*add\\s+(.+?)\\s+(?:at\\s+)?' + T + '(?:\\s+(?:for\\s+)?(\\d+)\\s*(?:min)?)?\\s*$')))) { const s = adTime(m[2]); if (s != null) { const len = Number(m[3]) || 30; adAdd(m[1].trim(), adKindOf(m[1]), s, s + len); save(); toast(`Added ${m[1].trim()} at ${adHm(s)}`); render(); return 'add'; } }
  return null;
}
if (typeof arcLogSave === 'function' && !arcLogSave._ad) {
  const _l = arcLogSave;
  arcLogSave = function () { const el = document.querySelector('.arc-log'), s = el ? el.value : ''; if (s && adSay(s)) { closeModal(); if (typeof arcRender === 'function') arcRender(); return; } return _l(); };
  arcLogSave._ad = 1;
}
/* ARC footer: Replan → Change (one door for every change) */
if (typeof arcHtml === 'function' && !arcHtml._ad) {
  const _h = arcHtml;
  arcHtml = function () { return _h().replace('<button onclick="enReplanModal()">Replan</button>', '<button onclick="adChange()">Change</button>').replace('placeholder="What happened?"', 'placeholder="What happened, or what changed?"'); };
  arcHtml._ad = 1;
}
