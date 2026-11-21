"""War Room 13.77 checks (addendum, sections 3.3, 8 and 9): what changed in a period, the experiment fields for rival
explanations and confounders, and the six kinds of uncertainty named. Sheets are measured at phone and laptop width.
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
    fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    def both(open_js, name):
        r = []
        for w, h in [(390, 844), (1036, 800)]:
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150); ev(open_js + "; 0"); pg.wait_for_timeout(250); r.append(ev(fits)); ev("try{closeModal()}catch(e){}; 0")
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(150)
        check(name + ' fits at 390 and 1036 px', r == [True, True], r)
    check('version 13.77.0 or later', ev("APP_VERSION.localeCompare('13.77.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- experiments
    ev("ensureIntel(); Object.keys(S.experiments).forEach(k=>delete S.experiments[k]); recEdit('experiments'); 0"); pg.wait_for_timeout(200)
    ids = ev("[...document.querySelectorAll('#modal [id^=\"re-\"]')].map(e=>e.id.slice(3))")
    need = ['title', 'hypothesis', 'variable', 'metric', 'start', 'end', 'result', 'rival', 'confound', 'conf', 'decision', 'follow']
    check('the experiment form has hypothesis, the one change, result, other explanations, what else changed, how sure, decision and follow-up', all(n in ids for n in need), [n for n in need if n not in ids])
    ev("""(()=>{const s=(k,v)=>{document.getElementById('re-'+k).value=v}; s('title','Open with a question'); s('hypothesis','If I open with a question, more owners stay on the line'); s('variable','The first sentence'); s('start','2026-11-10'); s('end','2026-11-17'); s('result','More stayed'); s('decision','keep'); recSave('experiments','');})(); 0""")
    x = ev("Object.values(S.experiments)[0]")
    check('a baseline is still taken when the experiment is saved', 'baseline' in x and x['decision'] == 'keep', x)
    h = ev("intelRecords('experiments')")
    check('a conclusion with no other explanation and no confounder written is marked provisional', 'treat this conclusion as provisional' in h)
    ev(f"recEdit('experiments','{x['id']}'); 0"); pg.wait_for_timeout(200)
    ev(f"""(()=>{{const s=(k,v)=>{{document.getElementById('re-'+k).value=v}}; s('rival','I called at a better hour that week'); s('confound','New call list from Tampa'); s('conf','Low: one week, 40 dials'); s('follow','Repeat for two weeks at the same hours'); recSave('experiments','{x['id']}');}})(); 0""")
    x2 = ev("Object.values(S.experiments)[0]")
    check('the four answers are saved on the experiment', x2.get('rival', '').startswith('I called') and x2.get('confound', '').startswith('New call') and x2.get('conf', '').startswith('Low') and x2.get('follow', '').startswith('Repeat'), x2)
    h = ev("intelRecords('experiments')")
    check('the card then shows them and drops the provisional mark', 'Could also be: I called at a better hour' in h and 'Also changed: New call list' in h and 'How sure: Low' in h and 'treat this conclusion as provisional' not in h)
    both("recEdit('experiments')", 'the longer experiment form')
    # --- uncertainty
    ev("ckOpen(); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('ck-unc').textContent")
    check('the kinds-of-number page names six reasons a number can be wrong', ev("CK_UNC.length") == 6 and 'Six reasons a number here can be wrong' in t and all(w in t for w in ['missing or thin', 'measuring is rough', 'source may be wrong', 'too few cases', 'wrong shape', 'world may change']))
    check('each comes with what the app does about it, and no score', all(len(u[1]) > 30 for u in ev("CK_UNC")) and '%' not in t)
    ev("closeModal(); 0"); both("ckOpen()", 'the kinds-of-number page')
    # --- what changed
    ev("""(()=>{Object.keys(S.decisions).forEach(k=>delete S.decisions[k]); S.decisions.dNew={id:'dNew',_u:now(),at:dk(new Date()),title:'Call Tampa before Collier',why:'x'}; S.decisions.dOld={id:'dOld',_u:now()-40*864e5,at:dk(addDays(new Date(),-40)),title:'An old decision'}; const g=Object.values(S.goals).find(g=>g&&!g._del); g._u=now(); window.__g=g.title;})(); 0""")
    R = ev("(()=>{const r=chgRows(7);const all=Object.values(r.by).flatMap(g=>g.nw.concat(g.ch)).map(e=>e.title);return {n:r.n,all}})()")
    check('what changed in 7 days includes the new decision and the edited goal, not the 40-day-old decision', 'Call Tampa before Collier' in R['all'] and ev("window.__g") in R['all'] and 'An old decision' not in R['all'], R['all'][:12])
    check('30 days is wider than 7; the old decision appears only beyond its age', ev("chgRows(30).n") >= R['n'] and 'An old decision' in ev("Object.values(chgRows(60).by).flatMap(g=>g.nw.concat(g.ch)).map(e=>e.title)"))
    ev("chgOpen(7); 0"); pg.wait_for_timeout(250)
    t = ev("document.getElementById('modal').textContent")
    check('the screen groups by kind, says new and changed, and warns that a sync can make a record look changed', 'What changed in 7 days' in t and ' new · ' in t and 'changed' in t and 'hourly sync' in t and 'Call Tampa before Collier' in t)
    check('one bottom bar, period buttons in the body', ev("document.querySelectorAll('#modal .actions').length") == 1 and ev("document.querySelectorAll('#modal .fn-inline .btn').length") == 3)
    ev("closeModal(); 0"); both("chgOpen(7)", 'the what-changed screen')
    f = ev("(()=>{const R=wfFind('what changed since last week')||[];return R.length?R[0][0]:null})()")
    check('the finder leads to it', f == 'whatchanged' and ev("new Set(WF.map(x=>x[0])).size===WF.length"), f)
    n0 = ev("JSON.stringify(S.goals).length"); ev("chgOpen(14); closeModal(); 0")
    check('looking changes nothing', ev("JSON.stringify(S.goals).length") == n0)
    check('the ledger records what was checked in the addendum', ev("AUD.find(a=>a.k==='P15').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 3)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
