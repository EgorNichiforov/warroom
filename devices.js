/* War Room v5 · devices: which phones and laptops share this War Room, and a one-link way to join another one.
   Each device stamps itself into S.devices when it syncs. Devices on a different sync code cannot see each other,
   so the screen says so plainly and offers the link. */
'use strict';

const DEV_KEY = 'wr-device';
function devInfo() {
  let d = null; try { d = JSON.parse(localStorage.getItem(DEV_KEY) || 'null'); } catch (e) { }
  if (!d || !d.id) {
    const ua = navigator.userAgent || '', phone = /iPhone|Android.*Mobile|Mobile Safari/i.test(ua) || (window.innerWidth < 700 && 'ontouchstart' in window);
    const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Device';
    d = { id: 'd' + uid(), name: phone ? (os === 'iPhone' || os === 'Android' ? os + ' (phone)' : 'Phone') : os + ' (laptop)' };
    try { localStorage.setItem(DEV_KEY, JSON.stringify(d)); } catch (e) { }
  }
  return d;
}
function devStamp() { const d = devInfo(); S.devices = S.devices || {}; S.devices[d.id] = { _u: now(), name: d.name, v: APP_VERSION, seen: now() }; }
function devList() { const me = devInfo().id; return Object.entries(S.devices || {}).filter(([, x]) => x && !x._del).map(([id, x]) => Object.assign({ id, me: id === me }, x)).sort((a, b) => (b.me - a.me) || (b.seen - a.seen)); }
function agoText(t) { const m = Math.round((now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
function codeTail() { const c = (S.settings.sync || {}).code || ''; return c ? '…' + c.slice(-4) : 'none'; }
function syncSummary() {
  if (!syncReady()) return { ok: false, short: 'not synced', line: 'Sync is off on this device. Its data lives only here.' };
  const others = devList().filter((x) => !x.me && now() - x.seen < 30 * 864e5);
  if (syncState.status === 'err') return { ok: false, short: 'sync error', line: 'Sync failed: ' + (syncState.msg || 'no connection') + '. Changes are kept here and go up when it works again.' };
  if (!others.length) return { ok: false, short: 'only this device', line: `No other device has synced on this code (${codeTail()}) yet. If your phone or laptop shows a different code, they are not connected: use “Link a device”.` };
  return { ok: true, short: `${others.length + 1} devices linked`, line: `Linked with ${others.map((x) => esc(x.name)).join(', ')} · same code ${codeTail()}` };
}

function devicesCard() {
  const s = syncSummary(), list = devList(), ai = aiCfg();
  return `<div class="card"><div class="card-h"><div class="card-t">Devices &amp; sync</div><span class="pill ${s.ok ? 'on' : 'warn'}">${s.short}</span></div>
    <div class="small ${s.ok ? 'muted' : ''}" style="margin-bottom:10px">${s.line}</div>
    ${list.length ? list.map((x) => `<div class="kv"><span>${x.me ? '<b>This device</b> · ' : ''}${esc(x.name)}${x.me ? ` <a href="#" onclick="devRename();return false">rename</a>` : ''}</span><span class="small muted">${x.me ? 'v' + APP_VERSION : 'synced ' + agoText(x.seen) + (x.v ? ' · v' + esc(x.v) : '')}</span></div>`).join('') : ''}
    <div class="kv"><span>Sync code on this device</span><span class="v mono">${codeTail()}</span></div>
    <div class="kv"><span>Food photo AI</span><span class="small ${ai.key ? 'ok' : 'muted'}">${ai.key ? (ai.shared ? 'on · shared with linked devices' : 'on · this device only') : 'off'}</span></div>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary grow" onclick="linkModal()">Link a device</button><button class="btn" onclick="devSyncNow()">Sync now</button></div></div>`;
}
function devRename() { const d = devInfo(), n = prompt('Name for this device', d.name); if (!n) return; d.name = n.trim().slice(0, 30); try { localStorage.setItem(DEV_KEY, JSON.stringify(d)); } catch (e) { } devStamp(); save(true); render(); }
async function devSyncNow() { if (!syncReady()) { linkModal(); return; } devStamp(); await pushCloud(); await pullCloud(false); try { await qPull(true); await bPull(true); } catch (e) { } render(); }
function linkUrl() { return location.origin + location.pathname + '?link=' + encodeURIComponent(S.settings.sync.code); }
function linkModal() {
  if (!syncReady()) { const s = S.settings.sync; s.code = s.code || genCode(); save(true); pullCloud(true).then(() => { devStamp(); save(true); linkModal(); }); return; }
  openModal(`<h2>Link a device</h2>
    <div class="hint" style="margin-bottom:12px">Open this link on the other device (phone or laptop). It joins this War Room: both sides merge, nothing is deleted, and from then on they stay in sync.</div>
    <div class="field"><label>Link for your other device</label><input id="lk-url" readonly value="${esc(linkUrl())}" onclick="this.select()"></div>
    <div class="row" style="gap:8px;margin-bottom:12px"><button class="btn primary grow" onclick="linkShare()">${navigator.share ? 'Send it' : 'Copy link'}</button><button class="btn grow" onclick="linkCopy()">Copy</button></div>
    <div class="xs muted" style="margin-bottom:14px">Send it to yourself (Telegram “Saved messages”, an email to yourself). Anyone who has this link can see your War Room, so keep it to yourself.</div>
    <div class="sec-h">Or type the code on the other device</div>
    <div class="small muted" style="margin-bottom:6px">On the other device: More → Devices &amp; sync → Link a device → “Join with a code”.</div>
    <div class="field"><label>Join with a code</label><div class="inline"><input id="lk-code" autocapitalize="off" autocomplete="off" placeholder="paste the code or the link"><button class="btn" onclick="linkJoin(document.getElementById('lk-code').value)">Join</button></div></div>`, true);
}
function linkCopy() { const i = $('lk-url'); try { navigator.clipboard.writeText(i.value).then(() => toast('Link copied')); } catch (e) { i.select(); document.execCommand('copy'); toast('Link copied'); } }
function linkShare() { if (navigator.share) navigator.share({ title: 'War Room link', url: $('lk-url').value }).catch(() => { }); else linkCopy(); }
async function linkJoin(raw) {
  let code = String(raw || '').trim(); const m = code.match(/[?&]link=([^&\s]+)/); if (m) code = decodeURIComponent(m[1]);
  if (code.length < 16) { toast('That code is too short'); return; }
  if (code === S.settings.sync.code) { closeModal(); toast('This device is already on that War Room'); return; }
  S.settings.sync.code = code; save(true); closeModal(); toast('Joining…');
  await pullCloud(true); devStamp(); save(true); await pushCloud();
  try { await qPull(true); await bPull(true); } catch (e) { }
  render(); toast(syncState.status === 'err' ? 'Could not reach the cloud: ' + syncState.msg : 'Linked. This device now shares the same War Room.');
}
function linkFromUrl() {
  const m = location.search.match(/[?&]link=([^&]+)/); if (!m) return; const code = decodeURIComponent(m[1]); history.replaceState(null, '', location.pathname);
  if (code === S.settings.sync.code) { toast('Already linked'); return; }
  openModal(`<h2>Join this War Room?</h2><div class="hint" style="margin-bottom:12px">This device ${syncReady() ? `is on another sync code (${codeTail()})` : 'is not synced yet'}. Joining merges what is here with the linked War Room, keeps the newest version of every entry, and keeps both devices in sync from now on.</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Not now</button><button class="btn primary" onclick="linkJoin('${esc(code)}')">Join and merge</button></div>`, true);
}
/* heartbeat: once every 10 minutes while open, so the other device sees this one as alive */
function devHeartbeat() { if (!syncReady()) return; const me = (S.devices || {})[devInfo().id]; if (!me || now() - me.seen > 10 * 60000 || me.v !== APP_VERSION) { devStamp(); save(); } }
