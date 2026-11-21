"""War Room 13.74 checks (vision prompt, 16.6): execution friction is looked for in the records, pattern by pattern, each
with one concrete correction; nothing is shown that is not there; it ranks nothing. Throwaway browser. Not a real phone."""
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
    pg.clock.install(time='2026-11-21T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    check('version 13.74.0 or later', ev("APP_VERSION.localeCompare('13.74.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # a clean slate: nothing recorded, nothing found
    ev("""(()=>{ensureIntel(); ['tasks','campaigns','decisions','risks','experiments'].forEach(k=>{S[k]=S[k]||{};Object.keys(S[k]).forEach(i=>delete S[k][i])}); Object.values(S.goals).forEach(g=>{g.prio='keep'}); for(let i=0;i<14;i++){const o=day(addDays(new Date(),-i)); o.mcSkip=[]; o.fc=[]; o.counters=o.counters||{}; o.counters.dials=0; o.targets={dials:0};} })(); 0""")
    P = lambda: [x['p'] for x in ev("exFriction()")]
    check('with nothing in the records it finds nothing', P() == [], P())
    n0 = ev("mcBuild().C.length")
    ev("(()=>{for(let i=0;i<3;i++){const id='t'+uid()+i; S.tasks[id]={id,_u:now(),title:'Old '+i,due:dk(addDays(new Date(),-20)),done:false};} S.tasks['fresh']={id:'fresh',_u:now(),title:'New',due:dk(addDays(new Date(),-2)),done:false};})(); 0")
    f = ev("exFriction()")
    check('three tasks more than 14 days overdue are found; a task two days late is not counted', [x['p'] for x in f] == ['Tasks left overdue'] and f[0]['ev'].startswith('3 open tasks'), f)
    ev("(()=>{const id='c'+uid(); S.campaigns[id]={id,_u:now(),title:'First paying agency',objective:'x',milestones:[{t:'Lawyer answer in writing',done:false}],draft:false}; window.__c=id;})(); 0")
    f = ev("exFriction()")
    check('an active campaign with no next action is named', any(x['p'] == 'Campaigns without a next action' and 'First paying agency' in x['ev'] for x in f) and not any(x['p'] == 'Campaigns active without progress' for x in f), f)
    ev("S.campaigns[window.__c].next='Log 30 calls with outcomes'; 0")
    check('writing the next action clears it', 'Campaigns without a next action' not in P(), P())
    ev("S.campaigns[window.__c]._u = now() - 20*864e5; 0")
    check('a campaign with no evidenced milestone and no change in 14 days counts as active without progress', 'Campaigns active without progress' in P(), P())
    ev("S.campaigns[window.__c].milestones[0].done=true; S.campaigns[window.__c].milestones[0].ev='email from the lawyer, 20 Nov'; 0")
    check('a milestone with evidence clears that', 'Campaigns active without progress' not in P(), P())
    ev("Object.values(S.goals).filter(g=>g&&!g._del&&!g.done).slice(0,4).forEach(g=>{g.prio='focus'}); 0")
    f = ev("exFriction()")
    check('four goals on Focus now is flagged as too many priorities; the correction says three at most', any(x['p'] == 'Too many priorities at once' and 'three at most' in x['fix'] for x in f), f)
    ev("Object.values(S.goals).filter(g=>g&&!g._del&&!g.done).slice(0,1).forEach(g=>{g.prio='keep'}); 0")
    check('three goals on Focus now is not flagged', 'Too many priorities at once' not in P(), P())
    ev("(()=>{const o=day(new Date()); o.fc=[{id:'f1',res:'x',intr:[{why:'phone'},{why:'phone'},{why:'phone'},{why:'messages'},{why:'phone'},{why:''}]}];})(); 0")
    f = ev("exFriction()")
    check('six interruptions in focus blocks are found, with the commonest cause and a correction that names it', any(x['p'] == 'Repeated context switching' and 'phone (4)' in x['ev'] and '"phone"' in x['fix'] for x in f), f)
    ev("(()=>{for(let i=1;i<=3;i++){const o=day(addDays(new Date(),-i)); o.mcSkip=[{s:'dials',t:'Dial block',miss:1,done:0,at:now()}];}})(); 0")
    f = ev("exFriction()")
    check('a mission skipped three times shows as repeatedly missed commitments, with the task to do now', any(x['p'] == 'Repeatedly missed commitments' and 'skipped or missed 3 times' in x['ev'] for x in f), f)
    check('every pattern found carries evidence and one correction, and no pep talk', all(x['ev'] and x['fix'] and not any(w in (x['fix'] + x['ev']).lower() for w in ['you can do it', 'believe', 'stay motivated']) for x in f), f)
    check('it leaves the one recommender in charge (the top is still the first candidate)', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    ev("intelTab='friction'; show('intel'); 0"); pg.wait_for_timeout(600)
    check('the Friction tab shows the list above the first-dial delay', ev("!!document.getElementById('ex-fr')") and 'What is slowing execution' in ev("document.getElementById('ex-fr').textContent") and 'Correction:' in ev("document.getElementById('ex-fr').textContent"))
    check('the page is not wider than the phone', ev("document.documentElement.scrollWidth<=window.innerWidth+2"))
    ev("""(()=>{['tasks','campaigns'].forEach(k=>Object.keys(S[k]).forEach(i=>delete S[k][i])); Object.values(S.goals).forEach(g=>{g.prio='keep'}); for(let i=0;i<14;i++){const o=day(addDays(new Date(),-i)); o.mcSkip=[]; o.fc=[];} render();})(); 0"""); pg.wait_for_timeout(300)
    check('with nothing found it says so, and that this means nothing is recorded', 'nothing found' in ev("document.getElementById('ex-fr').textContent") and 'not that nothing is wrong' in ev("document.getElementById('ex-fr').textContent"))
    fnd = ev("(()=>{const R=wfFind('what is slowing me down')||[];return R.length?R[0][0]:null})()")
    check('the finder leads to it', fnd == 'slowing' and ev("new Set(WF.map(x=>x[0])).size===WF.length"), fnd)
    check('the coverage of the vision prompt records what was checked', ev("AUD.find(a=>a.k==='P14').rows.filter(r=>/13.74.0/.test(r.s)).length") == 3)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
