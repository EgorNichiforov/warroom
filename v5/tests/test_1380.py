"""War Room 13.90 checks: Lost Chapters Sections A and C are read and turned into six lessons and six knowledge-to-execution
principles; each lesson has its parts, a video to watch, and an honest source line; the library record says what is still unread.
Throwaway browser. Not a real phone."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
NEW = ['lc-freefail', 'lc-premium', 'lc-grid', 'lc-nosale', 'lc-stick', 'lc-lock']
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-21T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; window.__ok=0; ccLoad(()=>{window.__ok=1}); try{xcLoad()}catch(e){}; 0")
    for _ in range(60):
        if ev("window.__ok&&typeof XC!=='undefined'&&!!XC&&!!XC.byId"): break
        pg.wait_for_timeout(250); pg.clock.run_for(250)
    check('version 13.90.0 or later', ev("APP_VERSION.localeCompare('13.90.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    miss = ev(f"{NEW}.filter(id=>!XC.byId[id])")
    check('the six new lessons exist', miss == [], miss)
    part = ev(f"{NEW}.filter(id=>{{const c=XC.byId[id];return !(c&&c.hook&&c.plain&&c.ex&&c.move&&c.trap&&c.memo&&c.q&&c.q.length>=2&&c.vis)}})")
    check('each has hook, explanation, example, move, trap, summary, two recall questions and a picture', part == [], part)
    vid = ev(f"{NEW}.filter(id=>{{const c=XC.byId[id];return !(c.clip&&c.clip.length&&c.clip[0][0]&&c.clipV==='title'&&/could not watch/.test(c.clipNote))}})")
    check('each has a video of the teacher, honestly marked as title-checked only', vid == [], vid)
    src = ev(f"{NEW}.filter(id=>!/Lost Chapters, Section [AC]/.test(XC.byId[id].src)||!/no text copied/.test(XC.byId[id].src))")
    check('each names the book section and says no text was copied', src == [], src)
    lk = ev("(()=>{const h=ccAll().find(x=>x.id==='hz-lost');return {c:h.cards,n:h.note}})()")
    check('the book record links all eleven lessons', all(c in lk['c'] for c in NEW) and len(lk['c']) == 11, lk['c'])
    check('the book record says A and C are read and B is still only in part', 'read in full on 21 Nov 2026' in lk['n'] and 'NOT read: the rest of Section B' in lk['n'], lk['n'][:300])
    ch = ev("ccAll().filter(x=>/^lc-(0[3-6]|1[4-9]|2[0-3])$/.test(x.id)&&!/^lc-(17|18|19)$/.test(x.id)&&!(x.cards||[]).length).map(x=>x.id)")
    check('the chapter entries of A and C point at the lessons made from them', ch == [], ch)
    kx = ev("KX.filter(r=>/kx-(freefail|premium|grid|nosale|stick|lock)/.test(r[0])).map(r=>[r[0],r[4],osStep(r[8])?1:0,r[9].every(c=>XC.byId[c])?1:0])")
    check('six new principles, each tied to a real step and a real lesson', len(kx) == 6 and all(r[2] and r[3] for r in kx), kx)
    check('the offer stays locked: no principle changes it before the review', all('8 Dec' in ev(f"KX.find(r=>r[0]==='{i}')[5]") for i in ['kx-premium', 'kx-stick', 'kx-lock']))
    ev("kxOpen(); 0"); pg.wait_for_timeout(250); t = ev("document.getElementById('modal').textContent")
    check('the knowledge screen lists 21 principles', '21 principles' in t, t[:200])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal&&closeModal(); xcOpen('lc-nosale'); 0"); pg.wait_for_timeout(300); t2 = ev("document.getElementById('modal').textContent")
    check('a new lesson opens and reads', 'No prospect left behind' in t2 and 'Hiring Snapshot' in t2, t2[:200])
    check('and fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    pg.set_viewport_size({'width': 1036, 'height': 800}); pg.wait_for_timeout(200)
    check('and the laptop', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
