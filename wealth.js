/* War Room 13.8 · WEALTH — the Wealth Roadmap (Acquisition.com, taught by Sharran Srivatsaa) inside Money.
   M-O-N-E-Y, one milestone at a time, each one measured from the ledger you already keep (no second copy of any number):
     M · Margin        = money in − money out. Complete: positive margin 3 months in a row (90 days).
     O · Optionality   = transition fund in a separate account ≥ essential monthly spending × 6 (to 12).
     N · Net financial assets ≥ $100k (financial assets − debt against them; the transition fund doesn't count).
     E · Equity rich   = net worth excluding your home ≥ $1M.
     Y · Your terms    = passive income ÷ monthly spending ≥ 100% (the coverage ratio).
   Data: S.wassets (assets + debts you add by hand, synced per item), S.wsnap (one net-worth statement per month,
   written automatically), S.settings.wealth (essential categories, fund accounts, months, freeze, rules, action steps).
   Educational, not financial advice. */
'use strict';
let wlPer = 'm', wlOpen = null;
(function () { if (typeof MN_IN !== 'undefined' && !MN_IN.some((x) => x[0] === 'passive')) MN_IN.push(['passive', 'Passive (dividends, interest, rent)']); })();

/* ── settings + store ── */
function wlCfg() { const c = (S.settings.wealth = S.settings.wealth || {}); if (!c.ess) c.ess = ['food', 'transport', 'phone', 'school']; if (!c.months) c.months = 6; if (!c.steps) c.steps = {}; return c; }
function wlSet(fn) { fn(wlCfg()); S.settings._u = now(); save(); render(); }
function wlAssets() { return Object.values(S.wassets || {}).filter((a) => a && !a._del); }
const WL_USD = () => mnFx('USD');
const wlUsd = (mdl) => mdl / WL_USD();
function wlFmtUsd(mdl) { const u = wlUsd(mdl); return '$' + (Math.abs(u) >= 1e6 ? (u / 1e6).toFixed(2) + 'M' : Math.abs(u) >= 1e4 ? Math.round(u / 1000) + 'k' : fmt(Math.round(u))); }

/* ── money in / out over any range (same rules as the month report: earnings count when earned, payouts aren't new income) ── */
function wlRange(from, to) {
  const T = mnTx().filter((t) => t.date >= from && t.date <= to), b = (t) => mnB(t.amt, mnAccCur(t.acc));
  const src = {}, cats = {}, items = {}; let inn = 0, out = 0, n = 0;
  T.forEach((t) => {
    if (t.type === 'in') { inn += b(t); src[t.cat || 'other_in'] = (src[t.cat || 'other_in'] || 0) + b(t); n++; }
    else if (t.type === 'out') { const c = t.cat || 'other', v = b(t); out += v; cats[c] = (cats[c] || 0) + v; n++;
      const nm = (t.est ? 'Not logged (estimated from your counts)' : (t.note && t.note !== 'from the day log' ? t.note : mnCatName(c))).trim().toLowerCase(); items[c] = items[c] || {}; const it = (items[c][nm] = items[c][nm] || { n: 0, v: 0, label: t.est ? 'Not logged (estimated)' : (t.note && t.note !== 'from the day log' ? t.note : '(no note)') }); it.n++; it.v += v; }
  });
  return { inn, out, m: inn - out, src, cats, items, n, from, to };
}
function wlPeriod(p) {
  const t = new Date(), today = dk(t);
  if (p === 'm') { const f = dk(new Date(t.getFullYear(), t.getMonth(), 1)), pf = dk(new Date(t.getFullYear(), t.getMonth() - 1, 1)), pt = dk(addDays(new Date(t.getFullYear(), t.getMonth(), 1), -1)), days = t.getDate(), pe = dk(addDays(pd(pf), days - 1));
    return { cur: wlRange(f, today), prev: wlRange(pf, pe < pt ? pe : pt), label: t.toLocaleDateString('en-GB', { month: 'long' }) + ' so far', vs: 'same days last month' }; }
  const n = p === '30' ? 30 : p === '90' ? 90 : 182; const f = dk(addDays(t, -(n - 1))), pf = dk(addDays(t, -(2 * n - 1))), pt = dk(addDays(t, -n));
  return { cur: wlRange(f, today), prev: wlRange(pf, pt), label: p === '182' ? 'last 6 months' : `last ${n} days`, vs: `the ${n} days before` };
}
/* full calendar months, oldest first */
function wlMonths(k) { const t = new Date(), out = []; for (let i = k; i >= 1; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); const r = wlRange(dk(d), dk(new Date(d.getFullYear(), d.getMonth() + 1, 0))); r.ym = mnYm(d); out.push(r); } return out; }
function wlNutCalc() { const M = wlMonths(3).filter((m) => m.n); if (!M.length) { const c = wlPeriod('30').cur; return { all: c.out, ess: wlEss(c.cats), basis: 'last 30 days' }; } const all = M.reduce((a, m) => a + m.out, 0) / M.length, ess = M.reduce((a, m) => a + wlEss(m.cats), 0) / M.length; return { all, ess, basis: `average of ${M.length} full month${M.length === 1 ? '' : 's'}` }; }
function wlNut() { const n = wlNutCalc(), man = Number(wlCfg().minLive) || 0; n.calcEss = n.ess; if (man > 0) { n.ess = man; n.manual = true; } return n; }
function wlEss(cats) { const E = wlCfg().ess; return Object.entries(cats || {}).reduce((a, [c, v]) => a + (E.includes(c) ? v : 0), 0); }
function wlMarginTest() { const M = wlMonths(3); const ok = M.map((m) => m.n > 0 && m.m > 0); return { M, ok, done: ok.length === 3 && ok.every(Boolean), streak: (() => { let s = 0; for (let i = M.length - 1; i >= 0; i--) { if (ok[i]) s++; else break; } return s; })() }; }

