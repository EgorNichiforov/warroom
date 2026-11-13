/* War Room v5 · Food: snap a photo, AI reads the plate, calories and macros land in the day.
   Meals live in the day record (so they sync). Photos stay on this device (IndexedDB).
   The AI key is kept on this device only and is never synced. */
'use strict';

const FOOD_AI_KEY = 'wr-food-ai';
const FOOD_SAVED_DEFAULT = [
  { id: 'bf', name: 'Breakfast (plan)', kcal: 940, p: 43, c: 0, f: 0 },
  { id: 'lu', name: 'Lunch box (plan)', kcal: 965, p: 60, c: 0, f: 0 },
  { id: 'sn', name: 'Snack (plan)', kcal: 400, p: 34, c: 0, f: 0 },
  { id: 'di', name: 'Dinner (plan)', kcal: 915, p: 50, c: 0, f: 0 },
  { id: 'kf', name: 'Kefir', kcal: 200, p: 10, c: 0, f: 0 },
];
function foodState() { if (!S.food || !S.food.saved) S.food = Object.assign({ _u: 0, kcal: 3400, p: 170, saved: FOOD_SAVED_DEFAULT.map((x) => Object.assign({}, x)) }, S.food || {}); return S.food; }
function foodTouch() { S.food._u = now(); save(); }
function meals(k) { const o = day(k); if (!o.meals) o.meals = []; return o.meals; }

