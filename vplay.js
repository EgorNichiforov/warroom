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

/* 13.20.6 · Android app older than 1.7 can hand YouTube videos to the YouTube app: say so once a day, with the update link. */
(function () {
  try {
    const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return;
    const k = 'wr-apk-nag', today = new Date().toISOString().slice(0, 10);
    C.nativePromise('WrNative', 'info', {}).then((o) => {
      const v = parseFloat((o && o.version) || '0'); if (v >= 1.8) return;
      try { if (localStorage.getItem(k) === today) return; localStorage.setItem(k, today); } catch (e) { }
      setTimeout(() => { if (typeof openModal === 'function') openModal(`<div class="vp"><div class="vp-h"><b>Update the War Room app</b><span>app ${esc(String((o && o.version) || 'old'))} → 1.8</span></div><div class="small" style="margin-bottom:12px">This version can send course videos out to YouTube. 1.8 keeps every video playing here and gives Drive mode its voice. Takes 30 seconds, nothing is lost.</div></div><div class="actions"><button class="btn" onclick="closeModal()">Later</button><a class="btn primary" href="https://egornichiforov.github.io/warroom/download/WarRoom.apk">Download 1.8</a></div>`); }, 2500);
    }).catch(() => { });
  } catch (e) { }
})();

/* 13.20.7 · THE DOCK: one player that lives outside every screen, so a re-render (sync, clock tick, unlock) never
   restarts a video, and it keeps playing while you move around the app. Remembers where you stopped per video
   (YouTube: exact second via the player's own messages; Mux: estimated from play time) and resumes from there. */
