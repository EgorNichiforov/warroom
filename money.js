/* War Room 9.2 · MONEY — "How much do I actually have?"
   Researched: YNAB (reconcile: you count, the app records the difference), PocketGuard ("In My Pocket": cash + expected income
   − bills − savings = safe to spend, per day), Monarch / Copilot (net worth, cash flow, recurring, month review),
   Wallet by BudgetBakers (manual-first accounts, multi-currency, planned payments + balance forecast).
   Model: accounts (cash/card/savings, MDL/USD/EUR) + a ledger of transactions (in / out / move / count).
   Balance = your last count + everything logged after it. Every count shows what went unlogged.
   The old per-day money fields (HQ card, Stats → Money, quick spend) now read and write this ledger. */
'use strict';
let mnTab = 'over', mnFilter = { q: '', type: '', acc: '', m: '' };
const MN_IN = (typeof MONEY_IN !== 'undefined' ? MONEY_IN : [['tennis', 'Tennis'], ['agency', 'Agency']]).concat([['family', 'Family / gifts'], ['other_in', 'Other income']]);
const MN_OUT = (typeof MONEY_OUT !== 'undefined' ? MONEY_OUT : []).concat([['subs', 'Subscriptions'], ['school', 'School'], ['phone', 'Phone & internet']]);
const MN_KW = [[/tennis|lesson|lec(t|ț)i|grup|antren/, 'tennis'], [/agency|client|egorflow|bench|invoice/, 'agency'], [/mom|mama|dad|tata|gift|cadou|family/, 'family'],
  [/food|lunch|dinner|eat|cafe|coffee|shaorma|pizza|grocer|market|linella|nr\s?1|kaufland|mancare|protein bar/, 'food'], [/taxi|bus|troll|maxi|fuel|benzin|transport|uber|yandex|bolt|parking/, 'transport'],
  [/gym|protein|creatin|doctor|pharma|farmac|medic|sport/, 'gym'], [/bar|party|cinema|friends|club|date|out/, 'out'], [/cloth|shoe|shop|haine|amazon|temu|aliexpress/, 'shopping'],
  [/ads|domain|software|apollo|cloudtalk|business|leads|vercel|supabase/, 'business'], [/netflix|spotify|claude|chatgpt|subscription|youtube|icloud|abonament/, 'subs'], [/school|book|tutor|carte|exam|bac|ielts|cambridge/, 'school'], [/phone|internet|orange|moldcell|unite|starnet/, 'phone']];
function mnCatName(id) { return ((MN_IN.concat(MN_OUT)).find((x) => x[0] === id) || [id, id ? id[0].toUpperCase() + id.slice(1) : 'Other'])[1]; }
function mnFx(cur) { const fx = (S.settings.fx || {}); return cur === 'USD' ? Number(fx.USD) || 17.8 : cur === 'EUR' ? Number(fx.EUR) || 19.3 : 1; }
function mnB(v, cur) { return (Number(v) || 0) * mnFx(cur || 'MDL'); }
function mnF(v, cur, sign) { const n = Math.round(Number(v) || 0), s = sign && n > 0 ? '+' : n < 0 ? '−' : ''; return `${s}${fmt(Math.abs(n))} ${cur === 'USD' ? '$' : cur === 'EUR' ? '€' : 'MDL'}`; }

/* ═════════ data ═════════ */
function mnInit() {
  if (!S.accounts) S.accounts = {}; if (!S.txns) S.txns = {}; if (!S.mplan) S.mplan = {};
  if (!Object.values(S.accounts).some((a) => a && !a._del)) [['cash', 'Cash · lei', 'MDL', 'cash'], ['card', 'Card · lei', 'MDL', 'card'], ['usd', 'Cash · dollars', 'USD', 'cash']].forEach(([id, name, cur, type], i) => (S.accounts[id] = { id, _u: 1, name, cur, type, order: i }));
}
function mnAccs() { mnInit(); return Object.values(S.accounts).filter((a) => a && !a._del && !a.archived).sort((a, b) => (a.order || 0) - (b.order || 0)); }
function mnTx() { mnInit(); return Object.values(S.txns).filter((t) => t && !t._del); }
function mnSeq(t) { return t.date + '|' + String(t.at || 0).padStart(15, '0'); }
function mnBal(acc) {
  const T = mnTx(), counts = T.filter((t) => t.type === 'count' && t.acc === acc).sort((a, b) => (mnSeq(a) < mnSeq(b) ? -1 : 1)), last = counts[counts.length - 1];
  let bal = last ? Number(last.amt) || 0 : 0, n = 0;
  T.forEach((t) => { if (t.type === 'count' || (last && mnSeq(t) <= mnSeq(last))) return; const a = Number(t.amt) || 0; if (t.acc === acc) { if (t.type === 'in') { bal += a; n++; } else if (t.type === 'out' || t.type === 'move') { bal -= a; n++; } } if (t.type === 'move' && t.to === acc) { bal += Number(t.toAmt) || a; n++; } });
  return { bal, counted: !!last, last, n, days: last ? lfDaysSafe(pd(last.date), new Date()) : null };
}
function lfDaysSafe(a, b) { const x = new Date(a); x.setHours(0, 0, 0, 0); const y = new Date(b); y.setHours(0, 0, 0, 0); return Math.round((y - x) / 864e5); }
function mnTotal() { let t = 0, any = false, all = true; mnAccs().forEach((a) => { const b = mnBal(a.id); if (b.counted) any = true; else all = false; t += mnB(b.bal, a.cur); }); return { t, any, all }; }
function mnAfter(keys) { [...new Set(keys.filter(Boolean))].forEach(mnRecalcDay); save(); render(); }
function mnRecalcDay(k) {
  const T = mnTx().filter((t) => t.date === k && (t.type === 'in' || t.type === 'out'));
  const o = S.days[k]; if (!o && !T.length) return; const d = day(k), m = {};
  T.forEach((t) => { const c = t.cat || (t.type === 'in' ? 'other_in' : 'other'); m[c] = (m[c] || 0) + Math.round(mnB(t.amt, mnAccCur(t.acc))); });
  d.money = m; d.income = T.filter((t) => t.type === 'in').reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); d.spent = T.filter((t) => t.type === 'out').reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); d.income = Math.round(d.income); d.spent = Math.round(d.spent); touch(d);
}
function mnAccCur(id) { const a = S.accounts && S.accounts[id]; return a ? a.cur : 'MDL'; }
function mnDefAcc(cur) { const A = mnAccs(); return (A.find((a) => a.cur === (cur || 'MDL') && a.type === 'cash') || A.find((a) => a.cur === (cur || 'MDL')) || A[0] || {}).id; }
function mnPut(t) { mnInit(); t.id = t.id || uid(); t._u = now(); t.at = t.at || now(); S.txns[t.id] = t; return t; }

