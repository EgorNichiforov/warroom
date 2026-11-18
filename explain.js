/* War Room 13.15 · DEEP CARDS: tap any idea in any course to understand it, watch the moment, and lock it in.
   - lib/cards.json: hand-written deep cards for the core frameworks (hook, visual, plain words, analogy,
     worked example, your move, the trap, memory hook, 2 recall questions, video segments).
   - Tap any idea (li) in a course page → a panel: the matching deep card, ▶ the exact video moment played
     inside the app (youtube-nocookie embed, start/end, nothing opens YouTube), and "Explain it deeper",
     written on the spot with your AI key for ideas that have no hand-written card, then saved on this device.
   - Every ▶ minute link in the courses now plays inline instead of leaving the app.
   - Review: mark a card Got it / Shaky. Spaced repetition (1 → 3 → 7 → 21 → 60 days) in S.cards, synced. */
'use strict';

let XC = null, xcLoading = false;
function xcLoad() { if (XC || xcLoading) return; xcLoading = true; fetch('./lib/cards.json').then((r) => r.json()).then((d) => { XC = d; XC.byId = {}; d.cards.forEach((c) => { XC.byId[c.id] = c; c._re = (c.m || []).map((s) => s[0] === '=' ? new RegExp(s.slice(1)) : new RegExp(s, 'i')); }); xcLoading = false; if (typeof render === 'function') render(); }).catch(() => { xcLoading = false; }); }
xcLoad();
const XC_COURSES = { mind: 'Mindset', scale: 'Scaling', offer: 'Offers', leads: 'Leads', mm: 'Money Models', sales: 'Sales Teams', wealth: 'Wealth', mentors: 'Mentors', life: 'Life' };
const XC_STEPS = [1, 3, 7, 21, 60];

