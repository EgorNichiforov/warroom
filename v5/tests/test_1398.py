"""War Room 15.2 checks: money commitments against the Money hub. Planned payments and decisions or campaigns with an amount in
their cost note are checked in date order: covered, tight, not covered, with the numbers; no amount says so; nothing changes."""
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
    check('version 15.2.0 or later', ev("APP_VERSION.localeCompare('15.2.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("""(()=>{S.txns={};S.mplan={};mnInit();mnPut({date:dk(new Date()),type:'count',amt:3000,acc:'cash'});const d=(n)=>dk(addDays(new Date(),n));
      S.mplan.p1={id:'p1',type:'out',amt:500,acc:'cash',cat:'phone',note:'Phone bill',every:'month',next:d(3),active:true};
      S.mplan.p2={id:'p2',type:'out',amt:1500,acc:'cash',cat:'subs',note:'Course fee',every:'month',next:d(10),active:true};
      S.mplan.p3={id:'p3',type:'in',amt:2000,acc:'cash',cat:'lessons',note:'Tennis lessons',every:'month',next:d(20),active:true};
      S.mplan.p4={id:'p4',type:'out',amt:2500,acc:'cash',cat:'rent',note:'Big payment',every:'month',next:d(25),active:true};
      S.decisions=S.decisions||{};S.decisions.dm1={id:'dm1',title:'Buy a second phone number',cost:'about 400 lei a month',review:d(5),_u:1};
      S.decisions.dm2={id:'dm2',title:'Hire a VA later',cost:'some money, not sure',review:d(6),_u:1};})(); 0""")
    before = ev("JSON.stringify([S.txns,S.accounts,S.mplan,S.decisions,S.campaigns])")
    check('an amount with a currency is read from a note, and a note without one is not guessed', ev("rlmAmt('about 400 lei a month').v") == 400 and ev("rlmAmt('$1,200 total')") is not None and ev("rlmAmt('some money, not sure')") is None)
    R = ev("rlmCheck()"); L = {x['ref']: x for x in R['L']}
    check('it starts from the cash you can use now', abs(R['start'] - 3000) < 1, R['start'])
    check('the phone bill is covered (500 of 3000)', L['plan:p1']['st'] == 'covered' and abs(L['plan:p1']['before'] - 3000) < 1, L['plan:p1'])
    check('the decision with 400 lei is checked after the bill (400 of 2500)', L['decision:dm1']['st'] == 'covered' and abs(L['decision:dm1']['before'] - 2500) < 1, L['decision:dm1'])
    check('a decision whose cost note has no amount says no amount', L['decision:dm2']['st'] == 'no amount')
    check('the course fee is tight: more than half of what is left (1500 of 2100)', L['plan:p2']['st'] == 'tight' and abs(L['plan:p2']['before'] - 2100) < 1, L['plan:p2'])
    check('planned income before a date counts, and a payment bigger than what is left is not covered (2500 of 2600 is tight; check order)', L['plan:p4']['st'] in ('tight', 'not covered') and abs(L['plan:p4']['before'] - 2600) < 1, L['plan:p4'])
    ev("S.mplan.p5={id:'p5',type:'out',amt:9000,acc:'cash',note:'Too big',every:'month',next:dk(addDays(new Date(),26)),active:true}; 0")
    check('a payment larger than what is left is not covered', ev("rlmCheck().L.find(x=>x.ref==='plan:p5').st") == 'not covered')
    ev("delete S.mplan.p5; 0")
    ev("rlCapOpen(); 0"); pg.wait_for_timeout(300); t = ev("document.getElementById('modal').textContent")
    check('Capacity shows the commitments with the numbers and says nothing is moved', 'Money commitments against the Money hub' in t and 'Nothing is moved' in t and 'tight' in t and 'no amount' in t)
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); enOpen('decision:dm1'); 0"); pg.wait_for_timeout(250)
    check('the decision page shows whether the Money hub can cover it', 'Can the Money hub cover this?' in ev("document.getElementById('modal').textContent"))
    check('no account, transaction, plan, decision or campaign changed', ev("JSON.stringify([S.txns,S.accounts,S.mplan,S.decisions,S.campaigns])") == before)
    check('the money line now reads the real amounts (it read a missing field before)', ev("(()=>{const t=mnPut({date:dk(new Date()),type:'out',amt:120,acc:'cash',cat:'food'});const r=rlMoney();t._del=true;return r})()").find('out 120') >= 0, ev("rlMoney()"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
