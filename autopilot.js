/* War Room · autopilot.js (7.0) — the five levels from "dashboard" to "machine that runs the business with you".
   L20  Call capture: tap a number, make the call, come back — the app measured the call, guesses the outcome,
        one tap logs it with the real duration. (Works with the phone's own dialer; CloudTalk can plug in later.)
   L40  Bench autopilot: every applicant gets a try-plan (now, +4 h, next day), a prefilled text with your
        screening slots, and a clear "next try" time. Applicants applied themselves: texting them is inbound, not cold.
   L60  Matching engine: a case (town, hours, type) ranks your screened caregivers with reasons; one tap
        sends the top profiles to the owner (first name, town, licence, shifts, one line: no phone, no surname).
   L80  Money loop: shifts counted per placement; at 5 shifts the invoice is drafted ($500 Founding / $750 / $1,200),
        printable, tracked draft → sent → paid, and counted in cash collected.
   L100 Learning lab: owner-pickup rate by Florida hour, weekday, county, attempt and tier, shrunk toward the
        plan's 2.5% until there is enough data, turned into plain recommendations and a "best time now" view. */
'use strict';

/* ═════════ L20 · CALL CAPTURE ═════════ */
let capPending = null;
if (typeof markDialing === 'function' && !markDialing._ap) { const _m = markDialing; markDialing = function (id) { _m(id); capPending = { id, t: now(), hidden: 0, back: 0 }; }; markDialing._ap = true; }
document.addEventListener('visibilitychange', () => {
  if (!capPending) return;
  if (document.hidden) { capPending.hidden = now(); return; }
  if (!capPending.hidden) return; const away = Math.round((now() - capPending.hidden) / 1000), p = capPending; capPending = null;
  if (away < 4 || now() - p.t > 3 * 3600e3) return; setTimeout(() => capSheet(p.id, away), 350);
});
function capGuess(sec) { return sec < 22 ? 'noanswer' : sec < 75 ? 'voicemail' : sec < 140 ? 'gatekeeper' : 'owner'; }
function capSheet(id, sec) {
  const x = Q && Q.items[id]; if (!x) return; const g = capGuess(sec);
  const b = (k, l, sub) => `<button class="cap-b ${k === g ? 'on' : ''} ${k === 'owner' ? 'go' : ''}" onclick="capLog(${id},'${k}',${sec})"><b>${l}</b><span>${sub}</span></button>`;
  openModal(`<div class="cap"><div class="cap-t"><small>CALL CAPTURED</small><b>${esc(x.agency)}</b><span>${Math.floor(sec / 60)}:${pad(sec % 60)} away from the app · best guess highlighted</span></div>
    <div class="cap-g">${b('noanswer', 'No answer', 'under ~20 s')}${b('voicemail', 'Voicemail', '20–75 s')}${b('gatekeeper', 'Gatekeeper', 'front desk')}${b('owner', 'Owner talk', 'real conversation')}</div>
    <div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" onclick="capLog(${id},'bad',${sec})">Bad number</button><button class="btn sm ghost" onclick="closeModal()">Did not call</button></div></div>`, true);
}
function capLog(id, kind, sec) {
  closeModal(); if (typeof outGuard !== 'undefined') outGuard = { id: null, at: 0 };
  const x = Q.items[id], n = (x.log || []).length; outcome(id, kind);
  const e = (x.log || [])[n] || (x.log || []).slice(-1)[0]; if (e && (x.log || []).length > n) { e.dur = sec; x._u = now(); qSave(); }
}

