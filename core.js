/* War Room v5 · core: state, data model, sync, derived numbers. Vanilla JS, offline-first. */
'use strict';
const APP_VERSION = '5.10.2';
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
    G('550 dials', 'week', 550, 'dials', '', 'counter:dials:week'), G('20 h BAC study', 'week', 1200, 'min', '', 'counter:bac:week'), G('6 training days', 'week', 6, 'days', '', 'workouts:week'),
  ].forEach((g) => (goals[g.id] = g));
  return {
    v: 1,
    settings: { _u: t, name: 'Egor', wake: '05:20', bed: '21:00', shutdown: '20:45', minDials: 10, minBac: 25, stake: 500, commitStart: dk(new Date()), weightTarget: 85, weightTargetDate: '2027-07-01', bacDate: '2027-06-01', bigDate: '2027-07-01', bigLabel: 'July 1, 2027 · $20k MRR', currency: 'MDL',
      sync: { url: 'https://lajechvmsrmrmfcluhkr.supabase.co', key: 'sb_publishable_E_GGwWPOvnvV_PZDPu95Vg_0_9iqRmE', code: '' } },
    routines: { _u: t,
      morning: [R('weigh', '⚖️ Weigh in (before food and water)', ALL, 'weight'), R('train', '🏋️ Train', ALL, 'train'), R('shower', '🚿 Shower', ALL), R('bac', '📚 BAC study block', ALL), R('eat', '🍳 Breakfast', ALL), R('sun', '☀️ 10 min sunlight outside', ALL), R('pack', '🎒 Pack: lunch box + packed dinner + 1 L water', WK), R('go', '🚗 Leave for school 08:00', WK)],
      evening: [R('dials', '📞 Dials + owner conversations logged', WK), R('bacmin', '📚 BAC minutes logged', ALL), R('tomorrow', '📅 Tomorrow checked: first action is 05:30 train', ALL), R('mag', '💊 Magnesium + water', ALL), R('phone', '📵 Phone charging outside the bedroom', ALL), R('bed', '😴 In bed by 21:00', ALL)] },
    habits: { _u: t, items: [{ id: 'meal', title: '🥗 Ate the plan' }, { id: 'water', title: '💧 2 L+ water' }, { id: 'noshorts', title: '🚫 No short videos' }, { id: 'screens', title: '📴 Screens off 20:45' }, { id: 'read', title: '📖 Read 10 min' }, { id: 'word', title: '🤝 Kept my word today' }] },
    counters: { _u: t, items: [
      { id: 'dials', title: 'Dials', unit: '', targets: [0, 10, 100, 10, 150, 50, 230, 0], weekly: 550, steps: [1, 5, 10], color: 'bad' },
      { id: 'owners', title: 'Owner conversations', unit: '', targets: [0, 0, 0, 0, 0, 0, 0, 0], weekly: 0, steps: [1], color: 'acc' },
      { id: 'bac', title: 'BAC study', unit: 'min', targets: [0, 75, 75, 75, 165, 165, 200, 230], weekly: 1200, steps: [15, 25, 50], color: 'info' },
      { id: 'applicants', title: 'Applicant calls', unit: '', targets: [0, 0, 0, 0, 0, 0, 0, 0], weekly: 0, steps: [1], color: 'ok' },
    ] },
    schedule: { _u: t, blocks },
    programs, programByDay: { _u: t, map: { 1: 'upperA', 2: 'core', 3: 'upperB', 4: 'legs', 5: 'arms', 6: 'upperC', 7: 'recovery' } },
    food: { _u: t, kcal: 3400, p: 170, saved: (typeof FOOD_SAVED_DEFAULT !== 'undefined' ? FOOD_SAVED_DEFAULT : []).map((x) => Object.assign({}, x)) },
    days: {}, tasks: {}, goals, reviews: {}, stakes: {}, session: { _u: 0, active: false }, timer: null,
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
  for (const k of ['shutdown', 'minDials', 'minBac', 'stake', 'commitStart']) if (S.settings[k] === undefined) S.settings[k] = d.settings[k];
  if (!S.stakes) S.stakes = {}; if (!S.session) S.session = { _u: 0, active: false };
  migrate();
  migrateHabits();
  migrateTrain1113();
}
/* ───────── money: same categories as the War Room Google Sheet ───────── */
const MONEY_IN = [['tennis', 'Tennis'], ['agency', 'Agency']];
const MONEY_OUT = [['food', 'Food'], ['transport', 'Transport'], ['out', 'Going out'], ['gym', 'Gym & health'], ['shopping', 'Shopping'], ['business', 'Business'], ['other', 'Other']];
function setMoney(k, key, v) {
  const o = day(k); o.money = o.money || {};
  o.money[key] = v === '' ? '' : Math.max(0, Number(v) || 0);
  const sum = (list) => list.reduce((t, [id]) => t + (Number(o.money[id]) || 0), 0);
  o.income = sum(MONEY_IN); o.spent = sum(MONEY_OUT); touch(o);
}
function moneyFields(k) {
  const o = day(k), m = o.money || {};
  const f = ([id, label]) => `<div class="kv"><span>${label}</span><input type="number" inputmode="numeric" value="${m[id] ?? ''}" placeholder="0" onchange="setMoney('${k}','${id}',this.value)"></div>`;
  return `<div class="small muted" style="margin:6px 0 2px">Made (${S.settings.currency})</div>${MONEY_IN.map(f).join('')}<div class="small muted" style="margin:10px 0 2px">Spent (${S.settings.currency})</div>${MONEY_OUT.map(f).join('')}`;
}

/* ───────── quick spend (cash): one tap from anywhere ───────── */
let spendCat = null;
function spendDefault() { try { return localStorage.getItem('wr-spendcat') || 'food'; } catch { return 'food'; } }
function openSpend() {
  const k = dk(new Date()), o = day(k); spendCat = spendCat || spendDefault();
  const list = (o.spends || []).slice().reverse();
  const lbl = (c) => (MONEY_OUT.find((x) => x[0] === c) || [c, c])[1];
  openModal(`<div class="card-t" style="margin-bottom:4px">💸 Spent cash</div><div class="small muted" style="margin-bottom:12px">Today so far: <b>${Number(o.spent) || 0} ${S.settings.currency}</b></div>
    <input id="sp-amt" type="number" inputmode="decimal" placeholder="0" style="font-size:40px;font-weight:700;text-align:center;padding:14px" onkeydown="if(event.key==='Enter')addSpend()">
    <div class="chips" id="sp-cats" style="margin:14px 0">${MONEY_OUT.map(([id, l]) => `<button class="chip ${id === spendCat ? 'on' : ''}" style="font-size:14px;padding:9px 14px" onclick="spendCat='${id}';document.querySelectorAll('#sp-cats .chip').forEach(c=>c.classList.toggle('on',c.dataset.c==='${id}'))" data-c="${id}">${l}</button>`).join('')}</div>
    <button class="btn primary block" style="min-height:54px;font-size:17px" onclick="addSpend()">Add</button>
    ${list.length ? `<div class="small muted" style="margin:16px 0 6px">Today</div>${list.map((e) => `<div class="kv"><span>${e.at} · ${lbl(e.c)}</span><span><b>${e.a}</b> <button class="btn sm ghost" onclick="delSpend('${e.id}')">×</button></span></div>`).join('')}` : ''}`);
}
function addSpend() {
  const a = Number(($('sp-amt') || {}).value); if (!(a > 0)) { toast('Type an amount'); return; }
  const k = dk(new Date()), o = day(k), c = spendCat || 'food'; o.money = o.money || {}; o.spends = o.spends || [];
  const t = new Date(), id = uid();
  o.spends.push({ id, a, c, at: t.toTimeString().slice(0, 5) });
  setMoney(k, c, (Number(o.money[c]) || 0) + a);
  try { localStorage.setItem('wr-spendcat', c); } catch {}
  closeModal(); render();
  toast(`−${a} ${(MONEY_OUT.find((x) => x[0] === c) || [, c])[1]} · today ${o.spent}`, 'Undo', () => delSpend(id, true));
}
function delSpend(id, quiet) {
  const k = dk(new Date()), o = day(k); const e = (o.spends || []).find((x) => x.id === id); if (!e) return;
  o.spends = o.spends.filter((x) => x.id !== id);
  setMoney(k, e.c, Math.max(0, (Number((o.money || {})[e.c]) || 0) - e.a));
  render(); if (!quiet) openSpend(); else toast('Removed');
}

/* ───────── migrations ───────── */
/* 8 Nov 2026: the company is priority #1. EgorFlow → Caregiver Bench. BAC: pass with 8+, not 9+.
   Freed BAC time goes to company deep work (AI screener, call lists, script). Runs once per device. */
function migrate() {
  S.migrations = S.migrations || {};
  if (S.migrations.m20261108) return;
  const t = now();
  for (const id in S.goals) {
    const g = S.goals[id]; if (!g || g._del) continue;
    if (/EgorFlow MRR/i.test(g.title)) { g.title = 'Caregiver Bench MRR'; g._u = t; }
    if (/^BAC average 9\+/i.test(g.title)) { g.title = 'BAC: pass with an 8+ average (finish it, not perfect it)'; g.target = 8; g._u = t; }
    if (/^20 h BAC study/i.test(g.title)) { g.title = '8 h BAC study'; g.target = 500; g._u = t; }
    if (/^Owner conversations/i.test(g.title)) { g.title = '100 owner conversations (review 8 Dec)'; g.deadline = '2026-12-08'; g._u = t; }
  }
  if (!Object.values(S.goals).some((g) => g && /first 3 paying agencies/i.test(g.title))) {
    const id = 'g-first3'; S.goals[id] = { id, _u: t, title: 'First 3 paying agencies (Stage 1 gate)', horizon: 'long', target: 3, unit: 'agencies', deadline: '2027-03-01', source: 'manual', current: null, done: false };
  }
  const bac = S.counters.items.find((c) => c.id === 'bac');
  if (bac) { bac.targets = [0, 25, 25, 25, 115, 115, 110, 90]; bac.weekly = 500; }
  const ow = S.counters.items.find((c) => c.id === 'owners');
  if (ow) { ow.targets = [0, 5, 5, 5, 5, 5, 0, 0]; ow.weekly = 25; }
  S.counters._u = t;
  const bl = S.schedule.blocks; const add = [];
  for (const b of bl) {
    if (b.kind === 'bac' && b.start === '06:15' && b.end === '07:30') {
      b.title = '📚 BAC: Anki (25 min)'; b.end = '06:40'; b.note = 'Minimum BAC for the day. Then straight into company work.';
      add.push({ id: uid(), title: '🏗 Company deep work: AI screener · call list · script', start: '06:40', end: '07:30', days: b.days.slice(), kind: 'agency', note: 'Phone away. Florida is asleep, so build: the screener, tomorrow\'s numbers, the script.' });
    }
    if (b.kind === 'bac' && b.start === '06:00' && b.end === '09:00' && b.days.includes(7)) {
      b.title = '📚 BAC: corectare test + plan'; b.end = '07:00';
      add.push({ id: uid(), title: '🏗 Company deep work: build + week plan', start: '07:00', end: '09:00', days: [7], kind: 'agency', note: 'Biggest build block of the week.' });
    }
    if (b.kind === 'bac' && b.start === '17:00' && b.end === '18:30' && b.days.includes(6)) {
      b.title = '🧑‍⚕️ Caregiver Bench: applicants + screener testing'; b.kind = 'agency'; b.note = 'Florida Saturday 10:00. Freed from BAC on 8 Nov.';
    }
    b.title = b.title.replace(/EgorFlow/g, 'Caregiver Bench');
  }
  bl.push(...add); S.schedule._u = t;
  S.settings.bigLabel = 'July 1, 2027 · $20k MRR · Caregiver Bench'; S.settings._u = t;
  S.migrations.m20261108 = t;
  save(true);
}
function migrateHabits() {
  if (S.migrations.m20261108b) return;
  S.habits.items = [
    { id: 'sleep', title: '😴 Sleep (bed 21:00, 8 h)' }, { id: 'train', title: '🏋️ Train' },
    { id: 'foodwater', title: '🥗 Food & Water' }, { id: 'sun', title: '☀️ Sun' },
    { id: 'digital', title: '📴 Digital Protocol' }, { id: 'honor', title: '🤝 Honor Check' },
    { id: 'deep', title: '🏗 Deep Work (company)' }];
  S.habits._u = now(); S.migrations.m20261108b = now(); save(true);
}
/* 13 Nov 2026: programs synced to the training plan remade on 12 Nov (calendar "OFP" + "🏋️ Train" events).
   Mon/Wed/Fri = team OFP 15:30 (real gym strength · club room speed · real gym power + upper body).
   Mon/Wed/Fri 05:30 = light mobility + neck (kept as its own program). Old home programs stay, unscheduled on M/W/F. */
