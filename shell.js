/* War Room 10 · THE SHELL — one system, one navigation, one motion language.
   Research: 3–5 primary destinations in a bottom bar with one global create action bottom-centre (Material / iOS HIG,
   Things' Magic Plus); the day as one visual timeline (Structured); native View Transitions for app-like screen changes.
   Day · Work · [+] · Money · You. Sub-screens are segments you tap or swipe. Desktop gets the same hubs in the sidebar. */
'use strict';
window.SHELL_ON = true;
const SH_HUBS = [
  { id: 'day', icon: 'hq', label: 'Day' },
  { id: 'work', icon: 'dial', label: 'Work', segs: [['dial', 'Dial'], ['crm', 'Pipeline'], ['intel', 'Intel'], ['book', 'Playbook']] },
  { id: 'cap', icon: 'plus', label: '' },
  { id: 'money', icon: 'wallet', label: 'Money', inner: [['over', 'Overview'], ['wealth', 'Wealth'], ['tx', 'Transactions'], ['plan', 'Plan'], ['rep', 'Reports']] },
  { id: 'you', icon: 'life', label: 'You', segs: [['life', 'Engine'], ['train', 'Train'], ['trlog', 'Log'], ['food', 'Food'], ['stats', 'Stats'], ['week', 'Plan'], ['cal', 'Calendar'], ['ask', 'Ask'], ['me', 'Settings']] },
];
const SH_ORDER = ['day', 'work', 'money', 'you'];
let shLast = { hub: 'day', seg: 0 };
function shArcOn() { const a = document.getElementById('arc'); return !!(a && a.classList.contains('on')); }
function shHubOf(v) { if (v === 'now' || v === 'today' || v === 'hq') return 'day'; if (v === 'money') return 'money'; for (const h of SH_HUBS) if (h.segs && h.segs.some((s) => s[0] === v)) return h.id; return 'you'; }
function shCur() { if (shArcOn()) return { hub: 'day', seg: 0 }; const hub = shHubOf(view), H = SH_HUBS.find((h) => h.id === hub); const seg = hub === 'money' ? Math.max(0, H.inner.findIndex((s) => s[0] === mnTab)) : H && H.segs ? Math.max(0, H.segs.findIndex((s) => s[0] === view)) : 0; return { hub, seg }; }
function shIcon(n) { if (n === 'plus') return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'; return ic(n, 22); }
function shBuzz(ms) { try { navigator.vibrate && navigator.vibrate(ms || 8); } catch (e) { } }

/* ── transitions ── */
function shTransition(fn, from, to) {
  const a = SH_ORDER.indexOf(from.hub), b = SH_ORDER.indexOf(to.hub), dir = a === b ? (to.seg >= from.seg ? 'fwd' : 'back') : b > a ? 'fwd' : 'back';
  document.documentElement.dataset.shdir = dir;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const after = () => { const v = document.querySelector('.view.active'); if (v && !shArcOn()) { v.classList.remove('sh-enter'); void v.offsetWidth; v.classList.add('sh-enter'); setTimeout(() => v.classList.remove('sh-enter'), 900); } if (typeof mcCount === 'function') mcCount(); };
  if (document.startViewTransition && !reduce) { try { const t = document.startViewTransition(() => { fn(); }); t.finished.then(after).catch(after); return; } catch (e) { } }
  fn(); after();
}

/* ── navigation ── */
function shGoHub(id) {
  shBuzz(); if (id === 'cap') { shCapture(); return; }
  const from = shCur(); if (from.hub === id && id !== 'day') { shSegScroll(); return; }
  const H = SH_HUBS.find((h) => h.id === id);
  shTransition(() => {
    if (id === 'day') { if (typeof arcShow === 'function') arcShow(); }
    else { if (typeof arcHide === 'function') arcHide(); const v = id === 'money' ? 'money' : (shLast[id] || H.segs[0][0]); shRawShow(v); }
    shRefreshNav();
  }, from, { hub: id, seg: 0 });
}
function shSeg(i) {
  const from = shCur(), H = SH_HUBS.find((h) => h.id === from.hub); if (!H) return; shBuzz(5);
  if (H.inner) { const t = H.inner[i]; if (!t) return; shTransition(() => { mnTab = t[0]; render(); }, from, { hub: from.hub, seg: i }); return; }
  const s = H.segs && H.segs[i]; if (!s) return; shLast[from.hub] = s[0];
  shTransition(() => { shRawShow(s[0]); }, from, { hub: from.hub, seg: i });
}
function shSegScroll() { const el = document.querySelector('.view.active .sh-seg button.on'); if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
let shRawShow = (v) => show(v);
if (typeof show === 'function' && !show._sh) {
  const _s = show;
  shRawShow = function (v) { return _s(v); };
  show = function (v) {
    if (v === 'now' || v === 'today' || v === 'hq') { const f = shCur(); shTransition(() => { arcShow(); shRefreshNav(); }, f, { hub: 'day', seg: 0 }); return; }
    const from = shCur(), hub = shHubOf(v), H = SH_HUBS.find((h) => h.id === hub), seg = H && H.segs ? Math.max(0, H.segs.findIndex((s) => s[0] === v)) : 0;
    if (H && H.segs) shLast[hub] = v;
    if (shArcOn() && typeof arcHide === 'function') { shTransition(() => { arcHide(); _s(v); shRefreshNav(); }, from, { hub, seg }); return; }
    return _s(v);
  };
  show._sh = 1;
}
function shRefreshNav() { try { renderNav(); } catch (e) { } }

/* ── bottom bar (phone) + sidebar (desktop) ── */
if (typeof renderNav === 'function' && !renderNav._sh) {
  const _n = renderNav;
  renderNav = function () {
    _n(); const cur = shCur(), badge = typeof dialBadge === 'function' ? dialBadge() : '';
    $('nav').innerHTML = `<div class="sh-bar">${SH_HUBS.map((h) => h.id === 'cap' ? `<button class="sh-cap-btn" onclick="shGoHub('cap')" aria-label="Log anything">${shIcon('plus')}</button>` : `<button class="sh-tab ${cur.hub === h.id ? 'on' : ''}" onclick="shGoHub('${h.id}')"><span class="sh-ic">${shIcon(h.icon)}${h.id === 'work' && badge ? `<i class="sh-badge">${badge}</i>` : ''}</span><span class="sh-lb">${h.label}</span></button>`).join('')}</div>`;
    const nav = $('side') && $('side').querySelector('nav');
    if (nav) nav.innerHTML = SH_HUBS.filter((h) => h.id !== 'cap').map((h) => `<div class="sh-sgrp ${cur.hub === h.id ? 'on' : ''}"><button class="sh-shub ${cur.hub === h.id ? 'on' : ''}" onclick="shGoHub('${h.id}')">${ic(h.icon, 20)}${h.label}${h.id === 'work' && badge ? `<span class="badge">${badge}</span>` : ''}</button>${(h.segs || h.inner || []).length && cur.hub === h.id ? `<div class="sh-ssub">${(h.segs || h.inner).map((s, i) => `<button class="${cur.seg === i ? 'on' : ''}" onclick="${h.inner ? `shSeg(${i})` : `show('${s[0]}')`}">${s[1]}</button>`).join('')}</div>` : ''}</div>`).join('') + `<button class="sh-snew" onclick="shCapture()">${shIcon('plus')}Log anything <kbd>N</kbd></button>`;
  };
  renderNav._sh = 1;
}

/* ── segmented header on every hub page ── */
if (typeof render === 'function' && !render._sh) {
  const _r = render;
  render = function () {
    const out = _r.apply(this, arguments);
    try {
      const cur = shCur(), H = SH_HUBS.find((h) => h.id === cur.hub), el = document.querySelector('.view.active');
      if (el && H && (H.segs || H.inner) && !shArcOn()) { const list = H.segs || H.inner; let bar = el.querySelector(':scope > .sh-seg'); const html = `${list.map((s, i) => `<button class="${cur.seg === i ? 'on' : ''}" onclick="shSeg(${i})">${s[1]}</button>`).join('')}<i class="sh-ind"></i>`; if (!bar) { bar = document.createElement('div'); bar.className = 'sh-seg'; el.prepend(bar); } bar.innerHTML = html; shInd(bar); }
      document.documentElement.dataset.hub = cur.hub;
    } catch (e) { }
    return out;
  };
  render._sh = 1;
}
function shInd(bar) { requestAnimationFrame(() => { const on = bar.querySelector('button.on'), ind = bar.querySelector('.sh-ind'); if (!on || !ind) return; ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)`; if (bar.scrollWidth > bar.clientWidth) { const x = on.offsetLeft - bar.clientWidth / 2 + on.offsetWidth / 2; bar.scrollTo({ left: x, behavior: 'smooth' }); } }); }

/* ── swipe between segments (phone) ── */
/* 13.13.3: a swipe that starts inside anything that scrolls sideways (course tabs, chip rows) scrolls that row, never changes the page */
function shHScroll(el) { for (let n = el; n && n !== document.body; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 2) { const ox = getComputedStyle(n).overflowX; if (ox === 'auto' || ox === 'scroll') return true; } } return false; }
(function () {
  let x0 = 0, y0 = 0, t0 = 0, ok = false;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0], el = e.target; ok = !document.getElementById('modal-bg').classList.contains('open') && !shArcOn() && !el.closest('svg,input,textarea,select,.sh-seg,.mn2-chips,.mn2-accs,.mn2-ins,.st-tabs,.chips,.aq-tabs,.trl-row,.lf-start,[data-noswipe],.sh-bar') && !shHScroll(el); x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!ok) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Math.abs(dx) < 70 || Math.abs(dy) > 45 || Date.now() - t0 > 600) return;
    const cur = shCur(), H = SH_HUBS.find((h) => h.id === cur.hub), list = H && (H.segs || H.inner); if (!list) return; const n = cur.seg + (dx < 0 ? 1 : -1); if (n >= 0 && n < list.length) shSeg(n);
  }, { passive: true });
})();

/* ── + : log anything, from anywhere ── */
const SH_QUICK = [
  ['+1 dial', 'arcApply([["dials",1,"+1 dial"]])', 'dial'], ['+1 owner talk', 'arcApply([["owners",1,"+1 owner talk"]])', 'star'], ['Spent', 'mnEdit(null,{type:"out"})', 'wallet'], ['Earned', 'mnEdit(null,{type:"in",cat:"tennis"})', 'wallet'],
  ['Weight', 'closeModal();weightModal()', 'scale'], ['Trained', 'adChange()', 'train'], ['BAC 25 min', 'closeModal();startTimer("bac",25);arcRender&&arcRender()', 'timer'], ['Change today', 'adChange()', 'cal'],
  ['Count money', 'mnCountModal()', 'check'], ['Food', 'closeModal();show("food")', 'food'], ['Journal', 'jnNew()', 'pen'], ['Trigger', 'dfTriggerEdit("")', 'shield'], ['Content', 'ccOpen()', 'star'], ['Energy', 'enCheck()', 'scale'],
];
function shCapture() {
  shBuzz(10); const sr = window.SpeechRecognition || window.webkitSpeechRecognition;
  openModal(`<div class="sh-cap"><div class="sh-cap-h">Log anything</div>
    <div class="sh-cap-in"><input id="arc-in" class="arc-log" autocomplete="off" placeholder="12 dials 1 owner · spent 120 taxi · woke up 7:10" oninput="typeof arcPrev==='function'&&arcPrev()" onkeydown="if(event.key==='Enter')arcLogSave()">${sr ? `<button class="sh-mic" id="sh-mic" onclick="shDictate()" aria-label="Say it">${ic('mic', 20)}</button>` : ''}</div>
    <div id="arc-pv" class="arc-pv"></div>
    <div class="sh-qgrid">${SH_QUICK.map(([l, code, icn], i) => `<button style="animation-delay:${i * 22}ms" onclick='${code}'>${ic(icn, 20)}<span>${l}</span></button>`).join('')}</div>
    <button class="btn primary block" onclick="arcLogSave()">Log it</button>
    <div class="xs muted" style="margin-top:8px;text-align:center">It understands dials, owner talks, BAC, deep work, weight, food kcal, money, plan changes and training.</div></div>`);
  setTimeout(() => { const i = $('arc-in'); if (i && matchMedia('(min-width:1000px)').matches) i.focus(); }, 120);
}
function shDictate() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; const r = new SR(), b = $('sh-mic'); r.lang = 'en-US'; r.interimResults = true;
  if (b) b.classList.add('rec'); r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0].transcript).join(' '); const i = $('arc-in'); if (i) { i.value = t; if (typeof arcPrev === 'function') arcPrev(); } };
  r.onend = () => { if (b) b.classList.remove('rec'); }; r.onerror = () => { if (b) b.classList.remove('rec'); toast('Could not hear that. Type it instead.'); }; try { r.start(); } catch (e) { }
}
document.addEventListener('keydown', (e) => { if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !/input|textarea|select/i.test((e.target.tagName || '')) && !document.getElementById('modal-bg').classList.contains('open')) { e.preventDefault(); shCapture(); } });

/* ── ARC lives inside the shell: tab bar stays, its own footer goes, one theme ── */
if (typeof arcHtml === 'function' && !arcHtml._sh) {
  const _h = arcHtml;
  arcHtml = function () { return _h().replace(/<div class="arc-foot">[\s\S]*?<\/div><\/div>$/, '</div>').replace('<div class="arc-min', '<button class="arc-change" onclick="adChange()">Change today</button><div class="arc-min').replace(/<button class="arc-ic" onclick="arcRooms\(\)"[^>]*>[\s\S]*?<\/button>/, '<button class="arc-ic" onclick="shCapture()" aria-label="Log anything">' + shIcon('plus') + '</button>'); };
  arcHtml._sh = 1;
}
if (typeof arcShow === 'function' && !arcShow._sh) { const _a = arcShow; arcShow = function () { const r = _a.apply(this, arguments); shRefreshNav(); return r; }; arcShow._sh = 1; }
if (typeof arcHide === 'function' && !arcHide._sh) { const _h2 = arcHide; arcHide = function () { const r = _h2.call(this, false); shRefreshNav(); return r; }; arcHide._sh = 1; }
setTimeout(() => { try { renderNav(); } catch (e) { } }, 1700);
/* the top-bar + and the old capture both open the one "Log anything" sheet */
if (typeof openCapture === 'function' && !openCapture._sh) { openCapture = function () { shCapture(); }; openCapture._sh = 1; }
