"""War Room 15.4 checks: claim kinds where you decide. The open mission card tags its facts and measured lines with their kind;
the Money screen tags safe to spend, runway and kept this month as worked out; nothing changes order or value."""
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
    pg.clock.install(time='2026-11-21T15:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 15.4.0 or later', ev("APP_VERSION.localeCompare('15.4.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('a logged-calls line is Observed, a hand-counter line Your report, an energy fact Your report', ev("ckKindOf('','Call log today: 3 dials (source: logged calls)')") == 'obs' and ev("ckKindOf('','2 more on the hand counter with no call behind them')") == 'rep' and ev("ckKindOf('energy check-ins','Energy last 14 days')") == 'rep')
    check('a computed fact is Worked out, and an unknown origin gets no tag rather than a guess', ev("ckKindOf('stage.js','Business stage 1 of 6')") == 'der' and ev("ckKindOf('','something')") == '')
    M0 = ev("(()=>{const M=mcBuild();return {top:M.top&&M.top.sid,C:M.C.map(c=>c.sid),ev:(M.top&&M.top.ev)||[]}})()")
    ev("mcWhy(); 0"); pg.wait_for_timeout(250); h = ev("document.getElementById('modal').innerHTML")
    check('Why this? on the mission shows kind tags beside its measured and supporting lines', h.count('ck-tag') >= 1, h.count('ck-tag'))
    ev("closeModal(); 0")
    M1 = ev("(()=>{const M=mcBuild();return {top:M.top&&M.top.sid,C:M.C.map(c=>c.sid),ev:(M.top&&M.top.ev)||[]}})()")
    check('the mission, its order and its lines are unchanged', M0 == M1)
    ev("""(()=>{S.txns={};mnInit();mnPut({date:dk(addDays(new Date(),-40)),type:'count',amt:9000,acc:'cash'});for(let i=39;i>=0;i--)mnPut({date:dk(addDays(new Date(),-i)),type:'out',amt:100,acc:'cash',cat:'food'});})(); 0""")
    v0 = ev("mnSafe().perDay")
    ev("show('money'); 0"); pg.wait_for_timeout(600); pg.clock.run_for(500)
    hm = ev("document.body.innerHTML")
    K = [x for x in ['Safe to spend today', 'Runway ›', 'Kept this month', 'Earned − spent this month', 'Savings rate'] if ('<span>' + x) in hm]
    check('every key Money number shown is tagged Worked out (safe to spend, runway, kept or earned minus spent, savings rate)', len(K) >= 2 and all(('<span>' + x + ' <em class="ck-tag ck-der"') in hm for x in K), K)
    check('the numbers are the same as before the tags', ev("mnSafe().perDay") == v0)
    check('the tag explains itself when tapped or hovered', 'Calculated from records' in hm)
    check('it fits the phone', ev("document.documentElement.scrollWidth<=innerWidth+2"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
