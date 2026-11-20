"""War Room 13.65 checks: the reality check on the Red Team screen (speaks only on evidence, ranks nothing), what the three
day modes mean in practice (from the Playbook) with the user's own restart condition, and the eight capabilities the first
prompt lists that had no home in the map. Throwaway browser. Not a real phone."""
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
    pg.clock.install(time='2026-11-21T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    check('version 13.65.0 or later', ev("APP_VERSION.localeCompare('13.65.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # --- reality check
    ev("""(()=>{ensureIntel(); ['decisions','campaigns','risks','experiments'].forEach(k=>{S[k]=S[k]||{};Object.keys(S[k]).forEach(i=>delete S[k][i])}); for(let i=0;i<14;i++){const o=S.days[dk(addDays(new Date(),-i))]; if(o){o.mcSkip=[]; o.counters=o.counters||{}; o.counters.dials=0; o.targets={dials:0};}} for(let i=0;i<7;i++){const o=day(addDays(new Date(),-i)); o.targets={dials:0}; o.counters=o.counters||{}; o.counters.dials=0;} })(); 0""")
    check('with nothing in the records it says nothing', ev("rtReality()") is None)
    n0 = ev("mcBuild().C.length")
    ev("""(()=>{for(let i=0;i<5;i++){const id='d'+uid()+i; S.decisions[id]={id,_u:now(),title:'Plan '+i};} for(let i=0;i<7;i++){const o=day(addDays(new Date(),-i)); o.targets={dials:i?0:50}; o.counters=o.counters||{}; o.counters.dials=0; touch(o);} })(); 0""")
    r = ev("rtReality()")
    check('five plans written and 0 of 50 planned dials recorded: it says stop refining, with the numbers', r and r['t'] == 'Stop refining the system. Do the actual task now.' and r['plan'] == 5 and r['target'] == 50 and r['made'] == 0 and '5 plans' in r['ev'][0] and '0 of 50' in r['ev'][0], r)
    ev("rtOpen(); 0"); pg.wait_for_timeout(150)
    check('the Red Team screen shows it, with the evidence and the reminder that it reads records only', ev("!!document.getElementById('rt-real')") and 'reads your records only' in ev("document.getElementById('rt-real').textContent") and ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('it adds no candidate to Mission Control', ev("mcBuild().C.length") == n0, [n0, ev("mcBuild().C.length")])
    ev("(()=>{const o=day(new Date()); o.counters=o.counters||{}; o.counters.dials=20; touch(o);})(); 0")
    check('once a quarter of the planned dials are recorded it goes quiet (no nagging)', ev("rtReality()") is None, ev("rtReality()"))
    ev("rtOpen(); 0"); pg.wait_for_timeout(120)
    check('and it disappears from the screen', not ev("!!document.getElementById('rt-real')"))
    ev("(()=>{for(let i=1;i<=3;i++){const o=day(addDays(new Date(),-i)); o.mcSkip=[{s:'dials',t:'Dial block',miss:1,done:0,at:now()}];}})(); 0")
    r = ev("rtReality()")
    check('the same mission skipped three times in 14 days also triggers it', r and 'skipped or missed 3 times' in r['ev'][0], r)
    ev("(()=>{for(let i=1;i<=3;i++){S.days[dk(addDays(new Date(),-i))].mcSkip=[];}})(); closeModal(); 0")
    ev("(()=>{Object.keys(S.decisions).forEach(i=>delete S.decisions[i]); const o=day(new Date()); o.counters.dials=0; touch(o);})(); 0")
    r = ev("rtReality()")
    check('13.66: many War Room versions released in a week with under a quarter of the planned dials recorded also triggers it, counted from the changelog', r and r['ver'] >= 5 and r['plan'] == 0 and len(r['ev']) == 1 and 'War Room versions were released' in r['ev'][0] and '0 of 50' in r['ev'][0], r)
    ev("(()=>{const o=day(new Date()); o.counters.dials=20; touch(o);})(); 0")
    check('and it goes quiet in the same way once the dials are recorded', ev("rtReality()") is None, ev("rtReality()"))
    # --- day modes in practice
    ev("mcModeOpen(); 0"); pg.wait_for_timeout(150)
    t = ev("document.getElementById('mc-ops').textContent")
    check('the mode screen spells out all three modes: must happen, reduced, postponed, never given up', all(w in t for w in ['Full', 'Minimum', 'Recovery']) and t.count('Must happen') == 3 and t.count('Reduced') == 3 and t.count('Postponed') == 3 and t.count('Never given up') == 3)
    check('the Minimum day is the Playbook one (10 dials, 25 minutes of BAC, bed at 21:00) and names its source', '10 dials' in t and '25 minutes of BAC' in t and 'bed at 21:00' in t and 'From your Playbook' in t)
    check('the restart rule is stated as it works (a mode lasts one day) and your own condition starts as not set', 'A mode lasts one day' in t and 'not set' in t)
    ev("(()=>{const e=document.getElementById('mc-rs'); e.value='Full again after one night of 8 hours'; e.onchange();})(); closeModal(); mcModeOpen(); 0"); pg.wait_for_timeout(150)
    check('your own restart condition is saved and shown', ev("bcV('mode:restart','')") == 'Full again after one night of 8 hours' and 'Full again after one night of 8 hours' in ev("document.getElementById('mc-ops').textContent"))
    check('the mode screen still fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("closeModal(); 0")
    # --- capability map
    c = ev("(()=>{let n=0,bad=0,ids={};Object.keys(CM_CAPS).forEach(d=>CM_CAPS[d].forEach(r=>{n++;if(r.length!==11||!Array.isArray(r[10])||ids[r[0]])bad++;ids[r[0]]=1}));return [n,bad,Object.keys(CM_CAPS).length]})()")
    check('the map has 92 capabilities in nine areas, every row complete, ids unique', c == [92, 0, 9], c)
    new = ['b-salesmgmt', 'c-culture', 's-ready', 'd-logic', 'f-debt', 'f-housing', 'p-coord', 'l-reading']
    check('the eight added capabilities are indexed', ev(f"(()=>{{const I=cmIndex();return {new}.every(i=>I[i]&&I[i].n)}})()"))
    check('each is linked to the nearest existing lessons and says plainly that its own lesson is still missing', ev(f"{new}.every(i=>{{const r=Object.values(CM_CAPS).flat().find(x=>x[0]===i);return cmCards(cmCap(i)).length>=1&&/no lesson yet/i.test(r[4])}})") and ev("cmGaps().length") == 0, ev("cmGaps().map(c=>c.id)"))
    check('the money ones ask for official Moldovan sources and sign nothing', ev("(()=>{const r=CM_CAPS.fin.find(x=>x[0]==='f-debt');return /official Moldovan/.test(r[4])&&/Sign nothing/.test(r[5])})()"))
    ok = ev("(()=>{try{cmOpen('fin');return document.getElementById('modal').textContent.includes('Housing & transport')||document.body.textContent.includes('Housing & transport')}catch(e){return String(e)}})()")
    check('the map screen opens with the new entries', ok is True, ok)
    ev("try{closeModal()}catch(e){}; 0")
    check('the ledger records the line-by-line findings for sections 5 to 8 and 10', ev("AUD[0].rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length") >= 7, ev("AUD[0].rows.filter(r=>/CHECKED LINE BY LINE/.test(r.n)).length"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
