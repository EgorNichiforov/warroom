/* War Room 13.12 · STAGE SCORECARD — the Scaling Roadmap applied per function, scored by evidence, not headcount.
   Each of the 8 functions has its own stage: 0 Improvise → 1 Monetize → 2 Advertise. A function moves up only when every
   exit test of its tier passes. The business stage = the lowest function. That function is THE CONSTRAINT, and its first
   failing test is the next action, shown on the Course page and on the Day screen.
   Auto tests read your real data (logged calls, demand, shifts, payments, bench, ledger). Manual tests are ticked by you
   with a date, only with proof. Stage names and the "8 functions" are from Acquisition.com's Scaling Roadmap; the tests
   are our application of it to Caregiver Bench. */
'use strict';
const SF_STAGES = ['Improvise', 'Monetize', 'Advertise'];
const SF_FN = [
  ['sales', 'Sales', 'Turn owner conversations into paying agencies'],
  ['product', 'Product', 'The bench offer delivers a result agencies feel'],
  ['leads', 'Leads', 'Enough of the right owners hear about you, every week'],
  ['recruit', 'Recruiting', 'Screened caregivers ready before they are needed'],
  ['service', 'Client service', 'What happens after yes: fast, predictable, visible'],
  ['finance', 'Finance', 'Get paid legally, know every lei, know your unit economics'],
  ['hr', 'Team', 'Your own role first, then the first hire'],
  ['it', 'IT & systems', 'Only the tools sales and delivery need'],
];
/* priority when two functions are equally low: the one nearest to cash goes first */
const SF_ORDER = ['sales', 'product', 'leads', 'recruit', 'service', 'finance', 'hr', 'it'];

