/* War Room — Egor's daily command center. Vanilla JS, offline-first, optional Supabase sync. */
'use strict';
const APP_VERSION = '2.0.0';
const STORE = 'warroom2';
const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LONG = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL = [1, 2, 3, 4, 5, 6, 7], WK = [1, 2, 3, 4, 5];

/* ───────── helpers ───────── */
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 8) + now().toString(36).slice(-4);
function dk(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function pd(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function dow(d) { const x = d.getDay(); return x === 0 ? 7 : x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function monday(d) { return addDays(d, -(dow(d) - 1)); }
function weekKey(d) { return 'w' + dk(monday(d)); }
function tmin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(d) { return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); }
function fmtShort(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function daysUntil(k) { const a = new Date(); a.setHours(0, 0, 0, 0); return Math.ceil((pd(k) - a) / 864e5); }
function isToday(d) { return dk(d) === dk(new Date()); }
function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function fmt(n, dp = 0) { return n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: dp }); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
let toastTimer = null;
function toast(msg, action, fn) {
  const t = $('toast'); t.innerHTML = esc(msg) + (action ? `<button id="toast-act">${esc(action)}</button>` : '');
  if (action) $('toast-act').onclick = () => { fn(); t.classList.remove('show'); };
  t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), action ? 8000 : 2200);
}

/* ───────── seed data (from Egor's Google Calendar, Nov 2026) ───────── */
function seed() {
  const t = now();
  const B = (title, start, end, days, kind, note) => ({ id: uid(), title, start, end, days, kind, note: note || '' });
  const school = (day, list) => list.map(([s, e, n]) => B(n, s, e, [day], 'school'));
  const P = ['08:15', '09:10', '10:10', '11:10', '12:10', '13:25', '14:15'], PE = ['09:00', '09:55', '10:55', '11:55', '12:55', '14:10', '15:00'];
  const per = (day, names) => names.map((n, i) => B(`${i + 1}. ${n}`, P[i], PE[i], [day], 'school'));
  const blocks = [
    B('⚖️ Weigh-in + teeth', '05:20', '05:30', ALL, 'routine', 'Toilet → scale (before food and water) → write it here → teeth, water, dressed.'),
    B('🏋️ Train: Upper A, pull + push', '05:30', '06:00', [1], 'train'),
    B('🏋️ Train: Core + prehab (light)', '05:30', '06:00', [2], 'train'),
    B('🏋️ Train: Upper B, pull + shoulders', '05:30', '06:00', [3], 'train'),
    B('🏋️ Train: Leg accessories (no jumps)', '05:30', '06:00', [4], 'train'),
    B('🏋️ Train: Arms + tennis prehab (light)', '05:30', '06:00', [5], 'train'),
    B('🏋️ Train: Upper C + hamstrings + core', '05:30', '06:10', [6], 'train'),
    B('🏋️ Train: Recovery mobility', '05:30', '06:00', [7], 'train'),
    B('Shower', '06:00', '06:15', WK, 'routine'), B('Shower', '06:10', '06:25', [6], 'routine'),
    B('📚 BAC: Anki + Română / Python (CS50P)', '06:15', '07:30', [1], 'bac', '25 min Anki, then 50 min on the week\'s topic.'),
    B('📚 BAC: Anki + Istorie', '06:15', '07:30', [2, 4], 'bac', '25 min Anki, then History topics (fișe).'),
    B('📚 BAC: Anki + Română', '06:15', '07:30', [3], 'bac'),
    B('📚 BAC: Anki + materia slabă', '06:15', '07:30', [5], 'bac', '25 min Anki, then the weakest subject.'),
    B('📚 BAC: test complet (cronometrat)', '06:25', '08:15', [6], 'bac', 'Un test BAC ANCE cronometrat, alternativ Română / Istorie.'),
    B('📚 BAC: corectare + caiet de greșeli + plan', '06:00', '09:00', [7], 'bac', 'Correct Saturday\'s test, error notebook, plan the week. Breakfast break 07:15.'),
    B('Breakfast', '07:30', '07:50', WK, 'food', '3 eggs · 100 g oats in 300 ml milk · banana · nuts.'),
    B('Breakfast', '08:15', '08:35', [6], 'food'),
    B('☀️ Sunlight: 10 min outside', '07:50', '08:00', WK, 'routine'),
    B('🚗 Spre școală', '08:00', '08:15', WK, 'travel'),
    ...per(1, ['Informatică', 'Română', 'Română', 'Educație pentru societate', 'Educație fizică', 'Fizică', 'Fizică']),
    ...per(2, ['Educația stilului de viață', 'Istorie', 'Matematică', 'Matematică', 'Engleză', 'Literatură universală', 'Consultație Română']),
    ...per(3, ['Geografie', 'Educație fizică', 'Istorie', 'Română', 'Română', 'Istorie', 'Consultație Istorie']),
    ...per(4, ['Germană', 'Chimie', 'Engleză', 'Matematică', 'Biologie']),
    ...per(5, ['Consultație Geografie', 'Dezvoltare personală', 'Literatură universală', 'Română']),
    B('Lunch (packed box)', '12:55', '13:15', [1, 2, 3, 6, 7], 'food'),
    B('🚗 Școală → acasă', '12:55', '13:10', [4], 'travel'), B('🚗 Școală → acasă', '11:55', '12:10', [5], 'travel'),
    B('📚 BAC: certificate IT (Python)', '13:15', '14:45', [4], 'bac', 'CS50P lecture of the week + practice. Exam Dec 14–18.'),
    B('📚 BAC: engleză Cambridge', '12:15', '13:45', [5], 'bac', 'Reading + Writing first (each needs 160+).'),
    B('Agency deep work', '13:45', '14:45', [5], 'agency', 'Phone away. Today\'s @deep agency task.'),
    B('Agency deep work', '13:45', '15:00', [6], 'agency'),
    B('Agency deep work', '13:45', '15:45', [7], 'agency', 'Planul săptămânii la agenție + @deep task.'),
    B('🚗 → tenis', '15:00', '15:30', [1, 2, 3, 5], 'travel'),
    B('OFP (team conditioning)', '15:30', '16:30', [1, 3, 5], 'tennis', 'Mon: leg strength · Wed: agility + speed · Fri: speed + strength.'),
    B('TT (own tennis training)', '16:30', '18:00', [1, 3, 5], 'tennis'),
    B('📞 DIALS: 10', '15:30', '15:55', [2], 'dials'),
    B('📞 DIALS: 45', '17:00', '18:55', [2], 'dials', 'Florida ~10:00. Script: CALL SCRIPT v3. Log every dial + owner conversation.'),
    B('📞 DIALS: 20', '18:00', '18:45', [1, 3], 'dials', 'Right after TT, before Green. Florida ~11:00.'),
    B('📞 DIALS: 70 (power day)', '15:00', '18:20', [4], 'dials', 'At home. CALL SCRIPT v3. Log every dial + every owner conversation.'),
    B('📞 DIALS: 45', '18:30', '20:30', [5], 'dials', 'At home after TT. Florida ~11:30.'),
    B('Dinner (packed)', '18:45', '19:00', [1, 3], 'food'), B('Dinner (packed)', '18:30', '18:45', [2, 4, 5, 6, 7], 'food'),
    B('🚗 Acasă → tenis (lecție)', '18:30', '19:00', [4], 'travel'),
    B('🟢 Grupa Green (lesson)', '19:00', '20:00', [1, 3], 'tennis', 'Prezență ✅/❌ lângă fiecare nume.'),
    B('🔴 Grupa Red (lesson)', '18:00', '19:00', [2], 'tennis'),
    B('🟠 Grupa Orange (lesson)', '19:00', '20:00', [2, 4], 'tennis'),
    B('🚗 Tenis → acasă', '20:00', '20:30', [1, 2, 3, 4], 'travel'), B('🚗 Tenis → acasă', '18:00', '18:30', [5], 'travel'),
    B('📞 DIALS: 5', '20:30', '20:45', [1], 'dials'), B('📞 DIALS: 10', '20:30', '20:45', [3], 'dials', 'Wednesday is the light day.'),
    B('🧑‍⚕️ Applicant calls + bench sheet', '20:30', '20:45', [2, 4], 'agency', 'Call back every new applicant. Fill Source column.'),
    B('🚗 Acasă → tenis', '08:35', '09:00', [6], 'travel'), B('🎾 Tennis lessons (Sat groups)', '09:00', '10:00', [6], 'tennis'), B('🚗 Tenis → acasă', '10:00', '10:30', [6], 'travel'),
    B('🧑‍⚕️ Applicants + Bench Bulletin + ads check', '15:00', '17:00', [6], 'agency', 'Florida Saturday morning: call back applicants, update Bench sheet, Monday Bulletin, ads.'),
    B('📚 BAC: corectare test + Cambridge/IT', '17:00', '18:30', [6], 'bac'),
    B('📞 EgorFlow prep: call queue + job boards', '09:15', '10:45', [7], 'agency', '225 numbers loaded for the week (Mon 25 · Tue 55 · Wed 30 · Thu 70 · Fri 45).'),
    B('📊 Weekly review', '11:00', '11:30', [7], 'routine', 'Numbers for the week → More → Weekly review. Pick ONE change.'),
    B('🚶 Zone 2 walk + sunlight', '11:30', '12:15', [7], 'train'),
    B('📚 Python sprint (until the exam)', '13:15', '13:45', [7], 'bac'),
    B('🍳 Meal prep for the week', '16:15', '17:45', [7], 'food'),
    B('Free: family / rest', '17:45', '18:30', [7], 'routine', 'Earned. No short videos.'),
    B('🌙 Shutdown: log the day + magnesium + phone out', '20:45', '21:00', ALL, 'routine', 'Tick habits, write dials, owner conversations, BAC minutes, money. Magnesium. Phone out of the bedroom.'),
    B('😴 Sleep', '21:00', '24:00', ALL, 'sleep', '21:00 → 05:20. Sleep is #1 in the cut order.'),
  ];
  const ex = (n, s, r, note) => ({ n, s, r, note: note || '' });
  const programs = {
    upperA: { _u: t, name: 'Upper A · pull + push', note: 'Warm-up 5 min: foam roll upper back + lats · jumping jacks 30 s · world\'s greatest stretch ×3/side · band pull-aparts 15 · scap pull-ups 8 · pogo hops 10. Stop 1–2 reps before failure. Bad day: warm-up + A1/A2 only.', ex: [
      ex('A1 Pull-ups', 4, '5–10', 'Full hang, chest to bar. Harder: backpack with dumbbells.'), ex('A2 Dips', 4, '6–12', 'Lean forward a little, shoulder depth. Rest 90 s after the pair.'),
      ex('B1 One-arm DB row', 3, '10–15 /side', '10 kg, hand on chair. 3 s down, 1 s pause at top.'), ex('B2 Feet-up push-ups', 3, '8–15', '3 s down, body in one line. Rest 60 s after the pair.'),
      ex('C1 Band external rotation', 2, '15–20 /arm', 'Elbow at side, slow.'), ex('C2 Hanging knee raises', 2, '10–15', 'No swinging. Rest 45 s.'),
    ] },
    core: { _u: t, name: 'Core + prehab (light)', note: '25 min, LIGHT. Legs recover from OFP: no jumps, no squats. Warm-up: foam roll quads/calves/upper back 2 min · WGS ×3 · pull-aparts 15 · cat-cow ×8.', ex: [
      ex('A1 Side plank', 3, '30–45 s /side', 'Hips high.'), ex('A2 Dead bug', 3, '8 /side', 'Low back pressed to the floor, slow.'),
      ex('B1 Band Pallof press', 3, '10 /side', 'Anti-rotation = stronger forehand/backhand.'), ex('B2 Prone Y-T-W raises', 2, '8 each', 'Thumbs up, squeeze shoulder blades.'),
      ex('C Band external rotation', 2, '15–20 /arm'), ex('D Mobility block', 1, '6 min', 'Couch stretch 45 s/side · 90/90 hips 45 s/side · ankle rocks 10/side · wrists 1 min.'),
    ] },
    upperB: { _u: t, name: 'Upper B · pull + shoulders', note: 'OFP agility + TT this afternoon: keep legs fresh. Harder when at the top of the range: backpack, higher feet, archer push-ups, partials.', ex: [
      ex('A1 Chin-ups (3 s down)', 4, '5–10', 'Palms facing you.'), ex('A2 Pike push-ups, feet up', 4, '6–12', 'Head in front of the hands.'),
      ex('B1 Deficit push-ups', 3, '8–15', 'Hands on dumbbells, deep stretch.'), ex('B2 Rear-delt fly', 3, '15–20', 'Light dumbbells, thumbs up.'),
      ex('C1 Lateral raises', 3, '12–20', 'Strict.'), ex('C2 Wrist curls + reverse + rotations', 2, '15 each', 'Forearm/elbow insurance for tennis.'),
    ] },
    legs: { _u: t, name: 'Leg accessories (no jumps)', note: '25–30 min, MODERATE. No jumps, no Nordics (Friday is OFP speed). Stop 2–3 reps before failure. Warm-up: foam roll quads/calves/glutes · WGS ×3 · 10 squats · ankle rocks.', ex: [
      ex('A1 Single-leg RDL', 3, '8–12 /side', '1 dumbbell, opposite hand. Hips square, 3 s down.'), ex('A2 Copenhagen plank', 3, '20–30 s /side', 'Knee on sofa or chair.'),
      ex('B1 Single-leg calf raise', 3, '12–20 /side', 'On a step, dumbbell in hand. Full stretch, pause at top.'), ex('B2 Tibialis raise', 2, '15–25', 'Back on wall, toes up hard.'),
      ex('C1 DB woodchop high→low', 3, '10 /side', 'Turn from the hips: forehand + backhand.'), ex('C2 Band lateral walk', 2, '12 steps /side', 'Band above knees.'),
    ] },
    arms: { _u: t, name: 'Arms + tennis prehab (light)', note: '25 min, LIGHT (OFP + TT this afternoon). Warm-up 4 min: foam roll upper back · jumping jacks · WGS · pull-aparts · scap pull-ups.', ex: [
      ex('A1 DB curls (3 s down)', 3, '10–15', 'No swinging.'), ex('A2 Overhead triceps extension', 3, '10–15', '1 dumbbell, both hands, elbows in.'),
      ex('B1 Lateral raises', 3, '15–20'), ex('C1 90/90 external rotation', 2, '12 /arm', 'Elbow at shoulder height, slow.'), ex('C2 Dead hang', 2, '30–60 s', 'Grip + shoulder health.'),
    ] },
    upperC: { _u: t, name: 'Upper C + hamstrings + core (40 min)', note: 'Shower right after (06:10). No jumps or sprints. A hard match or drilling session replaces this. Every 4 weeks: tests after the warm-up (next Nov 28).', ex: [
      ex('A1 Pull-ups, best quality', 4, '5–8', 'Pause chin over bar, 3 s down.'), ex('A2 Dips (3 s down)', 4, '8–12'),
      ex('B1 Nordic curl lowering', 3, '3–6', 'Feet under the sofa. As slow as you can.'), ex('B2 One-arm DB row', 3, '12–15 /side', 'Pause 1 s at top.'),
      ex('C1 DB swing', 3, '15', 'Hips snap, arms only guide.'), ex('C2 T push-ups', 3, '8 /side', 'Hands on dumbbells, hips turn with the chest.'),
      ex('D Knee raises 10 + Pallof 10/side', 2, 'rounds', 'Rest 45 s.'),
    ] },
    recovery: { _u: t, name: 'Recovery mobility', note: 'Easy day. The zone 2 part is the 11:30 walk. Nose breathing, full sentences.', ex: [
      ex('Easy walk / bike / jog', 1, '20 min', 'Outside if possible, counts as morning light.'), ex('Foam roll', 1, '4 min', 'Quads, calves, glutes, upper back.'),
      ex('Couch stretch', 1, '60 s /side'), ex('Sleeper stretch', 1, '45 s /side'), ex('Thoracic open book', 1, '5 /side'), ex('Dead hang', 1, '60 s'), ex('Massage gun', 1, '1–2 min', 'Whatever is tight from the week.'),
    ] },
  };
  const R = (id, title, days, link) => ({ id, title, days, link: link || '' });
  const G = (title, horizon, target, unit, deadline, source, extra) => Object.assign({ id: uid(), _u: t, title, horizon, target, unit, deadline: deadline || '', source: source || 'manual', current: null, done: false }, extra || {});
  const goals = {};
  [
    G('EgorFlow MRR', 'long', 20000, '$', '2027-07-01'), G('Priority Bench clients', 'long', 8, 'clients', '2027-07-01'), G('Multi-site clients', 'long', 3, 'clients', '2027-07-01'),
    G('Owner conversations (before any new idea)', 'long', 100, 'convos', '', 'counter:owners'), G('Body weight', 'long', 85, 'kg', '2027-07-01', 'weight'),
    G('BAC average 9+ (Română, Istorie by exam; English + IT certificates)', 'long', 9, 'avg', '2027-06-30'),
    G('Weight 77 kg by end of November', 'month', 77, 'kg', '2026-11-30', 'weight'), G('Book the Python ITS exam (UTM, Dec 14–18)', 'month', 1, '', '2026-11-15', 'check'),
    G('Python ITS exam: 700/1000', 'month', 700, 'pts', '2026-12-18'),
    G('225 dials', 'week', 225, 'dials', '', 'counter:dials:week'), G('20 h BAC study', 'week', 1200, 'min', '', 'counter:bac:week'), G('6 training days', 'week', 6, 'days', '', 'workouts:week'),
  ].forEach((g) => (goals[g.id] = g));
  return {
    v: 1,
    settings: { _u: t, name: 'Egor', wake: '05:20', bed: '21:00', weightTarget: 85, weightTargetDate: '2027-07-01', bacDate: '2027-06-01', bigDate: '2027-07-01', bigLabel: 'July 1, 2027 · $20k MRR', currency: 'MDL',
      sync: { url: 'https://lajechvmsrmrmfcluhkr.supabase.co', key: 'sb_publishable_E_GGwWPOvnvV_PZDPu95Vg_0_9iqRmE', code: '' } },
    routines: { _u: t,
      morning: [R('weigh', '⚖️ Weigh in (before food and water)', ALL, 'weight'), R('train', '🏋️ Train', ALL, 'train'), R('shower', '🚿 Shower', ALL), R('bac', '📚 BAC study block', ALL), R('eat', '🍳 Breakfast', ALL), R('sun', '☀️ 10 min sunlight outside', ALL), R('pack', '🎒 Pack: lunch box + packed dinner + 1 L water', WK), R('go', '🚗 Leave for school 08:00', WK)],
      evening: [R('dials', '📞 Dials + owner conversations logged', WK), R('bacmin', '📚 BAC minutes logged', ALL), R('tomorrow', '📅 Tomorrow checked: first action is 05:30 train', ALL), R('mag', '💊 Magnesium + water', ALL), R('phone', '📵 Phone charging outside the bedroom', ALL), R('bed', '😴 In bed by 21:00', ALL)] },
    habits: { _u: t, items: [{ id: 'meal', title: '🥗 Ate the plan' }, { id: 'water', title: '💧 2 L+ water' }, { id: 'noshorts', title: '🚫 No short videos' }, { id: 'screens', title: '📴 Screens off 20:45' }, { id: 'read', title: '📖 Read 10 min' }, { id: 'word', title: '🤝 Kept my word today' }] },
    counters: { _u: t, items: [
      { id: 'dials', title: 'Dials', unit: '', targets: [0, 25, 55, 30, 70, 45, 0, 0], weekly: 225, steps: [1, 5, 10], color: 'red' },
      { id: 'owners', title: 'Owner conversations', unit: '', targets: [0, 0, 0, 0, 0, 0, 0, 0], weekly: 0, steps: [1], color: 'amber' },
      { id: 'bac', title: 'BAC study', unit: 'min', targets: [0, 75, 75, 75, 165, 165, 200, 230], weekly: 1200, steps: [15, 25, 50], color: 'blue' },
      { id: 'applicants', title: 'Applicant calls', unit: '', targets: [0, 0, 0, 0, 0, 0, 0, 0], weekly: 0, steps: [1], color: 'green' },
    ] },
    schedule: { _u: t, blocks },
    programs, programByDay: { _u: t, map: { 1: 'upperA', 2: 'core', 3: 'upperB', 4: 'legs', 5: 'arms', 6: 'upperC', 7: 'recovery' } },
    days: {}, tasks: {}, goals, reviews: {},
  };
}

