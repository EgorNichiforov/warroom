/* War Room · crm.js (6.4) — the CRM layer, built from what the professional tools do best:
   · Pipeline board with stages and "rotting" (Pipedrive): cards go amber, then red, when a stage sits idle too long.
   · Smart Views + power dialing a view (Close): saved live filters with counts; "Dial this view" feeds the dialer
     and the Reactor, never the same agency twice in a day.
   · Cadence (Outreach / Salesloft / Close): a fixed rhythm of touches per agency, so follow-ups never depend on memory.
   · Lead score (HubSpot): fit + engagement, 0–100, explained line by line.
   · Agency record with one timeline (HubSpot / Attio): every call, stage move, note and email in one place.
   · Velocity (Pipedrive reports): how long agencies sit in each stage and how many move on.
   Data lives on the queue item (synced): x.hist [{at,t,text,from,to}], x.tags, x.cad (paused/parked).
   Legal lines kept: no cold SMS, no call recording, email only when they gave an address. */
'use strict';
const CRM_STAGES = [
  ['working', 'Working', 'Called, no owner yet', 4],
  ['talked', 'Talked', 'Owner reached, follow-up open', 3],
  ['interested', 'Interested', 'Bulletin yes / wants profiles', 3],
  ['booked', 'Case call', 'Case call booked', 2],
  ['case', 'Case / trial', 'Working a case', 3],
  ['client', 'Client', 'Paying', 14],
  ['lost', 'Lost', 'Not now / no / dead', 0]];
const CRM_TO_STATUS = { working: 'callback', talked: 'callback', interested: 'bulletin', booked: 'booked', case: 'trial', client: 'member', lost: 'no' };
let crmTab = 'board', crmView = null, crmDialView = null, crmQ = '', crmShowLost = false;

function crmTalked(x) { return (x.log || []).some((e) => e.d && e.d.owners); }
function crmStage(x) {
  const s = x.status;
  if (s === 'member') return 'client'; if (s === 'trial') return 'case'; if (s === 'booked') return 'booked'; if (s === 'bulletin') return 'interested';
  if (s === 'no' || s === 'bad' || s === 'unreachable') return 'lost';
  if (s === 'callback' && x.stage && x.stageAt && CRM_STAGES.some((z) => z[0] === x.stage)) { const lo = ((x.log || []).filter((e) => e.d && e.d.owners).slice(-1)[0] || {}).at || ''; if (x.stageAt >= lo) return x.stage; }
  if (crmTalked(x)) return 'talked';
  if ((x.attempts || 0) > 0 || (x.log || []).length) return 'working';
  return 'fresh';
}
function crmLastAt(x) { const a = [(x.log || []).slice(-1)[0], (x.hist || []).slice(-1)[0]].filter(Boolean).map((e) => e.at).sort(); return a.length ? a[a.length - 1] : x.last_dial_at || ''; }
function crmIdle(x) { const l = crmLastAt(x); return l ? Math.floor((now() - Date.parse(l)) / 864e5) : null; }
function crmRot(x) { const st = CRM_STAGES.find((z) => z[0] === crmStage(x)); if (!st || !st[3]) return 0; const d = crmIdle(x); if (d == null) return 0; if (x.next_at && x.next_at >= dk(new Date()) && d < st[3] * 3) return 0; return d >= st[3] * 2 ? 2 : d >= st[3] ? 1 : 0; }
function crmScore(x) {
  const why = []; let s = 0; const add = (n, t) => { s += n; why.push([n, t]); };
  if (typeof inFocus === 'function' && inFocus(x)) add(25, 'Tampa Bay (focus metro)');
  if (x.tier === 'T1') add(15, 'Tier 1'); if (x.tier === 'AL' || x.tier === 'AL2') add(-5, 'Assisted living (second offer)');
  if (telHref(x.phone)) add(10, 'Has a phone number'); else add(-15, 'No phone number');
  if (x.contact && !/^ask/i.test(x.contact)) add(5, 'Owner name known'); if (x.email) add(5, 'Email known'); if (x.receptionist) add(3, 'Gatekeeper name known');
  if (crmTalked(x)) add(20, 'Owner talk logged');
  const st = x.status; if (st === 'bulletin') add(20, 'Said yes to the Bulletin'); if (st === 'booked') add(30, 'Case call booked'); if (st === 'trial' || st === 'member') add(40, 'Case / client');
  if (st === 'no') add(-40, 'Said no / not now'); if (st === 'bad' || st === 'unreachable') add(-80, 'Dead number');
  const vm = (x.log || []).filter((e) => /voicemail|no answer/i.test(e.r || '')).length; if (vm >= 3) add(-Math.min(15, (vm - 2) * 5), `${vm} unanswered tries`);
  const idle = crmIdle(x); if (idle != null && idle <= 7 && (crmTalked(x) || ['bulletin', 'booked'].includes(st))) add(5, 'Recent contact');
  return { v: Math.max(0, Math.min(100, s)), why };
}

