/* War Room v5 · Todoist: the one task list. Two-way sync over Todoist API v1.
   Why v1: Todoist shut REST v2 down (it answers 410 without CORS headers, which the browser reports as "Failed to fetch").
   The API token lives only on this device (localStorage), never in the synced state.
   Local change → pushed at once (queued offline). Open / every 5 min → pull; Todoist wins for title, due and project. */
'use strict';
const TD_API = 'https://api.todoist.com/api/v1';
const TD_TOKEN_KEY = 'wr-td-token', TD_OPS_KEY = 'wr-td-ops', TD_PROJ_KEY = 'wr-td-projects';
const tdState = { status: 'off', last: 0, msg: '', busy: false };
let tdOps = []; try { tdOps = JSON.parse(localStorage.getItem(TD_OPS_KEY) || '[]'); } catch (e) { tdOps = []; }
let tdProjects = {}; try { tdProjects = JSON.parse(localStorage.getItem(TD_PROJ_KEY) || '{}'); } catch (e) { tdProjects = {}; }
function tdToken() { try { return localStorage.getItem(TD_TOKEN_KEY) || ''; } catch (e) { return ''; } }
function tdSetToken(v) { try { v ? localStorage.setItem(TD_TOKEN_KEY, v.trim()) : localStorage.removeItem(TD_TOKEN_KEY); } catch (e) { } }
function tdOn() { return !!tdToken(); }
function tdSaveOps() { try { localStorage.setItem(TD_OPS_KEY, JSON.stringify(tdOps)); } catch (e) { } }
async function tdFetch(path, opts) {
  let r;
  try { r = await fetch(TD_API + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + tdToken(), 'Content-Type': 'application/json' }, (opts && opts.headers) || {}) })); }
  catch (e) { throw new Error('no connection to Todoist (offline, VPN or blocker?)'); }
  if (r.status === 401 || r.status === 403) throw new Error('Todoist rejected the token. Copy it again from Settings → Integrations → Developer');
  if (r.status === 404) { const e = new Error('404'); e.status = 404; throw e; }
  if (!r.ok) throw new Error('Todoist answered ' + r.status);
  if (r.status === 204) return null;
  const txt = await r.text(); return txt ? JSON.parse(txt) : null;
}
async function tdAll(path) { const out = []; let cursor = null, n = 0; do { const j = await tdFetch(path + (path.includes('?') ? '&' : '?') + 'limit=200' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '')); (j.results || j || []).forEach((x) => out.push(x)); cursor = j.next_cursor; } while (cursor && ++n < 20); return out; }
const tdOk404 = (e) => { if (e.status !== 404) throw e; };

