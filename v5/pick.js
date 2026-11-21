/* War Room 13.80 · pick.js
   1. Watch by teacher: choose who (Alex Hormozi, Leila Hormozi, …), what kind (business, mindset and motivation, life and
      health), how (watch, listen, any) and how long you have. It fills the time from the library and the lesson videos.
      The topic is read from the lesson a video teaches or from words in its title, so it can be wrong; it says so.
      It is a side door to the library: it ranks nothing for your day, and the library's "Don't consume. Go execute."
      rule still applies first.
   2. Rate the next video: the lesson videos whose fit nobody confirmed, one at a time, with the two buttons.
   3. Visible doors on the Learn screen: Communication, Watch by teacher, Rate videos. Until 13.79 Communication could only
      be reached through Where do I…?.
   Store: pk:last (the last choice). */
const PK_CAT = { biz: 'Business', mind: 'Mindset and motivation', life: 'Life and health', any: 'Anything' };
const PK_FMT = { watch: 'Watch', listen: 'Listen', any: 'Watch or listen' };
const PK_MIN = [10, 15, 20, 30, 45, 60, 90];
function pkWho(by) { const b = String(by || ''); if (/leila/i.test(b)) return 'Leila Hormozi'; if (/hormozi|acquisition\.com|moremozi|the game/i.test(b)) return 'Alex Hormozi'; const n = b.replace(/\(.*?\)/g, '').split(/ · | \/ /)[0].trim(); return n || 'Other'; }
function pkCat(x) { const cs = (x.cards || []).map((id) => (typeof XC !== 'undefined' && XC && XC.byId[id] ? XC.byId[id].c : '')).filter(Boolean), t = (String(x.t || '') + ' ' + String(x.topics || '')).toLowerCase();
  if (cs.some((c) => ['sales', 'offer', 'leads', 'mm', 'scale', 'wealth'].includes(c)) || /lost chapters|\$100m|money model|offer|lead|sales|sell|money|price|pricing|scal|business|ads|hiring|hire|agency|customer|marketing|profit|revenue|close|churn/.test(t)) return 'biz';
  if (cs.includes('mind') || /mindset|motivat|discipline|hard|courage|fear|confiden|habit|truth|standard|ruthless|success|mental|emotion|regret|quit|patience|identity|why you|lazy|excuse/.test(t)) return 'mind';
  if (cs.includes('life') || /health|sleep|relationship|family|fitness|diet|life/.test(t)) return 'life';
  return 'other'; }
const PK_HZ = ['mind', 'scale', 'offer', 'leads', 'mm', 'sales', 'wealth'];
function pkBy(x) { if (x.by) return x.by; const c = (x.cards || []).map((id) => (typeof XC !== 'undefined' && XC && XC.byId ? XC.byId[id] : null)).find(Boolean); if (!c) return ''; if (/leila/i.test(x.t || '')) return 'Leila Hormozi'; return c.clipBy || c.who || (PK_HZ.includes(c.c) ? 'Alex Hormozi' : ''); }
function pkPool() { let A = []; try { A = ccAll(); } catch (e) { } return A.filter((x) => (x.fmt === 'watch' || x.fmt === 'listen') && x.min > 0 && (typeof ccOpenable === 'function' ? ccOpenable(x) : true)).map((x) => Object.assign({}, x, { who: pkWho(pkBy(x)), cat: pkCat(x) })); }
function pkTeachers() { const n = {}; pkPool().forEach((x) => { n[x.who] = (n[x.who] || 0) + 1; }); return Object.entries(n).sort((a, b) => b[1] - a[1]); }
function pkPlan(who, cat, fmt, min) { const P = pkPool().filter((x) => (!who || x.who === who) && (cat === 'any' || x.cat === cat) && (fmt === 'any' || x.fmt === fmt)).sort((a, b) => ((b.u.st === 'doing') - (a.u.st === 'doing')) || (a.u.st === 'seen') - (b.u.st === 'seen') || b.min - a.min);
  const pick = []; let left = min; P.forEach((x) => { if (x.min <= left) { pick.push(x); left -= x.min; } });
  const over = pick.length ? null : P.slice().sort((a, b) => a.min - b.min)[0] || null;
  return { pick, used: min - left, min, n: P.length, over }; }