/* ───────── cadence: phone-first, adapted from the Close 9-touch / 17-day cold cadence ───────── */
const CADENCE = [[0, 'call', 'Call 1 · leave a 20-second voicemail'], [2, 'call', 'Call 2 · other time of day'], [4, 'email', 'Email 1 · short, one case question (only if you have their email)'], [7, 'call', 'Call 3 · voicemail that mentions the email'], [11, 'call', 'Call 4 · ask the gatekeeper for the best time'], [16, 'email', 'Break-up email · "should I close your file?"'], [45, 'call', 'Re-check in 6 weeks (nurture)']];
function crmCad(x) {
  if (!Q_OPEN.includes(x.status) || crmTalked(x) || (x.cad && x.cad.paused)) return null;
  const touches = (x.log || []).length + (x.hist || []).filter((h) => h.t === 'email').length; if (!touches) return null;
  const first = Date.parse(((x.log || [])[0] || (x.hist || [])[0] || {}).at || '') || now(), i = Math.min(touches, CADENCE.length - 1), stp = CADENCE[i];
  let kind = stp[1]; if (kind === 'email' && !x.email) kind = 'call';
  const due = dk(addDays(new Date(first), stp[0])), lastDay = (crmLastAt(x) || '').slice(0, 10);
  return { i, n: CADENCE.length, kind, label: kind === 'call' && stp[1] === 'email' ? stp[2].replace(/^Email 1.*|^Break-up email.*/, 'Call (no email on file)') : stp[2], due: due > lastDay ? due : dk(addDays(pd(lastDay || dk(new Date())), 1)), done: touches >= CADENCE.length };
}

/* ───────── smart views ───────── */
function crmCalledToday(x) { const tk = dk(new Date()); return (x.log || []).some((e) => (e.day || e.at.slice(0, 10)) === tk); }
const CRM_VIEWS = [
  ['due', 'Due today', 'callbacks and cadence touches due now', (x, tk) => { if (crmCalledToday(x)) return false; if (x.status === 'callback' && x.next_at && x.next_at <= tk) return true; const c = crmCad(x); return !!(c && c.due <= tk); }],
  ['nonext', 'Talked, no next step', 'owner reached, nothing scheduled', (x, tk) => crmTalked(x) && !['no', 'bad', 'member', 'trial'].includes(x.status) && (!x.next_at || x.next_at < tk)],
  ['rotting', 'Rotting', 'warm agencies idle too long', (x) => !['fresh', 'lost', 'working'].includes(crmStage(x)) && crmRot(x) > 0],
  ['focus', 'Tampa Bay · never called', 'fresh agencies in the focus metro', (x) => x.status === 'new' && !(x.attempts || 0) && !!telHref(x.phone) && typeof inFocus === 'function' && inFocus(x)],
  ['hot', 'Hot · score 60+', 'best fit and engagement', (x) => !['no', 'bad', 'unreachable', 'member'].includes(x.status) && crmScore(x).v >= 60 && !crmCalledToday(x)],
  ['vm', 'Voicemail 2+ · not this week', 'tried twice, time for the next touch', (x, tk) => x.status === 'voicemail' && (x.attempts || 0) >= 2 && (crmIdle(x) ?? 99) >= 3],
  ['gk', 'Gatekeeper knows you', 'gatekeeper name logged, owner not reached', (x) => !!x.receptionist && !crmTalked(x) && Q_OPEN.includes(x.status)],
  ['t1', 'Tier 1 · never called', 'top-tier agencies anywhere in Florida', (x) => x.tier === 'T1' && x.status === 'new' && !(x.attempts || 0) && !!telHref(x.phone)],
  ['nophone', 'No phone number', 'find the number before calling', (x) => !telHref(x.phone) && x.status === 'new'],
  ['today', 'Called today', 'review what you did', (x) => crmCalledToday(x)]];
