"""War Room 13.68 checks: the BAC error notebook keeps all eight fields of the first prompt, the after-action review asks
what was learned, and a review whose change was tested and kept can become a Field Manual procedure (personal experiment).
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
    pg.clock.install(time='2026-11-20T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    check('version 13.68.0 or later', ev("APP_VERSION.localeCompare('13.68.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- error notebook
    ev("S.lifeErrors={}; lfErrModal(); 0"); pg.wait_for_timeout(150)
    ids = ev("['le-s','le-t','le-q','le-w','le-f','le-y','le-m','le-r'].filter(i=>!document.getElementById(i))")
    check('the error card form has the question, my answer, the correct answer, why, the misunderstanding, the reasoning, and the topic', ids == [], ids)
    check('the longer form still fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("""(()=>{const s=(i,v)=>{document.getElementById(i).value=v}; s('le-t','Unirea din 1918'); s('le-q','In what order did the three provinces unite?'); s('le-w','Bucovina first'); s('le-f','Basarabia, Bucovina, Transilvania'); s('le-y','Mixed up two dates'); s('le-m','I thought the order followed the map from north to south'); s('le-r','27 March, 28 November, 1 December 1918'); lfErrSave();})(); 0""")
    e = ev("Object.values(S.lifeErrors)[0]")
    check('all of them are saved, with the first review tomorrow', e and e['q'].startswith('In what order') and e['what'] == 'Bucovina first' and e['why'] == 'Mixed up two dates' and e['mis'].startswith('I thought') and e['rsn'].startswith('27 March') and e['due'] == '2026-11-21' and e['topic'] == 'Unirea din 1918', e)
    ev("lfErrModal(); document.getElementById('le-w').value='short'; document.getElementById('le-f').value='fix'; lfErrSave(); 0")
    check('a quick card with only the mistake and the fix still saves (the new fields are optional)', ev("Object.values(S.lifeErrors).filter(x=>x.what==='short'&&x.fix==='fix'&&x.q===''&&x.rsn==='').length") == 1)
    ev("Object.values(S.lifeErrors).forEach(x=>{ if(x.what==='short') x._del=true; })"); pg.clock.set_fixed_time('2026-11-21T17:00:00+02:00'); ev("lfReview(); 0"); pg.wait_for_timeout(150)
    t = ev("document.getElementById('modal').textContent")
    check('at review the question is shown first and the answer stays hidden until opened', 'In what order did the three provinces unite?' in t and ev("!document.querySelector('#modal details.lf-ans').open"))
    check('opening it shows the fix, the reasoning, the misunderstanding, why, and the date of the next review', all(w in t for w in ['Basarabia, Bucovina, Transilvania', 'Reasoning:', '27 March', 'The misunderstanding:', 'Why I was wrong:', 'Next review if right today: 2026-11-24']), t[-260:])
    ev("closeModal(); 0")
    # --- after-action review
    ev("bcW('aar', []); S.manual = S.manual || {}; cpAar(); 0"); pg.wait_for_timeout(200)
    check('the review form asks: What did I learn?', ev("!!document.getElementById('cp-a7')") and 'What did I learn?' in ev("document.getElementById('cp-a7').placeholder||document.getElementById('modal').textContent"))
    ev("""(()=>{const s=(i,v)=>{document.getElementById(i).value=v}; s('cp-a2','Book a discovery call'); s('cp-a1','Owner said send an email and hung up'); s('cp-a5','Pitched in the first ten seconds'); s('cp-a6','She picked up and listened to the opener'); s('cp-a3','I talked about us before asking about her'); s('cp-a7','A question earns the next ten seconds; a pitch does not'); s('cp-a4','Open with the caregiver question before saying what we do'); cpAarSave();})(); 0"""); pg.wait_for_timeout(200)
    a = ev("bcV('aar',[])")
    check('the answer is saved with the review', len(a) == 1 and a[0].get('lrn', '').startswith('A question earns') and a[0]['chg'].startswith('Open with'), a)
    ev("try{closeModal()}catch(e){}; 0")
    h = ev("cpAarList()")
    check('the list shows what was learned, and does not offer a procedure before the change is tested', 'Learned: A question earns' in h and 'Make it a procedure' not in h)
    ev("cpAarEval(0,'keep'); 0"); h = ev("cpAarList()")
    check('once the change was tested and kept, it offers: Make it a procedure', 'Make it a procedure' in h and 'fmFromAar(0)' in h)
    n0 = ev("Object.values(S.manual).filter(x=>x&&!x._del).length")
    ev("fmFromAar(0); 0"); pg.wait_for_timeout(200)
    f = ev("({q:(document.getElementById('fm-q2')||{}).value, steps:(document.getElementById('fm-steps')||{}).value, src:(document.getElementById('fm-src')||{}).value, mist:(document.getElementById('fm-mist')||{}).value, sit:(document.getElementById('fm-sit')||{}).value})")
    check('the procedure form opens filled from the review, as a personal experiment (not a verified rule)', f['q'] == 'personal' and f['steps'].startswith('Open with the caregiver question') and 'tested and kept' in f['src'] and 'A question earns' in f['src'] and f['mist'].startswith('I talked about us') and f['sit'] == 'Book a discovery call', f)
    check('nothing is saved until you name it and press save', ev("Object.values(S.manual).filter(x=>x&&!x._del).length") == n0)
    ev("document.getElementById('fm-n').value='Open a cold call with a question'; fmSave(''); 0"); pg.wait_for_timeout(200)
    m = ev("Object.values(S.manual).find(x=>x&&x.n==='Open a cold call with a question')")
    check('saved to the Field Manual with its source and status', m and m['q'] == 'personal' and m['steps'].startswith('Open with') and 'My own review of' in m['src'], m)
    ev("try{closeModal()}catch(e){}; 0")
    # --- ledger
    check('the ledger records the line-by-line findings for the whole first prompt', ev("AUD[0].rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 11 and ev("AUD[0].rows.find(r=>r.s.startsWith('14 ')).st") == 'E', ev("AUD[0].rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