/* ── balance sheet ── */
const WL_CLS = { invest: ['Investments (stocks, ETFs, funds)', 'fin'], retire: ['Retirement account', 'fin'], lent: ['Money lent out / private credit', 'fin'], crypto: ['Crypto', 'fin'], business: ['Business equity (your share)', 'eq'], property: ['Real estate (not your home)', 'eq'], home: ['Your home', 'home'], other: ['Other asset', 'eq'] };
const WL_DEBT = { consumer: ['Card / personal loan', 'fin'], invest: ['Loan against investments', 'fin'], business: ['Business loan (personal)', 'eq'], mortgage: ['Mortgage on your home', 'home'], property: ['Loan on other property', 'eq'], other: ['Other debt', 'fin'] };
function wlSheet() {
  const c = wlCfg(), A = mnAccs(), fundIds = wlFundIds(); let cash = 0, fund = 0, owed = 0;
  A.forEach((a) => { const b = mnBal(a.id); if (!b.counted) return; const v = mnB(b.bal, a.cur); if (fundIds.includes(a.id)) fund += v; else if (a.type === 'owed') owed += v; else cash += v; });
  const L = wlAssets(), sum = (f) => L.filter(f).reduce((s, x) => s + mnB(Number(x.value) || 0, x.cur || 'MDL'), 0);
  const finA = sum((x) => x.kind === 'asset' && (WL_CLS[x.cls] || [])[1] === 'fin'), eqA = sum((x) => x.kind === 'asset' && (WL_CLS[x.cls] || [])[1] === 'eq'), homeA = sum((x) => x.kind === 'asset' && x.cls === 'home');
  const finD = sum((x) => x.kind === 'debt' && (WL_DEBT[x.cls] || [])[1] === 'fin'), eqD = sum((x) => x.kind === 'debt' && (WL_DEBT[x.cls] || [])[1] === 'eq'), homeD = sum((x) => x.kind === 'debt' && x.cls === 'mortgage');
  const nfa = cash + owed + finA - finD, nw = cash + owed + fund + finA + eqA + homeA - finD - eqD - homeD, nwx = nw - (homeA - homeD);
  const passive = L.filter((x) => x.kind === 'asset').reduce((s, x) => s + mnB(Number(x.pmo) || 0, x.cur || 'MDL'), 0);
  void c; return { cash, owed, fund, finA, eqA, homeA, finD, eqD, homeD, nfa, nw, nwx, passive, any: mnTotal().any || L.length > 0 };
}
function wlFundIds() { const c = wlCfg(); if (c.fund && c.fund.length) return c.fund.filter((id) => S.accounts[id] && !S.accounts[id]._del); return mnAccs().filter((a) => a.type === 'savings').map((a) => a.id); }
function wlPassive() { const M = wlMonths(3).filter((m) => m.n); const fromTx = M.length ? M.reduce((a, m) => a + (m.src.passive || 0), 0) / M.length : 0; return fromTx + wlSheet().passive; }
/* one statement per month, kept up to date while the month runs (only written when a number changes) */
function wlSnap() { try { const s = wlSheet(); if (!s.any) return; const ym = mnYm(new Date()); S.wsnap = S.wsnap || {}; const o = S.wsnap[ym], r = (v) => Math.round(v);
  if (!o || r(o.nw) !== r(s.nw) || r(o.nfa) !== r(s.nfa) || r(o.nwx) !== r(s.nwx) || r(o.fund) !== r(s.fund)) { S.wsnap[ym] = { id: ym, ym, nw: r(s.nw), nwx: r(s.nwx), nfa: r(s.nfa), fund: r(s.fund), cash: r(s.cash), _u: now() }; save(); } } catch (e) { } }

/* ── milestone status ── */
function wlStatus() {
  const mt = wlMarginTest(), nut = wlNut(), sh = wlSheet(), c = wlCfg(), target = nut.ess * c.months, cov = nut.all > 0 ? wlPassive() / nut.all : 0;
  const S5 = [
    { k: 'M', t: 'Margin', done: mt.done, pct: mt.streak / 3, line: mt.done ? '3 months in a row with money left over' : `${mt.streak} of 3 months in a row with money left over` },
    { k: 'O', t: 'Optionality', done: target > 0 && sh.fund >= target, pct: target > 0 ? sh.fund / target : 0, line: target > 0 ? `${mnF(sh.fund)} of ${mnF(target)} (${c.months} months of essentials)` : 'set your essentials' },
    { k: 'N', t: 'Net financial assets', done: wlUsd(sh.nfa) >= 100000, pct: wlUsd(sh.nfa) / 100000, line: `${wlFmtUsd(sh.nfa)} of $100k` },
    { k: 'E', t: 'Equity rich', done: wlUsd(sh.nwx) >= 1e6, pct: wlUsd(sh.nwx) / 1e6, line: `${wlFmtUsd(sh.nwx)} of $1M net worth without your home` },
    { k: 'Y', t: 'Your terms', done: cov >= 1, pct: cov, line: `passive income covers ${Math.round(cov * 100)}% of your spending` },
  ];
  const cur = S5.findIndex((x) => !x.done); return { S5, cur: cur < 0 ? 4 : cur, mt, nut, sh, target, cov };
}

/* ── UI bits ── */
const WL_STEPS = {
  M: [['m1', 'Log every lei for 30 days (or upload statements and let me total them)'], ['m2', 'Know your monthly nut (it shows below)'], ['m3', 'Pick ONE lever: cut a big expense, or raise income'], ['m4', '90 days of positive margin']],
  O: [['o1', 'Mark which spending is essential'], ['o2', 'Open a separate account for the transition fund'], ['o3', 'Set a fixed monthly transfer on payday'], ['o4', 'Reach 6 months of essentials']],
  N: [['n1', 'Freeze your lifestyle: when income rises, spending stays flat'], ['n2', 'Net-worth statement every month (automatic here)'], ['n3', 'Set a monthly investment amount'], ['n4', 'First tiny income-generating asset (one dividend ETF share)'], ['n5', 'Open the investment account']],
  E: [['e1', 'Run the business as if it were for sale (value on its numbers)'], ['e2', 'Take distributions and invest them outside the business'], ['e3', 'Invest on a schedule, not on feelings'], ['e4', 'Use tax-advantaged accounts and location']],
  Y: [['y1', 'Know your coverage ratio (below)'], ['y2', 'Get your first dividend'], ['y3', 'Learn one private deal type (credit or real estate) in a group first']],
};
function wlSteps(k) { const c = wlCfg(); return `<div class="wl-steps">${WL_STEPS[k].map(([id, l]) => `<button class="${c.steps[id] ? 'on' : ''}" onclick="wlSet((c)=>{c.steps['${id}']=!c.steps['${id}']})"><i>${c.steps[id] ? '✓' : ''}</i><span>${l}</span></button>`).join('')}</div>`; }
function wlPct(v) { return Math.max(0, Math.min(100, v * 100)); }
function wlDelta(a, b, inv) { if (!b) return ''; const d = (a - b) / Math.abs(b), up = d >= 0, good = inv ? !up : up; return `<em class="${good ? 'ok' : 'bad'}">${up ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))}%</em>`; }
function wlCard(k, title, sub, body, st) { const open = wlOpen ? wlOpen === k : st.S5[st.cur].k === k || k === 'M'; const s = st.S5.find((x) => x.k === k);
  return `<details class="card wl-ms ${s.done ? 'done' : ''}" ${open ? 'open' : ''} ontoggle="if(this.open)wlOpen='${k}'"><summary><b class="wl-k">${k}</b><span class="wl-st"><b>${title}</b><em>${sub}</em></span><span class="wl-pc">${s.done ? '✓ done' : Math.round(wlPct(s.pct)) + '%'}</span><i class="wl-bar"><u style="width:${wlPct(s.pct)}%"></u></i></summary><div class="wl-body">${body}</div></details>`; }

