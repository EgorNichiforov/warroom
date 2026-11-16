/* War Room · trnow.js (13.3.6, owner request 16 Nov 2026)
   "I tap Train and I want the plan for the training I have now or next." Two things:
   1. Opening Train (from the menu, a button, anywhere) jumps to today's training block that is happening now, or else the
      next one today, already loaded with its program (OFP Mon → strength plan, 05:30 → mobility, 20:52 → floor stretch).
   2. A "Today's training" strip at the top: every training block of the day with its time and state
      (done · now · next · later · missed). Tap one to open its plan. */
let _trAuto = '';
function trToday() {
  const t = new Date(), k = dk(t), nm = nowMin(), ss = sessionsRO(S.days[k]);
  return blocksFor(t).filter(isTrainBlock).map((b) => {
    const s = ss.find((x) => x.block === b.id || (x.blockTitle && x.blockTitle === b.title));
    const st = s && s.done ? 'done' : s && s.skipped ? 'skipped' : tmin(b.start) <= nm && nm < tmin(b.end) ? 'now' : tmin(b.start) > nm ? 'later' : 'missed';
    return { b, s, st };
  }).sort((a, c) => tmin(a.b.start) - tmin(c.b.start));
}
function trFocus() { const L = trToday(); return L.find((x) => x.st === 'now') || L.find((x) => x.st === 'later') || null; }
function trProgName(b) { try { const p = blockProgram(b, new Date()); return p && S.programs[p] ? S.programs[p].name : (p == null ? 'Tennis session' : ''); } catch (e) { return ''; } }
function trStrip() {
  const L = trToday(); if (!L.length) return '';
  const k = dk(new Date()), f = trFocus(), cur = (() => { try { const o = S.days[k], s = curSession(o); return s && s.block; } catch (e) { return null; } })();
  let nextMarked = false;
  const lab = { done: '✓ done', skipped: '– skipped', now: '● now', missed: 'not logged', later: 'later' };
  return `<div class="card trn"><div class="card-t" style="margin-bottom:6px">Today's training</div>${L.map((x) => {
    let st = x.st; if (st === 'later' && !nextMarked && (!f || f.b.id === x.b.id)) { st = 'next'; nextMarked = true; }
    const mins = tmin(x.b.start) - nowMin(), when = st === 'next' && mins > 0 ? (mins < 60 ? `in ${mins} min` : `in ${Math.floor(mins / 60)} h ${mins % 60 ? (mins % 60) + ' min' : ''}`) : (lab[st] || st);
    return `<div class="trn-r ${st} ${cur === x.b.id ? 'sel' : ''}" onclick="openBlockTraining('${x.b.id}','${k}')"><b>${x.b.start}</b><span><em>${esc(x.b.title.replace(/^[^\p{L}\p{N}]+/u, ''))}</em><i>${esc(trProgName(x.b))}</i></span><u>${when}</u></div>`;
  }).join('')}</div>`;
}
/* 1 · auto-open the now/next block when Train is opened (once per visit; manual picks are respected) */
if (typeof show === 'function' && !show._trn) {
  const _s = show;
  show = function (v) {
    if (v === 'train' && typeof view !== 'undefined' && view !== 'train' && !show._inner) {
      try {
        const today = dk(new Date()) === dk(curDate || new Date()), f = today ? trFocus() : null, key = f ? f.b.id + '@' + dk(new Date()) : '';
        if (f && _trAuto !== key) { _trAuto = key; show._inner = 1; try { openBlockTraining(f.b.id, dk(new Date())); } finally { show._inner = 0; } return; }
      } catch (e) { }
    }
    return _s.apply(this, arguments);
  };
  show._trn = 1;
}
/* 2 · the strip on top of Train */
if (typeof renderTrain === 'function' && !renderTrain._trn) {
  const _r = renderTrain;
  renderTrain = function () { let h = _r.apply(this, arguments); try { if (dk(curDate) === dk(new Date())) h = trStrip() + h; } catch (e) { } return h; };
  renderTrain._trn = 1;
}
(function () {
  const s = document.createElement('style');
  s.textContent = `.trn-r{display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;padding:9px 6px;border-radius:10px;cursor:pointer}
  .trn-r+.trn-r{border-top:1px solid var(--line,rgba(255,255,255,.08))}.trn-r b{font-variant-numeric:tabular-nums;font-size:13px}
  .trn-r span{display:flex;flex-direction:column;min-width:0}.trn-r em{font-style:normal;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trn-r i{font-style:normal;font-size:12px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trn-r u{text-decoration:none;font-size:12px;opacity:.75;white-space:nowrap}
  .trn-r.done,.trn-r.skipped{opacity:.55}.trn-r.now u,.trn-r.next u{opacity:1;font-weight:800;color:rgb(var(--acc-rgb,120 200 255))}
  .trn-r.sel{background:rgba(255,255,255,.06)}.trn-r.missed u{color:var(--bad,#f87171)}`;
  document.head.appendChild(s);
})();
