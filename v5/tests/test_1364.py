"""War Room 13.64 checks: campaigns carry every field the first prompt lists (found missing in the line-by-line audit),
editing a campaign no longer loses the evidence on its milestones, and the cap of three active campaigns still holds.
Throwaway browser. Not a real phone."""
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
    pg.clock.install(time='2026-11-20T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    check('version 13.64.0 or later', ev("APP_VERSION.localeCompare('13.64.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("ensureIntel(); Object.keys(S.campaigns).forEach(k=>delete S.campaigns[k]); recEdit('campaigns'); 0"); pg.wait_for_timeout(150)
    ids = ev("[...document.querySelectorAll('#modal [id^=\"re-\"]')].map(e=>e.id.slice(3))")
    need = ['title', 'objective', 'deadline', 'criteria', 'why', 'season', 'stage', 'next', 'bottleneck', 'lead', 'caps', 'res', 'deps', 'risks', 'review', 'outcome', 'ms']
    check('the campaign form has every field the prompt lists: outcome, why, season, deadline, stage, milestones, capabilities, resources, risks, dependencies, leading indicators, measures, bottleneck, next action', all(n in ids for n in need), [n for n in need if n not in ids])
    check('the long form still fits the phone and has one bottom bar', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2&&document.querySelectorAll('#modal .actions').length===1"))
    ev("""(()=>{const set=(k,v)=>{document.getElementById('re-'+k).value=v}; set('title','First paying agency'); set('objective','One agency pays'); set('why','Proof the offer works'); set('season','Business building'); set('stage','No owner conversations yet'); set('next','Log 30 calls with outcomes'); set('bottleneck','Calls are not being made'); set('lead','Dials a week, owner conversations'); set('caps','Opening a cold call'); set('res','Two hours a day, a call list'); set('deps','A working 813 number'); set('ms','20 owner conversations\\nFirst trial'); recSave('campaigns','');})(); 0""")
    c = ev("Object.values(S.campaigns).find(x=>x.title==='First paying agency')")
    check('all of them are saved on the campaign', c and all(c.get(k) for k in ['why', 'season', 'stage', 'next', 'bottleneck', 'lead', 'caps', 'res', 'deps']) and len(c['milestones']) == 2 and c['draft'] is False, c)
    ev(f"S.campaigns['{c['id']}'].milestones[1].done=true; S.campaigns['{c['id']}'].milestones[1].ev='trial agreement, 3 Dec'; recEdit('campaigns','{c['id']}'); 0"); pg.wait_for_timeout(150)
    ev(f"document.getElementById('re-next').value='Book the first case call'; recSave('campaigns','{c['id']}'); 0")
    m = ev(f"S.campaigns['{c['id']}'].milestones[1]")
    check('editing a campaign keeps the evidence written on a milestone (it used to be dropped)', m.get('ev') == 'trial agreement, 3 Dec' and m.get('done') is True and ev(f"S.campaigns['{c['id']}'].next") == 'Book the first case call', m)
    html = ev("intelCampaigns()")
    check('the campaign card shows the stage, the next action and what is blocking it', 'Stage: No owner conversations yet' in html and '<b>Next:</b> Book the first case call' in html and '<b>Blocked by:</b> Calls are not being made' in html)
    for i in range(3):
        ev(f"recEdit('campaigns'); document.getElementById('re-title').value='Camp {i}'; recSave('campaigns',''); 0")
    A = ev("campActive().length"); P = ev("Object.values(S.campaigns).filter(x=>x.active===false).length")
    check('three active campaigns at most: the fourth is saved as paused', A == 3 and P == 1, [A, P])
    check('the ledger records what the line-by-line check of the first prompt found', ev("AUD[0].rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") == 2 and ev("AUD[0].rows.find(r=>r.s.startsWith('3 Life')).st") == 'P')
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
