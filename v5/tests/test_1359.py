"""War Room 13.59 checks: Communication, third increment (speak3.js). Today's session in five blocks that count only
when something was said, and progress with history: languages apart, no single score, search, first against second.
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
    check('version 13.59.0 or later', ev("APP_VERSION.localeCompare('13.59.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("aiCfg=()=>({}); spkOpen(); 0"); pg.wait_for_timeout(150)
    check('the front page offers today’s session and progress, and still fits', ev(f"/Today’s session/.test({t})&&/Progress and history/.test({t})&&{fits}"))
    P = ev("spdPlan('ro')")
    check('five blocks adding up to 23 minutes, none done, and "say it again" closed until something was said', [b['k'] for b in P] == list('ABCDE') and sum(b['min'] for b in P) == 23 and not any(b['done'] for b in P) and P[4]['tgt'] is None and P[2]['kind'] == 'ex' and P[3]['kind'] == 'ex', P)
    ev("spdOpen(); 0"); pg.wait_for_timeout(100)
    check('the session screen says a block counts when something was said, shows 0 of 5, and fits', ev(f"/0 of 5 done today/.test({t})&&/not when time has passed/.test({t})&&/Start with the warm-up/.test({t})&&{fits}"))
    TXT = 'Deci locul unde sunt acum este camera mea. Pentru că aici învăț și lucrez. De exemplu aici am biroul și telefonul de pe care sun.'
    ev("spdGo('A'); 0"); pg.wait_for_timeout(100)
    check('the warm-up is a fluency question at level 1 or 2', ev("SPKS.block") == 'A' and ev("SPKS.ex.dom") == 'D' and ev("SPKS.ex.st") <= 2 and ev(f"/Warm-up: answer at once/.test({t})"))
    ev("(v)=>{document.getElementById('spk-text').value=v; spkSubmit();}", TXT); pg.wait_for_timeout(200)
    check('the attempt carries its block', ev("spkAll('a')[0].blk") == 'A')
    ev("spkOpen(); 0"); pg.wait_for_timeout(100)
    P = ev("spdPlan('ro')")
    check('"Done" returns to the session, where the warm-up is ticked and "say it again" has opened', ev(f"/1 of 5 done today/.test({t})&&/Next block/.test({t})") and P[0]['done'] and not P[1]['done'] and P[4]['tgt'] is not None, [b['done'] for b in P])
    ev("spdGo('E'); 0"); pg.wait_for_timeout(100)
    ev("(v)=>{document.getElementById('spk-text').value=v; spkSubmit();}", TXT + ' Mai precis, de aici sun agențiile din Florida.'); pg.wait_for_timeout(200)
    P = ev("spdPlan('ro')")
    check('saying it again closes block E through the second attempt', P[4]['done'] and ev("spkAll('a').filter(a=>a.prev).length") == 1)
    check('the English session is separate: nothing done there', not any(b['done'] for b in ev("spdPlan('en')")))
    # words block: with a word due it becomes a review, and a review today ticks it
    ev("(()=>{bcW('spk:v:w1',{id:'w1',w:'liniște',lang:'ro',mean:'lipsa zgomotului',other:'quiet',at:now()-864e5,due:dk(new Date()),iv:1,reps:0});})(); 0")
    P = ev("spdPlan('ro')")
    check('with a word due, block C is a review of it', P[2]['kind'] == 'words' and '1 word due' in P[2]['note'] and not P[2]['done'], P[2])
    ev("spdGo('C'); 0"); pg.wait_for_timeout(100); ev("spkRev('w1',true); 0")
    check('reviewing a word today ticks block C', ev("spdPlan('ro')[2].done") is True)
    ev("aiCfg=()=>({key:'k'}); 0")
    check('with an AI key the main challenge is a conversation; without one it was an exercise', ev("spdPlan('ro')[3].kind") == 'conv')
    # ── progress: seeded scores
    ev("""(()=>{const mk=(i,lang,dim,score,pri)=>{const id='s'+lang+dim+i; bcW('spk:a:'+id,{id,at:now()-(30-i)*864e5,lang,ex:'a1',dom:'A',st:1,q:'Q '+i,text:'text number '+i+' about consistency and sleep',facts:{words:6},fb:{said:'s',worked:[],breaks:[],better:{},why:'',priority:pri?{dim:pri,tip:'t'}:null,scores:[{dim,score,quote:'text'}],words:[],dropped:0}});}; [8,8,8,8,8,5,5,5,5,5].forEach((s,i)=>mk(i,'ro','org',s,'prec')); [4,5,6].forEach((s,i)=>mk(i,'en','voc',s,null)); })(); 0""")
    R = ev("sppStats('ro')"); E = ev("sppStats('en')")
    org = [d for d in R['dims'] if d['k'] == 'org'][0]
    check('a dimension whose last five scores fell 1.5 below the five before is flagged, with its numbers', org['n'] == 10 and org['last'] == 5 and org['first'] == 8 and org['slipped'] is True, org)
    check('with three scores nothing is flagged and no "first" level is claimed', [d for d in E['dims'] if d['k'] == 'voc'][0] == {'k': 'voc', 'n': 3, 'first': None, 'last': 5, 'slipped': False}, E['dims'])
    check('what the coach kept naming is counted; languages are not mixed', R['pri'][0] == ['prec', 10] and E['pri'] == [] and R['n'] == 12 and E['n'] == 3, [R['pri'], R['n'], E['n']])
    ev("sppOpen(); 0"); pg.wait_for_timeout(150)
    check('the progress screen has no single score, says so, flags the slip, warns on few scores, and fits', ev(f"/no single score and no streak/.test({t})&&/may have slipped/.test({t})&&/too few to read anything into/.test({t})&&/attempts a week, last 8 weeks/.test({t})&&{fits}") and not ev(f"/overall|total score/i.test({t})"))
    check('history lists everything; search narrows it by what was said', ev("document.querySelectorAll('#spp-list > div').length") >= 15 and ev("sppFind('Florida').length") == 1 and ev("sppFind('zzzz').length") == 0)
    ev("sppList('Florida'); 0")
    check('a second attempt opens as a comparison', ev("/second attempt: compare/.test(document.getElementById('spp-list').textContent)"))
    sid = ev("spkAll('a').find(a=>a.prev).id"); ev(f"sppCmp('{sid}'); 0"); pg.wait_for_timeout(100)
    check('first and second are shown side by side with their word counts, and it does not claim the fix will stay', ev(f"/First · \\d+ words/.test({t})&&/Second · \\d+ words/.test({t})&&/not whether it will stay/.test({t})&&{fits}"))
    got = ev("[(wfFind('daily speaking session')[0]||[])[0],(wfFind('communication progress history')[0]||[])[0]]")
    check('both are found by asking in plain words', got == ['speakday', 'speakprog'], got)
    check('still one recommender; nothing here adds a candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^sp[kcxdp]/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
