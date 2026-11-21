"""War Room 14.4 checks: six more Blueprint competencies that had no lesson now have their own, researched, with a teacher's video
honestly marked title-checked, inside the Bootcamp, and the Blueprint counts them as own lessons. Throwaway browser. Not a real phone."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
P = {'bp-friend': 'bp-l-friend', 'bp-relate': 'bp-l-relate', 'bp-etiq': 'bp-l-etiq', 'bp-cook': 'bp-l-cook', 'bp-home': 'bp-l-home', 'bp-travel': 'bp-l-travel'}
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-21T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; try{xcLoad()}catch(e){}; 0")
    for _ in range(60):
        if ev("typeof XC!=='undefined'&&!!XC&&!!XC.byId&&typeof BC!=='undefined'&&!!BC"): break
        pg.wait_for_timeout(250); pg.clock.run_for(250)
    check('version 14.4.0 or later', ev("APP_VERSION.localeCompare('14.4.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    r = ev(f"Object.entries({P}).map(([b,c])=>{{const x=bpGet(b),h=bpHas(x);return [b,h.lessons>0&&!h.kwOnly&&h.C.some(k=>k.id===c),!!XC.byId[c]]}})")
    check('each of the six competencies counts its own lesson, not a keyword match', all(x[1] and x[2] for x in r), r)
    bad = ev(f"{list(P.values())}.filter(id=>{{const c=XC.byId[id];return !(c.src&&/Own-words summary/.test(c.src)&&c.kind&&c.clipV==='title'&&/could not watch/.test(c.clipNote)&&c.q.length>=2&&c.move.length>40)}})")
    check('each names its source, says it is own words, has a title-checked video, two questions and a real exercise', bad == [], bad)
    inb = ev(f"{list(P.values())}.filter(id=>!BC.modules.some(m=>m.cards.includes(id)))")
    check('all six are in a Bootcamp module', inb == [], inb)
    A = ev("(()=>{const a=bpAudit();return {lessons:a.lessons,none:a.noLesson,kw:a.kwOnly,total:a.total}})()")
    check('the Blueprint audit still adds up and shows fewer gaps', A['lessons'] + A['none'] + A['kw'] == A['total'] and A['none'] <= 6, A)
    for c in P.values():
        ev(f"xcOpen('{c}'); 0"); pg.wait_for_timeout(150)
    check('each lesson opens; the last one fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2") and '58HdRSTAFec' in ev("document.getElementById('modal').innerHTML"))
    rel = ev("XC.byId['bp-l-relate'].plain")
    check('the relationships lesson says a no is a full answer and consent can be withdrawn', 'without pushing' in rel and 'withdrawn' in rel)
    vt = ev(f"{list(P.values())}.map(id=>{{const v=XC.byId[id].vis;return v.type==='flow'?Array.isArray(v.steps):v.type==='ladder'?Array.isArray(v.rungs):v.type==='vs'?(v.a.length>1&&v.b.length>1):false}})")
    check('every picture has the fields its type needs', all(vt), vt)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
