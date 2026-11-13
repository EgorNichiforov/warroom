/* War Room v5 · Screen time. Real numbers only: in the Android app they come from Android's usage access
   (the same events Digital Wellbeing counts). The phone writes a compact daily summary into the synced state,
   so the laptop and the Sunday review see it too. Nothing is estimated; with no data the card says so. */
'use strict';

const SCREEN_CATS = { work: ['Work', 'var(--co2,#4fd1a5)'], learn: ['Learning', 'var(--mind,#a98cff)'], comms: ['Messages & calls', '#5aa9ff'], distract: ['Distracting', 'var(--bad,#ff4f5e)'], other: ['Other', '#8a928a'] };
const SCREEN_DEFAULT = [
  [/instagram|tiktok|musically|zhiliaoapp|youtube|facebook|snapchat|twitter|\.x\.android|reddit|netflix|twitch|pinterest|9gag|vk\.|kwai|likee|discord|games?\b|supercell|king\.|roblox|pubg|miniclip|chess\.com|spotify/i, 'distract'],
  [/todoist|calendar|gmail|android\.gm|docs|sheets|drive|slides|chrome|warroom|notion|claude|anthropic|openai|chatgpt|gemini|github|supabase|vercel|zoom|meet|teams|linkedin|openphone|quo|dialpad|aircall|ringcentral|google\.android\.apps\.voice|indeed|canva|sheets/i, 'work'],
  [/anki|duolingo|cambridge|khan|coursera|edx|quizlet|photomath|brilliant|wikipedia|dictionary|translate|cs50|edu/i, 'learn'],
  [/whatsapp|telegram|viber|messag|mms|sms|dialer|phone|contacts|signal|mail/i, 'comms'],
];
function scrCat(pkg, name) { const own = (S.settings.appCats || {})[pkg]; if (own) return own; const s = pkg + ' ' + name; const r = SCREEN_DEFAULT.find(([re]) => re.test(s)); return r ? r[1] : 'other'; }
function scrDay(k) { const o = S.days[k]; return o && o.screen ? o.screen : null; }
function scrMin(ms) { return Math.round((ms || 0) / 60000); }
function hm(min) { min = Math.round(min || 0); return min >= 60 ? `${Math.floor(min / 60)} h ${pad(min % 60)}` : `${min} min`; }
let scrState = { status: 'idle', msg: '' };

/* pull from Android (native app only) and store compact daily summaries */
async function scrPull(silent) {
  if (!WRN) return;
  try {
    const acc = await WRN.usageAccess(); if (!acc.allowed) { scrState.status = 'noaccess'; if (!silent) render(); return; }
    scrState.status = 'busy'; const r = await WRN.usage({ days: 8 });
    (r.days || []).forEach((d) => {
      const k = dk(new Date(d.start)), apps = (d.apps || []).filter((a) => !a.self).map((a) => ({ p: a.pkg, n: a.name, m: scrMin(a.ms) })).filter((a) => a.m > 0).sort((a, b) => b.m - a.m);
      const cats = {}; apps.forEach((a) => { const c = scrCat(a.p, a.n); cats[c] = (cats[c] || 0) + a.m; });
      const o = day(k); o.screen = { t: apps.reduce((s, a) => s + a.m, 0), u: d.unlocks || 0, c: cats, top: apps.slice(0, 12), partial: !!d.partial, at: now() }; o._u = now();
    });
    scrState.status = 'ok'; save(); if (!silent) { render(); toast('Screen time updated'); }
  } catch (e) { scrState.status = String(e.message || e).includes('NO_ACCESS') ? 'noaccess' : 'err'; scrState.msg = String(e.message || e).slice(0, 120); if (!silent) render(); }
}
function scrRecalc() { for (const k in S.days) { const s = S.days[k].screen; if (!s || !s.top) continue; const c = {}; s.top.forEach((a) => { const x = scrCat(a.p, a.n); c[x] = (c[x] || 0) + a.m; }); s.c = c; } }
function scrSetCat(pkg, cat) { S.settings.appCats = Object.assign({}, S.settings.appCats || {}, { [pkg]: cat }); S.settings._u = now(); scrRecalc(); save(true); closeModal(); render(); }
function scrAppModal(pkg, name) {
  const cur = scrCat(pkg, name);
  openModal(`<h2>${esc(name)}</h2><div class="small muted" style="margin:-4px 0 12px">What is this app for you? It decides where its minutes count.</div><div class="chips">${Object.entries(SCREEN_CATS).map(([k, [l]]) => `<span class="chip ${k === cur ? 'on' : ''}" onclick="scrSetCat('${esc(pkg)}','${k}')">${l}</span>`).join('')}</div>`, true);
}
function scrWeek(m) { let t = 0, dist = 0, n = 0; for (let i = 0; i < 7; i++) { const s = scrDay(dk(addDays(m, i))); if (s && !s.partial) { t += s.t; dist += (s.c && s.c.distract) || 0; n++; } } return { avg: n ? t / n : null, dist: n ? dist / n : null, n }; }