/* migrate the old per-day money fields into the ledger (deterministic ids → safe on every device) */
function mnMigrate() {
  mnInit(); const have = {}; mnTx().forEach((t) => { if (t.type === 'in' || t.type === 'out') { const key = t.date + '|' + t.cat; have[key] = (have[key] || 0) + mnB(t.amt, mnAccCur(t.acc)); } });
  let n = 0; const inIds = MN_IN.map((x) => x[0]);
  Object.entries(S.days).forEach(([k, o]) => { const m = o && o.money; if (!m) return; Object.entries(m).forEach(([c, v]) => { v = Number(v) || 0; const diff = Math.round(v - (have[k + '|' + c] || 0)); if (diff > 0) { const id = 'lg-' + k + '-' + c + (have[k + '|' + c] ? '-' + Math.round(have[k + '|' + c]) : ''); if (!S.txns[id]) { S.txns[id] = { id, _u: now(), at: new Date(k + 'T12:00:00').getTime(), date: k, type: inIds.includes(c) ? 'in' : 'out', amt: diff, acc: mnDefAcc('MDL'), cat: c, note: 'from the day log' }; n++; } } }); });
  if (n) save();
}
/* the old setMoney (HQ money card, Stats, quick spend, command bar) now writes the ledger */
if (typeof setMoney === 'function' && !setMoney._mn) {
  setMoney = function (k, key, v) {
    mnInit(); const target = v === '' ? 0 : Math.max(0, Number(v) || 0), inIds = MN_IN.map((x) => x[0]);
    const T = mnTx().filter((t) => t.date === k && t.cat === key && (t.type === 'in' || t.type === 'out')).sort((a, b) => b.at - a.at);
    let cur = T.reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0), diff = Math.round(target - cur);
    if (diff > 0) mnPut({ date: k, type: inIds.includes(key) ? 'in' : 'out', amt: diff, acc: mnDefAcc('MDL'), cat: key, note: '' });
    else if (diff < 0) { for (const t of T) { if (diff >= 0) break; const a = mnB(t.amt, mnAccCur(t.acc)); if (a <= -diff + 0.5) { t._del = true; t._u = now(); diff += a; } else { t.amt = Math.round((a + diff) / mnFx(mnAccCur(t.acc))); t._u = now(); diff = 0; } } }
    mnRecalcDay(k);
  };
  setMoney._mn = 1;
}

/* ═════════ quick entry: "spent 120 taxi", "+750 tennis", "45$ claude" ═════════ */
function mnParse(s) {
  const t = ' ' + String(s || '').toLowerCase().replace(',', '.') + ' ';
  const m = t.match(/([+-])?\s*(\d+(?:\.\d+)?)\s*(\$|usd|dollars?|€|eur|euro|lei|mdl)?/); if (!m) return null;
  const amt = Number(m[2]); if (!(amt > 0)) return null;
  const cur = /\$|usd|dollar/.test(m[3] || '') || /\$\s*\d/.test(t) ? 'USD' : /€|eur/.test(m[3] || '') ? 'EUR' : 'MDL';
  let type = m[1] === '+' || /\b(earned|got|received|income|paid me|salary|castig|primit)\b/.test(t) ? 'in' : 'out';
  if (/\b(move|moved|transfer|withdrew|withdraw|deposit|scos|depus)\b/.test(t)) type = 'move';
  let cat = ''; for (const [re, c] of MN_KW) if (re.test(t)) { cat = c; break; }
  if (type === 'in' && !MN_IN.some((x) => x[0] === cat)) cat = cat === '' ? 'other_in' : cat;
  if (type === 'out' && (!cat || MN_IN.some((x) => x[0] === cat))) { if (cat === 'tennis') cat = 'gym'; else cat = cat || 'other'; }
  if (type === 'in' && MN_OUT.some((x) => x[0] === cat)) type = 'out';
  const note = t.replace(m[0], ' ').replace(/\b(spent|paid|earned|got|received|on|for|lei|mdl)\b/g, ' ').replace(/\s+/g, ' ').trim();
  let acc = mnDefAcc(cur); const A = mnAccs(); if (/\bcard\b/.test(t)) acc = (A.find((a) => a.type === 'card' && a.cur === cur) || {}).id || acc;
  return { type, amt, cur, cat: type === 'move' ? '' : cat, note, acc };
}
function mnQuick(s) { const p = mnParse(s); if (!p) { toast('Try: "spent 120 taxi" · "+750 tennis" · "45$ claude"'); return false; } if (p.type === 'move') { mnEdit(null, p); return true; } mnPut({ date: dk(new Date()), type: p.type, amt: p.amt, acc: p.acc, cat: p.cat, note: p.note }); mnAfter([dk(new Date())]); toast(`${p.type === 'in' ? '+' : '−'}${mnF(p.amt, p.cur)} · ${mnCatName(p.cat)}`); return true; }

