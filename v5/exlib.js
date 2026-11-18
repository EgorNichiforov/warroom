/* War Room · exlib.js — exercise demos inside the Train screen (13.3.0)
   Every exercise row gets a "How to" button: start/end photos, 3 form cues, and the video playing
   inside the app (YouTube embed, loaded only when you tap Play). Matching is by exercise name, so
   it works for any program, past or future, that uses these names.
   Photos: Free Exercise DB (github.com/yuhonas/free-exercise-db), public domain (Unlicense). */
const EXLIB = [
  { k: 'rhomboids-smr', re: /foam roll.*(upper back|t-?spine)|upper back.*foam/i, t: 'Foam roll upper back', v: 'cqd2USvPuCA', img: 'rhomboids-smr', c: ['Roller across the mid-back, hands behind the head', 'Roll slowly from the bottom of the shoulder blades to the top; stop 2 breaths on tight spots', 'Never roll the lower back'] },
  { k: 'lats-smr', re: /foam roll.*lat|lats? smr/i, t: 'Foam roll lats', v: 'aQ565ee0DrE', img: 'lats-smr', c: ['Lie on your side, roller under the armpit, arm overhead', 'Roll from armpit to the bottom of the ribs', 'Turn slightly forward and back to find tight spots'] },
  { k: 'hams-smr', re: /foam roll.*ham/i, t: 'Foam roll hamstrings', v: null, img: 'hams-smr', c: ['Sit with the roller under the back of the thighs, hands behind you', 'Roll knee to glute, slowly', 'Cross one leg over the other for more pressure'] },
  { k: 'quads-smr', re: /foam roll.*quad/i, t: 'Foam roll quads', v: null, img: 'quads-smr', c: ['Face down, roller under the thighs, forearms on the floor', 'Roll hip to just above the knee', 'Turn the leg in and out to hit the sides'] },
  { k: 'calves-smr', re: /foam roll.*calv/i, t: 'Foam roll calves', v: null, img: 'calves-smr', c: ['Roller under the calves, hands behind you, hips up', 'Roll ankle to knee', 'One leg on top of the other for more pressure'] },
  { k: 'glutes-smr', re: /foam roll.*glute/i, t: 'Foam roll glutes', v: null, img: 'glutes-smr', c: ['Sit on the roller, cross one ankle over the other knee', 'Lean toward the crossed-leg side', 'Small slow rolls, 30–45 s a side'] },
  { k: 'wgs', re: /world'?s greatest|\bWGS\b/i, t: "World's greatest stretch", v: 'e3oGDs4gwnk', img: 'wgs', c: ['Big lunge, front foot outside the hand, back knee straight', 'Elbow down toward the front foot, then rotate and reach that arm to the ceiling', '2 s at each position, then switch sides'] },
  { k: 'pullapart', re: /pull-?aparts?/i, t: 'Band pull-aparts', v: 'pASXdGKh-nc', img: 'pullapart', c: ['Arms straight at shoulder height, palms down, band already a little tight', 'Pull the band to your chest by squeezing the shoulder blades', 'Shoulders down, no shrug; 2 s back'] },
  { k: 'hamstr', re: /hamstring stretch/i, t: 'Lying hamstring stretch (band)', v: '12ITKj2tykk', img: 'ham-str', c: ['On your back, band around one foot, the other leg flat on the floor', 'Pull the straight leg up until you feel the back of the thigh; knee stays straight', 'Breathe out and let it sink a little further; never bounce'] },
  { k: 'fig4', re: /figure.?4|glute stretch|pigeon/i, t: 'Figure-4 glute stretch', v: 'cgK1yy_xjeM', img: null, c: ['On your back, cross one ankle over the other knee', 'Pull the bottom thigh toward your chest', 'Push the top knee gently away; feel it deep in the glute'] },
  { k: 'frog', re: /frog/i, t: 'Frog stretch (inner thighs)', v: 'vWTDZo7T3tY', img: null, c: ['On hands and knees, slide the knees wide, shins parallel, feet out', 'Rock the hips back slowly until the inner thighs stretch', 'Go to forearms only if the knees feel fine'] },
  { k: 'child', re: /child'?s pose|lat stretch/i, t: "Child's pose lat reach", v: 'YTAwpiX2Dsg', img: 'child', c: ['Kneel, sit back on your heels, arms long on the floor', 'Walk both hands to the right: stretch the left side and lat; hold', 'Then the other side; breathe into the ribs'] },
  { k: 'pec', re: /doorway|pec stretch|chest stretch/i, t: 'Doorway chest stretch', v: 'B9uY01NoqBg', img: null, c: ['Forearm on the door frame, elbow at shoulder height, bent 90°', 'Step through with the same-side foot until the chest stretches', 'Shoulder down; no pain in the front of the shoulder'] },
  { k: 'calfstr', re: /calf (wall )?stretch|wall calf/i, t: 'Wall calf stretch', v: 'xDhzGbQ6dmM', img: 'calf-str', c: ['Hands on the wall, one foot back, heel on the floor, back knee straight', 'Lean in until the calf stretches (30 s)', 'Then bend the back knee a little for the lower calf (soleus)'] },
  { k: 'forearmstr', re: /forearm stretch|wrist stretch/i, t: 'Forearm stretches', v: 'rQlDHgTUbO0', img: 'forearm-str', c: ['Arm straight in front, palm up: pull the fingers down and back (20 s)', 'Palm down: pull the back of the hand toward you (20 s)', 'Both arms; tennis-elbow insurance'] },
  { k: 'scap', re: /scap(ular)? pull/i, t: 'Scap pull-ups', v: 'iKnjSB9VIGo', img: 'scap', c: ['Hang from the bar, arms straight', 'Pull the shoulder blades DOWN and together: the body rises a few cm', 'Elbows never bend; 1 s hold, slow down'] },
  { k: 'couch', re: /couch stretch/i, t: 'Couch stretch', v: 'fHGYNdgLue8', img: 'couch', c: ['Back knee on a cushion against the wall or sofa, shin up the wall', 'Squeeze the glute of the back leg and tuck the pelvis (ribs down)', 'Too hard: move the knee away from the wall'] },
  { k: '9090', re: /90\/90 hip/i, t: '90/90 hips', v: 'VYvMMw8z3rE', img: null, c: ['Sit with front and back leg both bent at 90°, knees on the floor', 'Sit tall over the front shin, then hinge forward with a flat back', 'Switch sides by rotating both knees over'] },
  { k: 'openbook', re: /open book/i, t: 'Thoracic open book', v: 'rDviWORCWEw', img: null, c: ['Lie on your side, knees bent 90°, arms straight in front', 'Keep the knees together on the floor; open the top arm across, eyes follow the hand', 'Breathe out as you open, 2 s at the end'] },
  { k: 'sleeper', re: /sleeper/i, t: 'Sleeper stretch', v: 'FODQxJh5PeI', img: null, c: ['Lie on the side you stretch, elbow straight out from the shoulder, bent 90°', 'Other hand gently pushes the wrist toward the floor', 'Deep stretch at the back of the shoulder, never sharp pain'] },
  { k: 'ankle', re: /ankle (wall )?rock|knee.to.wall/i, t: 'Ankle wall rocks', v: 'du4tlWtQ_Z8', img: null, c: ['Foot a hand-width from the wall, split stance', 'Drive the knee forward over the toes to touch the wall', 'Heel stays down; move further away when easy'] },
  { k: 'er', re: /external rotation/i, t: 'Band external rotation', v: 'sf5lfdkavtA', img: 'er', c: ['Band at waist height, stand side-on, elbow bent 90° glued to your side', 'Rotate the hand outward; the elbow does not move', '2 s out, 2 s back, light band'] },
  { k: 'ytw', re: /y-?t-?w/i, t: 'Prone Y-T-W raises', v: '8gBSQQSqXTg', img: null, c: ['Lie face down, forehead on a towel, thumbs up', 'Lift the arms into a Y, then a T, then a W by squeezing the shoulder blades', 'Small, slow, no lower-back arching'] },
  { k: 'neck', re: /neck (nod|curl|ext|fighter)|neck:|^neck|neck curls/i, t: 'Neck nods off the bed', v: 'SHavyQNIWQk', img: 'neck-up', img2: 'neck-down', c: ['Lie with your head off the bed edge, no weight', 'Face up: tuck the chin and nod up slowly. Face down: lift to neutral and lower', 'Small slow range, stop if dizzy or painful'] },
  { k: 'hang', re: /dead hang/i, t: 'Dead hang', v: 'lR6fl7q2C5k', img: null, c: ['Overhand grip, shoulder width, thumbs around the bar', 'Arms straight, shoulders relax up; core lightly tight so you do not swing', 'Step down, do not drop'] },
  { k: 'wpull', re: /weighted pull/i, t: 'Weighted pull-ups', v: 'UGDdCoITgEE', img: 'pullup', c: ['Belt or backpack weight hanging still between the legs', 'Same form as pull-ups: full hang, chest to bar', 'Add weight only when all sets are clean'] },
  { k: 'pullup', re: /pull-?ups?/i, x: /scap|weighted/i, t: 'Pull-ups', v: 'TMnxKjdYcME', img: 'pullup', c: ['Overhand grip, a bit wider than shoulders; start from a full dead hang', 'Pull the elbows down to your ribs until the chest nears the bar', 'Lower in 2–3 s to straight arms; no kipping'] },
  { k: 'chin', re: /chin-?ups?/i, t: 'Chin-ups', v: 'brhRXlOhsAM', img: 'chin', c: ['Palms facing you, shoulder width', 'Pull until the chin is over the bar, elbows close to the body', '3 s down to a full hang'] },
  { k: 'dip', re: /\bdips?\b/i, t: 'Dips', v: 'hsEKg3M45dc', img: 'dip', c: ['Arms locked on the bars, shoulders down away from the ears', 'Lean forward a little and lower until the shoulders are level with the elbows', 'Press back up without shrugging'] },
  { k: 'lateral', re: /lateral raise/i, t: 'Lateral raises', v: 'Y29xKcze8Ik', img: 'lateral', c: ['Slight bend in the elbows, lean forward a touch', 'Lift out to the sides until the arms are level with the shoulders', '2 s down, no swinging'] },
  { k: 'curl', re: /\bcurls?\b/i, x: /wrist|nordic|neck|hamstring/i, t: 'Dumbbell curls', v: '6DeLZ6cbgWQ', img: 'curl', c: ['Elbows pinned to your sides', 'Curl up, squeeze at the top', '3 s down to a straight arm, no swinging'] },
  { k: 'hlr', re: /(hanging )?(leg|knee) raises?/i, t: 'Hanging leg raises', v: 'vwl68EF9M2Q', img: 'hlr', c: ['Hang, shoulders active (not loose)', 'Lift the legs by curling the pelvis up, not by swinging', 'Lower slowly; bent knees are the easier version'] },
  { k: 'pallof', re: /pallof/i, t: 'Band Pallof press', v: 'P16SQlmWj1o', img: 'pallof', c: ['Band at chest height, stand side-on, hands at the chest', 'Press straight out and hold 2 s; do not let the band twist you', 'Square hips, tight core; both sides'] },
  { k: 'row1', re: /one-arm (db |dumbbell )?row|1-arm row/i, t: 'One-arm dumbbell row', v: 'S_kOe9mOLlg', img: 'row1', c: ['Hand and knee on a bench or chair, back flat', 'Pull the dumbbell to the hip, elbow close to the body', 'Pause 1 s at the top, 3 s down; non-hitting arm first'] },
  { k: 'wrist', re: /wrist (curls?|work)|reverse curls|rotations/i, t: 'Wrist curls · reverse curls · rotations', v: '04u4uGk3Ia8', v2: 'kZu3e6_g1bs', img: 'wrist-up', img2: 'wrist-down', c: ['Forearm on your thigh or a bench, light dumbbell', 'Palms up: curl the wrist up. Palms down: lift the back of the hand', 'Rotations: hold the end of the dumbbell, turn palm up and down slowly'] },
  { k: 'nordic', re: /nordic/i, t: 'Nordic curl lowering', v: 'xJiyXM5EW8c', img: 'nordic', c: ['Kneel on a pad, feet hooked under the sofa', 'Body straight from knees to head; lower forward as slowly as you can', 'Catch yourself with your hands, push back up'] },
  { k: 'tpush', re: /t push-?ups?/i, t: 'T push-ups', v: 'laozyvCmBLE', img: 'pushup', c: ['Push-up on the dumbbells, body in one line', 'At the top rotate into a side plank, dumbbell to the ceiling', 'Hips turn with the chest; alternate sides'] },
  { k: 'pushup', re: /push-?ups?/i, t: 'Push-ups', v: 'dycia0F9rp8', img: 'pushup', c: ['Hands under the shoulders, body in one line', 'Lower in 3 s until the chest nearly touches', 'Elbows about 45° from the body'] },
  { k: 'squat', re: /bodyweight squats?|\b10 squats\b/i, t: 'Bodyweight squats', v: null, img: 'squat', c: ['Feet shoulder width, toes slightly out', 'Sit down between the heels, chest up', 'Knees follow the toes, heels on the floor'] },
  { k: 'trapbar', re: /trap-?bar|hex bar/i, t: 'Trap-bar deadlift', v: 'u0XL46Cnzm8', img: 'trapbar', c: ['Stand in the middle, feet hip width, grip the handles', 'Chest up, back flat, push the floor away', 'Stand tall and squeeze the glutes; lower with control'] },
  { k: 'bss', re: /bulgarian|split squat/i, t: 'Bulgarian split squat', v: 'VPhhE6bBzZE', img: 'bss', c: ['Back foot on a bench, front foot far enough that the knee stays over the foot', 'Lower straight down until the back knee nearly touches', 'Push through the front heel; same reps each leg'] },
  { k: 'ohp', re: /overhead press|shoulder press|\bOHP\b/i, t: 'Dumbbell overhead press', v: 'bj53-0DYKFo', img: 'ohp', c: ['Dumbbells at the shoulders, ribs down, glutes tight', 'Press straight up until the arms lock overhead', 'No leaning back; lower to the shoulders with control'] },
  { k: 'farmer', re: /farmer/i, t: 'Farmer carries', v: 'z7E_YU9P1jU', img: 'farmer', c: ['Heavy dumbbells at your sides, stand tall', 'Short quick steps, shoulders down and back', 'Do not let the weights swing or the body lean'] },
  { k: 'sprint', re: /sprints?/i, t: 'Short sprints', v: 'FfuHfASyqkg', img: null, c: ['Lean forward from the ankles for the first steps', 'Drive the arms hard, push the ground back', 'Full rest between reps: every rep at top speed'] },
  { k: 'bound', re: /side bounds?|lateral bound/i, t: 'Side bounds', v: 'niEGdFUQ6sY', img: 'bound', c: ['Push hard off one leg sideways', 'Land on the other leg and stick it for 1 s', 'Stay low, knee over the toes'] },
  { k: 'broad', re: /broad jumps?/i, t: 'Broad jumps', v: 'iEwPLbb9nq8', img: null, c: ['Swing the arms back, hinge, then jump forward as far as you can', 'Land softly on both feet, knees out', 'Reset fully between jumps'] },
  { k: 'kbswing', re: /(kettlebell|kb|db) swings?/i, t: 'Kettlebell swings', v: 'UdS-9UDvqoI', img: 'kbswing', c: ['Hinge: hips back, flat back, bell between the legs', 'Snap the hips forward; the arms only guide the bell', 'Stand tall at the top, glutes tight'] },
  { k: 'rotthrow', re: /rotational throws?|med(icine)? ball/i, t: 'Rotational med-ball throws', v: 'o9BC7lgN1bo', img: null, c: ['Side-on to the wall, ball at the back hip', 'Turn from the hips and throw hard into the wall', 'Catch, reset, same reps both sides'] },
  { k: 'backext', re: /back extensions?|hyperextension/i, t: 'Back extensions', v: 'a2UrKheEcIc', img: 'backext', c: ['Hips just over the pad, feet locked', 'Lower with a flat back, rise by squeezing the glutes', 'Stop when the body is in one line; no over-arching'] },
  { k: 'boxjump', re: /box jumps?/i, t: 'Box jumps', v: '3INzGHuk23U', img: 'boxjump', c: ['Quarter squat, arms back, then jump up', 'Land soft in a squat on the box, knees out', 'Step down, never jump down'] },
  { k: 'frontsquat', re: /front squat/i, t: 'Front squat', v: 'npVgCT7NznU', img: 'frontsquat', c: ['Bar on the front of the shoulders, elbows high', 'Sit straight down, chest up', 'Fast up, moderate weight'] },
  { k: 'woodchop', re: /woodchop|wood chop/i, t: 'Cable woodchops', v: 'Qx9V1zuzSVA', img: 'woodchop', c: ['Cable high, stand side-on, arms long', 'Pull down and across by turning the hips and chest together', 'Control the way back; both sides'] },
  { k: 'bbrow', re: /heavy rows|bent.?over row|barbell row/i, t: 'Heavy bent-over rows', v: 'YcK7pyFXmWk', img: 'bbrow', c: ['Hinge to about 45°, back flat, bar hanging', 'Pull the bar to the lower ribs, squeeze the shoulder blades', 'No jerking with the hips'] },
  { k: 'incline', re: /incline (db |dumbbell )?press/i, t: 'Incline dumbbell press', v: 'sh5ZsRpEZCw', img: 'incline', c: ['Bench at about 30°, shoulder blades pinched', 'Lower to the upper chest, elbows about 45°', 'Press up and slightly in'] },
  { k: 'shrug', re: /shrugs?/i, t: 'Shrugs', v: 'xiLT85G_GuU', img: 'shrug', c: ['Dumbbells at your sides', 'Lift the shoulders straight up to the ears', 'Pause 1 s, lower slowly, no rolling'] },
  { k: 'facepull', re: /face pulls?/i, t: 'Face pulls', v: 'cuTBqxntdso', img: 'facepull', c: ['Rope at head height, thumbs toward you', 'Pull to the face, hands apart, elbows high', 'Squeeze the rear shoulders 1 s'] }
];
function exFind(name) {
  const n = String(name || ''), out = [], seen = new Set();
  for (const e of EXLIB) { if (e.re.test(n) && !(e.x && e.x.test(n)) && !seen.has(e.k)) {
    if (e.k === 'pushup' && seen.has('tpush')) continue; if (e.k === 'pullup' && seen.has('wpull')) continue;
    seen.add(e.k); out.push(e); } }
  return out;
}
let _exOpen = {};
function exHow(name, ei) {
  const list = exFind(name); if (!list.length) return '';
  const id = 'exh' + ei, open = _exOpen[name];
  return `<div class="exhow"><button class="btn sm ghost exhow-b" onclick="exHowToggle(${JSON.stringify(name).replace(/"/g, '&quot;')})">${open ? '▾ Hide how-to' : '▸ How to do it · video'}</button>${open ? `<div class="exhow-p" id="${id}">${list.map((e, j) => exCard(e, ei + '_' + j)).join('')}</div>` : ''}</div>`;
}
function exCard(e, key) {
  const imgs = [e.img ? `ex/${e.img}-0.jpg` : '', e.img ? `ex/${e.img}-1.jpg` : '', e.img2 ? `ex/${e.img2}-0.jpg` : ''].filter(Boolean);
  const vids = [e.v, e.v2].filter(Boolean);
  return `<div class="exc"><div class="exc-t">${esc(e.t)}</div>
    ${imgs.length ? `<div class="exc-img">${imgs.map((s, i) => `<figure><img src="./${s}" loading="lazy" alt=""><figcaption>${imgs.length > 1 && i === 0 ? 'Start' : imgs.length > 1 && i === 1 ? 'Finish' : ''}</figcaption></figure>`).join('')}</div>` : ''}
    <ol class="exc-c">${e.c.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
    ${vids.map((v, i) => `<div class="exc-v" id="exv_${key}_${i}"><button class="btn sm exc-play" onclick="exPlay('${key}_${i}','${v}')">▶ Play video${vids.length > 1 ? ' ' + (i + 1) : ''}</button></div>`).join('')}</div>`;
}
function exHowToggle(name) { _exOpen[name] = !_exOpen[name]; render(); }
function exPlay(key, v) {
  const box = document.getElementById('exv_' + key); if (!box) return;
  box.innerHTML = `<div class="exc-frame"><iframe src="https://www.youtube-nocookie.com/embed/${v}?autoplay=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="Exercise video"></iframe></div><a class="xs muted" href="https://www.youtube.com/watch?v=${v}" target="_blank" rel="noopener">Video won't play here? Open in YouTube</a>`;
}
(function () {
  const css = `.exhow{margin:2px 0 8px}.exhow-b{min-height:28px;padding:2px 10px;font-size:12px}
  .exhow-p{margin-top:8px;display:grid;gap:10px}.exc{border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;padding:10px;background:rgba(255,255,255,.03)}
  .exc-t{font-weight:800;font-size:14px;margin-bottom:8px}.exc-img{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-bottom:8px}
  .exc-img figure{margin:0}.exc-img img{width:100%;border-radius:8px;display:block;background:#fff}.exc-img figcaption{font-size:11px;opacity:.6;text-align:center;margin-top:2px}
  .exc-c{margin:0 0 8px 18px;padding:0;font-size:13px;line-height:1.45}.exc-c li{margin:2px 0}
  .exc-v{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px}.exc-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000}
  .exc-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}`;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();