/* ───────── photos on this device ───────── */
let _idb = null; const _phUrl = {};
function phDb() { return _idb || (_idb = new Promise((res, rej) => { try { const r = indexedDB.open('warroom-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } })); }
async function phPut(id, blob) { try { const db = await phDb(); await new Promise((res, rej) => { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { console.warn('photo store', e); } }
async function phGet(id) { try { const db = await phDb(); return await new Promise((res) => { const r = db.transaction('p').objectStore('p').get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); } catch (e) { return null; } }
async function phDel(id) { try { const db = await phDb(); db.transaction('p', 'readwrite').objectStore('p').delete(id); delete _phUrl[id]; } catch (e) { } }
async function hydratePhotos() { for (const el of document.querySelectorAll('img[data-ph]')) { const id = el.dataset.ph; if (!_phUrl[id]) { const b = await phGet(id); if (!b) { el.remove(); continue; } _phUrl[id] = URL.createObjectURL(b); } el.src = _phUrl[id]; } }
function loadImage(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Could not read that image')); }; im.src = u; }); }
function scaleImage(im, max, q) { const s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
function dataUrlBlob(u) { const [h, b] = u.split(','), bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (h.match(/:(.*?);/) || [, 'image/jpeg'])[1] }); }

/* ───────── AI: runs straight from this device with your own key ───────── */
/* 14 Nov 2026: a shared key lives ONLY on the server (public.warroom_secret, readable by no browser).
   Synced data carries just {provider, model, server:true}; requests go through the warroom-ai function, which adds the key.
   A key kept "on this device only" stays in this device's localStorage and is used directly. */
const AI_SERVER = '__server__';
function aiCfg() { let c = {}; try { c = JSON.parse(localStorage.getItem(FOOD_AI_KEY) || '{}'); } catch (e) { } if (c.key) return c; const sa = S && S.secrets && S.secrets.ai; if (sa && sa.provider && (sa.server || sa.key)) return { provider: sa.provider, model: sa.model, alts: sa.alts || [], key: AI_SERVER, shared: true, server: true }; return c; }
async function aiProxy(payload) { if (!syncReady()) throw new Error('Link this device first (More → Devices & sync): the shared AI key lives on the War Room server'); const s = S.settings.sync; return fetch(`${s.url}/functions/v1/warroom-ai`, { method: 'POST', headers: hdr(), body: JSON.stringify(payload), signal: payload.signal }); }
/* every AI request goes through here: with the server key it is relayed by the warroom-ai function, otherwise sent directly */
function aiNet(url, opt) {
  opt = opt || {}; const h = Object.assign({}, opt.headers || {}); const k = h['x-goog-api-key'] || h['x-api-key'];
  if (k !== AI_SERVER) return fetch(url, opt);
  delete h['x-goog-api-key']; delete h['x-api-key']; delete h['anthropic-dangerous-direct-browser-access'];
  const s = S.settings.sync; return fetch(`${s.url}/functions/v1/warroom-ai`, { method: 'POST', headers: hdr(), signal: opt.signal, body: JSON.stringify({ op: 'call', url, method: opt.method || 'GET', headers: h, body: opt.body == null ? null : String(opt.body) }) });
}
async function aiShare(cfg, on) {
  if (on) {
    if (cfg.key === AI_SERVER) return; const r = await aiProxy({ op: 'store', provider: cfg.provider, key: cfg.key, model: cfg.model, alts: cfg.alts || [] }); const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Could not save the key on the server (HTTP ' + r.status + ')');
    S.secrets = { _u: now(), ai: { provider: cfg.provider, model: cfg.model, alts: cfg.alts || [], server: true } };
  } else { if (syncReady()) { try { await aiProxy({ op: 'forget' }); } catch (e) { } } S.secrets = { _u: now() }; }
  save(true); if (syncReady()) pushCloud();
}
/* one-time move for War Rooms that still carry the key inside the synced data: the server copies it, then it is removed from the data */
async function aiMoveKeyToServer() {
  const sa = S.secrets && S.secrets.ai; if (!sa || !sa.key || !syncReady()) return;
  try { const r = await aiProxy({ op: 'status' }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.server) return;
    S.secrets = { _u: now(), ai: { provider: sa.provider, model: sa.model, alts: sa.alts || [], server: true } };
    try { const c = JSON.parse(localStorage.getItem(FOOD_AI_KEY) || '{}'); if (c.key && c.shared) localStorage.removeItem(FOOD_AI_KEY); } catch (e) { }
    save(true); pushCloud(); } catch (e) { }
}
function aiOn() { const c = aiCfg(); return !!(c.key && c.provider); }
const AI_PROMPT = `You estimate nutrition for a meal log. Accuracy matters more than speed.
Method: 1) identify every food and drink, including hidden ones (cooking oil, butter, sauces, dressings, sugar in drinks). 2) Estimate each portion in grams using what is in the photo for scale (plate ~26 cm, fork ~19 cm, hand, packaging labels). 3) Use standard nutrition values per 100 g (USDA-style) for the cooked or raw state you see. 4) Add up. If the person describes the meal, their quantities and brands beat what you see.
Return ONLY a JSON object, no other text:
{"name": "short name of the meal", "items": [{"name": "item", "grams": 0, "kcal": 0, "protein": 0, "carbs": 0, "fat": 0}], "kcal": 0, "protein": 0, "carbs": 0, "fat": 0, "confidence": "low|medium|high", "note": "one short sentence on the biggest uncertainty (usually a portion size or the oil)"}
Totals must equal the sum of the items. Protein, carbs and fat are in grams. Give your single best estimate, not a cautious one. If there is no food, return {"error": "no food found"}.`;
function aiParse(text) { const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('The AI did not return numbers'); const j = JSON.parse(text.slice(a, b + 1)); if (j.error) throw new Error(j.error); const n = (v) => Math.max(0, Math.round(Number(v) || 0)); return { name: String(j.name || 'Meal').slice(0, 60), kcal: n(j.kcal), p: n(j.protein), c: n(j.carbs), f: n(j.fat), conf: String(j.confidence || ''), note: String(j.note || '').slice(0, 200), items: (Array.isArray(j.items) ? j.items : []).slice(0, 12).map((x) => ({ name: String(x.name || '').slice(0, 50), g: n(x.grams), kcal: n(x.kcal), p: n(x.protein) })) }; }
/* Which Gemini models to try, best first. Free-tier quota differs per model, so one refusing is not the end. */
async function aiGeminiModels(key) {
  const r = await aiNet('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
  const names = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace('models/', ''));
  const ver = (n) => parseFloat(n.split('-')[1]) || 0, pick = (re) => names.filter((n) => re.test(n)).sort((x, y) => ver(y) - ver(x));
  const out = pick(/^gemini-[\d.]+-flash$/).concat(pick(/^gemini-[\d.]+-flash-lite$/), ['gemini-flash-latest', 'gemini-flash-lite-latest'], pick(/^gemini-[\d.]+-flash-(preview|lite-preview)/));
  return out.filter((n, i) => out.indexOf(n) === i).slice(0, 8);
}
function aiExplain(msg) {
  const m = String(msg || '');
  if (/API key not valid|API_KEY_INVALID|invalid api key|invalid x-api-key|authentication/i.test(m)) return 'The key was not accepted. Copy it again: the whole line, nothing before or after it.';
  if (/location is not supported|not available in your (country|region)|FAILED_PRECONDITION/i.test(m)) return 'Google does not offer the free key in your region on this account. The other route is an Anthropic key (paid).';
  if (/high demand|overloaded|UNAVAILABLE|503/i.test(m)) return 'Google\u2019s AI servers are overloaded right now (their side, not yours). The app already tried the backup models. Wait a minute and tap Estimate again.';
  if (/limit: 0|quota|RESOURCE_EXHAUSTED|429|rate/i.test(m)) return 'Google refused on quota: this account has no free allowance for the models tried, or the allowance is used up for now.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'This device could not reach the AI service. Check the connection, and switch off any VPN or ad blocker for this page.';
  if (/not found|404|not supported for generateContent/i.test(m)) return 'That model name does not exist for this key. Clear the Model field and try again.';
  if (/credit|billing|balance/i.test(m)) return 'The account has no credit. Add credit in the provider console, then try again.';
  return 'The AI service answered with an error. Send Claude the grey text below (never the key).';
}
/* every AI request has a hard time limit, so the screen can never hang: a slow model is dropped and the next one is tried */
const aiCtls = new Set();
function aiFetch(url, opt, ms, grp) { const ctl = new AbortController(); aiCtls.add(ctl); if (grp) grp.add(ctl); const t = setTimeout(() => ctl.abort('timeout'), ms || 60000); return aiNet(url, Object.assign({}, opt, { signal: ctl.signal })).catch((e) => { const err = new Error(ctl.signal.aborted ? (ctl.signal.reason === 'cancel' ? 'Cancelled' : 'TIMEOUT: no answer in ' + Math.round((ms || 60000) / 1000) + ' s') : String(e.message || e)); err.status = ctl.signal.aborted ? 408 : 0; throw err; }).finally(() => { clearTimeout(t); aiCtls.delete(ctl); if (grp) grp.delete(ctl); }); }
function aiCancel() { aiCtls.forEach((c) => c.abort('cancel')); }
const AI_FAST = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
async function aiCall(c, b64, hint, model, grp) {
  const prompt = AI_PROMPT + (hint ? `\nThe person adds: "${hint}". Trust this over what you see.` : '') + (b64 ? '' : '\nThere is no photo. Estimate from the description only.');
  if (c.provider === 'anthropic') {
    const content = []; if (b64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }); content.push({ type: 'text', text: prompt });
    const r = await aiFetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: 'user', content }] }) }, 30000, grp);
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
    return aiParse((j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join(''));
  }
  const parts = []; if (b64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b64 } }); parts.push({ text: prompt });
  const send = (cfg) => aiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key }, body: JSON.stringify(Object.assign({ contents: [{ parts }] }, cfg ? { generationConfig: cfg } : {})) }, 30000, grp);
  // accuracy first: the model keeps its full reasoning (portion sizes are where estimates go wrong); the time limit + fallback protect against hangs
  const think = /gemini-2\.5/.test(model) && !/lite/.test(model) ? { thinkingConfig: { thinkingBudget: 2048 } } : {};
  let r = await send(Object.assign({ temperature: 0.2, responseMimeType: 'application/json' }, think)), j = await r.json().catch(() => ({}));
  if (r.status === 400 && /think|budget|level/i.test((j.error && j.error.message) || '')) { r = await send({ temperature: 0.2, responseMimeType: 'application/json' }); j = await r.json().catch(() => ({})); }
  if (r.status === 400 && /mime|generation_?config|response_?mime/i.test((j.error && j.error.message) || '')) { r = await send(null); j = await r.json().catch(() => ({})); }
  if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
  const cand = (j.candidates || [])[0] || {}, text = ((cand.content || {}).parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('');
  if (!text) throw new Error('The model sent an empty answer' + (cand.finishReason ? ' (' + cand.finishReason + ')' : ''));
  return aiParse(text);
}
/* Fast and accurate at once: the best model starts first; if it has not answered in 9 s a second model starts in parallel,
   and the first good answer wins (the other request is cancelled). Overload gets one quick retry; a bad key stops at once. */
