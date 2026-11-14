/* ════════════════════════════════════════════════════════════════════
   War Room · NOVA (6.0) — a new interface over the same data.
   Four instruments + one command orb:
     ORBIT    the whole day as a 24-hour dial, a live "now" needle, one action
     REACTOR  dial mode: swipe the agency card to log the call, a core that fills dial by dial
     PULSE    the 7 standards as a constellation, the three rings, one-tap body actions
     VECTOR   where today's pace lands you: checkpoints to 1 Jul 2027, velocity, a day scrubber
     COMMAND  speak or type what happened ("40 dials 2 owners") → preview → confirm
   Nothing here stores new kinds of data: every action calls the existing app functions.
   Off switch: More → Appearance → Interface → Monolith screens (localStorage 'wr-ui').
   ════════════════════════════════════════════════════════════════════ */
const NV_TABS = [['orbit', 'Orbit'], ['reactor', 'Reactor'], ['cmd', ''], ['pulse', 'Pulse'], ['vector', 'Vector']];
const NV_KIND = { dials: ['#6EF2C8', 'Dials'], bac: ['#9C8CFF', 'BAC study'], school: ['#5E8BFF', 'School'], train: ['#FF8F6B', 'Training'], tennis: ['#FFC65C', 'Tennis'], agency: ['#4FD3FF', 'Company work'], routine: ['#8E99AA', 'Routine'], food: ['#B7E36D', 'Food'], travel: ['#6C7686', 'Travel'], sleep: ['#26304A', 'Sleep'], other: ['#A4A3B8', 'Other'] };
let nvTab = 'orbit', nvSel = null, nvAway = false, nvTick = 0, nvScrub = 0, nvCombo = { n: 0, last: 0, best: 0 }, nvPulseAt = 0, nvDrag = null;

