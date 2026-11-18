/* War Room 13.18 · clips.js — the real acquisition.com course videos, inside War Room, cut to the exact moment.
   lib/clips.json (built from the lesson transcripts): per course lesson → the Mux video of that lesson on acquisition.com
   + "moments": [start s, label, key, score] for every key idea (the bold phrases in the notes).
   - Lesson page: "▶ Watch the lesson" player + Key moments list. Tap a moment → the course video plays from that second.
   - Bold phrases in the notes that have a moment get a ▶ and play their moment when tapped.
   - Deep cards' "Full course lesson" link plays the lesson here instead of opening acquisition.com.
   Courses whose videos acquisition.com only serves on its own site (Wealth, Sales Teams) keep the link out. */
'use strict';

let CL = null, clLoading = false;
function clLoad() { if (CL || clLoading) return; clLoading = true; fetch('./lib/clips.json').then((r) => r.json()).then((d) => { CL = d; CL.byUrl = {}; Object.entries(d.c).forEach(([k, L]) => Object.entries(L).forEach(([i, e]) => { CL.byUrl[e.u.replace(/\/$/, '')] = { k, i: +i, e }; })); clLoading = false; try { if (typeof view !== 'undefined' && view === 'acq' && typeof render === 'function') render(); } catch (x) { } }).catch(() => { clLoading = false; }); }
clLoad();
function clKey(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 48); }
function clEntry() { const r = typeof acqRead !== 'undefined' && acqRead; if (!r || r.v || !CL || !CL.c[r.k]) return null; return CL.c[r.k][String(r.i)] || null; }
function clClock(s) { return typeof vpClock === 'function' ? vpClock(s) : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

function clSrc(e, t) {
  t = Math.max(0, Math.floor(t || 0));
  if (e.yt) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(e.yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&start=${t}${e.e ? '&end=' + e.e : ''}`;
  if (e.page) return e.page;
  return `https://player.mux.com/${encodeURIComponent(e.pid)}?autoplay=true&playsinline=true&start-time=${t}&accent-color=%23C9A24A`;
}
function clBox(e) {
  const mins = Math.round((e.dur || 0) / 60), base = e.s || 0;
  const src = e.src || 'acquisition.com';
  if (e.page) return `<div class="cl-box" id="cl-box"><div class="cl-h"><b>▶ The lesson video</b><span>${esc(src)}</span></div>
    <div class="cl-pl" id="cl-pl"><button class="cl-start" onclick="clPlay(0)"><i>▶</i><span>Open the lesson here (their player)</span></button></div>
    <div class="xs muted" style="margin-top:8px">acquisition.com only lets this course play on its own page, so War Room shows that page. Press play on their video.</div></div>`;
  return `<div class="cl-box" id="cl-box"><div class="cl-h"><b>▶ The lesson video</b><span>${esc(src)}${mins ? ' · ' + mins + ' min' : ''} · plays here</span></div>
    <div class="cl-pl" id="cl-pl"><button class="cl-start" onclick="clPlay(${base})"><i>▶</i><span>Watch the whole lesson</span></button></div>
    ${e.m && e.m.length ? `<div class="cl-mh">Key moments · ${e.m.length} · tap one to jump straight to it</div><div class="cl-ms">${e.m.map((m) => `<button onclick="clPlay(${m[0]})"><em>${clClock(m[0] - base)}</em><span>${esc(m[1])}</span></button>`).join('')}</div>` : ''}</div>`;
}
function clPlay(t) {
  const e = clEntry(), el = document.getElementById('cl-pl'); if (!e || !el) return;
  if (e.page) { el.innerHTML = `<div class="cl-page"><iframe src="${esc(e.page)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div><div class="xs muted" style="margin-top:6px">Scroll inside the frame to their video and press play.</div>`; return; }
  const base = e.s || 0;
  el.innerHTML = `<div class="exc-frame"><iframe sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" src="${clSrc(e, t)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <div class="xs muted" style="margin-top:6px">${t > base ? 'From ' + clClock(t - base) + ' into the lesson · ' : ''}${e.yt ? 'the full course video' : 'the real course video'}, playing in War Room.</div>`;
  document.getElementById('cl-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/* tag the bold phrases in the notes that have a moment */
function clTag() {
  const e = clEntry(), page = document.querySelector('.aq-page'); if (!e || !page || !e.m) return;
  const map = {}; e.m.forEach((m) => { if (!(m[2] in map)) map[m[2]] = m[0]; });
  page.querySelectorAll('b, strong').forEach((b) => { if (b.closest('.cl-box') || b.dataset.clt) return; const t = map[clKey(b.textContent)]; if (t == null) return; b.dataset.clt = t; b.classList.add('cl-b'); b.title = 'Play this moment (' + clClock(t) + ')'; });
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('.cl-b'); if (b) { ev.preventDefault(); ev.stopImmediatePropagation(); clPlay(+b.dataset.clt); return; }
  const a = ev.target.closest && ev.target.closest('a.xc-lesson[href]'); if (!a || !CL) return;
  const hit = CL.byUrl[a.getAttribute('href').replace(/\/$/, '')]; if (!hit) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  const words = new Set(String(a.dataset.t || '').toLowerCase().match(/[a-z]{4,}/g) || []);
  let m = null, bs = 0; (hit.e.m || []).forEach((x) => { const s = (x[1].toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => words.has(w)).length; if (s > bs) { bs = s; m = x; } });
  if (hit.e.page) { window.open(hit.e.page, '_blank'); return; }
  if (typeof vpOpen === 'function') vpOpen(hit.e.yt ? { yt: hit.e.yt } : { mux: hit.e.pid }, m ? m[0] : (hit.e.s || 0), 0, (a.textContent || 'Course lesson').replace(/\s+/g, ' ').trim().slice(0, 60));
}, true);

if (typeof acqReader === 'function' && !acqReader._cl) {
  const _r = acqReader;
  acqReader = function () { let h = _r.apply(this, arguments); try { const e = clEntry(); if (e) h = h.replace('</h2>', '</h2>' + clBox(e)); } catch (x) { } return h; };
  acqReader._cl = 1;
}
if (typeof render === 'function' && !render._cl) {
  const _rn = render;
  render = function () { const x = _rn.apply(this, arguments); try { if (view === 'acq') clTag(); } catch (e) { } return x; };
  render._cl = 1;
}
(function () {
  const st = document.createElement('style'); st.id = 'clips-css';
  st.textContent = `#view-acq,.aq,.aq-rd,.aq-page,.aq-tabs{min-width:0;max-width:100%}.aq,.aq-rd{grid-template-columns:minmax(0,1fr)}.aq-page{overflow-wrap:anywhere}
  .cl-box{border:1px solid rgb(var(--acc-rgb) / .35);border-radius:6px;padding:12px;margin:10px 0 16px;background:rgb(var(--acc-rgb) / .05)}
  .cl-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:10px}.cl-h b{font-size:14px}.cl-h span{font:600 10.5px/1.2 var(--mono,monospace);color:var(--muted);text-align:right}
  .cl-start{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:0 14px;border:1px solid var(--acc);border-radius:6px;background:transparent;color:var(--text);font:600 14px/1.2 inherit;cursor:pointer}.cl-start i{font-style:normal;color:var(--acc);font-size:18px}
  .cl-mh{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
  .cl-ms{display:flex;flex-direction:column;max-height:300px;overflow-y:auto}.cl-ms button{display:flex;gap:10px;align-items:baseline;text-align:left;padding:9px 2px;border:0;border-top:1px solid #1E2329;background:transparent;color:var(--text);font:500 13px/1.35 inherit;cursor:pointer}
  .cl-ms em{flex:none;width:44px;font:600 12px/1.35 var(--mono,monospace);font-style:normal;color:var(--acc)}
  .cl-page{position:relative;height:72vh;border-radius:6px;overflow:hidden;background:#fff}.cl-page iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .cl-b{cursor:pointer;text-decoration:underline;text-decoration-color:rgb(var(--acc-rgb) / .5);text-underline-offset:3px}.cl-b::after{content:' ▶';font-size:.75em;color:var(--acc)}`;
  document.head.appendChild(st);
})();
