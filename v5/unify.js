/* War Room 9.5 · ONE SYSTEM.
   Before: three different interfaces (NOVA, Classic, ARC) plus a ONE overlay, each with its own home and look.
   Now: one system. ARC (your day) is the only home. Every other screen is a room of it, reached from Rooms
   or the sidebar/bottom bar, and "Day" always brings you back. One look that follows the sun
   (light by day, dark from 17:00), applied to the home and every room alike. */
'use strict';
try { localStorage.setItem('wr-ui', 'monolith'); localStorage.removeItem('wr-arc'); const l = localStorage.getItem('wr-look'); if (!l || l === 'classic') localStorage.setItem('wr-look', 'auto'); } catch (e) { }

/* NOVA retired: its useful parts already live in rooms (Dialer, Engine, Stats) */
if (typeof nvOn === 'function') { nvOn = function () { return false; }; if (typeof nvUnmount === 'function') try { nvUnmount(); } catch (e) { } }
/* ARC is always the home */
if (typeof arcOn === 'function') arcOn = function () { return true; };

/* one look, following the sun */
if (typeof LOOKS !== 'undefined' && !LOOKS.some((x) => x[0] === 'auto')) LOOKS.unshift(['auto', 'Follow the sun', 'Light from wake-up to 17:00, dark in the evening. Same as your day screen.']);
function unPhaseLook() { try { return typeof arcPhase === 'function' && typeof S !== 'undefined' && S && S.settings ? (arcPhase() === 'paper' ? 'light' : 'dark') : 'dark'; } catch (e) { return 'dark'; } }
if (typeof lookGet === 'function') { lookGet = function () { try { const l = localStorage.getItem('wr-look'); return ['auto', 'dark', 'light'].includes(l) ? l : 'auto'; } catch (e) { return 'auto'; } }; }
if (typeof applyLook === 'function' && !applyLook._un) {
  const _ap = applyLook;
  applyLook = function (l) { l = l || lookGet(); const real = l === 'auto' ? unPhaseLook() : l; _ap(real); document.documentElement.dataset.lookMode = l; };
  applyLook._un = 1; try { applyLook(); } catch (e) { } setInterval(() => { try { if (lookGet() === 'auto') applyLook('auto'); } catch (e) { } }, 5 * 60000);
}

/* "Now / HQ" everywhere means: your day */
if (typeof show === 'function' && !show._un) {
  const _s = show;
  show = function (v) { if ((v === 'now' || v === 'today' || v === 'hq') && typeof arcShow === 'function') { arcShow(); return; } return _s.apply(this, arguments); };
  show._un = 1;
}
if (typeof NAV !== 'undefined' && NAV[0] && NAV[0][0] === 'now') NAV[0] = ['now', 'hq', 'Day'];

/* Settings: one Appearance card (look only; the interface choices are gone) */
appearanceCard = function () {
  const cur = lookGet();
  return `<div class="card"><div class="card-h"><div class="card-t">Appearance</div><div class="card-r">this device</div></div>
    <div class="small muted" style="margin-bottom:10px">One system: your day is home, everything else is a room. Only the colours are yours to choose.</div>
    <div class="looks">${[['auto', 'Follow the sun', 'Light by day, dark from 17:00'], ['dark', 'Always dark', 'Obsidian and bronze'], ['light', 'Always light', 'Limestone, for outdoors']].map(([id, nm, d]) => `<button class="lookopt ${cur === id ? 'on' : ''}" onclick="setAppearance('${id}')" aria-pressed="${cur === id}"><span class="sw sw-${id === 'auto' ? 'light' : id}"><i></i><i></i><i></i></span><span class="lt"><b>${nm}</b><small>${d}</small></span></button>`).join('')}</div></div>`;
};
if (typeof setAppearance === 'function' && !setAppearance._un) { setAppearance = function (l) { if (!['auto', 'dark', 'light'].includes(l)) return; try { localStorage.setItem('wr-look', l); } catch (e) { } applyLook(l); if (typeof render === 'function') render(); if (typeof arcRender === 'function') arcRender(); }; setAppearance._un = 1; }

/* ARC follows the chosen look too: "Always dark" keeps the day screen dark, "Always light" keeps it light (night stays black) */
if (typeof arcPhase === 'function' && !arcPhase._un) { const _p = arcPhase; arcPhase = function () { const ph = _p(), l = lookGet(); if (ph === 'night') return ph; return l === 'dark' ? 'dusk' : l === 'light' ? 'paper' : ph; }; arcPhase._un = 1; }
