/* War Room 9.4 · APP LOCK — PIN + Face ID / fingerprint / Windows Hello (WebAuthn platform authenticator), per device.
   Loaded in <head> so the app is hidden before anything paints. Settings: Me → Appearance → App lock.
   Honest limits: this is a device lock (like a phone app's passcode). It stops someone picking up your phone or laptop;
   it is not encryption of your synced data. Forgot the PIN → unlock with your sync code. */
(function () {
  'use strict';
  const K = 'wr-lock', get = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } }, put = (v) => { try { v ? localStorage.setItem(K, JSON.stringify(v)) : localStorage.removeItem(K); } catch (e) { } };
  const on = () => { const c = get(); return !!(c && c.on && (c.pin || c.cred)); };
  /* 13.6.2 smart unlock, like Android Smart Lock:
     · "still with you": unlocked recently on this device (the "Lock again after" window) → no PIN, also after a reload
       or after the app was closed. The time of last use is kept on this device only.
     · trusted places: within ~250 m of a place you saved (Home…) → unlocks by itself. Coordinates never leave the device. */
  const SEEN = 'wr-lock-seen', seenSet = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch (e) { } };
  const winMs = () => { const c = get() || {}; return Math.max(Number(c.relock ?? 1), 0.5) * 60000; };
  const fresh = () => { try { const t = Number(localStorage.getItem(SEEN)) || 0; return t && Date.now() - t < winMs(); } catch (e) { return false; } };
  let unlocked = false;
  if (on() && !fresh()) document.documentElement.classList.add('wr-locked'); else unlocked = true;
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function hash(pin, salt) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)); return b64(d); }
  /* 13.3.5: inside the Android app (Capacitor WebView) the web way (WebAuthn) does not exist, so the phone's own
     fingerprint / face prompt is used through the native plugin (app 1.3+). Browsers keep WebAuthn. */
  const NAT = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.nativePromise);
  const nat = (m, a) => window.Capacitor.nativePromise('WrNative', m, a || {});
  async function natBio() { if (!NAT()) return false; try { const r = await nat('bioAvailable'); return !!(r && r.available); } catch (e) { return false; } }
  async function webBio() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } }
  /* 13.13.2: never wait forever. Android WebView can leave these promises hanging, which kept the Settings card from ever drawing. */
  const within = (pr, ms) => Promise.race([pr, new Promise((r) => setTimeout(() => r(false), ms))]);
  let bioKnown = null;
  async function bioAvailable() { const v = (await within(natBio(), 1500)) || (await within(webBio(), 1500)); bioKnown = !!v; return bioKnown; }
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
    if (!on()) return; unlocked = false; document.documentElement.classList.add('wr-locked'); entry = ''; draw(); document.getElementById('lock').classList.add('on');
    const c = get(); placeCheck(c, auto); 
  }
  function placeCheck(c, auto) {
    const ps = c.places || [];
    const fallback = () => { if (!unlocked && auto !== false && c.cred) setTimeout(bio, 250); };
    if (!ps.length || !navigator.geolocation) return fallback();
    let done = false; const t = setTimeout(() => { if (!done) { done = true; fallback(); } }, 3500);
    navigator.geolocation.getCurrentPosition((p) => { if (done) return; done = true; clearTimeout(t);
      const hit = ps.find((x) => dist(x, p.coords) <= 250 + Math.min(p.coords.accuracy || 0, 250));
      if (hit && !unlocked) { unlock(); toastSafe('Unlocked · at ' + hit.n); } else fallback(); },
      () => { if (!done) { done = true; clearTimeout(t); fallback(); } }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 3000 });
  }
  function dist(a, b) { const R = 6371000, r = Math.PI / 180, dl = (b.latitude - a.lat) * r, dn = (b.longitude - a.lon) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.latitude * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  function addPlace() {
    if (!navigator.geolocation) { alert('Location is not available here.'); return; }
    const n = (prompt('Name this place (it unlocks by itself within ~250 m):', 'Home') || '').trim(); if (!n) return;
    navigator.geolocation.getCurrentPosition((p) => { const c = get() || { relock: 1 }; c.places = (c.places || []).concat([{ n, lat: +p.coords.latitude.toFixed(5), lon: +p.coords.longitude.toFixed(5) }]); put(c); refresh(); toastSafe(n + ' is a trusted place.'); },
      (e) => alert(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? 'The phone app needs an update to use location. Open War Room in Chrome (or the home-screen icon from Chrome) to save the place there.' : 'Could not get your location: ' + (e && e.message ? e.message : 'permission denied') + '. Allow location for this site and try again.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  function removePlace(i) { const c = get(); if (!c || !c.places) return; c.places.splice(i, 1); put(c); refresh(); }
  function unlock() { unlocked = true; seenSet(); const el = document.getElementById('lock'); if (el) el.classList.remove('on'); document.documentElement.classList.remove('wr-locked'); entry = ''; }
  async function key(n) {
    const c = get(); if (!c || busy) return; if (entry.length >= (c.len || 4)) return; entry += String(n); draw();
    if (entry.length === (c.len || 4)) { busy = true; const ok = (await hash(entry, c.salt)) === c.pin; busy = false;
      if (ok) { c.fails = 0; put(c); unlock(); } else { c.fails = (c.fails || 0) + 1; put(c); entry = ''; draw(c.fails >= 5 ? 'Wrong PIN. Wait a moment.' : 'Wrong PIN'); const el = document.querySelector('#lock .lk-dots'); if (el) { el.classList.add('shake'); } if (c.fails >= 5) { busy = true; setTimeout(() => { busy = false; draw(); }, 15000); } } }
  }
  function del() { entry = entry.slice(0, -1); draw(); }
  async function bio() {
    const c = get(); if (!c || !c.cred || busy) return; busy = true;
    try {
      if (c.cred === 'native') await nat('bioAuth', { title: 'Unlock War Room', cancel: c.pin ? 'Use PIN' : 'Cancel' });
      else await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(c.cred) }], userVerification: 'required', timeout: 60000 } });
      busy = false; unlock(); }
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
    if (await natBio()) {
      try { await nat('bioAuth', { title: 'Turn on fingerprint / face unlock', cancel: 'Cancel' }); const c = get() || { relock: 1 }; c.cred = 'native'; c.on = true; put(c); refresh(); toastSafe('Fingerprint / face unlock is on for this phone.'); }
      catch (e) { alert('Not set up: ' + (e && e.message ? e.message : 'cancelled')); }
      return;
    }
    if (!(await webBio())) { alert(NAT() ? 'Update the War Room Android app (version 1.3) to use your fingerprint or face, and make sure one is set up in the phone settings.' : 'This device has no Face ID / fingerprint / Windows Hello available to the browser.'); return; }
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
  async function card() { await bioAvailable(); return cardHtml(); }
  function cardHtml() {
    const c = get() || {}, bioOk = !!bioKnown;
    return `<div class="card" id="lock-card"><div class="card-h"><div class="card-t">App lock</div><div class="card-r">this device</div></div>
      <div class="small muted" style="margin-bottom:10px">Ask for a PIN${bioOk ? ', your face or your fingerprint' : ''} when the app opens, so nobody else can open your War Room.</div>
      <div class="lk-row"><span>Lock</span><button class="btn sm ${on() ? 'primary' : ''}" onclick="wrLock.toggle()">${on() ? 'On' : 'Off'}</button></div>
      <div class="lk-row"><span>PIN</span><button class="btn sm" onclick="wrLock.setPin()">${c.pin ? 'Change PIN' : 'Set a PIN'}</button></div>
      <div class="lk-row"><span>Face / fingerprint${bioOk ? '' : NAT() ? ' <em>(update the Android app to 1.3 · or add a fingerprint in phone settings)</em>' : ' <em>(not available on this device)</em>'}</span>${c.cred ? `<button class="btn sm" onclick="wrLock.removeBio()">Remove</button>` : `<button class="btn sm" ${bioOk ? '' : 'disabled'} onclick="wrLock.addBio()">Set up</button>`}</div>
      <div class="lk-row"><span>Lock again after</span><select onchange="wrLock.relock(this.value)">${[[0, 'Immediately'], [1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [60, '1 hour'], [240, '4 hours'], [720, '12 hours'], [1440, '24 hours']].map(([v, l]) => `<option value="${v}" ${Number(c.relock ?? 1) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="lk-row"><span>Trusted places <em>(no PIN within ~250 m)</em></span><button class="btn sm" onclick="wrLock.addPlace()">Add this place</button></div>
      ${(c.places || []).map((x, i) => `<div class="lk-row"><span>📍 ${String(x.n).replace(/[<>&]/g, '')}</span><button class="btn sm ghost" onclick="wrLock.removePlace(${i})">Remove</button></div>`).join('')}
      ${c.pin || c.cred ? `<button class="btn sm ghost" style="margin-top:8px" onclick="wrLock.off()">Remove the lock from this device</button>` : ''}</div>`;
  }
  window.wrLock = { cardHtml, key, del, bio, forgot, setPin, addBio, off, toggle, relock, removeBio, show, card, on, addPlace, removePlace };

  document.addEventListener('visibilitychange', () => { if (!on()) return; if (document.hidden) { if (unlocked) { hiddenAt = Date.now(); seenSet(); } return; } const c = get(); if (hiddenAt && Date.now() - hiddenAt >= (Number(c.relock ?? 1)) * 60000) show(); });
  window.addEventListener('pagehide', () => { if (on() && unlocked) seenSet(); });
  setInterval(() => { if (on() && unlocked && !document.hidden) seenSet(); }, 30000);
  const boot = () => { if (on() && !unlocked) show(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* settings card inside Me → Appearance (after the app's scripts load) */
  window.addEventListener('load', () => {
    if (typeof appearanceCard === 'function' && !appearanceCard._lk) {
      const _a = appearanceCard;
      /* draw the card right away (works on every phone), then refresh the face/fingerprint row once the check answers */
      appearanceCard = function () { if (bioKnown === null) bioAvailable().then(() => { const el = document.getElementById('lock-card'); if (el) el.outerHTML = cardHtml(); }); return cardHtml() + _a(); };
      appearanceCard._lk = 1;
    }
  });
})();
