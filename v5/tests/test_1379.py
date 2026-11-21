"""War Room 13.81 checks: the first batch of the older Hormozi emails (before 1 Sep) is in the library, read in full as text,
linked only to lessons that exist, and the 'what was not fully opened' screen counts it honestly. Throwaway browser. Not a real phone."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; window.__ok=0; ccLoad(()=>{window.__ok=1}); 0")
    for _ in range(40):
        if ev("window.__ok"): break
        pg.wait_for_timeout(250); pg.clock.run_for(250)
    check('version 13.86.0 or later', ev("APP_VERSION.localeCompare('13.86.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    E = ev("ccAll().filter(x=>x.type==='email'&&x.at<'2026-09-01').map(x=>({t:x.t,acc:x.acc,cards:x.cards||[],ins:x.ins||'',note:x.note||''}))")
    check('fifty-five emails from before 1 September are now in the library', len(E) == 55, len(E))
    check('none is passed off as fully opened: the text was read, the links were not', all(e['acc'] == 'part' and 'not opened' in e['note'] for e in E))
    check('each has a paraphrased lesson line', all(len(e['ins']) > 60 for e in E))
    ev("try{xcLoad()}catch(e){}; 0")
    for _ in range(40):
        if ev("typeof XC!=='undefined'&&!!XC&&!!XC.byId"): break
        pg.wait_for_timeout(250); pg.clock.run_for(250)
    bad = ev("(()=>{if(typeof XC==='undefined'||!XC||!XC.byId)return ['lessons not loaded'];return ccAll().filter(x=>x.type==='email'&&x.at<'2026-09-01').flatMap(x=>x.cards||[]).filter(c=>!XC.byId[c])})()")
    check('every lesson link points at a lesson that exists', bad == [], bad)
    pr = [e for e in E if 'Promotion' in e['note']]
    check('the six adverts are marked as promotion', len(pr) == 6, pr)
    ev("ccAccessOpen(); 0"); pg.wait_for_timeout(250); t = ev("document.getElementById('modal').textContent")
    check('the screen says 55 were added and, after a full listing, about 59 are still missing', '55 of those older ones were read and added on 2026-11-21' in t and 'so about 59 older ones are still not in the library' in t, t[300:900])
    check('the screen still fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    pg.set_viewport_size({'width': 1036, 'height': 800}); pg.wait_for_timeout(200)
    check('and the laptop', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
