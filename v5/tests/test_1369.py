"""War Room 13.69 checks (unified prompt, Parts 3 and 4): a goal keeps what it needs from you, and the finder sends the
nine questions and twelve tasks of Part 4, asked in the user's own words, to the right screen. Throwaway browser. Not a real phone."""
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
    check('version 13.69.0 or later', ev("APP_VERSION.localeCompare('13.69.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- goal: what it needs
    gid = ev("Object.values(S.goals).find(g=>g&&!g._del&&!g.done).id")
    before = ev(f"JSON.stringify((({{title,target,deadline}})=>({{title,target,deadline}}))(S.goals['{gid}']))")
    ev(f"gcEdit('{gid}'); 0"); pg.wait_for_timeout(150)
    check('the goal form asks what the goal needs from you: skills and resources', ev("!!document.getElementById('gc-n')") and 'skills and resources' in ev("document.getElementById('modal').textContent"))
    check('the goal form still fits the phone with one bottom bar', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2&&document.querySelectorAll('#modal .actions').length===1"))
    ev(f"document.getElementById('gc-n').value='Opening a cold call well; two hours a day; a call list'; gcSave('{gid}'); 0"); pg.wait_for_timeout(150)
    check('it is saved on that one goal', ev(f"S.goals['{gid}'].need") == 'Opening a cold call well; two hours a day; a call list')
    check('title, target and date of the goal are untouched', ev(f"JSON.stringify((({{title,target,deadline}})=>({{title,target,deadline}}))(S.goals['{gid}']))") == before)
    ev("try{closeModal()}catch(e){}; 0")
    # --- finder: the nine questions and twelve tasks
    Q = [('record a call', 'call'), ('manage an agency', 'agency'), ('study', 'learn'), ('next learning session', 'learn'), ('record training', 'train'), ('review money', 'money'), ('manage my goals', None), ('see performance', None), ('record an important insight', None),
         ('agency follow-up', 'agency'), ('record a caregiver candidate', None), ('find a lesson', None), ('record a workout', 'train'), ('food nutrition', None), ('financial position', 'money'), ('goal next milestone', 'goals'), ('record an idea', None), ('business performance', 'perf'), ('what to do now', None)]
    first = {q: ev("(q)=>{const R=wfFind(q)||[];return R.length?[R[0][0],R[0][2]]:null}", q) for q, _ in Q}
    check('every one of the nine questions and twelve tasks gets an answer', all(first[q] for q, _ in Q), [q for q, _ in Q if not first[q]])
    check('record training goes to the workout screen, not the call screen', first['record training'][0] == 'train', first['record training'])
    check('review money goes to the money screen, not business performance', first['review money'][0] == 'money', first['review money'])
    check('record a call, record a workout, financial position, goal next milestone and business performance go where expected', first['record a call'][0] == 'call' and first['record a workout'][0] == 'train' and first['financial position'][0] == 'money' and first['goal next milestone'][0] == 'goals' and first['business performance'][0] == 'perf', {k: first[k] for k in ['record a call', 'record a workout', 'financial position', 'goal next milestone', 'business performance']})
    T = {q: (first[q][1] if first[q] else '') for q, _ in Q}
    check('the other answers name the right activity', 'agency' in T['manage an agency'].lower() and 'learning session' in T['study'].lower() and 'goals' in T['manage my goals'].lower() and 'performance' in T['see performance'].lower() and 'insight' in T['record an important insight'].lower() and 'caregiver' in T['record a caregiver candidate'].lower() and 'lesson' in T['find a lesson'].lower() and 'food' in T['food nutrition'].lower() and 'idea' in T['record an idea'].lower() and 'right now' in T['what to do now'].lower(), T)
    check('every finder answer says where it is and can be opened', ev("WF.every(x=>x[4].length>2&&typeof x[6]==='function')"))
    check('the ledger records the line-by-line findings for the unified prompt', ev("AUD.find(a=>a.k==='P13').rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 3)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
