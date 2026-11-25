/* ═════════ 15.8.0 · BENCH OS · the Caregiver Bench operating system inside War Room ═════════
   Source of truth for the business funnel = Supabase schema `cb` (same project), reached only through
   public.cb_api(action, args), which accepts the same callers War Room already trusts. The database enforces
   the rules (calling hours, suppression, approved phone line, consent per agency, 3-day clock, locked prices,
   cleared-only cash); this file only shows the state and sends actions. Business spec: egorflow repo docs/os.
   - Ops dialer: calling is LOCKED until a phone line is approved in writing for outbound B2B calls (Quo's
     Fair Use Policy bans cold calls). Every call logged in the dialer is also written to cb; if cb refuses
     it, the War Room log is undone and the reason is shown. Undo in War Room voids the cb call.
   - Ops → Bench OS: Today · Sales · Candidates · Cases · Money · Gates. */
let CB = null, cbErr = '', cbTab = 'today', cbLoading = false, cbSearchRes = null;
const CB_LS = 'wr-cb-state', CB_PEND = 'wr-cb-pending';
try { CB = JSON.parse(localStorage.getItem(CB_LS) || 'null'); } catch (e) { CB = null; }
const CB_CORE = ['Tampa', 'Brandon', 'St. Petersburg', 'Clearwater'];
const cbMoney = (c) => '$' + Math.round((+c || 0) / 100).toLocaleString('en-US');
const cbN = (v) => (v == null ? 0 : +v);

async function cbApi(action, args) {
  if (typeof svRpc !== 'function') return { error: 'server module missing' };
  const r = await svRpc('cb_api', { p_action: action, p_args: args || {} });
  if (!r) return { error: 'no answer' };
  if (r.error) return { error: r.error };
  return r;
}
async function cbLoad(quiet) {
  if (cbLoading) return; if (!syncReady()) { cbErr = 'Sync is off: Bench OS needs the cloud.'; return; }
  cbLoading = true;
  const r = await cbApi('state');
  cbLoading = false;
  if (r.error) { cbErr = r.error === 'not-installed' ? 'Bench OS database is not installed.' : r.error; if (!quiet) toast('Bench OS: ' + cbErr); }
  else { CB = r.data; cbErr = ''; try { localStorage.setItem(CB_LS, JSON.stringify(CB)); } catch (e) { } cbFlush(); }
  if (view === 'cbos' || view === 'dial') render();
}
async function cbDo(action, args, okMsg) {
  const r = await cbApi(action, args);
  if (r.error) { toast('Refused: ' + r.error); return null; }
  if (okMsg) toast(okMsg);
  cbLoad(true);
  return r.data;
}
const cbIns = (table, row, msg) => cbDo('insert', { table, row }, msg);
const cbUpd = (table, key, patch, msg) => cbDo('update', { table, key, patch }, msg);
function cbFounder() { const t = (CB && CB.team) || []; return (t.find((x) => x.role === 'founder') || t[0] || {}).id || null; }

/* ───────── calling lock + dialer bridge ───────── */
function cbCallingOpen() { return !!(CB && CB.calling_open); }
function cbEtMin() {
  try { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (t) => +(p.find((x) => x.type === t) || {}).value; return g('hour') * 60 + g('minute'); } catch (e) { return null; }
}
function cbEtIso(t) { /* 'YYYY-MM-DD HH:MM' in Tampa time → ISO with the right EST/EDT offset */
  const base = String(t).trim().replace(' ', 'T');
  for (const off of ['-05:00', '-04:00']) { const d = new Date(base + ':00' + off); if (isNaN(d)) continue;
    const hh = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(d);
    if (+hh === +base.slice(11, 13)) return d.toISOString(); }
  return base + ':00-05:00';
}
function cbWindowOk() { const m = window.CB_TEST_ET_MIN != null ? window.CB_TEST_ET_MIN : cbEtMin(); /* test hook only: the database enforces the window */ return m == null || (m >= 8 * 60 && m < 20 * 60); }
function cbLockReason() {
  if (!CB) return 'Bench OS has not loaded yet: open Ops → Bench OS once with sync on.';
  if (!CB.calling_open) return 'Calling is locked: no phone line is approved in writing for outbound B2B calls (Quo bans cold calls). Bench OS → Gates.';
  if (!cbWindowOk()) return 'Outside 8 AM–8 PM Tampa time. No calls now.';
  return '';
}
function cbGuard(fn, isDial) {
  const orig = window[fn]; if (typeof orig !== 'function' || orig._cb) return;
  const w = function () {
    if (isDial(arguments)) { const why = cbLockReason(); if (why) { toast(why); return; } }
    return orig.apply(this, arguments);
  };
  w._cb = 1; window[fn] = w;
}
cbGuard('outcome', (a) => a[1] !== 'skip');
cbGuard('saveGatekeeper', () => true);
cbGuard('saveOwner', () => true);
cbGuard('offListDial', () => true);
cbGuard('offListOwner', () => true);
cbGuard('startSession', () => true);