const AI_HEDGE_MS = 9000;
function aiFatal(e) { return /Cancelled/.test(e.message) || /API key not valid|API_KEY_INVALID|location is not supported/i.test(e.message) || !(e.status === 404 || e.status === 408 || e.status === 429 || e.status === 503 || e.status === 500 || e.status === 400 || e.status === 0 || /not found|quota|overloaded|unavailable|high demand|TIMEOUT|JSON|empty/i.test(e.message)); }
async function aiEstimate(b64, hint, cfgOverride) {
  const c = cfgOverride || aiCfg(); if (!c.key) throw new Error('Photo AI is not set up yet');
  const list = [c.model].concat(c.alts || [], c.provider === 'anthropic' ? ['claude-haiku-5-5'] : AI_FAST).filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 4);
  const one = async (m, grp) => { try { return await aiCall(c, b64, hint, m, grp); } catch (e1) { if (!(e1.status === 503 || /high demand|overloaded|UNAVAILABLE/i.test(e1.message))) throw e1; await new Promise((r) => setTimeout(r, 1200)); return aiCall(c, b64, hint, m, grp); } };
  return new Promise((resolve, reject) => {
    let idx = 0, running = 0, done = false, last = null, primaryFailed = false; const groups = []; const t0 = Date.now();
    const finish = (fn, v) => { if (done) return; done = true; clearInterval(hedge); groups.forEach((g) => g.forEach((x) => x.abort('cancel'))); fn(v); };
    const launch = () => {
      if (done || idx >= list.length) return false; const m = list[idx++], grp = new Set(); groups.push(grp); running++; aiStatus.model = m; aiStatus.tries++; aiTick();
      one(m, grp).then((out) => { if (done) return; groups.splice(groups.indexOf(grp), 1); out.ms = Date.now() - t0; out.model = m;
        if (!cfgOverride && m !== c.model && primaryFailed) { /* remember the model that actually answers */ c.alts = list.filter((x) => x !== m); c.model = m; if (c.server) { if (S.secrets && S.secrets.ai) { S.secrets.ai.model = m; S.secrets.ai.alts = c.alts; S.secrets._u = now(); save(); } } else { try { localStorage.setItem(FOOD_AI_KEY, JSON.stringify(c)); } catch (e) { } if (c.shared) aiShare(c, true).catch(() => { }); } }
        finish(resolve, out); })
        .catch((e) => { running--; if (done) return; last = e; e.model = m; if (m === list[0]) primaryFailed = true; if (aiFatal(e)) { finish(reject, e); return; } if (!launch() && running === 0) finish(reject, last); });
      return true;
    };
    const hedge = setInterval(() => { if (!done && running < 2) launch(); }, AI_HEDGE_MS);
    launch();
  });
}
function foodAiModal() {
  const c = aiCfg(), prov = c.provider || 'gemini';
  openModal(`<h2>Photo AI</h2>
    <div class="hint" style="margin-bottom:12px">The photo estimate needs an AI key. Add it once here and, if your devices are linked, it works on your phone and laptop both. It is never shown again after saving.</div>
    <div class="field"><label>Provider</label><div class="chips"><span class="chip ${prov === 'gemini' ? 'on' : ''}" id="ai-p-gemini" onclick="aiPick('gemini')">Google Gemini</span><span class="chip ${prov === 'anthropic' ? 'on' : ''}" id="ai-p-anthropic" onclick="aiPick('anthropic')">Anthropic (Claude)</span></div></div>
    <div class="field"><label>API key</label><input id="ai-key" type="password" autocomplete="off" autocapitalize="off" placeholder="${c.key ? 'saved · paste a new one to replace' : 'paste the key here'}"></div>
    <div class="field"><label>Model (leave empty for automatic)</label><input id="ai-model" autocapitalize="off" autocomplete="off" value="${esc(c.model || '')}" placeholder="automatic"></div>
    <div class="hint" id="ai-help"></div>
    <label class="row small" style="gap:8px;margin:12px 0 2px;cursor:pointer"><input type="checkbox" id="ai-share" ${c.key && !c.shared ? '' : 'checked'}> Use this key on my linked devices too (phone and laptop)</label><div class="xs muted">It is stored on the War Room server, never inside your synced data: linked devices use it through the server and no device can read it back. Untick to keep it on this device only.</div>
    <div id="ai-err"></div>
    <div class="actions">${c.key ? `<button class="btn danger" onclick="aiClear()">Remove key</button>` : `<button class="btn" onclick="closeModal()">Later</button>`}<button class="btn primary" id="ai-save" onclick="aiSave()">Save &amp; test</button></div>`, true);
  aiPick(prov);
}
let _aiProv = 'gemini';
function aiPick(p) { _aiProv = p; ['gemini', 'anthropic'].forEach((x) => { const el = $('ai-p-' + x); if (el) el.classList.toggle('on', x === p); }); const h = $('ai-help'); if (h) h.innerHTML = p === 'gemini' ? 'Get a key at <b>aistudio.google.com</b> → Get API key. Google lists a free tier for its Flash models; check the limits there.' : 'Get a key at <b>console.anthropic.com</b> → API keys. Paid per use: a photo costs a fraction of a cent.'; }
async function aiSave() {
  const old = aiCfg(), key = $('ai-key').value.trim() || (old.provider === _aiProv ? old.key : ''), typed = $('ai-model').value.trim(), box = $('ai-err');
  if (!key) { toast('Paste the key first'); return; }
  const btn = $('ai-save'); btn.disabled = true; btn.textContent = 'Testing…'; box.innerHTML = '';
  try {
    const models = typed ? [typed] : _aiProv === 'gemini' ? await aiGeminiModels(key) : ['claude-haiku-5-5', 'claude-sonnet-5-5'];
    const cfg = { provider: _aiProv, key, model: models[0], alts: models.slice(1) };
    const t = await aiEstimate('', 'one medium banana', cfg);
    cfg.alts = models.filter((x) => x !== t.model); cfg.model = t.model;
    const share = (!$('ai-share') || $('ai-share').checked) && syncReady(); cfg.shared = share; if (share) { await aiShare(cfg, true); localStorage.removeItem(FOOD_AI_KEY); } else { localStorage.setItem(FOOD_AI_KEY, JSON.stringify(cfg)); }
    closeModal(); render(); toast(`Photo AI is on${share ? ' on all linked devices' : ''} · test: banana ≈ ${t.kcal} kcal`);
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save & test'; const msg = String(e.message || e).split(key).join('•••').slice(0, 400);
    box.innerHTML = `<div class="hint" style="margin-top:10px;border:1px solid rgba(255,79,94,.45)"><b class="bad">It did not work.</b> ${esc(aiExplain(msg))}<div class="xs muted" style="margin-top:8px;word-break:break-word">${e.model ? 'Model: ' + esc(e.model) + ' · ' : ''}${esc(msg)}</div></div>`;
  }
}
function aiClear() { const was = aiCfg().shared; localStorage.removeItem(FOOD_AI_KEY); if (was || (S.secrets && S.secrets.ai)) aiShare({}, false).catch(() => { }); closeModal(); render(); toast(was ? 'Key removed from all linked devices' : 'Key removed from this device'); }