function nvOn() { try { return localStorage.getItem('wr-ui') !== 'monolith'; } catch (e) { return true; } }
function nvSetUi(u) { try { localStorage.setItem('wr-ui', u); } catch (e) { } if (u === 'nova') { nvAway = false; nvMount(); } else nvUnmount(); closeModal(); render(); toast(u === 'nova' ? 'NOVA interface on' : 'Monolith screens on'); }
const nvE = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nvStrip = (s) => String(s || '').replace(/(?:\p{Extended_Pictographic}|[☀-➿])(?:️|‍\p{Extended_Pictographic})*️?\s?/gu, '').trim();
function nvToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function nvHm(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function nvDur(m) { m = Math.max(0, Math.round(m)); return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m} min`; }

/* ───────── mount ───────── */
function nvMount() {
  if (!nvOn()) return;
  document.documentElement.classList.add('nova-open');
  let el = document.getElementById('nova');
  if (!el) {
    el = document.createElement('div'); el.id = 'nova'; el.setAttribute('role', 'application'); el.setAttribute('aria-label', 'War Room NOVA');
    el.innerHTML = `<div class="nv-sky" aria-hidden="true"><i></i><i></i><i></i></div><div class="nv-top" id="nv-top"></div><main class="nv-main" id="nv-main"></main><nav class="nv-dock" id="nv-dock" aria-label="Instruments"></nav>`;
    document.body.appendChild(el);
  }
  el.classList.toggle('away', nvAway);
  let back = document.getElementById('nv-back');
  if (!back) { back = document.createElement('button'); back.id = 'nv-back'; back.className = 'nv-back'; back.setAttribute('aria-label', 'Back to NOVA'); back.innerHTML = '<i></i><span>NOVA</span>'; back.onclick = nvReturn; document.body.appendChild(back); }
  back.classList.toggle('show', nvAway);
  if (!nvTick) nvTick = setInterval(() => { if (!nvAway && nvOn() && !document.querySelector('.modal-bg.open') && !nvDrag) { if (nvTab === 'reactor') nvSessClock(); else if (nvTab === 'orbit') nvRender(); } }, 20000);
  nvRender();
}
function nvUnmount() { document.documentElement.classList.remove('nova-open'); const el = document.getElementById('nova'); if (el) el.remove(); const b = document.getElementById('nv-back'); if (b) b.remove(); }
function nvGo(v, pre) { if (typeof pre === 'function') pre(); nvAway = true; document.documentElement.classList.remove('nova-open'); const el = document.getElementById('nova'); if (el) el.classList.add('away'); show(v); const b = document.getElementById('nv-back'); if (b) b.classList.add('show'); }
function nvReturn() { nvAway = false; curDate = nvToday(); document.documentElement.classList.add('nova-open'); const el = document.getElementById('nova'); if (el) el.classList.remove('away'); const b = document.getElementById('nv-back'); if (b) b.classList.remove('show'); window.scrollTo(0, 0); nvRender(); }
function nvSwitch(t) { if (t === 'cmd') { nvCommand(); return; } nvTab = t; nvSel = null; nvRender(); const m = document.getElementById('nv-main'); if (m) m.scrollTop = 0; try { navigator.vibrate && navigator.vibrate(6); } catch (e) { } }

function nvRender() {
  if (!nvOn() || nvAway) return; const main = document.getElementById('nv-main'); if (!main) return;
  curDate = nvToday();
  document.getElementById('nv-top').innerHTML = nvTop();
  main.innerHTML = { orbit: nvOrbit, reactor: nvReactor, pulse: nvPulse, vector: nvVector }[nvTab]();
  main.dataset.tab = nvTab;
  document.getElementById('nv-dock').innerHTML = NV_TABS.map(([id, l]) => id === 'cmd'
    ? `<button class="nv-orb" onclick="nvCommand()" aria-label="Command: speak or type"><span class="core"></span><span class="halo"></span>${ic('mic', 22)}</button>`
    : `<button class="${nvTab === id ? 'on' : ''}" onclick="nvSwitch('${id}')" aria-current="${nvTab === id}">${nvIcon(id)}<span>${l}</span></button>`).join('');
  if (nvTab === 'reactor') nvBindSwipe();
  if (!nvSeenIntro() && !nvIntro._on) { nvIntro._on = true; setTimeout(nvIntro, 300); }
}
function nvIcon(id) {
  const p = { orbit: '<circle cx="12" cy="12" r="9"/><path d="M12 12 L12 5"/><path d="M12 12 L16.5 14.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>', reactor: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" stroke-dasharray="3 2.4"/><circle cx="12" cy="12" r="10.5" opacity=".5"/>', pulse: '<path d="M3 12h4l2-5 3 10 2.5-7 1.5 2H21"/>', vector: '<path d="M4 19 L10 13 L14 15 L20 6"/><path d="M15 6h5v5"/>' }[id];
  return `<svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

/* ───────── top HUD: two clocks, the mission, the systems grid ───────── */
function nvTop() {
  const nm = nowMin(), fm = (nm - 420 + 1440) % 1440, callable = fm >= 480 && fm < 1200 && dow(new Date()) !== 7;
  const left = daysUntil(S.settings.bigDate);
  return `<div class="nv-hud">
    <div class="nv-brand"><b>WAR ROOM</b><span>NOVA</span></div>
    <div class="nv-clocks" title="Moldova time and Florida time">
      <div><small>CHI</small><b>${nvHm(nm)}</b></div>
      <div class="${callable ? 'live' : ''}"><small>FLA</small><b>${nvHm(fm)}</b><em>${callable ? 'owners reachable' : 'Florida closed'}</em></div>
    </div>
    <div class="nv-d"><b>D-${left}</b><small>$20K MRR</small></div>
    <button class="nv-grid" onclick="nvSystems()" aria-label="All systems">${nvGridIcon()}</button>
  </div>`;
}
function nvGridIcon() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>'; }

/* ═════════ ORBIT ═════════ */
function nvArc(c, r, a0, a1) { const p = (a) => { const t = (a - 90) * Math.PI / 180; return [c + r * Math.cos(t), c + r * Math.sin(t)]; }; if (a1 - a0 >= 359.9) a1 = a0 + 359.9; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
const nvAng = (m) => (m / 1440) * 360;
function nvBlocks() { const d = nvToday(); return (blocksFor(d) || []).map((b) => ({ id: b.id, title: nvStrip(b.title), kind: NV_KIND[b.kind] ? b.kind : 'other', s: tmin(b.start), e: b.end === '24:00' ? 1440 : tmin(b.end), start: b.start, end: b.end, note: b.note || '', raw: b })).filter((b) => b.e > b.s).sort((a, b) => a.s - b.s); }
function nvNowBlock(bl, nm) { return bl.filter((b) => b.s <= nm && nm < b.e).sort((a, b) => b.s - a.s)[0] || null; }
function nvAction(b, nm) {
  const d = nvToday(), o = day(d), tg = dialTargetFor(d), v = Number(o.counters.dials) || 0;
  if (nm >= tmin(S.settings.shutdown || '20:45') || nm < 240) return { l: 'Start shutdown', go: 'startShutdown()' };
  if (!b) return tg && v < tg ? { l: `Open the Reactor · ${tg - v} dials left`, go: "nvSwitch('reactor')" } : null;
  if (b.kind === 'dials') return { l: `Ignite the Reactor · ${Math.max(0, tg - v)} left`, go: "nvSwitch('reactor')" };
  if (b.kind === 'bac') return S.timer ? null : { l: 'Start 25 min BAC focus', go: "startTimer('bac',25)" };
  if (b.kind === 'agency') return S.timer ? null : { l: 'Start 50 min deep work', go: "startTimer('deep',50)" };
  if (typeof isTrainBlock === 'function' && isTrainBlock(b.raw)) return { l: 'Open today’s session', go: `nvGo('train',()=>openBlockTraining('${b.id}','${dk(d)}'))` };
  if (b.kind === 'routine' && /weigh/i.test(b.title) && (o.weight == null || o.weight === '')) return { l: 'Weigh in', go: 'weightModal()' };
  return null;
}
function nvOrbit() {
  const nm = nowMin(), d = nvToday(), bl = nvBlocks(), cur = nvNowBlock(bl, nm), next = bl.filter((b) => b.s > nm).slice(0, 3);
  const c = 200, R = 162, r = ringsFor(d), sel = nvSel ? bl.find((b) => String(b.id) === String(nvSel)) : null;
  const bed = tmin(S.settings.bed || '21:00'), wake = tmin(S.settings.wake || '05:20');
  let svg = `<defs><filter id="nvglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="nvcore" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#18223a" stop-opacity=".95"/><stop offset="1" stop-color="#0a0f1a" stop-opacity=".2"/></radialGradient></defs>`;
  svg += `<circle cx="${c}" cy="${c}" r="150" fill="url(#nvcore)"/>`;
  for (let h = 0; h < 96; h++) { const a = (h / 96) * 360 - 90, t = a * Math.PI / 180, big = h % 24 === 0, mid = h % 4 === 0, r0 = big ? 180 : mid ? 183 : 185, r1 = 190; svg += `<line x1="${(c + r0 * Math.cos(t)).toFixed(1)}" y1="${(c + r0 * Math.sin(t)).toFixed(1)}" x2="${(c + r1 * Math.cos(t)).toFixed(1)}" y2="${(c + r1 * Math.sin(t)).toFixed(1)}" class="${big ? 'tk big' : mid ? 'tk mid' : 'tk'}"/>`; }
  [['00', 0], ['06', 360], ['12', 720], ['18', 1080]].forEach(([l, m]) => { const t = (nvAng(m) - 90) * Math.PI / 180; svg += `<text x="${(c + 198 * Math.cos(t)).toFixed(1)}" y="${(c + 198 * Math.sin(t) + 4).toFixed(1)}" class="hl" text-anchor="middle">${l}</text>`; });
  svg += `<circle cx="${c}" cy="${c}" r="${R}" class="track"/>`;
  svg += `<path d="${nvArc(c, R, nvAng(bed), nvAng(wake + (wake < bed ? 1440 : 0)))}" class="sleeparc"/>`;
  bl.forEach((b) => { const col = NV_KIND[b.kind][0], past = b.e <= nm, on = cur && b.id === cur.id, isSel = sel && sel.id === b.id; svg += `<path d="${nvArc(c, R, nvAng(b.s) + 0.6, nvAng(b.e) - 0.6)}" stroke="${col}" class="blk${past ? ' past' : ''}${on ? ' on' : ''}${isSel ? ' sel' : ''}" ${on ? 'filter="url(#nvglow)"' : ''} onclick="nvPick('${nvE(b.id)}')"><title>${nvE(b.start + '–' + b.end + ' ' + b.title)}</title></path>`; });
  [[r.co.p, 134, NV_KIND.dials[0]], [r.body.p, 123, '#FF8F6B'], [r.mind.p, 112, NV_KIND.bac[0]]].forEach(([p, rr, col]) => { p = clamp(p || 0, 0, 1); svg += `<circle cx="${c}" cy="${c}" r="${rr}" stroke="${col}" class="mini-t"/>`; if (p > 0) svg += `<path d="${nvArc(c, rr, 0, Math.max(1, p * 360))}" stroke="${col}" class="mini"/>`; });
  const na = (nvAng(nm) - 90) * Math.PI / 180; svg += `<line x1="${(c + 142 * Math.cos(na)).toFixed(1)}" y1="${(c + 142 * Math.sin(na)).toFixed(1)}" x2="${(c + 194 * Math.cos(na)).toFixed(1)}" y2="${(c + 194 * Math.sin(na)).toFixed(1)}" class="needle" filter="url(#nvglow)"/><circle cx="${(c + R * Math.cos(na)).toFixed(1)}" cy="${(c + R * Math.sin(na)).toFixed(1)}" r="6" class="needle-dot" filter="url(#nvglow)"/>`;
  const focus = sel || cur, act = sel ? null : nvAction(cur, nm), left = cur ? cur.e - nm : null;
  const center = focus ? `<small>${sel ? (sel.e <= nm ? 'DONE' : sel.s > nm ? 'IN ' + nvDur(sel.s - nm).toUpperCase() : 'NOW') : 'NOW'} · ${focus.start}–${focus.end === '24:00' ? '…' : focus.end}</small><b>${nvE(focus.title)}</b>${!sel && left != null ? `<em>${nvDur(left)} left</em>` : ''}`
    : `<small>${nvHm(nm)}</small><b>${next.length ? 'Open time' : 'Day is done'}</b>${next.length ? `<em>${nvE(next[0].title)} in ${nvDur(next[0].s - nm)}</em>` : ''}`;
  const sigs = nvSignals();
  return `<section class="nv-orbit">
    <div class="nv-dialwrap"><svg viewBox="-12 -12 424 424" class="nv-dial" role="img" aria-label="Today as a 24-hour dial">${svg}</svg><div class="nv-center" onclick="nvPick(null)">${center}</div></div>
    ${sel ? `<div class="nv-glass nv-selbar"><div><small style="color:${NV_KIND[sel.kind][0]}">${NV_KIND[sel.kind][1].toUpperCase()}</small><b>${nvE(sel.title)}</b><span>${sel.start}–${sel.end}${sel.note ? ' · ' + nvE(sel.note) : ''}</span></div><div class="nv-row"><button class="nv-btn ghost" onclick="blockSheet('${nvE(sel.id)}','${dk(nvToday())}')">Move / cancel</button><button class="nv-btn ghost" onclick="nvPick(null)">Close</button></div></div>`
      : act ? `<button class="nv-cta" onclick="${act.go}"><span>${nvE(act.l)}</span><i></i></button>` : ''}
    ${S.timer ? nvTimer() : ''}
    ${sigs ? `<div class="nv-signals">${sigs}</div>` : ''}
    <div class="nv-h">Next on the dial</div>
    <div class="nv-next">${next.length ? next.map((b) => `<button class="nv-glass" onclick="nvPick('${nvE(b.id)}')"><i style="background:${NV_KIND[b.kind][0]}"></i><b>${nvE(b.title)}</b><span>${b.start} · in ${nvDur(b.s - nm)}</span></button>`).join('') : '<div class="nv-glass nv-empty">Nothing else scheduled today. Lights out at ' + nvE(S.settings.bed || '21:00') + '.</div>'}</div>
    <div class="nv-legend">${[...new Set(bl.map((b) => b.kind))].map((k) => `<span><i style="background:${NV_KIND[k][0]}"></i>${NV_KIND[k][1]}</span>`).join('')}<span><i class="ring-co"></i>dials ring</span><span><i class="ring-bo"></i>body</span><span><i class="ring-mi"></i>mind</span></div>
  </section>`;
}
function nvPick(id) { nvSel = id; nvRender(); try { navigator.vibrate && navigator.vibrate(5); } catch (e) { } }
function nvTimer() { const t = S.timer, rem = Math.max(0, t.mins * 60 - Math.floor((now() - t.start) / 1000)); return `<div class="nv-glass nv-timer"><div><small>FOCUS TIMER · ${nvE(t.counter === 'bac' ? 'BAC' : t.counter === 'deep' ? 'DEEP WORK' : t.counter.toUpperCase())}</small><b>${Math.floor(rem / 60)}:${pad(rem % 60)}</b></div><div class="nv-row"><button class="nv-btn" onclick="stopTimer(true)">Done</button><button class="nv-btn ghost" onclick="stopTimer(false)">Stop</button></div></div>`; }
function nvSignals() {
  const out = []; let rs = []; try { rs = typeof radarItems === 'function' && Q ? radarItems() : []; } catch (e) { }
  const hot = rs.filter((x) => x.kind === 'overdue' || x.kind === 'nonext').length;
  if (hot) out.push(`<button class="nv-sig hot" onclick="nvSwitch('reactor')"><i></i>${hot} interested ${hot === 1 ? 'agency waits' : 'agencies wait'} on you</button>`);
  try { const L = typeof sleepLive === 'function' && sleepLive(); if (L) out.unshift(`<button class="nv-sig live" onclick="sleepScreen()"><i></i>${L.o.sleepState === 'asleep' ? 'Asleep' : 'Awake in the night'} · open night screen</button>`); } catch (e) { }
  if (S.session && S.session.active) out.push(`<button class="nv-sig live" onclick="nvSwitch('reactor')"><i></i>Dial session running</button>`);
  try { (typeof earlyWarnings === 'function' ? earlyWarnings() : []).filter((w) => !/interested agenc/i.test(w.title)).slice(0, 2).forEach((w) => out.push(`<button class="nv-sig ${w.level === 'high' ? 'hot' : ''}" onclick="nvGo('intel',()=>{intelTab='home'})"><i></i>${nvE(nvStrip(w.title))}</button>`)); } catch (e) { }
  return out.join('');
}

/* ═════════ REACTOR ═════════ */
function nvReactor() {
  const d = nvToday(), o = day(d), tg = dialTargetFor(d), v = Number(o.counters.dials) || 0, ow = Number(o.counters.owners) || 0;
  const goal = Math.max(tg, 10), sess = S.session && S.session.active ? S.session : null, x = Q ? currentCall() : null;
  const sd = sess ? v - sess.d0 : 0, mins = sess ? (now() - sess.start) / 60000 : 0, rate = sess && mins > 3 && sd > 0 ? sd / (mins / 60) : 0;
  const eta = rate && tg > v ? nowMin() + ((tg - v) / rate) * 60 : null;
  const c = 160, n = Math.min(goal, 150); let dots = '';
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI - Math.PI / 2, rr = 138; dots += `<circle cx="${(c + rr * Math.cos(a)).toFixed(1)}" cy="${(c + rr * Math.sin(a)).toFixed(1)}" r="${n > 90 ? 2.2 : 3.2}" class="${i < v ? 'lit' : ''}${i === v - 1 && now() - nvPulseAt < 2500 ? ' fresh' : ''}"/>`; }
  const p = clamp(v / goal, 0, 1), C = 2 * Math.PI * 118;
  const core = `<svg viewBox="0 0 320 320" class="nv-core${now() - nvPulseAt < 1200 ? ' pulse' : ''}" role="img" aria-label="${v} of ${tg} dials today"><defs><radialGradient id="nvplasma"><stop offset="0" stop-color="#6EF2C8" stop-opacity=".55"/><stop offset=".55" stop-color="#2a8f7a" stop-opacity=".18"/><stop offset="1" stop-color="#0b1220" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${c}" cy="${c}" r="${40 + 70 * p}" fill="url(#nvplasma)" class="plasma"/>${dots}
    <circle cx="${c}" cy="${c}" r="118" class="ctrack"/><circle cx="${c}" cy="${c}" r="118" class="cfill" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/></svg>`;
  const left = Math.max(0, tg - v);
  const stats = `<div class="nv-rstats">
    <div><small>OWNERS</small><b>${ow}</b></div>
    <div><small>SESSION</small><b id="nv-sess">${sess ? fmtEl(Math.floor((now() - sess.start) / 1000)) : '—'}</b></div>
    <div><small>PACE</small><b>${rate ? Math.round(rate) + '<em>/h</em>' : '—'}</b></div>
    <div><small>${eta ? 'TARGET AT' : 'COMBO'}</small><b>${eta ? nvHm(Math.round(eta)) : (nvCombo.n > 1 ? '×' + nvCombo.n : '—')}</b></div></div>`;
  const card = !Q ? `<div class="nv-glass nv-empty">Loading the call queue…</div>` : !x ? `<div class="nv-glass nv-empty">Queue is empty for this filter. Open the full dialer to switch filter.</div>` : (() => {
    const tel = telHref(x.phone), last = (x.log || []).slice(-1)[0];
    const st = x.status === 'callback' ? `<span class="nv-tag hot">callback ${x.next_at ? fmtShort(pd(x.next_at)) : ''}</span>` : x.status === 'voicemail' ? '<span class="nv-tag">voicemail left</span>' : x.status === 'gatekeeper' ? '<span class="nv-tag">gatekeeper</span>' : x.tier === 'T1' ? '<span class="nv-tag">tier 1</span>' : '';
    return `<div class="nv-swipe" id="nv-swipe">
      <div class="nv-hint l">No answer</div><div class="nv-hint r">Owner talk</div><div class="nv-hint u">Voicemail</div><div class="nv-hint d">Gatekeeper</div>
      <article class="nv-card" id="nv-card" data-id="${x.id}">
        <div class="nv-cardtop"><small>#${x.id}${x.attempts ? ' · attempt ' + (x.attempts + 1) : ' · first call'}</small>${st}</div>
        <h2>${nvE(x.agency)}</h2>
        <div class="nv-city">${nvE(x.city)}${x.county ? ' · ' + nvE(x.county) : ''} · their time ${florida(nowMin())}</div>
        ${tel ? `<a class="nv-phone" href="${tel}" onclick="markDialing(${x.id})">${phonePretty(x.phone)}<span>tap to call</span></a>` : `<div class="nv-phone none">No phone on file</div>`}
        <div class="nv-kv"><small>ASK FOR</small><b>${nvE(x.contact || 'Whoever handles caregiver hiring')}</b></div>
        <div class="nv-kv"><small>HOOK</small><span>${nvE(hookFor(x))}</span></div>
        ${last ? `<div class="nv-kv"><small>LAST TIME</small><span>${nvE(last.r)}${last.note ? ' · ' + nvE(last.note) : ''}</span></div>` : ''}
        <div class="nv-swipehelp">swipe ← no answer · → owner · ↑ voicemail · ↓ gatekeeper</div>
      </article></div>
      <div class="nv-outs">
        <button onclick="nvOut('noanswer')"><b>No answer</b><small>← swipe</small></button>
        <button onclick="nvOut('voicemail')"><b>Voicemail</b><small>↑ swipe</small></button>
        <button onclick="nvOut('gatekeeper')"><b>Gatekeeper</b><small>↓ swipe</small></button>
        <button class="go" onclick="nvOut('owner')"><b>Owner talk</b><small>→ swipe</small></button>
      </div>
      <div class="nv-row nv-minor"><button class="nv-btn ghost" onclick="nvOut('skip')">Skip</button><button class="nv-btn ghost" onclick="nvOut('bad')">Bad number</button><button class="nv-btn ghost" onclick="undoLast()">Undo last</button><button class="nv-btn ghost" onclick="ledgerOpen()">Call log</button><button class="nv-btn ghost" onclick="nvGo('dial')">Full dialer</button></div>`;
  })();
  return `<section class="nv-reactor">
    <div class="nv-corewrap">${core}<button class="nv-corenum" onclick="ledgerOpen()" aria-label="Open the call log"><b>${v}</b><small>of ${tg || '—'} today</small><em>${tg ? (left ? left + ' to go' : 'TARGET HIT') : 'no dial block today'}</em><span class="nv-logl">tap for call log</span></button></div>
    ${stats}
    <div class="nv-row nv-ign">${sess ? `<button class="nv-btn ghost" onclick="endSession()">End session</button>` : `<button class="nv-cta small" onclick="nvIgnite()"><span>Ignite session</span><i></i></button>`}</div>
    ${card}
  </section>`;
}
function nvIgnite() { if (!S.session || !S.session.active) { const o = day(new Date()); S.session = { _u: now(), active: true, start: now(), date: dk(new Date()), d0: Number(o.counters.dials) || 0, o0: Number(o.counters.owners) || 0 }; save(true); } nvCombo = { n: 0, last: 0, best: nvCombo.best }; toast('Session ignited. First dial inside 2 minutes.'); render(); }
function nvSessClock() { const el = document.getElementById('nv-sess'), s = S.session; if (el && s && s.active) el.textContent = fmtEl(Math.floor((now() - s.start) / 1000)); }
function nvOut(kind) {
  const x = Q && currentCall(); if (!x) return;
  if (['noanswer', 'voicemail', 'bad', 'gatekeeper', 'owner'].includes(kind)) { const t = now(); nvCombo.n = t - nvCombo.last < 4 * 60000 ? nvCombo.n + 1 : 1; nvCombo.last = t; nvCombo.best = Math.max(nvCombo.best, nvCombo.n); }
  outcome(x.id, kind);
}
/* every logged dial makes the core pulse (wraps the existing counter) */
if (typeof countDial === 'function' && !countDial._nv) { const _cd = countDial; countDial = function (owner) { _cd(owner); nvPulseAt = now(); }; countDial._nv = true; }
function nvBindSwipe() {
  const card = document.getElementById('nv-card'), wrap = document.getElementById('nv-swipe'); if (!card) return;
  const TH = 90; let sx = 0, sy = 0, dx = 0, dy = 0, id = null;
  const dir = () => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
  card.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button')) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0; nvDrag = true; card.setPointerCapture(id); card.classList.add('drag'); });
  card.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; dx = e.clientX - sx; dy = e.clientY - sy; card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 22}deg)`; const dist = Math.max(Math.abs(dx), Math.abs(dy)); wrap.dataset.dir = dist > 24 ? dir() : ''; wrap.dataset.arm = dist > TH ? '1' : ''; });
  const end = (e) => { if (e.pointerId !== id) return; id = null; nvDrag = null; card.classList.remove('drag'); const dist = Math.max(Math.abs(dx), Math.abs(dy)), dd = dir(); wrap.dataset.dir = ''; wrap.dataset.arm = '';
    if (dist > TH) { card.style.transform = `translate(${dx * 3}px,${dy * 3}px) rotate(${dx / 10}deg)`; card.style.opacity = '0'; try { navigator.vibrate && navigator.vibrate([10, 30, 18]); } catch (er) { } setTimeout(() => nvOut({ l: 'noanswer', r: 'owner', u: 'voicemail', d: 'gatekeeper' }[dd]), 160); }
    else card.style.transform = ''; };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
}

/* ═════════ PULSE ═════════ */
const NV_STARS = [[34, 140], [92, 70], [156, 136], [212, 50], [268, 128], [318, 58], [340, 166]];
function nvPulse() {
  const d = nvToday(), o = day(d), items = S.habits.items.slice(0, 7), r = ringsFor(d), rk = rankInfo();
  const done = items.filter((h) => o.habits[h.id]).length;
  let lines = '', stars = '';
  items.forEach((h, i) => { if (i < items.length - 1) { const [x0, y0] = NV_STARS[i], [x1, y1] = NV_STARS[i + 1], on = o.habits[h.id] && o.habits[items[i + 1].id]; lines += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" class="${on ? 'on' : ''}"/>`; } });
  items.forEach((h, i) => { const [x, y] = NV_STARS[i], on = !!o.habits[h.id], nm = nvStrip(h.title).replace(/\s*\(.*?\)\s*/g, '').replace(/ Protocol| Check/g, ''); stars += `<g class="star${on ? ' on' : ''}" onclick="nvHabit('${h.id}')" role="button" aria-pressed="${on}" aria-label="${nvE(nm)}"><circle cx="${x}" cy="${y}" r="22" class="hit"/><circle cx="${x}" cy="${y}" r="${on ? 8 : 5}" class="dot"/>${on ? `<circle cx="${x}" cy="${y}" r="14" class="aura"/>` : ''}<text x="${x}" y="${y + (y > 100 ? 30 : -20)}" text-anchor="${x > 330 ? 'end' : x < 40 ? 'start' : 'middle'}">${nvE(nm)}</text></g>`; });
  const gauge = (lab, x, col, go, val) => { const p = clamp(x.p || 0, 0, 1), C = 2 * Math.PI * 34; return `<button class="nv-gauge" onclick="${go}"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="gt"/><circle cx="40" cy="40" r="34" class="gf" stroke="${col}" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${val}</b><small>${lab}</small></button>`; };
  const acts = [['scale', 'Weigh in', 'weightModal()'], ['camera', 'Snap a meal', "nvGo('food')"], ['train', 'Today’s training', "nvGo('train')"], ['timer', 'Study 25', "startTimer('bac',25)"], [(typeof sleepLive === 'function' && sleepLive()) ? 'bolt' : 'bolt', (typeof sleepLive === 'function' && sleepLive()) ? 'Night screen' : 'Lights out', (typeof sleepLive === 'function' && sleepLive()) ? 'sleepScreen()' : 'lightsOut()'], ['check', 'Shutdown', 'startShutdown()']];
  return `<section class="nv-pulse">
    <div class="nv-glass nv-const"><div class="nv-h in">Standards constellation <b>${done}/${items.length}</b></div>
      <svg viewBox="0 0 370 210" class="nv-stars" role="group" aria-label="Today's standards">${lines}${stars}</svg>
      <div class="nv-sub">Tap a star when the standard is kept. Neighbours that are both kept link up; all seven draw the full constellation.</div></div>
    <div class="nv-gauges">${gauge('Company', r.co, NV_KIND.dials[0], "nvSwitch('reactor')", r.co.v + (r.co.t ? '<em>/' + r.co.t + '</em>' : ''))}${gauge('Body', r.body, '#FF8F6B', "nvGo('food')", r.body.v + '<em>%</em>')}${gauge('Mind', r.mind, NV_KIND.bac[0], "startTimer('bac',25)", r.mind.v + '<em>/' + r.mind.t + '</em>')}</div>
    <div class="nv-acts">${acts.map(([i, l, go]) => `<button class="nv-glass" onclick="${go}">${ic(i, 22)}<span>${l}</span></button>`).join('')}</div>
    <button class="nv-glass nv-rank" onclick="openRank()"><div><small>RANK · LEVEL ${rk.i + 1}</small><b>${nvE(rk.name)}</b></div><div class="nv-xp"><i style="width:${rk.pct}%"></i></div><span>${fmt(rk.xp)} XP · +${fmt(rk.today)} today${rk.next != null ? ' · ' + fmt(rk.toNext) + ' to ' + nvE(rk.nextName) : ''}${rk.locked && rk.gate ? ' · locked: ' + nvE(rk.gate.what) : ''}</span></button>
  </section>`;
}
function nvHabit(id) { const o = day(nvToday()); o.habits[id] = o.habits[id] ? 0 : 1; touch(o); try { navigator.vibrate && navigator.vibrate(o.habits[id] ? [8, 40, 8] : 6); } catch (e) { } render(); }