function migrateTrain1113() {
  if (S.migrations.m20261113t) return;
  const t = now(), ex = (n, s, r, note) => ({ n, s, r, note: note || '' });
  const rules = 'Legs low-volume, never to failure: TT is right after. Add a little weight or one rep every week. Fast reps, power over size, both sides even. If the team does something different, follow the team and keep these rules. 1 L water + electrolytes.';
  S.programs.ofpMon = { _u: t, name: 'OFP Mon · real gym · strength', note: rules, ex: [
    ex('Trap-bar deadlift or squat', 3, '5'), ex('Bulgarian split squat', 3, '6 /leg'), ex('Weighted pull-ups', 4, '5'),
    ex('Dumbbell overhead press', 3, '6'), ex('Farmer carries', 3, '30 m'), ex('Neck curls + extensions', 2, '15') ] };
  S.programs.ofpWed = { _u: t, name: 'OFP Wed · club room · speed', note: rules, ex: [
    ex('Sprints', 6, '10–20 m', 'Full rest between.'), ex('Side bounds + broad jumps', 3, '5'), ex('Kettlebell swings (15 kg)', 3, '10', 'Fast.'),
    ex('Rotational throws, both sides', 3, '6', 'If there is a med ball.'), ex('Back extensions', 2, '12') ] };
  S.programs.ofpFri = { _u: t, name: 'OFP Fri · real gym · power + upper body', note: rules, ex: [
    ex('Box jumps', 4, '3'), ex('Front squat, moderate weight, fast reps', 3, '5'), ex('Cable woodchops', 3, '8 /side'),
    ex('Heavy rows', 4, '6–8'), ex('Incline dumbbell press', 3, '8'), ex('Shrugs + face pulls', 3, '10 + 15', 'Face pulls 2 sets.') ] };
  S.programs.mobility = { _u: t, name: 'Mobility + neck (05:30, light)', note: '15–20 min, LIGHT: save everything for OFP + TT. Warm-up: foam roll upper back 1 min · 3 world\'s greatest stretch/side · 15 band pull-aparts. Bad day: A only.', ex: [
    ex('A Mobility: couch stretch · 90/90 hips · open book · sleeper stretch · ankle rocks', 1, '8 min'),
    ex('B Wrist curls + reverse curls + rotations', 2, '15 each', 'Light dumbbell.'),
    ex('C Neck nods off the bed edge, face up + face down', 2, '15 each', 'No weight, no jerking.'), ex('D Dead hang', 2, '30–60 s') ] };
  Object.assign(S.programByDay.map, { 1: 'ofpMon', 3: 'ofpWed', 5: 'ofpFri' }); S.programByDay._u = t;
  for (const b of S.schedule.blocks) {
    if (b.kind === 'tennis' && /^OFP/.test(b.title)) { b.title = 'OFP (team)'; b.note = 'Mon: real gym strength · Wed: club room speed · Fri: real gym power + upper body.'; }
    if (b.kind === 'train' && b.start === '05:30' && b.days.some((d) => [1, 3, 5].includes(d))) b.days = b.days.filter((d) => ![1, 3, 5].includes(d));
  }
  S.schedule.blocks = S.schedule.blocks.filter((b) => !(b.kind === 'train' && b.start === '05:30' && !b.days.length));
  S.schedule.blocks.push({ id: uid(), title: '🏋️ Train: Mobility + neck (light)', start: '05:30', end: '06:00', days: [1, 3, 5], kind: 'train', note: 'Light. The real session is OFP at 15:30.' });
  S.schedule._u = t; S.migrations.m20261113t = t; save(true);
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
function sessionsRO(o) { if (!o) return []; return o.workouts || (o.workout ? [o.workout] : []); }
function sessionsOf(o) { if (!o.workouts) { o.workouts = o.workout ? [o.workout] : []; delete o.workout; } return o.workouts; }
let trainSel = -1;
function curSession(o) { const ss = sessionsOf(o); if (!ss.length) ss.push({ id: uid(), kind: 'program', program: S.programByDay.map[dow(curDate)] || '', sets: {}, done: false, note: '' }); ss.forEach((s) => { if (!s.id) s.id = uid(); if (!s.kind) s.kind = 'program'; }); const i = trainSel >= 0 && trainSel < ss.length ? trainSel : ss.length - 1; return ss[i]; }
function W(o) { return curSession(o); }
function dayTrained(o) { return sessionsRO(o).some((s) => s.done); }
function workoutsWeek(d) { const m = monday(d); let n = 0; for (let i = 0; i < 7; i++) { const o = S.days[dk(addDays(m, i))]; if (o && dayTrained(o)) n++; } return n; }
function routineFor(list, d) { const w = dow(d); return list.filter((r) => !r.days || r.days.includes(w)); }
function rState(o, id) { const v = o && o.routine ? o.routine[id] : 0; if (typeof v === 'string' && v.startsWith('skip')) return 'skip'; return v ? 'done' : ''; }
function rSkipReason(o, id) { const v = o.routine[id]; return typeof v === 'string' ? v.replace(/^skip:?/, '') : ''; }
function blocksFor(d) { const w = dow(d), o = S.days[dk(d)], sc = o && o.sched; const cb = typeof calBlocks === 'function' ? calBlocks(d) : null; let list = cb || S.schedule.blocks.filter((b) => b.days.includes(w)); if (sc) { const skip = new Set(sc.skip || []); list = list.filter((b) => !skip.has(b.id)).concat((sc.add || []).map((b) => Object.assign({}, b, { once: true }))); } return list.sort((a, b) => tmin(a.start) - tmin(b.start) || tmin(a.end) - tmin(b.end)); }
function dayOnce(d) { const o = day(d); if (!o.sched) o.sched = { skip: [], add: [] }; return o.sched; }
function resetDaySchedule() { const o = day(curDate); delete o.sched; touch(o); toast('Regular schedule restored for ' + fmtShort(curDate)); render(); }
function dialTargetFor(d) { const o = S.days[dk(d)]; if (o && o.targets && o.targets.dials != null && o.targets.dials !== '') return Math.max(0, Number(o.targets.dials) || 0); const ct = typeof calDialTarget === 'function' ? calDialTarget(dk(d)) : null; if (ct != null) return ct; const c = S.counters.items.find((x) => x.id === 'dials'); return c ? c.targets[dow(d)] || 0 : 0; }
function dayScore(d) {
  const o = S.days[dk(d)] || { routine: {}, habits: {}, counters: {}, top3: [] };
  let tot = 0, done = 0;
  routineFor(S.routines.morning, d).concat(routineFor(S.routines.evening, d)).forEach((r) => { const st = rState(o, r.id); if (st === 'skip') return; tot++; if (st === 'done') done++; });
  S.habits.items.forEach((h) => { tot++; if (o.habits && o.habits[h.id]) done++; });
  S.counters.items.forEach((c) => { const tg = c.id === 'dials' ? dialTargetFor(d) : c.targets[dow(d)] || 0; if (tg > 0) { tot++; if ((Number(o.counters && o.counters[c.id]) || 0) >= tg) done++; } });
  (o.top3 || []).forEach((x) => { if (x.t) { tot++; if (x.d) done++; } });
  return tot ? Math.round((done / tot) * 100) : 0;
}
function tasksList() { return Object.values(S.tasks).filter((t) => !t._del); }
let view = 'now', curDate = new Date(); curDate.setHours(0, 0, 0, 0);
/* ───────── TODAY (phase-aware) ───────── */
function morningDone(d) { const o = day(d); return routineFor(S.routines.morning, d).every((r) => rState(o, r.id)); }
function phaseFor(d) { if (!isToday(d)) return dk(d) < dk(new Date()) ? 'past' : 'future'; const nm = nowMin(); if (nm >= tmin(S.settings.shutdown || '20:45')) return 'evening'; if (nm < 12 * 60 && !morningDone(d)) return 'morning'; return 'day'; }
const secOpen = {};
function toggleSec(n) { const el = $('sec-' + n); if (!el) return; const open = el.classList.contains('hidden'); el.classList.toggle('hidden', !open); secOpen[n] = open; }
function sec(id, title, right, body, open) { const isOpen = secOpen[id] != null ? secOpen[id] : open; return `<div class="card"><div class="card-h" onclick="toggleSec('${id}')" style="cursor:pointer;margin-bottom:${isOpen ? 10 : 0}px"><div class="card-t">${title}</div><div class="card-r">${right} <span class="dim">${isOpen ? '▾' : '▸'}</span></div></div><div id="sec-${id}" class="${isOpen ? '' : 'hidden'}">${body}</div></div>`; }

function weighCard(o, k, d) {
  const last = latestWeight(k), avg7 = avgWeight(7, k), prev7 = avgWeight(7, dk(addDays(d, -7)));
  if (o.weighEdit) {
    const start = o.weight != null && o.weight !== '' ? o.weight : (last ? last.w : 75);
    return `<div class="card ac"><div class="card-h"><div class="card-t">⚖️ Morning weigh-in</div><div class="card-r">${last ? `last <b>${fmt(last.w, 1)}</b> · ${fmtShort(pd(last.k))}` : 'first entry'}</div></div>
      <div class="weigh-big"><button class="stepbtn" onclick="stepWeight(-0.1)">−</button><input id="w-inp" type="number" inputmode="decimal" step="0.1" value="${Number(start).toFixed(1)}" onkeydown="if(event.key==='Enter')saveWeight()"><span class="unit">kg</span><button class="stepbtn" onclick="stepWeight(0.1)">+</button></div>
      <div class="weigh-stats"><span>7-day avg <b>${avg7 ? fmt(avg7, 1) : '—'}</b></span><span>target <b>${S.settings.weightTarget}</b></span><span>to go <b>${avg7 ? fmt(S.settings.weightTarget - avg7, 1) : (last ? fmt(S.settings.weightTarget - last.w, 1) : '—')}</b> kg</span><span>🔥 <b>${streakWeigh()}</b>d</span></div>
      <div class="row"><button class="btn primary grow" onclick="saveWeight()">Save weight</button>${o.weighEdit ? `<button class="btn ghost" onclick="cancelWeight()">Cancel</button>` : `<button class="btn ghost" onclick="skipWeight()">Skip</button>`}</div></div>`;
  }
  if (o.weight == null || o.weight === '') return `<div class="card warn" onclick="weightModal()" style="cursor:pointer;padding:10px 16px"><div class="row sb"><div class="small"><b class="amber">No weigh-in</b> <span class="muted">· tap to add</span></div><div class="dim">✎</div></div></div>`;
  const diff = avg7 && prev7 ? avg7 - prev7 : null;
  return `<div class="card" onclick="weightModal()" style="cursor:pointer;padding:12px 16px"><div class="weigh-compact"><div class="val">${fmt(o.weight, 1)}<small>kg</small></div><div class="grow small muted">7-day avg <b class="acc">${avg7 ? fmt(avg7, 1) : '—'}</b>${diff != null ? ` · <span class="${diff >= 0 ? 'ok' : 'bad'}">${diff >= 0 ? '+' : ''}${fmt(diff, 1)}</span> vs last week` : ''}<br>${fmt(S.settings.weightTarget - (avg7 || o.weight), 1)} kg to ${S.settings.weightTarget} · 🔥 ${streakWeigh()}-day streak</div><div class="dim">✎</div></div></div>`;
}
function stepWeight(s) { const i = $('w-inp'); i.value = (Number(i.value || 0) + s).toFixed(1); }
function saveWeight() { const v = num($('w-inp').value); if (v == null || v < 30 || v > 200) { toast('Enter a weight between 30 and 200 kg'); return; } const o = day(curDate); o.weight = Math.round(v * 10) / 10; delete o.weighEdit; delete o.weightSkipped; S.routines.morning.filter((r) => r.link === 'weight').forEach((r) => (o.routine[r.id] = 1)); touch(o); toast('Saved · ' + fmt(v, 1) + ' kg. Next: train.'); render(); }
function editWeight() { const o = day(curDate); o.weighEdit = true; render(); }
function cancelWeight() { const o = day(curDate); delete o.weighEdit; render(); }
function skipWeight() { const o = day(curDate); o.weightSkipped = true; touch(o); render(); }
function focusMorning(o, d) {
  const items = routineFor(S.routines.morning, d); const idx = items.findIndex((r) => !rState(o, r.id)); if (idx < 0) return '';
  const cur = items[idx], next = items[idx + 1]; const nm = nowMin(); const blk = blocksFor(d).find((b) => tmin(b.start) <= nm && nm < tmin(b.end));
  return `<div class="card ac focus"><div class="card-h"><div class="card-t">Step ${idx + 1} of ${items.length}</div><div class="card-r">${blk ? `now: ${esc(blk.title)} · until ${blk.end}` : ''}</div></div>
    <div class="focus-t">${esc(cur.title)}</div>${stepHint(cur) ? `<div class="small muted" style="margin-top:4px">One tap ${stepHint(cur)} and ticks this step.</div>` : ''}
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary lg grow" onclick="routineDo('${cur.id}')">${{ weight: 'Enter weight', train: 'Done ✓', meal: 'Ate it ✓', bac: 'Log minutes', dials: 'Confirm numbers' }[stepKind(cur)] || 'Done ✓'}</button><button class="btn lg" onclick="skipRoutine('${cur.id}')">Skip</button></div>
    <div class="row sb small muted" style="margin-top:10px"><span>${next ? `Next: <b>${esc(next.title)}</b>` : 'Last step. Then out the door.'}</span><a href="#" class="xs dim" onclick="skipRestOfMorning();return false">overslept · skip the rest</a></div></div>`;
}
function paceNeed(c, d) { const w = dow(d); const rem = ALL.filter((x) => x >= w && (c.targets[x] || 0) > 0).length; if (!rem || !c.weekly) return null; return Math.ceil(Math.max(0, c.weekly - counterWeek(c.id, d)) / rem); }
function shutdownCard(o, d) {
  const g = gradeFor(d), m = minimumMet(d);
  if (o.shutdownAt) return `<div class="card"><div class="row sb"><div><div style="font-weight:700">Day closed · grade ${g}</div><div class="small muted">${m.met ? 'Minimum met. ' : `<span class="bad">Minimum missed.</span> `}Magnesium, phone out, bed ${S.settings.bed}.</div></div><button class="btn sm" onclick="startShutdown()">Reopen</button></div></div>`;
  return `<div class="card ac"><div class="card-h"><div class="card-t">🌙 Shutdown</div><div class="card-r">5 minutes</div></div><div class="small muted" style="margin-bottom:10px">Log the numbers, tick the standards, a 30-second debrief, look at tomorrow, then phone out.${!m.met ? ` <span class="bad">Minimum not met yet: ${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC.</span>` : ''}</div><button class="btn primary lg block" onclick="startShutdown()">Start shutdown</button></div>`;
}
function oneChangeBanner(d) { const prev = S.reviews[weekKey(addDays(monday(d), -7))]; if (!prev || !prev.change) return ''; return `<div class="card" style="padding:10px 16px;border-color:rgba(169,140,255,.4)"><div class="xs purple" style="letter-spacing:.1em;font-weight:700">This week's one change</div><div class="small">${esc(prev.change)}</div></div>`; }
function routineCard(key, d, o, open) {
  const items = routineFor(S.routines[key], d); if (!items.length) return ''; const done = items.filter((r) => rState(o, r.id) === 'done').length, skipped = items.filter((r) => rState(o, r.id) === 'skip').length; const curIdx = items.findIndex((r) => !rState(o, r.id));
  return sec(key, `${key} routine`, `<b>${done}</b>/${items.length - skipped}${skipped ? ` <span class="dim">· ${skipped} skipped</span>` : ''} ${done === items.length - skipped ? '✓' : ''}`, items.map((r, i) => { const st = rState(o, r.id); return `<div class="ck ${st === 'done' ? 'on' : ''} ${st === 'skip' ? 'done' : ''} ${i === curIdx && isToday(d) ? 'cur' : ''}" onclick="routineDo('${r.id}')"><div class="box ${st === 'skip' ? 'round' : ''}">${st === 'done' ? '✓' : st === 'skip' ? '–' : ''}</div><div class="lbl">${esc(r.title)}${!st && stepHint(r) ? `<span class="sub">${stepHint(r)}</span>` : ''}${st === 'skip' ? `<span class="sub">skipped${rSkipReason(o, r.id) ? ' · ' + esc(rSkipReason(o, r.id)) : ''}</span>` : ''}</div>${st ? '' : `<button class="edit" title="Skip" onclick="event.stopPropagation();skipRoutine('${r.id}')">↷</button>`}</div>`; }).join(''), open);
}
function scoreboardCard(o, d) {
  const w = dow(d); const cs = S.counters.items.filter((c) => !['dials', 'owners'].includes(c.id)).filter((c) => (c.targets[w] || 0) > 0 || (o.counters[c.id] || 0) > 0 || c.weekly > 0 || c.id === 'owners'); if (!cs.length) return '';
  return `<div class="card"><div class="card-h"><div class="card-t">📚 Study &amp; counters</div><div class="card-r">week of ${fmtShort(monday(d))}</div></div>${cs.map((c) => { const v = Number(o.counters[c.id]) || 0, tg = c.targets[w] || 0, wk = counterWeek(c.id, d), tot = counterTotal(c.id); const timed = c.unit === 'min';
    return `<div class="counter"><div class="top"><div class="name">${esc(c.title)}</div><div class="num">${v}${tg ? `<small> / ${tg}${c.unit ? ' ' + c.unit : ''}</small>` : (c.unit ? `<small> ${c.unit}</small>` : '')}</div></div>
      ${tg ? `<div class="bar"><i class="${c.color || ''}" style="width:${clamp((v / tg) * 100, 0, 100)}%"></i></div>` : ''}
      <div class="btns">${timed ? `<button class="btn" onclick="startTimer('${c.id}',25)">▶ 25</button><button class="btn" onclick="startTimer('${c.id}',50)">▶ 50</button>` : ''}${c.steps.slice(0, timed ? 2 : 3).map((s) => `<button class="btn" onclick="bump('${c.id}',${s})">+${s}</button>`).join('')}<button class="btn" onclick="bump('${c.id}',-${c.steps[0]})">−${c.steps[0]}</button><button class="btn" onclick="setCounter('${c.id}')">=</button></div>
      <div class="wk">${c.weekly ? `<span>week <b>${wk}</b> / ${c.weekly}${c.unit ? ' ' + c.unit : ''} ${wk >= c.weekly ? '✓' : `· ${c.weekly - wk} left`}</span>` : `<span>week <b>${wk}</b></span>`}<span>all time <b>${tot}</b></span></div></div>`; }).join('')}</div>`;
}
function top3Card(o, k, d) {
  const due = tasksList().filter((t) => !t.done && t.due && t.due <= k).sort((a, b) => a.due.localeCompare(b.due));
  return `<div class="card top3"><div class="card-h"><div class="card-t">Top 3 for the day</div><div class="card-r">${o.top3.filter((x) => x.d).length}/${o.top3.filter((x) => x.t).length || 3}</div></div>${o.top3.map((x, i) => `<div class="item ${x.d ? 'on' : ''}"><div class="n">${i + 1}</div><input value="${esc(x.t)}" placeholder="${['Most important thing…', 'Second…', 'Third…'][i]}" oninput="setTop3(${i},this.value)"><div class="box" onclick="toggleTop3(${i})">${x.d ? '✓' : ''}</div></div>`).join('')}
    ${due.length ? `<div class="sec-h">Tasks due</div>${due.map((t) => taskRow(t, k)).join('')}` : ''}<div class="row" style="margin-top:8px"><input id="quick-task" placeholder="+ task for ${isToday(d) ? 'today' : fmtShort(d)}" onkeydown="if(event.key==='Enter')quickTask('${k}')"></div></div>`;
}
function standardsCard(o) { const short = (t) => t.replace(/\s*\(.*?\)\s*/g, '').replace(/ Protocol| Check/g, ''); return `<div class="card"><div class="card-h"><div class="card-t">Standards</div><div class="card-r"><b>${S.habits.items.filter((h) => o.habits[h.id]).length}</b>/${S.habits.items.length}</div></div><div class="habits compact">${S.habits.items.map((h) => `<div class="habit ${o.habits[h.id] ? 'on' : ''}" onclick="toggleHabit('${h.id}')" title="${esc(h.title)}"><div class="b">${o.habits[h.id] ? '✓' : ''}</div><span>${esc(short(h.title))}</span></div>`).join('')}</div></div>`; }
function moneyCard(o, d) {
  const cur = S.settings.currency, today = isToday(d), k = dk(d);
  return `<div class="card flat"><div class="row sb"><div><div class="card-t">Money</div><div style="font-weight:700;margin-top:2px">made <span class="ok">${Number(o.income) || 0}</span> · spent <span class="bad">${Number(o.spent) || 0}</span> <span class="small muted">${cur}</span></div></div><div class="row" style="gap:6px"><button class="btn sm" onclick="incomeModal('${k}')">+ Made</button><button class="btn sm primary" onclick="openSpend()">💸 Spent</button></div></div></div>`;
}
function incomeModal(k) {
  const o = day(k), m = o.money || {};
  openModal(`<h2>Money made · ${fmtShort(pd(k))}</h2><div class="g2">${MONEY_IN.map(([id, l]) => `<div class="field"><label>${l}</label><input id="inc-${id}" type="number" inputmode="numeric" value="${m[id] ?? ''}" placeholder="0"></div>`).join('')}</div>
    <div class="sec-h">Spent by category</div><div class="g2">${MONEY_OUT.map(([id, l]) => `<div class="field" style="margin-bottom:8px"><label>${l}</label><input id="inc-${id}" type="number" inputmode="numeric" value="${m[id] ?? ''}" placeholder="0"></div>`).join('')}</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="${MONEY_IN.concat(MONEY_OUT).map(([id]) => `setMoney('${k}','${id}',document.getElementById('inc-${id}').value);`).join('')}closeModal();render()">Save</button></div>`);
}
function debriefBody(o) { return `<div class="field"><label>Win</label><input value="${esc(o.win || '')}" placeholder="What worked today?" oninput="setDayField('win',this.value)"></div><div class="field"><label>Loss</label><input value="${esc(o.loss || '')}" placeholder="Where did I break my word?" oninput="setDayField('loss',this.value)"></div><div class="field" style="margin:0"><label>Fix for tomorrow</label><input value="${esc(o.fix || '')}" placeholder="One change" oninput="setDayField('fix',this.value)"></div>`; }
function gradeCard(d) {
  const sc = dayScore(d), g = gradeFor(d), m = minimumMet(d);
  const st = [['⚖️', streakWeigh(), 'weigh-ins'], ['📞', streakMinimum(), 'minimum days'], ['🌅', streakMorning(), 'full mornings'], ['😴', streakBed(), `bed ${S.settings.bed}`]];
  const col = g === 'A' ? 'var(--acc)' : g === 'B' ? 'var(--ok)' : g === 'C' ? 'var(--acc)' : 'var(--bad)';
  return `<div class="card flat"><div class="row sb" onclick="toggleSec('streaks')" style="cursor:pointer"><div class="row"><span style="font-size:26px;font-weight:800;color:${col};width:34px">${g}</span><div><div style="font-weight:700">Day grade · ${sc}%</div><div class="xs muted">${m.met ? 'Minimum met' : `Minimum: ${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC`}</div></div></div><span class="dim">${secOpen.streaks ? '▾' : '▸'}</span></div>
    <div id="sec-streaks" class="${secOpen.streaks ? '' : 'hidden'}"><div class="chips" style="margin-top:12px">${st.map(([ic, n, l]) => `<span class="chip ${n > 0 ? 'on' : ''}">${ic} ${n}d <span class="dim">${l}</span></span>`).join('')}</div></div></div>`;
}
function sleepDur(a, b) { let m = tmin(b) - tmin(a); if (m < 0) m += 1440; return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; }
function toggleRoutine(id) { const o = day(curDate); o.routine[id] = rState(o, id) ? 0 : 1; touch(o); render(); }
function skipRoutine(id) {
  const all = S.routines.morning.concat(S.routines.evening), r = all.find((x) => x.id === id); if (!r) return;
  openModal(`<h2>Skip · ${esc(r.title)}</h2><div class="small muted" style="margin-bottom:10px">Skipped steps don't count against your day. Tap it again later to mark it done.</div><div class="chips">${['Not today', 'No time', 'Sick', 'Travelling', 'Already done elsewhere', 'Overslept'].map((x) => `<span class="chip" onclick="setRoutineSkip('${id}','${x}')">${x}</span>`).join('')}</div><div class="field" style="margin-top:12px"><label>Or your reason</label><div class="inline"><input id="m-skipwhy" placeholder="optional"><button class="btn" onclick="setRoutineSkip('${id}',document.getElementById('m-skipwhy').value)">Skip</button></div></div>`);
}
function setRoutineSkip(id, why) { const o = day(curDate); o.routine[id] = 'skip:' + (why || '').trim(); touch(o); closeModal(); render(); }
function skipRestOfMorning() { const o = day(curDate); routineFor(S.routines.morning, curDate).forEach((r) => { if (!rState(o, r.id)) o.routine[r.id] = 'skip:overslept'; }); touch(o); toast('Morning closed. The day starts now.'); render(); }
function toggleHabit(id) { const o = day(curDate); o.habits[id] = o.habits[id] ? 0 : 1; touch(o); render(); }
function bump(id, n) { const o = day(curDate); o.counters[id] = Math.max(0, (Number(o.counters[id]) || 0) + n); touch(o); render(); }
function setCounter(id) { const o = day(curDate); const c = S.counters.items.find((x) => x.id === id); const v = prompt('Set ' + c.title + ' for ' + fmtShort(curDate), o.counters[id] || 0); if (v == null) return; o.counters[id] = Math.max(0, num(v) || 0); touch(o); render(); }
function setTop3(i, v) { const o = day(curDate); o.top3[i].t = v; touch(o); }
function toggleTop3(i) { const o = day(curDate); if (!o.top3[i].t) return; o.top3[i].d = o.top3[i].d ? 0 : 1; touch(o); render(); }
function setDayField(f, v) { const o = day(curDate); o[f] = v; touch(o); }
/* ───────── GRADE · MINIMUM · STREAKS · STAKES ───────── */
function minimumMet(d) { const o = S.days[dk(d)], w = dow(d), st = S.settings; const dials = o ? Number((o.counters || {}).dials) || 0 : 0, bac = o ? Number((o.counters || {}).bac) || 0 : 0; const dcT = dialTargetFor(d); const needDials = WK.includes(w) ? Math.min(st.minDials || 0, dcT || st.minDials || 0) : 0, needBac = st.minBac || 0; return { met: dials >= needDials && bac >= needBac, dials, bac, needDials, needBac }; }
function gradeFor(d) { const sc = dayScore(d); let g = sc >= 85 ? 'A' : sc >= 70 ? 'B' : sc >= 50 ? 'C' : sc >= 30 ? 'D' : 'F'; if (dk(d) < dk(new Date()) && S.days[dk(d)] && !minimumMet(d).met && 'ABC'.includes(g)) g = 'D'; return g; }
function streak(pred) { let d = new Date(); d.setHours(0, 0, 0, 0); if (!pred(d)) d = addDays(d, -1); let n = 0; while (n < 3650 && pred(d)) { n++; d = addDays(d, -1); } return n; }
function streakWeigh() { return streak((d) => { const o = S.days[dk(d)]; return !!(o && o.weight != null && o.weight !== ''); }); }
function streakMinimum() { return streak((d) => !!S.days[dk(d)] && minimumMet(d).met && (Number(S.days[dk(d)].counters.dials) || Number(S.days[dk(d)].counters.bac))); }
function streakMorning() { return streak((d) => { const o = S.days[dk(d)]; return !!o && routineFor(S.routines.morning, d).every((r) => rState(o, r.id) === 'done'); }); }
function streakBed() { return streak((d) => { const o = S.days[dk(d)]; return !!(o && o.routine && o.routine.bed); }); }
function evaluateStakes() {
  const st = S.settings; if (!st.commitStart || !st.stake) return; if (!S.stakes) S.stakes = {};
  let d = pd(st.commitStart); const floor = addDays(new Date(), -60); if (d < floor) d = floor; const y = addDays(new Date(), -1); y.setHours(0, 0, 0, 0); let changed = false;
  while (d <= y) { const k = dk(d); if (!S.stakes[k]) { const m = minimumMet(d); if (!m.met) { S.stakes[k] = { _u: now(), amount: st.stake, paid: false, reason: `${m.dials}/${m.needDials} dials · ${m.bac}/${m.needBac} min BAC` }; changed = true; } } d = addDays(d, 1); }
  if (changed) save();
}
function stakesOwed() { return Object.keys(S.stakes || {}).filter((k) => !S.stakes[k].paid && !S.stakes[k].waived).reduce((a, k) => a + (S.stakes[k].amount || 0), 0); }
function stakeAlert() { const y = dk(addDays(new Date(), -1)); const s = (S.stakes || {})[y]; const owed = stakesOwed(); if (!s || s.paid || s.waived) return owed ? `<div class="card" style="padding:10px 16px;border-color:rgba(255,92,108,.35)" onclick="moreTab='stakes';show('more')"><div class="row sb small"><span><b class="bad">${fmt(owed)} ${S.settings.currency}</b> <span class="muted">in unpaid stakes</span></span><span class="dim">›</span></div></div>` : ''; return `<div class="card" style="border-color:var(--red);cursor:pointer" onclick="moreTab='stakes';show('more')"><div class="row sb"><div><div style="font-weight:700" class="bad">Yesterday: minimum missed</div><div class="small muted">${esc(s.reason)} · ${fmt(s.amount)} ${S.settings.currency} stake owed${owed > s.amount ? ` · ${fmt(owed)} total` : ''}. Own it, pay it, move.</div></div><div class="dim">›</div></div></div>`; }
function renderStakes() {
  const st = S.settings, ks = Object.keys(S.stakes || {}).sort().reverse();
  return `<div class="card"><div class="card-h"><div class="card-t">The deal</div><div class="card-r">${fmt(stakesOwed())} ${st.currency} owed</div></div><div class="hint" style="margin-bottom:10px">Minimum day, when everything breaks: ${st.minDials} dials (Mon–Fri) + ${st.minBac} min BAC. Never zero. Each missed day costs ${st.stake} ${st.currency}. Missed days are added automatically the next morning.</div>
    <div class="kv"><span>Min dials (weekdays)</span><input type="number" inputmode="numeric" value="${st.minDials}" onchange="S.settings.minDials=Number(this.value)||0;S.settings._u=Date.now();save()"></div>
    <div class="kv"><span>Min BAC minutes</span><input type="number" inputmode="numeric" value="${st.minBac}" onchange="S.settings.minBac=Number(this.value)||0;S.settings._u=Date.now();save()"></div>
    <div class="kv"><span>Stake per missed day</span><input type="number" inputmode="numeric" value="${st.stake}" onchange="S.settings.stake=Number(this.value)||0;S.settings._u=Date.now();save()"></div>
    <div class="kv"><span>Counting since</span><input type="date" value="${st.commitStart}" onchange="S.settings.commitStart=this.value;S.settings._u=Date.now();save();render()"></div></div>
    <div class="card"><div class="card-t" style="margin-bottom:6px">Ledger</div>${ks.length ? ks.map((k) => { const s = S.stakes[k]; return `<div class="kv"><div><div class="${s.paid || s.waived ? 'muted' : ''}">${fmtDate(pd(k))}</div><div class="xs muted">${esc(s.reason)}${s.waived ? ' · waived' : s.paid ? ' · paid' : ''}</div></div><div class="row" style="gap:6px">${s.paid || s.waived ? `<span class="v muted">${fmt(s.amount)}</span>` : `<button class="btn sm" onclick="S.stakes['${k}'].paid=true;S.stakes['${k}']._u=Date.now();save();render()">Paid ${fmt(s.amount)}</button><button class="btn sm ghost" onclick="if(confirm('Waive this stake? Only for a real reason (sick, travel).')){S.stakes['${k}'].waived=true;S.stakes['${k}']._u=Date.now();save();render()}">Waive</button>`}</div></div>`; }).join('') : '<div class="empty">No missed days. Keep it that way.</div>'}</div>`;
}

/* ───────── DIAL SESSION ───────── */
let sessTimer = null;
function fmtEl(sec) { return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
function startSession() { if (!S.session || !S.session.active) { const o = day(curDate); S.session = { _u: now(), active: true, start: now(), date: dk(curDate), d0: Number(o.counters.dials) || 0, o0: Number(o.counters.owners) || 0 }; save(true); } renderSession(); }
function renderSession() {
  const s = S.session, o = day(s.date), c = S.counters.items.find((x) => x.id === 'dials'); const dd = pd(s.date), tg = dialTargetFor(dd);
  const v = Number(o.counters.dials) || 0, ow = Number(o.counters.owners) || 0, sd = v - s.d0, so = ow - s.o0; const nm = nowMin();
  const blk = isToday(dd) && blocksFor(dd).find((b) => b.kind === 'dials' && tmin(b.start) <= nm && nm < tmin(b.end)); const left = Math.max(0, tg - v); const minsLeft = blk ? tmin(blk.end) - nm : null;
  const pace = left > 0 && minsLeft > 0 ? `${left} left · ${minsLeft} min in block · one dial every ${Math.max(1, Math.floor(minsLeft / left))} min` : left > 0 ? `${left} left to today's ${tg}` : tg ? 'Target hit. Keep going while it\'s hot.' : 'No target today. Every dial counts toward the week.';
  openModal(`<h2>Dial session <span class="small muted mono" id="sess-el">${fmtEl(Math.floor((now() - s.start) / 1000))}</span></h2>
    <div class="sess-num">${v}<small> / ${tg || '—'}</small></div><div class="small muted" style="text-align:center;margin-bottom:14px">${pace}</div>
    <button class="btn primary lg block" style="height:110px;font-size:28px" onclick="sessBump('dials',1)">+1 dial</button>
    <div class="g3" style="margin-top:8px"><button class="btn" onclick="sessBump('dials',5)">+5 dials</button><button class="btn" style="border-color:rgba(255,191,63,.5);color:var(--amber)" onclick="sessBump('owners',1)">+1 owner talk</button><button class="btn ghost" onclick="sessBump('dials',-1)">undo −1</button></div>
    <div class="g3" style="margin-top:14px"><div class="cd"><div class="n">${sd}</div><div class="l">dials this session</div></div><div class="cd"><div class="n">${so}</div><div class="l">owner talks</div></div><div class="cd"><div class="n">${sd ? Math.round((so / sd) * 100) : 0}<span class="small muted">%</span></div><div class="l">reach rate</div></div></div>
    <div class="hint" style="margin-top:12px">Week: ${counterWeek('dials', dd)} / ${c ? c.weekly : 225}. A no costs nothing; it is the price of a yes. Log every owner conversation.<br><b>The ask:</b> “Would it be a terrible idea if I sent you a free snapshot of what's working for caregiver hiring in Naples right now?”</div>
    <div class="actions"><button class="btn" onclick="closeModal()">Hide</button><button class="btn danger" onclick="endSession()">End session</button></div>`, true);
  clearInterval(sessTimer); sessTimer = setInterval(() => { const el = $('sess-el'); if (!el) { clearInterval(sessTimer); return; } el.textContent = fmtEl(Math.floor((now() - s.start) / 1000)); }, 1000);
}
function sessBump(id, n) { const o = day(S.session.date); o.counters[id] = Math.max(0, (Number(o.counters[id]) || 0) + n); touch(o); try { navigator.vibrate && navigator.vibrate(15); } catch (e) { } renderSession(); }
function endSession() { const s = S.session, o = day(s.date); const sd = (Number(o.counters.dials) || 0) - s.d0, so = (Number(o.counters.owners) || 0) - s.o0; if (!o.sessions) o.sessions = []; o.sessions.push({ start: s.start, end: now(), dials: sd, owners: so }); S.session = { _u: now(), active: false }; touch(o); save(true); clearInterval(sessTimer); closeModal(); toast(`Session done: ${sd} dials · ${so} owner talks`); render(); }

/* ───────── FOCUS TIMER ───────── */
function startTimer(counterId, mins) { if (S.timer) { toast('A timer is already running'); return; } S.timer = { _u: now(), start: now(), mins, counter: counterId, date: dk(curDate) }; save(true); render(); toast(`${mins} min started. Phone face down.`); }
function stopTimer(complete) { const t = S.timer; if (!t) return; const mins = complete ? t.mins : Math.round((now() - t.start) / 60000); const o = day(t.date); if (mins > 0) { o.counters[t.counter] = (Number(o.counters[t.counter]) || 0) + mins; touch(o); } if (t.counter === 'deep' && (Number(o.counters.deep) || 0) >= 45) { o.habits.deep = 1; touch(o); } S.timer = null; save(true); try { if (complete && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) { } toast(complete ? `Done · +${mins} min logged` : mins > 0 ? `Stopped · +${mins} min logged` : 'Timer cancelled'); render(); }
function timerBanner() { const t = S.timer; if (!t) return ''; const rem = Math.max(0, t.mins * 60 - Math.floor((now() - t.start) / 1000)); const c = S.counters.items.find((x) => x.id === t.counter); return `<div class="card ac"><div class="row sb"><div><div class="card-t">Focus · ${esc(c ? c.title : '')} · ${t.mins} min</div><div class="big mono" id="timer-rem">${fmtEl(rem)}</div></div><button class="btn" onclick="stopTimer(false)">Stop</button></div></div>`; }
setInterval(() => { const t = S && S.timer; if (!t) return; const rem = t.mins * 60 - Math.floor((now() - t.start) / 1000); if (rem <= 0) { stopTimer(true); return; } const el = $('timer-rem'); if (el) el.textContent = fmtEl(rem); else if (view !== 'today') $('top-sub').textContent = '⏱ ' + fmtEl(rem) + ' focus'; }, 1000);

/* ───────── SHUTDOWN WIZARD ───────── */
let sdStep = 0;
function startShutdown() { sdStep = 0; tmrProp = null; if (isToday(curDate) && new Date().getHours() < 5) { const y = addDays(curDate, -1); if (!(S.days[dk(y)] || {}).shutdownAt) { curDate = y; toast('After midnight: closing ' + DAY_LONG[dow(y)] + ', planning today'); } } renderShutdown(); }
function renderShutdown() {
  const k = dk(curDate), o = day(k), d = curDate, w = dow(d), tmr = addDays(d, 1), tk = dk(tmr), ot = day(tk); const steps = ['Numbers', 'Standards', 'Debrief', 'Tomorrow', 'Close']; let body = '';
  if (sdStep === 0) body = `<div class="hint" style="margin-bottom:10px">Honest numbers for ${fmtShort(d)}. Adjust, don't round up.</div>${S.counters.items.map((c) => `<div class="kv"><span>${esc(c.title)}${c.targets[w] ? ` <span class="xs muted">/ ${c.targets[w]}${c.unit ? ' ' + c.unit : ''}</span>` : ''}</span><input type="number" inputmode="numeric" value="${o.counters[c.id] || 0}" onchange="day('${k}').counters['${c.id}']=Math.max(0,Number(this.value)||0);touch(day('${k}'))"></div>`).join('')}${moneyFields(k)}`;
  if (sdStep === 1) body = `<div class="habits" style="margin-bottom:12px">${S.habits.items.map((h) => `<div class="habit ${o.habits[h.id] ? 'on' : ''}" onclick="day('${k}').habits['${h.id}']=day('${k}').habits['${h.id}']?0:1;touch(day('${k}'));renderShutdown()"><div class="b">${o.habits[h.id] ? '✓' : ''}</div>${esc(h.title)}</div>`).join('')}</div><div class="field"><label>Still open today (Todoist)</label>${(typeof tdToday === 'function' ? tdToday(k) : []).map((t) => `<div class="ck" onclick="toggleTask('${t.id}');renderShutdown()"><div class="box round"></div><div class="lbl">${esc(t.title)}</div></div>`).join('') || '<div class="small muted">Nothing open. Clean.</div>'}<div class="xs muted" style="margin-top:6px">Not done? Move it in Todoist to a real day, don't leave it overdue.</div></div>`;
  if (sdStep === 2) body = debriefBody(o).replace(/oninput="setDayField\('(\w+)',this.value\)"/g, (m, f) => `oninput="day('${k}').${f}=this.value;touch(day('${k}'))"`) + `<div class="hint" style="margin-top:12px">Jocko's idea: own the loss, name the fix. One sentence each.</div>`;
  if (sdStep === 3) body = tomorrowStep(d);
  if (sdStep === 4) { const g = gradeFor(d), m = minimumMet(d), _ol = ordersFor(d); body = `<div class="hint" style="margin-bottom:12px">Today earned <b class="ok">+${fmt(dayXp(k))} XP</b> · ${_ol.filter((x) => x.done).length} of ${_ol.length} orders done · rank: ${rankInfo().name}</div><div class="countdown" style="margin-bottom:12px"><div class="cd"><div class="n">${g}</div><div class="l">grade · ${dayScore(d)}%</div></div><div class="cd"><div class="n ${m.met ? 'ok' : 'bad'}">${m.met ? '✓' : '✗'}</div><div class="l">${m.met ? 'minimum met' : `minimum missed · ${S.settings.stake} ${S.settings.currency}`}</div></div></div>${routineFor(S.routines.evening, d).map((r) => `<div class="ck ${rState(o, r.id) ? 'on' : ''}" onclick="day('${k}').routine['${r.id}']=day('${k}').routine['${r.id}']?0:1;touch(day('${k}'));renderShutdown()"><div class="box">${rState(o, r.id) === 'done' ? '✓' : rState(o, r.id) === 'skip' ? '–' : ''}</div><div class="lbl">${esc(r.title)}</div></div>`).join('')}`; }
  openModal(`<h2>Shutdown · ${steps[sdStep]} <span class="small muted">${sdStep + 1}/5</span></h2><div class="steps">${steps.map((s, i) => `<i class="${i <= sdStep ? 'on' : ''}"></i>`).join('')}</div>${body}<div class="actions">${sdStep > 0 ? '<button class="btn" onclick="sdStep--;renderShutdown()">Back</button>' : ''}<button class="btn primary" onclick="sdNext()">${sdStep < 4 ? 'Next' : 'Close the day'}</button></div>`, true);
}
function sdNext() { if (sdStep < 4) { sdStep++; renderShutdown(); return; } const o = day(curDate); ['dials', 'bacmin', 'tomorrow'].forEach((id) => { if (S.routines.evening.find((r) => r.id === id)) o.routine[id] = 1; }); o.shutdownAt = now(); touch(o); closeModal(); toast(`Day closed · grade ${gradeFor(curDate)}. Phone out. Bed ${S.settings.bed}.`); render(); }

/* ───────── TASKS ───────── */
function taskRow(t, ctx) { const od = t.due && !t.done && t.due < dk(new Date()); return `<div class="ck ${t.done ? 'done' : ''}" onclick="toggleTask('${t.id}')"><div class="box round ${t.done ? 'on' : ''}" style="${t.done ? 'background:var(--green);border-color:var(--green)' : ''}">${t.done ? '✓' : ''}</div><div class="lbl">${t.pri === 4 ? '<span class="p1">P1</span> ' : ''}${esc(t.title)}<span class="sub ${od ? 'bad' : ''}">${[t.due && ctx !== t.due ? (od ? 'overdue · ' : '') + fmtShort(pd(t.due)) : '', t.time || '', t.proj && typeof tdProjName === 'function' ? esc(tdProjName(t.proj)) : '', t.rec ? 'repeats' : ''].filter(Boolean).join(' · ')}</span>${t.note ? `<span class="sub">${esc(t.note)}</span>` : ''}</div><button class="edit" onclick="event.stopPropagation();editTask('${t.id}')">✎</button></div>`; }
function renderTasks() {
  const ts = tasksList(), tk = dk(new Date()), tomorrow = dk(addDays(new Date(), 1));
  const open = ts.filter((t) => !t.done);
  const overdue = open.filter((t) => t.due && t.due < tk).sort((a, b) => a.due.localeCompare(b.due));
  const todayT = open.filter((t) => t.due === tk), tmrw = open.filter((t) => t.due === tomorrow);
  const later = open.filter((t) => t.due && t.due > tomorrow).sort((a, b) => a.due.localeCompare(b.due));
  const nodate = open.filter((t) => !t.due).sort((a, b) => String(a.proj || '').localeCompare(String(b.proj || '')) || (b._u || 0) - (a._u || 0));
  const done = ts.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
  const sec = (title, list, cls) => list.length ? `<div class="sec-h ${cls || ''}">${title} · ${list.length}</div><div class="card" style="padding:4px 14px">${list.map((t) => taskRow(t)).join('')}</div>` : '';
  return `${tdOn() ? '' : `<div class="card flat" style="border-color:rgba(255,165,31,.4)"><div class="small"><b class="acc">Todoist is not connected on this device.</b> Tasks added here stay here, without reminders. Connect it in More → Todoist.</div></div>`}<div class="task-add"><input id="task-inp" placeholder="New task: “Call Maria tomorrow 10am #Company”" onkeydown="if(event.key==='Enter'){captureTask(this.value,'');this.value=''}"><button class="btn primary" onclick="captureTask(document.getElementById('task-inp').value,'')">Add</button></div>
    ${!open.length ? '<div class="empty">No open tasks.</div>' : ''}
    ${sec('Overdue', overdue, 'bad')}${sec('Today', todayT)}${sec('Tomorrow', tmrw)}${sec('Upcoming', later)}${sec('No date', nodate)}${sec('Done recently', done)}`;
}
function addTask(due) { const i = $('task-inp'); const v = i.value.trim(); if (!v) { i.focus(); return; } const t = { id: uid(), _u: now(), title: v, due: due || '', done: false, note: '' }; S.tasks[t.id] = t; save(); i.value = ''; taskHook('create', t); render(); }
function quickTask(k) { const i = $('quick-task'); const v = i.value.trim(); if (!v) return; const t = { id: uid(), _u: now(), title: v, due: k, done: false, note: '' }; S.tasks[t.id] = t; save(); taskHook('create', t); render(); }
function toggleTask(id) { const t = S.tasks[id]; t.done = !t.done; t.doneAt = t.done ? now() : null; t._u = now(); save(); taskHook(t.done ? 'close' : 'reopen', t); render(); }
function editTask(id) {
  const t = S.tasks[id];
  openModal(`<h2>Edit task</h2><div class="field"><label>Title</label><input id="m-title" value="${esc(t.title)}"></div><div class="field"><label>Due</label><input id="m-due" type="date" value="${esc(t.due || '')}"></div><div class="chips" style="margin:-6px 0 12px">${[['Today', 0], ['Tomorrow', 1], ['+3 days', 3], ['Next Mon', 'mon'], ['No date', null]].map(([l, n]) => `<span class="chip" onclick="document.getElementById('m-due').value='${n == null ? '' : n === 'mon' ? dk(addDays(monday(new Date()), 7)) : dk(addDays(new Date(), n))}'">${l}</span>`).join('')}</div><div class="field"><label>Note</label><textarea id="m-note">${esc(t.note || '')}</textarea></div>
    <div class="actions"><button class="btn danger" onclick="delTask('${id}')">Delete</button><button class="btn primary" onclick="saveTask('${id}')">Save</button></div>`);
}
function saveTask(id) { const t = S.tasks[id]; t.title = $('m-title').value.trim() || t.title; t.due = $('m-due').value; t.note = $('m-note').value.trim(); t._u = now(); save(); taskHook('update', t); closeModal(); render(); }
function delTask(id) { S.tasks[id]._del = true; S.tasks[id]._u = now(); save(); taskHook('delete', S.tasks[id]); closeModal(); render(); }
function taskHook(kind, t) { try { if (typeof tdOnChange === 'function') tdOnChange(kind, t); } catch (e) { console.error(e); } }

/* ───────── PLAN ───────── */
let planEdit = false;
function renderPlan() {
  const m = monday(curDate), sel = dk(curDate), tk = dk(new Date()), nm = nowMin();
  const strip = ALL.map((i) => { const d = addDays(m, i - 1), k = dk(d), o = S.days[k], sc = o ? dayScore(d) : 0; const wt = o && o.weight ? fmt(o.weight, 1) : ''; const g = o && k <= tk ? gradeFor(d) : ''; return `<div class="wday ${k === tk ? 'today' : ''} ${k === sel ? 'sel' : ''}" onclick="selDay('${k}')"><div class="d">${DAY_SHORT[i]}</div><div class="n">${d.getDate()}</div><div class="s">${g ? `<b>${g}</b>${wt ? ' · ' + wt : ''}` : (wt || '·')}</div><div class="dot ${o && k <= tk ? (sc >= 70 ? 'hi' : sc >= 40 ? 'mid' : 'lo') : ''}"></div></div>`; }).join('');
  const dials = S.counters.items.find((c) => c.id === 'dials'), bac = S.counters.items.find((c) => c.id === 'bac');
  const sum = `<div class="g3" style="margin-bottom:12px">${dials ? `<div class="cd"><div class="n">${counterWeek('dials', curDate)}<span class="small muted">/${dials.weekly}</span></div><div class="l">dials this week</div></div>` : ''}${bac ? `<div class="cd"><div class="n">${(counterWeek('bac', curDate) / 60).toFixed(1)}<span class="small muted">h</span></div><div class="l">BAC study</div></div>` : ''}<div class="cd"><div class="n">${workoutsWeek(curDate)}<span class="small muted">/7</span></div><div class="l">training days</div></div></div>`;
  const bl = blocksFor(curDate);
  const tl = bl.map((b) => { const past = sel === tk && tmin(b.end) <= nm, cur = sel === tk && tmin(b.start) <= nm && nm < tmin(b.end); return `<div class="blk ${planEdit ? '' : 'tap'} ${past ? 'past' : ''} ${cur ? 'now' : ''}" ${planEdit ? '' : `onclick="tapBlock('${b.id}','${sel}')"`}><div class="t">${b.start}–${b.end === '24:00' ? '…' : b.end}</div><div class="b"><div class="n"><span class="tag ${b.kind}"></span>${esc(b.title)}${b.once ? ' <span class="xs acc">· this day only</span>' : ''}</div>${b.note ? `<div class="k">${esc(b.note)}</div>` : ''}</div>${planEdit ? `<button class="edit" onclick="editBlock('${b.id}')">✎</button>` : ''}</div>`; }).join('');
  const dayO = S.days[sel], hasOnce = dayO && dayO.sched && ((dayO.sched.skip || []).length || (dayO.sched.add || []).length);
  return `<div class="card" style="padding:12px"><div class="wstrip">${strip}</div></div>${sum}
    <div class="card"><div class="card-h"><div class="card-t">${DAY_LONG[dow(curDate)]} · ${bl.length} blocks</div><div class="row" style="gap:6px">${typeof calUsesSchedule === 'function' && calUsesSchedule() ? `<span class="small muted">from Google Calendar</span>` : `<button class="btn sm ${planEdit ? 'primary' : ''}" onclick="planEdit=!planEdit;render()">${planEdit ? 'Done' : 'Edit'}</button>${planEdit ? `<button class="btn sm" onclick="editBlock('')">+ Block</button>` : ''}`}</div></div>
    <div class="tl">${tl || '<div class="empty">No blocks for this day. Tap Edit to add.</div>'}</div>${hasOnce ? `<div class="row sb" style="margin-top:10px"><span class="xs muted">This day differs from the weekly plan.</span><button class="btn sm ghost" onclick="resetDaySchedule()">Restore regular</button></div>` : ''}${planEdit ? '<div class="xs muted" style="margin-top:8px">Tap ✎ on a block: choose <b>Every week</b> or <b>Only this day</b> before saving or deleting.</div>' : '<div class="xs muted" style="margin-top:8px">Tap a block to open it (workout, dialer, food). Cancel or move from there or from HQ. <b>Edit</b> changes the weekly plan.</div>'}</div>
    ${typeof calUsesSchedule === 'function' && calUsesSchedule() ? '' : `<div class="card"><div class="row sb"><div><div style="font-weight:600">Connect your calendar</div><div class="xs muted">Right now this plan is a separate copy inside the app. Connect Google Calendar (Calendar tab) and this page shows your real calendar instead: one schedule, not two.</div></div><button class="btn sm" onclick="show('cal')">Connect</button></div></div>`}`;
}
function selDay(k) { curDate = pd(k); render(); }
const KINDS = ['routine', 'train', 'bac', 'school', 'dials', 'agency', 'tennis', 'food', 'travel', 'sleep', 'other'];
function editBlock(id) {
  const o = S.days[dk(curDate)], onceB = o && o.sched && (o.sched.add || []).find((x) => x.id === id);
  const b = onceB || (id ? S.schedule.blocks.find((x) => x.id === id) : { id: '', title: '', start: '09:00', end: '10:00', days: [dow(curDate)], kind: 'other', note: '' });
  const scope = onceB ? 'day' : 'week';
  openModal(`<h2>${id ? 'Edit block' : 'New block'}</h2>
    <div class="field"><label>Applies to</label><div class="chips" id="m-scope"><span class="chip ${scope === 'week' ? 'on' : ''}" data-s="week" ${onceB ? 'style="opacity:.4;pointer-events:none"' : ''} onclick="document.querySelectorAll('#m-scope .chip').forEach(c=>c.classList.toggle('on',c===this))">Every week</span><span class="chip ${scope === 'day' ? 'on' : ''}" data-s="day" onclick="document.querySelectorAll('#m-scope .chip').forEach(c=>c.classList.toggle('on',c===this))">Only ${fmtShort(curDate)}</span></div></div>
    <div class="field"><label>Title</label><input id="m-title" value="${esc(b.title)}" placeholder="What happens"></div>
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
  const scope = (document.querySelector('#m-scope .chip.on') || {}).dataset?.s || 'week';
  const vals = { title, start: $('m-start').value, end, days, kind: $('m-kind').value, note: $('m-note').value.trim() };
  if (scope === 'day') {
    const sc = dayOnce(curDate); const existing = (sc.add || []).find((x) => x.id === id);
    if (existing) Object.assign(existing, vals);
    else { if (id && S.schedule.blocks.find((x) => x.id === id) && !sc.skip.includes(id)) sc.skip.push(id); sc.add.push(Object.assign({ id: uid(), from: id || '' }, vals)); }
    touch(day(curDate)); closeModal(); render(); return;
  }
  const b = id ? S.schedule.blocks.find((x) => x.id === id) : { id: uid() }; Object.assign(b, vals);
  if (!id) S.schedule.blocks.push(b); S.schedule._u = now(); save(); closeModal(); render();
}
function delBlock(id) {
  const scope = (document.querySelector('#m-scope .chip.on') || {}).dataset?.s || 'week';
  const o = S.days[dk(curDate)], sc = o && o.sched;
  if (sc && (sc.add || []).some((x) => x.id === id)) { sc.add = sc.add.filter((x) => x.id !== id); touch(o); closeModal(); render(); return; }
  if (scope === 'day') { const s = dayOnce(curDate); if (!s.skip.includes(id)) s.skip.push(id); touch(day(curDate)); toast('Removed for ' + fmtShort(curDate) + ' only'); closeModal(); render(); return; }
  S.schedule.blocks = S.schedule.blocks.filter((x) => x.id !== id); S.schedule._u = now(); save(); closeModal(); render(); }

/* ───────── TRAIN ───────── */
function programsCard() { let html = '';
  html += `<div class="card"><div class="card-h"><div class="card-t">Programs</div><button class="btn sm" onclick="editProgram('')">+ New</button></div>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<div class="setting-row" onclick="editProgram('${id}')"><div><div class="t">${esc(S.programs[id].name)}</div><div class="d">${S.programs[id].ex.length} exercises · ${ALL.filter((d) => S.programByDay.map[d] === id).map((d) => DAY_SHORT[d]).join(', ') || 'unscheduled'}</div></div><div class="arr">›</div></div>`).join('')}</div>`;
  html += `<div class="card"><div class="card-t" style="margin-bottom:8px">Weekly split</div>${ALL.map((d) => `<div class="kv"><span>${DAY_LONG[d]}</span><select style="width:60%" onchange="S.programByDay.map[${d}]=this.value;S.programByDay._u=Date.now();save();render()"><option value="">Rest</option>${Object.keys(S.programs).filter((id) => !S.programs[id]._del).map((id) => `<option value="${id}" ${S.programByDay.map[d] === id ? 'selected' : ''}>${esc(S.programs[id].name)}</option>`).join('')}</select></div>`).join('')}</div>`;
  return html; }
function prevWorkout(pid, beforeKey) { const ks = Object.keys(S.days).filter((k) => k < beforeKey && S.days[k].workout && S.days[k].workout.program === pid && Object.keys(S.days[k].workout.sets || {}).length).sort(); if (!ks.length) return null; const k = ks[ks.length - 1]; return { k, sets: S.days[k].workout.sets }; }
function sessionEx(wo) { if (!wo) return []; if (wo.ex) return wo.ex; const p = S.programs[wo.program]; return p ? p.ex : []; }
function exKey(n) { return String(n || '').toLowerCase().replace(/^[a-d]\d?\s+/, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
/* every past session that had this exercise (matched by name, across programs and per-day edits), newest first */
function exHistory(name, beforeKey, n) {
  const key = exKey(name), out = [];
  for (const k of Object.keys(S.days).sort().reverse()) { if (k >= beforeKey) continue; for (const wo of sessionsRO(S.days[k])) { if (!wo || !wo.sets) continue; const ex = sessionEx(wo); ex.forEach((e, ei) => { if (exKey(e.n) !== key) return; const sets = (wo.sets[ei] || []).filter((s) => s && (s.done || s.w || s.r)); if (sets.length) out.push({ k, sets: sets.map((s) => ({ w: s.w, r: s.r, done: !!s.done })) }); }); } if (out.length >= (n || 6)) break; }
  return out;
}
function fmtSets(sets) { return sets.map((s) => (s.w !== undefined && s.w !== '' ? s.w + '×' : '') + (s.r || '?')).join(' · '); }
function exBest(hist) { let best = null; hist.forEach((h) => h.sets.forEach((s) => { const w = num(s.w) || 0, r = parseInt(s.r) || 0; const score = w ? w * r : r; if (score && (!best || score > best.score)) best = { w, r, score, k: h.k }; })); return best; }
function progressHint(e, last) { if (!last) return ''; const m = String(e.r).match(/(\d+)\s*[–-]\s*(\d+)/); if (!m) return ''; const top = parseInt(m[2]); const all = last.sets.length >= e.s && last.sets.every((s) => (parseInt(s.r) || 0) >= top); return all ? `<span class="chip ok" style="padding:3px 8px;font-size:11px">↑ progress: add weight</span>` : ''; }
let restEnd = 0, restTimer = null;
function startRest(sec) { restEnd = now() + sec * 1000; clearInterval(restTimer); restTimer = setInterval(() => { const el = $('rest-pill'); if (!el) { clearInterval(restTimer); return; } const left = Math.ceil((restEnd - now()) / 1000); if (left <= 0) { el.textContent = 'Rest done · go'; el.classList.add('ok'); clearInterval(restTimer); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) { } return; } el.textContent = 'Rest ' + fmtEl(left); }, 250); }
function restPill() { if (!restEnd) return ''; const left = Math.ceil((restEnd - now()) / 1000); return `<span class="chip ${left <= 0 ? 'ok' : 'on'}" id="rest-pill" onclick="restEnd=0;render()">${left <= 0 ? 'Rest done · go' : 'Rest ' + fmtEl(left)}</span>`; }
function editSession() {
  const o = day(curDate), wo = W(o), ex = sessionEx(wo);
  const lines = ex.map((e) => `${e.n} | ${e.s} | ${e.r}${e.note ? ' | ' + e.note : ''}`).join('\n');
  openModal(`<h2>Today's session only</h2><div class="hint" style="margin-bottom:10px">Changes here apply to ${fmtShort(curDate)} only. The weekly program stays as it is. To change every week, use <b>Edit program</b>.</div>
    <div class="field"><label>Exercises — one per line: <span class="mono">name | sets | reps | note</span></label><textarea id="m-ex" style="min-height:200px;font-family:var(--mono);font-size:12px">${esc(lines)}</textarea></div>
    <div class="actions">${wo.ex ? `<button class="btn" onclick="delete W(day('${dk(curDate)}')).ex;touch(day('${dk(curDate)}'));closeModal();render()">Back to program</button>` : ''}<button class="btn primary" onclick="saveSession()">Save for today</button></div>`);
}
function saveSession() {
  const o = day(curDate); const ex = $('m-ex').value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, s, r, ...note] = l.split('|').map((x) => x.trim()); return { n: n || 'Exercise', s: clamp(parseInt(s) || 1, 1, 12), r: r || '', note: note.join(' | ') }; });
  W(o).ex = ex; touch(o); closeModal(); render();
}
function exMenu(ei) {
  const o = day(curDate), ex = sessionEx(W(o)), e = ex[ei];
  openModal(`<h2>${esc(e.n)}</h2>
    <div class="field"><label>Swap for today (name)</label><input id="m-swap" placeholder="e.g. Inverted rows"></div>
    <div class="g2"><div class="field"><label>Sets</label><input id="m-s" type="number" value="${e.s}"></div><div class="field"><label>Reps / time</label><input id="m-r" value="${esc(e.r)}"></div></div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="applyExToday(${ei})">Apply to today</button><button class="btn sm danger" onclick="removeExToday(${ei})">Remove for today</button><button class="btn sm ghost" onclick="closeModal();editProgram('${W(o).program}')">Edit the weekly program</button></div>
    ${(() => { const h = exHistory(e.n, dk(addDays(curDate, 1)), 8); return h.length ? `<div class="sec-h">History</div>${h.map((x) => `<div class="kv"><span class="small muted">${fmtShort(pd(x.k))}</span><span class="small">${esc(fmtSets(x.sets))}</span></div>`).join('')}` : '<div class="empty">No past sets for this exercise yet.</div>'; })()}`);
}
function applyExToday(ei) { const o = day(curDate), wo = W(o); const ex = sessionEx(wo).map((x) => Object.assign({}, x)); const sw = $('m-swap').value.trim(); if (sw) ex[ei].n = sw; ex[ei].s = clamp(parseInt($('m-s').value) || ex[ei].s, 1, 12); ex[ei].r = $('m-r').value.trim() || ex[ei].r; wo.ex = ex; if (sw) wo.sets[ei] = []; touch(o); closeModal(); render(); }
function removeExToday(ei) { const o = day(curDate), wo = W(o); const ex = sessionEx(wo).map((x) => Object.assign({}, x)); ex.splice(ei, 1); const sets = {}; Object.keys(wo.sets || {}).forEach((k) => { const i = Number(k); if (i < ei) sets[i] = wo.sets[k]; else if (i > ei) sets[i - 1] = wo.sets[k]; }); wo.ex = ex; wo.sets = sets; touch(o); closeModal(); render(); }
function setProgram(id) { const o = day(curDate); const s = W(o); Object.assign(s, { kind: 'program', program: id, sets: {}, done: false, note: s.note || '' }); delete s.ex; delete s.skipped; touch(o); render(); }
function setSet(ei, si, f, v) { const o = day(curDate), wo = W(o); if (!wo.sets[ei]) wo.sets[ei] = []; if (!wo.sets[ei][si]) wo.sets[ei][si] = {}; wo.sets[ei][si][f] = v; touch(o); }
function toggleSet(ei, si) { const o = day(curDate), wo = W(o); if (!wo.sets[ei]) wo.sets[ei] = []; if (!wo.sets[ei][si]) wo.sets[ei][si] = {}; const s = wo.sets[ei][si]; s.done = !s.done; if (s.done) { const ex = sessionEx(wo), e = ex[ei]; const h = e ? exHistory(e.n, dk(curDate), 1)[0] : null; const ps = h && h.sets[si]; if (!s.w && ps && ps.w) s.w = ps.w; if (!s.r && ps && ps.r) s.r = ps.r; if (!s.r && e && /^\d+$/.test(e.r)) s.r = e.r; startRest(e && /s\b|min/.test(e.r) ? 45 : 90); } touch(o); render(); }
function skipWorkout(reason) { const o = day(curDate), wo = W(o); wo.done = false; wo.skipped = reason; syncTrainFlags(o); touch(o); toast('Logged: skipped · ' + reason + '. You can still add a session later.'); render(); }
function syncTrainFlags(o) { const trained = dayTrained(o); if (trained) o.habits.train = 1; else if (sessionsRO(o).some((s) => s.skipped)) o.habits.train = 0; else delete o.habits.train; S.routines.morning.filter((r) => r.link === 'train').forEach((r) => { if (trained) o.routine[r.id] = 1; else if (rState(o, r.id) === 'done') o.routine[r.id] = 0; }); }
function unskipWorkout() { const o = day(curDate); delete W(o).skipped; syncTrainFlags(o); touch(o); render(); }
function finishWorkout() { const o = day(curDate), wo = W(o); wo.done = !wo.done; if (wo.done) { delete wo.skipped; wo.endedAt = wo.endedAt || new Date().toTimeString().slice(0, 5); } syncTrainFlags(o); touch(o); toast(wo.done ? 'Session logged 💪' : 'Session reopened'); render(); }
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
  return `<div class="card" style="padding:12px">${cds}</div>${grp('week', 'This week', 'resets Monday')}${grp('month', 'This month', new Date().toLocaleDateString('en-GB', { month: 'long' }))}${grp('long', 'By July 1, 2027', 'the campaign')}
    <button class="btn block" onclick="editGoal('')">+ Add goal</button>
    <div class="hint" style="margin:14px 4px">Rule from the plan: no new business ideas until 100 owner conversations. Weekly numbers come from the Scoreboard automatically; tap a goal to edit or update it.</div>`;
}
function goalRow(g) {
  const c = goalCurrent(g), pct = goalPct(g), auto = g.source && g.source !== 'manual' && g.source !== 'check';
  const done = g.source === 'check' ? g.done : (g.done || (c != null && g.target && pct >= 100));
  const val = g.source === 'check' ? '' : `${c == null ? '—' : fmt(c, g.unit === 'kg' ? 1 : 0)} / ${fmt(g.target, g.unit === 'kg' ? 1 : 0)} ${esc(g.unit)}`;
  const dl = g.deadline ? (daysUntil(g.deadline) < 0 ? `<span class="bad">${-daysUntil(g.deadline)} days late</span>` : `${daysUntil(g.deadline)} days left · ${fmtShort(pd(g.deadline))}`) : '';
  return `<div class="goal ${done ? 'done' : ''}" onclick="editGoal('${g.id}')"><div class="h"><div class="n">${g.source === 'check' ? `<span class="box" style="display:inline-flex;width:20px;height:20px;border-radius:6px;border:2px solid ${done ? 'var(--green)' : 'var(--line2)'};background:${done ? 'var(--green)' : 'transparent'};vertical-align:-4px;margin-right:8px;align-items:center;justify-content:center;font-size:12px;color:#0b0b0f">${done ? '✓' : ''}</span>` : ''}${esc(g.title)}</div><div class="v">${val}${auto ? ' <span class="xs dim">auto</span>' : ''}</div></div>${g.source !== 'check' ? `<div class="bar"><i class="${pct >= 100 ? 'ok' : ''}" style="width:${pct}%"></i></div>` : ''}${dl ? `<div class="dl">${dl}</div>` : ''}</div>`;
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

function renderWeight() {
  const e = weightEntries(); if (!e.length) return '<div class="card"><div class="empty">No weigh-ins yet. Tomorrow morning: toilet → scale → type it in.</div></div>';
  const range = weightRange; const cutoff = range === 'all' ? '' : dk(addDays(new Date(), -range)); const pts = e.filter((x) => x.k >= cutoff);
  const a7 = avgWeight(7), a7p = avgWeight(7, dk(addDays(new Date(), -7))), a28 = avgWeight(7, dk(addDays(new Date(), -28)));
  const first = e[0], lastE = e[e.length - 1], tg = S.settings.weightTarget, wks = Math.max(1, daysUntil(S.settings.weightTargetDate) / 7); const pace = a7 ? (tg - a7) / wks : null;
  return `<div class="card"><div class="g3"><div class="cd"><div class="n">${fmt(lastE.w, 1)}</div><div class="l">latest · ${fmtShort(pd(lastE.k))}</div></div><div class="cd"><div class="n">${a7 ? fmt(a7, 1) : '—'}</div><div class="l">7-day avg</div></div><div class="cd"><div class="n ${a7 && a7p ? (a7 - a7p >= 0 ? 'ok' : 'bad') : ''}">${a7 && a7p ? (a7 - a7p >= 0 ? '+' : '') + fmt(a7 - a7p, 1) : '—'}</div><div class="l">vs last week</div></div></div>
    <div class="chips" style="margin:12px 0 6px">${[[30, '30d'], [90, '90d'], ['all', 'All']].map(([v, l]) => `<span class="chip ${range === v ? 'on' : ''}" onclick="weightRange=${typeof v === 'string' ? `'${v}'` : v};render()">${l}</span>`).join('')}</div>${weightChart(pts)}</div>
    <div class="card"><div class="kv"><span>Start (${fmtShort(pd(first.k))})</span><span class="v">${fmt(first.w, 1)} kg</span></div><div class="kv"><span>Change since start</span><span class="v ${lastE.w - first.w >= 0 ? 'ok' : 'bad'}">${lastE.w - first.w >= 0 ? '+' : ''}${fmt(lastE.w - first.w, 1)} kg</span></div><div class="kv"><span>Monthly trend (7d avg vs 4 weeks ago)</span><span class="v">${a7 && a28 ? (a7 - a28 >= 0 ? '+' : '') + fmt(a7 - a28, 1) + ' kg' : '—'}</span></div><div class="kv"><span>To ${tg} kg</span><span class="v">${a7 ? fmt(tg - a7, 1) : '—'} kg</span></div><div class="kv"><span>Needed pace to ${fmtShort(pd(S.settings.weightTargetDate))}</span><span class="v">${pace != null ? (pace >= 0 ? '+' : '') + fmt(pace, 2) + ' kg/week' : '—'}</span></div><div class="kv"><span>Entries</span><span class="v">${e.length}</span></div></div>
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
    <div class="kv"><span>Training days</span><span class="v">${workoutsWeek(d)} / 7</span></div><div class="kv"><span>Weight, 7-day avg</span><span class="v">${aw ? fmt(aw, 1) : '—'} kg ${aw && awp ? `<span class="${aw - awp >= 0 ? 'ok' : 'bad'}">(${aw - awp >= 0 ? '+' : ''}${fmt(aw - awp, 1)})</span>` : ''}</span></div><div class="kv"><span>Money (${S.settings.currency})</span><span class="v">+${fmt(inc)} / −${fmt(sp)}</span></div><div class="kv"><span>Avg day score</span><span class="v">${scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%' : '—'}</span></div><div class="kv"><span>Minimum days missed</span><span class="v">${ALL.filter((i) => S.stakes && S.stakes[dk(addDays(m, i - 1))]).length}</span></div></div>
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
  try {
    // read-merge-write: another device may have written since this one last pulled, so fold that in first
    try { const g = await fetch(`${s.url}/rest/v1/warroom_sync?id=eq.${encodeURIComponent(s.code)}&select=data`, { headers: hdr() }); if (g.ok) { const rows = await g.json(); if (rows.length && rows[0].data && merge(rows[0].data)) { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { } setTimeout(render, 0); } } } catch (e) { }
    if (typeof devStamp === 'function') devStamp();
    const r = await fetch(`${s.url}/rest/v1/warroom_sync`, { method: 'POST', headers: Object.assign(hdr(), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ id: s.code, data: S, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error('HTTP ' + r.status); syncState.status = 'ok'; syncState.last = now(); syncState.msg = ''; }
  catch (e) { syncState.status = 'err'; syncState.msg = String(e.message || e); }
  renderTop(); if (view === 'more' && moreTab === 'sync') render();
}
function merge(remote) {
  let changed = false; const singles = ['settings', 'routines', 'habits', 'counters', 'schedule', 'programByDay', 'food', 'secrets'], maps = ['programs', 'days', 'tasks', 'goals', 'reviews', 'stakes', 'devices', 'playbook', 'inbox', 'meetings'];
  for (const k of singles) if (remote[k] && (remote[k]._u || 0) > ((S[k] && S[k]._u) || 0)) { const keepSync = k === 'settings' ? S.settings.sync : null; S[k] = remote[k]; if (keepSync) S.settings.sync = keepSync; changed = true; }
  for (const k of maps) { if (!remote[k]) continue; if (!S[k]) S[k] = {}; for (const id in remote[k]) { const r = remote[k][id], l = S[k][id]; if (!l || (r._u || 0) > (l._u || 0)) { S[k][id] = r; changed = true; } } }
  return changed;
}
function renderSync() {
  const s = S.settings.sync;
  return `<div class="card"><div class="card-h"><div class="card-t">Cloud sync</div><div class="card-r">${syncReady() ? `<b class="${syncState.status === 'err' ? 'bad' : 'ok'}">${syncLabel()}</b>${syncState.last ? ' · ' + new Date(syncState.last).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}` : 'off'}</div></div>
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
function openModal(html, noFocus) { $('modal').innerHTML = `<div style="display:flex;justify-content:flex-end"><button class="iconbtn" onclick="closeModal()" aria-label="Close">×</button></div>` + html; $('modal-bg').classList.add('open'); if (noFocus) return; const f = $('modal').querySelector('input:not([type=date]):not([type=time]),textarea'); if (f && !f.value) setTimeout(() => f.focus(), 50); }
function closeModal() { $('modal-bg').classList.remove('open'); clearInterval(sessTimer); }
$('modal-bg').addEventListener('click', (e) => { if (e.target === $('modal-bg')) closeModal(); });