/* ═════════ L40 · BENCH AUTOPILOT ═════════ */
function apSlots() { return (S.settings.screenSlots || 'Tue 9:00–11:00 · Thu 8:00–11:00 · Sat 10:00–11:30 (Florida time)'); }
function apNextTry(c) { const n = c.attempts || 0, last = Date.parse(((c.log || []).slice(-1)[0] || {}).at || c.created_at || '') || now(); if (c.status !== 'new') return null; return n === 0 ? now() : n === 1 ? last + 4 * 3600e3 : n === 2 ? last + 24 * 3600e3 : null; }
function apText(c) { const fn = (c.name || '').split(' ')[0]; return `Hi ${fn}, this is Egor from Caregiver Bench. Thanks for applying! I'd love a quick 10-minute call about caregiver shifts near ${c.town || 'you'}. Which time works: ${apSlots()}? Reply with a time, or call me back at this number.`; }
function apSms(c) { const ph = String(c.phone || '').replace(/[^\d+]/g, ''); return ph ? `sms:${ph}?body=${encodeURIComponent(apText(c))}` : ''; }
function apTexted(id) { const c = B.items[id]; c.log = c.log || []; c.log.push({ at: new Date().toISOString(), r: 'Texted: screening slots' }); c.texted = new Date().toISOString(); c._u = now(); bSave(); render(); toast('Logged: text sent'); }
function apCard() {
  if (typeof B === 'undefined' || !B) return ''; const L = bItems().filter((c) => c.status === 'new' || c.status === 'unreachable').map((c) => ({ c, nt: apNextTry(c) })).sort((a, b) => (a.nt || 9e15) - (b.nt || 9e15)).slice(0, 12);
  const due = L.filter((r) => r.nt && r.nt <= now()).length;
  return `<div class="card"><div class="card-h"><div class="card-t">Applicant autopilot</div><div class="card-r">${due} due now · ${L.length} waiting</div></div>
    <div class="small muted" style="margin-bottom:8px">Speed wins: an applicant called within 1 hour is far more likely to show up. Each one gets: call now → text with your slots → call again in 4 h → call next day → marked unreachable. Slots: <a href="#" onclick="apSlotEdit();return false">${esc(apSlots())}</a></div>
    ${L.length ? L.map(({ c, nt }) => { const tel = typeof telHref === 'function' ? telHref(c.phone) : ''; return `<div class="ap-row"><div class="grow"><b>${esc(c.name || 'Applicant')}</b><div class="xs muted">${esc(c.town || '')}${c.licence ? ' · ' + esc(c.licence) : ''} · tries ${c.attempts || 0}${c.texted ? ' · texted' : ''} · ${nt ? (nt <= now() ? '<span class="acc">due now</span>' : 'next ' + hmNow(new Date(nt)) + (dk(new Date(nt)) !== dk(new Date()) ? ' tomorrow' : '')) : c.status}</div></div>
      ${tel ? `<a class="btn sm primary" href="${tel}">Call</a>` : ''}${apSms(c) ? `<a class="btn sm" href="${apSms(c)}" onclick="setTimeout(()=>apTexted('${c.id}'),400)">Text</a>` : ''}<button class="btn sm" onclick="cgOutcome('${c.id}','noanswer')">No answer</button><button class="btn sm ok" onclick="cgOutcome('${c.id}','screen')">Screen</button></div>`; }).join('') : '<div class="empty">No applicants waiting. Ads on? Saturday 17:00 is the caregiver block.</div>'}</div>`;
}
function apSlotEdit() { const v = prompt('Your screening slots, as you would say them in a text:', apSlots()); if (v != null && v.trim()) { S.settings.screenSlots = v.trim(); S.settings._u = now(); save(); render(); } }
if (typeof renderBench === 'function' && !renderBench._ap) { const _rb = renderBench; renderBench = function () { return apCard() + _rb.apply(this, arguments); }; renderBench._ap = true; }