/* ── M · Margin: the whole picture of money in, money out, what's left ── */
function wlMargin(st) {
  const P = wlPeriod(wlPer), c = P.cur, pv = P.prev, mx = Math.max(c.inn, c.out, 1), cats = Object.entries(c.cats).sort((a, b) => b[1] - a[1]), src = Object.entries(c.src).sort((a, b) => b[1] - a[1]), E = wlCfg().ess;
  const M6 = wlMonths(6), m6x = Math.max(1, ...M6.map((m) => Math.abs(m.m))), T = mnTotal(), nut = st.nut, mt = st.mt;
  const last3 = M6.slice(-3), prev3 = M6.slice(0, 3), avg = (L, f) => (L.filter((m) => m.n).length ? L.filter((m) => m.n).reduce((a, m) => a + f(m), 0) / L.filter((m) => m.n).length : 0);
  const spendUp = avg(last3, (m) => m.out) - avg(prev3, (m) => m.out), incUp = avg(last3, (m) => m.inn) - avg(prev3, (m) => m.inn);
  const big = cats[0], lev = wlCfg().lever || '';
  return `<div class="wl-per">${[['m', 'This month'], ['30', '30 days'], ['90', '90 days'], ['182', '6 months']].map(([v, l]) => `<button class="${wlPer === v ? 'on' : ''}" onclick="wlPer='${v}';wlOpen='M';render()">${l}</button>`).join('')}</div>
    <div class="wl-3"><div><span>Came in</span><b class="ok">${mnF(c.inn)}</b>${wlDelta(c.inn, pv.inn)}</div><div><span>Went out</span><b class="bad">${mnF(c.out)}</b>${wlDelta(c.out, pv.out, true)}</div><div><span>Margin</span><b class="${c.m >= 0 ? 'ok' : 'bad'}">${mnF(c.m, 'MDL', true)}</b><em>${c.inn ? Math.round((c.m / c.inn) * 100) + '% of what came in' : ''}</em></div></div>
    <div class="wl-io"><div><i class="in" style="width:${(c.inn / mx) * 100}%"></i></div><div><i class="out" style="width:${(c.out / mx) * 100}%"></i></div></div>
    <div class="wl-note">${P.label} · arrows compare with ${P.vs}. ${T.any ? `You have <b>${mnF(T.t)}</b> right now across your accounts.` : 'Count your money once (Overview) so the app knows what you have.'}</div>

    <div class="wl-h">Margin by month · 90-day test</div>
    <div class="wl-mbars">${M6.map((m, i) => { const pos = m.m >= 0, h = (Math.abs(m.m) / m6x) * 100, test = i >= 3; return `<div class="${test ? 'tst' : ''}" title="${mnMonthName(m.ym)}: in ${Math.round(m.inn)} · out ${Math.round(m.out)}"><div class="up">${pos && m.n ? `<i class="ok" style="height:${h}%"></i>` : ''}</div><div class="dn">${!pos && m.n ? `<i class="bad" style="height:${h}%"></i>` : ''}</div><b class="${m.n ? (pos ? 'ok' : 'bad') : ''}">${m.n ? (pos ? '+' : '−') + fmt(Math.round(Math.abs(m.m) / 100) / 10) + 'k' : '–'}</b><span>${mnMonthName(m.ym).split(' ')[0]}${test ? (m.n && pos ? ' ✓' : ' ✗') : ''}</span></div>`; }).join('')}</div>
    <div class="wl-note">${mt.done ? '<b class="ok">Milestone 1 complete:</b> three months in a row with money left over.' : `The last 3 full months are the test (✓/✗). <b>${mt.streak}/3</b> so far. The course says: margin is the raw material for everything after it.`}</div>

    <div class="wl-2">
      <div><div class="wl-h">Where it came from</div>${src.length ? src.map(([k, v]) => `<div class="wl-row"><span>${esc(mnCatName(k))}</span><i><u class="ok" style="width:${(v / src[0][1]) * 100}%"></u></i><b>${mnF(v)}</b></div>`).join('') : '<div class="empty">No income logged in this period.</div>'}</div>
      <div><div class="wl-h">Monthly nut <span class="wl-sub">${esc(nut.basis)}</span></div>
        <div class="wl-kv"><span>Everything you spend a month</span><b>${mnF(nut.all)}</b></div><div class="wl-kv"><span>Essentials only <em>${nut.manual ? '(your number, set in O)' : '(tap ★ below to choose)'}</em></span><b>${mnF(nut.ess)}</b></div><div class="wl-kv"><span>Lifestyle (the rest)</span><b>${mnF(nut.all - nut.ess)}</b></div>
        <div class="wl-kv"><span>Spending trend, last 3 months vs 3 before</span><b class="${spendUp > 0 && spendUp > incUp ? 'bad' : 'ok'}">${mnF(spendUp, 'MDL', true)}</b></div>
        ${spendUp > 0 && spendUp >= incUp ? '<div class="wl-warn">Spending rose at least as fast as income. That is lifestyle inflation, the silent killer of margin.</div>' : ''}</div>
    </div>

    <div class="wl-h">Where it went · in detail <span class="wl-sub">★ = essential · tap a row for every item</span></div>
    ${cats.length ? cats.map(([k, v]) => { const it = Object.values(c.items[k] || {}).sort((a, b) => b.v - a.v), pvv = pv.cats[k] || 0, ess = E.includes(k);
      return `<details class="wl-cat"><summary><button class="wl-star ${ess ? 'on' : ''}" onclick="event.preventDefault();event.stopPropagation();wlSet((c)=>{c.ess=c.ess.includes('${k}')?c.ess.filter(x=>x!=='${k}'):c.ess.concat('${k}')})" title="Essential?">★</button><span>${esc(mnCatName(k))}</span><i><u class="bad" style="width:${(v / cats[0][1]) * 100}%"></u></i><b>${mnF(v)}</b><em>${c.out ? Math.round((v / c.out) * 100) : 0}%</em>${wlDelta(v, pvv, true) || '<em></em>'}</summary>
        <div class="wl-items">${it.slice(0, 25).map((x) => `<div><span>${esc(x.label)}${x.n > 1 ? ` <em>×${x.n}</em>` : ''}</span><b>${mnF(x.v)}</b></div>`).join('')}${it.length > 25 ? `<div class="wl-sub">+${it.length - 25} more</div>` : ''}<button class="btn sm ghost" onclick="mnFilter={q:'',type:'out',acc:'',m:'',cat:'${k}'};mnTab='tx';render()">All transactions in ${esc(mnCatName(k))} →</button></div></details>`; }).join('') : '<div class="empty">No spending logged in this period. Type "spent 120 taxi" at the top.</div>'}

    <div class="wl-h">Your lever this month <span class="wl-sub">pick one, the course says one big move beats many small ones</span></div>
    <div class="wl-lev">${[['cut', 'Cut the biggest one', big ? `${mnCatName(big[0])} is ${Math.round((big[1] / (c.out || 1)) * 100)}% of spending (${mnF(big[1])}).` : 'Log spending to see it.'], ['earn', 'Raise income', 'No ceiling: more dials → first agency, more lessons, higher prices.'], ['know', 'Know every lei', `${c.n} entries in this period. Log at the moment you pay.`]].map(([v, l, d]) => `<button class="${lev === v ? 'on' : ''}" onclick="wlSet((c)=>{c.lever=c.lever==='${v}'?'':'${v}'})"><b>${l}</b><span>${d}</span></button>`).join('')}</div>
    ${wlSteps('M')}`;
}

