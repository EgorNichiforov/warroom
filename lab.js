/* War Room 13.7 · SCRIPT LAB — a personal markup layer on top of the Playbook scripts.
   Two layers, never mixed:
   1. Canonical: the Playbook page (pb(id).body). The dialer reads only this.
   2. Markup: S.slab, one record per line, keyed by page + a hash of the line's canonical text (+ occurrence).
      Drafts, highlights, flags, notes, hidden lines, own lines. Synced per record by _u (no doubling, no lost edits
      across devices editing different lines).
   The only way markup reaches the live script is labApply(): it rewrites that one canonical line through pbSave(),
   the same path as a normal Playbook edit, and logs the change (the nightly job mirrors it into the Drive doc). */
'use strict';
const LAB_PAGES = [['script-owner', 'Call 1'], ['script-case', 'Case call'], ['script-gatekeeper', 'Gatekeeper'], ['script-vm', 'Voicemail'], ['objections', 'Loops']];
const LAB_HL = [['gold', 'Key line'], ['green', 'Works'], ['red', 'Fix this'], ['blue', 'Note to self']];
const LAB_FLAGS = ['', 'keep', 'q', 'rw'], LAB_FLAG_ICON = { '': '', keep: '✓', q: '?', rw: '✎' }, LAB_FLAG_LBL = { '': 'No flag', keep: 'Keep', q: 'Question', rw: 'Rewrite' };
let pbLab = false, labEditId = null, labCompare = false, labShowHidden = false, labSel = null, labSelAt = 0, labInT = 0, labEditOld = null;
const labLocked = () => { try { return localStorage.getItem('wr-lab-lock') === '1'; } catch (e) { return false; } };

