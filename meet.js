/* War Room v5 · Conversations: record a talk, get the summary, key points, decisions and action items.
   In the Android app the phone records in the background (screen off, other apps open) through a native service.
   In a browser it records while the page stays open, or you import an audio file (e.g. from the Recorder app).
   The audio goes to Gemini with your own key; only the summary/notes sync between devices. Audio stays on the phone. */
'use strict';

const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
/* Talk to the native plugin through the bridge Capacitor injects into the page (no build step needed on the web side). */
const WRN = NATIVE && window.Capacitor.nativePromise ? ['start', 'stop', 'pause', 'resume', 'usage', 'usageAccess', 'openUsageSettings', 'status', 'ack', 'read', 'remove', 'list', 'keepAwake', 'info', 'takeLaunch'].reduce((o, m) => { o[m] = (a) => window.Capacitor.nativePromise('WrNative', m, a || {}); return o; }, { addListener: (ev, cb) => window.Capacitor.addListener('WrNative', ev, cb) }) : null;
let recState = { on: false, paused: false, pausedAt: 0, pausedTotal: 0, nativeElapsed: null, nativeAt: 0, startedAt: 0, title: '', web: null, chunks: [], busy: false, step: '', err: '', pending: null };
let recTick = null;

function recElapsed() { if (recState.nativeElapsed != null) return recState.nativeElapsed + (recState.paused ? 0 : now() - recState.nativeAt); return Math.max(0, (recState.paused ? recState.pausedAt : now()) - recState.startedAt - recState.pausedTotal); }
function meetList() { return Object.values(S.meetings || {}).filter((m) => !m._del).sort((a, b) => b.at - a.at); }
function fmtDur(ms) { const s = Math.round((ms || 0) / 1000), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : m ? `${m} min ${pad(s % 60)} s` : `${s} s`; }

