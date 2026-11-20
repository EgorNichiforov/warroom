"""War Room 13.72 checks (content-intelligence prompt): the video verification screen counts every lesson once, says how
many videos are on the topic but not by the named teacher, and can be reached through the finder. The counts in the
ledger are compared with the data. Throwaway browser. Not a real phone."""
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
    check('version 13.72.0 or later', ev("APP_VERSION.localeCompare('13.72.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    for _ in range(40):
        if ev("typeof XC!=='undefined'&&XC&&XC.cards&&XC.cards.length>0"): break
        pg.wait_for_timeout(250)
    c = ev("(()=>{const C=XC.cards,has=c=>(c.clip||[]).length>0;return {n:C.length,has:C.filter(has).length,content:C.filter(c=>has(c)&&c.clipV==='content').length,title:C.filter(c=>has(c)&&c.clipV==='title').length,link:C.filter(c=>has(c)&&(c.clipV||'link')==='link').length,topic:C.filter(c=>has(c)&&c.clipKind==='topic').length}})()")
    check('every lesson has a video and each is counted once as inspected, title-matched or link only', c['has'] == c['n'] and c['content'] + c['title'] + c['link'] == c['n'], c)
    check('the ledger states the same counts as the data', ev("AUD.find(a=>a.k==='P05').rows.find(r=>r.s.startsWith('2 ')).n").count(str(c['content'])) >= 1 and all(str(c[k]) in ev("AUD.find(a=>a.k==='P05').rows.find(r=>r.s.startsWith('2 ')).n") for k in ['n', 'content', 'title', 'link', 'topic']), c)
    ev("rsVidAudit(); 0"); pg.wait_for_timeout(200)
    t = ev("document.getElementById('modal').textContent")
    check('the screen keeps its four claims apart and says a working link is not a reviewed video', 'A working link is not a reviewed video' in t and 'Title matches, content not inspected' in t and 'Exists only: fit not confirmed' in t)
    row = ev("[...document.querySelectorAll('#modal .cc-q > div')].map(d=>[d.querySelector('span').textContent,d.querySelector('em').textContent]).find(r=>/not the named teacher/.test(r[0]))")
    check('it now also counts videos that are on the topic but not by the named teacher', row and int(row[1]) == c['topic'], row)
    check('the screen fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); 0")
    f = ev("(()=>{const R=wfFind('which videos were verified')||[];return R.length?R[0][0]:null})()")
    check('the finder leads to it', f == 'vidcheck' and ev("WF.find(x=>x[0]==='vidcheck')[5].length>15"), f)
    check('finder ids are unique and the word study still answers with the learning session', ev("new Set(WF.map(x=>x[0])).size===WF.length") and ev("(wfFind('study')||[])[0][0]") == ev("WF.find(x=>/^Study: start/.test(x[2]))[0]"))
    check('the fourteen sections of the content library are the ones the prompt names', ev("CC_SEC.length") == 14 and ev("CC_SEC.map(x=>x[1]).join('|')").startswith('Recommended|Watch next|Listen next|Video library|Audio library|Reading library|Courses|Mentors|New discoveries|Saved|Currently learning|Completed'))
    check('the nine durations are the ones the prompt names', ev("LX_MIN.join(',')") == '5,10,15,20,30,45,60,90,120')
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
