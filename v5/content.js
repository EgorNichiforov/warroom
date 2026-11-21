/* 13.27 · Content Command Center.
   One finite, explained learning queue instead of a feed. Everything here is an index over data that already exists:
   lib/sources.json (books, emails, lectures, audiobook chapters, official pages), the clips on Bootcamp cards, and lib/mentors.json.
   State: S.content[id] = { st: saved|doing|done|arch, pos, ins, use, log:[{d,min}], rate }, S.research (requests the scheduled
   scan reads), S.settings.discovery (frequency, push, exploration budget), day.content (today's finite queue).
   Honest limits: this app cannot scan the internet or your inbox by itself. Discovery is done by a Claude scheduled task that
   leaves a note in the inbox; nothing is added to the library without your tap. It cannot block other apps either. */
let CCM = null, ccmLoading = false, CCSEC = 'rec', CCMORE = 15;
const CC_FMT = { watch: ['Watch', '▶'], listen: ['Listen', '♪'], read: ['Read', '≡'], course: ['Course', '▤'] };
const CC_CLAIM = { official: 'Official source', research: 'Research finding', expert: 'Expert guidance', practitioner: 'Practitioner advice', heuristic: 'Rule of thumb', opinion: 'Opinion', unverified: 'Unverified' };
const CC_TIER = { core: ['Core', 'Serves the current bottleneck or the BAC'], support: ['Supporting', 'Builds a capability on your map'], explore: ['Exploration', 'Interesting, not needed now. Budgeted.'] };
const CC_SEC = [['rec', 'Recommended'], ['watch', 'Watch next'], ['listen', 'Listen next'], ['vid', 'Video library'], ['aud', 'Audio library'], ['txt', 'Reading library'], ['crs', 'Courses'], ['men', 'Mentors'], ['new', 'New discoveries'], ['saved', 'Saved'], ['doing', 'Currently learning'], ['done', 'Completed'], ['res', 'Research & deep dives'], ['impl', 'Knowledge to implement']];
const CC_INTENT = { bottleneck: ['Fix the bottleneck', 'What moves the business or the BAC now'], skill: ['Build a skill', 'The next capability on your map'], bac: ['BAC', 'Study method and official material'], calm: ['Wind down', 'Sleep, attention, recovery'], curious: ['Explore', 'Wider knowledge, inside the weekly budget'], any: ['Best use', 'Let War Room choose'] };
const CC_CHAIN = [['discover', 'Discover'], ['capture', 'Capture'], ['verify', 'Verify source'], ['quality', 'Evaluate quality'], ['dedupe', 'Remove duplicates'], ['classify', 'Classify'], ['connect', 'Connect to curriculum'], ['process', 'Process'], ['recommend', 'Recommend'], ['consume', 'Consume'], ['test', 'Test'], ['implement', 'Implement'], ['measure', 'Measure']];

