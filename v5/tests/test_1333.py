"""War Room 13.33 usability checks: one home per activity, findable in two taps from Day; every main screen says what
it is for; one capture; Operator grouped. The twelve journeys are the acceptance tasks of the usability brief.
Throwaway browser at 390x844, cloud blocked. Not a real phone: whether it FEELS clear on yours is untested."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4000)
    ev = pg.evaluate; ev("CP_NOLATE=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    check('version 13.45.0', ev("APP_VERSION==='13.45.0'"), ev("APP_VERSION"))
    check('every destination has plain words, a place, a purpose and an action; ids are unique', ev("WF.length>=30&&new Set(WF.map(x=>x[0])).size===WF.length&&WF.every(x=>WF_DOM[x[1]]&&x[2].length>=4&&x[4].length>2&&x[5].length>15&&typeof x[6]==='function')"))
    check('no internal names in what the user reads', ev("!WF.some(x=>/mcBuild|lxBuild|\\.js|S\\.|localStorage/.test(x[2]+x[4]+x[5]))&&!Object.values(WF_SCREEN).some(s=>/mcBuild|lxBuild|\\.js\\b/.test(s.join(' ')))"))
    ev("arcShow(); if(typeof mcOpenCard!=='undefined'&&!mcOpenCard)mcToggle(); 0"); pg.wait_for_timeout(300)
    check('tap 1 from Day: the mission card carries "Where do I…?"', ev("document.querySelectorAll('#arc .wf-link').length===1"))
    ev("document.querySelector('#arc .wf-link').click(); 0"); pg.wait_for_timeout(300)
    check('the map opens: nine groups, a filter box, no sideways scroll', ev("/Where do I/.test(document.querySelector('#modal h2').textContent)&&document.querySelectorAll('#modal .mc-wl').length===9&&!!$('wf-q')&&document.getElementById('modal').scrollWidth<=390"))
    pg.fill('#wf-q', 'workout'); pg.wait_for_timeout(150)
    check('typing filters to the right place', ev("document.querySelector('#wf-l .wf-r b').textContent==='Record a workout'"))
    ev("closeModal(); 0")
    J = [  # (task, query, expected destination id, state that proves the right home opened)
        ('1 make and record a call', 'record a call', 'call', "view==='dial'&&benchMode!=='caregivers'&&!document.getElementById('arc').classList.contains('on')"),
        ('2 manage an agency follow-up', 'agency follow up', 'follow', "view==='crm'"),
        ('3 record a caregiver candidate', 'caregiver candidate', 'cg', "view==='dial'&&benchMode==='caregivers'"),
        ('4 start a learning session', 'learning session', 'learn', "view==='boot'&&bcS.tab==='now'&&!!document.querySelector('#view-boot .lx-chips')"),
        ('5 find a lesson and practise it', 'lesson practice', 'lesson', "view==='boot'&&bcS.tab==='path'&&!!document.querySelector('#view-boot .bcx-path')"),
        ('6 record a workout', 'workout', 'train', "view==='train'"),
        ('7 food workflow', 'food', 'food', "view==='food'"),
        ('8 understand the financial position', 'money position', 'money', "view==='money'"),
        ('9 find a goal and its next step', 'goal', 'goals', "view==='week'&&weekTab==='goals'"),
        ('10 record an unexpected idea', 'idea', 'idea', "/Log anything/.test(document.getElementById('modal').textContent)&&!!document.getElementById('co-cap')"),
        ('11 review business performance', 'business performance', 'perf', "view==='intel'"),
        ('12 what Mission Control recommends now', 'what should i do', 'now', "document.getElementById('arc').classList.contains('on')&&document.querySelectorAll('#arc .mc').length===1"),
    ]
    for name, q, want, proof in J:
        got = ev("(wfFind(%r)[0]||[])[0]||''" % q)
        ev("closeModal(); wfGo(%r); 0" % want); pg.wait_for_timeout(450); pg.clock.run_for(400)
        ok = ev(proof)
        check(f'journey {name}: found by its plain name and lands in its one home (2 taps from Day)', got == want and ok, [got, ok])
        ev("closeModal(); 0")
    # the record lands in the source of truth (spot checks on the journeys that write)
    ev("closeModal(); Q.items['u1']={id:'u1',agency:'Usability Test Care',status:'new',attempts:0,log:[]}; logCall('u1','No answer',{status:'noanswer'},'',false); 0")
    check('journey 1: a logged outcome is on the agency in the call log, and Mission Control counts it', ev("Q.items.u1.log.length===1&&mcDialEvidence(dk(new Date())).logged>=1"))
    ev("wfGo('idea'); 0"); pg.wait_for_timeout(300); pg.fill('#arc-in', 'what if agencies paid per shift covered'); ev("coCap(''); 0"); pg.wait_for_timeout(200)
    check('journey 10: an idea with no obvious home is kept, word for word, in Unprocessed', ev("coOpenCaps().some(c=>c.raw==='what if agencies paid per shift covered')"))
    # search
    ev("cmdOpen(); 0"); pg.wait_for_timeout(250)
    check('the search (⌘) offers the map and answers "where" questions first', ev("!!document.getElementById('wf-cmd')") and ev("(()=>{const h=bfSearch('study');return /Where<\\/em><b>Study: start a learning session/.test(h)})()"))
    ev("closeModal(); 0")
    # every main screen explains itself, once
    bad = []
    for v in ['dial', 'crm', 'intel', 'book', 'boot', 'money', 'life', 'train', 'trlog', 'food', 'stats', 'week', 'cal', 'me']:
        ev("try{arcHide(true)}catch(e){}; show(%r); 0" % v); pg.wait_for_timeout(350); pg.clock.run_for(200)
        r = ev("(()=>{const s=document.querySelector('#wf-s[data-v=%s]');return {s:!!s&&s.nextElementSibling===document.getElementById('view-%s'),n:document.querySelectorAll('.wf-s').length,w:document.documentElement.scrollWidth,t:s?s.textContent.length:0}})()" % (v, v))
        if not (r['s'] and r['n'] == 1 and r['w'] <= 390 and 15 < r['t'] < 130): bad.append((v, r))
    check('14 main screens open with one line saying what they are for; no overflow', not bad, bad)
    ev("show('dial'); 0"); pg.wait_for_timeout(300); ev("document.querySelector('#wf-s .wf-i').click(); 0"); pg.wait_for_timeout(200)
    check('the ? opens purpose · use this when · do this · records · next', ev("['Purpose','Use this when','Do this','Records','Next'].every(k=>[...document.querySelectorAll('#modal .st-o em')].some(e=>e.textContent===k))"))
    ev("closeModal(); document.querySelector('#wf-s .wf-x').click(); render(); show('crm'); show('dial'); 0"); pg.wait_for_timeout(300)
    check('dismissed once, the line does not come back on that screen (and stays on others)', ev("!document.getElementById('wf-s')") and ev("(()=>{show('crm');return true})()") and (pg.wait_for_timeout(250) or ev("!!document.querySelector('#wf-s[data-v=crm]')")))
    # Operator
    ev("lifeTab='op'; show('life'); 0"); pg.wait_for_timeout(400)
    O = ev("(()=>{const v=document.getElementById('view-life');return {heads:[...v.querySelectorAll('.wf-og b')].map(b=>b.textContent),folded:[...v.querySelectorAll('.wf-od summary b')].map(b=>b.textContent),tiles:v.querySelectorAll('.op-t').length,open:[...v.querySelectorAll('.op-t')].filter(t=>!t.closest('details:not([open])')).length,labels:new Set([...v.querySelectorAll('.op-t b')].map(b=>b.textContent)).size}})()")
    check('Operator: tools grouped under four plain headings, two groups folded, nothing lost or duplicated', O['heads'] == ['Direction', 'Business', 'Learning', 'Review and decide'] and O['folded'][:2] == ['Protect', 'System'] and O['tiles'] >= 28 and O['labels'] == O['tiles'] and O['open'] <= 22, O)
    check('a folded tool still works', ev("(()=>{coAuto();return /What runs by itself/.test(document.querySelector('#modal h2').textContent)})()"))
    ev("closeModal(); 0")
    # one capture
    ev("openCapture(); 0"); pg.wait_for_timeout(250)
    check('one capture: the top-right + opens the same sheet as the bottom +', ev("/Log anything/.test(document.getElementById('modal').textContent)&&!!document.getElementById('co-cap')&&!document.getElementById('cap-in')"))
    ev("closeModal(); 0")
    M = """(()=>{let n=0;const mo=new MutationObserver(m=>{m.forEach(x=>{n+=x.addedNodes.length})});mo.observe(document.getElementById('view-money'),{childList:true,subtree:true});for(let i=0;i<5;i++)render();const out=mo.takeRecords().reduce((a,x)=>a+x.addedNodes.length,n);mo.disconnect();return out})()"""
    ev("show('money'); render(); 0"); pg.wait_for_timeout(300); withLine = ev(M); has = ev("!!document.querySelector('#wf-s[data-v=money]')")
    ev("WF_OFF=1; render(); 0"); pg.wait_for_timeout(100); without = ev(M); ev("WF_OFF=0; render(); 0")
    check('the purpose line costs the stable renderer nothing (same rebuild count with and without it)', has and withLine <= without + 3, [withLine, without])
    check('still one global recommender; the finder ranks nothing', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&typeof wfFind('zzzz').length==='number'&&wfFind('zzzz').length===0})()"))
    check('no page errors', not errs, errs[:3])
    b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
