"""War Room 13.60 checks: the kind of each number (claims.js). Scorecard rows name their kind, today's numbers are split
by how they were recorded, a recommendation and a forecast are labelled as such, and a day record changed on a later day
is counted. Throwaway browser, cloud blocked. Not a real phone."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-20T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.wait_for_timeout(500)
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    check('version 13.60.0 or later', ev("APP_VERSION.localeCompare('13.60.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('eight kinds, each with a plain definition', ev("Object.keys(CK).join()") == 'obs,rep,ext,der,inf,hyp,fct,rec' and ev("Object.values(CK).every(x=>x[0].length>3&&x[1].length>25)"))
    ev("(()=>{Object.values(S.days).forEach(o=>{if(o.counters){o.counters.dials=0;} delete o.ext;});})(); 0")
    R = ev("scRows().map(r=>[r[0],r[8],r[5]])")
    by = {r[0]: r for r in R}
    check('every scorecard row carries a kind and its source line starts with it', all(r[1] for r in R) and by['Dials'][2].startswith('Observed · Call log') and by['BAC minutes'][2].startswith('Your report · ') and by['Overdue tasks'][2].startswith('Worked out · ') and by['Missions met'][1] == 'der', [r for r in R if not r[1]])
    ev("(()=>{const o=day(new Date()); o.counters=o.counters||{}; o.counters.dials=7; o.counters.bac=30; o.weight=77.4; o.ext=[{id:'x1',d:5,c:1,o:0,src:'t',at:1}]; touch(o);})(); 0")
    d = ev("scRows().find(r=>r[0]==='Dials')")
    check('once counter presses or an outside report are in the week, Dials says it is observed plus his own report', d[8] == 'mix' and d[5].startswith('Observed + your report · '), d[5])
    check('asking twice does not stack the label', ev("scRows().find(r=>r[0]==='Dials')[5].split('Observed + your report').length") == 2)
    T = ev("ckToday()")
    names = {r[0]: r for r in T}
    check('today’s dials are split by how they were recorded: 0 with a record, 5 from his outside report, 2 presses with no record', names['Dials today, with a call record'][1:3] == [0, 'obs'] and names['Dials today, from your outside report'][1:3] == [5, 'rep'] and names['Dials today, counter presses with no call record'][1:3] == [2, 'rep'], T)
    check('BAC minutes and weight are his own report', names['BAC minutes today'][2] == 'rep' and names['Weight today'][2] == 'rep')
    # a day record changed later
    ev("(()=>{const a=day(addDays(new Date(),-4)); a.weight=77; a._u=Date.now(); const b2=day(addDays(new Date(),-2)); b2.weight=77.2; b2._u=pd(dk(addDays(new Date(),-2))).getTime()+3600e3*20; })(); 0")
    L = ev("ckLate(14)")
    check('a day record changed three days after the day is counted as entered late; one changed the same evening is not', any(x[0] == ev("dk(addDays(new Date(),-4))") and x[1] == 3 for x in L['list']) and not any(x[0] == ev("dk(addDays(new Date(),-2))") for x in L['list']), L)
    ev("scOpen(); 0"); pg.wait_for_timeout(200)
    check('the scorecard shows the kind on its rows and has one button to the page', ev(f"/Observed \\+ your report · Call log/.test({t})&&!!document.getElementById('ck-link')&&document.querySelectorAll('#modal .actions').length===1"))
    ev("fctEnsure(); ckOpen(); 0"); pg.wait_for_timeout(200)
    check('the page lists the eight kinds, today, the scorecard, the recommendation, the forecasts and late entries; fits', ev(f"/The eight kinds/.test({t})&&/Hypothesis/.test({t})&&/counter presses with no call record/.test({t})&&/Mission Control/.test({t})&&/Recommendation/.test({t})&&/Entered after the day/.test({t})&&/nothing is left out because of it/.test({t})&&{fits}"), ev(t)[:200])
    check('a recommendation is labelled a recommendation and a forecast a forecast, never a fact', ev("(()=>{const m=document.getElementById('modal').innerHTML; const mc=m.split('Mission Control')[1]||''; return /<b[^>]*>Recommendation<\\/b>/.test(mc.split('forecasts')[0])||/Nothing is recommended/.test(mc)})()") and ev(f"/None made yet|Forecast/.test({t})"))
    check('found by asking in plain words', ev("(wfFind('provenance')[0]||[])[0]") == 'numkinds')
    check('still one recommender; this adds no candidate and stores nothing', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^ck/.test(c.k))})()") and ev("Object.keys(S.boot||{}).filter(k=>k.indexOf('ck:')===0).length") == 0)
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
