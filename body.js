/* War Room 10.3 · TRAIN as a session player, FOOD with live rings.
   Train (Strong / Hevy pattern): a hero with the session ring, elapsed timer and one primary action;
   exercises show progress, the current one is highlighted and the rest timer is big and central.
   Food (MacroFactor / Apple Fitness pattern): calorie + protein rings and the one number that matters today. */
'use strict';
function bdRing(p, size, cls) { const r = size / 2 - 7, C = 2 * Math.PI * r; return `<svg viewBox="0 0 ${size} ${size}" class="bd-ring ${cls || ''}" style="width:${size}px;height:${size}px"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - Math.min(1, Math.max(0, p)))}"/></svg>`; }
function trStart() { const o = day(curDate), wo = W(o); wo.startedAt = wo.startedAt || new Date().toTimeString().slice(0, 5); wo._t0 = wo._t0 || now(); touch(o); render(); }
if (typeof renderTrain === 'function' && !renderTrain._bd) {
  const _rt = renderTrain;
  renderTrain = function () {
    const html = _rt(), o = day(curDate), wo = curSession(o), EX = wo.kind === 'program' ? sessionEx(wo) : [], tot = EX.reduce((a, e) => a + e.s, 0), done = sessionSets(wo), p = wo.kind === 'program' ? S.programs[wo.program] : null, today = isToday(curDate);
    const title = wo.kind === 'program' ? (p ? p.name : 'Free session') : sessionLabel(wo), mins = EX.reduce((a, e) => a + e.s * 2.5, 0);
    const running = today && wo._t0 && !wo.done, el = running ? Math.floor((now() - wo._t0) / 1000) : 0;
    const hero = `<div class="card tr-hero ${wo.done ? 'done' : ''}"><div class="tr-ring">${bdRing(tot ? done / tot : wo.done ? 1 : 0, 104)}<div><b>${tot ? done : wo.done ? '✓' : '–'}</b><span>${tot ? '/ ' + tot + ' sets' : ''}</span></div></div>
      <div class="tr-mid"><span class="tr-k">${today ? 'Today' : fmtShort(curDate)} · ${DAY_LONG[dow(curDate)]}</span><h2>${esc(title)}</h2><em>${EX.length ? `${EX.length} exercises · about ${Math.round(mins)} min` : wo.kind !== 'program' ? (sessionMinutes(wo) ? sessionMinutes(wo) + ' min' : '') : 'No exercises yet'}${wo.done ? ' · done' : ''}</em>
        ${running ? `<div class="tr-el"><span class="dot"></span><b id="tr-el">${fmtEl(el)}</b></div>` : ''}</div>
      <div class="tr-act">${wo.done ? `<button class="btn" onclick="finishWorkout()">Reopen</button>` : !running && today && wo.kind === 'program' && EX.length ? `<button class="btn primary" onclick="trStart()">Start</button>` : ''}${!wo.done && (running || done) ? `<button class="btn primary" onclick="finishWorkout()">Finish ✓</button>` : ''}<button class="btn ghost sm" onclick="show('trlog')">Training log</button></div></div>`;
    clearInterval(window._trT); if (running) window._trT = setInterval(() => { const e = document.getElementById('tr-el'); if (!e) { clearInterval(window._trT); return; } e.textContent = fmtEl(Math.floor((now() - wo._t0) / 1000)); }, 1000);
    return hero + html;
  };
  renderTrain._bd = 1;
}
function bdTrainPost() {
  const v = document.getElementById('view-train'); if (!v || view !== 'train') return; let cur = false;
  v.querySelectorAll('.ex').forEach((ex) => { const sets = ex.querySelectorAll('.set'), on = ex.querySelectorAll('.set.on').length; if (!sets.length) return; ex.classList.toggle('done', on === sets.length); if (!cur && on < sets.length) { ex.classList.add('cur'); cur = true; } else ex.classList.remove('cur'); const h = ex.querySelector('.h'); if (h && !ex.querySelector('.ex-p')) h.insertAdjacentHTML('afterend', `<i class="ex-p"><u style="width:${(on / sets.length) * 100}%"></u></i>`); });
}

/* Food: rings */
if (typeof foodSummaryCard === 'function' && !foodSummaryCard._bd) {
  const _fs = foodSummaryCard;
  foodSummaryCard = function (k) {
    const t = foodTotals(k), tg = foodTargets(), left = Math.max(0, tg.kcal - t.kcal), pl = Math.max(0, tg.p - t.p), today = k === dk(new Date()), nm = nowMin(), bed = tmin(S.settings.bed || '21:00'), hrs = Math.max(0, (bed - nm) / 60);
    const hero = `<div class="card fd-hero"><div class="fd-rings"><div class="fd-r">${bdRing(t.kcal / tg.kcal, 120, 'k')}<div><b>${fmt(Math.round(t.kcal))}</b><span>/ ${fmt(tg.kcal)} kcal</span></div></div><div class="fd-r">${bdRing(t.p / tg.p, 120, 'p')}<div><b>${Math.round(t.p)}</b><span>/ ${tg.p} g protein</span></div></div></div>
      <div class="fd-left">${left ? `<b>${fmt(Math.round(left))} kcal</b> and <b>${Math.round(pl)} g protein</b> to go${today && hrs > 0 ? ` · about ${fmt(Math.round(left / Math.max(1, Math.ceil(hrs / 3))))} kcal per meal for ${Math.max(1, Math.ceil(hrs / 3))} more meal${Math.ceil(hrs / 3) > 1 ? 's' : ''}` : ''}` : '<b>Target hit.</b> That is how 85 kg happens.'}</div>
      <div class="fd-mac">${[['Carbs', t.c, 'c'], ['Fat', t.f, 'f']].map(([l, v, c]) => `<span class="m-${c}">${l} <b>${Math.round(v)} g</b></span>`).join('')}<span>${t.n} meal${t.n === 1 ? '' : 's'}</span></div></div>`;
    return hero;
  };
  foodSummaryCard._bd = 1;
}
if (typeof render === 'function' && !render._bd) { const _r = render; render = function () { const x = _r.apply(this, arguments); try { bdTrainPost(); } catch (e) { } return x; }; render._bd = 1; }
