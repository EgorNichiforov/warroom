/* War Room 15.7.0 · FOCUS MODE (22 Nov 2026) — Musk's algorithm, step 2: delete.
   Egor approved this on 22 Nov 2026 after the first-principles audit of his whole system: 0 real dials, ~250 commits.
   With Focus on (the default), the bottom bar and sidebar show only what makes a dial or logs a fact:
   Day · Work (Dial, Pipeline when the stage opens it, Playbook for the scripts) · Money (Overview, Transactions) · You (Train, Settings).
   Nothing is deleted: every other screen still exists, keeps its data and opens from Settings → Focus mode → Hidden screens.
   Focus lifts by itself at 1,000 logged dials or the first paid invoice; it can also be switched off by hand in Settings.
   Implementation: each hub's segment list is wrapped in a getter. Focus on → a filtered copy (anything other modules
   splice into it is simply not shown). Focus off → the real list, untouched, so all existing behaviour is unchanged. */
'use strict';
const FC_KEEP = { work: ['dial', 'crm', 'book'], you: ['train', 'me'], money: ['over', 'tx'] };
const FC_NAMES = { boot: 'Learn / Bootcamp', acq: 'Courses', intel: 'Intel', later: 'Later', life: 'Overview / Engine', trlog: 'Training log', food: 'Food', stats: 'Stats', week: 'Plan', cal: 'Calendar', ask: 'Ask' };
function fcEarned() {
  /* the two exits written into the freeze: 1,000 logged dials or the first cleared payment */
  try { const e = sgEvidence(); return e.attempts >= 1000 || e.paid >= 1; } catch (e) { return false; }
}
function fcOn() {
  try { const s = (typeof S !== 'undefined' && S.settings) || {}; if (s.focusOff) return false; } catch (e) { }
  return !fcEarned();
}
function fcHidden() {
  const out = [];
  try { SH_HUBS.forEach((H) => { const keep = FC_KEEP[H.id]; if (!keep) return; const raw = H.id === 'money' ? H._fcInner : H._fcSegs; (raw || []).forEach((s) => { if (!keep.includes(s[0]) && s[0] !== 'later') out.push(s); }); }); } catch (e) { }
  return out;
}
(function fcInstall() {
  if (typeof SH_HUBS === 'undefined') return;
  SH_HUBS.forEach((H) => {
    const keep = FC_KEEP[H.id]; if (!keep) return;
    const prop = H.id === 'money' ? 'inner' : 'segs', store = H.id === 'money' ? '_fcInner' : '_fcSegs';
    if (Object.getOwnPropertyDescriptor(H, prop) && Object.getOwnPropertyDescriptor(H, prop).get) return;
    H[store] = H[prop];
    Object.defineProperty(H, prop, {
      configurable: true, enumerable: true,
      get() { const raw = this[store] || []; if (!fcOn()) return raw; const f = raw.filter((s) => keep.includes(s[0])); return f.length ? f : raw; },
      set(v) { this[store] = v; },
    });
  });
})();
function fcToggle() {
  try { S.settings = S.settings || {}; S.settings.focusOff = !S.settings.focusOff; touch(S.settings); save(); } catch (e) { }
  try { render(); } catch (e) { }
  try { toast(fcOn() ? 'Focus mode on: 4 screens. Dial.' : 'Focus mode off: every screen is back.'); } catch (e) { }
}
function fcCard() {
  const on = fcOn(), earned = fcEarned(), hid = fcHidden();
  let ev = { attempts: 0, paid: 0 }; try { ev = sgEvidence(); } catch (e) { }
  const btns = hid.map((s) => `<button class="btn" style="margin:4px 6px 0 0" onclick="show('${s[0]}')">${esc(FC_NAMES[s[0]] || s[1])}</button>`).join('');
  return `<div class="card fc-card" id="fc-card"><div class="row" style="justify-content:space-between;align-items:center;gap:10px">
    <div><b>Focus mode</b> <span class="xs muted">${on ? 'ON · 4 screens' : 'OFF · everything shown'}</span></div>
    <button class="btn ${on ? '' : 'primary'}" onclick="fcToggle()">${on ? 'Switch off' : 'Switch on'}</button></div>
    <div class="xs muted" style="margin-top:6px">Set on 22 Nov 2026 (Musk's algorithm, step 2: delete). Day, Work, Money and You show only what makes a dial or logs a fact. Nothing is deleted.
    It lifts by itself at 1,000 logged dials or the first paid invoice: now ${ev.attempts} of 1,000 dials · ${ev.paid} paid.${earned ? ' Earned: you can switch everything back on.' : ''}</div>
    ${on && hid.length ? `<div class="xs muted" style="margin-top:10px">Hidden screens (open one if you really need it):</div><div>${btns}</div>` : ''}</div>`;
}
(function fcWrapRender() {
  if (typeof render !== 'function' || render._fc) return;
  const _r = render;
  render = function () {
    const x = _r.apply(this, arguments);
    try { if (view === 'me') { const v = document.getElementById('view-me'); if (v) { const old = v.querySelector('#fc-card'), h = fcCard(); if (old) { if (old.outerHTML !== h) old.outerHTML = h; } else v.insertAdjacentHTML('afterbegin', h); } } } catch (e) { }
    return x;
  };
  render._fc = 1;
})();
try { if (typeof renderNav === 'function') renderNav(); } catch (e) { }
