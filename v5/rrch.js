/* ═════════ 15.5.0 · RELIABLE RETAINED CARE HOURS ═════════
   North Star (21 Nov): weekly care hours worked by caregivers we placed who are 90+ days in.
   Per placement: p.wantH (hours/week she wants), p.workH (hours/week she works now), p.left (date she left, YYYY-MM-DD).
   Adds a card to Pipeline → Money, under the shift counter. */
function rrStart(p) { try { return pd(String(p.at || '').slice(0, 10)); } catch (e) { return null; } }
function rrDays(p) { const s = rrStart(p); if (!s) return 0; let end = new Date(); if (p.left) { try { end = pd(String(p.left).slice(0, 10)); } catch (e) { } } return Math.max(0, Math.floor((end - s) / 864e5)); }
function rrLeftBefore(p, n) { return !!p.left && rrDays(p) < n; }
function rrMark(p, n) { if (rrLeftBefore(p, n)) return '<span class="bad">left</span>'; return rrDays(p) >= n ? '<span class="ok">✓</span>' : `<span class="muted">${n - rrDays(p)}d</span>`; }
function rrEdit(id, i) {
  const x = Q.items[id], p = x && (x.placements || [])[i]; if (!p) return;
  const w = prompt(`${p.cg || 'Caregiver'}: hours a week she WANTS`, p.wantH || ''); if (w === null) return;
  const k = prompt(`${p.cg || 'Caregiver'}: hours a week she WORKS now`, p.workH || ''); if (k === null) return;
  const l = prompt('Date she left (YYYY-MM-DD). Leave empty if she is still working.', p.left || ''); if (l === null) return;
  const lv = (l || '').trim(); if (lv && !/^\d{4}-\d{2}-\d{2}$/.test(lv)) { toast('Date must look like 2026-12-01'); return; }
  p.wantH = Math.max(0, +w || 0); p.workH = Math.max(0, +k || 0); p.left = lv; p.rrAt = dk(new Date());
  x._u = now(); qSave(); render(); toast('Retained hours updated');
}
function rrCard(P) {
  const live = P.filter(({ p }) => !p.left), due = (n) => P.filter(({ p }) => { const s = rrStart(p); return s && (new Date() - s) / 864e5 >= n; });
  const kept = (n) => due(n).filter(({ p }) => !rrLeftBefore(p, n)).length, pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
  const rrch = live.filter(({ p }) => rrDays(p) >= 90).reduce((a, { p }) => a + (+p.workH || 0), 0);
  const wanted = live.reduce((a, { p }) => a + (+p.wantH || 0), 0), worked = live.reduce((a, { p }) => a + (+p.workH || 0), 0);
  const missing = live.filter(({ p }) => !p.wantH || !p.workH).length;
  return `<div class="card"><div class="card-h"><div class="card-t">Retained care hours · the North Star</div><div class="card-r">hours a week from caregivers 90+ days in</div></div>
    <div class="st-kpis">${stK('Retained care hours', fmt(rrch) + ' h/wk', 'still working, day 90+')}${stK('Kept to day 30', pct(kept(30), due(30).length), due(30).length + ' due')}${stK('Kept to day 90', pct(kept(90), due(90).length), due(90).length + ' due')}${stK('Hours match', wanted ? Math.round((worked / wanted) * 100) + '%' : '—', 'worked ÷ wanted')}</div>
    ${P.length ? stTable(['Caregiver', 'Agency', 'Day', 'Wants', 'Works', '30', '60', '90', ''], P.map(({ x, p, i }) => ({ c: [esc(p.cg || '—'), esc(x.agency), p.left ? `left d${rrDays(p)}` : 'd' + rrDays(p), p.wantH ? p.wantH + 'h' : '<span class="muted">?</span>', p.workH ? p.workH + 'h' : '<span class="muted">?</span>', rrMark(p, 30), rrMark(p, 60), rrMark(p, 90), `<button class="btn sm" onclick="rrEdit(${x.id},${i})">Update</button>`] }))) : '<div class="hint">No placements yet. The first caregiver who works a shift appears here.</div>'}
    ${missing ? `<div class="hint">${missing} placement${missing > 1 ? 's' : ''} without hours wanted or worked: tap Update. Ask her on the day-7 check-in.</div>` : ''}</div>`;
}
(function () {
  if (typeof mlTab !== 'function') return; const _ml = mlTab;
  mlTab = function () { const h = _ml(), mark = '<div class="card"><div class="card-h"><div class="card-t">Invoices'; let card = ''; try { card = rrCard(mlPlacements()); } catch (e) { card = ''; } return h.includes(mark) ? h.replace(mark, card + mark) : h + card; };
})();
