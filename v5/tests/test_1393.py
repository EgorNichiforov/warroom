"""War Room 14.7 checks: runway. Usable cash divided by recorded spending over up to 90 days; needs 30 days; shows a range,
the days it rests on, and what it leaves out; never changes an account or transaction."""
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
    pg.clock.install(time='2026-11-21T14:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 14.7.0 or later', ev("APP_VERSION.localeCompare('14.7.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("S.txns={}; mnInit(); 0")
    check('with no records it says so and estimates nothing', ev("(()=>{const R=mnRunway();return !R.ok&&/No transactions/.test(R.why)})()"))
    ev("mnPut({date:dk(addDays(new Date(),-10)),type:'count',amt:9000,acc:'cash'}); mnPut({date:dk(addDays(new Date(),-5)),type:'out',amt:300,acc:'cash',cat:'food'}); 0")
    r = ev("(()=>{const R=mnRunway();return [R.ok,R.days,R.why]})()")
    check('under 30 days of records: not enough data, with the count', r[0] is False and r[1] == 11 and 'Not enough data' in r[2] and 'needs 30' in r[2], r)
    ev("""(()=>{S.txns={};mnInit();mnPut({date:dk(addDays(new Date(),-60)),type:'count',amt:12000,acc:'cash'});
      for(let i=59;i>=0;i--){const d=dk(addDays(new Date(),-i));mnPut({date:d,type:'out',amt:i%7===0?300:100,acc:'cash',cat:'food'}); if(i%14===0) mnPut({date:d,type:'in',amt:1000,acc:'cash',cat:'lessons'});}})(); 0""")
    before = ev("JSON.stringify([S.txns,S.accounts])")
    R = ev("mnRunway()")
    check('it rests on the recorded days (61) and counts usable cash only', R['ok'] and R['days'] == 61 and abs(R['cash'] - ev("mnSafe().spendable")) < 1, [R['days'], R['cash']])
    exp = R['cash'] / R['perDay'] / 30.44
    check('runway = usable cash ÷ recorded spending per month', abs(R['months'] - exp) < 0.01 and R['mLo'] <= R['months'] <= (R['mHi'] or 99), R)
    check('the range comes from week-to-week swings and the weeks are counted', R['weeks'] == 8 and R['mLo'] < R['months'], R['weeks'])
    check('recorded income over the same days is reported, not assumed', R['incMonth'] > 0)
    check('nothing in accounts or transactions changed', ev("JSON.stringify([S.txns,S.accounts])") == before)
    ev("mnRunwayOpen(); 0"); pg.wait_for_timeout(200); t = ev("document.getElementById('modal').textContent")
    check('the runway page names what it leaves out: unrecorded spending, income, planned payments', 'did not record' in t and 'assumes none' in t and 'Planned payments' in t and 'months' in t, t[:300])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); show('money'); 0"); pg.wait_for_timeout(500); pg.clock.run_for(500)
    h = ev("document.body.innerHTML")
    check('the Money screen shows the runway in months with its basis', 'mnRunwayOpen()' in h and 'days of records, no income assumed' in h)
    ev("S.accounts.cash.type='savings'; 0")
    check('with no usable cash it says so instead of a number', ev("(()=>{const R=mnRunway();return !R.ok&&/No usable cash/.test(R.why)})()"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
