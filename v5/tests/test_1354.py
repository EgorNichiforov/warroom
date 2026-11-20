"""War Room 13.54 checks: Communication, first increment (speak.js). One loop end to end in Romanian and English:
exercise chosen from the records, attempt saved, coach output checked against the speaker's own words, second attempt,
words kept and spaced, a real-life moment turned into the next exercise. The AI is a stand-in here: this proves the
checks around it, not the quality of a real coach. Throwaway browser, no microphone. Not a real phone."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-20T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(600)
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    check('version 13.54.0 or later', ev("APP_VERSION.localeCompare('13.54.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('fifteen exercises, five domains, three levels, each in Romanian with diacritics and in English', ev("SPK_EX.length===15&&['A','B','C','D','E'].every(d=>[1,2,3].every(s=>SPK_EX.some(e=>e[1]===d&&e[2]===s)))&&SPK_EX.every(e=>e[3].length>20&&e[4].length>20)&&SPK_EX.filter(e=>/[ăâîșț]/.test(e[3])).length>=14"))
    check('new names and store do not collide with anything older', ev("Object.keys(S.boot||{}).filter(k=>k.indexOf('spk:')===0).length===0"))
    ev("aiCfg=()=>({}); spkOpen(); 0"); pg.wait_for_timeout(200)
    check('opens in Romanian by default, says plainly there is no coach without a key, fits the phone', ev(f"/Next · Română/.test({t})&&/No AI key on this device/.test({t})&&{fits}"), ev(t)[:200])
    first = ev("spkNext('ro')")
    check('the first exercise is level 1 and says why it was chosen', first['st'] == 1 and 'first exercise' in first['why'], first)
    ev("SPKS.ex=null; spkTrain(true); 0"); pg.wait_for_timeout(150)
    check('without speech-to-text it says so and offers typing (no broken button); fits the phone', ev(f"/no speech-to-text|Tap Speak/.test({t})&&!!document.getElementById('spk-text')&&{fits}"))
    ev("document.getElementById('spk-text').value='scurt'; spkSubmit(); 0"); pg.wait_for_timeout(100)
    check('a too-short answer is not saved', ev("spkAll('a').length") == 0)
    RO = 'Deci eu cred că obiceiul care mi-a schimbat ziua este trezitul devreme. Pentru că dimineața am liniște și pot să învăț. De exemplu ieri am terminat testul înainte de școală. Deci trezitul devreme rămâne cel mai important.'
    ev("(t)=>{document.getElementById('spk-text').value=t; spkSubmit();}", RO); pg.wait_for_timeout(200)
    A = ev("spkAll('a')")
    check('with no AI the attempt is saved with counted facts and no score', len(A) == 1 and A[0]['lang'] == 'ro' and 'fb' not in A[0] and A[0]['facts']['words'] > 20 and A[0]['facts']['sentences'] == 4, A[0].get('facts') if A else A)
    check('the facts are counts from his text: fillers and linking words, Romanian diacritics intact', ev("(()=>{const f=spkAll('a')[0].facts;return f.fill.some(x=>x[0]==='deci'&&x[1]===2)&&f.links.some(x=>x[0]==='pentru că')&&f.links.some(x=>x[0]==='de exemplu')})()") and ev(f"/a score with nothing behind it would be invented/.test({t})&&/trezitul devreme/.test({t})"))
    # ── with a coach (stand-in)
    FB = {"said": "Trezitul devreme e obiceiul cel mai important.", "worked": ["Ai început cu ideea.", "Your pronunciation was clear."], "unclear": "", "breaks": [{"quote": "pot să învăț", "why": "Nu spui ce înveți."}, {"quote": "words he never said", "why": "invented"}], "better": {"natural": "Obiceiul care mi-a schimbat ziua e trezitul devreme.", "precise": "Trezitul la 5:20 mi-a dat o oră de liniște pentru învățat."}, "why": "Spune exact ce câștigi.", "priority": {"dim": "prec", "tip": "Numește lucrul concret."}, "scores": [{"dim": "org", "score": 8, "quote": "De exemplu ieri am terminat testul"}, {"dim": "flu", "score": 9, "quote": "not in the text"}, {"dim": "nope", "score": 5, "quote": "Deci"}, {"dim": "prec", "score": 5, "quote": "pot să învăț"}], "words": [{"w": "liniște", "lang": "ro", "mean": "lipsa zgomotului", "other": "quiet"}, {"w": "x", "lang": "fr", "mean": "", "other": ""}]}
    ev("(fb)=>{aiCfg=()=>({key:'k'}); window.__fb=fb; aiText=async()=>'Here you go: '+JSON.stringify(window.__fb); }", FB)
    ev("(t)=>{SPKS.ex=null;SPKS.prev=null;spkTrain(true);document.getElementById('spk-text').value=t;}", RO); ev("spkSubmit()"); pg.wait_for_timeout(300)
    a2 = ev("spkAll('a').sort((a,b)=>a.at-b.at).slice(-1)[0]")
    f = a2.get('fb') or {}
    check('a point whose quote is not in what he said is dropped, and so is a score without one', len(f.get('breaks', [])) == 1 and [s['dim'] for s in f.get('scores', [])] == ['org', 'prec'] and f.get('dropped') == 3, f)
    check('nothing about pronunciation survives: the coach only ever sees text', all('pronun' not in w.lower() for w in f.get('worked', [])) and len(f.get('worked', [])) == 1, f.get('worked'))
    check('the seven parts are shown in order, the quote in his own words, and it fits', ev(f"/1 · What you communicated/.test({t})&&/3 · Where it broke down/.test({t})&&/4 · The same thought, said better/.test({t})&&/6 · One thing to fix/.test({t})&&/7 · Say it again/.test({t})&&/“pot să învăț”/.test({t})&&/left out: the quote was not in what you said/.test({t})&&{fits}"))
    ev("spkKeep(0); spkKeep(0); 0")
    V = ev("spkAll('v')")
    check('a word is kept only when he taps Keep, once, and comes back tomorrow', len(V) == 1 and V[0]['w'] == 'liniște' and V[0]['due'] == '2026-11-21' and V[0]['reps'] == 0, V)
    ev(f"spkAgain('{a2['id']}'); 0"); pg.wait_for_timeout(100)
    check('"say it again" keeps the same exercise and marks it as the second attempt', ev(f"/second attempt/.test({t})&&document.getElementById('spk-text').value===''"))
    ev("(t)=>{document.getElementById('spk-text').value=t;}", RO + ' Mai exact, învăț pentru BAC o oră.'); ev("spkSubmit()"); pg.wait_for_timeout(300)
    a3 = ev("spkAll('a').sort((a,b)=>a.at-b.at).slice(-1)[0]")
    check('the second attempt is linked to the first and both are kept for comparison', a3.get('prev') == a2['id'] and ev("spkAll('a').length") == 3 and ev(f"/first attempt 8/.test({t})"), a3.get('prev'))
    # ── adapts
    P = ev("spkProfile('ro')"); E = ev("spkProfile('en')")
    check('Romanian and English are kept apart: English shows nothing yet', P['n'] == 3 and P['coached'] == 2 and P['weak'] == 'prec' and E['n'] == 0 and E['weak'] is None, [P['n'], P['weak'], E['n']])
    nx = ev("spkNext('ro')")
    check('the next Romanian exercise follows the repeated weakness (precision → finding the precise word)', nx['dom'] == 'B' and 'Precision' in nx['why'], nx)
    check('English still starts from a first exercise', 'first exercise' in ev("spkNext('en').why"))
    ev("spkSet({lang:'en'}); spkOpen(); 0"); pg.wait_for_timeout(100)
    check('switching language takes one tap and is remembered', ev(f"/Next · English/.test({t})") and ev("spkCfg().lang") == 'en')
    # ── real life
    ev("spkObs(); 0"); ev("document.getElementById('spk-obs').value='Am vrut să spun că planul e ok but not sustainable pe termen lung'; spkObsSave(false); 0"); pg.wait_for_timeout(150)
    nx = ev("spkNext('en')")
    check('a moment from real life, in mixed Romanian and English, becomes the very next exercise', nx['id'].startswith('o:') and 'not sustainable pe termen lung' in nx['text'], nx)
    # ── words come back spaced; known only after four productions
    pg.clock.set_fixed_time('2026-11-21T09:00:00+02:00')
    check('the kept word is due the next day', ev("spkDue().length") == 1)
    ev("spkWords(); 0"); pg.wait_for_timeout(100)
    check('the review asks him to produce the word: it is hidden until he asks', ev(f"/say a sentence that uses it/.test({t})&&/lipsa zgomotului/.test({t})&&!!document.querySelector('#modal details')"))
    iv = []
    for d in ['2026-11-21', '2026-11-24', '2026-12-01', '2026-12-17']:
        pg.clock.set_fixed_time(d + 'T09:00:00+02:00'); ev(f"spkRev('{V[0]['id']}',true); 0"); iv.append(ev("spkAll('v')[0].iv"))
    check('intervals grow 3, 7, 16, 35 days and after four right in a row it is known and stops coming back', iv == [3, 7, 16, 35] and ev("spkAll('v')[0].reps") == 4 and ev("spkDue().length") == 0, iv)
    ev(f"spkRev('{V[0]['id']}',false); 0")
    check('getting it wrong sends it back to one day', ev("spkAll('v')[0].iv") == 1 and ev("spkAll('v')[0].reps") == 0)
    # ── a coach that answers nonsense is not shown
    ev("aiText=async()=>'I think you did great!'; SPKS.ex=null;SPKS.prev=null;spkTrain(true); 0")
    ev("(t)=>{document.getElementById('spk-text').value=t;}", 'I think the plan is fine but it will not last because nobody owns it and nobody checks it every week.'); ev("spkSubmit()"); pg.wait_for_timeout(300)
    check('an answer that cannot be checked is not shown; the attempt is still saved', ev(f"/could not be checked/.test({t})") and 'fb' not in ev("spkAll('a').sort((a,b)=>a.at-b.at).slice(-1)[0]"))
    got = ev("(()=>{const f=(q)=>(wfFind(q)[0]||[])[0];return [f('communication'),f('speak romanian')]})()")
    check('found by asking in plain words', got == ['speak', 'speak'], got)
    check('still one recommender; this adds no candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^spk/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
