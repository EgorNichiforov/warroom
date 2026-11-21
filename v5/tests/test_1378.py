"""War Room 13.80 checks: Watch by teacher (who, kind, format, minutes), Rate the next video, visible doors on the Learn
screen (Communication was reachable only through the finder), an AI settings finder entry, and his three decisions in the
ledger. Sheets measured at 390 and 1036 px. Throwaway browser. Not a real phone."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; try{ccLoad()}catch(e){}; try{xcLoad()}catch(e){}; 0")
    for _ in range(40):
        if ev("typeof XC!=='undefined'&&!!XC&&!!XC.byId&&typeof KPL!=='undefined'&&!!KPL"): break
        pg.wait_for_timeout(250); pg.clock.run_for(250)
    fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    def both(open_js, name):
        r = []
        for w, h in [(390, 844), (1036, 800)]:
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150); ev(open_js + "; 0"); pg.wait_for_timeout(300); r.append(ev(fits)); ev("try{closeModal()}catch(e){}; 0")
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(150)
        check(name + ' fits at 390 and 1036 px', r == [True, True], r)
    check('version 13.80.0 or later', ev("APP_VERSION.localeCompare('13.80.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    T = dict(ev("pkTeachers()"))
    check('teachers come from the library and the lesson videos, Alex Hormozi first, Leila Hormozi apart', ev("pkTeachers()[0][0]") == 'Alex Hormozi' and T.get('Alex Hormozi', 0) > 100 and T.get('Leila Hormozi', 0) >= 5, list(T.items())[:5])
    check('a lesson video with no name of its own takes the teacher of its course (Hormozi mindset clips)', ev("pkPool().filter(x=>x.who==='Alex Hormozi'&&x.cat==='mind').length") >= 20)
    R = ev("(()=>{const r=pkPlan('Alex Hormozi','mind','watch',30);return {n:r.n,used:r.used,mins:r.pick.map(x=>x.min),who:[...new Set(r.pick.map(x=>x.who))],cat:[...new Set(r.pick.map(x=>x.cat))],fmt:[...new Set(r.pick.map(x=>x.fmt))]}})()")
    check('Hormozi · mindset · watch · 30 minutes: fills up to 30 minutes, never over, only that teacher, kind and format', R['n'] > 0 and 0 < R['used'] <= 30 and sum(R['mins']) == R['used'] and R['who'] == ['Alex Hormozi'] and R['cat'] == ['mind'] and R['fmt'] == ['watch'], R)
    R2 = ev("(()=>{const r=pkPlan('Alex Hormozi','biz','any',10);return [r.used<=10,r.pick.every(x=>x.cat==='biz')]})()")
    check('business in 10 minutes stays within 10', R2 == [True, True], R2)
    R3 = ev("(()=>{const r=pkPlan('Alex Hormozi','biz','listen',0.5);return [r.pick.length, !!r.over, r.over?r.over.min:0]})()")
    check('when nothing fits the time, it says so and offers the shortest', R3[0] == 0 and R3[1] and R3[2] >= 1, R3)
    ev("bcW('pk:last',null); pkOpen(); 0"); pg.wait_for_timeout(400)
    t = ev("document.getElementById('modal').textContent")
    check('the picker shows who, what kind, how and how much time', all(w in t for w in ['Who', 'What kind', 'How', 'How much time', 'Alex Hormozi', 'Mindset and motivation', 'Watch or listen', '30 min']))
    gate = ev("!!document.getElementById('pk-gate')")
    if gate: ev("ccGateOver(); pkOpen(); 0"); pg.wait_for_timeout(300)
    check('the library rule still comes first: when it applies, the plan waits until you choose to show it anyway', ev("!!document.getElementById('pk-gate')") is False and ev("!!document.getElementById('pk-plan')") , [gate])
    ev("pkSet('cat','mind'); 0"); pg.wait_for_timeout(200)
    check('changing a choice is remembered', ev("bcV('pk:last',null).cat") == 'mind' and 'mindset' in ev("document.getElementById('pk-plan').textContent").lower() or ev("bcV('pk:last',null).cat") == 'mind')
    check('it warns that the kind is read from the lesson or the title', 'may be filed under the wrong kind' in ev("document.getElementById('modal').textContent"))
    ev("(()=>{const b=document.querySelector('#modal .lx-row');b.click()})(); 0"); pg.wait_for_timeout(300)
    check('tapping an item opens it in the library', 'min' in ev("(document.getElementById('modal')||{}).textContent||''") and not ev("!!document.getElementById('pk-plan')"))
    ev("try{closeModal()}catch(e){}; 0"); both("pkOpen()", 'the picker')
    n0 = ev("mcBuild().C.length"); ev("pkPlan('Alex Hormozi','any','any',60); 0")
    check('picking ranks nothing: Mission Control keeps its own list', ev("mcBuild().C.length") == n0 and ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    # --- rate videos
    k0 = ev("pkRateList().length")
    check('the rating list holds the lesson videos nobody confirmed (111 at the start)', k0 == 111, k0)
    ev("pkRateOpen(); 0"); pg.wait_for_timeout(250); first = ev("document.querySelector('#pk-rate b').textContent")
    ev("document.getElementById('pk-ok').click(); 0"); pg.wait_for_timeout(250)
    check('one tap rates it and the next one appears', ev("pkRateList().length") == k0 - 1 and ev("document.querySelector('#pk-rate b').textContent") != first)
    check('the rating is kept as yours', ev("Object.keys(S.boot).filter(k=>k.indexOf('vq:')===0).length") == 1)
    ev("closeModal(); 0"); both("pkRateOpen()", 'the rating sheet')
    # --- Learn screen doors
    ev("try{wfGo('learn')}catch(e){show('learn')}; 0"); pg.wait_for_timeout(900)
    check('the Learn screen now shows Communication, Watch by teacher and Rate videos', ev("!!document.getElementById('lx-speak')&&!!document.getElementById('lx-pick')&&!!document.getElementById('lx-rate')"))
    ev("document.getElementById('lx-speak').click(); 0"); pg.wait_for_timeout(300)
    check('the Communication button opens Communication', 'Speak' in ev("(document.getElementById('modal')||{}).textContent||''") or 'Communication' in ev("(document.getElementById('modal')||{}).textContent||''"))
    ev("try{closeModal()}catch(e){}; 0")
    F = {q: ev("(q)=>{const R=wfFind(q)||[];return R.length?R[0][0]:null}", q) for q in ['watch hormozi motivational', 'rate videos', 'ai model', 'study', 'record a call']}
    check('the finder: watch hormozi, rate videos and AI model lead to the new places; older answers unchanged', F['watch hormozi motivational'] == 'pick' and F['rate videos'] == 'vidrate' and F['ai model'] == 'aiset' and F['record a call'] == 'call' and F['study'] == ev("WF.find(x=>/^Study: start/.test(x[2]))[0]"), F)
    check('finder ids unique, every entry opens something', ev("new Set(WF.map(x=>x[0])).size===WF.length&&WF.every(x=>x[2].length>=4&&x[4].length>2&&x[5].length>15&&typeof x[6]==='function')"))
    ev("wfGo('aiset'); 0"); pg.wait_for_timeout(300)
    check('AI settings opens with the model field', ev("!!document.getElementById('ai-model')"))
    ev("try{closeModal()}catch(e){}; 0")
    check('the ledger records the three decisions of 21 Nov', ev("AUD.find(a=>a.k==='P01').rows.some(r=>/Life score stays/.test(r.n))") and ev("AUD.find(a=>a.k==='P15').rows.some(r=>/one personal device/.test(r.n))") and ev("AUD.find(a=>a.k==='P15').rows.some(r=>/starts when everything else is finished/.test(r.n))"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
