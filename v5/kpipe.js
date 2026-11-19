/* War Room 13.26 · kpipe.js — THE KNOWLEDGE-TO-EXECUTION PIPELINE. Reusable for any source, not only Hormozi.
   DISCOVER → CAPTURE → PROCESS → CLASSIFY → DE-DUPLICATE → LEARN → RETAIN → OPERATIONALIZE → EXECUTE → MEASURE → IMPROVE
   Sources of truth (nothing is copied twice):
     · inventory    lib/sources.json (researched, read-only: title, creator, type, status, URL, access, topics,
                    overlap with the library) + user-added sources in S.sources
     · progress     S.sources[id] (insights, links, decisions): one record per source
     · lessons      lib/cards.json (Bootcamp ideas) — LEARN links to them or records a content gap
     · memory       mastery.js spacing of the linked ideas — RETAIN is read from the ladder, never ticked
     · procedures   S.manual (defense.js Field Manual) — OPERATIONALIZE creates an entry marked PROPOSED until you approve
     · execution    S.experiments (intel.js) or S.tasks — EXECUTE
     · results      the experiment's result / the source's result — MEASURE → IMPROVE updates the procedure
   Most stages are DERIVED from the linked records, so a stage cannot be ticked without the thing existing.
   New content never changes a business rule by itself: a proposed procedure needs your approval (and a recorded
   reason) before it is marked approved. Continuous discovery: a scheduled task can search the inbox and produce a
   JSON list that you paste into Import; nothing enters the app without you. */
'use strict';

const KP_ST = [['discover', 'Discover'], ['capture', 'Capture'], ['process', 'Process'], ['classify', 'Classify'], ['dedupe', 'De-duplicate'], ['learn', 'Learn'], ['retain', 'Retain'], ['oper', 'Operationalize'], ['exec', 'Execute'], ['measure', 'Measure'], ['improve', 'Improve']];
const KP_TYPE = { book: 'Book', workbook: 'Workbook', playbook: 'Playbook', pdf: 'PDF', video: 'Video', course: 'Course', email: 'Email', web: 'Web page', podcast: 'Podcast', other: 'Other' };
const KP_STAT = { official: 'Verified official', public: 'Verified public supplement', third: 'Third-party summary', unverified: 'Unverified reference' };
let KPL = null, kpLoading = false;
function kpLoad(cb) { if (KPL) { if (cb) cb(); return; } if (kpLoading) return; kpLoading = true; fetch('./lib/sources.json').then((r) => r.json()).then((d) => { KPL = d; kpLoading = false; if (cb) cb(); }).catch(() => { KPL = { v: 0, sources: [] }; kpLoading = false; if (cb) cb(); }); }
function kpAll() { const lib = (KPL && KPL.sources) || [], P = S.sources || {}, out = lib.map((x) => Object.assign({}, x, { lib: 1 }, P[x.id] && !P[x.id]._del ? P[x.id] : {}, { id: x.id })); Object.values(P).forEach((p) => { if (p && !p._del && !lib.some((x) => x.id === p.id)) out.push(p); }); return out; }
function kpGet(id) { return kpAll().find((x) => x.id === id) || null; }
function kpW(id, patch) { S.sources = S.sources || {}; S.sources[id] = Object.assign({}, S.sources[id] || { id }, patch, { id, _u: now() }); save(); }
/* stage state, derived from the linked records */
function kpStages(x) {
  const cards = (x.cards || []).filter((c) => typeof XC === 'undefined' || !XC || XC.byId[c]), learned = cards.filter((c) => typeof bcV === 'function' && bcV('l:' + c, null)), retained = cards.filter((c) => typeof bcRung === 'function' && typeof BC !== 'undefined' && BC && bcRung(c) >= 3);
  const man = x.man && (S.manual || {})[x.man] && !(S.manual[x.man] || {})._del ? S.manual[x.man] : null, exp = x.exp && (S.experiments || {})[x.exp] && !S.experiments[x.exp]._del ? S.experiments[x.exp] : null, task = x.task && (S.tasks || {})[x.task] ? S.tasks[x.task] : null;
  const res = (exp && exp.result) || x.res || (task && task.done ? 'task done' : '');
  return { discover: true, capture: !!(x.url || x.cap || x.file) && x.acc !== 'none', process: !!String(x.ins || '').trim(), classify: !!((x.caps || []).length || cards.length), dedupe: !!x.dd, learn: !!(cards.length || x.gap), retain: !!retained.length, oper: !!(man && man.appr), exec: !!(exp || task), measure: !!res, improve: !!(man && x.resAt && (man.rev || '') >= x.resAt) || !!x.impNote,
    info: { cards, learned, retained, man, exp, task, res } };
}
function kpNext(x) { const s = kpStages(x); for (const [k] of KP_ST) { if (k === 'retain' && !s.info.cards.length) continue; if (!s[k]) return k; } return null; }
/* de-duplication: same URL, similar title, or insights already covered by library cards */
function kpTok(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9$ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)); }
function kpDupes(x) {
  const A = kpTok(x.t), out = []; kpAll().forEach((y) => { if (y.id === x.id) return; if (x.url && y.url && x.url.replace(/\/$/, '') === y.url.replace(/\/$/, '')) { out.push(['same link', y]); return; } const B = kpTok(y.t), i = [...A].filter((w) => B.has(w)).length, j = i / Math.max(1, new Set([...A, ...B]).size); if (j >= 0.6) out.push(['similar title', y]); });
  const cards = []; if (typeof XC !== 'undefined' && XC && XC.cards && x.ins) { const t = String(x.ins).toLowerCase(); XC.cards.forEach((c) => { if ((c.m || []).some((m) => { try { return new RegExp('\\b(' + m + ')\\b', 'i').test(t); } catch (e) { return false; } })) cards.push(c); }); }
  return { src: out, cards: cards.slice(0, 8) };
}

