/* War Room 13.24 · bac.js — the BAC feedback loop (Republic of Moldova, June 2027).
   Not a minutes counter. Errors and timed mocks decide what to study next:
     error made → error card (life.js, spaced 1/3/7/14/30 days) → due errors come first in the mission →
     timed mock every 2 weeks per subject → trend vs target → the weakest subject and its most-missed topic get the block.
   Data is the existing study log: S.lifeTests {subj, score, date}, S.lifeErrors {subj, topic, what, fix, lvl, due}.
   Subjects and targets come from LF_SUBJ in life.js (the owner's own setup). They are NOT verified here against the
   Ministry of Education's 2027 regulations: the board says so. "On track" is only stated when the evidence allows it. */
'use strict';
/* 13.24.1: targets are yours to set (BAC board → Change targets). Exam subjects default to 8. One list (LF_SUBJ) feeds every screen. */
function bacApply() { if (typeof LF_SUBJ === 'undefined' || !S || !S.settings) return; const t = (S.settings.bac || {}).t || {}; LF_SUBJ.forEach((s) => { if (s._d == null) s._d = s[3]; s[3] = t[s[0]] != null && !isNaN(Number(t[s[0]])) ? Number(t[s[0]]) : (s[2] === 10 ? 8 : s._d); }); }
function bacTargetsOpen() { bacApply(); openModal(`<h2>BAC targets</h2><label class="xs muted">Target average for the exam subjects</label><input class="aq-in" id="bt-avg" inputmode="decimal" value="${Number((S.settings.bac || {}).target) || 8}">${bacSubj().map((s) => `<label class="xs muted">${esc(s.name)} (out of ${s.max})</label><input class="aq-in bt-s" data-id="${s.id}" inputmode="decimal" value="${s.target}">`).join('')}<div class="actions"><button class="btn" onclick="bacOpen()">Cancel</button><button class="btn primary" onclick="bacTargetsSave()">Save targets</button></div>`, true); }
function bacTargetsSave() { const n = (v) => Number(String(v).replace(',', '.')), t = {}; document.querySelectorAll('.bt-s').forEach((el) => { const v = n(el.value); if (!isNaN(v) && v > 0) t[el.dataset.id] = v; }); const avg = n(($('bt-avg') || {}).value); S.settings.bac = { target: !isNaN(avg) && avg > 0 ? avg : 8, t }; S.settings._u = now(); save(); bacApply(); toast('Targets saved'); bacOpen(); try { mcRefresh(); } catch (e) { } }
function bacSubj() { bacApply(); return typeof LF_SUBJ !== 'undefined' ? LF_SUBJ.map(([id, name, max, target]) => ({ id, name, max, target })) : []; }
function bacStats() {
  const today = dk(new Date()), errs = typeof lfErrs === 'function' ? lfErrs() : [];
  return bacSubj().map((s) => {
    const T = typeof lfTests === 'function' ? lfTests(s.id) : [], last3 = T.slice(-3), last = T[T.length - 1] || null, avg = last3.length ? last3.reduce((a, x) => a + Number(x.score), 0) / last3.length : null;
    const E = errs.filter((e) => e.subj === s.id), due = E.filter((e) => e.due && e.due <= today), topics = {}; E.forEach((e) => { const t = (e.topic || '').trim(); if (t) topics[t] = (topics[t] || 0) + 1 + (e.lvl === 0 ? 1 : 0); });
    const top = Object.keys(topics).sort((a, b) => topics[b] - topics[a])[0] || '';
    return Object.assign({}, s, { n: T.length, last, avg, trend: last3.length >= 2 ? Number(last3[last3.length - 1].score) - Number(last3[0].score) : null, age: last ? Math.round((Date.parse(today) - Date.parse(last.date)) / 864e5) : null, errs: E.length, due: due.length, top, gap: avg == null ? null : (s.target - avg) / s.max });
  });
}
/* can "on track" be judged, and if so what does the evidence say? */
function bacTrack() {
  const St = bacStats(), tgt = Number((S.settings.bac || {}).target) || 8, exam = St.filter((s) => s.max === 10), none = St.filter((s) => !s.n), thin = St.filter((s) => s.n === 1);
  if (!St.length) return { known: false, line: 'No BAC subjects are set up.' };
  if (none.length) return { known: false, line: `${none.length} of ${St.length} subjects have no mock score yet (${none.map((s) => s.name).join(', ')}). On track cannot be judged.` };
  const avg = exam.length ? exam.reduce((a, s) => a + s.avg, 0) / exam.length : null, behind = St.filter((s) => s.avg < s.target);
  return { known: true, est: avg, ok: avg == null ? !behind.length : avg >= tgt, line: `${avg != null ? `Exam subjects average ${avg.toFixed(2)} against your target of ${tgt}. ` : ''}${behind.length ? 'Below its own target: ' + behind.map((s) => s.name).join(', ') + '.' : 'Every subject is at or above its target.'}${thin.length ? ' Estimate from very few mocks: treat it as a first reading.' : ''}` };
}
/* the next BAC action, from the feedback loop */
function bacNext() {
  const St = bacStats(); if (!St.length) return null; const due = St.reduce((a, s) => a + s.due, 0), none = St.filter((s) => !s.n), tr = bacTrack(), unknown = tr.known ? '' : tr.line;
  if (due) { const s = St.slice().sort((a, b) => b.due - a.due)[0]; return { kind: 'errors', out: `Redo ${due} due BAC error${due > 1 ? 's' : ''}`, why: 'Mistakes you already made are the fastest points to win back, and they are due today.', next: 'Open the error review', dod: 'Each one answered from memory and graded', ev: [`${due} error cards due (source: your error log)`, s.top ? `Most-missed topic in ${s.name}: ${s.top}` : ''].filter(Boolean), conf: 'measured', urgent: true, unknown }; }
  if (none.length) return { kind: 'baseline', subj: none[0].id, out: `Timed baseline mock: ${none[0].name}`, why: 'There is no score for this subject yet, so nobody can say whether it is on track.', next: 'Sit the mock, then log the score', dod: 'One timed paper finished, score and every error logged', ev: [`${none.length} of ${St.length} subjects without a mock score`], conf: 'unknown until a first mock', urgent: false, unknown };
  const stale = St.filter((s) => s.age != null && s.age >= 14).sort((a, b) => b.age - a.age)[0];
  if (stale) return { kind: 'mock', subj: stale.id, out: `Timed mock: ${stale.name}`, why: `The last one was ${stale.age} days ago. A fresh score shows whether the studying is working.`, next: 'Sit the mock, then log the score', dod: 'One timed paper finished, score and every error logged', ev: [`Last ${stale.name} mock: ${stale.last.score} on ${stale.last.date}`], conf: 'measured', urgent: false, unknown };
  const weak = St.filter((s) => s.gap != null).sort((a, b) => b.gap - a.gap)[0]; if (!weak) return null;
  const nt = !weak.top && typeof bacNextTopic === 'function' ? bacNextTopic(weak.id) : null;
  return { kind: 'study', subj: weak.id, topicId: nt ? nt.id : '', out: `Study block: ${weak.name}${weak.top ? ', topic: ' + weak.top : nt ? ', topic: ' + nt.t.slice(0, 70) : ''}`, why: weak.gap > 0 ? `Furthest below its target (last-3 average ${weak.avg.toFixed(1)} of ${weak.target}).` : 'Every subject is at target. This one has the smallest margin.', next: 'Closed book: rebuild the topic from memory, then check', dod: 'The topic rebuilt from memory and one exam-style question done under time', ev: [`${weak.name}: last-3 average ${weak.avg.toFixed(1)}, target ${weak.target}`, weak.top ? `Most-missed topic: ${weak.top} (from ${weak.errs} logged errors)` : 'No errors logged for this subject yet'], conf: weak.n >= 3 ? 'measured' : 'estimate from few mocks', urgent: false, unknown };
}
/* 13.26 · official Republic of Moldova sources (ANCE / MEC). Each item says how far it is verified. Romania's BAC
   (edu.ro, Order 5.211/2026, written exams 14–18 June) is a different exam and is deliberately NOT used here. */
