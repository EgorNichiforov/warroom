"""War Room 15.0 checks: campaigns competing for the same hours, inside Capacity. Hours come only from campaign actions on the
calendar; tasks without time are 'no estimate'; overlap and over-capacity are shown with a proposal; nothing is moved."""
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
    check('version 15.0.0 or later', ev("APP_VERSION.localeCompare('15.0.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    ev("""(()=>{S.campaigns=S.campaigns||{};S.campaigns.cA={id:'cA',title:'First 3 paying agencies',active:true,_u:1};S.campaigns.cB={id:'cB',title:'BAC mock exams',active:true,_u:1};S.campaigns.cC={id:'cC',title:'Journey videos',active:true,_u:1};
      const m=monday(new Date());for(let i=7;i<14;i++){const d=addDays(m,i),k=dk(d);const ta='ta'+i,tb='tb'+i;S.tasks[ta]={id:ta,title:'Agency block '+i,camp:'cA',due:k,_u:1};S.tasks[tb]={id:tb,title:'Mock exam '+i,camp:'cB',due:k,_u:1};
        const sc=dayOnce(d);sc.add=(sc.add||[]).concat([{id:'once:a'+i,title:'Agency block',start:'06:00',end:'13:00',days:[dow(d)],kind:'agency',once:true,task:ta},{id:'once:b'+i,title:'Mock exam',start:'13:00',end:'20:00',days:[dow(d)],kind:'agency',once:true,task:tb}]);}
      S.tasks.tc1={id:'tc1',title:'Edit video 1',camp:'cC',due:dk(addDays(m,8)),_u:1};})(); 0""")
    before = ev("JSON.stringify([S.tasks,S.campaigns,Object.keys(S.days).sort().map(k=>JSON.stringify((S.days[k]||{}).sched||null))])")
    B = ev("(()=>{const W=rlcWeek(1);return {room:W.room,planned:W.planned,over:W.over,clash:W.clash,C:W.C.map(c=>[c.id,c.min,c.noEst||0])}})()")
    hrs = {c[0]: c[1] for c in B['C']}
    check('each campaign’s hours next week come from its blocks on the calendar (7 × 7 h)', hrs.get('cA') == 2940 and hrs.get('cB') == 2940, B['C'])
    check('a campaign with a task due and no time placed shows no estimate, with no hours invented', any(c[0] == 'cC' and c[1] == 0 and c[2] == 1 for c in B['C']), B['C'])
    check('two campaigns in the same week over the room is flagged with how much over', B['clash'] and B['over'] > 0 and B['planned'] > B['room'], B)
    F = ev("(()=>{const f=rlcFix(rlcWeek(1),null);return f&&[f.c.id,f.to,f.text]})()")
    check('a fix is proposed: what to move and to which week', F and F[0] in ('cA', 'cB') and 'Move' in F[2] and 'h' in F[2], F)
    A = ev("(()=>{const W=rlcWeek(0);return {n:W.D.length,clash:W.clash}})()")
    check('this week covers today to Sunday and has no clash here', A['n'] == 2 and not A['clash'], A)
    ev("rlCapOpen(); 0"); pg.wait_for_timeout(300); t = ev("document.getElementById('modal').textContent")
    check('Capacity shows the campaigns section with the overlap and says nothing is moved', 'Campaigns competing for the same hours' in t and 'compete for the same week' in t and 'nothing is moved' in t and 'no estimate' in t, t[t.find('Campaigns competing'):t.find('Campaigns competing') + 500])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('no task, campaign or calendar entry was changed', ev("JSON.stringify([S.tasks,S.campaigns,Object.keys(S.days).sort().map(k=>JSON.stringify((S.days[k]||{}).sched||null))])") == before)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
