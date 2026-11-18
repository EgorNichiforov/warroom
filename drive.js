/* War Room 13.21 · drive.js — learn in the car, and prove you know it.
   1. 🎧 DRIVE MODE: War Room reads your lessons out loud (the idea, the picture, the example, your move, the trap,
      the memory hook), then quizzes you out loud: question → you answer out loud → pause → the answer.
      Order: due reviews first (spaced repetition), then your next lessons, interleaved Business / Life.
      Hands-free, giant buttons, screen stays on. Voice: the browser's speech on desktop, the Android app's own
      voice from app 1.8. Listening does not mark a lesson done: it primes it, the lesson still has to be used.
   2. 🧑‍🏫 TEACH IT BACK: in a lesson's Recall step, after you compare, the AI grades your own-words explanation
      against the card (score, what you got, what you missed, one fix). Needs the AI key (More → Food photo AI). */
'use strict';

const DV = { on: false, q: [], i: 0, part: 0, parts: [], paused: false, rate: 1.0, timer: null, poll: null, tok: 0 };
const DV_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.nativePromise);
function dvNat(m, a) { return window.Capacitor.nativePromise('WrNative', m, a || {}); }
function dvPlain(t) { return String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`#>|]/g, '').replace(/\s*→\s*/g, ', then ').replace(/\s*×\s*/g, ' times ').replace(/\s*=\s*/g, ' equals ').replace(/\$(\d)/g, '$1 dollars ').replace(/\s+/g, ' ').trim(); }
function dvCanSpeak() { return DV_NATIVE || !!window.speechSynthesis; }

/* the playlist: due reviews first, then next lessons, alternating tracks */
function dvBuild() {
  if (typeof XC === 'undefined' || !XC || typeof BC === 'undefined' || !BC) return [];
  const due = (typeof bcDueCards === 'function' ? bcDueCards() : []).slice(0, 4).map((id) => ({ id, kind: 'review' }));
  const next = (tr) => { const out = []; for (const m of (typeof bcTrack === 'function' ? bcTrack(tr) : [])) { for (const c of m.cards) { if (!bcV('l:' + c, null)) out.push({ id: c, kind: 'new', mod: m.n }); if (out.length >= 3) return out; } } return out; };
  const b = next('biz'), l = next('life'), mix = [];
  for (let i = 0; i < 3; i++) { if (b[i]) mix.push(b[i]); if (l[i] && i < 2) mix.push(l[i]); }
  return due.concat(mix).filter((x) => XC.byId[x.id]).slice(0, 8);
}
function dvParts(item) {
  const c = XC.byId[item.id], P = [];
  P.push({ t: `${item.kind === 'review' ? 'Review' : 'New idea'}: ${dvPlain(c.t)}.${c.who ? ' From ' + dvPlain(c.who) + '.' : ''}`, lab: 'Intro' });
  if (item.kind === 'review') {
    P.push({ t: `Before I say it: what is ${dvPlain(c.t)}, and how would you use it on a call? Say it out loud now.`, lab: 'Recall', wait: 9 });
    P.push({ t: `Here it is. ${dvPlain(c.hook)}`, lab: 'The idea' });
    if (c.memo) P.push({ t: `Lock it in: ${dvPlain(c.memo)}`, lab: 'Memory hook' });
  } else {
    P.push({ t: dvPlain(c.hook), lab: 'The idea' });
    if (c.plain) P.push({ t: 'In plain words. ' + dvPlain(c.plain), lab: 'Plain words' });
    if (c.analogy) P.push({ t: 'Picture it. ' + dvPlain(c.analogy), lab: 'Picture it' });
    if (c.ex) P.push({ t: 'Example. ' + dvPlain(c.ex), lab: 'Example' });
    if (c.move) P.push({ t: 'Your move. ' + dvPlain(c.move), lab: 'Your move' });
    if (c.trap) P.push({ t: 'The trap. ' + dvPlain(c.trap), lab: 'The trap' });
    if (c.memo) P.push({ t: 'Lock it in. ' + dvPlain(c.memo), lab: 'Memory hook' });
  }
  (c.q || []).slice(0, item.kind === 'review' ? 1 : 2).forEach((x) => { P.push({ t: 'Question. ' + dvPlain(x[0]) + ' Answer out loud.', lab: 'Question', wait: 7 }); P.push({ t: 'Answer. ' + dvPlain(x[1]), lab: 'Answer' }); });
  P.push({ t: `Now say ${dvPlain(c.t)} in one sentence, as if you were telling an agency owner.`, lab: 'Teach it', wait: 8 });
  return P;
}

/* speech · 13.23.1: three voices, tested on the phone, automatic failover so it is never silent.
   1 Android app voice (TextToSpeech) · 2 the browser's voice (needs real voices: the app's WebView has none) ·
   3 Gemini AI voice (your AI key; works on any phone, prefetches the next sentence) · 4 last resort: reading mode
   that tells you exactly why there is no sound and how to fix it. */
const DV_ENG = { native: 'Android voice', web: 'Phone voice', cloud: 'AI voice (Gemini)', text: 'No voice: reading mode' };
let dvAC = null, dvSrc = null; const dvCache = new Map();
function dvUnlock() {
  try { dvAC = dvAC || new (window.AudioContext || window.webkitAudioContext)(); if (dvAC.state !== 'running') dvAC.resume(); const b = dvAC.createBuffer(1, 1, 22050), s = dvAC.createBufferSource(); s.buffer = b; s.connect(dvAC.destination); s.start(0); } catch (e) { }
  try { if (window.speechSynthesis && !DV_NATIVE) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { }
}
function dvVoices() { try { return window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { return []; } }
function dvVoice() { const v = dvVoices(); return v.find((x) => /^en[-_]US/i.test(x.lang) && x.localService) || v.find((x) => /^en[-_]US/i.test(x.lang)) || v.find((x) => /^en/i.test(x.lang)) || null; }
function dvCloudOk() { try { const c = aiCfg(); return !!(c.key && c.provider !== 'anthropic'); } catch (e) { return false; } }
function dvWait(ms) { return new Promise((r) => setTimeout(r, ms)); }
/* each engine: say(text) → Promise that resolves when finished, rejects if it cannot make sound */
async function dvNativeSay(text, tok) {
  let r = null; for (let k = 0; k < 10; k++) { r = await dvNat('speak', { text, rate: DV.rate }); if (r && r.ready) break; await dvWait(500); }
  if (!r || !r.ready) throw new Error('the Android voice engine did not start' + (r && r.err ? ' (' + r.err + ')' : ''));
  if (r.ok === false) throw new Error('the Android voice refused (' + (r.err || 'no English voice installed') + ')');
  let started = false; const t0 = Date.now();
  while (tok === DV.tok) { await dvWait(300); const st = await dvNat('speaking').catch(() => ({})); if (st.speaking) started = true; else if (started) return; else if (Date.now() - t0 > 3500) throw new Error('the Android voice made no sound'); }
}
function dvWebSay(text, tok) {
  return new Promise(async (res, rej) => {
    if (!window.speechSynthesis) return rej(new Error('this browser has no speech'));
    if (!dvVoices().length) { await new Promise((r) => { const t = setTimeout(r, 1500); try { speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); r(); }, { once: true }); } catch (e) { } }); }
    if (!dvVoices().length) return rej(new Error('no voices on this phone/browser'));
    if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); await dvWait(120); }
    const u = new SpeechSynthesisUtterance(text), v = dvVoice(); try { if (v) u.voice = v; } catch (e) { } u.lang = v ? v.lang : 'en-US'; u.rate = DV.rate;
    let started = false; u.onstart = () => { started = true; }; u.onend = () => res(); u.onerror = (e) => (started ? res() : rej(new Error('speech error: ' + (e.error || '?'))));
    speechSynthesis.speak(u); if (speechSynthesis.paused) speechSynthesis.resume();
    setTimeout(() => { if (!started && !speechSynthesis.speaking && tok === DV.tok) { speechSynthesis.cancel(); rej(new Error('the browser voice made no sound')); } }, 3000);
    /* Chrome stops long speech after ~15 s unless nudged */
    const keep = setInterval(() => { if (tok !== DV.tok || !speechSynthesis.speaking) { clearInterval(keep); return; } speechSynthesis.pause(); speechSynthesis.resume(); }, 10000);
  });
}
function dvCloudGet(text) {
  if (dvCache.has(text)) return dvCache.get(text);
  const p = (async () => {
    const c = aiCfg(); let last = null;
    for (const m of ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts']) {
      const r = await aiNet(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Read this clearly, like an energetic coach: ' + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } } }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { last = new Error((j.error && j.error.message) || 'HTTP ' + r.status); if (r.status === 404 || r.status === 400) continue; throw last; }
      const part = (((j.candidates || [])[0] || {}).content || {}).parts || [], d = (part.find((x) => x.inlineData) || {}).inlineData; if (!d) { last = new Error('no audio returned'); continue; }
      const rate = +((/rate=(\d+)/.exec(d.mimeType || '') || [])[1] || 24000), bin = atob(d.data), n = bin.length >> 1, f = new Float32Array(n);
      for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; f[i] = v / 32768; }
      return { f, rate };
    }
    throw last || new Error('no AI voice model answered');
  })();
  dvCache.set(text, p); p.catch(() => dvCache.delete(text)); if (dvCache.size > 40) dvCache.delete(dvCache.keys().next().value); return p;
}
async function dvCloudSay(text, tok) {
  const a = await dvCloudGet(text); if (tok !== DV.tok) return;
  dvAC = dvAC || new (window.AudioContext || window.webkitAudioContext)(); if (dvAC.state !== 'running') await dvAC.resume().catch(() => { });
  const buf = dvAC.createBuffer(1, a.f.length, a.rate); buf.copyToChannel ? buf.copyToChannel(a.f, 0) : buf.getChannelData(0).set(a.f);
  await new Promise((res) => { const s = dvAC.createBufferSource(); s.buffer = buf; s.playbackRate.value = DV.rate; s.connect(dvAC.destination); s.onended = res; dvSrc = s; s.start(0); });
}
function dvTextSay(text, tok) { return dvWait(Math.max(1800, text.split(/\s+/).length / 2.6 * 1000 / DV.rate)); }
const DV_SAY = { native: dvNativeSay, web: dvWebSay, cloud: dvCloudSay, text: dvTextSay };
function dvOrder() { return [DV_NATIVE ? 'native' : null, !DV_NATIVE ? 'web' : null, dvCloudOk() ? 'cloud' : null, 'text'].filter((e) => e && !(DV.bad || {})[e]); }
function dvPrefetch() { if (DV.eng !== 'cloud') return; const nx = DV.parts[DV.part + 1] || (DV.q[DV.i + 1] ? dvParts(DV.q[DV.i + 1])[0] : null); if (nx) dvCloudGet(nx.t).catch(() => { }); }

function dvStopVoice() { clearTimeout(DV.timer); clearInterval(DV.poll); DV.tok++; try { if (DV_NATIVE) dvNat('stopSpeak').catch(() => { }); if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel(); if (dvSrc) { dvSrc.onended = null; dvSrc.stop(); dvSrc = null; } } catch (e) { } }
function dvSay(text, done) {
  const tok = ++DV.tok, fin = () => { if (tok === DV.tok) done(); };
  if (!DV.eng) DV.eng = dvOrder()[0];
  dvPrefetch();
  DV_SAY[DV.eng](text, tok).then(fin).catch((e) => {
    if (tok !== DV.tok) return; DV.bad = DV.bad || {}; DV.bad[DV.eng] = (e && e.message) || 'failed'; DV.why = (DV.why || []).concat([DV_ENG[DV.eng] + ': ' + DV.bad[DV.eng]]);
    DV.eng = dvOrder()[0]; toast('Switching to ' + DV_ENG[DV.eng]); dvRender(); dvSay(text, done);
  });
}
async function dvTest() { dvUnlock(); dvStopVoice(); DV.eng = null; DV.bad = {}; DV.why = []; dvRender(); dvSay('Voice check. If you can hear this, Drive mode works.', () => dvRender()); }
function dvTtsSettings() { if (DV_NATIVE) dvNat('ttsSettings').catch(() => toast('Open Settings → Accessibility → Text-to-speech output')); else toast('Android: Settings → Accessibility → Text-to-speech output → install Speech Services by Google + English voice'); }
function dvStep() {
  if (!DV.on || DV.paused) return;
  const item = DV.q[DV.i]; if (!item) { dvRender(); dvSay(`Done. ${DV.q.length} ideas. Now use one of them on your next call.`, () => { DV.on = false; dvRender(); }); return; }
  const p = DV.parts[DV.part]; if (!p) { if (item.kind === 'new') bcW('h:' + item.id, dk(new Date())); DV.i++; DV.part = 0; DV.parts = DV.q[DV.i] ? dvParts(DV.q[DV.i]) : []; dvRender(); DV.timer = setTimeout(dvStep, 900); return; }
  dvRender();
  dvSay(p.t, () => { DV.part++; DV.timer = setTimeout(dvStep, (p.wait || 0.6) * 1000); });
}

/* controls */
function dvStart() {
    if (DV_NATIVE) dvNat('info').then((o) => { DV.appV = parseFloat((o && o.version) || '0'); }).catch(() => { });
  dvUnlock();
  DV.q = dvBuild(); if (!DV.q.length) { toast('Nothing to play: every lesson is done and nothing is due'); return; }
  Object.assign(DV, { on: true, i: 0, part: 0, parts: dvParts(DV.q[0]), paused: false, eng: null, bad: {}, why: [] });
  try { if (DV_NATIVE) dvNat('keepAwake', { on: true }).catch(() => { }); else if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { DV.lock = l; }).catch(() => { }); } catch (e) { }
  dvRender(); setTimeout(dvStep, 400);
}
function dvPause() { DV.paused = !DV.paused; if (DV.paused) dvStopVoice(); else { dvUnlock(); dvStep(); } dvRender(); }
function dvNext() { dvStopVoice(); DV.i++; DV.part = 0; DV.parts = DV.q[DV.i] ? dvParts(DV.q[DV.i]) : []; DV.paused = false; dvStep(); }
function dvBack() { dvStopVoice(); DV.part = Math.max(0, DV.part - 1); DV.paused = false; dvStep(); }
function dvRate() { DV.rate = DV.rate >= 1.5 ? 0.9 : Math.round((DV.rate + 0.2) * 10) / 10; try { localStorage.setItem('wr-dv-rate', DV.rate); } catch (e) { } dvRender(); }
function dvClose() { DV.on = false; dvStopVoice(); try { if (DV_NATIVE) dvNat('keepAwake', { on: false }).catch(() => { }); if (DV.lock) DV.lock.release(); } catch (e) { } const el = document.getElementById('dv'); if (el) el.remove(); }
try { const r = parseFloat(localStorage.getItem('wr-dv-rate')); if (r) DV.rate = r; } catch (e) { }

function dvRender() {
  let el = document.getElementById('dv'); if (!el) { el = document.createElement('div'); el.id = 'dv'; document.body.appendChild(el); }
  const item = DV.q[DV.i], c = item && XC.byId[item.id], p = DV.parts[DV.part] || DV.parts[DV.part - 1];
  el.innerHTML = `<div class="dv-top"><span>🎧 Drive mode · ${Math.min(DV.i + 1, DV.q.length)}/${DV.q.length}</span><button onclick="dvClose()" aria-label="Close">✕</button></div>
    ${c ? `<div class="dv-k">${item.kind === 'review' ? 'Review' : 'New'} · ${esc(p ? p.lab : '')}</div><div class="dv-t">${esc(c.t)}</div><div class="dv-s">${esc(p ? p.t : '')}</div>` : `<div class="dv-t">${DV.on ? 'Wrapping up…' : 'Done'}</div><div class="dv-s">Use one idea on your next call. Then mark the lesson in Learn.</div>`}
    <div class="dv-bar"><i style="width:${DV.q.length ? Math.round(DV.i / DV.q.length * 100) : 0}%"></i></div>
    <div class="dv-ctl"><button onclick="dvBack()">⏮<em>Repeat</em></button><button class="big" onclick="${DV.on ? 'dvPause()' : 'dvStart()'}">${!DV.on ? '▶' : DV.paused ? '▶' : '⏸'}<em>${!DV.on ? 'Again' : DV.paused ? 'Play' : 'Pause'}</em></button><button onclick="dvNext()">⏭<em>Next idea</em></button></div>
    <div class="dv-voice ${DV.eng === 'text' ? 'bad' : ''}"><span>🔊 ${esc(DV_ENG[DV.eng || dvOrder()[0]] || '')}</span><button onclick="dvTest()">Test voice</button><button onclick="dvRate()">Speed ${DV.rate.toFixed(1)}×</button></div>
    ${DV.eng === 'text' ? `<div class="dv-why"><b>No sound on this phone yet.</b> ${(DV.why || []).map((x) => esc(x)).join(' · ')}<br>Fix: ${DV_NATIVE ? 'install app 1.9, or ' : ''}install <b>Speech Services by Google</b> + an English voice (Settings → Text-to-speech), or add a Gemini AI key (More → Food photo AI) for the AI voice. <button onclick="dvTtsSettings()">Voice settings</button></div>` : ''}
    <div class="dv-n">Eyes on the road. Answer out loud: saying it is what makes it stick.</div>`;
}

/* ── Teach it back: AI grades your own-words explanation in the Recall step ── */
const TB_SYS = `You grade a student's own-words explanation of one business or life idea against the reference card. The student is Egor, building a caregiver-recruiting business by cold calling Florida home care agency owners. Be honest and specific, warm but not soft. Return ONLY JSON: {"score":1-5,"got":["what he got right, short"],"missed":["the most important missing or wrong pieces, short"],"fix":"one sentence he should say instead, in his voice","use":"one concrete way to use it on tonight's calls"}`;
async function tbGrade(btn) {
  const c = XC.byId[bcS.id], box = btn.closest('.tb'); if (!c || !box) return;
  const said = String(bcS.rc || '').trim(); if (said.length < 12) { toast('Write a sentence or two first, then grade it'); return; }
  if (typeof aiOn === 'function' && !aiOn()) { toast('Add the AI key in More → Food photo AI'); return; }
  box.innerHTML = '<span class="xs muted">Grading your explanation…</span>';
  try {
    const ref = `Idea: ${c.t}\nCore: ${c.hook}\nPlain: ${c.plain || ''}\nExample: ${c.ex || ''}\nMove: ${c.move || ''}\nTrap: ${c.trap || ''}`;
    const out = await aiText(TB_SYS, [{ role: 'user', text: `Reference card:\n${ref}\n\nHis explanation:\n${said}` }]);
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)), s = Math.max(1, Math.min(5, +j.score || 1));
    bcW('tb:' + c.id, { at: dk(new Date()), s });
    const li = (a) => (a || []).map((x) => `<li>${esc(x)}</li>`).join('');
    box.innerHTML = `<div class="tb-s"><b>${'★'.repeat(s)}${'☆'.repeat(5 - s)}</b><span>${s >= 4 ? 'You own this one.' : s === 3 ? 'Almost. Fix the gap below.' : 'Not yet. Read the card again, then say it again.'}</span></div>
      ${(j.got || []).length ? `<div class="tb-l ok"><span>You got</span><ul>${li(j.got)}</ul></div>` : ''}${(j.missed || []).length ? `<div class="tb-l bad"><span>You missed</span><ul>${li(j.missed)}</ul></div>` : ''}
      ${j.fix ? `<div class="tb-fix"><span>Say it like this</span>${esc(j.fix)}</div>` : ''}${j.use ? `<div class="tb-fix"><span>Use it tonight</span>${esc(j.use)}</div>` : ''}`;
  } catch (e) { box.innerHTML = `<span class="xs red">Couldn't grade right now (${esc(e.message || 'error')}).</span> <button class="btn sm" onclick="tbGrade(this)">Try again</button>`; }
}
(function () {
  if (typeof bcLessonHtml !== 'function') return; const _l = bcLessonHtml;
  bcLessonHtml = function () {
    let h = _l.apply(this, arguments);
    const mark = '<div class="bcx-sec" style="margin:12px 0 6px">How did you do?</div>';
    if (bcS && bcS.show && h.includes(mark)) h = h.replace(mark, `<div class="tb"><button class="btn sm primary" onclick="tbGrade(this)">🧑‍🏫 Teach it back · AI grades your explanation</button><span class="xs muted"> the best test you really know it</span></div>` + mark);
    return h;
  };
})();

