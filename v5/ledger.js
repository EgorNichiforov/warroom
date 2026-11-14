/* War Room · ledger.js (6.1) — every logged call, per day, deletable and restorable.
   Delete = the existing undoEntry (takes the dial and owner back out of the counters, puts the agency back).
   Restore = puts the exact log entry and agency state back. Dials typed with + (not tied to an agency)
   can be taken back too. */
'use strict';
let ledgerDay = null, ledgerTrash = [], ledgerArm = 0;
function callsOn(k) {
  const out = []; if (!Q || !Q.items) return out;
  Object.values(Q.items).forEach((x) => (x.log || []).forEach((e) => { if ((e.day || (e.at || '').slice(0, 10)) === k && e.d) out.push({ id: x.id, agency: x.agency, city: x.city, e }); }));
  return out.sort((a, b) => (b.e.at > a.e.at ? 1 : -1));
}
function ledgerOpen(k) { ledgerDay = k || dk(new Date()); ledgerArm = 0; ledgerDraw(true); }
function ledgerShift(n) { ledgerDay = dk(addDays(pd(ledgerDay), n)); ledgerArm = 0; ledgerDraw(); }
function ledgerDraw(first) {
  const k = ledgerDay, o = day(k), rows = callsOn(k), D = Number(o.counters.dials) || 0, O = Number(o.counters.owners) || 0;
  const lD = rows.reduce((a, r) => a + (r.e.d.dials || 0), 0), lO = rows.reduce((a, r) => a + (r.e.d.owners || 0), 0);
  const loose = Math.max(0, D - lD), looseO = Math.max(0, O - lO), isToday = k === dk(new Date());
  const trash = ledgerTrash.filter((t) => t.e.day === k);
  const html = `<div class="ldg"><div class="ldg-head"><button class="btn sm" onclick="ledgerShift(-1)" aria-label="Previous day">‹</button><div><h2 style="margin:0">Call log</h2><div class="xs muted">${isToday ? 'Today' : DAY_SHORT[dow(pd(k))] + ' ' + fmtShort(pd(k))} · ${D} dials · ${O} owner talks</div></div><button class="btn sm" onclick="ledgerShift(1)" ${isToday ? 'disabled' : ''} aria-label="Next day">›</button></div>
    ${rows.length ? `<div class="ldg-list">${rows.map((r) => `<div class="ldg-row"><div class="ldg-t">${hmNow(new Date(r.e.at))}</div><div class="grow"><b>${esc(r.agency)}</b><div class="xs muted">${esc(r.e.r)}${r.e.d.owners ? ' · owner' : ''}${r.e.dur ? ' · ' + fmtEl(r.e.dur) + ' on the line' : ''}${r.e.note ? ' · ' + esc(r.e.note) : ''}</div></div><button class="btn sm danger" onclick="ledgerDel(${r.id},'${r.e.at}')" aria-label="Delete this call">Delete</button></div>`).join('')}</div>`
      : '<div class="empty" style="margin:12px 0">No calls logged against an agency on this day.</div>'}
    ${loose || looseO ? `<div class="ldg-loose"><div class="grow small"><b>${loose} dial${loose === 1 ? '' : 's'}${looseO ? ` and ${looseO} owner talk${looseO === 1 ? '' : 's'}` : ''}</b> counted without an agency (typed or + button).</div><div class="row" style="gap:6px">${loose ? `<button class="btn sm" onclick="ledgerLoose(-1,0)">−1 dial</button>` : ''}${looseO ? `<button class="btn sm" onclick="ledgerLoose(0,-1)">−1 owner</button>` : ''}<button class="btn sm danger" onclick="ledgerLoose(-${loose},-${looseO})">Clear</button></div></div>` : ''}
    ${trash.length ? `<div class="sec-h" style="margin-top:14px">Deleted · tap to restore</div>${trash.map((t) => `<div class="ldg-row gone"><div class="ldg-t">${hmNow(new Date(t.e.at))}</div><div class="grow"><b>${esc(t.agency)}</b><div class="xs muted">${esc(t.e.r)}</div></div><button class="btn sm" onclick="ledgerRestore('${t.e.at}')">Restore</button></div>`).join('')}` : ''}
    <div class="actions">${rows.length > 1 ? `<button class="btn ${ledgerArm ? 'danger' : ''}" onclick="ledgerWipe()">${ledgerArm ? `Tap again: delete all ${rows.length}` : 'Delete all calls this day'}</button>` : ''}<button class="btn primary" onclick="closeModal()">Done</button></div></div>`;
  const m = document.querySelector('.modal-bg.open .modal .ldg');
  if (!first && m) m.outerHTML = html; else openModal(html, true);
}
function ledgerDel(id, at, quiet) {
  const x = Q.items[id]; if (!x) return; const e = (x.log || []).find((l) => l.at === at); if (!e) return;
  const snap = { status: x.status, attempts: x.attempts, next_at: x.next_at, next_step: x.next_step, contact: x.contact, notes: x.notes, email: x.email, last_dial_at: x.last_dial_at };
  ledgerTrash.unshift({ id, agency: x.agency, e: JSON.parse(JSON.stringify(e)), snap, log: JSON.parse(JSON.stringify(x.log)) }); ledgerTrash = ledgerTrash.slice(0, 50);
  undoEntry(id, at, true);
  if (!quiet) { toast(`Deleted: ${x.agency} · ${e.r}`, 'Restore', () => ledgerRestore(at)); ledgerDraw(); }
}
function ledgerRestore(at) {
  const i = ledgerTrash.findIndex((t) => t.e.at === at); if (i < 0) return; const t = ledgerTrash[i], x = Q.items[t.id]; if (!x) return;
  if ((x.log || []).some((l) => l.at === at)) { ledgerTrash.splice(i, 1); return; }
  x.log = (x.log || []).concat([t.e]).sort((a, b) => (a.at > b.at ? 1 : -1));
  const later = (x.log || []).some((l) => l.at > at); if (!later) Object.assign(x, t.snap); else x.attempts = (x.attempts || 0) + 1;
  x._u = now(); qSave();
  const o = day(t.e.day); o.counters.dials = (Number(o.counters.dials) || 0) + (t.e.d.dials || 0); o.counters.owners = (Number(o.counters.owners) || 0) + (t.e.d.owners || 0); touch(o);
  ledgerTrash.splice(i, 1); toast('Restored: ' + t.agency); render(); if (document.querySelector('.modal .ldg')) ledgerDraw();
}
function ledgerWipe() {
  if (!ledgerArm) { ledgerArm = 1; ledgerDraw(); setTimeout(() => { if (ledgerArm) { ledgerArm = 0; if (document.querySelector('.modal .ldg')) ledgerDraw(); } }, 4000); return; }
  ledgerArm = 0; const rows = callsOn(ledgerDay); rows.forEach((r) => ledgerDel(r.id, r.e.at, true));
  toast(`Deleted ${rows.length} calls`, 'Restore all', () => rows.forEach((r) => ledgerRestore(r.e.at))); render(); ledgerDraw();
}
function ledgerLoose(dd, doo) {
  const o = day(ledgerDay), b = { d: Number(o.counters.dials) || 0, o: Number(o.counters.owners) || 0 };
  o.counters.dials = Math.max(0, b.d + dd); o.counters.owners = Math.min(o.counters.dials, Math.max(0, b.o + doo)); touch(o); render(); ledgerDraw();
  toast('Counter fixed', 'Undo', () => { o.counters.dials = b.d; o.counters.owners = b.o; touch(o); render(); if (document.querySelector('.modal .ldg')) ledgerDraw(); });
}