/* ═════════ VECTOR ═════════ */
const NV_CHECKS = [['2026-11-30', '15 caregivers on the bench'], ['2026-12-08', '100 owner conversations'], ['2026-12-31', 'First paid placement · 2,000 dials'], ['2027-01-31', '3 agencies served'], ['2027-02-28', '$4,500 MRR'], ['2027-03-31', '$9,000 MRR'], ['2027-06-30', '$20,000 MRR']];
function nvDialsOn(k) { const o = S.days[k]; return Number(((o && o.counters) || {}).dials) || 0; }
function nvVector() {
  const t = nvToday(), tk = dk(t), totD = counterTotal('dials'), totO = counterTotal('owners');
  let s7 = 0, o7 = 0; for (let i = 1; i <= 7; i++) { const k = dk(addDays(t, -i)); s7 += nvDialsOn(k); o7 += Number((((S.days[k] || {}).counters) || {}).owners) || 0; }
  const vel = s7 / 7, ovel = o7 / 7;
  const etaDate = (need, perDay) => perDay > 0 ? addDays(t, Math.ceil(need / perDay)) : null;
  const e2000 = totD >= 2000 ? t : etaDate(2000 - totD, vel), e100 = totO >= 100 ? t : etaDate(100 - totO, ovel);
  const end = pd('2027-07-01');
  const rows = NV_CHECKS.map(([k, l]) => ({ d: pd(k), l, kind: k < tk ? 'past' : 'chk' }));
  rows.push({ d: t, l: 'Today', kind: 'now' });
  if (e2000 && e2000 <= end && totD < 2000) rows.push({ d: e2000, l: 'Your pace reaches 2,000 dials', kind: 'eta' });
  if (e100 && e100 <= end && totO < 100) rows.push({ d: e100, l: 'Your pace reaches 100 owner talks', kind: 'eta' });
  rows.sort((x, y) => x.d - y.d || (x.kind === 'now' ? -1 : 1));
  const nextChk = rows.find((r) => r.kind === 'chk');
  const tl = rows.map((r) => { const days = Math.round((r.d - t) / 864e5); return `<li class="${r.kind}${r === nextChk ? ' next' : ''}${r.l.startsWith('$20,000') ? ' goal' : ''}"><i></i><div><b>${nvE(r.l)}</b><span>${r.kind === 'now' ? 'D-' + daysUntil(S.settings.bigDate) + ' to the goal' : fmtShort(r.d) + ' ' + r.d.getFullYear() + (days > 0 ? ' · in ' + days + ' days' : days < 0 ? ' · passed' : '')}</span></div></li>`; }).join('');
  const late = (eta, due) => !eta ? 'no pace yet' : eta <= pd(due) ? `on time · ${fmtShort(eta)}` : `late · ${fmtShort(eta)} (${Math.round((eta - pd(due)) / 864e5)} days after)`;
  const need2000 = Math.max(0, 2000 - totD), daysTo31 = Math.max(1, Math.round((pd('2026-12-31') - t) / 864e5)), needPer = need2000 / daysTo31;
  // last 28 days bars
  let bars = ''; const N = 28; let mx = 10; const vals = []; for (let i = N - 1; i >= 0; i--) { const dd = addDays(t, -i), k = dk(dd); const v = nvDialsOn(k), tg = dialTargetFor(dd); vals.push([k, v, tg]); mx = Math.max(mx, v, tg); }
  vals.forEach(([k, v, tg], i) => { const h = (v / mx) * 70, x = 6 + i * 12.6; bars += `<rect x="${x.toFixed(1)}" y="${(80 - h).toFixed(1)}" width="9" height="${Math.max(h, v ? 2 : 0).toFixed(1)}" rx="2" class="${tg && v >= tg ? 'hit' : v ? 'part' : 'zero'}${k === tk ? ' today' : ''}"><title>${k}: ${v}${tg ? '/' + tg : ''}</title></rect>`; if (tg) bars += `<line x1="${x.toFixed(1)}" x2="${(x + 9).toFixed(1)}" y1="${(80 - (tg / mx) * 70).toFixed(1)}" y2="${(80 - (tg / mx) * 70).toFixed(1)}" class="tg"/>`; });
  return `<section class="nv-vector">
    <div class="nv-h">Trajectory to 1 July 2027</div>
    <div class="nv-glass nv-tl"><ol class="nv-rail" aria-label="Checkpoints from today to 1 July 2027">${tl}</ol></div>
    <div class="nv-kpis">
      <div class="nv-glass"><small>VELOCITY · 7 DAYS</small><b>${vel.toFixed(1)}<em> dials/day</em></b><span>needed for 2,000 by 31 Dec: <b>${needPer.toFixed(0)}</b>/day</span></div>
      <div class="nv-glass ${e2000 && e2000 <= pd('2026-12-31') ? 'good' : 'warn'}"><small>2,000 DIALS · DUE 31 DEC</small><b>${fmt(totD)}<em> / 2,000</em></b><span>${late(e2000, '2026-12-31')}</span></div>
      <div class="nv-glass ${e100 && e100 <= pd('2026-12-08') ? 'good' : 'warn'}"><small>100 OWNER TALKS · DUE 8 DEC</small><b>${totO}<em> / 100</em></b><span>${late(e100, '2026-12-08')}</span></div>
    </div>
    <div class="nv-h">Last 28 days</div>
    <div class="nv-glass nv-bars"><svg viewBox="0 0 360 86" preserveAspectRatio="none" role="img" aria-label="Dials per day, last 28 days">${bars}</svg><div class="nv-sub">Bars are dials; the short line is that day's target. Green = target hit.</div></div>
    <div class="nv-h">Time scrubber</div>
    ${nvScrubber()}
    <div class="nv-glass nv-future"><small>IF EVERY WEEK LOOKS LIKE THE LAST 7 DAYS</small><p>${vel > 0 ? `You reach 2,000 dials on <b>${e2000 ? fmtShort(e2000) + ' ' + e2000.getFullYear() : '—'}</b>. At ~2,000 dials per paying agency, that is roughly when the first invoice lands. ${vel * 7 < 350 ? `You are running at <b>${Math.round(vel * 7)}</b> a week against 350: the gap is <b>${Math.round(350 - vel * 7)}</b> dials a week.` : 'You are at or above the 350-a-week plan. Keep the number clean and the bench full.'}` : 'No dials in the last 7 days, so there is no trajectory yet. The first 10 dials start the line.'}</p></div>
  </section>`;
}
function nvScrubber() {
  const t = nvToday(), i = clamp(nvScrub, 0, 29), dd = addDays(t, -i), k = dk(dd), o = S.days[k] || {}, c = o.counters || {};
  const hb = S.habits.items.filter((h) => o.habits && o.habits[h.id]).length, g = (() => { try { return gradeFor(dd); } catch (e) { return '—'; } })();
  return `<div class="nv-glass nv-scrub"><div class="nv-scrubhead"><b>${i === 0 ? 'Today' : i === 1 ? 'Yesterday' : DAY_SHORT[dow(dd)] + ' ' + fmtShort(dd)}</b><span class="nv-grade g-${g}">${g}</span></div>
    <input type="range" min="0" max="29" value="${29 - i}" aria-label="Pick a day in the last 30" oninput="nvScrub=29-Number(this.value);document.getElementById('nv-scrubbox').outerHTML=nvScrubber()">
    <div class="nv-scrubgrid"><div><small>DIALS</small><b>${Number(c.dials) || 0}<em>/${dialTargetFor(dd) || '—'}</em></b></div><div><small>OWNERS</small><b>${Number(c.owners) || 0}</b></div><div><small>BAC</small><b>${Number(c.bac) || 0}<em> min</em></b></div><div><small>WEIGHT</small><b>${o.weight != null && o.weight !== '' ? o.weight + '<em> kg</em>' : '—'}</b></div><div><small>STANDARDS</small><b>${hb}<em>/${S.habits.items.length}</em></b></div><div><small>SLEEP</small><b>${o.bedAt && o.wokeAt && typeof sleepDur === 'function' ? sleepDur(o.bedAt, o.wokeAt) : '—'}</b></div></div>
    <button class="nv-btn ghost" onclick="nvGo('intel',()=>{replayDate='${k}';intelTab='replay'})">Full replay of this day</button></div>`.replace('<div class="nv-glass nv-scrub">', '<div class="nv-glass nv-scrub" id="nv-scrubbox">');
}

