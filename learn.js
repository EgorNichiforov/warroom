/* War Room 13.20 · learn.js — ONE place to learn: Bootcamp + Courses, presented like a real learning app.
   Egor (18 Nov): "it's confusing… make it like a professional app… unite bootcamp with courses."
   - Work → Learn (replaces the separate Bootcamp + Courses tabs). The Bootcamp engine (bootcamp.js: lessons,
     tests, boss fights, missions, simulator) is unchanged; this file is the front door and the presentation.
   - Learn home (one screen): Up next (today's lesson) → your progress → practice → the course shelf.
     "Your path" opens the full Bootcamp map/modules (the old Bootcamp home).
   - Course page (every course the same): header + progress + Continue, then 3 tabs:
     Lessons (the real course, each with its video) · Key ideas (the deep cards + Bootcamp status) · Tools (diagrams, calculators).
   - Lesson page: video + key moments on top (clips.js), readable notes, "Done → next lesson" at the bottom.
   Course progress: S.acq['ln:<course>:<i>'] (synced like the rest of S.acq). */
'use strict';

const LN_COURSES = [
  ['offer', '💎', '$100M Offers', 'Alex Hormozi', 'Make an offer so good people feel stupid saying no.', '#C9A24A'],
  ['leads', '🧲', '$100M Leads', 'Alex Hormozi', 'Get strangers to want what you sell: the core four and lead getters.', '#5BA3C9'],
  ['sales', '📞', '$100M Sales Teams', 'Alex Hormozi', 'Scripts, closing, and a team that sells without you.', '#C96A4A'],
  ['mm', '💰', '$100M Money Models', 'Alex Hormozi', 'Get customers to pay for their own acquisition within 30 days.', '#7FB069'],
  ['scale', '🗺️', 'The Scaling Roadmap', 'Alex Hormozi', 'Find your stage and the one constraint to fix next.', '#9B7FD1'],
  ['wealth', '🏦', 'Wealth Roadmap', 'Sharran Srivatsaa', 'The five money milestones, from margin to life on your terms.', '#4AB3A0'],
  ['mind', '🧠', 'How Hormozi thinks', 'Alex Hormozi', 'Mindset from his live streams and talks, idea by idea.', '#D17F9B'],
  ['mentors', '🎙️', 'Mentors', 'Braun · 30MPC · Voss · more', 'Cold calling, discovery and negotiation from the best.', '#B0B6BE'],
];
const LN_META = { scale: [13, 541], offer: [10, 165], leads: [17, 440], mm: [32, 424], sales: [4, 201], wealth: [6, 79], mind: [49, 0], mentors: [0, 0] };
const lnC = (k) => LN_COURSES.find((c) => c[0] === k);
let lnTab = 'lessons';

