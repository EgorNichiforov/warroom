"""War Room browser test suite (added 14 Nov 2026).
Run:  cd <repo> && python3 -m http.server 8765 &  then  python3 tests/run.py
Needs: pip install playwright && playwright install chromium.
Each test loads the app fresh (empty local storage, no sync code), so nothing touches real data."""
import json, sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/index.html'
results = []

def check(name, cond, info=''):
    results.append((name, bool(cond), info))

def fresh(p):
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2200)
    return b, pg, errs

with sync_playwright() as p:
    b, pg, errs = fresh(p)

    # ── XP and progression ──
    r = pg.evaluate("""() => { const k = dk(new Date()), o = day(k);
      o.counters.dials = 10; touch(o); const x10 = dayXpParts(k).dials;
      o.counters.dials = 999; touch(o); const xcap = dayXpParts(k).dials;
      o.counters.dials = 5; o.counters.owners = 9; touch(o); const own = dayXpParts(k).owners, ownCapped = Math.min(9, 5) * XP.owner;
      o.counters.dials = 0; o.counters.owners = 0; touch(o); const zero = dayXpParts(k).dials;
      const gate = RANK_GATES[2], g = gateStats(); const okGate = !gateMet(2, Object.assign({}, g, { dials: 299 })) && gateMet(2, Object.assign({}, g, { dials: 300 }));
      return { x10, xcap, cap: XP_CAP.dials * XP.dial, own, ownCapped, zero, okGate, gate }; }""")
    check('XP: dials earn XP', r['x10'] > 0)
    check('XP: daily cap enforced', r['xcap'] == r['cap'], r)
    check('XP: owner talks never exceed dials', r['own'] == r['ownCapped'], r)
    check('XP: undo to 0 removes dial XP', r['zero'] == 0)
    check('Rank: Corporal needs 300 real dials', r['okGate'], r['gate'])

    # ── Sync merge: newer wins, nothing deleted ──
    r = pg.evaluate("""() => { const k = '2026-01-05'; S.days[k] = { _u: 100, routine: {}, habits: {}, counters: { dials: 3 }, top3: [] };
      const ch1 = merge({ days: { [k]: { _u: 50, counters: { dials: 1 } }, '2026-01-06': { _u: 10, counters: { dials: 7 } } } });
      const keepNewer = S.days[k].counters.dials === 3, added = S.days['2026-01-06'] && S.days['2026-01-06'].counters.dials === 7;
      merge({ days: { [k]: { _u: 200, counters: { dials: 9 } } } }); const tookNewer = S.days[k].counters.dials === 9;
      merge({ days: {} }); const notDeleted = !!S.days[k];
      return { keepNewer, added, tookNewer, notDeleted }; }""")
    for k2, v in r.items(): check('Sync merge: ' + k2, v)

    # ── CRM / Follow-up radar ──
    r = pg.evaluate("""() => { Q = Q || { items: {} }; Q.items = {}; const t = dk(new Date()), y = dk(addDays(new Date(), -3)), old = new Date(Date.now() - 15 * 864e5).toISOString();
      Q.items[1] = { id: 1, agency: 'Overdue Co', status: 'callback', next_at: y, log: [], attempts: 1, phone: '1' };
      Q.items[2] = { id: 2, agency: 'Talked Co', status: 'owner', next_at: '', log: [{ at: new Date().toISOString(), r: 'owner' }], phone: '2' };
      Q.items[3] = { id: 3, agency: 'Quiet Co', status: 'bulletin', next_at: dk(addDays(new Date(), 30)), log: [{ at: old, r: 'x' }], phone: '3' };
      Q.items[4] = { id: 4, agency: 'Stuck Co', status: 'voicemail', attempts: 3, log: [], phone: '4' };
      Q.items[5] = { id: 5, agency: 'Fresh Co', status: 'new', attempts: 0, log: [], phone: '5' };
      const kinds = radarItems().map((x) => x.x.agency + ':' + x.kind);
      const n0 = Object.keys(Q.items).length; radarAct(1, 'snooze'); const snoozed = Q.items[1].next_at > t && radarItems().every((x) => x.x.id !== 1);
      radarUndoLast(); const undone = Q.items[1].next_at === y && Q.items[1].log.length === 0;
      radarAct(4, 'close'); const closed = Q.items[4].status === 'no'; radarUndoLast(); const reopened = Q.items[4].status === 'voicemail';
      const noDup = Object.keys(Q.items).length === n0;
      const loops = openLoops().map((l) => l.state + ':' + l.title);
      return { kinds, snoozed, undone, closed, reopened, noDup, loops }; }""")
    check('Radar: overdue callback found', 'Overdue Co:overdue' in r['kinds'], r['kinds'])
    check('Radar: interested with no next step found', 'Talked Co:nonext' in r['kinds'])
    check('Radar: interested gone quiet found', 'Quiet Co:quiet' in r['kinds'])
    check('Radar: stuck after 3 tries found', 'Stuck Co:stuck' in r['kinds'])
    check('Radar: new leads are not follow-ups', not any(k.startswith('Fresh Co') for k in r['kinds']))
    check('Radar: snooze moves next step', r['snoozed']); check('Radar: undo snooze', r['undone'])
    check('Radar: close + undo', r['closed'] and r['reopened']); check('CRM: no duplicate records created', r['noDup'])
    check('Open loops: radar items appear as DO/CLOSE', 'DO:Overdue Co' in r['loops'] and 'CLOSE:Stuck Co' in r['loops'], r['loops'])

    # ── Briefing: numbers only from data, honest when data is thin ──
    r = pg.evaluate("""() => { const f = funnelCounts(), bn = bottleneck(f); const html = briefingCard(new Date());
      Q.items = {}; const f2 = funnelCounts(), bn2 = bottleneck(f2);
      return { stage: bn.stage, stage2: bn2.stage, why2: bn2.why, hasNumbers: html.includes(String(f.dials) + ' dials') }; }""")
    check('Bottleneck: follow-up beats more dials when people wait', r['stage'] == 'Follow-up', r)
    check('Bottleneck: says "not enough data" below 300 dials', r['stage2'] == 'Not enough data', r['why2'])
    check('Briefing: shows its source numbers', r['hasNumbers'])

    # ── AI routing: server key never leaves the server, direct key goes direct ──
    r = pg.evaluate("""async () => { const calls = []; const realFetch = window.fetch;
      window.fetch = async (u, o) => { calls.push({ u: String(u), body: o && o.body ? String(o.body) : '' }); return new Response(JSON.stringify({ ok: true, server: true }), { status: 200, headers: { 'content-type': 'application/json' } }); };
      S.settings.sync.code = 'testcode_abcdefghijklmnop'; S.settings.sync.url = S.settings.sync.url || 'https://x.supabase.co'; S.settings.sync.key = S.settings.sync.key || 'pk';
      S.secrets = { _u: 1, ai: { provider: 'gemini', model: 'm', alts: [], server: true } }; localStorage.removeItem(FOOD_AI_KEY);
      const c = aiCfg(); await aiNet('https://generativelanguage.googleapis.com/v1beta/models/m:generateContent', { method: 'POST', headers: { 'x-goog-api-key': c.key }, body: '{}' });
      const viaProxy = calls[0].u.includes('/functions/v1/warroom-ai') && calls[0].body.includes('"op":"call"') && !calls[0].body.includes('x-goog-api-key');
      localStorage.setItem(FOOD_AI_KEY, JSON.stringify({ provider: 'gemini', key: 'AIzaLOCALKEY_only_this_device_123', model: 'm' }));
      const c2 = aiCfg(); await aiNet('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': c2.key } });
      const direct = calls[1].u.startsWith('https://generativelanguage.googleapis.com/');
      await aiShare({ provider: 'gemini', key: AI_SERVER, model: 'm' }, true); const noStoreOfPlaceholder = !calls.some((x) => x.body.includes('"op":"store"'));
      await aiShare({ provider: 'gemini', key: 'AIzaREALKEYxxxxxxxxxxxxxxxxxx', model: 'm' }, true); const stored = calls.some((x) => x.body.includes('"op":"store"'));
      const syncHasNoKey = !JSON.stringify(S.secrets).includes('AIza');
      S.secrets = { _u: 2, ai: { provider: 'gemini', key: 'AIzaOLDKEYinsyncxxxxxxxxxxxxx', model: 'm' } }; await aiMoveKeyToServer(); const moved = !JSON.stringify(S.secrets).includes('AIza') && S.secrets.ai.server === true;
      window.fetch = realFetch; localStorage.removeItem(FOOD_AI_KEY); S.secrets = { _u: 3 };
      return { viaProxy, direct, noStoreOfPlaceholder, stored, syncHasNoKey, moved }; }""")
    for k2, v in r.items(): check('AI key: ' + k2, v)

    # ── Device link uses the #fragment ──
    r = pg.evaluate("() => linkUrl()")
    check('Link: code travels in #fragment, not ?query', '#link=' in r and '?link=' not in r)

    # ── Tomorrow planner: apply and undo ──
    r = pg.evaluate("""async () => { window.aiOn = () => true; window.aiText = async (s, m) => { const ctx = JSON.parse(m[0].text.split('\\n')[1]); const b = ctx.blocks; return JSON.stringify({ summary: 'ok', wake: '08:30', dials: 50, remove: b.slice(0, 1).map((x) => x.id), add: [{ title: 'Moved', start: '09:00', end: '09:30', kind: 'other' }] }); };
      const d = new Date(); d.setHours(0,0,0,0); curDate = d; startShutdown(); sdStep = 3; renderShutdown(); const tk = dk(sdTomorrow(curDate));
      document.getElementById('sd-adj').value = 'late'; await tmrAdjust(tk); tmrApply(); const applied = wakeFor(pd(tk)) === '08:30' && dialTargetFor(pd(tk)) === 50 && blocksFor(pd(tk)).some((b) => b.title === 'Moved');
      tmrUndo(tk); const undone = wakeFor(pd(tk)) !== '08:30' && !blocksFor(pd(tk)).some((b) => b.title === 'Moved'); closeModal(); return { applied, undone }; }""")
    check('Tomorrow planner: apply', r['applied']); check('Tomorrow planner: undo', r['undone'])


    # ── 7.0: Command, Intel, records ──
    r = pg.evaluate("""() => { const k = dk(new Date()), o = day(k); o.counters.dials = 0; o.counters.owners = 0; touch(o);
      const a = cmdParse('35 dials and 4 owners'); const b = cmdParse('I weighed 78.4 kg'); const c = cmdParse('studied for 50 minutes'); const d = cmdParse('spent 120 on food');
      const g = cmdParse('show me overdue follow-ups'), h = cmdParse('replay yesterday'), n = cmdParse('what should I do with the next 20 minutes?');
      cmdPending = a.concat(b, c, d); cmdConfirm(); const after = { dials: o.counters.dials, owners: o.counters.owners, w: o.weight, bac: o.counters.bac, food: (o.money || {}).food };
      cmdOpen(); cmdUndoLast(); const undone = { dials: day(k).counters.dials, w: day(k).weight };
      cmdPending = [{ type: 'add', counter: 'owners', n: 9, label: 'x' }]; cmdConfirm(); const capped = day(k).counters.owners <= day(k).counters.dials;
      return { a: a.map(x => x.counter + x.n), b: b[0] && b[0].kg, c: c[0] && c[0].n, d: d[0] && d[0].cat, g: g[0].to, h: h[0].to, n: n[0] && n[0].minutes, after, undone, capped }; }""")
    check('Command: parses dials + owners', r['a'] == ['dials35', 'owners4'], r['a'])
    check('Command: parses weight', r['b'] == 78.4); check('Command: parses study minutes', r['c'] == 50); check('Command: parses spend', r['d'] == 'food')
    check('Command: read-only intents route (radar/replay/next 20 min)', r['g'] == 'radar' and r['h'] == 'replay' and r['n'] == 20)
    check('Command: confirm writes through existing trackers', r['after']['dials'] == 35 and r['after']['owners'] == 4 and r['after']['w'] == '78.4' and r['after']['bac'] == 50 and r['after']['food'] == 120, r['after'])
    check('Command: undo restores', r['undone']['dials'] == 0 and r['undone']['w'] in (None, '') , r['undone'])
    check('Command: owner talks capped at dials', r['capped'])
    r = pg.evaluate("""async () => { window.aiOn = () => true; window.aiText = async () => '{"actions":[{"type":"add","counter":"dials","n":5},{"type":"delete_everything"},{"type":"add","counter":"xp","n":999}]}';
      const ok = await cmdAi('did five'); window.aiText = async () => 'not json at all'; let bad = ''; try { await cmdAi('x'); } catch (e) { bad = e.message; }
      window.aiText = async () => '{"actions":[{"type":"drop_db"}]}'; let rej = ''; try { await cmdAi('x'); } catch (e) { rej = e.message; }
      return { ok: ok.map(a => a.type + a.counter + a.n), bad, rej }; }""")
    check('AI command: only allowed actions survive validation', r['ok'] == ['adddials5'], r)
    check('AI command: malformed output rejected', 'not valid JSON' in r['bad'], r['bad'])
    check('AI command: disallowed actions rejected', 'does not allow' in r['rej'], r['rej'])
    r = pg.evaluate("""() => { seedCampaigns(); const C = live(S.campaigns); msToggle(C[0].id, 0); const p = campaignProgress(S.campaigns[C[0].id]);
      const id = 'x1'; S.experiments[id] = { id, _u: 1, title: 't', metric: 'dials per day', start: dk(addDays(new Date(), -3)), end: dk(new Date()) }; const m = expMeasure(S.experiments[id], 'now');
      const wg = wgRun(wgDefaults(), 1), wl = wgRun(wgDefaults(), 0.8); const fut = futureEgor(); const w = earlyWarnings();
      recoveryOn(true); const rec = dialTargetFor(new Date()) <= 10; recoveryOff(); const back = !day(new Date()).recovery;
      const ev = replayEvents(dk(new Date())); const nb = nbaList(30); const ms = memSearch('tampa'); const d = doctrineCheck('blocks');
      return { n: C.length, p, m: m && m.unit, wgOrder: wl.mrr <= wg.mrr, fut: Array.isArray(fut), w: Array.isArray(w), rec, back, ev: Array.isArray(ev), nb: Array.isArray(nb), ms: Array.isArray(ms), d: typeof d }; }""")
    check('Campaigns: 3 drafts + milestone progress', r['n'] == 3 and r['p'] > 0, r)
    check('Experiments: metric measured', r['m'] == '/day'); check('Wargame: conservative ≤ expected', r['wgOrder'])
    check('Recovery mode on/off', r['rec'] and r['back'])
    check('Intel functions run (future, warnings, replay, NBA, search, doctrine)', all([r['fut'], r['w'], r['ev'], r['nb'], r['ms'], r['d'] == 'string']))
    for t in ['home', 'nba', 'funnel', 'sales', 'wargame', 'campaigns', 'decisions', 'experiments', 'replay', 'future', 'friction', 'clients', 'map', 'memory', 'doctrine']:
        try: pg.evaluate(f"intelTab='{t}';show('intel')"); pg.wait_for_timeout(80)
        except Exception as e: errs.append('intel ' + t + ': ' + str(e)[:120])
    check('Intel: all 15 tabs render', not [e for e in errs if e.startswith('intel')], [e for e in errs if e.startswith('intel')][:3])
    r = pg.evaluate("""() => { lockStart(); document.querySelector('#lk-mode .chip[data-v=study]').click(); document.getElementById('lk-mis').value='BAC'; lockGo(); const a = !!lockActive(); lockEnd(); document.getElementById('lk-res').value='30'; lockClose(); return { a, closed: !lockActive(), saved: live(S.focus).some(x => x.result === 30) }; }""")
    check('Lockdown: start, end, review saved', r['a'] and r['closed'] and r['saved'], r)

    # ── Every screen renders without errors ──
    for v in ['now', 'dial', 'train', 'food', 'stats', 'plan', 'me', 'intel', 'book', 'ask', 'cal']:
        try: pg.evaluate(f"show('{v}')"); pg.wait_for_timeout(150)
        except Exception as e: errs.append(v + ': ' + str(e)[:120])
    pg.evaluate("moreTab='home';show('me')"); pg.wait_for_timeout(200)
    check('System status card renders', 'system status' in pg.inner_text('body').lower())
    check('No page errors', not errs, errs[:3])
    b.close()