/* ═════════ COMMAND ORB ═════════ */
function nvCommand() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  openModal(`<div class="nv-cmd"><div class="nv-cmdorb" id="nv-cmdorb"><i></i><i></i><i></i></div>
    <h2 style="justify-content:center">Command</h2><div class="hint" style="text-align:center;margin-bottom:12px">${SR ? 'Tap the orb and speak, or type.' : 'Type what happened or what you want.'} Nothing is saved until you confirm.</div>
    <div class="inline"><input id="cmd-in" autocomplete="off" placeholder="40 dials and 2 owners · weighed 78.4 · studied 50 min" onkeydown="if(event.key==='Enter')cmdRun()"><button class="btn primary" onclick="cmdRun()">Go</button></div>
    <div class="chips" style="margin-top:10px">${['What should I do with the next 20 minutes?', 'Show overdue follow-ups', 'Replay yesterday', 'Day is broken: recovery'].map((x) => `<span class="chip" onclick="document.getElementById('cmd-in').value=this.textContent;cmdRun()">${x}</span>`).join('')}</div>
    <div id="cmd-out" style="margin-top:12px"></div>${typeof cmdUndo !== 'undefined' && cmdUndo ? `<button class="btn sm" style="margin-top:10px" onclick="cmdUndoLast()">Undo the last command</button>` : ''}</div>`, true);
  const orb = document.getElementById('nv-cmdorb');
  if (orb && SR) orb.onclick = () => { try { const r = new SR(); r.lang = 'en-US'; r.interimResults = true; orb.classList.add('listen'); r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0].transcript).join(' '); const i = document.getElementById('cmd-in'); if (i) i.value = t; if (e.results[e.results.length - 1].isFinal) { orb.classList.remove('listen'); cmdRun(); } }; r.onerror = r.onend = () => orb.classList.remove('listen'); r.start(); } catch (e) { orb.classList.remove('listen'); toast('Voice is not available here. Type instead.'); } };
  else if (orb) orb.onclick = () => { const i = document.getElementById('cmd-in'); if (i) i.focus(); };
  setTimeout(() => { if (!SR) { const i = document.getElementById('cmd-in'); if (i) i.focus(); } }, 60);
}