/* ── progress ── */
const lnDone = (k, i) => !!(typeof acqV === 'function' && acqV('ln:' + k + ':' + i, null));
function lnCount(k) { const n = (acqLib[k] && acqLib[k].lessons ? acqLib[k].lessons.length : LN_META[k][0]); let d = 0; for (let i = 0; i < n; i++) if (lnDone(k, i)) d++; return { n, d }; }
function lnNext(k) { const n = lnCount(k).n; for (let i = 0; i < n; i++) if (!lnDone(k, i)) return i; return 0; }
function lnHrs(min) { if (!min) return ''; const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${m} min`; }
function lnMin(t) { const m = String(t).match(/\(~?(\d+(?:\.\d+)?) min/) || String(t).match(/(\d+(?:\.\d+)?) min/); return m ? Math.round(+m[1]) : 0; }
function lnTitle(t) { return (typeof acqLessonT === 'function' ? acqLessonT(t) : t).replace(/^\d+\s*·\s*/, '').replace(/\s*\((?:~?\d+(?:\.\d+)?\s*min[^)]*|video-only[^)]*)\)\s*/g, ' ').replace(/\s+—\s+"[^"]*"\s*$/, '').trim(); }
function lnCards(k) { return typeof XC !== 'undefined' && XC && XC.cards ? XC.cards.filter((c) => c.c === k) : []; }
function lnRung(id) { try { return typeof bcRung === 'function' && typeof BC !== 'undefined' && BC && BC.cardMod && BC.cardMod[id] ? bcRung(id) : 0; } catch (e) { return 0; } }

/* ── navigation ── */
function lnGo() { if (typeof bcS !== 'undefined') bcS = { scr: 'home' }; show('boot'); window.scrollTo(0, 0); }
function lnCourse(k, tab) { acqRead = null; acqTab = k; lnTab = tab || 'lessons'; show('acq'); render(); window.scrollTo(0, 0); }
function lnLesson(k, i) { if (k === 'mentors') return lnCourse(k, 'ideas'); acqOpen(k, i); }
function lnMark(k, i, on) { acqW('ln:' + k + ':' + i, on ? new Date().toISOString().slice(0, 10) : null, true); }
function lnDoneNext(k, i) {
  lnMark(k, i, true); const n = lnCount(k).n;
  if (i + 1 < n) { toast('Lesson done ✓ Next one'); acqOpen(k, i + 1); } else { toast('Course finished ✓'); lnCourse(k); }
}

/* ── Learn home ── */
function lnHome() {
  const rk = bcRank(), nb = bcNextLesson('biz'), nl = bcNextLesson('life'), due = bcDueCards(), st = bcStreak();
  const total = Object.keys(BC.cardMod).length, learned = Object.keys(BC.cardMod).filter((id) => bcV('l:' + id, null)).length;
  const gb = bcGate('biz'), gl = bcGate('life');
  const up = (n, tr, g) => {
    const life = tr === 'life', lab = life ? 'Life lesson' : 'Business lesson';
    if (!n) { const m = bcTrack(tr).find((x) => !bcCleared(x) && bcOpen(x)); return m ? `<button class="ln-up boss" onclick="bcQuizStart('boss','${m.id}')"><span class="ln-k">⚔ Module test</span><b>${esc(m.n)}</b><em>All lessons done. Score 80% to open the next module.</em><u>Start test</u></button>` : ''; }
    const c = XC.byId[n.c];
    if (!g.ok) return `<div class="ln-up lock"><span class="ln-k">🔒 ${lab}</span><b>Earn the next lesson with dials</b><em>${g.d} of ${BC_DIAL_GATE} dials today. One lesson a day is free; the next is paid for in dials.</em></div>`;
    return `<button class="ln-up ${life ? 'life' : ''}" onclick="bcLesson('${n.c}')"><span class="ln-k">${lab} · Module ${bcNo(n.m)} · ${esc(n.m.n)}</span><b>${esc(c.t)}</b><em>${esc(bcTxt(c.hook || '').slice(0, 140))}</em><u>Start · about 8 min</u></button>`;
  };
  const shelf = LN_COURSES.map(([k, ico, name, who, sub, col]) => {
    const p = k === 'mentors' ? null : lnCount(k), cards = lnCards(k).length, M = LN_META[k];
    const meta = k === 'mentors' ? `${cards} key ideas · video clips` : k === 'mind' ? `${M[0]} sections · ${cards} key ideas` : `${M[0]} lessons · ${lnHrs(M[1])}`;
    const pct = p && p.n ? Math.round(p.d / p.n * 100) : 0;
    return `<button class="ln-co" style="--c:${col}" onclick="lnCourse('${k}')"><i>${ico}</i><b>${esc(name)}</b><em>${meta}</em>${p ? `<span class="ln-bar"><u style="width:${pct}%"></u></span><small>${p.d ? `${p.d}/${p.n} done` : 'Not started'}</small>` : '<small>Open</small>'}</button>`;
  }).join('');
  return `<div class="ln">
    <div class="ln-hd"><h1>Learn</h1><p>Learn it in the morning. Use it on tonight's calls.</p></div>
    <div class="ln-search"><input placeholder="Search every course: price, guarantee, voicemail…" value="${esc(typeof acqLibQ !== 'undefined' ? acqLibQ : '')}" oninput="acqLibQ=this.value;clearTimeout(window.__lnq);window.__lnq=setTimeout(()=>{render();const i=document.querySelector('.ln-search input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350)"></div>
    ${typeof acqLibQ !== 'undefined' && acqLibQ.trim().length >= 3 && typeof acqSearch === 'function' ? `<div class="ln-hits">${acqSearch()}</div>` : ''}
    <div class="ln-sec">Up next</div>
    ${due.length ? `<button class="ln-mini warm" onclick="bcReviewStart()"><b>Warm-up · ${Math.min(due.length, 6)} quick questions</b><span>Ideas due for review. 2 minutes.</span><u>›</u></button>` : ''}
    ${up(nb, 'biz', gb)}${up(nl, 'life', gl)}
    <div class="ln-stats" onclick="bcGo('path')" role="button">
      <div><b>${rk.name}</b><span>Rank · ${rk.n}/${BC.modules.length} modules</span></div>
      <div><b>${st}</b><span>Day streak</span></div>
      <div><b>${learned}<small>/${total}</small></b><span>Ideas learned</span></div>
      <em>Your path ›</em></div>
    <div class="ln-sec">Practice</div>
    <div class="ln-prac">
      <button onclick="bcQuizStart('drill')"><i>🎯</i><b>Mixed drill</b><span>10 questions</span></button>
      <button onclick="bcGo('sim')"><i>🎙️</i><b>Owner simulator</b><span>AI cold-call practice</span></button>
      <button onclick="bcQuizStart('mini')"><i>⚡</i><b>Short day</b><span>10 min, never zero</span></button>
      <button onclick="${bcWeak().length ? "bcQuizStart('weak')" : "bcReviewStart()"}"><i>🔁</i><b>${bcWeak().length ? 'Weak spots' : 'Review'}</b><span>${bcWeak().length ? Math.min(8, bcWeak().length) + ' ideas you miss' : due.length + ' due'}</span></button>
    </div>
    <div class="ln-sec">Courses <span>the full trainings, with the real videos</span></div>
    <div class="ln-shelf">${shelf}</div>
    ${bcMisCard(bcV('mis', null), 'mis')}${bcMisCard(bcV('misL', null), 'misL')}
    <div class="ln-how"><b>How it works</b><ol><li><b>Up next</b> is your daily lesson: one idea, about 8 minutes, then a mission you use on calls tonight.</li><li><b>Courses</b> hold the full trainings: watch a lesson, jump to the key moments, mark it done.</li><li><b>Your path</b> shows every module. Pass a module's test (80%) to open the next.</li></ol></div>
  </div>`;
}

/* ── course page ── */
function lnCourseHtml(k) {
  const C = lnC(k); if (!C) return null; const [, ico, name, who, sub, col] = C;
  const L = acqLib[k] || null; if (k !== 'mentors' && !L) acqLoad(k);
  const cards = lnCards(k), p = k === 'mentors' ? null : lnCount(k), M = LN_META[k], clip = (typeof CL !== 'undefined' && CL && CL.c && CL.c[k]) || {};
  const nx = p ? lnNext(k) : 0, ls = L ? L.lessons || [] : [];
  const tabs = k === 'mentors' ? [['ideas', 'Key ideas']] : [['lessons', k === 'mind' ? 'Sections' : 'Lessons'], ['ideas', `Key ideas${cards.length ? ' · ' + cards.length : ''}`], ['tools', 'Tools']];
  if (!tabs.some((t) => t[0] === lnTab)) lnTab = tabs[0][0];
  const pct = p && p.n ? Math.round(p.d / p.n * 100) : 0;
  const head = `<div class="ln-ch" style="--c:${col}"><button class="ln-back" onclick="lnGo()">‹ Learn</button>
    <div class="ln-cht"><i>${ico}</i><div><h1>${esc(name)}</h1><p>${esc(who)}</p></div></div><p class="ln-sub">${esc(sub)}</p>
    <div class="ln-facts">${k === 'mentors' ? `<span>${cards.length} key ideas</span><span>video clips</span>` : `<span>${ls.length} ${k === 'mind' ? 'sections' : 'lessons'}</span>${M[1] ? `<span>${lnHrs(M[1])} of video</span>` : ''}<span>${cards.length} key ideas</span>`}</div>
    ${p ? `<div class="ln-prog"><span class="ln-bar"><u style="width:${pct}%"></u></span><small>${p.d}/${p.n} done</small></div>
    <button class="ln-cta" onclick="lnLesson('${k}',${nx})">${p.d ? 'Continue' : 'Start the course'} · ${esc(lnTitle(ls[nx] ? ls[nx].t : ''))}</button>` : ''}
    <div class="ln-tabs">${tabs.map(([t, l]) => `<button class="${lnTab === t ? 'on' : ''}" onclick="lnTab='${t}';render()">${l}</button>`).join('')}</div></div>`;
  let body = '';
  if (lnTab === 'lessons' && !L) body = '<div class="ln-note">Loading lessons…</div>';
  else if (lnTab === 'lessons') {
    body = `<div class="ln-list">${ls.map((l, i) => { const d = lnDone(k, i), e = clip[String(i)], v = e && (e.pid || e.yt || e.page), mo = e && e.m ? e.m.length : 0, mn = lnMin(l.t);
      return `<button class="ln-row ${d ? 'done' : ''} ${i === nx && !d ? 'next' : ''}" onclick="acqOpen('${k}',${i})"><u>${d ? '✓' : i + 1}</u><span><b>${esc(lnTitle(l.t))}</b><em>${[mn ? mn + ' min' : '', v ? '▶ video' : '', mo ? mo + ' key moments' : ''].filter(Boolean).join(' · ')}</em></span>${i === nx && !d ? '<i>Next</i>' : ''}</button>`; }).join('')}</div>
      ${L && L.videos && L.videos.length ? `<details class="ln-extra"><summary>Extra: ${L.videos.length} pages from his YouTube videos</summary><div class="ln-list">${L.videos.map((l, i) => `<button class="ln-row" onclick="acqOpen('${k}',${i},1)"><u>▶</u><span><b>${esc(l.t)}</b></span></button>`).join('')}</div></details>` : ''}`;
  } else if (lnTab === 'ideas') {
    const groups = k === 'mentors' ? [...new Set(cards.map((c) => c.who || 'Mentors'))].map((w) => [w, cards.filter((c) => (c.who || 'Mentors') === w)]) : [['', cards]];
    body = cards.length ? groups.map(([w, cs]) => `${w ? `<div class="ln-sec">${esc(w)}</div>` : '<p class="ln-note">The core frameworks of this course, one idea each: a picture, an example, your move and the video moment. Tap one.</p>'}
      <div class="ln-list">${cs.map((c) => { const r = lnRung(c.id); return `<button class="ln-idea" onclick="xcOpen('${c.id}')"><span><b>${esc(c.t)}</b><em>${esc(bcTxt(c.hook || '').slice(0, 120))}</em></span>${r ? `<i class="r${r}">${(BC_RUNG[r] || [''])[0]}</i>` : (c.clip || []).length ? '<i class="v">▶</i>' : ''}</button>`; }).join('')}</div>`).join('') : '<p class="ln-note">No key-idea cards for this course yet.</p>';
  } else body = '<div id="ln-tools"><div class="card">Loading tools…</div></div>';
  return `<div class="ln">${head}<div class="ln-body">${body}</div></div>`;
}

/* ── wire it in ── */
(function () {
  /* Work tabs: one "Learn" tab instead of Bootcamp + Courses */
  const segs = () => { try { const H = SH_HUBS.find((h) => h.id === 'work'); if (!H) return; const b = H.segs.find((x) => x[0] === 'boot'); if (b) b[1] = 'Learn'; else { const i = H.segs.findIndex((x) => x[0] === 'acq'); H.segs.splice(i < 0 ? 1 : i, 0, ['boot', 'Learn']); } H.segs = H.segs.filter((x) => x[0] !== 'acq'); } catch (e) { } };
  segs(); if (typeof sgApply === 'function' && !sgApply._ln) { const f = sgApply; sgApply = function () { const r = f.apply(this, arguments); segs(); return r; }; sgApply._ln = 1; }
  if (typeof shCur === 'function' && !shCur._ln) { const f = shCur; shCur = function () { if (typeof view !== 'undefined' && view === 'acq') { const v = view; view = 'boot'; try { return f.apply(this, arguments); } finally { view = v; } } return f.apply(this, arguments); }; shCur._ln = 1; }
  if (typeof shHubOf === 'function' && !shHubOf._ln) { const f = shHubOf; shHubOf = function (v) { return v === 'acq' ? f('boot') : f(v); }; shHubOf._ln = 1; }

  /* opening a lesson from anywhere (Bootcamp, search, a link) always lands on the lesson screen */
  if (typeof acqOpen === 'function' && !acqOpen._ln) { const g = function (k, i, v) { acqRead = { k, i, v: !!v }; acqTab = k === 'home' ? acqTab : k; if (typeof view !== 'undefined' && view !== 'acq') show('acq'); else render(); window.scrollTo(0, 0); }; g._ln = 1; window.acqOpen = g; acqOpen = g; }
  /* Learn home replaces the Bootcamp home; the old one lives on as "Your path" */
  if (typeof bcHome === 'function' && !bcHome._ln) {
    const f = bcHome;
    const g = function () { if (window.LN_OFF) return f.apply(this, arguments); if (bcS && bcS.scr === 'path') return f.apply(this, arguments).replace(/<div class="bc-hd">[\s\S]*?<\/div><\/div>/, bcHead('Your path', 'Every module, in order. Pass a module test (80%) to open the next.', 'lnGo()')); return lnHome(); };
    g._ln = 1; window.bcHome = g; bcHome = g;
  }

  /* course pages */
  if (typeof renderAcq === 'function' && !renderAcq._ln) {
    const f = renderAcq;
    renderAcq = function () {
      const el = document.getElementById('view-acq'); if (!el || window.LN_OFF) return f.apply(this, arguments);
      if (acqRead) { const r = f.apply(this, arguments); lnDecorateReader(); return r; }
      if (acqTab === 'home') { acqTab = 'offer'; lnGo(); return; }
      if (lnTab === 'tools' && acqTab !== 'mentors') {
        const t = acqTab; f.apply(this, arguments); acqTab = t;
        const tmp = document.createElement('div'); tmp.innerHTML = el.innerHTML;
        tmp.querySelectorAll('.aq-tabs,.aq-hd,.xc-deck,.aq-lib,.bc-cta,.aq-srch').forEach((n) => n.remove());
        const tools = tmp.innerHTML.trim();
        el.innerHTML = lnCourseHtml(acqTab) || ''; const slot = document.getElementById('ln-tools');
        if (slot) slot.innerHTML = tools && tmp.textContent.trim() ? `<p class="ln-note">Diagrams of the frameworks and the calculators, filled with your numbers.</p>${tools}` : '<p class="ln-note">No tools for this course yet.</p>';
        return;
      }
      const h = lnCourseHtml(acqTab); if (h == null) return f.apply(this, arguments);
      el.innerHTML = h;
    };
    renderAcq._ln = 1;
  }
})();

/* lesson page: back to the course, lesson n of N, Done → next */
function lnDecorateReader() {
  const r = acqRead, el = document.querySelector('#view-acq .aq-rd'); if (!r || !el || r.v) return;
  const k = r.k, n = lnCount(k).n, d = lnDone(k, r.i), C = lnC(k);
  el.querySelectorAll(':scope > .aq-tabs').forEach((x) => x.remove());
  document.querySelectorAll('#view-acq .aq > .aq-tabs').forEach((x) => x.remove());
  const top = el.querySelector('.aq-rd-top');
  if (top) top.innerHTML = `<button class="ln-back" onclick="lnCourse('${k}')">‹ ${esc(C ? C[2] : 'Course')}</button><span>${k === 'mind' ? 'Section' : 'Lesson'} ${r.i + 1} of ${n}${d ? ' · ✓ done' : ''}</span>`;
  const page = el.querySelector('.aq-page'); if (page) { page.classList.add('ln-read'); const h2 = page.querySelector('h2'), L = acqLib[k], l = L && L.lessons && L.lessons[r.i]; if (h2 && l && !h2.dataset.ln) { h2.dataset.ln = 1; const mn = lnMin(l.t); h2.textContent = lnTitle(l.t); h2.insertAdjacentHTML('afterend', `<div class="ln-lmeta">${esc(C ? C[2] : '')}${mn ? ' · ' + mn + ' min' : ''}</div>`); } }
  if (!el.querySelector('.ln-donebar')) el.insertAdjacentHTML('beforeend', `<div class="ln-donebar">${d
    ? `<button class="ln-cta ghost" onclick="lnMark('${k}',${r.i},false);render()">Mark as not done</button>${r.i + 1 < n ? `<button class="ln-cta" onclick="acqOpen('${k}',${r.i + 1})">Next lesson ›</button>` : ''}`
    : `<button class="ln-cta" onclick="lnDoneNext('${k}',${r.i})">✓ Done${r.i + 1 < n ? ' · next lesson' : ' · finish course'}</button>`}</div>`);
}

(function () {
  const st = document.createElement('style'); st.id = 'learn-css';
  st.textContent = `
  #view-boot,#view-acq,#view-boot button,#view-acq button{font-family:var(--sans)}
  #view-boot h1,#view-boot h2,#view-boot h3,#view-acq h1,#view-acq h2,#view-acq h3{font-family:var(--sans)!important;text-transform:none!important;letter-spacing:-.01em!important;line-height:1.25!important}
  #view-acq .cl-mh,#view-acq .cl-h span{font-family:var(--sans)!important;text-transform:none!important;letter-spacing:0!important;font-size:12.5px!important}
  .ln-lmeta{font-size:13px;color:var(--muted);margin:-6px 0 14px}
  .ln{display:grid;gap:12px;max-width:760px;margin:0 auto;min-width:0}
  .ln h1{font-size:28px;line-height:1.15;margin:0;color:var(--text);letter-spacing:-.01em}.ln-hd p{margin:6px 0 0;color:var(--muted);font-size:14.5px}
  .ln-search input{width:100%;box-sizing:border-box;background:#0F1215;border:1px solid #20252C;border-radius:10px;padding:12px 14px;color:var(--text);font:15px/1.2 var(--sans)}
  .ln-sec{font-size:13px;font-weight:700;color:var(--text);margin:10px 2px -2px;display:flex;gap:8px;align-items:baseline}.ln-sec span{font-weight:400;color:var(--muted);font-size:12.5px}
  .ln-up{display:block;width:100%;text-align:left;border:1px solid var(--acc);background:linear-gradient(180deg,rgb(var(--acc-rgb) / .10),rgb(var(--acc-rgb) / .02));border-radius:12px;padding:16px;color:var(--text);font-family:inherit;cursor:pointer}
  .ln-up.life{border-color:#4AB3A0;background:linear-gradient(180deg,rgba(74,179,160,.10),rgba(74,179,160,.02))}.ln-up.boss{border-color:#C96A4A}.ln-up.lock{border-color:#2A3038;background:#111418;cursor:default}
  .ln-k{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}.ln-up b{display:block;font-size:19px;line-height:1.3}.ln-up em{display:block;font-style:normal;color:var(--muted);font-size:14px;line-height:1.45;margin-top:6px}
  .ln-up u{display:inline-block;text-decoration:none;margin-top:12px;background:var(--acc);color:#111;font-weight:700;font-size:14px;padding:9px 16px;border-radius:8px}.ln-up.life u{background:#4AB3A0}.ln-up.boss u{background:#C96A4A;color:#fff}
  .ln-mini{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid #2A3A48;background:#10161C;border-radius:10px;padding:12px 14px;color:var(--text);font-family:inherit;cursor:pointer}.ln-mini b{display:block;font-size:14.5px}.ln-mini span{display:block;font-size:12.5px;color:var(--muted)}.ln-mini u{margin-left:auto;text-decoration:none;font-size:22px;color:var(--muted)}
  .ln-stats{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px;border:1px solid #20252C;border-radius:12px;padding:14px;cursor:pointer;background:#0F1215}
  .ln-stats b{display:block;font-size:19px;color:var(--text)}.ln-stats>div:first-child b{color:var(--acc)}.ln-stats small{font-size:12px;color:var(--muted)}.ln-stats span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}.ln-stats em{grid-column:1/-1;font-style:normal;font-size:13px;color:var(--acc);font-weight:600}
  .ln-prac{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ln-prac button{text-align:left;border:1px solid #20252C;background:#0F1215;border-radius:10px;padding:12px;color:var(--text);font-family:inherit;cursor:pointer}.ln-prac i{font-style:normal;font-size:20px}.ln-prac b{display:block;font-size:14px;margin-top:4px}.ln-prac span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
  .ln-shelf{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .ln-co{position:relative;text-align:left;border:1px solid #20252C;border-top:3px solid var(--c);background:#0F1215;border-radius:10px;padding:12px;color:var(--text);font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:3px;min-height:132px}
  .ln-co i{font-style:normal;font-size:24px}.ln-co b{font-size:14.5px;line-height:1.25;margin-top:4px}.ln-co em{font-style:normal;font-size:12px;color:var(--muted)}.ln-co small{font-size:11.5px;color:var(--muted);margin-top:auto}
  .ln-bar{display:block;height:4px;border-radius:2px;background:#1E232A;overflow:hidden;margin-top:6px}.ln-bar u{display:block;height:100%;background:var(--c,var(--acc))}
  .ln-how{border-top:1px solid #1B1F24;padding-top:12px;margin-top:6px;font-size:13px;color:var(--muted);line-height:1.5}.ln-how>b{color:var(--text)}.ln-how ol{margin:6px 0 0;padding-left:18px}.ln-how li{margin:4px 0}.ln-how li b{color:var(--text)}
  .ln-back{background:none;border:0;color:var(--acc);font:600 14px/1 inherit;padding:6px 0;cursor:pointer}
  .ln-ch{display:grid;gap:10px}.ln-cht{display:flex;gap:12px;align-items:center}.ln-cht>i{font-style:normal;font-size:30px;width:52px;height:52px;display:grid;place-items:center;border-radius:12px;background:#14181D;border:1px solid var(--c)}
  .ln-cht h1{font-size:24px}.ln-cht p{margin:2px 0 0;color:var(--muted);font-size:13px}.ln-sub{margin:0;font-size:15px;line-height:1.5;color:var(--text)}
  .ln-facts{display:flex;flex-wrap:wrap;gap:6px}.ln-facts span{font-size:12px;color:var(--muted);border:1px solid #20252C;border-radius:20px;padding:4px 10px}
  .ln-prog{display:flex;gap:10px;align-items:center}.ln-prog .ln-bar{flex:1;margin:0;--c:var(--acc)}.ln-prog small{font-size:12px;color:var(--muted)}
  .ln-cta{display:block;width:100%;border:0;border-radius:10px;background:var(--acc);color:#111;font:700 15px/1.3 inherit;padding:13px 14px;cursor:pointer;text-align:center}.ln-cta.ghost{background:transparent;color:var(--muted);border:1px solid #262B32}
  .ln-tabs{display:flex;border-bottom:1px solid #20252C;margin-top:4px}.ln-tabs button{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:var(--muted);font:600 14px/1 inherit;padding:12px 4px;cursor:pointer}.ln-tabs button.on{color:var(--text);border-color:var(--acc)}
  .ln-body{display:grid;gap:10px;min-width:0}.ln-note{margin:4px 2px;font-size:13.5px;color:var(--muted);line-height:1.5}
  .ln-list{display:grid}.ln-row,.ln-idea{display:flex;gap:12px;align-items:center;background:none;border:0;border-bottom:1px solid #171B20;padding:12px 2px;text-align:left;cursor:pointer;color:var(--text);font-family:inherit;width:100%}
  .ln-row>u{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;text-decoration:none;font-size:13px;font-weight:700;color:var(--muted);border:1px solid #2A3038}.ln-row.done>u{background:#22382A;border-color:#2F5A3A;color:#8FD19E}.ln-row.next>u{border-color:var(--acc);color:var(--acc)}
  .ln-row span,.ln-idea span{flex:1;min-width:0}.ln-row b,.ln-idea b{display:block;font-size:15px;font-weight:600;line-height:1.35}.ln-row em,.ln-idea em{display:block;font-style:normal;font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.4}.ln-row.done b{color:var(--muted)}
  .ln-row>i{font-style:normal;font-size:11px;font-weight:700;color:#111;background:var(--acc);border-radius:20px;padding:3px 8px}
  .ln-idea>i{flex:none;font-style:normal;font-size:11px;font-weight:600;border-radius:20px;padding:3px 8px;color:#111}.ln-idea>i.v{background:none;color:var(--acc);font-size:14px}
  .ln-extra summary{cursor:pointer;color:var(--muted);font-size:13.5px;padding:10px 2px}
  #view-acq .aq-rd-top{display:flex;justify-content:space-between;align-items:center}#view-acq .aq-rd-top span{font-size:12.5px;color:var(--muted)}
  .ln-read{font-family:var(--sans)!important;font-size:16px;line-height:1.7;color:var(--text);padding:18px!important}.ln-read *{font-family:var(--sans)}.ln-read h2{font-size:22px;line-height:1.3;text-transform:none;letter-spacing:-.01em;margin:0 0 12px}.ln-read p,.ln-read li{font-size:16px;line-height:1.7}.ln-read b,.ln-read strong{color:var(--text);font-weight:700}
  .ln-donebar{display:flex;gap:8px;margin:6px 0 16px}.ln-donebar .ln-cta{flex:1}
  #view-boot .aq-t,#view-acq .aq-t{font-family:inherit!important;text-transform:none!important;letter-spacing:0!important;font-size:14px!important;font-weight:700!important;color:var(--text)!important}
  #view-boot .aq-t span,#view-acq .aq-t span{font-weight:400;color:var(--muted);font-size:12.5px}
  #view-boot .bc-kind,#view-boot .bc-steps span,#view-boot .bc-rank span,#view-boot .bc-stat span{font-family:inherit!important;letter-spacing:.02em!important;text-transform:none!important;font-size:12px!important}
  #view-boot .bc-q{font-size:17px;line-height:1.55}`;
  document.head.appendChild(st);
})();