const BAC_OFFICIAL = [
  { t: 'Exam programmes (syllabi) for the 2027 session', v: 'MEC Order no. 2046 of 8 Oct 2026, confirms the programmes approved by Order 1499/2021 stay in force', st: 'official', src: 'https://ance.gov.md/sites/default/files/ordinul_mec_2046_din_08.10.2026_programe_de_examen_sesiunea_27.pdf', note: 'The Romanian and History programmes were downloaded and their topic lists loaded into the topic map (automatic extraction: the PDF stays the authority).' },
  { t: 'Exam timetable 2027', v: 'Annex to MEC Order no. 2051 of 8 Oct 2026, read from the official scan on 19 Nov 2026. All exams start at 09:00: 2 Jun foreign language · 4 Jun Romanian for non-native classes · 8 Jun language of instruction (Romanian) · 11 Jun mother tongue (Ukrainian, Bulgarian, Gagauz) · 15 Jun profile exam (real: Mathematics; humanist: History; arts; sport) · 18 Jun exam of choice', st: 'official', src: 'https://www.ance.gov.md/sites/default/files/ordinul_mec_2051_din_08.10.2026_orar_examene_sesiunea_27.pdf', note: 'The PDF is a scan and was read as an image. Open "Dates & deadlines" for your four subjects and the certificate deadlines.' },
  { t: 'Grade by certificate (English, informatics)', v: 'Written request to the school by 10 April (foreign language, Order 157/2015 as amended by 206/2026) and by 15 April (informatics, Order 1326/2023, Annex 2)', st: 'official-reported', src: 'https://ance.gov.md/content/programe-de-examene', note: 'Not checked: whether YOUR certificates are on the accepted lists. Ask the school before relying on it.' },
  { t: 'Past tests and grading keys (grade 12)', v: 'ANCE archive', st: 'official', src: 'https://ance.gov.md/clasa-sesiunea-examen/clasa-12', note: 'Use these for timed mocks: they are the real format.' }];
