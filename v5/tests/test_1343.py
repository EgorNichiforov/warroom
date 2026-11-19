"""War Room 13.43 checks: the Server screen (jobs that run while the app is closed, a key per device, the lock,
the audit list) and the approve/dismiss step for what a server-side role suggests.
The server here is a small fake inside the page. These tests prove what the app sends, shows and refuses.
The real SQL and the real worker are proven separately in v5/supabase/tests (a local Postgres, not the live project).
Throwaway browser, cloud blocked. Not a real phone."""
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
FAKE = r"""(()=>{ window.FS={inst:false,locked:false,devs:[],jobs:[],sch:[],calls:[]}; const real=window.fetch;
window.fetch=async(url,opt)=>{ url=String(url); const m=url.match(/\/rest\/v1\/rpc\/(\w+)/); if(!m) return real(url,opt); const fn=m[1],a=JSON.parse((opt&&opt.body)||'{}'),h=Object.assign({},opt.headers); FS.calls.push([fn,a,h]);
 const R=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}}); if(FS.down) throw new TypeError('net');
 if(!FS.inst) return R({code:'PGRST202',message:'Could not find the function'},404); const dev=FS.devs.find(d=>d.tok===h['x-warroom-device']&&!d.revoked); if(FS.locked&&!dev) return R({error:'Not authorised'});
 switch(fn){ case 'warroom_server_status': return R({ok:true,device:dev?dev.id:null,locked:FS.locked,devices:FS.devs.filter(d=>!d.revoked).length,queued:FS.jobs.filter(j=>j.status==='queued').length,last_done:'2026-11-19T04:10:00Z',failed_7d:0,ai_key:true,backups:2,last_backup:'2026-11-19T01:00:00Z'});
  case 'warroom_devices': return R({me:dev?dev.id:null,locked:FS.locked,devices:FS.devs.map(d=>({id:d.id,name:d.name,created:'2026-11-19T10:00:00Z',seen:null,revoked:d.revoked||null}))});
  case 'warroom_device_enrol': { const d={id:'d'+(FS.devs.length+1),name:a.p_name,tok:'tok'+(FS.devs.length+1)}; FS.devs.push(d); return R({id:d.id,token:d.tok}); }
  case 'warroom_device_revoke': { const d=FS.devs.find(x=>x.id===a.p_id); if(!d) return R({error:'No such active device'}); d.revoked='2026-11-19T12:00:00Z'; return R({ok:true}); }
  case 'warroom_lock': if(!dev) return R({error:'Only an enrolled device can change this'}); FS.locked=a.p_on; return R({ok:true,locked:a.p_on});
  case 'warroom_enqueue': if(FS.jobs.some(j=>j.idem===a.p_idem)) return R({ok:true,duplicate:true}); FS.jobs.unshift({id:FS.jobs.length+1,kind:a.p_kind,status:'queued',attempts:0,by:'you',created:'2026-11-19T15:00:00Z',idem:a.p_idem,payload:a.p_payload}); return R({ok:true,id:FS.jobs.length});
  case 'warroom_jobs': return R({jobs:FS.jobs}); case 'warroom_job_cancel': { const j=FS.jobs.find(x=>x.id===a.p_id); if(j) j.status='cancelled'; return R({ok:!!j}); }
  case 'warroom_schedules': return R({schedules:FS.sch,ai_cap:6}); case 'warroom_schedule_set': FS.sch=FS.sch.filter(s=>s.kind!==a.p_kind).concat([{kind:a.p_kind,enabled:a.p_enabled,hour:a.p_hour,minute:a.p_minute}]); return R({ok:true});
  case 'warroom_audit_list': return R({audit:[{at:'2026-11-19T12:00:00Z',action:'device enrolled',device:'Phone'},{at:'2026-11-19T12:05:00Z',action:'job queued',detail:{kind:'brief'}}]}); } return R({error:'?'}); }; })(); 0"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; XC||xcLoad(); BC||bcLoad(); ccLoad(); 0"); pg.wait_for_timeout(1500); pg.clock.run_for(2000)
    check('version 13.43.0 or later', ev("APP_VERSION.localeCompare('13.43.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    txt = "document.getElementById('modal').textContent"
    # ── sync off, then not installed
    ev(FAKE); ev("S.settings.sync.code=''; 0"); ev("svOpen()"); pg.wait_for_timeout(100)
    check('with sync off it says so and offers nothing', ev(f"/Sync is off on this device/.test({txt})&&!document.getElementById('sv-run')"))
    ev("S.settings.sync.code='T'.repeat(24); S.settings.sync.url=S.settings.sync.url||'https://x.supabase.co'; S.settings.sync.key=S.settings.sync.key||'k'; 0")
    check('a device with no key of its own sends exactly what it always sent', ev("(()=>{const h=hdr();return !('x-warroom-device' in h)&&h['x-warroom-key']===S.settings.sync.code&&Object.keys(h).length===4})()"))
    ev("svOpen()"); pg.wait_for_timeout(100)
    check('before the server is switched on, the screen says so plainly and shows no controls', ev(f"/Not switched on yet/.test({txt})&&/nothing about your sync has changed/.test({txt})&&!document.getElementById('sv-run')&&!document.getElementById('sv-enrol')"))
    check('the automation list calls the server jobs blocked, with the reason', ev("(()=>{const r=coAutoRows().find(r=>/^Server jobs/.test(r[0]));return r&&r[1]==='blocked'&&/needs your confirmation/.test(r[2])})()"))
    check('the automation list no longer claims the scan is weekly or that daily was refused', ev("(()=>{const t=JSON.stringify(coAutoRows());return /Daily content scan/.test(t)&&/Every day at 07:37/.test(t)&&!/refused the change/.test(t)&&!/Weekly content scan/.test(t)})()"))
    ev("FS.down=1; 0"); ev("svOpen()"); pg.wait_for_timeout(100)
    check('offline is reported as offline, and does not overwrite what was last known', ev(f"/No connection to the server/.test({txt})&&svCache().err==='not-installed'")); ev("FS.down=0; 0")
    # ── switched on
    ev("FS.inst=true; 0"); ev("svOpen()"); pg.wait_for_timeout(100)
    check('once switched on: status, run-now, jobs, timers, devices, lock, audit and what leaves the server', ev("['sv-stat','sv-run','sv-jobs','sv-sch','sv-dev','sv-lock','sv-aud'].every(id=>!!document.getElementById(id))") and ev(f"/What leaves the server/.test({txt})&&/cannot send, spend, delete or change a record/.test({txt})"))
    check('status shows the numbers the server gave', ev("/Jobs waiting: 0/.test(document.getElementById('sv-stat').textContent)&&/AI key on the server: yes/.test(document.getElementById('sv-stat').textContent)&&/key-only access: open/.test(document.getElementById('sv-stat').textContent)"))
    check('the screen fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('the automation list now says the server jobs run alone', ev("coAutoRows().find(r=>/^Server jobs/.test(r[0]))[1]==='alone'"))
    check('the lock cannot be used before this device has its own key', ev("document.getElementById('sv-lockb').disabled&&/Give this device a key first/.test(document.getElementById('sv-lockb').textContent)"))
    # ── jobs
    ev("svRun('brief')"); pg.wait_for_timeout(100)
    J = ev("FS.jobs[0]")
    check('"Morning brief" queues one brief job', J['kind'] == 'brief' and J['payload'] == {} and ev("/Morning brief/.test(document.getElementById('sv-jobs').textContent)&&/queued/.test(document.getElementById('sv-jobs').textContent)"), J)
    ev("svRun('brief')"); pg.wait_for_timeout(100)
    check('a second tap in the same minute does not queue a second one', ev("FS.jobs.length") == 1)
    check('the job id key carries no sync code', ev("!FS.jobs[0].idem.includes(S.settings.sync.code)"))
    ev("svRun('rm -rf')"); check('an unknown kind is not even sent', ev("FS.jobs.length") == 1)
    ev("$('sv-q').value='hi'; 0"); ev("svAsk()"); check('a role needs a real question', ev("FS.jobs.length") == 1)
    ev("$('sv-role').value='red'; $('sv-q').value='Where is my plan weakest?'; 0"); ev("svAsk()"); pg.wait_for_timeout(100)
    check('a role question is queued with the role and the question', ev("FS.jobs[0].kind==='role'&&FS.jobs[0].payload.role==='red'&&FS.jobs[0].payload.q==='Where is my plan weakest?'"), ev("FS.jobs[0]"))
    check('only the six roles the server knows are offered', ev("Array.from($('sv-role').options).map(o=>o.value).join()") == 'chief,analyst,coach,strategist,learning,red')
    ev("svCancel(FS.jobs[0].id)"); pg.wait_for_timeout(100)
    check('a waiting job can be cancelled', ev("FS.jobs[0].status==='cancelled'&&/cancelled/.test(document.getElementById('sv-jobs').textContent)"))
    # ── timers
    ev("$('sv-on-brief').checked=true; $('sv-t-brief').value='06:10'; 0"); ev("svSched('brief')"); pg.wait_for_timeout(100)
    check('a timer is saved as kind, on/off, hour and minute', ev("JSON.stringify(FS.sch)") == json.dumps([{'kind': 'brief', 'enabled': True, 'hour': 6, 'minute': 10}], separators=(',', ':')), ev("FS.sch"))
    check('the saved time is shown again', ev("$('sv-on-brief').checked&&$('sv-t-brief').value==='06:10'"))
    # ── a key for this device
    ev("$('sv-name').value='Test phone'; 0"); ev("svEnrol()"); pg.wait_for_timeout(100)
    check('enrolling stores the key in this browser only, never in the synced document', ev("svTok()==='tok1'&&!JSON.stringify(S).includes('tok1')&&!!localStorage.getItem('wr-device')"))
    check('every kind of request now carries the device key as well', ev("[hdr(),bHdr(),qHdr(),snapHdr('x')].every(h=>h['x-warroom-device']==='tok1'&&!!h['x-warroom-key'])"))
    check('the screen shows this device and the lock opens up', ev("/This device has its own key/.test(document.getElementById('sv-dev').textContent)&&/Test phone \\(this one\\)/.test(document.getElementById('sv-dev').textContent)&&!document.getElementById('sv-lockb').disabled"))
    ev("(()=>{const c=S.settings.sync.code; S.settings.sync.code='Z'.repeat(24); window._h=hdr(); S.settings.sync.code=c;})(); 0")
    check('with a different sync code the old device key is not sent', ev("!('x-warroom-device' in _h)"))
    # ── the lock
    ev("svLockAsk(); 0"); pg.wait_for_timeout(50)
    check('locking asks first: which devices keep working, what stops, how to undo', ev(f"/Test phone \\(this one\\)/.test({txt})&&/stops syncing until it has its own key/.test({txt})&&/Unlocking is one tap/.test({txt})&&!FS.locked"))
    ev("svLockGo(true)"); pg.wait_for_timeout(100)
    check('after Lock the server is locked and the screen says the code alone opens nothing', ev("FS.locked&&/LOCKED/.test(document.getElementById('sv-stat').textContent)&&/The sync code alone opens nothing/.test(document.getElementById('sv-lock').textContent)"))
    ev("svRevoke('d1', null)"); pg.wait_for_timeout(100)
    check('this device cannot remove its own key while locked', ev("svTok()==='tok1'&&!FS.devs[0].revoked"))
    ev("localStorage.setItem('wr-device-keep',localStorage.getItem('wr-device')); localStorage.removeItem('wr-device'); 0"); ev("svOpen()"); pg.wait_for_timeout(100)
    check('a device without a key is told why it is not let in', ev(f"/This device is not let in/.test({txt})&&/unlock it there, enrol this device here, then lock again/.test({txt})"))
    ev("localStorage.setItem('wr-device',localStorage.getItem('wr-device-keep')); 0"); ev("svLockGo(false)"); pg.wait_for_timeout(100)
    check('unlock is one tap from an enrolled device', ev("!FS.locked&&/key-only access: open/.test(document.getElementById('sv-stat').textContent)"))
    ev("FS.devs.push({id:'d2',name:'Old laptop',tok:'tok2'}); 0"); ev("svOpen()"); pg.wait_for_timeout(100)
    ev("svRevoke('d2', document.querySelector('#sv-dev a'))"); check('removing a device needs a second tap', ev("!FS.devs[1].revoked"))
    ev("(()=>{const a=Array.from(document.querySelectorAll('#sv-dev a')).find(a=>a.dataset.sure); return svRevoke('d2', a)})()"); pg.wait_for_timeout(100)
    check('the second tap removes that device only', ev("!!FS.devs[1].revoked&&!FS.devs[0].revoked&&svTok()==='tok1'&&/removed/.test(document.getElementById('sv-dev').textContent)"))
    check('the audit list is shown', ev("/device enrolled · Phone/.test(document.getElementById('sv-aud').textContent)&&/job queued · brief/.test(document.getElementById('sv-aud').textContent)"))
    # ── suggestions from a server-side role
    ev("""(()=>{ closeModal(); S.inbox=S.inbox||{}; S.inbox.sj9={id:'sj9',_u:1,at:Date.now(),from:'Server',title:'🧭 Morning brief · 19 Nov',body:'- Yesterday: 0 dials\\n- ANSWER (medium confidence): Dial first.\\nWR-PROPOSE: '+JSON.stringify([{type:'task',title:'Dial 20 before anything else',why:'no owner talks in 7 days',role:'chief'},{type:'decision',title:'Change the price',why:'chief may not propose decisions',role:'chief'},{type:'research',title:'How do owners decide on a recruiter?',why:'unknown',role:'coach'},{type:'task',title:'A fourth one',why:'over the limit',role:'chief'}])}; S.inbox.plain={id:'plain',_u:1,at:Date.now(),title:'Plain',body:'- nothing to approve'}; })(); 0""")
    check('only suggestions the role is allowed to make are kept, three at most', ev("svProps(S.inbox.sj9).map(p=>p.type+':'+p.role).join()") == 'task:chief,research:coach', ev("svProps(S.inbox.sj9)"))
    nT = ev("Object.values(S.tasks||{}).filter(t=>!t._del).length"); nR = ev("Object.keys(S.research||{}).length")
    ev("inboxOpen('sj9'); 0"); pg.wait_for_timeout(100)
    check('the note shows the suggestions with Approve and Dismiss, and hides the machine line', ev(f"!!document.getElementById('sv-props')&&document.querySelectorAll('#sv-props .sv-ok').length===2&&!/WR-PROPOSE/.test({txt})&&!/\\[\\{{/.test({txt})&&/Dial first/.test({txt})&&/Suggested, not done/.test({txt})"), ev(txt)[:300])
    check('opening the note creates nothing', ev("Object.values(S.tasks||{}).filter(t=>!t._del).length") == nT and ev("Object.keys(S.research||{}).length") == nR)
    check('the note keeps its machine line in storage', ev("/WR-PROPOSE/.test(S.inbox.sj9.body)"))
    ev("svApprove('sj9',0); 0"); pg.wait_for_timeout(150)
    T = ev("(()=>{const t=Object.values(S.tasks).find(t=>t.title==='Dial 20 before anything else');return t?{note:t.note||t.notes||t.why||'',due:t.due}:null})()")
    check('Approve creates the task through the same path as an in-app role, saying who proposed it', T is not None and ev("JSON.stringify(Object.values(S.tasks).find(t=>t.title==='Dial 20 before anything else')).includes('Proposed by Chief of Staff')"), T)
    check('the note remembers it, and a second approve does nothing', ev("S.inbox.sj9.props[0]==='done'") and ev("(()=>{svApprove('sj9',0);return Object.values(S.tasks).filter(t=>t.title==='Dial 20 before anything else').length})()") == 1)
    check('the approved one is shown as approved; the other is still open', ev("/Approved/.test(document.getElementById('sv-props').textContent)&&document.querySelectorAll('#sv-props .sv-ok').length===1"))
    ev("svDismiss('sj9',2); 0"); pg.wait_for_timeout(100)
    check('Dismiss creates nothing and is remembered', ev("S.inbox.sj9.props[2]==='no'") and ev("Object.keys(S.research||{}).length") == nR and ev("document.querySelectorAll('#sv-props .sv-ok').length===0"))
    ev("svApprove('sj9',1); 0"); check('a suggestion that was filtered out cannot be approved by its number', ev("!S.inbox.sj9.props[1]"))
    ev("closeModal(); inboxOpen('plain'); 0"); pg.wait_for_timeout(100)
    check('an ordinary note is untouched', ev(f"!document.getElementById('sv-props')&&/nothing to approve/.test({txt})"))
    ev("closeModal(); S.inbox.bad={id:'bad',_u:1,at:Date.now(),title:'Bad',body:'x\\nWR-PROPOSE: [not json'}; inboxOpen('bad'); 0"); pg.wait_for_timeout(100)
    check('a broken machine line shows no suggestions and breaks nothing', ev("!document.getElementById('sv-props')&&svProps(S.inbox.bad).length===0"))
    # ── finding it, and the rule that there is one recommender
    ev("closeModal(); 0")
    check('"Where do I…?" finds the server by ordinary words', all(ev(f"(wfFind({json.dumps(q)})[0]||[])[0]") == 'server' for q in ['background jobs', 'runs while the app is closed', 'device key', 'audit who wrote']), [ev(f"(wfFind({json.dumps(q)})[0]||[])[0]") for q in ['background jobs', 'runs while the app is closed', 'device key', 'audit who wrote']])
    check('earlier journeys still land where they did', ev("(wfFind('what should I do now')[0]||[])[0]") == 'now' and ev("(wfFind('goal')[0]||[])[0]") == 'goals', [ev("(wfFind('what should I do now')[0]||[])[0]"), ev("(wfFind('goal')[0]||[])[0]")])
    check('still one recommender; the server adds no candidate', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^sv/.test(c.k))})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
