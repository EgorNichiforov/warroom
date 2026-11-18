/* War Room 13.18 · vplay.js — every video plays INSIDE War Room.
   - Any link to YouTube (watch, youtu.be, shorts, embed) or a Mux course video anywhere in the app opens the
     in-app player sheet instead of leaving the app. Course pages keep their own inline panel (explain.js).
   - vpOpen(src, start, end, label): src = {yt:id} or {mux:playbackId}. Plays only the clip when start/end are known.
   - Android app 1.4 keeps these players inside the WebView (1.3 and older hand them to the YouTube app). */
'use strict';

function vpParse(href) {
  const h = String(href || '');
  let m = h.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) { const t = h.match(/[?&#](?:t|start)=(\d+)(?:s)?/), e = h.match(/[?&#]end=(\d+)/); return { yt: m[1], s: t ? +t[1] : 0, e: e ? +e[1] : 0 }; }
  m = h.match(/(?:stream|player)\.mux\.com\/([A-Za-z0-9]{20,})/);
  if (m) { const t = h.match(/[?&#](?:t|start|startTime)=(\d+)/), e = h.match(/[?&#]end=(\d+)/); return { mux: m[1], s: t ? +t[1] : 0, e: e ? +e[1] : 0 }; }
  return null;
}
function vpClock(s) { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
function vpFrame(src, s, e) {
  const st = Math.max(0, Math.floor(s || 0)), en = Math.floor(e || 0);
  if (src.mux) return `https://player.mux.com/${encodeURIComponent(src.mux)}?autoplay=true&playsinline=true${st ? `&start-time=${st}` : ''}&accent-color=%23C9A24A`;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(src.yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1${st ? `&start=${st}` : ''}${en > st ? `&end=${en}` : ''}`;
}
function vpHtml(src, s, e, label) {
  return `<div class="vp"><div class="vp-h"><b>▶ ${esc(label || 'Video')}</b><span>${s ? vpClock(s) : 'from the start'}${e > s ? ' → ' + vpClock(e) : ''}</span></div>
    <div class="exc-frame"><iframe sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" src="${vpFrame(src, s, e)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    ${e > s ? `<div class="xs muted" style="margin-top:6px">Plays only the clip that matters (${vpClock(e - s)}).</div>` : ''}</div>`;
}
function vpOpen(src, s, e, label) { if (typeof src === 'string') src = vpParse(src); if (!src) return; openModal(`${vpHtml(src, s != null ? s : src.s, e != null ? e : src.e, label)}<div class="actions"><button class="btn primary" onclick="closeModal()">Done</button></div>`); }

document.addEventListener('click', (ev) => {
  const a = ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
  if (a.closest('.aq-page')) return; /* course pages: explain.js plays it inline under the idea */
  const v = vpParse(a.getAttribute('href')); if (!v) return;
  ev.preventDefault(); ev.stopPropagation();
  vpOpen(v, v.s, v.e, (a.textContent || '').replace(/^\s*▶\s*/, '').trim().slice(0, 60) || 'Video');
}, true);

(function () {
  const st = document.createElement('style'); st.id = 'vplay-css';
  st.textContent = `.vp-h{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:8px}.vp-h b{font-size:14px}.vp-h span{font:600 11px/1 var(--mono,monospace);color:var(--muted)}`;
  document.head.appendChild(st);
})();
