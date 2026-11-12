/* War Room v5 · Ask: questions answered from your own playbook and today's numbers, inside the app.
   Uses the same AI key as the food photos. "Ask Claude" hands the question, with your numbers, to the Claude app.
   Dispatches: notes Claude leaves for you (morning brief, evening check) appear at the top. */
'use strict';

const ASK_KEY = 'wr-ask';
let askLog = []; try { askLog = JSON.parse(localStorage.getItem(ASK_KEY) || '[]'); } catch (e) { askLog = []; }
let askBusy = false, askFocus = '';
function askSave() { try { localStorage.setItem(ASK_KEY, JSON.stringify(askLog.slice(-30))); } catch (e) { } }

/* everything the assistant knows, as plain text */
function askContext(short) {
  const t = new Date(), k = dk(t), o = S.days[k] || { counters: {} }, c = o.counters || {}, r = rankInfo(), op = weekOp(t), ft = foodTotals(k), tt = foodTargets();
  let m = 0, mem = 0, tri = 0, cb = 0, fresh = 0; try { m = mrr(); mem = members().length; tri = trials().length; cb = qItems().filter((x) => x.status === 'callback' && x.next_at && x.next_at <= k).length; fresh = qItems().filter((x) => !(x.log && x.log.length) && !x.attempts && Q_OPEN.includes(x.status)).length; } catch (e) { }
  const bl = blocksFor(t).filter((b) => tmin(b.end) > nowMin() && b.kind !== 'sleep').slice(0, 6).map((b) => `${b.start}-${b.end} ${b.title}`).join('; ');
  const a7 = avgWeight(7);
  const nums = `NOW: ${DAY_LONG[dow(t)]} ${fmtDate(t)}, ${pad(t.getHours())}:${pad(t.getMinutes())} Moldova (Florida = minus 7 h). ${daysUntil(S.settings.bigDate)} days to 1 July 2027.
TODAY: dials ${Number(c.dials) || 0}/${dialTarget(t)}, owner talks ${Number(c.owners) || 0}, BAC ${Number(c.bac) || 0} min, deep work ${Number(c.deep) || 0} min, trained ${dayTrained(o) ? 'yes' : 'no'}, weight ${o.weight || 'not logged'}, food ${fmt(ft.kcal)}/${fmt(tt.kcal)} kcal and ${Math.round(ft.p)}/${tt.p} g protein, day score ${dayScore(t)}%, minimum ${minimumMet(t).met ? 'met' : 'not met'}.
WEEK: ${op.wk}/${op.wkT} dials${op.need ? `, needs ${op.need} a day on ${op.n} dial days left` : ''}. Training days ${workoutsWeek(t)}/6.
ALL TIME: ${counterTotal('dials')} dials, ${counterTotal('owners')} owner conversations, MRR $${m}, ${mem} paying, ${tri} on trial, ${cb} callbacks due, ${fresh} agencies never called. Weight 7-day avg ${a7 ? fmt(a7, 1) : 'n/a'} kg (goal ${S.settings.weightTarget}). Rank ${r.name}, ${fmt(r.xp)} XP.
REST OF TODAY: ${bl || 'nothing scheduled'}.`;
  if (short) return nums;
  const pages = pbAll().map((p) => `### ${p.title}\n${p.body}`).join('\n\n');
  return nums + '\n\nPLAYBOOK (his own plan, rules, scripts and SOPs):\n' + pages;
}
const ASK_SYSTEM = `You are the assistant built into Egor's War Room app. Egor is a final-year high-school student in Chisinau, Moldova, who coaches kids' tennis and is building Caregiver Bench (recruiting screened caregivers for private-pay home care agencies in Naples, Florida, by cold calling). His #1 goal: $20,000 MRR by 1 July 2027. Also: pass BAC with 8+, reach 85 kg.
Answer from his playbook and his numbers below. Rules:
- Short and direct. Lead with the answer. Use his numbers. Plain words, no jargon.
- If the answer is not in the playbook or numbers, say "That's not in your playbook" and give your best general answer, labelled as yours.
- Never invent numbers, quotes, clients or results.
- Judge ideas by one test: does this make the $20k goal more or less likely? Say which.
- During a dial block, answer in at most 3 lines and send him back to the phone.
- Respect the legal lines in the playbook. Never suggest charging per client, placing caregivers, or recording calls.
- Plan changes only happen at the Sunday review; if he asks to change the plan mid-week, note it for Sunday.
- Reply in the language he writes in.`;

