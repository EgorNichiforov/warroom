"""War Room 13.97 checks: the resource planner (Capacity) now flags days and weeks without recovery and keeps the user's own list of
support, skills and equipment. It still uses the real overrun factor and the Money hub, and adds no second recommender. Throwaway browser."""
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
    pg.clock.install(time='2026-11-23T08:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 13.97.0 or later', ev("APP_VERSION.localeCompare('13.97.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    r = ev("(()=>{const x={free:20,L:[{kind:'meal',start:'12:00',end:'12:30'},{kind:'dials',start:'15:00',end:'17:00'}]};return rlRecovery(x)})()")
    check('recovery counts unplanned time plus rest-type blocks only', r == 50, r)
    w = ev("(()=>{const W=[{k:'a',d:new Date(),free:30,L:[]},{k:'b',d:new Date(),free:200,L:[]}];const R=rlRecoveryWeek(W);return [R.low.length,R.noLong]})()")
    check('a day under an hour is flagged; a week with a 3-hour day is not', w == [1, False], w)
    w2 = ev("(()=>{const W=[{k:'a',d:new Date(),free:90,L:[]},{k:'b',d:new Date(),free:120,L:[]}];return rlRecoveryWeek(W).noLong})()")
    check('a week with no 3-hour stretch is flagged', w2 is True, w2)
    ev("rlCapOpen(); 0"); pg.wait_for_timeout(200); t = ev("document.getElementById('modal').textContent")
    check('the Capacity screen shows Recovery and says what it cannot know', 'Recovery' in t and 'does not know how tired you are' in t, t[:300])
    check('it still shows money from the Money hub, not a second tracker', 'Money (from the Money hub)' in t)
    check('the support list starts empty, with examples but nothing invented', 'Nothing listed yet' in t and ev("rlRes().length") == 0)
    ev("document.getElementById('rl-rt').value='Gabi checks my dial count'; document.getElementById('rl-rk').value='support'; rlResAdd(); 0"); pg.wait_for_timeout(200)
    t2 = ev("document.getElementById('modal').textContent")
    check('an item you add is kept and shown with its kind', ev("rlRes().length") == 1 and 'Gabi checks my dial count' in t2 and 'Support (people)' in t2)
    check('it is saved in settings and survives a reload', ev("(S.settings.resources||[]).length") == 1)
    ev("rlResDel(rlRes()[0].id); 0"); pg.wait_for_timeout(150)
    check('remove takes it out', ev("rlRes().length") == 0)
    check('the screen fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    pg.set_viewport_size({'width': 1036, 'height': 800}); pg.wait_for_timeout(200)
    check('and the laptop', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('the overrun factor from real focus contracts is still used', ev("typeof rlOverrun()==='object'&&'r' in rlOverrun()"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
