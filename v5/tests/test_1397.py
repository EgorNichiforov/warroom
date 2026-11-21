"""War Room 15.1 checks: energy and task difficulty. Only with energy logged today does the one mission get a fit line
(hard tasks on good energy, easy ones on low), shown as a suggestion; nothing is reordered or changed; nothing without a log."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 15.1.0 or later', ev("APP_VERSION.localeCompare('15.1.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("(()=>{const k=dk(new Date());[['e1','Write the owner call script'],['e2','Pay the phone bill'],['e3','Reply to Irina email'],['e4','BAC math practice']].forEach(([id,t])=>{S.tasks[id]={id,title:t,due:k,done:false,_u:1}});const o=S.days[k];if(o)delete o.energy;})(); 0")
    tasks0 = ev("JSON.stringify(S.tasks)")
    M0 = ev("(()=>{const M=mcBuild();return {e:M.energy===undefined,top:M.top&&M.top.sid,C:M.C.map(c=>c.sid)}})()")
    check('with no energy logged today there is no energy line at all', M0['e'], M0)
    ev("(()=>{const o=day(new Date());o.energy=[{t:9*60+5,v:5}];})(); 0")
    M1 = ev("(()=>{const M=mcBuild();return {e:M.energy,top:M.top&&M.top.sid,C:M.C.map(c=>c.sid)}})()")
    E = M1['e']
    check('good energy: the hard tasks are suggested', E and E['kind'] == 'hard' and set(t['id'] for t in E['L']) == {'e1', 'e4'}, E)
    check('the line says it is based on your entered energy and can be ignored', E and 'Based on the energy you entered (5/5 at 09:05)' in E['text'] and 'ignore' in E['text'])
    check('the mission order is exactly the same as without energy', M1['top'] == M0['top'] and M1['C'] == M0['C'], [M0, M1['top']])
    ev("(()=>{const o=day(new Date());o.energy=o.energy.concat([{t:9*60+40,v:2}]);})(); 0")
    E2 = ev("mcBuild().energy")
    check('low energy (the latest check-in counts): the easy or admin tasks are suggested', E2['kind'] == 'easy' and set(t['id'] for t in E2['L']) == {'e2', 'e3'}, E2)
    ev("(()=>{const o=day(new Date());o.energy=o.energy.concat([{t:9*60+50,v:3}]);})(); 0")
    check('middle energy suggests no change', ev("mcBuild().energy.kind") == 'ok')
    check('no task was changed', ev("JSON.stringify(S.tasks)") == tasks0)
    check('yesterday’s energy does not count for today', ev("(()=>{const k=dk(new Date());const keep=S.days[k].energy;delete S.days[k].energy;day(addDays(new Date(),-1)).energy=[{t:600,v:5}];const r=mcBuild().energy===undefined;S.days[k].energy=keep;return r})()"))
    ev("(()=>{const o=day(new Date());o.energy=[{t:9*60+5,v:5}];mcOpenCard=true;})(); 0")
    h = ev("mcCard()")
    check('the open mission card shows the energy line under the mission', 'mc-en' in h and 'Based on the energy you entered' in h)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
