"""War Room 14.0 checks: links across areas. Each compares logged days with and without the cause, needs 5 days on each
side, says how many days it rests on, says it is not proof of cause, and changes no record."""
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
    check('version 14.0.0 or later', ev("APP_VERSION.localeCompare('14.0.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('six links defined across sleep, bedtime, BAC, training, money and calls', ev("XD.length")>=6 and ev("new Set(XD.map(l=>l.from)).size")>=5)
    r0 = ev("xdAll().map(r=>[r.L.id,r.ok,r.na,r.nb])")
    check('with no logged days nothing is claimed', all(not x[1] for x in r0), r0)
    check('too few days says so with the counts', 'not enough days yet' in ev("xdText(xdAll()[0])") and 'needs 5' in ev("xdText(xdAll()[0])"))
    ev("""(()=>{for(let i=1;i<=12;i++){const k=dk(addDays(new Date(),-i)),o=day(k);const good=i%2===0;o.bedAt=good?'21:00':'23:30';o.wokeAt=good?'05:20':'05:20';o.counters=Object.assign(o.counters||{},{dials:good?40:10,bac:good?25:0});}})()""")
    before = ev("JSON.stringify(S.days)")
    r = ev("(()=>{const r=xdRun(XD.find(l=>l.id==='sleep-dials'));return [r.ok,r.na,r.nb,r.ma,r.mb]})()")
    check('sleep to dials compares 6 good nights with 6 short ones', r == [True, 6, 6, 40, 10], r)
    t = ev("xdText(xdRun(XD.find(l=>l.id==='sleep-dials')))")
    check('the sentence gives both averages, the day counts, and says it is not proof', '40' in t and '10' in t and '6 vs 6' in t and 'not proof' in t, t)
    lag = ev("(()=>{const r=xdRun(XD.find(l=>l.id==='train-dials'));return r.L.lag})()")
    check('training is compared with dials the next day', lag == 1)
    check('reading the links changed no record', ev("JSON.stringify(S.days)") == before)
    ev("ckOpen(); 0"); pg.wait_for_timeout(250); h = ev("document.getElementById('modal').innerHTML")
    check('the kinds-of-number page shows How one area moves another', 'ck-xd' in h and 'Sleep → Calls' in h)
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); metricDetail('bac'); 0"); pg.wait_for_timeout(250)
    check('the BAC metric page adds the bedtime link (sleep is already there)', 'Bedtime → BAC' in ev("document.getElementById('modal').textContent"))
    ev("closeModal(); 0")
    g = ev("(()=>{const e={title:'Sleep 21:00 every night',raw:{}};return enXd(e)})()")
    check('a record about sleep shows its links to other areas', 'en-xd' in g and 'Sleep' in g, g[:200])
    check('a record about nothing linked shows nothing', ev("enXd({title:'Buy a lamp',raw:{}})") == '')
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
