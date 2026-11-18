/* War Room 13.8 · PARITY — every element on the phone and on the laptop.
   Before: the laptop showed things the phone never did (the right-hand rail on Work / Money / You, the Day screen's
   side column: timeline, Never-0 week, money, weight, training; account names, forecast balance, the training legend,
   Intel ‹ ›). Now the phone gets the same content, stacked under each screen. Plus "Jump to" on Settings for both. */
'use strict';
(function () {
  const wideRail = () => matchMedia('(min-width:1280px)').matches;
  const NO_RAIL = ['now', 'stats', 'food', 'cal', 'book', 'intel', 'crm', 'boot'];

  /* 1 · the rail: on screens where the laptop shows it, the phone gets the same cards at the bottom of the screen */
  if (typeof renderRail === 'function' && !renderRail._pp) {
    const _r = renderRail;
    renderRail = function () {
      _r.apply(this, arguments);
      document.querySelectorAll('.ph-rail').forEach((x) => { if (wideRail() || !x.closest('#view-' + view)) x.remove(); });
      if (wideRail() || NO_RAIL.includes(view)) return;
      const v = document.getElementById('view-' + view), rail = document.getElementById('rail'); if (!v || !rail || !rail.innerHTML.trim()) return;
      const html = `<div class="ph-k">At a glance</div>${rail.innerHTML}`;
      let box = v.querySelector(':scope > .ph-rail');
      if (!box) { box = document.createElement('section'); box.className = 'ph-rail'; v.appendChild(box); }
      else if (box !== v.lastElementChild) v.appendChild(box);
      if (box.innerHTML !== html) box.innerHTML = html;
    };
    renderRail._pp = 1;
  }

  /* 2 · Day: the laptop's side column (timeline, rings, Never-0 week, money, weight, training) under the phone's day */
  if (typeof arcHtml === 'function' && !arcHtml._pp) {
    const _h = arcHtml;
    arcHtml = function () {
      const h = _h.apply(this, arguments);
      try {
        if ((typeof dkWide === 'function' && dkWide()) || (typeof arcPhase === 'function' && arcPhase() === 'night')) return h;
        const d = new Date(); let side = typeof dkSide === 'function' ? dkSide(d) : '';
        if (typeof bfAttHtml === 'function') side = side.replace('<div class="dk-col3">', `<div class="dk-col3"><div class="card bf-card"><div class="dk-k">Objectives</div>${typeof bfObjHtml === 'function' ? bfObjHtml(5) : ''}</div>`);
        const tl = typeof dkTimeline === 'function' ? dkTimeline(d) : '';
        return h + `<section class="ph-day"><div class="ph-k">Today at a glance</div>${side}${tl ? `<details class="ph-tl"><summary>Timeline · every block today</summary>${tl}</details>` : ''}</section>`;
      } catch (e) { return h; }
    };
    arcHtml._pp = 1;
  }

  /* 3 · Settings: one tap to every section (both devices) */
  const JUMP = [['App lock', 'App lock'], ['Time ranges', 'Time ranges'], ['Sync', 'Devices & sync'], ['Guided day', 'Guided day'], ['Appearance', 'Appearance'], ['Accountability', 'Accountability link'], ['Time machine', 'Time machine'], ['Todoist', 'Todoist'], ['Settings', 'Settings']];
  window.meJump = function (t) {
    const c = [...document.querySelectorAll('#view-me .card')].find((x) => { const h = x.querySelector('.card-t'); return h && h.textContent.trim() === t; });
    if (c) { const top = c.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo({ top, behavior: 'smooth' }); c.classList.remove('me-flash'); void c.offsetWidth; c.classList.add('me-flash'); }
  };
  if (typeof renderMe === 'function' && !renderMe._pp) {
    const _m = renderMe;
    renderMe = function () {
      _m.apply(this, arguments);
      const v = document.getElementById('view-me'); if (!v) return; let bar = v.querySelector(':scope > .me-jump');
      if (moreTab !== 'home') { if (bar) bar.remove(); return; }
      const html = `<span>Jump to</span>${JUMP.map(([l, t]) => `<button onclick="meJump('${t}')">${l}</button>`).join('')}`;
      if (!bar) { bar = document.createElement('div'); bar.className = 'me-jump'; const sg = v.querySelector(':scope > .sh-seg'); if (sg) sg.after(bar); else v.prepend(bar); }
      if (bar.innerHTML !== html) bar.innerHTML = html;
    };
    renderMe._pp = 1;
  }

  const st = document.createElement('style'); st.id = 'parity-css';
  st.textContent = `
  .ph-rail,.ph-day{margin-top:18px;padding-top:12px;border-top:1px solid var(--line)}
  .ph-k{font:600 11px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 2px 10px}
  .ph-day .dk-col3{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ph-day .dk-col3>.card{margin:0}.ph-day .dk-rings,.ph-day .bf-card,.ph-day .dk-money{grid-column:1/-1}
  .ph-tl{margin-top:10px;border:1px solid var(--line);border-radius:4px;padding:0 10px}.ph-tl summary{padding:12px 0;font:600 12px/1 var(--mono,monospace);letter-spacing:.06em;color:var(--muted);cursor:pointer}
  .ph-tl #dk-tl{max-height:60vh;overflow:auto}
  .me-jump{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 12px;padding:2px 0;align-items:center}.me-jump::-webkit-scrollbar{display:none}
  .me-jump span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);white-space:nowrap;margin-right:4px}
  .me-jump button{flex:none;min-height:36px;padding:0 12px;background:transparent;border:1px solid #262B32;border-radius:4px;color:var(--text);font-weight:600;font-size:12px;line-height:1;font-family:inherit;white-space:nowrap;cursor:pointer}
  .me-jump button:active{border-color:var(--acc)}
  .me-flash{animation:meFlash 1.2s ease-out}@keyframes meFlash{0%{box-shadow:0 0 0 2px var(--acc)}100%{box-shadow:0 0 0 2px transparent}}
  @media (max-width:700px){.mn-row .a{display:inline!important;font-size:10.5px}.mn2-up em{display:block!important;font-size:11px}.trl-lg{display:inline-block!important;font-size:10px;margin-left:6px}.trl-s .m{display:block!important;font-size:11px}}
  @media (max-width:560px){.idk-bar .btn.sm{display:inline-flex!important;max-width:44px;overflow:hidden;white-space:nowrap;padding:0 10px;font-size:0}.idk-bar .btn.sm:first-of-type::before{content:'‹';font-size:18px}.idk-bar .btn.sm:last-of-type::before{content:'›';font-size:18px}}
  @media (min-width:1280px){.ph-rail{display:none}}
  `;
  document.head.appendChild(st);
})();
