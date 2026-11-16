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
function kpIsWant(t) { return t && t.type === 'out' && KP_WANTS.includes(t.cat); }
function kpMonth(ym) {
  const T = mnTx().filter((t) => t.type !== 'count' && t.date.slice(0, 7) === ym), b = (t) => mnB(t.amt, mnAccCur(t.acc));
  const wants = T.filter(kpIsWant), needs = T.filter((t) => t.type === 'out' && !kpIsWant(t)), earned = T.filter((t) => t.type === 'in').reduce((a, t) => a + b(t), 0);
  const w = wants.reduce((a, t) => a + b(t), 0), n = needs.reduce((a, t) => a + b(t), 0);
  return { wants, w, n, earned, kept: earned - w - n, pct: earned ? Math.round(((earned - w - n) / earned) * 100) : null };
}
function kpStreak() { const W = new Set(mnTx().filter(kpIsWant).map((t) => t.date)); let n = 0, d = new Date(); for (let i = 0; i < 365; i++) { if (W.has(dk(d))) break; n++; d = addDays(d, -1); } return n; }
function kpWait() { const w = (S.settings && S.settings.mnWait) || []; return Array.isArray(w) ? w : []; }
function kpSaveWait(w) { S.settings.mnWait = w; S.settings._u = now(); save(); render(); }
function kpWaitAdd() {
  openModal(`<h2>Wait list</h2><div class="xs muted" style="margin-bottom:10px">Write it down instead of buying it. In 7 days, at the Sunday review, you decide. Most wants are gone by then.</div>
    <div class="field"><label>What</label><input id="kpw-n" placeholder="e.g. new headphones, eating out with friends"></div>
    <div class="field"><label>Price (MDL)</label><input id="kpw-a" type="number" inputmode="decimal"></div>
    <div class="field"><label>Does it make $20k MRR, BAC or 85 kg more likely?</label><select id="kpw-g"><option value="no">No</option><option value="yes">Yes, and I can say how</option></select></div>
    <button class="btn primary block" onclick="kpWaitSave()">Put it on the wait list</button>`);
}
function kpWaitSave() { const n = $('kpw-n').value.trim(), a = Number($('kpw-a').value) || 0; if (!n) { toast('Write what it is'); return; } const w = kpWait().concat([{ id: uid(), n, a, g: $('kpw-g').value, d: dk(new Date()) }]); closeModal(); kpSaveWait(w); toast(`On the wait list. Decide on ${fmtShort(addDays(new Date(), 7))}.`); }
function kpWaitDone(id, how) { const w = kpWait().map((x) => (x.id === id ? Object.assign({}, x, { done: how, at: dk(new Date()) }) : x)); kpSaveWait(w); if (how === 'drop') toast('Dropped. That money stays yours.'); }
function kpCard() {
  const ym = mnYm(new Date()), M = kpMonth(ym), st = kpStreak(), W = kpWait(), open = W.filter((x) => !x.done), dropped = W.filter((x) => x.done === 'drop').reduce((a, x) => a + (x.a || 0), 0);
  const lim = (x) => Math.max(0, 7 - Math.round((new Date() - pd(x.d)) / 864e5));
  return `<div class="card kp ${M.w > 0 ? 'bad' : 'ok'}">
    <div class="card-h"><div class="card-t">🔒 Keep mode</div><div class="card-r"><a href="#" onclick="kpRules();return false">the rules</a></div></div>
    <div class="kp-3">
      <div><span>Kept this month</span><b class="${M.kept >= 0 ? 'ok' : 'bad'}">${mnF(M.kept, 'MDL', true)}</b><em>${M.pct != null ? M.pct + '% of what you earned' : 'no income logged yet'}</em></div>
      <div><span>Wants this month</span><b class="${M.w > 0 ? 'bad' : 'ok'}">${mnF(M.w)}</b><em>budget: 0 MDL</em></div>
      <div><span>Days without a want</span><b>${st}</b><em>${st >= 7 ? 'keep the streak' : 'build it'}</em></div>
    </div>
    ${M.wants.length ? `<div class="xs" style="margin:6px 0"><b>Wants this month:</b> ${M.wants.slice(-5).map((t) => esc((t.note || mnCatName(t.cat)) + ' ' + mnF(mnB(t.amt, mnAccCur(t.acc))))).join(' · ')}</div>` : ''}
    <div class="xs muted" style="margin:6px 0">Needs this month: <b>${mnF(M.n)}</b> (food at home, transport, school, gym, phone, business, bills & taxes). Wants = eating out, going out, shopping.</div>
    <div class="kp-wait"><div class="row sb"><b class="small">Wait list (7 days)</b><button class="btn sm" onclick="kpWaitAdd()">+ I want something</button></div>
      ${open.length ? open.map((x) => `<div class="kp-w"><span>${esc(x.n)}${x.a ? ' · ' + mnF(x.a) : ''}${x.g === 'no' ? ' · <em>not for a goal</em>' : ''}</span><span class="xs muted">${lim(x) ? lim(x) + ' d left' : 'decide now'}</span><span><button class="btn sm ghost" onclick="kpWaitDone('${x.id}','drop')">Drop</button>${lim(x) ? '' : `<button class="btn sm ghost" onclick="kpWaitDone('${x.id}','buy')">Buy</button>`}</span></div>`).join('') : '<div class="xs muted">Empty. Next time you want something, put it here instead of buying it.</div>'}
      ${dropped ? `<div class="xs ok" style="margin-top:6px">Dropped from the wait list so far: <b>${mnF(dropped)}</b> kept.</div>` : ''}</div></div>`;
}
function kpRules() {
  openModal(`<h2>🔒 Keep mode: the rules</h2><div class="small" style="line-height:1.55">
    <b>Goal:</b> keep as much as possible. Money is ammunition for the business and for moving out in July 2027, not for this week's fun.<br><br>
    <b>Always OK (needs):</b> food at home, transport, school/BAC fees and certificates, gym & health, phone & internet, tools that bring money in, bills and taxes when they are due.<br><br>
    <b>Budget 0 (wants):</b> eating out, cafés, delivery, going out, shopping, anything impulse.<br><br>
    <b>Want something?</b> Put it on the wait list. 7 days. Decide at the Sunday review with one question: does it make $20k MRR, BAC or 85 kg more likely? No → drop it.<br><br>
    <b>Every spend gets logged the same day</b> ("spent 45 shaorma"). What you don't log, you can't fix.</div>
    <button class="btn block" style="margin-top:12px" onclick="S.settings.mnKeepOff=!S.settings.mnKeepOff;S.settings._u=now();save();closeModal();render()">${kpOn() ? 'Turn keep mode off' : 'Turn keep mode on'}</button>`);
}
function kpLine() { const M = kpMonth(mnYm(new Date())); return `kept ${mnF(M.kept, 'MDL', true)} · wants ${mnF(M.w)}`; }
/* the overview: keep card first, "safe to spend" replaced by "kept this month" */
if (typeof mnOver === 'function') {
  const _o = mnOver;
  mnOver = function () {
    let h = _o.apply(this, arguments); if (!kpOn()) return h;
    const M = kpMonth(mnYm(new Date()));
    h = h.replace(/<div><span>Safe to spend today<\/span>[\s\S]*?<\/em><\/div>/, `<div><span>Wants this month</span><b class="${M.w > 0 ? 'bad' : ''}">${mnF(M.w)}</b><em>budget 0 · keep mode</em></div>`);
    return h.replace('<div class="mn2">', '<div class="mn2">' + kpCard());
  };
}
/* logging a want: say it out loud */
if (typeof mnPut === 'function') {
  const _p = mnPut;
  mnPut = function (t) {
    const r = _p.apply(this, arguments);
    try { if (kpOn() && kpIsWant(r) && !r.plan) { const M = kpMonth(mnYm(new Date())); setTimeout(() => toast(`Want logged: ${mnF(mnB(r.amt, mnAccCur(r.acc)))}. Wants this month: ${mnF(M.w)} (budget 0). Next time → wait list.`), 50); } } catch (e) { }
    return r;
  };
}
(function () {
  const s = document.createElement('style');
  s.textContent = `.kp .kp-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 6px}.kp .kp-3 div{display:flex;flex-direction:column;gap:2px}
  .kp .kp-3 span{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}.kp .kp-3 b{font-size:20px}.kp .kp-3 em{font-size:11px;opacity:.6;font-style:normal}
  .kp b.ok{color:var(--ok,#4ade80)}.kp b.bad{color:var(--bad,#f87171)}.kp.bad{border-color:var(--bad,#f87171)}
  .kp-wait{margin-top:8px;border-top:1px solid var(--line,rgba(255,255,255,.1));padding-top:8px}.kp-w{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:6px 0;font-size:13px}`;
  document.head.appendChild(s);
})();