/* ───────── state ───────── */
let S = null;
function load() {
  try { const raw = localStorage.getItem(STORE); if (raw) S = JSON.parse(raw); } catch (e) { console.error(e); }
  if (!S || !S.settings) S = seed();
  const d = seed();
  for (const k of Object.keys(d)) if (S[k] === undefined) S[k] = d[k];
  if (!S.settings.sync) S.settings.sync = d.settings.sync;
}
let saveTimer = null;
function save(immediate) {
  clearTimeout(saveTimer);
  const run = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { console.error('storage', e); toast('Storage full or blocked'); } schedulePush(); };
  if (immediate) run(); else saveTimer = setTimeout(run, 250);
}
function day(d) { const k = typeof d === 'string' ? d : dk(d); if (!S.days[k]) S.days[k] = { _u: 0, routine: {}, habits: {}, counters: {}, top3: [{ t: '', d: 0 }, { t: '', d: 0 }, { t: '', d: 0 }] }; const o = S.days[k]; if (!o.routine) o.routine = {}; if (!o.habits) o.habits = {}; if (!o.counters) o.counters = {}; if (!o.top3) o.top3 = [{ t: '', d: 0 }, { t: '', d: 0 }, { t: '', d: 0 }]; return o; }
function touch(o) { o._u = now(); save(); }

