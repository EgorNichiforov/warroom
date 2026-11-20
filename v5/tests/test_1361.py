"""War Room 13.61 checks: Communication, fourth increment (speak4.js). Levels 4 to 6 that open only on demonstrated
scores, and "habits to hold": the coach's one thing to fix coming back spaced, marked from what the coach says next.
The AI is a stand-in. Throwaway browser. Not a real phone."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    check('version 13.61.0 or later', ev("APP_VERSION.localeCompare('13.61.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('thirty exercises: one per domain and level, 1 to 6, both languages', ev("SPK_EX.length===30&&SPK_TOP===6&&['A','B','C','D','E'].every(d=>[4,5,6].every(s=>SPK_EX.filter(e=>e[1]===d&&e[2]===s).length===1))&&new Set(SPK_EX.map(e=>e[0])).size===30"))
    mk = """(dom,lang,st,score,i,pri)=>{const id='L'+dom+lang+st+i; bcW('spk:a:'+id,{id,at:now()-(20-i)*36e5,lang,ex:dom.toLowerCase()+st,dom,st,q:'Q',text:'some words he said about the plan',facts:{words:7},fb:{said:'s',worked:[],breaks:[],better:{},why:'',priority:pri?{dim:pri,tip:'Name the concrete thing.'}:null,scores:[{dim:'org',score,quote:'some words'}],words:[],dropped:0}});}"""
    check('with no coached attempts every domain is at level 1', ev("['A','B','C','D','E'].map(d=>spkReach(d,'ro')).join()") == '1,1,1,1,1')
    for i in range(3): ev(f"({mk})('A','ro',3,8,{i},null)")
    check('three coached level-3 attempts all at 7 or more open level 4, in that domain and that language only', ev("spkReach('A','ro')") == 4 and ev("spkReach('A','en')") == 1 and ev("spkReach('B','ro')") == 1)
    ev("aiCfg=()=>({}); 0")
    nx = ev("(()=>{SPKS.ex=null; const P={weak:null}; return spkNext('ro')})()")
    ev("SPKS.ex={id:'a4',dom:'A',st:4,text:SPK_EX.find(e=>e[0]==='a4')[3],why:'',lang:'ro'}; spkTrain(); 0"); pg.wait_for_timeout(100)
    check('the exercise screen says "level 4 of 6" and shows the level-4 exercise', ev(f"/level 4 of 6/.test({t})&&/cauză și efect/.test({t})&&{fits}"))
    ev(f"({mk})('A','ro',4,5,9,null)")
    check('one weak attempt at level 4 does not open level 5, and does not send him back below 4', ev("spkReach('A','ro')") == 4)
    for i in range(10, 13): ev(f"({mk})('A','ro',6,9,{i},null)")
    check('the top is level 6: nothing above it', ev("spkReach('A','ro')") == 6)
    # ── habits to hold
    check('no cards before the coach has named anything', ev("sphSync()") == 0 and ev("spkAll('h').length") == 0)
    ev(f"({mk})('B','ro',1,6,14,'prec')"); ev(f"({mk})('B','en',1,6,15,'prec')"); ev(f"({mk})('B','ro',1,6,16,'prec')")
    made = ev("sphSync()"); H = ev("spkAll('h')")
    check('one card per language and skill, however often it was named; the count is kept', len(H) == 2 and sorted(h['lang'] for h in H) == ['en', 'ro'] and [h for h in H if h['lang'] == 'ro'][0]['n'] == 2 and all(h['dim'] == 'prec' and h['reps'] == 0 for h in H), H)
    check('making cards twice changes nothing', ev("sphSync()") == 0)
    check('a card is not due on the day it was made', ev("sphDue().length") == 0)
    pg.clock.set_fixed_time('2026-11-23T10:00:00+02:00')
    check('it is due two days later', ev("sphDue('ro').length") == 1 and ev("sphDue('en').length") == 1)
    ev("sphOpen(); 0"); pg.wait_for_timeout(100)
    check('without an AI key the card is marked by him, and the screen says a card is a sign, not proof; fits', ev(f"/Held it/.test({t})&&/Slipped/.test({t})&&/a sign, not proof/.test({t})&&/Name the concrete thing/.test({t})&&{fits}"))
    ev("sphRev('ro-prec',true); 0")
    check('holding it once moves it to five days', ev("bcV('spk:h:ro-prec',null).iv") == 5 and ev("bcV('spk:h:ro-prec',null).due") == '2026-11-28')
    # with a coach: marked from what the coach says next
    ev("""aiCfg=()=>({key:'k'}); window.__pri='prec'; aiText=async()=>JSON.stringify({said:'A spus ideea.',worked:[],breaks:[],better:{},why:'',priority:{dim:window.__pri,tip:'Fii concret.'},scores:[{dim:'org',score:7,quote:'pentru că'}],words:[]}); 0""")
    ev("sphGo('en-prec'); 0"); pg.wait_for_timeout(100)
    check('practising a card opens a fresh exercise in its language and skill, with the thing to hold on screen', ev("spkCfg().lang") == 'en' and ev("SPKS.ex.dom") == 'B' and ev(f"/Hold this while you speak: Name the concrete thing/.test({t})"))
    ev("document.getElementById('spk-text').value='I think the plan is fine because, pentru că, it gives me one clear thing to do every single morning.'; spkSubmit(); 0"); pg.wait_for_timeout(350)
    h = ev("bcV('spk:h:en-prec',null)")
    check('the coach named precision again, so the card slipped and returns in two days, marked from the coach', h['last'] == 'slipped' and h['reps'] == 0 and h['iv'] == 2 and h['auto'] is True and ev("spkAtt('en').slice(-1)[0].hmark") == 'slipped', h)
    pg.clock.set_fixed_time('2026-11-25T10:00:00+02:00'); ev("window.__pri='org'; sphGo('en-prec'); 0"); pg.wait_for_timeout(100)
    ev("document.getElementById('spk-text').value='The plan gives me one task each morning, pentru că without it I drift between three things.'; spkSubmit(); 0"); pg.wait_for_timeout(350)
    h = ev("bcV('spk:h:en-prec',null)")
    check('next time the coach names something else, so the card held and moves to five days', h['last'] == 'held' and h['reps'] == 1 and h['iv'] == 5, h)
    check('the new thing the coach named becomes its own card, not a rewrite of the old one', ev("(sphSync(), spkAll('h').filter(x=>x.lang==='en').map(x=>x.dim).sort().join())") == 'org,prec')
    for i in range(3): ev("sphRev('ro-prec',true,true); 0")
    check('four holds in a row and the card is kept: it stops coming back', ev("bcV('spk:h:ro-prec',null).reps") == 4 and ev("sphDue('ro').some(x=>x.id==='ro-prec')") is False)
    ev("spkSet({lang:'ro'}); spkOpen(); 0"); pg.wait_for_timeout(150)
    check('the front page offers the cards and still fits', ev(f"/Habits to hold/.test({t})&&{fits}"))
    check('found by asking in plain words', ev("(wfFind('habits corrected pattern')[0]||[])[0]") == 'speakhabit')
    check('still one recommender; nothing here adds a candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^sp[kcxdph]/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
