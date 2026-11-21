"""War Room 15.3 checks: earlier versions for agencies. Your own stage change, details save and note keep the earlier fields
(last 10), shown on the agency page; the call log is not versioned and stays untouched."""
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
    pg.clock.install(time='2026-11-21T16:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 15.3.0 or later', ev("APP_VERSION.localeCompare('15.3.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("""(()=>{Q.items[999901]={id:999901,agency:'Sunshine Home Care',city:'Tampa',phone:'+18135550100',status:'callback',stage:'talked',contact:'Maria',next_step:'Call back about the bench',next_at:'2026-11-24',tags:['tampa'],log:[{at:'2026-11-20T15:00:00.000Z',day:'2026-11-20',outcome:'owner',d:{dials:1,owners:1}}],hist:[],_u:1};})(); 0""")
    log0 = ev("JSON.stringify(Q.items[999901].log)")
    ev("crmOpen(999901); 0"); pg.wait_for_timeout(250)
    ev("$('cr-step').value='Send the Hiring Snapshot'; $('cr-when').value='2026-11-26'; crmSave(999901); 0"); pg.wait_for_timeout(150)
    V = ev("verFor('agency:999901')")
    check('saving new next step and date keeps the earlier ones and names the changed fields', len(V) == 1 and V[0].get('next_step') == 'Call back about the bench' and V[0].get('next_at') == '2026-11-24' and set(V[0]['ch']) >= {'next_step', 'next_at'}, V)
    check('the agency itself has your new values (the save did only what it always did)', ev("Q.items[999901].next_step") == 'Send the Hiring Snapshot')
    stage0 = ev("crmStage(Q.items[999901])")
    to = 'meeting' if stage0 != 'meeting' else 'talked'
    stages = ev("CRM_STAGES.map(z=>z[0])")
    to = [s for s in stages if s != stage0 and s != 'lost'][0]
    ev(f"crmMove(999901,'{to}'); 0"); pg.wait_for_timeout(150)
    V2 = ev("verFor('agency:999901')")
    check('a stage change keeps the earlier stage', len(V2) == 2 and 'stage' in V2[1]['ch'], V2[-1] if V2 else V2)
    ev("crmOpen(999901); 0"); pg.wait_for_timeout(200); ev("$('cr-note').value='Owner prefers mornings'; crmNote(999901); 0"); pg.wait_for_timeout(150)
    check('adding a note keeps the earlier notes', len(ev("verFor('agency:999901')")) == 3 and 'notes' in ev("verFor('agency:999901')")[2]['ch'])
    check('the call log was not versioned and is unchanged', ev("JSON.stringify(Q.items[999901].log)") == log0)
    ev("crmOpen(999901); 0"); pg.wait_for_timeout(250); h = ev("document.querySelector('.modal').innerHTML")
    check('the agency page shows Earlier versions with what changed', 'ver-blk' in h and 'Earlier versions (3)' in h and 'before you changed' in h)
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); 0")
    ev("crmOpen(999901); 0"); pg.wait_for_timeout(200); ev("crmSave(999901); 0")
    check('saving without a change adds no version', len(ev("verFor('agency:999901')")) == 3)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
