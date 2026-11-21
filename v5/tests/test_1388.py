"""War Room 14.2 checks: fewer taps from a thought to a task. The Add sheet suggests a due date, a goal and a project
only from your own words; nothing is applied until you tap it; existing records do not change. Taps are counted."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort()); pg.route('**api.todoist.com**', lambda r: r.abort())
    pg.clock.install(time='2026-11-21T10:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 14.2.0 or later', ev("APP_VERSION.localeCompare('14.2.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("S.goals.tg1={id:'tg1',title:'Book 20 owner conversations with agencies',_u:Date.now()}; S.goals.tg2={id:'tg2',title:'Pass the BAC exam in math',_u:Date.now()}; 0")
    goals_before = ev("JSON.stringify(S.goals)"); tasks_before = ev("JSON.stringify(S.tasks)")
    check('a day word gives a date, and none without one', ev("capDue('call Maria tomorrow')[0]") == '2026-11-22' and ev("capDue('call Maria')") is None and ev("capDue('sun luni')[0]") == '2026-11-22')
    check('Romanian day words work too', ev("capDue('sună-l mâine')[0]") == '2026-11-22' and ev("capDue('vineri raport')[0]") == '2026-11-27')
    check('a goal is suggested only when the words match it', 'tg1' in ev("capGoals('prepare owner conversations script').map(x=>x.g.id)") and 'tg2' not in ev("capGoals('prepare owner conversations script').map(x=>x.g.id)") and ev("capGoals('buy a lamp')") == [])
    ev("tdProjects={p1:{name:'Company'},p0:{name:'Inbox',inbox:true}}; 0")
    check('a project is suggested only when you wrote its name', ev("(capProj('fix the Company site')||[])[0]") == 'p1' and ev("capProj('fix the site')") is None)
    # BEFORE: + , Task, then find the task in the list (2 taps), Tomorrow, Save = 6 taps for a date; a goal was not possible
    # AFTER: open Add, tap the date, tap the goal, Task = 4 taps, and the goal is linked too
    taps = 0
    ev("openCapture(); 0"); taps += 1; pg.wait_for_timeout(150)
    pg.fill('#arc-in', 'Write the owner conversations opener tomorrow'); pg.wait_for_timeout(150)
    chips = ev("[...document.querySelectorAll('#cap-sug [data-cap]')].map(c=>c.dataset.cap)")
    check('typing shows a date chip and a goal chip', 'due' in chips and 'goal' in chips, chips)
    check('nothing is applied before a tap', ev("JSON.stringify(CAPSEL)") == '{}')
    pg.click('#cap-sug [data-cap=due]'); taps += 1
    pg.click("#cap-sug [data-cap=goal][onclick*='tg1']"); taps += 1
    check('a tapped chip shows as chosen, and tapping again undoes it', ev("document.querySelectorAll('#cap-sug .chip.on').length") == 2 and (ev("capPick('due',CAPSEL.due),!CAPSEL.due") and True))
    pg.click('#cap-sug [data-cap=due]'); taps += 1  # re-choose after the undo above (counted honestly)
    ev("tdOn=()=>false; 0")
    pg.click("#co-ck button[data-k=task]"); taps += 1; pg.wait_for_timeout(200)
    T = ev("Object.values(S.tasks).filter(t=>/opener/.test(t.title)).map(t=>[t.due,t.goal])")
    check('the task is saved with the date and the goal in one go', T == [['2026-11-22', 'tg1']], T)
    check('taps counted: 4 for date and goal (5 here with the undo test) vs 6 before for a date alone, with no goal possible', taps == 5, taps)
    check('the goal shows the task as connected', ev("enGet('task:'+Object.values(S.tasks).find(t=>/opener/.test(t.title)).id).rel.includes('goal:tg1')"))
    check('no goal changed', ev("JSON.stringify(S.goals)") == goals_before)
    check('no existing task changed', all(ev(f"JSON.stringify(S.tasks[{repr(k)}])") == v for k, v in __import__('json').loads(tasks_before).items() for v in [__import__('json').dumps(v, separators=(',', ':'))]) if False else ev("(()=>{const B=" + tasks_before + ";return Object.keys(B).every(k=>JSON.stringify(S.tasks[k])===JSON.stringify(B[k]))})()"))
    tid = ev("Object.values(S.tasks).find(t=>/opener/.test(t.title)).id")
    ev(f"editTask('{tid}'); 0"); pg.wait_for_timeout(150)
    check('Edit task now has Goal it serves, set to the linked goal', ev("document.getElementById('m-goal')&&document.getElementById('m-goal').value") == 'tg1')
    ev("document.getElementById('m-goal').value=''; 0"); ev(f"saveTask('{tid}'); 0")
    check('choosing None there removes the link', ev(f"S.tasks['{tid}'].goal===undefined"))
    ev("openCapture(); 0"); pg.wait_for_timeout(150); pg.fill('#arc-in', 'buy a lamp'); pg.wait_for_timeout(100)
    check('text that matches nothing shows no chips', ev("document.getElementById('cap-sug').innerHTML") == '')
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
