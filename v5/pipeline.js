/* War Room v4 · Pipeline: from yes to trial to member. Territory seats, MRR, proof, shield calls, and the caregiver bench. */
'use strict';
/* Offer v4 (17 Nov 2026, Playbook → Business → What we sell): Priority Bench $2,500 and Multi-site $6,000 are billed every 4 weeks (13 bills a year), so MRR uses the monthly average. */
const PLANS = { pb: ['Priority Bench', 2708], ms: ['Multi-site', 6500], pw: ['Pay When They Work', 0] };
const AREAS = [['tampa', 'Tampa', /tampa|temple terrace|lutz|thonotosassa/i], ['brandon', 'Brandon · Riverview', /brandon|riverview|valrico|seffner|plant city|lithia|ruskin|apollo beach|sun city|gibsonton|wimauma/i], ['stpete', 'St. Pete · Largo', /st\.? petersburg|saint petersburg|pinellas park|seminole|largo/i], ['clearwater', 'Clearwater · Dunedin', /clearwater|dunedin|palm harbor|tarpon springs|oldsmar|safety harbor/i], ['pasco', 'Pasco · Hernando', /new port richey|port richey|holiday|hudson|wesley chapel|land o lakes|zephyrhills|spring hill|brooksville|dade city|odessa/i], ['naples', 'Naples', /naples(?!.*north)|ave maria|golden gate/i], ['nnaples', 'North Naples', /north naples|bonita.*naples/i], ['marco', 'Marco Island', /marco/i], ['bonita', 'Bonita · Estero', /bonita|estero/i], ['ftmyers', 'Fort Myers', /fort myers|ft\.? myers|north fort/i], ['cape', 'Cape Coral', /cape coral/i], ['lehigh', 'Lehigh', /lehigh/i], ['sarasota', 'Sarasota · Venice', /sarasota|venice|osprey|englewood|lakewood/i], ['other', 'Other FL', /./]];
function areaOf(x) { const s = (x.city || '') + ' ' + (x.county || ''); return (AREAS.find(([id, l, re]) => id !== 'other' && re.test(s)) || AREAS[AREAS.length - 1])[0]; }
function members() { return qItems().filter((x) => x.status === 'member'); }
function trials() { return qItems().filter((x) => x.status === 'trial'); }
function mrr() { return members().reduce((a, x) => a + (PLANS[x.plan] ? PLANS[x.plan][1] : 0), 0); }
function placements() { const out = []; qItems().forEach((x) => (x.placements || []).forEach((p) => out.push(Object.assign({ agency: x.agency, area: areaOf(x) }, p)))); return out.sort((a, b) => (b.at || '').localeCompare(a.at || '')); }
function proofLine() { const p = placements(); if (!p.length) return 'No filled cases yet. The first one becomes the sentence you open every call with.'; const hard = p.filter((q) => q.hard).length; const since = p[p.length - 1].at ? fmtShort(pd(p[p.length - 1].at)) : ''; const areas = [...new Set(p.map((q) => (AREAS.find((a) => a[0] === q.area) || [, 'FL'])[1]))].slice(0, 3).join(', '); return `${p.length} case${p.length > 1 ? 's' : ''} filled${hard ? ` (${hard} hard)` : ''} in ${areas} since ${since}.`; }
function seatsHtml() {
  const m = members(); const core = AREAS.filter((a) => !['other', 'sarasota'].includes(a[0]));
  return `<div class="card"><div class="card-h"><div class="card-t">Territory · 2 seats per area</div><div class="card-r"><b>${m.length}</b>/${core.length * 2} seats</div></div>
    <div class="g4" style="gap:6px">${core.map(([id, l]) => { const n = m.filter((x) => areaOf(x) === id).length; return `<div class="cd" style="padding:8px 4px"><div class="n" style="font-size:16px">${'●'.repeat(n)}${'○'.repeat(Math.max(0, 2 - n))}</div><div class="l" style="font-size:9px">${l}</div></div>`; }).join('')}</div>
    <div class="xs muted" style="margin-top:8px">Full area = scarcity you can say out loud: "I only take two agencies per area; ${l1(core, m)}"</div></div>`;
}
function l1(core, m) { const full = core.filter(([id]) => m.filter((x) => areaOf(x) === id).length >= 2).map((a) => a[1]); return full.length ? full.join(' and ') + ' are closed.' : 'yours is still open."'; }

