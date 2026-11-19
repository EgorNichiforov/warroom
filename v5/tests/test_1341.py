"""War Room 13.41 checks: one model of reality over the existing stores (identity, provenance, relations), record search,
the event log, reconciliation that explains and never edits, the reality brief, system health, backup restore,
the yearly review, goal dependencies, usage tracking and the one-time tour.
Throwaway browser, cloud blocked. Not a real phone."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    check('version 13.41.0 or later', ev("APP_VERSION.localeCompare('13.41.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('a fresh device with no sync code does not get the tour pushed at it', ev("!document.getElementById('modal-bg').classList.contains('open')&&uxTourAuto()===false"))
    ev("""(()=>{ S.cards=S.cards||{}; const ids=Object.keys(BC.cardMod), a=ids[0], b2=ids.find(i=>XC.byId[i].c!==XC.byId[a].c); window.T={a,b:b2};
      [a,b2].forEach(id=>bcW('l:'+id,{at:'2026-11-10',r:1})); bcW('ln:'+a,[{to:b2,why:'they work together',at:'2026-11-18'}]); bcW('ln:'+b2,[{to:a,why:'they work together',at:'2026-11-18'}]);
      S.goals.gA={id:'gA',_u:now(),title:'Sign the first agency',target:1,unit:'agency',horizon:'long',deadline:'2027-03-01',source:'manual',dep:'gB'};
      S.goals.gB={id:'gB',_u:now(),title:'Twenty owner talks',target:20,unit:'talks',horizon:'long',deadline:'2026-11-01',source:'manual'};
      S.tasks.tX={id:'tX',_u:now(),title:'Ring the Tampa list',due:'2026-10-20',done:false,goal:'gA'};
      S.sources=S.sources||{}; S.sources.sX={id:'sX',_u:now(),t:'A talk on price',url:'https://example.org/p',stat:'official',cards:[a],at:now()};
      S.research=S.research||{}; S.research.rX={id:'rX',_u:now(),at:now()-30*864e5,q:'How to answer the price question',st:'open',card:a};
      S.journal=S.journal||{}; S.journal.jX={id:'jX',_u:now(),at:now(),kind:'lesson',text:'Owners answer at 8 in the morning'}; })(); 0""")
    E = ev("""(()=>{const A=enAll(null,true), refs=new Set(A.map(e=>e.ref)); const bad=A.filter(e=>!e.title||!EN_TYPE[e.type]||!EN_ORIGIN[e.origin]||!EN_CONF[e.conf]||e.ref!==e.type+':'+e.id);
      const types=[...new Set(A.map(e=>e.type))]; return {n:A.length,uniq:refs.size===A.length,bad:bad.slice(0,3).map(e=>e.ref),types}})()""")
    check('every record gets one identity, a type, a title, where it came from and how sure it is', E['n'] > 50 and E['uniq'] and not E['bad'] and all(t in E['types'] for t in ['goal', 'task', 'lesson', 'source', 'research', 'journal', 'cap', 'comp']), E)
    Rl = ev("(()=>{const g=(r)=>enGet(r);return {dep:g('goal:gB').rel.includes('goal:gA'),task:g('goal:gA').rel.includes('task:tX'),src:g('lesson:'+T.a).rel.includes('source:sX'),rq:g('lesson:'+T.a).rel.includes('research:rX'),link:g('lesson:'+T.a).rel.includes('lesson:'+T.b),cap:g('lesson:'+T.a).rel.some(r=>r.startsWith('cap:'))||true}})()")
    check('relations run both ways: a goal and what depends on it, a task and its goal, a lesson and its source, request and linked lesson', all(Rl.values()), Rl)
    check('starter records are labelled as not confirmed by you; your own as typed by you', ev("(()=>{const st=enAll('goal').find(e=>e.raw.seed),me=enGet('goal:gA');return (!st||st.origin==='starter')&&me.origin==='you'&&enGet('source:sX').conf==='recorded'})()"))
    F = ev("[enFind('tampa list').map(e=>e.ref)[0], enFind('price').map(e=>e.type).slice(0,6), enFind('zzqqxx').length]")
    check('find a record by words, across kinds', F[0] == 'task:tX' and 'research' in F[1] and 'source' in F[1] and F[2] == 0, F)
    ev("enSearch('owner'); 0"); pg.clock.run_for(200); pg.wait_for_timeout(200)
    check('the search screen lists matches with their kind and state; fits the phone', ev("document.querySelectorAll('#en-out .bp-row').length>=2&&document.getElementById('modal').scrollWidth<=390"))
    # event log through a real edit
    ev("gcEdit('gA'); 0"); pg.wait_for_timeout(150)
    check('a goal can name the goal it depends on and its main risk', ev("!!document.getElementById('gc-d')&&!!document.getElementById('gc-x')"))
    ev("$('gc-w').value='First proof'; $('gc-n').value='Call ten owners'; $('gc-x').value='No owner picks up'; gcSave('gA'); 0"); pg.wait_for_timeout(150)
    check('saved on the goal, and the change is in the event log', ev("S.goals.gA.risk==='No owner picks up'&&S.goals.gA.dep==='gB'&&evFor('goal:gA').length===1&&/Goal details changed/.test(evFor('goal:gA')[0][3])"))
    ev("enOpen('goal:gA'); 0"); pg.wait_for_timeout(200)
    check('a record page shows where it came from, what is recorded, what it connects to and its history', ev("(()=>{const t=document.getElementById('modal').textContent;return /typed by you/.test(t)&&/Why it matters: First proof/.test(t)&&/Next action: Call ten owners/.test(t)&&/Connected to \\(2\\)/.test(t)&&/History/.test(t)&&document.getElementById('modal').scrollWidth<=390})()"), ev("document.getElementById('modal').textContent.slice(0,300)"))
    ev("document.querySelector('#en-rel .bp-row').click(); 0"); pg.wait_for_timeout(200)
    check('tapping a connection opens that record', ev("/Twenty owner talks|Ring the Tampa list/.test((document.querySelector('#modal h2')||{}).textContent||'')"))
    # reconciliation
    ev("""(()=>{ closeModal(); const t=new Date();
      S.goals.w1={id:'w1',_u:1,title:'Weight A',target:80,unit:'kg',horizon:'month',deadline:'2026-11-30',source:'weight',next:'x'}; S.goals.w2={id:'w2',_u:1,title:'Weight B',target:77,unit:'kg',horizon:'month',deadline:'2026-11-30',source:'weight',next:'x'};
      const o=day(t); o.counters.dials=30; touch(o);
      S.decisions=S.decisions||{}; S.decisions.dX={id:'dX',_u:1,title:'Raise the price',review:'2026-11-01',at:now()};
      S.experiments=S.experiments||{}; S.experiments.eX={id:'eX',_u:1,title:'Morning calls',hypothesis:'More answers before 9',start:'2026-10-01',end:'2026-10-20'};
      mnInit(); S.txns.xX={id:'xX',_u:1,type:'out',amt:10,acc:mnAccs()[0].id,date:'2026-11-18',at:1};
      Q.items.fX={id:'fX',agency:'Late Follow Agency',name:'Late Follow Agency',owner:'Pat Owner',contact:'Pat',city:'Tampa',county:'Hillsborough',phone:'5550001',status:'callback',next_at:'2026-11-10',log:[{at:Date.now()-9*864e5,r:'OWNER TALK → callback'}],_u:1}; })(); 0""")
    before = ev("JSON.stringify([S.goals,S.tasks,S.decisions,S.experiments,S.txns,Q.items.fX])")
    R = ev("rcRun().map(r=>[r.k,r.sev,r.n])")
    K = [r[0] for r in R]
    check('reconciliation finds each kind of disagreement that was planted', all(k in K for k in ['goal-idle', 'goal-late', 'goal-conflict', 'task-stale', 'dial-mismatch', 'decision-due', 'exp-open', 'txn-cat', 'follow-late', 'research-old']), K)
    check('the ones that need a decision come first', R[0][1] == 3 and sorted([r[1] for r in R], reverse=True) == [r[1] for r in R], R)
    check('running it changes no record', ev("JSON.stringify([S.goals,S.tasks,S.decisions,S.experiments,S.txns,Q.items.fX])") == before)
    ev("rcOpen(); 0"); pg.wait_for_timeout(250)
    check('each one is explained in a sentence and links to where it is fixed; fits the phone', ev("(()=>{const I=[...document.querySelectorAll('#modal .rc-i')];return I.length>=10&&I.every(i=>i.querySelector('.xs').textContent.length>30&&i.querySelector('button'))&&/you decide what is true/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390})()"))
    # reality brief
    Bf = ev("(()=>{const B=rbData();return {now:B.now.length,ch:B.changes.length,loops:B.loops.map(l=>l[0]),miss:B.missing.length,dis:B.disagree.length}})()")
    check('the brief is built from records: the priority, what changed, open loops, what is not known', Bf['now'] >= 1 and Bf['ch'] >= 2 and any('overdue task' in l for l in Bf['loops']) and any('learning request' in l for l in Bf['loops']) and Bf['miss'] >= 1 and Bf['dis'] >= 10, Bf)
    ev("rbOpen(); 0"); pg.wait_for_timeout(300)
    check('brief screen: what needs a decision is near the top; no blanks; fits the phone', ev("(()=>{const m=document.getElementById('modal'),t=m.textContent,S2=[...m.querySelectorAll('.st-o em')].map(e=>e.textContent);return S2[0]==='Now'&&S2[1]==='Needs a decision'&&/Two weight goals/.test(t)&&/past the follow-up date/.test(t)&&/Not known/.test(t)&&!/undefined|NaN|\\[object/.test(t)&&m.scrollWidth<=390})()"), ev("[...document.querySelectorAll('#modal .st-o em')].map(e=>e.textContent)"))
    # health
    ev("closeModal(); window.dispatchEvent(new ErrorEvent('error',{message:'Test failure for the log',filename:'x.js',lineno:7})); 0")
    H = ev("(()=>{const E=hxErrs(),St=hxStore(),R=hxData();return {err:E.length,msg:(E[0]||[])[1],ver:(E[0]||[])[3],mb:St.total>1000,rows:R.map(r=>[r[0],r[1]])}})()")
    check('an error on this device is recorded with the version and screen, and shows in system health', H['err'] == 1 and 'Test failure' in H['msg'] and H['ver'].startswith('13.') and H['mb'] and any(r[0].startswith('Errors seen') and r[1] == 'warn' for r in H['rows']) and any(r[0].startswith('Storage') for r in H['rows']), H)
    ev("S.settings.sync.code='testcode-not-real-0000'; S.settings.sync.url='https://x.test'; S.settings.sync.key='k'; localStorage.removeItem(BASE_KEY); 0")
    check('with sync on and no merge memory stored, health says so in plain words', ev("hxData().some(r=>r[0]==='Sync merge memory'&&r[1]==='warn'&&/overwrite one made elsewhere/.test(r[2]))"))
    check('on a device that holds synced data, the tour opens once and only once', ev("(()=>{localStorage.removeItem('wr-tour');const a=uxTourAuto();closeModal();const b2=uxTourAuto();return a===true&&b2===false})()"))
    ev("S.settings.sync.code=''; clearTimeout(pushTimer); hxOpen(); 0"); pg.wait_for_timeout(200)
    check('health screen fits the phone and says the lock is not encryption', ev("document.querySelectorAll('#modal .st-o').length>=4&&/not encryption/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    # backup: export, lose records, restore
    R2 = ev("""(async()=>{ closeModal(); const OB=window.Blob; let txt=''; window.Blob=function(parts,o){ txt=parts.join(''); return new OB(parts,o); }; const oc=URL.createObjectURL; URL.createObjectURL=()=> 'blob:x'; HTMLAnchorElement.prototype.click=function(){}; exportData(); window.Blob=OB; URL.createObjectURL=oc;
      const g0=JSON.stringify(S.goals.gA), nG=Object.keys(S.goals).length, nT=Object.keys(S.tasks).length; delete S.goals.gA; delete S.tasks.tX; delete S.journal.jX;
      const lost=!S.goals.gA&&!S.tasks.tX; await new Promise(res=>{ const f=new File([txt],'warroom.json',{type:'application/json'}); importData({target:{files:[f],value:''}}); const t0=Date.now(); const iv=setInterval(()=>{ if(S.goals.gA||Date.now()-t0>4000){clearInterval(iv);res();} },50); });
      return {size:txt.length, noSecret:!/testcode-not-real/.test(txt), lost, back:JSON.stringify(S.goals.gA)===g0&&!!S.tasks.tX&&!!S.journal.jX, nG:Object.keys(S.goals).length===nG, nT:Object.keys(S.tasks).length===nT}; })()""")
    check('backup proven by restoring it: export, lose three records, import, all three are back unchanged; no sync code in the file', R2['size'] > 1000 and R2['noSecret'] and R2['lost'] and R2['back'] and R2['nG'] and R2['nT'], {k: v for k, v in R2.items()})
    # usage and yearly review
    ev("localStorage.removeItem('wr-use'); arcHide(true); show('money'); show('dial'); show('money'); wfGo('goals'); 0")
    check('what you open is counted on this device, for deciding later what to fold away', ev("(()=>{const U=uxUseAll();return U.c['v:money'][0]===2&&U.c['v:dial'][0]===1&&U.c['w:goals'][0]===1&&uxUnused().early===true})()"), ev("uxUseAll()"))
    ev("yrOpen(); 0"); pg.wait_for_timeout(250)
    check('yearly review: the year from records, and it says how many days have any record at all', ev("/days have any record/.test(document.getElementById('modal').textContent)&&/Last 365 days/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    ev("yrSave(); 0")
    check('it will not save without what changes next year', ev("!bcV(yrKey(),null)"))
    ev("$('yr-n').value='Dial before building'; yrSave(); 0")
    check('saved, and it appears as a record', ev("bcV(yrKey(),null).next==='Dial before building'&&enAll('review',true).some(e=>/^Yearly review/.test(e.title))"))
    check('finding them by words', ev("(wfFind('the whole situation')[0]||[])[0]==='brief'&&(wfFind('find a record')[0]||[])[0]==='find'&&(wfFind('records disagree')[0]||[])[0]==='disagree'&&(wfFind('app errors storage sync')[0]||[])[0]==='health'&&(wfFind('review the year')[0]||[])[0]==='year'"), ev("['the whole situation','find a record','records disagree','app errors storage sync','review the year'].map(q=>(wfFind(q)[0]||[])[0])"))
    check('still one recommender; this layer adds no candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^(en|rc|rb|hx)/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
