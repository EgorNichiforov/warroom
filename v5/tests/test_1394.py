"""War Room 14.8 checks: versions for decisions, risks, protocols and campaigns, like goals. Your own save keeps the earlier
state (last 10); only changed fields are noted; the history shows on the record; nothing else changes."""
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
    pg.clock.install(time='2026-11-21T14:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 14.8.0 or later', ev("APP_VERSION.localeCompare('14.8.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    # risk: real form, real save
    ev("S.risks=S.risks||{}; S.risks.rk1={id:'rk1',t:'Phone number gets flagged as spam',p:2,i:3,status:'open',at:'2026-11-10',_u:1}; 0")
    ev("rtRiskEdit ? rtRiskEdit('rk1') : 0; 0"); pg.wait_for_timeout(200)
    has = ev("!!document.getElementById('rr-t')")
    if has:
        ev("$('rr-p').value='3'; rtRiskSave('rk1'); closeModal(); 0")
    else:
        ev("document.body.insertAdjacentHTML('beforeend','<div id=fk>'+['t','p','i','warn','prev','resp','owner','review','status','ref'].map(k=>`<input id=rr-${k}>`).join('')+'</div>'); $('rr-t').value='Phone number gets flagged as spam'; $('rr-p').value='3'; $('rr-i').value='3'; $('rr-status').value='open'; rtRiskSave('rk1'); document.getElementById('fk').remove(); 0")
    V = ev("verFor('risk:rk1')")
    check('saving a changed risk keeps the earlier version and names what changed', len(V) == 1 and V[0].get('p') == 2 and 'p' in V[0]['ch'], V)
    check('the risk itself has your new value', ev("S.risks.rk1.p") == 3)
    # decision via jlDecSave with its form
    ev("S.decisions=S.decisions||{}; S.decisions.dc1={id:'dc1',title:'Sell in Tampa first',req:'Sell in Tampa first',conf:60,date:'2026-11-17',_u:1}; 0")
    ev("jlDecEdit('dc1'); 0"); pg.wait_for_timeout(200)
    ev("$('jd-conf').value='75'; jlDecSave('dc1'); 0"); pg.wait_for_timeout(100)
    D = ev("verFor('decision:dc1')")
    check('a decision edited with its own form keeps the earlier version', len(D) == 1 and D[0].get('conf') == 60 and 'conf' in D[0]['ch'], D)
    # campaign via recSave
    ev("seedCampaigns(); 0"); cid = ev("Object.keys(S.campaigns)[0]")
    ev(f"recEdit('campaigns','{cid}'); 0"); pg.wait_for_timeout(200)
    t0 = ev(f"S.campaigns['{cid}'].deadline||''")
    ev("(()=>{const e=$('re-deadline');if(e)e.value='2027-01-31'})(); 0"); ev(f"recSave('campaigns','{cid}'); 0")
    C = ev(f"verFor('project:{cid}')")
    check('a campaign edit keeps the earlier deadline', (len(C) == 1 and C[0].get('deadline', '') == t0 and 'deadline' in C[0]['ch']) or t0 == '2027-01-31', [t0, C])
    # protocol
    ev("S.protocols=S.protocols||{}; S.protocols.pa1={id:'pa1',t:'attn',trig:'Phone in hand during a block',now:'Put it in the other room',txt:'Put it in the other room',on:true,_u:1}; 0")
    ev("document.body.insertAdjacentHTML('beforeend','<div id=fp>'+['trig','warn','now','repl','env','min','recover','review','src'].map(k=>`<input id=dp-${k}>`).join('')+'</div>'); $('dp-trig').value='Phone in hand during a block'; $('dp-now').value='Phone in the drawer, timer on'; dfProtoSave('pa1'); document.getElementById('fp').remove(); 0")
    P = ev("verFor('protocol:pa1')")
    check('a protocol edit keeps the earlier wording', len(P) == 1 and P[0].get('now') == 'Put it in the other room' and 'now' in P[0]['ch'], P)
    # no change, no version
    ev("closeModal(); 0"); n = len(ev("verFor('risk:rk1')"))
    ev("document.body.insertAdjacentHTML('beforeend','<div id=fk>'+['t','p','i','warn','prev','resp','owner','review','status','ref'].map(k=>`<input id=rr-${k}>`).join('')+'</div>'); $('rr-t').value='Phone number gets flagged as spam'; $('rr-p').value='3'; $('rr-i').value='3'; $('rr-status').value='open'; $('rr-owner').value=S.risks.rk1.owner||''; $('rr-review').value=S.risks.rk1.review||''; rtRiskSave('rk1'); document.getElementById('fk').remove(); 0")
    check('saving without a change adds no version', len(ev("verFor('risk:rk1')")) == n)
    check('a new record gets no version (nothing earlier to keep)', ev("(()=>{const n0=Object.keys(S.boot).filter(k=>/^ver:risk:/.test(k)).length;document.body.insertAdjacentHTML('beforeend','<div id=fk>'+['t','p','i','warn','prev','resp','owner','review','status','ref'].map(k=>`<input id=rr-${k}>`).join('')+'</div>');$('rr-t').value='New risk';rtRiskSave();document.getElementById('fk').remove();return Object.keys(S.boot).filter(k=>/^ver:risk:/.test(k)).length===n0})()"))
    ev("(()=>{for(let i=0;i<12;i++){document.body.insertAdjacentHTML('beforeend','<div id=fk>'+['t','p','i','warn','prev','resp','owner','review','status','ref'].map(k=>`<input id=rr-${k}>`).join('')+'</div>');$('rr-t').value='Phone number gets flagged as spam';$('rr-p').value=String(i%2?5:3);$('rr-i').value='3';rtRiskSave('rk1');document.getElementById('fk').remove();}})(); 0")
    check('at most the last 10 versions are kept', len(ev("verFor('risk:rk1')")) == 10)
    ev("closeModal(); enOpen('risk:rk1'); 0"); pg.wait_for_timeout(250); h = ev("document.getElementById('modal').innerHTML")
    check('the record page shows Earlier versions with what changed', 'ver-blk' in h and 'Earlier versions (10)' in h and 'before you changed p' in h, h[h.find('ver-blk')-10:h.find('ver-blk')+300] if 'ver-blk' in h else h[:200])
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    check('goals still keep versions as before', ev("typeof verAfter==='function'&&VER_F.includes('target')"))
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
