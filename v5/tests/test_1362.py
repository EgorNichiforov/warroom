"""War Room 13.62 checks: the page "Everything you asked for" (audit.js). Every prompt, section by section, with a status;
filters; every "Open it" button leads to a screen that exists. Throwaway browser. Not a real phone."""
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
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    check('version 13.62.0 or later', ev("APP_VERSION.localeCompare('13.62.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('sixteen prompts (one was sent twice), every section has a status and none is blank', ev("AUD.length===16&&AUD.every(b=>b.rows.length>0&&b.rows.every(r=>r.s&&AUD_NAME[r.st]))"))
    check('a section that is partly or not built always says what is missing', ev("AUD.every(b=>b.rows.every(r=>!(r.st==='P'||r.st==='N'||r.st==='Y')||r.n.length>15))"), ev("AUD.flatMap(b=>b.rows.filter(r=>(r.st==='P'||r.st==='N'||r.st==='Y')&&r.n.length<=15).map(r=>b.k+' '+r.s))"))
    bad = ev("AUD.flatMap(b=>b.rows.filter(r=>r.o&&typeof window[r.o]!=='function').map(r=>r.o))")
    check('every "Open it" points at a screen that exists', bad == [], bad)
    ev("audOpen(); 0"); pg.wait_for_timeout(200)
    n = ev("audCount('')")
    check('the page says plainly it is a section-level check, not line by line, and fits the phone', ev(f"/line-by-line check has not been done/.test({t})&&/Seventeen prompts/.test({t})&&{fits}") and n > 150, n)
    check('the counts add up', ev("['B','E','P','N','Y','X'].reduce((s,k)=>s+audCount(k),0)") == n and ev("audCount('N')") >= 1 and ev("audCount('Y')") >= 2)
    ev("audOpen('N'); 0"); pg.wait_for_timeout(150)
    check('"Not built" shows only what is not built, opened out, with the reason', ev(f"/Hardware and sensing/.test({t})&&!/Happened-at against recorded-at/.test({t})&&!/Judgment lab/.test({t})&&{fits}"))
    ev("audOpen('Y'); 0"); pg.wait_for_timeout(150)
    check('"Needs you" names the phone', ev(f"/phone/i.test({t})"))
    ev("audOpen(''); document.querySelectorAll('#modal details').forEach(d=>d.open=true); 0"); pg.wait_for_timeout(150)
    check('opened fully it still fits the phone', ev(fits))
    k = ev("(()=>{const b=[...document.querySelectorAll('#modal button')].find(x=>x.textContent==='Open it'); if(!b) return 'none'; b.click(); return document.getElementById('modal').querySelector('h2').textContent})()")
    check('"Open it" opens the real screen', k not in ('none', 'Everything you asked for'), k)
    check('found by asking in plain words', ev("(wfFind('everything i asked for')[0]||[])[0]") == 'allprompts')
    Q = [['judgment lab','judgmentlab','JUDGMENT LAB'],['operating patterns','mypatterns','OPERATING PATTERNS'],['attention defense','attention','ATTENTION DEFENSE'],['field manual','fieldmanual','FIELD MANUAL'],['contingency','contingency','CONTINGENCY'],['personal reality','reality','PERSONAL REALITY'],['life direction','direction','LIFE DIRECTION'],['capability map','capmap','CAPABILITY MAP'],['development blueprint','devblueprint','DEVELOPMENT BLUEPRINT'],['knowledge to execution','k2e','KNOWLEDGE'],['owner discovery','ownerq','OWNER DISCOVERY'],['strategic review','stratreview','STRATEGIC REVIEW']]
    got = [[q, ev(f"(wfFind('{q}')[0]||[])[0]"), ev(f"(async()=>{{try{{closeModal()}}catch(e){{}}; const x=wfFind('{q}')[0]; x[6](); await new Promise(r=>setTimeout(r,250)); const h=document.querySelector('#modal h2,#modal h3'); return h?h.innerText.toUpperCase():''}})()")] for q, _, _ in Q]
    check('twelve older systems are now found by the names the prompts use, and each opens its own screen (13.63)', all(g[1] == q[1] and q[2] in g[2] for g, q in zip(got, Q)), [g for g, q in zip(got, Q) if not (g[1] == q[1] and q[2] in g[2])])
    check('the ledger rows of the older prompts now have Open buttons too', ev("AUD.filter(b=>['P01','P07','P09'].includes(b.k)).flatMap(b=>b.rows).filter(r=>r.o&&typeof window[r.o]==='function').length") >= 15)
    check('still one recommender; this stores nothing', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()") and ev("Object.keys(S.boot||{}).filter(k=>k.indexOf('aud')===0).length") == 0)
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