function sfEv() {
  const e = (typeof acqEv === 'function' ? acqEv() : {}) || {};
  let items = []; try { items = qItems(); } catch (x) { }
  const today = dk(new Date()), d7 = dk(addDays(new Date(), -6));
  const logs = items.flatMap((x) => (x.log || []).map((l) => ({ x, l })));
  e.att7 = logs.filter((o) => (!o.l.d || o.l.d.dials) && String(o.l.at || '').slice(0, 10) >= d7).length;
  e.withPhone = items.filter((x) => (x.phone || '').replace(/\D/g, '').length >= 7).length;
  e.fresh = items.filter((x) => x.status === 'new' && (x.phone || '').replace(/\D/g, '').length >= 7).length;
  e.placedAg = items.filter((x) => (x.placements || []).some((p) => (p.cg || '').trim() && p.at && String(p.at).slice(0, 10) <= today)).length;
  e.paidAg = items.filter((x) => ((x.client || {}).invoices || []).some((v) => v.status === 'paid' && v.paidAt && Number(v.amount) > 0)).length;
  try { e.members = members().length; } catch (x) { e.members = 0; }
  /* weeks (Mon–Sun) with ≥350 dials, counted back from last full week */
  const wk = (n) => { let s = 0; const t = new Date(); const mon = addDays(t, -((t.getDay() + 6) % 7) - 7 * n); for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(mon, i))]; s += Number(o && o.counters && o.counters.dials) || 0; } return s; };
  e.weeks350 = 0; for (let n = 1; n <= 8; n++) { if (wk(n) >= 350) e.weeks350++; else break; }
  e.dialsThisWeek = wk(0);
  const days = (fn) => Object.keys(S.days || {}).filter((k) => k >= dk(addDays(new Date(), -13)) && fn(S.days[k] || {})).length;
  e.readDays = Object.keys(S.days || {}).filter((k) => ((S.days[k] || {}).counters || {}).reads > 0).length;
  const appW = (n) => { let s = 0; const t = new Date(); const mon = addDays(t, -((t.getDay() + 6) % 7) - 7 * n); for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(mon, i))]; s += Number(o && o.counters && o.counters.applicants) || 0; } return s; };
  e.appWeeks = 0; for (let n = 1; n <= 6; n++) { if (appW(n) >= 10) e.appWeeks++; else break; }
  const tx = Object.values(S.txns || {}).filter((t) => t && !t._del && t.date);
  e.ledgerDays14 = new Set(tx.filter((t) => t.date >= dk(addDays(new Date(), -13))).map((t) => t.date)).size;
  e.sops = (typeof pbAll === 'function' ? pbAll() : []).filter((p) => /^sop-/.test(p.id) && (p.body || '').length > 300).length;
  e.has = (id) => { try { const p = pb(id); return !!(p && (p.body || '').length > 200); } catch (x) { return false; } };
  void days; return e;
}
/* tests: [id, fn, tier(1|2), text, auto (e) → [have, need] | true/false | null (= manual), why] */
const SF_T = [
  /* SALES */
  ['s-script', 'sales', 1, 'Owner script written and read out loud on 5+ days', (e) => [e.has('script-owner') ? Math.min(5, e.readDays) : 0, 5], 'Frame and script before volume. Reps make the words yours.'],
  ['s-dm10', 'sales', 1, '10 qualified decision-maker conversations (written down, never email)', (e) => [e.dm || 0, 10], 'Ten show which need repeats.'],
  ['s-offer', 'sales', 1, 'First offer made with the price said out loud, then 8 seconds of silence', null, 'Until you ask, it is research, not sales.'],
  ['s-paid3', 'sales', 2, '3 paying agencies', (e) => [Math.max(e.paidAg || 0, e.members || 0), 3], 'One can be luck. Three is a process.'],
  ['s-rate', 'sales', 2, 'Close rate known over at least 10 offers', null, 'You can only improve a number you measure.'],
  ['s-proof', 'sales', 2, '2 written client results you can say on every call', null, 'Proof raises perceived likelihood more than any pitch.'],
  /* PRODUCT */
  ['p-offer', 'product', 1, 'Offer written: dream outcome, guarantee, price, 30-Day Bench Trial terms', (e) => e.has('offer'), 'You cannot sell what is not defined.'],
  ['p-demand', 'product', 1, 'First concrete demand: a stated need + agreement to receive profiles', (e) => [e.demand || 0, 1], 'A pleasant call is not demand.'],
  ['p-shift', 'product', 1, 'A caregiver from your bench worked a shift for an agency (free is fine)', (e) => [e.working || 0, 1], 'Improvise ends when someone gets the result.'],
  ['p-3ag', 'product', 2, '3 different agencies had a bench caregiver work', (e) => [e.placedAg || 0, 3], 'Repeatable result, not a one-off.'],
  ['p-renew', 'product', 2, 'First paying agency stays for month 2', null, 'Retention is the truth about the product.'],
  ['p-fix', 'product', 2, 'The #1 complaint is known and fixed', null, 'Stabilize starts with the top complaint.'],
  /* LEADS */
  ['l-list', 'leads', 1, '300+ agencies with a phone number in the list', (e) => [e.withPhone || 0, 300], 'No list, no Rule of 100.'],
  ['l-r100', 'leads', 1, 'Rule of 100 started: 350 logged attempts in the last 7 days', (e) => [e.att7 || 0, 350], 'More before better before new.'],
  ['l-4wk', 'leads', 2, '4 weeks in a row at 350+ dials', (e) => [e.weeks350 || 0, 4], 'Consistency is the channel.'],
  ['l-rates', 'leads', 2, 'Funnel rates known from 500+ logged attempts', (e) => [e.attempts || 0, 500], 'Then you know what to fix: connect, conversation or close.'],
  ['l-runway', 'leads', 2, '4 weeks of fresh leads ready (1,400 numbers not yet called)', (e) => [e.fresh || 0, 1400], 'Never let the list be the reason you stop.'],
  ['l-ref', 'leads', 2, 'A second lead source tested: referral ask or a partner', null, 'Lead getters multiply you.'],
  /* RECRUITING */
  ['r-script', 'recruit', 1, 'Caregiver screening script written', (e) => e.has('script-screen'), 'Same questions every time, so the bench is comparable.'],
  ['r-5', 'recruit', 1, '5 screened caregivers with consent in the focus area', (e) => [e.benchOk || 0, 5], 'Enough to answer the first real request the same day.'],
  ['r-15', 'recruit', 2, '15 screened and ready caregivers', (e) => [e.bench || 0, 15], 'The bench must be deeper than the demand.'],
  ['r-flow', 'recruit', 2, '10+ applicants a week, 3 weeks running', (e) => [e.appWeeks || 0, 3], 'A source that keeps flowing, not one lucky post.'],
  /* CLIENT SERVICE */
  ['c-sop', 'service', 1, 'After-yes steps written (what happens in the first 24 hours)', (e) => e.has('sop-after-yes'), 'The best close is great onboarding.'],
  ['c-24h', 'service', 1, 'First agency onboarded within 24 hours of yes', null, 'Speed is the first proof you deliver.'],
  ['c-72h', 'service', 2, 'First candidate sent within 72 hours on 3 requests', null, 'Time delay is in the denominator.'],
  ['c-weekly', 'service', 2, 'Weekly update sent to every client, 4 weeks running', null, 'Visible work keeps clients.'],
  /* FINANCE */
  ['f-legal', 'finance', 1, 'A legal way to get paid confirmed (invoicing route + accountant OK)', null, 'No way to get paid, no Monetize.'],
  ['f-price', 'finance', 1, 'Price and gross margin per plan written', (e) => e.has('pricewhy'), 'Services should run at 80%+ gross margin.'],
  ['f-ledger', 'finance', 1, 'Every lei logged: ledger entries on 10 of the last 14 days', (e) => [e.ledgerDays14 || 0, 10], 'Margin first: you cannot manage what you do not count.'],
  ['f-paid', 'finance', 2, 'First cleared payment received', (e) => [e.paid || 0, 1], 'Money in the bank, not a promise.'],
  ['f-cac', 'finance', 2, 'CAC and LTGP : CAC worked out from real numbers (≥ 3 : 1)', null, 'Know what a client costs and what it is worth.'],
  ['f-30', 'finance', 2, '30-day gross profit beats CAC (client-financed acquisition, level 2)', null, 'Then you never fund growth with your own money.'],
  /* TEAM */
  ['h-role', 'hr', 1, 'Your own role card: what only you do, and the weekly hours for it', null, 'Before hiring anyone, define your own job.'],
  ['h-cal', 'hr', 1, 'Dial, bench and study blocks in the calendar at fixed times', null, 'Your schedule is your first employee.'],
  ['h-first', 'hr', 2, 'First hire defined: screener role, scorecard, pay tied to results', (e) => e.has('sop-hire') ? null : false, 'Stabilize = the first person who does delivery without you.'],
  ['h-sops', 'hr', 2, '5 delivery steps documented so someone else could run them', (e) => [e.sops || 0, 5], 'Documented work can be handed over.'],
  /* IT */
  ['i-log', 'it', 1, 'Every call attempt logged in the dialer', (e) => [Math.min(1, e.attempts || 0), 1], 'Data before opinions.'],
  ['i-bench', 'it', 1, 'Bench tracker in use (caregivers recorded)', (e) => { try { return [Math.min(1, bItems().length), 1]; } catch (x) { return [0, 1]; } }, 'One place for supply.'],
  ['i-inv', 'it', 2, 'Invoices and payments tracked in the app', (e) => [Math.min(1, e.paid || 0), 1], 'Finance needs it at Monetize, not before.'],
];
function sfState(t, e) {
  const man = acqV('sf:' + t[0], null);
  let auto = null; try { auto = t[4] ? t[4](e) : null; } catch (x) { auto = null; }
  if (Array.isArray(auto)) { const [h, n] = auto; return { ok: h >= n, have: h, need: n, auto: true }; }
  if (auto === true) return { ok: true, auto: true };
  if (auto === false) return { ok: !!man, man: !!man, at: man };
  return { ok: !!man, man: !!man, at: man };
}
function sfScore() {
  const e = sfEv(), F = {};
  SF_FN.forEach(([k, n, d]) => {
    const T = SF_T.filter((t) => t[1] === k).map((t) => Object.assign({ t }, sfState(t, e)));
    const t1 = T.filter((x) => x.t[2] === 1), t2 = T.filter((x) => x.t[2] === 2);
    const lvl = t1.every((x) => x.ok) ? (t2.every((x) => x.ok) ? 2 : 1) : 0;
    const tier = lvl === 0 ? t1 : t2, next = lvl < 2 ? tier.find((x) => !x.ok) : null;
    F[k] = { k, n, d, lvl, T, t1, t2, next, done: tier.filter((x) => x.ok).length, of: tier.length };
  });
  const biz = Math.min(...Object.values(F).map((f) => f.lvl));
  const con = SF_ORDER.map((k) => F[k]).find((f) => f.lvl === biz);
  Object.values(F).forEach((f) => { f.ahead = f.lvl > biz; f.con = f === con; });
  return { F, biz, con, e };
}
function sfTick(id) { const v = acqV('sf:' + id, null); acqW('sf:' + id, v ? null : dk(new Date())); }
let sfOpen = null;
function sfProg(x) { return x.have != null ? `<em>${Math.min(x.have, x.need)}/${x.need}</em>` : ''; }
function sfTestRow(x) {
  const t = x.t, manual = !x.auto;
  return `<div class="sf-t ${x.ok ? 'ok' : ''}">${manual ? `<button class="sf-cb" onclick="sfTick('${t[0]}')" aria-label="tick">${x.ok ? '✓' : ''}</button>` : `<i class="sf-au">${x.ok ? '✓' : 'auto'}</i>`}<div><b>${esc(t[3])}</b><span>${esc(t[5])}${manual && x.at ? ` · ticked ${esc(x.at)}` : ''}${manual && !x.ok ? ' · tick only with proof' : ''}</span></div>${sfProg(x)}</div>`;
}
function sfCard(compact) {
  const sc = sfScore(), F = sc.F, c = sc.con, nx = c.next;
  const bar = (f) => `<div class="sf-bar">${SF_STAGES.map((s, i) => `<i class="${i < f.lvl ? 'done' : i === f.lvl ? (f.con ? 'con' : 'cur') : ''}"></i>`).join('')}</div>`;
  const rows = SF_ORDER.map((k) => F[k]).map((f) => `<div class="sf-row ${f.con ? 'con' : ''} ${sfOpen === f.k ? 'open' : ''}"><button class="sf-h" onclick="sfOpen=sfOpen==='${f.k}'?null:'${f.k}';render()"><span class="sf-n">${esc(f.n)}${f.con ? '<u>constraint</u>' : f.lvl > sc.biz + 0 && f.lvl - sc.biz >= 1 ? '<u class="ah">ahead</u>' : ''}</span>${bar(f)}<span class="sf-s">${SF_STAGES[f.lvl]}${f.lvl < 2 ? ` · ${f.done}/${f.of}` : ' ✓'}</span></button>
    ${sfOpen === f.k ? `<div class="sf-body"><div class="sf-d">${esc(f.d)}</div><div class="sf-tier">Exit Improvise → Monetize</div>${f.t1.map(sfTestRow).join('')}<div class="sf-tier">Exit Monetize → Advertise</div>${f.t2.map(sfTestRow).join('')}</div>` : ''}</div>`).join('');
  const left1 = SF_ORDER.reduce((a, k) => a + F[k].t1.filter((x) => !x.ok).length, 0), left2 = SF_ORDER.reduce((a, k) => a + F[k].t2.filter((x) => !x.ok).length, 0);
  const ahead = SF_ORDER.map((k) => F[k]).filter((f) => f.lvl > sc.biz);
  return `<div class="card sf"><div class="aq-t">Stage scorecard <span>8 functions, scored by evidence, not headcount</span></div>
    <div class="sf-top"><div><span>Business stage</span><b>${sc.biz} · ${SF_STAGES[sc.biz]}</b><em>= the lowest function</em></div><div class="hi"><span>Constraint</span><b>${esc(c.n)}</b><em>${nx ? esc(nx.t[3]) + (nx.have != null ? ` · ${Math.min(nx.have, nx.need)}/${nx.need}` : '') : 'all exit tests passed'}</em></div></div>
    <div class="sf-exit"><span>Leave Improvise: <b>${left1}</b> tests left</span><span>Leave Monetize: <b>${left1 + left2}</b> tests left</span></div>
    ${ahead.length ? `<div class="sf-warn">Ahead of the business: ${ahead.map((f) => esc(f.n)).join(', ')}. Hold them there: time spent on a function that is not the constraint does not move the stage.</div>` : ''}
    <div class="sf-rows">${rows}</div>
    <div class="vz-note">Tap a function for its exit tests. "auto" tests read your logged calls, demand, shifts, payments, bench and ledger; the others you tick, with a date, only when there is proof.</div></div>`;
}
/* the constraint, one line, on the Day screen */
function sfChip() { try { const sc = sfScore(), nx = sc.con.next; if (!nx) return ''; return `<button class="sf-chip" onclick="acqTab='scale';acqRead=null;sfOpen='${sc.con.k}';show('acq')"><span>🎯 Constraint · ${esc(sc.con.n)}</span><b>${esc(nx.t[3])}</b>${nx.have != null ? `<em>${Math.min(nx.have, nx.need)}/${nx.need}</em>` : ''}</button>`; } catch (e) { return ''; } }

