"""War Room 13.32 journey checks: Mission Control stays the one global recommender and now sees follow-ups, a falling
KPI, the company-OS step, overdue tasks, energy and Learn; "I have N minutes" filters its ranking; done vs evidence vs
outcome; one capture that loses nothing; one timed learning planner. Letters refer to the acceptance tests of the
whole-system brief. Throwaway browser, cloud blocked. Not a real phone."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
CH = dict(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
def boot(b, t='2026-11-19T17:00:00+02:00', keep=None):
    ctx = keep or b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/rest/v1/**', lambda r: r.abort()); pg.route('**/*.mp3', lambda r: r.abort())
    pg.clock.install(time=t); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4000)
    pg.evaluate("CP_NOLATE=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    return ctx, pg, errs
CALLS = """(()=>{ const mk=(id,days,n,ans)=>{ const log=[]; for(let i=0;i<n;i++){ const d=new Date(Date.now()-days*864e5-i*60000); log.push({at:d.toISOString(), r:i<ans?'Gatekeeper':'No answer', note:'', day:dk(d), d:{dials:1,owners:0}}); } Q.items[id]={id,agency:'Agency '+id,status:'voicemail',attempts:n,log,_u:now()}; };
  mk('k1',20,80,40); mk('k2',3,80,%d); qSave(false); })(); 0"""

with sync_playwright() as p:
    b = p.chromium.launch(**CH); ctx, pg, errs = boot(b); ev = pg.evaluate
    ev("S.settings.season={dom:'biz',kind:'bizbuild',primary:'20k MRR',secondary:'Body',set:'2026-11-19'}; save(); 0")
    check('version 13.32.x and the coordination layer is wired into the existing hooks', ev("/^13\\.32\\./.test(APP_VERSION)&&lxCandidates._co===1&&mcCard._co===1&&typeof coCandidates==='function'"), ev("APP_VERSION"))
    kinds = ev("mcBuild().C.map(c=>c.k+':'+c.tier)")
    check('still exactly one global recommender: one ranked list, one top, one card', ev("(()=>{const M=mcBuild();return Array.isArray(M.C)&&M.top===(M.C[0]||null)&&[...M.C].sort((a,b)=>a.tier-b.tier||b.urg-a.urg).every((c,i)=>c===M.C[i])})()") and ev("(()=>{arcShow();return document.querySelectorAll('#arc .mc').length===1&&document.querySelectorAll('#arc .mc .mc-out, #arc .mc .mc-sb b').length===1})()"), kinds)
    check('every candidate keeps the contract: id, domain, outcome, reason, minutes, done condition, evidence, cost of delay, confidence', ev("mcBuild().C.every(c=>(c.sid||c.k)&&c.dom&&c.out&&c.why&&c.min!=null&&c.dod!=null&&Array.isArray(c.ev)&&c.late&&c.conf)"), ev("mcBuild().C.filter(c=>!(c.dom&&c.out&&c.why&&Array.isArray(c.ev)&&c.late&&c.conf)).map(c=>c.k)"))

    # ── A · business bottleneck
    check('A · no signal, no corrective action (nothing invented)', ev("!mcBuild().C.some(c=>c.k==='fix')"))
    ev(CALLS % 8); pg.wait_for_timeout(200)
    A = ev("(()=>{const M=mcBuild(),f=M.C.find(c=>c.k==='fix'),i=M.C.indexOf(f);return f?{tier:f.tier,ev:f.ev[0],lesson:f.lesson,has:!!(f.lesson&&XC.byId[f.lesson]),cap:f.cap,below:M.C.slice(i+1).map(c=>c.k),above:M.C.slice(0,i).map(c=>c.k+':'+c.tier),next:f.next,dod:f.dod}:null})()")
    check('A · the answer rate falls → Mission Control ranks one corrective action with its evidence and the lesson that teaches it', A and A['tier'] == 1 and 'fell from' in A['ev'] and 'call log' in A['ev'] and A['has'] and A['cap'] == 'b-cold' and all(x.endswith(':0') or x.endswith(':1') for x in A['above']), A)
    ev(CALLS % 42); pg.wait_for_timeout(200)
    check('A · when the number recovers the action leaves the list by itself', ev("!mcBuild().C.some(c=>c.k==='fix')"))
    ev("delete Q.items.k1; delete Q.items.k2; qSave(false); 0")

    # ── E · conflicting priorities
    ev("S.tasks['ot1']={id:'ot1',_u:now(),title:'Renew the tennis club card',due:'2026-11-10',done:false}; S.tasks['ot2']={id:'ot2',_u:now(),title:'Buy strings',due:'2026-11-15',done:false}; save(); Q.items['w1']={id:'w1',agency:'Palm Home Care',status:'owner',attempts:2,log:[{at:new Date(Date.now()-12*864e5).toISOString(),r:'OWNER TALK → callback',note:'',d:{dials:1,owners:1}}],_u:now()}; qSave(false); 0")
    E = ev("(()=>{const M=mcBuild(),ix=(k)=>M.C.findIndex(c=>c.k===k),t=M.C.find(c=>c.k==='task'),f=M.C.find(c=>c.k==='follow'),o=M.C.find(c=>c.k==='os');return {order:M.C.map(c=>c.k),dial:ix('dial'),task:ix('task'),follow:ix('follow'),os:ix('os'),learn:ix('learn'),tout:t&&t.out,tev:t&&t.ev,fout:f&&f.out,osTier:o&&o.tier,tTier:t&&t.tier}})()")
    check('E · overdue tasks arrive as ONE line (the oldest), with the count as evidence', E['task'] >= 0 and 'Renew the tennis club card' in E['tout'] and '2 overdue' in ' '.join(E['tev']) and E['order'].count('task') == 1, E)
    check('E · an agency left waiting becomes a follow-up candidate', E['follow'] >= 0 and 'Palm Home Care' in E['fout'], E)
    check('E · the company-OS step is a protected commitment, never above the dial block', E['os'] >= 0 and E['osTier'] == 2 and (E['dial'] < 0 or E['dial'] < E['os']), E)
    check('E · an easy overdue task never outranks the season priority', E['tTier'] == 2 and (E['dial'] < 0 or E['dial'] < E['task']) and E['follow'] < E['task'], E)
    F = ev("(()=>{const M={free:25,C:[{k:'fixed',tier:0,out:'Tennis lesson',why:'fixed'},{k:'dial',tier:1,out:'dials',why:'',min:60}]};const a=coFitPick(20,M);const M2={free:12,C:[{k:'train',tier:1,out:'Train',why:'',min:45,dod:''},{k:'dial',tier:1,out:'dials',why:'',min:60,dod:''},{k:'learn',tier:3,out:'Learn',why:'',min:20,dod:''}]};const b=coFitPick(30,M2);const c=coFitPick(4,{free:0,C:[{k:'dial',tier:1,out:'d',why:'',min:60}]});return {fixed:!!a.fixed&&!a.pick,cap:b.cap,pick:b.pick&&b.pick.k,skipped:b.skipped.map(s=>s.k),rest:c.pick===null&&c.skipped.length===1}})()")
    check('E · a fixed commitment is respected: no "best use" is offered inside it', F['fixed'], F)
    check('E · time is capped by the next fixed commitment; what does not fit is named, the first that fits is chosen', F['cap'] == 12 and F['pick'] == 'dial' and F['skipped'] == ['train'], F)
    check('E · when nothing fits, the answer is rest, not filler', F['rest'], F)
    ev("(()=>{const o=day(new Date());o.energy=[{t:600,v:2},{t:900,v:1}];touch(o);})(); 0")
    check('E · two low energy readings propose a Minimum day and change nothing by themselves', ev("(()=>{const M=mcBuild();return M.mode==='full'&&M.risks.some(r=>/Minimum day/.test(r.t)&&r.act==='mcModeOpen()')})()"))
    ev("(()=>{const o=day(new Date());o.energy=[{t:600,v:4}];touch(o);})(); 0")
    check('E · normal energy adds no line', ev("!mcBuild().risks.some(r=>/Minimum day/.test(r.t))"))

    # ── C · I have 20 minutes (Day card → Mission Control → Learn planner)
    ev("arcShow(); 0"); pg.wait_for_timeout(300)
    check('C · the Day card carries "I have 5 10 20 30 60 …" and still one mission', ev("document.querySelectorAll('#arc .co-fit button').length===6"))
    ev("coFit(20); 0"); pg.wait_for_timeout(300)
    check('C · 20 minutes opens one answer with reason, done condition and evidence, from the same ranking', ev("/20 minutes/.test(document.querySelector('#modal h2').textContent)&&/Best use|Not free time/.test(document.getElementById('modal').textContent)&&/Mission Control/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    ev("closeModal(); COF=coFitPick(20,{free:0,C:[{k:'learn',tier:3,out:'Learn: x',why:'y',min:20,dod:'z',ev:[]}]}); coFitGo(); 0"); pg.wait_for_timeout(700)
    check('C · a learning answer is handed to the one Learn planner with the same minutes', ev("/^20 minutes/.test((document.querySelector('#modal h2')||{}).textContent||'')&&!!document.querySelector('#modal .lx-pst')"), ev("(document.querySelector('#modal h2')||{}).textContent"))
    ev("closeModal(); 0")
    check('C · one timed learning planner: the Library planner and the old 25-minute mission both open Learn', ev("(()=>{ccPlanOpen(15);const a=/^15 minutes/.test((document.querySelector('#modal h2')||{}).textContent||'');closeModal();cpMissionStart(0);const b=/^25 minutes/.test((document.querySelector('#modal h2')||{}).textContent||'');closeModal();bcS={scr:'home',tab:'library'};render();const el=document.querySelector('#view-boot .cc-min');const c=el?getComputedStyle(el).display:'none';return {a,b,c}})()") == {'a': True, 'b': True, 'c': 'none'})
    check('C · a 25-minute session has the old mission\'s rebuild-from-memory and debrief steps', ev("(()=>{(()=>{const o=day(new Date());o.counters.dials=12;touch(o);})();const k=lxBuild(25,'biz',{dry:1}).steps.map(s=>s.k);return k.includes('rebuild')&&k[k.length-1]==='debrief'&&lxBuild(25,'biz',{dry:1}).planned<=25})()"), ev("lxBuild(25,'biz',{dry:1}).steps.map(s=>s.k+':'+s.min)"))
    check('H · an old capability mission in progress is still readable in its own screen', ev("(()=>{bcW('cm:'+cpToday(),{t0:Date.now(),long:0,id:null,rv:1});cpMissionStart(0);const ok=bcS.scr==='cpm';bcW('cm:'+cpToday(),0);bcS={scr:'home',tab:'now'};return ok})()"))

    # ── B, D · personal development is a protected commitment once YOU set the minimum
    check('B · with no minimum set, Learn is a maintenance candidate and says so nowhere as a guarantee', ev("(()=>{CO_LEARN.t=0;const c=mcBuild().C.find(c=>c.k==='learn');return c&&c.tier===3})()"), ev("mcBuild().C.map(c=>c.k)"))
    ev("S.settings.learn={persMin:90}; CO_LEARN.t=0; 0")
    B = ev("(()=>{const c=mcBuild().C.find(c=>c.k==='learn');return c?{tier:c.tier,dom:c.dom,why:c.why,ev:c.ev[0],out:c.out}:null})()")
    check('B · a weekly personal minimum makes personal development a protected commitment in Mission Control', B and B['tier'] == 2 and B['dom'] == 'life' and '90 minutes' in B['why'] and 'personal minutes this week' in B['ev'], B)
    ev("bpSet('c-humour'); 0"); pg.wait_for_timeout(200); ev("document.querySelector('input[name=bp-st][value=\"4\"]').checked=true; $('bp-pf').value='Told the story at the club on 19 Nov, three people laughed, coach saw it'; bpSetSave('c-humour'); 0")
    check('B, D · demonstrated improvement is ONE record: the proof lands in the capability evidence that every screen reads', ev("cmLog('c-humour').some(e=>e.src==='real'&&/three people laughed/.test(e.ev))&&bpStage(bpGet('c-humour'))>=4"))
    check('D · a practical capability with no lesson is declared and gets a research request, not a made-up lesson', ev("(()=>{const x=bpGet('bp-cook');return bpMissing(x).includes('lesson')&&!!bpJob('bp-cook')&&Object.values(S.research).some(r=>r.key==='bp:bp-cook'&&r.st==='open')})()"))
    ev("S.settings.learn={persMin:null}; CO_LEARN.t=0; closeModal(); 0")

    # ── G · done is not outcome
    ev("mcGo('bac'); closeModal(); if(typeof arcShow==='function')arcShow(); 0"); pg.wait_for_timeout(200)
    ev("mcDoneToggle('bac'); 0"); pg.clock.run_for(400); pg.wait_for_timeout(300)
    check('G · marking a mission done asks expected vs actual and says whether the logs agree', ev("/Marked done/.test((document.querySelector('#modal h2')||{}).textContent||'')&&/Marked by hand/.test(document.getElementById('modal').textContent)&&!!$('co-exp')&&!!$('co-obs')"), ev("(document.querySelector('#modal h2')||{}).textContent"))
    ev("$('co-exp').value='Finish one History topic'; $('co-obs').value='Half a topic, phone interrupted twice'; coDoneSave(); 0")
    G = ev("coWeekActions(new Date()).slice(-1)[0]")
    check('G · the record separates marked done, evidence in the logs, and the outcome', G and G['marked'] is True and G['ev'] is False and 'Half a topic' in G['obs'] and 'History' in G['exp'], G)
    ev("mcWeekOpen(); 0"); pg.wait_for_timeout(300)
    check('G · the weekly review arrives filled from the records', ev("!!document.getElementById('co-week')&&/marked done · no evidence in the logs · outcome: Half a topic/.test(document.getElementById('co-week').textContent)&&/1 marked done with no evidence/.test(document.getElementById('co-week').textContent)"), ev("(document.getElementById('co-week')||{}).textContent"))
    ev("$('wk-a').value='BAC moved a little'; $('wk-c').value=''; mcWeekSave(); 0")
    check('G · a review cannot be saved without the one change', ev("!((S.reviews||{})[weekKey(new Date())]||{}).text"))
    n0 = ev("Object.keys(S.tasks).length")
    ev("$('wk-c').value='Phone in the other room during BAC'; mcWeekSave(); 0"); pg.wait_for_timeout(200)
    check('G · the change is saved with the week\'s actions and becomes a task for Monday', ev("(()=>{const R=S.reviews[weekKey(new Date())];return R.change==='Phone in the other room during BAC'&&R.acts.length>=1&&!!S.tasks[R.changeTask]&&/Weekly change/.test(S.tasks[R.changeTask].title)})()") and ev("Object.keys(S.tasks).length") == n0 + 1)
    check('G · nothing was invented: no decision, campaign or outcome exists that you did not write', ev("Object.keys(S.decisions||{}).length===0&&Object.values(S.campaigns||{}).filter(c=>c&&!c.seed&&!c._del).length===0"))

    # ── F · capture
    ev("shCapture(); 0"); pg.wait_for_timeout(300)
    check('F · the + sheet keeps its log box and adds "send it as" with an Unprocessed counter', ev("!!$('arc-in')&&document.querySelectorAll('#co-ck button').length===8&&!!document.querySelector('.co-un')"))
    pg.fill('#arc-in', 'Owner said two caregivers quit last Friday and she covered the shifts herself'); pg.wait_for_timeout(100)
    check('F · it suggests where the line belongs but does not decide', ev("document.querySelector('#co-ck button.on').dataset.k==='market'&&coCaps().length===0"))
    ev("coCap('market'); 0"); pg.wait_for_timeout(300)
    check('F · the market-note form opens with the words already in it', ev("/Market note/.test((document.querySelector('#modal h2')||{}).textContent||'')&&/two caregivers quit/.test($('so-t').value)&&coOpenCaps().length===1&&coOpenCaps()[0].st==='sent'"))
    ev("$('so-w').value='Sunrise Test Care'; stObsSave(); 0"); pg.wait_for_timeout(200)
    Fc = ev("(()=>{const o=Object.values(S.obs).find(o=>/two caregivers quit/.test(o.text)),c=coCaps()[0];return {obs:!!o,kind:o&&o.kind,capLink:o&&o.cap===c.key,st:c.st,to:c.to,raw:c.raw,ev:stEvidence().some(e=>e.id===(o||{}).id),open:coOpenCaps().length}})()")
    check('F · saved as a classified market note, linked both ways to the original line, and counted as market evidence', Fc['obs'] and Fc['kind'] in ('problem', 'quote') and Fc['capLink'] and Fc['st'] == 'routed' and Fc['to'].startswith('market:') and 'two caregivers quit' in Fc['raw'] and Fc['ev'] and Fc['open'] == 0, Fc)
    ev("shCapture(); 0"); pg.wait_for_timeout(200); pg.fill('#arc-in', 'the thing about the green folder'); ev("arcLogSave(); 0"); pg.wait_for_timeout(200)
    check('F · a line the logger cannot read is kept in Unprocessed instead of being refused', ev("coOpenCaps().length===1&&coOpenCaps()[0].raw==='the thing about the green folder'&&coOpenCaps()[0].st==='new'"))
    ev("shCapture(); 0"); pg.wait_for_timeout(200); pg.fill('#arc-in', '12 dials 1 owner'); ev("arcLogSave(); 0"); pg.wait_for_timeout(200)
    check('F · numbers still log as before and are not captured as text', ev("coOpenCaps().length===1&&Number(day(new Date()).counters.dials)>=12"))
    ev("coInbox(); 0"); pg.wait_for_timeout(200)
    check('F · Unprocessed lists the line with every route; "not needed" keeps it, marked', ev("document.querySelectorAll('#modal .st-o').length===1&&document.querySelectorAll('#modal .co-kinds button').length===7") and ev("(()=>{const k=coOpenCaps()[0].key;coCapSet(k,{st:'dropped'});return coOpenCaps().length===0&&coCaps().some(c=>c.key===k&&c.raw&&c.st==='dropped')})()"))
    ev("closeModal(); 0")

    # ── 8 · one door, truthful automation
    check('one door: the Content tab under You points to Learn → Library', ev("(()=>{lifeTab='content';show('life');return /The Library lives in Learn/.test(document.getElementById('view-life').textContent)&&!document.querySelector('#view-life .cc-min')})()"))
    R = ev("coAutoRows().map(r=>r[0]+'|'+r[1])")
    check('automation status says what is blocked and what needs a tap', 'Daily research|blocked' in R and 'Research now|tap' in R and 'Real-phone test|tap' in R and any(x.startswith('Weekly content scan|') for x in R), R)
    ev("coAuto(); 0"); pg.wait_for_timeout(200)
    check('automation screen renders without overflow', ev("document.querySelectorAll('#modal .st-o').length>=10&&document.getElementById('modal').scrollWidth<=390"))
    ev("closeModal(); 0")
    check('BAC wording: the Day reason no longer promises an 8+ average', ev("!mcBuild().C.some(c=>/8\\+/.test(c.why+c.out))") and ev("fetch('./mission.js').then(r=>r.text()).then(t=>!/8\\+ average/.test(t))"))
    check('the Build Gate file is back in the app folder with its original rules', ev("fetch('./BUILD_GATE.md').then(r=>r.ok?r.text():'').then(t=>/20 dials × weekdays so far/.test(t)&&/override the gate/.test(t))"))

    # ── H · persistence
    ev("coCapNew('persist me','')+''; S.settings.learn={persMin:45}; save(true); 0"); pg.wait_for_timeout(500)
    pg.close(); ctx2, pg, errs2 = boot(b, '2026-11-19T17:30:00+02:00', keep=ctx); ev = pg.evaluate
    H = ev("({cap:coOpenCaps().some(c=>c.raw==='persist me'),min:lxPersMin(),rev:!!(S.reviews[weekKey(new Date())]||{}).acts,obs:Object.values(S.obs).some(o=>o.cap),ev:cmLog('c-humour').length>=1,done:!!(S.days[dk(new Date())].mcDone||{}).obs})")
    check('H · close and reopen: captures, links, the review, evidence, the outcome note and the setting are all still there', all(H.values()) and H['min'] == 45, H)
    check('H · sessions logged before 13.32 (no note, no rebuild step) still read', ev("(()=>{bcW('lx:log',[{at:'2026-11-19T10:00:00Z',d:'2026-11-19',min:20,spent:18,dom:'biz',mode:'learn',done:3,total:3,kinds:['lesson','practice','mission'],card:'x',skipped:[],early:0}]);lxGo();return /Last session/.test(document.querySelector('.lx').textContent)&&lxWeekMin('biz')===18})()"))
    check('no page errors', not errs and not errs2, (errs + errs2)[:3])
    b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
