/* War Room v4 · Coach: a voice call in the browser (Vapi Web SDK) that reads today's numbers from this device. The 05:25 phone call lives in coach/ (Cloudflare Worker). */
const coachState = { status: 'idle', active: false, vapi: null, log: [] };
function briefText() {
  const t = new Date(); t.setHours(0, 0, 0, 0); const today = dk(t), y = addDays(t, -1), yk = dk(y), w = dow(t), nm = nowMin();
  const od = S.days[today] || {}, oy = S.days[yk]; const dialsC = S.counters.items.find((c) => c.id === 'dials'), bacC = S.counters.items.find((c) => c.id === 'bac');
  const L = [`Now: ${fmtDate(t)} ${pad(Math.floor(nm / 60))}:${pad(nm % 60)}.`];
  if (oy) { const m = minimumMet(y); L.push(`Yesterday: grade ${gradeFor(y)} (${dayScore(y)}%). Dials ${m.dials}${dialsC ? '/' + (dialsC.targets[dow(y)] || 0) : ''}, owner conversations ${Number(oy.counters?.owners) || 0}, BAC ${m.bac} min, weight ${oy.weight ? fmt(oy.weight, 1) + ' kg' : 'not logged'}. Minimum day ${m.met ? 'met' : 'MISSED'}.${oy.win ? ' Win: ' + oy.win + '.' : ''}${oy.loss ? ' Loss: ' + oy.loss + '.' : ''}${oy.fix ? ' Fix: ' + oy.fix + '.' : ''}`); } else L.push('Yesterday: nothing logged.');
  L.push(`Stakes owed: ${fmt(stakesOwed())} ${S.settings.currency}. Streaks: weigh-ins ${streakWeigh()}d, minimum days ${streakMinimum()}d.`);
  const last = latestWeight(), a7 = avgWeight(7); L.push(`Weight: ${last ? `latest ${fmt(last.w, 1)} kg, 7-day avg ${fmt(a7, 1)}` : 'no entries'}, target ${S.settings.weightTarget} kg. Weighed in today: ${od.weight ? 'yes, ' + fmt(od.weight, 1) + ' kg' : 'no'}.`);
  if (dialsC) { const wk = counterWeek('dials', t), need = paceNeed(dialsC, t); L.push(`Week: dials ${wk}/${dialsC.weekly}${need != null ? ` (need ${need}/day on remaining dial days)` : ''}, BAC ${(counterWeek('bac', t) / 60).toFixed(1)}h/20h, training days ${workoutsWeek(t)}, owner conversations all time ${counterTotal('owners')}/100.`); }
  try { if (typeof mrr === 'function') L.push(`Pipeline: MRR $${mrr().toLocaleString('en-US')} (${members().length} members), ${trials().length} trials.`); } catch (e) { }
  const prog = S.programs[S.programByDay.map[w]]; const bl = blocksFor(t); const cur = bl.find((b) => tmin(b.start) <= nm && nm < tmin(b.end)); const next = bl.find((b) => tmin(b.start) > nm);
  L.push(`Today (${DAY_LONG[w]}): training ${prog ? prog.name : 'rest'}${typeof dayTrained === 'function' && dayTrained(od) ? ' (done)' : ''}. Dial target ${dialsC ? dialsC.targets[w] || 0 : 0}, BAC target ${bacC ? bacC.targets[w] || 0 : 0} min. So far today: dials ${Number(od.counters?.dials) || 0}, owners ${Number(od.counters?.owners) || 0}, BAC ${Number(od.counters?.bac) || 0} min.${cur ? ` Current block: ${cur.title} (${cur.start}–${cur.end}).` : ''}${next ? ` Next: ${next.title} at ${next.start}.` : ''}`);
  const t3 = (od.top3 || []).filter((x) => x.t); L.push(`Top 3 today: ${t3.length ? t3.map((x, i) => `${i + 1}) ${x.t}${x.d ? ' (done)' : ''}`).join(' ') : 'NOT SET'}.`);
  const due = tasksList().filter((x) => !x.done && x.due && x.due <= today).map((x) => x.title); if (due.length) L.push(`Tasks due: ${due.slice(0, 6).join('; ')}.`);
  L.push(`Countdown: ${daysUntil(S.settings.bigDate)} days to July 1 2027, ${daysUntil(S.settings.bacDate)} days to BAC.`);
  return L.join('\n').replace(/\{\{|\}\}|\{%|%\}/g, ' ');
}
function renderCoach() {
  const c = S.settings.coach || {}; const ready = c.publicKey && c.assistantId;
  return `<div class="card ${coachState.active ? 'ac' : ''}"><div class="card-h"><div class="card-t">📞 Call coach</div><div class="card-r" id="coach-status">${esc(coachState.status)}</div></div>
    <div class="hint">A voice call in the browser, no phone bill. The coach gets today's numbers from this device before it answers. Say what you need: log numbers, decide something, get sent back to the phone.</div>
    <button class="btn ${coachState.active ? 'danger' : 'primary'} hugebtn block" style="margin-top:12px" onclick="coachToggle()" ${ready ? '' : 'disabled'}>${coachState.active ? '■ End call' : ready ? '📞 Call coach' : 'Set up below first'}</button>
    <div id="coach-log" class="small muted" style="margin-top:10px;max-height:220px;overflow:auto;white-space:pre-wrap">${esc(coachState.log.slice(-12).join('\n'))}</div></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Setup</div><div class="field"><label>Vapi public key</label><input value="${esc(c.publicKey || '')}" autocapitalize="off" onchange="setCoach('publicKey',this.value)"></div><div class="field"><label>Assistant id</label><input value="${esc(c.assistantId || '')}" autocapitalize="off" onchange="setCoach('assistantId',this.value)"></div><div class="hint">Both come from the coach server setup (coach/README.md in the repo). The 05:25 morning phone call is scheduled on the server, not here.</div></div>
    <div class="card"><div class="card-t" style="margin-bottom:6px">Recent calls</div>${Object.keys(S.days).filter((k) => S.days[k].calls && S.days[k].calls.length).sort().reverse().slice(0, 7).map((k) => S.days[k].calls.map((x) => `<div class="kv"><span>${fmtShort(pd(k))} · ${esc(x.kind)}${x.seconds ? ' · ' + Math.round(x.seconds / 60) + ' min' : ''}</span><span class="v muted small">${esc(x.status || '')}</span></div>${x.summary ? `<div class="xs muted" style="margin:-6px 0 8px">${esc(x.summary)}</div>` : ''}`).join('')).join('') || '<div class="empty">No coach calls logged yet.</div>'}</div>`;
}
function setCoach(k, v) { if (!S.settings.coach) S.settings.coach = {}; S.settings.coach[k] = v.trim(); S.settings._u = now(); save(); render(); }
function coachLog(s) { coachState.log.push(s); const el = $('coach-log'); if (el) { el.textContent = coachState.log.slice(-12).join('\n'); el.scrollTop = el.scrollHeight; } }
function coachStatus(s) { coachState.status = s; const el = $('coach-status'); if (el) el.textContent = s; }
async function coachToggle() {
  const c = S.settings.coach || {};
  if (coachState.active) { try { coachState.vapi && coachState.vapi.stop(); } catch (e) { } return; }
  try {
    coachStatus('connecting…');
    if (!coachState.vapi) {
      const mod = await import('https://esm.sh/@vapi-ai/web@3.1.0'); const Vapi = mod.default || mod.Vapi;
      const v = new Vapi(c.publicKey); coachState.vapi = v;
      v.on('call-start', () => { coachState.active = true; coachStatus('on the call'); render(); });
      v.on('call-end', () => { coachState.active = false; coachStatus('ended'); render(); if (syncReady()) setTimeout(() => pullCloud(true), 2500); });
      v.on('error', (e) => { coachState.active = false; coachStatus('error'); coachLog('error: ' + (e && (e.message || e.errorMsg || JSON.stringify(e)))); render(); });
      v.on('message', (m) => { if (m && m.type === 'transcript' && m.transcriptType === 'final') coachLog((m.role === 'assistant' ? 'Coach: ' : 'You: ') + m.transcript); });
    }
    await coachState.vapi.start(c.assistantId, { variableValues: { context: briefText() } });
  } catch (e) { coachState.active = false; coachStatus('error'); coachLog('error: ' + (e.message || e)); render(); }
}