function crmViewList(id) { const v = CRM_VIEWS.find((z) => z[0] === id); if (!v) return []; const tk = dk(new Date()); return qItems().filter((x) => { try { return v[3](x, tk); } catch (e) { return false; } }).map((x) => ({ x, s: crmScore(x).v })).sort((a, b) => b.s - a.s || a.x.id - b.x.id).map((r) => r.x); }
/* power-dial a view: the dialer and the Reactor take their next agency from it */
if (typeof qNextList === 'function' && !qNextList._crm) { const _q = qNextList; qNextList = function (f) { if (crmDialView && f !== '__raw') { const l = crmViewList(crmDialView).filter((x) => crmDialView === 'today' || !crmCalledToday(x)).filter((x) => telHref(x.phone)); if (l.length) return l; toast('View finished: back to the normal queue'); crmDialView = null; } return _q(f === '__raw' ? 'all' : f); }; qNextList._crm = true; }
function crmDial(id) { crmDialView = id; if (typeof dialPick !== 'undefined') dialPick = null; const v = CRM_VIEWS.find((z) => z[0] === id); toast(`Dialing view: ${v[1]}`); closeModal(); const nv = document.getElementById('nova'); if (nv && !nv.classList.contains('away')) nvSwitch('reactor'); else show('dial'); }
function crmDialBanner() { if (!crmDialView) return ''; const v = CRM_VIEWS.find((z) => z[0] === crmDialView), n = crmViewList(crmDialView).filter((x) => !crmCalledToday(x) && telHref(x.phone)).length; return `<div class="crm-dialbar"><span>Dialing view</span><b>${esc(v[1])}</b><em>${n} left</em><button class="btn sm" onclick="crmDialView=null;render()">Stop</button></div>`; }

