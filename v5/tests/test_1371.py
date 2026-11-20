"""War Room 13.71 checks (13.24.3 execution brief): the BAC default follows the floor the user set (7, not 8), saving BAC
targets keeps the confirmed profile, and the mission card shows the campaign's own why-it-matters line.
Throwaway browser. Not a real phone."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    check('version 13.71.0 or later', ev("APP_VERSION.localeCompare('13.71.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- BAC default = the floor he set
    ev("S.settings.bac={profile:'umanist',profileOk:'2026-11-19',certOk:'2026-11-19'}; bacApply(); 0")
    check('with no target saved, Romanian and History default to 7, not 8', ev("bacStats().filter(s=>s.max===10).every(s=>s.target===7)") and ev("BAC_FLOOR") == 7, ev("bacStats().map(s=>[s.id,s.target])"))
    check('certificate subjects keep their own scale (not touched by the floor)', ev("bacStats().filter(s=>s.max!==10).every(s=>s.target>10)"))
    ev("bacOpen(); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('modal').textContent")
    check('the board states the floor in words and no longer says 8+', 'Your floor: pass, with an average not lower than 7.' in t and 'Target average 8' not in t and '8+' not in t.split('BAC board')[1][:260], t[:260])
    ev("bacTargetsOpen(); 0"); pg.wait_for_timeout(150)
    check('the targets form opens on 7', ev("document.getElementById('bt-avg').value") == '7')
    ev("document.getElementById('bt-avg').value='7,5'; document.querySelector('.bt-s[data-id=\"ist\"]').value='8'; bacTargetsSave(); 0"); pg.wait_for_timeout(200)
    sb = ev("S.settings.bac")
    check('a target you save yourself wins', sb.get('target') == 7.5 and sb['t'].get('ist') == 8 and ev("bacStats().find(s=>s.id==='ist').target") == 8)
    check('saving targets keeps the confirmed profile and certificate marks (they used to be wiped)', sb.get('profile') == 'umanist' and sb.get('profileOk') == '2026-11-19' and sb.get('certOk') == '2026-11-19', sb)
    t = ev("document.getElementById('modal').textContent")
    check('the board then shows your own target', 'Your target average: 7.5.' in t, t[:200])
    check('with no mock scores it still refuses to say on track', ev("bacTrack().known") is False and 'cannot be judged' in ev("bacTrack().line"))
    ev("closeModal(); 0")
    # --- campaign why on the mission
    ev("""(()=>{ensureIntel(); Object.keys(S.campaigns).forEach(k=>delete S.campaigns[k]); const id='c'+uid(); S.campaigns[id]={id,_u:now(),title:'First paying agency',objective:'One agency pays',why:'Proof that the offer works before July',deadline:'2027-01-31',milestones:[{t:'20 owner conversations',done:false}],draft:false}; window.__cid=id;})(); 0""")
    w = ev("(()=>{const c=mcCampaigns()[0];return mcCampFor(mcCampDom(c))})()")
    check('the mission reads the campaign\'s own why-it-matters line', w and w['why'] == 'Proof that the offer works before July' and w['next'] == '20 owner conversations', w)
    ev("delete S.campaigns[window.__cid].why; 0")
    w = ev("(()=>{const c=mcCampaigns()[0];return mcCampFor(mcCampDom(c))})()")
    check('an older campaign without that line still shows its objective', w and w['why'] == 'One agency pays', w)
    check('the ledger records what was found for the execution brief, and the corrected email figure', ev("AUD.find(a=>a.k==='P04').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 2 and ev("AUD.find(a=>a.k==='P02').rows.some(r=>/47 on your laptop/.test(r.n))"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