/* ═════════ L60 · MATCHING ENGINE ═════════ */
function mtParse(t) { t = (t || '').toLowerCase(); return { live: /live[- ]?in|24\/7|24h/.test(t), nights: /night|overnight/.test(t), weekends: /weekend|sat|sun|thu–sun|fri–sun/.test(t), days: /\bdays?\b|daytime|morning/.test(t), hha: /hha|home health aide/.test(t), cna: /cna/.test(t), car: /car|driv/.test(t), spanish: /spanish|español/.test(t), area: typeof areaOf === 'function' ? areaOf({ city: t }) : 'other' }; }
function mtScore(c, need, x) {
  const why = []; let s = 0; const add = (n, t) => { s += n; why.push((n > 0 ? '+' : '') + n + ' ' + t); }; const sh = (c.shifts || '').toLowerCase(), lic = (c.licence || '').toLowerCase(), note = (c.notes || '').toLowerCase();
  const ca = typeof areaOf === 'function' ? areaOf({ city: c.town || '' }) : 'other', aa = need.area !== 'other' ? need.area : (typeof areaOf === 'function' ? areaOf(x) : 'other');
  if (ca === aa && ca !== 'other') add(30, 'same area'); else if ((c.town || '') && (x.city || '').toLowerCase().includes((c.town || '').toLowerCase().split(/[ ,]/)[0])) add(25, 'same town'); else add(-10, 'different area');
  if (need.live && /live/.test(sh)) add(25, 'wants live-in'); if (need.nights && /night/.test(sh)) add(15, 'does nights'); if (need.weekends && /weekend|sat|sun/.test(sh)) add(15, 'does weekends'); if (need.days && /day/.test(sh)) add(8, 'does days');
  if (need.hha && /hha/.test(lic)) add(15, 'HHA'); if (need.cna && /cna/.test(lic)) add(15, 'CNA'); if (!need.hha && !need.cna && lic) add(5, lic);
  if (need.car) { if (/^y|yes/.test((c.car || '').toLowerCase())) add(10, 'has a car'); else add(-15, 'no car'); }
  if (need.spanish && /spanish|español/.test(note)) add(10, 'Spanish');
  if (c.status === 'hot') add(15, 'hot fit'); if (c.status === 'later') add(-10, 'available later'); if (/now|asap|today/.test((c.start || '').toLowerCase())) add(8, 'can start now');
  if (!c.consent) add(-100, 'no consent to share yet');
  return { s, why };
}
function matchOpen(id) {
  const x = Q.items[id]; if (!x) return; if (typeof B === 'undefined' || !B) { toast('Bench still loading'); return; }
  const caseTxt = x.case || x.next_step || ''; const need = mtParse(caseTxt + ' ' + (x.city || ''));
  const pool = bItems().filter((c) => ['hot', 'screened', 'later', 'placed'].includes(c.status)).map((c) => Object.assign({ c }, mtScore(c, need, x))).sort((a, b) => b.s - a.s);
  const sent = new Set(((x.hist || []).filter((h) => h.t === 'profiles').flatMap((h) => h.ids || [])));
  openModal(`<h2>Match caregivers · ${esc(x.agency)}</h2>
    <div class="field"><label>The case (town · hours · type · must-haves)</label><div class="inline"><input id="mt-case" value="${esc(caseTxt)}" placeholder="Live-in, Marco Island, Thu–Sun, HHA, car"><button class="btn" onclick="Q.items[${id}].case=$('mt-case').value.trim();Q.items[${id}]._u=now();qSave();matchOpen(${id})">Re-rank</button></div></div>
    <div class="xs muted" style="margin-bottom:8px">Reads: ${Object.entries(need).filter(([k, v]) => v === true).map(([k]) => k).join(', ') || 'no hours or type yet'} · area ${esc(need.area)}</div>
    ${pool.length ? `<div class="mt-list">${pool.slice(0, 8).map((r, i) => `<label class="mt-row ${r.s < 0 ? 'off' : ''}"><input type="checkbox" class="mt-pick" value="${r.c.id}" ${i < 2 && r.s > 0 && !sent.has(r.c.id) ? 'checked' : ''} ${r.c.consent ? '' : 'disabled'}><div class="grow"><b>${esc((r.c.name || '').split(' ')[0])}</b> <span class="muted small">${esc(r.c.town || '')} · ${esc(r.c.licence || '')} · ${esc(r.c.shifts || '')}</span>${sent.has(r.c.id) ? ' <span class="xs acc">already sent</span>' : ''}<div class="xs muted">${r.why.join(' · ')}</div></div><span class="crm-score sm s${r.s >= 60 ? 3 : r.s >= 30 ? 2 : 1}">${Math.min(100, Math.max(0, r.s))}</span></label>`).join('')}</div>` : '<div class="empty">No screened caregivers yet. Bench first: Ops → Caregivers.</div>'}
    <div class="actions"><button class="btn" onclick="closeModal()">Close</button>${pool.length ? `<button class="btn primary" onclick="matchSend(${id})">Send checked profiles</button>` : ''}</div>`, true);
}
function mtProfile(c) { return `${(c.name || '').split(' ')[0]} · ${c.town || 'nearby'}\n${c.licence || 'Caregiver'}${c.car && /^y/i.test(c.car) ? ' · has a car' : ''}${c.start ? ' · can start ' + c.start : ''}\nShifts: ${c.shifts || 'flexible'}\n${c.notes ? 'Notes: ' + c.notes : ''}`.trim(); }
function matchSend(id) {
  const x = Q.items[id], ids = Array.from(document.querySelectorAll('.mt-pick:checked')).map((i) => i.value); if (!ids.length) { toast('Tick at least one caregiver'); return; }
  const cs = ids.map((k) => B.items[k]), fn = typeof firstName === 'function' ? firstName(x.contact) : '';
  const body = `Hi ${fn || 'there'},\n\nFor your ${x.case || 'open case'}, here ${cs.length === 1 ? 'is one screened caregiver' : `are ${cs.length} screened caregivers`} who want this kind of shift:\n\n${cs.map((c, i) => `${i + 1}. ${mtProfile(c)}`).join('\n\n')}\n\nThey have agreed to share their profile with you. Want me to set up an interview? You hire them as your own W-2 employee and run your usual checks; you pay nothing until one has worked 5 shifts.\n\nEgor\nCaregiver Bench`;
  const href = x.email ? `mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent('Caregiver profiles for your case')}&body=${encodeURIComponent(body)}` : '';
  crmHist(x, 'profiles', `Sent ${cs.length} profile${cs.length > 1 ? 's' : ''}: ${cs.map((c) => (c.name || '').split(' ')[0]).join(', ')}`, { ids }); qSave();
  cs.forEach((c) => { c.log = c.log || []; c.log.push({ at: new Date().toISOString(), r: `Profile sent to ${x.agency}` }); c._u = now(); }); bSave();
  if (typeof CRM_EV !== 'undefined') CRM_EV.profiles = ['Profiles', 'var(--ok)'];
  openModal(`<h2>Profiles ready</h2><div class="hint">Logged on the agency and on each caregiver. ${href ? 'Open it in your mail app and press send.' : 'No email on file: copy it and send it however you talk to this owner.'}</div><textarea id="mt-body" style="min-height:220px">${esc(body)}</textarea>
    <div class="actions"><button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText($('mt-body').value);toast('Copied')">Copy</button>${href ? `<a class="btn primary" href="${href}">Open in mail</a>` : ''}<button class="btn" onclick="closeModal()">Done</button></div>`, true);
}