function pkOpen(step) { const L = bcV('pk:last', null) || {}, s = Object.assign({ who: L.who || 'Alex Hormozi', cat: L.cat || 'biz', fmt: L.fmt || 'any', min: L.min || 30 }, step || {}); window._pk = s;
  let g = null; try { g = ccGate(); } catch (e) { }
  if (typeof KPL === 'undefined' || !KPL || typeof XC === 'undefined' || !XC) { try { if (typeof XC === 'undefined' || !XC) xcLoad(); } catch (e) { } try { if (typeof KPL === 'undefined' || !KPL) ccLoad(); } catch (e) { } const t = (window._pkT = (window._pkT || 0) + 1); openModal('<h2>Watch by teacher</h2><div class="hint">' + (t > 40 ? 'The library did not load. Check the connection and open this again.' : 'Loading the library…') + '</div>', true); if (t <= 40) setTimeout(() => pkOpen(step), 250); return; } window._pkT = 0;
  const T = pkTeachers(), chip = (k, v, l, on) => `<button class="btn${on ? ' on' : ''}" onclick="pkSet('${k}', ${typeof v === 'number' ? v : `'${String(v).replace(/'/g, "\\'")}'`})">${esc(l)}</button>`;
  openModal(`<h2>Watch by teacher</h2><div class="hint">Pick who, what kind and how long you have. It fills the time from your library and lesson videos.</div>
    ${g ? `<div class="cc-gate" id="pk-gate"><b>Don't consume. Go execute.</b><div>${esc(g.out)}</div><div class="xs">${esc(g.why)}</div><div class="fn-inline"><button class="btn" onclick="ccGateOver();pkOpen()">Show it anyway (logged)</button></div></div>` : ''}
    <div class="mc-wl"><span>Who</span><div class="fn-inline" style="flex-wrap:wrap">${T.slice(0, 10).map(([w, n]) => chip('who', w, `${w} (${n})`, s.who === w)).join('')}</div></div>
    <div class="mc-wl"><span>What kind</span><div class="fn-inline" style="flex-wrap:wrap">${Object.entries(PK_CAT).map(([k, l]) => chip('cat', k, l, s.cat === k)).join('')}</div></div>
    <div class="mc-wl"><span>How</span><div class="fn-inline" style="flex-wrap:wrap">${Object.entries(PK_FMT).map(([k, l]) => chip('fmt', k, l, s.fmt === k)).join('')}</div></div>
    <div class="mc-wl"><span>How much time</span><div class="fn-inline" style="flex-wrap:wrap">${PK_MIN.map((m) => chip('min', m, m + ' min', s.min === m)).join('')}</div></div>
    <div id="pk-out">${g ? '' : pkOut(s)}</div>
    <div class="actions"><button class="btn primary" onclick="closeModal()">Close</button></div>`, true); }
function pkSet(k, v) { const s = Object.assign({}, window._pk || {}); s[k] = v; bcW('pk:last', { who: s.who, cat: s.cat, fmt: s.fmt, min: s.min }); pkOpen(s); }
function pkOut(s) { const R = pkPlan(s.who, s.cat, s.fmt, s.min), row = (x) => `<button class="lx-row" onclick="closeModal();ccView('${String(x.id).replace(/'/g, '')}')"><b>${x.min}</b><span>${esc(x.t)}<em>${esc(x.who)} · ${esc((CC_FMT[x.fmt] || ['', ''])[0])} · ${esc(PK_CAT[x.cat] || 'Other')}${x.u.st === 'doing' ? ' · started' : ''}</em></span><i>›</i></button>`;
  if (!R.n) return `<div class="hint" id="pk-none">Nothing in the library matches ${esc(s.who)} · ${esc(PK_CAT[s.cat])} · ${esc(PK_FMT[s.fmt])}. Try Anything, or another teacher.</div>`;
  if (!R.pick.length) return `<div class="hint">Everything that matches is longer than ${s.min} minutes. The shortest:</div>${R.over ? row(R.over) : ''}`;
  return `<div class="mc-wl" id="pk-plan"><span>${R.pick.length} for ${R.used} of your ${s.min} minutes · ${R.n} match</span></div>${R.pick.map(row).join('')}<div class="xs muted">The kind is read from the lesson a video teaches, or from words in its title, so a few may be filed under the wrong kind. Lengths marked ≈ are estimates.</div>`; }

/* ── 2. rate the next unconfirmed video ── */
function pkRateList() { if (typeof XC === 'undefined' || !XC || !XC.cards) return []; return XC.cards.filter((c) => (c.clip || []).length && !rsVid(c).content && !rsVid(c).me).sort((a, b) => (rsVid(a).title ? 1 : 0) - (rsVid(b).title ? 1 : 0)); }
function pkRateOpen() { const L = pkRateList(), c = L[0];
  if (!c) { openModal('<h2>Rate the next video</h2><div class="hint">Every lesson video is either inspected or rated by you. Nothing left.</div><div class="actions"><button class="btn primary" onclick="closeModal()">Close</button></div>', true); return; }
  const V = rsVid(c), cl = c.clip[0], m = cl && cl[2] > cl[1] ? Math.max(1, Math.round((cl[2] - cl[1]) / 60)) : c.clipMin || null;
  openModal(`<h2>Rate the next video</h2><div class="hint">${L.length} lesson video${L.length === 1 ? '' : 's'} still need${L.length === 1 ? 's' : ''} someone to confirm the video teaches what the lesson says. Watch it, then tap one button.</div>
    <div class="mc-wl" id="pk-rate"><span>Lesson</span><div><b>${esc(c.t)}</b></div><div class="xs">${esc(c.clipBy || c.who || '')}${m ? ' · about ' + m + ' min' : ''} · ${V.title ? 'its title matches the lesson; what is said in it was not checked' : 'only checked that the video exists'}</div></div>
    <div class="fn-inline"><button class="btn" onclick="closeModal();xcOpen('${c.id}')">Open the lesson and its video</button></div>
    <div class="fn-inline"><button class="btn" id="pk-ok" onclick="rsVidRate('${c.id}',1);pkRateOpen()">Watched: it fits</button><button class="btn" id="pk-bad" onclick="rsVidRate('${c.id}',0);pkRateOpen()">Watched: does not fit</button></div>
    <div class="xs muted">Does not fit starts a search for a better video. Rate only what you actually watched.</div>
    <div class="actions"><button class="btn primary" onclick="closeModal()">Later</button></div>`, true); }

/* ── 3. visible doors on the Learn screen ── */
if (typeof lxHome === 'function' && !lxHome._pk) { const f = lxHome; lxHome = function () { const h = f.apply(this, arguments); if (typeof h !== 'string' || h.indexOf('<div class="lx-sec">Your paths</div>') < 0) return h; let r = 0; try { r = pkRateList().length; } catch (e) { }
  const row = (n, t, sub, act, id) => `<button class="lx-row" id="${id}" onclick="${act}"><b>${n}</b><span>${t}<em>${sub}</em></span><i>›</i></button>`;
  return h.replace('<div class="lx-sec">Your paths</div>', `<div class="lx-sec">Other ways to learn</div>${row('🗣', 'Communication', 'speak or type in Romanian and English, then say it better', 'spkOpen()', 'lx-speak')}${row('▶', 'Watch by teacher', 'pick who, what kind and how long you have', 'pkOpen()', 'lx-pick')}${r ? row(r, 'Rate videos', 'lesson videos nobody has confirmed yet', 'pkRateOpen()', 'lx-rate') : ''}<div class="lx-sec">Your paths</div>`); }; lxHome._pk = 1; }

/* ── finder entries ── */
try { if (typeof WF !== 'undefined') { const put = (e) => { if (!WF.some((x) => x[0] === e[0])) WF.push(e); };
  put(['pick', 'learn', 'Watch something: choose the teacher, the kind and the time', 'watch hormozi leila motivational motivation business mindset video videos podcast listen minutes teacher who', 'Learn → Watch by teacher', 'Pick who (for example Alex Hormozi), what kind (business, mindset) and how many minutes you have; it fills the time.', () => { try { wfHideArc(); } catch (e) { } pkOpen(); }]);
  put(['vidrate', 'learn', 'Rate lesson videos nobody has confirmed', 'rate rating videos confirm fit watched unconfirmed 111', 'Learn → Rate videos', 'One lesson video at a time: watch it, then mark whether it teaches what the lesson says.', () => { try { wfHideArc(); } catch (e) { } pkRateOpen(); }]);
  put(['aiset', 'sys', 'AI settings: provider, key and model', 'ai model gemini claude key provider settings switch model not answering photo ai', 'Food → Photo AI', 'Change the AI model (for example gemini-flash-lite-latest) or the provider. The key is kept on the server.', () => { try { wfHideArc(); } catch (e) { } foodAiModal(); }]);
} } catch (e) { }