/* local → Todoist */
function tdOnChange(kind, t) {
  if (!tdOn() || !t) return;
  if (kind === 'create') tdOps.push({ kind: 'create', local: t.id });
  else if (!t.td) return;
  else tdOps.push({ kind, td: t.td, local: t.id });
  tdSaveOps(); tdFlush();
}
async function tdFlush() {
  if (!tdOn() || tdState.busy || !tdOps.length) return; tdState.busy = true;
  try {
    while (tdOps.length) {
      const op = tdOps[0], t = S.tasks[op.local];
      if (op.kind === 'create') {
        if (t && !t._del && !t.td) {
          const body = { content: t.title, description: t.note || '' }; if (t.due) body.due_date = t.due; if (t.proj && tdProjects[t.proj]) body.project_id = t.proj; if (t.pri) body.priority = t.pri;
          const r = t.quick ? await tdFetch('/tasks/quick', { method: 'POST', body: JSON.stringify({ text: t.title }) }) : await tdFetch('/tasks', { method: 'POST', body: JSON.stringify(body) });
          t.td = r.id; if (t.quick) { t.title = r.content; t.due = r.due ? r.due.date.slice(0, 10) : ''; t.proj = r.project_id; t.pri = r.priority; delete t.quick; }
          t._u = now(); save(true); if (t.done) tdOps.push({ kind: 'close', td: r.id, local: t.id });
        }
      } else if (op.kind === 'close') await tdFetch(`/tasks/${op.td}/close`, { method: 'POST' }).catch(tdOk404);
      else if (op.kind === 'reopen') await tdFetch(`/tasks/${op.td}/reopen`, { method: 'POST' }).catch(tdOk404);
      else if (op.kind === 'update') { if (t) { const body = { content: t.title, description: t.note || '' }; if (t.due) body.due_date = t.due; else body.due_string = 'no date'; await tdFetch(`/tasks/${op.td}`, { method: 'POST', body: JSON.stringify(body) }).catch(tdOk404); } }
      else if (op.kind === 'delete') await tdFetch(`/tasks/${op.td}`, { method: 'DELETE' }).catch(tdOk404);
      tdOps.shift(); tdSaveOps();
    }
    tdState.status = 'ok'; tdState.last = now(); tdState.msg = '';
  } catch (e) { tdState.status = 'err'; tdState.msg = String(e.message || e); }
  tdState.busy = false; render();
}
/* Todoist → local */
async function tdPull(silent) {
  if (!tdOn() || tdState.busy) return; tdState.busy = true;
  try {
    const projs = await tdAll('/projects'); tdProjects = {}; projs.forEach((p) => (tdProjects[p.id] = { name: p.name, inbox: !!p.inbox_project, order: p.child_order || 0 })); try { localStorage.setItem(TD_PROJ_KEY, JSON.stringify(tdProjects)); } catch (e) { }
    const remote = await tdAll('/tasks');
    const byTd = {}; for (const id in S.tasks) { const t = S.tasks[id]; if (t && t.td) byTd[t.td] = t; }
    // one-time re-link: tasks linked under the old API carry old ids; v1 returns v2_id for them
    remote.forEach((r) => { if (!byTd[r.id] && r.v2_id && byTd[r.v2_id]) { const t = byTd[r.v2_id]; delete byTd[r.v2_id]; t.td = r.id; byTd[r.id] = t; } });
    let changed = false; const seen = new Set();
    for (const r of remote) {
      seen.add(r.id); const due = r.due ? r.due.date.slice(0, 10) : '', time = r.due && r.due.date.length > 10 ? r.due.date.slice(11, 16) : '', rec = !!(r.due && r.due.is_recurring);
      let t = byTd[r.id]; if (t) t.tdSeen = now();
      if (!t) { t = Object.values(S.tasks).find((x) => x && !x._del && !x.td && x.title === r.content); if (t) { t.td = r.id; byTd[r.id] = t; tdOps = tdOps.filter((o) => !(o.kind === 'create' && o.local === t.id)); } }
      if (!t) { t = { id: uid(), _u: now(), title: r.content, due, time, rec, done: false, note: r.description || '', td: r.id, proj: r.project_id, pri: r.priority, tdSeen: now() }; S.tasks[t.id] = t; changed = true; continue; }
      if (t._del) { tdOps.push({ kind: 'delete', td: r.id, local: t.id }); continue; }
      if (t.done) { if (!tdOps.some((o) => o.td === r.id)) { if (rec && t.due !== due) { t.done = false; t.doneAt = null; } else if (!rec) { t.done = false; t.doneAt = null; } t.due = due; t._u = now(); changed = true; } continue; }
      if (t.title !== r.content || (t.due || '') !== due || (t.note || '') !== (r.description || '') || t.proj !== r.project_id || t.pri !== r.priority || (t.time || '') !== time || !!t.rec !== rec) { Object.assign(t, { title: r.content, due, time, rec, note: r.description || '', proj: r.project_id, pri: r.priority, _u: now() }); changed = true; }
    }
    for (const tdId in byTd) {
      const t = byTd[tdId]; if (seen.has(tdId) || t._del || t.done) continue;
      if (tdOps.some((o) => o.local === t.id)) continue;
      if (!t.tdSeen && now() - (t._u || 0) < 60000) continue;
      t.done = true; t.doneAt = now(); t._u = now(); changed = true;
    }
    for (const id in S.tasks) { const t = S.tasks[id]; if (t && !t._del && !t.done && !t.td && !tdOps.some((o) => o.local === id && o.kind === 'create')) tdOps.push({ kind: 'create', local: id }); }
    tdSaveOps(); if (changed) save(true);
    tdState.status = 'ok'; tdState.last = now(); tdState.msg = ''; if (!silent) toast(`Todoist synced · ${remote.length} open tasks`);
  } catch (e) { tdState.status = 'err'; tdState.msg = String(e.message || e); if (!silent) toast('Todoist: ' + tdState.msg); }
  tdState.busy = false; render(); tdFlush();
}
async function tdConnect() {
  const v = ($('td-tok') && $('td-tok').value || '').trim(); if (!v) { toast('Paste the token first'); return; }
  tdSetToken(v); tdState.status = 'off';
  try { await tdFetch('/projects?limit=1'); } catch (e) { tdSetToken(''); tdState.status = 'err'; tdState.msg = e.message; render(); toast('Todoist: ' + e.message); return; }
  tdPull(false);
}
function tdProjName(id) { const p = tdProjects[id]; return p ? (p.inbox ? 'Inbox' : p.name) : ''; }
function tdLabel() { return !tdOn() ? 'not connected' : tdState.status === 'err' ? 'error · ' + tdState.msg : tdState.last ? 'synced ' + Math.max(0, Math.round((now() - tdState.last) / 60000)) + ' min ago' : 'connected'; }
function tdCard() {
  return `<div class="card"><div class="card-h"><div class="card-t">Todoist</div><div class="card-r">${tdOn() ? (tdState.status === 'err' ? '<span class="bad">' + esc(tdLabel()) + '</span>' : '<span class="ok">' + esc(tdLabel()) + '</span>') : 'off'}</div></div>
    <div class="small muted" style="margin-bottom:10px">Todoist is your one task list. What you add, tick or change here goes to Todoist at once; what you change in Todoist shows here within 5 minutes. The token stays on this device.</div>
    ${tdOn() ? `<div class="row" style="gap:6px"><button class="btn grow" onclick="tdPull(false)">Sync now</button><button class="btn danger" onclick="tdSetToken('');render()">Disconnect</button></div>${tdOps.length ? `<div class="xs muted" style="margin-top:8px">${tdOps.length} change${tdOps.length > 1 ? 's' : ''} waiting to be sent</div>` : ''}`
    : `<div class="field"><label>API token</label><div class="inline"><input id="td-tok" type="password" autocomplete="off" placeholder="paste from Todoist → Settings → Integrations → Developer"><button class="btn primary" onclick="tdConnect()">Connect</button></div></div>
       <div class="hint">Todoist → Settings → Integrations → Developer → API token → Copy. Paste it above. Connect it on each device you use (the token is not synced).</div>`}</div>`;
}
/* Today in Todoist: replaces the old Top 3 on HQ. Due today or overdue, then p1 without a date. */
function tdToday(k) {
  return Object.values(S.tasks).filter((t) => t && !t._del && !t.done && t.due && t.due <= k).sort((a, b) => (a.due + (a.time || '99')).localeCompare(b.due + (b.time || '99')) || (b.pri || 1) - (a.pri || 1));
}
function todayTasksCard(d) {
  const k = dk(d), list = tdToday(k), doneToday = Object.values(S.tasks).filter((t) => t && !t._del && t.done && t.doneAt && dk(new Date(t.doneAt)) === k);
  const row = (t) => `<div class="ck ${t.done ? 'on' : ''}"><div class="box round" onclick="toggleTask('${t.id}')">${t.done ? '✓' : ''}</div><div class="lbl" onclick="editTask('${t.id}')">${t.pri === 4 ? '<span class="p1">P1</span> ' : ''}${esc(t.title)}<span class="sub">${[t.due < k ? `<span class="bad">overdue · ${fmtShort(pd(t.due))}</span>` : '', t.time, t.proj ? esc(tdProjName(t.proj)) : '', t.rec ? 'repeats' : ''].filter(Boolean).join(' · ')}</span></div></div>`;
  return `<div class="card"><div class="card-h"><div class="card-t">To do today</div><div class="card-r">${tdOn() ? (tdState.status === 'err' ? '<span class="bad">Todoist error</span>' : 'from Todoist') : '<a href="#" onclick="moreTab=\'home\';show(\'me\');setTimeout(()=>{const e=document.getElementById(\'td-tok\');e&&e.scrollIntoView({block:\'center\'})},100);return false">connect Todoist</a>'}</div></div>
    ${list.length ? list.map(row).join('') : `<div class="empty">${tdOn() ? 'Nothing due today.' : 'Your tasks live in Todoist. Connect it once and today\'s tasks show here.'}</div>`}
    ${doneToday.length ? `<div class="xs muted" style="margin-top:6px">${doneToday.length} done today</div>` : ''}
    <div class="row" style="margin-top:10px"><input id="quick-task" placeholder="+ task (e.g. Call Maria tomorrow 10am #Company)" onkeydown="if(event.key==='Enter')captureTask(this.value,'${k}')"></div></div>`;
}
/* one entry point for every new task: Todoist understands "tomorrow 5pm #Company p1" */
function captureTask(text, k, proj) {
  text = String(text || '').trim(); if (!text) return;
  const t = { id: uid(), _u: now(), title: text, due: '', done: false, note: '' };
  if (tdOn()) { t.quick = true; if (proj) t.title = text + (/#\w/.test(text) ? '' : ' #' + proj); }
  else if (k) t.due = k;
  S.tasks[t.id] = t; save(); taskHook('create', t); const i = $('quick-task'); if (i) i.value = ''; render();
  toast(tdOn() ? 'Added to Todoist' : 'Added (connect Todoist to get reminders)');
}
