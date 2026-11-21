"""War Room 13.98 checks: record versions (a goal's earlier values are kept when you edit it), your own limitations and
'last checked' date on any record, and a stale rule per kind shown in 'What changed'. Additive only. Throwaway browser."""
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
    check('version 13.98.0 or later', ev("APP_VERSION.localeCompare('13.98.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    gid = ev("(()=>{const id='g-test-ver';S.goals[id]={id,_u:Date.now()-5e8,title:'20 owner conversations',horizon:'month',target:20,unit:'talks',deadline:'2026-12-08',source:'manual',current:null,done:false};save();return id})()")
    n0 = ev(f"verFor('goal:{gid}').length")
    ev(f"(()=>{{const g=S.goals['{gid}'],vb=verPick(g);g.target=30;g._u=Date.now();verAfter('goal:{gid}',vb,g);save()}})(); 0")
    V = ev(f"verFor('goal:{gid}')")
    check('editing a goal keeps its earlier value as a version', n0 == 0 and len(V) == 1 and V[0]['target'] == 20 and 'target' in V[0]['ch'], V)
    ev(f"(()=>{{const g=S.goals['{gid}'],vb=verPick(g);g._u=Date.now();verAfter('goal:{gid}',vb,g)}})(); 0")
    check('saving without a change adds no version', ev(f"verFor('goal:{gid}').length") == 1)
    check('the goal itself is the edited one; nothing else was rewritten', ev(f"S.goals['{gid}'].target") == 30 and ev(f"S.goals['{gid}'].title") == '20 owner conversations')
    src = open('core.js').read() + open('depth.js').read()
    check('both goal save paths keep a version', src.count("verAfter('goal:'") == 2)
    ev("enAll(null,true); 0")
    ev(f"enOpen('goal:{gid}'); 0"); pg.wait_for_timeout(200); t = ev("document.getElementById('modal').textContent")
    check('the record shows its earlier versions', 'Earlier versions (1)' in t and 'target 20' in t, t[:400])
    check('and asks for limitations and when it was last checked', 'How far to trust it' in t and 'Never marked as checked' in t)
    ev("document.getElementById('kn-lim').value='Target set before any owner talk; a guess.'; knSave('goal:" + gid + "'); 0"); pg.wait_for_timeout(150)
    ev(f"knChecked('goal:{gid}'); 0"); pg.wait_for_timeout(150)
    K = ev(f"knGet('goal:{gid}')")
    check('a limitation and a checked date are stored as your notes, beside the record', K.get('lim', '').startswith('Target set') and K.get('chk') == '2026-11-21', K)
    check('the goal record itself got no new fields', 'lim' not in ev(f"S.goals['{gid}']") and 'chk' not in ev(f"S.goals['{gid}']"))
    st = ev("(()=>{const e={ref:'fact:x',type:'fact',upd:Date.now()-120*864e5,at:null};return knStale(e)})()")
    check('a fact not changed or checked for 120 days is stale (limit 90)', st and st['lim'] == 90 and st['days'] >= 119, st)
    st2 = ev("(()=>{const e={ref:'fact:y',type:'fact',upd:Date.now()-10*864e5};return knStale(e)})()")
    check('a recent one is not', st2 is None)
    ev("closeModal(); chgOpen(30); 0"); pg.wait_for_timeout(250)
    check('What changed opens and fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2") and 'What changed' in ev("document.getElementById('modal').textContent"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
