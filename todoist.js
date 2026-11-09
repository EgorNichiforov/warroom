/* War Room v4 · Todoist two-way sync for tasks.
   The API token lives only on this device (localStorage), never in the synced state.
   Local change → pushed at once (queued offline). Open → pull; Todoist wins for title/due of linked tasks. */
'use strict';
const TD_API = 'https://api.todoist.com/rest/v2';
const TD_TOKEN_KEY = 'wr-td-token', TD_OPS_KEY = 'wr-td-ops';
const tdState = { status: 'off', last: 0, msg: '', busy: false };
let tdOps = []; try { tdOps = JSON.parse(localStorage.getItem(TD_OPS_KEY) || '[]'); } catch (e) { tdOps = []; }
function tdToken() { try { return localStorage.getItem(TD_TOKEN_KEY) || ''; } catch (e) { return ''; } }
function tdSetToken(v) { try { v ? localStorage.setItem(TD_TOKEN_KEY, v.trim()) : localStorage.removeItem(TD_TOKEN_KEY); } catch (e) { } }
function tdOn() { return !!tdToken(); }
function tdSaveOps() { try { localStorage.setItem(TD_OPS_KEY, JSON.stringify(tdOps)); } catch (e) { } }
async function tdFetch(path, opts) {
  const r = await fetch(TD_API + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + tdToken(), 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) }));
  if (r.status === 401 || r.status === 403) throw new Error('Todoist rejected the token');
  if (!r.ok) throw new Error('Todoist HTTP ' + r.status);
  if (r.status === 204) return null;
  const txt = await r.text(); return txt ? JSON.parse(txt) : null;
}
/* local → Todoist */
function tdOnChange(kind, t) {
  if (!tdOn() || !t) return;
  if (kind === 'create') tdOps.push({ kind: 'create', local: t.id });
  else if (!t.td) return;                                   // never linked: nothing to update remotely
  else tdOps.push({ kind, td: t.td, local: t.id });
  tdSaveOps(); tdFlush();
}
async function tdFlush() {
  if (!tdOn() || tdState.busy || !tdOps.length) return; tdState.busy = true;
  try {
    while (tdOps.length) {
      const op = tdOps[0], t = S.tasks[op.local];
      if (op.kind === 'create') {
        if (t && !t._del && !t.td) { const body = { content: t.title, description: t.note || '' }; if (t.due) body.due_date = t.due; const r = await tdFetch('/tasks', { method: 'POST', body: JSON.stringify(body) }); t.td = r.id; t._u = now(); save(true); if (t.done) tdOps.push({ kind: 'close', td: r.id, local: t.id }); }
      } else if (op.kind === 'close') await tdFetch(`/tasks/${op.td}/close`, { method: 'POST' }).catch((e) => { if (!/404/.test(e.message)) throw e; });
      else if (op.kind === 'reopen') await tdFetch(`/tasks/${op.td}/reopen`, { method: 'POST' }).catch((e) => { if (!/404/.test(e.message)) throw e; });
      else if (op.kind === 'update') { if (t) { const body = { content: t.title, description: t.note || '' }; if (t.due) body.due_date = t.due; else body.due_string = 'no date'; await tdFetch(`/tasks/${op.td}`, { method: 'POST', body: JSON.stringify(body) }).catch((e) => { if (!/404/.test(e.message)) throw e; }); } }
      else if (op.kind === 'delete') await tdFetch(`/tasks/${op.td}`, { method: 'DELETE' }).catch((e) => { if (!/404/.test(e.message)) throw e; });
      tdOps.shift(); tdSaveOps();
    }
    tdState.status = 'ok'; tdState.last = now(); tdState.msg = '';
  } catch (e) { tdState.status = 'err'; tdState.msg = String(e.message || e); }
  tdState.busy = false; if (view === 'week' || view === 'me') render();
}
/* Todoist → local */
async function tdPull(silent) {
  if (!tdOn() || tdState.busy) return; tdState.busy = true;
  try {
    const remote = await tdFetch('/tasks');                 // all active tasks
    const byTd = {}; for (const id in S.tasks) { const t = S.tasks[id]; if (t && t.td) byTd[t.td] = t; }
    let changed = false; const seen = new Set();
    for (const r of remote) {
      seen.add(r.id); const due = r.due ? r.due.date.slice(0, 10) : '';
      let t = byTd[r.id]; if (t) t.tdSeen = now();
      if (!t) {                                              // new in Todoist → create locally
        t = { id: uid(), _u: now(), title: r.content, due, done: false, note: r.description || '', td: r.id, tdSeen: now() }; S.tasks[t.id] = t; changed = true; continue;
      }
      if (t._del) { tdOps.push({ kind: 'delete', td: r.id, local: t.id }); continue; }   // deleted here while offline
      if (t.done) { if (!tdOps.some((o) => o.td === r.id)) { t.done = false; t.doneAt = null; t._u = now(); changed = true; } continue; } // reopened in Todoist
      if (t.title !== r.content || (t.due || '') !== due || (t.note || '') !== (r.description || '')) { t.title = r.content; t.due = due; t.note = r.description || ''; t._u = now(); changed = true; }
    }
    for (const tdId in byTd) {                               // linked, open here, gone from Todoist → completed (or deleted) there
      const t = byTd[tdId]; if (seen.has(tdId) || t._del || t.done) continue;
      if (tdOps.some((o) => o.local === t.id)) continue;      // we have a pending change for it
      if (!t.tdSeen && now() - (t._u || 0) < 60000) continue; // just linked here; the create may still be in flight
      t.done = true; t.doneAt = now(); t._u = now(); changed = true;
    }
    for (const id in S.tasks) { const t = S.tasks[id]; if (t && !t._del && !t.td && !tdOps.some((o) => o.local === id && o.kind === 'create')) { tdOps.push({ kind: 'create', local: id }); } }
    tdSaveOps();
    if (changed) save(true);
    tdState.status = 'ok'; tdState.last = now(); tdState.msg = '';
  } catch (e) { tdState.status = 'err'; tdState.msg = String(e.message || e); if (!silent) toast('Todoist: ' + tdState.msg); }
  tdState.busy = false; render(); tdFlush();
}
function tdLabel() { return !tdOn() ? 'not connected' : tdState.status === 'err' ? 'error · ' + tdState.msg : tdState.last ? 'synced ' + Math.max(0, Math.round((now() - tdState.last) / 60000)) + ' min ago' : 'connected'; }
function tdCard() {
  return `<div class="card"><div class="card-h"><div class="card-t">Todoist</div><div class="card-r">${tdOn() ? (tdState.status === 'err' ? '<span class="bad">' + esc(tdLabel()) + '</span>' : '<span class="ok">' + esc(tdLabel()) + '</span>') : 'off'}</div></div>
    <div class="small muted" style="margin-bottom:10px">Two-way: tasks you add, finish or delete here go to Todoist at once; what you change in Todoist comes here whenever the app opens. The token stays on this device only.</div>
    ${tdOn() ? `<div class="row" style="gap:6px"><button class="btn grow" onclick="tdPull(false)">Sync now</button><button class="btn danger" onclick="tdSetToken('');render()">Disconnect</button></div>${tdOps.length ? `<div class="xs muted" style="margin-top:8px">${tdOps.length} change${tdOps.length > 1 ? 's' : ''} waiting to be sent</div>` : ''}`
    : `<div class="field"><label>API token</label><div class="inline"><input id="td-tok" type="password" placeholder="paste from Todoist → Settings → Integrations → Developer"><button class="btn primary" onclick="tdSetToken(document.getElementById('td-tok').value);tdPull(false)">Connect</button></div></div>
       <div class="hint">Todoist app → Settings → Integrations → Developer → API token → Copy. Paste it above. Only Inbox tasks exist in your Todoist right now, so everything syncs.</div>`}</div>`;
}
