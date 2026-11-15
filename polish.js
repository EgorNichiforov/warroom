/* War Room 10.3 · fewer places, same power. You = Overview · Train · Food · Stats · Plan · Settings.
   Training log lives inside Train, Calendar inside Plan, Ask behind the chat button (and "/"). */
'use strict';
(function () {
  const you = SH_HUBS.find((h) => h.id === 'you'); if (you) you.segs = [['life', 'Overview'], ['train', 'Train'], ['food', 'Food'], ['stats', 'Stats'], ['week', 'Plan'], ['me', 'Settings']];
  const ALIAS = { trlog: 'train', cal: 'week', ask: 'me' };
  if (typeof shCur === 'function' && !shCur._pl) { const _f = shCur; shCur = function () { const c = _f(); if (ALIAS[view] && !shArcOn()) { const H = SH_HUBS.find((h) => h.id === 'you'); c.hub = 'you'; c.seg = Math.max(0, H.segs.findIndex((s) => s[0] === ALIAS[view])); } return c; }; shCur._pl = 1; }
  function chips(on) { const T = [['plan', 'Plan'], ['tasks', 'Tasks'], ['goals', 'Goals'], ['review', 'Review']]; return `<div class="chips pl-chips" style="margin-bottom:12px">${T.map(([v, l]) => `<span class="chip" onclick="weekTab='${v}';show('week')">${l}</span>`).join('')}<span class="chip ${on ? 'on' : ''}" onclick="show('cal')">Calendar</span></div>`; }
  function put(v, html) { const sg = v.querySelector(':scope > .sh-seg'); if (sg) sg.insertAdjacentHTML('afterend', html); else v.insertAdjacentHTML('afterbegin', html); }
  function post() {
    try {
      if (view === 'week') { const c = document.querySelector('#view-week .chips'); if (c && !c.querySelector('.pl-cal')) c.insertAdjacentHTML('beforeend', `<span class="chip pl-cal" onclick="show('cal')">Calendar</span>`); }
      if (view === 'cal') { const v = document.getElementById('view-cal'); if (v && !v.querySelector('.pl-chips')) put(v, chips(true)); }
      if (view === 'trlog') { const v = document.getElementById('view-trlog'); if (v && !v.querySelector('.pl-back')) put(v, `<button class="pl-back" onclick="show('train')">‹ Today's session</button>`); }
      if (view === 'ask') { const v = document.getElementById('view-ask'); if (v && !v.querySelector('.pl-back')) put(v, `<button class="pl-back" onclick="show('me')">‹ Settings</button>`); }
      /* desktop: cards tilt a light toward the pointer */
    } catch (e) { }
  }
  if (typeof render === 'function' && !render._pl) { const _r = render; render = function () { const x = _r.apply(this, arguments); post(); return x; }; render._pl = 1; }
  /* desktop pointer glow on cards (one listener, CSS does the drawing) */
  if (matchMedia('(hover:hover) and (min-width:1000px)').matches) document.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
})();
