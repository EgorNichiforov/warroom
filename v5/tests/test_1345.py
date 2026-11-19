"""War Room 13.45 checks: the page that shows what War Room believes about you: said beside shown, how much each
line rests on, "not enough" below a minimum, and corrections. Throwaway browser, cloud blocked. Not a real phone."""
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
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1500); pg.clock.run_for(2000)
    check('version 13.45.0 or later', ev("APP_VERSION.localeCompare('13.45.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("S.settings.season={dom:'biz',kind:'bizbuild',primary:'20k MRR'}; Object.keys(S.days).forEach(k=>{delete S.days[k].mc;delete S.days[k].mcSkip}); bcW('rlog',[]); bcW('pmfix',{}); 0")
    R = ev("pmRows()"); by = {r['key']: r for r in R}
    check('what you set is shown as said, not as fact', by['season']['kind'] == 'stated' and '20k MRR' in by['season']['text'])
    check('with too little on record it says so and claims nothing', by['first']['kind'] == 'unknown' and by['skip']['kind'] == 'unknown' and by['recall']['kind'] == 'unknown' and 'Five are needed' in by['first']['basis'])
    ev("(()=>{for(let i=1;i<=6;i++){const o=day(addDays(new Date(),-i));o.mc='x';o.mcDone=i<=2?1:0;o.mcSkip=i>2?[{why:'tired'}]:[];touch(o);} const L=[];for(let i=0;i<12;i++)L.push([dk(addDays(new Date(),-1)),'c'+i,i<9?3:1]);bcW('rlog',L);})(); 0")
    R = ev("pmRows()"); by = {r['key']: r for r in R}
    check('once there is enough, it counts and says what the count rests on', by['first']['kind'] == 'observed' and '2 of 6 recorded days' in by['first']['text'] and by['first']['n'] == 6, by['first'])
    check('the skip line quotes your own reason and its share', by['skip']['kind'] == 'observed' and '(4 of 4)' in by['skip']['text'], by['skip'])
    check('recall is a percentage of graded recalls', by['recall']['kind'] == 'observed' and '75%' in by['recall']['text'] and by['recall']['n'] == 12, by['recall'])
    check('targets sit beside the last 7 days, taken from the scorecard', any(r['kind'] == 'gap' and 'you aim for' in r['text'] for r in R) or ev("scRows().filter(r=>r[3]!=null&&String(r[3]).trim()!==''&&String(r[3]).trim()!=='—').length") == 0)
    ev("pmOpen(); 0"); pg.wait_for_timeout(100)
    t = "document.getElementById('modal').textContent"
    check('the page has the sections and its limits', ev(f"!!document.getElementById('pm-stated')&&!!document.getElementById('pm-observed')&&/does not guess your mood, character or health/.test({t})&&/A count, not a judgement/.test({t})"))
    check('the page fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    ev("pmFix('first'); 0"); pg.wait_for_timeout(50); ev("$('pm-note').value='x'; pmFixSave('first'); 0")
    check('an empty correction is not saved', ev("!bcV('pmfix',{}).first"))
    ev("$('pm-note').value='Those were holiday days, not normal ones'; pmFixSave('first'); 0"); pg.wait_for_timeout(100)
    check('a correction replaces the line on the page and is kept', ev("bcV('pmfix',{}).first.note==='Those were holiday days, not normal ones'") and ev(f"/You corrected this/.test({t})&&/holiday days/.test({t})"))
    check('a correction changes no record and no setting', ev("S.settings.season.primary==='20k MRR'&&Object.values(S.days).filter(o=>o.mc).length===6"))
    ev("pmUnfix('first'); 0"); check('a correction can be undone', ev("!bcV('pmfix',{}).first"))
    ev("closeModal(); 0")
    check('"Where do I…?" finds it', all(ev(f"(wfFind({json.dumps(q)})[0]||[])[0]") == 'me' for q in ['what do you believe about me', 'personal model']), [ev(f"(wfFind({json.dumps(q)})[0]||[])[0]") for q in ['what do you believe about me', 'personal model']])
    check('earlier journeys still land where they did', ev("(wfFind('what should I do now')[0]||[])[0]") == 'now' and ev("(wfFind('goal')[0]||[])[0]") == 'goals' and ev("(wfFind('background jobs')[0]||[])[0]") == 'server' and ev("(wfFind('vault')[0]||[])[0]") == 'vault')
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^pm/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
