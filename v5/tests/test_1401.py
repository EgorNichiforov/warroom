"""War Room 15.7 checks: Focus mode (22 Nov 2026, Musk's algorithm step 2). With Focus on, Work shows Dial (+ Pipeline when the
stage opens it) and Playbook, You shows Train and Settings, Money shows Overview and Transactions; every other screen still
opens and keeps its data; switching Focus off restores the original lists exactly; 1,000 logged dials lift it by itself."""
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
    pg.clock.install(time='2026-11-22T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 15.7.0 or later', ev("APP_VERSION.localeCompare('15.7.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('Focus is on by default with 0 dials', ev("fcOn()"))
    ev("renderNav(); 0")
    W = ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0])")
    Y = ev("SH_HUBS.find(h=>h.id==='you').segs.map(s=>s[0])")
    M = ev("SH_HUBS.find(h=>h.id==='money').inner.map(s=>s[0])")
    check('Work shows only Dial / Pipeline / Playbook', set(W) <= {'dial', 'crm', 'book'} and 'dial' in W and 'book' in W, W)
    check('You shows only Train and Settings', set(Y) <= {'train', 'me'} and 'train' in Y, Y)
    check('Money shows only Overview and Transactions', set(M) <= {'over', 'tx'} and 'over' in M, M)
    rawW = ev("SH_HUBS.find(h=>h.id==='work')._fcSegs.map(s=>s[0])")
    check('hidden screens are kept underneath (Learn/Courses still registered)', len(rawW) > len(W), rawW)
    ev("show('me'); 0"); pg.wait_for_timeout(400); pg.clock.run_for(500)
    check('Settings shows the Focus card with hidden-screen buttons', ev("!!document.getElementById('fc-card') && document.getElementById('fc-card').innerHTML.includes('Hidden screens')"))
    ev("show('food'); 0"); pg.wait_for_timeout(400)
    check('a hidden screen still opens by hand', ev("view") == 'food', ev("view"))
    ev("S.settings.focusOff=true; renderNav(); 0")
    W2 = ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0])")
    check('Focus off restores the full Work list', W2 == rawW, [W2, rawW])
    check('Focus off: You list is the original', len(ev("SH_HUBS.find(h=>h.id==='you').segs")) > len(Y))
    ev("S.settings.focusOff=false; 0")
    ev("""(()=>{const k=dk(new Date());const x=Object.values(Q.items)[0];x.log=x.log||[];for(let i=0;i<1000;i++)x.log.push({at:Date.now(),r:'NO ANSWER',d:{dials:1}});})(); 0""")
    check('1,000 logged dials lift Focus by itself', not ev("fcOn()"), ev("sgEvidence().attempts"))
    check('no page errors', not errs, errs[:3])
    b.close()
fails = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(fails)}/{len(RES)} passed"); sys.exit(1 if fails else 0)