/* ═════════ ALL SYSTEMS (the classic screens, one tap away) ═════════ */
function nvSystems() {
  const L = [['now', 'hq', 'HQ (classic)'], ['dial', 'dial', 'Full dialer & CRM'], ['intel', 'target', 'Intel · 15 tabs'], ['week', 'plan', 'Plan & review'], ['cal', 'cal', 'Calendar'], ['book', 'book', 'Playbook'], ['ask', 'chat', 'Ask & recorder'], ['train', 'train', 'Train'], ['food', 'food', 'Food'], ['stats', 'stats', 'Stats & body'], ['me', 'me', 'More & settings']];
  openModal(`<h2>All systems</h2><div class="nv-sys">${L.map(([v, i, l]) => `<button onclick="closeModal();nvGo('${v}')">${ic(i, 22)}<span>${l}</span></button>`).join('')}</div>
    <div class="sec-h" style="margin-top:16px">Interface</div><div class="row" style="gap:8px"><button class="btn grow primary" onclick="closeModal()">Stay in NOVA</button><button class="btn grow" onclick="nvSetUi('monolith')">Monolith screens</button></div>
    <button class="btn sm ghost block" style="margin-top:10px" onclick="closeModal();nvIntro(true)">Replay the NOVA tour</button>`, true);
}

