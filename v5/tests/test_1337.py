"""War Room 13.37 checks: your decisions of 19 Nov (BAC floor 7, weight 80, personal learning "as much as needed"),
and the sync guard that stops starter goals from coming back as duplicates.
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
    ev = pg.evaluate; ev("CP_NOLATE=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    check('version 13.37.0 or later', ev("APP_VERSION.localeCompare('13.37.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    T = ev("Object.values(S.goals).filter(g=>g&&!g._del).map(g=>g.title+'='+g.target)")
    check('starter goals: BAC is "average not lower than 7" and the November weight is 80; no 8+ and no 77 anywhere', any(t == 'BAC: pass, average not lower than 7=7' for t in T) and any(t.startswith('Weight 80 kg') for t in T) and not any('8+' in t or '77' in t or '9+' in t for t in T), T)
    check('BAC wording in the Playbook, the campaign template and the Day reasons names the floor of 7, not 8+', ev("(()=>{const pb=JSON.stringify(typeof PB_PAGES!=='undefined'?PB_PAGES:(typeof PLAYBOOK!=='undefined'?PLAYBOOK:''));const M=mcBuild();return !M.C.some(c=>/8\\+/.test(c.why+c.out))})()") and ev("fetch('./playbook.js').then(r=>r.text()).then(t=>/average not lower than 7/.test(t)&&!/pass with 8\\+/.test(t)&&!/Pass, with the minimum that takes/.test(t))") and ev("fetch('./intel.js').then(r=>r.text()).then(t=>/Pass the BAC \\(average not lower than 7\\)/.test(t))"))
    # ── sync guard for starter goals
    R = ev("""(()=>{ const keep=JSON.stringify(S.goals); const mine=Object.values(S.goals).filter(g=>g&&g.seed).length;
      S.goals.own={id:'own',_u:5,title:'Caregiver Bench MRR',horizon:'long',target:20000,source:'manual'};  /* a goal I made myself, same title: must survive */
      const remote={goals:{r1:{id:'r1',_u:now()+9,title:'Caregiver Bench MRR',horizon:'long',target:20000,source:'manual'}, r2:{id:'r2',_u:now()+9,_del:true,title:'Weight 77 kg by end of November',horizon:'month',target:77,source:'weight'}, r3:{id:'r3',_u:now()+9,title:'BAC: pass, average not lower than 7',horizon:'long',target:7,source:'manual'}, r4:{id:'r4',_u:now()+9,title:'6 training days',horizon:'week',target:6,source:'workouts:week'}}};
      merge(remote,true); const L=Object.values(S.goals).filter(g=>g&&!g._del), t=(re)=>L.filter(g=>re.test(g.title)).length;
      const out={seeded:mine, mrr:t(/^Caregiver Bench MRR$/), ownKept:!!S.goals.own, weightNov:t(/^Weight \\d+ kg by end of/), bac:t(/^BAC: pass/), train:t(/^6 training days$/), dials:t(/^350 dials$/)};
      S.goals=JSON.parse(keep); return out; })()""")
    check('sync: a fresh install\'s starter goals are dropped when the cloud already has that goal; yours are kept', R['seeded'] >= 10 and R['mrr'] == 2 and R['ownKept'] and R['bac'] == 1 and R['train'] == 1 and R['dials'] == 1, R)
    check('sync: a goal you removed in the cloud (the old November weight) does not come back from a fresh install', R['weightNov'] == 0, R)
    # ── personal development "as much as needed"
    ev("S.settings.learn={}; 0")
    check('no setting: nothing is guaranteed and the screen says so', ev("lxPersMode()==='none'&&lxPersUnder()===null") and ev("(()=>{lxGo();return /No weekly personal minimum is set/.test(document.querySelector('.lx').textContent)})()"))
    ev("lxPersSet(); 0"); pg.wait_for_timeout(200)
    check('the setting offers three plain choices: as needed, minutes, no guarantee', ev("/As much as needed/.test(document.getElementById('modal').textContent)&&!!document.getElementById('lx-pn')&&!!document.getElementById('lx-pm')&&/No guarantee/.test(document.getElementById('modal').textContent)&&document.getElementById('modal').scrollWidth<=390"))
    ev("lxPersSave('min'); 0")
    check('minutes cannot be saved empty', ev("lxPersMode()==='none'"))
    ev("document.getElementById('lx-pn').click(); 0"); pg.wait_for_timeout(200)
    W = ev("lxPersWaiting()")
    N = ev("(()=>{const u=lxPersUnder(),D=lxDomain();return {mode:lxPersMode(),min:lxPersMin(),u:u,dom:D.dom,why:D.why}})()")
    check('"as much as needed": no number is stored; with something personal waiting and no personal session this week, the next session is personal and says why', N['mode'] == 'need' and N['min'] is None and ((W and N['u'] and N['u'].get('need') == 1 and N['dom'] == 'life' and 'never zero' in N['why']) or (not W and N['u'] is None)), {'W': W, 'N': N})
    ev("(()=>{const L=lxLog();window.__L=L;bcW('lx:log',L.concat([{dom:'life',d:dk(new Date()),spent:15,done:1,total:1,kinds:[]}]));})(); 0")
    check('after one personal session that week it stops forcing personal; the next choice follows need again', ev("lxPersUnder()===null"))
    check('the Learn screen shows the mode in plain words', ev("(()=>{lxGo();return /as much as needed/.test(document.querySelector('.lx').textContent)})()"))
    ev("bcW('lx:log',window.__L); S.settings.learn={persMin:90}; 0")
    check('a number still works exactly as before', ev("lxPersMode()==='min'&&lxPersUnder().min===90"))
    ev("S.settings.learn={persMode:'need'}; CO_LEARN.t=0; 0")
    D = ev("(()=>{const M=mcBuild(),c=M.C.find(c=>c.k==='learn');return c?{why:c.why,dom:c.dom,tier:c.tier}:null})()")
    check('the Day candidate words it the same way and Mission Control still ranks alone', D is None or (D['dom'] != 'life') or ('as much as needed' in D['why']), D)
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