const VD = { src: null };
function vdKey(src) { return src.yt ? 'yt:' + src.yt : 'mux:' + src.mux; }
function vdAll() { try { return JSON.parse(localStorage.getItem('wr-vpos') || '{}'); } catch (e) { return {}; } }
function vdPosSet(k, t, label) {
  try { const o = vdAll(); o[k] = { t: Math.floor(t), at: Date.now(), label }; const ks = Object.keys(o); if (ks.length > 80) ks.sort((a, b) => o[a].at - o[b].at).slice(0, ks.length - 80).forEach((x) => delete o[x]); localStorage.setItem('wr-vpos', JSON.stringify(o)); } catch (e) { }
}
function vdUrl(src, s, e) {
  const st = Math.max(0, Math.floor(s || 0)), en = Math.floor(e || 0);
  if (src.mux) return `https://player.mux.com/${encodeURIComponent(src.mux)}?autoplay=true&playsinline=true${st ? `&start-time=${st}` : ''}&accent-color=%23C9A24A`;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(src.yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${st ? `&start=${st}` : ''}${en > st ? `&end=${en}` : ''}`;
}
function vdEl() { let d = document.getElementById('vp-dock'); if (!d) { d = document.createElement('div'); d.id = 'vp-dock'; document.body.appendChild(d); } return d; }
function vdPlay(src, s, e, label, opts) {
  if (typeof src === 'string') src = vpParse(src); if (!src) return;
  vdSave();
  const k = vdKey(src); s = Math.max(0, Math.floor(s || 0)); e = Math.floor(e || 0); let resumed = 0;
  if (!s && !(opts && opts.fresh)) { const p = vdAll()[k]; if (p && p.t > 20 && (!e || p.t < e - 5)) { s = p.t; resumed = 1; } }
  Object.assign(VD, { src, label: label || 'Video', key: k, start: s, end: e, t0: Date.now(), playMs: 0, visT: Date.now(), cur: s, yTime: 0, min: false });
  const d = vdEl(); d.className = 'on';
  d.innerHTML = `<div class="vd-h"><button class="vd-t" onclick="vdToggle()"><b>▶ ${esc(VD.label)}</b><span id="vd-time">${resumed ? (src.mux ? 'resumed at about ' : 'resumed at ') + vpClock(s) : (s ? 'from ' + vpClock(s) : 'from the start')}</span></button>${resumed ? '<button class="vd-b" onclick="vdPlay(VD.src,0,VD.end,VD.label,{fresh:1})">Start over</button>' : ''}<button class="vd-b" onclick="vdToggle()" aria-label="Minimize" id="vd-min">▾</button><button class="vd-b" onclick="vdClose()" aria-label="Close">✕</button></div>
    <div class="vd-f"><iframe id="vd-if" sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" src="${vdUrl(src, s, e)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  const f = document.getElementById('vd-if');
  f.addEventListener('load', () => { const hi = () => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (x) { } }; hi(); setTimeout(hi, 1500); });
}
function vdToggle() { const d = vdEl(); VD.min = !VD.min; d.classList.toggle('min', VD.min); const b = document.getElementById('vd-min'); if (b) b.textContent = VD.min ? '▴' : '▾'; }
function vdNowT() { if (!VD.src) return 0; if (VD.yTime) return VD.cur; const ms = VD.playMs + (document.hidden ? 0 : Date.now() - VD.visT); return VD.start + ms / 1000; }
function vdSave() { if (!VD.src) return; const t = vdNowT(); if (VD.end && t >= VD.end - 3) { vdPosSet(VD.key, 0, VD.label); return; } vdPosSet(VD.key, t, VD.label); }
function vdClose() { vdSave(); const d = vdEl(); d.className = ''; d.innerHTML = ''; VD.src = null; }
window.addEventListener('message', (ev) => {
  if (!VD.src || !VD.src.yt || !/youtube/.test(ev.origin || '')) return; let d = ev.data;
  try { if (typeof d === 'string') d = JSON.parse(d); } catch (x) { return; }
  if (d && d.event === 'infoDelivery' && d.info && typeof d.info.currentTime === 'number') { VD.cur = d.info.currentTime; VD.yTime = 1; }
});
setInterval(() => { if (!VD.src) return; vdSave(); const el = document.getElementById('vd-time'); if (el && VD.yTime) el.textContent = vpClock(VD.cur); }, 5000);
document.addEventListener('visibilitychange', () => { if (!VD.src) return; if (document.hidden) { VD.playMs += Date.now() - VD.visT; vdSave(); } else VD.visT = Date.now(); });
window.addEventListener('pagehide', vdSave);

/* every player in the app now opens in the dock */
vpOpen = function (src, s, e, label) { if (typeof src === 'string') src = vpParse(src); if (!src) return; vdPlay(src, s != null ? s : src.s, e != null ? e : src.e, label); };
if (typeof clPlay === 'function') {
  const _clPlay = clPlay;
  clPlay = function (t) {
    const e = typeof clEntry === 'function' ? clEntry() : null; if (!e || e.page) return _clPlay(t);
    const h = document.querySelector('.aq-page h2, .aq-rd h2'), title = (h ? h.textContent : 'Lesson').replace(/\s+/g, ' ').trim().slice(0, 70);
    vdPlay(e.yt ? { yt: e.yt } : { mux: e.pid }, t, e.yt ? e.e : 0, title, t ? null : null);
    const el = document.getElementById('cl-pl'); if (el) el.innerHTML = `<div class="vd-note">▶ Playing in the player at the bottom. It keeps going while you read or switch screens.</div><button class="cl-start" onclick="clPlay(${(e.s || 0)})"><i>▶</i><span>Play the whole lesson again</span></button>`;
  };
}
if (typeof xcPlayerHtml === 'function') {
  xcPlayerHtml = function (v, s, e, label) { const st = Math.max(0, (s || 0) - 3); vdPlay(String(v).length > 11 ? { mux: v } : { yt: v }, st, e || 0, label || 'The moment'); return `<div class="vd-note">▶ Playing in the player at the bottom${s ? ' from ' + vpClock(st) : ''}.</div>`; };
}
(function () {
  const st = document.createElement('style'); st.id = 'vdock-css';
  st.textContent = `#vp-dock{display:none;position:fixed;left:8px;right:8px;bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:950;max-width:560px;margin-left:auto;background:var(--bg2,#0d0d10);border:1px solid var(--ln,#2a2a2e);border-radius:12px;box-shadow:0 10px 30px rgb(0 0 0 / .45);overflow:hidden}
  #vp-dock.on{display:block}.vd-h{display:flex;align-items:center;gap:4px;padding:6px 6px 6px 10px}.vd-t{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;background:none;border:0;color:var(--ink,#eee);font:inherit;text-align:left;cursor:pointer;padding:2px 0}
  .vd-t b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.vd-t span{font:600 11px/1.3 var(--mono,monospace);color:var(--muted,#999)}
  .vd-b{flex:none;min-width:34px;height:32px;padding:0 8px;border:1px solid var(--ln,#2a2a2e);border-radius:8px;background:transparent;color:var(--ink,#eee);font:inherit;font-size:12px;cursor:pointer}
  .vd-f{position:relative;width:100%;aspect-ratio:16/9;background:#000}.vd-f iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  #vp-dock.min .vd-f{aspect-ratio:auto;height:1px;opacity:0}.vd-note{font-size:13px;color:var(--muted,#999);padding:8px 0}
  @media (min-width:900px){#vp-dock{bottom:16px;right:16px;left:auto;width:440px}}`;
  document.head.appendChild(st);
})();
