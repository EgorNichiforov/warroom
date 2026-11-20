"""War Room 13.73 checks (tenth and eleventh prompts): the main search also answers with capabilities, competences and
lessons, in the user's own words; it stays a search and ranks nothing for the day. The Blueprint and market counts in the
ledger are compared with the data. Throwaway browser. Not a real phone."""
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
    check('version 13.73.0 or later', ev("APP_VERSION.localeCompare('13.73.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    for _ in range(40):
        if ev("typeof XC!=='undefined'&&XC&&XC.cards&&XC.cards.length>0"): break
        pg.wait_for_timeout(250)
    rows = lambda q: re.findall(r'<em>([^<]{1,24})</em><b>([^<]{1,70})', ev("(q)=>bfSearch(q)", q))
    R = {q: rows(q) for q in ['negotiation', 'cooking', 'contracts', 'humour', 'humor', 'taxes', 'study', 'zzqqxx']}
    check('negotiation, cooking, contracts and taxes are found (they returned nothing before)', any('Negotiation' in t for _, t in R['negotiation']) and any('Cooking' in t for _, t in R['cooking']) and any('Contracts' in t for _, t in R['contracts']) and any('Taxes' in t for _, t in R['taxes']), {k: R[k] for k in ['negotiation', 'cooking', 'contracts', 'taxes']})
    check('each result says what kind of thing it is', all(k in ('Capability', 'Competence', 'Lesson', 'Where', 'Playbook', 'Goal', 'Go') for k, _ in R['negotiation'] + R['cooking'] + R['contracts']), R['negotiation'] + R['cooking'])
    check('humor (US spelling) finds the same as humour, including the lesson', any('humour' in t.lower() for _, t in R['humor']) and any(k == 'Lesson' for k, _ in R['humor']) and any('humour' in t.lower() for _, t in R['humour']), [R['humor'], R['humour']])
    check('the same title is not listed twice (a capability and its competence)', all(len([t for _, t in R[q]]) == len(set(t for _, t in R[q])) for q in R), R['negotiation'])
    check('places still come first: study answers with the learning session', R['study'] and R['study'][0] == ('Where', 'Study: start a learning session'), R['study'][:2])
    check('a word that matches nothing still says so', 'No match' in ev("bfSearch('zzqqxx')") and not R['zzqqxx'])
    check('at most three records and three lessons are added', ev("(bfLearnRows('the').match(/bf-l/g)||[]).length") <= 6)
    n0 = ev("mcBuild().C.length"); ev("bfSearch('negotiation'); 0")
    check('searching adds nothing to Mission Control', ev("mcBuild().C.length") == n0)
    ev("(()=>{const d=document.createElement('div');d.id='t-s';d.innerHTML=bfSearch('negotiation');document.body.appendChild(d);const b=[...d.querySelectorAll('.bf-l')].find(x=>/Negotiation/.test(x.textContent));b.click();})(); 0"); pg.wait_for_timeout(300)
    check('tapping a result opens that record', 'Negotiation' in ev("(document.getElementById('modal')||{}).textContent||''"), ev("(document.getElementById('modal')||{}).textContent||''")[:120])
    ev("try{closeModal()}catch(e){}; const d=document.getElementById('t-s'); if(d) d.remove(); 0")
    A = ev("(()=>{const a=bpAudit();return {total:a.total,lessons:a.lessons,noLesson:a.noLesson,kwOnly:a.kwOnly,exercise:a.exercise,assess:a.assess,complete:a.complete}})()")
    note = ev("AUD.find(a=>a.k==='P10').rows.find(r=>r.s.startsWith('Part 1')).n")
    check('the Blueprint counts in the ledger are the Blueprint\'s own', all(str(A[k]) in note for k in ['total', 'lessons', 'noLesson', 'kwOnly', 'exercise', 'assess', 'complete']), [A, note[:200]])
    check('the ledger now carries the counts for the operating system and the three books', ev("AUD.find(a=>a.k==='P07').rows.some(r=>/31 operating steps/.test(r.n))") and ev("AUD.find(a=>a.k==='P08').rows.some(r=>/430 pages/.test(r.n))"))
    ev("try{wfGo('learn')}catch(e){show('learn')}; 0"); pg.wait_for_timeout(900)
    t = ev("document.body.innerText")
    check('the Learn screen shows what is next, the time choice, paths, reviews, practice, missions and real capability', all(w in t for w in ['How much time do you have?', 'Reviews due', 'To practise', 'To use in real life']) and ('YOUR PATHS' in t.upper()) and ('WHAT YOU CAN ACTUALLY DO' in t.upper()))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