function ccLoad(cb) {
  const done = () => { if (typeof KPL !== 'undefined' && KPL && CCM) { if (cb) cb(); return true; } return false; }; if (done()) return;
  if (typeof kpLoad === 'function') kpLoad();
  if (!CCM && !ccmLoading) { ccmLoading = true; fetch('./lib/mentors.json').then((r) => r.json()).then((d) => { CCM = d; ccmLoading = false; }).catch(() => { CCM = { mentors: [] }; ccmLoading = false; }); }
  let n = 0; const t = setInterval(() => { if (done() || ++n > 80) clearInterval(t); }, 150);
}
function ccRec(id) { const r = (S.content || {})[id]; return r && !r._del ? r : {}; }
function ccW(id, patch) { S.content = S.content || {}; S.content[id] = Object.assign({}, S.content[id] || { id }, patch, { id, _u: now(), _del: false }); save(); }
function ccCfg() { const c = (S.settings || {}).discovery || {}; return { freq: c.freq || 'weekly', auto: c.auto !== false, lastAuto: c.lastAuto || null, push: c.push !== false, explore: c.explore != null ? Number(c.explore) : 60, dayMin: c.dayMin != null ? Number(c.dayMin) : 30 }; }
/* the index: library + your own sources + clips that sit on lesson cards */
function ccAll() {
  const out = (typeof kpAll === 'function' ? kpAll() : []).map((x) => Object.assign({ fmt: 'read', min: 5, tier: 'support', claim: 'unverified' }, x));
  if (typeof XC !== 'undefined' && XC && XC.cards) XC.cards.forEach((c) => (c.clip || []).forEach((cl, i) => { const sec = (cl[2] || 0) - (cl[1] || 0); if (out.some((x) => x.yt === cl[0] && (x.cards || []).includes(c.id))) return; out.push({ id: 'clip:' + c.id + ':' + i, t: cl[3] || c.t, by: c.who || '', fmt: 'watch', min: sec > 0 ? Math.max(1, Math.round(sec / 60)) : c.clipMin || 5, est: !(sec > 0) && !c.clipMin, yt: cl[0], s: cl[1] || 0, e: cl[2] || 0, cards: [c.id], caps: typeof cmCapsOfCard === 'function' ? cmCapsOfCard(c.id).map((k) => k.id || k) : [], tier: c.c === 'life' ? 'support' : 'core', claim: 'practitioner', why: 'The moment in the source video that teaches "' + c.t + '".', clip: 1, screen: true, stat: 'official' }); }));
  return out.map((x) => Object.assign(x, { u: ccRec(x.id) }));
}
function ccGet(id) { return ccAll().find((x) => x.id === id) || null; }
function ccMin(x) { return (x.est ? '≈' : '') + (x.min >= 90 ? Math.round(x.min / 6) / 10 + ' h' : x.min + ' min'); }
function ccLeft(x) { const p = Number(x.u.pos) || 0; return Math.max(1, Math.round(x.min - p / 60)); }
/* focus: what the rest of War Room says matters now */
function ccFocus() {
  const F = { caps: [], cards: [], why: '', dom: '' }; let ssn = null; try { ssn = typeof mcSeason === 'function' ? mcSeason() : null; } catch (e) { }
  try { const lens = typeof mcLens === 'function' ? mcLens() : ''; F.dom = lens || (ssn ? ssn.dom : ''); } catch (e) { }
  try { const nx = typeof cmNext === 'function' ? cmNext() : null; if (nx && nx.cap) { F.caps.push(nx.cap.id); F.why = nx.cap.n; (nx.cap.cards || []).forEach((c) => F.cards.push(c)); } } catch (e) { }
  try { if (typeof stFocusCaps === 'function' && (!F.dom || F.dom === 'biz')) stFocusCaps().forEach((c) => { if (!F.caps.includes(c)) F.caps.push(c); }); } catch (e) { }
  try { (typeof cmWeak === 'function' ? cmWeak() : []).slice(0, 3).forEach((w) => { const id = (w.c && w.c.id) || w.id; if (id && !F.caps.includes(id)) F.caps.push(id); }); } catch (e) { }
  return F;
}
function ccScore(x, F, intent) {
  let s = { core: 3, support: 2, explore: 0.5 }[x.tier] || 1; const why = [];
  if (x.tier === 'core') why.push('core for the current bottleneck');
  const hit = (x.caps || []).filter((c) => F.caps.includes(c)); if (hit.length) { s += 3; why.push('trains your next capability' + (F.why ? ' (' + F.why + ')' : '')); }
  if (x.u.st === 'doing') { s += 2; why.push('already started: ' + ccLeft(x) + ' min left'); }
  if (x.u.st === 'saved') { s += 1; why.push('you saved it'); }
  if ((x.cards || []).length) { s += 0.8; if (!hit.length) why.push('linked to ' + x.cards.length + ' lesson' + (x.cards.length > 1 ? 's' : '')); }
  if (x.claim === 'official' || x.claim === 'research') s += 0.4;
  try { if (typeof rsHorizon === 'function') { const h = rsHorizon(x); if (h === 'now') { s += 2.5; if (!hit.length) why.unshift('needed now: ' + ((x.caps || []).map((c) => (cmCap(c) || {}).n).filter(Boolean)[0] || 'current stage')); } else if (h === 'next') s += 0.8; else s -= 0.8; } } catch (e) { }
  const dom = (x.caps || []).map((c) => c[0]);
  if (intent === 'bottleneck') { if (x.tier === 'core') s += 2; if (F.dom === 'bac' && /ance|l-howto|l-recall|l-deep/.test((x.mentor || '') + (x.caps || []).join(' '))) s += 2; }
  if (intent === 'skill' && hit.length) s += 2;
  if (intent === 'bac') { if (x.mentor === 'ance' || (x.caps || []).some((c) => /^l-/.test(c))) { s += 4; why.push('study method or official BAC material'); } else s -= 2; }
  if (intent === 'calm') { if (dom.includes('p') || dom.includes('r')) { s += 3; why.push('recovery and attention'); } else s -= 2; }
  if (intent === 'curious') { if (x.tier === 'explore') { s += 3.5; why.push('exploration'); } }
  if (x.ins && x.id.startsWith('em-')) s += 0.3;
  return { s, why: why.slice(0, 3).join(' · ') || (CC_TIER[x.tier] || ['', ''])[1] };
}
function ccOpenable(x) { return !['done', 'arch'].includes(x.u.st) && x.acc !== 'none' && x.stat !== 'gap' && !(x.id.startsWith('em-') && (!x.ins || /^Promotion or announcement/.test(x.ins))); }
function ccExploreUsed() { const from = dk(addDays(new Date(), -6)); let m = 0; ccAll().forEach((x) => { if (x.tier === 'explore') (x.u.log || []).forEach((l) => { if (l.d >= from) m += Number(l.min) || 0; }); }); return m; }
/* "I have X minutes": one finite session, every step explained */
function ccPlan(min, intent, mode) {
  min = Math.max(3, Number(min) || 15); intent = intent || 'any'; mode = mode || 'any';
  try { const ap = typeof rsApplyFirst === 'function' && intent !== 'curious' && intent !== 'calm' ? rsApplyFirst() : null; if (ap) return { steps: ap.slice(0, 2).map((x) => ({ k: 'capture', id: x.id, min: Math.min(10, Math.floor(min / 2)) || 3, t: 'Apply: ' + x.u.ins.slice(0, 80), why: 'You finished this and have not used it. Turn it into a task, an experiment or a procedure before taking in more.' })), min, intent, mode, note: '', apply: 1 }; } catch (e) { } const F = ccFocus(), cfg = ccCfg(), exLeft = Math.max(0, cfg.explore - ccExploreUsed());
  let P = ccAll().filter(ccOpenable).filter((x) => mode === 'any' || (mode === 'hands' ? x.fmt === 'listen' || x.screen === false : x.fmt === mode || (mode === 'read' && x.fmt === 'course')));
  if (intent !== 'curious') P = P.filter((x) => x.tier !== 'explore' || exLeft >= Math.min(x.min, min)); else if (exLeft <= 0) return { steps: [], note: `This week's exploration budget (${cfg.explore} min) is used. Pick another goal, or raise the budget in Content settings.`, min };
  const R = P.map((x) => { const sc = ccScore(x, F, intent), part = ccLeft(x) > min; return { x, s: sc.s - (part ? (x.fmt === 'read' ? 3 : 0.6) : 0) + (ccLeft(x) <= min && ccLeft(x) >= min * 0.5 ? 0.7 : 0), why: sc.why, part }; }).sort((a, b) => b.s - a.s);
  const top = R[0]; if (!top) return { steps: [], note: 'Nothing in the library fits this time and format. Try another format, or request research.', min };
  const use = Math.min(min >= 10 ? min - 2 : min, ccLeft(top.x)), steps = [{ k: 'consume', id: top.x.id, min: use, t: top.x.t, why: top.why + (top.part ? ` · ${min} of ${ccLeft(top.x)} min now, it resumes where you stop` : '') }]; let left = min - use;
  if (left >= 2 || min >= 10) steps.push({ k: 'capture', id: top.x.id, min: 2, t: 'Write the one idea you will use', why: 'An idea you do not write down is gone by tomorrow.' }), (left -= 2);
  const card = (top.x.cards || []).find((c) => typeof XC !== 'undefined' && XC && XC.byId[c]);
  if (card && left >= 3) steps.push({ k: 'test', id: card, min: 3, t: 'Recall test: ' + XC.byId[card].t, why: 'Testing right after is what turns watching into knowing.' }), (left -= 3);
  if (left >= 8) { const nx = R.find((r) => r.x.id !== top.x.id && ccLeft(r.x) <= left && r.x.fmt !== 'course'); if (nx) steps.push({ k: 'consume', id: nx.x.id, min: ccLeft(nx.x), t: nx.x.t, why: nx.why }); }
  return { steps, min, intent, mode, note: '' };
}
/* the gate: content never jumps the queue ahead of the work it is meant to serve */
function ccGate() {
  try { const o = S.days[dk(new Date())] || {}; if ((o.content || {}).over) return null; const M = typeof mcBuild === 'function' ? mcBuild() : null, t = M && M.top; if (!t) return null;
    if (t.k === 'dial' && t.tier <= 2) return { out: t.out, why: 'Agencies are open now. Learning about calls is not calls.', k: 'dial' };
    if (t.k === 'sleep') return { out: 'Sleep', why: 'It is past bedtime. Nothing here is worth tomorrow\'s energy.', k: 'sleep' };
    if (t.k === 'fixed') return { out: t.out, why: 'You are in a fixed commitment.', k: 'fixed' };
    if (t.k === 'bac' && t.urgent) return { out: t.out, why: 'Due BAC errors come first.', k: 'bac' }; } catch (e) { }
  return null;
}
function ccGateOver() { const o = day(new Date()); o.content = Object.assign({}, o.content || {}, { over: now() }); if (typeof touch === 'function') touch(o); save(); S.journal = S.journal || {}; const jid = 'j' + uid(); S.journal[jid] = { id: jid, _u: now(), at: dk(new Date()), kind: 'trigger', dom: 'reg', text: 'Opened content while a work block was live' }; save(); render(); }
/* today's queue: built once a day, at most three items, never refilled */
function ccToday() {
  const o = day(new Date()); if (o.content && o.content.ids && o.content.d === dk(new Date())) return o.content;
  if (!(typeof KPL !== 'undefined' && KPL)) return { ids: [], pending: 1 };
  const F = ccFocus(), cfg = ccCfg(), P = ccAll().filter(ccOpenable), pick = [], rank = (intent, f) => P.filter((x) => !pick.includes(x.id) && f(x)).map((x) => ({ x, s: ccScore(x, F, intent).s })).sort((a, b) => b.s - a.s)[0];
  let budget = cfg.dayMin; const add = (r) => { if (r && budget > 0) { pick.push(r.x.id); budget -= Math.min(r.x.min, budget); } };
  add(rank('bottleneck', (x) => x.tier === 'core' && x.min <= 20)); add(rank('skill', (x) => x.u.st === 'doing' || ((x.caps || []).some((c) => F.caps.includes(c)) && x.min <= 20))); add(rank('any', (x) => (x.fmt === 'listen' || x.screen === false) && x.min <= 25 && x.tier !== 'explore'));
  o.content = Object.assign({}, o.content || {}, { ids: pick, d: dk(new Date()), at: now() }); if (typeof touch === 'function') touch(o); save(); return o.content;
}
/* ── rendering ── */
function ccRow(x, why) { const f = CC_FMT[x.fmt] || CC_FMT.read, st = x.u.st; return `<button class="cc-r ${st || ''}" onclick="ccView('${esc(x.id)}')"><i>${f[1]}</i><span><b>${esc(x.t)}</b><em>${esc(x.by || '')}${x.by ? ' · ' : ''}${ccMin(x)}${st === 'doing' ? ' · ' + ccLeft(x) + ' left' : ''}${x.screen === false ? ' · no screen needed' : ''}${st === 'done' ? ' · done' : ''}</em>${why ? `<u>${esc(why)}</u>` : ''}</span></button>`; }
function ccList(sec) {
  const A = ccAll(), F = ccFocus(), open = A.filter(ccOpenable), by = (L, intent) => L.map((x) => ({ x, sc: ccScore(x, F, intent || 'any') })).sort((a, b) => b.sc.s - a.sc.s);
  const rows = (R) => R.slice(0, CCMORE).map((r) => ccRow(r.x || r, r.sc ? r.sc.why : '')).join('') + (R.length > CCMORE ? `<button class="btn block" onclick="CCMORE+=15;render()">Show ${Math.min(15, R.length - CCMORE)} more of ${R.length}</button>` : '') || '<div class="hint">Nothing here yet.</div>';
  if (sec === 'rec') return rows(by(open.filter((x) => x.tier !== 'explore')).slice(0, 8));
  if (sec === 'watch') return rows(by(open.filter((x) => x.fmt === 'watch')).slice(0, 10));
  if (sec === 'listen') return rows(by(open.filter((x) => x.fmt === 'listen')).slice(0, 10));
  if (sec === 'vid') return rows(A.filter((x) => x.fmt === 'watch').sort((a, b) => a.t.localeCompare(b.t)));
  if (sec === 'aud') return rows(A.filter((x) => x.fmt === 'listen').sort((a, b) => a.id.localeCompare(b.id)));
  if (sec === 'txt') return rows(A.filter((x) => x.fmt === 'read' && (!x.id.startsWith('em-') || x.ins)).sort((a, b) => (b.at || '').localeCompare(a.at || '')));
  if (sec === 'crs') return (typeof XC_COURSES !== 'undefined' ? `<div class="cc-crs">${Object.entries(XC_COURSES).map(([k, n]) => `<button class="btn" onclick="lnCourse('${k}')">${esc(n)}</button>`).join('')}</div><div class="xs muted" style="margin:6px 0">Your Acquisition.com course notes with the lesson videos. Outside courses:</div>` : '') + rows(A.filter((x) => x.fmt === 'course'));
  if (sec === 'men') return ((CCM && CCM.mentors) || []).map((m) => { const n = A.filter((x) => x.mentor === m.id), d = n.filter((x) => x.u.st === 'done').length; return `<button class="cc-r" onclick="ccMentor('${m.id}')"><i>◉</i><span><b>${esc(m.name)}</b><em>${esc(m.area)} · ${n.length} resource${n.length === 1 ? '' : 's'}${d ? ' · ' + d + ' done' : ''}</em></span></button>`; }).join('');
  if (sec === 'new') { const imp = ccInbox(), N = A.filter((x) => x.isNew && !x.u.st); return (imp.length ? imp.map((n) => `<div class="cc-box"><b>${esc(n.title || 'Discovery note')}</b><div class="xs muted">${n.items.length} item${n.items.length === 1 ? '' : 's'} proposed by the scheduled scan. Automatic adding is off, so nothing is added until you tap.</div><button class="btn primary" onclick="ccInboxImport('${esc(n.id)}')">Review & add ${n.items.length}</button></div>`).join('') : '') + (N.length ? rows(N) : imp.length ? '' : `<div class="hint">No new discoveries waiting. ${ccLastScan()}</div>`); }
  if (sec === 'saved') return rows(A.filter((x) => x.u.st === 'saved'));
  if (sec === 'doing') return rows(A.filter((x) => x.u.st === 'doing'));
  if (sec === 'done') return rows(A.filter((x) => x.u.st === 'done').sort((a, b) => (b.u.doneAt || 0) - (a.u.doneAt || 0)));
  if (sec === 'res') return ccResearchHtml() + rows(A.filter((x) => x.tier === 'explore' && x.min >= 45 && ccOpenable(x)));
  if (sec === 'impl') { const L = A.filter((x) => (x.u.ins || x.ins) && !(x.man || x.exp || x.task || x.u.impl) && (x.u.st === 'done' || x.ins)); return `<div class="hint">Ideas you already have that are not yet in a procedure, an experiment or a task.</div>` + rows(L); }
  return '';
}
function ccTab() {
  if (!(typeof KPL !== 'undefined' && KPL && CCM)) { ccLoad(() => { if (typeof render === 'function') render(); }); return '<div class="hint">Loading the library…</div>'; }
  const g = ccGate(), T = ccToday(), A = ccAll(), items = (T.ids || []).map((id) => A.find((x) => x.id === id)).filter(Boolean), left = items.filter((x) => x.u.st !== 'done' && !(T.skip || []).includes(x.id)), cfg = ccCfg(), ex = ccExploreUsed();
  const gate = g ? `<div class="cc-gate"><b>Don't consume. Go execute.</b><div>${esc(g.out)}</div><div class="xs">${esc(g.why)}</div><div class="actions"><button class="btn primary" onclick="${g.k === 'dial' ? "mcOpen('dial')" : g.k === 'bac' ? "lifeTab='study';render()" : "show('today')"}">Go</button><button class="btn" onclick="ccGateOver()">Show content anyway (logged)</button></div></div>` : '';
  if (g) return `<div class="cc">${gate}<div class="hint">Hands busy? Audio is allowed on the way: <button class="lnk" onclick="ccPlanRun(15,'bottleneck','hands')">15 min, no screen</button></div></div>`;
  return `<div class="cc">
    <div class="cc-today"><div class="cc-h"><b>My content for today</b><span>${items.length ? `${items.length - left.length} of ${items.length} done · ${cfg.dayMin} min budget` : ''}</span></div>
      ${items.length ? (left.length ? left.map((x) => ccRow(x, ccScore(x, ccFocus(), 'any').why)).join('') : '<div class="cc-end"><b>That is all for today.</b> The queue does not refill. Go use it.</div>') : '<div class="hint">Nothing queued: the library has nothing short enough for today\'s budget.</div>'}</div>
    <div class="cc-min"><div class="cc-h"><b>I have…</b><span>one session, then stop</span></div><div class="cc-chips">${[5, 10, 15, 25, 45, 90].map((m) => `<button onclick="ccPlanOpen(${m})">${m} min</button>`).join('')}<button onclick="ccPlanOpen(0)">other</button></div>
      ${(S.settings.ccShort || []).length ? `<div class="cc-chips sm">${S.settings.ccShort.map((s, i) => `<button onclick="ccPlanRun(${Number(s[0]) || 15},'${esc(s[1])}','${esc(s[2])}')">${Number(s[0])} min · ${esc((CC_INTENT[s[1]] || [s[1]])[0])}${s[2] && s[2] !== 'any' ? ' · ' + esc(s[2]) : ''}</button>`).join('')}</div>` : ''}</div>
    <div class="cc-tabs">${CC_SEC.map(([k, l]) => `<button class="${CCSEC === k ? 'on' : ''}" onclick="CCSEC='${k}';CCMORE=15;render()">${l}</button>`).join('')}</div>
    <div class="cc-list">${ccList(CCSEC)}</div>
    <div class="cc-foot"><button class="btn" onclick="ccCapture()">＋ Add a link</button><button class="btn" onclick="ccResearchNew()">Request research</button><button class="btn" onclick="rsOpen()">Now · Next · Later</button><button class="btn" onclick="ccRoadmap()">Roadmap</button><button class="btn" onclick="ccStats()">Analytics</button><button class="btn" onclick="ccSettings()">Settings</button></div>
    <div class="xs muted">Exploration this week: ${ex} of ${cfg.explore} min. ${A.length} resources indexed. Lists are finite on purpose.</div></div>`;
}
function ccOpen(sec) { if (sec) CCSEC = sec; if (typeof closeModal === 'function') closeModal(); lifeTab = 'content'; show('life'); render(); }
function ccPlanOpen(min) {
  openModal(`<h2>I have ${min ? min + ' minutes' : '…'}</h2>${min ? '' : '<input class="aq-in" id="cc-pm" inputmode="numeric" placeholder="minutes (3 to 180)">'}<input type="hidden" id="cc-pmin" value="${min || ''}">
    <div class="xs muted">What for?</div><div class="cm-ch">${Object.entries(CC_INTENT).map(([k, v], i) => `<label><input type="radio" name="cc-int" value="${k}" ${k === 'any' ? 'checked' : ''}><span><b>${v[0]}</b><br><em class="xs">${v[1]}</em></span></label>`).join('')}</div>
    <div class="xs muted">How?</div><div class="cm-ch">${[['any', 'Anything'], ['watch', 'Watch'], ['listen', 'Listen'], ['read', 'Read'], ['hands', 'Hands busy (no screen)']].map(([k, l]) => `<label><input type="radio" name="cc-mode" value="${k}" ${k === 'any' ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <label class="xs"><input type="checkbox" id="cc-keep"> keep this as a shortcut</label>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="ccPlanGo()">Build the session</button></div>`);
}
function ccPlanGo() { const m = Number(($('cc-pm') || {}).value || $('cc-pmin').value), i = (document.querySelector('input[name=cc-int]:checked') || {}).value || 'any', md = (document.querySelector('input[name=cc-mode]:checked') || {}).value || 'any'; if (!m || m < 3 || m > 180) { toast('Between 3 and 180 minutes'); return; } if ($('cc-keep') && $('cc-keep').checked) { const L = (S.settings.ccShort || []).filter((s) => !(s[0] === m && s[1] === i && s[2] === md)); L.unshift([m, i, md]); S.settings.ccShort = L.slice(0, 4); S.settings._u = now(); save(); } ccPlanRun(m, i, md); }
function ccPlanRun(min, intent, mode) {
  const g = mode === 'hands' ? null : ccGate(), P = ccPlan(min, intent, mode), tot = P.steps.reduce((a, s) => a + s.min, 0);
  openModal(`<h2>${min} minutes · ${esc((CC_INTENT[intent] || ['Best use'])[0])}</h2>${g ? `<div class="cc-gate"><b>Before this:</b> ${esc(g.out)}<div class="xs">${esc(g.why)}</div></div>` : ''}
    ${P.steps.length ? `<div class="cc-steps">${P.steps.map((s, i) => `<button class="cc-st" onclick="${s.k === 'consume' ? `ccPlay('${esc(s.id)}')` : s.k === 'capture' ? `ccDone('${esc(s.id)}')` : `closeModal();cpRecallSet(['${esc(s.id)}'])`}"><i>${i + 1}</i><span><b>${esc(s.t)}</b><em>${s.min} min · ${s.k === 'consume' ? 'open' : s.k === 'capture' ? 'write it' : 'test'}</em><u>${esc(s.why)}</u></span></button>`).join('')}</div><div class="hint">${tot} of ${min} minutes planned. When the steps are done, the session is over.</div>` : `<div class="hint">${esc(P.note)}</div><button class="btn" onclick="ccResearchNew()">Request research</button>`}
    <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}
function ccQual(x) { const rel = x.tier === 'core' ? 5 : x.tier === 'support' ? 4 : 2, act = (x.cards || []).length ? 5 : x.ins ? 4 : 3, ev = { official: 5, research: 5, expert: 4, practitioner: 3, heuristic: 2, opinion: 2, unverified: 1 }[x.claim] || 1, dens = x.min <= 20 ? 5 : x.min <= 60 ? 4 : 3; return [['Relevance now', rel], ['Actionable', act], ['Evidence', ev], ['Density', dens]]; }
function ccChain(x) {
  const k = typeof kpStages === 'function' ? kpStages(x) : { info: {} }, u = x.u || {}, cards = (x.cards || []), tested = cards.some((c) => typeof bcRung === 'function' && typeof BC !== 'undefined' && BC && bcRung(c) >= 2);
  return { discover: true, capture: !!(x.url || x.yt || x.mp3), verify: ['official', 'public'].includes(x.stat) || !!x.clip, quality: !!x.claim && x.claim !== 'unverified', dedupe: !!(x.dd || x.overlap || x.lib || x.clip), classify: !!((x.caps || []).length), connect: !!cards.length, process: !!(x.ins || x.why), recommend: !!x.tier, consume: u.st === 'done', test: !!u.ins && (tested || !cards.length), implement: !!(k.oper || k.exec || u.impl), measure: !!k.measure };
}
function ccView(id) {
  const x = ccGet(id); if (!x) return; const f = CC_FMT[x.fmt] || CC_FMT.read, ch = ccChain(x), m = ((CCM && CCM.mentors) || []).find((q) => q.id === x.mentor), sc = ccScore(x, ccFocus(), 'any'), nx = CC_CHAIN.find(([k]) => !ch[k]);
  const cards = (x.cards || []).filter((c) => typeof XC !== 'undefined' && XC && XC.byId[c]), caps = (x.caps || []).map((c) => (typeof cmCap === 'function' ? cmCap(c) : null)).filter(Boolean);
  openModal(`<h2>${esc(x.t)}</h2><div class="hint">${esc(x.by || '')}${x.by ? ' · ' : ''}${f[0]} · ${ccMin(x)}${x.est ? ' (length estimated)' : ''}${x.screen === false ? ' · works without the screen' : ' · needs the screen'}</div>
    <div class="cc-tags">${typeof rsHorizon === 'function' ? `<em>${RS_H[rsHorizon(x)][0]}</em>` : ''}<em>${esc(CC_CLAIM[x.claim] || x.claim)}</em><em>${esc((CC_TIER[x.tier] || [x.tier])[0])}</em>${x.stat && typeof KP_STAT !== 'undefined' && KP_STAT[x.stat] ? `<em>${esc(KP_STAT[x.stat])}</em>` : ''}</div>
    <div class="mc-wl"><span>Why this, why now</span><div>${esc(x.why || x.ins || x.topics || 'No summary yet.')}</div><div class="xs muted">${esc(sc.why)}</div></div>
    ${x.ins && x.why ? `<div class="mc-wl"><span>Key idea (paraphrased)</span><div>${esc(x.ins)}</div></div>` : ''}${x.cb ? `<div class="mc-wl"><span>For Caregiver Bench (a hypothesis until tested)</span><div>${esc(x.cb)}</div></div>` : ''}
    ${x.learn ? `<div class="mc-wl"><span>What you should be able to do after</span><div>${esc(x.learn)}</div></div>` : ''}${x.apply ? `<div class="mc-wl"><span>Then do this</span><div>${esc(x.apply)}</div></div>` : ''}${x.expert || x.date || x.level ? `<div class="xs muted">${[x.expert ? 'Why trust it: ' + esc(x.expert) : '', x.date ? 'Published ' + esc(x.date) : '', x.level ? 'Level: ' + esc(x.level) : '', x.captions ? 'Captions available' : ''].filter(Boolean).join(' · ')}</div>` : ''}${x.note ? `<div class="xs muted">Limit: ${esc(x.note)}</div>` : ''}${m && m.lim ? `<div class="xs muted">About the source: ${esc(m.lim)}</div>` : ''}
    <div class="cc-q">${ccQual(x).map(([l, v]) => `<div><span>${l}</span><i><b style="width:${v * 20}%"></b></i></div>`).join('')}</div>
    ${cards.length ? `<div class="mc-wl"><span>Lessons it teaches</span>${cards.map((c) => `<button class="lnk" onclick="xcOpen('${esc(c)}')">${esc(XC.byId[c].t)} ›</button>`).join('')}</div>` : ''}
    ${caps.length ? `<div class="mc-wl"><span>Capabilities</span>${caps.map((c) => `<button class="lnk" onclick="cmCapOpen('${esc(c.id)}')">${esc(c.n)} ›</button>`).join('')}</div>` : ''}
    ${x.u.ins ? `<div class="mc-wl"><span>Your insight</span><div>${esc(x.u.ins)}</div>${x.u.use ? `<div class="xs muted">Use: ${esc(x.u.use)}</div>` : ''}</div>` : ''}
    <div class="kp-chain">${CC_CHAIN.map(([k, l]) => `<span class="${ch[k] ? 'on' : nx && nx[0] === k ? 'nx' : ''}">${l}</span>`).join('')}</div>
    <div class="actions wrap"><button class="btn primary" onclick="ccPlay('${esc(id)}')">${x.fmt === 'watch' ? 'Watch' : x.fmt === 'listen' ? 'Listen' : 'Open'}${x.u.st === 'doing' ? ' · resume' : ''}</button><button class="btn" onclick="ccDone('${esc(id)}')">Done · capture</button>${x.u.st === 'saved' ? '' : `<button class="btn" onclick="ccSet('${esc(id)}','saved')">Save</button>`}<button class="btn" onclick="ccSet('${esc(id)}','arch')">Not for me</button>${x.lib || x.clip ? '' : `<button class="btn" onclick="kpView('${esc(id)}')">Pipeline record</button>`}</div>`, true);
}
function ccSet(id, st) { ccW(id, { st, at: now() }); const o = day(new Date()); if (st === 'arch' && o.content && (o.content.ids || []).includes(id)) { o.content.skip = (o.content.skip || []).concat(id); save(); } toast(st === 'saved' ? 'Saved' : st === 'arch' ? 'Removed from recommendations' : 'Updated'); closeModal(); render(); }
function ccPlay(id) {
  const x = ccGet(id); if (!x) return; if (x.u.st !== 'done') ccW(id, { st: 'doing', at: x.u.at || now() });
  if (x.mp3) return ccAudio(id);
  if (x.yt && typeof vdPlay === 'function') { closeModal(); vdPlay('https://www.youtube.com/watch?v=' + x.yt, x.s || 0, x.e || 0, x.t); return; }
  if (x.url) { window.open(x.url, '_blank', 'noopener'); ccDonePrompt(id); return; }
  toast('No link on this resource');
}
function ccDonePrompt(id) { const x = ccGet(id); openModal(`<h2>Opened in a new tab</h2><div class="hint">${esc(x ? x.t : '')}. When you come back, capture the one idea you will use.</div><div class="actions"><button class="btn" onclick="closeModal()">Later</button><button class="btn primary" onclick="ccDone('${esc(id)}')">Done · capture</button></div>`); }
function ccAudio(id) {
  const x = ccGet(id); if (!x) return; const p = Number(x.u.pos) || 0;
  openModal(`<h2>${esc(x.t)}</h2><div class="hint">${esc(x.by || '')} · ${ccMin(x)} · audio. Lock the screen and walk.</div><audio id="cc-au" controls preload="none" style="width:100%" src="${esc(x.mp3)}"></audio>
    <div class="cc-chips sm"><button onclick="ccAuRate(1)">1×</button><button onclick="ccAuRate(1.25)">1.25×</button><button onclick="ccAuRate(1.5)">1.5×</button><button onclick="ccAuSkip(-15)">−15 s</button><button onclick="ccAuSkip(30)">+30 s</button></div>
    <div class="xs muted" id="cc-aup">${p > 20 ? 'Resumes at ' + Math.floor(p / 60) + ':' + String(Math.floor(p % 60)).padStart(2, '0') : 'Streams from the official podcast feed. Needs a connection.'}</div>
    <div class="actions"><button class="btn" onclick="ccAuClose('${esc(id)}')">Stop here</button><button class="btn primary" onclick="ccAuClose('${esc(id)}');ccDone('${esc(id)}')">Done · capture</button></div>`);
  const a = $('cc-au'); if (!a) return; a.addEventListener('loadedmetadata', () => { if (p > 20 && p < (a.duration || 1e9) - 10) a.currentTime = p; }); let last = 0; a.addEventListener('timeupdate', () => { if (Math.abs(a.currentTime - last) >= 10) { last = a.currentTime; S.content = S.content || {}; const r = S.content[id] || { id }; r.pos = Math.floor(a.currentTime); r._u = now(); r.st = r.st === 'done' ? 'done' : 'doing'; S.content[id] = r; } }); a.addEventListener('pause', () => save()); a.addEventListener('ended', () => { ccW(id, { pos: 0 }); ccDone(id); });
  if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: x.t, artist: x.by || 'War Room' }); } catch (e) { } }
}
function ccAuRate(r) { const a = $('cc-au'); if (a) a.playbackRate = r; }
function ccAuSkip(s) { const a = $('cc-au'); if (a) a.currentTime = Math.max(0, a.currentTime + s); }
function ccAuClose(id) { const a = $('cc-au'); if (a) { a.pause(); ccW(id, { pos: Math.floor(a.currentTime) }); } closeModal(); }
/* consume → capture → test → implement */
function ccDone(id) {
  const x = ccGet(id); if (!x) return; const a = $('cc-au'); if (a) { try { a.pause(); } catch (e) { } }
  openModal(`<h2>What will you use?</h2><div class="hint">${esc(x.t)}</div>
    <label class="xs muted">The one idea, in your words</label><textarea class="aq-in" id="cc-ins" rows="3" placeholder="One sentence. If nothing was useful, say so.">${esc(x.u.ins || '')}</textarea>
    <label class="xs muted">Where will you use it, and when?</label><input class="aq-in" id="cc-use" value="${esc(x.u.use || '')}" placeholder="e.g. first three calls tomorrow">
    <div class="row" style="gap:8px"><div class="grow"><label class="xs muted">Minutes you spent</label><input class="aq-in" id="cc-mins" inputmode="numeric" value="${Math.min(x.min, 240)}"></div><div class="grow"><label class="xs muted">Worth it? 1 to 5</label><input class="aq-in" id="cc-rate" inputmode="numeric" value="${x.u.rate || ''}"></div></div>
    <label class="xs"><input type="checkbox" id="cc-fin" ${x.fmt === 'course' || ccLeft(x) > 5 && x.u.pos ? '' : 'checked'}> finished (untick to keep it in "Currently learning")</label>
    <div class="xs muted">Turn it into:</div><div class="cm-ch">${[['', 'Just save the insight'], ['task', 'A task for tomorrow'], ['exp', 'An experiment (one variable, one metric)'], ['man', 'A Field Manual procedure (needs your approval)'], ['none', 'Nothing useful: do not recommend similar']].map(([k, l], i) => `<label><input type="radio" name="cc-to" value="${k}" ${i ? '' : 'checked'}><span>${l}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="ccDoneSave('${esc(id)}')">Save</button></div>`);
}
function ccDoneSave(id) {
  const x = ccGet(id); if (!x) return; const ins = $('cc-ins').value.trim(), use = $('cc-use').value.trim(), mins = Math.max(0, Math.min(600, Number($('cc-mins').value) || 0)), rate = Math.max(0, Math.min(5, Number($('cc-rate').value) || 0)), fin = $('cc-fin').checked, to = (document.querySelector('input[name=cc-to]:checked') || {}).value || '';
  if (to !== 'none' && ins.length < 8) { toast('Write the idea in one sentence first'); return; }
  const log = (x.u.log || []).concat(mins ? [{ d: dk(new Date()), min: mins }] : []), patch = { ins, use, rate, log, st: to === 'none' ? 'arch' : fin ? 'done' : 'doing', doneAt: fin ? now() : x.u.doneAt || 0 };
  if (to === 'task' && typeof addTaskAuto === 'function') { patch.impl = 'task:' + addTaskAuto((use || ins).slice(0, 120), dk(addDays(new Date(), 1)), 'From: ' + x.t); }
  ccW(id, patch);
  if (ins && typeof S.journal === 'object') { const jid = 'j' + uid(); S.journal = S.journal || {}; S.journal[jid] = { id: jid, _u: now(), at: dk(new Date()), kind: 'lesson', dom: 'lrn', text: 'From: ' + x.t, lesson: ins + (use ? ' → ' + use : ''), src: 'content:' + id }; save(); }
  closeModal();
  if (to === 'exp') { if (!x.clip && typeof kpW === 'function' && typeof kpExp === 'function') { kpW(id, { ins: x.ins || ins }); kpExp(id); ccW(id, { impl: 'exp' }); } else if (typeof expNew === 'function') expNew(); else toast('Open Experiments to add it'); }
  else if (to === 'man' && typeof fmEdit === 'function') { fmEdit('', { n: (use || ins).slice(0, 80), sit: use, steps: ins, src: x.t + (x.by ? ' · ' + x.by : ''), q: x.claim === 'official' ? 'official' : x.claim === 'practitioner' ? 'practitioner' : x.claim === 'expert' || x.claim === 'research' ? 'expert' : 'unverified', appr: false }); ccW(id, { impl: 'man' }); }
  else { toast(to === 'none' ? 'Noted. Fewer like this.' : 'Captured'); render(); const card = (x.cards || []).find((c) => typeof XC !== 'undefined' && XC && XC.byId[c]); if (card && to !== 'none' && typeof cpRecallSet === 'function') openModal(`<h2>Test it now?</h2><div class="hint">Three minutes of recall on "${esc(XC.byId[card].t)}" makes it stay.</div><div class="actions"><button class="btn" onclick="closeModal()">Not now</button><button class="btn primary" onclick="closeModal();cpRecallSet(['${esc(card)}'])">Test me</button></div>`); }
}
/* lesson ↔ resources: shown at the bottom of every deep card, with the gap stated when there is none */
function ccForCard(cid) {
  if (!(typeof KPL !== 'undefined' && KPL)) { ccLoad(); return ''; }
  const L = ccAll().filter((x) => (x.cards || []).includes(cid) && !x.clip && x.acc !== 'none' && (!x.id.startsWith('em-') || x.ins)).map((x) => ({ x, s: ccScore(x, { caps: [], cards: [] }, 'any').s + (x.yt || x.mp3 ? 1 : 0) })).sort((a, b) => b.s - a.s).slice(0, 4);
  return `<div class="xc-s"><div class="xc-l">Best resources for this lesson</div>${L.length ? L.map((r) => ccRow(r.x, r.x.why || r.x.ins || '')).join('') : `<div class="xs muted">No verified outside resource is linked to this lesson yet. The card itself is the material.</div><button class="lnk" onclick="ccResearchNew('${esc(cid)}')">Request research for this lesson ›</button>`}</div>`;
}
/* mentors */
function ccMentor(id) {
  const m = ((CCM && CCM.mentors) || []).find((q) => q.id === id); if (!m) return; const R = ccAll().filter((x) => x.mentor === id), F = ccFocus(), best = R.filter(ccOpenable).map((x) => ({ x, s: ccScore(x, F, 'any').s })).sort((a, b) => b.s - a.s), done = R.filter((x) => x.u.st === 'done').length, mins = R.reduce((a, x) => a + (x.u.log || []).reduce((b, l) => b + (Number(l.min) || 0), 0), 0);
  openModal(`<h2>${esc(m.name)}</h2><div class="hint">${esc(m.area)}</div><div class="cc-tags"><em>${esc(CC_CLAIM[m.claim] || m.claim)}</em><em>${R.length} resources</em><em>${done} done · ${mins} min</em></div>
    <div class="mc-wl"><span>Why in your library</span><div>${esc(m.why)}</div></div><div class="mc-wl"><span>Teaches</span><div>${m.teaches.map(esc).join(' · ')}</div></div><div class="mc-wl"><span>Limits</span><div>${esc(m.lim)}</div></div>
    <div class="mc-wl"><span>Start here</span></div>${best.slice(0, 3).map((r) => ccRow(r.x)).join('') || '<div class="hint">Everything here is done or archived.</div>'}
    ${R.length > 3 ? `<details><summary class="xs">All ${R.length}</summary>${R.map((x) => ccRow(x)).join('')}</details>` : ''}
    <div class="actions wrap"><button class="btn" onclick="ccResearchNew('','${esc(m.name)}')">Ask for more</button><button class="btn primary" onclick="closeModal()">Close</button></div>`, true);
}
/* capture · research requests · discovery */
function ccCapture() { openModal(`<h2>Add a resource</h2><input class="aq-in" id="cc-cu" placeholder="Link (YouTube, article, podcast)"><input class="aq-in" id="cc-ct" placeholder="Title"><input class="aq-in" id="cc-cb" placeholder="Who made it"><div class="row" style="gap:8px"><select class="aq-in grow" id="cc-cf">${Object.entries(CC_FMT).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><input class="aq-in grow" id="cc-cm" inputmode="numeric" placeholder="minutes"></div><input class="aq-in" id="cc-cw" placeholder="Why do you want it? (one line)"><div class="xs muted">It enters as unverified and "exploration" until you process it. It will not be recommended ahead of core material.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="ccCaptureSave()">Add</button></div>`); }
function ccCaptureSave() {
  const u = $('cc-cu').value.trim(), t = $('cc-ct').value.trim() || u; if (!t) { toast('Add a link or a title'); return; } const dup = u && ccAll().find((x) => x.url && x.url.replace(/\/$/, '') === u.replace(/\/$/, '')); if (dup) { toast('Already in the library'); closeModal(); ccView(dup.id); return; }
  const id = 'src' + uid(), p = typeof vpParse === 'function' ? vpParse(u) : null; kpW(id, Object.assign({ t, by: $('cc-cb').value.trim(), url: u, fmt: $('cc-cf').value, min: Number($('cc-cm').value) || 10, est: !Number($('cc-cm').value), why: $('cc-cw').value.trim(), type: 'video', stat: 'unverified', claim: 'unverified', tier: 'explore', acc: 'full', origin: 'manual', at: dk(new Date()), isNew: 1, caps: [], cards: [] }, p && p.yt ? { yt: p.yt, fmt: 'watch' } : {})); ccW(id, { st: 'saved', at: now() }); closeModal(); toast('Added to Saved'); render();
}
function ccResearchHtml() { const L = Object.values(S.research || {}).filter((r) => r && !r._del).sort((a, b) => (b.at || 0) - (a.at || 0)); return `<div class="cc-box"><b>Research requests</b><div class="xs muted">Read by the scheduled Claude scan (${ccCfg().freq}). Answers arrive as an inbox note; you decide what is added.</div>${L.length ? L.map((r) => `<div class="cc-rq ${r.st}"><span>${esc(r.q)}</span><em>${r.st === 'done' ? 'answered' : 'waiting'}</em><button class="lnk" onclick="ccResearchDel('${esc(r.id)}')">×</button></div>`).join('') : '<div class="xs">None open.</div>'}<button class="btn" onclick="ccResearchNew()">＋ New request</button></div>`; }
function ccResearchNew(cid, who) { const c = cid && typeof XC !== 'undefined' && XC && XC.byId[cid]; openModal(`<h2>Request research</h2><textarea class="aq-in" id="cc-rq" rows="3" placeholder="What do you need a good resource or answer for?">${c ? 'Best verified video, audio or article for the lesson: ' + esc(c.t) : who ? 'More from ' + esc(who) + ' on: ' : ''}</textarea><input class="aq-in" id="cc-rw" placeholder="What decision or skill is it for?"><div class="xs muted">Honest note: nothing runs right now. The next scheduled scan (${ccCfg().freq}) reads this list. For an answer today, ask Claude directly.</div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="ccResearchSave('${esc(cid || '')}')">Queue it</button></div>`); }
function ccResearchSave(cid) { const q = $('cc-rq').value.trim(); if (q.length < 8) { toast('Say what you need'); return; } S.research = S.research || {}; const id = 'rq' + uid(); S.research[id] = { id, _u: now(), at: now(), q, why: $('cc-rw').value.trim(), card: cid || '', st: 'open' }; save(); closeModal(); toast('Queued for the next scan'); render(); }
function ccResearchDel(id) { if (S.research && S.research[id]) { S.research[id]._del = true; S.research[id]._u = now(); save(); render(); } }
/* notes left by the scheduled scan may carry a machine-readable list after the marker WR-IMPORT: */
function ccInbox() { const out = []; Object.values(S.inbox || {}).forEach((n) => { if (!n || n._del || n.imported) return; const m = String(n.body || '').match(/WR-IMPORT:\s*(\[[\s\S]*\])\s*$/); if (!m) return; try { const items = JSON.parse(m[1]).filter((r) => r && (r.t || r.id)); if (items.length) out.push({ id: n.id, title: n.title, items }); } catch (e) { } }); return out; }
function ccInboxImport(nid) { const n = ccInbox().find((x) => x.id === nid); if (!n) return; openModal(`<h2>${esc(n.title || 'Discovery')}</h2><div class="hint">Tick what should enter the library. Everything arrives as "new" and is not recommended until you open it once.</div><div class="cm-ch">${n.items.map((r, i) => `<label><input type="checkbox" class="cc-ii" value="${i}" checked><span><b>${esc(r.t || 'Lesson for a listed email')}</b><br><em class="xs">${esc(r.by || '')} ${r.min ? '· ' + Number(r.min) + ' min' : ''} ${r.why ? '· ' + esc(r.why) : ''}</em></span></label>`).join('')}</div><div class="actions"><button class="btn" onclick="ccInboxDrop('${esc(nid)}')">Add none</button><button class="btn primary" onclick="ccInboxAdd('${esc(nid)}')">Add ticked</button></div>`, true); }
/* one importer for the manual and the automatic path. Items with the id of an existing source only update its insight fields. */
function ccImportItems(items) {
  const A = ccAll(), have = new Set(A.map((x) => String(x.url || '').replace(/\/$/, '')).filter(Boolean)), yts = new Set(A.map((x) => x.yt).filter(Boolean)); let add = 0, upd = 0;
  items.forEach((r) => { if (!r) return; if (r.job && S.research && S.research[r.job] && S.research[r.job].st !== 'done') { S.research[r.job].st = 'done'; S.research[r.job].ans = String(r.answer || r.t || '').slice(0, 200); S.research[r.job]._u = now(); if (r.none) return; }
    const ex = r.id && A.find((x) => x.id === r.id && !x.clip);
    if (ex) { const ins = String(r.ins || '').trim(); if (ins.length < 12 || ex.ins) return; kpW(ex.id, { ins: ins.slice(0, 600), cb: String(r.cb || ex.cb || '').slice(0, 400), cards: (Array.isArray(r.cards) ? r.cards : []).filter((c) => typeof XC !== 'undefined' && XC && XC.byId[c]).slice(0, 8), caps: (Array.isArray(r.caps) ? r.caps : ex.caps || []).filter((c) => typeof cmCap !== 'function' || cmCap(c)).slice(0, 5), proc: 'scheduled scan · ' + dk(new Date()), autoAt: now() }); upd++; return; }
    if (!r.t) return; const u = String(r.url || '').replace(/\/$/, ''), p = typeof vpParse === 'function' ? vpParse(u) : null; if ((u && have.has(u)) || (p && p.yt && yts.has(p.yt))) return; if (u) have.add(u);
    const fmt = CC_FMT[r.fmt] ? r.fmt : p && p.yt ? 'watch' : 'read', stat = ['official', 'public', 'third', 'unverified'].includes(r.stat) ? r.stat : 'unverified';
    kpW('src' + uid() + add, Object.assign({ t: String(r.t).slice(0, 200), by: String(r.by || '').slice(0, 120), url: u, fmt, min: Number(r.min) || 10, est: !Number(r.min), why: String(r.why || '').slice(0, 300), mentor: String(r.mentor || ''), caps: (Array.isArray(r.caps) ? r.caps : []).filter((c) => typeof cmCap !== 'function' || cmCap(c)).slice(0, 5), cards: (Array.isArray(r.cards) ? r.cards : []).filter((c) => typeof XC !== 'undefined' && XC && XC.byId[c]).slice(0, 8), type: 'video', stat, claim: CC_CLAIM[r.claim] ? r.claim : 'unverified', tier: stat === 'unverified' ? 'explore' : CC_TIER[r.tier] ? r.tier : 'explore', learn: String(r.learn || '').slice(0, 300), apply: String(r.apply || '').slice(0, 300), expert: String(r.expert || '').slice(0, 200), date: String(r.date || '').slice(0, 20), level: String(r.level || '').slice(0, 30), captions: !!r.captions, job: String(r.job || ''), acc: 'full', origin: 'disc', at: dk(new Date()), isNew: 1, autoAt: now() }, p && p.yt ? { yt: p.yt } : {})); add++; });
  return { add, upd };
}
function ccInboxAdd(nid) { const n = ccInbox().find((x) => x.id === nid); if (!n) return; const R = ccImportItems(Array.from(document.querySelectorAll('.cc-ii:checked')).map((el) => n.items[Number(el.value)])); S.inbox[nid].imported = now(); S.inbox[nid]._u = now(); save(); closeModal(); toast(R.add + ' added to New discoveries' + (R.upd ? ' · ' + R.upd + ' updated' : '')); CCSEC = 'new'; render(); }
/* 13.27.1 · autonomous mode: scan notes are imported without a tap. Library only: it never touches offers, scripts, procedures or plans. */
function ccAutoImport() {
  if (!ccCfg().auto || !(typeof KPL !== 'undefined' && KPL) || !(typeof XC !== 'undefined' && XC && XC.byId)) return 0; const N = ccInbox(); if (!N.length) return 0; let add = 0, upd = 0;
  N.forEach((n) => { const R = ccImportItems(n.items); add += R.add; upd += R.upd; S.inbox[n.id].imported = now(); S.inbox[n.id].auto = 1; S.inbox[n.id]._u = now(); });
  S.settings.discovery = Object.assign({}, S.settings.discovery || {}, { lastAuto: { at: now(), add, upd } }); S.settings._u = now(); save();
  if (add || upd) { try { toast(`Library updated itself: ${add} new${upd ? ', ' + upd + ' emails processed' : ''}`); } catch (e) { } try { render(); } catch (e) { } } return add + upd;
}
function ccAutoUndo() { const L = Object.values(S.sources || {}).filter((x) => x && !x._del && x.autoAt && x.origin === 'disc' && now() - x.autoAt < 8 * 864e5); L.forEach((x) => { S.sources[x.id]._del = true; S.sources[x.id]._u = now(); }); save(); closeModal(); toast(L.length + ' automatic additions removed'); render(); }
function ccInboxDrop(nid) { if (S.inbox && S.inbox[nid]) { S.inbox[nid].imported = now(); S.inbox[nid]._u = now(); save(); } closeModal(); render(); }
function ccLastScan() { const L = Object.values(S.inbox || {}).filter((n) => n && !n._del && /discover|curriculum|scan/i.test(String(n.title || ''))).sort((a, b) => String(b.id).localeCompare(String(a.id)))[0]; return L ? 'Last scan note: "' + String(L.title).slice(0, 60) + '".' : 'No scan note has arrived yet.'; }
function ccSettings() { const c = ccCfg(); openModal(`<h2>Content settings</h2>
  <label class="xs muted">Discovery scan (a Claude scheduled task, not this app)</label><select class="aq-in" id="cc-sf">${[['weekly', 'Weekly (Monday morning)'], ['monthly', 'Monthly only'], ['off', 'Off']].map(([k, l]) => `<option value="${k}" ${c.freq === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
  <label class="xs"><input type="checkbox" id="cc-sa" ${c.auto ? 'checked' : ''}> add what the scan finds automatically (library only; offers, scripts and procedures are never changed)</label>
  ${c.lastAuto ? `<div class="xs muted">Last automatic update: ${fmtShort(new Date(c.lastAuto.at))}, ${c.lastAuto.add} new, ${c.lastAuto.upd} emails processed. <button class="lnk" style="display:inline" onclick="ccAutoUndo()">Undo the last 7 days</button></div>` : ''}
  <label class="xs"><input type="checkbox" id="cc-sp" ${c.push ? 'checked' : ''}> notify me when a scan finds something</label>
  <label class="xs muted">Daily content budget (minutes)</label><input class="aq-in" id="cc-sd" inputmode="numeric" value="${c.dayMin}">
  <label class="xs muted">Exploration budget per week (minutes)</label><input class="aq-in" id="cc-se" inputmode="numeric" value="${c.explore}">
  <div class="xs muted">${ccLastScan()} The scan reads these settings and your research requests from the synced data. With automatic adding on, its finds enter the library as "new"; unverified ones stay in exploration. It never edits your offer, scripts or procedures.</div>
  <div class="xs muted">Limit: War Room cannot block or see other apps. To actually stop scrolling, set app limits in your phone's Screen Time / Digital Wellbeing and put War Room where the feed icon was.</div>
  <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="ccSettingsSave()">Save</button></div>`); }
function ccSettingsSave() { S.settings.discovery = { lastAuto: ccCfg().lastAuto, auto: $('cc-sa').checked, freq: $('cc-sf').value, push: $('cc-sp').checked, dayMin: Math.max(5, Math.min(120, Number($('cc-sd').value) || 30)), explore: Math.max(0, Math.min(600, Number($('cc-se').value) || 0)) }; S.settings._u = now(); save(); closeModal(); toast('Saved'); render(); }
/* analytics and roadmap */
function ccStatsData(days) {
  const from = dk(addDays(new Date(), -(days - 1))), A = ccAll(), D = { min: 0, fmt: { watch: 0, listen: 0, read: 0, course: 0 }, tier: { core: 0, support: 0, explore: 0 }, done: 0, ins: 0, impl: 0, mentor: {}, rated: [], arch: 0 };
  A.forEach((x) => { const u = x.u; (u.log || []).forEach((l) => { if (l.d >= from) { const m = Number(l.min) || 0; D.min += m; D.fmt[x.fmt] = (D.fmt[x.fmt] || 0) + m; D.tier[x.tier] = (D.tier[x.tier] || 0) + m; if (x.mentor) D.mentor[x.mentor] = (D.mentor[x.mentor] || 0) + m; } });
    const recent = u.doneAt && dk(new Date(u.doneAt)) >= from; if (u.st === 'done' && recent) { D.done++; if (u.ins) D.ins++; if (u.impl || x.man || x.exp || x.task) D.impl++; if (u.rate) D.rated.push(u.rate); } if (u.st === 'arch') D.arch++; });
  return D;
}
function ccStats() {
  const D = ccStatsData(28), W = ccStatsData(7), bar = (o, lab) => { const mx = Math.max(1, ...Object.values(o)); return Object.entries(o).map(([k, v]) => `<div><span>${esc((lab[k] || [k])[0])}</span><i><b style="width:${(v / mx) * 100}%"></b></i><em>${v} min</em></div>`).join(''); }, top = Object.entries(D.mentor).sort((a, b) => b[1] - a[1]).slice(0, 4);
  let dials = null; try { const by = typeof mcDialLog === 'function' ? mcDialLog() : null; if (by) { dials = 0; for (let i = 0; i < 7; i++) { const k = dk(addDays(new Date(), -i)); dials += ((by[k] || {}).n || (by[k] || {}).logged || 0); } } } catch (e) { }
  openModal(`<h2>Learning analytics</h2><div class="hint">Last 28 days. Minutes are the ones you confirmed when capturing; nothing is measured in the background.</div>
    <div class="cc-kpi"><div><b>${D.min}</b><span>minutes</span></div><div><b>${D.done}</b><span>finished</span></div><div><b>${D.ins}</b><span>insights written</span></div><div><b>${D.impl}</b><span>put to use</span></div></div>
    <div class="mc-wl"><span>The ratio that matters</span><div>${D.done ? `${D.impl} of ${D.done} finished resources became a task, an experiment or a procedure (${Math.round((D.impl / D.done) * 100)}%).` : 'Nothing finished yet, so there is nothing to judge.'}${D.done >= 5 && D.impl / D.done < 0.3 ? ' <b>Mostly consumption.</b> Use one before opening another.' : ''}</div>${dials != null ? `<div class="xs muted">Last 7 days: ${W.min} content minutes, ${dials} logged dials.${W.min > 60 && dials < 20 ? ' Learning is running ahead of doing.' : ''}</div>` : ''}</div>
    <div class="mc-wl"><span>By format</span></div><div class="cc-q wide">${bar(D.fmt, CC_FMT)}</div><div class="mc-wl"><span>By roadmap tier</span></div><div class="cc-q wide">${bar(D.tier, CC_TIER)}</div>
    ${top.length ? `<div class="mc-wl"><span>Most time with</span><div>${top.map(([k, v]) => esc((((CCM && CCM.mentors) || []).find((m) => m.id === k) || { name: k }).name) + ' ' + v + ' min').join(' · ')}</div></div>` : ''}
    <div class="xs muted">${D.rated.length ? 'Average "worth it": ' + (D.rated.reduce((a, b) => a + b, 0) / D.rated.length).toFixed(1) + ' of 5. ' : ''}${D.arch} marked "not for me". Unknown: whether any of this changed results. That shows only in call and mock numbers.</div>
    <div class="actions"><button class="btn primary" onclick="closeModal()">Close</button></div>`, true);
}
function ccRoadmap() {
  const A = ccAll().filter((x) => !x.clip), cfg = ccCfg(), row = (k) => { const L = A.filter((x) => x.tier === k && x.acc !== 'none'), d = L.filter((x) => x.u.st === 'done').length, nx = L.filter(ccOpenable).map((x) => ({ x, s: ccScore(x, ccFocus(), 'any').s })).sort((a, b) => b.s - a.s).slice(0, 3); return `<div class="mc-wl"><span>${CC_TIER[k][0]} · ${d} of ${L.length} done</span><div class="xs muted">${CC_TIER[k][1]}</div><div class="cc-q wide"><div><i><b style="width:${L.length ? (d / L.length) * 100 : 0}%"></b></i></div></div></div>${nx.map((r) => ccRow(r.x)).join('')}`; };
  openModal(`<h2>Knowledge roadmap</h2><div class="hint">Core first. Exploration is allowed and capped at ${cfg.explore} minutes a week (${ccExploreUsed()} used).</div>${row('core')}${row('support')}${row('explore')}<div class="actions"><button class="btn primary" onclick="closeModal()">Close</button></div>`, true);
}
(function () { const st = document.createElement('style'); st.textContent = `
  .cc{display:grid;gap:12px}.cc-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}.cc-h span{font-size:11.5px;opacity:.65}
  .cc-today,.cc-min,.cc-box{border:1px solid var(--ln,#2a2a2e);border-radius:14px;padding:12px;display:grid;gap:6px}.cc-end{font-size:13.5px;padding:8px 0}
  .cc-r{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--ln,#2a2a2e);padding:10px 2px;color:inherit;min-height:48px}.cc-r:first-child{border-top:0}
  .cc-r>i{font-style:normal;width:28px;height:28px;flex:none;border-radius:8px;display:grid;place-items:center;background:var(--card2,rgba(127,127,127,.14));font-size:13px}.cc-r span{display:grid;gap:2px;min-width:0}.cc-r b{font-size:14px;line-height:1.3;overflow-wrap:anywhere}.cc-r em{font-style:normal;font-size:11.5px;opacity:.7}.cc-r u{text-decoration:none;font-size:12px;line-height:1.35;color:var(--good,#3fb950)}.cc-r.done b{opacity:.55}.cc-r.arch{opacity:.45}
  .cc-chips{display:flex;flex-wrap:wrap;gap:6px}.cc-chips button{border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;border-radius:999px;padding:9px 13px;font-size:13.5px;min-height:40px}.cc-chips.sm button{font-size:12px;padding:6px 10px;min-height:34px}
  .cc-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.cc-tabs::-webkit-scrollbar{display:none}.cc-tabs button{flex:none;border:1px solid var(--ln,#2a2a2e);background:none;color:inherit;border-radius:999px;padding:7px 12px;font-size:12.5px;white-space:nowrap}.cc-tabs button.on{background:var(--fg,#fff);color:var(--bg,#000)}
  .cc-foot,.cc-crs{display:flex;flex-wrap:wrap;gap:6px}.cc-foot .btn,.cc-crs .btn{flex:1 1 auto;font-size:12.5px}
  .cc-gate{border:1px solid var(--warn,#d29922);border-radius:14px;padding:14px;display:grid;gap:6px}.cc-gate b{font-size:16px}
  .cc-steps{display:grid}.cc-st{display:flex;gap:10px;text-align:left;background:none;border:0;border-top:1px solid var(--ln,#2a2a2e);padding:11px 2px;color:inherit;width:100%}.cc-st>i{font-style:normal;width:24px;height:24px;flex:none;border-radius:50%;border:1px solid currentColor;display:grid;place-items:center;font-size:12px}.cc-st span{display:grid;gap:2px}.cc-st em{font-style:normal;font-size:11.5px;opacity:.7}.cc-st u{text-decoration:none;font-size:12px;color:var(--good,#3fb950)}
  .cc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.cc-tags em{font-style:normal;font-size:11px;border:1px solid var(--ln,#2a2a2e);border-radius:999px;padding:3px 9px}
  .cc-q{display:grid;gap:5px;margin:8px 0}.cc-q>div{display:grid;grid-template-columns:104px 1fr;gap:8px;align-items:center;font-size:11.5px}.cc-q.wide>div{grid-template-columns:86px 1fr 62px}.cc-q i{height:6px;border-radius:3px;background:var(--card2,rgba(127,127,127,.18));overflow:hidden;display:block}.cc-q i b{display:block;height:100%;background:var(--good,#3fb950)}.cc-q em{font-style:normal;text-align:right;opacity:.7}
  .cc-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.cc-kpi div{border:1px solid var(--ln,#2a2a2e);border-radius:10px;padding:8px 4px;text-align:center}.cc-kpi b{display:block;font-size:20px}.cc-kpi span{font-size:10.5px;opacity:.7}
  .cc-rq{display:flex;gap:8px;align-items:center;font-size:13px;border-top:1px solid var(--ln,#2a2a2e);padding:6px 0}.cc-rq span{flex:1;overflow-wrap:anywhere}.cc-rq em{font-style:normal;font-size:11px;opacity:.7}
  .xc-nav{max-width:100%;min-width:0}.xc-card .xc-nav button.btn{min-width:0;max-width:calc(50% - 4px);flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.xc-card{min-width:0;max-width:100%}.xc-src{font-size:11.5px;opacity:.7;line-height:1.4;margin-top:4px}
  .cc-ban{margin:0 0 10px}.xc-vid{border:1px solid var(--good,#3fb950);border-radius:10px;padding:10px}
  .lnk{background:none;border:0;color:var(--acc,#58a6ff);padding:6px 0;text-align:left;font-size:13px;display:block}.actions.wrap{flex-wrap:wrap}`; document.head.appendChild(st); })();

(function w() { if (typeof S !== 'undefined' && S && S.settings) { ccLoad(() => { try { ccAutoImport(); } catch (e) { } }); setInterval(() => { try { ccAutoImport(); } catch (e) { } }, 60000); } else setTimeout(w, 500); })();

/* 13.28: the library is reachable from where you learn, not only from You → Content */
setInterval(() => { try { ['view-boot', 'view-acq'].forEach((id) => { const el = document.getElementById(id); if (!el) return; if (typeof lxHome === 'function' && !window.LX_OFF) { const o = el.querySelector('.cc-ban'); if (o) o.remove(); return; } /* 13.31.1: Learn → Now is the one entry point; the Library is its tab */ if (!el || !el.offsetParent || el.querySelector('.cc-ban')) return; const d = document.createElement('div'); d.className = 'cc-ban'; d.innerHTML = '<button class="btn block" onclick="ccOpen(\'rec\')">▶ Content library · videos, audio, reading · I have X minutes</button>'; el.insertBefore(d, el.firstChild); }); } catch (e) { } }, 900);


/* ───────── What was not fully opened (second prompt, section 1: "record it in a list of resources requiring further
   access rather than pretending you studied it"). Reads the library's own access field. It claims nothing about the
   mailbox itself: that count is a dated note from a Gmail search, labelled as an estimate. ───────── */
const CC_ACC = { full: 'Opened in full', part: 'Partly opened', none: 'Not opened' };
const CC_MAIL_NOTE = { at: '2026-11-20', all: 204, old: 114, cut: '2026-09-01', done: 75, doneAt: '2026-11-21', left: 39 };
function ccAccessRows() { const A = ccAll().filter((x) => !x.clip), by = { full: [], part: [], none: [] }; A.forEach((x) => (by[CC_ACC[x.acc] ? x.acc : 'none']).push(x)); const E = A.filter((x) => x.type === 'email'); return { n: A.length, by, mail: { n: E.length, linked: E.filter((x) => (x.cards || []).length).length, part: E.filter((x) => x.acc !== 'full').length, first: E.map((x) => x.at || '').filter(Boolean).sort()[0] || '', last: E.map((x) => x.at || '').filter(Boolean).sort().slice(-1)[0] || '' } }; }
function ccAccessOpen(all) {
  const R = ccAccessRows(), L = R.by.none.concat(R.by.part).sort((a, b) => ((b.cards || []).length ? 0 : 1) - ((a.cards || []).length ? 0 : 1) || String(b.at || '').localeCompare(String(a.at || ''))), show = all ? L : L.slice(0, 25), M = R.mail, N = CC_MAIL_NOTE;
  openModal(`<h2>What was not fully opened</h2><div class="hint">A source counts as studied only if it was opened in full. This list is everything that was not, so nothing is passed off as learned.</div>
    <div class="mc-wl"><span>The library: ${R.n} sources</span><div class="xs">• ${CC_ACC.full}: <b>${R.by.full.length}</b></div><div class="xs">• ${CC_ACC.part}: <b>${R.by.part.length}</b> (for an email: the text was read, the linked video or file was not)</div><div class="xs">• ${CC_ACC.none}: <b>${R.by.none.length}</b></div></div>
    <div class="mc-wl" id="cc-acc-mail"><span>Emails from Acquisition.com</span><div class="xs">• In the library: <b>${M.n}</b>${M.first ? ` (received ${esc(M.first)} to ${esc(M.last)})` : ''}</div><div class="xs">• Linked to a lesson: <b>${M.linked}</b> of ${M.n}</div><div class="xs">• Not opened in full: <b>${M.part}</b> of ${M.n}</div><div class="xs muted" style="margin-top:4px">In your mailbox (a Gmail search on ${esc(N.at)}, Gmail's own estimate): about ${N.all} emails from these senders, about ${N.old} of them from before ${esc(N.cut)}. ${N.done ? `${N.done} of those older ones were read and added on ${esc(N.doneAt)} (newest first); ${N.left != null ? `a month-by-month listing on the same day counted ${N.old} in all, so ${N.left} older ones are still not in the library` : `the other ${Math.max(0, N.old - N.done)} are not in the library yet`}.` : 'Those older ones are not in the library yet.'} Not every one is a lesson; some are promotion.</div></div>
    <div class="mc-wl"><span>${L.length} not opened in full${all || L.length <= 25 ? '' : ' · showing 25'}</span>${show.map((x) => `<div class="xs" style="padding:5px 0;cursor:pointer" onclick="ccView('${x.id}')"><b>${esc(x.t)}</b> · ${esc(x.type || '')}${x.at ? ' · ' + esc(x.at) : ''} · ${CC_ACC[x.acc] || CC_ACC.none}${(x.cards || []).length ? '' : ' · <em>no lesson yet</em>'}${x.note ? `<div class="muted">${esc(String(x.note).slice(0, 140))}</div>` : ''}</div>`).join('') || '<div class="xs muted">Everything in the library was opened in full.</div>'}</div>
    ${!all && L.length > 25 ? `<div class="fn-inline"><button class="btn" onclick="ccAccessOpen(1)">Show all ${L.length}</button></div>` : ''}<div class="actions"><button class="btn primary" onclick="closeModal()">Close</button></div>`, true);
}
/* the finder entry for this screen is registered in claims.js, which loads after the finder */
