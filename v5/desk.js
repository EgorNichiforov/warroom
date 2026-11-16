/* War Room 10.1 · DESKTOP — built for a big screen, not a stretched phone.
   Day = command centre: a proportional, draggable timeline (Structured-style), NOW in the middle, live numbers right.
   Every hub gets a right column about what you're looking at. Wide grids. Keyboard: 1–4 hubs, [ ] tabs, N log. */
'use strict';
function dkWide() { return window.innerWidth >= 1200; }

/* ═════════ Day command centre ═════════ */
const DK_PX = 1.15;
function dkTimeline(d) {
  const o = day(d), L = (typeof arcBlocks === 'function' ? arcBlocks(d) : blocksFor(d)).filter((b) => b.kind !== 'sleep'), wake = tmin(wakeFor(d)), bed = tmin(S.settings.bed || '21:00'), start = Math.min(wake, ...L.map((b) => tmin(b.start))), end = Math.max(bed, ...L.map((b) => tmin(b.end)));
  const H = (end - start) * DK_PX, nm = nowMin();
  /* lanes for overlapping blocks */
  const items = L.map((b) => ({ b, s: tmin(b.start), e: Math.max(tmin(b.start) + 10, tmin(b.end)) })).sort((a, c) => a.s - c.s || c.e - a.e); let group = [], gEnd = -1; const flush = () => { const lanes = []; group.forEach((it) => { let l = lanes.findIndex((end0) => end0 <= it.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = it.e; it.lane = l; }); group.forEach((it) => (it.lanes = lanes.length)); group = []; };
  items.forEach((it) => { if (it.s >= gEnd && group.length) flush(); group.push(it); gEnd = Math.max(gEnd, it.e); }); flush();
  const hours = []; for (let h = Math.ceil(start / 60); h * 60 <= end; h++) hours.push(`<div class="dk-hr" style="top:${(h * 60 - start) * DK_PX}px"><span>${pad(h)}:00</span></div>`);
  const blocks = items.map(({ b, s, e, lane, lanes }) => { const st = typeof blkStatus === 'function' ? blkStatus(b, d, o, L) : '', fx = typeof adFixed === 'function' && adFixed(b), cur = s <= nm && nm < e;
    return `<div class="dk-b k-${b.kind} s-${st} ${fx ? 'fx' : 'mv'} ${cur ? 'cur' : ''} ${(e - s) * DK_PX < 36 ? 'sm' : ''}" data-id="${b.id}" data-s="${s}" data-e="${e}" style="top:${(s - start) * DK_PX}px;height:${Math.max(20, (e - s) * DK_PX - 3)}px;left:calc(${(lane / lanes) * 100}% + 2px);width:calc(${100 / lanes}% - 4px)" onpointerdown="dkDown(event)"><b>${esc(b.title.replace(EMO_RE, '').trim())}</b><span>${b.start}–${b.end}${fx ? ' · fixed' : ''}</span>${st === 'done' ? '<i>✓</i>' : st === 'miss' ? '<i class="x">✗</i>' : ''}</div>`; }).join('');
  const now = nm >= start && nm <= end && dk(d) === dk(new Date()) ? `<div class="dk-now" style="top:${(nm - start) * DK_PX}px"><span>${pad(Math.floor(nm / 60))}:${pad(nm % 60)}</span></div>` : '';
  window._dkStart = start;
  return `<div class="dk-tl" id="dk-tl"><div class="dk-tli" style="height:${H}px">${hours.join('')}<div class="dk-lanes">${blocks}</div>${now}</div></div>`;
}
let dkDrag = null;
function dkDown(ev) {
  const el = ev.currentTarget; if (ev.button > 0) return; const id = el.dataset.id;
  dkDrag = { el, id, y0: ev.clientY, s: +el.dataset.s, e: +el.dataset.e, moved: false, mv: el.classList.contains('mv') };
  ev.preventDefault(); const mv = (e) => dkMove(e), up = (e) => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); dkUp(e); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
function dkMove(ev) { const D = dkDrag; if (!D || !D.mv) return; const dy = ev.clientY - D.y0; if (Math.abs(dy) > 4) D.moved = true; if (!D.moved) return; const dm = Math.round(dy / DK_PX / 5) * 5; D.dm = dm; D.el.style.transform = `translateY(${dm * DK_PX}px)`; D.el.classList.add('drag'); const s = D.s + dm; D.el.querySelector('span').textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)} → move`; }
function dkUp() {
  const D = dkDrag; dkDrag = null; if (!D) return;
  if (!D.moved || !D.dm) { D.el.style.transform = ''; D.el.classList.remove('drag'); if (typeof arcBlk === 'function') arcBlk(D.id); return; }
  const s = D.s + D.dm, e = D.e + D.dm, w = typeof adClash === 'function' ? adClash(D.id, s, e) : ''; adMove(D.id, s, e); save(); toast(`Moved to ${pad(Math.floor(s / 60))}:${pad(s % 60)}${w}`); try { navigator.vibrate && navigator.vibrate(8); } catch (x) { } render(); if (typeof arcRender === 'function') arcRender();
}
function dkSide(d) {
  const o = day(d), c = o.counters || {}, tg = dialTargetFor(d), bc = S.counters.items.find((x) => x.id === 'bac'), bT = bc ? bc.targets[dow(d)] || 0 : 0, T = typeof mnTotal === 'function' ? mnTotal() : { any: false }, Sf = T.any ? mnSafe() : null;
  const ring = (v, t, l, sub) => { const p = t ? Math.min(1, v / t) : 0, C = 2 * Math.PI * 34; return `<div class="dk-ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="bg"/><circle cx="40" cy="40" r="34" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - p)}"/></svg><div><b>${v}</b><span>${t ? '/ ' + t : ''}</span></div><em>${l}</em>${sub ? `<small>${sub}</small>` : ''}</div>`; };
  const W = weightEntries().slice(-30), wt = W.length ? W[W.length - 1].w : null;
  const spark = W.length > 1 ? (() => { const lo = Math.min(...W.map((x) => x.w)), hi = Math.max(...W.map((x) => x.w)) || lo + 1; return `<svg viewBox="0 0 200 40" class="dk-spark"><path d="${W.map((x, i) => (i ? 'L' : 'M') + (i / (W.length - 1)) * 200 + ' ' + (36 - ((x.w - lo) / (hi - lo || 1)) * 32)).join('')}"/></svg>`; })() : '';
  const m = monday(d), wk = []; for (let i = 0; i < 7; i++) { const dd = addDays(m, i), oo = S.days[dk(dd)] || {}, mm = typeof minimumMet === 'function' ? minimumMet(dd) : { met: false }; wk.push(`<div class="${dk(dd) === dk(d) ? 'td' : ''} ${dd > d ? 'fut' : mm.met ? 'ok' : (oo.counters && Object.values(oo.counters).some(Boolean)) ? 'part' : 'zero'}"><span>${DAY_SHORT[dow(dd)].slice(0, 2)}</span><i></i></div>`); }
  return `<div class="dk-col3">
    <div class="card dk-rings">${ring(Number(c.dials) || 0, tg, 'Dials')}${ring(Number(c.owners) || 0, 0, 'Owner talks')}${ring(Number(c.bac) || 0, bT, 'BAC min')}</div>
    <div class="card"><div class="dk-k">Never 0 · this week</div><div class="dk-week">${wk.join('')}</div></div>
    ${T.any ? `<div class="card dk-money" onclick="shGoHub('money')"><div class="dk-k">You have</div><b>${mnF(T.t)}</b><span>${typeof kpOn === 'function' && kpOn() ? kpLine() : 'safe today ' + mnF(Sf.perDay)} · runway ${mnAvgOut(30) > 0 ? Math.floor(Sf.spendable / mnAvgOut(30)) + ' d' : '–'}</span></div>` : `<div class="card dk-money" onclick="shGoHub('money');mnCountModal()"><div class="dk-k">You have</div><b>?</b><span>Count once →</span></div>`}
    <div class="card"><div class="dk-k">Weight</div><div class="dk-wt"><b>${wt != null ? fmt(wt, 1) + ' kg' : '–'}</b><span>→ 85 kg</span></div>${spark}</div>
    <div class="card"><div class="dk-k">Training this week</div><div class="dk-wt"><b>${typeof trlWeekCount === 'function' ? trlWeekCount(monday(d)) : 0}</b><span>of 6 days</span></div></div></div>`;
}
if (typeof arcHtml === 'function' && !arcHtml._dk) {
  const _h = arcHtml;
  arcHtml = function () {
    const base = _h(); if (!dkWide() || arcPhase() === 'night') return base;
    const d = new Date(), wrap = document.createElement('div'); wrap.innerHTML = base; const inner = wrap.querySelector('.arc-in'); if (!inner) return base;
    const top = inner.querySelector('.arc-top'), wk = inner.querySelector('.arc-wk'), now = inner.querySelector('.arc-now'), chg = inner.querySelector('.arc-change'), min = inner.querySelector('.arc-min');
    return `<div class="arc-in dk-grid"><div class="dk-head">${top ? top.outerHTML : ''}</div>
      <div class="dk-col1"><div class="dk-k">Today · drag a block to move it</div>${dkTimeline(d)}</div>
      <div class="dk-col2">${wk ? wk.outerHTML : ''}<div class="arc-now">${now ? now.innerHTML : ''}</div>${chg ? chg.outerHTML : ''}${min ? min.outerHTML : ''}</div>${dkSide(d)}</div>`;
  };
  arcHtml._dk = 1;
}
if (typeof arcRender === 'function' && !arcRender._dk) { const _r = arcRender; arcRender = function () { const tl = document.getElementById('dk-tl'), st = tl ? tl.scrollTop : null; _r(); const n = document.getElementById('dk-tl'); if (n) { if (st != null) n.scrollTop = st; else { const nowEl = n.querySelector('.dk-now'); if (nowEl) n.scrollTop = Math.max(0, nowEl.offsetTop - 160); } } }; arcRender._dk = 1; }
if (typeof arcShow === 'function' && !arcShow._dk) { const _a = arcShow; arcShow = function () { const r = _a.apply(this, arguments); const n = document.getElementById('dk-tl'); if (n) { const nowEl = n.querySelector('.dk-now'); if (nowEl) n.scrollTop = Math.max(0, nowEl.offsetTop - 160); } return r; }; arcShow._dk = 1; }
window.addEventListener('resize', () => { clearTimeout(window._dkR); window._dkR = setTimeout(() => { if (typeof arcRender === 'function') arcRender(); }, 200); });

/* ═════════ contextual right column ═════════ */
function dkRailWork() {
  const t = new Date(), o = day(t), c = o.counters || {}, tg = dialTargetFor(t), next = Q && typeof qNextList === 'function' ? qNextList(typeof dialFilter !== 'undefined' ? dialFilter : 'all').slice(0, 6) : [], due = typeof crmViewList === 'function' && Q ? crmViewList('due') : [];
  return `<div class="card"><div class="dk-k">Today</div><div class="dk-big">${Number(c.dials) || 0}<span>/ ${tg} dials</span></div><div class="dk-bar"><u style="width:${tg ? Math.min(100, ((Number(c.dials) || 0) / tg) * 100) : 0}%"></u></div><div class="small muted" style="margin-top:6px">${Number(c.owners) || 0} owner talks · ${counterWeek('dials', t)} this week</div></div>
    <div class="card"><div class="dk-k">Up next</div>${next.length ? next.map((x, i) => `<div class="dk-q" onclick="dialPick='${x.id}';show('dial')"><i>${i + 1}</i><span><b>${esc(x.agency)}</b><em>${esc(x.city || x.county || '')}${x.attempts ? ' · tried ' + x.attempts + '×' : ''}</em></span></div>`).join('') : '<div class="empty">Queue empty.</div>'}</div>
    ${due.length ? `<div class="card"><div class="dk-k">Callbacks due · ${due.length}</div>${due.slice(0, 5).map((x) => `<div class="dk-q" onclick="crmOpen('${x.id}')"><i>↺</i><span><b>${esc(x.agency)}</b><em>${esc(x.status)}</em></span></div>`).join('')}</div>` : ''}${weekCard(t)}`;
}
function dkRailMoney() {
  if (typeof mnAccs !== 'function') return ''; mnInit(); const A = mnAccs(), T = mnTotal(), occ = mnOcc(dk(addDays(new Date(), 14))).slice(0, 6), cm = mnMonth(mnYm(new Date()));
  return `<div class="card"><div class="dk-k">Accounts</div>${A.map((a) => { const b = mnBal(a.id); return `<div class="dk-acc" onclick="mnCountModal('${a.id}')"><span>${esc(a.name)}</span><b>${b.counted ? mnF(b.bal, a.cur) : 'count'}</b></div>`; }).join('')}<div class="dk-acc tot"><span>Total</span><b>${T.any ? mnF(T.t) : '?'}</b></div></div>
    <div class="card"><div class="dk-k">This month</div><div class="dk-io"><div><span>Earned</span><b class="ok">${mnF(cm.earned)}</b></div><div><span>Spent</span><b class="bad">${mnF(cm.spent)}</b></div></div><div class="dk-bar two"><u class="e" style="width:${cm.earned + cm.spent ? (cm.earned / (cm.earned + cm.spent)) * 100 : 50}%"></u></div></div>
    <div class="card"><div class="dk-k">Due in 14 days</div>${occ.length ? occ.map((x) => `<div class="dk-acc"><span>${fmtShort(pd(x.k))} · ${esc(x.p.note || mnCatName(x.p.cat))}</span><b class="${x.p.type === 'in' ? 'ok' : 'bad'}">${x.p.type === 'in' ? '+' : '−'}${fmt(Math.round(x.p.amt))}</b></div>`).join('') : '<div class="empty">Nothing planned.</div>'}</div>`;
}
function dkRailYou() {
  const t = new Date(), W = weightEntries().slice(-1)[0], r = typeof readiness === 'function' ? readiness(t) : null;
  return `${ringsCard(t, true)}<div class="card"><div class="dk-k">Body</div><div class="dk-acc"><span>Weight</span><b>${W ? fmt(W.w, 1) + ' kg' : '–'}</b></div><div class="dk-acc"><span>Training this week</span><b>${typeof trlWeekCount === 'function' ? trlWeekCount(monday(t)) : 0} / 6</b></div><div class="dk-acc"><span>Readiness</span><b>${r ? r.s : '–'}</b></div></div>`;
}
if (typeof renderRail === 'function' && !renderRail._dk) {
  renderRail = function () {
    const el = $('rail'); if (!el) return; const hub = typeof shHubOf === 'function' ? shHubOf(view) : '';
    el.innerHTML = hub === 'work' ? dkRailWork() : hub === 'money' ? dkRailMoney() : dkRailYou();
  };
  renderRail._dk = 1;
}

/* ═════════ keyboard ═════════ */
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName || '') || document.getElementById('modal-bg').classList.contains('open')) return;
  const hubs = { 1: 'day', 2: 'work', 3: 'money', 4: 'you' };
  if (hubs[e.key] && typeof shGoHub === 'function') { e.preventDefault(); shGoHub(hubs[e.key]); return; }
  if ((e.key === '[' || e.key === ']') && typeof shCur === 'function') { const c = shCur(), H = SH_HUBS.find((h) => h.id === c.hub), L = H && (H.segs || H.inner); if (L) { const n = c.seg + (e.key === ']' ? 1 : -1); if (n >= 0 && n < L.length) shSeg(n); } }
});
