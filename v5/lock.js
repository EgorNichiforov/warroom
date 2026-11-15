/* War Room 9.4 · APP LOCK — PIN + Face ID / fingerprint / Windows Hello (WebAuthn platform authenticator), per device.
   Loaded in <head> so the app is hidden before anything paints. Settings: Me → Appearance → App lock.
   Honest limits: this is a device lock (like a phone app's passcode). It stops someone picking up your phone or laptop;
   it is not encryption of your synced data. Forgot the PIN → unlock with your sync code. */
(function () {
  'use strict';
  const K = 'wr-lock', get = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } }, put = (v) => { try { v ? localStorage.setItem(K, JSON.stringify(v)) : localStorage.removeItem(K); } catch (e) { } };
  const on = () => { const c = get(); return !!(c && c.on && (c.pin || c.cred)); };
  if (on()) document.documentElement.classList.add('wr-locked');
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function hash(pin, salt) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)); return b64(d); }
  async function bioAvailable() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } }
  let entry = '', busy = false, hiddenAt = 0;

  function overlay() {
    let el = document.getElementById('lock'); if (el) return el;
    el = document.createElement('div'); el.id = 'lock'; document.body.appendChild(el); return el;
  }
  function draw(msg) {
    const c = get() || {}, el = overlay();
    el.innerHTML = `<div class="lk-in"><div class="lk-logo">WAR ROOM</div><div class="lk-t">${c.pin ? 'Enter your PIN' : 'Locked'}</div>
      <div class="lk-dots">${c.pin ? Array.from({ length: c.len || 4 }, (_, i) => `<i class="${i < entry.length ? 'on' : ''}"></i>`).join('') : ''}</div><div class="lk-msg">${msg || ''}</div>
      ${c.pin ? `<div class="lk-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'bio', 0, 'del'].map((k) => k === 'bio' ? (c.cred ? `<button class="lk-k f" onclick="wrLock.bio()" aria-label="Face or fingerprint">${faceIcon()}</button>` : '<span></span>') : k === 'del' ? `<button class="lk-k f" onclick="wrLock.del()" aria-label="Delete">⌫</button>` : `<button class="lk-k" onclick="wrLock.key(${k})">${k}</button>`).join('')}</div>`
        : `<button class="lk-big" onclick="wrLock.bio()">${faceIcon()} Unlock</button>`}
      <button class="lk-forgot" onclick="wrLock.forgot()">Forgot? Use your sync code</button></div>`;
  }
  function faceIcon() { return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 10v1M15 10v1M12 10v3h-1M9.5 16c1.5 1 3.5 1 5 0"/></svg>'; }
  function show(auto) {
    if (!on()) return; document.documentElement.classList.add('wr-locked'); entry = ''; draw(); document.getElementById('lock').classList.add('on');
    const c = get(); if (auto !== false && c.cred) setTimeout(bio, 250);
  }
  function unlock() { const el = document.getElementById('lock'); if (el) el.classList.remove('on'); document.documentElement.classList.remove('wr-locked'); entry = ''; }
  async function key(n) {
    const c = get(); if (!c || busy) return; if (entry.length >= (c.len || 4)) return; entry += String(n); draw();
    if (entry.length === (c.len || 4)) { busy = true; const ok = (await hash(entry, c.salt)) === c.pin; busy = false;
      if (ok) { c.fails = 0; put(c); unlock(); } else { c.fails = (c.fails || 0) + 1; put(c); entry = ''; draw(c.fails >= 5 ? 'Wrong PIN. Wait a moment.' : 'Wrong PIN'); const el = document.querySelector('#lock .lk-dots'); if (el) { el.classList.add('shake'); } if (c.fails >= 5) { busy = true; setTimeout(() => { busy = false; draw(); }, 15000); } } }
  }
  function del() { entry = entry.slice(0, -1); draw(); }
  async function bio() {
    const c = get(); if (!c || !c.cred || busy) return; busy = true;
    try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(c.cred) }], userVerification: 'required', timeout: 60000 } }); busy = false; unlock(); }
    catch (e) { busy = false; draw(c.pin ? 'Use your PIN' : 'Not recognised. Try again.'); }
  }
  function forgot() {
    const v = prompt('Type your War Room sync code to unlock and turn the lock off on this device:'); if (!v) return;
    let code = ''; try { code = (typeof S !== 'undefined' && S.settings && S.settings.sync && S.settings.sync.code) || ''; } catch (e) { }
    const ok = !!code && v.trim() === code;
    if (ok) { put(null); unlock(); alert('Lock removed on this device. Set a new one in Me → Appearance.'); } else draw('That is not your sync code');
  }

  /* settings */
  async function setPin() {
    const a = prompt('New PIN (4 to 6 digits):'); if (a == null) return; if (!/^\d{4,6}$/.test(a)) { alert('Use 4 to 6 digits.'); return; }
    const b = prompt('Type it again:'); if (b !== a) { alert('PINs did not match.'); return; }
    const c = get() || { relock: 1 }, salt = b64(crypto.getRandomValues(new Uint8Array(16))); Object.assign(c, { on: true, salt, pin: await hash(a, salt), len: a.length, fails: 0 }); put(c); refresh(); toastSafe('PIN set. The app now locks on this device.');
  }
  async function addBio() {
    if (!(await bioAvailable())) { alert('This device has no Face ID / fingerprint / Windows Hello available to the browser.'); return; }
    try {
      const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'War Room', id: location.hostname }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'warroom', displayName: 'War Room' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
      const c = get() || { relock: 1 }; c.cred = b64(cred.rawId); c.on = true; put(c); refresh(); toastSafe('Face / fingerprint unlock is on for this device.');
    } catch (e) { alert('Could not set it up: ' + (e && e.message ? e.message : 'cancelled')); }
  }
  function off() { if (!confirm('Turn the app lock off on this device?')) return; put(null); refresh(); toastSafe('App lock is off on this device.'); }
  function toggle() { const c = get(); if (!c || !(c.pin || c.cred)) { setPin(); return; } c.on = !c.on; put(c); refresh(); toastSafe(c.on ? 'App lock on' : 'App lock paused'); }
  function relock(v) { const c = get() || {}; c.relock = Number(v); put(c); refresh(); }
  function removeBio() { const c = get(); if (!c) return; delete c.cred; if (!c.pin) c.on = false; put(c); refresh(); }
  function refresh() { try { if (typeof render === 'function') render(); } catch (e) { } }
  function toastSafe(m) { try { toast(m); } catch (e) { } }
  async function card() {
    const c = get() || {}, bioOk = await bioAvailable();
    return `<div class="card" id="lock-card"><div class="card-h"><div class="card-t">App lock</div><div class="card-r">this device</div></div>
      <div class="small muted" style="margin-bottom:10px">Ask for a PIN${bioOk ? ', your face or your fingerprint' : ''} when the app opens, so nobody else can open your War Room.</div>
      <div class="lk-row"><span>Lock</span><button class="btn sm ${on() ? 'primary' : ''}" onclick="wrLock.toggle()">${on() ? 'On' : 'Off'}</button></div>
      <div class="lk-row"><span>PIN</span><button class="btn sm" onclick="wrLock.setPin()">${c.pin ? 'Change PIN' : 'Set a PIN'}</button></div>
      <div class="lk-row"><span>Face / fingerprint${bioOk ? '' : ' <em>(not available on this device)</em>'}</span>${c.cred ? `<button class="btn sm" onclick="wrLock.removeBio()">Remove</button>` : `<button class="btn sm" ${bioOk ? '' : 'disabled'} onclick="wrLock.addBio()">Set up</button>`}</div>
      <div class="lk-row"><span>Lock again after</span><select onchange="wrLock.relock(this.value)">${[[0, 'Immediately'], [1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour']].map(([v, l]) => `<option value="${v}" ${Number(c.relock ?? 1) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${c.pin || c.cred ? `<button class="btn sm ghost" style="margin-top:8px" onclick="wrLock.off()">Remove the lock from this device</button>` : ''}</div>`;
  }
  window.wrLock = { key, del, bio, forgot, setPin, addBio, off, toggle, relock, removeBio, show, card, on };

  document.addEventListener('visibilitychange', () => { if (!on()) return; if (document.hidden) { hiddenAt = Date.now(); return; } const c = get(); if (hiddenAt && Date.now() - hiddenAt >= (Number(c.relock ?? 1)) * 60000) show(); });
  const boot = () => { if (on()) show(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* settings card inside Me → Appearance (after the app's scripts load) */
  window.addEventListener('load', () => {
    if (typeof appearanceCard === 'function' && !appearanceCard._lk) {
      const _a = appearanceCard;
      appearanceCard = function () { setTimeout(async () => { const el = document.getElementById('lock-slot'); if (el) el.outerHTML = await card(); }, 0); return '<div id="lock-slot"></div>' + _a(); };
      appearanceCard._lk = 1;
    }
  });
})();