/* entry point: next to the Learning limits switch on the Path */
(function () {
  if (typeof bcPath !== 'function') return; const _p = bcPath;
  bcPath = function () { return `<button class="dv-go" onclick="dvStart()"><i>🎧</i><span><b>Drive mode</b><em>Lessons and reviews read out loud, with spoken quizzes. For every car ride.</em></span><u>Play</u></button>` + _p.apply(this, arguments); };
  const st = document.createElement('style'); st.id = 'drive-css';
  st.textContent = `.dv-go{display:flex;align-items:center;gap:12px;width:100%;padding:12px;margin:0 0 10px;border:1px solid var(--acc,#C9A24A);border-radius:10px;background:transparent;color:var(--ink,#eee);font:inherit;text-align:left;cursor:pointer}.dv-go i{font-style:normal;font-size:22px}.dv-go span{flex:1;display:flex;flex-direction:column;gap:2px}.dv-go b{font-size:14px}.dv-go em{font-style:normal;font-size:12px;color:var(--muted,#999)}.dv-go u{text-decoration:none;font-weight:700;color:var(--acc,#C9A24A)}
  #dv{position:fixed;inset:0;z-index:1200;background:var(--bg,#08080a);color:var(--ink,#eee);display:flex;flex-direction:column;padding:calc(16px + env(safe-area-inset-top,0px)) 18px calc(18px + env(safe-area-inset-bottom,0px));gap:12px;overflow:auto}
  .dv-top{display:flex;justify-content:space-between;align-items:center;font:600 12px/1 var(--mono,monospace);color:var(--muted,#999)}.dv-top button{width:44px;height:44px;border:1px solid var(--ln,#2a2a2e);border-radius:10px;background:transparent;color:inherit;font-size:18px}
  .dv-k{font:600 12px/1 var(--mono,monospace);color:var(--acc,#C9A24A);text-transform:uppercase;letter-spacing:.06em;margin-top:8px}.dv-t{font-size:26px;font-weight:700;line-height:1.15}.dv-s{font-size:19px;line-height:1.45;color:var(--ink,#ddd);flex:1;min-height:120px}
  .dv-bar{height:4px;background:var(--ln,#2a2a2e);border-radius:2px;overflow:hidden}.dv-bar i{display:block;height:100%;background:var(--acc,#C9A24A)}
  .dv-ctl{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:10px}.dv-ctl button{min-height:96px;border:1px solid var(--ln,#2a2a2e);border-radius:14px;background:transparent;color:inherit;font-size:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.dv-ctl button em{font-style:normal;font-size:12px;color:var(--muted,#999)}.dv-ctl .big{background:var(--acc,#C9A24A);color:var(--acc-ink,#000);border-color:var(--acc,#C9A24A);font-size:40px}.dv-ctl .big em{color:inherit;opacity:.75}
  .dv-rate{align-self:center;min-height:40px;padding:0 16px;border:1px solid var(--ln,#2a2a2e);border-radius:20px;background:transparent;color:inherit;font:inherit;font-size:13px}.dv-voice{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:13px}.dv-voice span{color:var(--good,#3fb950)}.dv-voice.bad span{color:var(--bad,#e5484d)}.dv-voice button,.dv-why button{min-height:40px;padding:0 14px;border:1px solid var(--ln,#2a2a2e);border-radius:20px;background:transparent;color:inherit;font:inherit;font-size:13px}.dv-why{border:1px solid var(--bad,#e5484d);border-radius:12px;padding:10px;font-size:12.5px;line-height:1.45}.dv-n{text-align:center;font-size:12px;color:var(--muted,#999)}
  .tb{margin:12px 0 4px}.tb-s{display:flex;gap:10px;align-items:baseline;margin-bottom:8px}.tb-s b{color:var(--acc,#C9A24A);font-size:18px;letter-spacing:2px}.tb-l{margin:6px 0}.tb-l span,.tb-fix span{display:block;font:600 11px/1.4 var(--mono,monospace);text-transform:uppercase;color:var(--muted,#999)}.tb-l.ok span{color:var(--good,#3fb950)}.tb-l.bad span{color:var(--bad,#e5484d)}.tb-l ul{margin:4px 0 0 18px;padding:0}.tb-fix{margin-top:8px;padding:10px;border-left:2px solid var(--acc,#C9A24A);background:rgb(255 255 255 / .03)}`;
  document.head.appendChild(st);
})();
