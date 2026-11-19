"""War Room 13.38 checks: learning that has to prove itself (grade log, misconceptions, harder questions, weak spots,
connections, "I did not know how" → learning request, the four ladders), and that removing unused code broke nothing.
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
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4000)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    check('version 13.38.0 or later', ev("APP_VERSION.localeCompare('13.38.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # five finished lessons from two modules; three of them have a memory record
    ev("""(()=>{S.cards=S.cards||{};const ids=Object.keys(BC.cardMod),m1=BC.cardMod[ids[0]],m2=ids.map(i=>BC.cardMod[i]).find(m=>m!==m1&&XC.byId[ids.find(i=>BC.cardMod[i]===m)].c!==XC.byId[ids[0]].c);
      const a=ids.filter(i=>BC.cardMod[i]===m1).slice(0,3),b=ids.filter(i=>BC.cardMod[i]===m2).slice(0,2);window.T={a,b};
      a.concat(b).forEach(id=>bcW('l:'+id,{at:'2026-11-10',r:1})); [a[0],a[1],b[0]].forEach(id=>{S.cards[id]={step:0,due:'2026-11-12',seen:1,_u:1}});})(); 0""")
    W = ev("(()=>{const W=pfWeak();return {learned:W.learned,missed:W.missed.length,untested:W.untested.map(x=>x[0]),ok:W.untested.every(x=>[T.a[2],T.b[1]].includes(x[0]))}})()")
    check('weak spots: a lesson finished days ago with no recall is "never tested"', W['learned'] == 5 and W['missed'] == 0 and len(W['untested']) == 2 and W['ok'], W)
    # a recall that is missed
    ev("cpRecallSet([T.a[0]]); 0"); pg.wait_for_timeout(200)
    check('first recall of a card asks the plain question and shows no earlier answer', ev("/what is it, why does it work/.test(document.getElementById('modal').textContent)&&!document.getElementById('pf-mis')"))
    ev("document.getElementById('ms-in').value='It is about calling more people'; document.querySelector('#modal .btn.primary').click(); 0"); pg.wait_for_timeout(150)
    ev("msGrade(0); 0"); pg.wait_for_timeout(150)
    M = ev("(()=>{const M=pfMis(T.a[0]),L=pfLog();return {said:(M[0]||{}).said,n:M.length,log:L.length,g:(L[0]||[])[2],x:bcV('x:'+T.a[0],0)}})()")
    check('a miss keeps what you said, logs the grade and counts the miss', M['said'] == 'It is about calling more people' and M['n'] == 1 and M['log'] == 1 and M['g'] == 0 and M['x'] == 1, M)
    ev("closeModal(); MSR=null; cpRecallSet([T.a[0]]); 0"); pg.wait_for_timeout(200)
    check('next time, the old wrong answer is NOT shown before you answer', ev("!document.getElementById('pf-mis')&&!/calling more people/.test(document.getElementById('modal').textContent)"))
    ev("document.getElementById('ms-in').value='A better attempt at the idea'; document.querySelector('#modal .btn.primary').click(); 0"); pg.wait_for_timeout(150)
    check('the existing confidence step still comes first', ev("/how sure are you/.test(document.getElementById('modal').textContent)&&!document.getElementById('pf-mis')"))
    ev("cpRvConf(75); 0"); pg.wait_for_timeout(150)
    check('after you answer, it shows what you said last time so you can compare', ev("/Last time you missed this/.test((document.getElementById('pf-mis')||{}).textContent||'')&&/calling more people/.test(document.getElementById('pf-mis').textContent)"))
    ev("msGrade(2); 0"); pg.wait_for_timeout(150); ev("closeModal(); MSR=null; 0")
    A = ev("pfAcc(dk(monday(new Date())))")
    check('recall accuracy is computed from graded recalls (1 of 2 this week)', A and A['n'] == 2 and A['ok'] == 1 and A['pct'] == 50, A)
    # harder question once the card has been recalled after a gap (rung forced for this one card: the test is of the prompt switch)
    ev("window.__br=bcRung; bcRung=function(id){return id===T.b[0]?3:__br(id)}; cpRecallSet([T.b[0]]); 0"); pg.wait_for_timeout(200)
    check('a card you have already retained gets the harder question: where it fails and how you will use it', ev("MSR.lvl===2&&/where does this idea fail or get misused/.test(document.getElementById('modal').textContent)&&/Harder question/.test(document.getElementById('modal').textContent)"))
    ev("document.getElementById('ms-in').value='It fails when the list is bad; I will use it on Thursday'; document.querySelector('#modal .btn.primary').click(); 0"); pg.wait_for_timeout(150)
    ev("cpRvConf(75); 0"); pg.wait_for_timeout(150)
    check('the answer is checked against the card\'s trap and move', ev("!!document.querySelector('#modal .pf-cmp')&&/The trap|The move/.test(document.querySelector('#modal .pf-cmp').textContent)"))
    # connect it
    ev("pfLink(T.b[0]); 0"); pg.wait_for_timeout(200)
    C = ev("(()=>{const C=pfCands(T.b[0]);return {n:C.length,other:C.every(x=>XC.byId[x].c!==XC.byId[T.b[0]].c),learned:C.every(x=>!!bcV('l:'+x,null))}})()")
    check('connect it: candidates are finished lessons from a different course', C['n'] >= 1 and C['other'] and C['learned'], C)
    ev("pfLinkSave(T.b[0]); 0")
    check('a link needs a sentence saying how they connect', ev("pfLinks(T.b[0]).length===0"))
    ev("document.getElementById('pf-why').value='Price only holds if the list is the right agencies'; pfLinkSave(T.b[0]); 0"); pg.wait_for_timeout(200)
    L = ev("(()=>{const L=pfLinks(T.b[0]),to=(L[0]||{}).to;return {n:L.length,back:to?pfLinks(to).some(x=>x.to===T.b[0]):false,resumed:!!MSR&&MSR.phase==='card'&&/How well did you recall it/.test(document.getElementById('modal').textContent),count:pfLinkCount(),card:/Connected to/.test(xcCardHtml(XC.byId[T.b[0]]))}})()")
    check('the link is saved both ways, shown on the lesson card, and the recall carries on where it was', L['n'] == 1 and L['back'] and L['resumed'] and L['count'] == 1 and L['card'], L)
    ev("msGrade(3); 0"); pg.wait_for_timeout(100); ev("closeModal(); MSR=null; bcRung=window.__br; 0")
    check('the grade log records that the harder question was the one answered', ev("pfLog().slice(-1)[0][3]===2"))
    # weak spots view and one-tap recall
    ev("pfOpen(); 0"); pg.wait_for_timeout(250)
    check('weak spots screen: accuracy, the missed lesson with what you said, never-tested lessons; fits the phone', ev("/Recall accuracy this week/.test(document.getElementById('modal').textContent)&&/you said: It is about calling more people/.test(document.getElementById('modal').textContent)&&/Finished but never tested \\(2\\)/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"), ev("document.getElementById('modal').textContent.slice(0,400)"))
    ev("document.getElementById('pf-go').click(); 0"); pg.wait_for_timeout(250)
    check('one tap starts a recall of exactly the weak ones, missed first', ev("!!MSR&&MSR.q[0]===T.a[0]&&MSR.q.includes(T.a[2])&&MSR.q.includes(T.b[1])"), ev("MSR&&MSR.q"))
    ev("closeModal(); MSR=null; 0")
    check('the Learn session\'s recall step also pulls in a never-tested lesson', ev("dxReviewIds(8).some(id=>[T.a[2],T.b[1]].includes(id))"))
    R = ev("scRows().map(r=>({n:r[0],v:r[1],k:r[4]}))")
    check('scorecard: recall accuracy and recalls waiting are there with real values', any(r['n'] == 'Recall accuracy' and r['v'] and r['v'].startswith('67% of 3') for r in R) and any(r['n'] == 'Recalls waiting' and isinstance(r['v'], int) for r in R), [r for r in R if 'ecall' in r['n']])
    check('Learn home shows the weak spots count; finding it by words works', ev("(()=>{bcS={scr:'home',tab:'now'};show('boot');return !!document.getElementById('pf-row')&&(wfFind('what I got wrong')[0]||[])[0]==='weak'&&(wfFind('how is progress measured')[0]||[])[0]==='ladders'})()"), ev("[(wfFind('what I got wrong')[0]||[])[0],(wfFind('how is progress measured')[0]||[])[0]]"))
    ev("pfLadders(); 0"); pg.wait_for_timeout(200)
    check('how progress is measured: four ladders, each with its stages and what feeds it', ev("document.querySelectorAll('#modal .st-o').length===4&&/Exposed → Understood/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    # "I did not know how" → learning request
    ev("closeModal(); arcShow(); DX_OFF=0; mcSkip('bac',0); 0"); pg.clock.run_for(400); pg.wait_for_timeout(250)
    ev("(()=>{const o=S.days[dk(new Date())],e=o.mcSkip[o.mcSkip.length-1];dxWhySet(e.at,'skill');})(); 0"); pg.clock.run_for(400); pg.wait_for_timeout(250)
    check('choosing "I did not know how" asks what was missing', ev("/What did you not know how to do/.test((document.querySelector('#modal h2')||{}).textContent||'')"))
    ev("document.getElementById('pf-gap').value='How to answer when the owner asks the price first'; pfGapSave(); 0")
    check('it is saved as an open learning request the scan and Learn can see', ev("Object.values(S.research||{}).some(r=>r.st==='open'&&r.src==='skip'&&/price first/.test(r.q))"))
    # nothing broke after removing unused code: every main screen still renders
    V = ev("(()=>{const out={};['now','dial','train','food','stats','week','intel','crm','life','money','me'].forEach(v=>{try{arcHide&&arcHide(true);show(v);out[v]=document.getElementById('view-'+v).innerHTML.length>200}catch(e){out[v]=String(e).slice(0,80)}});return out})()")
    check('after removing 33 unused functions every main screen still renders', all(v is True for v in V.values()), V)
    check('still one recommender and one learning planner', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&typeof lxBuild==='function'&&typeof lxTurn==='undefined'})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