/* ───────── pipeline moves on an agency ───────── */
function pipelineModal(id) {
  const x = Q.items[id]; const st = x.status;
  const opt = (k, ic, t, sub) => `<button class="btn block" style="justify-content:flex-start;text-align:left;min-height:54px;margin-bottom:6px" onclick="pipeMove(${id},'${k}')"><span style="font-size:20px;margin-right:6px">${ic}</span><span><b>${t}</b><br><span class="xs muted">${sub}</span></span></button>`;
  openModal(`<h2>${esc(x.agency)} <span class="chip">${st}</span></h2>
    ${st !== 'trial' && st !== 'member' ? opt('trial', '🧪', 'Case call done → First Hire Free starts today', 'Creates: ads today, owner update day 2, results call day 25, decision day 30') : ''}
    ${opt('shift', '✅', 'A caregiver worked a first shift', 'Creates check-in calls days 1 · 3 · 7 · 14 · 30 · 90 and the invoice (or free-hire) task. Adds to proof.')}
    ${st !== 'member' ? opt('member', '💳', 'Converted to a paying plan', 'Priority Bench $2,500 / 4 weeks · Pay When They Work $1,500 · Multi-site $6,000 / 4 weeks (gate 4). Takes a seat in their area.') : opt('results', '📞', 'Monthly results call done', 'Books the next one in 30 days')}
    ${opt('lost', '🚫', 'Lost / cancelled', 'Frees the seat. Asks why, one line. Exit call first: Playbook → Scripts → Exit call.')}
    <div class="xs muted" style="margin-top:8px">Every move writes a task to Todoist and a line in the agency's log.</div>`);
}
function addTaskAuto(title, due, note) { const t = { id: uid(), _u: now(), title, due, done: false, note: note || '' }; S.tasks[t.id] = t; save(); taskHook('create', t); return t.id; }
function pipeMove(id, kind) {
  const x = Q.items[id], today = dk(new Date()), D = (n) => dk(addDays(new Date(), n));
  if (kind === 'trial') {
    openModal(`<h2>First Hire Free · ${esc(x.agency)}</h2><div class="field"><label>The case (town · hours · type · pay · must-haves)</label><textarea id="pm-case" placeholder="Live-in, Brandon, Thu–Sun, $180/day, HHA, car">${esc(x.case || '')}</textarea></div><div class="field"><label>Owner email</label><input id="pm-email" value="${esc(x.email || '')}"></div>
      <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="pipeTrial(${id})">Start the 30 days</button></div>`); return;
  }
  if (kind === 'shift') {
    openModal(`<h2>First shift · ${esc(x.agency)}</h2><div class="g2"><div class="field"><label>Caregiver (first name)</label><input id="pm-cg" placeholder="Maria"></div><div class="field"><label>Shift date</label><input id="pm-date" type="date" value="${today}"></div></div>
      <div class="field"><label>Case</label><input id="pm-what" value="${esc(x.case || '')}" placeholder="live-in · Brandon · weekends"></div>
      <div class="field"><div class="chips" id="pm-hard"><span class="chip on" data-v="1">Hard case ($2,000 · $1,000 extra on a plan)</span><span class="chip" data-v="0">Standard ($1,500 · $1,000 extra on a plan)</span></div></div>
      <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn ok" onclick="pipeShift(${id})">Log it</button></div>`);
    document.querySelectorAll('#pm-hard .chip').forEach((c) => c.onclick = () => document.querySelectorAll('#pm-hard .chip').forEach((d) => d.classList.toggle('on', d === c))); return;
  }
  if (kind === 'member') {
    openModal(`<h2>Paying · ${esc(x.agency)}</h2><div class="field"><label>Plan</label><div class="chips" id="pm-plan">${Object.entries(PLANS).map(([k, [n, p]], i) => `<span class="chip ${i === 0 ? 'on' : ''}" data-v="${k}">${n}${k === 'pb' ? ' · $2,500 / 4 wks' : k === 'ms' ? ' · $6,000 / 4 wks' : ' · $1,500 each'}</span>`).join('')}</div></div><div class="field"><label>Start date</label><input id="pm-start" type="date" value="${today}"></div>
      <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn ok" onclick="pipeMember(${id})">Confirm</button></div>`);
    document.querySelectorAll('#pm-plan .chip').forEach((c) => c.onclick = () => document.querySelectorAll('#pm-plan .chip').forEach((d) => d.classList.toggle('on', d === c))); return;
  }
  if (kind === 'results') { x.log.push({ at: new Date().toISOString(), r: 'Monthly results call done', note: '' }); x._u = now(); addTaskAuto(`Results call: ${x.agency}`, D(30), 'Monthly. What worked, what to fix, who else they know.'); qSave(); closeModal(); toast('Next results call in 30 days'); render(); return; }
  if (kind === 'lost') { const why = prompt('Why, in their words?') || ''; x.status = 'no'; x.plan = ''; x.log.push({ at: new Date().toISOString(), r: 'Lost / cancelled', note: why }); x._u = now(); qSave(); closeModal(); toast('Seat freed'); render(); return; }
}
function pipeTrial(id) {
  const x = Q.items[id], D = (n) => dk(addDays(new Date(), n));
  x.case = $('pm-case').value.trim(); x.email = $('pm-email').value.trim(); x.status = 'trial'; x.trialStart = dk(new Date()); x._u = now();
  x.log.push({ at: new Date().toISOString(), r: 'TRIAL STARTED · First Hire Free', note: x.case });
  addTaskAuto(`Owner update: ${x.agency} (even if nothing new)`, D(2), x.case); addTaskAuto(`Post the ads for ${x.agency}'s case (FB · Indeed · Employ FL · groups)`, D(0), x.case);
  addTaskAuto(`Day 25 results call: ${x.agency}`, D(25), 'Playbook → Call 2: recap the win, next case, anchor, menu (Priority Bench or Pay When They Work), silence, referral.'); addTaskAuto(`Day 30 decision: ${x.agency}`, D(30), 'Plan starts if a caregiver worked. Otherwise: what would have made it work?');
  qSave(); closeModal(); toast('Trial started. 4 tasks created.'); render();
}
function pipeShift(id) {
  const x = Q.items[id]; const cg = $('pm-cg').value.trim(), date = $('pm-date').value || dk(new Date()), what = $('pm-what').value.trim(), hard = (document.querySelector('#pm-hard .chip.on') || {}).dataset?.v === '1';
  x.placements = x.placements || []; x.placements.push({ at: date, cg, what, hard }); x.case = x.case || what; x._u = now();
  x.log.push({ at: new Date().toISOString(), r: `FIRST SHIFT · ${cg || 'caregiver'} · ${hard ? 'hard case' : 'standard'}`, note: what });
  const base = pd(date); const Dd = (n) => dk(addDays(base, n));
  [1, 3, 7, 14, 30, 90].forEach((n) => addTaskAuto(`Check-in call day ${n}: ${cg || 'caregiver'} @ ${x.agency}`, Dd(n), 'How is it going? Anything that would make you leave? Anything the office should know? 2-line note to the owner after.'));
  /* First Hire Free (offer v4): the first caregiver who works the trial case costs nothing */
  const firstFree = x.status === 'trial' && x.placements.length === 1;
  const inv = x.status === 'member' ? (x.plan === 'pw' ? (hard ? '$2,000 hard case' : '$1,500') : 'included in the plan, or an extra ($1,000 Priority Bench · $900 Multi-site)') : hard ? '$2,000 hard case (Pay When They Work)' : '$1,500 (Pay When They Work)';
  if (firstFree) addTaskAuto(`Free hire logged: ${cg || 'caregiver'} @ ${x.agency} (no invoice: First Hire Free)`, Dd(3), 'After shift 3: ask the owner how she is doing, write their exact words. That sentence opens the day-25 results call and becomes the case study.');
  else addTaskAuto(`Invoice ${x.agency}: ${inv} for ${cg || 'caregiver'}`, Dd(1), 'One invoice in USD (bank transfer) through dad\'s company.');
  qSave(); closeModal(); toast('Logged. 7 tasks created. That is proof now.'); render();
}
function pipeMember(id) {
  const x = Q.items[id]; const plan = (document.querySelector('#pm-plan .chip.on') || {}).dataset?.v || 'pb';
  x.status = 'member'; x.plan = plan; x.memberSince = $('pm-start').value || dk(new Date()); x._u = now();
  x.log.push({ at: new Date().toISOString(), r: `MEMBER · ${PLANS[plan][0]}`, note: '' });
  addTaskAuto(`Results call: ${x.agency}`, dk(addDays(new Date(), 28)), 'Every 4 weeks. What worked, what to fix, the next case, who else they know.');
  if (plan !== 'pw' && members().length <= 5) addTaskAuto(`Founding 5: ${x.agency} · price locked 12 months · get the case study + 2 owner intros`, dk(addDays(new Date(), 14)), 'Founding 5 = the first five paying agencies only. A trade, not a discount.');
  qSave(); closeModal(); toast(`${PLANS[plan][0]}. MRR now $${mrr().toLocaleString()}`); render();
}
function businessCard() {
  const m = members(), t = trials(), p = placements(); const dialsAll = counterTotal('dials'), owners = counterTotal('owners');
  const hours = (() => { let s = 0; Object.values(S.days).forEach((o) => (o.sessions || []).forEach((x) => s += (x.end - x.start) / 3600000)); return Math.round(s * 10) / 10; })();
  return `<div class="card"><div class="card-h"><div class="card-t">The business</div><div class="card-r">${fmtShort(new Date())}</div></div>
    <div class="g4">${[['$' + mrr().toLocaleString(), 'MRR'], [t.length, 'trials'], [m.length, 'members'], [p.length, 'filled']].map(([n, l]) => `<div class="cd"><div class="n" style="font-size:20px">${n}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="kv" style="margin-top:8px"><span class="small muted">Dials → owner talks</span><span class="v">${dialsAll} → ${owners}${dialsAll ? ` <span class="muted">(${Math.round((owners / dialsAll) * 100)}%)</span>` : ''}</span></div>
    <div class="kv"><span class="small muted">Owner talks → trials</span><span class="v">${owners} → ${t.length + m.length}</span></div>
    <div class="kv"><span class="small muted">Dial hours logged</span><span class="v">${hours} h${t.length + m.length ? ` · ${Math.round((hours / (t.length + m.length)) * 10) / 10} h per trial` : ''}</span></div>
    <div class="kv"><span class="small muted">Lifetime value per member</span><span class="v">$2,500 × 4-week cycles kept</span></div>
    <div class="sec-h">Proof line · say it on every call</div><div class="row sb"><div class="small">${esc(proofLine())}</div>${p.length ? `<button class="btn sm" onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(proofLine())});toast('Copied')">Copy</button>` : ''}</div>
    ${p.length ? `<div class="sec-h">Filled cases</div>${p.slice(0, 10).map((q) => `<div class="kv"><span class="small">${esc(q.agency)} · ${esc(q.what || '')}${q.hard ? ' · hard' : ''}</span><span class="small muted">${fmtShort(pd(q.at))}</span></div>`).join('')}` : ''}</div>` + seatsHtml();
}

/* ───────── the caregiver bench (mirrored hourly from the website's applications + added by hand) ───────── */
let B = null; const BSTORE = 'warroom-bench'; const bState = { status: 'off', msg: '' }; let benchMode = 'owners', benchPick = null;
function bKey() { return S.settings.sync.code + ':bench'; }
function bHdr() { const s = S.settings.sync; return { apikey: s.key, Authorization: 'Bearer ' + s.key, 'x-warroom-key': bKey(), 'Content-Type': 'application/json' }; }
function bSave(push) { try { localStorage.setItem(BSTORE, JSON.stringify(B)); } catch (e) { } if (push !== false && syncReady()) { clearTimeout(bSave._t); bSave._t = setTimeout(bPush, 2000); } }
function bItems() { return B ? Object.values(B.items).filter((x) => !x._del) : []; }
async function bPull(silent) {
  if (!syncReady()) return; const s = S.settings.sync;
  try { const r = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(bKey())}&select=data`, { headers: bHdr() }); if (!r.ok) throw new Error('HTTP ' + r.status); const rows = await r.json();
    if (rows.length && rows[0].data && rows[0].data.items) { let ch = false; for (const id in rows[0].data.items) { const rr = rows[0].data.items[id], l = B.items[id]; if (!l || (rr._u || 0) > (l._u || 0)) { B.items[id] = rr; ch = true; } } if (ch) { bSave(false); if (view === 'dial') render(); } } else await bPush();
    bState.status = 'ok'; bState.msg = '';
  } catch (e) { bState.status = 'err'; bState.msg = String(e.message || e); if (!silent) toast('Bench sync: ' + bState.msg); }
}
async function bPush() { if (!syncReady() || !B) return; const s = S.settings.sync; try { try { const g = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(bKey())}&select=data`, { headers: bHdr() }); if (g.ok) { const rows = await g.json(), it = rows.length && rows[0].data && rows[0].data.items; if (it) { let ch = false; for (const id in it) { const l = B.items[id]; if (!l || (it[id]._u || 0) > (l._u || 0)) { B.items[id] = it[id]; ch = true; } } if (ch) { try { localStorage.setItem(BSTORE, JSON.stringify(B)); } catch (e) { } } } } } catch (e) { } const r = await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(bHdr(), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: bKey(), data: B, updated_at: new Date().toISOString() }) }); if (!r.ok) throw new Error('HTTP ' + r.status); bState.status = 'ok'; } catch (e) { bState.status = 'err'; bState.msg = String(e.message || e); } }
async function bLoad() { try { const raw = localStorage.getItem(BSTORE); if (raw) B = JSON.parse(raw); } catch (e) { } if (!B || !B.items) B = { v: 1, items: {}, _u: 0 }; await bPull(true); }
const CG_STATUS = { new: 'new', screened: 'screened', hot: 'hot', later: 'later', placed: 'placed', no: 'not a fit', unreachable: 'unreachable' };
function cgNext() { const now24 = now() - 24 * 3600000; return bItems().filter((x) => ['new', 'unreachable'].includes(x.status)).sort((a, b) => (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || (a.created_at || '').localeCompare(b.created_at || '')); }
function addCaregiverModal() {
  openModal(`<h2>Add a caregiver</h2><div class="g2"><div class="field"><label>Name</label><input id="cg-n"></div><div class="field"><label>Phone</label><input id="cg-p" type="tel"></div></div><div class="g2"><div class="field"><label>Town</label><input id="cg-t"></div><div class="field"><label>HHA / CNA / companion</label><input id="cg-l"></div></div><div class="field"><label>Shifts · car · start · languages</label><input id="cg-s" placeholder="live-in, weekends · car yes · now · EN/ES"></div><div class="field"><label>Source</label><input id="cg-src" placeholder="FB group Tampa caregivers / Indeed / referral"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveCaregiver()">Add</button></div>`);
}
function saveCaregiver() { const n = $('cg-n').value.trim(); if (!n) { toast('Name'); return; } const id = 'm' + uid(); B.items[id] = { id, name: n, phone: $('cg-p').value.trim(), town: $('cg-t').value.trim(), licence: $('cg-l').value.trim(), shifts: $('cg-s').value.trim(), source: $('cg-src').value.trim(), status: 'new', created_at: new Date().toISOString(), log: [], _u: now() }; bSave(); closeModal(); render(); }
function cgOutcome(id, kind) {
  const x = B.items[id]; if (!x) return; x.log = x.log || [];
  if (kind === 'noanswer') { x.attempts = (x.attempts || 0) + 1; x.status = x.attempts >= 3 ? 'unreachable' : 'new'; x.log.push({ at: new Date().toISOString(), r: 'No answer' }); x._u = now(); countApplicantCall(); bSave(); toast(x.status === 'unreachable' ? '3 tries: marked unreachable' : 'No answer · logged'); render(); return; }
  if (kind === 'screen') return screenModal(id);
  if (kind === 'no') { x.status = 'no'; x.log.push({ at: new Date().toISOString(), r: 'Not a fit' }); x._u = now(); countApplicantCall(); bSave(); render(); return; }
}
function countApplicantCall() { const o = day(new Date()); o.counters.applicants = (Number(o.counters.applicants) || 0) + 1; touch(o); }
function screenModal(id) {
  const x = B.items[id];
  openModal(`<h2>Screen · ${esc(x.name)}</h2><div class="hint" style="margin-bottom:10px">10 minutes, same every time (Playbook → Scripts → Caregiver side). No SSN, no health, no references. Write what she says.</div>
    <div class="g2"><div class="field"><label>Town</label><input id="sc-town" value="${esc(x.town || '')}"></div><div class="field"><label>HHA / CNA / companion</label><input id="sc-lic" value="${esc(x.licence || '')}"></div></div>
    <div class="field"><label>Shifts she wants (live-in, nights, weekends, days)</label><input id="sc-shifts" value="${esc(x.shifts || '')}"></div>
    <div class="g2"><div class="field"><label>Car</label><input id="sc-car" value="${esc(x.car || '')}" placeholder="yes / no"></div><div class="field"><label>Can start</label><input id="sc-start" value="${esc(x.start || '')}" placeholder="now / next week"></div></div>
    <div class="field"><label>Experience, languages, your read (one line for the Profile Card)</label><textarea id="sc-note">${esc(x.notes || '')}</textarea></div>
    <div class="field"><label>Consent to share her profile with agencies?</label><div class="chips" id="sc-cons"><span class="chip on" data-v="1">Yes, said so</span><span class="chip" data-v="0">Not yet</span></div></div>
    <div class="field"><label>Fit</label><div class="chips" id="sc-fit"><span class="chip ok on" data-v="hot">🔥 Hot: hard shifts, car, now</span><span class="chip" data-v="screened">OK</span><span class="chip" data-v="later">Later</span><span class="chip bad" data-v="no">Not a fit</span></div></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn ok" onclick="saveScreen('${id}')">Save screen</button></div>`);
  ['sc-cons', 'sc-fit'].forEach((g) => document.querySelectorAll('#' + g + ' .chip').forEach((c) => c.onclick = () => document.querySelectorAll('#' + g + ' .chip').forEach((d) => d.classList.toggle('on', d === c))));
}
function saveScreen(id) { const x = B.items[id]; Object.assign(x, { town: $('sc-town').value.trim(), licence: $('sc-lic').value.trim(), shifts: $('sc-shifts').value.trim(), car: $('sc-car').value.trim(), start: $('sc-start').value.trim(), notes: $('sc-note').value.trim(), consent: (document.querySelector('#sc-cons .chip.on') || {}).dataset?.v === '1', status: (document.querySelector('#sc-fit .chip.on') || {}).dataset?.v || 'screened', screenedAt: new Date().toISOString(), _u: now() }); x.log = x.log || []; x.log.push({ at: new Date().toISOString(), r: 'Screened · ' + x.status }); countApplicantCall(); bSave(); closeModal(); toast('Screened'); render(); }
function profileCard(x) { return `${x.name.split(' ')[0]} · ${x.town || '—'} · ${x.licence || 'caregiver'}\nShifts: ${x.shifts || '—'} · Car: ${x.car || '—'} · Start: ${x.start || '—'}\n${x.notes || ''}\n— Caregiver Bench · (561) 556-0536`; }
function renderBench() {
  const list = cgNext(), x = benchPick && B.items[benchPick] ? B.items[benchPick] : list[0];
  const counts = {}; bItems().forEach((c) => counts[c.status] = (counts[c.status] || 0) + 1);
  const tiles = `<div class="tiles">${[[counts.new || 0, 'to call'], [(counts.hot || 0) + (counts.screened || 0), 'on the bench'], [counts.hot || 0, 'hot'], [placements().length, 'working']].map(([n, l]) => `<div class="tile"><div class="n num">${n}</div><div class="l">${l}</div></div>`).join('')}</div>`;
  const next = !x ? `<div class="card"><div class="empty">Nobody to call back. New applications from caregiverbench.com land here every hour.</div></div>` : (() => { const tel = telHref(x.phone); const age = x.created_at ? Math.round((now() - new Date(x.created_at)) / 3600000) : null;
    return `<div class="card ac"><div class="card-h"><div class="card-t">Call back${age != null ? ` · applied ${age < 48 ? age + ' h' : Math.round(age / 24) + ' d'} ago` : ''}${age != null && age > 24 ? ' <span class="bad">· over 24 h</span>' : ''}</div><button class="btn sm ghost" onclick="benchPick=null;cgOutcome('${x.id}','no')">Not a fit</button></div>
      <div class="agency">${esc(x.name)}</div><div class="small muted" style="margin:2px 0 8px">${esc(x.town || '')}${x.licence ? ' · ' + esc(x.licence) : ''}${x.shifts ? ' · ' + esc(x.shifts) : ''}${x.source ? ' · via ' + esc(x.source) : ''}</div>
      <div class="dial-num">${tel ? `<a href="${tel}">${phonePretty(x.phone)}</a>` : '<span class="bad" style="font-size:16px">No phone</span>'}</div>
      ${tel ? `<div class="row" style="margin-top:8px;gap:6px"><a class="btn primary grow" href="${tel}">📞 Call</a><button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${phonePretty(x.phone)}');toast('Copied')">Copy</button></div>` : ''}
      <div class="sec-h">Open with</div><div class="small">"Hi ${esc(x.name.split(' ')[0])}, it's Egor from Caregiver Bench. You applied for caregiver work near ${esc(x.town || 'you')}. Got 10 minutes? I'll ask a few questions so I only send you jobs that fit. I never charge caregivers anything."</div>
      <div class="outcomes"><button class="btn" onclick="cgOutcome('${x.id}','noanswer')">📵 No answer<small>${x.attempts || 0} tries</small></button><button class="btn ok" onclick="cgOutcome('${x.id}','screen')">🗣 Reached: screen her<small>10-minute script</small></button></div></div>`; })();
  const bench = bItems().filter((c) => ['hot', 'screened', 'later'].includes(c.status)).sort((a, b) => (a.status === 'hot' ? 0 : 1) - (b.status === 'hot' ? 0 : 1));
  const benchHtml = `<div class="card"><div class="card-h"><div class="card-t">The bench · ${bench.length}</div><button class="btn sm" onclick="addCaregiverModal()">+ Add</button></div>${bench.length ? bench.map((c) => `<div class="qrow" onclick="screenModal('${c.id}')"><div class="grow"><div class="a">${c.status === 'hot' ? '🔥 ' : ''}${esc(c.name)}</div><div class="m">${esc(c.town || '')}${c.licence ? ' · ' + esc(c.licence) : ''}${c.shifts ? ' · ' + esc(c.shifts) : ''}${c.consent ? '' : ' · no consent yet'}</div></div><button class="btn sm ghost" onclick="event.stopPropagation();navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(profileCard(c))});toast('Profile card copied')">Card</button></div>`).join('') : '<div class="empty">Empty until the first screen. Sources: Facebook job ad (Tampa Bay), Indeed, Employ Florida, local groups, CNA schools.</div>'}</div>`;
  const rest = bItems().filter((c) => !['hot', 'screened', 'later', 'new'].includes(c.status));
  return tiles + next + benchHtml + (rest.length ? `<div class="card"><div class="card-t" style="margin-bottom:6px">Not on the bench · ${rest.length}</div>${rest.slice(0, 15).map((c) => `<div class="kv"><span class="small">${esc(c.name)}</span><span class="xs muted">${CG_STATUS[c.status] || c.status}</span></div>`).join('')}</div>` : '') + `<div class="xs muted" style="text-align:center;margin:6px 0">Bench ${bState.status === 'ok' ? 'synced' : bState.status === 'err' ? '<span class="bad">' + esc(bState.msg) + '</span>' : 'local'} · applications from the website arrive hourly</div>`;
}