/* ── O · Optionality ── */
function wlOpt(st) {
  const c = wlCfg(), sh = st.sh, nut = st.nut, target = st.target, ids = wlFundIds(), monthly = Number(S.settings.mnSave) || 0, left = Math.max(0, target - sh.fund), months = monthly > 0 ? Math.ceil(left / monthly) : null;
  const A = mnAccs();
  return `<div class="wl-3"><div><span>Essentials a month</span><b>${mnF(nut.ess)}</b></div><div><span>Target · ${c.months} months</span><b>${mnF(target)}</b><em>${wlFmtUsd(target)}</em></div><div><span>In the fund</span><b class="${sh.fund >= target && target ? 'ok' : ''}">${mnF(sh.fund)}</b><em>${nut.ess ? (sh.fund / nut.ess).toFixed(1) + ' months covered' : ''}</em></div></div>
    <div class="wl-big-bar"><u style="width:${wlPct(target ? sh.fund / target : 0)}%"></u><span>${target ? Math.round(wlPct(sh.fund / target)) : 0}%</span></div>
    <div class="wl-h">Minimum monthly living <span class="wl-sub">the essentials you can't cut: housing, transport, food, utilities, insurance, minimum debt</span></div>
    <div class="wl-min"><div><span>Calculated from your ★ essentials</span><b>${mnF(nut.calcEss)}</b><em>${esc(nut.basis)}</em></div><div><span>Your number</span><input id="wl-min" type="number" inputmode="decimal" placeholder="type it" value="${c.minLive || ''}" onchange="wlSet((c)=>{c.minLive=Number(this.value)||0});wlOpen='O'"><em>${nut.manual ? 'used for every target below' : 'empty = the calculated one is used'}</em></div></div>
    ${nut.manual ? `<button class="btn sm ghost" onclick="wlSet((c)=>{c.minLive=0});wlOpen='O'">Use the calculated number</button>` : ''}
    <div class="wl-h">Fund targets · pick yours</div>
    <div class="wl-tgt">${[6, 9, 12].map((m) => { const t = nut.ess * m, pc = t ? sh.fund / t : 0, left = Math.max(0, t - sh.fund), mo = monthly > 0 ? Math.ceil(left / monthly) : null; return `<button class="${c.months === m ? 'on' : ''}" onclick="wlSet((c)=>{c.months=${m}});wlOpen='O'"><b>${m} months</b><span>${mnF(t)}</span><em>${wlFmtUsd(t)}</em><i class="wl-bar"><u style="width:${wlPct(pc)}%"></u></i><span class="s">${Math.round(wlPct(pc))}% · ${left ? (mo != null ? mo + ' mo to go' : mnF(left) + ' to go') : '✓ reached'}</span></button>`; }).join('')}</div>
    <div class="wl-kv"><span>If your income stopped today, the fund lasts</span><b>${nut.ess ? (sh.fund / nut.ess).toFixed(1) + ' months' : '–'}</b></div>
    <div class="wl-h">The fund lives in <span class="wl-sub">a separate account, so it doesn't get spent</span></div>
    <div class="wl-accs">${A.length ? A.map((a) => `<button class="${ids.includes(a.id) ? 'on' : ''}" onclick="wlSet((c)=>{const cur=wlFundIds();c.fund=cur.includes('${a.id}')?cur.filter(x=>x!=='${a.id}'):cur.concat('${a.id}')});wlOpen='O'">${ids.includes(a.id) ? '✓ ' : ''}${esc(a.name)}</button>`).join('') : ''}<button onclick="mnAccEdit()">+ New account</button></div>
    <div class="wl-kv"><span>Fixed transfer each month</span><b>${monthly ? mnF(monthly) : 'not set'}</b></div>
    <div class="wl-kv"><span>${months != null ? 'Fund complete in' : 'Set a monthly transfer to see when it is complete'}</span><b>${months != null ? (months === 0 ? 'done' : months + ' month' + (months === 1 ? '' : 's')) : ''}</b></div>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" onclick="mnSaveGoal()">${monthly ? 'Change' : 'Set'} the monthly transfer</button></div>
    <div class="wl-note">The real emergency isn't a flat tyre, it's losing your income. This fund buys time to reinvent yourself. Count only essentials: housing, transport, food, utilities, insurance, minimum debt. Small surprises come from margin.</div>
    ${wlSteps('O')}`;
}

