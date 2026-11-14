/* War Room 7.2 · ONE — the first-principles screen.
   $20k ← ~11 clients ← ~100 owner talks ← ~4,000 dials ← the next action. Everything else is a dashboard.
   So the app opens on one thing: what the calendar says to do right now, with one button that starts it.
   Night: one thing too, which is sleep. "Open the War Room" gets everything else back. */
'use strict';
let oneHiddenAt = 0;
function oneEnabled() { try { return localStorage.getItem('wr-one') !== 'off'; } catch (e) { return true; } }
function oneSet(on) { try { localStorage.setItem('wr-one', on ? 'on' : 'off'); } catch (e) { } toast(on ? 'ONE is the start screen' : 'ONE is off. Turn it back on in Me → Appearance'); if (on) oneShow(true); else oneHide(); render(); }
function oneNight() { const nm = nowMin(), bed = tmin(S.settings.bed || '21:00'), wake = tmin(S.settings.wake || '05:20'); return bed > wake ? (nm >= bed || nm < wake) : (nm >= bed && nm < wake); }
function oneNow() {
  const d = new Date(), nm = nowMin(), L = blocksFor(d).slice().sort((a, b) => tmin(a.start) - tmin(b.start)), o = day(d);
  const cur = L.find((b) => tmin(b.start) <= nm && nm < tmin(b.end) && b.kind !== 'sleep' && !/^.{0,3}sleep/i.test(b.title));
  const hard = (b) => ['dials', 'bac', 'train', 'program', 'agency'].includes(b.kind);
  const next = L.find((b) => tmin(b.start) > nm && hard(b));
  return { d, nm, o, cur, next, L };
}
function oneChain() {
  const dials = counterTotal('dials'), own = counterTotal('owners'), need = Math.max(0, Math.round((100 - own) / 0.025)), left = Math.max(1, daysUntil(S.settings.bigDate));
  return { dials, own, need, perDay: Math.ceil(need / Math.max(1, left * 5 / 7)) };
}
function oneAction(b, R) {
  const c = R.o.counters || {}, left = b ? Math.max(5, tmin(b.end) - R.nm) : 50, t = (s) => esc(String(s).replace(EMO_RE, '').trim());
  if (!b) return null;
  if (b.kind === 'dials') { const tg = dialTargetFor(R.d), dn = Number(c.dials) || 0, x = typeof currentCall === 'function' && Q ? currentCall() : null;
    return { big: dn >= tg && tg ? 'Target hit. Keep going.' : `Dial #${dn + 1}`, sub: `${dn} of ${tg || '?'} today${x ? ` · first up: ${esc(x.agency)}` : ''}`, btn: 'Start dialing', go: 'oneGo("dial")' }; }
  if (b.kind === 'bac') return { big: t(b.title).replace(/^BAC:\s*/i, '') || 'Study', sub: `BAC · ${Number(c.bac) || 0} min today · phone in another room`, btn: `Start ${Math.min(50, left)} min`, go: `oneGo("timer","bac",${Math.min(50, left)})` };
  if (b.kind === 'agency') return { big: t(b.title), sub: `Company deep work · ${Number(c.deep) || 0} min today · one thing only`, btn: `Start ${Math.min(50, left)} min`, go: `oneGo("timer","deep",${Math.min(50, left)})` };
  if (b.kind === 'train' || b.kind === 'program') return { big: t(b.title), sub: 'Training · 10 minutes still counts', btn: 'Open the session', go: 'oneGo("train")' };
  return { big: t(b.title), sub: `until ${b.end}`, btn: 'Done', go: `oneGo("done","${b.id}")` };
}
function oneGo(what, a, b) {
  oneHide();
  if (what === 'dial') { if (typeof nvOn === 'function' && nvOn() && typeof nvSwitch === 'function') nvSwitch('reactor'); else show('dial'); }
  else if (what === 'timer') { if (!S.timer) startTimer(a, b); }
  else if (what === 'train') { if (typeof nvGo === 'function' && typeof nvOn === 'function' && nvOn()) nvGo('train'); else show('train'); }
  else if (what === 'done') { const o = day(new Date()); o.blk = o.blk || {}; o.blk[a] = 'done'; touch(o); toast('Done. Next.'); setTimeout(() => oneShow(true), 400); }
  else if (what === 'sleep') { if (typeof lightsOut === 'function') lightsOut(); }
}
function oneHtml() {
  const R = oneNow(), C = oneChain(), m = minimumMet(R.d), dleft = daysUntil(S.settings.bigDate);
  const chain = `<div class="one-chain"><span>$20k</span><i>←</i><span>11 clients</span><i>←</i><span>${100 - Math.min(100, C.own)} talks to go</span><i>←</i><span>${fmt(C.need)} dials</span><i>←</i><b>this</b></div>`;
  let main;
  if (oneNight()) {
    main = `<div class="one-k">After ${S.settings.bed || '21:00'}</div><div class="one-big">Sleep.</div><div class="one-sub">Tomorrow's dials and BAC are decided tonight. Phone out of the bedroom.</div><button class="one-btn" onclick="oneGo('sleep')">Lights out</button>`;
  } else {
    const a = oneAction(R.cur, R);
    if (a) main = `<div class="one-k">Now · until ${R.cur.end}</div><div class="one-big">${a.big}</div><div class="one-sub">${a.sub}</div><button class="one-btn" onclick='${a.go}'>${a.btn}</button>`;
    else if (R.next) { const mins = tmin(R.next.start) - R.nm, n = oneAction(R.next, R); main = `<div class="one-k">Next hard thing · in ${mins >= 60 ? Math.floor(mins / 60) + 'h ' : ''}${mins % 60} min</div><div class="one-big">${n.big}</div><div class="one-sub">at ${R.next.start}. Until then: nothing to decide.</div><button class="one-btn ghost" onclick='${n.go}'>Start it early</button>`; }
    else main = `<div class="one-k">Day's hard blocks are behind you</div><div class="one-big">${m.met ? 'Close the day.' : 'Minimum first.'}</div><div class="one-sub">${m.met ? 'Shutdown, magnesium, phone out.' : `${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC. Never 0.`}</div><button class="one-btn" onclick='${m.met ? 'oneGo("sleep")' : m.dials < m.needDials ? 'oneGo("dial")' : 'oneGo("timer","bac",25)'}'>${m.met ? 'Lights out' : m.dials < m.needDials ? 'Dial the minimum' : 'Start 25 min BAC'}</button>`;
  }
  const run = S.timer ? `<div class="one-run">Timer running · ${esc(S.timer.counter)} · ${Math.max(0, S.timer.mins - Math.round((now() - S.timer.start) / 60000))} min left <button onclick="stopTimer(true);oneShow(true)">Finish</button></div>` : '';
  return `<div class="one-in"><div class="one-top"><b>ONE</b><span>D-${dleft} · ${fmt(C.dials)} dials · ${C.own} owner talks so far</span></div>
    <div class="one-mid">${main}${run}</div>
    <div class="one-bot"><div class="one-min ${m.met ? 'ok' : ''}"><span>Never 0 today</span><b>${m.dials}/${m.needDials} dials</b><b>${m.bac}/${m.needBac} min BAC</b>${m.met ? '<em>met</em>' : ''}</div>${chain}
    <button class="one-exit" onclick="oneHide(true)">Open the War Room</button></div></div>`;
}
function oneShow(force) {
  if (!force && !oneEnabled()) return;
  if (typeof sleepLive === 'function' && sleepLive()) return;
  if (typeof capPending !== 'undefined' && capPending) return;
  let el = document.getElementById('one'); if (!el) { el = document.createElement('div'); el.id = 'one'; document.body.appendChild(el); }
  el.innerHTML = oneHtml(); el.classList.add('on'); document.body.classList.add('one-open');
  clearInterval(window._oneT); window._oneT = setInterval(() => { const e = document.getElementById('one'); if (e && e.classList.contains('on')) e.innerHTML = oneHtml(); else clearInterval(window._oneT); }, 30000);
}
function oneHide(user) { const el = document.getElementById('one'); if (el) el.classList.remove('on'); document.body.classList.remove('one-open'); clearInterval(window._oneT); if (user) oneHiddenAt = Date.now(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { window._oneAway = Date.now(); return; } if (window._oneAway && Date.now() - window._oneAway > 20 * 60e3) setTimeout(() => oneShow(), 600); });
setTimeout(() => { try { oneShow(); } catch (e) { console.warn('ONE', e); } }, 1800);
if (typeof appearanceCard === 'function' && !appearanceCard._one) {
  const _a = appearanceCard;
  appearanceCard = function () { const on = oneEnabled(); return _a() + `<div class="card"><div class="card-h"><div class="card-t">Start screen</div><div class="card-r">this device</div></div><div class="small muted" style="margin-bottom:10px">ONE opens the app on the single thing the calendar says to do now, and on sleep after ${S.settings.bed || '21:00'}.</div><div class="row" style="gap:8px"><button class="btn grow ${on ? 'primary' : ''}" onclick="oneSet(true)">ONE</button><button class="btn grow ${on ? '' : 'primary'}" onclick="oneSet(false)">Straight to the War Room</button></div></div>`; };
  appearanceCard._one = 1;
}