function cbDisposition(result, note, owner) {
  const r = String(result || ''), has = !!String(note || '').trim();
  if (/^No answer/i.test(r)) return { disposition: 'no_answer' };
  if (/^Voicemail/i.test(r)) return { disposition: 'voicemail' };
  if (/^Bad number/i.test(r)) return { disposition: 'not_in_service' };
  if (/^Gatekeeper/i.test(r)) return { disposition: r.includes(':') ? 'gatekeeper_dm_named' : 'gatekeeper_blocked' };
  const m = r.match(/OWNER TALK\s*→\s*(\w+)/i);
  if (m || owner) {
    const k = m ? m[1].toLowerCase() : '';
    if (k === 'booked') return { disposition: 'dm_conversation', dm_reached: true, substantive: true };
    if (k === 'no') return { disposition: 'not_interested', dm_reached: true, substantive: has };
    return has ? { disposition: 'dm_conversation', dm_reached: true, substantive: true } : { disposition: 'dm_reached_not_now', dm_reached: true };
  }
  return { disposition: 'other' };
}
function cbPhone(p) { const m = String(p || '').match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/); return m ? m[0] : ''; }
async function cbSendCall(id, e) {
  const x = Q.items[id]; if (!x || !e) return;
  const d = cbDisposition(e.r, e.note, e.d && e.d.owners);
  const args = Object.assign({ phone: cbPhone(x.phone), agency: x.agency, city: x.city, at: e.at, notes: e.note || '', next_action: x.next_step || '', next_due: x.next_at || '' }, d);
  const r = await cbApi('log_call', args);
  if (r.error === 'offline' || r.error === 'sync-off') { cbQueue({ id, at: e.at, args }); toast('Saved on this phone; will send to Bench OS when online'); return; }
  if (r.error) { try { undoEntry(id, e.at, true); } catch (er) { } toast('Not logged · ' + r.error); render(); return; }
  e.cb = r.data.id; x._u = now(); qSave(); cbLoad(true);
}
function cbQueue(item) { try { const a = JSON.parse(localStorage.getItem(CB_PEND) || '[]'); a.push(item); localStorage.setItem(CB_PEND, JSON.stringify(a)); } catch (e) { } }
async function cbFlush() {
  let a = []; try { a = JSON.parse(localStorage.getItem(CB_PEND) || '[]'); } catch (e) { } if (!a.length) return;
  const keep = [];
  for (const it of a) { const r = await cbApi('log_call', it.args); if (r.error === 'offline') keep.push(it); else if (r.error) toast('Queued call refused · ' + r.error); else { const x = Q.items[it.id]; const e = x && (x.log || []).find((l) => l.at === it.at); if (e) { e.cb = r.data.id; x._u = now(); qSave(); } } }
  try { localStorage.setItem(CB_PEND, JSON.stringify(keep)); } catch (e) { }
}
(function () {
  const lc = window.logCall; if (typeof lc === 'function' && !lc._cb) {
    const w = function (id, result) { const out = lc.apply(this, arguments); try { const x = Q.items[id]; const e = x && x.log && x.log[x.log.length - 1]; if (e && e.r === result) cbSendCall(id, e); } catch (er) { console.error(er); } return out; };
    w._cb = 1; window.logCall = w;
  }
  const ue = window.undoEntry; if (typeof ue === 'function' && !ue._cb) {
    const w = function (id, at) { try { const x = Q.items[id]; const e = x && (x.log || []).find((l) => l.at === at); if (e && e.cb) cbApi('void_call', { id: e.cb, reason: 'Undone in War Room' }).then(() => cbLoad(true)); } catch (er) { } return ue.apply(this, arguments); };
    w._cb = 1; window.undoEntry = w;
  }
})();

/* ───────── screen wiring ───────── */
(function () {
  const r0 = window.render; if (typeof r0 !== 'function' || r0._cb) return;
  const w = function () {
    if (view === 'cbos') {
      if (!$('view-cbos')) { const s = document.createElement('section'); s.className = 'view'; s.id = 'view-cbos'; const ref = $('view-dial'); ref.parentNode.insertBefore(s, ref.nextSibling); }
      document.body.dataset.view = view; renderNav(); renderTop();
      document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-cbos'));
      $('view-cbos').innerHTML = renderCbos();
      try { renderRail(); } catch (e) { }
      return;
    }
    r0.apply(this, arguments);
    /* own slot above the Ops view: the dialer's DOM is never touched, and the slot only changes when its text does */
    let slot = $('cb-banner-slot'); const vd = $('view-dial');
    if (!slot && vd) { slot = document.createElement('div'); slot.id = 'cb-banner-slot'; vd.parentNode.insertBefore(slot, vd); }
    if (slot) { const on = view === 'dial'; slot.style.display = on ? '' : 'none'; if (on) { const h = cbBanner(); if (slot._h !== h) { slot.innerHTML = h; slot._h = h; } } }
  };
  w._cb = 1; window.render = w;
})();
function cbOpen(tab) { if (tab) cbTab = tab; show('cbos'); cbLoad(true); }
function cbBanner() {
  const why = cbLockReason(), c = (CB && CB.counts) || {};
  return `<div class="card" id="cb-banner" style="border-color:${why ? 'rgba(255,120,90,.45)' : 'rgba(80,200,140,.45)'}">
    <div class="row sb"><div class="grow"><div class="card-t">${why ? '🔒 Calling locked' : '🟢 Calling open'} · Bench OS</div>
    <div class="small ${why ? '' : 'muted'}">${esc(why || 'Approved line, inside Tampa calling hours. Every call is written to Bench OS.')}</div>
    <div class="xs muted" style="margin-top:4px">DM conversations ${cbN(c.dm_conversations_total)}/20 · researched ${cbN(c.researched)} · active caregivers in core towns ${cbN(c.active_core)}/10</div></div>
    <button class="btn sm primary" onclick="cbOpen('today')">Open</button></div></div>`;
}

function cbTabs() {
  const t = [['today', 'Today'], ['sales', 'Sales'], ['cands', 'Candidates'], ['cases', 'Cases'], ['money', 'Money'], ['gates', 'Gates']];
  return `<div class="chips" style="margin-bottom:12px;flex-wrap:wrap">${t.map(([k, l]) => `<span class="chip ${cbTab === k ? 'on' : ''}" onclick="cbTab='${k}';render()">${l}</span>`).join('')}</div>`;
}
function renderCbos() {
  const head = `<div class="row sb" style="margin-bottom:8px"><div><div class="card-t" style="font-size:20px">Bench OS</div><div class="xs muted">Caregiver Bench · Tampa Bay · source of truth: database cb</div></div><div class="row" style="gap:6px"><button class="btn sm" onclick="show('dial')">← Ops</button><button class="btn sm" onclick="cbLoad()">${cbLoading ? '…' : '↻'}</button></div></div>`;
  if (!CB) return head + `<div class="card"><div class="empty">${esc(cbErr || 'Loading Bench OS…')}</div></div>`;
  const body = { today: cbToday, sales: cbSales, cands: cbCands, cases: cbCases, money: cbMoneyTab, gates: cbGates }[cbTab] || cbToday;
  return head + cbTabs() + (cbErr ? `<div class="card"><div class="small bad">${esc(cbErr)}</div></div>` : '') + body();
}
const cbTile = (n, l, cls, on) => `<div class="tile ${cls || ''}" ${on ? `onclick="${on}"` : ''}><div class="n num">${n}</div><div class="l">${l}</div></div>`;
const cbRow = (a, m, on, right) => `<div class="qrow" ${on ? `onclick="${on}"` : ''}><div class="grow"><div class="a">${a}</div><div class="m">${m || ''}</div></div>${right || ''}</div>`;

