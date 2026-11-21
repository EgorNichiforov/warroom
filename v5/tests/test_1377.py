"""War Room 13.78 checks (addendum section 12 and the Communication brief): four more parts on a decision, the MECE drill
(no AI), a ninth conversation situation, and small-word totals in the profile. Sheets measured at 390 and 1036 px.
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
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort()); pg.route('**/functions/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-21T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; try{XC||xcLoad()}catch(e){}; try{BC||bcLoad()}catch(e){}; 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    def both(open_js, name):
        r = []
        for w, h in [(390, 844), (1036, 800)]:
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150); ev(open_js + "; 0"); pg.wait_for_timeout(250); r.append(ev(fits)); ev("try{closeModal()}catch(e){}; 0")
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(150)
        check(name + ' fits at 390 and 1036 px', r == [True, True], r)
    check('version 13.78.0 or later', ev("APP_VERSION.localeCompare('13.78.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- decision record
    ev("S.decisions={}; jlDecEdit(''); 0"); pg.wait_for_timeout(200)
    check('the decision form asks for the objective, the constraints, what is given up and a trigger to revisit', ev("['goal','cons','cost','trigger'].every(k=>!!document.getElementById('jd-'+k))"))
    ev("""(()=>{const s=(k,v)=>{document.getElementById('jd-'+k).value=v}; s('req','Tampa first or Collier first?'); s('options','Tampa\\nCollier'); s('goal','First three paying agencies'); s('cons','One phone number, 100 dials a day'); s('cost','Collier owners wait a month'); s('trigger','Answer rate under 5% for two weeks'); s('title','Tampa first'); jlDecSave('');})(); 0""")
    d = ev("Object.values(S.decisions)[0]")
    check('the four answers are saved on the decision, with the older fields', d and d.get('goal') == 'First three paying agencies' and d.get('cons', '').startswith('One phone') and d.get('cost', '').startswith('Collier') and d.get('trigger', '').startswith('Answer rate') and d.get('title') == 'Tampa first' and d.get('options') == 'Tampa\nCollier', d)
    ev("try{closeModal()}catch(e){}; 0"); both("jlDecEdit('')", 'the decision form')
    # --- MECE drill, no AI
    check('there is no AI key in this browser', not ev("!!spkAI()"))
    ev("S.boot=S.boot||{}; Object.keys(S.boot).filter(k=>k.indexOf('spk:')===0).forEach(k=>delete S.boot[k]); spkSet({lang:'en'}); spmOpen('no'); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('modal').textContent")
    check('the drill states the task and one question, in the chosen language', 'do not overlap' in t and 'leave nothing out' in t and 'Why does an owner say no on a cold call?' in t)
    ev("document.getElementById('spm-p').value='one'; spmCheck('no'); 0")
    check('one part is not accepted', 'Check it' in ev("document.getElementById('modal').textContent"))
    ev("document.getElementById('spm-p').value='no need\\nno trust\\nbad timing'; spmCheck('no'); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('modal').textContent")
    check('it then asks the two MECE questions about his own parts', 'Do any two of them overlap?' in t and 'Is anything left out?' in t and 'no trust' in t)
    ev("spmSave(); 0")
    check('it will not save until both questions are answered', ev("spmAll().length") == 0)
    ev("document.querySelector('input[name=\"spm-o\"][value=\"no\"]').checked=true; document.querySelector('input[name=\"spm-g\"][value=\"yes\"]').checked=true; spmSave(); 0"); pg.wait_for_timeout(200)
    r = ev("spmAll()"); t = ev("document.getElementById('modal').textContent")
    check('the attempt is saved with his parts and his own two answers', len(r) == 1 and r[0]['parts'] == ['no need', 'no trust', 'bad timing'] and r[0]['overlap'] == 'no' and r[0]['gap'] == 'yes' and r[0]['lang'] == 'en', r)
    check('he sees his own verdict and one possible split, and is told nobody graded him', 'a gap' in t and 'One possible split (not the only one)' in t and 'not the one who decides' in t and 'Nobody graded your answer' in t)
    ev("spkSet({lang:'ro'}); spmOpen('day'); 0"); pg.wait_for_timeout(200)
    check('in Romanian the drill is in Romanian, with diacritics', 'Unde se duce o zi de lucru?' in ev("document.getElementById('modal').textContent") and 'Împarte' in ev("document.getElementById('modal').textContent"))
    check('five questions, each with a split of three or four parts in both languages', ev("SPM_T.length===5&&SPM_T.every(x=>x[3].length>=3&&x[3].length===x[4].length&&x[1].length>10&&x[2].length>10)"))
    ev("closeModal(); 0"); both("spmOpen('cost')", 'the MECE drill')
    ev("spkOpen(); 0"); pg.wait_for_timeout(300)
    check('the Communication screen offers the drill', ev("!!document.getElementById('spm-go')"))
    ev("closeModal(); 0")
    # --- ninth situation
    check('nine conversation situations, the new one is Explain an opinion in both languages', ev("SPC_SC.length") == 9 and ev("SPC_SC.find(s=>s[0]==='opinion')[1]") == 'Explică o părere' and ev("SPC_SC.find(s=>s[0]==='opinion')[5].length>20"))
    # --- small words in the profile
    ev("""(()=>{const mk=(lang,text,i)=>{const id='t'+i; bcW('spk:a:'+id,{id,at:now()-i*1000,lang,ex:'a1',dom:'A',st:1,q:'q',text,facts:spkFacts(text,lang)})}; mk('en','So basically I think like the plan is good, you know, basically it works, deci we go.',1); mk('en','I mean the offer is like simple and basically clear.',2); mk('ro','Deci, practic, cred că planul e bun, deci mergem, because it works.',3);})(); 0""")
    f = ev("sppFill('en')"); fr = ev("sppFill('ro')")
    check('English fillers are totalled across attempts with a rate per 100 words', dict(f['fill']).get('basically') == 3 and dict(f['fill']).get('like') == 2 and f['n'] == 2 and f['per100'] is not None and f['per100'] > 0, f)
    check('a Romanian small word inside English text is counted as slipping in, and the reverse', dict(f['cross']).get('deci') == 1 and dict(fr['cross']).get('because') == 1 and dict(fr['fill']).get('deci') == 2, [f['cross'], fr])
    ev("sppOpen(); 0"); pg.wait_for_timeout(300)
    t = ev("(document.getElementById('spp-fill')||{}).textContent||''")
    check('the profile shows the totals, says when attempts are too few, and claims nothing about how he sounds', 'basically ×3' in t and 'too few attempts to call it a habit' in t and 'says nothing about how you sound' in t, t[:200])
    ev("closeModal(); 0"); both("sppOpen()", 'the profile with the small-word totals')
    fd = ev("(()=>{const R=wfFind('mece')||[];return R.length?R[0][0]:null})()")
    check('the finder leads to the drill and its ids stay unique', fd == 'mece' and ev("new Set(WF.map(x=>x[0])).size===WF.length") and ev("WF.find(x=>x[0]==='mece')[5].length>15"), fd)
    check('the ledger records what was checked in the Communication brief', ev("AUD.find(a=>a.k==='P16').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 3 and ev("AUD.find(a=>a.k==='P15').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 4)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
