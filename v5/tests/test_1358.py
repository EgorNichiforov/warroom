"""War Room 13.58 checks: War Room's own forecasts (forecast.js). Made before the week, marked after it, compared with
"same as last week", and the method replayed over past weeks. Numbers below are worked out by hand from the seeded weeks.
Throwaway browser, cloud blocked. Not a real phone."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-20T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(9000)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(400)
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    check('version 13.58.0 or later', ev("APP_VERSION.localeCompare('13.58.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('on a day that is not Monday nothing is written at start-up', ev("Object.keys(S.boot||{}).filter(k=>k.indexOf('fct:')===0).length") == 0)
    ev("""(()=>{S.days={}; const D=[0,10,30,20,40,50,0,25,35,15], m=monday(new Date()); for(let i=1;i<=9;i++){const o=day(addDays(m,-7*i)); o.counters={dials:D[i],bac:0}; if(i<=2) o.weight=77+i/10; touch(o);} })(); 0""")
    f = ev("fctMake('dials', monday(new Date()))")
    check('dials: the range is the spread of the last four weeks, the middle is their median, the simple rule is last week', f == {'lo': 10, 'hi': 40, 'point': 25, 'base': 10, 'n': 4}, f)
    check('a week with nothing recorded is "no data", not zero', ev("fctWeek('dials', addDays(monday(new Date()),-70))") is None and ev("fctWeek('dials', addDays(monday(new Date()),-42))") == 0)
    check('weight has only two recorded weeks, so no forecast is invented', ev("fctMake('weight', monday(new Date()))") is None)
    B = ev("fctBack('dials')")
    check('the method replayed over six past weeks: held 3 of 6, missed by 17.1 against 22.5 for the simple rule', B == {'n': 6, 'cover': 3, 'mae': 17.1, 'bmae': 22.5}, B)
    check('with fewer than six replayed weeks it refuses to judge the method', 'too few' in ev("fctVerdict({n:4,cover:2,mae:1,bmae:2})") and 'does NOT beat' in ev("fctVerdict({n:6,cover:2,mae:9,bmae:5})"))
    ev("fctOpen(); 0"); pg.wait_for_timeout(150)
    A = ev("fctAll()")
    check('opening it on a Friday makes the forecasts and marks them late: they have already seen part of the week', sorted(x['m'] for x in A) == ['bac', 'dials'] and all(x['late'] for x in A) and A[0]['w'] == '2026-11-16', A)
    check('the screen gives the range, the method, the simple rule, the verdict and what is missing; and fits', ev(f"/10 dials to 40 dials, most likely about 25/.test({t})&&/made after Monday/.test({t})&&/No forecast for average weight/.test({t})&&/range held in 3 of 6/.test({t})&&/17\\.1 on average, against 22\\.5/.test({t})&&/beats the simple rule/.test({t})&&/never shown anywhere as a fact/.test({t})&&{fits}"), ev(t)[:300])
    # ── a real Monday: made in advance
    pg.clock.set_fixed_time('2026-11-23T08:00:00+02:00')
    # the app may or may not have opened an empty record for a day of last week by now (a background tick): remove them,
    # so the four weeks under the forecast are the seeded ones whichever way the timing fell
    ev("Object.keys(S.days).filter(k=>k>='2026-11-16'&&k<'2026-11-23').forEach(k=>{delete S.days[k]}); 0")
    made = ev("fctEnsure()")
    M = ev("fctAll().filter(x=>x.w==='2026-11-23')")
    check('on Monday the forecast is made in advance (not late) and names its method', made == 2 and all(not x['late'] for x in M) and all('last four recorded weeks' in x['method'] for x in M) and [x for x in M if x['m'] == 'dials'][0]['point'] == 25, M)
    check('it is made once: asking again changes nothing', ev("fctEnsure()") == 0)
    ev("(()=>{const o=day(pd('2026-11-24')); o.counters={dials:33,bac:40}; touch(o);})(); 0")
    check('it cannot be marked while the week is still running', ev("fctResolve()") >= 0 and 'res' not in ev("fctAll().find(x=>x.w==='2026-11-23'&&x.m==='dials')"))
    pg.clock.set_fixed_time('2026-11-30T08:00:00+02:00'); ev("fctResolve(); 0")
    R = ev("fctAll().find(x=>x.w==='2026-11-23'&&x.m==='dials').res")
    check('the Monday after, it is marked from the records: 33 was inside 10 to 40, off by 8, the simple rule off by 23', R['actual'] == 33 and R['inside'] is True and R['err'] == 8 and R['berr'] == 23, R)
    ev("fctOpen(); 0"); pg.wait_for_timeout(150)
    check('only forecasts made in advance are counted; the late one is kept but not scored', ev(f"/said 10 to 40, was 33 · inside · off by 8 \\(simple rule: 23\\)/.test({t})&&/late forecasts? kept but not scored/.test({t})&&{fits}"), ev(t)[600:1100])
    check('his own predictions are pointed to, not copied', ev(f"/Your own predictions/.test({t})&&/Judgment lab/.test({t})"))
    check('found by asking in plain words', ev("(wfFind('forecast backtest')[0]||[])[0]") == 'forecasts')
    check('still one recommender; this adds no candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^fct/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