/* ═════════ First-run tour ═════════ */
function nvSeenIntro() { try { return !!localStorage.getItem('nv-intro'); } catch (e) { return true; } }
const NV_TOUR = [
  ['NOVA online', 'A new interface for War Room. Same data, same sync, every old screen still one tap away (top-right grid). Four instruments and a command orb.'],
  ['Orbit · your day as a dial', 'The ring is all 24 hours from your calendar. The glowing needle is now. Inside: dials, body and mind rings. Tap any arc to see or move that block. The big button is the one thing to do right now. Top right: Chisinau and Florida time, and whether owners are reachable.'],
  ['Reactor · dial mode', 'Every dot is one dial of today’s target. Ignite a session, call, then swipe the card: ← no answer, → owner talk, ↑ voicemail, ↓ gatekeeper. Pace and the time you will hit the target update live.'],
  ['Pulse · standards constellation', 'Your 7 standards are stars. Keep one, tap it, it lights up. Kept neighbours link. One tap to weigh in, snap a meal, study 25, lights out or shutdown.'],
  ['Vector · where your pace lands', 'Checkpoints to 1 July 2027 on one line, your 7-day velocity, the date your pace reaches 2,000 dials and 100 owner talks, and a scrubber to replay any of the last 30 days.'],
  ['Command orb', 'The centre button. Speak or type "40 dials 2 owners", "weighed 78.4", "follow up Sunshine tomorrow". It previews, you confirm, you can undo.']];