const BAC_ST = { official: ['Official', 'ok'], 'official-reported': ['Official, announced', 'ok'], 'located-unread': ['Official document located, not read', 'warn'], secondary: ['Secondary report', 'warn'] };
function bacOfficialHtml() { return `<div class="mc-wl" style="margin-top:12px"><span>Official sources · Republic of Moldova (checked 19 Nov 2026)</span>${BAC_OFFICIAL.map((x) => `<div style="margin:6px 0"><b>${esc(x.t)}</b> <em class="${(BAC_ST[x.st] || ['', ''])[1]}">${esc((BAC_ST[x.st] || [x.st])[0])}</em><br>${esc(x.v)}<br><a href="${esc(x.src)}" target="_blank" rel="noopener">source</a> · <span class="xs muted">${esc(x.note)}</span></div>`).join('')}<div class="xs muted">Romania's 2027 BAC calendar is a different exam and is not used.</div></div>`; }
function bacOpen() {
  const St = bacStats(), tr = bacTrack(), nx = bacNext(), bd = S.settings.bacDate ? daysUntil(S.settings.bacDate) : null, f = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toString());
  openModal(`<h2>BAC board</h2><div class="hint">${bd != null ? `${bd} days to the exam date in Settings. ` : 'Exam date not set in Settings. '}Target average ${Number((S.settings.bac || {}).target) || 8}+.</div>
    <div class="bac-t"><div class="bac-r hd"><span>Subject</span><span>Last</span><span>Avg 3</span><span>Trend</span><span>Target</span><span>Errors</span></div>${St.map((s) => `<div class="bac-r ${s.avg != null && s.avg < s.target ? 'low' : ''}"><span>${esc(s.name)}</span><span>${s.last ? f(Number(s.last.score)) : 'no mock'}</span><span>${f(s.avg)}</span><span>${s.trend == null ? '–' : s.trend > 0 ? '▲ ' + f(s.trend) : s.trend < 0 ? '▼ ' + f(-s.trend) : '='}</span><span>${s.target}</span><span>${s.errs}${s.due ? ` · <b>${s.due} due</b>` : ''}</span></div>`).join('')}</div>
    <div class="bac-line ${tr.known ? (tr.ok ? 'ok' : 'low') : ''}"><span>${tr.known ? (tr.ok ? 'On track, on current evidence' : 'Not on track yet') : 'Cannot tell yet'}</span>${esc(tr.line)}</div>
    ${St.some((s) => s.top) ? `<div class="mc-wl"><span>Errors that keep coming back</span>${St.filter((s) => s.top).map((s) => `<div>${esc(s.name)}: ${esc(s.top)}</div>`).join('')}</div>` : ''}
    ${nx ? `<div class="mc-wl"><span>Study next</span><div><b>${esc(nx.out)}</b></div><div>${esc(nx.why)}</div><div class="xs muted">Done when: ${esc(nx.dod)}</div></div>` : ''}
    <div class="actions" style="flex-wrap:wrap">${St.reduce((a, s) => a + s.due, 0) && typeof lfReview === 'function' ? `<button class="btn primary" onclick="lfReview()">Review due errors</button>` : ''}${typeof bacMapOpen === 'function' ? `<button class="btn" onclick="bacMapOpen()">Topic map</button><button class="btn" onclick="bacFactsOpen()">Dates & deadlines</button>` : ''}${typeof lfTestModal === 'function' ? `<button class="btn" onclick="lfTestModal()">Log a mock</button>` : ''}${typeof lfErrModal === 'function' ? `<button class="btn" onclick="lfErrModal()">Add an error</button>` : ''}<button class="btn" onclick="bacTargetsOpen()">Change targets</button></div>
    ${bacOfficialHtml()}
    <div class="xs muted" style="margin-top:10px">Subjects and targets are the ones in your study setup (Română and Istorie by exam, English and IT by certificate). Your own subject list has not been matched to your profile's exam list yet. Study minutes are a floor, not proof: only mocks and the error log move this board.</div>`, true);
}
(function () {
  setTimeout(() => { try { bacApply(); } catch (e) { } }, 2500);
  const st = document.createElement('style'); st.id = 'bac-css';
  st.textContent = `.bac-t{display:grid;gap:2px;margin:8px 0;font-size:12.5px}.bac-r{display:grid;grid-template-columns:1.6fr .8fr .8fr .8fr .7fr 1.1fr;gap:6px;padding:6px 0;border-bottom:1px solid var(--ln,#222);align-items:center}.bac-r.hd{font:600 10px/1.3 var(--mono,monospace);text-transform:uppercase;color:var(--muted,#999)}.bac-r span:not(:first-child){font-family:var(--mono,monospace)}.bac-r.low span:nth-child(3){color:var(--warn,#e5a50a)}.bac-r b{color:var(--acc,#C9A24A)}
  .bac-line{border-left:3px solid var(--ln,#444);padding:6px 10px;margin:10px 0;font-size:13px;line-height:1.45}.bac-line span{display:block;font:600 11px/1.4 var(--mono,monospace);text-transform:uppercase}.bac-line.ok{border-color:var(--good,#3fb950)}.bac-line.ok span{color:var(--good,#3fb950)}.bac-line.low{border-color:var(--warn,#e5a50a)}.bac-line.low span{color:var(--warn,#e5a50a)}`;
  document.head.appendChild(st);
})();