/* ── screens ── */
let KPF = '';
function kpOpen(f) {
  if (!KPL) { kpLoad(() => kpOpen(f)); return; } if (typeof XC === 'undefined' || !XC) { if (typeof xcLoad === 'function') xcLoad(); }
  KPF = f == null ? KPF : f; const A = kpAll(), cnt = {}; KP_ST.forEach(([k]) => (cnt[k] = 0)); A.forEach((x) => { const n = kpNext(x); if (n) cnt[n]++; }); const done = A.filter((x) => !kpNext(x)).length;
  const V = A.filter((x) => !KPF || kpNext(x) === KPF || (KPF === 'done' && !kpNext(x))), mx = Math.max(1, ...Object.values(cnt), done);
  const gaps = A.filter((x) => x.gap && !(x.cards || []).length);
  openModal(`<h2>Knowledge pipeline</h2><div class="hint">Every valuable source has a path from discovery to real results. Each source waits at one stage; most stages are proved by a linked record, not a tick.</div>
    <div class="kp-fun">${KP_ST.map(([k, l]) => `<button class="${KPF === k ? 'on' : ''}" onclick="kpOpen('${KPF === k ? '' : k}')"><span>${l}</span><i style="width:${(cnt[k] / mx) * 100}%"></i><b>${cnt[k]}</b></button>`).join('')}<button class="${KPF === 'done' ? 'on' : ''}" onclick="kpOpen('${KPF === 'done' ? '' : 'done'}')"><span>Complete</span><i style="width:${(done / mx) * 100}%"></i><b>${done}</b></button></div>
    ${gaps.length ? `<div class="mc-risk">${gaps.length} source(s) marked as a content gap: no Bootcamp lesson covers them yet.</div>` : ''}
    ${V.slice(0, 60).map((x) => { const n = kpNext(x); return `<button class="rl-f" onclick="kpView('${x.id}')"><b>${esc(x.t)}</b><span>${esc(KP_TYPE[x.type] || x.type || '')}${x.by ? ' · ' + esc(x.by) : ''} · <i class="${x.stat === 'official' ? 'ok' : x.stat === 'public' ? 'acc' : 'warn'}">${esc(KP_STAT[x.stat] || 'Unverified reference')}</i> · next: ${n ? esc((KP_ST.find((s) => s[0] === n) || ['', n])[1]) : 'complete'}</span></button>`; }).join('') || '<div class="empty">Nothing at this stage.</div>'}
    <div class="actions" style="flex-wrap:wrap"><button class="btn" onclick="kpAuditOpen()">Audit</button><button class="btn" onclick="kpImport()">Import discoveries</button><button class="btn primary" onclick="kpEdit('')">＋ Add a source</button></div>`, true);
}
function kpView(id) {
  const x = kpGet(id); if (!x) return; const s = kpStages(x), n = kpNext(x), I = s.info;
  const act = { capture: ['Add the link or where the material is', `kpEdit('${id}')`], process: ['Write the key frameworks and lessons', `kpEdit('${id}','ins')`], classify: ['Link capabilities and ideas', `kpClassify('${id}')`], dedupe: ['Check for duplicates', `kpDedupe('${id}')`], learn: ['Link a Bootcamp lesson or mark a content gap', `kpClassify('${id}')`], retain: ['Learn and recall the linked ideas', `kpRetain('${id}')`], oper: [I.man ? 'Approve the proposed procedure' : 'Turn it into a procedure (proposed)', `kpOper('${id}')`], exec: ['Run it: an experiment or a task', `kpExec('${id}')`], measure: ['Record the result', `kpMeasure('${id}')`], improve: ['Update the procedure from the result', `kpImprove('${id}')`] }[n] || null;
  openModal(`<h2>${esc(x.t)}</h2><div class="hint">${esc(KP_TYPE[x.type] || x.type || '')}${x.by ? ' · ' + esc(x.by) : ''}${x.prog ? ' · ' + esc(x.prog) : ''}${x.ed ? ' · ' + esc(x.ed) : ''} · <b>${esc(KP_STAT[x.stat] || 'Unverified reference')}</b>${x.acc ? ' · access: ' + esc(x.acc) : ''}</div>
    ${x.url ? `<div class="mc-wl"><span>Source</span><div><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></div></div>` : ''}
    ${x.topics ? `<div class="mc-wl"><span>Covers</span><div>${esc(x.topics)}</div></div>` : ''}${x.lib && x.overlap ? `<div class="mc-wl"><span>Overlap with your library</span><div>${esc(x.overlap)}</div></div>` : ''}${x.cb ? `<div class="mc-wl"><span>For Caregiver Bench</span><div>${esc(x.cb)}</div></div>` : ''}${x.note ? `<div class="aq-note">${esc(x.note)}</div>` : ''}
    <div class="kp-chain">${KP_ST.map(([k, l]) => `<span class="${s[k] ? 'on' : k === n ? 'nx' : ''}">${l}</span>`).join('')}</div>
    ${x.ins ? `<div class="mc-wl"><span>Insights (your words)</span><div style="white-space:pre-wrap">${esc(x.ins)}</div></div>` : ''}
    ${I.cards.length ? `<div class="mc-wl"><span>Bootcamp ideas</span>${I.cards.map((c) => `<div><a onclick="closeModal();cpIdea('${c}')">${esc(XC && XC.byId[c] ? XC.byId[c].t : c)}</a> <em>${I.retained.includes(c) ? 'retained' : I.learned.includes(c) ? 'learned' : 'not learned'}</em></div>`).join('')}</div>` : x.gap ? '<div class="mc-risk">Content gap: no lesson covers this yet.</div>' : ''}
    ${(x.caps || []).length && typeof cmCap === 'function' ? `<div class="mc-wl"><span>Capabilities</span>${x.caps.map((c) => cmCap(c) ? `<div><a onclick="cmCapOpen('${c}')">${esc(cmCap(c).n)}</a></div>` : '').join('')}</div>` : ''}
    ${I.man ? `<div class="mc-wl"><span>Procedure</span><div><a onclick="fmView('${I.man.id}')">${esc(I.man.n)}</a> <em>${I.man.appr ? 'approved ' + esc(I.man.appr) : 'PROPOSED: not approved'}</em></div></div>` : ''}${I.exp ? `<div class="mc-wl"><span>Experiment</span><div><a onclick="recEdit('experiments','${I.exp.id}')">${esc(I.exp.title)}</a>${I.exp.result ? ' · ' + esc(I.exp.result) : ''}</div></div>` : ''}${I.task ? `<div class="mc-wl"><span>Task</span><div>${esc(I.task.title)} ${I.task.done ? '✓' : ''}</div></div>` : ''}
    ${act ? `<button class="cp-next" onclick="${act[1]}"><span>Next stage</span><b>${esc(act[0])}</b></button>` : '<div class="aq-note">Complete: learned, used, measured, improved.</div>'}
    <div class="actions"><button class="btn" onclick="kpEdit('${id}')">Edit</button><button class="btn" onclick="kpOpen()">All sources</button></div>`, true);
}
function kpEdit(id, focus) {
  const x = kpGet(id) || { type: 'video', stat: 'unverified', acc: 'full' }, sel = (i, m, v) => `<select class="aq-in" id="${i}">${Object.keys(m).map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${m[k]}</option>`).join('')}</select>`;
  openModal(`<h2>${id ? 'Source' : 'New source'}</h2><input class="aq-in" id="kp-t" placeholder="Exact title" value="${esc(x.t || '')}"><input class="aq-in" id="kp-by" placeholder="Author / creator" value="${esc(x.by || '')}">
    <div class="row" style="gap:8px"><div class="grow">${sel('kp-type', KP_TYPE, x.type)}</div><div class="grow">${sel('kp-stat', KP_STAT, x.stat)}</div></div><input class="aq-in" id="kp-url" placeholder="Link (https://…)" value="${esc(x.url || '')}"><input class="aq-in" id="kp-cap" placeholder="Or where it is (book on the shelf, PDF in Drive…)" value="${esc(x.cap || '')}">
    <label class="xs muted">Access</label>${sel('kp-acc', { full: 'Full material accessible', part: 'Partly (summary, preview)', none: 'Not accessible (needs purchase / login)' }, x.acc || 'full')}
    <textarea class="aq-in" id="kp-ins" rows="6" placeholder="PROCESS: the frameworks, principles, examples and actions, in your own words (no copied text)">${esc(x.ins || '')}</textarea>
    <div class="actions">${id && !x.lib ? `<button class="btn danger" onclick="kpDel('${id}')">Delete</button>` : ''}<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="kpSave('${id || ''}')">Save</button></div>`, true);
  if (focus === 'ins') setTimeout(() => { const e = $('kp-ins'); if (e) e.focus(); }, 80);
}
function kpSave(id) { const g = (k) => (($('kp-' + k) || {}).value || '').trim(); if (!g('t')) { toast('Title first'); return; } const nid = id || 'src' + uid(), lib = KPL && KPL.sources.some((x) => x.id === nid), p = { ins: g('ins'), acc: g('acc') }; if (!lib) Object.assign(p, { t: g('t'), by: g('by'), type: g('type'), stat: g('stat'), url: g('url'), cap: g('cap'), at: (S.sources || {})[nid] && S.sources[nid].at || dk(new Date()) }); else Object.assign(p, { url: g('url') || undefined, cap: g('cap') }); Object.keys(p).forEach((k) => p[k] === undefined && delete p[k]); kpW(nid, p); kpView(nid); }
function kpDel(id) { kpW(id, { _del: true }); closeModal(); toast('Removed'); }
function kpClassify(id) {
  const x = kpGet(id); if (!x) return; const D = kpDupes(x), cand = D.cards.map((c) => c.id), cur = x.cards || [], all = [...new Set(cur.concat(cand))];
  openModal(`<h2>Classify & learn</h2><div class="hint">Which capabilities does it build, and which Bootcamp ideas teach it? If none does, mark a content gap: that is honest, and the gap is listed.</div>${typeof cmSel === 'function' ? cmSel('kc-cap', (x.caps || [])[0] || '') : ''}
    <div class="mc-wl"><span>Bootcamp ideas ${cand.length ? '(matched from your insights)' : ''}</span>${all.map((c) => `<label class="jl-q"><input type="checkbox" class="kc-c" value="${c}" ${cur.includes(c) ? 'checked' : ''}> ${esc(XC && XC.byId[c] ? XC.byId[c].t : c)}</label>`).join('') || '<div class="xs muted">No match from the insights. Search an idea:</div>'}<input class="aq-in" id="kc-q" placeholder="Search ideas to link" oninput="kpIdeaSearch()"><div id="kc-r"></div></div>
    <label class="jl-q"><input type="checkbox" id="kc-gap" ${x.gap ? 'checked' : ''}> No lesson covers it: content gap</label>
    <div class="actions"><button class="btn" onclick="kpView('${id}')">Cancel</button><button class="btn primary" onclick="kpClassifySave('${id}')">Save</button></div>`, true);
}
function kpIdeaSearch() { const q = (($('kc-q') || {}).value || '').toLowerCase().trim(), el = $('kc-r'); if (!el) return; if (q.length < 2 || !XC) { el.innerHTML = ''; return; } el.innerHTML = XC.cards.filter((c) => (c.t + ' ' + (c.m || []).join(' ')).toLowerCase().includes(q)).slice(0, 8).map((c) => `<label class="jl-q"><input type="checkbox" class="kc-c" value="${c.id}"> ${esc(c.t)}</label>`).join(''); }
function kpClassifySave(id) { const cards = [...new Set([...document.querySelectorAll('.kc-c:checked')].map((c) => c.value))], cap = (($('kc-cap') || {}).value || ''), gap = !!(($('kc-gap') || {}).checked); kpW(id, { cards, caps: cap ? [cap] : [], gap: gap && !cards.length }); kpView(id); }
function kpDedupe(id) {
  const x = kpGet(id); if (!x) return; const D = kpDupes(x);
  openModal(`<h2>De-duplicate</h2>${D.src.length ? D.src.map(([w, y]) => `<div class="mc-risk">${esc(w)}: <a onclick="kpView('${y.id}')">${esc(y.t)}</a></div>`).join('') : '<div class="aq-note">No other source has the same link or a similar title.</div>'}
    ${D.cards.length ? `<div class="mc-wl"><span>Already covered by these ideas</span>${D.cards.map((c) => `<div>${esc(c.t)}</div>`).join('')}</div>` : x.ins ? '<div class="xs muted">No library idea matches the insights text.</div>' : '<div class="xs muted">Write the insights first for a content check.</div>'}
    <div class="actions" style="flex-wrap:wrap"><button class="btn" onclick="kpDdSave('${id}','dup')">It duplicates what I have</button><button class="btn" onclick="kpDdSave('${id}','deeper')">Same idea, more depth</button><button class="btn primary" onclick="kpDdSave('${id}','new')">Genuinely new</button></div>`, true);
}
function kpDdSave(id, v) { kpW(id, { dd: v, ddAt: dk(new Date()) }); toast(v === 'dup' ? 'Marked duplicate: link it to the existing ideas, no new lesson needed.' : 'Saved'); kpView(id); }
function kpRetain(id) { const x = kpGet(id), s = x ? kpStages(x) : null; if (!s) return; const notL = s.info.cards.filter((c) => !s.info.learned.includes(c)); closeModal(); if (notL.length && typeof bcLesson === 'function') { show('boot'); setTimeout(() => bcLesson(notL[0]), 200); } else if (s.info.learned.length && typeof cpRecallSet === 'function') cpRecallSet(s.info.learned); else toast('Link ideas first'); }
function kpOper(id) {
  const x = kpGet(id); if (!x) return; const s = kpStages(x);
  if (s.info.man) { openModal(`<h2>Approve the procedure?</h2><div class="hint">“${esc(s.info.man.n)}” came from new material. Approving it means you will use it in the business. Write why.</div><input class="aq-in" id="kp-why" placeholder="Why it is worth using (evidence or reasoning)"><div class="actions"><button class="btn" onclick="fmView('${s.info.man.id}')">Read it first</button><button class="btn primary" onclick="kpApprove('${id}')">Approve</button></div>`, true); return; }
  const mid = 'fm' + uid(); S.manual = S.manual || {}; S.manual[mid] = { id: mid, _u: now(), kind: 'proc', n: x.t.slice(0, 70), sit: '', obj: '', steps: String(x.ins || '').split('\n').filter((l) => l.trim()).slice(0, 8).join('\n'), src: `${x.by || ''} · ${x.t}${x.url ? ' · ' + x.url : ''}`, q: x.stat === 'official' ? 'expert' : 'practitioner', caps: x.caps || [], card: (x.cards || [])[0] || '', at: dk(new Date()), rev: dk(new Date()), uses: [], prop: id };
  kpW(id, { man: mid }); save(); toast('Proposed procedure created. Edit it to fit Caregiver Bench, then approve.'); fmEdit(mid);
}
function kpApprove(id) { const x = kpGet(id), m = x && (S.manual || {})[x.man], why = (($('kp-why') || {}).value || '').trim(); if (!m) return; if (why.length < 5) { toast('Write why'); return; } m.appr = dk(new Date()); m.apprWhy = why; m._u = now(); save(); toast('Approved'); kpView(id); }
function kpExec(id) {
  const x = kpGet(id); if (!x) return; openModal(`<h2>Execute</h2><div class="hint">Test it in real life. An experiment changes ONE thing and measures it; a task is a one-off.</div><button class="mc-opt" onclick="kpExp('${id}')"><b>Experiment</b><span>Hypothesis, the one change, a metric measured before and during</span></button><button class="mc-opt" onclick="kpTask('${id}')"><b>Task</b><span>A single implementation step with a date</span></button>`, true);
}
function kpExp(id) { const x = kpGet(id); if (!x) return; S.experiments = S.experiments || {}; const eid = 'e' + uid(); S.experiments[eid] = { id: eid, _u: now(), title: 'Test: ' + x.t.slice(0, 60), hypothesis: '', variable: '', metric: 'owner rate (owners / dials)', start: dk(new Date()), end: dk(addDays(new Date(), 14)), result: '', decision: '', draft: true, src: id }; kpW(id, { exp: eid }); save(); closeModal(); recEdit('experiments', eid); }
function kpTask(id) { const x = kpGet(id); if (!x) return; const t = { id: uid(), _u: now(), title: 'Implement: ' + x.t.slice(0, 80), due: dk(addDays(new Date(), 3)), done: false, note: 'From the knowledge pipeline' }; S.tasks[t.id] = t; try { if (typeof taskHook === 'function') taskHook('create', t); } catch (e) { } kpW(id, { task: t.id }); toast('Task created'); kpView(id); }
function kpMeasure(id) { const x = kpGet(id), s = x ? kpStages(x) : null; if (!s) return; if (s.info.exp) { closeModal(); recEdit('experiments', s.info.exp.id); return; } openModal(`<h2>Result</h2><textarea class="aq-in" id="kp-res" rows="3" placeholder="What happened when you used it (numbers if you have them)">${esc(x.res || '')}</textarea><div class="actions"><button class="btn primary" onclick="kpW('${id}',{res:($('kp-res')||{}).value.trim(),resAt:dk(new Date())});kpView('${id}')">Save</button></div>`, true); }
function kpImprove(id) { const x = kpGet(id), s = x ? kpStages(x) : null; if (!s) return; if (!x.resAt) kpW(id, { resAt: dk(new Date()) }); if (s.info.man) { closeModal(); fmEdit(s.info.man.id); return; } openModal(`<h2>Improve</h2><textarea class="aq-in" id="kp-imp" rows="3" placeholder="What changes in how you work, based on the result"></textarea><div class="actions"><button class="btn primary" onclick="kpW('${id}',{impNote:($('kp-imp')||{}).value.trim()});kpView('${id}')">Save</button></div>`, true); }
/* import from the scheduled discovery task (a JSON list); duplicates by link are skipped */
function kpImport() { openModal(`<h2>Import discoveries</h2><div class="hint">Paste the JSON list produced by the discovery task (or by Claude). Each item: t, by, type, url, stat, acc, topics, date, origin. Nothing else is changed.</div><textarea class="aq-in" id="kp-json" rows="8" placeholder='[{"t":"…","url":"https://…","type":"video","by":"Alex Hormozi","origin":"email 2026-11-18"}]'></textarea><div class="actions"><button class="btn primary" onclick="kpImportRun()">Import</button></div>`, true); }
function kpImportRun() {
  let L; try { L = JSON.parse((($('kp-json') || {}).value || '').trim()); } catch (e) { toast('Not valid JSON'); return; } if (!Array.isArray(L)) L = [L]; const have = new Set(kpAll().map((x) => (x.url || '').replace(/\/$/, '')).filter(Boolean)); let n = 0, skip = 0;
  L.forEach((r) => { if (!r || !r.t) return; const u = String(r.url || '').replace(/\/$/, ''); if (u && have.has(u)) { skip++; return; } const id = 'src' + uid(); kpW(id, { t: String(r.t).slice(0, 200), by: String(r.by || '').slice(0, 80), type: KP_TYPE[r.type] ? r.type : 'other', stat: KP_STAT[r.stat] ? r.stat : 'unverified', url: /^https?:\/\//.test(r.url || '') ? r.url : '', acc: ['full', 'part', 'none'].includes(r.acc) ? r.acc : 'part', topics: String(r.topics || '').slice(0, 300), origin: String(r.origin || '').slice(0, 80), at: String(r.date || dk(new Date())).slice(0, 10), ins: String(r.ins || '').slice(0, 3000) }); have.add(u); n++; });
  toast(`${n} imported${skip ? `, ${skip} already there` : ''}`); kpOpen();
}

(function () {
  const st = document.createElement('style'); st.id = 'kp-css';
  st.textContent = `.kp-fun{display:grid;gap:3px;margin:8px 0 10px}.kp-fun button{display:grid;grid-template-columns:110px 1fr 28px;gap:8px;align-items:center;min-height:32px;background:none;border:0;color:var(--ink,#ddd);font:inherit;font-size:12.5px;text-align:left;cursor:pointer;padding:0}.kp-fun button.on span{color:var(--acc,#C9A24A)}.kp-fun i{display:block;height:8px;border-radius:4px;background:var(--acc,#C9A24A);opacity:.75;min-width:2px}.kp-fun b{font-family:var(--mono,monospace);text-align:right}
  .kp-chain{display:flex;flex-wrap:wrap;gap:4px;margin:10px 0}.kp-chain span{font:600 10px/1 var(--mono,monospace);padding:5px 7px;border-radius:10px;border:1px solid var(--ln,#333);color:var(--muted,#888)}.kp-chain span.on{border-color:var(--good,#3fb950);color:var(--good,#3fb950)}.kp-chain span.nx{border-color:var(--acc,#C9A24A);color:var(--acc,#C9A24A)}`;
  document.head.appendChild(st);
  setTimeout(() => { try { kpLoad(); } catch (e) { } }, 6000);
})();