(function () {
  /* stage everywhere = the scorecard's business stage (a manual override in Courses still wins) */
  if (typeof acqStage === 'function' && !acqStage._sf) { const f = acqStage; acqStage = function (e) { const man = acqV('sc:stage', null); if (man != null) return Number(man); try { return sfScore().biz; } catch (x) { return f.apply(this, arguments); } }; acqStage._sf = 1; }
  if (typeof acqScale === 'function' && !acqScale._sf) { const f = acqScale; acqScale = function () { const h = f.apply(this, arguments); const i = h.indexOf('<div class="card'); return i > 0 ? h.slice(0, i) + sfCard() + h.slice(i) : sfCard() + h; }; acqScale._sf = 1; }
  if (typeof arcHtml === 'function' && !arcHtml._sf) { const f = arcHtml; arcHtml = function () { const h = f.apply(this, arguments); const c = sfChip(); if (!c) return h; const m = h.match(/<(div|section)[^>]*id="gd"/); return m ? h.slice(0, m.index) + c + h.slice(m.index) : h; }; arcHtml._sf = 1; }
  const st = document.createElement('style'); st.id = 'sf-css';
  st.textContent = `.sf .aq-t{margin-bottom:10px}.sf-top{display:grid;grid-template-columns:1fr 1.6fr;gap:8px}.sf-top>div{border:1px solid #262B32;border-radius:6px;padding:10px;display:grid;gap:3px;min-width:0}.sf-top>div.hi{border-color:var(--acc);background:rgb(var(--acc-rgb) / .08)}
  .sf-top span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.sf-top b{font-size:19px;color:var(--text)}.sf-top .hi b{color:var(--acc)}.sf-top em{font-style:normal;font-size:12.5px;color:var(--muted);line-height:1.35}
  .sf-exit{display:flex;gap:14px;flex-wrap:wrap;margin:10px 2px 4px;font-size:12.5px;color:var(--muted)}.sf-exit b{color:var(--text)}
  .sf-warn{margin:8px 0 2px;padding:8px 10px;border-left:3px solid var(--red,#d06a5e);font-size:12.5px;line-height:1.4;color:var(--muted);background:rgb(208 106 94 / .06)}
  .sf-rows{display:grid;margin-top:8px}.sf-row{border-top:1px solid #15181C}.sf-h{display:grid;grid-template-columns:minmax(0,1.3fr) 1fr auto;gap:10px;align-items:center;width:100%;background:transparent;border:0;padding:11px 2px;cursor:pointer;font-family:inherit;color:var(--text);text-align:left}
  .sf-n{font-size:14px;font-weight:600;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf-n u{text-decoration:none;font:700 9.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:#000;background:var(--acc);padding:3px 5px;border-radius:2px}.sf-n u.ah{background:transparent;color:var(--red,#d06a5e);border:1px solid var(--red,#d06a5e)}
  .sf-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}.sf-bar i{height:7px;border-radius:2px;background:#1B1F24}.sf-bar i.done{background:var(--green,#8fae8b)}.sf-bar i.cur{background:rgb(var(--acc-rgb) / .35)}.sf-bar i.con{background:var(--acc)}
  .sf-s{font:600 11px/1 var(--mono,monospace);color:var(--muted);white-space:nowrap}.sf-row.con .sf-s{color:var(--acc)}
  .sf-body{padding:2px 2px 12px}.sf-d{font-size:12.5px;color:var(--muted);margin-bottom:6px}.sf-tier{font:700 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--acc);margin:12px 0 4px}
  .sf-t{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;padding:7px 0;border-top:1px dashed #1B1F24}.sf-t b{display:block;font-size:13px;font-weight:500;color:var(--text);line-height:1.35}.sf-t span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.35}.sf-t em{font:600 12px/1 var(--mono,monospace);font-style:normal;color:var(--muted)}.sf-t.ok b{color:var(--muted);text-decoration:line-through}.sf-t.ok em{color:var(--green,#8fae8b)}
  .sf-cb{width:26px;height:26px;border:1px solid var(--acc);border-radius:4px;background:transparent;color:var(--acc);cursor:pointer;font-weight:700}.sf-t.ok .sf-cb{background:var(--acc);color:#000}.sf-au{font:600 9px/1 var(--mono,monospace);font-style:normal;color:var(--muted);text-align:center;border:1px dashed #262B32;border-radius:4px;padding:8px 0}.sf-t.ok .sf-au{color:var(--green,#8fae8b);border-color:var(--green,#8fae8b);font-size:13px;padding:5px 0}
  .sf-chip{display:grid;grid-template-columns:1fr auto;gap:2px 10px;width:100%;text-align:left;margin:12px 0 0;padding:10px 12px;border:1px solid var(--acc);border-radius:10px;background:transparent;color:var(--ink,var(--text));cursor:pointer;font-family:inherit}.sf-chip span{grid-column:1/-1;font:700 10px/1.2 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}.sf-chip b{font-size:14px;font-weight:600;line-height:1.3}.sf-chip em{font:700 14px/1 var(--mono,monospace);font-style:normal;color:var(--acc);align-self:center}
  @media (max-width:560px){.sf-top{grid-template-columns:1fr}.sf-h{grid-template-columns:1fr 92px;grid-template-rows:auto auto}.sf-s{grid-column:1/-1}}`;
  document.head.appendChild(st);
})();