/* ═════════ L80 · MONEY LOOP ═════════ */
function mlPlacements() { const out = []; qItems().forEach((x) => (x.placements || []).forEach((p, i) => out.push({ x, p, i }))); return out.sort((a, b) => (b.p.at || '').localeCompare(a.p.at || '')); }
function mlPrice(x, p) { const founding = x.status !== 'member' && new Set(placements().filter((q) => q.at <= p.at).map((q) => q.agency)).size <= 5; return x.status === 'member' ? 0 : founding ? 500 : p.hard ? 1200 : 750; }
function mlShift(id, i, d) { const x = Q.items[id], p = x.placements[i]; p.shifts = Math.max(0, (p.shifts || 1) + d); x._u = now(); if (p.shifts >= 5 && !p.inv && mlPrice(x, p)) toast(`${p.cg || 'Caregiver'} hit 5 shifts at ${x.agency}: invoice is ready`, 'Draft it', () => mlInvoice(id, i)); qSave(); render(); if (document.querySelector('.modal .crm-rec')) crmOpen(id); }
function mlInvoice(id, i) {
  const x = Q.items[id], p = x.placements[i]; x.client = x.client || {}; x.client.invoices = x.client.invoices || [];
  const n = 1 + Math.max(0, ...qItems().flatMap((y) => ((y.client || {}).invoices || []).map((v) => v.n || 0)));
  const v = { id: uid(), n, amount: mlPrice(x, p), date: dk(new Date()), due: dk(addDays(new Date(), 14)), cg: p.cg || '', what: p.what || x.case || '', status: 'draft', paid: false };
  x.client.invoices.push(v); p.inv = v.id; crmHist(x, 'note', `Invoice #${n} drafted · $${v.amount}`); x._u = now(); qSave(); render(); mlPrint(id, v.id);
}
function mlSet(id, vid, st) { const x = Q.items[id], v = ((x.client || {}).invoices || []).find((z) => z.id === vid); if (!v) return; v.status = st; v.paid = st === 'paid'; if (st === 'paid') v.paidAt = dk(new Date()); crmHist(x, 'note', `Invoice #${v.n} ${st}`); x._u = now(); qSave(); render(); toast(`Invoice #${v.n}: ${st}`); }
function mlPrint(id, vid) {
  const x = Q.items[id], v = ((x.client || {}).invoices || []).find((z) => z.id === vid); if (!v) return; const from = S.settings.invoiceFrom || 'Caregiver Bench\n(invoicing company name and address: set in Pipeline → Money)';
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print the invoice'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${v.n} · ${esc(x.agency)}</title><style>body{font-family:Helvetica,Arial,sans-serif;max-width:720px;margin:40px auto;color:#111;padding:0 20px}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse;margin:28px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;text-transform:uppercase;color:#666}.r{text-align:right}.tot td{font-weight:700;font-size:18px;border-bottom:none}.muted{color:#666;font-size:13px;line-height:1.5}pre{font-family:inherit;margin:0}</style></head><body>
    <div style="display:flex;justify-content:space-between;gap:20px"><div><h1>Invoice</h1><div class="muted">No. ${v.n} · issued ${v.date} · due ${v.due}</div></div><pre class="muted" style="text-align:right">${esc(from)}</pre></div>
    <p class="muted" style="margin-top:28px"><b style="color:#111">Bill to</b><br>${esc(x.agency)}<br>${esc(x.contact || '')}<br>${esc(x.city || '')}, FL</p>
    <table><tr><th>Description</th><th class="r">Amount (USD)</th></tr><tr><td>Recruiting fee: caregiver ${esc(v.cg || '')} for ${esc(v.what || 'your case')}, payable after 5 worked shifts${v.amount === 500 ? ' (Founding Offer)' : ''}</td><td class="r">$${fmt(v.amount)}</td></tr><tr class="tot"><td>Total due</td><td class="r">$${fmt(v.amount)}</td></tr></table>
    <p class="muted">Recruiting service only. The caregiver is your W-2 employee; no fee is charged per client, family or referral. Payment details: as agreed.</p><script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close();
}
function mlTab() {
  const P = mlPlacements(), inv = qItems().flatMap((x) => ((x.client || {}).invoices || []).map((v) => ({ x, v }))).sort((a, b) => (b.v.date || '').localeCompare(a.v.date || ''));
  const billed = inv.reduce((a, r) => a + (r.v.amount || 0), 0), paid = inv.filter((r) => r.v.paid).reduce((a, r) => a + r.v.amount, 0), late = inv.filter((r) => !r.v.paid && r.v.due && r.v.due < dk(new Date()));
  return `<div class="st-kpis">${stK('Billed', '$' + fmt(billed), `${inv.length} invoices`)}${stK('Collected', '$' + fmt(paid), billed ? Math.round((paid / billed) * 100) + '% of billed' : '')}${stK('Outstanding', '$' + fmt(billed - paid), late.length ? `<span class="bad">${late.length} overdue</span>` : 'none overdue')}${stK('MRR', '$' + fmt(typeof mrr === 'function' ? mrr() : 0), 'monthly plans')}</div>
    <div class="card"><div class="card-h"><div class="card-t">Placements · shift counter</div><div class="card-r">invoice unlocks at 5 worked shifts</div></div>
    ${stTable(['Started', 'Agency', 'Caregiver', 'Shifts', '', 'Invoice'], P.map(({ x, p, i }) => ({ c: [fmtShort(pd(p.at)), `<a href="#" onclick="crmOpen(${x.id});return false">${esc(x.agency)}</a>`, esc(p.cg || '—'), `<b>${p.shifts || 1}</b>/5`, `<button class="btn sm" onclick="mlShift(${x.id},${i},-1)">−</button> <button class="btn sm" onclick="mlShift(${x.id},${i},1)">+1 shift</button>`, p.inv ? 'drafted' : (p.shifts || 1) >= 5 && mlPrice(x, p) ? `<button class="btn sm primary" onclick="mlInvoice(${x.id},${i})">Draft $${mlPrice(x, p)}</button>` : mlPrice(x, p) ? `$${mlPrice(x, p)} at 5` : 'in plan'] })), { empty: 'No placements yet. When a caregiver works a first shift: agency record → Placements → log it.' })}</div>
    <div class="card"><div class="card-h"><div class="card-t">Invoices</div><div class="card-r"><a href="#" onclick="mlFrom();return false">invoice from…</a></div></div>
    ${stTable(['No.', 'Agency', 'Amount', 'Issued', 'Due', 'Status', ''], inv.map(({ x, v }) => ({ c: [v.n || '', esc(x.agency), '$' + fmt(v.amount), v.date, v.due && !v.paid && v.due < dk(new Date()) ? `<span class="bad">${v.due}</span>` : v.due, v.paid ? '<span class="ok">paid</span>' : v.status || 'open', `<button class="btn sm" onclick="mlPrint(${x.id},'${v.id}')">Print</button> ${v.paid ? '' : v.status === 'sent' ? `<button class="btn sm ok" onclick="mlSet(${x.id},'${v.id}','paid')">Paid</button>` : `<button class="btn sm" onclick="mlSet(${x.id},'${v.id}','sent')">Sent</button> <button class="btn sm ok" onclick="mlSet(${x.id},'${v.id}','paid')">Paid</button>`}`] })), { empty: 'No invoices yet.' })}</div>`;
}
function mlFrom() { const v = prompt('Who the invoice is from (company name, address, registration). Shown top-right on every invoice.', S.settings.invoiceFrom || ''); if (v != null) { S.settings.invoiceFrom = v.trim(); S.settings._u = now(); save(); render(); } }