/* ── canonical: parse a page into lines ── */
function labHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function labParse(body) {
  const out = [], seen = {};
  String(body || '').split('\n').forEach((raw, i) => {
    if (!raw.trim() || /^Shown in the dialer/.test(raw)) return;
    let m, kind = 'p', pre = '', suf = '', text = raw;
    if ((m = raw.match(/^(## )(.*)$/))) { kind = 'h2'; pre = m[1]; text = m[2]; }
    else if ((m = raw.match(/^(# )(.*)$/))) { kind = 'h1'; pre = m[1]; text = m[2]; }
    else if ((m = raw.match(/^(> ?)(.*)$/))) { kind = 'say'; pre = m[1]; text = m[2]; }
    else if ((m = raw.match(/^(\s*(?:-|\d+\.)\s+)(.*)$/))) { kind = 'li'; pre = m[1]; text = m[2]; }
    else if (/^\|.*\|\s*$/.test(raw)) { kind = 'row'; pre = '| '; suf = ' |'; text = raw.slice(1, raw.lastIndexOf('|')).trim(); }
    const h = labHash(raw), n = (seen[h] = (seen[h] || 0) + 1);
    out.push({ key: h + '.' + n, raw, kind, pre, suf, text, i });
  });
  return out;
}
const LAB_PRE = { say: '> ', li: '- ', h2: '## ', p: '' };

/* ── markup store ── */
function labId(pid, k) { return pid + '|' + k; }
function labRec(pid, k) { const r = (S.slab || {})[labId(pid, k)]; return r && !r._del ? r : null; }
function labPut(r) { S.slab = S.slab || {}; r._u = now(); S.slab[r.id] = r; save(); }
function labDrop(id) { S.slab = S.slab || {}; S.slab[id] = { id, _u: now(), _del: true }; save(); }
function labEnsure(pid, k, extra) { return labRec(pid, k) || Object.assign({ id: labId(pid, k), pid, key: k, hl: [], flag: '', note: '' }, extra || {}); }
function labRecs(pid) { return Object.values(S.slab || {}).filter((r) => r && !r._del && r.pid === pid); }
function labEmpty(r) { return r.draft == null && !(r.hl && r.hl.length) && !r.flag && !r.note && !r.hidden && !r.own; }
function labSaveRec(r) { if (labEmpty(r) && !r.own) { if ((S.slab || {})[r.id]) labDrop(r.id); } else labPut(r); }

/* the rows the Lab shows: canonical lines with their markup, own lines after their anchor, orphaned markup */
function labModel(pid) {
  const p = pb(pid); if (!p) return null;
  const lines = labParse(p.body), keys = new Set(lines.map((l) => l.key)), recs = labRecs(pid);
  const own = recs.filter((r) => r.own).sort((a, b) => (a.at || 0) - (b.at || 0));
  const rows = [];
  lines.forEach((l) => {
    const r = labRec(pid, l.key); rows.push({ id: l.key, line: l, rec: r, own: false });
    own.filter((o) => o.after === l.key).forEach((o) => rows.push({ id: o.key, line: null, rec: o, own: true }));
  });
  own.filter((o) => !keys.has(o.after)).forEach((o) => rows.push({ id: o.key, line: null, rec: o, own: true }));
  const orphans = recs.filter((r) => !r.own && r.kind !== 'log' && !keys.has(r.key) && !labEmpty(r));
  const logs = recs.filter((r) => r.kind === 'log').sort((a, b) => b.at - a.at);
  return { p, lines, rows, orphans, logs };
}
function labText(row) { const r = row.rec; if (row.own) return r.draft || ''; return r && r.draft != null ? r.draft : row.line.text; }
function labKind(row) { return row.own ? (row.rec.lk || 'say') : row.line.kind; }
function labEdited(row) { return !row.own && row.rec && row.rec.draft != null && row.rec.draft !== row.line.text; }
function labPending(row) { return labEdited(row) || (row.own && !!(row.rec.draft || '').trim()); }
function labPlain(t) { return String(t || '').replace(/\*\*/g, ''); }

/* ── text with bold, {tokens} and highlights; textContent === plain text (so selections map to offsets) ── */
function labRich(text, hl) {
  const ch = []; let b = false; const t = String(text || '');
  for (let i = 0; i < t.length; i++) { if (t[i] === '*' && t[i + 1] === '*') { b = !b; i++; continue; } ch.push({ c: t[i], b, k: 0, h: '' }); }
  const plain = ch.map((x) => x.c).join(''); let m; const re = /\{\w+\}/g;
  while ((m = re.exec(plain))) for (let i = m.index; i < m.index + m[0].length; i++) ch[i].k = 1;
  (hl || []).forEach((r) => { for (let i = Math.max(0, r.s); i < Math.min(ch.length, r.e); i++) ch[i].h = r.c; });
  let out = '', i = 0;
  while (i < ch.length) { const a = ch[i]; let j = i, s = ''; while (j < ch.length && ch[j].b === a.b && ch[j].k === a.k && ch[j].h === a.h) { s += ch[j].c; j++; }
    let h = esc(s); if (a.k) h = `<span class="lb-tok">${h}</span>`; if (a.b) h = `<b>${h}</b>`; if (a.h) h = `<mark class="lb-h-${a.h}">${h}</mark>`; out += h; i = j; }
  return out;
}
function labRanges(cols, plain) { const out = []; let i = 0; while (i < cols.length) { if (!cols[i]) { i++; continue; } let j = i; while (j < cols.length && cols[j] === cols[i]) j++; out.push({ s: i, e: j, c: cols[i], q: plain.slice(i, j) }); i = j; } return out; }
function labReanchor(hl, newPlain) {
  return (hl || []).map((r) => { if (newPlain.slice(r.s, r.e) === r.q) return r; let best = -1, i = newPlain.indexOf(r.q);
    while (i >= 0) { if (best < 0 || Math.abs(i - r.s) < Math.abs(best - r.s)) best = i; i = newPlain.indexOf(r.q, i + 1); }
    return best >= 0 && r.q ? { s: best, e: best + r.q.length, c: r.c, q: r.q } : null; }).filter(Boolean);
}

/* ── row lookup ── */
function labRow(pid, id) { const M = labModel(pid); return M ? M.rows.find((x) => x.id === id) : null; }
function labRecFor(pid, row) { return row.rec || labEnsure(pid, row.id, { base: row.line ? row.line.raw : '' }); }

/* ── selection → highlight ── */
document.addEventListener('selectionchange', () => {
  const s = window.getSelection(); if (!s || s.rangeCount === 0 || s.isCollapsed) return;
  const r = s.getRangeAt(0), a = r.startContainer.parentElement && r.startContainer.parentElement.closest('.lb-tx'), b = r.endContainer.parentElement && r.endContainer.parentElement.closest('.lb-tx');
  if (!a) return; const el = a, pre = document.createRange(); pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset);
  const st = pre.toString().length; let en = st + r.toString().length; if (b !== a) en = el.textContent.length;
  if (en > st) { labSel = { id: el.dataset.k, s: st, e: en }; labSelAt = Date.now(); }
});
function labHl(c) {
  const pid = pbOpen, sel = labSel; if (!sel || Date.now() - labSelAt > 15000) { toast('Select some words in a line first'); return; }
  const row = labRow(pid, sel.id); if (!row) return; const r = labRecFor(pid, row), plain = labPlain(labText(row));
  const cols = Array.from({ length: plain.length }, () => ''); (r.hl || []).forEach((x) => { for (let i = x.s; i < Math.min(x.e, cols.length); i++) cols[i] = x.c; });
  for (let i = sel.s; i < Math.min(sel.e, cols.length); i++) cols[i] = c || '';
  r.hl = labRanges(cols, plain); labSaveRec(r); labSel = null; try { window.getSelection().removeAllRanges(); } catch (e) { } render();
}

/* ── per-line actions ── */
function labTap(id, ev) {
  if (labLocked()) return; const s = window.getSelection(); if (s && !s.isCollapsed) return;
  if (ev && ev.target && ev.target.closest && ev.target.closest('a')) return;
  const row = labRow(pbOpen, id); if (!row) return; labEditId = id; labEditOld = labText(row); render();
  setTimeout(() => { const t = document.querySelector(`.lb-ed[data-k="${id}"]`); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); labGrow(t); } }, 0);
}
function labGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
function labWrite(id, v, done) {
  const pid = pbOpen, row = labRow(pid, id); if (!row) return; const r = labRecFor(pid, row), old = labPlain(labText(row));
  v = String(v).replace(/\n+/g, ' ').trim();
  if (row.own) r.draft = v; else if (v === row.line.text) delete r.draft; else r.draft = v;
  if (labPlain(v) !== old) r.hl = labReanchor(r.hl, labPlain(v));
  labSaveRec(r); if (done) { labEditId = null; labEditOld = null; render(); }
}
function labInput(t) { labGrow(t); clearTimeout(labInT); const id = t.dataset.k, v = t.value; labInT = setTimeout(() => labWrite(id, v, false), 400); }
function labBlur(t) { if (labEditId !== t.dataset.k) return; clearTimeout(labInT); labWrite(t.dataset.k, t.value, true); }
function labKey(t, e) { if (e.key === 'Escape') { e.preventDefault(); clearTimeout(labInT); const id = t.dataset.k; labEditId = null; if (labEditOld != null) labWrite(id, labEditOld, true); } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); t.blur(); } }
function labFlag(id) { const pid = pbOpen, row = labRow(pid, id); if (!row) return; const r = labRecFor(pid, row); r.flag = LAB_FLAGS[(LAB_FLAGS.indexOf(r.flag || '') + 1) % LAB_FLAGS.length]; labSaveRec(r); render(); }
function labNote(id, v) { const pid = pbOpen, row = labRow(pid, id); if (!row) return; const r = labRecFor(pid, row); r.note = String(v || '').trim(); labSaveRec(r); }
function labRevert(id) { const pid = pbOpen, row = labRow(pid, id); if (!row || row.own || !row.rec) return; const r = row.rec; delete r.draft; r.hl = labReanchor(r.hl, labPlain(row.line.text)); labSaveRec(r); closeModal(); render(); toast('Back to the Playbook wording'); }
function labHide(id, v) { const pid = pbOpen, row = labRow(pid, id); if (!row) return; const r = labRecFor(pid, row); if (v) r.hidden = true; else delete r.hidden; labSaveRec(r); closeModal(); render(); }
function labAddBelow(id) { const pid = pbOpen, row = labRow(pid, id); if (!row) return; const after = row.own ? row.rec.after : row.id, k = 'u' + uid();
  labPut({ id: labId(pid, k), pid, key: k, own: true, after, lk: 'say', draft: '', hl: [], flag: '', note: '', at: now() + (row.own ? 1 : 0) });
  closeModal(); labEditId = k; labEditOld = ''; render(); setTimeout(() => { const t = document.querySelector(`.lb-ed[data-k="${k}"]`); if (t) t.focus(); }, 0); }
function labOwnKind(id, k) { const pid = pbOpen, row = labRow(pid, id); if (!row || !row.own) return; row.rec.lk = k; labPut(row.rec); closeModal(); render(); }
function labDelOwn(id) { const row = labRow(pbOpen, id); if (!row || !row.own) return; labDrop(row.rec.id); closeModal(); render(); toast('Line removed from your markup'); }

/* ── Apply to Playbook: the only write into the live script ── */
function labApplyAsk(id) {
  const pid = pbOpen, row = labRow(pid, id); if (!row || !labPending(row)) return;
  const before = row.own ? '' : row.line.text, after = labText(row);
  openModal(`<div class="lb-sheet"><div class="lb-sh-k">Apply to the live Playbook</div><h2 class="lb-sh-t">${esc(pb(pid).title)}</h2>
    <div class="lb-cmp">${row.own ? '<div class="lb-cmp-l">NEW LINE</div>' : `<div class="lb-cmp-l">NOW · what the dialer says</div><div class="lb-was">${labRich(before)}</div>`}<div class="lb-cmp-l">AFTER</div><div class="lb-now">${after.trim() ? labRich(after) : '<em>(line removed)</em>'}</div></div>
    <div class="lb-sh-d">Rewrites this one line of the Playbook. The dialer shows it from the next call, it syncs to your other devices, and tonight's review copies it into the Drive mirror. Your highlights, flag and note stay on the line.</div>
    <div class="lb-two"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="labApply('${id}')">Apply to Playbook</button></div></div>`, true);
}
function labApply(id) {
  const pid = pbOpen, M = labModel(pid), row = M && M.rows.find((x) => x.id === id); if (!row || !labPending(row)) return;
  const p = M.p, L = String(p.body).split('\n'), txt = labText(row).trim(); let at = -1, newRaw = '';
  if (row.own) {
    const anchor = M.lines.find((l) => l.key === row.rec.after); at = anchor ? anchor.i + 1 : L.length; newRaw = (LAB_PRE[row.rec.lk || 'say'] || '') + txt;
    const sib = labRecs(pid).filter((o) => o.own && o.after === row.rec.after && (o.at || 0) < (row.rec.at || 0)).length; /* keep the order of earlier own lines that are already applied */
    void sib; L.splice(at, 0, newRaw);
  } else {
    const l = row.line; at = l.i; if (L[at] !== l.raw) { toast('That line changed in the Playbook meanwhile. Nothing applied.'); closeModal(); render(); return; }
    newRaw = txt ? l.pre + txt + l.suf : null; if (newRaw == null) L.splice(at, 1); else L[at] = newRaw;
  }
  const before = row.own ? '' : row.line.raw;
  pbSave(pid, p.title, L.join('\n'), p.cat);
  /* move the markup onto the new canonical line (same page, new key), drop the draft */
  const old = row.rec; labDrop(old.id);
  if (newRaw != null) { const nl = labParse(pb(pid).body).find((x) => x.raw === newRaw && (row.own ? true : x.i === at)) || labParse(pb(pid).body).find((x) => x.raw === newRaw);
    if (nl) { const keep = { id: labId(pid, nl.key), pid, key: nl.key, base: newRaw, hl: labReanchor(old.hl, labPlain(nl.text)), flag: old.flag || '', note: old.note || '' }; if (old.hidden) keep.hidden = true; labSaveRec(keep);
      labRecs(pid).filter((o) => o.own && o.after === row.id).forEach((o) => { o.after = nl.key; labPut(o); }); } }
  const t = now(); labPut({ id: labId(pid, 'log' + t), pid, key: 'log' + t, kind: 'log', at: t, page: p.title, before, after: newRaw || '', mirrored: false });
  closeModal(); render(); toast('Applied · the dialer uses it from the next call');
}

/* ── global ── */
function labResetAll() { const pid = pbOpen; if (!confirm('Reset every line of this script to the Playbook wording? Your edits, highlights, flags, notes, hidden and added lines on this script are cleared. The live script is not touched.')) return; labRecs(pid).filter((r) => r.kind !== 'log').forEach((r) => labDrop(r.id)); labEditId = null; render(); toast('Back to the Playbook wording'); }
function labLock() { try { localStorage.setItem('wr-lab-lock', labLocked() ? '0' : '1'); } catch (e) { } labEditId = null; render(); }
function labOrphan(id, keep) { const r = (S.slab || {})[id]; if (!r) return; if (!keep) { labDrop(id); render(); return; } const k = 'u' + uid(); labPut({ id: labId(r.pid, k), pid: r.pid, key: k, own: true, after: '', lk: 'say', draft: r.draft != null ? r.draft : (labParse(r.base || '')[0] || {}).text || '', hl: [], flag: r.flag || '', note: r.note || '', at: now() }); labDrop(id); render(); }

/* ── the line sheet: note, peek, revert, apply, hide, add ── */
function labMenu(id) {
  const pid = pbOpen, row = labRow(pid, id); if (!row) return; const r = row.rec || {}, ed = labEdited(row), pend = labPending(row);
  openModal(`<div class="lb-sheet"><div class="lb-sh-k">${row.own ? 'Your line' : 'Line'} · ${esc(LAB_FLAG_LBL[r.flag || ''])}</div>
    <div class="lb-sh-line">${labRich(labText(row) || '(empty)')}</div>
    ${!row.own ? `<details class="lb-peek" ${ed ? 'open' : ''}><summary>Peek original</summary><div class="lb-was">${labRich(row.line.text)}</div></details>` : ''}
    <label class="lb-sh-lab">Margin note</label><textarea class="lb-sh-note" placeholder="Why, what to try, what the owner said…" oninput="labNote('${id}',this.value)">${esc(r.note || '')}</textarea>
    ${row.own ? `<div class="lb-sh-lab">Line type</div><div class="lb-chips">${[['say', 'Say it'], ['li', 'Note'], ['h2', 'Section']].map(([k, l]) => `<button class="${(r.lk || 'say') === k ? 'on' : ''}" onclick="labOwnKind('${id}','${k}')">${l}</button>`).join('')}</div>` : ''}
    <div class="lb-acts">
      ${pend ? `<button class="btn primary" onclick="labApplyAsk('${id}')">Apply to Playbook</button>` : `<button class="btn" disabled>Apply to Playbook <span class="dim">· no change</span></button>`}
      ${ed ? `<button class="btn" onclick="labRevert('${id}')">Revert to original</button>` : ''}
      <button class="btn" onclick="labAddBelow('${id}')">Add my line below</button>
      ${row.own ? `<button class="btn danger" onclick="labDelOwn('${id}')">Delete my line</button>` : `<button class="btn" onclick="labHide('${id}',${r.hidden ? 0 : 1})">${r.hidden ? 'Restore line' : 'Hide line'}</button>`}
      <button class="btn ghost" onclick="closeModal();render()">Done</button></div></div>`, true);
}

/* ── the screen ── */
function renderLab(el, p) {
  const pid = p.id, M = labModel(pid), lock = labLocked();
  const rows = M.rows, edited = rows.filter(labEdited).length, added = rows.filter((x) => x.own).length, hidden = rows.filter((x) => x.rec && x.rec.hidden).length, pend = rows.filter(labPending).length;
  const line = (row) => {
    const r = row.rec || {}, k = labKind(row), ed = labEdited(row), txt = labText(row), plainLen = labPlain(txt).length;
    if (r.hidden && !labShowHidden) return '';
    const editing = labEditId === row.id && !lock;
    const body = editing ? `<textarea class="lb-ed" data-k="${row.id}" rows="1" oninput="labInput(this)" onblur="labBlur(this)" onkeydown="labKey(this,event)">${esc(txt)}</textarea>`
      : `<div class="lb-tx" data-k="${row.id}" onclick="labTap('${row.id}',event)">${plainLen ? labRich(txt, r.hl) : '<span class="lb-ph">tap to write your line</span>'}</div>`;
    return `<div class="lb-row k-${k}${ed ? ' ed' : ''}${row.own ? ' own' : ''}${r.hidden ? ' hid' : ''}${editing ? ' editing' : ''}" data-row="${row.id}">
      <button class="lb-flag f-${r.flag || 'none'}" onclick="labFlag('${row.id}')" aria-label="Flag: ${LAB_FLAG_LBL[r.flag || '']}">${LAB_FLAG_ICON[r.flag || '']}</button>
      <div class="lb-main">${body}${labCompare && ed ? `<div class="lb-orig"><span>ORIGINAL</span>${labRich(row.line.text)}</div>` : ''}${r.note ? `<div class="lb-note">${esc(r.note)}</div>` : ''}</div>
      <div class="lb-side">${ed ? '<i class="lb-mk ed" title="edited, not applied">EDIT</i>' : row.own && labPending(row) ? '<i class="lb-mk add" title="your line, not applied">NEW</i>' : ''}${r.hidden ? '<i class="lb-mk">HID</i>' : ''}${lock ? '' : `<button class="lb-more" onclick="labMenu('${row.id}')" aria-label="Line actions">⋯</button>`}</div></div>`;
  };
  el.innerHTML = `<div class="lb">
    <div class="row" style="gap:8px;margin-bottom:10px"><button class="btn sm ghost" onclick="pbLab=false;labEditId=null;render()">‹ ${esc(p.title.split('·')[0].split('(')[0].trim())}</button><span class="grow"></span><span class="lb-live">LIVE SCRIPT = PLAYBOOK · CHANGES ONLY ON APPLY</span></div>
    <div class="lb-pages">${LAB_PAGES.filter(([id]) => pb(id)).map(([id, l]) => { const n = labModel(id).rows.filter(labPending).length; return `<button class="${id === pid ? 'on' : ''}" onclick="pbOpen='${id}';labEditId=null;render()">${l}${n ? `<i>${n}</i>` : ''}</button>`; }).join('')}</div>
    <div class="lb-bar">
      <div class="lb-hls">${LAB_HL.map(([c, l]) => `<button class="lb-sw sw-${c}" onpointerdown="event.preventDefault()" onclick="labHl('${c}')" title="${l}"><i></i><span>${l}</span></button>`).join('')}<button class="lb-sw sw-x" onpointerdown="event.preventDefault()" onclick="labHl('')" title="Erase highlight"><i></i><span>Erase</span></button></div>
      <div class="lb-ctl"><button class="${lock ? 'on' : ''}" onclick="labLock()">${lock ? '🔒 Locked' : 'Lock'}</button><button class="${labCompare ? 'on' : ''}" onclick="labCompare=!labCompare;render()">Compare</button>${hidden ? `<button class="${labShowHidden ? 'on' : ''}" onclick="labShowHidden=!labShowHidden;render()">Hidden ${hidden}</button>` : ''}</div>
    </div>
    <div class="lb-stat"><b>${edited}</b> edited · <b>${added}</b> added · <b>${hidden}</b> hidden · <b class="${pend ? 'acc' : ''}">${pend}</b> to apply${lock ? ' · <span class="acc">locked: highlights and flags only</span>' : ''}</div>
    <div class="lb-doc">${rows.map(line).join('')}</div>
    ${M.orphans.length ? `<div class="lb-orph"><div class="lb-sh-lab">Markup on lines that changed in the Playbook since</div>${M.orphans.map((r) => `<div class="lb-orow"><div><div class="lb-was">${esc(labPlain((labParse(r.base || '')[0] || {}).text || ''))}</div>${r.draft != null ? `<div class="lb-now">${esc(labPlain(r.draft))}</div>` : ''}${r.note ? `<div class="lb-note">${esc(r.note)}</div>` : ''}</div><div class="lb-two"><button class="btn sm" onclick="labOrphan('${r.id}',1)">Keep as my line</button><button class="btn sm ghost" onclick="labOrphan('${r.id}',0)">Discard</button></div></div>`).join('')}</div>` : ''}
    <div class="lb-foot">${lock ? '' : `<button class="btn sm" onclick="labAddBelow('${(rows[rows.length - 1] || {}).id || ''}')">+ Add my line at the end</button>`}<span class="grow"></span>${rows.some((x) => x.rec) ? `<button class="btn sm ghost" onclick="labResetAll()">Reset all to original</button>` : ''}</div>
    ${M.logs.length ? `<details class="lb-log"><summary>Applied to the Playbook · ${M.logs.length}</summary>${M.logs.slice(0, 20).map((g) => `<div class="lb-lrow"><span>${new Date(g.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${g.mirrored ? ' · in Drive' : ''}</span>${g.before ? `<div class="lb-was">${esc(labPlain(g.before))}</div>` : ''}<div class="lb-now">${g.after ? esc(labPlain(g.after)) : '<em>(removed)</em>'}</div></div>`).join('')}</details>` : ''}
    <div class="lb-key">Tap a line to rewrite it · select words, then a colour · ✓ ? ✎ flags · ⋯ note, peek, revert, apply</div>
  </div>`;
}

function labTop() { requestAnimationFrame(() => { let t = 0; const tb = document.querySelector('.topbar'), sg = document.querySelector('#view-book .sh-seg'); if (tb && getComputedStyle(tb).position === 'sticky') t = tb.offsetHeight; if (sg && getComputedStyle(sg).position === 'sticky') t = Math.max(t, (parseFloat(getComputedStyle(sg).top) || 0) + sg.offsetHeight); document.documentElement.style.setProperty('--lb-top', t + 'px'); }); }
/* ── hooks into the Playbook screen (renderBook), the dialer link and sync ── */
(function () {
  const _rb = renderBook;
  renderBook = function () {
    const el = $('view-book'), p = pbOpen && pb(pbOpen);
    if (pbLab && p && p.cat === 'scripts') {
      const a = document.activeElement; if (a && a.classList && a.classList.contains('lb-ed') && a.dataset.k === labEditId) return; /* never re-render under the cursor */
      renderLab(el, p); labTop(); return;
    }
    _rb.apply(this, arguments);
    if (pbOpen && p && p.cat === 'scripts') { const bar = el.querySelector('.row'); if (bar && !bar.querySelector('.lb-open')) bar.insertAdjacentHTML('afterbegin', `<button class="btn sm primary lb-open" onclick="pbLab=true;render();window.scrollTo(0,0)">Script Lab</button>`); }
    else if (!pbOpen) { const c = el.querySelector('.pbcat .card-t'); const sc = [...el.querySelectorAll('.pbcat')].find((x) => /Scripts/.test(x.querySelector('.card-t').textContent)); if (sc && !sc.querySelector('.lb-open')) sc.querySelector('.card-h').insertAdjacentHTML('afterend', `<button class="pbi lb-open" onclick="pbOpen='script-owner';pbLab=true;render();window.scrollTo(0,0)"><div class="t">⌁ Script Lab · mark up and rewrite</div><div class="s">Your markup layer on top of these scripts. The dialer keeps the live words until you Apply.</div></button>`); void c; }
  };
})();

(function () {
  if (document.getElementById('lab-css')) return; const st = document.createElement('style'); st.id = 'lab-css';
  st.textContent = `:is(#view-book,#modal) .lb{--g:#d4a94a;--gr:#3fb950;--rd:#e5534b;--bl:#4a8fe7;max-width:880px;margin:0 auto}:is(#view-book,#modal) .lb-live{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;color:var(--muted)}:is(#view-book,#modal) .lb-pages{display:flex;gap:0;border:1px solid #262B32;border-radius:6px;overflow:hidden;margin-bottom:10px}:is(#view-book,#modal) .lb-pages button{flex:1;min-height:42px;background:transparent;border:0;border-right:1px solid #262B32;color:var(--muted);font:600 13px/1 inherit;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;white-space:nowrap;padding:0 6px}:is(#view-book,#modal) .lb-pages button:last-child{border-right:0}:is(#view-book,#modal) .lb-pages button.on{color:var(--text);background:rgb(var(--acc-rgb,212 169 74) / .12);box-shadow:inset 0 -2px 0 var(--acc)}:is(#view-book,#modal) .lb-pages i{font-style:normal;margin-left:6px;display:inline-block;min-width:18px;padding:3px 4px;border-radius:3px;background:var(--acc);color:#000;font:700 10px/1 var(--mono,monospace)}:is(#view-book,#modal) .lb-bar{position:sticky;top:var(--lb-top,0px);z-index:5;background:var(--bg,#0b0b0b);border-bottom:1px solid #262B32;padding:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;box-shadow:0 -16px 0 var(--bg,#070809)}:is(#view-book,#modal) .lb-hls{display:flex;gap:6px;flex:1;min-width:0}:is(#view-book,#modal) .lb-sw{flex:1;min-height:40px;display:flex;align-items:center;justify-content:center;gap:6px;background:transparent;border:1px solid #262B32;border-radius:6px;color:var(--text);font:600 12px/1 inherit;cursor:pointer;padding:0 4px;-webkit-user-select:none;user-select:none}:is(#view-book,#modal) .lb-sw i{width:12px;height:12px;border-radius:2px;flex:none}:is(#view-book,#modal) .lb-sw span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:is(#view-book,#modal) .sw-gold i{background:var(--g)}:is(#view-book,#modal) .sw-green i{background:var(--gr)}:is(#view-book,#modal) .sw-red i{background:var(--rd)}:is(#view-book,#modal) .sw-blue i{background:var(--bl)}:is(#view-book,#modal) .sw-x i{border:1px solid var(--muted);background:linear-gradient(45deg,transparent 45%,var(--muted) 45%,var(--muted) 55%,transparent 55%)}:is(#view-book,#modal) .lb-ctl{display:flex;gap:6px}:is(#view-book,#modal) .lb-ctl button{min-height:40px;padding:0 12px;background:transparent;border:1px solid #262B32;border-radius:6px;color:var(--muted);font:600 12px/1 inherit;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}:is(#view-book,#modal) .lb-ctl button.on{color:var(--text);border-color:var(--acc)}:is(#view-book,#modal) .lb-stat{font:500 12px/1.4 var(--mono,monospace);color:var(--muted);padding:10px 0 6px}:is(#view-book,#modal) .lb-stat b{color:var(--text)}:is(#view-book,#modal) .lb-stat .acc, :is(#view-book,#modal) .lb-stat b.acc{color:var(--acc)}:is(#view-book,#modal) .lb-doc{border-top:1px solid #262B32}:is(#view-book,#modal) .lb-row{display:grid;grid-template-columns:40px 1fr auto;gap:8px;align-items:start;padding:10px 0;border-bottom:1px solid #262B32;position:relative}:is(#view-book,#modal) .lb-row.ed{box-shadow:inset 2px 0 0 var(--acc)}:is(#view-book,#modal) .lb-row.own{box-shadow:inset 2px 0 0 var(--bl)}:is(#view-book,#modal) .lb-row.hid{opacity:.4}:is(#view-book,#modal) .lb-flag{width:34px;height:34px;margin-left:4px;border:1px solid #262B32;border-radius:5px;background:transparent;color:var(--text);font:700 16px/1 var(--mono,monospace);cursor:pointer;display:flex;align-items:center;justify-content:center}:is(#view-book,#modal) .lb-flag.f-keep{border-color:var(--gr);color:var(--gr)}:is(#view-book,#modal) .lb-flag.f-q{border-color:var(--g);color:var(--g)}:is(#view-book,#modal) .lb-flag.f-rw{border-color:var(--rd);color:var(--rd)}:is(#view-book,#modal) .lb-main{min-width:0}:is(#view-book,#modal) .lb-tx{font-size:16px;line-height:1.5;color:var(--text);cursor:text;padding:4px 0;word-wrap:break-word;-webkit-user-select:text;user-select:text}:is(#view-book,#modal) .k-say .lb-tx{font-size:18px;line-height:1.5}:is(#view-book,#modal) .k-h2 .lb-tx, :is(#view-book,#modal) .k-h1 .lb-tx{font:700 13px/1.4 var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--acc);padding-top:10px}:is(#view-book,#modal) .k-li .lb-tx{color:var(--muted);font-size:15px}:is(#view-book,#modal) .k-li .lb-tx:before{content:'– ';color:var(--muted)}:is(#view-book,#modal) .k-row .lb-tx{font:14px/1.5 var(--mono,monospace);color:var(--muted)}:is(#view-book,#modal) .k-p .lb-tx{color:var(--muted);font-size:15px}:is(#view-book,#modal) .lb-tx b{color:var(--text);font-weight:700}:is(#view-book,#modal) .lb-tok{color:var(--acc);font-family:var(--mono,monospace);font-size:.9em}:is(#view-book,#modal) .lb-tx mark{color:inherit;border-radius:2px;padding:1px 0}:is(#view-book,#modal) .lb-h-gold{background:rgb(212 169 74 / .30);box-shadow:inset 0 -2px 0 var(--g)}:is(#view-book,#modal) .lb-h-green{background:rgb(63 185 80 / .25);box-shadow:inset 0 -2px 0 var(--gr)}:is(#view-book,#modal) .lb-h-red{background:rgb(229 83 75 / .25);box-shadow:inset 0 -2px 0 var(--rd)}:is(#view-book,#modal) .lb-h-blue{background:rgb(74 143 231 / .25);box-shadow:inset 0 -2px 0 var(--bl)}:is(#view-book,#modal) .lb-ed{width:100%;min-height:44px;resize:none;overflow:hidden;background:#000;border:1px solid var(--acc);border-radius:4px;color:var(--text);font:16px/1.5 inherit;padding:8px 10px;outline:0}:is(#view-book,#modal) .k-say .lb-ed{font-size:18px}:is(#view-book,#modal) .lb-ph{color:var(--muted);font-style:italic}:is(#view-book,#modal) .lb-orig{margin-top:6px;padding:6px 8px;border-left:2px solid #262B32;font-size:14px;line-height:1.45;color:var(--muted);text-decoration:line-through;text-decoration-color:rgb(229 83 75 / .6)}:is(#view-book,#modal) .lb-orig span{display:block;text-decoration:none;font:600 10px/1 var(--mono,monospace);letter-spacing:.12em;margin-bottom:4px;color:var(--muted)}:is(#view-book,#modal) .lb-note{margin-top:6px;padding:6px 8px;border-left:2px solid var(--bl);font:13px/1.45 var(--mono,monospace);color:#9fbfee;white-space:pre-wrap}:is(#view-book,#modal) .lb-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding-right:2px}:is(#view-book,#modal) .lb-mk{font:700 9.5px/1 var(--mono,monospace);letter-spacing:.1em;font-style:normal;color:var(--muted);border:1px solid #262B32;padding:3px 4px;border-radius:3px}:is(#view-book,#modal) .lb-mk.ed{color:var(--acc);border-color:var(--acc)}:is(#view-book,#modal) .lb-mk.add{color:var(--bl);border-color:var(--bl)}:is(#view-book,#modal) .lb-more{width:34px;height:34px;background:transparent;border:1px solid #262B32;border-radius:5px;color:var(--text);font-size:18px;line-height:1;cursor:pointer}:is(#view-book,#modal) .lb-foot{display:flex;align-items:center;gap:8px;padding:14px 0}:is(#view-book,#modal) .lb-key{font:500 11px/1.5 var(--mono,monospace);color:var(--muted);text-align:center;padding:6px 0 18px}:is(#view-book,#modal) .lb-orph{margin-top:14px;border:1px dashed #262B32;padding:10px;border-radius:6px}:is(#view-book,#modal) .lb-orow{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #262B32}:is(#view-book,#modal) .lb-was{color:var(--muted);text-decoration:line-through;text-decoration-color:rgb(229 83 75 / .6);font-size:14px;line-height:1.45}:is(#view-book,#modal) .lb-now{color:var(--text);font-size:15px;line-height:1.45}:is(#view-book,#modal) .lb-log{margin-top:6px;border-top:1px solid #262B32;padding-top:8px}:is(#view-book,#modal) .lb-log summary{font:600 12px/1 var(--mono,monospace);letter-spacing:.06em;color:var(--muted);cursor:pointer;padding:6px 0}:is(#view-book,#modal) .lb-lrow{padding:8px 0;border-bottom:1px solid #262B32}:is(#view-book,#modal) .lb-lrow span{font:11px/1 var(--mono,monospace);color:var(--muted)}:is(#view-book,#modal) .lb-sheet .lb-sh-k{font:600 11px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin-bottom:8px}:is(#view-book,#modal) .lb-sh-t{margin:0 0 10px}:is(#view-book,#modal) .lb-sh-line{font-size:17px;line-height:1.5;margin-bottom:10px}:is(#view-book,#modal) .lb-sh-lab{display:block;font:600 11px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}:is(#view-book,#modal) .lb-sh-note{width:100%;min-height:72px;background:#000;border:1px solid #262B32;border-radius:4px;color:var(--text);font:14px/1.45 var(--mono,monospace);padding:8px}:is(#view-book,#modal) .lb-peek summary{font:600 12px/1 var(--mono,monospace);color:var(--muted);cursor:pointer;padding:6px 0}:is(#view-book,#modal) .lb-peek .lb-was{padding:4px 0 2px}:is(#view-book,#modal) .lb-chips{display:flex;gap:6px}:is(#view-book,#modal) .lb-chips button{flex:1;min-height:38px;background:transparent;border:1px solid #262B32;border-radius:5px;color:var(--muted);font:600 12px/1 inherit;cursor:pointer}:is(#view-book,#modal) .lb-chips button.on{color:var(--text);border-color:var(--acc)}:is(#view-book,#modal) .lb-acts{display:grid;gap:8px;margin-top:14px}:is(#view-book,#modal) .lb-acts .btn{min-height:46px}:is(#view-book,#modal) .lb-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}:is(#view-book,#modal) .lb-cmp{border:1px solid #262B32;border-radius:5px;padding:10px;margin:6px 0 10px}:is(#view-book,#modal) .lb-cmp-l{font:600 10px/1 var(--mono,monospace);letter-spacing:.12em;color:var(--muted);margin:6px 0 4px}:is(#view-book,#modal) .lb-sh-d{font-size:13px;line-height:1.5;color:var(--muted)}
  @media (max-width:560px){:is(#view-book,#modal) .lb-sw span{display:none}:is(#view-book,#modal) .lb-sw{min-height:44px}:is(#view-book,#modal) .lb-hls{flex-basis:100%}:is(#view-book,#modal) .lb-ctl{flex:1}:is(#view-book,#modal) .lb-ctl button{flex:1}:is(#view-book,#modal) .lb-row{grid-template-columns:38px 1fr auto;gap:6px}:is(#view-book,#modal) .lb-pages button{font-size:11.5px;padding:0 2px}}
  @media (min-width:960px){:is(#view-book,#modal) .lb-row{grid-template-columns:44px minmax(0,1fr) 230px auto}:is(#view-book,#modal) .lb-row .lb-note{grid-column:3;grid-row:1;margin:4px 0 0}:is(#view-book,#modal) .lb-main{display:contents}:is(#view-book,#modal) .lb-main>.lb-tx, :is(#view-book,#modal) .lb-main>.lb-ed{grid-column:2}:is(#view-book,#modal) .lb-main>.lb-orig{grid-column:2}:is(#view-book,#modal) .lb-side{grid-column:4;grid-row:1}}
  `;
  document.head.appendChild(st);
})();
