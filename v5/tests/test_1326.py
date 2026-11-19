"""War Room 13.26 regression checks (life layer, capability map, journal, judgment lab, defense, knowledge pipeline).
Run: python3 -m http.server 8765 (repo root) then python3 v5/tests/test_1326.py
Uses a fixed clock (Thu 19 Nov 2026 17:00 Chisinau = 10:00 Florida) so results do not depend on the hour."""
import sys, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept('note'))
    pg.clock.install(time='2026-11-19T17:00:00+02:00')
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.clock.run_for(4000)
    ev = lambda js: pg.evaluate(js)
    ev("CP_NOLATE=1; XC||xcLoad(); BC||bcLoad();")
    pg.wait_for_timeout(1500); pg.clock.run_for(1500)
    check('cards and bootcamp loaded', ev("!!(XC&&XC.byId&&BC&&BC.cardMod)"))

    # 20 · existing data survives: an old state without the new maps loads, seeds once
    ev("delete S.journal; delete S.risks; delete S.manual; delete S.reality; delete S.sources; delete S.migrations.m1326r; delete S.migrations.m1326c; save(true)")
    n1 = ev("rlSeed(); rlFacts().length"); n2 = ev("rlSeed(); rlFacts().length")
    check('reality model seeds once (idempotent)', n1 > 5 and n1 == n2, (n1, n2))
    check('assumption/verify facts are labelled, not facts', ev("rlFacts().some(f=>f.st==='verify')"))
    check('new maps sync', ev("['journal','risks','manual','reality','sources'].every(k=>MERGE_MAPS.includes(k))"))

    # B3 capability map
    check('nine domains', ev("CM_DOM.length===9 && CM_DOM.every(d=>CM_CAPS[d[0]].length>0)"))
    check('every mapped card exists in the library', ev("cmAll().every(c=>(c.cards||[]).every(id=>!!XC.byId[id]))"), ev("cmAll().flatMap(c=>(c.cards||[]).filter(id=>!XC.byId[id]))"))
    check('missing content listed, not invented', ev("cmGaps().length>0 && cmGaps().every(c=>!cmCards(c).length)"))
    check('every capability has the 7 definitions', ev("cmAll().every(c=>c.mean&&c.beh&&c.know&&c.prac&&c.ev&&c.as&&c.nx)"))

    # 6 · real business experience creates capability evidence; log alone ≠ mastery
    ev("S.boot=S.boot||{}; S.boot['cx:b-objection']={id:'cx:b-objection',_del:true,_u:now()}")
    ev("cmRecord('b-objection',{eff:'did',out:'good',comp:'yes',ev:'',note:'logged a call'})")
    check('claimed skill without evidence is not demonstrated', ev("cmPerf('b-objection').lv<3"), ev("cmPerf('b-objection')"))
    ev("cmRecord('b-objection',{eff:'did',out:'good',comp:'yes',ev:'owner booked a meeting after the vendor objection',note:'call'})")
    check('skill to standard WITH evidence is demonstrated', ev("cmPerf('b-objection').lv===3"))
    check('a simulation never counts as performance', ev("cmRecord('c-listen',{src:'sim',eff:'did',comp:'yes',ev:'sim ok'}); cmPerf('c-listen').lv===0"))

    # 7 · repeated weakness → targeted Bootcamp mission
    ev("['a','b'].forEach(()=>cmRecord('b-disco',{eff:'did',out:'bad',comp:'no',note:'talked too much'}))")
    nx = ev("(()=>{const n=cmNext();return {cap:n.cap.id,act:n.act[0],why:n.why}})()")
    check('two shortfalls make it the next capability with targeted practice', nx['cap'] == 'b-disco' and 'practice' in nx['act'].lower(), nx)
    check('recurring weakness detected', ev("cmWeak().some(x=>x.c.id==='b-disco')"))

    # B4 · after-action review: a review alone never moves the ladder
    cid = ev("cmCards(cmCap('b-objection'))[0]")
    ev(f"bcW('l:{cid}',{{at:'2026-11-01'}}); bcW('u:{cid}',null)")
    ev(f"cpAar('{cid}','b-objection')")
    ev("$('cp-a1').value='Owner said they have a vendor'; $('cp-a4').value='Ask what they would change about the vendor'; document.querySelector('input[name=cm-eff][value=did]').checked=true; document.querySelector('input[name=cm-comp][value=no]').checked=true; cpAarSave()")
    check('AAR without competence does not count as real use', ev(f"!bcV('u:{cid}',null)"))
    ev(f"cpAar('{cid}','b-objection')")
    ev("$('cp-a1').value='Vendor objection'; $('cp-a4').value='same'; document.querySelector('input[name=cm-eff][value=did]').checked=true; document.querySelector('input[name=cm-comp][value=yes]').checked=true; $('cm-ev').value='booked a 10-min call'; cpAarSave()")
    check('AAR with skill to standard + evidence counts as real use', ev(f"!!bcV('u:{cid}',null)"))
    check('AAR is linked to the capability record', ev("cmLog('b-objection').some(x=>x.aar)"))

    # 9 · watched is not mastered
    st = ev(f"cpLessonState('{cmCards(None) if False else cid}').st") if False else ev("(()=>{const id=Object.keys(BC.cardMod).find(i=>!bcV('l:'+i,null));return cpLessonState(id).st})()")
    check('unstarted lesson is not learned', st in ('new', 'wat'), st)

    # 1 · season influences priorities; 18 · lens changes relevance, fixed commitments stay first
    ev("S.settings.season={kind:'bacprep',dom:'bac',primary:'BAC 8+'}; S.days[dk(new Date())]=Object.assign(day(new Date()),{counters:{dials:0,bac:0},lens:''}); S.days[dk(new Date())].mcSkip=[]; delete S.days[dk(new Date())].sched")
    t1 = ev("(()=>{const M=mcBuild();return M.C.map(c=>c.k+':'+c.tier)})()")
    ev("S.settings.season={kind:'bizbuild',dom:'biz',primary:'first client'}")
    t2 = ev("(()=>{const M=mcBuild();return M.C.map(c=>c.k+':'+c.tier)})()")
    check('season changes the tier of a domain', t1 != t2 and any(x.startswith('bac:1') for x in t1) and not any(x.startswith('bac:1') for x in t2), (t1, t2))
    ev("day(new Date()).lens='bac'")
    t3 = ev("(()=>{const M=mcBuild();return {lens:M.lens,C:M.C.map(c=>c.k+':'+c.tier)}})()")
    check('lens overrides the season for today', t3['lens'] == 'bac' and any(x.startswith('bac:1') for x in t3['C']), t3)
    ev("day(new Date()).sched={skip:[],add:[{id:'fx1',title:'School test',start:'16:50',end:'17:40',days:[4],kind:'school'}]}")
    t4 = ev("mcBuild().top.k")
    check('a fixed commitment still outranks the lens', t4 == 'fixed', t4)
    ev("delete day(new Date()).sched; day(new Date()).lens=''")

    # 2/3 · campaign linked to the mission, evidence only
    ev("S.campaigns={}; S.campaigns.ct={id:'ct',_u:now(),title:'FIRST CLIENT',objective:'first agency pays',deadline:'2027-01-31',milestones:[{t:'Payment route working',done:true},{t:'First case taken',done:true,ev:'case 12 Dec'}],active:true}")
    cp = ev("(()=>{const M=mcBuild();const c=M.C.find(x=>x.dom==='biz'&&x.camp);return c?{t:c.camp.title,pct:c.camp.pct}:null})()")
    check('mission names the campaign; ticks without evidence do not count', cp and cp['pct'] == 50, cp)

    # 4/5 · impossible week → proposal → nothing changes until confirmed → undo
    ev("(()=>{const d=addDays(new Date(),1);const o=day(d);delete o.sched;const sc=dayOnce(d);for(let i=0;i<7;i++)sc.add.push({id:'ov'+i,title:'BAC block '+i,start:mcHm(6*60+i*120),end:mcHm(6*60+i*120+115),days:[5],kind:'bac'});})()")
    check('overloaded day detected', ev("rlDay(addDays(new Date(),1)).over"))
    before = ev("JSON.stringify(S.days[dk(addDays(new Date(),1))].sched)")
    ev("rlReplanWeek()")
    check('proposal shows KEEP/MOVE/REDUCE/DROP and changes nothing yet', ev("RLP&&RLP.some(p=>p.act!=='keep')") and before == ev("JSON.stringify(S.days[dk(addDays(new Date(),1))].sched)"))
    ev("rlReplanApply()")
    after = ev("JSON.stringify(S.days[dk(addDays(new Date(),1))].sched)")
    check('applying writes day overrides only', after != before and ev("Object.values(S.journal).some(j=>j.kind==='replan'&&j.undo)"))
    ev("rlReplanUndo(Object.values(S.journal).find(j=>j.kind==='replan'&&j.undo).id)")
    check('undo restores the original plan', before == ev("JSON.stringify(S.days[dk(addDays(new Date(),1))].sched)"))
    check('dials are only moved inside the Florida window', ev("(()=>{const w=rlFlWindow(new Date('2026-11-20T12:00:00'));return w&&w[0]===16*60&&w[1]===24*60})()"), ev("rlFlWindow(new Date('2026-11-20T12:00:00'))"))

    # 11/12 · decision recorded, reviewed, linked; prediction vs outcome
    ev("jlDecEdit(''); $('jd-req').value='Which territory first'; $('jd-options').value='Naples\\nTampa Bay'; $('jd-assumptions').value='Tampa Bay has more private-pay agencies'; $('jd-title').value='Tampa Bay first'; $('jd-review').value=dk(new Date()); $('jd-cap').value='d-evidence'; jlDecSave('')")
    did = ev("Object.values(S.decisions).find(x=>x.title==='Tampa Bay first').id")
    check('decision recorded and due for review', ev("lxDue().dec>=1"))
    ev(f"jlDecEdit('{did}'); $('jd-result').value='More answers in Tampa'; $('jd-luck').value='reason'; document.querySelectorAll('.jd-q').forEach((c,i)=>c.checked=i<5); jlDecSave('{did}')")
    check('review stored with quality and capability link', ev(f"(()=>{{const x=S.decisions['{did}'];return x.result&&x.revAt&&Object.values(x.q).filter(Boolean).length===5&&x.cap==='d-evidence'}})()"))
    ev("jlPredEdit(''); $('jp-t').value='1 meeting from 10 owner calls'; $('jp-p').value='70'; jlPredSave('')")
    pid = ev("Object.values(S.decisions).find(x=>x.kind==='pred').id")
    ev(f"jlPredEdit('{pid}'); jlPredResolve('{pid}',0)")
    cal = ev("jlCalib()")
    check('prediction compared with outcome (calibration)', cal['n'] == 1 and cal['score'] == 51, cal)

    # 13 · Red Team identifies unsupported assumptions
    ev(f"rtCheck('dec','{did}')")
    check('red team flags assumptions without evidence', ev("rtLast.F.some(f=>/assum/i.test(f.q)&&f.st==='warn')"))
    ev("rtPremortem('dec','"+did+"'); $('pm-t').value='No caregivers when a yes comes\\nStopped dialling'; rtPremortemSave('dec','"+did+"')")
    check('pre-mortem turns reasons into risks', ev("Object.values(S.risks).filter(r=>r.pm).length===2"))

    # 14 · recurring distraction → protocol suggestion → accept/reject
    ev("for(let i=0;i<3;i++){const id='jt'+i;S.journal[id]={id,_u:now(),at:dk(new Date()),kind:'trigger',trig:'Short videos',time:'21:30',ok:0}}")
    check('repeated trigger suggests a protocol', ev("dfSuggest().some(t=>t.trig==='Short videos')"))
    ev("dfProtoEdit('',dfTemplate('Short videos','late nights')); dfProtoSave('')")
    check('accepted protocol is an attention protocol, not an engine trigger', ev("dfAttn().length===1 && !enProtocols().some(p=>p.t==='attn')"))
    check('suggestion disappears once covered', ev("!dfSuggest().some(t=>t.trig==='Short videos')"))
    pa = ev("dfAttn()[0].id")
    ev(f"S.journal.jt9={{id:'jt9',_u:now(),at:dk(new Date()),kind:'trigger',trig:'Short videos',proto:'{pa}',ok:1}}")
    check('protocol effectiveness measured', ev("dfProtoStats()[0].n===1&&dfProtoStats()[0].ok===1"))

    # 15 · Field Manual entry from a real experience
    ev("jnEdit('','lesson'); $('jn-t').value='Owner hung up when I mentioned price first'; $('jn-l').value='Ask two questions before any price'; jnSave('')")
    jid = ev("Object.values(S.journal).find(j=>j.lesson==='Ask two questions before any price').id")
    ev(f"jnToManual('{jid}'); $('fm-steps').value='Ask about current caregivers\\nAsk what breaks\\nThen price'; fmSave('')")
    check('procedure linked to the experience, marked personal experiment', ev(f"fmAll().some(m=>m.exp==='{jid}'&&m.q==='personal')"))

    # 16 · BAC error creates a targeted review
    ev("S.lifeErrors=S.lifeErrors||{}; S.lifeErrors.e1={id:'e1',_u:now(),subj:'ro',topic:'comentariu',what:'x',fix:'y',lvl:0,due:dk(new Date()),at:dk(new Date())}")
    check('due BAC error becomes the BAC recommendation', ev("bacNext().kind==='errors'"))

    # 17 · weekly review summarizes across domains
    wf = ev("lxWeekFacts(new Date())")
    check('weekly board facts read real records', wf['decMade'] >= 1 and wf['demo'] >= 1 and wf['triggers'] >= 3 and wf['errs'] >= 1, wf)
    check('weekly review renders the board rows', ev("mcWeekOpen(); !!document.querySelector('#modal') && /Board meeting/.test(document.querySelector('#modal').innerHTML)"))
    ev("closeModal()")

    # 19 · sync: new maps merge; an old remote without them deletes nothing
    ev("window.__j=Object.keys(S.journal).length")
    ev("merge({days:{},journal:{rj:{id:'rj',_u:now()+5,at:'2026-11-18',kind:'event',text:'from laptop'}}},false)")
    check('remote journal entry merges in', ev("!!S.journal.rj && Object.keys(S.journal).length===__j+1"))
    ev("merge({days:{}},false)")
    check('remote without the new maps keeps local records', ev("!!S.journal.rj && Object.keys(S.journal).length===__j+1"))

    # knowledge pipeline: derived stages, approval required
    ev("kpLoad(); ")
    pg.wait_for_timeout(500); pg.clock.run_for(500)
    ev("kpW('srcT',{t:'Test video on openers',type:'video',stat:'unverified',url:'https://example.com/v',acc:'full',ins:'permission opener; tonality'})")
    check('pipeline stage is derived (process done, classify next)', ev("kpNext(kpGet('srcT'))==='classify'"), ev("kpNext(kpGet('srcT'))"))
    check('de-dup finds library ideas from the insights', ev("kpDupes(kpGet('srcT')).cards.length>0"))
    ev("kpW('srcT',{cards:[cmCards(cmCap('b-cold'))[0]],caps:['b-cold'],dd:'deeper'}); kpOper('srcT'); fmSave(kpGet('srcT').man)")
    check('operationalized only after approval', ev("!kpStages(kpGet('srcT')).oper"))
    ev("kpOper('srcT'); $('kp-why').value='matches my call notes'; kpApprove('srcT')")
    check('approval recorded with reason', ev("kpStages(kpGet('srcT')).oper && !!S.manual[kpGet('srcT').man].apprWhy"))
    ev("kpImport(); $('kp-json').value=JSON.stringify([{t:'A',url:'https://example.com/v'},{t:'New email video',url:'https://example.com/n',type:'video'}]); kpImportRun()")
    check('import skips duplicates by link', ev("kpAll().filter(x=>x.url==='https://example.com/v').length===1 && kpAll().some(x=>x.t==='New email video')"))

    # 8 · spaced repetition still runs on recall (13.25.4 engine untouched)
    check('memory queue still available', ev("Array.isArray(msQueue(8))"))

    # every new screen opens without an error and without horizontal overflow at 390 px
    screens = ["cmOpen()", "cmOpen('biz')", "cmCapOpen('b-objection')", "cmEvidence('b-cold')", "jnNew()", "jnTimeline()", "jnTimeline({hist:true})", "jnSearchOpen('vendor')", "jlOpen()", "jlScOpen()", "jlScOpen('sc-email')", "jlDueOpen()", "rtOpen()", "rtCheck('week','')", "rtCheck('camp','ct')", "rtRiskEdit('')", "dfOpen()", "dfTriggerEdit('')", "dfLapse()", "fmOpen()", "fmContOpen()", "kpOpen()", "kpView('srcT')", "rlOpen()", "rlPatternsOpen()", "rlDirOpen()", "rlCapOpen()", "lxMetricsOpen()", "mcSeasonOpen()", "mcModeOpen()", "mcWhy()", "mcPickOpen()"]
    bad = []
    for sc in screens:
        try:
            ev(sc); pg.wait_for_timeout(60)
            ov = ev("(()=>{const m=document.getElementById('modal');return m.scrollWidth>m.clientWidth+2})()")
            if ov: bad.append(sc + ' overflow')
        except Exception as e: bad.append(sc + ' ' + str(e)[:120])
        ev("closeModal()")
    check(f'{len(screens)} new screens open cleanly at 390 px', not bad, bad)
    ev("jlScOpen('sc-bank'); document.querySelector('input[name=jl-o][value=\"2\"]').checked=true; $('jl-why').value='verify via known channel'; jlScAnswer('sc-bank')")
    check('scenario feedback shown and logged as practice only', ev("/Principle that transfers/.test($('modal').innerHTML) && cmLog('f-scam').some(x=>x.src==='sim')"))
    ev("closeModal(); show('life'); lifeTab='op'; render()")
    pg.wait_for_timeout(300)
    check('Operator tab renders', ev("!!document.querySelector('.op-g') && document.querySelectorAll('.op-t').length>=12"))
    check('Operator tab has no horizontal overflow', ev("document.documentElement.scrollWidth<=window.innerWidth+1"), ev("[document.documentElement.scrollWidth,window.innerWidth]"))
    pg.screenshot(path='/home/claude/wrtest/op_tab.png', full_page=False)
    ev("cmOpen()"); pg.wait_for_timeout(200); pg.screenshot(path='/home/claude/wrtest/capmap.png')
    ev("closeModal(); kpOpen()"); pg.wait_for_timeout(200); pg.screenshot(path='/home/claude/wrtest/kpipe.png')
    ev("closeModal(); arcShow&&arcShow()"); pg.wait_for_timeout(400); pg.screenshot(path='/home/claude/wrtest/day.png')
    check('no page errors', not errs, errs[:5])
    b.close()

ok = sum(1 for r in RES if r[1]); print(f'\n{ok}/{len(RES)} passed')
sys.exit(0 if ok == len(RES) else 1)
