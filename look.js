/* War Room · look.js (5.13 MONOLITH)
   Appearance per device: 'dark' (Monolith obsidian, default) · 'light' (Monolith limestone) · 'classic' (the 5.12 look, rollback).
   Stored in localStorage only, never synced: it is a property of the screen, not of the data.
   Also: the HQ mission plate, and the emoji quietener for UI chrome (titles, buttons, chips). */
const LOOKS = [['dark', 'Monolith · obsidian', 'Dark graphite with bronze. The default.'], ['light', 'Monolith · limestone', 'Light stone for daylight and outdoors.'], ['classic', 'Classic', 'The 5.12 orange look. Rollback, nothing else changes.']];
function lookGet() { try { const l = localStorage.getItem('wr-look'); return LOOKS.some((x) => x[0] === l) ? l : 'dark'; } catch (e) { return 'dark'; } }
function isMonolith() { return lookGet() !== 'classic'; }
function applyLook(l) {
  l = l || lookGet(); const root = document.documentElement; root.dataset.look = l;
  const css = document.getElementById('mono-css'); if (css) css.disabled = l === 'classic';
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', l === 'light' ? '#E8E4DA' : l === 'classic' ? '#060707' : '#0B0E0F');
}
function setAppearance(l) {
  if (!LOOKS.some((x) => x[0] === l)) return;
  try { localStorage.setItem('wr-look', l); } catch (e) { }
  applyLook(l); if (typeof render === 'function') render();
  if (typeof toast === 'function') toast('Appearance: ' + LOOKS.find((x) => x[0] === l)[1]);
}
function appearanceCard() {
  const cur = lookGet();
  return `<div class="card"><div class="card-h"><div class="card-t">Appearance</div><div class="card-r">this device only</div></div>
    <div class="looks" style="margin-bottom:10px">${[['nova', 'NOVA interface', 'Orbit, Reactor, Pulse, Vector and the command orb. The default from 6.0.'], ['monolith', 'Classic screens', 'The HQ, Ops, Personal, Intel layout. Colours below still apply.']].map(([id, nm, d]) => { const on = (typeof nvOn === 'function' ? nvOn() : false) === (id === 'nova'); return `<button class="lookopt ${on ? 'on' : ''}" onclick="nvSetUi('${id}')" aria-pressed="${on}"><span class="sw sw-${id === 'nova' ? 'nova' : 'dark'}"><i></i><i></i><i></i></span><span class="lt"><b>${nm}</b><small>${d}</small></span></button>`; }).join('')}</div><div class="looks">${LOOKS.map(([id, nm, d]) => `<button class="lookopt ${cur === id ? 'on' : ''}" onclick="setAppearance('${id}')" aria-pressed="${cur === id}"><span class="sw sw-${id}"><i></i><i></i><i></i></span><span class="lt"><b>${nm}</b><small>${d}</small></span></button>`).join('')}</div></div>`;
}

/* ── HQ mission plate: the one number for today, engraved ── */
function missionPlate(d) {
  if (!isMonolith()) return '';
  const o = day(d), tg = dialTargetFor(d), v = Number(o.counters.dials) || 0, own = Number(o.counters.owners) || 0;
  const dc = counterDef('dials'), wkT = dc ? dc.weekly : 0, wk = counterWeek('dials', d);
  const left = daysUntil(S.settings.bigDate), bd = pd(S.settings.bigDate), r = rankInfo();
  const main = tg ? v : wk, of = tg ? tg : wkT, lab = tg ? 'dials today' : 'dials this week · no block today';
  const n = 20, on = of ? Math.min(n, Math.round((main / of) * n)) : 0, over = of && main > of;
  const ticks = Array.from({ length: n }, (_, i) => `<i class="${i < on ? (over ? 'over' : 'on') : ''}"></i>`).join('');
  return `<div class="plate" role="group" aria-label="Mission plate: ${main} of ${of} ${lab}">
    <div class="pk"><span>Mission · <b>$20K MRR</b></span><span>${fmtShort(bd).toUpperCase()} ${bd.getFullYear()}</span></div>
    <div class="pm"><div><div class="pn">${main}<small>/ ${of || '—'}</small></div><div class="pl">${lab}</div></div>
      <div class="pr"><div class="d"><span>D-</span>${left}</div><div class="pl">days left</div></div></div>
    <div class="ticks" aria-hidden="true">${ticks}</div>
    <div class="pf"><span>Owners today <b>${own}</b> · Week <b>${wk}</b>/${wkT}</span><span>${r.name} · L${r.i + 1}</span></div></div>`;
}

/* ── Emoji quietener: UI chrome only (never inputs, chat or user notes). ── */
const EMO_RE = /((?:\p{Extended_Pictographic}|[\u2600-\u27BF])(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)\uFE0F?\s?/gu;
const EMO_SEL = '.focus-t,.wline,.card-t,.sec-h,.btn,.chip,.lab,.modal h2,.seg button,.hero .kicker,.hero .title,.pill,.tile .l,.orders .ot,.setting-row .t,.launch button b,.card-h>.small,.intel .in .ih';
function quietEmoji(root) {
  if (!isMonolith()) return;
  (root || document).querySelectorAll(EMO_SEL).forEach((el) => {
    if (el.dataset.e || el.closest('.msg,[contenteditable],.chat')) return; el.dataset.e = '1';
    EMO_RE.lastIndex = 0; if (!EMO_RE.test(el.textContent)) return;
    const solo = !el.textContent.replace(EMO_RE, '').trim();
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; let t; while ((t = tw.nextNode())) nodes.push(t);
    nodes.forEach((tn) => {
      if (tn.parentElement && /^(INPUT|TEXTAREA|SCRIPT|STYLE)$/.test(tn.parentElement.tagName)) return;
      const s = tn.nodeValue; EMO_RE.lastIndex = 0; if (!EMO_RE.test(s)) return;
      const frag = document.createDocumentFragment(); let last = 0; EMO_RE.lastIndex = 0; let m;
      while ((m = EMO_RE.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        const sp = document.createElement('span'); sp.className = solo ? 'emo-solo' : 'emo'; if (!solo) sp.setAttribute('aria-hidden', 'true'); sp.textContent = m[0]; frag.appendChild(sp); last = m.index + m[0].length;
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
  });
}
let _emoQ = 0;
function watchEmoji() {
  if (!window.MutationObserver) return;
  new MutationObserver(() => { if (_emoQ) return; _emoQ = requestAnimationFrame(() => { _emoQ = 0; quietEmoji(); }); }).observe(document.body, { childList: true, subtree: true });
  quietEmoji();
}
applyLook();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchEmoji); else watchEmoji();