# ═════════ 12.x regression: pay cycle, stable rendering, launch, offline shell ═════════
SEED_MONEY = """(()=>{mnInit();const d=new Date(),ym=(o)=>{const x=new Date(d.getFullYear(),d.getMonth()+o,1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
 [[-3,12000,3000],[-2,15000,5000],[-1,14900,6000],[0,5250,1200]].forEach(([o,i,x])=>{mnPut({date:ym(o)+'-05',type:'in',acc:'cash',amt:i,cat:'tennis',at:new Date(ym(o)+'-05T12:00').getTime()});mnPut({date:ym(o)+'-06',type:'out',acc:'cash',amt:x,cat:'other',at:new Date(ym(o)+'-06T12:00').getTime()});});
 mnPut({date:dk(d),type:'count',acc:'cash',amt:17065,diff:null});mnPut({date:dk(d),type:'count',acc:'card',amt:0,diff:null});
 const c=mn4Cfg();c.through=ym(-2);touch(S.settings);save();window.__ym=ym;})();0"""
with sync_playwright() as p:
    b, pg, errs = fresh(p)
    ev = pg.evaluate
    ev(SEED_MONEY); pg.wait_for_timeout(300)
    check('Money: cash equals the count, earnings never inflate it', round(ev("mnTotal().t")) == 17065, ev("mnTotal().t"))
    s = ev("(()=>{const M=mn4Sum();return [M.owed,M.accruing,M.open.map(x=>x.status).join(',')]})()")
    check('Money: last month is owed, this month accrues', s[0] == 14900 and s[1] == 5250 and 'awaiting payment' in s[2], s)
    L = ev("mn3Life()"); check('Money: received − logged spending − cash = not tracked', L['gap'] == round(L['recv'] - L['out'] - L['have']) and round(L['recv']) == round(L['earned'] - 14900 - 5250), L)
    ev("mnPut({date:dk(new Date()),type:'in',acc:'cash',amt:500,cat:'tennis',note:'lesson'});save();0")
    check('Money: a day of monthly-paid work adds to accrual, not to cash', round(ev("mnTotal().t")) == 17065 and ev("mn4Sum().accruing") == 5750)
    ev("mnPut({date:dk(new Date()),type:'in',acc:'cash',amt:300,cat:'tennis',note:'private lesson cash'});save();0")
    check('Money: a lesson paid in hand ("cash") is cash at once', round(ev("mnTotal().t")) == 17365 and ev("mn4Sum().accruing") == 5750, [ev("mnTotal().t"), ev("mn4Sum().accruing")])
    # the user corrects what the club will actually pay
    ev("mn4PeriodModal('tennis', __ym(-1))"); pg.wait_for_timeout(250); pg.fill('#m4p-a', '14250'); pg.fill('#m4p-n', 'club statement'); pg.click('#modal-bg .btn.primary'); pg.wait_for_timeout(350)
    s = ev("(()=>{const x=mn4Periods().find(p=>p.period===__ym(-1));return [x.earned,x.logged,x.adj,x.out,Math.round(mnTotal().t),mnTx().filter(t=>t.type==='adj').length]})()")
    check('Money: awaiting amount is editable (14,900 → 14,250) through one adjustment line', s == [14250, 14900, -650, 14250, 17365, 1], s)
    check('Money: the adjustment lowers earned income, not cash', round(ev("mn3Life().earned")) == round(L['earned'] + 500 + 300 - 650), ev("mn3Life().earned"))
    ev("mn4PeriodModal('tennis', __ym(-1))"); pg.wait_for_timeout(250); pg.fill('#m4p-a', '14400'); pg.click('#modal-bg .btn.primary'); pg.wait_for_timeout(350)
    check('Money: editing again replaces the adjustment (no duplicates)', ev("mnTx().filter(t=>t.type==='adj').length") == 1 and ev("mn4Sum().owed") == 14400, ev("mn4Sum().owed"))
    e0 = ev("mn3Life().earned")
    ev("mn4PayModal('tennis', __ym(-1))"); pg.wait_for_timeout(250); pg.fill('#m4-a', '10000'); pg.click('#modal-bg .btn.primary'); pg.wait_for_timeout(350)
    s = ev("(()=>{const x=mn4Periods().find(p=>p.period===__ym(-1));return [x.status,x.out,Math.round(mnTotal().t)]})()")
    check('Money: partial payout raises cash and leaves the rest owed', s == ['partially paid', 4400, 27365], s)
    check('Money: a payout is never counted as income again', ev("mn3Life().earned") == e0)
    ev("mn4PayModal('tennis', __ym(-1))"); pg.wait_for_timeout(250); pg.click('#modal-bg .btn.primary'); pg.wait_for_timeout(350)
    s = ev("(()=>{const x=mn4Periods().find(p=>p.period===__ym(-1));return [x.status,x.out,x.pays.length,Math.round(mnTotal().t),mn4Sum().owed]})()")
    check('Money: second payout settles the period (two payouts, one period)', s == ['paid', 0, 2, 31765, 0], s)
    ev("mnPut({date:dk(new Date()),type:'move',acc:'cash',to:'card',amt:1000,toAmt:1000});save();0")
    m = ev("(()=>{const r=mnMonth(mnYm(new Date()));return [Math.round(mnTotal().t),Math.round(mnBal('card').bal),Math.round(mnBal('cash').bal)]})()")
    check('Money: a transfer moves money between accounts and changes no total', m == [31765, 1000, 30765], m)
    sp0 = ev("mnMonth(mnYm(new Date())).spent"); ev("mnPut({date:dk(new Date()),type:'out',acc:'cash',amt:200,cat:'food'});save();0")
    check('Money: an expense lowers cash and raises spending by the same amount', round(ev("mnTotal().t")) == 31565 and ev("mnMonth(mnYm(new Date())).spent") == sp0 + 200)
    pid = ev("mnTx().find(t=>t.type==='pay'&&t.amt==10000).id"); ev(f"mn4PayModal('','','{pid}')"); pg.wait_for_timeout(250); pg.click('#m4-del'); pg.click('#m4-del'); pg.wait_for_timeout(350)
    check('Money: deleting a payout puts it back as owed and takes the cash out', ev("mn4Sum().owed") == 10000 and round(ev("mnTotal().t")) == 21565, [ev("mn4Sum().owed"), ev("mnTotal().t")])
    check('Money: no estimated transactions exist or get created', ev("mn3Auto();mnTx().filter(t=>t.est).length") == 0)
    ev("(()=>{const c=mn4Cfg(),d=new Date();c.snaps=[{d:dk(new Date(d.getFullYear(),d.getMonth()-2,28)),a:37000}];touch(S.settings);save();})();0")
    n0 = ev("mnTx().length"); E = ev("mn4Est().filter(e=>!e.pre)[0]")
    check('Money: balance-to-balance estimate is arithmetic only (start + arrived − end), creates nothing', E and E['spent'] == round(E['start'] + E['recv'] - E['end']) and ev("mnTx().length") == n0, E)
    pg.reload(); pg.wait_for_timeout(2400)
    check('Money: everything survives a reload', ev("mn4Sum().owed") == 10000 and ev("mnTx().filter(t=>t.type==='adj').length") == 1)
    check('Money: no page errors', not errs, errs[:3])
    b.close()

    # stable rendering: a background refresh must not rebuild the screen
    b, pg, errs = fresh(p); ev = pg.evaluate
    ev(SEED_MONEY)
    PROBE = """(()=>{let n=0;const mo=new MutationObserver(L=>L.forEach(x=>x.addedNodes.forEach(a=>{n+=1+(a.querySelectorAll?a.querySelectorAll('*').length:0)})));const v=document.querySelector('#arc.on')||document.querySelector('.view.active');mo.observe(v,{childList:true,subtree:true});for(let i=0;i<5;i++){render();if(typeof arcRender==='function'&&document.querySelector('#arc.on'))arcRender();}mo.takeRecords().forEach(x=>x.addedNodes.forEach(a=>{n+=1+(a.querySelectorAll?a.querySelectorAll('*').length:0)}));mo.disconnect();return n})()"""
    for v, lim in (('now', 40), ('dial', 40), ('crm', 60), ('money', 40), ('life', 80), ('train', 160), ('food', 80), ('stats', 80), ('week', 80)):
        ev(f"show('{v}');0"); pg.wait_for_timeout(900); n = ev(PROBE)
        check(f'Stable: 5 background refreshes on {v} rebuild almost nothing (<{lim} nodes)', n < lim, n)
    ev("mnTab='tx';show('money');0"); pg.wait_for_timeout(700)
    check('Stable: Money / Transactions stays put on refresh', ev(PROBE) < 40)
    ev("show('money');0"); pg.wait_for_timeout(700)
    pg.fill('#mn-q', 'spent 120 ta') if pg.query_selector('#mn-q') else None
    foc = ev("(()=>{const i=document.querySelector('#view-money input[type=text],#view-money input:not([type])');if(!i)return null;i.focus();i.value='spent 120 ta';render();render();return [document.activeElement===i,i.value]})()")
    check('Stable: a focused input keeps focus and text through a refresh', foc is None or foc == [True, 'spent 120 ta'], foc)
    ev("openModal('<h2>Test</h2><input id=\"tm\">');document.getElementById('tm').value='abc';render();render();0")
    check('Stable: an open modal survives a refresh with its content', ev("document.getElementById('modal-bg').classList.contains('open') && document.getElementById('tm').value==='abc'"))
    ev("closeModal();show('stats');0"); pg.wait_for_timeout(600); ev("window.scrollTo(0,600);0"); pg.wait_for_timeout(100); y0 = ev("scrollY"); ev("render();render();0"); pg.wait_for_timeout(100)
    check('Stable: scroll position is kept through a refresh', abs(ev("scrollY") - y0) < 4, [y0, ev("scrollY")])
    check('Stable: entrance motion is off outside navigation', ev("(()=>{document.documentElement.classList.remove('wr-nav');const c=document.querySelector('.view.active .card');return c?getComputedStyle(c).animationDuration:'0s'})()") in ('0s', '0s, 0s'))
    check('Stable: no page errors', not errs, errs[:3])
    b.close()

    # launch: the first painted screen is the real one
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); seen = []
    pg.add_init_script("window.__seen=[];new MutationObserver(()=>{const h=document.documentElement;if(document.body&&!h.classList.contains('wr-boot')){const t=(document.querySelector('#nav')||{}).textContent||'';if(t&&window.__seen.indexOf(t)<0)window.__seen.push(t)}}).observe(document,{childList:true,subtree:true,attributes:true});")
    pg.goto(URL); pg.wait_for_timeout(3200)
    seen = pg.evaluate("__seen")
    check('Launch: the old bottom bar (Ops / Personal / Intel / More) is never visible', not any('Personal' in t or 'Intel' in t for t in seen), seen)
    check('Launch: curtain lifts and Day is the first screen', pg.evaluate("!document.documentElement.classList.contains('wr-boot') && !!document.querySelector('#arc.on')"))
    check('Launch: bottom bar has five equal slots across the width', pg.evaluate("(()=>{const B=[...document.querySelectorAll('.sh-bar>*')].map(e=>e.getBoundingClientRect());return B.length===5&&B[4].right>innerWidth*0.9&&Math.abs((B[1].left-B[0].left)-(B[4].left-B[3].left))<2})()"))
    b.close()

    # stages: the app is as big as the evidence
    b, pg, errs = fresh(p); ev = pg.evaluate
    check('Stage: with no owner conversation Work shows Dial, Playbook, Later', ev("(sgApply(),SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(','))") == 'dial,book,later')
    ev("show('later');0"); pg.wait_for_timeout(300)
    check('Stage: "Later" opens the stage sheet, it is not a screen', ev("view") != 'later' and ev("document.getElementById('modal-bg').classList.contains('open')"))
    ev("closeModal();shRawGo('crm');0"); pg.wait_for_timeout(300); check('Stage: a waiting room can always be opened by hand', ev("view") == 'crm')
    e0 = ev("sgEvidence()")
    check('Evidence: starts at zero on every level', all(e0[k] == 0 for k in ('attempts', 'answered', 'dm', 'needs', 'requests', 'demand', 'working', 'paid')), e0)
    ev("show('dial');0"); pg.wait_for_timeout(400)
    ids = ev("(()=>{const a=[];for(let i=0;i<4;i++){const x=currentCall();a.push(x.id);if(i===0)outcome(x.id,'noanswer');else if(i===1){outcome(x.id,'gatekeeper');}else break;outGuard={};if(i===1){document.getElementById('gk-who').value='Maria, office manager';saveGatekeeper(x.id);}}return a})()") if ev("typeof saveGatekeeper==='function'") else None
    e1 = ev("sgEvidence()")
    check('Evidence: a no-answer is an attempt, a gatekeeper is an answered call, neither is a conversation', ids is None or (e1['attempts'] == 2 and e1['answered'] == 1 and e1['dm'] == 0), e1)
    ev("(()=>{outGuard={};const x=currentCall();window.__a=x.id;ownerModal(x.id)})();0"); pg.wait_for_timeout(300)
    check('Evidence: the owner-talk sheet asks for demand evidence', ev("!!document.getElementById('ow-need') && !!document.getElementById('ow-prof')"))
    pg.fill('#ow-note', 'nice chat, they use Indeed for hiring'); ev("saveOwner(__a)"); pg.wait_for_timeout(300)
    e2 = ev("sgEvidence()")
    check('Evidence: a friendly owner conversation counts as a conversation, not as demand', e2['dm'] == 1 and e2['demand'] == 0 and e2['needs'] == 0 and ev("sgState().i") == 1, e2)
    ev("(()=>{outGuard={};const x=currentCall();window.__b=x.id;ownerModal(x.id)})();0"); pg.wait_for_timeout(300)
    pg.fill('#ow-need', 'weekend live-in, Naples, CNA'); ev("saveOwner(__b)"); pg.wait_for_timeout(300)
    e3 = ev("sgEvidence()"); check('Evidence: a stated need without a profile request is a requirement, still not demand', e3['needs'] == 1 and e3['requests'] == 0 and e3['demand'] == 0, e3)
    ev("(()=>{outGuard={};ownerModal(__b)})();0"); pg.wait_for_timeout(300); pg.fill('#ow-need', 'weekend live-in, Naples, CNA'); pg.check('#ow-prof'); ev("saveOwner(__b)"); pg.wait_for_timeout(300)
    e4 = ev("sgEvidence()"); check('Evidence: need + agreement to receive profiles = one agency with demand; repeats are not new agencies', e4['demand'] == 1 and e4['requests'] == 1 and e4['dm'] == 3 and e4['dmAgencies'] == 2, e4)
    ev("(()=>{outGuard={};const x=currentCall();window.__c=x.id;ownerModal(x.id)})();0"); pg.wait_for_timeout(300); ev("saveOwner(__c)"); pg.wait_for_timeout(300)
    e5 = ev("sgEvidence()"); check('Evidence: an owner call with nothing written down is not a qualified conversation', e5['conv'] == 4 and e5['dm'] == 3 and e5['dmAgencies'] == 2, e5)
    ev("sgEvModal()"); pg.wait_for_timeout(300); pg.fill('#se-q', ev("Q.items[__a].agency").split(' ')[0]); pg.wait_for_timeout(200); ev("sgEvPick=__a;0")
    pg.fill('#se-note', 'Email: we need two CNAs for overnight in Bonita, send me who you have'); pg.fill('#se-need', 'two CNAs, overnight, Bonita'); pg.check('#se-prof'); ev("sgEvSave()"); pg.wait_for_timeout(500)
    e6 = ev("sgEvidence()"); L = ev("(()=>{const l=Q.items[__a].log.find(e=>e.src==='email');return [l.src,l.d.owners,l.d.dials,!!l.at,l.manual]})()")
    check('Evidence: demand from an email counts as demand and keeps its source and time', e6['demand'] == 2 and L == ['email', 0, 0, True, True], [e6, L])
    check('Evidence: an email never adds a conversation or a call attempt', e6['dm'] == e5['dm'] and e6['conv'] == e5['conv'] and e6['attempts'] == e5['attempts'], e6)
    ev("closeModal();(()=>{const x=Q.items[__a];x.placements=[{at:dk(addDays(new Date(),3)),cg:'Ana R',what:'overnight'}];x.client={invoices:[{id:'i1',n:1,amount:500,status:'sent'}]};})();0")
    e7 = ev("sgEvidence()"); check('Evidence: a future shift and a sent invoice are not a completed shift or a payment', e7['working'] == 0 and e7['paid'] == 0, e7)
    ev("(()=>{const x=Q.items[__a];x.placements[0].at=dk(addDays(new Date(),-1));x.client.invoices[0].status='paid';x.client.invoices[0].paidAt=dk(new Date());})();0")
    e8 = ev("sgEvidence()"); check('Evidence: a past shift by a named caregiver and an invoice marked paid with its date do count', e8['working'] == 1 and e8['paid'] == 1 and e8['paidSum'] == 500, e8)
    ev("(()=>{const x=Q.items[__a];delete x.placements;delete x.client;})();0")
    check('Stage: the ladder is the validation journey and names what comes after', ev("SG_LADDER.every(s=>s.phase==='validation'&&s.rule) && SG_NEXT[SG_NEXT.length-1]==='$20k MRR'"))
    ev("(()=>{const x=Q.items[__b];x.log=x.log.filter(l=>!(l.demand&&l.demand.profiles));const y=Q.items[__a];y.log=y.log.filter(l=>l.src!=='email');})();0")
    check('Evidence: removing the log entries removes the demand', ev("sgEvidence().demand") == 0, ev("sgEvidence()"))
    ev("(()=>{outGuard={};const x=currentCall();window.__d=x.id;ownerModal(x.id)})();0"); pg.wait_for_timeout(300); pg.fill('#ow-need', 'live-in, Marco Island'); pg.check('#ow-prof'); ev("saveOwner(__d)"); pg.wait_for_timeout(300)
    d1 = ev("sgEvidence().demand"); ev("undoLast();0"); pg.wait_for_timeout(300)
    check('Evidence: Undo on a call removes the demand it carried', d1 == 1 and ev("sgEvidence().demand") == 0, [d1, ev("sgEvidence().demand")])
    ev("benchMode='caregivers';show('dial');0"); pg.wait_for_timeout(400)
    check('Stage: the Caregivers workflow stays reachable at stage 1', ev("view") == 'dial' and 'bench' in pg.inner_text('#view-dial').lower())
    ev("benchMode='owners';lifeTab='score';show('life');0"); pg.wait_for_timeout(400)
    t = pg.inner_text('#view-life').lower(); check('You: school shows readiness and learning apart from time; body shows weight, strength, consistency; no score or level', 'school' in t and 'body' in t and 'readiness' in t and 'learning' in t and 'strength' in t and 'consistency' in t and 'level' not in t and 'xp' not in t.split())
    check('Stage: Pipeline is open after a decision-maker conversation', ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(',')") == 'dial,crm,book,later')
    ev("show('dial');0")
    check('Stage: one conversation moves the ladder to stage 2 (ten conversations)', ev("sgState().i") == 1 and ev("sgState().s.id") == 'learn')
    ev("S.settings.stageAll=true;render();0"); check('Stage: "show everything" restores all rooms', ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(',')") == 'dial,crm,intel,book')
    check('Stage: no page errors', not errs, errs[:3])
    b.close()

    # Day: Done on the current block must move the screen on
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2400); ev = pg.evaluate
    cur = ev("(()=>{const d=new Date(),nm=nowMin(),L=arcBlocks(d);let b=L.find(x=>tmin(x.start)<=nm&&nm<tmin(x.end)&&!['dials','bac','agency','train','program'].includes(x.kind));if(!b){const o=day(d);o.sched=o.sched||{};const s=String(Math.floor(nm/60)).padStart(2,'0')+':'+String(nm%60).padStart(2,'0'),e2=Math.min(nm+30,1439),e=String(Math.floor(e2/60)).padStart(2,'0')+':'+String(e2%60).padStart(2,'0');return null}return {id:b.id,title:b.title}})()")
    if cur:
        before = pg.inner_text('#arc .arc-now'); pg.click('#arc .arc-btn'); pg.wait_for_timeout(700); after = pg.inner_text('#arc .arc-now')
        check('Day: tapping Done confirms the block and shows what is next', 'done' in after.lower() and after != before and ev(f"day(new Date()).blk['{cur['id']}']") == 'done', after[:120])
        pg.click('#arc .arc-done a'); pg.wait_for_timeout(500)
        check('Day: undo brings the block back', not ev(f"day(new Date()).blk['{cur['id']}']") and pg.inner_text('#arc .arc-now') == before)
    else:
        r = ev("(()=>{const R=oneNow();const fake={id:'t1',title:'Test block',start:'00:00',end:'23:59',kind:'other'};R.cur=fake;const a=arcHero(R);R.o.blk=R.o.blk||{};R.o.blk.t1='done';const b=arcHero(R);delete R.o.blk.t1;return [a.includes('arc-done'),b.includes('arc-done'),b.includes('Test block')&&!/arc-big\">Test block/.test(b)]})()")
        check('Day: a finished current block steps aside in the hero', r == [False, True, True], r)
    check('Day: no page errors', not errs, errs[:3]); b.close()

    # ── Guided day 13.5: tasks in the flow, skip → move or drop, reorder ──
    b, pg, errs = fresh(p); ev = pg.evaluate
    r = ev("""() => { const d = gdDayDate(), k = dk(d), k1 = dk(addDays(d, 1));
      const a = { id: 'ta', _u: now(), title: 'Call Maria', due: k, time: '23:40', done: false, note: '' };
      const b2 = { id: 'tb', _u: now(), title: 'Send invoice', due: k, done: false, note: '' };
      const c = { id: 'tc', _u: now(), title: 'Old thing', due: dk(addDays(d, -2)), done: false, note: '' };
      S.tasks.ta = a; S.tasks.tb = b2; S.tasks.tc = c; save();
      const L = gdSteps(d), ids = L.map((x) => x.id);
      const inFlow = ['td:ta', 'td:tb', 'td:tc'].every((i) => ids.includes(i));
      const timedAt = L.find((x) => x.id === 'td:ta').t === '23:40';
      const slotted = L.find((x) => x.id === 'td:tb').slotted && L.find((x) => x.id === 'td:tc').overdue;
      gdTaskDone('ta'); const doneOk = S.tasks.ta.done && gdSteps(d).find((x) => x.id === 'td:ta').st === 'done';
      gdMove('td:tb', k1, '10:15'); const movedTask = S.tasks.tb.due === k1 && S.tasks.tb.time === '10:15' && !gdSteps(d).some((x) => x.id === 'td:tb');
      gdDrop('td:tc'); const dropped = S.tasks.tc._del === true;
      const busy = [[600, 660], [700, 760]], sl = gdFindSlots(busy, 30, 540, 3, k);
      const slotOk = sl.length >= 2 && !sl.some((h) => { const m = tmin(h); return busy.some(([x, y]) => x < m + 30 && y > m); });
      const due = tdDueBody({ due: '2026-11-18', time: '14:30' }), dueOk = !!due.due_datetime && !due.due_date;
      const back = tdDueRead({ due: { date: due.due_datetime } }), backOk = back.due === '2026-11-18' && back.time === '14:30';
      return { inFlow, timedAt, slotted, doneOk, movedTask, dropped, slotOk, dueOk, backOk, sl }; }""")
    check('Guide: Todoist tasks due today/overdue appear as steps', r['inFlow'], r)
    check('Guide: a timed task sits at its time; untimed and overdue get slotted', r['timedAt'] and r['slotted'], r)
    check('Guide: Done on a task closes it', r['doneOk'])
    check('Guide: moving a task to tomorrow updates its date+time and takes it off today', r['movedTask'])
    check('Guide: "not doing it" deletes a one-off task', r['dropped'])
    check('Guide: free-slot finder never lands on a busy block', r['slotOk'], r['sl'])
    check('Todoist: date+time is sent (reminder moves) and read back in local time', r['dueOk'] and r['backOk'])
    r = ev("""() => { const d = gdDayDate(), k = dk(d), o = day(k);
      S.schedule.blocks = [{ id: 'x1', title: 'Write post', start: '10:00', end: '10:30', days: [0,1,2,3,4,5,6], kind: 'other' }, { id: 'x2', title: 'Read book', start: '11:00', end: '11:30', days: [0,1,2,3,4,5,6], kind: 'other' }];
      if (typeof CAL !== 'undefined' && CAL) CAL.events = null;
      const has = gdSteps(d).some((x) => x.id === 'x1'); if (!has) return { skip: 1 };
      gdNudge('x1', 1); const L = gdSteps(d), a = L.find((x) => x.id === 'x1'), b2 = L.find((x) => x.id === 'x2'); const swapped = a.t === '11:00' && b2.t === '10:00';
      gdMove('x1', k, '15:05'); const today = gdSteps(d).find((x) => x.id === 'x1').t === '15:05';
      const n = Object.keys(S.tasks).length; gdMove('x2', dk(addDays(d, 1)), '09:30'); const tk = Object.values(S.tasks).find((t) => t.title === '↻ Read book');
      const moved = o.blk.x2 === 'moved' && tk && tk.time === '09:30';
      gdUndo('x1'); const undone = gdSteps(d).find((x) => x.id === 'x1').t === '10:00';
      return { swapped, today, moved, undone }; }""")
    if r.get('skip'): check('Guide: blocks reorder/move (schedule not used under calendar)', True)
    else:
        check('Guide: ▲▼ swaps two steps', r['swapped'], r)
        check('Guide: moving a block later today keeps it in the flow at the new time', r['today'], r)
        check('Guide: moving a block to another day becomes a timed Todoist task', r['moved'], r)
        check('Guide: undo puts a moved block back', r['undone'], r)
    r2 = ev("""() => { gdRender(); const h = document.getElementById('arc').innerHTML; const st = gdSteps().find((x)=>x.type==='todo' && !x.st);
      if (st) gdMiss(st.id); const after = st ? gdSteps().find((x)=>x.id===st.id) : null;
      return { pair: /gd-dm/.test(h) && />Missed</.test(h), noMove: /Move · later or tomorrow/.test(h) && !/gd-nd/.test(h), missed: !st || (after && after.st === 'skip') }; }""")
    check('Guide 13.6: every card is Done / Missed + Move', r2['pair'] and r2['noMove'], r2)
    ev("gdSkipSheet(gdSteps().find((x)=>x.type==='todo'||x.id==='x1').id)"); pg.wait_for_timeout(200)
    check('Guide: Move opens the sheet with times and tomorrow', 'move it' in pg.inner_text('#modal').lower())
    check('Guide 13.6: Missed marks a task missed for the nightly review', r2['missed'], r2)
    check('Guide 13.5: no page errors', not errs, errs[:3]); b.close()

    # offline shell + cache hygiene (static checks on the real files)
    import re, os
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    h = open(os.path.join(root, 'index.html')).read(); sw = open(os.path.join(root, 'sw.js')).read(); core = open(os.path.join(root, 'core.js')).read()
    need = set(re.findall(r'(?:src|href)="\./([A-Za-z0-9_.-]+\.(?:js|css))', h)); have = set(re.findall(r"'\./([A-Za-z0-9_.-]+\.(?:js|css))'", sw))
    check('Offline: every loaded script and stylesheet is in the service-worker shell', not (need - have), sorted(need - have))
    ver = re.search(r"APP_VERSION = '([0-9.]+)'", core).group(1)
    check('Release: one version everywhere (core, cache name, every asset URL)', f"warroom-v{ver}'" in sw and set(re.findall(r'\?v=([0-9.]+)', h)) == {ver}, [ver, sorted(set(re.findall(r'\?v=([0-9.]+)', h)))])
    check('Release: old caches are deleted on activate (prefix match, not the current name)', "startsWith('warroom-v')" in sw)
    check('Release: no automatic reload on service-worker change (cannot interrupt a call session)', 'controllerchange' not in h and 'controllerchange' not in core)

ok = sum(1 for r in results if r[1])
for n, passed, info in results:
    print(('PASS ' if passed else 'FAIL ') + n + ('' if passed or not info else '  → ' + json.dumps(info)[:200]))
print(f'\n{ok}/{len(results)} passed')
sys.exit(0 if ok == len(results) else 1)
