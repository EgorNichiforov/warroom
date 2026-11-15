/* War Room 12.0 · STABLE — the rendering model.
   Before: every render() replaced a whole screen with innerHTML. Any background event (sync merge, the 30 s day tick, a timer,
   a second device saving) rebuilt the DOM, restarted every entrance / chart / count-up animation and looked like a flicker.
   Now: the screen containers patch themselves. A re-render diffs the new markup against the live DOM and touches only the
   nodes that actually changed; identical content is a no-op. Entrance motion plays on navigation only (html.wr-nav).
   The focused input is never touched, scroll positions and open states survive. */
'use strict';
(function () {
  const D = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'); let navUntil = 0, navT = 0;
  window.wrNav = function (ms) { ms = ms || 650; navUntil = performance.now() + 60; document.documentElement.classList.add('wr-nav'); clearTimeout(navT); navT = setTimeout(() => document.documentElement.classList.remove('wr-nav'), ms); };
  window.wrStats = { morph: 0, full: 0, same: 0, touched: 0 };
  function attrs(a, b) {
    const B = b.attributes, A = a.attributes; const live = a.classList && a.classList.contains('sh-ind'); /* its position is set by script: keep it, or it would slide in again on every refresh */
    for (let i = 0; i < B.length; i++) { const n = B[i].name, v = B[i].value; if (live && n === 'style') continue; if (a.getAttribute(n) !== v) a.setAttribute(n, v); }
    for (let i = A.length - 1; i >= 0; i--) if (!b.hasAttribute(A[i].name) && !(live && A[i].name === 'style')) a.removeAttribute(A[i].name);
  }
  /* nodes that later steps add to a screen (segment bar, back links, progress bars): the diff leaves them where they are */
  const KEEP = /(^| )(sh-seg|pl-chips|pl-back|ex-p)( |$)/;
  const kept = (n) => n && n.nodeType === 1 && KEEP.test(n.className && n.className.baseVal == null ? n.className : '');
  function morph(a, b) {
    let x = a.firstChild, y = b.firstChild;
    while (y) {
      const ny = y.nextSibling;
      while (kept(x) && !kept(y)) { install(x); x = x.nextSibling; }
      if (!x) { a.appendChild(y); wrStats.touched++; y = ny; continue; }
      if (x === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName)) { /* never fight the user's cursor */ }
      else if (x.nodeType === 1 && y.nodeType === 1 && x.hasAttribute('data-count') && y.hasAttribute('data-count')) { /* a counted number: never reset to zero, only move to its new value */
        if (x.getAttribute('data-count') !== y.getAttribute('data-count') || x.getAttribute('data-cur') !== y.getAttribute('data-cur')) { attrs(x, y); try { x.textContent = mnF(Number(x.dataset.count) || 0, x.dataset.cur || 'MDL', x.dataset.sign === '1'); } catch (e) { } x._mcd = 1; wrStats.touched++; } }
      else if (x.isEqualNode(y)) { /* untouched */ }
      else if (x.nodeType === 1 && y.nodeType === 1 && x.tagName === y.tagName && x.id === y.id && x.namespaceURI === y.namespaceURI) { attrs(x, y); morph(x, y); }
      else if (x.nodeType === 3 && y.nodeType === 3) { x.nodeValue = y.nodeValue; wrStats.touched++; }
      else { a.replaceChild(y, x); x = y; wrStats.touched++; }
      x = x.nextSibling; y = ny;
    }
    while (x) { const nx = x.nextSibling; if (!kept(x)) { a.removeChild(x); wrStats.touched++; } else install(x); x = nx; }
  }
  function fields(root) { root.querySelectorAll('input,textarea,select').forEach((el) => { if (el === document.activeElement) return; if (el.tagName === 'SELECT') { [...el.options].forEach((o) => { if (o.selected !== o.defaultSelected) o.selected = o.defaultSelected; }); } else if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked !== el.defaultChecked) el.checked = el.defaultChecked; } else if (el.type !== 'file' && el.value !== el.defaultValue) el.value = el.defaultValue; }); }
  function install(el) {
    if (!el || el._wrStable) return; el._wrStable = 1;
    Object.defineProperty(el, 'innerHTML', { configurable: true, get() { return D.get.call(this); },
      set(h) { h = String(h == null ? '' : h); if (this._cap) { this._capHtml = h; return; }
        if (!this.firstChild || !h || performance.now() < navUntil) { wrStats.full++; D.set.call(this, h); return; }
        const t = document.createElement('template'); D.set.call(t, h); const before = wrStats.touched; morph(this, t.content); fields(this); if (wrStats.touched === before) wrStats.same++; else wrStats.morph++;
      } });
  }
  function boot() { document.querySelectorAll('.view').forEach(install); ['arc', 'top-right', 'top-title', 'top-sub', 'nav', 'side', 'rail', 'rec-slot'].forEach((id) => install(document.getElementById(id))); }
  boot(); document.addEventListener('DOMContentLoaded', boot); window.wrStableBoot = boot;
  /* the bottom bar and the sidebar were written twice per render (old nav, then the hub nav): capture the first, write once */
  if (typeof renderNav === 'function' && !renderNav._st && typeof SH_HUBS !== 'undefined') {
    const base = renderNav;
    renderNav = function () {
      const nav = document.getElementById('nav'), side = document.getElementById('side'); if (!nav || !side) return base();
      nav._cap = side._cap = 1; nav._capHtml = side._capHtml = null; const holder = document.createElement('div'); let fake = null;
      side.querySelector = function (q) { if (q === 'nav') { fake = fake || document.createElement('nav'); return fake; } return Element.prototype.querySelector.call(side, q); };
      try { base(); } finally { nav._cap = side._cap = 0; delete side.querySelector; }
      if (nav._capHtml != null) nav.innerHTML = nav._capHtml;
      if (side._capHtml != null) { let h = side._capHtml; if (fake) { D.set.call(holder, h); const n = holder.querySelector('nav'); if (n) { D.set.call(n, D.get.call(fake)); h = D.get.call(holder); } } side.innerHTML = h; }
    };
    renderNav._st = 1;
  }
  /* navigation = the only moment entrance motion plays, and the only moment a screen is rebuilt whole */
  if (typeof show === 'function' && !show._st) { const _s = show; show = function () { wrNav(); return _s.apply(this, arguments); }; show._st = 1; }
  ['arcShow', 'arcHide', 'shSeg', 'shGoHub'].forEach((n) => { const f = window[n]; if (typeof f === 'function' && !f._st) { window[n] = function () { wrNav(); const r = f.apply(this, arguments); install(document.getElementById('arc')); return r; }; window[n]._st = 1; } });
  /* no whole-page cross-fade: the chrome stays put, only the content moves in */
  if (typeof shTransition === 'function') shTransition = function (fn, from, to) {
    try { const a = SH_ORDER.indexOf(from.hub), b = SH_ORDER.indexOf(to.hub); document.documentElement.dataset.shdir = a === b ? (to.seg >= from.seg ? 'fwd' : 'back') : b > a ? 'fwd' : 'back'; } catch (e) { }
    wrNav(); fn(); const v = document.querySelector('.view.active'); if (v && !(typeof shArcOn === 'function' && shArcOn())) { v.classList.remove('sh-enter'); void v.offsetWidth; v.classList.add('sh-enter'); setTimeout(() => v.classList.remove('sh-enter'), 700); } if (typeof mcCount === 'function') mcCount();
  };
  /* numbers count up when you arrive, never again on a background refresh */
  if (typeof mcCount === 'function') mcCount = function (root) {
    const nav = document.documentElement.classList.contains('wr-nav'), calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    (root && root.querySelectorAll ? root : document).querySelectorAll('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count) || 0, fin = mnF(to, el.dataset.cur || 'MDL', el.dataset.sign === '1'); if (el._run) return;
      if (!nav || calm || el._mcd) { if (el.textContent !== fin) el.textContent = fin; el._mcd = 1; return; }
      el._mcd = 1; el._run = 1; const t0 = performance.now(), T = 600; const step = (t) => { const p = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - p, 3); el.textContent = p < 1 ? mnF(to * e, el.dataset.cur || 'MDL', el.dataset.sign === '1') : fin; if (p < 1) requestAnimationFrame(step); else el._run = 0; }; requestAnimationFrame(step);
    });
  };
  if (typeof render === 'function' && !render._st) { const _r = render; render = function () { const x = _r.apply(this, arguments); try { mcCount(); } catch (e) { } return x; }; render._st = 1; }
  if (typeof arcRender === 'function' && !arcRender._st) { const _a = arcRender; arcRender = function () { install(document.getElementById('arc')); const x = _a.apply(this, arguments); try { mcCount(document.getElementById('arc')); } catch (e) { } return x; }; arcRender._st = 1; }
  /* Money re-armed its chart animations on every render: only when arriving */
  if (typeof renderMoney === 'function' && !renderMoney._st) { const _m = renderMoney; renderMoney = function () { const el = document.getElementById('view-money'), nav = document.documentElement.classList.contains('wr-nav'); if (el && !nav) { const cl = el.classList, add = cl.add, rem = cl.remove; cl.add = cl.remove = function () { }; try { _m(); } finally { cl.add = add; cl.remove = rem; } } else _m(); }; renderMoney._st = 1; }
  wrNav(1200);
})();