/* ───────── capture → estimate → confirm ───────── */
let foodDraft = null;
function foodInputs() { if ($('food-cam')) return; const mk = (id, cap) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.id = id; i.style.display = 'none'; if (cap) i.setAttribute('capture', 'environment'); i.addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) foodFile(f); }); document.body.appendChild(i); }; mk('food-cam', true); mk('food-lib', false); }
function foodSnap() { foodInputs(); $('food-cam').click(); }
function foodPick() { foodInputs(); $('food-lib').click(); }
async function foodFile(file) {
  let im; try { im = await loadImage(file); } catch (e) { toast('Could not read that photo'); return; }
  const big = scaleImage(im, 1024, 0.82), thumb = scaleImage(im, 420, 0.8);
  foodDraft = { id: uid(), name: '', kcal: '', p: '', c: '', f: '', mult: 1, items: [], photo: big, thumb, src: 'photo', isNew: true };
  if (view !== 'food') { view = 'food'; curDate = new Date(); curDate.setHours(0, 0, 0, 0); render(); }
  if (!aiOn()) { foodForm(); return; }
  foodAnalyze('');
}
async function foodAnalyze(hint) {
  const d = foodDraft; if (!d) return;
  aiStatus = { t0: Date.now(), model: '', tries: 0 };
  openModal(`<h2>${d.photo ? 'Reading your plate' : 'Estimating your meal'}</h2>${d.photo ? `<img class="fphoto" src="${d.photo}" alt="">` : ''}<div class="scan"><div class="sp"></div><div class="lab" id="ai-prog">Estimating calories and macros…</div></div>
    <button class="btn primary block" style="margin-top:12px" onclick="foodBg()">Put the phone away · I'll log it when ready</button>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn grow" onclick="aiCancel()">Cancel</button><button class="btn grow" onclick="aiCancel();setTimeout(()=>{foodDraft&&(delete foodDraft.err);foodForm()},50)">Type it instead</button></div>`, true);
  clearInterval(aiTimer); aiTimer = setInterval(aiTick, 1000);
  try { const r = await aiEstimate(d.photo ? d.photo.split(',')[1] : '', hint || d.hint || '');
    Object.assign(d, { name: r.name, kcal: r.kcal, p: r.p, c: r.c, f: r.f, items: r.items, conf: r.conf, note: r.note, base: { kcal: r.kcal, p: r.p, c: r.c, f: r.f }, mult: 1, src: 'ai', hint: hint || d.hint || '' });
    if (d.bg) { foodBgDone(d); clearInterval(aiTimer); return; } if (foodDraft !== d) return; foodForm();
  } catch (e) { if (d.bg) { clearInterval(aiTimer); foodBgFail(d, e); return; } if (foodDraft !== d) return; if (/Cancelled/.test(e.message)) { clearInterval(aiTimer); return; } d.err = (/TIMEOUT/.test(e.message) ? 'No model answered in time. Check the internet connection, then tap Estimate again.' : aiExplain(e.message)) + ' (' + (e.model ? e.model + ': ' : '') + String(e.message || e).slice(0, 140) + ')'; foodForm(); }
  clearInterval(aiTimer);
}
let aiStatus = { t0: 0, model: '', tries: 0 }, aiTimer = null, foodBgN = 0;
/* background estimate: close the sheet, keep going; when the answer lands the meal is logged and a toast lets you check it */
function foodBg() { const d = foodDraft; if (!d) return; d.bg = true; d.day = dk(curDate); foodBgN++; foodDraft = null; closeModal(); render(); toast('Estimating in the background. You\u2019ll get a note when it\u2019s logged.'); }
function foodBgDone(d) {
  foodBgN = Math.max(0, foodBgN - 1); const t = new Date(), rec = { id: d.id, t: pad(t.getHours()) + ':' + pad(t.getMinutes()), name: d.name || 'Meal', kcal: Number(d.kcal) || 0, p: Number(d.p) || 0, c: Number(d.c) || 0, f: Number(d.f) || 0, src: 'ai' };
  if (d.photo) rec.ph = 1; meals(d.day).push(rec); if (d.thumb) phPut(d.id, dataUrlBlob(d.thumb)); touch(day(d.day)); render();
  try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch (e) { }
  toast(`Logged: ${rec.name} · ${rec.kcal} kcal · ${rec.p} g protein`, 'Check', () => { curDate = pd(d.day); show('food'); foodEdit(rec.id); });
}
function foodBgFail(d, e) { foodBgN = Math.max(0, foodBgN - 1); render(); d.bg = false; d.err = aiExplain(e.message) + ' (' + (e.model ? e.model + ': ' : '') + String(e.message || e).slice(0, 120) + ')'; toast('The meal estimate failed', 'Fix it', () => { foodDraft = d; show('food'); foodForm(); }); }
function aiTick() { const el = $('ai-prog'); if (!el) return; const s = Math.round((Date.now() - aiStatus.t0) / 1000); el.textContent = s < 6 ? 'Estimating calories and macros…' : `Waiting for ${aiStatus.model || 'the AI'} · ${s} s${aiStatus.tries > 1 ? ' · try ' + aiStatus.tries : ''}`; }
function foodForm() {
  const d = foodDraft; if (!d) return; const sv = foodState().saved, ai = aiOn();
  const head = d.isNew ? (d.src === 'ai' ? 'Looks like' : 'Log a meal') : 'Edit meal';
  const msg = d.err ? `<div class="hint" style="margin-bottom:12px;border:1px solid rgba(255,79,94,.4)"><b class="bad">The estimate failed.</b> ${esc(d.err)} Type the numbers or pick a saved meal.</div>`
    : d.src === 'photo' && !ai ? `<div class="hint" style="margin-bottom:12px"><b class="amber">Photo AI is off.</b> Turn it on once and photos fill these numbers by themselves. <a href="#" onclick="foodAiModal();return false">Set it up</a>. For now pick a saved meal or type the numbers.</div>` : '';
  openModal(`<h2>${head}</h2>${d.photo ? `<img class="fphoto" src="${d.photo}" alt="">` : d.hasPhoto ? `<img class="fphoto" data-ph="${d.id}" alt="">` : ''}${msg}
    <div class="field" style="margin-bottom:6px"><input id="fd-name" value="${esc(d.name)}" placeholder="What is it?" style="font-weight:600;font-size:16px"></div>
    <div class="fbig"><input id="fd-kcal" type="number" inputmode="numeric" value="${d.kcal}" placeholder="0"><span>kcal</span></div>
    <div class="fmac"><div class="m"><input id="fd-p" type="number" inputmode="numeric" value="${d.p}" placeholder="0"><div class="l c-mind">Protein g</div></div><div class="m"><input id="fd-c" type="number" inputmode="numeric" value="${d.c}" placeholder="0"><div class="l c-co">Carbs g</div></div><div class="m"><input id="fd-f" type="number" inputmode="numeric" value="${d.f}" placeholder="0"><div class="l" style="color:var(--pink)">Fat g</div></div></div>
    ${d.base ? `<div class="field"><label>Portion</label><div class="chips">${[0.5, 0.75, 1, 1.25, 1.5, 2].map((m) => `<span class="chip ${d.mult === m ? 'on' : ''}" onclick="foodMult(${m})">${m === 1 ? 'as shown' : '×' + m}</span>`).join('')}</div></div>` : ''}
    ${d.items && d.items.length ? `<div class="fitems">${d.items.map((x) => `<div><span>${esc(x.name)}${x.g ? ` · ${x.g} g` : ''}</span><span>${x.kcal} kcal · ${x.p} g P</span></div>`).join('')}</div>` : ''}
    ${d.src === 'ai' ? `<div class="xs muted" style="margin-bottom:12px">${d.conf ? `Confidence: <b>${esc(d.conf)}</b>. ` : ''}${esc(d.note || '')} A photo estimate is a good guess, not a lab result. Fix a number if you know better.</div>` : ''}
    ${ai && d.isNew ? `<div class="field"><label>${d.photo ? 'Wrong? Tell it what it is' : 'Or describe it and let AI estimate'}</label><div class="inline"><input id="fd-hint" value="${esc(d.hint || '')}" placeholder="e.g. 200 g rice, chicken breast, olive oil" onkeydown="if(event.key==='Enter')foodRe()"><button class="btn sm" onclick="foodRe()">${d.src === 'ai' ? 'Redo' : 'Estimate'}</button></div></div>` : ''}
    ${d.isNew && d.src !== 'ai' && sv.length ? `<div class="field"><label>Saved meals</label><div class="savedm">${sv.map((x, i) => `<button onclick="foodFill(${i})"><div class="n">${esc(x.name)}</div><div class="m"><b>${x.kcal}</b> kcal · ${x.p} g P</div></button>`).join('')}</div></div>` : ''}
    <label class="row small muted" style="gap:8px;margin:2px 0 4px;cursor:pointer"><input type="checkbox" id="fd-keep" style="width:18px;height:18px;padding:0;flex:none"> Also keep as a saved meal (one tap next time)</label>
    <div class="actions">${d.isNew ? `<button class="btn" onclick="foodCancel()">Cancel</button>` : `<button class="btn danger" onclick="foodDelete('${d.id}')">Delete</button>`}<button class="btn primary" onclick="foodSave()">${d.isNew ? 'Add to today' : 'Save'}</button></div>`, !!d.photo || d.src === 'ai' || !d.isNew);
  if (d.hasPhoto && !d.photo) hydratePhotos();
}
function foodRead() { const d = foodDraft; if (!d) return; const g = (id) => $(id) ? $(id).value : ''; d.name = g('fd-name').trim(); ['kcal', 'p', 'c', 'f'].forEach((x) => { const v = g('fd-' + x); d[x] = v === '' ? '' : Math.max(0, Math.round(Number(v) || 0)); }); if ($('fd-hint')) d.hint = g('fd-hint').trim(); }
function foodMult(m) { const d = foodDraft; if (!d || !d.base) return; foodRead(); d.mult = m; ['kcal', 'p', 'c', 'f'].forEach((x) => (d[x] = Math.round(d.base[x] * m))); foodForm(); }
function foodFill(i) { const d = foodDraft, x = foodState().saved[i]; if (!d || !x) return; foodRead(); Object.assign(d, { name: x.name, kcal: x.kcal, p: x.p, c: x.c || '', f: x.f || '' }); foodForm(); }
function foodRe() { foodRead(); const d = foodDraft; if (!d.photo && !d.hint) { toast('Describe the meal first'); return; } delete d.err; foodAnalyze(d.hint); }
function foodCancel() { foodDraft = null; closeModal(); }
function foodSave() {
  foodRead(); const d = foodDraft; if (!d) return;
  if (d.kcal === '' || !Number(d.kcal)) { toast('Add the calories'); return; }
  const list = meals(d.isNew ? curDate : d.k || curDate), nowT = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
  const rec = { id: d.id, t: d.t || nowT, name: d.name || 'Meal', kcal: Number(d.kcal) || 0, p: Number(d.p) || 0, c: Number(d.c) || 0, f: Number(d.f) || 0, src: d.src === 'ai' ? 'ai' : d.src === 'saved' ? 'saved' : 'manual' };
  if (d.photo || d.hasPhoto) rec.ph = 1;
  const i = list.findIndex((x) => x.id === d.id); if (i >= 0) list[i] = rec; else list.push(rec);
  if (d.thumb) phPut(d.id, dataUrlBlob(d.thumb));
  if ($('fd-keep') && $('fd-keep').checked) { const st = foodState(); st.saved.push({ id: uid(), name: rec.name, kcal: rec.kcal, p: rec.p, c: rec.c, f: rec.f }); foodTouch(); }
  touch(day(d.isNew ? curDate : d.k || curDate)); foodDraft = null; closeModal(); render();
  const t = foodTotals(curDate), tt = foodTargets(); toast(`${rec.kcal} kcal logged · ${fmt(Math.max(0, tt.kcal - t.kcal))} kcal and ${Math.max(0, Math.round(tt.p - t.p))} g protein to go`);
}
function foodEdit(id) { const k = dk(curDate), m = meals(k).find((x) => x.id === id); if (!m) return; foodDraft = Object.assign({}, m, { k, isNew: false, hasPhoto: !!m.ph, mult: 1 }); foodForm(); }
function foodDelete(id) { const o = day(curDate); o.meals = (o.meals || []).filter((x) => x.id !== id); phDel(id); touch(o); foodDraft = null; closeModal(); render(); toast('Meal removed'); }
function foodQuick(i) { const x = foodState().saved[i]; if (!x) return; const nowT = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()), id = uid(); meals(curDate).push({ id, t: nowT, name: x.name, kcal: x.kcal, p: x.p, c: x.c || 0, f: x.f || 0, src: 'saved' }); touch(day(curDate)); render(); toast(`${x.name} · ${x.kcal} kcal`, 'Undo', () => { const o = day(curDate); o.meals = o.meals.filter((m) => m.id !== id); touch(o); render(); }); }
function foodManual() { foodDraft = { id: uid(), name: '', kcal: '', p: '', c: '', f: '', mult: 1, items: [], src: 'manual', isNew: true }; foodForm(); }
function foodSavedModal() {
  const st = foodState();
  openModal(`<h2>Saved meals &amp; targets</h2><div class="g2"><div class="field"><label>Calories a day</label><input type="number" inputmode="numeric" value="${st.kcal}" onchange="S.food.kcal=Math.max(0,Number(this.value)||0);foodTouch()"></div><div class="field"><label>Protein a day (g)</label><input type="number" inputmode="numeric" value="${st.p}" onchange="S.food.p=Math.max(0,Number(this.value)||0);foodTouch()"></div></div>
    <div class="sec-h">Saved meals · one tap to log</div>${st.saved.map((x, i) => `<div class="row" style="gap:6px;margin-bottom:8px"><input value="${esc(x.name)}" style="flex:2" onchange="S.food.saved[${i}].name=this.value;foodTouch()"><input type="number" inputmode="numeric" value="${x.kcal}" style="flex:1;text-align:center" title="kcal" onchange="S.food.saved[${i}].kcal=Number(this.value)||0;foodTouch()"><input type="number" inputmode="numeric" value="${x.p}" style="flex:1;text-align:center" title="protein g" onchange="S.food.saved[${i}].p=Number(this.value)||0;foodTouch()"><button class="btn sm danger" onclick="S.food.saved.splice(${i},1);foodTouch();foodSavedModal()">×</button></div>`).join('')}
    <div class="xs muted" style="margin-bottom:10px">Columns: name · kcal · protein g</div>
    <div class="actions"><button class="btn" onclick="S.food.saved.push({id:uid(),name:'New meal',kcal:0,p:0,c:0,f:0});foodTouch();foodSavedModal()">+ Add</button><button class="btn primary" onclick="closeModal();render()">Done</button></div>`, true);
}

