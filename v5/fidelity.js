/* fidelity.js (13.52.0) — three instruments the briefs ask for and the app lacked.
   1. HOW WELL WAR ROOM KNOWS EACH PART OF YOUR LIFE (fmOpen). Per part: what kind of evidence it rests on (measured by
      the app, your own entries, calculated, outside sources), how many of the last 30 days have a record, how old the
      newest record is, how fine-grained it is, what is NOT known, and which missing information would help most.
      No single score: a percentage for "how well a system knows a person" would be made up.
   2. SOURCES THAT DISAGREE (cxOpen). You record that two things in your library contradict each other, in one sentence,
      and later which one you go with. Nothing is detected automatically: War Room has not read your sources.
   3. AI USE (auOpen). Every AI call from this device is counted (calls, failures, rough size). Kept on this device only.
   Nothing here ranks, recommends or adds a candidate to Mission Control. */
'use strict';
function fmDays(n) { const out = []; for (let i = 0; i < n; i++) out.push(dk(addDays(new Date(), -i))); return out; }
function fmAgo(k) { if (!k) return null; try { return Math.max(0, Math.round((pd(dk(new Date())) - pd(k)) / 864e5)); } catch (e) { return null; } }
function fmStamp(x) { const t = x && (x.at || x.t || x._u); if (typeof t === 'number' && t > 1e11) return dk(new Date(t)); const d = x && (x.d || x.date || x.day); return typeof d === 'string' && /^\d{4}-\d\d-\d\d/.test(d) ? d.slice(0, 10) : null; }
function fmCount(list, D) { const set = new Set(D), days = new Set(); let last = null, n = 0; list.forEach((k) => { if (!k) return; n++; if (set.has(k)) days.add(k); if (!last || k > last) last = k; }); return { n, days: days.size, last }; }
function fmRows() {
  const D = fmDays(30), R = [], day = (k) => (S.days || {})[k] || {}, live = (m) => Object.values(m || {}).filter((x) => x && !x._del);
  /* business */
  let calls = []; try { qItems().forEach((x) => (x.log || []).forEach((e) => calls.push(e.day || (e.at ? dk(new Date(e.at)) : null)))); } catch (e) { }
  const B = fmCount(calls, D), ext = D.filter((k) => (day(k).ext || []).some((e) => e && !e.del)).length, ctr = D.filter((k) => Number((day(k).counters || {}).dials) > 0).length;
  R.push({ id: 'biz', name: 'Business (Caregiver Bench)', w: 3, kind: 'Measured by the app: one record per call you log. Counter presses and outside reports are your own word.', n: B.days, last: B.last, cov: `${B.n} call record${B.n === 1 ? '' : 's'} in all · dial counter used on ${ctr} of 30 days · outside reports on ${ext}`, res: 'Per call, with its outcome', unknown: B.n < 30 ? 'Any conversion rate. Under 30 call records a rate is noise, so none is trusted yet.' : 'Why owners say no: only what you typed in the call note.', gain: 'Log each call with its outcome. The next 30 call records are worth more than any other data in here.' });
  /* body */
  const W = D.filter((k) => Number(day(k).weight) > 0), T = D.filter((k) => (day(k).workouts || []).length || (day(k).habits || {}).train), SL = D.filter((k) => day(k).bedAt || day(k).wokeAt), ML = D.filter((k) => (day(k).meals || []).length);
  R.push({ id: 'body', name: 'Body and training', w: 2, kind: 'Your own entries (scale, training log, meals, bed and wake times). No sensor is connected.', n: new Set(W.concat(T, SL, ML)).size, last: [W[0], T[0], SL[0], ML[0]].filter(Boolean).sort().pop() || null, cov: `weight on ${W.length} of 30 days · training on ${T.length} · sleep times on ${SL.length} · meals on ${ML.length}`, res: 'Per day; training per session only if you log the sets', unknown: W.length < 4 ? 'The weekly weight trend: it needs at least 4 weigh-ins in 30 days.' : 'Sleep quality and recovery: only the times you typed are known.', gain: W.length < 8 ? 'Weigh in on the same two mornings every week.' : 'Log sets and loads for the main lifts, so progress can be seen.' });
  /* learning */
  let rl = []; try { rl = (bcV('rlog', []) || []).map((r) => r && r[0]); } catch (e) { }
  const L = fmCount(rl, D);
  R.push({ id: 'learn', name: 'Learning', w: 2, kind: 'Measured by the app: recalls you answered and how each was graded.', n: L.days, last: L.last, cov: `${L.n} graded recall${L.n === 1 ? '' : 's'} in all`, res: 'Per question', unknown: 'Whether a lesson changed a real call: nothing links a lesson to a call outcome yet.', gain: 'After a call, tick which lesson you used (Proof → put to use).' });
  /* money */
  const M = fmCount(live(S.txns).map(fmStamp), D);
  R.push({ id: 'money', name: 'Money', w: 2, kind: 'Your own entries. No bank is connected, so what is not typed does not exist here.', n: M.days, last: M.last, cov: `${M.n} ledger entr${M.n === 1 ? 'y' : 'ies'} in all`, res: 'Per entry', unknown: 'Spending you did not enter, and every balance.', gain: 'Enter the day\'s spending at shutdown; one minute.' });
  /* time and execution */
  const X = D.filter((k) => day(k).mc || Object.keys(day(k).blk || {}).length);
  R.push({ id: 'time', name: 'Time and follow-through', w: 2, kind: 'Measured by the app: what you ticked done, missed or moved.', n: X.length, last: X[0] || null, cov: `days with a plan record: ${X.length} of 30`, res: 'Per block of the day', unknown: 'Minutes actually spent: ticks are recorded, time is not.', gain: 'Tap Done or Missed in the guided day; untracked days cannot be planned around.' });
  /* people */
  let pp = 0, pc = 0; try { pp = ppAll().length; pc = pcAll().filter((c) => !c.done).length; } catch (e) { }
  R.push({ id: 'people', name: 'People and promises', w: 1, kind: 'Your own entries.', n: null, last: null, cov: `${pp} ${pp === 1 ? 'person' : 'people'} · ${pc} open promise${pc === 1 ? '' : 's'}`, res: 'Per promise', unknown: 'Anyone you have not written down.', gain: 'Write a promise down when you make it.' });
  /* outside world */
  let lib = [], unv = 0, nodate = 0; try { lib = ccAll(); lib.forEach((x) => { if ((x.stat || x.claim) === 'unverified' || x.claim === 'opinion') unv++; if (!x.at) nodate++; }); } catch (e) { }
  const cx = cxAll().filter((c) => c.st === 'open').length, rq = live(S.research).filter((r) => r.st === 'open').length;
  R.push({ id: 'world', name: 'The outside world (your library)', w: 1, kind: 'Outside sources, each marked official, research, expert, practitioner or opinion. Found by search, mostly not read for you.', n: null, last: null, cov: `${lib.length} resources · ${unv} unverified or opinion · ${rq} open question${rq === 1 ? '' : 's'} · ${cx} unresolved disagreement${cx === 1 ? '' : 's'}`, res: 'Per resource', unknown: `Whether each is still current: ${nodate} carry no date.`, gain: 'When two sources disagree, record it (Sources that disagree).' });
  return R;
}
function fmNext(R) { return R.filter((r) => r.n != null).map((r) => ({ r, s: r.w * (1 - r.n / 30) + (fmAgo(r.last) == null ? 1 : Math.min(1, fmAgo(r.last) / 14)) })).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.r); }
function fmOpen() {
  const R = fmRows(), N = fmNext(R), fresh = (r) => r.n == null ? '' : `<div class="xs">Recorded on <b>${r.n}</b> of the last 30 days · newest record: <b>${r.last ? (fmAgo(r.last) === 0 ? 'today' : fmAgo(r.last) + ' day' + (fmAgo(r.last) === 1 ? '' : 's') + ' ago') : 'never'}</b></div>`;
  openModal(`<h2>How well War Room knows you</h2><div class="hint">Part by part. There is no single score on purpose: each part of life is measured its own way, and a percentage for "understanding a person" would be invented.</div>
  <div class="mc-wl"><span>Where one more piece of information helps most</span>${N.map((r) => `<div class="xs">• <b>${esc(r.name)}</b>: ${esc(r.gain)}</div>`).join('')}<div class="xs" style="opacity:.7">Ranked by a plain rule: how much the part drives your main goal, times how little is recorded.</div></div>
  ${R.map((r) => `<div class="st-o" id="fm-${r.id}"><em>${esc(r.name)}</em><div class="xs">${esc(r.kind)}</div>${fresh(r)}<div class="xs">${esc(r.cov)}</div><div class="xs">Detail: ${esc(r.res)}</div><div class="xs"><b>Not known:</b> ${esc(r.unknown)}</div><div class="xs"><b>Would improve it:</b> ${esc(r.gain)}</div></div>`).join('')}
  <div class="fn-inline"><button class="btn" onclick="cxOpen()">Sources that disagree</button><button class="btn" onclick="auOpen()">AI use</button></div>
  <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
/* ── 2. sources that disagree ── */
function cxAll() { try { return Object.keys(S.boot || {}).filter((k) => k.indexOf('cx:') === 0).map((k) => bcV(k, null)).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0)); } catch (e) { return []; } }
const CX_ST = { open: 'Not settled', a: 'I go with the first', b: 'I go with the second', both: 'Both hold, in different situations' };
function cxOpen() {
  let A = []; try { A = ccAll().slice().sort((a, b) => String(a.t).localeCompare(String(b.t))); } catch (e) { }
  const name = (id) => { const x = A.find((y) => y.id === id); return x ? String(x.t).slice(0, 70) : 'a source no longer in the library'; }, opt = '<option value="">Choose…</option>' + A.map((x) => `<option value="${esc(x.id)}">${esc(String(x.t).slice(0, 56))}${x.by ? ' · ' + esc(String(x.by).slice(0, 18)) : ''}</option>`).join(''), L = cxAll();
  openModal(`<h2>Sources that disagree</h2><div class="hint">When two things in your library say opposite things, write it down here instead of quietly believing the last one you read. War Room does not detect this: it has not read your sources. You notice it, you record it, and later you say which you go with and why.</div>
  ${L.length ? L.map((c) => `<div class="st-o" id="cx-${esc(c.id)}"><em>${esc(name(c.a))} <span style="opacity:.6">against</span> ${esc(name(c.b))}</em><div class="xs">${esc(c.note)}</div><div class="xs"><b>${esc(CX_ST[c.st] || CX_ST.open)}</b></div><div class="fn-inline">${Object.keys(CX_ST).filter((k) => k !== c.st).map((k) => `<button class="btn" onclick="cxSet('${esc(c.id)}','${k}')">${esc(CX_ST[k])}</button>`).join('')}</div></div>`).join('') : '<div class="xs" style="margin:10px 0">Nothing recorded yet.</div>'}
  <div class="st-o"><em>Record one</em><select id="cx-a" style="width:100%;margin-top:6px">${opt}</select><select id="cx-b" style="width:100%;margin-top:6px">${opt}</select><textarea id="cx-note" rows="2" style="width:100%;margin-top:6px" placeholder="What exactly do they disagree about? One sentence."></textarea><div class="fn-inline"><button class="btn primary" onclick="cxSave()">Save</button></div></div>
  <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
function cxSave() { const a = $('cx-a').value, b = $('cx-b').value, n = ($('cx-note').value || '').trim(); if (!a || !b || a === b) { toast('Pick two different sources'); return; } if (n.length < 12) { toast('Say in one sentence what they disagree about'); return; } const id = uid(); bcW('cx:' + id, { id, a, b, note: n.slice(0, 300), at: now(), st: 'open' }); cxOpen(); }
function cxSet(id, st) { const r = bcV('cx:' + id, null); if (!r || !CX_ST[st]) return; bcW('cx:' + id, Object.assign({}, r, { st, res: now() })); cxOpen(); }
try { if (typeof AG_PACK !== 'undefined' && AG_PACK.know && !AG_PACK.know._cx) { const f = AG_PACK.know; AG_PACK.know = function () { const L = f() || [], C = cxAll(), o = C.filter((c) => c.st === 'open').length; L.push(C.length ? `Disagreements between sources recorded by the operator: ${C.length} (${o} not settled)` : 'No disagreement between sources has been recorded'); return L; }; AG_PACK.know._cx = 1; } } catch (e) { }
/* ── 3. AI use, counted on this device ── */
const AU_KEY = 'wr-aiuse';
function auLog() { try { return JSON.parse(localStorage.getItem(AU_KEY) || '{}') || {}; } catch (e) { return {}; } }
function auAdd(ok, cin, cout) { try { const L = auLog(), k = dk(new Date()), r = L[k] || { n: 0, fail: 0, cin: 0, cout: 0 }; r.n++; if (!ok) r.fail++; r.cin += cin || 0; r.cout += cout || 0; L[k] = r; const keys = Object.keys(L).sort(); while (keys.length > 60) delete L[keys.shift()]; localStorage.setItem(AU_KEY, JSON.stringify(L)); } catch (e) { } }
function auSum(n) { const L = auLog(), t = { n: 0, fail: 0, cin: 0, cout: 0 }; fmDays(n).forEach((k) => { const r = L[k]; if (r) { t.n += r.n; t.fail += r.fail; t.cin += r.cin; t.cout += r.cout; } }); return t; }
if (typeof aiText === 'function' && !aiText._au) { const f = aiText; aiText = async function (system, msgs) { const cin = String(system || '').length + (msgs || []).reduce((s, m) => s + String((m && m.text) || '').length, 0); try { const r = await f.apply(this, arguments); auAdd(true, cin, String(r || '').length); return r; } catch (e) { auAdd(false, cin, 0); throw e; } }; Object.keys(f).forEach((k) => { aiText[k] = f[k]; }); aiText._au = 1; }
async function auOpen() {
  const row = (label, t) => `<div class="xs">• <b>${label}</b>: ${t.n} call${t.n === 1 ? '' : 's'}${t.fail ? ` (${t.fail} failed)` : ''}${t.n ? ` · about ${Math.round((t.cin + t.cout) / 4).toLocaleString('en-GB')} tokens` : ''}</div>`;
  let sv = '<div class="xs">Server: not asked yet.</div>';
  try { if (typeof svRpc === 'function') { const j = await svRpc('warroom_jobs', { p_limit: 50 }), J = Array.isArray(j) ? j : (j && j.jobs) || null; if (J) { const c = J.reduce((s, x) => s + (Number(x.result && x.result.ai_calls) || 0), 0); sv = `<div class="xs">• <b>Server, last ${J.length} job${J.length === 1 ? '' : 's'}</b>: ${c} AI call${c === 1 ? '' : 's'} that succeeded. The server stops at its daily limit.</div>`; } else sv = '<div class="xs">Server: could not be reached from this device just now.</div>'; } } catch (e) { }
  openModal(`<h2>AI use</h2><div class="hint">How much this device has asked the AI. Counted here, kept on this device only, never synced.</div>
  <div class="mc-wl" id="au-dev"><span>This device</span>${row('Today', auSum(1))}${row('Last 7 days', auSum(7))}${row('Last 30 days', auSum(30))}</div>
  <div class="mc-wl"><span>The server</span>${sv}</div>
  <div class="xs" style="margin-top:10px"><b>What this is not:</b> a bill. Token numbers are estimated from the length of the text (about four characters each), and War Room does not turn them into money, because prices differ by provider and change. It is here so a runaway shows up, not for accounting.</div>
  <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`, true);
}
try { if (typeof WF !== 'undefined') { const add = (x) => { if (!WF.some((y) => y[0] === x[0])) WF.push(x); };
  add(['fidelity', 'dir', 'How well War Room knows me', 'how well does war room know me fidelity coverage evidence where does this number come from what is missing data quality', 'Where do I…? → how well War Room knows me', 'Part by part: what the evidence is, how fresh, what is not known, what would help most.', () => fmOpen()]);
  add(['srcclash', 'dir', 'Sources that disagree', 'sources disagree contradiction conflict two books say opposite which is right', 'Where do I…? → sources that disagree', 'Record that two things in your library contradict each other, and which you go with.', () => cxOpen()]);
  add(['aiuse', 'dir', 'AI use', 'ai use cost tokens calls how much ai spending usage limit', 'Where do I…? → AI use', 'How many AI calls this device and the server have made.', () => auOpen()]); } } catch (e) { }