function cbToday() {
  const n = CB.now || {}, c = CB.counts || {}, d = CB.today || {}, w = CB.week || {};
  const gp = (CB.gates || []).filter((g) => g.status !== 'met');
  let h = `<div class="tiles">${cbTile(cbN(n.active_available_candidates), 'active caregivers', '', "cbTab='cands';render()")}${cbTile(cbN(n.open_job_orders), 'open cases', '', "cbTab='cases';render()")}${cbTile(cbN(n.cases_at_risk), 'at risk', cbN(n.cases_at_risk) ? 'bad' : '')}${cbTile(cbN(n.overdue_actions), 'overdue', cbN(n.overdue_actions) ? 'bad' : '')}</div>`;
  h += `<div class="card"><div class="card-h"><div class="card-t">Stage gates</div><div class="card-r">facts, not activity</div></div>
    ${cbRow(`G0 · calling unlocked: ${CB.calling_open ? '✓' : '✗'}`, `${gp.length} launch gate(s) pending`, "cbTab='gates';render()")}
    ${cbRow(`G1 · substantive DM conversations: ${cbN(c.dm_conversations_total)} / 20`, 'offer stays locked until 20')}
    ${cbRow(`Supply · active caregivers in core towns: ${cbN(c.active_core)} / 10`, 'needed before the first case opens')}
    ${cbRow(`Accounts researched with evidence: ${cbN(c.researched)} / ${cbN(c.core_target)} core`, 'research before calling', "cbTab='sales';render()")}
    ${cbRow(`Ad spend so far: ${cbMoney(c.ad_spend_cents)} / $1,000 cap`, 'cap before the first collected payment', "cbTab='money';render()")}</div>`;
  if ((CB.at_risk || []).length) h += `<div class="card"><div class="card-t bad">Cases at risk</div>${CB.at_risk.map((r) => cbRow(esc(r.agency + ' · ' + r.town), esc(r.risk + ': ' + r.detail), `cbJob('${r.id}')`)).join('')}</div>`;
  if ((CB.overdue || []).length) h += `<div class="card"><div class="card-t">Overdue</div>${CB.overdue.slice(0, 12).map((r) => cbRow(esc(r.what), esc((r.action || '') + ' · ' + String(r.due || '').slice(0, 10)))).join('')}</div>`;
  h += `<div class="card"><div class="card-h"><div class="card-t">Today</div><div class="card-r">week: ${cbN(w.dials)} dials · ${cbN(w.dm_conversations)} DM conv · ${cbN(w.starts)} starts</div></div>
    <div class="small">${cbN(d.manual_dials)} dials · ${cbN(d.connections)} connects · <b>${cbN(d.dm_conversations)} DM conversations</b> · ${cbN(d.qualified_conversations)} qualified · ${cbN(d.qualified_vacancies)} vacancies · ${cbN(d.trials_accepted)} trials</div>
    <div class="small">${cbN(d.candidates_applied)} applied · ${cbN(d.candidates_screened)} screened · ${cbN(d.profiles_submitted)} profiles · ${cbN(d.interviews_held)} interviews · ${cbN(d.first_shifts_completed)} first shifts · ${cbMoney(d.collected_cents)} collected</div></div>`;
  if ((CB.interviews || []).length || (CB.shifts || []).length) h += `<div class="card"><div class="card-t">Next 7 days</div>${(CB.interviews || []).map((i) => cbRow('Interview · ' + esc(i.full_name + ' → ' + i.agency), esc(String(i.scheduled_at).slice(0, 16).replace('T', ' ') + (i.confirmed_day_before && i.confirmed_morning ? ' · confirmed' : ' · NOT confirmed')))).join('')}${(CB.shifts || []).map((s) => cbRow('First shift · ' + esc(s.full_name + ' → ' + s.agency), esc(String(s.first_shift_scheduled_at).slice(0, 16).replace('T', ' ')))).join('')}</div>`;
  return h;
}

