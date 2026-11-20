"""War Room 13.48 checks: the app really opens with no network after one visit (service worker and cache), and stays
inside a speed budget on a phone-sized window, also with two years of data in it. Real service worker, no fake clock.
A desktop Chrome on a server is faster than a phone: these numbers are a floor for trouble, not a promise for a handset."""
import sys, json, time
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + ('  · ' + str(info) if info else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort()); pg.route('**/functions/v1/**', lambda r: r.abort())
    t0 = time.time(); pg.goto(URL); pg.wait_for_function("typeof APP_VERSION==='string'&&typeof mcBuild==='function'&&typeof nqOpen==='function'", timeout=20000); boot = round((time.time() - t0) * 1000)
    ev = pg.evaluate; ev("TOUR_OFF=1; OD_OFF=1; SL_OFF=1; 0")
    N = ev("(()=>{const r=performance.getEntriesByType('resource').filter(x=>/\\.js(\\?|$)/.test(x.name));return {n:r.length,kb:Math.round(r.reduce((a,x)=>a+(x.decodedBodySize||0),0)/1024),dcl:Math.round(performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart)}})()")
    check('first load: every script arrives and the app is usable', boot < 8000, f"{boot} ms to usable; {N['n']} scripts, {N['kb']} KB of code; DOM ready at {N['dcl']} ms")
    check('code size stays under the budget (4 MB)', 0 < N['kb'] < 4096, f"{N['kb']} KB")
    pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); pg.wait_for_timeout(7000)
    C = ev("caches.keys().then(async ks=>{const k=ks.find(x=>x.includes(APP_VERSION)); if(!k) return {k:null,n:0}; const c=await caches.open(k); const keys=(await c.keys()).map(r=>new URL(r.url).pathname.split('/v5/')[1]); return {k,n:keys.length,miss:['server.js','vault.js','model.js','finish.js','agents.js','core.js','index.html'].filter(f=>!keys.includes(f))}})")
    check('the offline cache for this version holds the app, including the newest files', C['k'] and C['n'] > 100 and not C['miss'], C)
    ev("(()=>{const o=day(new Date()); o.water=3; touch(o); save(true);})(); 0")
    ctx.set_offline(True); t0 = time.time(); pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string'&&typeof mcBuild==='function'&&typeof nqOpen==='function'", timeout=20000); off = round((time.time() - t0) * 1000)
    check('with no network at all the app opens again from the cache', True, f"{off} ms")
    check('what was saved before going offline is still there', ev("day(new Date()).water") == 3)
    ev("TOUR_OFF=1; OD_OFF=1; SL_OFF=1; hyAdd(1); 0"); pg.wait_for_timeout(2500)
    check('you can keep working offline: a change is saved on the device', ev("day(new Date()).water") == 4 and ev("JSON.parse(localStorage.getItem(STORE)).days[dk(new Date())].water") == 4)
    ev("closeModal(); wfOpen(); 0"); pg.wait_for_timeout(200); check('"Where do I…?" opens offline', ev("document.getElementById('modal').textContent.length>200"))
    ev("closeModal(); 0"); ev("svOpen()"); pg.wait_for_timeout(300)
    check('the Server screen says it cannot reach the server instead of hanging or guessing', ev("/No connection to the server|Sync is off on this device/.test(document.getElementById('modal').textContent)"), ev("document.getElementById('modal').textContent.slice(0,120)"))
    ev("closeModal(); 0"); ctx.set_offline(False)
    # speed with today's data
    def ms(js, n=5):
        return ev(f"(()=>{{const t=performance.now(); for(let i=0;i<{n};i++){{ {js} }} return Math.round((performance.now()-t)/{n}*10)/10}})()")
    A = {'mcBuild': ms('mcBuild();'), 'render': ms('render();', 3), 'scRows': ms('scRows();'), 'enAll': ms('enAll(null,true);', 3), 'wfList': ms("wfList('');"), 'rcRun': ms('rcRun();', 3), 'pmRows': ms('pmRows();')}
    check('with ordinary data the main calculations are instant', A['mcBuild'] < 150 and A['render'] < 400 and A['enAll'] < 600 and A['rcRun'] < 600, A)
    # two years of heavy use
    ev("""(()=>{ for(let i=0;i<730;i++){const o=day(addDays(new Date(),-i)); o.counters=o.counters||{}; o.counters.dials=50; o.counters.bac=30; o.water=6; o.mc='x'; o.mcDone=i%2; o.ext=[{id:'e'+i,d:20,c:4,o:1,src:'t',at:1}]; touch(o);} for(let i=0;i<3000;i++){S.tasks['pf'+i]={id:'pf'+i,_u:1,title:'Task number '+i,due:dk(addDays(new Date(),(i%60)-30)),done:i%3===0};} S.journal=S.journal||{}; for(let i=0;i<1500;i++){S.journal['pj'+i]={id:'pj'+i,_u:1,at:dk(addDays(new Date(),-(i%700))),kind:'note',text:'An entry of ordinary length about the day, number '+i};} const L=[]; for(let i=0;i<400;i++)L.push([dk(addDays(new Date(),-(i%300))),XC.cards[i%XC.cards.length].id,i%4,1]); bcW('rlog',L); })(); 0""")
    kb = ev("Math.round(JSON.stringify(S).length/1024)")
    B = {'mcBuild': ms('mcBuild();', 3), 'render': ms('render();', 3), 'scRows': ms('scRows();', 3), 'enAll': ms('enAll(null,true);', 2), 'rcRun': ms('rcRun();', 2), 'pmRows': ms('pmRows();', 3), 'save': ms('localStorage.setItem("wr-perf",JSON.stringify(S));', 2)}
    ev("localStorage.removeItem('wr-perf'); 0")
    check('with two years of heavy use (730 days, 3,000 tasks, 1,500 journal entries) it stays usable', B['mcBuild'] < 600 and B['render'] < 1200 and B['enAll'] < 2500 and B['rcRun'] < 2500 and B['save'] < 800, {'data_kb': kb, **B})
    check('that much data still fits the browser storage a phone gives an app (5 MB)', kb < 4500, f"{kb} KB")
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
