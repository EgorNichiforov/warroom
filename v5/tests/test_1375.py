"""War Room 13.75 checks (vision prompt, Parts X, XV, XXVI): four more kinds of link between ideas, four capabilities the
vision lists that had no home, and finder entries for campaigns, the timeline, savings, overplanning and corrections.
Throwaway browser. Not a real phone."""
import sys, re
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
    check('version 13.75.0 or later', ev("APP_VERSION.localeCompare('13.75.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    for _ in range(40):
        if ev("typeof XC!=='undefined'&&XC&&XC.cards&&XC.cards.length>0"): break
        pg.wait_for_timeout(250)
    # --- capabilities
    new = ['c-lead', 'j-psych', 'd-solve', 'l-tech']
    c = ev("(()=>{let n=0,bad=0,ids={};Object.keys(CM_CAPS).forEach(d=>CM_CAPS[d].forEach(r=>{n++;if(r.length!==11||!Array.isArray(r[10])||ids[r[0]])bad++;ids[r[0]]=1}));return [n,bad,Object.keys(CM_CAPS).length]})()")
    check('96 capabilities in nine areas, every row complete, ids unique', c == [96, 0, 9], c)
    check('leadership, psychology, problem-solving and technical skills each have a capability tied to lessons that exist', ev(f"{new}.every(i=>cmCap(i)&&cmCards(cmCap(i)).length>=1)") and ev("cmGaps().length") == 0, ev("cmGaps().map(c=>c.id)"))
    check('each says plainly what still has no lesson', ev(f"{new}.every(i=>/no lesson yet/i.test(Object.values(CM_CAPS).flat().find(x=>x[0]===i)[4]))"))
    rows = lambda q: re.findall(r'<em>([^<]{1,24})</em><b>([^<]{1,70})', ev("(q)=>bfSearch(q)", q))
    S4 = {q: rows(q) for q in ['leadership', 'psychology', 'problem-solving']}
    check('search finds them by the vision\'s own words', any('Leadership' in t for _, t in S4['leadership']) and any('Psychology' in t for _, t in S4['psychology']) and any('problem-solving' in t for _, t in S4['problem-solving']), S4)
    # --- finder
    F = {q: ev("(q)=>{const R=wfFind(q)||[];return R.length?R[0][0]:null}", q) for q in ['campaign', 'milestones', 'timeline', 'savings', 'overplanning', 'corrections', 'study', 'record a call', 'review money']}
    check('campaign and milestones lead to the campaigns', F['campaign'] == 'camps' and F['milestones'] == 'camps', F)
    check('timeline, savings, overplanning and corrections each lead somewhere', F['timeline'] == 'timeline' and F['savings'] == 'money' and F['overplanning'] == 'slowing' and F['corrections'] == 'me', F)
    check('older answers are unchanged: study, record a call, review money', F['study'] == ev("WF.find(x=>/^Study: start/.test(x[2]))[0]") and F['record a call'] == 'call' and F['review money'] == 'money', F)
    check('finder ids are unique and every entry can be opened', ev("new Set(WF.map(x=>x[0])).size===WF.length&&WF.every(x=>x[2].length>=4&&x[4].length>2&&x[5].length>15&&typeof x[6]==='function')"))
    ev("wfGo('camps'); 0"); pg.wait_for_timeout(500)
    check('opening it shows the Campaigns tab', ev("intelTab") == 'campaigns')
    ev("wfGo('timeline'); 0"); pg.wait_for_timeout(400)
    check('opening the timeline shows one list with its filters', 'chip' in ev("(document.getElementById('modal')||document.body).innerHTML") and ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("try{closeModal()}catch(e){}; 0")
    # --- link kinds
    check('a link between two ideas can now say eight things, the first four unchanged', ev("Object.keys(FN_KIND).join(',')") == 'with,dep,vs,ex,sup,expl,ext,app' and ev("FN_KIND.sup[0]") == 'Supports' and ev("FN_KIND.app[1]") == 'Is applied in')
    ev("try{BC||bcLoad()}catch(e){}; 0"); pg.wait_for_timeout(1500); pg.clock.run_for(2000)
    ev("XC.cards.forEach(c=>bcW('l:'+c.id,{at:1})); window._a=XC.cards.find(c=>pfCands(c.id).length>=2).id; window._C=pfCands(_a); 0")
    a, bb = ev("_a"), ev("_C[1]")
    ev(f"pfLink('{a}'); 0"); pg.wait_for_timeout(300)
    n = ev("document.querySelectorAll('input[name=\"pf-kind\"]').length")
    check('the link form offers all eight and still fits the phone', n == 8 and ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"), n)
    ok = ev(f"""(()=>{{const to=document.querySelector('input[name="pf-to"][value="{bb}"]')||document.querySelector('input[name="pf-to"]'); if(!to) return 'no target'; to.checked=true; document.querySelector('input[name="pf-kind"][value="sup"]').checked=true; const w=document.getElementById('pf-why'); if(w) w.value='the second idea is evidence for the first'; pfLinkSave('{a}'); const t=to.value; const A=pfLinks('{a}').find(x=>x.to===t), B=pfLinks(t).find(x=>x.to==='{a}'); return [A&&A.kind, A&&A.why.slice(0,10), B&&B.kind, B&&B.why.slice(0,15)]}})()""")
    check('saving a supports link records it on both ideas, each from its own side', ok == ['sup', 'Supports: ', 'sup', 'Is supported by'], ok)
    ev("try{closeModal()}catch(e){}; 0")
    for w, h in [(1036, 800), (360, 740)]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(200); ev(f"pfLink('{a}'); 0"); pg.wait_for_timeout(300)
        m = ev("(()=>{const m=document.getElementById('modal'),k=document.getElementById('pf-kinds');return [m.scrollWidth<=m.clientWidth+2,k.scrollWidth<=k.clientWidth+2,k.querySelectorAll('input').length]})()")
        check(f'13.76: the link form also fits at {w} px wide (the laptop showed it did not)', m == [True, True, 8], m)
        ev("try{closeModal()}catch(e){}; 0")
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    A = ev("(()=>{const a=bpAudit();return {total:a.total,lessons:a.lessons,noLesson:a.noLesson,complete:a.complete}})()")
    note = ev("AUD.find(a=>a.k==='P10').rows.find(r=>r.s.startsWith('Part 1')).n")
    check('the Blueprint counts in the ledger follow the new total', all(str(A[k]) in note for k in A), [A, note[:160]])
    check('the vision coverage records this pass', ev("AUD.find(a=>a.k==='P14').rows.filter(r=>/13.75.0/.test(r.s)).length") == 3)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