/* ───────── Sales ───────── */
async function cbImportTampa() {
  if (!confirm('Load the 964 Tampa Bay agencies (AHCA public data) into Bench OS? Nurse registries are loaded as excluded. Safe to repeat.')) return;
  toast('Loading Tampa Bay accounts…');
  try { const j = await (await fetch('./cb_tampa_seed.json', { cache: 'no-cache' })).json(); let ins = 0;
    for (let i = 0; i < j.rows.length; i += 200) { const r = await cbApi('import_agencies', { rows: j.rows.slice(i, i + 200) }); if (r.error) { toast('Import stopped: ' + r.error); return; } ins += r.data.inserted; }
    toast(`Loaded ${ins} new accounts`); cbLoad(true);
  } catch (e) { toast('Import failed: ' + e.message); }
}
async function cbSearch(q) { if (!q || q.length < 2) { cbSearchRes = null; render(); return; } const r = await cbApi('search_agencies', { q }); cbSearchRes = r.error ? [] : r.data; render(); }
function cbSales() {
  const c = CB.counts || {};
  if (!cbN(c.agencies)) return `<div class="card"><div class="card-t">No accounts loaded yet</div><div class="small muted" style="margin:6px 0 10px">964 Tampa Bay rows from the Lead DB: 828 target agencies, 136 nurse registries excluded.</div><button class="btn primary block" onclick="cbImportTampa()">Load Tampa Bay accounts</button></div>`;
  const list = cbSearchRes || CB.sales || [];
  return `<div class="card"><div class="field" style="margin:0"><input placeholder="Search agency or phone" value="" onchange="cbSearch(this.value)"></div></div>
  <div class="card"><div class="card-h"><div class="card-t">${cbSearchRes ? 'Search' : 'Next best actions'}</div><div class="card-r">${cbN(c.target)} target · ${cbN(c.researched)} researched · ${cbN(c.dm_named)} DM named</div></div>
  ${list.length ? list.map((a) => cbRow(`${esc(a.name)} <span class="xs muted">${a.score != null ? '· ' + a.score : ''}</span>`, esc([a.town_area || a.city, a.stage, a.next_best_action || '', a.call_attempts ? a.call_attempts + ' calls' : ''].filter(Boolean).join(' · ')), `cbAgency('${a.id}')`)).join('') : '<div class="empty">Nothing here.</div>'}</div>
  <div class="hint">Score rises only on evidence (job posts, hard shifts, branches, W-2, decision-maker, urgency). Research in the 06:15 block: Florida is asleep.</div>`;
}
async function cbAgency(id) {
  const r = await cbApi('agency', { id }); if (r.error || !r.data) { toast(r.error || 'Not found'); return; }
  const { agency: a, evidence: ev, contacts: ct, activity: ac } = r.data, sb = a.score_breakdown || {};
  openModal(`<h2>${esc(a.name)}</h2><div class="small muted">${esc([a.license_type, a.street, a.city, a.zip].filter(Boolean).join(' · '))}</div>
    <div class="small" style="margin:6px 0">Stage <b>${esc(a.stage)}</b> · score <b>${a.score ?? '—'}</b> · W-2: ${esc(a.employment_model)} · payer: ${esc(a.payer_mix)} · branches: ${a.branch_count ?? '—'}${a.phone_main ? ` · ${esc(a.phone_main)}` : ''}</div>
    ${sb.factors ? `<div class="xs muted">${Object.entries(sb.factors).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>` : ''}
    <div class="card-t" style="margin-top:10px">Add evidence</div>
    <div class="field"><select id="cb-ek">${['open_job_post', 'repeat_job_post', 'hard_shift', 'branch', 'w2_confirmed', '1099_confirmed', 'private_pay_confirmed', 'urgency_stated', 'dm_reachable', 'other'].map((k) => `<option>${k}</option>`).join('')}</select></div>
    <div class="field"><input id="cb-ed" placeholder="What you saw (e.g. Indeed: live-in caregiver, Tampa, $200/day)"></div>
    <div class="field"><input id="cb-eu" placeholder="Source link"></div>
    <div class="actions"><button class="btn" onclick="cbNoEvidence('${a.id}')">Nothing found</button><button class="btn primary" onclick="cbAddEvidence('${a.id}')">Add evidence</button></div>
    <div class="card-t" style="margin-top:10px">Facts confirmed</div>
    <div class="chips">${['w2', '1099', 'unknown'].map((v) => `<span class="chip ${a.employment_model === v ? 'on' : ''}" onclick="cbFact('${a.id}',{employment_model:'${v}'})">${v === 'w2' ? 'W-2' : v}</span>`).join('')}${['private_pay', 'mixed', 'medicaid_medicare'].map((v) => `<span class="chip ${a.payer_mix === v ? 'on' : ''}" onclick="cbFact('${a.id}',{payer_mix:'${v}'})">${v.replace('_', ' ')}</span>`).join('')}<span class="chip" onclick="cbBranches('${a.id}')">branches…</span></div>
    <div class="card-t" style="margin-top:10px">Decision-maker</div>
    ${ct.map((k) => `<div class="small">${esc(k.name)}${k.title ? ' · ' + esc(k.title) : ''}${k.is_decision_maker ? ' · DM' : ''}${k.phone ? ' · ' + esc(k.phone) : ''}${k.email ? ' · ' + esc(k.email) : ''}</div>`).join('') || '<div class="small muted">None yet.</div>'}
    <div class="row" style="gap:6px;margin-top:6px"><input id="cb-cn" placeholder="Name" style="flex:1"><input id="cb-ct" placeholder="Title" style="flex:1"></div>
    <div class="row" style="gap:6px;margin-top:6px"><input id="cb-cp" placeholder="Direct phone" style="flex:1"><input id="cb-ce" placeholder="Email" style="flex:1"></div>
    <div class="field"><input id="cb-cs" placeholder="Where you found it (website, LinkedIn, call)"></div>
    <div class="actions"><button class="btn" onclick="cbAddContact('${a.id}')">Add decision-maker</button><button class="btn" onclick="cbJobForm('${a.id}')">New job order</button></div>
    <div class="card-t" style="margin-top:10px">Activity</div>${ac.slice(0, 10).map((o) => `<div class="xs ${o.voided_at ? 'muted' : ''}">${esc(String(o.occurred_at).slice(0, 16).replace('T', ' '))} · ${esc(o.disposition)}${o.voided_at ? ' (voided)' : ''}${o.notes ? ' · ' + esc(o.notes) : ''}</div>`).join('') || '<div class="small muted">No calls yet.</div>'}
    <div class="actions"><button class="btn danger" onclick="cbDnc('${a.id}')">Do not contact</button></div>`);
}
async function cbAddEvidence(id) { const detail = $('cb-ed').value.trim(); if (!detail) { toast('Write what you saw'); return; } if (await cbIns('agency_evidence', { agency_id: id, kind: $('cb-ek').value, detail, source_url: $('cb-eu').value.trim() || null, recorded_by: 'Egor' }, 'Evidence added')) { await cbApi('rescore', { agency_id: id }); cbAgency(id); } }
async function cbNoEvidence(id) { if (await cbIns('agency_evidence', { agency_id: id, kind: 'other', detail: 'Researched: no open job post or other evidence found', recorded_by: 'Egor' }, 'Logged: researched, nothing found')) { await cbUpd('agency', id, { stage: 'prioritized' }); cbAgency(id); } }
async function cbFact(id, patch) { if (await cbUpd('agency', id, patch, 'Saved')) { await cbApi('rescore', { agency_id: id }); cbAgency(id); } }
async function cbBranches(id) { const v = prompt('How many branches/offices?'); if (v == null) return; cbFact(id, { branch_count: Math.max(0, parseInt(v, 10) || 0) }); }
async function cbAddContact(id) {
  const name = $('cb-cn').value.trim(), src = $('cb-cs').value.trim(); if (!name || !src) { toast('Name and where you found it are required'); return; }
  if (await cbIns('contact', { agency_id: id, name, title: $('cb-ct').value.trim() || null, is_decision_maker: true, phone: $('cb-cp').value.trim() || null, email: $('cb-ce').value.trim() || null, source: src }, 'Decision-maker added')) {
    await cbApi('rescore', { agency_id: id }); const a = await cbApi('agency', { id }); if (a.data && ['identified', 'prioritized'].includes(a.data.agency.stage)) await cbUpd('agency', id, { stage: 'dm_identified' }); cbAgency(id); }
}
async function cbDnc(id) { if (!confirm('They asked not to be contacted? This suppresses the agency and its number permanently.')) return; const a = await cbApi('agency', { id }); if (!a.data) return;
  await cbIns('suppression', { kind: 'agency', value: id, reason: 'Asked not to be contacted', created_by: 'Egor' });
  if (a.data.agency.phone_main) await cbIns('suppression', { kind: 'phone', value: a.data.agency.phone_main, reason: 'Asked not to be contacted', created_by: 'Egor' });
  await cbUpd('agency', id, { stage: 'lost', lost_reason: 'other' }, 'Suppressed'); closeModal(); }

/* ───────── Cases (job orders → submissions → interviews → starts) ───────── */
async function cbJobForm(agencyId) {
  const r = await cbApi('agency', { id: agencyId }); if (!r.data) return; const ct = r.data.contacts;
  if (!ct.length) { toast('Add the agency contact first'); return; }
  const f = (id, l, ph, type) => `<div class="field"><label>${l}</label><input id="${id}" ${type ? `type="${type}"` : ''} placeholder="${ph || ''}"></div>`;
  openModal(`<h2>New job order · ${esc(r.data.agency.name)}</h2><div class="hint">Every field is required except desired experience. No client names or health details.</div>
    <div class="field"><label>Agency contact</label><select id="jo-c">${ct.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select></div>
    ${f('jo-town', 'Town', 'Tampa')}${f('jo-zip', 'ZIP', '33611')}
    <div class="field"><label>Role</label><select id="jo-role">${['HHA', 'CNA', 'companion', 'homemaker', 'other'].map((x) => `<option>${x}</option>`).join('')}</select></div>
    ${f('jo-pay', 'Pay', '$18/hr or $220/day')}${f('jo-sch', 'Schedule', 'Fri–Sun live-in')}${f('jo-start', 'Start date', '', 'date')}
    ${f('jo-req', 'Requirements', 'HHA certificate, own car')}${f('jo-exp', 'Desired experience', 'dementia, Hoyer lift')}${f('jo-tr', 'Transportation', 'own car required')}${f('jo-iv', 'Interview availability', 'Mon–Fri 10–14 ET')}
    <div class="field"><label><input type="checkbox" id="jo-hard"> Hard case (24/7, live-in, overnights, weekends-only, bilingual)</label><input id="jo-hr" placeholder="Why it's a hard case"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="cbJobSave('${agencyId}')">Save (draft)</button></div>`);
}
async function cbJobSave(agencyId) {
  const v = (id) => $(id).value.trim(); const hard = $('jo-hard').checked;
  const row = { agency_id: agencyId, agency_contact_id: v('jo-c'), town: v('jo-town'), zip: v('jo-zip') || null, role: v('jo-role'), pay_text: v('jo-pay'), schedule: v('jo-sch'), start_date: v('jo-start'), requirements: v('jo-req'), desired_experience: v('jo-exp') || null, transportation: v('jo-tr'), interview_availability: v('jo-iv'), is_hard_case: hard, hard_case_reason: hard ? v('jo-hr') : null, owner_id: cbFounder() };
  if (['town', 'pay_text', 'schedule', 'start_date', 'requirements', 'transportation', 'interview_availability'].some((k) => !row[k])) { toast('Fill every required field'); return; }
  const j = await cbIns('job_order', row, 'Job order saved (draft)'); if (!j) return;
  await cbUpd('agency', agencyId, { stage: 'vacancy_qualified' }); closeModal(); cbJob(j.id);
}
function cbCases() {
  const jobs = CB.jobs || [];
  return `<div class="card"><div class="card-h"><div class="card-t">Open cases</div><div class="card-r">max 3 free cases at once</div></div>${jobs.length ? jobs.map((j) => cbRow(esc(j.agency + ' · ' + j.town + ' · ' + j.role), esc(`${j.status} · ${j.profiles_submitted} profile(s)${j.profiles_due_at ? ' · due ' + String(j.profiles_due_at).slice(0, 16).replace('T', ' ') : ''}`), `cbJob('${j.id}')`)).join('') : '<div class="empty">No open cases. A case starts from an agency: Sales → agency → New job order.</div>'}</div>`;
}
async function cbJob(id) {
  const r = await cbApi('job', { id }); if (r.error || !r.data) { toast(r.error || 'Not found'); return; }
  const { job: j, submissions: subs, deal: d, agency: a } = r.data;
  const step = !d ? `<button class="btn primary" onclick="cbTrial('${j.id}','${a.id}')">Agency accepted First Hire Free</button>`
    : d.status === 'accepted' ? `<button class="btn primary" onclick="cbSign('${j.id}','${a.id}','${d.id}')">Trial terms signed</button>`
    : j.status === 'draft' ? `<button class="btn primary" onclick="cbOpenCase('${j.id}','${d.id}')">Open case · start 3-day clock</button>` : '';
  openModal(`<h2>${esc(a.name)} · ${esc(j.town)} · ${esc(j.role)}</h2>
    <div class="small">${esc(j.schedule)} · ${esc(j.pay_text)} · start ${esc(j.start_date)} · ${esc(j.requirements)} · ${esc(j.transportation)}</div>
    <div class="small" style="margin:6px 0">Status <b>${esc(j.status)}</b>${d ? ` · deal ${esc(d.offer)} (${esc(d.status)})` : ''}${j.profiles_due_at ? ` · profiles due <b>${esc(String(j.profiles_due_at).slice(0, 16).replace('T', ' '))}</b>` : ''}</div>
    <div class="actions">${step}${!['draft', 'filled', 'cancelled'].includes(j.status) ? `<button class="btn" onclick="cbSubmitForm('${j.id}','${a.id}')">Submit a candidate</button>` : ''}</div>
    <div class="card-t" style="margin-top:10px">Profiles</div>
    ${subs.map(({ s, name, interviews, placement: p }) => `<div class="card flat"><div class="small"><b>${esc(name)}</b> · ${esc(s.status)} · sent ${esc(String(s.submitted_at).slice(0, 10))}</div>
      ${interviews.map((i) => `<div class="xs">Interview ${esc(String(i.scheduled_at).slice(0, 16).replace('T', ' '))} · ${esc(i.status)}${i.status === 'scheduled' ? ` · <a onclick="cbIv('${i.id}','confirmed_day_before')">✓ day before</a> · <a onclick="cbIv('${i.id}','confirmed_morning')">✓ morning</a> · <a onclick="cbIvSet('${i.id}','completed')">held</a> · <a onclick="cbIvSet('${i.id}','no_show')">no-show</a>` : ''}</div>`).join('')}
      <div class="row" style="gap:6px;margin-top:4px"><button class="btn sm" onclick="cbIvNew('${s.id}','${j.id}')">Interview booked</button><button class="btn sm" onclick="cbHire('${s.id}','${a.id}','${s.candidate_id}','${j.id}')">${p ? 'Start…' : 'Hired'}</button></div>
      ${p ? `<div class="xs">${p.first_shift_completed_at ? '✅ first shift ' + esc(String(p.first_shift_completed_at).slice(0, 10)) : '⏳ first shift ' + esc(String(p.first_shift_scheduled_at || '').slice(0, 16).replace('T', ' '))}</div>` : ''}</div>`).join('') || '<div class="small muted">None yet.</div>'}`);
}
async function cbTrial(jid, aid) { const d = await cbIns('deal', { agency_id: aid, offer: 'first_hire_free', status: 'accepted' }, 'Trial accepted: send the one-page terms now'); if (d) { await cbUpd('job_order', jid, { deal_id: d.id }); await cbUpd('agency', aid, { stage: 'trial_accepted' }); cbJob(jid); } }
async function cbSign(jid, aid, did) {
  const who = prompt('Who signed the First Hire Free terms (name, title)?'); if (!who) return;
  const doc = prompt('Where is the signed copy (email date or link)?') || null;
  if (!(await cbIns('contract', { agency_id: aid, deal_id: did, template_version: 'FHF-terms-v1', contracting_entity: 'Caregiver Bench (Egor Nichiforov)', signed_at: new Date().toISOString(), signed_by_agency: who, document_url: doc }))) return;
  if (await cbUpd('deal', did, { status: 'signed' }, 'Terms signed')) { await cbUpd('agency', aid, { stage: 'contract_signed' }); cbJob(jid); }
}
async function cbOpenCase(jid, did) { if (await cbUpd('job_order', jid, { status: 'open', deal_id: did }, 'Case open: 2–3 profiles due in 3 days')) cbJob(jid); }
async function cbSubmitForm(jid, aid) {
  const act = CB.active || []; if (!act.length) { toast('No active caregivers. Activate one in Candidates first.'); return; }
  const ck = (id, l) => `<label class="small" style="display:block"><input type="checkbox" id="${id}"> ${l}</label>`;
  openModal(`<h2>Submit a candidate</h2><div class="hint">Call the caregiver now. All five must be yes, and the candidate must agree to this agency by name.</div>
    <div class="field"><label>Candidate</label><select id="sb-c">${act.map((c) => `<option value="${c.id}">${esc(c.full_name)} · ${esc(c.town || '')}</option>`).join('')}</select></div>
    ${ck('sb-1', 'Available now')}${ck('sb-2', 'Interested in THIS job')}${ck('sb-3', 'Pay is OK')}${ck('sb-4', 'Location / travel OK')}${ck('sb-5', 'Understands the role and schedule')}
    ${ck('sb-6', 'Candidate said yes to sharing the profile with THIS agency')}
    <div class="field"><input id="sb-n" placeholder="Notes for the profile card (what the candidate told you)"></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="cbSubmit('${jid}','${aid}')">Approve & submit</button></div>`);
}
async function cbSubmit(jid, aid) {
  const cid = $('sb-c').value, b = (i) => $('sb-' + i).checked;
  if (!b(6)) { toast('No consent for this agency = no submission'); return; }
  const ac = await cbIns('availability_check', { candidate_id: cid, job_order_id: jid, available: b(1), interested: b(2), pay_ok: b(3), location_ok: b(4), role_understood: b(5), notes: $('sb-n').value.trim() || null, checked_by: cbFounder() }); if (!ac) return;
  const job = await cbApi('job', { id: jid }); const an = job.data ? job.data.agency.name : 'the agency';
  const cs = await cbIns('candidate_consent', { candidate_id: cid, scope: 'share_profile', agency_id: aid, job_order_id: jid, method: 'verbal_call', wording: `Can I send your profile to ${an} for the ${job.data ? job.data.job.town + ' ' + job.data.job.schedule : ''} job? — Yes`, captured_by: 'Egor' }); if (!cs) return;
  if (await cbIns('submission', { job_order_id: jid, candidate_id: cid, consent_id: cs.id, availability_check_id: ac.id, approved_by: cbFounder() }, 'Profile submitted')) cbJob(jid);
}
async function cbIvNew(sid, jid) { const t = prompt('Interview date and time, Tampa time (YYYY-MM-DD HH:MM)'); if (!t) return; if (await cbIns('interview', { submission_id: sid, scheduled_at: cbEtIso(t) }, 'Interview booked: confirm the evening before and the morning of')) { await cbUpd('submission', sid, { status: 'interview_requested', agency_response_at: new Date().toISOString() }); cbJob(jid); } }
async function cbIv(id, f) { await cbUpd('interview', id, { [f]: new Date().toISOString() }, 'Confirmed'); closeModal(); }
async function cbIvSet(id, st) { await cbUpd('interview', id, { status: st }, st === 'no_show' ? 'No-show: replacement profile due within 24 h' : 'Interview held'); closeModal(); }
async function cbHire(sid, aid, cid, jid) {
  const j = await cbApi('job', { id: jid }); const sub = j.data && j.data.submissions.find((x) => x.s.id === sid); const p = sub && sub.placement;
  if (!p) { const t = prompt('Hired. First shift date/time, Tampa time (YYYY-MM-DD HH:MM)'); if (!t) return;
    if (await cbIns('placement', { submission_id: sid, agency_id: aid, candidate_id: cid, offer_accepted_at: new Date().toISOString(), first_shift_scheduled_at: cbEtIso(t), agreed_pay_text: j.data.job.pay_text, agreed_hours_text: j.data.job.schedule }, 'Start scheduled')) cbJob(jid); return; }
  if (p.first_shift_completed_at) { toast('Already a successful start'); return; }
  const ev = prompt('First shift COMPLETED? Paste the agency\'s written confirmation (who, when):'); if (!ev) return;
  if (await cbUpd('placement', p.id, { first_shift_completed_at: new Date().toISOString(), first_shift_evidence: ev, confirmed_by: cbFounder() }, 'Successful start ✅ · day 1/3/7/14/30/90 check-ins created')) cbJob(jid);
}

/* ───────── Candidates ───────── */
function cbCands() {
  const acts = CB.candidates || [], act = CB.active || [], w = cbN((CB.counts || {}).web_applications_waiting);
  return `<div class="card"><div class="row sb"><div class="card-t">Candidates</div><div class="row" style="gap:6px">${w ? `<button class="btn sm" onclick="cbDo('import_web',{},'Imported website applications')">Import ${w} web</button>` : ''}<button class="btn sm primary" onclick="cbCandForm()">+ Add</button></div></div>
    <div class="xs muted">Main supply number: active + confirmed in the last 7 days + consented. Never shared without a yes for that agency.</div></div>
  <div class="card"><div class="card-t">To do</div>${acts.length ? acts.map((c) => cbRow(esc(c.full_name + (c.town ? ' · ' + c.town : '')), esc(c.stage + ' · ' + (c.action || '')), `cbCand('${c.id}')`)).join('') : '<div class="empty">Nothing waiting.</div>'}</div>
  <div class="card"><div class="card-t">Active & available (${act.length})</div>${act.map((c) => cbRow(esc(c.full_name + ' · ' + (c.town || '')), esc([c.role, (c.shift_prefs || []).join('/'), c.availability, 'confirmed ' + String(c.last_confirmed_at || '').slice(0, 10)].filter(Boolean).join(' · ')), `cbCand('${c.id}')`)).join('') || '<div class="empty">0. The first case needs ≥10 in its town area.</div>'}</div>`;
}
function cbCandForm() {
  openModal(`<h2>Add candidate</h2><div class="hint">Only what recruiting fit needs. Never SSN, date of birth, health, immigration details.</div>
    <div class="field"><input id="cn-n" placeholder="Full name"></div><div class="field"><input id="cn-p" placeholder="Mobile phone"></div>
    <div class="field"><select id="cn-t"><option value="">Town</option>${CB_CORE.concat(['Riverview', 'Largo', 'Wesley Chapel', 'Other']).map((t) => `<option>${t}</option>`).join('')}</select></div>
    <div class="field"><select id="cn-r">${['HHA', 'CNA', 'companion', 'homemaker', 'family_experience', 'other'].map((x) => `<option>${x}</option>`).join('')}</select></div>
    <div class="field"><select id="cn-s">${['website', 'meta_form', 'referral', 'school', 'community', 'other'].map((x) => `<option>${x}</option>`).join('')}</select></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="cbCandSave()">Save as applicant</button></div>`);
}
async function cbCandSave() { const n = $('cn-n').value.trim(), p = $('cn-p').value.trim(); if (!n || !p) { toast('Name and phone'); return; }
  const c = await cbIns('candidate', { full_name: n, phone: p, town: $('cn-t').value || null, role: $('cn-r').value, source: $('cn-s').value, next_action: 'First contact', next_action_due: new Date(Date.now() + 864e5).toISOString() }, 'Applicant added'); if (c) cbCand(c.id); }
async function cbCand(id) {
  const r = await cbApi('candidate', { id }); if (r.error || !r.data) { toast(r.error || 'Not found'); return; }
  const { candidate: c, screenings: sc, consents: cs } = r.data, contact = cs.some((k) => k.scope === 'contact' && !k.withdrawn_at), pass = sc.some((s) => s.result === 'pass');
  openModal(`<h2>${esc(c.full_name)}</h2><div class="small">${esc([c.phone, c.town, c.role, c.availability, (c.languages || []).join('/')].filter(Boolean).join(' · '))}</div>
    <div class="small" style="margin:6px 0">Stage <b>${esc(c.stage)}</b> · work-authorized (said): ${esc(c.work_authorized)} · screen: ${pass ? 'passed' : sc.length ? sc[0].result : 'not yet'} · contact consent: ${contact ? '✓' : '✗'} · confirmed: ${esc(String(c.last_confirmed_at || '—').slice(0, 10))}</div>
    <div class="actions" style="flex-wrap:wrap">
      ${c.stage === 'applicant' ? `<button class="btn" onclick="cbCandStage('${c.id}','contacted')">Reached them</button>` : ''}
      <button class="btn" onclick="cbScreenForm('${c.id}')">Phone screen</button>
      ${!contact ? `<button class="btn" onclick="cbConsent('${c.id}')">Agreed to be contacted</button>` : ''}
      <button class="btn" onclick="cbConfirm('${c.id}')">Availability confirmed now</button>
      ${c.stage !== 'active' ? `<button class="btn primary" onclick="cbCandStage('${c.id}','active')">Activate</button>` : ''}
      <button class="btn" onclick="cbCandStage('${c.id}','inactive')">Inactive</button>
      <button class="btn danger" onclick="if(confirm('They asked not to be contacted?'))cbCandStage('${c.id}','do_not_contact')">Do not contact</button></div>`);
}
async function cbCandStage(id, st) { if (await cbUpd('candidate', id, { stage: st }, 'Stage: ' + st)) cbCand(id); }
async function cbConsent(id) { if (await cbIns('candidate_consent', { candidate_id: id, scope: 'contact', method: 'verbal_call', wording: 'Is it OK if we contact you about caregiver jobs? We only share your profile with an agency after you say yes to that agency. — Yes', captured_by: 'Egor' }, 'Consent recorded')) cbCand(id); }
async function cbConfirm(id) { if (await cbUpd('candidate', id, { last_confirmed_at: new Date().toISOString() }, 'Availability confirmed today')) cbCand(id); }
function cbScreenForm(id) {
  const y = (k, l) => `<label class="small" style="display:block"><input type="checkbox" id="sc-${k}"> ${l}</label>`;
  openModal(`<h2>Phone screen (10 min, never recorded)</h2>
    ${y('reach', 'Reachable, answered the call')}${y('exp', 'Experience fits (role, years, client types)')}${y('avail', 'Availability fits real shifts')}${y('tr', 'Transport / travel works')}${y('auth', 'Said YES: legally authorized to work in the US')}
    <div class="row" style="gap:6px"><input id="sc-av" placeholder="Shifts (days, nights, weekends, live-in)" style="flex:1"><input id="sc-pay" placeholder="Pay expectation" style="flex:1"></div>
    <div class="row" style="gap:6px;margin-top:6px"><input id="sc-cm" type="number" min="1" max="5" placeholder="Communication 1–5" style="flex:1"><input id="sc-rl" type="number" min="1" max="5" placeholder="Reliability 1–5" style="flex:1"></div>
    <div class="field"><input id="sc-n" placeholder="Notes: what the candidate said (no health or family details)"></div>
    <div class="chips" id="sc-res">${['pass', 'hold', 'fail'].map((v, i) => `<span class="chip ${i === 0 ? 'on' : ''}" data-v="${v}" onclick="this.parentNode.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));this.classList.add('on')">${v}</span>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="cbScreenSave('${id}')">Save screen</button></div>`);
}
async function cbScreenSave(id) {
  const b = (k) => $('sc-' + k).checked, n = (k) => { const v = parseInt($('sc-' + k).value, 10); return v >= 1 && v <= 5 ? v : null; };
  const res = (document.querySelector('#sc-res .chip.on') || {}).dataset.v || 'hold';
  if (!(await cbIns('screening', { candidate_id: id, reachable: b('reach'), experience_ok: b('exp'), availability_ok: b('avail'), transport_ok: b('tr'), communication: n('cm'), reliability_signals: n('rl'), result: res, notes: $('sc-n').value.trim() || null, screened_by: cbFounder() }, 'Screen saved'))) return;
  const patch = { work_authorized: b('auth') ? 'yes' : 'unknown' }; if ($('sc-av').value.trim()) patch.availability = $('sc-av').value.trim(); if ($('sc-pay').value.trim()) patch.pay_expectation = $('sc-pay').value.trim();
  await cbUpd('candidate', id, patch); const c = await cbApi('candidate', { id }); if (c.data && ['applicant', 'contacted'].includes(c.data.candidate.stage) && res !== 'fail') await cbUpd('candidate', id, { stage: 'screened' }); cbCand(id);
}

/* ───────── Money + Gates ───────── */
function cbMoneyTab() {
  const c = CB.cash || {}, inv = CB.invoices || [];
  return `<div class="tiles">${cbTile(cbMoney(c.collected_cents), 'collected (cleared)', 'hit')}${cbTile(cbMoney(c.receivables_cents), 'receivables')}${cbTile(cbMoney(c.invoiced_cents), 'invoiced')}${cbTile(cbMoney(c.contracted_cycle_fees_cents), 'contracted / cycle')}</div>
  <div class="card"><div class="card-t">Invoices due</div>${inv.map((i) => cbRow(esc((i.number || 'draft') + ' · ' + i.agency), esc(`${cbMoney(i.outstanding_cents)} open · due ${i.due_at}${i.overdue ? ' · OVERDUE' : ''}`))).join('') || '<div class="empty">None. Invoices need gates legal_entity + payment_route.</div>'}</div>
  <div class="card"><div class="row sb"><div><div class="card-t">Costs</div><div class="xs muted">${cbMoney(c.costs_cents)} total · ads ${cbMoney(c.ad_spend_cents)} of the $1,000 cap</div></div><button class="btn sm primary" onclick="cbCost()">+ Cost</button></div></div>`;
}
async function cbCost() {
  const cat = prompt('Category: advertising, candidate_sourcing, contractor, phone, legal, software, payment_processing, other', 'advertising'); if (!cat) return;
  const amt = parseFloat(String(prompt('Amount in USD') || '').replace(',', '.')); if (!(amt >= 0)) return;
  await cbIns('cost_entry', { category: cat.trim(), amount_cents: Math.round(amt * 100), incurred_on: dk(new Date()), vendor: prompt('Vendor (e.g. Meta)') || null, recorded_by: 'Egor' }, 'Cost logged');
}
function cbGates() {
  return `<div class="card"><div class="card-h"><div class="card-t">Launch gates</div><div class="card-r">met only with written evidence</div></div>
  ${(CB.gates || []).map((g) => cbRow(`${g.status === 'met' ? '✅' : '⏳'} ${esc(g.label)}`, esc(g.status === 'met' ? `${g.evidence} · ${g.decided_by} · ${String(g.decided_at).slice(0, 10)}` : 'pending'), g.status === 'met' ? '' : `cbGateMet('${g.key}')`)).join('')}</div>
  <div class="card"><div class="row sb"><div><div class="card-t">Phone lines</div><div class="xs muted">Quo (561) is inbound + candidates only. Add the new line once a provider approves in writing.</div></div><button class="btn sm" onclick="cbLine()">+ Approved line</button></div></div>
  <div class="hint">Free First Hire cases can be signed on the one-page terms without counsel (your decision, 25 Nov). Every paid deal, contract and invoice still needs contract_reviewed + legal_entity + payment_route.</div>`;
}
async function cbLine() {
  const num = prompt('New line number (e.g. +18135550123)'); if (!num) return; const prov = prompt('Provider name'); if (!prov) return;
  const ev = prompt('Their WRITTEN approval for manual outbound B2B calls (who, date, where filed):'); if (!ev || ev.trim().length < 8) return;
  if (await cbIns('phone_line', { number: num.trim(), provider: prov.trim(), approved_for_cold_b2b: true, approval_evidence: ev.trim(), note: 'Added in Bench OS' }, 'Line added'))
    await cbUpd('launch_gate', 'phone_provider_approved', { status: 'met', evidence: ev.trim(), decided_by: 'Egor', decided_at: new Date().toISOString() }, 'Calling unlocked');
}
async function cbGateMet(key) {
  const ev = prompt('Written evidence that this gate is met (who said yes, when, where it is filed):'); if (!ev || ev.trim().length < 8) return;
  if (!confirm('Mark this gate as MET? This changes what the system allows.')) return;
  await cbUpd('launch_gate', key, { status: 'met', evidence: ev.trim(), decided_by: 'Egor', decided_at: new Date().toISOString() }, 'Gate met');
}

/* refresh when the app opens and every 5 minutes while open */
setTimeout(() => cbLoad(true), 2500);
setInterval(() => { if (document.visibilityState === 'visible') cbLoad(true); }, 5 * 60 * 1000);