/* ── matching an idea to a card ── */
function xcMatch(text, course) {
  if (!XC) return null; const t = String(text || ''); let best = null, bs = 0;
  XC.cards.forEach((c) => { let s = 0; c._re.forEach((r) => { if (r.test(t)) s += 2; }); if (!s) return; if (course && c.c === course) s += 1; if (s > bs) { bs = s; best = c; } });
  return best;
}
function xcYT(href) { const mx = String(href || '').match(/(?:stream|player)\.mux\.com\/([A-Za-z0-9]{20,})/); if (mx) { const t = String(href).match(/[?&#](?:t|start-time)=(\d+)/), e = String(href).match(/[?&#]end=(\d+)/); return { v: mx[1], s: t ? +t[1] : 0, e: e ? +e[1] : 0 }; } const m = String(href || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (!m) return null; const t = String(href).match(/[?&#]t=(\d+)/), e = String(href).match(/[?&#]end=(\d+)/); return { v: m[1], s: t ? +t[1] : 0, e: e ? +e[1] : 0 }; }
function xcClock(s) { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }

/* ── the inline player: plays only the segment, inside the app ── */
function xcPlayerHtml(v, s, e, label) {
  const st = Math.max(0, (s || 0) - 3), en = e || (s ? s + 180 : 0);
  return `<div class="xc-player" data-v="${esc(v)}"><div class="xc-pl-h"><b>▶ ${esc(label || 'The moment')}</b><span>${s ? xcClock(st) : 'from the start'}${en ? ' → ' + xcClock(en) : ''}</span></div><div class="exc-frame"><iframe sandbox="allow-scripts allow-same-origin allow-presentation allow-forms" referrerpolicy="strict-origin-when-cross-origin" src="${String(v).length > 11 ? `https://player.mux.com/${esc(v)}?autoplay=true&playsinline=true&start-time=${st}&accent-color=%23C9A24A` : `https://www.youtube-nocookie.com/embed/${esc(v)}?start=${st}${en ? '&end=' + en : ''}&autoplay=1&playsinline=1&rel=0&modestbranding=1`}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Video segment"></iframe></div><div class="xs muted">Plays only this segment, here in War Room. Uses data only while it plays.</div></div>`;
}
function xcClipBtn(v, s, e, label) { return `<button class="xc-clip" onclick="xcPlay(this,'${esc(v)}',${s || 0},${e || 0},${JSON.stringify(label || '').replace(/"/g, '&quot;')})"><i>▶</i><span><b>${esc(label || 'Watch the moment')}</b><em>${s ? xcClock(s) : 'start'}${e ? ' → ' + xcClock(e) : ''} · plays here</em></span></button>`; }
function xcPlay(btn, v, s, e, label) { const d = document.createElement('div'); d.innerHTML = xcPlayerHtml(v, s, e, label); btn.replaceWith(d.firstChild); }

/* ── visuals: each concept gets the picture that fits it ── */
function xcVis(v) {
  if (!v) return ''; const T = v.title ? `<div class="xv-t">${esc(v.title)}</div>` : '', N = v.note ? `<div class="xv-n">${esc(v.note)}</div>` : '';
  const cell = (x) => `<div><b>${esc(x[0])}</b>${x[1] ? `<span>${esc(x[1])}</span>` : ''}</div>`;
  let h = '';
  if (v.type === 'eq') h = `<div class="xv-eq"><div class="lhs">${cell(v.lhs)}</div><em>=</em><div class="frac"><div class="num">${v.top.map(cell).join('<i>×</i>')}</div><div class="bar"></div><div class="den">${v.bottom.map(cell).join('<i>×</i>')}</div></div></div>`;
  else if (v.type === 'mul') h = `<div class="xv-mul">${v.items.map(cell).join(`<i>${esc(v.op || '×')}</i>`)}${v.res ? `<i>=</i><div class="res">${cell(v.res)}</div>` : ''}</div>`;
  else if (v.type === 'flow') h = `<div class="xv-flow${v.loop ? ' loop' : ''}">${v.steps.map((x, i) => `<div><u>${i + 1}</u><b>${esc(x[0])}</b>${x[1] ? `<span>${esc(x[1])}</span>` : ''}</div>`).join('<i>→</i>')}${v.loop ? '<i class="lp">↺ repeat</i>' : ''}</div>`;
  else if (v.type === 'ladder') h = `<div class="xv-lad">${v.rungs.slice().reverse().map((x, j) => { const i = v.rungs.length - 1 - j; return `<div class="${v.hi === i ? 'hi' : ''}"><u>${esc(x[2] != null ? x[2] : i + 1)}</u><b>${esc(x[0])}</b><span>${esc(x[1] || '')}</span></div>`; }).join('')}</div>`;
  else if (v.type === 'bars') { const mx = Math.max(...v.rows.map((r) => Math.abs(r[1]))) || 1; h = `<div class="xv-bars">${v.rows.map((r) => `<div class="${r[3] ? 'hi' : ''}"><span>${esc(r[0])}</span><i><s style="width:${Math.max(3, Math.abs(r[1]) / mx * 100)}%"></s></i><b>${esc(r[2] != null ? r[2] : r[1])}</b></div>`).join('')}</div>`; }
  else if (v.type === 'grid') { const hi = v.hi != null ? v.hi : 3, gc = (i) => `<div class="${i === hi ? 'hi' : ''}">${cell(v.cells[i]).slice(5, -6)}</div>`; h = `<div class="xv-grid"><div></div><div class="ax">${esc(v.x[0])}</div><div class="ax">${esc(v.x[1])}</div><div class="ax y">${esc(v.y[0])}</div>${gc(0)}${gc(1)}<div class="ax y">${esc(v.y[1])}</div>${gc(2)}${gc(3)}</div>`; }
  else if (v.type === 'acro') h = `<div class="xv-acro">${v.items.map((x) => `<div><u>${esc(x[0])}</u><b>${esc(x[1])}</b><span>${esc(x[2] || '')}</span></div>`).join('')}</div>`;
  else if (v.type === 'vs') h = `<div class="xv-vs"><div class="a"><b>${esc(v.a[0])}</b>${v.a.slice(1).map((x) => `<span>${esc(x)}</span>`).join('')}</div><div class="b"><b>${esc(v.b[0])}</b>${v.b.slice(1).map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>`;
  else if (v.type === 'funnel') { const n = v.rows.length; h = `<div class="xv-fun">${v.rows.map((r, i) => `<div style="width:${100 - i * (55 / Math.max(1, n - 1))}%"><b>${esc(r[0])}</b><span>${esc(r[1] || '')}</span></div>`).join('')}</div>`; }
  return `<div class="xv">${T}${h}${N}</div>`;
}

/* ── the full card ── */
function xcSrs(id) { return (S.cards && S.cards[id]) || null; }
function xcCardHtml(c, opts) {
  opts = opts || {}; const r = xcSrs(c.id), due = r && r.due <= dk(new Date());
  const sec = (k, lab, body) => body ? `<div class="xc-s ${k}"><div class="xc-l">${lab}</div><div class="xc-b">${pbInline(body)}</div></div>` : '';
  return `<div class="xc-card" data-id="${esc(c.id)}">
    <div class="xc-top"><span>${esc(c.who || XC_COURSES[c.c] || '')} · deep card</span>${r ? `<em class="${due ? 'due' : ''}">${due ? 'review due' : 'next review ' + fmtDate(new Date(r.due + 'T12:00'))}</em>` : ''}</div>
    <h2 class="xc-t">${esc(c.t)}</h2>
    <div class="xc-hook">${pbInline(c.hook)}</div>
    ${xcVis(c.vis)}
    ${sec('plain', 'In plain words', c.plain)}
    ${sec('ana', 'Picture it', c.analogy)}
    ${sec('ex', 'Worked example', c.ex)}
    ${sec('move', 'Your move · Caregiver Bench', c.move)}
    ${sec('trap', 'The trap', c.trap)}
    ${(c.clip || []).length ? `<div class="xc-s"><div class="xc-l">Watch him explain it</div><div class="xc-clips">${c.clip.map((x) => xcClipBtn(x[0], x[1], x[2], x[3])).join('')}</div></div>` : ''}
    ${c.lesson ? `<a class="xc-lesson" data-t="${esc(c.t + ' ' + (c.hook || ''))}" href="${esc(c.lesson[0])}" target="_blank" rel="noopener"><i>🎓</i><span><b>Full course lesson: ${esc(c.lesson[1])}</b><em>the real course video · plays here when it can</em></span></a>` : ''}
    ${c.memo ? `<div class="xc-memo"><span>Lock it in</span><b>${pbInline(c.memo)}</b></div>` : ''}
    ${(c.q || []).length ? `<div class="xc-s"><div class="xc-l">Test yourself · answer out loud first, then tap</div>${c.q.map((x) => `<details class="xc-q"><summary>${esc(x[0])}</summary><div>${pbInline(x[1])}</div></details>`).join('')}</div>` : ''}
    <div class="xc-rate"><span>How well do you know it now?</span><button class="btn sm" onclick="xcRate('${esc(c.id)}',0)">Shaky · show me again tomorrow</button><button class="btn sm primary" onclick="xcRate('${esc(c.id)}',1)">Got it</button></div>
    ${opts.noNav ? '' : xcNav(c)}</div>`;
}
function xcNav(c) { const list = XC.cards.filter((x) => x.c === c.c), i = list.indexOf(c), p = list[i - 1], n = list[i + 1]; return `<div class="xc-nav">${p ? `<button class="btn sm ghost" onclick="xcOpen('${p.id}')">‹ ${esc(p.t).slice(0, 30)}</button>` : '<span></span>'}${n ? `<button class="btn sm ghost" onclick="xcOpen('${n.id}')">${esc(n.t).slice(0, 30)} ›</button>` : '<span></span>'}</div>`; }
function xcOpen(id) { if (!XC) return; const c = XC.byId[id]; if (!c) return; openModal(`<div class="xc-modal">${xcCardHtml(c)}</div>`, true); const m = $('modal'); if (m) m.scrollTop = 0; }
function xcRate(id, ok) {
  S.cards = S.cards || {}; const r = S.cards[id] || { step: -1 }, step = ok ? Math.min(XC_STEPS.length - 1, r.step + 1) : 0, d = new Date(); d.setDate(d.getDate() + XC_STEPS[step]);
  S.cards[id] = { step, due: dk(d), seen: (r.seen || 0) + 1, _u: now() }; save(); toast(ok ? `Locked in · next look in ${XC_STEPS[step]} day${XC_STEPS[step] > 1 ? 's' : ''}` : 'Back tomorrow');
  if (xcRev) { xcRev.i++; xcRevShow(); return; } closeModal(); render();
}

/* ── review: spaced repetition over the cards you've met ── */
let xcRev = null;
function xcDue() { if (!XC || !S.cards) return []; const t = dk(new Date()); return XC.cards.filter((c) => S.cards[c.id] && S.cards[c.id].due <= t); }
function xcReview(course) { const list = xcDue().filter((c) => !course || c.c === course); if (!list.length) { toast('Nothing due. Open a new card.'); return; } xcRev = { list, i: 0 }; xcRevShow(); }
function xcRevShow() {
  const r = xcRev; if (!r || r.i >= r.list.length) { xcRev = null; closeModal(); toast('Review done'); render(); return; }
  const c = r.list[r.i];
  openModal(`<div class="xc-modal"><div class="xc-revh">Review ${r.i + 1} / ${r.list.length}</div><div class="xc-recall"><span>${esc(c.who || XC_COURSES[c.c])}</span><h2>${esc(c.t)}</h2><p>Say it before you look: what's the idea, the formula or the steps, and what does it mean for you this week?</p><button class="btn primary block" onclick="this.parentNode.outerHTML=xcCardHtml(XC.byId['${c.id}'],{noNav:1})">Show the card</button></div></div>`, true);
}

/* ── the deck per course (top of each course tab) ── */
function xcDeck(k) {
  if (!XC) { xcLoad(); return ''; } const list = XC.cards.filter((c) => c.c === k); if (!list.length) return '';
  const due = xcDue().filter((c) => c.c === k).length, met = list.filter((c) => S.cards && S.cards[c.id]).length;
  return `<div class="card xc-deck"><div class="aq-t">🧠 Deep cards <span>${list.length} core ideas, each with a picture, an example, your move, the video moment and a self-test · ${met}/${list.length} learned${due ? ` · <b>${due} due</b>` : ''}</span></div>
    ${due ? `<button class="btn primary block" style="margin-bottom:10px" onclick="xcReview('${k}')">Review ${due} due card${due > 1 ? 's' : ''} (2 min)</button>` : ''}
    <div class="xc-grid">${list.map((c) => { const r = S.cards && S.cards[c.id]; return `<button class="xc-tile${r ? ' met' : ''}" onclick="xcOpen('${c.id}')"><b>${esc(c.t)}</b><span>${esc((() => { const h = String(c.hook).replace(/\*\*/g, ''); return h.length > 92 ? h.slice(0, 90).replace(/\s+\S*$/, '') + '…' : h; })())}</span>${r ? `<i>${r.step >= 2 ? '●●●' : r.step === 1 ? '●●○' : '●○○'}</i>` : '<i>new</i>'}</button>`; }).join('')}</div>
    <div class="xs muted" style="margin-top:8px">Tip: in any lesson below, tap an idea to open its card, watch the moment, or get a deeper explanation.</div></div>`;
}
(function () { const f = window.acqLibCard; if (typeof f !== 'function' || f._xc) return; const g = function (k, opts) { return (k !== 'home' ? xcDeck(k) : '') + f.apply(this, arguments); }; g._xc = 1; window.acqLibCard = g; acqLibCard = g; })();


/* ── HOW IT ALL WORKS: the money machine, top of Courses → Overview ── */
const XC_MACHINE = [
  { k: 'offer', n: 'Market', q: 'Who do you sell to?', a: 'Pick people in pain who can pay and are easy to reach.', ids: ['of-market', 'sc-niche'] },
  { k: 'offer', n: 'Offer', q: 'Why would they say yes?', a: 'Make it so good that saying no feels stupid.', ids: ['of-value', 'of-gso', 'of-guarantee', 'of-price'] },
  { k: 'leads', n: 'Leads', q: 'How do they find out you exist?', a: 'Core Four at volume until it works.', ids: ['ld-core4', 'ld-rule100', 'ld-magnet'] },
  { k: 'sales', n: 'Sales', q: 'How do conversations become yes?', a: 'Diagnose, prescribe, name the price, handle fears.', ids: ['sa-closer', 'sa-bant', 'sa-objections', 'sa-close'] },
  { k: 'mm', n: 'Money model', q: 'How much do you make per customer, how fast?', a: 'Attraction → upsell → downsell → continuity.', ids: ['mm-3nums', 'mm-attraction', 'mm-upsell', 'mm-continuity'] },
  { k: 'scale', n: 'Scale', q: 'What breaks next as you grow?', a: 'One stage, one constraint at a time.', ids: ['sc-stages', 'sc-constraint', 'sc-timestudy'] },
  { k: 'wealth', n: 'Wealth', q: 'How does business money become your freedom?', a: 'Margin → optionality → $100k → equity → your terms.', ids: ['we-money', 'we-margin'] },
];
const XC_PATH = ['sc-stages', 'sc-constraint', 'of-value', 'of-guarantee', 'ld-core4', 'ld-rule100', 'sa-closer', 'sa-bant', 'sa-objections', 'sa-close', 'mm-3nums', 'mm-attraction', 'mm-upsell', 'mm-continuity', 'mi-tough', 'mi-decide'];
function xcMachine() {
  if (!XC) { xcLoad(); return ''; }
  const chip = (id) => { const c = XC.byId[id]; if (!c) return ''; const r = S.cards && S.cards[id]; return `<button class="xm-chip${r ? ' met' : ''}" onclick="xcOpen('${id}')">${r ? '✓ ' : ''}${esc(c.t.replace(/\s*\(.*\)$/, ''))}</button>`; };
  const here = { 2: 1, 3: 1 };
  const st = XC_MACHINE.map((m, i) => `<div class="xm-st${here[i] ? ' here' : ''}"><div class="xm-n"><u>${i + 1}</u><div><b>${m.n}</b><span>${m.q}</span></div>${here[i] ? '<em>you are here</em>' : ''}</div><div class="xm-a">${m.a}</div><div class="xm-chips">${m.ids.map(chip).join('')}<button class="xm-go" onclick="acqTab='${m.k}';acqRead=null;render();window.scrollTo(0,0)">course ›</button></div></div>${i === 4 ? '<div class="xm-loop">↺ cash from every customer pays for more leads (back to 3): that loop is the whole game</div>' : i < XC_MACHINE.length - 1 ? '<div class="xm-arr">↓</div>' : ''}`).join('');
  const done = XC_PATH.filter((id) => S.cards && S.cards[id]).length, next = XC_PATH.find((id) => !(S.cards && S.cards[id]));
  const due = xcDue().length;
  return `<div class="card xm"><div class="aq-t">🗺 How it all works <span>The courses are one machine. Each station answers one question; a business is only as strong as its weakest station.</span></div>
    <div class="xm-flow">${st}</div>
    <div class="xm-engine"><b>⚙ Engine under all of it: Mindset</b><span>What keeps you doing the boring, hard, repeated work when it\'s not working yet.</span><div class="xm-chips">${['mi-tough', 'mi-decide', 'mi-reps', 'mi-baddays'].map(chip).join('')}<button class="xm-go" onclick="acqTab='mind';acqRead=null;render();window.scrollTo(0,0)">course ›</button></div></div>
    <div class="xm-path"><div class="aq-t" style="margin:0">🧭 Your learning path <span>16 cards in the order that matters for you now (stage 1: first paying agency) · ${done}/16 learned${due ? ` · <b>${due} due for review</b>` : ''}</span></div>
      <div class="xm-dots">${XC_PATH.map((id, i) => { const c = XC.byId[id], r = S.cards && S.cards[id]; return `<button class="xm-dot${r ? ' met' : ''}${id === next ? ' next' : ''}" onclick="xcOpen('${id}')" title="${esc(c.t)}"><u>${i + 1}</u><span>${esc(c.t.replace(/\s*\(.*\)$/, '').replace(/:.*/, ''))}</span></button>`; }).join('')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${next ? `<button class="btn primary" onclick="xcOpen('${next}')">Next card: ${esc(XC.byId[next].t)}</button>` : ''}${due ? `<button class="btn" onclick="xcReview()">Review ${due} due</button>` : ''}</div></div></div>`;
}
(function () { const f = window.acqHome; if (typeof f !== 'function' || f._xm) return; const g = function () { const h = f.apply(this, arguments); const i = h.indexOf('<div class="card aq-now">'); const m = xcMachine(); return i > 0 ? h.slice(0, i) + m + h.slice(i) : m + h; }; g._xm = 1; for (const k in f) g[k] = f[k]; window.acqHome = g; acqHome = g; })();


/* ── MENTORS tab: deep cards from the rest of the library (Braun, 30MPC, Voss, …) ── */
if (typeof ACQ_TABS !== 'undefined' && !ACQ_TABS.some((t) => t[0] === 'mentors')) ACQ_TABS.push(['mentors', 'Mentors']);
function xcMentors() {
  if (!XC) { xcLoad(); return '<div class="card"><div class="muted">Loading…</div></div>'; }
  const list = XC.cards.filter((c) => c.c === 'mentors'), who = [...new Set(list.map((c) => c.who))], due = xcDue().filter((c) => c.c === 'mentors').length;
  const MBLURB = { 'Josh Braun': 'Cold calls without neediness: openers, poke-the-bear questions, objections.', '30MPC (Armand & Nick)': 'Cold-call scripts, objections, voicemails, sequences, discovery.', 'Chris Voss': 'Negotiation: labels, "that\'s right", no-oriented questions, voice.' };
  return `<div class="card"><div class="aq-t">🎙 Mentors <span>Deep cards from your mentor library, each with the video segment playing here. Hormozi is in the other tabs.${due ? ` · <b>${due} due</b>` : ''}</span></div>${due ? `<button class="btn primary block" onclick="xcReview('mentors')">Review ${due} due</button>` : ''}</div>` +
    who.map((w) => { const L = list.filter((c) => c.who === w); return `<div class="card xc-deck"><div class="aq-t">${esc(w)} <span>${esc(MBLURB[w] || '')} · ${L.filter((c) => S.cards && S.cards[c.id]).length}/${L.length} learned</span></div><div class="xc-grid">${L.map((c) => { const r = S.cards && S.cards[c.id]; return `<button class="xc-tile${r ? ' met' : ''}" onclick="xcOpen('${c.id}')"><b>${esc(c.t)}</b><span>${esc((() => { const h = String(c.hook).replace(/\*\*/g, ''); return h.length > 92 ? h.slice(0, 90).replace(/\s+\S*$/, '') + '…' : h; })())}</span>${r ? `<i>${r.step >= 2 ? '●●●' : r.step === 1 ? '●●○' : '●○○'}</i>` : '<i>new</i>'}</button>`; }).join('')}</div></div>`; }).join('') +
    `<div class="card"><div class="xs muted">Next in the library: Leila Hormozi, Jocko Willink, Naval, Paul Graham, Charlie Munger, Dan Kennedy, Tony Robbins.</div></div>`;
}
(function () { const f = window.renderAcq; if (typeof f !== 'function' || f._xm) return; const g = function () { if (acqTab === 'mentors' && !acqRead) { const el = document.getElementById('view-acq'); if (!el) return; el.innerHTML = `<div class="aq"><div class="aq-tabs">${ACQ_TABS.map(([k, l]) => `<button class="${acqTab === k ? 'on' : ''}" onclick="acqRead=null;acqTab='${k}';render();window.scrollTo(0,0)">${l}</button>`).join('')}</div>${xcMentors()}</div>`; return; } return f.apply(this, arguments); }; g._xm = 1; window.renderAcq = g; renderAcq = g; })();

/* ── tap an idea → panel ── */
const XP_KEY = 'wr-xp'; let xpCache = {}; try { xpCache = JSON.parse(localStorage.getItem(XP_KEY) || '{}'); } catch (e) { xpCache = {}; }
function xpHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'x' + (h >>> 0).toString(36); }
function xcIdeaText(li) { const c = li.cloneNode(true); c.querySelectorAll('.xp, ul, ol').forEach((x) => x.remove()); return c.textContent.replace(/\[?▶[^\]]*\]?/g, '').replace(/\s+/g, ' ').trim(); }
function xcPanel(li, yt) {
  const old = li.querySelector(':scope > .xp'); if (old && !yt) { old.remove(); li.classList.remove('xp-on'); return; } if (old) old.remove();
  const text = xcIdeaText(li), k = acqRead && acqRead.k, card = xcMatch(text, k), link = yt || [...li.querySelectorAll(':scope > a')].map((a) => xcYT(a.href)).find(Boolean), h = xpHash(text), cached = xpCache[h];
  const p = document.createElement('div'); p.className = 'xp'; li.classList.add('xp-on');
  p.innerHTML = `${link ? (yt ? xcPlayerHtml(link.v, link.s, link.e || 0, 'Where he says it') : xcClipBtn(link.v, link.s, link.e || 0, 'Watch where he says it')) : ''}
    ${card ? `<button class="xp-card" onclick="xcOpen('${card.id}')"><span>🧠 Deep card</span><b>${esc(card.t)}</b><em>${pbInline(card.hook)}</em><i>Open: picture, example, your move, video, self-test ›</i></button>` : ''}
    <div class="xp-ai" data-h="${h}">${cached ? xcAiHtml(cached) : `<button class="btn sm${card ? ' ghost' : ' primary'}" onclick="xcExplain(this)">${card ? 'Also explain this exact line' : 'Explain it deeper'}</button>${typeof aiOn === 'function' && !aiOn() ? '<span class="xs muted"> needs the AI key (More → Food photo AI)</span>' : ''}`}</div>`;
  li.appendChild(p);
}
document.addEventListener('click', (e) => {
  const page = e.target.closest('.aq-page'); if (!page) return;
  const a = e.target.closest('a'); if (a) { const y = xcYT(a.href); if (y) { e.preventDefault(); const li = a.closest('li'); if (li) xcPanel(li, y); else { const d = document.createElement('div'); d.innerHTML = xcPlayerHtml(y.v, y.s, y.e || 0); a.after(d.firstChild); } } return; }
  if (e.target.closest('button, .xp, summary, input, textarea')) return;
  const li = e.target.closest('li'); if (li) xcPanel(li);
}, true);

/* ── AI deeper explanation (only for ideas without a hand-written card, or on request) ── */
const XC_SYS = `You explain business and mindset ideas to Egor, 18, in Moldova. He is building Caregiver Bench (recruits screened caregivers for private-pay home care agencies in Naples, Florida, by cold calling; goal $20k MRR by 1 July 2027), coaches kids' tennis and studies for BAC exams. The idea comes from Alex Hormozi's material, paraphrased. Never invent quotes or claim he said exact words.
Return ONLY JSON: {"hook":"the idea in one sentence he can repeat","plain":"2-4 sentences, plain words","analogy":"one concrete analogy, tennis when it fits","example":"a worked example with real numbers","move":"what it means for Caregiver Bench this week, one concrete action","trap":"the most common mistake","memo":"a short memory hook (rhyme, acronym or image)","q":["a recall question","its answer"]}. Short sentences, no jargon, no fluff.`;
function xcAiHtml(j) {
  const row = (lab, t) => t ? `<div class="xc-s"><div class="xc-l">${lab}</div><div class="xc-b">${pbInline(t)}</div></div>` : '';
  return `<div class="xp-out"><div class="xc-hook">${pbInline(j.hook || '')}</div>${row('In plain words', j.plain)}${row('Picture it', j.analogy)}${row('Worked example', j.example)}${row('Your move', j.move)}${row('The trap', j.trap)}${j.memo ? `<div class="xc-memo"><span>Lock it in</span><b>${pbInline(j.memo)}</b></div>` : ''}${j.q && j.q[0] ? `<details class="xc-q"><summary>${esc(j.q[0])}</summary><div>${pbInline(j.q[1] || '')}</div></details>` : ''}<div class="xs muted">Written for you by your AI key from the course notes; check it against the card or video when it matters.</div></div>`;
}
async function xcExplain(btn) {
  const box = btn.closest('.xp-ai'), li = btn.closest('li'), h = box.dataset.h, text = xcIdeaText(li);
  if (typeof aiOn === 'function' && !aiOn()) { toast('Add the AI key in More → Food photo AI'); return; }
  const ctx = typeof acqCtx === 'function' ? acqCtx() : null;
  box.innerHTML = '<span class="xs muted">Thinking it through…</span>';
  try {
    const out = await aiText(XC_SYS, [{ role: 'user', text: `Lesson: ${ctx ? ctx.t : ''}\n\nLesson notes (for context, excerpt):\n${ctx ? ctx.md.slice(0, 5000) : ''}\n\nExplain this exact idea in depth:\n${text}` }]);
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    xpCache[h] = j; try { localStorage.setItem(XP_KEY, JSON.stringify(xpCache)); } catch (e) { }
    box.innerHTML = xcAiHtml(j);
  } catch (e) { box.innerHTML = `<span class="xs red">Couldn't explain it right now (${esc(e.message || 'error')}).</span> <button class="btn sm" onclick="xcExplain(this)">Try again</button>`; }
}

/* ── styles ── */
(function () {
  const st = document.createElement('style'); st.textContent = `
.xc-lesson{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;border:1px solid #262B32;border-radius:4px;padding:9px 10px}.xc-lesson:hover{border-color:var(--acc)}.xc-lesson i{font-style:normal;font-size:18px}.xc-lesson span{display:grid;gap:2px}.xc-lesson b{font-size:13.5px;color:var(--text)}.xc-lesson em{font-style:normal;font-size:11.5px;color:var(--muted)}
  .xm-flow{display:grid;gap:0}.xm-st{border:1px solid #1B1F24;border-radius:6px;padding:10px 12px;display:grid;gap:6px}.xm-st.here{border-color:var(--acc);background:rgb(255 255 255 / .02)}.xm-n{display:flex;gap:10px;align-items:center}.xm-n u{text-decoration:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--acc);display:grid;place-items:center;font:700 12px/1 var(--mono,monospace);color:var(--acc);flex:none}.xm-n div{display:grid;gap:1px;flex:1}.xm-n b{font-size:15px;color:var(--text)}.xm-n span{font-size:12.5px;color:var(--muted)}.xm-n em{font-style:normal;font:600 10px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:#0B0D10;background:var(--acc);padding:4px 6px;border-radius:3px}
  .xm-a{font-size:13px;color:var(--text);line-height:1.45}.xm-chips{display:flex;gap:6px;flex-wrap:wrap}.xm-chip{background:transparent;border:1px solid #262B32;border-radius:14px;padding:5px 10px;font:inherit;font-size:12px;color:var(--text);cursor:pointer}.xm-chip:hover{border-color:var(--acc)}.xm-chip.met{border-color:#3a4a3a;color:var(--green,#8fae8b)}.xm-go{background:transparent;border:0;color:var(--acc);font:inherit;font-size:12px;cursor:pointer;padding:5px 4px}
  .xm-arr{text-align:center;color:var(--acc);font-size:16px;line-height:1;padding:4px 0}.xm-loop{text-align:center;color:var(--acc);font-size:12.5px;padding:8px 6px;border:1px dashed var(--acc);border-radius:4px;margin:6px 0}
  .xm-engine{margin-top:10px;border:1px dashed #3a4048;border-radius:6px;padding:10px 12px;display:grid;gap:6px}.xm-engine b{font-size:14px;color:var(--text)}.xm-engine span{font-size:12.5px;color:var(--muted)}
  .xm-path{margin-top:14px;border-top:1px solid #1B1F24;padding-top:12px}.xm-dots{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:10px}.xm-dot{display:flex;gap:8px;align-items:center;text-align:left;background:transparent;border:1px solid #1B1F24;border-radius:4px;padding:6px 8px;font:inherit;color:inherit;cursor:pointer}.xm-dot u{text-decoration:none;font:600 11px/1 var(--mono,monospace);color:var(--muted);width:18px}.xm-dot span{font-size:12px;color:var(--text);line-height:1.3}.xm-dot.met{border-color:#3a4a3a}.xm-dot.met u{color:var(--green,#8fae8b)}.xm-dot.next{border-color:var(--acc)}.xm-dot.next u{color:var(--acc)}
  .aq-page li{cursor:pointer;border-radius:4px;transition:background .15s}.aq-page li:hover{background:rgb(255 255 255 / .025)}.aq-page li.xp-on{background:rgb(255 255 255 / .03)}
  .xp{margin:8px 0 12px;padding:10px;border:1px solid #20252B;border-left:2px solid var(--acc);border-radius:4px;display:grid;gap:10px;cursor:default}
  .xp-card{display:grid;gap:3px;text-align:left;background:transparent;border:1px solid #262B32;border-radius:4px;padding:10px;cursor:pointer;font-family:inherit;color:inherit}.xp-card:hover{border-color:var(--acc)}.xp-card span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}.xp-card b{font-size:15px;color:var(--text)}.xp-card em{font-style:normal;font-size:13px;color:var(--muted);line-height:1.4}.xp-card i{font-style:normal;font-size:11.5px;color:var(--acc)}
  .xc-clip{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:#101317;border:1px solid #262B32;border-radius:4px;padding:9px 10px;cursor:pointer;font-family:inherit;color:inherit}.xc-clip:hover{border-color:var(--acc)}.xc-clip>i{font-style:normal;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--acc);color:#0B0D10;font-size:12px;flex:none}.xc-clip span{display:grid;gap:2px}.xc-clip b{font-size:13.5px;color:var(--text)}.xc-clip em{font-style:normal;font-size:11.5px;color:var(--muted)}
  .xc-clips{display:grid;gap:6px}.xc-player{display:grid;gap:6px}.xc-pl-h{display:flex;justify-content:space-between;gap:8px;font-size:12.5px}.xc-pl-h b{color:var(--text)}.xc-pl-h span{color:var(--muted);font-family:var(--mono,monospace)}
  .xc-player .exc-frame{position:relative;padding-top:56.25%;border-radius:4px;overflow:hidden;background:#000}.xc-player .exc-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .xc-modal{max-width:760px}.xc-card{display:grid;gap:14px}.xc-top{display:flex;justify-content:space-between;gap:8px}.xc-top span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}.xc-top em{font-style:normal;font-size:11.5px;color:var(--muted)}.xc-top em.due{color:var(--acc)}
  .xc-t{font-size:24px;line-height:1.2;margin:0;color:var(--text)}.xc-hook{font-size:17px;line-height:1.45;color:var(--text);border-left:3px solid var(--acc);padding:2px 0 2px 12px}
  .xc-s{display:grid;gap:5px}.xc-l{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.xc-b{font-size:14.5px;line-height:1.55;color:var(--text)}.xc-s.move{border:1px solid #2a3a2a;border-radius:4px;padding:10px;background:rgb(143 174 139 / .05)}.xc-s.move .xc-l{color:var(--green,#8fae8b)}.xc-s.trap{border:1px solid #3a2a2a;border-radius:4px;padding:10px;background:rgb(200 110 100 / .05)}.xc-s.trap .xc-l{color:#d08a7f}
  .xc-memo{display:grid;gap:4px;border:1px dashed var(--acc);border-radius:4px;padding:10px 12px;text-align:center}.xc-memo span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}.xc-memo b{font-size:17px;color:var(--text);line-height:1.35}
  .xc-q{border-bottom:1px solid #15181C}.xc-q summary{cursor:pointer;padding:9px 0;font-size:14px;color:var(--text);list-style:none}.xc-q summary::-webkit-details-marker{display:none}.xc-q summary:before{content:'? ';color:var(--acc);font-weight:700}.xc-q div{padding:0 0 10px 14px;font-size:13.5px;color:var(--muted);line-height:1.5}
  .xc-rate{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid #1B1F24;padding-top:12px}.xc-rate span{font-size:12.5px;color:var(--muted);margin-right:auto}
  .xc-nav{display:flex;justify-content:space-between;gap:8px}
  .xc-deck .xc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}.xc-tile{display:grid;gap:4px;text-align:left;background:transparent;border:1px solid #1B1F24;border-radius:4px;padding:10px;cursor:pointer;font-family:inherit;color:inherit;position:relative}.xc-tile:hover{border-color:var(--acc)}.xc-tile b{font-size:14px;color:var(--text);padding-right:34px}.xc-tile span{font-size:12px;color:var(--muted);line-height:1.4}.xc-tile i{position:absolute;top:10px;right:10px;font-style:normal;font:600 10px/1 var(--mono,monospace);color:var(--dim,#5B626B)}.xc-tile.met{border-color:#262B32}.xc-tile.met i{color:var(--acc)}
  .xc-revh{font:600 11px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin-bottom:10px}.xc-recall{display:grid;gap:10px;padding:10px 0}.xc-recall span{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.xc-recall h2{font-size:26px;margin:0}.xc-recall p{color:var(--muted);font-size:14px;line-height:1.5;margin:0}
  .xp-out{display:grid;gap:10px}.xp-ai{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.xp-ai .xp-out{width:100%}
  .xv{border:1px solid #1B1F24;border-radius:6px;padding:14px;background:#0E1114;display:grid;gap:10px}.xv-t{font:600 10.5px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.xv-n{font-size:12.5px;color:var(--muted);line-height:1.45}
  .xv b{color:var(--text);font-size:14px}.xv span{display:block;font-size:11.5px;color:var(--muted);line-height:1.35}
  .xv-eq{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.xv-eq>em{font-style:normal;font-size:22px;color:var(--acc)}.xv-eq .lhs>div{border:1px solid var(--acc);border-radius:4px;padding:8px 10px}.xv-eq .frac{display:grid;gap:6px;flex:1;min-width:220px}.xv-eq .num,.xv-eq .den{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}.xv-eq .num>div{border:1px solid #2f4a2f;background:rgb(143 174 139 / .07);border-radius:4px;padding:6px 9px;text-align:center}.xv-eq .den>div{border:1px solid #4a2f2f;background:rgb(200 110 100 / .07);border-radius:4px;padding:6px 9px;text-align:center}.xv-eq .bar{height:2px;background:var(--muted)}.xv-eq i{font-style:normal;color:var(--muted)}
  .xv-mul{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.xv-mul>div{border:1px solid #262B32;border-radius:4px;padding:8px 10px;text-align:center}.xv-mul .res>div{border-color:var(--acc)}.xv-mul i{font-style:normal;color:var(--acc);font-size:18px}
  .xv-flow{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap}.xv-flow>div{flex:1;min-width:110px;border:1px solid #262B32;border-radius:4px;padding:8px;display:grid;gap:3px;align-content:start}.xv-flow u{text-decoration:none;font:600 10px/1 var(--mono,monospace);color:var(--acc)}.xv-flow>i{font-style:normal;color:var(--acc);align-self:center}.xv-flow .lp{width:100%;text-align:center;font-size:12px}
  .xv-lad{display:grid;gap:4px}.xv-lad>div{display:grid;grid-template-columns:34px 150px 1fr;gap:8px;align-items:center;border:1px solid #1B1F24;border-radius:4px;padding:6px 8px}.xv-lad u{text-decoration:none;font:600 11px/1 var(--mono,monospace);color:var(--muted)}.xv-lad .hi{border-color:var(--acc);background:rgb(255 255 255 / .02)}.xv-lad .hi u{color:var(--acc)}
  .xv-bars{display:grid;gap:6px}.xv-bars>div{display:grid;grid-template-columns:120px 1fr minmax(64px,auto);gap:8px;align-items:center}.xv-bars span{font-size:12px!important}.xv-bars i{height:12px;background:#15181C;border-radius:2px;overflow:hidden}.xv-bars s{display:block;height:100%;background:#3a4048}.xv-bars .hi s{background:var(--acc)}.xv-bars b{font:600 12px/1.25 var(--mono,monospace);text-align:right;max-width:120px}
  .xv-grid{display:grid;grid-template-columns:70px 1fr 1fr;gap:6px}.xv-grid>div{border:1px solid #1B1F24;border-radius:4px;padding:8px}.xv-grid .ax{border:0;font:600 10.5px/1.3 var(--mono,monospace);color:var(--muted);text-transform:uppercase;letter-spacing:.08em;text-align:center;padding:4px}.xv-grid .ax.y{display:grid;place-items:center}.xv-grid .hi{border-color:var(--acc)}.xv-grid>div:first-child{border:0}
  .xv-acro{display:grid;gap:5px}.xv-acro>div{display:grid;grid-template-columns:34px 140px 1fr;gap:8px;align-items:center}.xv-acro u{text-decoration:none;width:30px;height:30px;border:1px solid var(--acc);border-radius:4px;display:grid;place-items:center;font:700 15px/1 var(--mono,monospace);color:var(--acc)}
  .xv-vs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.xv-vs>div{border:1px solid #262B32;border-radius:4px;padding:10px;display:grid;gap:5px;align-content:start}.xv-vs .a{border-color:#4a2f2f}.xv-vs .b{border-color:#2f4a2f}.xv-vs span{font-size:12.5px!important}
  .xv-fun{display:grid;gap:4px;justify-items:center}.xv-fun>div{border:1px solid #262B32;border-radius:4px;padding:6px 8px;text-align:center;display:grid;gap:2px}.xv-fun>div:last-child{border-color:var(--acc)}
  @media (max-width:700px){.xv-flow{flex-direction:column}.xv-flow>i{transform:rotate(90deg);align-self:center}.xv-lad>div{grid-template-columns:30px 1fr}.xv-lad span{grid-column:2}.xv-acro>div{grid-template-columns:34px 1fr}.xv-acro span{grid-column:2}.xv-bars>div{grid-template-columns:92px 1fr minmax(56px,auto)}.xv-vs{grid-template-columns:1fr}.xc-t{font-size:21px}}
  `;
  document.head.appendChild(st);
})();