/* ───────── derived ───────── */
function weightEntries() { return Object.keys(S.days).filter((k) => S.days[k].weight != null && S.days[k].weight !== '').sort().map((k) => ({ k, w: Number(S.days[k].weight) })); }
function latestWeight(beforeKey) { const e = weightEntries().filter((x) => !beforeKey || x.k < beforeKey); return e.length ? e[e.length - 1] : null; }
function avgWeight(days, endKey) { const end = endKey || dk(new Date()); const start = dk(addDays(pd(end), -(days - 1))); const e = weightEntries().filter((x) => x.k >= start && x.k <= end); if (!e.length) return null; return e.reduce((a, b) => a + b.w, 0) / e.length; }
function counterWeek(id, d) { const m = monday(d); let s = 0; for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(m, i))]; if (o && o.counters && o.counters[id]) s += Number(o.counters[id]) || 0; } return s; }
function counterTotal(id) { let s = 0; for (const k in S.days) { const o = S.days[k]; if (o.counters && o.counters[id]) s += Number(o.counters[id]) || 0; } return s; }
function workoutsWeek(d) { const m = monday(d); let n = 0; for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(m, i))]; if (o && o.workout && o.workout.done) n++; } return n; }
function routineFor(list, d) { const w = dow(d); return list.filter((r) => !r.days || r.days.includes(w)); }
function blocksFor(d) { const w = dow(d); return S.schedule.blocks.filter((b) => b.days.includes(w)).sort((a, b) => tmin(a.start) - tmin(b.start) || tmin(a.end) - tmin(b.end)); }
function dayScore(d) {
  const o = S.days[dk(d)] || { routine: {}, habits: {}, counters: {}, top3: [] };
  let tot = 0, done = 0;
  routineFor(S.routines.morning, d).concat(routineFor(S.routines.evening, d)).forEach((r) => { tot++; if (o.routine && o.routine[r.id]) done++; });
  S.habits.items.forEach((h) => { tot++; if (o.habits && o.habits[h.id]) done++; });
  S.counters.items.forEach((c) => { const tg = c.targets[dow(d)] || 0; if (tg > 0) { tot++; if ((Number(o.counters && o.counters[c.id]) || 0) >= tg) done++; } });
  (o.top3 || []).forEach((x) => { if (x.t) { tot++; if (x.d) done++; } });
  return tot ? Math.round((done / tot) * 100) : 0;
}
function tasksList() { return Object.values(S.tasks).filter((t) => !t._del); }

/* ───────── navigation ───────── */
let view = 'today', curDate = new Date(); curDate.setHours(0, 0, 0, 0);
const NAV = [['today', '☀︎', 'Today'], ['plan', '▤', 'Plan'], ['tasks', '☑', 'Tasks'], ['train', '◈', 'Train'], ['goals', '◎', 'Goals']];
function show(v) { view = v; closeModal(); render(); window.scrollTo(0, 0); }
function shiftDay(n) { curDate = addDays(curDate, n); render(); }
function goToday() { curDate = new Date(); curDate.setHours(0, 0, 0, 0); render(); }
function renderNav() { $('nav').innerHTML = NAV.map(([v, ic, l]) => `<button class="${view === v ? 'on' : ''}" onclick="show('${v}')"><span class="ic">${ic}</span>${l}</button>`).join(''); }
function renderTop() {
  const titles = { today: 'Today', plan: 'Plan', tasks: 'Tasks', train: 'Train', goals: 'Goals', more: 'More' };
  $('top-title').textContent = titles[view];
  const sub = $('top-sub');
  if (view === 'today' || view === 'train') sub.textContent = fmtDate(curDate) + (isToday(curDate) ? '' : ' · not today');
  else if (view === 'plan') sub.textContent = 'Week of ' + fmtShort(monday(curDate));
  else if (view === 'tasks') { const n = tasksList().filter((t) => !t.done && t.due && t.due <= dk(new Date())).length; sub.textContent = n ? n + ' due today or overdue' : 'Nothing overdue'; }
  else if (view === 'goals') sub.textContent = daysUntil(S.settings.bigDate) + ' days to ' + S.settings.bigLabel.split('·')[0].trim();
  else sub.textContent = 'v' + APP_VERSION;
  const nav = (view === 'today' || view === 'train' || view === 'plan') ? `<div class="datenav"><button onclick="shiftDay(-1)">‹</button><div class="cur" onclick="goToday()">${isToday(curDate) ? 'Today' : fmtShort(curDate)}<small>${DAY_SHORT[dow(curDate)]}</small></div><button onclick="shiftDay(1)">›</button></div>` : '';
  $('top-right').innerHTML = nav + `<button class="iconbtn ${syncState.status === 'ok' ? 'on' : ''}" onclick="show('more')" title="More" aria-label="More">${syncIcon()}</button>`;
}
function render() { renderNav(); renderTop(); document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + view)); ({ today: renderToday, plan: renderPlan, tasks: renderTasks, train: renderTrain, goals: renderGoals, more: renderMore })[view](); }

