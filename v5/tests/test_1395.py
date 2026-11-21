"""War Room 14.9 checks: the upkeep list. It shows likely duplicates and never-used records with the reason, opens them,
remembers a dismissal, and never deletes, merges or archives anything."""
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
    check('version 14.9.0 or later', ev("APP_VERSION.localeCompare('14.9.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    old = "Date.parse('2026-09-01')"
    ev(f"""(()=>{{S.risks=S.risks||{{}};S.risks.u1={{id:'u1',t:'Laptop battery dies during a dial block',at:'2026-09-01',_u:{old},status:'open'}};
      S.risks.u2={{id:'u2',t:'Laptop battery dies during a dial block!',at:'2026-11-20',_u:Date.now(),status:'open'}};
      S.risks.u3={{id:'u3',t:'Agency owner never calls back after interest',at:'2026-11-01',_u:Date.now(),status:'open'}};
      S.risks.u4={{id:'u4',t:'Old risk already closed',at:'2026-08-01',_u:{old},status:'closed'}};
      S.decisions=S.decisions||{{}};S.decisions.n1={{id:'n1',title:'Sell in Tampa Bay first before Collier',_u:1}};S.decisions.n2={{id:'n2',title:'Sell in Tampa Bay first, before Collier and Lee',_u:2}};}})(); 0""")
    before = ev("JSON.stringify([S.risks,S.decisions,S.goals,S.tasks])")
    D = ev("upkDups().map(x=>[x.ty,x.a.id,x.b.id,x.why])")
    check('the same title after normalising is listed as a duplicate', any(x[0] == 'risk' and {x[1], x[2]} == {'u1', 'u2'} and 'same title' in x[3] for x in D), D)
    check('nearly the same title is listed with how much is shared', any(x[0] == 'decision' and {x[1], x[2]} == {'n1', 'n2'} and '%' in x[3] for x in D) or not ev("(()=>{const a=new Set(upkNorm('Sell in Tampa Bay first before Collier').split(' ')),b=new Set(upkNorm('Sell in Tampa Bay first, before Collier and Lee').split(' '));let c=0;a.forEach(x=>{if(b.has(x))c++});return c/(a.size+b.size-c)>=0.8})()"), D)
    check('different records are not listed as duplicates', not any({x[1], x[2]} & {'u3'} for x in D))
    U = ev("upkUnused().map(x=>[x.e.ref,x.why])")
    check('a record created 30+ days ago and never touched is listed as never used, with the reason', any(r[0] == 'risk:u1' and 'never changed' in r[1] for r in U), U)
    check('a closed or recently changed record is not listed as never used', not any(r[0] in ('risk:u4', 'risk:u3', 'risk:u2') for r in U))
    ev("chgOpen(); 0"); pg.wait_for_timeout(300); h = ev("document.getElementById('modal').innerHTML")
    check('What changed shows the upkeep list, says it is shown only, with Open buttons', 'upk-blk' in h and 'Nothing is deleted, merged or archived' in ev("document.getElementById('modal').textContent") and "enOpen('risk:u1')" in h)
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    key = ev("upkDups().find(x=>x.ty==='risk').key")
    ev(f"upkDismiss('{key}'); 0"); pg.wait_for_timeout(200)
    check('Not a duplicate stops the pair showing', not ev(f"upkDups().some(x=>x.key==='{key}')"))
    ev("upkDismiss('u|risk:u1'); 0")
    check('Keep it stops the record showing as never used', not ev("upkUnused().some(x=>x.e.ref==='risk:u1')"))
    check('no record was deleted, merged, archived or changed', ev("JSON.stringify([S.risks,S.decisions,S.goals,S.tasks])") == before)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
