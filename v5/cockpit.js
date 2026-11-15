/* War Room 10.2 · CALL COCKPIT — the Dial screen rebuilt around one job: the next call.
   Pattern from the best sales dialers (power dialers / sequencers): one contact on screen, one huge call button,
   context right under it (who to ask for, the hook, last touch), one-tap outcomes with keyboard keys,
   the card slides away and the next one slides in, live session stats on top. */
'use strict';
const CK_OUT = [['noanswer', 'No answer', '+1 dial', 'A'], ['voicemail', 'Voicemail', 'retry in 2 days', 'V'], ['gatekeeper', 'Gatekeeper', 'get the name', 'G'], ['owner', 'Owner talk', '+1 owner', 'O']];
let ckBusy = false;
function ckOutcome(id, kind) {
  if (ckBusy) return; ckBusy = true; const c = document.getElementById('ck-card');
  try { navigator.vibrate && navigator.vibrate(kind === 'owner' ? [10, 40, 10] : 8); } catch (e) { }
  if (c && !matchMedia('(prefers-reduced-motion: reduce)').matches) { c.classList.add(kind === 'owner' ? 'out-win' : 'out'); setTimeout(() => { ckBusy = false; outcome(id, kind); const n = document.getElementById('ck-card'); if (n) n.classList.add('in'); }, 230); }
  else { ckBusy = false; outcome(id, kind); }
}
function ckRing(v, t) { const p = t ? Math.min(1, v / t) : 0, C = 2 * Math.PI * 42; return `<svg viewBox="0 0 100 100" class="ck-ring"><circle cx="50" cy="50" r="42" class="bg"/><circle cx="50" cy="50" r="42" class="fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - p)}"/></svg>`; }
if (typeof renderDial === 'function' && !renderDial._ck) {
  const _rd = renderDial;
  renderDial = function () {
    const mode = `<div class="ck-mode">${[['owners', 'Owners', "benchMode='owners';render()"], ['caregivers', 'Caregivers' + (typeof B !== 'undefined' && B && typeof cgNext === 'function' && cgNext().length ? ' · ' + cgNext().length : ''), "benchMode='caregivers';render()"], ['clients', 'Clients', "intelTab='clients';show('intel')"]].map(([k, l, a]) => `<button class="${benchMode === k ? 'on' : ''}" onclick="${a}">${l}</button>`).join('')}</div>`;
    if (benchMode !== 'owners') { _rd(); const el = $('view-dial'); const mb = el && el.querySelector(':scope > .chips'); if (mb) mb.outerHTML = mode; return; }
    const d = new Date(), k = dk(d), o = day(k), nm = nowMin(), tg = dialTargetFor(d), v = Number(o.counters.dials) || 0, ow = Number(o.counters.owners) || 0, wk = counterWeek('dials', d);
    const blk = blocksFor(d).find((b) => b.kind === 'dials' && tmin(b.start) <= nm && nm < tmin(b.end)), nextBlk = blocksFor(d).find((b) => b.kind === 'dials' && tmin(b.start) > nm);
    const sess = S.session && S.session.active ? S.session : null, x = Q ? currentCall() : null, list = Q ? qNextList(dialFilter) : [], up = list.filter((y) => !x || y.id !== x.id).slice(0, 5);
    const sd = sess ? v - sess.d0 : 0, so = sess ? ow - sess.o0 : 0;
    const head = `<div class="ck-head">
      <div class="ck-prog">${ckRing(v, tg)}<div class="ck-pv"><b>${v}</b><span>/ ${tg || '–'}</span></div></div>
      <div class="ck-stats"><div><b>${ow}</b><span>owner talks today</span></div><div><b>${wk}</b><span>dials this week</span></div><div><b>${counterTotal('owners')}</b><span>of 100 owner talks</span></div></div>
      <div class="ck-sess ${sess ? 'on' : ''} ${blk ? 'live' : ''}">${sess ? `<span class="dot"></span><b id="sess-el">${fmtEl(Math.floor((now() - sess.start) / 1000))}</b><em>${sd} dials · ${so} owners${sd ? ' · ' + Math.round((so / sd) * 100) + '%' : ''}</em><button onclick="endSession();render()">End</button>`
        : `<em>${blk ? `<b>Dial block now</b> · until ${blk.end}` : nextBlk ? `Next block <b>${nextBlk.start}</b>` : 'No dial block left today'} · Florida ${florida(nm)}</em><button class="go" onclick="startSession();render()">Start session</button>`}</div></div>`;
    const card = !Q ? `<div class="card"><div class="empty">Loading the call queue…</div></div>` : !x ? `<div class="card ck-empty"><b>Queue clear for this filter.</b><span>Switch the filter below or add an agency.</span></div>` : (() => {
      const last = (x.log || []).slice(-1)[0], tel = telHref(x.phone), note = phoneNote(x.phone);
      const chips = [x.tier === 'T1' ? 'Tier 1' : x.tier === 'AL' || x.tier === 'AL2' ? 'Assisted living' : '', x.status === 'callback' ? `Callback ${x.next_at ? fmtShort(pd(x.next_at)) : ''}` : x.status === 'voicemail' ? 'Voicemail left' : x.status === 'gatekeeper' ? 'Gatekeeper' : '', x.attempts ? `Attempt ${x.attempts + 1}` : 'First call'].filter(Boolean);
      return `<div class="card ck-card ${blk ? 'live' : ''}" id="ck-card">
        <div class="ck-top"><span class="ck-n">#${x.id}</span><div class="ck-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div><button class="ck-ic" onclick="editQueueItem(${x.id})" title="Edit">✎</button><button class="ck-ic" onclick="ckOutcome(${x.id},'skip')" title="Skip (S)">Skip ›</button></div>
        <div class="ck-ag" onclick="crmOpen(${x.id})">${esc(x.agency)}</div><div class="ck-loc">${esc(x.city || '')}${x.county ? ' · ' + esc(x.county) + ' County' : ''}</div>
        ${tel ? `<a class="ck-call" href="${tel}" onclick="markDialing(${x.id})"><span class="ph">${ic('dial', 26)}</span><span><b>${phonePretty(x.phone)}</b><em>Tap to call${note ? ' · ' + esc(note) : ''}</em></span></a>` : `<div class="ck-nophone">No phone on file. Find it, then tap ✎ to add it.</div>`}
        <div class="ck-brief"><div><span>Ask for</span><b>${esc(x.contact || 'Whoever handles caregiver hiring')}</b>${x.receptionist ? `<em>Front desk: ${esc(x.receptionist)}</em>` : ''}</div><div><span>Hook</span><p>${esc(hookFor(x))}</p></div>${last ? `<div><span>Last time</span><em>${new Date(last.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${esc(last.r)}${last.note ? ' · ' + esc(last.note) : ''}</em></div>` : ''}</div>
        <div class="ck-outs">${CK_OUT.map(([kd, l, s, key]) => `<button class="o-${kd}" onclick="ckOutcome(${x.id},'${kd}')"><b>${l}</b><small>${s}</small><kbd>${key}</kbd></button>`).join('')}</div>
        <button class="ck-bad" onclick="ckOutcome(${x.id},'bad')">Bad number / closed <kbd>X</kbd></button></div>`;
    })();
    const upHtml = up.length ? `<div class="ck-up"><div class="dk-k">Up next</div><div class="ck-upl">${up.map((y, i) => `<button onclick="dialPick='${y.id}';render()" style="animation-delay:${i * 40}ms"><b>${esc(y.agency)}</b><span>${esc(y.city || '')}${y.attempts ? ' · ' + y.attempts + '×' : ''}</span></button>`).join('')}</div></div>` : '';
    $('view-dial').innerHTML = (typeof crmDialBanner === 'function' ? crmDialBanner() : '') + mode + head + card + upHtml + lastEntryHtml() + `<div class="ck-tools"><button onclick="scriptOpen=!scriptOpen;render()">${scriptOpen ? 'Hide' : 'Show'} script</button><button onclick="queueOpen=!queueOpen;render()">${queueOpen ? 'Hide' : 'Show'} full queue · ${list.length}</button><button onclick="ledgerOpen()">Call log</button><button onclick="undoLast()">Undo last</button></div>`;
    if (scriptOpen || queueOpen) { const tmp = document.createElement('div'); const save0 = $('view-dial').innerHTML; _rd(); const full = $('view-dial'); const cards = [...full.querySelectorAll(':scope > .card')].filter((c) => /Script v3|Queue ·/.test(c.textContent)); const keep = cards.map((c) => c.outerHTML).join(''); full.innerHTML = save0 + keep; }
    clearInterval(window.sessTimer2); if (sess) window.sessTimer2 = setInterval(() => { const el = $('sess-el'); if (!el) { clearInterval(window.sessTimer2); return; } el.textContent = fmtEl(Math.floor((now() - sess.start) / 1000)); }, 1000);
  };
  renderDial._ck = 1;
}
document.addEventListener('keydown', (e) => {
  if (view !== 'dial' || benchMode !== 'owners' || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName || '') || document.getElementById('modal-bg').classList.contains('open') || (document.getElementById('arc') || {}).classList?.contains('on')) return;
  const m = { a: 'noanswer', v: 'voicemail', g: 'gatekeeper', o: 'owner', x: 'bad', s: 'skip' }[e.key.toLowerCase()]; const x = Q ? currentCall() : null; if (!m || !x) return; e.preventDefault(); ckOutcome(x.id, m);
});
/* fix: an agency already called today drops below everything not yet called today (it reappeared on top after "No answer") */
if (typeof qPriority === 'function' && !qPriority._ck) { const _q = qPriority; qPriority = function (x, tk) { const p = _q(x, tk); const today = (x.log || []).some((e) => (e.day || dk(new Date(e.at))) === tk); return today && !(x.status === 'callback' && x.next_at && x.next_at <= tk && !(x.log || []).some((e) => e.at > new Date(tk + 'T00:00:00').getTime() && /callback/i.test(e.r || ''))) ? p + 10 : p; }; qPriority._ck = 1; }