/* ═════════ count (reconcile) ═════════ */
function mnCountModal(acc) {
  const A = acc ? mnAccs().filter((a) => a.id === acc) : mnAccs();
  openModal(`<h2>Count your money</h2><div class="xs muted" style="margin-bottom:12px">Open your wallet and your card app. Type what is really there. The app sets your balance to that and shows how much went unlogged since the last count.</div>
    ${A.map((a) => { const b = mnBal(a.id); return `<div class="field"><label>${esc(a.name)} <span class="muted">· app thinks ${b.counted || b.n ? mnF(b.bal, a.cur) : 'unknown'}</span></label><input id="mc-${a.id}" type="number" inputmode="decimal" placeholder="${b.counted ? Math.round(b.bal) : ''}"></div>`; }).join('')}
    <button class="btn primary block" onclick="mnCountSave(${JSON.stringify(A.map((a) => a.id)).replace(/"/g, '&quot;')})">Save the count</button>`);
}
function mnCountSave(ids) {
  const msgs = []; ids.forEach((id) => { const el = $('mc-' + id); if (!el || el.value === '') return; const v = Number(el.value), a = S.accounts[id], b = mnBal(id), diff = v - b.bal;
    mnPut({ date: dk(new Date()), type: 'count', acc: id, amt: v, diff: b.counted ? Math.round(diff) : null, note: 'counted' });
    msgs.push(b.counted ? (Math.abs(diff) < 1 ? `${a.name}: matches ✓` : `${a.name}: ${mnF(diff, a.cur, true)} ${diff < 0 ? 'unlogged spending' : 'unlogged income'}`) : `${a.name}: starting balance ${mnF(v, a.cur)}`); });
  if (!msgs.length) { toast('Type at least one amount'); return; } closeModal(); save(); render(); toast(msgs.join(' · '));
}

