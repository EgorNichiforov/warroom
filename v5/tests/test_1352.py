"""War Room 13.52 checks: how well War Room knows each part of life (no single score), sources that disagree,
and AI use counted on the device. Throwaway browser, cloud blocked. Not a real phone."""
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
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1800); pg.clock.run_for(2000)
    check('version 13.52.0 or later', ev("APP_VERSION.localeCompare('13.52.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    t = "document.getElementById('modal').textContent"; fits = "document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"
    # ── 1. how well War Room knows you
    R = ev("fmRows().map(r=>[r.id,r.n,r.last,r.cov,r.unknown])")
    check('seven parts of life, each with its own evidence, coverage and unknowns', [r[0] for r in R] == ['biz', 'body', 'learn', 'money', 'time', 'people', 'world'] and all(r[3] and r[4] for r in R), R)
    check('with no call records it says no conversion rate can be trusted', 'Under 30 call records a rate is noise' in R[0][4] and R[0][1] == 0, R[0])
    ev("(()=>{for(let i=0;i<5;i++){const o=day(addDays(new Date(),-i*3)); o.weight=77+i/10; touch(o);} })(); 0")
    B = ev("fmRows().find(r=>r.id==='body')")
    check('five weigh-ins are counted as five days, newest today', 'weight on 5 of 30 days' in B['cov'] and B['n'] >= 5 and ev("fmAgo(fmRows().find(r=>r.id==='body').last)") == 0, B)
    check('under four weigh-ins the weekly trend is named as unknown; with five it is not', 'weekly weight trend' not in B['unknown'])
    ev("fmOpen(); 0"); pg.wait_for_timeout(150)
    check('the screen shows all seven, the three most useful next pieces of information, and no overall percentage', ev("document.querySelectorAll('#modal [id^=fm-]').length") == 7 and ev(f"/Where one more piece of information helps most/.test({t})&&!/\\d+\\s?%/.test({t})&&/no single score/i.test({t})") and ev(fits))
    check('with nothing logged, the business call records come first', ev("fmNext(fmRows())[0].id") == 'biz')
    # ── 2. sources that disagree
    ev("cxOpen(); 0"); pg.wait_for_timeout(150)
    n = ev("document.querySelectorAll('#cx-a option').length")
    check('the library is offered to pick from, and the screen says nothing is detected automatically', n > 2 and ev(f"/does not detect this/.test({t})") and ev(fits), n)
    ev("(()=>{const o=$('cx-a').options; $('cx-a').value=o[1].value; $('cx-b').value=o[1].value; $('cx-note').value='They disagree about when to state the price'; cxSave();})(); 0")
    check('the same source twice is refused', ev("cxAll().length") == 0)
    ev("(()=>{const o=$('cx-a').options; $('cx-a').value=o[1].value; $('cx-b').value=o[2].value; $('cx-note').value='short'; cxSave();})(); 0")
    check('a disagreement needs a real sentence', ev("cxAll().length") == 0)
    ev("(()=>{const o=$('cx-a').options; $('cx-a').value=o[1].value; $('cx-b').value=o[2].value; $('cx-note').value='They disagree about when to state the price'; cxSave();})(); 0"); pg.wait_for_timeout(100)
    C = ev("cxAll()[0]")
    check('saved as not settled, in the synced store', C and C['st'] == 'open' and ev("Object.keys(S.boot).some(k=>k.indexOf('cx:')===0)") and ev(f"/Not settled/.test({t})"), C)
    ev(f"cxSet('{C['id']}','both'); 0"); pg.wait_for_timeout(100)
    check('you can settle it, and "both hold" is an allowed answer', ev("cxAll()[0].st") == 'both' and ev(f"/Both hold, in different situations/.test({t})"))
    check('the Knowledge Curator is told how many are recorded and how many are open', ev("AG_PACK.know().some(l=>/Disagreements between sources recorded by the operator: 1 \\(0 not settled\\)/.test(l))"))
    check('the world part of the fidelity map counts unresolved disagreements', ev("/0 unresolved disagreements/.test(fmRows().find(r=>r.id==='world').cov)"))
    ev("closeModal(); 0")
    # ── 3. AI use
    check('every AI call goes through the counter', ev("aiText._au===1"))
    ev("localStorage.removeItem('wr-aiuse'); 0"); r = ev("aiText('system text',[{role:'user',text:'hello there'}]).then(()=>'ok').catch(e=>'threw')")
    U = ev("auSum(1)")
    check('a call that fails (no key here) still throws to its caller and is counted as failed', r == 'threw' and U['n'] == 1 and U['fail'] == 1 and U['cin'] == 22, [r, U])
    ev("auAdd(true,4000,2000); 0")
    check('the count stays on this device, not in the synced document', ev("!JSON.stringify(S).includes('wr-aiuse')&&!!localStorage.getItem('wr-aiuse')"))
    ev("auOpen(); 0"); pg.wait_for_timeout(400)
    check('the screen shows calls, failures and a rough size, and says it is not a bill', ev(f"/Today.*2 calls \\(1 failed\\)/.test({t}.replace(/\\s+/g,' '))&&/about 1,506 tokens/.test({t})&&/a bill/.test({t})") and ev(fits), ev(f"{t}.replace(/\\s+/g,' ').slice(0,260)"))
    ev("closeModal(); 0")
    # ── reachable, and nothing ranks
    got = [ev(f"(wfFind({json.dumps(q)})[0]||[])[0]") for q in ['how well does war room know me', 'two sources disagree', 'ai use']]
    check('all three are found by asking in plain words', got == ['fidelity', 'srcclash', 'aiuse'], got)
    check('still one recommender; none of this adds a candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^(fm|cx|au)/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
