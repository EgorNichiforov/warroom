/* War Room 13.17 · THE LAUNCH: 45 seconds between "Start session" and the first dial.
   Mentor council (18 Nov 2026): state before strategy (Robbins), detach from the outcome (Braun, Gallwey),
   reps kill nerves (Hormozi). Tue 17 Nov had a 100-dial block and 0 dials: the gap is starting, not knowing.
   The timer ends by dialing the next number. One tap skips it. */
'use strict';
(function () {
  if (typeof startSession !== 'function') return;
  const original = startSession;
  let lt = null;
  const STEPS = [
    [0, 'Stand up', 'Shoulders back, chin up. You dial standing (Robbins: motion creates emotion).'],
    [15, 'Three slow breaths, out loud', 'In through the nose, long breath out. Voice at full volume after the third.'],
    [30, 'Say it', '“My job is the dial, not the yes.” The first 10 calls are warm-up reps: ugly is fine.'],
  ];
  function nextCall() { try { return Q ? currentCall() : null; } catch (e) { return null; } }
  function paint(left) {
    const el = document.getElementById('launch-box'); if (!el) return;
    const t = 45 - left;
    el.querySelectorAll('.lstep').forEach((n, i) => { const at = STEPS[i][0], nxt = STEPS[i + 1] ? STEPS[i + 1][0] : 45; n.style.opacity = t >= at ? '1' : '.35'; n.querySelector('.lck').textContent = t >= nxt ? '✓' : t >= at ? '›' : ''; });
    const c = document.getElementById('launch-t'); if (c) c.textContent = left;
  }
  function go(dial) {
    clearInterval(lt); lt = null;
    try { closeModal(); } catch (e) { }
    original();
    try { const d = day(new Date()); d.launches = (d.launches || 0) + 1; touch(d); } catch (e) { }
    if (!dial) return;
    const x = nextCall(); if (!x) return;
    const tel = telHref(x.phone); if (!tel) return;
    try { markDialing(x.id); } catch (e) { }
    location.href = tel;
  }
  window.launchGo = go;
  window.startSession = function () {
    if ((S.session && S.session.active) || (S.settings && S.settings.launchOff)) return original();
    const x = nextCall(); let tg = 0, v = 0;
    try { tg = dialTargetFor(new Date()) || 0; v = Number(day(new Date()).counters.dials) || 0; } catch (e) { }
    openModal(`<div id="launch-box"><div class="lab" style="color:var(--acc)">Launch · first dial in <b id="launch-t" class="mono">45</b> s</div>
      <h2 style="margin:6px 0 12px">${tg ? `${Math.max(0, tg - v)} dials to go today` : 'Dial session'}</h2>
      ${STEPS.map(([, h, d]) => `<div class="lstep" style="display:flex;gap:10px;margin:10px 0;opacity:.35;transition:opacity .4s"><b class="lck" style="width:16px;color:var(--acc)"></b><div><b>${esc(h)}</b><div class="small muted">${esc(d)}</div></div></div>`).join('')}
      ${x ? `<div class="card flat" style="margin-top:12px"><div class="small muted">First call</div><b>${esc(x.agency)}</b> · ${esc(phonePretty(x.phone))}</div>` : ''}
      <div class="actions"><button class="btn" onclick="launchGo(false)">Start without dialing</button><button class="btn primary" onclick="launchGo(true)">📞 Dial now</button></div>
      <div class="xs muted" style="margin-top:8px">The timer dials the first number for you. A no is a rep, not a verdict.</div></div>`, true);
    let left = 45; paint(left);
    clearInterval(lt); lt = setInterval(() => { left -= 1; const bg = document.getElementById('modal-bg'); if (!document.getElementById('launch-box') || !bg || !bg.classList.contains('open')) { clearInterval(lt); lt = null; return; } paint(left); if (left <= 0) go(true); }, 1000);
  };
})();