/* ───────── TODAY ───────── */
function renderToday() {
  const d = curDate, k = dk(d), o = day(k), w = dow(d), today = isToday(d), nm = nowMin();
  const last = latestWeight(k), avg7 = avgWeight(7, k), prev7 = avgWeight(7, dk(addDays(d, -7)));
  let html = '';
  // Weigh-in
  if (o.weight == null || o.weight === '' || o.weighEdit) {
    const start = o.weight != null && o.weight !== '' ? o.weight : (last ? last.w : 75);
    html += `<div class="card ac"><div class="card-h"><div class="card-t">⚖️ Morning weigh-in</div><div class="card-r">${last ? `last: <b>${fmt(last.w, 1)}</b> kg · ${fmtShort(pd(last.k))}` : 'first entry'}</div></div>
      <div class="weigh-big"><button class="stepbtn" onclick="stepWeight(-0.1)">−</button><input id="w-inp" type="number" inputmode="decimal" step="0.1" value="${Number(start).toFixed(1)}" onkeydown="if(event.key==='Enter')saveWeight()"><span class="unit">kg</span><button class="stepbtn" onclick="stepWeight(0.1)">+</button></div>
      <div class="weigh-stats"><span>7-day avg <b>${avg7 ? fmt(avg7, 1) : '—'}</b></span><span>target <b>${S.settings.weightTarget}</b> kg</span><span>to go <b>${avg7 ? fmt(S.settings.weightTarget - avg7, 1) : (last ? fmt(S.settings.weightTarget - last.w, 1) : '—')}</b> kg</span></div>
      <div class="row"><button class="btn primary grow" onclick="saveWeight()">Save weight</button>${o.weighEdit ? `<button class="btn ghost" onclick="cancelWeight()">Cancel</button>` : `<button class="btn ghost" onclick="skipWeight()">Skip</button>`}</div></div>`;
  } else {
    const diff = avg7 && prev7 ? avg7 - prev7 : null;
    html += `<div class="card" onclick="editWeight()" style="cursor:pointer"><div class="weigh-compact"><div class="val">${fmt(o.weight, 1)}<small>kg</small></div><div class="grow small muted">7-day avg <b class="acc">${avg7 ? fmt(avg7, 1) : '—'}</b>${diff != null ? ` · <span class="${diff >= 0 ? 'green' : 'red'}">${diff >= 0 ? '+' : ''}${fmt(diff, 1)}</span> vs last week` : ''}<br>${fmt(S.settings.weightTarget - (avg7 || o.weight), 1)} kg to ${S.settings.weightTarget} · judge by the weekly average</div><div class="dim">✎</div></div></div>`;
  }
  // Now / next
  if (today) {
    const bl = blocksFor(d); const cur = bl.filter((b) => tmin(b.start) <= nm && nm < tmin(b.end)); const next = bl.find((b) => tmin(b.start) > nm);
    const wake = tmin(S.settings.wake), bed = tmin(S.settings.bed); const pct = clamp(((nm - wake) / (bed - wake)) * 100, 0, 100);
    html += `<div class="card"><div class="card-h"><div class="card-t">Now</div><div class="card-r mono">${pad(Math.floor(nm / 60))}:${pad(nm % 60)}</div></div>
      ${cur.length ? cur.map((b) => `<div class="now-cur"><span class="tag ${b.kind}" style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:8px"></span>${esc(b.title)}</div><div class="now-time">${b.start}–${b.end}${b.note ? ' · ' + esc(b.note) : ''}</div>`).join('') : `<div class="now-cur muted">Nothing scheduled</div>`}
      ${next ? `<div class="now-next">Next <b>${esc(next.title)}</b> at ${next.start} <span class="muted">(in ${tmin(next.start) - nm} min)</span></div>` : ''}
      <div class="bar" style="margin-top:10px"><i style="width:${pct}%"></i></div><div class="row sb xs dim" style="margin-top:4px"><span>${S.settings.wake} wake</span><span>${Math.round(pct)}% of the day</span><span>${S.settings.bed} bed</span></div></div>`;
  }
  // Routine
  const rt = (list, title, open) => { const items = routineFor(list, d); if (!items.length) return ''; const done = items.filter((r) => o.routine[r.id]).length; let curIdx = items.findIndex((r) => !o.routine[r.id]);
    return `<div class="card"><div class="card-h" onclick="toggleSec('${title}')" style="cursor:pointer"><div class="card-t">${title} routine</div><div class="card-r"><b>${done}</b>/${items.length} ${done === items.length ? '✓' : ''}</div></div><div id="sec-${title}" class="${open ? '' : 'hidden'}">${items.map((r, i) => `<div class="ck ${o.routine[r.id] ? 'on' : ''} ${i === curIdx && today ? 'cur' : ''}" onclick="toggleRoutine('${r.id}')"><div class="box">${o.routine[r.id] ? '✓' : ''}</div><div class="lbl">${esc(r.title)}</div></div>`).join('')}</div></div>`; };
  const morningDone = routineFor(S.routines.morning, d).every((r) => o.routine[r.id]);
  html += rt(S.routines.morning, 'morning', secOpen.morning != null ? secOpen.morning : (!today || nm < 15 * 60 || !morningDone));
  html += rt(S.routines.evening, 'evening', secOpen.evening != null ? secOpen.evening : (!today || nm >= 15 * 60));
  // Counters
  const cs = S.counters.items.filter((c) => (c.targets[w] || 0) > 0 || (o.counters[c.id] || 0) > 0 || c.weekly > 0 || c.id === 'owners');
  if (cs.length) html += `<div class="card"><div class="card-h"><div class="card-t">Scoreboard</div><div class="card-r">week of ${fmtShort(monday(d))}</div></div>${cs.map((c) => { const v = Number(o.counters[c.id]) || 0, tg = c.targets[w] || 0, wk = counterWeek(c.id, d), tot = counterTotal(c.id);
    return `<div class="counter"><div class="top"><div class="name">${esc(c.title)}</div><div class="num">${v}${tg ? `<small> / ${tg}${c.unit ? ' ' + c.unit : ''}</small>` : (c.unit ? `<small> ${c.unit}</small>` : '')}</div></div>
      ${tg ? `<div class="bar"><i class="${c.color || ''}" style="width:${clamp((v / tg) * 100, 0, 100)}%"></i></div>` : ''}
      <div class="btns">${c.steps.map((s) => `<button class="btn" onclick="bump('${c.id}',${s})">+${s}</button>`).join('')}<button class="btn" onclick="bump('${c.id}',-${c.steps[0]})">−${c.steps[0]}</button><button class="btn" onclick="setCounter('${c.id}')">=</button></div>
      <div class="wk">${c.weekly ? `<span>week <b>${wk}</b> / ${c.weekly}${c.unit ? ' ' + c.unit : ''} ${wk >= c.weekly ? '✓' : `· ${c.weekly - wk} left`}</span>` : `<span>week <b>${wk}</b></span>`}<span>all time <b>${tot}</b></span></div></div>`; }).join('')}</div>`;
  // Top 3 + tasks today
  const tk = dk(new Date()); const due = tasksList().filter((t) => !t.done && t.due && t.due <= k).sort((a, b) => a.due.localeCompare(b.due));
  html += `<div class="card top3"><div class="card-h"><div class="card-t">Top 3 for the day</div><div class="card-r">the needle movers</div></div>${o.top3.map((x, i) => `<div class="item ${x.d ? 'on' : ''}"><div class="n">${i + 1}</div><input value="${esc(x.t)}" placeholder="${['Most important thing…', 'Second…', 'Third…'][i]}" oninput="setTop3(${i},this.value)"><div class="box" onclick="toggleTop3(${i})">${x.d ? '✓' : ''}</div></div>`).join('')}
    ${due.length ? `<div class="sec-h">Tasks due</div>${due.map((t) => taskRow(t, k)).join('')}` : ''}<div class="row" style="margin-top:8px"><input id="quick-task" placeholder="+ task for ${today ? 'today' : fmtShort(d)}" onkeydown="if(event.key==='Enter')quickTask('${k}')"></div></div>`;
  // Habits
  html += `<div class="card"><div class="card-h"><div class="card-t">Standards</div><div class="card-r"><b>${S.habits.items.filter((h) => o.habits[h.id]).length}</b>/${S.habits.items.length}</div></div><div class="habits">${S.habits.items.map((h) => `<div class="habit ${o.habits[h.id] ? 'on' : ''}" onclick="toggleHabit('${h.id}')"><div class="b">${o.habits[h.id] ? '✓' : ''}</div>${esc(h.title)}</div>`).join('')}</div></div>`;
  // Sleep + money
  html += `<div class="g2"><div class="card"><div class="card-t" style="margin-bottom:8px">Sleep</div><div class="field"><label>In bed</label><input type="time" value="${esc(o.bedAt || '')}" onchange="setDayField('bedAt',this.value)"></div><div class="field" style="margin:0"><label>Woke up</label><input type="time" value="${esc(o.wokeAt || '')}" onchange="setDayField('wokeAt',this.value)"></div>${o.bedAt && o.wokeAt ? `<div class="xs muted" style="margin-top:6px">${sleepDur(o.bedAt, o.wokeAt)} in bed</div>` : ''}</div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Money (${S.settings.currency})</div><div class="field"><label>Made</label><input type="number" inputmode="numeric" value="${o.income ?? ''}" placeholder="0" oninput="setDayField('income',this.value)"></div><div class="field" style="margin:0"><label>Spent</label><input type="number" inputmode="numeric" value="${o.spent ?? ''}" placeholder="0" oninput="setDayField('spent',this.value)"></div></div></div>`;
  // Journal
  html += `<div class="card"><div class="card-h"><div class="card-t">Debrief</div><div class="card-r">30 seconds, honest</div></div><div class="field"><label>Win</label><input value="${esc(o.win || '')}" placeholder="What worked today?" oninput="setDayField('win',this.value)"></div><div class="field"><label>Loss</label><input value="${esc(o.loss || '')}" placeholder="Where did I break my word?" oninput="setDayField('loss',this.value)"></div><div class="field" style="margin:0"><label>Fix for tomorrow</label><input value="${esc(o.fix || '')}" placeholder="One change" oninput="setDayField('fix',this.value)"></div></div>`;
  // Score
  const sc = dayScore(d);
  html += `<div class="card"><div class="score"><svg class="ring" viewBox="0 0 64 64"><circle class="bgc" cx="32" cy="32" r="27"/><circle class="fgc" cx="32" cy="32" r="27" stroke-dasharray="${2 * Math.PI * 27}" stroke-dashoffset="${2 * Math.PI * 27 * (1 - sc / 100)}"/><text x="32" y="33">${sc}%</text></svg><div class="grow"><div style="font-weight:700">Day score</div><div class="small muted">Routine + standards + targets hit + top 3. ${sc >= 80 ? 'Strong day.' : sc >= 50 ? 'Finish the list.' : 'Minimum day: 10 dials + 25 min BAC, never zero.'}</div></div></div></div>`;
  $('view-today').innerHTML = html;
}
const secOpen = {};
function toggleSec(n) { const el = $('sec-' + n); const open = el.classList.contains('hidden'); el.classList.toggle('hidden', !open); secOpen[n] = open; }
function sleepDur(a, b) { let m = tmin(b) - tmin(a); if (m < 0) m += 1440; return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; }
function stepWeight(s) { const i = $('w-inp'); i.value = (Number(i.value || 0) + s).toFixed(1); }
function saveWeight() { const v = num($('w-inp').value); if (v == null || v < 30 || v > 200) { toast('Enter a weight between 30 and 200 kg'); return; } const o = day(curDate); o.weight = Math.round(v * 10) / 10; delete o.weighEdit; delete o.weightSkipped; S.routines.morning.filter((r) => r.link === 'weight').forEach((r) => (o.routine[r.id] = 1)); touch(o); toast('Weight saved · ' + fmt(v, 1) + ' kg'); render(); }
function editWeight() { const o = day(curDate); o.weighEdit = true; render(); }
function cancelWeight() { const o = day(curDate); delete o.weighEdit; render(); }
function skipWeight() { const o = day(curDate); o.weight = ''; o.weightSkipped = true; touch(o); render(); }
function toggleRoutine(id) { const o = day(curDate); o.routine[id] = o.routine[id] ? 0 : 1; touch(o); render(); }
function toggleHabit(id) { const o = day(curDate); o.habits[id] = o.habits[id] ? 0 : 1; touch(o); render(); }
function bump(id, n) { const o = day(curDate); o.counters[id] = Math.max(0, (Number(o.counters[id]) || 0) + n); touch(o); render(); }
function setCounter(id) { const o = day(curDate); const c = S.counters.items.find((x) => x.id === id); const v = prompt('Set ' + c.title + ' for ' + fmtShort(curDate), o.counters[id] || 0); if (v == null) return; o.counters[id] = Math.max(0, num(v) || 0); touch(o); render(); }
function setTop3(i, v) { const o = day(curDate); o.top3[i].t = v; touch(o); }
function toggleTop3(i) { const o = day(curDate); if (!o.top3[i].t) return; o.top3[i].d = o.top3[i].d ? 0 : 1; touch(o); render(); }
function setDayField(f, v) { const o = day(curDate); o[f] = v; touch(o); }

/* ───────── TASKS ───────── */
function taskRow(t, ctx) { const od = t.due && !t.done && t.due < dk(new Date()); return `<div class="ck ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')"><div class="box round ${t.done ? 'on' : ''}" style="${t.done ? 'background:var(--green);border-color:var(--green)' : ''}">${t.done ? '✓' : ''}</div><div class="lbl">${esc(t.title)}${t.due && ctx !== t.due ? `<span class="sub ${od ? 'red' : ''}">${od ? 'overdue · ' : ''}${fmtShort(pd(t.due))}</span>` : ''}${t.note ? `<span class="sub">${esc(t.note)}</span>` : ''}</div><button class="edit" onclick="event.stopPropagation();editTask('${t.id}')">✎</button></div>`; }
function renderTasks() {
  const ts = tasksList(), tk = dk(new Date()), tomorrow = dk(addDays(new Date(), 1));
  const open = ts.filter((t) => !t.done);
  const overdue = open.filter((t) => t.due && t.due < tk).sort((a, b) => a.due.localeCompare(b.due));
  const todayT = open.filter((t) => t.due === tk), tmrw = open.filter((t) => t.due === tomorrow);
  const later = open.filter((t) => t.due && t.due > tomorrow).sort((a, b) => a.due.localeCompare(b.due));
  const nodate = open.filter((t) => !t.due).sort((a, b) => (b._u || 0) - (a._u || 0));
  const done = ts.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
  const sec = (title, list, cls) => list.length ? `<div class="sec-h ${cls || ''}">${title} · ${list.length}</div><div class="card" style="padding:4px 14px">${list.map((t) => taskRow(t)).join('')}</div>` : '';
  $('view-tasks').innerHTML = `<div class="task-add"><input id="task-inp" placeholder="New task… (Enter = today)" onkeydown="if(event.key==='Enter')addTask('${tk}')"><button class="btn primary" onclick="addTask('${tk}')">Today</button><button class="btn" onclick="addTask('')">Later</button></div>
    ${!open.length ? '<div class="empty">No open tasks. Capture everything here, then the Top 3 goes on Today.</div>' : ''}
    ${sec('Overdue', overdue, 'red')}${sec('Today', todayT)}${sec('Tomorrow', tmrw)}${sec('Upcoming', later)}${sec('No date', nodate)}${sec('Done recently', done)}`;
}
function addTask(due) { const i = $('task-inp'); const v = i.value.trim(); if (!v) { i.focus(); return; } const t = { id: uid(), _u: now(), title: v, due: due || '', done: false, note: '' }; S.tasks[t.id] = t; save(); i.value = ''; render(); }
function quickTask(k) { const i = $('quick-task'); const v = i.value.trim(); if (!v) return; const t = { id: uid(), _u: now(), title: v, due: k, done: false, note: '' }; S.tasks[t.id] = t; save(); render(); }
function toggleTask(id) { const t = S.tasks[id]; t.done = !t.done; t.doneAt = t.done ? now() : null; t._u = now(); save(); render(); }
function editTask(id) {
  const t = S.tasks[id];
  openModal(`<h2>Edit task</h2><div class="field"><label>Title</label><input id="m-title" value="${esc(t.title)}"></div><div class="field"><label>Due</label><input id="m-due" type="date" value="${esc(t.due || '')}"></div><div class="chips" style="margin:-6px 0 12px">${[['Today', 0], ['Tomorrow', 1], ['+3 days', 3], ['Next Mon', 'mon'], ['No date', null]].map(([l, n]) => `<span class="chip" onclick="document.getElementById('m-due').value='${n == null ? '' : n === 'mon' ? dk(addDays(monday(new Date()), 7)) : dk(addDays(new Date(), n))}'">${l}</span>`).join('')}</div><div class="field"><label>Note</label><textarea id="m-note">${esc(t.note || '')}</textarea></div>
    <div class="actions"><button class="btn danger" onclick="delTask('${id}')">Delete</button><button class="btn primary" onclick="saveTask('${id}')">Save</button></div>`);
}
function saveTask(id) { const t = S.tasks[id]; t.title = $('m-title').value.trim() || t.title; t.due = $('m-due').value; t.note = $('m-note').value.trim(); t._u = now(); save(); closeModal(); render(); }
function delTask(id) { S.tasks[id]._del = true; S.tasks[id]._u = now(); save(); closeModal(); render(); }

/* ───────── PLAN ───────── */
let planEdit = false;
function renderPlan() {
  const m = monday(curDate), sel = dk(curDate), tk = dk(new Date()), nm = nowMin();
  const strip = ALL.map((i) => { const d = addDays(m, i - 1), k = dk(d), o = S.days[k], sc = o ? dayScore(d) : 0; const wt = o && o.weight ? fmt(o.weight, 1) : ''; return `<div class="wday ${k === tk ? 'today' : ''} ${k === sel ? 'sel' : ''}" onclick="selDay('${k}')"><div class="d">${DAY_SHORT[i]}</div><div class="n">${d.getDate()}</div><div class="s">${wt || (o && sc ? sc + '%' : '·')}</div><div class="dot ${o && k <= tk ? (sc >= 70 ? 'hi' : sc >= 40 ? 'mid' : 'lo') : ''}"></div></div>`; }).join('');
  const dials = S.counters.items.find((c) => c.id === 'dials'), bac = S.counters.items.find((c) => c.id === 'bac');
  const sum = `<div class="g3" style="margin-bottom:12px">${dials ? `<div class="cd"><div class="n">${counterWeek('dials', curDate)}<span class="small muted">/${dials.weekly}</span></div><div class="l">dials this week</div></div>` : ''}${bac ? `<div class="cd"><div class="n">${(counterWeek('bac', curDate) / 60).toFixed(1)}<span class="small muted">h</span></div><div class="l">BAC study</div></div>` : ''}<div class="cd"><div class="n">${workoutsWeek(curDate)}<span class="small muted">/7</span></div><div class="l">training days</div></div></div>`;
  const bl = blocksFor(curDate);
  const tl = bl.map((b) => { const past = sel === tk && tmin(b.end) <= nm, cur = sel === tk && tmin(b.start) <= nm && nm < tmin(b.end); return `<div class="blk ${past ? 'past' : ''} ${cur ? 'now' : ''}"><div class="t">${b.start}–${b.end === '24:00' ? '…' : b.end}</div><div class="b"><div class="n"><span class="tag ${b.kind}"></span>${esc(b.title)}</div>${b.note ? `<div class="k">${esc(b.note)}</div>` : ''}</div>${planEdit ? `<button class="edit" onclick="editBlock('${b.id}')">✎</button>` : ''}</div>`; }).join('');
  $('view-plan').innerHTML = `<div class="card" style="padding:12px"><div class="wstrip">${strip}</div></div>${sum}
    <div class="card"><div class="card-h"><div class="card-t">${DAY_LONG[dow(curDate)]} · ${bl.length} blocks</div><div class="row" style="gap:6px"><button class="btn sm ${planEdit ? 'primary' : ''}" onclick="planEdit=!planEdit;render()">${planEdit ? 'Done' : 'Edit'}</button>${planEdit ? `<button class="btn sm" onclick="editBlock('')">+ Block</button>` : ''}</div></div>
    <div class="tl">${tl || '<div class="empty">No blocks for this day. Tap Edit to add.</div>'}</div></div>
    <div class="card"><div class="row sb"><div><div style="font-weight:600">Google Calendar</div><div class="xs muted">The schedule above mirrors your recurring calendar. For one-off events open the calendar.</div></div><a class="btn sm" href="https://calendar.google.com/calendar/u/0/r/day" target="_blank" rel="noopener">Open ↗</a></div></div>`;
}
function selDay(k) { curDate = pd(k); render(); }
const KINDS = ['routine', 'train', 'bac', 'school', 'dials', 'agency', 'tennis', 'food', 'travel', 'sleep', 'other'];
function editBlock(id) {
  const b = id ? S.schedule.blocks.find((x) => x.id === id) : { id: '', title: '', start: '09:00', end: '10:00', days: [dow(curDate)], kind: 'other', note: '' };
  openModal(`<h2>${id ? 'Edit block' : 'New block'}</h2><div class="field"><label>Title</label><input id="m-title" value="${esc(b.title)}" placeholder="What happens"></div>
    <div class="g2"><div class="field"><label>Start</label><input id="m-start" type="time" value="${b.start}"></div><div class="field"><label>End</label><input id="m-end" type="time" value="${b.end === '24:00' ? '23:59' : b.end}"></div></div>
    <div class="field"><label>Days</label><div class="daychips" id="m-days">${ALL.map((i) => `<span class="chip ${b.days.includes(i) ? 'on' : ''}" data-d="${i}" onclick="this.classList.toggle('on')">${DAY_SHORT[i]}</span>`).join('')}</div></div>
    <div class="field"><label>Type</label><select id="m-kind">${KINDS.map((k) => `<option ${k === b.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="field"><label>Note</label><textarea id="m-note">${esc(b.note || '')}</textarea></div>
    <div class="actions">${id ? `<button class="btn danger" onclick="delBlock('${id}')">Delete</button>` : ''}<button class="btn primary" onclick="saveBlock('${id}')">Save</button></div>`);
}
function saveBlock(id) {
  const days = [...document.querySelectorAll('#m-days .chip.on')].map((c) => Number(c.dataset.d)); const title = $('m-title').value.trim();
  if (!title || !days.length) { toast('Title and at least one day'); return; }
  let end = $('m-end').value; if (end === '23:59') end = '24:00';
  const b = id ? S.schedule.blocks.find((x) => x.id === id) : { id: uid() }; Object.assign(b, { title, start: $('m-start').value, end, days, kind: $('m-kind').value, note: $('m-note').value.trim() });
  if (!id) S.schedule.blocks.push(b); S.schedule._u = now(); save(); closeModal(); render();
}
function delBlock(id) { S.schedule.blocks = S.schedule.blocks.filter((x) => x.id !== id); S.schedule._u = now(); save(); closeModal(); render(); }

/* ───────── TRAIN ───────── */
function renderTrain() {
  const k = dk(curDate), o = day(k), w = dow(curDate);
  if (!o.workout) o.workout = { program: S.programByDay.map[w] || '', sets: {}, done: false, note: '' };
  const wo = o.workout, p = S.programs[wo.program];
  const sel = `<select onchange="setProgram(this.value)"><option value="">— Rest / none —</option>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<option value="${id}" ${id === wo.program ? 'selected' : ''}>${esc(S.programs[id].name)}</option>`).join('')}</select>`;
  let html = `<div class="card ac"><div class="card-h"><div class="card-t">${DAY_LONG[w]}'s session</div><div class="card-r">${wo.done ? '<span class="green">✓ done</span>' : p ? 'planned' : ''}</div></div><div class="field" style="margin-bottom:8px">${sel}</div>${p && p.note ? `<div class="hint">${esc(p.note)}</div>` : ''}</div>`;
  if (p) {
    const prev = prevWorkout(wo.program, k);
    html += `<div class="card">${p.ex.map((e, ei) => { const sets = wo.sets[ei] || []; const pv = prev && prev.sets[ei] || [];
      return `<div class="ex"><div class="h"><div class="n">${esc(e.n)}</div><div class="tgt">${e.s} × ${esc(e.r)}</div></div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}<div class="sets">${Array.from({ length: e.s }, (_, si) => { const s = sets[si] || {}; const ps = pv[si]; return `<div class="set ${s.done ? 'on' : ''}"><div class="i">${si + 1}</div><input type="number" inputmode="decimal" placeholder="${ps && ps.w != null && ps.w !== '' ? ps.w : 'kg'}" value="${s.w ?? ''}" oninput="setSet(${ei},${si},'w',this.value)"><input inputmode="numeric" placeholder="${ps && ps.r ? ps.r : (/s\b|min/.test(e.r) ? 'sec' : 'reps')}" value="${s.r ?? ''}" oninput="setSet(${ei},${si},'r',this.value)"><div class="dn" onclick="toggleSet(${ei},${si})">${s.done ? '✓' : ''}</div></div>`; }).join('')}</div></div>`; }).join('')}
      <div class="field" style="margin-top:12px"><label>Session note</label><input value="${esc(wo.note || '')}" placeholder="RPE, pain, what to change" oninput="day('${k}').workout.note=this.value;touch(day('${k}'))"></div>
      <button class="btn ${wo.done ? '' : 'primary'} block" onclick="finishWorkout()">${wo.done ? 'Mark as not done' : 'Finish workout ✓'}</button>${prev ? `<div class="xs muted" style="margin-top:8px;text-align:center">Placeholders show your last ${esc(p.name)} session (${fmtShort(pd(prev.k))}).</div>` : ''}</div>`;
  }
  // programs + mapping
  html += `<div class="card"><div class="card-h"><div class="card-t">Programs</div><button class="btn sm" onclick="editProgram('')">+ New</button></div>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<div class="setting-row" onclick="editProgram('${id}')"><div><div class="t">${esc(S.programs[id].name)}</div><div class="d">${S.programs[id].ex.length} exercises · ${ALL.filter((d) => S.programByDay.map[d] === id).map((d) => DAY_SHORT[d]).join(', ') || 'unscheduled'}</div></div><div class="arr">›</div></div>`).join('')}</div>`;
  html += `<div class="card"><div class="card-t" style="margin-bottom:8px">Weekly split</div>${ALL.map((d) => `<div class="kv"><span>${DAY_LONG[d]}</span><select style="width:60%" onchange="S.programByDay.map[${d}]=this.value;S.programByDay._u=Date.now();save();render()"><option value="">Rest</option>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<option value="${id}" ${S.programByDay.map[d] === id ? 'selected' : ''}>${esc(S.programs[id].name)}</option>`).join('')}</select></div>`).join('')}</div>`;
  // history
  const hist = Object.keys(S.days).filter((kk) => S.days[kk].workout && S.days[kk].workout.done).sort().reverse().slice(0, 14);
  html += `<div class="card"><div class="card-t" style="margin-bottom:6px">History</div>${hist.length ? hist.map((kk) => { const ww = S.days[kk].workout, pp = S.programs[ww.program]; const n = Object.values(ww.sets).reduce((a, s) => a + s.filter((x) => x && x.done).length, 0); return `<div class="kv" onclick="selDay('${kk}')" style="cursor:pointer"><span>${fmtShort(pd(kk))} · ${pp ? esc(pp.name) : 'session'}</span><span class="v muted">${n} sets</span></div>`; }).join('') : '<div class="empty">No finished workouts yet.</div>'}</div>`;
  $('view-train').innerHTML = html;
}
function prevWorkout(pid, beforeKey) { const ks = Object.keys(S.days).filter((k) => k < beforeKey && S.days[k].workout && S.days[k].workout.program === pid && Object.keys(S.days[k].workout.sets || {}).length).sort(); if (!ks.length) return null; const k = ks[ks.length - 1]; return { k, sets: S.days[k].workout.sets }; }
function setProgram(id) { const o = day(curDate); o.workout = { program: id, sets: {}, done: false, note: '' }; touch(o); render(); }
function setSet(ei, si, f, v) { const o = day(curDate); if (!o.workout.sets[ei]) o.workout.sets[ei] = []; if (!o.workout.sets[ei][si]) o.workout.sets[ei][si] = {}; o.workout.sets[ei][si][f] = v; touch(o); }
function toggleSet(ei, si) { const o = day(curDate); if (!o.workout.sets[ei]) o.workout.sets[ei] = []; if (!o.workout.sets[ei][si]) o.workout.sets[ei][si] = {}; const s = o.workout.sets[ei][si]; s.done = !s.done; if (s.done) { const p = S.programs[o.workout.program]; const prev = prevWorkout(o.workout.program, dk(curDate)); const ps = prev && prev.sets[ei] && prev.sets[ei][si]; if (!s.w && ps && ps.w) s.w = ps.w; if (!s.r && ps && ps.r) s.r = ps.r; if (!s.r && p && p.ex[ei] && /^\d+$/.test(p.ex[ei].r)) s.r = p.ex[ei].r; } touch(o); render(); }
function finishWorkout() { const o = day(curDate); o.workout.done = !o.workout.done; S.routines.morning.filter((r) => r.link === 'train').forEach((r) => (o.routine[r.id] = o.workout.done ? 1 : 0)); touch(o); toast(o.workout.done ? 'Workout logged 💪' : 'Workout reopened'); render(); }
function editProgram(id) {
  const p = id ? S.programs[id] : { name: '', note: '', ex: [] };
  const lines = p.ex.map((e) => `${e.n} | ${e.s} | ${e.r}${e.note ? ' | ' + e.note : ''}`).join('\n');
  openModal(`<h2>${id ? 'Edit program' : 'New program'}</h2><div class="field"><label>Name</label><input id="m-name" value="${esc(p.name)}" placeholder="Upper A"></div><div class="field"><label>Warm-up / notes</label><textarea id="m-note">${esc(p.note)}</textarea></div>
    <div class="field"><label>Exercises — one per line: <span class="mono">name | sets | reps | note</span></label><textarea id="m-ex" style="min-height:180px;font-family:var(--mono);font-size:12px" placeholder="Pull-ups | 4 | 5–10 | chest to bar">${esc(lines)}</textarea></div>
    <div class="actions">${id ? `<button class="btn danger" onclick="delProgram('${id}')">Delete</button>` : ''}<button class="btn primary" onclick="saveProgram('${id}')">Save</button></div>`);
}
function saveProgram(id) {
  const name = $('m-name').value.trim(); if (!name) { toast('Name the program'); return; }
  const ex = $('m-ex').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, s, r, ...note] = l.split('|').map((x) => x.trim()); return { n: n || 'Exercise', s: clamp(parseInt(s) || 1, 1, 12), r: r || '', note: note.join(' | ') }; });
  const pid = id || uid().replace(/[^a-z0-9]/gi, ''); S.programs[pid] = Object.assign(S.programs[pid] || {}, { _u: now(), name, note: $('m-note').value.trim(), ex }); save(); closeModal(); render();
}
function delProgram(id) { if (!confirm('Delete this program? Logged sessions stay.')) return; S.programs[id]._del = true; S.programs[id]._u = now(); for (const d in S.programByDay.map) if (S.programByDay.map[d] === id) S.programByDay.map[d] = ''; S.programByDay._u = now(); save(); closeModal(); render(); }

