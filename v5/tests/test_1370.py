"""War Room 13.70 checks (second and third prompts): the list of sources that were not fully opened, with honest email
counts read from the library itself. Throwaway browser. Not a real phone."""
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
    check('version 13.70.0 or later', ev("APP_VERSION.localeCompare('13.70.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("window.__ok=0; ccLoad(()=>{window.__ok=1}); 0")
    for _ in range(40):
        if ev("window.__ok"): break
        pg.wait_for_timeout(250)
    check('the library loads', ev("window.__ok") == 1)
    R = ev("(()=>{const r=ccAccessRows();return {n:r.n,full:r.by.full.length,part:r.by.part.length,none:r.by.none.length,mail:r.mail}})()")
    raw = ev("(()=>{const A=ccAll().filter(x=>!x.clip);return {n:A.length,full:A.filter(x=>x.acc==='full').length,mail:A.filter(x=>x.type==='email').length,linked:A.filter(x=>x.type==='email'&&(x.cards||[]).length).length}})()")
    check('every source is counted once: opened in full, partly, or not opened', R['full'] + R['part'] + R['none'] == R['n'] == raw['n'] and R['full'] == raw['full'], [R, raw])
    check('the email counts come from the library itself', R['mail']['n'] == raw['mail'] and R['mail']['linked'] == raw['linked'] and R['mail']['n'] >= 58 and R['mail']['part'] <= R['mail']['n'], R['mail'])
    check('the three workbooks that were never opened are in the not-opened group', ev("ccAccessRows().by.none.filter(x=>/Workbook/.test(x.t)).length") >= 3)
    ev("ccAccessOpen(); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('modal').textContent")
    check('the screen says what counts as studied and shows the three groups', 'counts as studied only if it was opened in full' in t and 'Opened in full' in t and 'Partly opened' in t and 'Not opened' in t)
    check('it shows how many emails feed a lesson and how many were not opened in full', f"Linked to a lesson: {R['mail']['linked']} of {R['mail']['n']}" in t and f"Not opened in full: {R['mail']['part']} of {R['mail']['n']}" in t, t[200:520])
    check('the mailbox figure is labelled as a dated Gmail estimate, not as a fact from the app', 'Gmail search on 2026-11-20' in t and "Gmail's own estimate" in t and 'about 204' in t and 'about 114' in t and 'Not every one is a lesson' in t)
    check('it lists 25 at first and offers the rest', ev("document.querySelectorAll('#modal [onclick^=\"ccView\"]').length") == 25 and 'Show all' in t)
    check('the screen fits the phone and has one bottom bar', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2&&document.querySelectorAll('#modal .actions').length===1"))
    ev("ccAccessOpen(1); 0"); pg.wait_for_timeout(200)
    check('show all lists every one', ev("document.querySelectorAll('#modal [onclick^=\"ccView\"]').length") == R['part'] + R['none'])
    ev("closeModal(); 0")
    f = ev("(()=>{const R=wfFind('emails not opened')||[];return R.length?R[0][0]:null})()")
    check('the finder leads to it', f == 'srcaccess' and ev("WF.filter(x=>x[0]==='srcaccess').length") == 1 and ev("WF.find(x=>x[0]==='srcaccess')[5].length>15"), f)
    check('finder ids are still unique', ev("new Set(WF.map(x=>x[0])).size===WF.length"))
    check('the ledger records the counts for the email prompt', ev("AUD.find(a=>a.k==='P02').rows.some(r=>/about 204/.test(r.n))") and ev("AUD.find(a=>a.k==='P03').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 2)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