/* ───────── record: one agency, one timeline ───────── */
function crmHist(x, t, text, extra) { x.hist = x.hist || []; x.hist.push(Object.assign({ at: new Date().toISOString(), t, text }, extra || {})); x._u = now(); }
function crmMove(id, to) {
  const x = Q.items[id]; if (!x) return; const from = crmStage(x); if (from === to) return;
  const keep = { status: x.status, stage: x.stage, stageAt: x.stageAt };
  x.status = CRM_TO_STATUS[to]; x.stage = to; x.stageAt = new Date().toISOString();
  crmHist(x, 'stage', `${crmStageName(from)} → ${crmStageName(to)}`, { from, to }); qSave(); render();
  if (document.querySelector('.modal .crm-rec')) crmOpen(id);
  toast(`${x.agency}: ${crmStageName(to)}`, 'Undo', () => { Object.assign(x, keep); x.hist.pop(); x._u = now(); qSave(); render(); if (document.querySelector('.modal .crm-rec')) crmOpen(id); });
}
function crmStageName(k) { return k === 'fresh' ? 'Not called' : (CRM_STAGES.find((z) => z[0] === k) || [0, k])[1]; }
function crmTimeline(x) {
  const ev = (x.log || []).map((e) => ({ at: e.at, t: e.d && e.d.owners ? 'owner' : 'call', text: e.r + (e.note ? ' · ' + e.note : ''), dur: e.dur })).concat((x.hist || []).map((h) => ({ at: h.at, t: h.t, text: h.text })));
  return ev.sort((a, b) => (a.at < b.at ? 1 : -1));
}
const CRM_EV = { call: ['Call', 'var(--dim)'], owner: ['Owner talk', 'var(--ok)'], stage: ['Stage', 'var(--acc)'], note: ['Note', 'var(--info)'], email: ['Email', 'var(--purple)'], task: ['Next step', 'var(--warn,var(--acc))'] };
function crmOpen(id) {
  const x = Q.items[id]; if (!x) return; const st = crmStage(x), sc = crmScore(x), cad = crmCad(x), tl = crmTimeline(x), tel = telHref(x.phone), idle = crmIdle(x), rot = crmRot(x);
  openModal(`<div class="crm-rec">
    <div class="crm-rh"><div><h2 style="margin:0">${esc(x.agency)}</h2><div class="small muted">${esc(x.city || '')}${x.county ? ' · ' + esc(x.county) : ''}${x.tier ? ' · ' + esc(x.tier) : ''} · their time ${florida(nowMin())}</div></div><button class="crm-score s${sc.v >= 60 ? 3 : sc.v >= 35 ? 2 : 1}" onclick="crmWhy(${id})" title="Why this score">${sc.v}</button></div>
    <div class="crm-stages">${['fresh'].concat(CRM_STAGES.map((z) => z[0])).map((k) => `<button class="${k === st ? 'on' : ''}${k === 'lost' ? ' lost' : ''}" ${k === 'fresh' ? 'disabled' : `onclick="crmMove(${id},'${k}')"`}>${crmStageName(k)}</button>`).join('')}</div>
    ${rot ? `<div class="crm-rotmsg r${rot}">Idle ${idle} days in ${crmStageName(st)}. Schedule the next step to clear it.</div>` : ''}
    <div class="crm-grid">
      <div class="crm-f"><small>Owner / contact</small><input id="cr-contact" value="${esc(x.contact || '')}" placeholder="name, role"></div>
      <div class="crm-f"><small>Gatekeeper</small><input id="cr-rec" value="${esc(x.receptionist || '')}" placeholder="who answers"></div>
      <div class="crm-f"><small>Phone</small>${tel ? `<a class="crm-tel" href="${tel}" onclick="markDialing(${id})">${phonePretty(x.phone)}</a>` : '<span class="bad">none on file</span>'}</div>
      <div class="crm-f"><small>Email</small><input id="cr-email" type="email" value="${esc(x.email || '')}" placeholder="only if they gave it"></div>
      <div class="crm-f w2"><small>Next step</small><div class="inline"><input id="cr-step" value="${esc(x.next_step || '')}" placeholder="e.g. send 2 profiles for the Thu–Sun case"><input id="cr-when" type="date" value="${esc(x.next_at || '')}" style="max-width:150px"></div></div>
      <div class="crm-f w2"><small>Tags</small><input id="cr-tags" value="${esc((x.tags || []).join(', '))}" placeholder="weekends, live-in, Spanish, multi-site"></div>
    </div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin:10px 0">${tel ? `<a class="btn primary" href="${tel}" onclick="markDialing(${id})">Call</a>` : ''}<button class="btn" onclick="closeModal();dialPick=${id};outcome(${id},'noanswer')">No answer</button><button class="btn" onclick="closeModal();outcome(${id},'voicemail')">Voicemail</button><button class="btn" onclick="closeModal();outcome(${id},'gatekeeper')">Gatekeeper</button><button class="btn ok" onclick="closeModal();outcome(${id},'owner')">Owner talk</button>${x.email ? `<button class="btn" onclick="crmEmail(${id})">Email</button>` : ''}</div>
    ${cad ? `<div class="crm-cad"><div><small>CADENCE · STEP ${cad.i + 1} OF ${cad.n}</small><b>${esc(cad.label)}</b><span>due ${cad.due <= dk(new Date()) ? 'today' : fmtShort(pd(cad.due))}</span></div><div class="crm-steps">${CADENCE.map((c, i) => `<i class="${i < cad.i ? 'done' : i === cad.i ? 'now' : ''}" title="Day ${c[0]}: ${esc(c[2])}"></i>`).join('')}</div><button class="btn sm" onclick="crmPause(${id})">${x.cad && x.cad.paused ? 'Resume' : 'Pause'}</button></div>` : ''}
    <div class="inline" style="margin:8px 0"><input id="cr-note" placeholder="Add a note (their words, a fact, a promise)" onkeydown="if(event.key==='Enter')crmNote(${id})"><button class="btn" onclick="crmNote(${id})">Add</button></div>
    <div class="sec-h">Timeline · ${tl.length} events${idle != null ? ` · last touch ${idle === 0 ? 'today' : idle + ' d ago'}` : ''}</div>
    <div class="crm-tl">${tl.length ? tl.map((e) => `<div><i style="background:${(CRM_EV[e.t] || CRM_EV.note)[1]}"></i><span>${fmtShort(new Date(e.at))} ${hmNow(new Date(e.at))}</span><b>${(CRM_EV[e.t] || CRM_EV.note)[0]}</b><em>${esc(e.text || '')}${e.dur ? ' · ' + fmtEl(e.dur) : ''}</em></div>`).join('') : '<div class="small muted">Nothing yet. The first call starts the timeline.</div>'}</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Close</button><button class="btn primary" onclick="crmSave(${id})">Save</button></div></div>`, true);
}
function crmSave(id) {
  const x = Q.items[id]; const step = $('cr-step').value.trim(), when = $('cr-when').value;
  if ((step && step !== x.next_step) || (when && when !== x.next_at)) crmHist(x, 'task', `${step || 'Follow up'}${when ? ' · ' + fmtShort(pd(when)) : ''}`);
  Object.assign(x, { contact: $('cr-contact').value.trim(), receptionist: $('cr-rec').value.trim(), email: $('cr-email').value.trim(), next_step: step, next_at: when, tags: $('cr-tags').value.split(',').map((t) => t.trim()).filter(Boolean) });
  if (when && Q_OPEN.includes(x.status) && x.status !== 'callback' && crmTalked(x)) x.status = 'callback';
  x._u = now(); qSave(); closeModal(); render(); toast('Saved');
}
function crmNote(id) { const x = Q.items[id], v = ($('cr-note').value || '').trim(); if (!v) return; crmHist(x, 'note', v); x.notes = (x.notes ? x.notes + ' · ' : '') + v; qSave(); crmOpen(id); }
function crmPause(id) { const x = Q.items[id]; x.cad = x.cad || {}; x.cad.paused = !x.cad.paused; crmHist(x, 'note', x.cad.paused ? 'Cadence paused' : 'Cadence resumed'); qSave(); crmOpen(id); }
function crmWhy(id) { const x = Q.items[id], sc = crmScore(x); toast(`Score ${sc.v}: ` + sc.why.map(([n, t]) => `${n > 0 ? '+' : ''}${n} ${t}`).join(' · ')); }
const CRM_MAIL = [
  ['first', 'Email 1 · one question', (x) => [`Quick question about ${x.city.split(/[\/(;]/)[0].trim()} shifts`, `Hi ${firstName(x.contact) || 'there'},\n\nI tried you by phone. One question: is there a caregiver shift or case you're struggling to cover right now?\n\nI recruit and screen caregivers for private-pay agencies in Florida. You hire them as your own W-2 employees. For my first agencies: you pay nothing until a caregiver of mine has worked 5 shifts.\n\nWorth a 10-minute call this week?\n\nEgor\nCaregiver Bench`]],
  ['vm', 'After a voicemail', (x) => [`Left you a voicemail`, `Hi ${firstName(x.contact) || 'there'},\n\nJust left you a short voicemail. In one line: I send screened caregivers for hard-to-fill shifts, and you pay nothing until one has worked 5 shifts.\n\nIf there's a case open right now, reply with the town and the hours and I'll send 2 profiles within 7 days.\n\nEgor`]],
  ['breakup', 'Break-up', (x) => [`Should I close your file?`, `Hi ${firstName(x.contact) || 'there'},\n\nI haven't been able to reach you, so I'll assume caregiver hiring is covered for now and close your file.\n\nIf a hard case comes up later, reply "case" and I'll start on it the same day.\n\nEgor`]]];