/* ── N · Net financial assets + the monthly statement ── */
function wlNfa(st) {
  const sh = st.sh, c = wlCfg(), monthly = Math.max(0, Number(c.invest) || 0), goal = 100000 * WL_USD(), L = wlAssets().sort((a, b) => (a.kind < b.kind ? -1 : 1));
  let m = 0, v = Math.max(0, sh.nfa); while (v < goal && m < 600 && monthly > 0) { v = v * (1 + 0.1 / 12) + monthly; m++; }
  const snaps = Object.values(S.wsnap || {}).filter((x) => x && !x._del).sort((a, b) => (a.ym < b.ym ? -1 : 1)).slice(-12), mx = Math.max(1, ...snaps.map((s) => Math.abs(s.nfa)));
  const freeze = Number(c.freeze) || 0, cm = wlPeriod('m').cur;
  return `<div class="wl-3"><div><span>Net financial assets</span><b>${mnF(sh.nfa)}</b><em>${wlFmtUsd(sh.nfa)} of $100k</em></div><div><span>Investing a month</span><b>${monthly ? mnF(monthly) : '–'}</b><em>${monthly ? '' : 'set it below'}</em></div><div><span>$100k reached</span><b>${monthly ? (m >= 600 ? '50+ years' : m < 12 ? m + ' months' : (m / 12).toFixed(1) + ' years') : '–'}</b><em>at ~10% a year</em></div></div>
    <div class="wl-big-bar"><u style="width:${wlPct(wlUsd(sh.nfa) / 100000)}%"></u><span>${Math.round(wlPct(wlUsd(sh.nfa) / 100000))}%</span></div>
    <div class="wl-h">Freeze your lifestyle</div>
    <div class="wl-kv"><span>${freeze ? 'Frozen spending a month' : 'Not frozen yet'}</span><b>${freeze ? mnF(freeze) : ''}</b></div>
    ${freeze ? `<div class="wl-kv"><span>This month so far</span><b class="${cm.out > freeze ? 'bad' : 'ok'}">${mnF(cm.out)} ${cm.out > freeze ? '· over' : '· under'}</b></div>` : ''}
    <div class="row" style="gap:8px;margin:6px 0 4px"><button class="btn sm" onclick="wlSet((c)=>{c.freeze=Math.round(wlNut().all)});wlOpen='N'">Freeze at today's nut (${mnF(st.nut.all)})</button><button class="btn sm ghost" onclick="wlInvestModal()">Monthly investment</button></div>
    <div class="wl-note">When income rises, spending stays flat and the difference goes into assets. The first $100k is the slowest; the second comes faster.</div>
    <div class="wl-h">Balance sheet <span class="wl-sub">what you own and owe · updated every time you open this</span></div>
    <div class="wl-sheet">
      <div><span>Cash and cards (counted)</span><b>${mnF(sh.cash)}</b></div>${sh.owed ? `<div><span>Owed to you</span><b>${mnF(sh.owed)}</b></div>` : ''}<div><span>Transition fund <em>(not counted in net financial assets)</em></span><b>${mnF(sh.fund)}</b></div>
      ${L.map((x) => `<div class="${x.kind}" onclick="wlAssetModal('${x.id}')"><span>${x.kind === 'debt' ? '− ' : ''}${esc(x.name)} <em>${esc(((x.kind === 'debt' ? WL_DEBT : WL_CLS)[x.cls] || ['Other'])[0])}</em></span><b>${x.kind === 'debt' ? '−' : ''}${mnF(Number(x.value) || 0, x.cur || 'MDL')}</b></div>`).join('')}
      <div class="tot"><span>Net financial assets</span><b>${mnF(sh.nfa)}</b></div><div class="tot"><span>Net worth</span><b>${mnF(sh.nw)}</b></div>
    </div>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn sm" onclick="wlAssetModal('','asset')">+ Asset</button><button class="btn sm" onclick="wlAssetModal('','debt')">+ Debt</button></div>
    ${snaps.length ? `<div class="wl-h">Monthly statement · net financial assets</div><div class="wl-snap">${snaps.map((s) => `<div title="${s.ym}: NFA ${s.nfa} · net worth ${s.nw}"><div><i style="height:${(Math.max(0, s.nfa) / mx) * 100}%"></i></div><b>${fmt(Math.round(s.nfa / 1000))}k</b><span>${mnMonthName(s.ym).split(' ')[0]}</span></div>`).join('')}</div>` : ''}
    ${wlSteps('N')}`;
}
function wlInvestModal() { const c = wlCfg(); openModal(`<h2>Monthly investment</h2><div class="xs muted" style="margin-bottom:10px">What you put into assets every month (after the transition fund is full). Used for the $100k projection.</div><div class="field"><label>Per month (MDL)</label><input id="wl-inv" type="number" inputmode="decimal" value="${c.invest || ''}"></div><button class="btn primary block" onclick="wlSet((c)=>{c.invest=Number($('wl-inv').value)||0});closeModal();wlOpen='N'">Save</button>`); }
function wlAssetModal(id, kind) {
  const x = id ? S.wassets[id] : { kind: kind || 'asset', name: '', cls: kind === 'debt' ? 'consumer' : 'invest', value: '', cur: 'MDL', pmo: '' }, K = x.kind === 'debt' ? WL_DEBT : WL_CLS;
  openModal(`<h2>${id ? 'Edit' : 'New'} ${x.kind}</h2><div class="field"><label>Name</label><input id="wa-n" value="${esc(x.name)}" placeholder="${x.kind === 'debt' ? 'e.g. Credit card' : 'e.g. Brokerage · SCHD'}"></div>
    <div class="field"><label>Type</label><select id="wa-c">${Object.entries(K).map(([k, [l]]) => `<option value="${k}" ${x.cls === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="g2"><div class="field"><label>Value today</label><input id="wa-v" type="number" inputmode="decimal" value="${x.value}"></div><div class="field"><label>Currency</label><select id="wa-u">${['MDL', 'USD', 'EUR'].map((c) => `<option ${x.cur === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
    ${x.kind === 'asset' ? `<div class="field"><label>Passive income it pays a month (dividends, interest, rent)</label><input id="wa-p" type="number" inputmode="decimal" value="${x.pmo || ''}"></div>` : ''}
    <div class="row" style="gap:8px"><button class="btn grow primary" onclick="wlAssetSave('${id || ''}','${x.kind}')">Save</button>${id ? `<button class="btn danger" onclick="if(confirm('Delete ${esc(x.name).replace(/'/g, '')}?')){S.wassets['${id}']={id:'${id}',_u:now(),_del:true};save();closeModal();wlOpen='N';render()}">Delete</button>` : ''}</div>`);
}
function wlAssetSave(id, kind) { const n = $('wa-n').value.trim(); if (!n) { toast('Name it'); return; } S.wassets = S.wassets || {}; id = id || uid(); const p = $('wa-p'); S.wassets[id] = { id, kind, name: n, cls: $('wa-c').value, value: Number($('wa-v').value) || 0, cur: $('wa-u').value, pmo: p ? Number(p.value) || 0 : 0, _u: now() }; save(); closeModal(); wlOpen = 'N'; render(); toast('Saved · in your monthly statement'); }

/* ── E · Equity rich + the 4 money monsters ── */
function wlEq(st) {
  const sh = st.sh, c = wlCfg(), idle = sh.cash - st.nut.all; /* cash above one month of spending, outside the fund */
  return `<div class="wl-3"><div><span>Net worth without your home</span><b>${mnF(sh.nwx)}</b><em>${wlFmtUsd(sh.nwx)} of $1M</em></div><div><span>Business + property equity</span><b>${mnF(sh.eqA - sh.eqD)}</b></div><div><span>Home equity <em>(not counted)</em></span><b>${mnF(sh.homeA - sh.homeD)}</b></div></div>
    <div class="wl-big-bar"><u style="width:${wlPct(wlUsd(sh.nwx) / 1e6)}%"></u><span>${Math.round(wlPct(wlUsd(sh.nwx) / 1e6))}%</span></div>
    <div class="wl-note">$1M without your home is the US accredited-investor line: it opens private deals the public never sees. The two "golden stairways" are business and real estate, because equity has asymmetric upside. For you, the biggest route is Caregiver Bench's value.</div>
    <div class="wl-h">The 4 money monsters</div>
    <div class="wl-mon">
      <div><b>Inflation</b><span>${idle > 0 ? `${mnF(idle)} sits as idle cash above a month of spending. Idle cash loses to inflation every year.` : 'No idle cash above a month of spending.'}</span></div>
      <div><b>Taxes</b><span>The #1 drag. Separate the tax <i>preparer</i> (filing) from a tax <i>strategist</i> (planning).</span><div class="wl-tg"><button class="${c.prep ? 'on' : ''}" onclick="wlSet((c)=>{c.prep=!c.prep});wlOpen='E'">${c.prep ? '✓ ' : ''}I have a preparer</button><button class="${c.strat ? 'on' : ''}" onclick="wlSet((c)=>{c.strat=!c.strat});wlOpen='E'">${c.strat ? '✓ ' : ''}I have a strategist</button></div></div>
      <div><b>Interruption</b><span>Emotion costs most investors two thirds of the market's return. Write your rules now, before the drop.</span><textarea class="wl-rules" placeholder="e.g. If the market drops 20%, I invest more and sell nothing." onchange="wlSet((c)=>{c.rules=this.value});wlOpen='E'">${esc(c.rules || '')}</textarea></div>
      <div><b>Fees</b><span>1% a year on $1M over 20 years costs over $1M. Ask every advisor: how do you get paid?</span><div class="wl-tg"><button class="${c.fees ? 'on' : ''}" onclick="wlSet((c)=>{c.fees=!c.fees});wlOpen='E'">${c.fees ? '✓ ' : ''}I know what every product and advisor charges</button></div></div>
    </div>
    ${wlSteps('E')}`;
}

/* ── Y · Your terms ── */
function wlY(st) {
  const p = wlPassive(), cov = st.cov, nut = st.nut;
  return `<div class="wl-3"><div><span>Passive income a month</span><b>${mnF(p)}</b></div><div><span>Spending a month</span><b>${mnF(nut.all)}</b></div><div><span>Coverage ratio</span><b class="${cov >= 1 ? 'ok' : ''}">${Math.round(cov * 100)}%</b></div></div>
    <div class="wl-big-bar"><u style="width:${wlPct(cov)}%"></u><span>${Math.round(cov * 100)}%</span></div>
    <div class="wl-note">Freedom = passive income bigger than spending. Then work is a choice. Passive income counts from income logged as "Passive" and from what your assets pay (balance sheet). Track this one number as it climbs: 33%, 50%, 100%.</div>
    ${wlSteps('Y')}`;
}

/* ── the tab ── */
function wlTab() {
  wlSnap(); const st = wlStatus();
  return `<div class="wl">
    <div class="card wl-ladder"><div class="wl-lt"><b>WEALTH ROADMAP</b><span>M-O-N-E-Y · one milestone at a time</span></div>
      <div class="wl-steps5">${st.S5.map((s, i) => `<button class="${s.done ? 'done' : ''} ${i === st.cur ? 'cur' : ''}" onclick="wlOpen='${s.k}';render();setTimeout(()=>{const e=document.querySelector('.wl-ms[open]');if(e)e.scrollIntoView({behavior:'smooth',block:'start'})},60)"><b>${s.k}</b><span>${s.t}</span><i><u style="width:${wlPct(s.pct)}%"></u></i></button>`).join('')}</div>
      <div class="wl-now">You are at <b>${st.S5[st.cur].k} · ${st.S5[st.cur].t}</b>: ${esc(st.S5[st.cur].line)}.</div></div>
    ${wlCard('M', 'Margin', 'money in − money out', wlMargin(st), st)}
    ${wlCard('O', 'Optionality', '6–12 months of essentials in a separate account', wlOpt(st), st)}
    ${wlCard('N', 'Net financial assets · $100k', 'freeze lifestyle · invest the difference · monthly statement', wlNfa(st), st)}
    ${wlCard('E', 'Equity rich · $1M without your home', 'business + real estate · beat the 4 money monsters', wlEq(st), st)}
    ${wlCard('Y', 'Your terms', 'passive income ≥ spending', wlY(st), st)}
    <div class="wl-disc">From the Acquisition.com Wealth Roadmap (Sharran Srivatsaa). Educational, not financial advice. Amounts in lei; $ at your rate ${WL_USD()}.</div></div>`;
}

(function () {
  const st = document.createElement('style'); st.id = 'wealth-css';
  st.textContent = `
  .wl{display:grid;gap:12px;min-width:0;max-width:100%}.wl .card{margin:0;min-width:0;max-width:100%;overflow:hidden}.wl .row{flex-wrap:wrap}.wl .btn{white-space:normal;text-align:center}.wl-3>div,.wl-2>div,.wl-body{min-width:0;overflow-wrap:anywhere}.wl-sheet span{min-width:0}.wl-sheet b{flex:none}
  .wl-ladder .wl-lt{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:10px}.wl-lt b{font:700 12px/1 var(--mono,monospace);letter-spacing:.14em;color:var(--acc)}.wl-lt span{font:500 11px/1.3 var(--mono,monospace);color:var(--muted);text-align:right}
  .wl-steps5{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
  .wl-steps5 button{background:transparent;border:1px solid #262B32;border-radius:4px;padding:10px 6px;color:var(--muted);text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:84px}
  .wl-steps5 button b{font:700 22px/1 var(--mono,monospace);color:var(--text)}.wl-steps5 button span{font-size:11px;line-height:1.25}
  .wl-steps5 button i,.wl-bar,.wl-row i,.wl-cat i{display:block;height:4px;background:#1B1F24;border-radius:2px;overflow:hidden;margin-top:auto}.wl-steps5 button i u,.wl-bar u{display:block;height:100%;background:var(--acc)}
  .wl-steps5 button.cur{border-color:var(--acc);box-shadow:inset 0 -2px 0 var(--acc)}.wl-steps5 button.cur b{color:var(--acc)}.wl-steps5 button.done b{color:var(--green,#8fae8b)}.wl-steps5 button.done i u{background:var(--green,#8fae8b)}
  .wl-now{margin-top:10px;font-size:14px;color:var(--muted)}.wl-now b{color:var(--text)}
  .wl-ms>summary{list-style:none;display:grid;grid-template-columns:38px 1fr auto;grid-template-rows:auto auto;gap:4px 10px;align-items:center;cursor:pointer}.wl-ms>summary::-webkit-details-marker{display:none}
  .wl-k{grid-row:1/3;width:38px;height:38px;border:1px solid var(--acc);color:var(--acc);display:flex;align-items:center;justify-content:center;font:700 18px/1 var(--mono,monospace);border-radius:4px}
  .wl-ms.done .wl-k{border-color:var(--green,#8fae8b);color:var(--green,#8fae8b)}
  .wl-st b{display:block;font-size:16px;color:var(--text)}.wl-st em{display:block;font-style:normal;font-size:12px;color:var(--muted);margin-top:2px}
  .wl-pc{font:600 12px/1 var(--mono,monospace);color:var(--muted)}.wl-bar{grid-column:2/4;margin:4px 0 0}
  .wl-body{padding-top:14px;border-top:1px solid var(--line);margin-top:12px}
  .wl-per{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.wl-per button,.wl-accs button,.wl-tg button{min-height:36px;padding:0 12px;background:transparent;border:1px solid #262B32;border-radius:4px;color:var(--muted);font-weight:600;font-size:12px;line-height:1;font-family:inherit;cursor:pointer}
  .wl-per button.on,.wl-accs button.on,.wl-tg button.on{color:var(--text);border-color:var(--acc)}
  .wl-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.wl-3>div{border:1px solid #1B1F24;border-radius:4px;padding:10px}.wl-3 span{display:block;font-size:11px;color:var(--muted)}.wl-3 b{display:block;font-size:22px;font-variant-numeric:tabular-nums;margin:4px 0 2px;color:var(--text)}.wl-3 em{display:block;font-style:normal;font-size:11px;color:var(--muted)}
  .wl .ok{color:var(--green,#8fae8b)!important}.wl .bad{color:var(--red,#d06a5e)!important}
  .wl-3 em.ok,.wl-3 em.bad{font-weight:600}
  .wl-io{display:grid;gap:4px;margin:12px 0 6px}.wl-io div{height:10px;background:#111418;border-radius:2px;overflow:hidden}.wl-io i{display:block;height:100%}.wl-io i.in{background:var(--green,#8fae8b)}.wl-io i.out{background:var(--red,#d06a5e)}
  .wl-note{font-size:13px;line-height:1.5;color:var(--muted);margin:8px 0}.wl-note b{color:var(--text)}
  .wl-warn{font-size:13px;line-height:1.45;color:var(--red,#d06a5e);border-left:2px solid var(--red,#d06a5e);padding:4px 8px;margin-top:6px}
  .wl-h{font:600 11px/1.3 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:18px 0 8px}.wl-sub{font:500 10.5px/1 var(--mono,monospace);letter-spacing:.02em;text-transform:none;color:var(--dim,#5B626B);margin-left:6px}
  .wl-mbars{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;height:150px}.wl-mbars>div{display:grid;grid-template-rows:1fr 1fr auto auto;gap:2px;text-align:center}.wl-mbars .up,.wl-mbars .dn{display:flex;justify-content:center}.wl-mbars .up{align-items:flex-end;border-bottom:1px solid #262B32}.wl-mbars .dn{align-items:flex-start}
  .wl-mbars i{display:block;width:60%;max-width:34px}.wl-mbars i.ok{background:var(--green,#8fae8b)}.wl-mbars i.bad{background:var(--red,#d06a5e)}.wl-mbars b{font:600 11px/1.2 var(--mono,monospace);color:var(--muted)}.wl-mbars span{font-size:10.5px;color:var(--muted)}.wl-mbars .tst span{color:var(--text)}
  .wl-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .wl-row{display:grid;grid-template-columns:minmax(80px,1fr) 1.2fr auto;gap:10px;align-items:center;font-size:13px;padding:5px 0}.wl-row i{margin:0;height:6px}.wl-row u,.wl-cat u{display:block;height:100%}.wl-row u.ok,.wl-cat u.ok{background:var(--green,#8fae8b)}.wl-row u.bad,.wl-cat u.bad{background:var(--red,#d06a5e)}.wl-row b{font-variant-numeric:tabular-nums}
  .wl-kv{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:6px 0;border-bottom:1px solid #15181C}.wl-kv span{color:var(--muted)}.wl-kv em{font-style:normal;font-size:11px}.wl-kv b{font-variant-numeric:tabular-nums;color:var(--text);white-space:nowrap}
  .wl-cat{border-bottom:1px solid #15181C}.wl-cat>summary{list-style:none;display:grid;grid-template-columns:30px minmax(70px,1fr) 1fr auto 40px 52px;gap:8px;align-items:center;font-size:13px;padding:8px 0;cursor:pointer}.wl-cat>summary::-webkit-details-marker{display:none}
  .wl-cat i{margin:0;height:6px}.wl-cat b{font-variant-numeric:tabular-nums;text-align:right}.wl-cat em{font-style:normal;font-size:11px;color:var(--muted);text-align:right}
  .wl-star{width:28px;height:28px;background:transparent;border:1px solid #262B32;border-radius:4px;color:#3a4048;cursor:pointer;font-size:13px}.wl-star.on{color:var(--acc);border-color:var(--acc)}
  .wl-items{padding:2px 0 10px 38px;display:grid;gap:2px}.wl-items>div{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--muted);padding:3px 0}.wl-items em{font-style:normal;color:var(--dim,#5B626B)}.wl-items b{color:var(--text);font-variant-numeric:tabular-nums}.wl-items .btn{justify-self:start;margin-top:6px}
  .wl-lev{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.wl-lev button{background:transparent;border:1px solid #262B32;border-radius:4px;padding:10px;text-align:left;cursor:pointer;color:var(--muted);display:grid;gap:4px}.wl-lev button b{color:var(--text);font-size:13px}.wl-lev button span{font-size:12px;line-height:1.35}.wl-lev button.on{border-color:var(--acc);box-shadow:inset 0 -2px 0 var(--acc)}
  .wl-steps{display:grid;gap:4px;margin-top:16px;border-top:1px solid var(--line);padding-top:12px}.wl-steps button{display:flex;gap:10px;align-items:center;background:transparent;border:0;padding:6px 0;color:var(--muted);text-align:left;cursor:pointer;font-weight:400;font-size:13px;line-height:1.35;font-family:inherit}
  .wl-steps i{flex:none;width:22px;height:22px;border:1px solid #262B32;border-radius:3px;display:flex;align-items:center;justify-content:center;font-style:normal;color:var(--green,#8fae8b);font-weight:700}.wl-steps button.on span{color:var(--text);text-decoration:line-through;text-decoration-color:#3a4048}.wl-steps button.on i{border-color:var(--green,#8fae8b)}
  .wl-big-bar{position:relative;height:22px;background:#111418;border:1px solid #1B1F24;border-radius:3px;margin:12px 0 4px;overflow:hidden}.wl-big-bar u{display:block;height:100%;background:linear-gradient(90deg,rgb(var(--acc-rgb) / .55),var(--acc))}.wl-big-bar span{position:absolute;right:8px;top:4px;font:600 11px/1 var(--mono,monospace);color:var(--text)}
  .wl-min{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}.wl-min>div{border:1px solid #1B1F24;border-radius:4px;padding:10px;display:grid;gap:4px}.wl-min span{font-size:11px;color:var(--muted)}.wl-min b{font-size:18px;color:var(--text)}.wl-min em{font-style:normal;font-size:11px;color:var(--dim,#5B626B)}.wl-min input{width:100%;background:#000;border:1px solid #262B32;border-radius:4px;color:var(--text);font-size:18px;padding:6px 8px}
  .wl-tgt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}.wl-tgt button{background:transparent;border:1px solid #262B32;border-radius:4px;padding:10px;text-align:left;cursor:pointer;display:grid;gap:4px;color:var(--muted)}.wl-tgt button b{color:var(--text);font-size:14px}.wl-tgt button span{font-size:13px;color:var(--text)}.wl-tgt button em{font-style:normal;font-size:11px}.wl-tgt button .s{font-size:11px;color:var(--muted)}.wl-tgt button.on{border-color:var(--acc);box-shadow:inset 0 -2px 0 var(--acc)}.wl-tgt .wl-bar{margin:2px 0}
  .wl-accs,.wl-tg{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .wl-sheet{border:1px solid #1B1F24;border-radius:4px}.wl-sheet>div{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid #15181C;font-size:13px}.wl-sheet>div:last-child{border-bottom:0}.wl-sheet span{color:var(--muted)}.wl-sheet em{font-style:normal;font-size:11px;color:var(--dim,#5B626B)}.wl-sheet b{font-variant-numeric:tabular-nums;color:var(--text)}
  .wl-sheet .asset,.wl-sheet .debt{cursor:pointer}.wl-sheet .debt b{color:var(--red,#d06a5e)}.wl-sheet .tot{background:#0E1013}.wl-sheet .tot span{color:var(--text);font-weight:600}
  .wl-snap{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;height:120px}.wl-snap>div{display:grid;grid-template-rows:1fr auto auto;text-align:center;gap:2px}.wl-snap>div>div{display:flex;align-items:flex-end;justify-content:center}.wl-snap i{display:block;width:70%;background:var(--acc)}.wl-snap b{font:600 10px/1 var(--mono,monospace);color:var(--muted)}.wl-snap span{font-size:10px;color:var(--muted)}
  .wl-mon{display:grid;gap:10px}.wl-mon>div{border:1px solid #1B1F24;border-radius:4px;padding:10px;display:grid;gap:6px}.wl-mon b{font-size:14px;color:var(--text)}.wl-mon span{font-size:13px;line-height:1.45;color:var(--muted)}
  .wl-rules{width:100%;min-height:64px;background:#000;border:1px solid #262B32;border-radius:4px;color:var(--text);font:13px/1.45 var(--mono,monospace);padding:8px}
  .wl-disc{font:500 11px/1.5 var(--mono,monospace);color:var(--dim,#5B626B);text-align:center;padding:4px 0 12px}
  .wl-tgt button{min-width:0}@media (max-width:700px){.wl-tgt{gap:5px}.wl-tgt button{padding:8px 6px}.wl-tgt button span{font-size:11.5px}.wl-steps5 button{min-height:76px;padding:8px 4px}.wl-steps5 button b{font-size:18px}.wl-steps5 button span{font-size:9.5px}.wl-3 b{font-size:16px}.wl-3>div{padding:8px}.wl-2{grid-template-columns:1fr}.wl-lev{grid-template-columns:1fr}
    .wl-cat>summary{grid-template-columns:30px 1fr auto 46px;gap:6px}.wl-cat>summary>i,.wl-cat>summary>em:nth-of-type(1){display:none}.wl-lt{flex-direction:column;align-items:flex-start!important}.wl-lt span{text-align:left!important}.wl-items{padding-left:0}}
  `;
  document.head.appendChild(st);
})();
