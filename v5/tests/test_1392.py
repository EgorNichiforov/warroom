"""War Room 14.6 checks: when it happened versus when it was typed. New entries carry their own stamps; a late entry shows as
entered later; the scorecard and kinds-of-number pages say how much of the week was logged at the time; old entries are not
given invented times."""
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
    check('version 14.6.0 or later', ev("APP_VERSION.localeCompare('14.6.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # an old day with numbers and no stamps
    ev("(()=>{const k=dk(addDays(new Date(),-3)),o=day(k);o.counters.dials=40;o.wokeAt='05:20';})(); 0")
    old = ev("JSON.stringify(S.days[dk(addDays(new Date(),-3))])")
    ev("countDial(false); countDial(true); 0")
    e = ev("S.days[dk(new Date())].hr.filter(x=>x.src==='dialer').map(x=>[x.k,x.v,!!x.h,x.at===x.h])")
    check('a dial from the dialer is stamped when it happened and when it was typed (the same moment)', e == [['dials', 1, True, True], ['dials', 1, True, True], ['owners', 1, True, True]], e)
    check('the + sheet now reads "woke up 7:10"', ev("arcParse('woke up 7:10').some(z=>z[0]==='wokeAt'&&z[1]==='07:10')") and ev("arcParse('m-am trezit 6.45').some(z=>z[1]==='06:45')"))
    ev("arcApply(arcParse('woke up 7:10')); 0"); pg.wait_for_timeout(100)
    w = ev("(()=>{const o=S.days[dk(new Date())];const e=o.hr.find(x=>x.k==='wokeAt');return [o.wokeAt,e&&e.v,e&&new Date(e.h).toTimeString().slice(0,5),e&&hrIsLate(e,dk(new Date()))]})()")
    check('"woke up 7:10" typed at 14:00 sets the wake time and is marked as entered later', w == ['07:10', '07:10', '07:10', True], w)
    check('it did not leak into the counters', ev("S.days[dk(new Date())].counters.wokeAt===undefined"))
    ev("arcApply(arcParse('12 dials 1 owner')); 0"); pg.wait_for_timeout(100)
    check('numbers from the + sheet are stamped and still counted', ev("(()=>{const o=S.days[dk(new Date())];return o.counters.dials===14&&o.hr.some(x=>x.k==='dials'&&x.v===12&&x.src==='+ sheet')})()"))
    ev("(()=>{curDate=addDays(new Date(),-1);bump('bac',25);curDate=new Date();})(); 0")
    y = ev("(()=>{const k=dk(addDays(new Date(),-1)),e=S.days[k].hr.find(x=>x.k==='bac');return [e.h,hrIsLate(e,k)]})()")
    check('a tap on yesterday has no invented happened-at time and counts as entered later', y == [None, True], y)
    check('the old day was not changed and has no stamps', ev("JSON.stringify(S.days[dk(addDays(new Date(),-3))])") == old and ev("!S.days[dk(addDays(new Date(),-3))].hr"))
    R = ev("(()=>{const R=hrWeek();return {now:R.now,late:R.late,none:R.none}})()")
    check('the week counts at the time, afterwards, and days with time not recorded', R['now'] >= 5 and R['late'] >= 2 and R['none'] >= 1, R)
    ev("scOpen(); 0"); pg.wait_for_timeout(250); t = ev("document.getElementById('modal').textContent")
    check('the scorecard says how much was logged at the time and shows the late entry', 'typed at the time' in t and 'entered later' in t and 'time not recorded' in t, t[-600:])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); ckOpen(); 0"); pg.wait_for_timeout(250)
    check('the kinds-of-number page shows the same', 'Logged at the time or afterwards' in ev("document.getElementById('modal').textContent"))
    ev("closeModal(); 0")
    n0 = ev("Object.keys(S.txns||{}).length")
    ev("mnEdit(null,{type:'out'}); 0"); pg.wait_for_timeout(200)
    ev("(()=>{$('me-a').value='50';$('me-d').value=dk(addDays(new Date(),-2));mnSave(null,'out')})(); 0"); pg.wait_for_timeout(200)
    m = ev("(()=>{const k=dk(addDays(new Date(),-2)),o=S.days[k];const e=(o&&o.hr||[]).find(x=>x.k==='txn');return e?[e.v,e.h,hrIsLate(e,k)]:null})()")
    check('money entered for two days ago is stamped as entered later', ev("Object.keys(S.txns).length") == n0 + 1 and m and m[0] == '-50' and m[1] is None and m[2] is True, m)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