function crmEmail(id) {
  const x = Q.items[id]; if (!x || !x.email) return;
  openModal(`<h2>Email ${esc(x.agency)}</h2><div class="hint">Opens your mail app with the text filled in. Tap "Log as sent" after you send it.</div>${CRM_MAIL.map(([k, l, f]) => { const [s, b] = f(x); return `<div class="card flat" style="margin-bottom:8px"><div class="card-h"><div class="card-t">${l}</div></div><div class="small" style="white-space:pre-wrap;color:var(--muted)">${esc(b).slice(0, 220)}…</div><div class="row" style="gap:6px;margin-top:8px"><a class="btn sm primary" href="mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}">Open in mail</a><button class="btn sm" onclick="crmMailed(${id},'${k}')">Log as sent</button></div></div>`; }).join('')}<div class="actions"><button class="btn" onclick="crmOpen(${id})">Back</button></div>`, true);
}
function crmMailed(id, k) { const x = Q.items[id]; crmHist(x, 'email', (CRM_MAIL.find((m) => m[0] === k) || [0, 'Email'])[1] + ' sent'); qSave(); crmOpen(id); toast('Email logged on the timeline'); }

/* ───────── the screen ───────── */
function renderCrm() {
  const el = $('view-crm'); if (!el) return;
  if (!Q) { el.innerHTML = '<div class="empty">Loading the agency list…</div>'; return; }
  const tabs = [['board', 'Pipeline'], ['views', 'Smart views'], ['cadence', 'Cadence'], ['velocity', 'Velocity']];
  el.innerHTML = `${crmDialBanner()}<div class="crm-top"><div class="st-tabs">${tabs.map(([k, l]) => `<button class="${crmTab === k ? 'on' : ''}" onclick="crmTab='${k}';render()">${l}</button>`).join('')}</div><input class="crm-search" placeholder="Find an agency, city, owner…" value="${esc(crmQ)}" oninput="crmQ=this.value;clearTimeout(window._crmT);window._crmT=setTimeout(()=>{const p=this.selectionStart;render();const i=document.querySelector('.crm-search');if(i){i.focus();i.setSelectionRange(p,p)}},250)"></div>
    ${crmQ.trim().length >= 2 ? crmSearchHtml() : ({ board: crmBoard, views: crmViews, cadence: crmCadence, velocity: crmVelocity }[crmTab] || crmBoard)()}`;
}
function crmCard(x) {
  const r = crmRot(x), idle = crmIdle(x), sc = crmScore(x).v, tk = dk(new Date());
  return `<div class="crm-card r${r}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${x.id}')" onclick="crmOpen(${x.id})">
    <div class="crm-ct"><b>${esc(x.agency)}</b><span class="crm-score sm s${sc >= 60 ? 3 : sc >= 35 ? 2 : 1}">${sc}</span></div>
    <div class="crm-cm">${esc((x.city || '').split(/[\/(;]/)[0])}${x.contact && !/^ask/i.test(x.contact) ? ' · ' + esc(firstName(x.contact)) : ''}</div>
    <div class="crm-cn">${x.next_at ? `<span class="${x.next_at < tk ? 'bad' : x.next_at === tk ? 'acc' : ''}">${x.next_at < tk ? 'overdue · ' : x.next_at === tk ? 'today · ' : fmtShort(pd(x.next_at)) + ' · '}${esc(x.next_step || 'follow up')}</span>` : '<span class="muted">no next step</span>'}</div>
    <div class="crm-cf"><span>${idle == null ? 'new' : idle === 0 ? 'today' : idle + ' d idle'}</span><span>${(x.log || []).length} calls</span></div></div>`;
}
function crmBoard() {
  const all = qItems(), by = {}; all.forEach((x) => { const s = crmStage(x); (by[s] = by[s] || []).push(x); });
  const cols = CRM_STAGES.filter((z) => z[0] !== 'lost' || crmShowLost);
  const fresh = (by.fresh || []).length;
  return `<div class="crm-bhint"><span><b>${fmt(fresh)}</b> agencies not called yet · <a href="#" onclick="crmTab='views';render();return false">smart views</a></span><span class="muted">Drag a card to move it, or tap it to open the agency. Amber = idle past the stage limit, red = twice the limit.</span><label class="small"><input type="checkbox" ${crmShowLost ? 'checked' : ''} onchange="crmShowLost=this.checked;render()"> show lost</label></div>
  <div class="crm-board">${cols.map(([k, l, d, rot]) => { const L = (by[k] || []).map((x) => ({ x, s: crmScore(x).v, r: crmRot(x) })).sort((a, b) => b.r - a.r || b.s - a.s).map((z) => z.x), rotN = L.filter((x) => crmRot(x)).length, show = L.slice(0, k === 'working' ? 40 : 80);
    return `<div class="crm-col" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');crmMove(Number(event.dataTransfer.getData('text/plain')),'${k}')">
      <div class="crm-ch"><b>${l}</b><span>${L.length}</span>${rotN ? `<em>${rotN} rotting</em>` : ''}<small>${d}${rot ? ` · limit ${rot} d` : ''}</small></div>
      <div class="crm-cards">${show.map(crmCard).join('') || '<div class="crm-empty">Empty</div>'}${L.length > show.length ? `<div class="crm-more">+${L.length - show.length} more · use a smart view</div>` : ''}</div></div>`; }).join('')}</div>`;
}
function crmViews() {
  return `<div class="crm-vgrid">${CRM_VIEWS.map(([k, l, d]) => { const n = crmViewList(k).length; return `<div class="crm-v ${crmView === k ? 'on' : ''}"><button class="crm-vh" onclick="crmView=crmView==='${k}'?null:'${k}';render()"><b>${l}</b><span>${d}</span><em>${fmt(n)}</em></button>${k !== 'nophone' && k !== 'today' && n ? `<button class="btn sm primary" onclick="crmDial('${k}')">Dial this view</button>` : ''}</div>`; }).join('')}</div>
    ${crmView ? (() => { const v = CRM_VIEWS.find((z) => z[0] === crmView), L = crmViewList(crmView); return `<div class="card"><div class="card-h"><div class="card-t">${v[1]}</div><div class="card-r">${L.length} agencies · sorted by score</div></div>${crmTableHtml(L.slice(0, 100))}${L.length > 100 ? `<div class="xs muted">Showing 100 of ${L.length}.</div>` : ''}</div>`; })() : '<div class="small muted" style="margin:6px 2px">A smart view is a saved filter that updates itself. Tap one to see who is in it; "Dial this view" sends the dialer and the Reactor through it, skipping anyone already called today.</div>'}`;
}
function crmTableHtml(L) {
  return `<div class="st-tw"><table class="st-t"><thead><tr><th>Score</th><th>Agency</th><th>City</th><th>Stage</th><th>Calls</th><th>Last touch</th><th>Next</th></tr></thead><tbody>${L.map((x) => { const sc = crmScore(x).v, idle = crmIdle(x); return `<tr class="go" onclick="crmOpen(${x.id})"><td><span class="crm-score sm s${sc >= 60 ? 3 : sc >= 35 ? 2 : 1}">${sc}</span></td><td><b>${esc(x.agency)}</b></td><td>${esc((x.city || '').split(/[\/(;]/)[0])}</td><td>${crmStageName(crmStage(x))}</td><td>${(x.log || []).length}</td><td>${idle == null ? '—' : idle === 0 ? 'today' : idle + ' d'}</td><td>${x.next_at ? fmtShort(pd(x.next_at)) + (x.next_step ? ' · ' + esc(x.next_step) : '') : (() => { const c = crmCad(x); return c ? `<span class="muted">${esc(c.label.split(' · ')[0])} · ${c.due <= dk(new Date()) ? 'due' : fmtShort(pd(c.due))}</span>` : '—'; })()}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Nobody in this view right now.</td></tr>'}</tbody></table></div>`;
}
function crmCadence() {
  const tk = dk(new Date()), L = qItems().map((x) => ({ x, c: crmCad(x) })).filter((r) => r.c), due = L.filter((r) => r.c.due <= tk), byStep = CADENCE.map((_, i) => L.filter((r) => r.c.i === i).length);
  return `<div class="card"><div class="card-h"><div class="card-t">The cadence every cold agency follows</div><div class="card-r">${L.length} agencies in it · ${due.length} due today</div></div>
    <div class="crm-cadline">${CADENCE.map(([d, k, l], i) => `<div><i class="${k}"></i><b>Day ${d}</b><span>${esc(l)}</span><em>${byStep[i]} here</em></div>`).join('')}</div>
    <div class="xs muted" style="margin-top:8px">Phone-first, adapted from the 9-touch, 17-day cold cadence Close recommends: tight spacing in week one, wider after, then a break-up and a 6-week re-check. Email steps become calls when you have no address. No texts: cold SMS is off-limits. An owner talk takes the agency out of the cadence and onto the pipeline.</div></div>
    <div class="card"><div class="card-h"><div class="card-t">Due today</div><div class="card-r">${due.length ? `<button class="btn sm primary" onclick="crmDial('due')">Dial them</button>` : ''}</div></div>
    ${crmTableHtml(due.map((r) => r.x).sort((a, b) => crmScore(b).v - crmScore(a).v).slice(0, 80))}</div>`;
}
function crmVelocity() {
  const all = qItems(), stOf = {}; all.forEach((x) => { const s = crmStage(x); stOf[s] = (stOf[s] || 0) + 1; });
  const reached = ['talked', 'interested', 'booked', 'case', 'client'];
  const cum = (k) => all.filter((x) => { const s = crmStage(x); const order = ['working'].concat(reached); return order.indexOf(s) >= order.indexOf(k) && order.indexOf(s) >= 0; }).length;
  const dwell = (k) => { const ds = []; all.forEach((x) => (x.hist || []).forEach((h, i, a) => { if (h.t === 'stage' && h.from === k) { const prev = a.slice(0, i).reverse().find((z) => z.t === 'stage' && z.to === k); const start = prev ? prev.at : ((x.log || []).find((e) => e.d && e.d.owners) || {}).at; if (start) ds.push((Date.parse(h.at) - Date.parse(start)) / 864e5); } })); return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null; };
  const rows = ['working'].concat(reached).map((k, i, a) => { const c = cum(k), nx = a[i + 1] ? cum(a[i + 1]) : null; return { k, now: stOf[k] || 0, c, conv: nx != null && c ? Math.round((nx / c) * 100) : null, dwell: dwell(k), rot: all.filter((x) => crmStage(x) === k && crmRot(x)).length }; });
  const mx = Math.max(1, ...rows.map((r) => r.c));
  return `<div class="card"><div class="card-h"><div class="card-t">Stage conversion</div><div class="card-r">every agency ever called</div></div>
    <div class="crm-fun">${rows.map((r) => `<div><span>${crmStageName(r.k)}</span><div><i style="width:${Math.max(1, (r.c / mx) * 100)}%"></i></div><b>${r.c}</b><em>${r.conv != null ? r.conv + '% move on' : ''}</em></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><div class="card-t">Velocity and health per stage</div><div class="card-r">Pipedrive-style</div></div>
    ${stTable(['Stage', 'In it now', 'Rotting', 'Avg days before moving', 'Limit'], rows.map((r) => ({ go: `crmTab='board';render()`, c: [crmStageName(r.k), r.now, r.rot ? `<span class="bad">${r.rot}</span>` : 0, r.dwell != null ? fmt(r.dwell, 1) : null, (CRM_STAGES.find((z) => z[0] === r.k) || [0, 0, 0, 0])[3] + ' d'] })))}
    <div class="xs muted" style="margin-top:8px">Days are measured from the stage moves logged since 6.4; they fill in as you move agencies.</div></div>`;
}
function crmSearchHtml() {
  const q = crmQ.trim().toLowerCase(), L = qItems().filter((x) => [x.agency, x.city, x.county, x.contact, x.receptionist, x.email, x.phone, (x.tags || []).join(' '), x.notes].join(' ').toLowerCase().includes(q)).slice(0, 60);
  return `<div class="card"><div class="card-h"><div class="card-t">Search · "${esc(crmQ.trim())}"</div><div class="card-r">${L.length}${L.length === 60 ? '+' : ''} found</div></div>${crmTableHtml(L)}</div>`;
}
