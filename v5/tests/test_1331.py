"""War Room 13.31 checks: unified Learn (time → session → record), Development Blueprint audit, owner discovery,
knowledge-to-execution map, market file v2, the startup race fix. Scenarios A–G are the acceptance tests of the
"one learning system" brief, run end to end on the real functions.
Run: python3 -m http.server 8765 (repo root) then python3 v5/tests/test_1331.py
Runs in a throwaway browser profile with the cloud blocked: it cannot touch real data. Not a real phone."""
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
    pg.evaluate("CP_NOLATE=1; OD_OFF=0; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    return ctx, pg, errs

with sync_playwright() as p:
    b = p.chromium.launch(**CH); ctx, pg, errs = boot(b); ev = pg.evaluate
    ev("(()=>{const o=day(new Date());o.counters.dials=12;touch(o);save();})(); 0")
    check('libraries loaded; version 13.55.0', ev("!!(XC&&XC.byId&&BC&&KPL)&&APP_VERSION==='13.55.0'"), ev("APP_VERSION"))

    # ── lessons
    check('16 new lessons: source, kind, two questions, a move, a video, in a module', ev("(()=>{const N=XC.cards.filter(c=>c.added==='13.31');return N.length===16&&N.every(c=>c.src&&c.kind&&c.q.length===2&&c.move.length>30&&c.clip.length===1&&c.clipBy&&c.clipMin>0&&BC.cardMod[c.id])})()"))
    check('no new video is called inspected: all are "title checked" or "link only"', ev("XC.cards.filter(c=>c.added==='13.31').every(c=>c.clipV==='title'||c.clipV==='link')"))
    check('the five capabilities without a lesson now have one', ev("['b-match','c-humour','s-deesc','f-tax','f-living'].every(id=>cmCards(cmCap(id)).length>=1)&&cmGaps().length===0"))
    check('book lessons cite chapter or pages and say they are own-words summaries', ev("XC.cards.filter(c=>/^(lc|gl)-/.test(c.id)&&c.added==='13.31').every(c=>/(pp\\.|ch\\.) ?\\d/.test(c.src)&&/Own-words/.test(c.src))"))
    check('safety and tax lessons carry their limits', ev("/not self-defence training/.test(XC.byId['nc-deesc'].trap)&&/qualified/.test(XC.byId['nc-deesc'].move)&&/Not tax advice/.test(XC.byId['nc-tax'].kind)&&/accountant/.test(XC.byId['nc-tax'].move)"))
    ev("xcOpen('nc-humour'); 0"); pg.wait_for_timeout(400)
    check('a new lesson opens with its video first and does not overflow', ev("!!document.querySelector('#modal .xc-vid')&&document.documentElement.scrollWidth<=390&&document.getElementById('modal').scrollWidth<=390"))
    ev("closeModal(); 0")

    # ── Blueprint
    u = ev("(()=>{const u=bpAudit();return {total:u.total,lessons:u.lessons,kw:u.kwOnly,none:u.noLesson,assess:u.assess,ex:u.exercise,insp:u.inspected,any:u.anyVideo,ev:u.evidence,areas:BP_AREAS.map(a=>bpAll().filter(x=>x.area===a[0]).length)}})()")
    check('Blueprint: ten areas, every one populated, over 100 competencies', len(u['areas']) == 10 and min(u['areas']) >= 4 and u['total'] >= 100, u)
    check('audit adds up: own lesson + keyword-only + none = total', u['lessons'] + u['kw'] + u['none'] == u['total'] and u['none'] >= 10, u)
    check('audit does not overclaim: inspected videos < any video; fewer written tests than lessons', u['insp'] < u['any'] and u['assess'] < u['lessons'] + u['kw'], u)
    check('every competency has an observable behaviour, a level and a horizon', ev("bpAll().every(x=>x.beh&&x.beh.length>15&&BP_LV[x.lv]&&['now','next','later'].includes(x.hz))"))
    check('a competency with no lesson says so and offers research', ev("(()=>{const m=bpMissing(bpGet('bp-cook'));return m.includes('lesson')&&m.includes('assessment')&&m.includes('practical exercise')})()"))
    check('humour sits under social intelligence with its lesson', ev("bpGet('c-humour').area==='C'&&bpCards(bpGet('c-humour')).includes('nc-humour')"))
    check('stage starts at "Not encountered" with no records', ev("bpStage(bpGet('c-humour'))===0"))
    ev("bpSet('c-humour'); 0"); pg.wait_for_timeout(200); ev("document.querySelector('input[name=bp-st][value=\"4\"]').checked=true; bpSetSave('c-humour'); 0")
    check('a stage above the record is refused without proof', ev("bpStage(bpGet('c-humour'))===0"))
    ev("bpSet('c-humour'); 0"); pg.wait_for_timeout(200); ev("document.querySelector('input[name=bp-st][value=\"4\"]').checked=true; $('bp-pf').value='Made the whole group laugh at practice on 18 Nov, coach saw it'; bpSetSave('c-humour'); 0")
    check('…and accepted with proof', ev("bpStage(bpGet('c-humour'))===4"))
    ev("bcW('bp:c-humour',0); bpOpen('E'); 0"); pg.wait_for_timeout(300)
    check('Blueprint screen: totals, area tabs, rows with missing items, no overflow', ev("document.querySelectorAll('#modal .bp-sum div').length===6&&document.querySelectorAll('#modal .bp-tabs button').length===10&&document.querySelectorAll('#modal .bp-row').length>=5&&/Missing/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    ev("closeModal(); 0")

    # ── market file
    m = ev("(()=>{const E=Object.fromEntries(MKT?MKT.entries.map(e=>[e.id,e]):[]);return E})()") or {}
    if not m: ev("mktLoad(()=>0); 0"); pg.wait_for_timeout(800); m = ev("Object.fromEntries(MKT.entries.map(e=>[e.id,e]))")
    check('BLS current figures: 2025–35, with definition, dates and forecast period', '4,677,100' in m['mk-wf1']['text'] and '18%' in m['mk-wf1']['text'] and '2025–2035' in m['mk-wf1']['date'] and 'SOC 31-1120' in m['mk-wf1']['note'] and 'not a Florida' in m['mk-wf1']['note'])
    check('previous BLS edition kept apart and marked superseded', m['mk-wf1h'].get('hist') == 1 and '4,347,700' in m['mk-wf1h']['text'] and 'superseded' in m['mk-wf1h']['date'].lower() and '4,347,700' not in m['mk-wf1']['text'])
    check('Florida count broken down and its limits stated', all(x in m['mk-str1']['text'] for x in ['1,154', '1,151', '1,197', '2,554', '6,056']) and 1154 + 1151 + 1197 + 2554 == 6056 and 'does not tell you' in m['mk-str1']['note'])
    c = ev("MKT.comp")
    check('competitors in six separate types, each item with source class', len(c['cats']) == 6 and all(any(i['cat'] == k[0] for i in c['items']) for k in c['cats']) and all(i['cls'] in ('vendor', 'reported', 'official') for i in c['items']), [k[0] for k in c['cats']])
    check('a missing price is "Not public", and absence is not called proof', sum(1 for i in c['items'] if i['price'].startswith('Not public')) >= 6 and 'not proof' in c['note'] and any('No search done' in i['evid'] for i in c['items']))
    ev("mkCompOpen('direct'); 0"); pg.wait_for_timeout(300)
    check('competitor screen renders with tabs and sources', ev("document.querySelectorAll('#modal .cc-tabs button').length===6&&document.querySelectorAll('#modal .st-o').length>=3&&document.getElementById('modal').scrollWidth<=390"))

    # ── owner discovery
    check('nine owner questions, each tied to a market question; Playbook page exists', ev("OD_Q.length===9&&OD_Q.every(r=>r[1]&&r[2].endsWith('?')&&ST_KIND[r[4]])&&PB_SEED.some(p=>p.id==='os-discovery'&&/fewest answers/.test(p.body))"))
    ev("Q.items['t1']={id:'t1',agency:'Sunrise Test Care',status:'new',log:[]}; ownerModal('t1'); 0"); pg.wait_for_timeout(300)
    ev("$('ow-note').value='talked 6 min'; saveOwner('t1'); 0"); pg.clock.run_for(600); pg.wait_for_timeout(300)
    check('logging an owner talk ends with the discovery capture (three questions)', ev("/What did the owner tell you/.test((document.querySelector('#modal h2')||{}).textContent||'')&&document.querySelectorAll('#modal .od-a').length===3"))
    ev("document.querySelectorAll('#modal .od-a')[0].value='About 40 caregivers, 55 clients'; document.querySelector('#modal .btn.primary').click(); 0"); pg.wait_for_timeout(200)
    r = ev("(()=>{const A=odAnswers();return {n:A.length,src:A[0]&&A[0].src,who:A[0]&&A[0].who,q:A[0]&&A[0].q,stat:odStats().find(s=>s.id===(A[0]||{}).q)}})()")
    check('the answer is saved as an owner-call note for that agency and question', r['n'] == 1 and r['src'] == 'owner call' and r['who'] == 'Sunrise Test Care' and r['stat']['n'] == 1, r)
    check('next call asks different questions (fewest answers first)', ev("!odNext(3).some(x=>x[0]===odAnswers()[0].q)"))
    ev("S.obs['tt']={id:'tt',_u:now(),at:'2026-11-19',kind:'problem',text:'call-outs every Friday test record',who:'X',tag:'callout',q:'od2',test:1}; mktOpen(); 0"); pg.wait_for_timeout(500)
    check('a test record is not an owner answer and not market evidence', ev("odAnswers().length===1&&!stEvidence().some(e=>e.id==='tt')&&dgAudit().obs.test===1"))
    check('market screen keeps four kinds apart: 1 owner answer, published facts counted without the historical one', ev("(()=>{const B=[...document.querySelectorAll('#mk-own .mk-4 b')].map(x=>+x.textContent);return B.length===4&&B[0]===1&&B[2]===MKT.entries.filter(e=>!e.hist).length})()"), ev("document.querySelector('#mk-own')?document.querySelector('#mk-own').textContent.slice(0,120):'no strip'"))
    ev("delete S.obs['tt']; closeModal(); 0")

    # ── knowledge → execution
    check('15 principles, each with source place, verdict and adaptation; unread chapters are declared', ev("KX.length===15&&KX.every(r=>r[1]&&KX_AP[r[4]]&&r[5])&&KX.find(r=>r[0]==='kx-gym')[4]==='no'&&/Not read/.test(KX.find(r=>r[0]==='kx-gym')[5])"))
    check('principles point at real operating-system steps and real lessons', ev("KX.every(r=>(!r[8]||osStep(r[8]))&&r[9].every(c=>XC.byId[c]))"), ev("KX.filter(r=>(r[8]&&!osStep(r[8]))||!r[9].every(c=>XC.byId[c])).map(r=>r[0])"))
    ev("kxSet('kx-sameday'); 0"); pg.wait_for_timeout(200); ev("document.querySelector('input[name=kx-st][value=\"4\"]').checked=true; $('kx-n').value=''; kxSetSave('kx-sameday'); 0")
    check('"Tested" is refused without a written result', ev("kxState('kx-sameday').st===2"))
    ev("kxExp('kx-sameday'); 0"); pg.wait_for_timeout(200)
    check('making an experiment is your tap, and moves it to "Ready to test"', ev("kxState('kx-sameday').st===3&&Object.values(S.experiments||{}).some(e=>e.from==='kx:kx-sameday')"))
    check('book entries in the library say what was read and what was not', ev("(()=>{const a=kpAll().find(x=>x.id==='hz-lost'),g=kpAll().find(x=>x.id==='hz-gls');return /NOT read/.test(a.note)&&/pp\\. 9–17/.test(a.note)&&/NOT read/.test(g.note)&&/not an official edition/.test(g.note)})()"))
    check('email lessons list is built from processed emails only', ev("emLessons().length>=15&&emLessons().every(x=>(x.ins||x.why)&&!/^Promotion/.test(x.ins||''))"), ev("emLessons().length"))
    ev("closeModal(); 0")

    # ── Learn: one entry point
    ev("lxGo(); 0"); pg.wait_for_timeout(500)
    check('Learn opens on "Now": time question, 9 durations + custom, focus chips, one recommendation', ev("document.querySelector('.bcx-tabs button.on').textContent==='Now'&&document.querySelectorAll('.lx-chips button').length===10&&document.querySelectorAll('.lx-foc button').length===4&&document.querySelectorAll('.lx-rec').length===1"))
    check('home is short: recommendation, three waiting rows, four paths, one capability line; no overflow', ev("document.querySelectorAll('.lx-row').length<=6&&document.querySelectorAll('.lx-path').length===4&&document.documentElement.scrollWidth<=390"), ev("[document.querySelectorAll('.lx-row').length,document.documentElement.scrollWidth]"))
    pg.clock.run_for(2000); pg.wait_for_timeout(300)
    check('no second entry point: the old library banner is gone from Learn', ev("!document.querySelector('#view-boot .cc-ban')"))
    check('the Library is a tab of Learn, not a separate place', ev("(()=>{bcGo('home',{tab:'library'});return !!document.querySelector('#view-boot .lx-lib')&&document.querySelector('#view-boot .lx-lib').children.length>0})()"))
    ev("lxGo(); 0")
    # Scenario A · 30-minute business session
    A = ev("(()=>{const P=lxBuild(30,'biz',{dry:1});return {dom:P.dom,k:P.steps.map(s=>s.k),planned:P.planned,tr:lxTr(P.card),obj:P.obj,after:P.after,why:P.why,card:P.card}})()")
    check('A · 30 min business: lesson + practice + mission, within the time, with objective and reason', A['k'][:3] == ['lesson', 'practice', 'mission'] and A['planned'] <= 30 and A['tr'] == 'biz' and len(A['obj']) > 10 and len(A['why']) > 5, A)
    ev("lxPlanOpen(30,'biz'); 0"); pg.wait_for_timeout(300)
    check('A · the plan shows a time breakdown and Start / Another / Choose a topic', ev("document.querySelectorAll('#modal .lx-pst').length>=3&&/minutes planned/.test(document.getElementById('modal').textContent)&&[...document.querySelectorAll('#modal .actions button')].map(b=>b.textContent).join('|')==='Another|Choose a topic|Start'"))
    ev("lxStart(); 0"); pg.wait_for_timeout(400)
    check('A · the session screen: objective, step 1 of N, time left, step list', ev("!!document.querySelector('.lx-run .lx-obj')&&/Step 1 of/.test(document.querySelector('.lx-run').textContent)&&document.querySelectorAll('.lx-list div').length===lxCur().steps.length"))
    ev("lxDo(0); 0"); pg.wait_for_timeout(500)
    check('A · the lesson step runs the real Bootcamp lesson', ev("bcS.scr==='lesson'&&bcS.id===lxCur().steps[0].id"))
    ev("(()=>{const id=lxCur().steps[0].id; bcW('l:'+id,{at:dk(new Date()),r:1}); bcSrs(id,true); save(); bcGo('home'); })(); 0"); pg.wait_for_timeout(400)
    check('A · finishing the lesson ticks the step and moves to practice', ev("lxCur().steps[0].done===1&&lxCur().i===1&&/Step 2 of/.test(document.querySelector('.lx-run').textContent)"))
    ev("lxDo(1); 0"); pg.wait_for_timeout(300); ev("cmRecord(lxCur().steps[1].cap,{src:'sim',eff:'tried',out:'ok',comp:'yes',ev:'drill'}); closeModal(); render(); 0"); pg.wait_for_timeout(300)
    check('A · practice evidence ticks the practice step', ev("lxCur().steps[1].done===1&&lxCur().i===2"))
    ev("lxDo(2); 0"); pg.wait_for_timeout(300); ev("$('lx-mn').value='short'; lxMissionDone(2); 0")
    check('A · a mission is not "done" without what you did', ev("!!lxCur()&&lxCur().steps[2].done===0"))
    cap0 = ev("(cmCapsOfCard(lxCur().steps[2].id)[0]||{}).id||''")
    ev("$('lx-mn').value='Asked the six facts on a practice call with a friend, wrote them down'; lxMissionDone(2); 0"); pg.wait_for_timeout(300)
    ev("(()=>{let n=0;while(lxCur()&&n++<6)lxStepDone(lxCur().i,'done');})(); 0"); pg.wait_for_timeout(400)
    L = ev("lxLog().slice(-1)[0]")
    check('A · session recorded: steps, minutes, track; real evidence written for the capability', ev("!lxCur()") and L['done'] == L['total'] and L['dom'] == 'biz' and (not cap0 or ev(f"cmLog('{cap0}').some(x=>x.src==='real'&&/six facts/.test(x.ev))")), L)
    check('A · the summary says a tested lesson is not yet a capability, and gives the next step', ev("/Session complete/.test(document.querySelector('#modal h2').textContent)&&/only through practice/.test(document.getElementById('modal').textContent)&&/Next time/.test(document.getElementById('modal').textContent)"))
    check('A · the next recommendation is a different lesson', ev(f"lxBuild(30,'biz',{{dry:1}}).card!=='{A['card']}'"))
    ev("closeModal(); 0")
    # Scenario B · 10-minute personal session
    B = ev("(()=>{const P=lxBuild(10,'life',{dry:1});return {dom:P.dom,planned:P.planned,k:P.steps.map(s=>s.k),tr:P.card?lxTr(P.card):''}})()")
    check('B · 10 min personal: a life-track lesson sized to fit', B['dom'] == 'life' and B['tr'] == 'life' and B['planned'] <= 10 and B['k'][0] == 'lesson', B)
    check('5 minutes gives a 5-minute plan, 120 gives a long one; never over the time', ev("[5,10,15,20,30,45,60,90,120].every(m=>{const P=lxBuild(m,'auto',{dry:1});return P.planned<=m&&P.steps.length>=1})&&lxBuild(120,'auto',{dry:1}).planned>=45"), ev("[5,20,60,120].map(m=>lxBuild(m,'auto',{dry:1}).planned)"))
    check('a video longer than the slot is not squeezed in: read and test now, watch later', ev("(()=>{const m=BC.mod['m10'];const keep=m.cards.slice();BC.mod['m10'].cards=['em-angry'];const P=lxBuild(10,'biz',{dry:1,path:'lead'});BC.mod['m10'].cards=keep;const s=P.steps[0];return s.id==='em-angry'&&s.withV===false&&/watch later/.test(s.why)&&s.min<=10})()"))
    # Scenario F · several paths, balance
    check('F · nine paths on two tracks, each with real modules and progress', ev("LX_PATHS.length===9&&LX_PATHS.every(p=>p[3].every(m=>BC.mod[m])&&lxPathProg(p).n>0)&&new Set(LX_PATHS.map(p=>p[5])).size===2"))
    check('F · no turn-taking: with no weekly minimum set, the track follows stage and evidence, and the screen says nothing is guaranteed', ev("(()=>{const L=lxLog();bcW('lx:log',L.concat([{dom:'biz',d:dk(new Date()),spent:20,done:1,total:1,kinds:[]},{dom:'biz',d:dk(new Date()),spent:20,done:1,total:1,kinds:[]}]));const D=lxDomain(),none=lxPersMin()===null&&lxPersUnder()===null;bcW('lx:log',L);return none&&D.dom==='biz'&&D.why.length>20})()") and ev("(()=>{lxGo();return /No weekly personal minimum is set/.test(document.querySelector('.lx').textContent)})()"))
    check('F · a weekly personal minimum you set protects personal sessions until the week reaches it', ev("(()=>{S.settings.learn={persMin:60};const a=lxDomain(),P=lxBuild(20,'auto',{dry:1});const L=lxLog();bcW('lx:log',L.concat([{dom:'life',d:dk(new Date()),spent:60,done:1,total:1,kinds:[]}]));const b=lxDomain();bcW('lx:log',L);S.settings.learn={persMin:null};return a.dom==='life'&&/of your 60 weekly minutes/.test(a.why)&&P.dom==='life'&&b.dom==='biz'})()"))
    check('F · a business session leaves the other paths untouched; a chosen path decides the lesson', ev("(()=>{const g=lxPathProg(lxPathOf('body'));const P=lxBuild(20,'life',{dry:1,path:'body'});return g.d===0&&lxPathCards(lxPathOf('body')).includes(P.card)&&lxPathProg(lxPathOf('cb')).d+lxPathProg(lxPathOf('sell')).d+lxPathProg(lxPathOf('lead')).d+lxPathProg(lxPathOf('self')).d>=1})()"))
    # Scenario E · spaced repetition
    ev(f"S.cards['{A['card']}']={{step:0,due:'2026-11-18',seen:1,_u:1}}; save(); 0")
    E = ev("(()=>{const P=lxBuild(10,'auto',{dry:1});const r=P.steps.find(s=>s.k==='review');return {has:!!r,ids:r?r.ids:[],first:P.steps.map(s=>s.k)}})()")
    check('E · a due review is put into the session', E['has'] and A['card'] in E['ids'], E)
    ev("lxPlanOpen(5,'review'); lxStart(); 0"); pg.wait_for_timeout(300); ev("lxDo(0); 0"); pg.wait_for_timeout(400)
    check('E · the review step opens the real recall test', ev("typeof MSR!=='undefined'&&MSR&&MSR.q.includes(lxCur().steps[0].ids[0])"))
    ev("(()=>{lxCur().steps[0].ids.forEach(id=>{msSchedule(id,2)}); save(); closeModal(); lxGo(); render();})(); 0"); pg.wait_for_timeout(500)
    check('E · grading it records the result and completes the step', ev(f"!lxCur()&&S.cards['{A['card']}'].due>'2026-11-19'&&lxLog().slice(-1)[0].kinds.includes('review')"), ev("[!!lxCur(), JSON.stringify(S.cards['%s'])]" % A['card']))
    ev("closeModal(); 0")
    # Scenario D · learning without application
    D0 = ev("lxBuild(20,'biz',{dry:1}).mode")
    ev("(()=>{const c=cmAll().find(c=>cmCards(c).length>=2&&!cmLog(c.id).length&&cmCards(c).every(id=>!bcV('l:'+id,null)));window.__cap=c.id;cmCards(c).slice(0,2).forEach(id=>bcW('l:'+id,{at:dk(new Date()),r:1}));})(); 0")
    D = ev("(()=>{const P=lxBuild(20,'auto',{dry:1});return {mode:P.mode,k:P.steps.map(s=>s.k),cap:P.steps[0].cap,why:P.why,un:lxUnpracticed().map(r=>r.c.id)}})()")
    check('D · lessons opened but never practised: the session is practice, not another lesson', D0 == 'learn' and D['mode'] == 'apply' and D['k'][0] == 'practice' and 'lesson' not in D['k'] and D['cap'] in D['un'] and 'change nothing' in D['why'], D)
    ev("lxUnpracticed().forEach(r=>cmRecord(r.c.id,{src:'sim',eff:'tried',out:'ok',comp:'yes',ev:'drill'})); 0")
    check('D · once practised, new lessons come back', ev("lxBuild(20,'biz',{dry:1}).mode==='learn'"))
    check('D · practice skipped twice in sessions is treated the same way', ev("(()=>{const L=lxLog();bcW('lx:log',L.concat([{dom:'biz',skipped:['b-cold']},{dom:'life',skipped:['b-cold']}]));const r=lxUnpracticed()[0];bcW('lx:log',L);return r&&r.c.id==='b-cold'&&r.sk===2})()"))
    # Scenario C · missing knowledge → research → resource connected
    g = ev("(lxGap('life')||{}).id||''")
    P = ev("(()=>{const n0=Object.keys(S.research||{}).length;const P=lxBuild(20,'life');const j=Object.values(S.research).find(r=>r.key==='bp:'+%s);return {made:Object.keys(S.research).length-n0,job:j&&j.id,st:j&&j.st,auto:j&&j.auto,note:P.notes.join(' ')}})()" % json.dumps(g))
    check('C · a competency with no lesson is found and a research job is created for it', bool(g) and P['made'] == 1 and P['st'] == 'open' and 'no lesson yet' in P['note'], [g, P])
    check('C · planning again does not create a second job; a preview creates none', ev("(()=>{const n=Object.keys(S.research).length;lxBuild(20,'life');lxBuild(20,'life',{dry:1});return Object.keys(S.research).length===n})()"))
    ev("ccImportItems([{t:'Test resource for the gap',by:'Some Teacher',url:'https://example.org/lesson-x',min:8,fmt:'watch',job:%s,stat:'public',tier:'support',why:'found by research'}]); save(); 0" % json.dumps(P['job']))
    C = ev("(()=>{const x=bpGet(%s),R=bpRes(x),gr=lxGapRes(),P=lxBuild(20,'life',{dry:1});return {res:R.length,job:S.research[%s].st,gr:gr&&gr.x.id,step:P.steps.filter(s=>s.k==='consume').map(s=>s.t),miss:bpMissing(x)}})()" % (json.dumps(g), json.dumps(P['job'])))
    check('C · the found resource is tied to that competency and offered in the next session', C['res'] == 1 and C['job'] == 'done' and C['gr'] == g and 'Test resource for the gap' in C['step'], C)
    check('C · a link that exists is still not a lesson: the competency keeps saying "lesson missing"', 'lesson' in C['miss'], C)
    # gate
    ev("(()=>{const o=day(new Date());o.counters.dials=0;touch(o);})(); 0")
    G = ev("(()=>{const g=bcGate('biz');const P=lxBuild(20,'biz',{dry:1});return {ok:g.ok,done:g.done,k:P.steps.map(s=>s.k),note:P.notes.join(' ')}})()")
    check('the dial rule still holds inside Learn: no second new lesson before 10 dials', (not G['ok']) and 'lesson' not in G['k'] and 'earned by dials' in G['note'], G)
    # Scenario G · resume
    ev("(()=>{const o=day(new Date());o.counters.dials=12;touch(o);save();})(); lxPlanOpen(20,'life',{path:'body'}); lxStart(); 0"); pg.wait_for_timeout(300)
    s0 = ev("(()=>{lxStepDone(0,'done');const s=lxCur();return {id:s.id,i:s.i,n:s.steps.length}})()"); pg.wait_for_timeout(900)
    pg.close(); ctx2, pg, errs2 = boot(b, '2026-11-19T17:20:00+02:00', keep=ctx); ev = pg.evaluate
    ev("lxGo(); 0"); pg.wait_for_timeout(500)
    s1 = ev("(()=>{const s=lxCur();return s?{id:s.id,i:s.i,n:s.steps.length,ui:/Step 2 of/.test((document.querySelector('.lx-run')||{}).textContent||'')}:null})()")
    check('G · close the app mid-session, reopen: same session, same step', s0['n'] >= 2 and s1 and s1['id'] == s0['id'] and s1['i'] == 1 and s1['ui'], [s0, s1])
    ev("lxEnd(1); 0"); pg.wait_for_timeout(300)
    check('ending early records what stayed open', ev("lxLog().slice(-1)[0].early===1&&/Still open/.test(document.getElementById('modal').textContent)"))
    ev("closeModal(); 0")
    check('progress is not duplicated: Learn keeps only the session and its log; lessons, reviews and evidence stay in their own records', ev("Object.keys(S.boot).filter(k=>k.startsWith('lx:')).sort().join()==='lx:cur,lx:log'"), ev("Object.keys(S.boot).filter(k=>k.startsWith('lx:'))"))
    check('phone checklist exists and starts untested', ev("PT.length>=8&&Object.keys(bcV('pt:1331',{})).length===0"))
    check('no page errors', not errs and not errs2, (errs + errs2)[:3])

    # ── the startup race (gap 6): navigating in the first second must not be undone
    bad = 0
    for t in ('2026-11-19T12:00:00+02:00', '2026-11-19T18:30:00+02:00', '2026-11-19T18:30:00+02:00', '2026-11-19T20:40:00+02:00'):
        c3 = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block'); c3.add_init_script('window.CP_NOLATE=1'); p3 = c3.new_page(); p3.route('**/rest/v1/**', lambda r: r.abort())
        p3.clock.install(time=t); p3.goto(URL); p3.wait_for_timeout(700)
        was = p3.evaluate("!!window._arcShown"); p3.evaluate("show('acq'); 0"); p3.wait_for_timeout(2600); p3.clock.run_for(3000)
        if was and p3.evaluate("document.getElementById('arc').classList.contains('on')"): bad += 1
        c3.close()
    check('tapping away from Day right after launch is not undone by the startup timer (noon, evening x2, night)', bad == 0, bad)
    sw = ev("fetch('./sw.js').then(r=>r.text())")
    check('service worker caches the two new files under the new cache name', "warroom-v13.55.0" in sw and './blueprint.js' in sw and './learnx.js' in sw)
    b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