/* ═════════ add / edit / delete a transaction ═════════ */
function mnEdit(id, pre) {
  const t = id ? S.txns[id] : Object.assign({ date: dk(new Date()), type: 'out', amt: '', acc: mnDefAcc('MDL'), cat: 'food', note: '' }, pre || {}), A = mnAccs();
  const catOpts = (type) => (type === 'in' ? MN_IN : MN_OUT).map(([v, l]) => `<option value="${v}" ${t.cat === v ? 'selected' : ''}>${l}</option>`).join('');
  openModal(`<h2>${id ? 'Edit' : 'Add'} ${t.type === 'count' ? 'count' : 'transaction'}</h2>
    ${t.type === 'count' ? '' : `<div class="mn-seg" id="me-type">${[['out', 'Spent'], ['in', 'Earned'], ['move', 'Move']].map(([v, l]) => `<button class="${t.type === v ? 'on' : ''}" data-v="${v}" onclick="mnEditType('${v}')">${l}</button>`).join('')}</div>`}
    <div class="field"><label>Amount</label><input id="me-a" type="number" inputmode="decimal" value="${t.amt}" style="font-size:28px;font-weight:700"></div>
    <div class="g2"><div class="field"><label>Date</label><input id="me-d" type="date" value="${t.date}"></div><div class="field"><label>${t.type === 'move' ? 'From' : 'Account'}</label><select id="me-acc">${A.map((a) => `<option value="${a.id}" ${t.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div></div>
    <div class="field ${t.type === 'move' ? '' : 'hidden'}" id="me-tow"><label>To</label><select id="me-to">${A.map((a) => `<option value="${a.id}" ${t.to === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select><input id="me-ta" type="number" inputmode="decimal" placeholder="amount received (if a different currency)" value="${t.toAmt || ''}" style="margin-top:6px"></div>
    <div class="field ${t.type === 'move' || t.type === 'count' ? 'hidden' : ''}" id="me-cw"><label>Category</label><select id="me-c">${catOpts(t.type === 'in' ? 'in' : 'out')}</select></div>
    <div class="field"><label>Note</label><input id="me-n" value="${esc(t.note || '')}"></div>
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="mnSave('${id || ''}','${t.type}')">Save</button>${id ? `<button class="btn" id="me-del" onclick="mnDel('${id}')">Delete</button>` : ''}</div>`);
  window._mnType = t.type;
}
function mnEditType(v) { window._mnType = v; document.querySelectorAll('#me-type button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); $('me-tow').classList.toggle('hidden', v !== 'move'); $('me-cw').classList.toggle('hidden', v === 'move'); $('me-c').innerHTML = (v === 'in' ? MN_IN : MN_OUT).map(([x, l]) => `<option value="${x}">${l}</option>`).join(''); }
function mnSave(id, type0) {
  const type = window._mnType || type0, amt = Number($('me-a').value); if (!(amt > 0) && type !== 'count') { toast('Type an amount'); return; }
  const old = id ? S.txns[id] : null, keys = [old && old.date];
  const t = Object.assign(old || {}, { type, amt, date: $('me-d').value || dk(new Date()), acc: $('me-acc').value, note: $('me-n').value.trim() });
  if (type === 'move') { t.to = $('me-to').value; t.toAmt = Number($('me-ta').value) || null; t.cat = ''; if (t.to === t.acc) { toast('Pick two different accounts'); return; } } else if (type !== 'count') { t.cat = $('me-c').value; delete t.to; delete t.toAmt; }
  mnPut(t); keys.push(t.date); closeModal(); mnAfter(keys); toast(id ? 'Updated' : 'Added');
}
function mnDel(id) { const b = $('me-del'); if (b && !b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Tap again'; b.classList.add('danger'); return; } const t = S.txns[id]; if (!t) return; t._del = true; t._u = now(); closeModal(); mnAfter([t.date]); toast('Deleted'); }

/* ═════════ accounts ═════════ */
function mnAccEdit(id) {
  const a = id ? S.accounts[id] : { name: '', cur: 'MDL', type: 'cash' };
  openModal(`<h2>${id ? 'Edit account' : 'New account'}</h2><div class="field"><label>Name</label><input id="ma-n" value="${esc(a.name)}" placeholder="e.g. MAIB card, Savings"></div>
    <div class="g2"><div class="field"><label>Type</label><select id="ma-t">${[['cash', 'Cash'], ['card', 'Card / bank'], ['savings', 'Savings'], ['owed', 'Owed to me']].map(([v, l]) => `<option value="${v}" ${a.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Currency</label><select id="ma-c">${['MDL', 'USD', 'EUR'].map((c) => `<option ${a.cur === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="mnAccSave('${id || ''}')">Save</button>${id ? `<button class="btn" onclick="mnAccArchive('${id}')">Archive</button>` : ''}</div>`);
}
function mnAccSave(id) { mnInit(); const n = $('ma-n').value.trim(); if (!n) { toast('Name it'); return; } id = id || uid(); S.accounts[id] = Object.assign(S.accounts[id] || { id, order: mnAccs().length }, { name: n, type: $('ma-t').value, cur: $('ma-c').value, _u: now() }); save(); closeModal(); render(); }
function mnAccArchive(id) { const a = S.accounts[id]; if (!a) return; a.archived = true; a._u = now(); save(); closeModal(); render(); toast(a.name + ' archived (history kept)'); }
function mnFxModal() { const fx = S.settings.fx || {}; openModal(`<h2>Exchange rates</h2><div class="xs muted" style="margin-bottom:10px">Used to add dollars and euros into one lei total. Update when the rate moves.</div><div class="g2"><div class="field"><label>1 $ = MDL</label><input id="fx-u" type="number" step="0.01" value="${fx.USD || 17.8}"></div><div class="field"><label>1 € = MDL</label><input id="fx-e" type="number" step="0.01" value="${fx.EUR || 19.3}"></div></div><button class="btn primary block" onclick="S.settings.fx={USD:Number($('fx-u').value)||17.8,EUR:Number($('fx-e').value)||19.3};S.settings._u=now();save();closeModal();render()">Save</button>`); }

/* ═════════ planned (recurring) + forecast ═════════ */
function mnPlans() { mnInit(); return Object.values(S.mplan).filter((p) => p && !p._del && p.active !== false); }
function mnPlanEdit(id) {
  const p = id ? S.mplan[id] : { type: 'out', amt: '', acc: mnDefAcc('MDL'), cat: 'subs', note: '', every: 'month', next: dk(addDays(new Date(), 1)) };
  openModal(`<h2>${id ? 'Edit' : 'New'} planned ${p.type === 'in' ? 'income' : 'payment'}</h2><div class="xs muted" style="margin-bottom:10px">Rent, phone, subscriptions, lesson income, anything that repeats. It feeds "safe to spend" and the forecast.</div>
    <div class="mn-seg" id="mp-type">${[['out', 'Payment'], ['in', 'Income']].map(([v, l]) => `<button class="${p.type === v ? 'on' : ''}" onclick="window._mpT='${v}';document.querySelectorAll('#mp-type button').forEach(b=>b.classList.toggle('on',b===this));$('mp-c').innerHTML=(('${v}'==='in')?MN_IN:MN_OUT).map(([x,l])=>'<option value=&quot;'+x+'&quot;>'+l+'</option>').join('')">${l}</button>`).join('')}</div>
    <div class="field"><label>What</label><input id="mp-n" value="${esc(p.note)}" placeholder="e.g. Phone, Claude, Tue/Thu groups"></div>
    <div class="g2"><div class="field"><label>Amount</label><input id="mp-a" type="number" inputmode="decimal" value="${p.amt}"></div><div class="field"><label>Account</label><select id="mp-acc">${mnAccs().map((a) => `<option value="${a.id}" ${p.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div></div>
    <div class="g2"><div class="field"><label>Repeats</label><select id="mp-e">${[['week', 'Every week'], ['month', 'Every month'], ['once', 'Once']].map(([v, l]) => `<option value="${v}" ${p.every === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Next date</label><input id="mp-d" type="date" value="${p.next}"></div></div>
    <div class="field"><label>Category</label><select id="mp-c">${(p.type === 'in' ? MN_IN : MN_OUT).map(([v, l]) => `<option value="${v}" ${p.cat === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="mnPlanSave('${id || ''}')">Save</button>${id ? `<button class="btn" onclick="S.mplan['${id}']._del=true;S.mplan['${id}']._u=now();save();closeModal();render()">Delete</button>` : ''}</div>`);
  window._mpT = p.type;
}
function mnPlanSave(id) { mnInit(); const a = Number($('mp-a').value); if (!(a > 0)) { toast('Type an amount'); return; } id = id || uid(); S.mplan[id] = Object.assign(S.mplan[id] || { id, active: true }, { type: window._mpT || 'out', amt: a, acc: $('mp-acc').value, cat: $('mp-c').value, note: $('mp-n').value.trim(), every: $('mp-e').value, next: $('mp-d').value || dk(new Date()), _u: now() }); save(); closeModal(); render(); }
function mnNext(p, k) { const d = pd(k); if (p.every === 'week') return dk(addDays(d, 7)); if (p.every === 'month') { const n = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)); return dk(n); } return null; }
function mnOcc(until) { const out = []; mnPlans().forEach((p) => { let k = p.next, g = 0; while (k && k <= until && g++ < 60) { out.push({ p, k }); k = mnNext(p, k); } }); return out.sort((a, b) => (a.k < b.k ? -1 : 1)); }
function mnPost(id, skip) { const p = S.mplan[id]; if (!p) return; const k = p.next; if (!skip) { mnPut({ date: k > dk(new Date()) ? dk(new Date()) : k, type: p.type, amt: p.amt, acc: p.acc, cat: p.cat, note: p.note, plan: id }); } const n = mnNext(p, k); if (n) p.next = n; else p.active = false; p._u = now(); mnAfter([k, dk(new Date())]); toast(skip ? 'Skipped this one' : `${p.type === 'in' ? 'Received' : 'Paid'}: ${p.note || mnCatName(p.cat)}`); }
function mnAvgOut(days) { const from = dk(addDays(new Date(), -days)); const T = mnTx().filter((t) => t.type === 'out' && t.date > from && !t.plan); return T.reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0) / days; }
function mnAvgIn(days) { const from = dk(addDays(new Date(), -days)); const T = mnTx().filter((t) => t.type === 'in' && t.date > from && !t.plan); return T.reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0) / days; }
function mnSafe() {
  const t = new Date(), eom = new Date(t.getFullYear(), t.getMonth() + 1, 0), left = Math.max(1, lfDaysSafe(t, eom) + 1), T = mnTotal(), occ = mnOcc(dk(eom));
  const inc = occ.filter((o) => o.p.type === 'in').reduce((a, o) => a + mnB(o.p.amt, mnAccCur(o.p.acc)), 0), bills = occ.filter((o) => o.p.type === 'out').reduce((a, o) => a + mnB(o.p.amt, mnAccCur(o.p.acc)), 0);
  const goal = Number(S.settings.mnSave) || 0, ms = dk(new Date(t.getFullYear(), t.getMonth(), 1)), savAcc = mnAccs().filter((a) => a.type === 'savings').map((a) => a.id);
  const saved = mnTx().filter((x) => x.type === 'move' && savAcc.includes(x.to) && x.date >= ms).reduce((a, x) => a + mnB(x.toAmt || x.amt, mnAccCur(x.to)), 0), toSave = Math.max(0, goal - saved);
  const spendable = mnAccs().filter((a) => a.type !== 'savings' && a.type !== 'owed').reduce((s, a) => s + mnB(mnBal(a.id).bal, a.cur), 0);
  const safe = spendable + inc - bills - toSave; return { safe, perDay: safe / left, left, inc, bills, toSave, spendable, eom };
}
function mnForecast(days) {
  const start = mnTotal().t, avg = mnAvgOut(30), avgIn = mnPlans().some((p) => p.type === 'in') ? 0 : mnAvgIn(30), occ = mnOcc(dk(addDays(new Date(), days))), pts = []; let b = start;
  for (let i = 0; i <= days; i++) { const k = dk(addDays(new Date(), i)); if (i) b += avgIn - avg; occ.filter((o) => o.k === k).forEach((o) => (b += (o.p.type === 'in' ? 1 : -1) * mnB(o.p.amt, mnAccCur(o.p.acc)))); pts.push({ k, b }); }
  return { pts, avg, avgIn };
}

/* ═════════ reports ═════════ */
function mnMonth(ym) { const T = mnTx().filter((t) => t.date.slice(0, 7) === ym); const inn = T.filter((t) => t.type === 'in'), out = T.filter((t) => t.type === 'out'); const s = (L) => L.reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0); const cats = {}; out.forEach((t) => (cats[t.cat || 'other'] = (cats[t.cat || 'other'] || 0) + mnB(t.amt, mnAccCur(t.acc)))); const src = {}; inn.forEach((t) => (src[t.cat || 'other_in'] = (src[t.cat || 'other_in'] || 0) + mnB(t.amt, mnAccCur(t.acc)))); return { ym, earned: s(inn), spent: s(out), cats, src, n: T.length }; }
function mnYm(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
function mnMonthName(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); }

/* ═════════ screen ═════════ */
function renderMoney() {
  const el = $('view-money'); if (!el) return; mnInit(); if (!window._mnMig) { window._mnMig = 1; mnMigrate(); }
  const tabs = [['over', 'Overview'], ['wealth', 'Wealth'], ['tx', 'Transactions'], ['plan', 'Planned & forecast'], ['rep', 'Reports']];
  el.innerHTML = `<div class="crm-top"><div class="st-tabs">${tabs.map(([k, l]) => `<button class="${mnTab === k ? 'on' : ''}" onclick="mnTab='${k}';render()">${l}</button>`).join('')}</div></div>
    <div class="mn-quick"><input id="mn-q" placeholder='Log money: "spent 120 taxi" · "+750 tennis" · "45$ claude"' onkeydown="if(event.key==='Enter'&&mnQuick(this.value))this.value=''"><button class="btn primary" onclick="if(mnQuick($('mn-q').value))$('mn-q').value=''">Add</button><button class="btn" onclick="mnEdit()">Form</button></div>
    ${({ over: mnOver, wealth: () => (typeof wlTab === 'function' ? wlTab() : ''), tx: mnTxTab, plan: mnPlanTab, rep: mnRepTab }[mnTab] || mnOver)()}`;
}
function mnOver() {
  const T = mnTotal(), A = mnAccs(), now0 = new Date(), cm = mnMonth(mnYm(now0)), pm = mnMonth(mnYm(new Date(now0.getFullYear(), now0.getMonth() - 1, 1))), S0 = mnSafe();
  const cats = Object.entries(cm.cats).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...cats.map((c) => c[1]));
  const dlt = (a, b) => (b ? `<em class="${a > b ? 'up' : 'dn'}">${a >= b ? '+' : '−'}${Math.round(Math.abs((a - b) / b) * 100)}% vs last month</em>` : '');
  return `<div class="sgrid st-g">
    <div class="card mn-have"><div class="card-h"><div class="card-t">You have</div><div class="card-r">${T.all ? 'all accounts counted' : T.any ? 'some accounts not counted yet' : 'not counted yet'}</div></div>
      ${T.any ? `<div class="mn-big">${mnF(T.t)}</div>` : `<div class="mn-big muted">?</div><div class="small muted" style="margin-bottom:10px">The app only knows what you earned and spent. It can't know what you have until you count once.</div>`}
      <button class="btn primary block" onclick="mnCountModal()">${T.any ? 'Count again' : 'Count my money now'}</button>
      <div class="mn-accs">${A.map((a) => { const b = mnBal(a.id); return `<div class="mn-acc" onclick="mnCountModal('${a.id}')"><span>${esc(a.name)}</span><b>${b.counted ? mnF(b.bal, a.cur) : '<i>not counted</i>'}</b><em>${b.counted ? (b.days === 0 ? 'counted today' : `counted ${b.days} d ago`) + (b.n ? ` · ${b.n} since` : '') : 'tap to count'}${b.last && b.last.diff ? ` · last count ${mnF(b.last.diff, a.cur, true)} unlogged` : ''}</em></div>`; }).join('')}</div>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm ghost" onclick="mnAccEdit()">+ Account</button><button class="btn sm ghost" onclick="mnFxModal()">Rates: $ ${mnFx('USD')} · € ${mnFx('EUR')}</button></div></div>
    <div class="card"><div class="card-h"><div class="card-t">Safe to spend</div><div class="card-r">until ${fmtShort(S0.eom)}</div></div>
      ${T.any ? `<div class="mn-big ${S0.safe < 0 ? 'bad' : ''}">${mnF(S0.safe)}</div><div class="mn-pd">≈ <b>${mnF(S0.perDay)}</b> a day for ${S0.left} days</div>
      <div class="mn-math"><div><span>Spendable now (cash + cards)</span><b>${mnF(S0.spendable)}</b></div><div><span>+ planned income</span><b>${mnF(S0.inc)}</b></div><div><span>− planned payments</span><b>${mnF(S0.bills)}</b></div><div><span>− still to save this month</span><b>${mnF(S0.toSave)}</b></div></div>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm ghost" onclick="mnTab='plan';render()">Planned items</button><button class="btn sm ghost" onclick="mnSaveGoal()">Savings goal: ${mnF(Number(S.settings.mnSave) || 0)}/month</button></div>` : '<div class="empty">Count your money first. Then this shows what you can spend each day without breaking your plan.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">${now0.toLocaleDateString('en-GB', { month: 'long' })}</div><div class="card-r">${cm.n} entries</div></div>
      <div class="mn-3"><div><span>Earned</span><b class="ok">${mnF(cm.earned)}</b>${dlt(cm.earned, pm.earned)}</div><div><span>Spent</span><b class="bad">${mnF(cm.spent)}</b>${dlt(cm.spent, pm.spent)}</div><div><span>Kept</span><b>${mnF(cm.earned - cm.spent, 'MDL', true)}</b><em>${cm.earned ? Math.round(((cm.earned - cm.spent) / cm.earned) * 100) + '% of income' : ''}</em></div></div>
      ${cats.length ? `<div class="sec-h" style="margin-top:12px">Where it went</div>${cats.map(([c, v]) => `<div class="mn-cat" onclick="mnFilter={q:'',type:'out',acc:'',m:'${cm.ym}',cat:'${c}'};mnTab='tx';render()"><span>${esc(mnCatName(c))}</span><i><u style="width:${(v / mx) * 100}%"></u></i><b>${mnF(v)}</b></div>`).join('')}` : ''}</div>
    <div class="card w2"><div class="card-h"><div class="card-t">Latest</div><div class="card-r"><a href="#" onclick="mnTab='tx';render();return false">all transactions →</a></div></div>${mnRows(mnTx().filter((t) => t.type !== 'count').sort((a, b) => (mnSeq(a) < mnSeq(b) ? 1 : -1)).slice(0, 8))}</div></div>`;
}
function mnSaveGoal() { openModal(`<h2>Savings goal</h2><div class="xs muted" style="margin-bottom:10px">How much you want to move into a savings account each month. It's subtracted from "safe to spend" until you move it.</div><div class="field"><label>Per month (MDL)</label><input id="sg-v" type="number" value="${S.settings.mnSave || ''}"></div>${mnAccs().some((a) => a.type === 'savings') ? '' : '<div class="small muted" style="margin-bottom:10px">Tip: add an account of type Savings, then log a Move into it.</div>'}<button class="btn primary block" onclick="S.settings.mnSave=Number($('sg-v').value)||0;S.settings._u=now();save();closeModal();render()">Save</button>`); }
function mnRows(L) {
  if (!L.length) return '<div class="empty">Nothing yet. Type "spent 120 taxi" above, or tap Form.</div>';
  let last = ''; return L.map((t) => { const a = S.accounts[t.acc] || {}, hd = t.date !== last ? `<div class="mn-day">${fmtShort(pd(t.date))}</div>` : ''; last = t.date;
    const amt = t.type === 'count' ? `= ${mnF(t.amt, a.cur)}` : t.type === 'move' ? mnF(t.amt, a.cur) : mnF((t.type === 'in' ? 1 : -1) * t.amt, a.cur, true);
    return `${hd}<div class="mn-row t-${t.type}" onclick="mnEdit('${t.id}')"><span class="c">${t.type === 'count' ? 'Count' : t.type === 'move' ? 'Move → ' + esc((S.accounts[t.to] || {}).name || '') : esc(mnCatName(t.cat))}${t.note && t.note !== 'from the day log' ? `<em>${esc(t.note)}</em>` : ''}</span><span class="a">${esc(a.name || '')}</span><b>${amt}</b></div>`; }).join('');
}
function mnTxTab() {
  const f = mnFilter, months = [...new Set(mnTx().map((t) => t.date.slice(0, 7)))].sort().reverse();
  let L = mnTx().filter((t) => (!f.type || t.type === f.type) && (!f.acc || t.acc === f.acc || t.to === f.acc) && (!f.m || t.date.slice(0, 7) === f.m) && (!f.cat || t.cat === f.cat) && (!f.q || (mnCatName(t.cat) + ' ' + (t.note || '')).toLowerCase().includes(f.q.toLowerCase())));
  L.sort((a, b) => (mnSeq(a) < mnSeq(b) ? 1 : -1)); const tot = (ty) => L.filter((t) => t.type === ty).reduce((a, t) => a + mnB(t.amt, mnAccCur(t.acc)), 0);
  const sel = (key, opts) => `<select onchange="mnFilter.${key}=this.value;render()">${opts.map(([v, l]) => `<option value="${v}" ${f[key] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  return `<div class="card"><div class="mn-filt"><input placeholder="Search" value="${esc(f.q)}" onchange="mnFilter.q=this.value;render()">${sel('type', [['', 'All types'], ['out', 'Spent'], ['in', 'Earned'], ['move', 'Moves'], ['count', 'Counts']])}${sel('acc', [['', 'All accounts']].concat(mnAccs().map((a) => [a.id, a.name])))}${sel('m', [['', 'All months']].concat(months.map((m) => [m, mnMonthName(m)])))}${f.cat ? `<button class="btn sm" onclick="mnFilter.cat='';render()">${esc(mnCatName(f.cat))} ×</button>` : ''}</div>
    <div class="mn-tot"><span>${L.length} entries</span><span class="ok">+${fmt(Math.round(tot('in')))}</span><span class="bad">−${fmt(Math.round(tot('out')))}</span></div>${mnRows(L.slice(0, 300))}${L.length > 300 ? '<div class="small muted">Showing the latest 300. Use the filters.</div>' : ''}</div>`;
}
function mnPlanTab() {
  const P = mnPlans().sort((a, b) => (a.next < b.next ? -1 : 1)), F = mnForecast(60), pts = F.pts, lo = Math.min(0, ...pts.map((p) => p.b)), hi = Math.max(1, ...pts.map((p) => p.b)), X = (i) => 10 + (i / (pts.length - 1)) * 580, Y = (v) => 150 - ((v - lo) / (hi - lo || 1)) * 136;
  const neg = pts.find((p) => p.b < 0), T = mnTotal();
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Forecast · next 60 days</div><div class="card-r">${T.any ? `today ${mnF(pts[0].b)} → ${fmtShort(pd(pts[pts.length - 1].k))} ${mnF(pts[pts.length - 1].b)}` : 'count your money first'}</div></div>
    <svg viewBox="0 0 600 170" class="mn-fc"><line x1="10" x2="590" y1="${Y(0)}" y2="${Y(0)}" class="z"/><path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(p.b)).join('')}" class="ln"/>${mnOcc(pts[pts.length - 1].k).map((o) => { const i = pts.findIndex((p) => p.k === o.k); return i >= 0 ? `<circle cx="${X(i)}" cy="${Y(pts[i].b)}" r="3.5" class="${o.p.type}"/>` : ''; }).join('')}</svg>
    <div class="xs muted">Line = today's balance + planned items (dots) ${F.avgIn ? `+ your average income (${mnF(F.avgIn)}/day, no planned income set) ` : ''}− your average day-to-day spending (${mnF(F.avg)}/day, last 30 days).${neg ? ` <b class="bad">Goes below zero around ${fmtShort(pd(neg.k))}.</b>` : ''}</div></div>
    <div class="card w2"><div class="card-h"><div class="card-t">Planned</div><div class="card-r"><button class="btn sm primary" onclick="mnPlanEdit()">+ Planned item</button></div></div>
      ${P.length ? P.map((p) => { const due = p.next <= dk(new Date()); return `<div class="mn-pl ${due ? 'due' : ''}"><span onclick="mnPlanEdit('${p.id}')"><b>${esc(p.note || mnCatName(p.cat))}</b><em>${p.every === 'once' ? 'once' : 'every ' + p.every} · next ${fmtShort(pd(p.next))}${due ? ' · due' : ''}</em></span><b class="${p.type === 'in' ? 'ok' : 'bad'}">${mnF((p.type === 'in' ? 1 : -1) * p.amt, mnAccCur(p.acc), true)}</b><span class="ac"><button class="btn sm ${due ? 'primary' : ''}" onclick="mnPost('${p.id}')">${p.type === 'in' ? 'Received' : 'Paid'}</button><button class="btn sm ghost" onclick="mnPost('${p.id}',true)">Skip</button></span></div>`; }).join('') : '<div class="empty">No planned items yet. Add the things that repeat: phone, subscriptions, transport pass, regular lesson income.</div>'}</div></div>`;
}
function mnRepTab() {
  const t = new Date(), M = []; for (let i = 8; i >= 0; i--) M.push(mnMonth(mnYm(new Date(t.getFullYear(), t.getMonth() - i, 1))));
  const mx = Math.max(1, ...M.map((m) => Math.max(m.earned, m.spent))), withData = M.filter((m) => m.n), avgE = withData.reduce((a, m) => a + m.earned, 0) / (withData.length || 1), avgS = withData.reduce((a, m) => a + m.spent, 0) / (withData.length || 1);
  const src = {}; M.forEach((m) => Object.entries(m.src).forEach(([k, v]) => (src[k] = (src[k] || 0) + v))); const cats = {}; M.forEach((m) => Object.entries(m.cats).forEach(([k, v]) => (cats[k] = (cats[k] || 0) + v)));
  const totE = M.reduce((a, m) => a + m.earned, 0), totS = M.reduce((a, m) => a + m.spent, 0);
  const counts = mnTx().filter((x) => x.type === 'count' && x.diff != null), leak = counts.reduce((a, x) => a + mnB(Math.min(0, x.diff), mnAccCur(x.acc)), 0);
  const list = (o, cls) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="mn-cat"><span>${esc(mnCatName(k))}</span><i><u class="${cls}" style="width:${(v / Math.max(...Object.values(o))) * 100}%"></u></i><b>${mnF(v)}</b></div>`).join('');
  return `<div class="sgrid st-g"><div class="card w2"><div class="card-h"><div class="card-t">Earned vs spent · 9 months</div><div class="card-r"><span class="mn-k ok">earned</span><span class="mn-k bad">spent</span></div></div>
    <div class="mn-bars">${M.map((m) => `<div title="${mnMonthName(m.ym)}: +${Math.round(m.earned)} / −${Math.round(m.spent)}"><div class="col"><i class="e" style="height:${(m.earned / mx) * 100}%"></i><i class="s" style="height:${(m.spent / mx) * 100}%"></i></div><b>${m.n ? fmt(Math.round((m.earned - m.spent) / 1000 * 10) / 10) + 'k' : ''}</b><span>${mnMonthName(m.ym).split(' ')[0]}</span></div>`).join('')}</div>
    <div class="mn-3" style="margin-top:12px"><div><span>Avg earned / month</span><b class="ok">${mnF(avgE)}</b></div><div><span>Avg spent / month</span><b class="bad">${mnF(avgS)}</b></div><div><span>Kept, 9 months</span><b>${mnF(totE - totS, 'MDL', true)}</b><em>${totE ? Math.round(((totE - totS) / totE) * 100) + '% savings rate' : ''}</em></div></div>
    <div class="xs muted" style="margin-top:8px">Numbers under the bars = kept that month (thousand MDL). Spending before October was mostly logged as "Other"; categories get sharper from here.</div></div>
    <div class="card"><div class="card-h"><div class="card-t">Where money came from</div></div>${list(src, 'ok') || '<div class="empty">No income logged.</div>'}</div>
    <div class="card"><div class="card-h"><div class="card-t">Where it went</div></div>${list(cats, 'bad') || '<div class="empty">No spending logged.</div>'}
      ${counts.length ? `<div class="lf-call">Unlogged spending found by your counts: <b>${mnF(-leak)}</b>. That's money that left without a trace. Logging at the moment of paying closes it.</div>` : ''}</div></div>`;
}

/* ARC: one sentence logs money too ("spent 120 taxi", "+750 tennis") */
if (typeof arcLogSave === 'function' && !arcLogSave._mn) {
  const _l = arcLogSave;
  arcLogSave = function () { const v = (($('arc-in') || $('arc-log') || {}).value || ''), el = document.querySelector('.arc-log'); const s = el ? el.value : v; if (/\b(spent|paid|earned|got|received|lei|mdl)\b|\$|€|^\s*[+-]\s*\d/.test(s.toLowerCase())) { if (mnQuick(s)) { closeModal(); arcRender(); } return; } return _l(); };
  arcLogSave._mn = 1;
}
setTimeout(() => { try { mnInit(); mnMigrate(); } catch (e) { console.warn('money', e); } }, 2500);