/* ═════════ L100 · LEARNING LAB ═════════ */
const LAB_PRIOR = 0.025, LAB_K = 40;
function labRate(o, n) { return (o + LAB_PRIOR * LAB_K) / (n + LAB_K); }
function labData() {
  const C = []; qItems().forEach((x) => (x.log || []).forEach((e, i) => { if (!e.d || !e.d.dials) return; const t = new Date(e.at); C.push({ x, e, fh: (t.getHours() - 7 + 24) % 24, wd: dow(t), att: Math.min(5, i + 1), own: e.d.owners ? 1 : 0 }); }));
  const by = (f) => { const m = {}; C.forEach((c) => { const k = f(c); if (k == null || k === '') return; const z = m[k] = m[k] || { n: 0, o: 0 }; z.n++; z.o += c.own; }); return Object.entries(m).map(([k, z]) => ({ k, n: z.n, o: z.o, r: labRate(z.o, z.n), raw: z.n ? z.o / z.n : 0 })); };
  return { C, hour: by((c) => c.fh).sort((a, b) => a.k - b.k), wd: by((c) => c.wd).sort((a, b) => a.k - b.k), county: by((c) => c.x.county || '').sort((a, b) => b.r - a.r), att: by((c) => c.att).sort((a, b) => a.k - b.k), tier: by((c) => c.x.tier || 'none').sort((a, b) => b.r - a.r) };
}
function labBest() { const L = labData(); if (L.C.length < 60) return null; const h = L.hour.filter((z) => z.n >= 10).sort((a, b) => b.r - a.r)[0]; return h ? Number(h.k) : null; }
function labTab() {
  const L = labData(), n = L.C.length, own = L.C.reduce((a, c) => a + c.own, 0), pct = Math.min(100, (n / 500) * 100);
  const bars = (rows, lbl) => { const mx = Math.max(0.05, ...rows.map((z) => z.r)); return `<div class="lab-b">${rows.map((z) => `<div title="${z.o}/${z.n} raw ${fmt(z.raw * 100, 1)}%"><i style="height:${(z.r / mx) * 100}%" class="${z.n < 15 ? 'thin' : ''}"></i><b>${fmt(z.r * 100, 1)}</b><span>${lbl(z.k)}</span><em>${z.n}</em></div>`).join('')}</div>`; };
  const tops = (rows, lbl) => rows.filter((z) => z.n >= 15).slice(0, 3).map((z) => `${lbl(z.k)} ${fmt(z.r * 100, 1)}%`).join(' · ');
  const rec = []; if (n >= 60) { const h = L.hour.filter((z) => z.n >= 10).sort((a, b) => b.r - a.r).slice(0, 2); if (h.length) rec.push(`Best Florida hours: ${h.map((z) => z.k + ':00').join(' and ')}. Put the 100-dial blocks there.`); const w = L.wd.filter((z) => z.n >= 15).sort((a, b) => b.r - a.r)[0]; if (w) rec.push(`Best weekday: ${DAY_SHORT[Number(w.k)]}.`); const a = L.att.find((z) => Number(z.k) >= 3); if (a && a.n >= 15) rec.push(`Attempt 3+ still reaches owners at ${fmt(a.r * 100, 1)}%: ${a.r >= LAB_PRIOR ? 'keep the cadence going' : 'consider stopping earlier'}.`); const c = L.county.filter((z) => z.n >= 20)[0]; if (c) rec.push(`Strongest county so far: ${c.k}.`); }
  return `<div class="card"><div class="card-h"><div class="card-t">Learning lab</div><div class="card-r">${n} calls · ${own} owner talks</div></div>
    <div class="lab-prog"><i style="width:${pct}%"></i></div><div class="xs muted" style="margin:6px 0 10px">${n < 500 ? `Learning: ${n}/500 calls. Rates are pulled toward your plan's 2.5% until each bucket has enough calls, so early luck does not fool you. Faded bars = under 15 calls.` : 'Trained on 500+ calls. Rates are your own.'}</div>
    ${rec.length ? `<div class="lab-rec">${rec.map((r) => `<div>→ ${esc(r)}</div>`).join('')}</div>` : `<div class="empty">Recommendations appear after 60 tapped calls (${n} so far). Every outcome you tap teaches it.</div>`}</div>
    <div class="sgrid st-g">
    <div class="card w2"><div class="card-h"><div class="card-t">Owner rate by Florida hour</div><div class="card-r">% · calls under each bar</div></div>${L.hour.length ? bars(L.hour, (k) => k + 'h') : '<div class="empty">No calls yet.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">By weekday</div></div>${L.wd.length ? bars(L.wd, (k) => DAY_SHORT[Number(k)].slice(0, 2)) : '<div class="empty">No calls yet.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">By attempt number</div><div class="card-r">does trying again pay?</div></div>${L.att.length ? bars(L.att, (k) => (k == 5 ? '5+' : '#' + k)) : '<div class="empty">No calls yet.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">By county</div><div class="card-r">${esc(tops(L.county, (k) => k) || '')}</div></div>${stTable(['County', 'Calls', 'Owner talks', 'Rate'], L.county.slice(0, 12).map((z) => ({ c: [esc(z.k), z.n, z.o, fmt(z.r * 100, 1) + '%'] })), { empty: 'No calls yet.' })}</div>
    <div class="card"><div class="card-h"><div class="card-t">By tier</div></div>${stTable(['Tier', 'Calls', 'Owner talks', 'Rate'], L.tier.map((z) => ({ c: [esc(z.k), z.n, z.o, fmt(z.r * 100, 1) + '%'] })), { empty: 'No calls yet.' })}</div></div>`;
}
/* a smart view that uses what the lab learned */
if (typeof CRM_VIEWS !== 'undefined') CRM_VIEWS.splice(4, 0, ['besthour', 'Best hour now', 'fresh Tampa Bay agencies, when your owner rate peaks', (x) => { const b = labBest(); const fh = (new Date().getHours() - 7 + 24) % 24; return b != null && Math.abs(fh - b) <= 1 && x.status === 'new' && !(x.attempts || 0) && !!telHref(x.phone) && (typeof inFocus !== 'function' || inFocus(x)); }]);

/* ───────── wire into the CRM screen and the agency record ───────── */
if (typeof renderCrm === 'function' && !renderCrm._ap) {
  const _r = renderCrm;
  renderCrm = function () { _r(); const el = $('view-crm'); if (!el) return; const tabs = el.querySelector('.crm-top .st-tabs'); if (tabs && !tabs.querySelector('[data-ap]')) { tabs.insertAdjacentHTML('beforeend', `<button data-ap="money" class="${crmTab === 'money' ? 'on' : ''}" onclick="crmTab='money';render()">Money</button><button data-ap="lab" class="${crmTab === 'lab' ? 'on' : ''}" onclick="crmTab='lab';render()">Learning lab</button>`); }
    if ((crmTab === 'money' || crmTab === 'lab') && !(crmQ || '').trim()) { const top = el.querySelector('.crm-top'); while (top && top.nextSibling) top.nextSibling.remove(); top.insertAdjacentHTML('afterend', crmTab === 'money' ? mlTab() : labTab()); } };
  renderCrm._ap = true;
}
if (typeof crmOpen === 'function' && !crmOpen._ap) {
  const _o = crmOpen;
  crmOpen = function (id) { _o(id); const x = Q.items[id], el = document.querySelector('.modal .crm-rec .crm-tl'); if (!x || !el) return; const P = (x.placements || []);
    el.previousElementSibling.insertAdjacentHTML('beforebegin', `<div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0 10px"><button class="btn sm" onclick="matchOpen(${id})">Match caregivers</button><button class="btn sm" onclick="closeModal();pipelineModal(${id})">Log trial / first shift / plan</button></div>${P.length ? `<div class="sec-h">Placements</div>${P.map((p, i) => `<div class="kv"><span class="small">${esc(p.cg || 'Caregiver')} · ${esc(p.what || '')} · since ${fmtShort(pd(p.at))}</span><span class="v"><button class="btn sm" onclick="mlShift(${id},${i},1)">+1 shift</button> <b>${p.shifts || 1}</b>/5 ${p.inv ? '· invoiced' : (p.shifts || 1) >= 5 && mlPrice(x, p) ? `<button class="btn sm primary" onclick="mlInvoice(${id},${i})">Invoice $${mlPrice(x, p)}</button>` : ''}</span></div>`).join('')}` : ''}`); };
  crmOpen._ap = true;
}
if (typeof CRM_EV !== 'undefined') CRM_EV.profiles = ['Profiles', 'var(--ok)'];
