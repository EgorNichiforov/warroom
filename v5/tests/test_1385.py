"""War Room 13.99 checks: each scorecard number now carries its own uncertainty. Counts say what they cannot include,
rates get a likely range and the number of dials they rest on, small samples are called small, nothing is invented."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 13.99.0 or later', ev("APP_VERSION.localeCompare('13.99.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    w = ev("ckWilson(10,100)")
    check('the range for 10 of 100 is about 6% to 16% (Wilson, 90%)', abs(w['lo'] - 0.0599) < 0.01 and abs(w['hi'] - 0.161) < 0.01, w)
    check('no cases gives no range rather than a made-up one', ev("ckWilson(0,0)") is None)
    t = ev("ckRate(2,20,'answered')")
    check('a rate on few dials says it is too few to rely on', 'too few to rely on' in t and '20 dials' in t, t)
    t2 = ev("ckRate(30,300,'answered')")
    check('a rate on many dials gives the range without the warning', 'likely between' in t2 and 'too few' not in t2, t2)
    R = ev("scRows().map(r=>[r[0],r[1],r[8],r[9]])")
    check('every scorecard number carries a how-sure line', all(r[3] for r in R), [r for r in R if not r[3]])
    nul = [r for r in R if r[1] is None]
    check('a number not measured says so, not zero', all('not the same as zero' in r[3] for r in nul), nul[:2])
    ans = [r for r in R if r[0] == 'Answered'][0]
    check('Answered is given as a rate of dials, or says there are none yet', ('of' in ans[3] and 'dials' in ans[3]) or 'No answered yet' in ans[3] or 'not the same as zero' in ans[3], ans)
    ev("scOpen(); 0"); pg.wait_for_timeout(250); h = ev("document.getElementById('modal').innerHTML")
    check('the scorecard shows How sure under each number', h.count('ck-unc') == len(R), [h.count('ck-unc'), len(R)])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); ckOpen(); 0"); pg.wait_for_timeout(250)
    check('the kinds-of-number page repeats it per number', 'How sure:' in ev("document.getElementById('modal').textContent"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
