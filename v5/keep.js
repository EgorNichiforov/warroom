/* War Room · keep.js — KEEP MODE (13.3.2, owner request 16 Nov 2026)
   The money screen used to answer "how much is safe to spend". Wrong question for the owner: he earned ~108k MDL
   since April and kept little. Keep mode (on by default) answers "how much did I keep, and did I spend on wants".
   · Needs (allowed): groceries/food at home, transport, school/BAC, gym & health, phone, business tools, bills & taxes, subscriptions.
   · Wants (budget 0): eating out & cafés, going out, shopping.
   · Wait list: want something? Write it down, wait 7 days, decide at the Sunday review. Dropped items count as money kept.
   No new data model: categories + S.settings.mnKeepOff / mnWait. */
(function () {
  if (typeof MN_KW === 'undefined') return;
  MN_KW.unshift([/caf[eé]|coffee|cofe|shaorma|shawarma|pizza|restaurant|restoran|mcdonald|mc ?d|kfc|burger|sushi|glovo|bolt food|starbucks|andy'?s|la pl[aă]cinte|eat out|ate out|takeaway|delivery/, 'eatout']);
  MN_KW.unshift([/\btax(es)?\b|impozit|fisc|bill|factur|utilit|\brent\b|chirie/, 'bills']);
  if (!MN_OUT.some((c) => c[0] === 'eatout')) MN_OUT.push(['eatout', 'Eating out & cafés'], ['bills', 'Bills & taxes']);
})();
const KP_WANTS = ['eatout', 'out', 'shopping'];
function kpOn() { return !(S.settings && S.settings.mnKeepOff); }
const KP_EAT = /caf[eé]|coffee|cofe|kofe|shaorma|shawarma|pizza|restaurant|restoran|mcdonald|kfc|burger|sushi|glovo|bolt food|starbucks|andy'?s|pl[aă]cinte|eat out|ate out|takeaway|delivery|snack bar|energy drink|redbull|red bull/i;
const KP_TAXI = /taxi|bolt|yandex|uber|iTaxi|cab\b/i;
/* a want = a want category, OR a café/eating-out note logged as food, OR a taxi (bus is the need), OR money that vanished without a log (found by a count) */
function kpIsWant(t) {
  if (!t) return false;
  if (t.type === 'count') return t.diff != null && mnB(t.diff, mnAccCur(t.acc)) < -100;
  if (t.type !== 'out' || t.plan) return false;
  const n = (t.note || '') + ' ' + (t.cat || '');
  return KP_WANTS.includes(t.cat) || (t.cat === 'food' && KP_EAT.test(n)) || (t.cat === 'transport' && KP_TAXI.test(n));
}
function kpAmt(t) { return t.type === 'count' ? -mnB(t.diff, mnAccCur(t.acc)) : mnB(t.amt, mnAccCur(t.acc)); }
function kpMonth(ym) {
  const T = mnTx().filter((t) => t.date.slice(0, 7) === ym), b = (t) => mnB(t.amt, mnAccCur(t.acc));
  const wants = T.filter(kpIsWant), needs = T.filter((t) => t.type === 'out' && !kpIsWant(t)), earned = T.filter((t) => t.type === 'in').reduce((a, t) => a + b(t), 0);
  const w = wants.reduce((a, t) => a + kpAmt(t), 0), n = needs.reduce((a, t) => a + b(t), 0);
  return { wants, needs, w, n, earned, kept: earned - w - n, pct: earned ? Math.round(((earned - w - n) / earned) * 100) : null };
}
/* honest streak: counts only from the day keep mode started (before that the app can't know), and breaks on any want,
   including money a count finds missing. Today only counts once the day is over. */
/* 13.3.4: the card works like a budgeting app (YNAB / Monarch style): savings rate first, a monthly budget for needs,
   wants budget 0. No streaks, no games. */
function kpNeedCats() { return MN_OUT.map((c) => c[0]).filter((c) => !KP_WANTS.includes(c)); }
function kpAvg3() { const avg = {}; for (let i = 1; i <= 3; i++) { const d = new Date(); const m = mnMonth(mnYm(new Date(d.getFullYear(), d.getMonth() - i, 1))); Object.entries(m.cats).forEach(([c, v]) => (avg[c] = (avg[c] || 0) + v / 3)); } return avg; }
function kpSuggest() { const avg = kpAvg3(), B = Object.assign({}, S.settings.mnBudgets || {}); kpNeedCats().forEach((c) => { if (!B[c] && avg[c]) B[c] = Math.ceil(avg[c] / 50) * 50; }); S.settings.mnBudgets = B; S.settings._u = now(); save(); mn2BudgetModal(); }
function kpCard() {
  const t = new Date(), ym = mnYm(t), M = kpMonth(ym), B = (S.settings.mnBudgets || {}), nc = kpNeedCats();
  const NB = nc.reduce((a, c) => a + (Number(B[c]) || 0), 0), dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(), frac = t.getDate() / dim;
  const proj = frac > 0 ? Math.round(M.n / frac) : M.n, left = NB - M.n, spent = M.n + M.w, month = t.toLocaleDateString('en-GB', { month: 'long' });
  const pct = NB ? Math.min(100, (M.n / NB) * 100) : 0, state = !NB ? '' : M.n > NB ? 'over' : proj > NB * 1.05 ? 'fast' : 'ok';
  const byCat = {}; M.needs.forEach((x) => (byCat[x.cat] = (byCat[x.cat] || 0) + mnB(x.amt, mnAccCur(x.acc))));
  const rows = nc.filter((c) => byCat[c] || B[c]).sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0));
  return `<div class="card kp">
    <div class="card-h"><div class="card-t">${month} · money plan</div><div class="card-r"><a href="#" onclick="kpSuggest();return false">budgets</a> · <a href="#" onclick="kpRules();return false">rules</a></div></div>
    <div class="kp-3">
      <div><span>Earned</span><b>${mnF(M.earned)}</b><em>logged this month</em></div>
      <div><span>Spent</span><b>${mnF(spent)}</b><em>needs ${mnF(M.n)} · wants ${mnF(M.w)}</em></div>
      <div><span>Saved</span><b class="${M.kept >= 0 ? 'ok' : 'bad'}">${mnF(M.kept, 'MDL', true)}</b><em>${M.pct != null ? M.pct + '% savings rate' : 'no income yet'}</em></div>
    </div>
    ${NB ? `<div class="kp-b"><div class="row sb small"><span>Needs budget</span><b>${mnF(M.n)} <em>/ ${mnF(NB)}</em></b></div>
      <div class="kp-bar"><u class="${state}" style="width:${pct}%"></u><i style="left:${frac * 100}%"></i></div>
      <div class="xs ${state === 'ok' ? 'muted' : 'bad'}">${left >= 0 ? `${mnF(left)} left for needs until ${fmtShort(new Date(t.getFullYear(), t.getMonth() + 1, 0))}` : `${mnF(-left)} over the needs budget`} · at this pace ${mnF(proj)} by month end${M.earned ? ` · plan saves ${mnF(M.earned - NB)}` : ''}</div></div>`
      : `<button class="btn primary block" style="margin:6px 0" onclick="kpSuggest()">Set this month's needs budget</button><div class="xs muted">Pre-filled from your last 3 months. Cut each line to what you really need.</div>`}
    ${rows.length ? `<div class="kp-cats">${rows.map((c) => { const v = byCat[c] || 0, bb = Number(B[c]) || 0; return `<div class="kp-c"><span>${esc(mnCatName(c))}</span><b>${mnF(v)}${bb ? `<em> / ${mnF(bb)}</em>` : ''}</b></div>`; }).join('')}</div>` : ''}
    <div class="kp-want ${M.w > 0 ? 'bad' : 'ok'}"><div class="row sb small"><span>Wants · budget 0</span><b>${mnF(M.w)}</b></div>
      <div class="xs muted">${M.wants.length ? M.wants.slice(-6).map((x) => esc((x.type === 'count' ? 'missing at a count' : (x.note || mnCatName(x.cat))) + ' ' + mnF(kpAmt(x)))).join(' · ') : 'Nothing this month. Eating out, coffee, taxis, going out and shopping land here.'}</div></div></div>`;
}
function kpRules() {
  openModal(`<h2>🔒 Keep mode: the rules</h2><div class="small" style="line-height:1.55">
    <b>Goal:</b> keep as much as possible. Money is ammunition for the business and for moving out in July 2027, not for this week's fun.<br><br>
    <b>Always OK (needs):</b> food at home, bus and transport (not taxis), school/BAC fees and certificates, gym & health, phone & internet, tools that bring money in, bills and taxes when they are due.<br><br>
    <b>Budget 0 (wants):</b> eating out, coffee, cafés, delivery, taxis (the bus is the need), going out, shopping, anything impulse. Money that disappears without a log counts as a want too: count your cash every Sunday.<br><br>
    <b>Want something?</b> Wait 7 days, then ask one question: does it make $20k MRR, BAC or 85 kg more likely? No → don't buy it.<br><br><b>Every month:</b> set the needs budget at the start (tap budgets), check it at each Sunday review, save as much of what you earn as possible.<br><br>
    <b>Every spend gets logged the same day</b> ("spent 45 shaorma"). What you don't log, you can't fix.</div>
    <button class="btn block" style="margin-top:12px" onclick="S.settings.mnKeepOff=!S.settings.mnKeepOff;S.settings._u=now();save();closeModal();render()">${kpOn() ? 'Turn keep mode off' : 'Turn keep mode on'}</button>`);
}
function kpLine() { const M = kpMonth(mnYm(new Date())); return `saved ${mnF(M.kept, 'MDL', true)}${M.pct != null ? ' (' + M.pct + '%)' : ''} · wants ${mnF(M.w)}`; }
/* the overview: keep card first, "safe to spend" replaced by "kept this month" */
if (typeof mnOver === 'function') {
  const _o = mnOver;
  mnOver = function () {
    let h = _o.apply(this, arguments); if (!kpOn()) return h;
    const M = kpMonth(mnYm(new Date()));
    h = h.replace(/<div><span>Safe to spend today<\/span>[\s\S]*?<\/em><\/div>/, `<div><span>Savings rate</span><b>${M.pct != null ? M.pct + '%' : '–'}</b><em>of what you earned this month</em></div>`);
    return h.replace('<div class="mn2">', '<div class="mn2">' + kpCard());
  };
}
/* logging a want: say it out loud */
if (typeof mnPut === 'function') {
  const _p = mnPut;
  mnPut = function (t) {
    const r = _p.apply(this, arguments);
    try { if (kpOn() && kpIsWant(r) && !r.plan) { const M = kpMonth(mnYm(new Date())); setTimeout(() => toast(`Want logged: ${mnF(kpAmt(r))}. Wants this month: ${mnF(M.w)} (budget 0). Next time → wait list.`), 50); } } catch (e) { }
    return r;
  };
}
(function () {
  const s = document.createElement('style');
  s.textContent = `.kp .kp-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 6px}.kp .kp-3 div{display:flex;flex-direction:column;gap:2px}
  .kp .kp-3 span{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}.kp .kp-3 b{font-size:20px}.kp .kp-3 em{font-size:11px;opacity:.6;font-style:normal}
  .kp b.ok{color:var(--ok,#4ade80)}.kp b.bad{color:var(--bad,#f87171)}
  .kp-b{margin:8px 0}.kp-b em,.kp-c em{opacity:.6;font-style:normal;font-weight:400}.kp-bar{position:relative;height:8px;border-radius:6px;background:rgba(255,255,255,.08);margin:6px 0 4px}.kp-bar u{display:block;height:100%;border-radius:6px;background:var(--ok,#4ade80)}.kp-bar u.fast{background:#f59e0b}.kp-bar u.over{background:var(--bad,#f87171)}.kp-bar i{position:absolute;top:-3px;width:2px;height:14px;background:currentColor;opacity:.5}.kp-cats{display:grid;gap:4px;margin:8px 0}.kp-c{display:flex;justify-content:space-between;gap:10px;font-size:13px}.kp-c b{white-space:nowrap}.kp-want{margin-top:8px;border-top:1px solid var(--line,rgba(255,255,255,.1));padding-top:8px}.kp-want.bad b{color:var(--bad,#f87171)}.kp-want.ok b{color:var(--ok,#4ade80)}`;
  document.head.appendChild(s);
})();