function statsScreen() {
  const tk = dk(new Date()), today = scrDay(tk), m = monday(new Date()), w = scrWeek(m), pw = scrWeek(addDays(m, -7));
  const hasAny = Object.keys(S.days).some((k) => S.days[k].screen);
  if (!hasAny) {
    const body = WRN ? (scrState.status === 'noaccess' || scrState.status === 'idle'
      ? `<div class="small" style="margin-bottom:10px">Android keeps exact screen-time numbers (the same ones Digital Wellbeing shows). Give War Room <b>Usage access</b> once and they appear here every day, per app.</div><button class="btn primary block" onclick="WRN.openUsageSettings()">Allow usage access</button><div class="xs muted" style="margin-top:8px">In the list, tap <b>War Room</b> → turn on <b>Permit usage access</b>, then come back. Nothing leaves your phone except daily totals per app.</div><button class="btn block" style="margin-top:8px" onclick="scrPull(false)">I allowed it · load now</button>`
      : `<div class="small muted">${scrState.status === 'err' ? 'Could not read usage: ' + esc(scrState.msg) : 'Loading…'}</div>`)
      : `<div class="small">Screen time comes from Android itself, so it is read by the <b>War Room Android app</b> on your phone. Once the app has usage access, your daily numbers sync here.</div>`;
    return `<div class="card w3"><div class="card-h"><div class="card-t">Screen time</div><div class="card-r">from your phone</div></div>${body}</div>`;
  }
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13)).map((d) => { const k = dk(d), s = scrDay(k); return { l: DAY_SHORT[dow(d)][0], v: s ? s.t : 0, cls: s && s.c && s.c.distract > 60 ? 'bad' : '', top: s && s.t ? (s.t >= 60 ? (s.t / 60).toFixed(1) + 'h' : s.t + 'm') : '', today: k === tk, tip: s ? `${fmtShort(d)}: ${hm(s.t)}` : '' }; });
  const delta = w.avg != null && pw.avg != null && pw.avg > 0 ? Math.round(((w.avg - pw.avg) / pw.avg) * 100) : null;
  const top = today && today.top ? today.top.slice(0, 8) : [], mx = Math.max(1, ...top.map((a) => a.m));
  const cats = today && today.c ? Object.entries(today.c).sort((a, b) => b[1] - a[1]) : [];
  return `<div class="card w3"><div class="card-h"><div class="card-t">Screen time</div><div class="card-r">${WRN ? `<a href="#" onclick="scrPull(false);return false">refresh</a>` : 'from your phone'}</div></div>
    <div class="statline"><div><div class="sub-n">${today ? hm(today.t) : '—'}</div><div class="l">today${today && today.u ? ' · ' + today.u + ' unlocks' : ''}</div></div><div><div class="sub-n ${today && today.c && today.c.distract > 60 ? 'bad' : ''}">${today && today.c ? hm(today.c.distract || 0) : '—'}</div><div class="l">distracting today</div></div><div><div class="sub-n">${w.avg != null ? hm(w.avg) : '—'}</div><div class="l">daily avg this week${delta != null ? ` · <span class="${delta > 0 ? 'bad' : 'ok'}">${delta > 0 ? '+' : ''}${delta}% vs last</span>` : ''}</div></div><div><div class="sub-n">${w.dist != null ? hm(w.dist) : '—'}</div><div class="l">distracting / day this week${pw.dist != null ? ' · last ' + hm(pw.dist) : ''}</div></div></div>
    ${vbars(days, { h: 130 })}
    ${cats.length ? `<div class="scr-cats">${cats.map(([c, v]) => `<span><i style="background:${SCREEN_CATS[c][1]}"></i>${SCREEN_CATS[c][0]} <b>${hm(v)}</b></span>`).join('')}</div>` : ''}
    ${top.length ? `<div class="sec-h" style="margin-top:12px">Apps today · tap to set what it counts as</div>${top.map((a) => { const c = scrCat(a.p, a.n); return `<div class="scr-app" onclick="scrAppModal('${esc(a.p)}','${esc(a.n).replace(/'/g, '&#39;')}')"><span class="n">${esc(a.n)}</span><span class="bar"><i style="width:${(a.m / mx) * 100}%;background:${SCREEN_CATS[c][1]}"></i></span><span class="v">${hm(a.m)}</span></div>`; }).join('')}` : ''}
    <div class="xs muted" style="margin-top:8px">Work, learning and messages are shown apart and never count as distraction. Times are from Android; War Room itself is left out.</div></div>`;
}
/* one line for the weekly report */
function screenWeekLine(m) { const w = scrWeek(m), pw = scrWeek(addDays(m, -7)); if (w.avg == null) return ''; return `Screen ${hm(w.avg)}/day${pw.avg != null ? ` (${w.avg >= pw.avg ? '+' : '−'}${hm(Math.abs(w.avg - pw.avg))} vs last week)` : ''} · distracting ${hm(w.dist)}/day`; }