/* ───────── screen ───────── */
function foodSummaryCard(k) {
  const t = foodTotals(k), tt = foodTargets(), left = tt.kcal - t.kcal;
  const svg = ringsSvg([{ p: t.kcal / tt.kcal, c1: RING_C.co[0], c2: RING_C.co[1] }, { p: t.p / tt.p, c1: RING_C.mind[0], c2: RING_C.mind[1] }], 200, 20, 5);
  const M = (l, v, tg, cls) => `<div class="macro"><div class="h"><span class="l">${l}</span><span class="v">${Math.round(v)}<small>${tg ? ' / ' + tg : ''} g</small></span></div>${tg ? `<div class="bar"><i class="${cls}" style="width:${clamp((v / tg) * 100, 0, 100)}%"></i></div>` : ''}</div>`;
  return `<div class="card go" onclick="metricDetail('protein')"><div class="fsum"><div class="rg">${svg}<div class="ctr"><b>${fmt(Math.abs(left))}</b><span>${left >= 0 ? 'kcal left' : 'kcal over'}</span></div></div><div class="macros"><div class="macro"><div class="h"><span class="l">Calories</span><span class="v">${fmt(t.kcal)}<small> / ${fmt(tt.kcal)}</small></span></div></div>${M('Protein', t.p, tt.p, 'p')}<div class="row" style="gap:16px;align-items:flex-start"><div class="grow">${M('Carbs', t.c, 0, 'c')}</div><div class="grow">${M('Fat', t.f, 0, 'f')}</div></div></div></div></div>`;
}
function renderFood() {
  const k = dk(curDate), st = foodState(), list = meals(k).slice().sort((a, b) => (a.t || '').localeCompare(b.t || '')), tt = foodTargets(), today = isToday(curDate), ai = aiOn(), cfg = aiCfg();
  const add = `<button class="snap" onclick="foodSnap()">${ic('camera')}Snap a meal</button>
    <div class="snap2"><button class="btn" onclick="foodPick()">${ic('image', 18)} From photos</button><button class="btn" onclick="foodManual()">${ic('pen', 18)} ${ai ? 'Describe or type' : 'Type it'}</button></div>
    <div class="card"><div class="card-h"><div class="card-t">Your plan · tap to log</div><div class="card-r">${st.saved.filter((x) => list.some((m) => m.name === x.name)).length} of ${st.saved.length} eaten · <a href="#" onclick="foodSavedModal();return false">edit</a></div></div><div class="savedm">${st.saved.map((x, i) => `<button class="${list.some((m) => m.name === x.name) ? 'eaten' : ''}" onclick="foodQuick(${i})"><div class="n">${list.some((m) => m.name === x.name) ? '✓ ' : ''}${esc(x.name)}</div><div class="m"><b>${x.kcal}</b> kcal · ${x.p} g P</div></button>`).join('') || '<div class="empty">No saved meals yet.</div>'}</div></div>
    <div class="card flat" onclick="foodAiModal()" style="cursor:pointer"><div class="row sb"><div><div class="lab">Photo AI</div><div class="small muted" style="margin-top:3px">${ai ? `On · ${cfg.provider === 'anthropic' ? 'Claude' : 'Gemini'}${cfg.shared ? ' · shared with linked devices' : ' · this device only'}` : 'Off. Add a key once and photos fill the numbers.'}</div></div><span class="pill ${ai ? 'on' : 'warn'}">${ai ? 'on' : 'set up'}</span></div></div>`;
  const log = `<div class="card"><div class="card-h"><div class="card-t">${today ? 'Today' : fmtShort(curDate)} · ${list.length} meal${list.length === 1 ? '' : 's'}</div><div class="card-r">tap a meal to fix it</div></div>${list.length ? list.map((m) => `<div class="meal" onclick="foodEdit('${m.id}')"><div class="ph">${m.ph ? `<img data-ph="${m.id}" alt="">` : ic('food', 22)}</div><div class="bd"><div class="nm">${esc(m.name)}</div><div class="mc">${m.t || ''} · P ${Math.round(m.p)} g${m.c || m.f ? ` · C ${Math.round(m.c)} · F ${Math.round(m.f)}` : ''}${m.src === 'ai' ? ' · AI' : ''}</div></div><div class="kc">${fmt(m.kcal)}<small>KCAL</small></div></div>`).join('') : `<div class="empty">Nothing logged ${today ? 'yet today' : 'this day'}. Snap the next thing you eat.</div>`}</div>`;
  const days = []; for (let i = 6; i >= 0; i--) { const d = addDays(curDate, -i), t = foodTotals(d); days.push({ l: DAY_SHORT[dow(d)], v: t.kcal, t: tt.kcal, cls: t.kcal >= tt.kcal * 0.9 ? 'hit' : '', top: t.kcal ? (t.kcal / 1000).toFixed(1) + 'k' : '', go: `dayDetail('${dk(d)}')`, today: dk(d) === dk(new Date()) }); }
  const hit = days.filter((x) => x.v >= tt.kcal * 0.9).length;
  const week = `<div class="card"><div class="card-h go" onclick="metricDetail('kcal')"><div class="card-t">Last 7 days · calories ›</div><div class="card-r"><b>${hit}</b>/7 on target</div></div>${vbars(days, { h: 130, max: tt.kcal * 1.1 })}<div class="legend"><span><i class="ln" style="background:var(--text);opacity:.5"></i>${fmt(tt.kcal)} kcal target</span><span><i style="background:var(--body)"></i>within 10%</span></div></div>`;
  const bgc = foodBgN ? `<div class="card flat" style="border-color:rgba(255,165,31,.4)"><div class="row" style="gap:10px"><span class="spin"></span><div class="small">Estimating ${foodBgN} meal${foodBgN > 1 ? 's' : ''} in the background…</div></div></div>` : '';
  $('view-food').innerHTML = `<div class="fgrid"><div>${bgc}${foodSummaryCard(k)}${add}</div><div>${log}${week}</div></div>`;
  hydratePhotos();
}