function nvIntro(force) {
  if (!force && nvSeenIntro()) return; if (document.querySelector('.modal-bg.open')) return; let i = 0;
  const step = () => { const [h, p] = NV_TOUR[i]; openModal(`<div class="nv-tour"><div class="nv-tourn">${pad(i + 1)} / ${pad(NV_TOUR.length)}</div><h2>${h}</h2><p>${p}</p><div class="nv-dots">${NV_TOUR.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="nvTourEnd()">Skip</button><button class="btn primary" onclick="nvTourNext()">${i < NV_TOUR.length - 1 ? 'Next' : 'Enter NOVA'}</button></div></div>`); };
  if (!force) { const nv = document.getElementById('nova'); if (nv && !nv.querySelector('.nv-boot')) { const b = document.createElement('div'); b.className = 'nv-boot'; b.innerHTML = `<div class="nv-bootcore"><i></i><i></i><i></i></div><div class="nv-bootlines"><p>WAR ROOM // NOVA 6.0</p><p>mission ....... $20K MRR · 1 JUL 2027</p><p>countdown ..... D-${daysUntil(S.settings.bigDate)}</p><p>orbit ......... ${(blocksFor(nvToday()) || []).length} blocks</p><p>reactor ....... ${Q ? Object.keys(Q.items || {}).length : 0} agencies</p><p class="ok">all instruments online</p></div>`; nv.appendChild(b); setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); if (!nvSeenIntro()) step(); }, 600); }, 2600); } }
  window.nvTourNext = () => { const map = [null, 'orbit', 'reactor', 'pulse', 'vector', null]; i++; if (i >= NV_TOUR.length) return nvTourEnd(); if (map[i]) { nvTab = map[i]; nvRender(); } step(); };
  window.nvTourEnd = () => { try { localStorage.setItem('nv-intro', '1'); } catch (e) { } closeModal(); nvTab = 'orbit'; nvRender(); };
  if (force) step();
}

/* ───────── hook into the app's render loop ───────── */
if (typeof render === 'function' && !render._nv) { const _r = render; render = function () { _r.apply(this, arguments); if (nvOn() && !nvAway) nvRender(); }; render._nv = true; }
document.addEventListener('keydown', (e) => { if (!nvOn() || nvAway || document.querySelector('.modal-bg.open')) return; if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; const k = { 1: 'orbit', 2: 'reactor', 3: 'pulse', 4: 'vector' }[e.key]; if (k) nvSwitch(k); });
function nvBoot() { if (!nvOn()) return; if (typeof S === 'undefined' || !S || !S.days) { setTimeout(nvBoot, 150); return; } nvMount(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(nvBoot, 50)); else setTimeout(nvBoot, 50);