async function aiText(system, msgs) {
  const c = aiCfg(); if (!c.key) throw new Error('No AI key yet');
  const list = [c.model].concat(c.alts || []).filter((x, i, a) => x && a.indexOf(x) === i); let last = null;
  for (const model of list) {
    try {
      if (c.provider === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 1200, system, messages: msgs.map((x) => ({ role: x.role, content: x.text })) }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
        return (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('').trim();
      }
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': c.key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: msgs.map((x) => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.text }] })), generationConfig: { temperature: 0.4 } }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
      const cand = (j.candidates || [])[0] || {}, text = ((cand.content || {}).parts || []).filter((x) => !x.thought).map((x) => x.text || '').join('').trim();
      if (!text) throw new Error('Empty answer' + (cand.finishReason ? ' (' + cand.finishReason + ')' : ''));
      return text;
    } catch (e) { last = e; if (/API key not valid|API_KEY_INVALID|location is not supported/i.test(e.message) || !(e.status === 404 || e.status === 429 || e.status >= 500 || /quota|not found|overloaded/i.test(e.message))) break; }
  }
  throw last || new Error('No model answered');
}
async function askSend(text) {
  text = String(text || '').trim(); if (!text || askBusy) return;
  if (!aiOn()) { askLog.push({ role: 'user', text, at: now() }, { role: 'assistant', text: 'The in-app assistant needs the AI key (More → Food photo AI, the same key). Until then, use **Ask Claude**: it opens the Claude app with your question and today\'s numbers.', at: now(), sys: true }); askSave(); render(); return; }
  askLog.push({ role: 'user', text, at: now() }); askBusy = true; askSave(); render();
  try {
    const hist = askLog.filter((x) => !x.sys && !x.err).slice(-10).map((x) => ({ role: x.role, text: x.text }));
    const sys = ASK_SYSTEM + '\n\n' + askContext(false) + (askFocus ? `\n\nHe is asking from the playbook page "${(pb(askFocus) || {}).title || askFocus}".` : '');
    const a = await aiText(sys, hist);
    askLog.push({ role: 'assistant', text: a, at: now() });
  } catch (e) { askLog.push({ role: 'assistant', text: aiExplain(e.message) + ' (' + String(e.message).slice(0, 120) + ')', at: now(), err: true }); }
  askBusy = false; askSave(); render();
  const box = document.querySelector('.chat'); if (box) box.scrollTop = box.scrollHeight;
}
function askClaude(q) {
  const question = String(q || ($('ask-in') && $('ask-in').value) || '').trim();
  const prompt = `${question || 'Look at my numbers and tell me what matters most right now.'}\n\n[From my War Room, ${fmtDate(new Date())}]\n${askContext(true)}`;
  try { navigator.clipboard.writeText(prompt); } catch (e) { }
  window.open('https://claude.ai/new?q=' + encodeURIComponent(prompt.slice(0, 1800)), '_blank', 'noopener');
  toast('Opening Claude. Your question is also copied: paste it if the box is empty.');
}
function askQuick(q, toClaude) { view = 'ask'; render(); const i = $('ask-in'); if (i) { i.value = q; i.focus(); } if (toClaude) { closeModal(); } }
function askAbout(id) { askFocus = id; const p = pb(id); askQuick(`About "${p ? p.title : id}": `); }
function askClear() { if (!confirm('Clear this conversation?')) return; askLog = []; askFocus = ''; askSave(); render(); }