/* ───────── recording ───────── */
function recSheet(preTitle) {
  if (recState.on) { recOpen(); return; }
  openModal(`<h2>Record a conversation</h2>
    <div class="small muted" style="margin:-4px 0 12px">${NATIVE ? 'Keeps recording with the screen off or in other apps. Stop from here or from the notification.' : 'In the browser it records while this page stays open. For long talks use the War Room Android app, or record in your Recorder app and tap Import.'}</div>
    <div class="field"><label>What is it? (optional)</label><input id="rec-t" value="${esc(preTitle || '')}" placeholder="e.g. Meeting with club director, call with Dad"></div>
    <label class="row" style="gap:10px;align-items:flex-start;margin:6px 0 14px;cursor:pointer"><input type="checkbox" id="rec-ok" style="margin-top:3px;width:20px;height:20px"><span class="small"><b>Everyone here agreed to be recorded.</b> Required. Never record sales calls with Florida agencies: Florida law needs everyone's consent.</span></label>
    <button class="btn primary block" onclick="recStart()">● Start recording</button>
    <button class="btn block" style="margin-top:8px" onclick="recImport()">Import an audio file instead</button>
    ${aiOn() && aiCfg().provider === 'gemini' ? '' : `<div class="hint" style="margin-top:12px;border:1px solid rgba(255,165,31,.4)">Summaries need the <b>Gemini</b> key (More → Food photo AI). Recording works without it; the summary waits until the key is there.</div>`}`, true);
}
async function recStart() {
  if (!$('rec-ok').checked) { toast('Tick the consent box first'); return; }
  const title = ($('rec-t').value || '').trim();
  try {
    if (WRN) {
      const st = await WRN.start({ title });
      recState = Object.assign(recState, { on: !!st.recording, startedAt: st.startedAt || now(), title, err: '', paused: false, nativeElapsed: 0, nativeAt: now() });
    } else {
      if (!navigator.mediaDevices || !window.MediaRecorder) throw new Error('This browser cannot record audio. Use Import instead.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      recState.chunks = []; mr.ondataavailable = (e) => { if (e.data && e.data.size) recState.chunks.push(e.data); };
      mr.start(5000); try { await navigator.wakeLock.request('screen').then((w) => { recState.wake = w; }); } catch (e) { }
      recState = Object.assign(recState, { on: true, startedAt: now(), title, web: mr, err: '', paused: false, pausedAt: 0, pausedTotal: 0, nativeElapsed: null });
    }
    closeModal(); recTicker(); render(); toast('Recording');
  } catch (e) { toast(String(e.message || e).slice(0, 140)); }
}
async function recStop() {
  if (!recState.on) return;
  try {
    if (WRN) {
      await WRN.stop(); recState.on = false; recTicker(); await recCheckPending(true);
    } else if (recState.web) {
      const mr = recState.web, dur = recElapsed();
      await new Promise((res) => { mr.onstop = res; mr.stop(); });
      mr.stream.getTracks().forEach((t) => t.stop()); try { recState.wake && recState.wake.release(); } catch (e) { }
      const blob = new Blob(recState.chunks, { type: mr.mimeType || 'audio/webm' }); recState.chunks = []; recState.web = null; recState.on = false; recTicker();
      meetProcess({ blob, mime: blob.type.split(';')[0], dur, at: recState.startedAt, title: recState.title });
    }
  } catch (e) { toast('Stop failed: ' + String(e.message || e).slice(0, 120)); }
  render();
}
async function recPause() {
  if (!recState.on || recState.paused) return;
  try { if (WRN) { const st = await WRN.pause(); recSyncNative(st); } else if (recState.web) { recState.web.pause(); recState.paused = true; recState.pausedAt = now(); } } catch (e) { toast('Pause failed'); }
  recRefreshUi(); toast('Paused. Nothing is recorded until you resume.');
}
async function recResume() {
  if (!recState.on || !recState.paused) return;
  try { if (WRN) { const st = await WRN.resume(); recSyncNative(st); } else if (recState.web) { recState.web.resume(); recState.pausedTotal += now() - recState.pausedAt; recState.paused = false; } } catch (e) { toast('Resume failed'); }
  recRefreshUi(); toast('Recording again');
}
function recSyncNative(st) { if (!st) return; recState.on = !!st.recording; recState.paused = !!st.paused; recState.nativeElapsed = Number(st.elapsed) || 0; recState.nativeAt = now(); }
function recRefreshUi() { render(); if ($('rec-clock')) recOpen(); }
function recOpen() {
  openModal(`<h2>${recState.paused ? 'Paused' : 'Recording'}</h2><div class="rec-big ${recState.paused ? 'paused' : ''}"><span class="rec-dot"></span><b id="rec-clock">${fmtDur(recElapsed())}</b></div>${recState.title ? `<div class="small muted" style="text-align:center;margin-bottom:12px">${esc(recState.title)}</div>` : ''}
    <div class="row" style="gap:8px"><button class="btn lg grow" onclick="${recState.paused ? 'recResume()' : 'recPause()'}">${recState.paused ? '● Resume' : '❚❚ Pause'}</button><button class="btn primary lg grow" onclick="closeModal();recStop()">■ Stop &amp; summarize</button></div>
    <div class="xs muted" style="margin-top:10px;text-align:center">${NATIVE ? 'You can lock the phone. It keeps recording. Pause and resume from here or from the notification.' : 'Keep this page open while recording.'}</div>`, true);
}
function recTicker() { clearInterval(recTick); if (!recState.on) return; let n = 0; recTick = setInterval(() => { const t = fmtDur(recElapsed()), el = $('rec-clock'); if (el) el.textContent = t; const b = $('rec-banner-t'); if (b) b.textContent = t; if (WRN && ++n % 4 === 0) WRN.status().then((st) => { const was = recState.paused; recSyncNative(st); if (!st.recording) { recTicker(); recCheckPending(false); } else if (was !== recState.paused) recRefreshUi(); }).catch(() => { }); }, 1000); }
function recBanner() {
  if (recState.on) return `<div class="rec-banner ${recState.paused ? 'paused' : ''}" onclick="recOpen()"><span class="rec-dot"></span><b>${recState.paused ? 'Paused' : 'Recording'}</b> <span id="rec-banner-t">${fmtDur(recElapsed())}</span><button class="btn sm" onclick="event.stopPropagation();${recState.paused ? 'recResume()' : 'recPause()'}">${recState.paused ? 'Resume' : 'Pause'}</button><button class="btn sm" onclick="event.stopPropagation();recStop()">Stop</button></div>`;
  if (recState.busy) return `<div class="rec-banner busy"><span class="spin"></span><b>Summarizing</b> <span>${esc(recState.step)}</span></div>`;
  if (recState.pending && !recState.busy) return `<div class="rec-banner warn" onclick="recCheckPending(true)"><b>A recording is waiting</b><span>${recState.err ? esc(recState.err.slice(0, 60)) : 'tap to summarize'}</span></div>`;
  return '';
}
/* Native: a finished recording (stopped from the notification, or shared from another app) waits until the app picks it up. */
async function recCheckPending(go) {
  if (!WRN) return;
  try {
    const st = await WRN.status();
    if (st.recording) { const was = recState.on; recState.startedAt = st.startedAt; recState.title = st.title || recState.title; recSyncNative(st); if (!was) { recTicker(); } render(); return; }
    if (recState.on) { recState.on = false; recTicker(); }
    recState.pending = st.pending || null;
    if (st.pending && (go || aiOn()) && !recState.busy) await meetProcess({ native: st.pending, mime: st.pending.mime || 'audio/mp4', dur: st.pending.durMs, at: st.pending.at || now(), title: st.pending.title || '' });
    render();
  } catch (e) { console.warn(e); }
}
function recImport() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,video/*,.m4a,.mp3,.wav,.ogg,.aac,.amr,.3gp,.webm';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; closeModal(); meetProcess({ blob: f, mime: f.type || 'audio/mp4', dur: 0, at: f.lastModified || now(), title: f.name.replace(/\.[^.]+$/, '') }); };
  inp.click();
}

/* ───────── AI ───────── */
const MEET_PROMPT = `You get an audio recording of a conversation (it may be in Romanian, Russian or English, or a mix). The person who recorded it is Egor (18, Chisinau): he runs Caregiver Bench (recruits caregivers for Florida home care agencies, sells by cold-calling owners), coaches tennis groups, and is in his final school year (BAC exams).
Listen to all of it. Then return ONLY a JSON object, no other text, written in English (keep short quotes in the original language):
{"title": "short title, 3-7 words",
 "summary": "3-6 sentences: what it was about and how it ended",
 "key_points": ["the most important points, most important first, max 10"],
 "decisions": ["what was agreed or decided; empty if nothing"],
 "action_items": [{"text": "a concrete next step, starting with a verb", "who": "Egor or the other person's name", "due": "a date/day if one was said, else empty"}],
 "people": ["names or roles of the people speaking"],
 "numbers": ["any prices, dates, amounts, phone numbers or deadlines mentioned, with what they refer to"],
 "follow_up": "a short message Egor could send the other person afterwards to confirm what was agreed; empty if not useful",
 "coach": "one honest sentence for Egor: what this means for his goals ($20k MRR by 1 July 2027, pass BAC, 85 kg), or what he could do better next time",
 "language": "main language spoken",
 "transcript": "a clean transcript with speaker labels (Egor:, Other:, or names), in the original language. If the recording is longer than about 20 minutes, give a condensed transcript of the important parts instead"}
If there is no speech, return {"error": "no speech found"}.`;
function b64ToBytes(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function blobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
async function nativeBytes(f) {
  const CH = 3 * 1024 * 1024, parts = []; let off = 0, size = f.size || 0;
  do { recState.step = `reading ${Math.round((off / Math.max(size, 1)) * 100)}%`; render(); const r = await WRN.read({ path: f.path, offset: off, length: CH }); size = r.size; parts.push(b64ToBytes(r.data)); off += CH; } while (off < size);
  return new Blob(parts, { type: f.mime || 'audio/mp4' });
}
function normMime(m, name) { m = String(m || '').split(';')[0]; if (/^audio\/(x-)?m4a$|^audio\/aac$|^video\/mp4$/.test(m)) return 'audio/mp4'; if (m === 'audio/x-wav') return 'audio/wav'; if (m) return m; return /\.mp3$/i.test(name || '') ? 'audio/mp3' : 'audio/mp4'; }
async function geminiUpload(key, blob, mime, name) {
  const start = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', { method: 'POST', headers: { 'x-goog-api-key': key, 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(blob.size), 'X-Goog-Upload-Header-Content-Type': mime, 'Content-Type': 'application/json' }, body: JSON.stringify({ file: { display_name: name || 'conversation' } }) });
  if (!start.ok) { const j = await start.json().catch(() => ({})); const e = new Error((j.error && j.error.message) || 'upload start HTTP ' + start.status); e.status = start.status; throw e; }
  const url = start.headers.get('x-goog-upload-url'); if (!url) throw new Error('Google did not return an upload address');
  recState.step = 'uploading'; render();
  const up = await fetch(url, { method: 'POST', headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' }, body: blob });
  const j = await up.json().catch(() => ({})); if (!up.ok || !j.file) throw new Error((j.error && j.error.message) || 'upload HTTP ' + up.status);
  let f = j.file, tries = 0;
  while (f.state === 'PROCESSING' && tries++ < 60) { recState.step = 'Google is processing the audio'; render(); await new Promise((r) => setTimeout(r, 3000)); const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/${f.name}`, { headers: { 'x-goog-api-key': key } }); f = await g.json().catch(() => f); }
  if (f.state === 'FAILED') throw new Error('Google could not process this audio file');
  return f;
}
async function meetAi(blob, mime, title) {
  const c = aiCfg(); if (!c.key) throw new Error('Add the Gemini key first (More → Food photo AI)');
  if (c.provider !== 'gemini') throw new Error('Summaries need a Gemini key: Claude keys cannot listen to audio. Add a free Gemini key in More → Food photo AI.');
  mime = normMime(mime, title);
  let part;
  if (blob.size <= 14 * 1024 * 1024) { recState.step = 'sending'; render(); part = { inline_data: { mime_type: mime, data: await blobToB64(blob) } }; }
  else { const f = await geminiUpload(c.key, blob, mime, title); part = { file_data: { mime_type: f.mimeType || mime, file_uri: f.uri } }; }
  const list = [c.model].concat(c.alts || [], ['gemini-flash-latest']).filter((x, i, a) => x && a.indexOf(x) === i); let last = null;
  for (const model of list) {
    try {
      recState.step = 'listening and summarizing'; render();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key }, body: JSON.stringify({ contents: [{ parts: [part, { text: MEET_PROMPT + (title ? `\nEgor called this recording: "${title}".` : '') }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 16384 } }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
      const cand = (j.candidates || [])[0] || {}, text = ((cand.content || {}).parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
      if (!text) throw new Error('Empty answer' + (cand.finishReason ? ' (' + cand.finishReason + ')' : ''));
      const a = text.indexOf('{'), b = text.lastIndexOf('}'); const out = JSON.parse(text.slice(a, b + 1)); if (out.error) throw new Error(out.error);
      out.model = model; return out;
    } catch (e) { last = e; if (/API key not valid|API_KEY_INVALID|location is not supported|no speech/i.test(e.message) || !(e.status === 404 || e.status === 429 || e.status === 503 || e.status === 500 || /not found|quota|overloaded|unavailable|JSON/i.test(e.message))) break; }
  }
  throw last || new Error('No model answered');
}
async function meetProcess(src) {
  if (recState.busy) { toast('Already summarizing one. Wait a moment.'); return; }
  recState.busy = true; recState.err = ''; recState.step = 'starting'; render();
  let blob = src.blob;
  try {
    if (!blob && src.native) blob = await nativeBytes(src.native);
    if (!blob || !blob.size) throw new Error('The recording is empty');
    const o = await meetAi(blob, src.mime || blob.type, src.title);
    const id = 'm' + (src.at || now()), arr = (v, n) => (Array.isArray(v) ? v : []).map((x) => (typeof x === 'string' ? x : x && x.text ? x : String(x))).slice(0, n);
    const m = { id, _u: now(), at: src.at || now(), dur: src.dur || 0, title: String(src.title || o.title || 'Conversation').slice(0, 80), aiTitle: String(o.title || '').slice(0, 80), summary: String(o.summary || '').slice(0, 2000), points: arr(o.key_points, 12).map(String), decisions: arr(o.decisions, 10).map(String),
      actions: arr(o.action_items, 12).map((x) => (typeof x === 'string' ? { t: x, who: '', due: '', sent: false } : { t: String(x.text || '').slice(0, 200), who: String(x.who || '').slice(0, 40), due: String(x.due || '').slice(0, 40), sent: false })),
      people: arr(o.people, 8).map(String), numbers: arr(o.numbers, 12).map(String), followup: String(o.follow_up || '').slice(0, 1500), coach: String(o.coach || '').slice(0, 400), lang: String(o.language || ''), transcript: String(o.transcript || '').slice(0, 30000), model: o.model, path: src.native ? src.native.path : '' };
    if (!S.meetings) S.meetings = {}; S.meetings[id] = m; save(true); if (syncReady()) pushCloud();
    if (src.native) { try { await WRN.ack(); } catch (e) { } recState.pending = null; }
    recState.busy = false; recState.step = ''; render(); toast('Summary ready'); meetOpen(id);
    try { navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch (e) { }
  } catch (e) {
    recState.busy = false; recState.step = ''; recState.err = aiExplain(e.message) + ' (' + String(e.message || e).slice(0, 120) + ')';
    if (!src.native && blob) recState.retry = Object.assign({}, src, { blob });
    render(); openModal(`<h2>Summary failed</h2><div class="hint" style="margin-bottom:12px">${esc(recState.err)}</div><div class="small muted" style="margin-bottom:12px">The audio is kept${src.native ? ' on the phone' : ' for this session'}. Fix the cause and try again.</div><button class="btn primary block" onclick="closeModal();meetRetry()">Try again</button>`, true);
  }
}
function meetRetry() { if (recState.retry) { const r = recState.retry; recState.retry = null; meetProcess(r); } else recCheckPending(true); }

/* ───────── viewing ───────── */
function meetCard(n) {
  const l = meetList().slice(0, n || 4);
  return `<div class="card"><div class="card-h"><div class="card-t">Conversations</div><div class="card-r"><button class="btn sm primary" onclick="recSheet()">● Record</button></div></div>
    ${l.length ? l.map((m) => { const open = m.actions.filter((a) => !a.sent).length; return `<div class="setting-row" onclick="meetOpen('${m.id}')"><div><div class="t">${esc(m.title)}</div><div class="d">${fmtShort(new Date(m.at))} ${new Date(m.at).toTimeString().slice(0, 5)}${m.dur ? ' · ' + fmtDur(m.dur) : ''}${open ? ` · <span class="acc">${open} action${open > 1 ? 's' : ''} open</span>` : ''}</div></div><div class="arr">›</div></div>`; }).join('') : `<div class="small muted">Record a meeting or talk. When you stop, you get the summary, key points, decisions and action items. ${NATIVE ? 'It keeps recording with the screen off.' : ''}</div>`}
    ${meetList().length > (n || 4) ? `<div class="xs muted" style="margin-top:6px"><a href="#" onclick="meetAll();return false">All ${meetList().length} conversations</a></div>` : ''}</div>`;
}
function meetAll() { openModal(`<h2>Conversations</h2>${meetList().map((m) => `<div class="setting-row" onclick="meetOpen('${m.id}')"><div><div class="t">${esc(m.title)}</div><div class="d">${fmtShort(new Date(m.at))}${m.dur ? ' · ' + fmtDur(m.dur) : ''}</div></div><div class="arr">›</div></div>`).join('')}`, true); }
function meetOpen(id) {
  const m = (S.meetings || {})[id]; if (!m) return; const L = (a) => `<ul class="mlist">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  openModal(`<h2>${esc(m.title)}</h2><div class="small muted" style="margin:-6px 0 12px">${DAY_LONG[dow(new Date(m.at))]} ${fmtShort(new Date(m.at))} · ${new Date(m.at).toTimeString().slice(0, 5)}${m.dur ? ' · ' + fmtDur(m.dur) : ''}${m.people.length ? ' · ' + esc(m.people.join(', ')) : ''}</div>
    <div class="msec"><div class="lab">Summary</div><div class="small">${esc(m.summary)}</div></div>
    ${m.points.length ? `<div class="msec"><div class="lab">Key points</div>${L(m.points)}</div>` : ''}
    ${m.decisions.length ? `<div class="msec"><div class="lab">Decided</div>${L(m.decisions)}</div>` : ''}
    ${m.actions.length ? `<div class="msec"><div class="lab">Action items</div>${m.actions.map((a, i) => `<label class="mact ${a.sent ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${a.sent ? 'disabled checked' : (/egor|^$/i.test(a.who) ? 'checked' : '')}><span>${esc(a.t)}${a.who && !/egor/i.test(a.who) ? ` <i>(${esc(a.who)})</i>` : ''}${a.due ? ` <b>· ${esc(a.due)}</b>` : ''}${a.sent ? ' <span class="ok">✓ in Todoist</span>' : ''}</span></label>`).join('')}${m.actions.some((a) => !a.sent) ? `<button class="btn primary block" style="margin-top:8px" onclick="meetToTodoist('${id}')">Send ticked to Todoist</button>` : ''}</div>` : ''}
    ${m.numbers.length ? `<div class="msec"><div class="lab">Numbers &amp; dates</div>${L(m.numbers)}</div>` : ''}
    ${m.followup ? `<div class="msec"><div class="lab">Follow-up message</div><div class="hint" style="white-space:pre-wrap">${esc(m.followup)}</div><button class="btn sm" style="margin-top:6px" onclick="meetCopy('${id}')">Copy</button></div>` : ''}
    ${m.coach ? `<div class="msec"><div class="lab">Coach</div><div class="small">${esc(m.coach)}</div></div>` : ''}
    ${m.transcript ? `<details class="msec"><summary class="lab" style="cursor:pointer">Transcript${m.lang ? ' · ' + esc(m.lang) : ''}</summary><div class="small" style="white-space:pre-wrap;max-height:40vh;overflow:auto;margin-top:6px">${esc(m.transcript)}</div></details>` : ''}
    <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" onclick="meetAsk('${id}')">Ask about it</button><button class="btn" onclick="meetToBook('${id}')">Save to Playbook</button><button class="btn" onclick="meetRename('${id}')">Rename</button><button class="btn danger" onclick="meetDel('${id}')">Delete</button></div>`, true);
}
async function meetToTodoist(id) {
  const m = S.meetings[id]; const ticks = [...document.querySelectorAll('.mact input[data-i]')].filter((x) => x.checked && !x.disabled).map((x) => Number(x.dataset.i));
  if (!ticks.length) { toast('Tick at least one'); return; }
  if (!tdOn()) { toast('Connect Todoist first (More → Todoist)'); return; }
  for (const i of ticks) { const a = m.actions[i]; captureTask(a.t + (a.due ? ' ' + a.due : ''), 'task'); a.sent = true; }
  m._u = now(); save(true); toast(`${ticks.length} sent to Todoist`); meetOpen(id);
}
function meetCopy(id) { const t = S.meetings[id].followup; try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { prompt('Copy:', t); } }
function meetAsk(id) { const m = S.meetings[id]; closeModal(); askAbout(`About my conversation "${m.title}" (${fmtShort(new Date(m.at))}). Summary: ${m.summary} Key points: ${m.points.join('; ')}. Decisions: ${m.decisions.join('; ')}. Actions: ${m.actions.map((a) => a.t).join('; ')}.\nMy question: `); }
function meetToBook(id) {
  const m = S.meetings[id]; const body = `# ${m.title}\n${fmtShort(new Date(m.at))}${m.people.length ? ' · ' + m.people.join(', ') : ''}\n\n## Summary\n${m.summary}\n\n${m.points.length ? '## Key points\n' + m.points.map((x) => '- ' + x).join('\n') + '\n\n' : ''}${m.decisions.length ? '## Decided\n' + m.decisions.map((x) => '- ' + x).join('\n') + '\n\n' : ''}${m.actions.length ? '## Actions\n' + m.actions.map((a) => '- ' + a.t + (a.due ? ' (' + a.due + ')' : '')).join('\n') : ''}`;
  pbSave('meet-' + id, m.title, body, 'mine'); toast('Saved in Playbook → Mine');
}
function meetRename(id) { const m = S.meetings[id]; const v = prompt('Name', m.title); if (!v) return; m.title = v.trim().slice(0, 80); m._u = now(); save(true); meetOpen(id); render(); }
async function meetDel(id) {
  const m = S.meetings[id]; if (!confirm('Delete this conversation summary' + (m.path ? ' and its audio' : '') + '?')) return;
  if (m.path && WRN) { try { await WRN.remove({ path: m.path }); } catch (e) { } }
  S.meetings[id] = { id, _u: now(), _del: true, at: m.at }; save(true); closeModal(); render();
}

/* ───────── native extras ───────── */
async function nativeBoot() {
  if (!WRN) return;
  document.documentElement.classList.add('native');
  try { WRN.addListener('shared', () => recCheckPending(true)); WRN.addListener('launch', () => nativeLaunch()); } catch (e) { }
  try { window.Capacitor.addListener('App', 'resume', () => { recCheckPending(false); nativeLaunch(); scrPull(true); }); } catch (e) { }
  await recCheckPending(false); nativeLaunch(); scrPull(true);
  setInterval(nativeAwake, 5000); nativeAwake();
}
async function nativeLaunch() {
  try { const r = await WRN.takeLaunch(); const a = r && r.action; if (!a) return;
    if (a === 'rec') { show('ask'); setTimeout(() => (recState.on ? recOpen() : recSheet()), 300); }
    else if (a === 'dial') startSession();
    else if (a === 'meal') { show('food'); setTimeout(() => foodSnap(), 300); }
  } catch (e) { }
}
/* The screen stays on during a dial session, so the script never goes dark mid-call. */
let _awake = null;
function nativeAwake() { const on = !!(S.session && S.session.active); if (on !== _awake && WRN) { _awake = on; WRN.keepAwake({ on }).catch(() => { }); } }