/* ───────── GOALS ───────── */
function goalCurrent(g) {
  if (g.source === 'weight') { const a = avgWeight(7) || (latestWeight() || {}).w; return a == null ? null : Math.round(a * 10) / 10; }
  if (g.source && g.source.startsWith('counter:')) { const [, id, scope] = g.source.split(':'); return scope === 'week' ? counterWeek(id, new Date()) : counterTotal(id); }
  if (g.source === 'workouts:week') return workoutsWeek(new Date());
  if (g.source === 'check') return g.done ? 1 : 0;
  return g.current;
}
function goalPct(g) { const c = goalCurrent(g); if (c == null || !g.target) return 0; if (g.source === 'weight') { const start = g.start != null ? g.start : (weightEntries()[0] || {}).w; if (start == null || start === g.target) return c >= g.target ? 100 : 0; return clamp(((c - start) / (g.target - start)) * 100, 0, 100); } return clamp((c / g.target) * 100, 0, 100); }
function renderGoals() {
  const gs = Object.values(S.goals).filter((g) => !g._del);
  const cds = `<div class="countdown"><div class="cd"><div class="n">${daysUntil(S.settings.bigDate)}</div><div class="l">days to ${esc(S.settings.bigLabel)}</div></div><div class="cd"><div class="n">${daysUntil(S.settings.bacDate)}</div><div class="l">days to BAC (${fmtShort(pd(S.settings.bacDate))} ${pd(S.settings.bacDate).getFullYear()})</div></div></div>`;
  const grp = (h, title, sub) => { const list = gs.filter((g) => g.horizon === h).sort((a, b) => (a.done - b.done) || (a.deadline || 'z').localeCompare(b.deadline || 'z')); return `<div class="card"><div class="card-h"><div class="card-t">${title}</div><div class="card-r">${sub}</div></div>${list.length ? list.map(goalRow).join('') : '<div class="empty">Nothing here yet.</div>'}</div>`; };
  $('view-goals').innerHTML = `<div class="card" style="padding:12px">${cds}</div>${grp('week', 'This week', 'resets Monday')}${grp('month', 'This month', new Date().toLocaleDateString('en-GB', { month: 'long' }))}${grp('long', 'By July 1, 2027', 'the campaign')}
    <button class="btn block" onclick="editGoal('')">+ Add goal</button>
    <div class="hint" style="margin:14px 4px">Rule from the plan: no new business ideas until 100 owner conversations. Weekly numbers come from the Scoreboard automatically; tap a goal to edit or update it.</div>`;
}
function goalRow(g) {
  const c = goalCurrent(g), pct = goalPct(g), auto = g.source && g.source !== 'manual' && g.source !== 'check';
  const done = g.source === 'check' ? g.done : (g.done || (c != null && g.target && pct >= 100));
  const val = g.source === 'check' ? '' : `${c == null ? '—' : fmt(c, g.unit === 'kg' ? 1 : 0)} / ${fmt(g.target, g.unit === 'kg' ? 1 : 0)} ${esc(g.unit)}`;
  const dl = g.deadline ? (daysUntil(g.deadline) < 0 ? `<span class="red">${-daysUntil(g.deadline)} days late</span>` : `${daysUntil(g.deadline)} days left · ${fmtShort(pd(g.deadline))}`) : '';
  return `<div class="goal ${done ? 'done' : ''}" onclick="editGoal('${g.id}')"><div class="h"><div class="n">${g.source === 'check' ? `<span class="box" style="display:inline-flex;width:20px;height:20px;border-radius:6px;border:2px solid ${done ? 'var(--green)' : 'var(--line2)'};background:${done ? 'var(--green)' : 'transparent'};vertical-align:-4px;margin-right:8px;align-items:center;justify-content:center;font-size:12px;color:#0b0b0f">${done ? '✓' : ''}</span>` : ''}${esc(g.title)}</div><div class="v">${val}${auto ? ' <span class="xs dim">auto</span>' : ''}</div></div>${g.source !== 'check' ? `<div class="bar"><i class="${pct >= 100 ? 'green' : ''}" style="width:${pct}%"></i></div>` : ''}${dl ? `<div class="dl">${dl}</div>` : ''}</div>`;
}
function editGoal(id) {
  const g = id ? S.goals[id] : { title: '', horizon: 'month', target: '', unit: '', deadline: '', source: 'manual', current: null, done: false };
  openModal(`<h2>${id ? 'Goal' : 'New goal'}</h2><div class="field"><label>Title</label><input id="m-title" value="${esc(g.title)}"></div>
    <div class="g2"><div class="field"><label>Horizon</label><select id="m-h">${[['week', 'This week'], ['month', 'This month'], ['long', 'By July 1, 2027']].map(([v, l]) => `<option value="${v}" ${g.horizon === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Deadline</label><input id="m-dl" type="date" value="${esc(g.deadline || '')}"></div></div>
    <div class="g2"><div class="field"><label>Target</label><input id="m-target" type="number" inputmode="decimal" value="${g.target ?? ''}"></div><div class="field"><label>Unit</label><input id="m-unit" value="${esc(g.unit || '')}" placeholder="$, kg, convos"></div></div>
    <div class="field"><label>Tracked by</label><select id="m-src"><option value="manual" ${g.source === 'manual' ? 'selected' : ''}>Manual number</option><option value="check" ${g.source === 'check' ? 'selected' : ''}>Checkbox (done / not done)</option><option value="weight" ${g.source === 'weight' ? 'selected' : ''}>Body weight (7-day avg)</option>${S.counters.items.map((c) => `<option value="counter:${c.id}:week" ${g.source === `counter:${c.id}:week` ? 'selected' : ''}>${esc(c.title)} · this week</option><option value="counter:${c.id}" ${g.source === `counter:${c.id}` ? 'selected' : ''}>${esc(c.title)} · all time</option>`).join('')}<option value="workouts:week" ${g.source === 'workouts:week' ? 'selected' : ''}>Workouts this week</option></select></div>
    ${g.source === 'manual' || !id ? `<div class="field"><label>Current value</label><input id="m-cur" type="number" inputmode="decimal" value="${g.current ?? ''}"></div>` : ''}
    ${g.source === 'check' ? `<label class="row" style="margin-bottom:10px"><input type="checkbox" id="m-done" style="width:22px;height:22px" ${g.done ? 'checked' : ''}> Done</label>` : ''}
    <div class="actions">${id ? `<button class="btn danger" onclick="delGoal('${id}')">Delete</button>` : ''}<button class="btn primary" onclick="saveGoal('${id}')">Save</button></div>`);
}
function saveGoal(id) {
  const title = $('m-title').value.trim(); if (!title) { toast('Give the goal a title'); return; }
  const g = id ? S.goals[id] : { id: uid(), current: null, done: false }; Object.assign(g, { _u: now(), title, horizon: $('m-h').value, deadline: $('m-dl').value, target: num($('m-target').value), unit: $('m-unit').value.trim(), source: $('m-src').value });
  if ($('m-cur')) g.current = num($('m-cur').value); if ($('m-done')) g.done = $('m-done').checked; if (g.source === 'weight' && g.start == null) { const w = weightEntries(); if (w.length) g.start = w[0].w; }
  S.goals[g.id] = g; save(); closeModal(); render();
}
function delGoal(id) { S.goals[id]._del = true; S.goals[id]._u = now(); save(); closeModal(); render(); }

/* ───────── MORE ───────── */
let moreTab = 'home';
function renderMore() {
  const t = moreTab, sync = S.settings.sync;
  const tabs = `<div class="chips" style="margin-bottom:12px">${[['home', 'Menu'], ['weight', 'Weight'], ['review', 'Weekly review'], ['routines', 'Routines'], ['counters', 'Scoreboard'], ['sync', 'Sync'], ['install', 'Install']].map(([v, l]) => `<span class="chip ${t === v ? 'on' : ''}" onclick="moreTab='${v}';render()">${l}</span>`).join('')}</div>`;
  let html = tabs;
  if (t === 'home') {
    html += `<div class="card">${[['weight', 'Weight history', 'chart, averages, pace to 85 kg'], ['review', 'Weekly review', 'the Sunday 30 minutes'], ['routines', 'Routines & standards', 'edit the morning / evening lists'], ['counters', 'Scoreboard targets', 'dials, BAC minutes, per weekday'], ['sync', 'Sync & backup', sync.code ? 'connected · ' + syncLabel() : 'phone ↔ laptop'], ['install', 'Install on home screen', 'iPhone & Android steps']].map(([v, a, b]) => `<div class="setting-row" onclick="moreTab='${v}';render()"><div><div class="t">${a}</div><div class="d">${b}</div></div><div class="arr">›</div></div>`).join('')}</div>
      <div class="card"><div class="card-t" style="margin-bottom:8px">Settings</div>
      <div class="kv"><span>Wake</span><input type="time" value="${S.settings.wake}" onchange="S.settings.wake=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Bed</span><input type="time" value="${S.settings.bed}" onchange="S.settings.bed=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Weight target (kg)</span><input type="number" inputmode="decimal" value="${S.settings.weightTarget}" onchange="S.settings.weightTarget=Number(this.value)||85;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>BAC first exam</span><input type="date" value="${S.settings.bacDate}" onchange="S.settings.bacDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Big date</span><input type="date" value="${S.settings.bigDate}" onchange="S.settings.bigDate=this.value;S.settings._u=Date.now();save()"></div>
      <div class="kv"><span>Currency</span><input value="${esc(S.settings.currency)}" onchange="S.settings.currency=this.value||'MDL';S.settings._u=Date.now();save()"></div></div>
      <div class="xs dim" style="text-align:center;margin:10px 0">War Room v${APP_VERSION} · data lives on this device${sync.code ? ' + cloud' : ''}</div>`;
  } else if (t === 'weight') html += renderWeight();
  else if (t === 'review') html += renderReview();
  else if (t === 'routines') html += renderRoutinesEditor();
  else if (t === 'counters') html += renderCountersEditor();
  else if (t === 'sync') html += renderSync();
  else if (t === 'install') html += `<div class="card"><div class="card-t" style="margin-bottom:8px">iPhone (Safari)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in <b>Safari</b> (not the Instagram/Gmail browser).</li><li>Tap the <b>Share</b> button (square with arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open it from the home screen: it runs full-screen and offline.</li></ol></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Android (Chrome)</div><ol class="small" style="padding-left:18px;line-height:1.8"><li>Open this page in Chrome.</li><li>Tap the <b>⋮</b> menu → <b>Add to Home screen</b> / <b>Install app</b>.</li></ol></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Laptop</div><div class="small">Chrome / Edge: click the install icon in the address bar. Then turn on Sync so phone and laptop share the same data.</div></div>`;
  $('view-more').innerHTML = html;
}
function renderWeight() {
  const e = weightEntries(); if (!e.length) return '<div class="card"><div class="empty">No weigh-ins yet. Tomorrow morning: toilet → scale → type it in.</div></div>';
  const range = weightRange; const cutoff = range === 'all' ? '' : dk(addDays(new Date(), -range)); const pts = e.filter((x) => x.k >= cutoff);
  const a7 = avgWeight(7), a7p = avgWeight(7, dk(addDays(new Date(), -7))), a28 = avgWeight(7, dk(addDays(new Date(), -28)));
  const first = e[0], lastE = e[e.length - 1], tg = S.settings.weightTarget, wks = Math.max(1, daysUntil(S.settings.weightTargetDate) / 7); const pace = a7 ? (tg - a7) / wks : null;
  return `<div class="card"><div class="g3"><div class="cd"><div class="n">${fmt(lastE.w, 1)}</div><div class="l">latest · ${fmtShort(pd(lastE.k))}</div></div><div class="cd"><div class="n">${a7 ? fmt(a7, 1) : '—'}</div><div class="l">7-day avg</div></div><div class="cd"><div class="n ${a7 && a7p ? (a7 - a7p >= 0 ? 'green' : 'red') : ''}">${a7 && a7p ? (a7 - a7p >= 0 ? '+' : '') + fmt(a7 - a7p, 1) : '—'}</div><div class="l">vs last week</div></div></div>
    <div class="chips" style="margin:12px 0 6px">${[[30, '30d'], [90, '90d'], ['all', 'All']].map(([v, l]) => `<span class="chip ${range === v ? 'on' : ''}" onclick="weightRange=${typeof v === 'string' ? `'${v}'` : v};render()">${l}</span>`).join('')}</div>${weightChart(pts)}</div>
    <div class="card"><div class="kv"><span>Start (${fmtShort(pd(first.k))})</span><span class="v">${fmt(first.w, 1)} kg</span></div><div class="kv"><span>Change since start</span><span class="v ${lastE.w - first.w >= 0 ? 'green' : 'red'}">${lastE.w - first.w >= 0 ? '+' : ''}${fmt(lastE.w - first.w, 1)} kg</span></div><div class="kv"><span>Monthly trend (7d avg vs 4 weeks ago)</span><span class="v">${a7 && a28 ? (a7 - a28 >= 0 ? '+' : '') + fmt(a7 - a28, 1) + ' kg' : '—'}</span></div><div class="kv"><span>To ${tg} kg</span><span class="v">${a7 ? fmt(tg - a7, 1) : '—'} kg</span></div><div class="kv"><span>Needed pace to ${fmtShort(pd(S.settings.weightTargetDate))}</span><span class="v">${pace != null ? (pace >= 0 ? '+' : '') + fmt(pace, 2) + ' kg/week' : '—'}</span></div><div class="kv"><span>Entries</span><span class="v">${e.length}</span></div></div>
    <div class="card"><div class="card-t" style="margin-bottom:6px">Log</div>${e.slice().reverse().slice(0, 30).map((x) => `<div class="kv" onclick="curDate=pd('${x.k}');show('today')" style="cursor:pointer"><span>${fmtDate(pd(x.k))}</span><span class="v">${fmt(x.w, 1)} kg</span></div>`).join('')}</div>`;
}
let weightRange = 30;
function weightChart(pts) {
  if (pts.length < 2) return '<div class="empty">Two or more entries draw the chart.</div>';
  const W = 640, H = 190, L = 34, R = 10, T = 10, Bt = 22; const all = weightEntries();
  const mv = pts.map((p) => { const i = all.findIndex((x) => x.k === p.k); const win = all.slice(Math.max(0, i - 6), i + 1).filter((x) => x.k >= dk(addDays(pd(p.k), -6))); return win.reduce((a, b) => a + b.w, 0) / win.length; });
  const tg = S.settings.weightTarget; const ys = pts.map((p) => p.w).concat(mv); let lo = Math.min(...ys), hi = Math.max(...ys); if (Math.abs(tg - lo) < 6 && Math.abs(tg - hi) < 6) { lo = Math.min(lo, tg); hi = Math.max(hi, tg); } lo = Math.floor(lo - 0.5); hi = Math.ceil(hi + 0.5);
  const x0 = pd(pts[0].k).getTime(), x1 = pd(pts[pts.length - 1].k).getTime(); const X = (k) => L + ((pd(k).getTime() - x0) / Math.max(1, x1 - x0)) * (W - L - R); const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - Bt);
  const grid = []; const step = hi - lo > 8 ? 2 : 1; for (let v = lo; v <= hi; v += step) grid.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${v}</text>`);
  const raw = pts.map((p) => `${X(p.k).toFixed(1)},${Y(p.w).toFixed(1)}`).join(' '), line = pts.map((p, i) => `${X(p.k).toFixed(1)},${Y(mv[i]).toFixed(1)}`).join(' ');
  const tgl = tg >= lo && tg <= hi ? `<line class="tgt" x1="${L}" x2="${W - R}" y1="${Y(tg)}" y2="${Y(tg)}"/><text x="${W - R}" y="${Y(tg) - 4}" text-anchor="end" fill="var(--purple)">target ${tg}</text>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid.join('')}${tgl}<polyline class="raw" points="${raw}"/><polyline class="line" points="${line}"/>${pts.map((p) => `<circle class="dot" cx="${X(p.k).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="2.5" opacity=".7"/>`).join('')}<text x="${L}" y="${H - 6}">${fmtShort(pd(pts[0].k))}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtShort(pd(pts[pts.length - 1].k))}</text></svg><div class="xs muted" style="margin-top:4px">Thick line = 7-day average (judge by this). Thin = daily.</div>`;
}
function renderReview() {
  const d = curDate, m = monday(d), wk = weekKey(d), r = S.reviews[wk] || { text: '', change: '' };
  const prevM = addDays(m, -7); const aw = avgWeight(7, dk(addDays(m, 6))), awp = avgWeight(7, dk(addDays(prevM, 6)));
  let inc = 0, sp = 0, scores = []; for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(m, i))]; if (o) { inc += Number(o.income) || 0; sp += Number(o.spent) || 0; if (dk(addDays(m, i)) <= dk(new Date())) scores.push(dayScore(addDays(m, i))); } }
  const rows = S.counters.items.map((c) => `<div class="kv"><span>${esc(c.title)}</span><span class="v">${counterWeek(c.id, d)}${c.weekly ? ` / ${c.weekly}` : ''}${c.unit ? ' ' + c.unit : ''}</span></div>`).join('');
  return `<div class="card"><div class="card-h"><div class="card-t">Week of ${fmtShort(m)} – ${fmtShort(addDays(m, 6))}</div><div class="row" style="gap:4px"><button class="btn sm" onclick="curDate=addDays(curDate,-7);render()">‹</button><button class="btn sm" onclick="curDate=addDays(curDate,7);render()">›</button></div></div>${rows}
    <div class="kv"><span>Training days</span><span class="v">${workoutsWeek(d)} / 7</span></div><div class="kv"><span>Weight, 7-day avg</span><span class="v">${aw ? fmt(aw, 1) : '—'} kg ${aw && awp ? `<span class="${aw - awp >= 0 ? 'green' : 'red'}">(${aw - awp >= 0 ? '+' : ''}${fmt(aw - awp, 1)})</span>` : ''}</span></div><div class="kv"><span>Money (${S.settings.currency})</span><span class="v">+${fmt(inc)} / −${fmt(sp)}</span></div><div class="kv"><span>Avg day score</span><span class="v">${scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%' : '—'}</span></div></div>
    <div class="card"><div class="field"><label>What happened (numbers, wins, misses)</label><textarea style="min-height:110px" oninput="setReview('${wk}','text',this.value)">${esc(r.text)}</textarea></div><div class="field" style="margin:0"><label>ONE change for next week</label><input value="${esc(r.change)}" placeholder="Just one." oninput="setReview('${wk}','change',this.value)"></div></div>
    ${Object.keys(S.reviews).filter((k) => k !== wk && S.reviews[k].change).sort().reverse().slice(0, 6).map((k) => `<div class="card" style="padding:10px 14px"><div class="xs muted">${fmtShort(pd(k.slice(1)))}</div><div class="small">${esc(S.reviews[k].change)}</div></div>`).join('')}`;
}
function setReview(wk, f, v) { if (!S.reviews[wk]) S.reviews[wk] = { text: '', change: '' }; S.reviews[wk][f] = v; S.reviews[wk]._u = now(); save(); }
function renderRoutinesEditor() {
  const list = (key, title) => `<div class="card list-edit"><div class="card-h"><div class="card-t">${title}</div><button class="btn sm" onclick="addRoutine('${key}')">+ Add</button></div>${S.routines[key].map((r, i) => `<div class="item"><button class="mv" onclick="moveRoutine('${key}',${i},-1)">↑</button><div class="grow"><input value="${esc(r.title)}" oninput="S.routines.${key}[${i}].title=this.value;S.routines._u=Date.now();save()"><div class="daychips" style="margin-top:6px">${ALL.map((d) => `<span class="chip xs ${(r.days || ALL).includes(d) ? 'on' : ''}" style="padding:4px 0" onclick="toggleRoutineDay('${key}',${i},${d})">${DAY_SHORT[d][0]}</span>`).join('')}</div></div><button class="x" onclick="delRoutine('${key}',${i})">×</button></div>`).join('')}</div>`;
  return list('morning', 'Morning routine') + list('evening', 'Evening routine') + `<div class="card list-edit"><div class="card-h"><div class="card-t">Standards (daily habits)</div><button class="btn sm" onclick="S.habits.items.push({id:uid(),title:''});S.habits._u=Date.now();save();render()">+ Add</button></div>${S.habits.items.map((h, i) => `<div class="item"><input value="${esc(h.title)}" placeholder="Standard" oninput="S.habits.items[${i}].title=this.value;S.habits._u=Date.now();save()"><button class="x" onclick="S.habits.items.splice(${i},1);S.habits._u=Date.now();save();render()">×</button></div>`).join('')}</div><div class="hint" style="margin:0 4px">Weigh-in and Train tick themselves when you log weight / finish a workout.</div>`;
}
function addRoutine(k) { S.routines[k].push({ id: uid(), title: '', days: ALL.slice() }); S.routines._u = now(); save(); render(); }
function delRoutine(k, i) { S.routines[k].splice(i, 1); S.routines._u = now(); save(); render(); }
function moveRoutine(k, i, n) { const a = S.routines[k]; const j = i + n; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; S.routines._u = now(); save(); render(); }
function toggleRoutineDay(k, i, d) { const r = S.routines[k][i]; if (!r.days) r.days = ALL.slice(); r.days = r.days.includes(d) ? r.days.filter((x) => x !== d) : r.days.concat(d).sort(); S.routines._u = now(); save(); render(); }
function renderCountersEditor() {
  return `<div class="card"><div class="card-h"><div class="card-t">Daily targets</div><button class="btn sm" onclick="S.counters.items.push({id:uid(),title:'New counter',unit:'',targets:[0,0,0,0,0,0,0,0],weekly:0,steps:[1,5,10],color:''});S.counters._u=Date.now();save();render()">+ Add</button></div>
    ${S.counters.items.map((c, i) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row" style="margin-bottom:8px"><input value="${esc(c.title)}" oninput="S.counters.items[${i}].title=this.value;S.counters._u=Date.now();save()"><input value="${esc(c.unit)}" placeholder="unit" style="width:70px" oninput="S.counters.items[${i}].unit=this.value;S.counters._u=Date.now();save()"><button class="btn sm danger" onclick="if(confirm('Remove counter?')){S.counters.items.splice(${i},1);S.counters._u=Date.now();save();render()}">×</button></div>
      <div class="g4" style="grid-template-columns:repeat(7,1fr);gap:4px">${ALL.map((d) => `<div><div class="xs muted" style="text-align:center">${DAY_SHORT[d]}</div><input type="number" inputmode="numeric" value="${c.targets[d] || 0}" style="padding:8px 2px;text-align:center" oninput="S.counters.items[${i}].targets[${d}]=Number(this.value)||0;S.counters._u=Date.now();save()"></div>`).join('')}</div>
      <div class="row" style="margin-top:8px"><span class="small muted">Weekly target</span><input type="number" inputmode="numeric" value="${c.weekly || 0}" style="width:90px" oninput="S.counters.items[${i}].weekly=Number(this.value)||0;S.counters._u=Date.now();save()"><span class="small muted">Buttons</span><input value="${c.steps.join(',')}" style="width:90px" onchange="S.counters.items[${i}].steps=this.value.split(',').map(Number).filter(n=>n>0).slice(0,3);if(!S.counters.items[${i}].steps.length)S.counters.items[${i}].steps=[1];S.counters._u=Date.now();save();render()"></div></div>`).join('')}</div>`;
}

/* ───────── SYNC (Supabase, optional) ───────── */
const syncState = { status: 'off', msg: '', last: 0 };
function syncIcon() { return { off: '⚙', ok: '⚙', pending: '⚙', err: '⚙' }[syncState.status]; }
function syncLabel() { return { off: 'off', ok: 'synced', pending: 'syncing…', err: 'error' }[syncState.status]; }
function hdr() { const s = S.settings.sync; return { apikey: s.key, Authorization: 'Bearer ' + s.key, 'x-warroom-key': s.code, 'Content-Type': 'application/json' }; }
function syncReady() { const s = S.settings.sync; return s && s.url && s.key && s.code && s.code.length >= 16; }
let pushTimer = null;
function schedulePush() { if (!syncReady()) return; clearTimeout(pushTimer); syncState.status = 'pending'; pushTimer = setTimeout(pushCloud, 2500); }
async function pullCloud(silent) {
  if (!syncReady()) return; const s = S.settings.sync;
  try { const r = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(s.code)}&select=data,updated_at`, { headers: hdr() });
    if (!r.ok) throw new Error('HTTP ' + r.status + (r.status === 404 ? ' (table missing: run the SQL in supabase/warroom_sync.sql)' : ''));
    const rows = await r.json(); if (rows.length && rows[0].data) { const changed = merge(rows[0].data); if (changed) { save(true); render(); } }
    else await pushCloud();
    syncState.status = 'ok'; syncState.last = now(); syncState.msg = ''; if (!silent) toast('Synced'); renderTop();
  } catch (e) { syncState.status = 'err'; syncState.msg = String(e.message || e); renderTop(); if (!silent) toast('Sync failed: ' + syncState.msg); }
}
async function pushCloud() {
  if (!syncReady()) return; const s = S.settings.sync; clearTimeout(pushTimer);
  try { const r = await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(hdr(), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: s.code, data: S, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error('HTTP ' + r.status); syncState.status = 'ok'; syncState.last = now(); syncState.msg = ''; }
  catch (e) { syncState.status = 'err'; syncState.msg = String(e.message || e); }
  renderTop(); if (view === 'more' && moreTab === 'sync') render();
}
function merge(remote) {
  let changed = false; const singles = ['settings', 'routines', 'habits', 'counters', 'schedule', 'programByDay'], maps = ['programs', 'days', 'tasks', 'goals', 'reviews'];
  for (const k of singles) if (remote[k] && (remote[k]._u || 0) > (S[k]._u || 0)) { const keepSync = k === 'settings' ? S.settings.sync : null; S[k] = remote[k]; if (keepSync) S.settings.sync = keepSync; changed = true; }
  for (const k of maps) { if (!remote[k]) continue; if (!S[k]) S[k] = {}; for (const id in remote[k]) { const r = remote[k][id], l = S[k][id]; if (!l || (r._u || 0) > (l._u || 0)) { S[k][id] = r; changed = true; } } }
  return changed;
}
function renderSync() {
  const s = S.settings.sync;
  return `<div class="card"><div class="card-h"><div class="card-t">Cloud sync</div><div class="card-r">${syncReady() ? `<b class="${syncState.status === 'err' ? 'red' : 'green'}">${syncLabel()}</b>${syncState.last ? ' · ' + new Date(syncState.last).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}` : 'off'}</div></div>
    <div class="hint" style="margin-bottom:10px">Your data stays on this device. Sync copies it to your Supabase project (egorflow) under a secret code, so phone and laptop share one War Room. Use the same code on both devices.</div>
    <div class="field"><label>Sync code (16+ characters, keep it secret)</label><div class="inline"><input id="s-code" value="${esc(s.code)}" placeholder="tap Generate or paste from the other device" autocapitalize="off" autocomplete="off"><button class="btn sm" onclick="document.getElementById('s-code').value=genCode()">Generate</button></div></div>
    <details style="margin-bottom:10px"><summary class="small muted" style="cursor:pointer">Supabase project (prefilled)</summary><div class="field" style="margin-top:8px"><label>Project URL</label><input id="s-url" value="${esc(s.url)}"></div><div class="field"><label>Publishable key</label><input id="s-key" value="${esc(s.key)}"></div></details>
    <div class="row"><button class="btn primary grow" onclick="connectSync()">${syncReady() ? 'Save & sync now' : 'Connect'}</button>${syncReady() ? `<button class="btn ghost" onclick="disconnectSync()">Turn off</button>` : ''}</div>${syncState.msg ? `<div class="small red" style="margin-top:8px">${esc(syncState.msg)}</div>` : ''}
    <div class="hint" style="margin-top:10px">One-time setup on the Supabase side: run <span class="mono">supabase/warroom_sync.sql</span> from the repo in the SQL editor of the egorflow project. Until then sync reports an error and the app works locally.</div></div>
    <div class="card"><div class="card-t" style="margin-bottom:8px">Backup</div><div class="row"><button class="btn grow" onclick="exportData()">Export JSON</button><label class="btn grow" style="cursor:pointer">Import<input type="file" accept="application/json" style="display:none" onchange="importData(event)"></label></div><div class="hint" style="margin-top:8px">Export once a week into Drive. Import merges by newest change, so nothing is lost.</div></div>
    <div class="card"><button class="btn danger block" onclick="resetAll()">Reset everything on this device</button></div>`;
}
function genCode() { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); }
function connectSync() { const code = $('s-code').value.trim(); if (code.length < 16) { toast('Code must be 16+ characters'); return; } const u = $('s-url'), k = $('s-key'); S.settings.sync = { url: (u ? u.value.trim() : S.settings.sync.url).replace(/\/$/, ''), key: k ? k.value.trim() : S.settings.sync.key, code }; save(true); pullCloud(false); }
function disconnectSync() { S.settings.sync.code = ''; syncState.status = 'off'; save(true); render(); }
function exportData() { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'warroom_' + dk(new Date()) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function importData(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (!d.days) throw 0; merge(d); save(true); render(); toast('Imported'); } catch { toast('Not a War Room backup'); } }; r.readAsText(f); e.target.value = ''; }
function resetAll() { if (!confirm('Delete ALL local data and restore the defaults? Export first if unsure.')) return; localStorage.removeItem(STORE); S = seed(); save(true); moreTab = 'home'; show('today'); }

/* ───────── modal ───────── */
function openModal(html) { $('modal').innerHTML = `<div style="display:flex;justify-content:flex-end"><button class="iconbtn" onclick="closeModal()" aria-label="Close">×</button></div>` + html; $('modal-bg').classList.add('open'); const f = $('modal').querySelector('input:not([type=date]):not([type=time]),textarea'); if (f && !f.value) setTimeout(() => f.focus(), 50); }
function closeModal() { $('modal-bg').classList.remove('open'); }
$('modal-bg').addEventListener('click', (e) => { if (e.target === $('modal-bg')) closeModal(); });

/* ───────── init ───────── */
load(); render();
if (syncReady()) pullCloud(true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const t = new Date(); t.setHours(0, 0, 0, 0); if (view === 'today' && dk(curDate) < dk(t) && dk(curDate) === dk(addDays(t, -1)) && t.getHours() < 12) curDate = t; render(); if (syncReady()) pullCloud(true); } });
setInterval(() => { if (view === 'today' && isToday(curDate) && !document.activeElement.matches('input,textarea')) render(); }, 60000);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready', 'Reload', () => location.reload()); }); }); }).catch(() => {});
}