/* dispatches from Claude (written into the synced War Room by scheduled check-ins) */
function inboxList() { return Object.values(S.inbox || {}).filter((x) => x && !x._del).sort((a, b) => (b.at || 0) - (a.at || 0)); }
function inboxUnread() { return inboxList().filter((x) => !x.read).length; }
function inboxRead(id) { const x = S.inbox && S.inbox[id]; if (!x || x.read) return; x.read = now(); x._u = now(); save(); }
function inboxOpen(id) { const x = S.inbox[id]; if (!x) return; inboxRead(id); openModal(`<h2>${esc(x.title || 'From Claude')}</h2><div class="small muted" style="margin:-6px 0 12px">${new Date(x.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>${pbRender(x.body || '')}<div class="actions"><button class="btn" onclick="closeModal();askQuick('About the note “${esc((x.title || '').replace(/'/g, ''))}”: ')">Ask about it</button><button class="btn primary" onclick="closeModal();render()">Got it</button></div>`, true); render(); }
function inboxCard(limit) {
  const L = inboxList().slice(0, limit || 3); if (!L.length) return '';
  return `<div class="card"><div class="card-h"><div class="card-t">From Claude</div><div class="card-r">${inboxUnread() ? `<b class="acc">${inboxUnread()} new</b>` : 'all read'}</div></div>${L.map((x) => `<div class="disp ${x.read ? '' : 'new'}" onclick="inboxOpen('${x.id}')"><div class="dt">${x.read ? '' : '<i></i>'}${esc(x.title || 'Note')}</div><div class="dd">${esc(String(x.body || '').replace(/[#>*|]/g, '').slice(0, 120))}</div><div class="dw">${agoText(x.at)}</div></div>`).join('')}</div>`;
}

function renderAsk() {
  const ai = aiOn(), chips = ['What should I do right now?', 'How is my week going?', 'What do I say if they ask the price?', 'Gatekeeper script?', "What's my next deadline?", 'Why am I doing this?'];
  const msgs = askLog.map((x) => `<div class="msg ${x.role} ${x.err ? 'err' : ''}">${x.role === 'assistant' ? pbRender(x.text) : esc(x.text)}</div>`).join('') + (askBusy ? '<div class="msg assistant"><div class="typing"><i></i><i></i><i></i></div></div>' : '');
  $('view-ask').innerHTML = `${inboxCard(3)}<div class="card askcard"><div class="card-h"><div class="card-t">Ask your War Room</div><div class="card-r">${ai ? 'answers from your playbook + numbers' : '<span class="acc">needs the AI key for in-app answers</span>'}${askLog.length ? ` · <a href="#" onclick="askClear();return false">clear</a>` : ''}</div></div>
    <div class="chat">${msgs || `<div class="empty" style="padding:18px 0">Ask anything about your plan, scripts, numbers or what to do next. It reads your whole playbook and today's numbers before answering.</div>`}</div>
    <div class="chips" style="margin:10px 0">${chips.map((c) => `<span class="chip" onclick="askSend('${c.replace(/'/g, "\\'")}')">${c}</span>`).join('')}</div>
    <div class="askbar"><textarea id="ask-in" rows="2" placeholder="Ask anything…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();askSend(this.value)}"></textarea><button class="btn primary" onclick="askSend(document.getElementById('ask-in').value)" ${askBusy ? 'disabled' : ''}>Ask</button></div>
    <div class="row sb" style="margin-top:10px;gap:8px;flex-wrap:wrap"><span class="xs muted">${ai ? `In-app answers use your ${aiCfg().provider === 'anthropic' ? 'Claude' : 'Gemini'} key.` : 'Add the AI key (More → Food photo AI) for in-app answers.'} For bigger things, changes to your calendar or plan, ask Claude.</span><button class="btn sm" onclick="askClaude()">Ask Claude ↗</button></div></div>`;
  const box = document.querySelector('.chat'); if (box) box.scrollTop = box.scrollHeight;
}

/* ───────── capture: one "+" for anything new. Each kind goes to its one home. ───────── */
function openCapture() {
  const B = (icn, t, d, fn) => `<button class="capopt" onclick="${fn}">${ic(icn, 22)}<span><b>${t}</b><i>${d}</i></span></button>`;
  openModal(`<h2>Add</h2>
    <div class="field"><textarea id="cap-in" rows="2" placeholder="Type it here, then choose where it goes"></textarea></div>
    <div class="capgrid">
      ${B('check', 'Task', 'Todoist · dates like “fri 10am” work', "capDo('task')")}
      ${B('bolt', 'Idea', 'parked in Todoist “Later”, looked at on Sunday', "capDo('idea')")}
      ${B('pen', 'Note', 'kept in Playbook → My notes', "capDo('note')")}
      ${B('wallet', 'Spent cash', 'money out, by category', 'closeModal();openSpend()')}
      ${B('camera', 'Meal', 'photo → calories', 'closeModal();foodSnap()')}
      ${B('scale', 'Weight', 'morning weigh-in', "closeModal();goToday();view='now';editWeight()")}
    </div>
    <div class="xs muted" style="margin-top:10px">Something at a set time (an appointment, a lesson) goes in Google Calendar. <a href="https://calendar.google.com/calendar/u/0/r/eventedit" target="_blank" rel="noopener">New calendar event ↗</a></div>`);
}
function capDo(kind) {
  const v = ($('cap-in') && $('cap-in').value || '').trim(); if (!v) { toast('Type it first'); return; }
  if (kind === 'task') { closeModal(); captureTask(v, ''); return; }
  if (kind === 'idea') { closeModal(); const later = Object.keys(tdProjects).find((id) => /^later$/i.test(tdProjects[id].name)); captureTask(v + (tdOn() ? ' #Later' : ''), '', null); return; }
  if (kind === 'note') { const p = pb('notes') || { title: 'Notes', body: '' }; const stamp = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); pbSave('notes', p.title || 'Notes', `- **${stamp}** ${v}\n` + (p.body || ''), 'mine'); closeModal(); toast('Saved in Playbook → My notes'); render(); }
}
