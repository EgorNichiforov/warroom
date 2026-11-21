"""War Room 14.3 checks: the screen-by-screen sweep. At 390px it opens every main screen and every place the finder
reaches, and checks each one: nothing wider than the phone, no page error, no broken text (undefined, NaN, [object]),
every button at least 40px tall. It also checks every scorecard number has its source and how-sure line."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
VIEWS = "acq ask book boot cal crm dial food intel life me money more now plan stats tasks today train trlog week".split()
PROBE = r"""(()=>{const m=document.getElementById('modal'),bk=m&&m.closest('.backdrop,.modal-bg,#modal-bg')||m&&m.parentElement,open=!!(m&&m.offsetParent!==null&&m.innerHTML.length>50);
const root=open?m:document.querySelector('main')||document.body; const vw=innerWidth;
const over=document.documentElement.scrollWidth>vw+2 || (open&&m.scrollWidth>m.clientWidth+2);
const wide=[...root.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>vw+2&&getComputedStyle(e).position!=='fixed'&&!(()=>{let a=e.parentElement;while(a&&a!==document.body){const o=getComputedStyle(a).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'||o==='clip')return true;a=a.parentElement}return false})()}).slice(0,3).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right));
const txt=root.innerText||''; const bad=(txt.match(/\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]|\bnull\b(?! ?(hypothesis|result))/g)||[]).slice(0,4);
const small=[...root.querySelectorAll('button,.btn,[role=button]')].filter(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.width>0&&r.height<39.5&&getComputedStyle(b).visibility!=='hidden'}).map(b=>(b.className||b.tagName)+':'+Math.round(b.getBoundingClientRect().height));
return {open:!!open,over,wide,bad,small:small.length,smallEx:small.slice(0,4),h:(open?(m.querySelector('h2')||{}).textContent:'')||''}})()"""
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-21T16:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 14.3.0 or later', ev("APP_VERSION.localeCompare('14.3.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    T = [('view', v) for v in VIEWS] + [('find', i) for i in ev("WF.map(x=>x[0])")]
    out = []; allerr = []
    for kind, t in T:
        errs.clear()
        try:
            ev("try{closeModal()}catch(e){};0"); ev(f"show('{t}');0" if kind == 'view' else f"wfGo('{t}');0"); pg.clock.run_for(1200); pg.wait_for_timeout(250)
            r = ev(PROBE)
        except Exception as e:
            r = {'exc': str(e)[:120]}
        r['t'] = kind + ':' + t; r['err'] = list(errs); out.append(r)
    check(f'the sweep reached {len(T)} screens (21 main screens and every finder entry)', len(T) >= 120 and sum(1 for r in out if r.get('open')) >= 60, [len(T), sum(1 for r in out if r.get('open'))])
    check('nothing is wider than the phone on any screen', not [r['t'] for r in out if r.get('over') or r.get('wide')], [(r['t'], r.get('wide')) for r in out if r.get('over') or r.get('wide')][:5])
    check('no page error on any screen', not [r['t'] for r in out if r.get('err') or r.get('exc')], [(r['t'], r.get('err') or r.get('exc')) for r in out if r.get('err') or r.get('exc')][:5])
    check('no undefined, NaN or [object] text on any screen', not [r['t'] for r in out if r.get('bad')], [(r['t'], r['bad']) for r in out if r.get('bad')][:5])
    check('every button on every screen is at least 40px tall', sum(r.get('small', 0) for r in out) == 0, [(r['t'], r['smallEx']) for r in out if r.get('small')][:5])
    ev("try{closeModal()}catch(e){}; scOpen(); 0"); pg.wait_for_timeout(300)
    n = ev("scRows().length"); h = ev("document.getElementById('modal').innerHTML")
    check('every scorecard number has its source and its how-sure line', h.count('Source:') >= n and h.count('ck-unc') == n, [n, h.count('Source:'), h.count('ck-unc')])
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
