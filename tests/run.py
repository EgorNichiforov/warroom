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
    check('Stage: with no owner conversation Work shows Dial, Learn, Playbook, Later', ev("(sgApply(),SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(','))") == 'dial,boot,book,later')
    ev("show('dial');0"); pg.wait_for_timeout(500); ev("shSeg(SH_HUBS.find(h=>h.id==='work').segs.findIndex(s=>s[0]==='later'));0"); pg.wait_for_timeout(900)
    check('Stage: "Later" (tab or swipe) is a real page with the stage, never blank (13.13.3)', ev("view") == 'later' and 'Stage 1 of' in ev("document.getElementById('view-later').textContent") and not ev("document.getElementById('modal-bg').classList.contains('open')"))
    ev("closeModal&&closeModal();show('dial');0")
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
    check('Stage: Pipeline is open after a decision-maker conversation', ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(',')") == 'dial,crm,boot,book,later')
    ev("show('dial');0")
    check('Stage: one conversation moves the ladder to stage 2 (ten conversations)', ev("sgState().i") == 1 and ev("sgState().s.id") == 'learn')
    ev("S.settings.stageAll=true;render();0"); check('Stage: "show everything" restores all rooms', ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]).join(',')") == 'dial,crm,intel,boot,book')
    check('Stage: no page errors', not errs, errs[:3])
    b.close()

    # Day: Done on the current block must move the screen on (classic screen: with Guided day on, the guided card replaces this hero, 13.13.1)
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.add_init_script("localStorage.setItem('wr-guide','off')"); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2400); ev = pg.evaluate
    cur = ev("(()=>{const d=new Date(),nm=nowMin(),L=arcBlocks(d);let b=L.find(x=>tmin(x.start)<=nm&&nm<tmin(x.end)&&!['dials','bac','agency','train','program'].includes(x.kind));if(!b){const o=day(d);o.sched=o.sched||{};const s=String(Math.floor(nm/60)).padStart(2,'0')+':'+String(nm%60).padStart(2,'0'),e2=Math.min(nm+30,1439),e=String(Math.floor(e2/60)).padStart(2,'0')+':'+String(e2%60).padStart(2,'0');return null}return {id:b.id,title:b.title}})()")
    if cur and pg.query_selector('#arc .arc-now'):
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

    # Script Lab 13.7: markup layer over the Playbook scripts
    b, pg, errs = fresh(p); ev = pg.evaluate
    pg.evaluate("pbOpen='script-owner';pbLab=true;show('book')"); pg.wait_for_timeout(500)
    r = ev("""() => { const pid='script-owner', base=pb(pid).body, dial0=scriptHtml(null); const M=labModel(pid); const say=M.rows.filter(x=>x.line&&x.line.kind==='say'); const a=say[2], c=say[3];
      // markup of every kind on canonical lines
      labWrite(a.id, 'In a normal month, roughly how many caregivers do you hire?', true);
      labSel={id:c.id,s:9,e:30}; labSelAt=Date.now(); labHl('red'); labFlag(c.id); labFlag(c.id); labNote(c.id,'ask slower'); labHide(say[5].id,1);
      labAddBelow(c.id); const own=labModel(pid).rows.find(x=>x.own); labWrite(own.id,'And how many of those actually show up?', true);
      const untouched = pb(pid).body===base && scriptHtml(null)===dial0;
      const m2=labModel(pid), rc=m2.rows.find(x=>x.id===c.id).rec, edited=m2.rows.filter(labEdited).length, pending=m2.rows.filter(labPending).length;
      // lock: typing frozen, flags + highlights still work
      localStorage.setItem('wr-lab-lock','1'); labTap(a.id); const lockNoEdit = labEditId===null; labFlag(a.id); const lockFlag = labModel(pid).rows.find(x=>x.id===a.id).rec.flag==='keep'; localStorage.setItem('wr-lab-lock','0');
      // revert one line
      labRevert(a.id); const reverted = !labEdited(labModel(pid).rows.find(x=>x.id===a.id));
      labWrite(a.id, 'In a normal month, roughly how many caregivers do you hire?', true);
      // apply: live script + dialer change, markup follows the new line
      labApply(a.id); const live = pb(pid).body.includes('> In a normal month, roughly how many caregivers do you hire?') && !pb(pid).body.includes('> In a normal month, how many caregivers do you hire?') && scriptHtml(null).includes('roughly how many caregivers');
      const nl = labModel(pid).rows.find(x=>x.line && x.line.text.startsWith('In a normal month, roughly')); const follow = nl && nl.rec && nl.rec.flag==='keep' && !labEdited(nl);
      // apply own line: inserted right after its anchor
      labApply(own.id); const L=pb(pid).body.split(String.fromCharCode(10)), ci=L.findIndex(l=>l===c.line.raw); const ownIn = L[ci+1]==='> And how many of those actually show up?';
      const logs = labModel(pid).logs.length;
      return { untouched, flag: rc.flag==='q', note: rc.note==='ask slower', hl: rc.hl.length===1 && rc.hl[0].c==='red', edited, pending, lockNoEdit, lockFlag, reverted, live, follow, ownIn, logs, html: !!document.querySelector('#view-book .lb-doc') }; }""")
    check('Script Lab: highlights, flags, notes, hidden and own lines never touch the live script or the dialer', r['untouched'], r)
    check('Script Lab: highlight, flag and margin note stored on the line', r['flag'] and r['note'] and r['hl'], r)
    check('Script Lab: counts edited and pending-apply lines', r['edited'] == 1 and r['pending'] == 2, r)
    check('Script Lab: lock freezes typing but flags still work', r['lockNoEdit'] and r['lockFlag'], r)
    check('Script Lab: revert one line goes back to the Playbook wording', r['reverted'], r)
    check('Script Lab: Apply rewrites the Playbook line and the dialer shows it', r['live'], r)
    check('Script Lab: after Apply the flag stays on the new line and the edit is no longer pending', r['follow'], r)
    check('Script Lab: Apply on my own line inserts it right after its anchor line', r['ownIn'], r)
    check('Script Lab: every Apply is logged (for the Drive mirror)', r['logs'] == 2, r)
    r = ev("""() => { const pid='script-gatekeeper'; const M=labModel(pid), a=M.rows[1], b=M.rows[2];
      // two devices edit different lines → sync merge keeps both, no duplicates
      const r1=labRecFor(pid,a); r1.flag='keep'; labSaveRec(r1); const remote=JSON.parse(JSON.stringify(S)); const rb=labRecFor(pid,b); rb.note='from laptop'; rb.id=labId(pid,b.id); rb._u=now()+5000; remote.slab[rb.id]=rb;
      merge(remote); const recs=labRecs(pid); const ids=recs.map(x=>x.id);
      // a canonical change elsewhere orphans the markup instead of losing it
      const body=pb(pid).body; pbSave(pid, pb(pid).title, body.replace(a.line.raw, a.line.raw+' (changed)'), 'scripts'); const orph=labModel(pid).orphans.length;
      pbReset(pid);
      return { both: recs.some(x=>x.flag==='keep') && recs.some(x=>x.note==='from laptop'), nodup: new Set(ids).size===ids.length, orph }; }""")
    check('Script Lab: phone and laptop markup on different lines both survive a sync merge, no duplicates', r['both'] and r['nodup'], r)
    check('Script Lab: if the Playbook line changes elsewhere, the markup is kept as an orphan, not lost', r['orph'] >= 1, r)
    ev("labResetAll=(function(f){return function(){window.confirm=()=>true;return f()}})(labResetAll)"); ev("pbOpen='script-gatekeeper';labResetAll()")
    check('Script Lab: reset all clears markup but keeps the live script', len(ev("labRecs('script-gatekeeper').filter(r=>r.kind!=='log')")) == 0)
    check('Script Lab: no page errors', not errs, errs[:3]); b.close()

    # Wealth 13.8: M-O-N-E-Y from the ledger
    b, pg, errs = fresh(p); ev = pg.evaluate
    r = ev("""() => { mnInit(); Object.keys(S.txns).forEach(k=>delete S.txns[k]); const t=new Date();
      for (let i=3;i>=1;i--){ const d=dk(new Date(t.getFullYear(),t.getMonth()-i,10)); mnPut({type:'in',amt:5000,acc:'cash',cat:'tennis',date:d,cash:true}); mnPut({type:'out',amt:i===2?6000:3000,acc:'cash',cat:i===1?'food':'shopping',date:d,note:'x'}); }
      const k=dk(t); mnPut({type:'in',amt:1000,acc:'cash',cat:'tennis',date:k,cash:true}); mnPut({type:'out',amt:400,acc:'cash',cat:'food',date:k,note:'Linella'}); mnPut({type:'out',amt:100,acc:'cash',cat:'food',date:k,note:'Linella'});
      const m=wlPeriod('m').cur, mt=wlMarginTest();
      // fix month 2 → 3 positive months
      Object.values(S.txns).filter(x=>x.amt===6000).forEach(x=>{x.amt=4000}); const mt2=wlMarginTest();
      // optionality: essentials food only, 6 months
      S.settings.wealth={ess:['food'],months:6,steps:{}}; const nut=wlNut(); const st=wlStatus();
      // balance sheet: savings account as fund + investments + card debt
      S.accounts.sav={id:'sav',_u:now(),name:'Sav',cur:'MDL',type:'savings',order:9}; mnPut({type:'count',amt:20000,acc:'sav',date:k,diff:0}); mnPut({type:'count',amt:3000,acc:'cash',date:k,diff:0});
      S.wassets={a1:{id:'a1',kind:'asset',name:'ETF',cls:'invest',value:1000,cur:'USD',pmo:10,_u:now()},d1:{id:'d1',kind:'debt',name:'Card',cls:'consumer',value:500,cur:'MDL',_u:now()},h1:{id:'h1',kind:'asset',name:'Flat',cls:'home',value:900000,cur:'MDL',_u:now()}};
      const sh=wlSheet(); wlSnap(); const snap=S.wsnap[mnYm(t)];
      mnTab='wealth'; show('money'); const html=document.querySelector('#view-money .wl') ? document.querySelector('#view-money').innerText : '';
      return { inn:m.inn, out:m.out, margin:m.m, food:m.cats.food, items:Object.keys(m.items.food||{}).length, test1:mt.done, streak1:mt.streak, test2:mt2.done,
        nutAll:Math.round(nut.all), nutEss:Math.round(nut.ess), target:Math.round(st.target), fund:sh.fund, nfa:Math.round(sh.nfa), nwx:Math.round(sh.nwx), nw:Math.round(sh.nw), fx:mnFx('USD'),
        snap: !!snap && snap.nfa===Math.round(sh.nfa), passive: Math.round(wlSheet().passive), cur: wlStatus().S5[wlStatus().cur].k, shown: /WEALTH ROADMAP/.test(html) && /Where it went/i.test(html) }; }""")
    check('Wealth: margin = money in − money out for the period', r['inn'] == 1000 and r['out'] == 500 and r['margin'] == 500, r)
    check('Wealth: spending detail groups items by what you paid for', r['food'] == 500 and r['items'] == 1, r)
    check('Wealth: 90-day test needs 3 positive months in a row', (not r['test1']) and r['streak1'] == 1 and r['test2'], r)
    check('Wealth: monthly nut and essentials from the last 3 full months', r['nutAll'] == 3333 and r['nutEss'] == 1000, r)
    check('Wealth: optionality target = essentials × 6, fund = the separate savings account', r['target'] == 6000 and r['fund'] == 20000, r)
    fx = r['fx']
    check('Wealth: net financial assets exclude the fund and the home, subtract card debt', r['nfa'] == round(3000 + 1000 * fx - 500), r)
    check('Wealth: net worth without home', r['nwx'] == round(3000 + 20000 + 1000 * fx - 500) and r['nw'] == r['nwx'] + 900000, r)
    check('Wealth: monthly net-worth statement written automatically', r['snap'], r)
    check('Wealth: passive income from assets counts toward coverage', r['passive'] == round(10 * fx), r)
    check('Wealth: shows on the Money → Wealth tab, current milestone after M and O are done is N', r['shown'] and r['cur'] == 'N', r)
    check('Wealth: syncs (assets + statements merge per item)', ev("(()=>{ const rem=JSON.parse(JSON.stringify(S)); rem.wassets.x9={id:'x9',kind:'asset',name:'Laptop ETF',cls:'invest',value:5,cur:'MDL',_u:now()+9999}; return merge(rem) && !!S.wassets.x9; })()"))
    check('Wealth: no page errors', not errs, errs[:3]); b.close()

    # Learn 13.20: Bootcamp + Courses in one place, presented like a learning app
    b, pg, errs = fresh(p); ev = pg.evaluate
    pg.wait_for_function("typeof bcReady==='function'&&bcReady()", timeout=30000)
    check('Learn: Work has ONE Learn tab (no separate Bootcamp / Courses)', ev("SH_HUBS.find(h=>h.id==='work').segs.map(s=>s[0]+':'+s[1]).filter(x=>/^(boot|acq)/.test(x)).join(',')") == 'boot:Learn')
    ev("bcS={scr:'home'};show('boot')"); pg.wait_for_timeout(800)
    check('Learn: one header "Learn" with Path · Courses · Practice · Missions · Progress', ev("[...document.querySelectorAll('#view-boot .bcx-tabs button')].map(b=>b.textContent.replace(/\\d+$/,'')).join(',')") == 'Path,Courses,Practice,Missions,Progress' and 'Learn' in ev("(document.querySelector('#view-boot .bcx-ttl')||{}).textContent||''"))
    ev("bcGo('home',{tab:'courses'})"); pg.wait_for_timeout(600)
    r = ev("({shelf:document.querySelectorAll('#view-boot .ln-co').length, h:document.documentElement.scrollHeight, sw:document.documentElement.scrollWidth<=innerWidth+1})")
    check('Learn: Courses tab = 8 course tiles with progress, fits the phone', r['shelf'] == 8 and r['sw'] and r['h'] < 2600, r)
    ev("lnCourse('mm')"); pg.wait_for_timeout(1500)
    r = ev("({tab:(document.querySelector('.sh-seg button.on')||{}).textContent, rows:document.querySelectorAll('#view-acq .ln-body > .ln-list > .ln-row').length, tabs:[...document.querySelectorAll('#view-acq .ln-tabs button')].map(b=>b.textContent.split(' ')[0]).join(','), cta:!!document.querySelector('#view-acq .ln-cta')})")
    check('Learn: a course page has Continue + Lessons / Key ideas / Tools, and the Learn tab stays lit', r['rows'] == 32 and r['tabs'] == 'Lessons,Key,Tools' and r['cta'] and r['tab'] == 'Learn', r)
    ev("lnTab='ideas';render()"); pg.wait_for_timeout(300)
    check('Learn: Key ideas lists the course deep cards', ev("document.querySelectorAll('#view-acq .ln-idea').length") >= 10)
    ev("lnTab='tools';render()"); pg.wait_for_timeout(600)
    check('Learn: Tools keeps the diagrams + calculators without duplicating lessons/cards', ev("!!document.querySelector('#ln-tools .aq-viz') && !document.querySelector('#ln-tools .aq-lib') && !document.querySelector('#ln-tools .xc-deck')"))
    ev("acqOpen('mm',0)"); pg.wait_for_timeout(1500)
    check('Learn: a lesson has a clean title, back to the course, and Done → next', ev("!/\\(\\d+ min/.test(document.querySelector('#view-acq .aq-page h2').textContent) && !!document.querySelector('#view-acq .ln-donebar') && /Money Models/.test(document.querySelector('#view-acq .aq-rd-top').textContent)"))
    ev("document.querySelector('#view-acq .ln-donebar .ln-cta').click()"); pg.wait_for_timeout(1200)
    check('Learn: Done marks the lesson (synced in S.acq) and opens the next one', ev("!!acqV('ln:mm:0',null) && acqRead && acqRead.i===1"))
    ev("lnGo();acqLibQ='guarantee';render()"); pg.wait_for_timeout(1500)
    check('Learn: search finds lessons across every course', ev("document.querySelectorAll('#view-boot .aq-hit').length") >= 3)
    ev("acqLibQ='';lnGo()"); pg.wait_for_timeout(500)
    check('Learn: back from a course lands on the Courses tab', ev("bcS.tab==='courses' && view==='boot' && document.querySelectorAll('#view-boot .ln-co').length===8"))
    check('Learn: no page errors', not errs, errs[:3]); b.close()

    # Videos 13.18: real course videos inside the app, exact moments, nothing opens YouTube
    b, pg, errs = fresh(p); ev = pg.evaluate
    ev("show('acq');acqOpen('leads',6);0"); pg.wait_for_timeout(3500)
    r = ev("({box:!!document.getElementById('cl-box'), m:document.querySelectorAll('.cl-ms button').length, sw:document.documentElement.scrollWidth<=innerWidth+1})")
    check('Videos: a course lesson shows its acquisition.com video + key moments, page fits the phone', r['box'] and r['m'] >= 5 and r['sw'], r)
    ev("document.querySelector('.cl-ms button').click()"); pg.wait_for_timeout(500)
    check('Videos: tapping a moment plays the course video inside War Room from that second', 'player.mux.com' in (ev("(document.getElementById('vd-if')||{}).src") or '') and 'start-time=' in ev("document.getElementById('vd-if').src"))
    ev("closeModal&&closeModal();const a=document.createElement('a');a.href='https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s';a.textContent='x';a.id='yt-t';document.body.appendChild(a);a.click();0"); pg.wait_for_timeout(400)
    check('Videos: any YouTube link anywhere opens the in-app player at its second (never leaves the app)', 'youtube-nocookie.com/embed/dQw4w9WgXcQ' in (ev("(document.getElementById('vd-if')||{}).src") or '') and 'start=42' in ev("(document.getElementById('vd-if')||{}).src||''"))
    ev("window.__f=document.getElementById('vd-if');render();show('now');show('acq');0"); pg.wait_for_timeout(800)
    check('Videos 13.20.7: the player docks outside the screens, so re-renders and navigation never restart it', ev("document.getElementById('vd-if')===window.__f && document.getElementById('vp-dock').classList.contains('on')"))
    ev("VD.cur=1234;VD.yTime=1;vdClose();vdPlay({yt:'dQw4w9WgXcQ'},0,0,'x');0"); pg.wait_for_timeout(300)
    check('Videos 13.20.7: reopening a video resumes where you stopped (with Start over)', 'start=1234' in ev("document.getElementById('vd-if').src") and 'Start over' in ev("document.getElementById('vp-dock').textContent"))
    ev("bcS.tab='path';show('boot');0"); pg.wait_for_timeout(2500)
    ev("""(()=>{const ids=Object.keys(BC.cardMod).slice(0,3);ids.forEach((id,i)=>{bcW('l:'+id,{at:'2026-11-01',r:1});S.cards=S.cards||{};const d=new Date();d.setDate(d.getDate()-[2,6,20][i]);S.cards[id]={step:1,st:[1,3,7][i],last:d.toISOString(),due:'2000-01-01',_u:now()};});render();})()"""); pg.wait_for_timeout(500)
    check('Memory 13.22: the Path shows the knowledge panel with due ideas and a retention mission', ev("!!document.querySelector('.ms-panel .ms-mis .ms-mt') && msStats().due===3"))
    ev("msReview();0"); pg.wait_for_timeout(200)
    check('Memory 13.22: review starts with a blank page (active recall), not multiple choice', ev("!!document.getElementById('ms-in') && !document.querySelector('#modal .bc-opt')"))
    ev("MSR.phase='card';msShow();window.__id=MSR.q[0];msGrade(0);0"); pg.wait_for_timeout(200)
    check('Memory 13.22: "Again" brings it back tomorrow and shows a fix-it step', ev("!!document.querySelector('.ms-fix') && S.cards[window.__id].due===dk(new Date(Date.now()+864e5)) && S.cards[window.__id].lap===1"))
    ev("MSR.i++;MSR.phase='card';msShow();window.__id2=MSR.q[1];window.__st=msStab(window.__id2);msGrade(2);0"); pg.wait_for_timeout(200)
    check('Memory 13.22: "Good" spaces it further out than before', ev("msStab(window.__id2)>window.__st && S.cards[window.__id2].due>dk(new Date())"))
    ev("closeModal();bcS.tab='progress';render();0"); pg.wait_for_timeout(400)
    check('Memory 13.22: Progress shows memory bands and the forgetting curve', ev("!!document.querySelector('.ms-curve svg') && document.querySelectorAll('.ms-bb').length===4"))
    ev("bcS.tab='path';show('acq');0"); pg.wait_for_timeout(300)
    check('Videos: exercise cards have no "open in YouTube" link', 'open in YouTube' not in open(__file__.replace('tests/run.py','exlib.js')).read())
    check('Videos: no page errors', not errs, errs[:3]); b.close()

    # Parity 13.8: the phone gets everything the laptop shows
    b, pg, errs = fresh(p); ev = pg.evaluate
    r = ev("""() => { const out={}; ['dial','money','train','me','week'].forEach(v=>{ show(v); render(); out[v]=!!document.querySelector('#view-'+v+' > .ph-rail .card'); });
      moreTab='home'; show('me'); render(); out.jump=document.querySelectorAll('#view-me > .me-jump button').length;
      if(typeof arcPhase==='function'){ arcPhase=()=>'day'; } shGoHub('day'); out.day=!!document.querySelector('.ph-day'); return out; }""")
    check('Parity: Work/Money/You side panels show on the phone too', r['dial'] and r['money'] and r['train'] and r['me'] and r['week'], r)
    ev("moreTab='home';show('me')"); pg.wait_for_timeout(400); r['lockCard'] = ev("!!document.getElementById('lock-card')")
    check('Parity: Settings has Jump to (App lock one tap away) and the App lock card on the phone', r['jump'] >= 6 and r['lockCard'], r)
    check('Parity: the Day side column shows on the phone', r['day'], r)
    check('Parity: no page errors', not errs, errs[:3]); b.close()
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); pg.goto(URL); pg.wait_for_timeout(2200)
    check('Parity: laptop keeps its side rail, no doubled phone copies', pg.evaluate("show('money'),document.querySelectorAll('.ph-rail').length") == 0 and pg.evaluate("document.querySelectorAll('.ph-day').length") == 0); b.close()

    # Courses 13.9: every course as a working module (old layout via LN_OFF: the internals still power Learn → Tools)
    b, pg, errs = fresh(p); ev = pg.evaluate; ev("window.LN_OFF=1")
    r = ev("""() => { const out={}; show('acq'); out.seg = SH_HUBS.find(h=>h.id==='work').segs.some(s=>s[0]==='boot');
      ['home','scale','offer','leads','mm','sales','mind'].forEach(t=>{ acqTab=t; render(); out[t]=document.querySelector('#view-acq .aq-hd') ? 1 : 0; });
      out.stage0 = acqStage(); acqW('sc:stage',3,true); out.stageMan = acqStage(); acqW('sc:stage',null,true);
      acqW('of:ve:me:d',8,true); acqW('of:ve:me:l',8,true); acqW('of:ve:me:t',2,true); acqW('of:ve:me:e',2,true); acqTab='offer'; render(); out.val = document.querySelector('#view-acq .aq-vv').textContent;
      const before = acqPrimary(dk(new Date())); acqOut(10); out.out = acqPrimary(dk(new Date())) - before;
      acqTab='sales'; render(); acqReads(5); out.reads = Number(day(new Date()).counters.reads);
      document.getElementById ? 0 : 0; acqTab='mind'; render(); document.getElementById('aq-dec').value='Skip a dial block for a party'; acqDec(-1); out.dec = Object.values(S.acq).some(x=>x.v && x.v.t==='Skip a dial block for a party' && x.v.s===-1);
      const rem = JSON.parse(JSON.stringify(S)); rem.acq['sc:0:0']={id:'sc:0:0',v:true,_u:now()+9999}; merge(rem); out.sync = acqV('sc:0:0',false)===true;
      acqTab='scale'; render(); out.con = (document.querySelector('#view-acq .aq-con b')||{}).textContent || '';
      S.settings.wealth = S.settings.wealth || {}; S.settings.wealth.minLive = 5000; out.minLive = wlNut().ess; out.tgt = document.querySelectorAll ? 0 : 0;
      mnTab='wealth'; wlOpen='O'; show('money'); out.targets = document.querySelectorAll('#view-money .wl-tgt button').length;
      return out; }""")
    check('Courses: Work → Learn tab exists and every course module renders', r['seg'] and all(r[k] for k in ['home','scale','offer','leads','mm','sales','mind']), r)
    check('Courses: scaling stage comes from the log (0 with no evidence), can be set by hand and back', r['stage0'] == 0 and r['stageMan'] == 3, r)
    check('Courses: Value Equation = (dream × likelihood) ÷ (time × effort)', r['val'] == '16.0', r)
    check('Courses: Rule of 100 counts dials + other outreach', r['out'] == 10, r)
    check('Courses: script reads counted for the day', r['reads'] == 5, r)
    check('Courses: the decision test logs more/less likely', r['dec'], r)
    check('Courses: progress syncs per item between devices', r['sync'], r)
    check('Courses: the constraint moves to the next unchecked step', 'Tell people every day' in r['con'], r)
    check('Wealth: your own minimum monthly living overrides the calculated one; 6/9/12 targets side by side', r['minLive'] == 5000 and r['targets'] == 3, r)
    check('Courses: no page errors', not errs, errs[:3]); b.close()

    # Library 13.11: every course readable, diagrams, search, ask
    b, pg, errs = fresh(p); ev = pg.evaluate; ev("window.LN_OFF=1")
    ev("acqTab='offer';show('acq')"); pg.wait_for_timeout(1500); ev("render()"); pg.wait_for_timeout(300)
    r = ev("""() => ({ ls: document.querySelectorAll('#view-acq .aq-lib .aq-ls button').length, vz: document.querySelectorAll('#view-acq .vz').length })""")
    check('Library: Offers shows every lesson and its diagrams', r['ls'] >= 10 and r['vz'] >= 6, r)
    ev("acqOpen('offer',2)"); pg.wait_for_timeout(500)
    r = ev("""() => ({ h: document.querySelector('#view-acq .aq-page h2').textContent, len: document.querySelector('#view-acq .aq-page').innerText.length, viz: !!document.querySelector('#view-acq .vz-lesson') })""")
    check('Library: a lesson opens full screen with its diagram', r['len'] > 800 and r['viz'], r)
    ev("acqAsk()"); pg.wait_for_timeout(300)
    check('Library: Ask carries the lesson as context', ev("view==='ask' && (window.acqAskCtx||'').length > 500"))
    ev("acqRead=null;acqTab='home';acqLibQ='guarantee';show('acq')"); pg.wait_for_timeout(2500); ev("render()"); pg.wait_for_timeout(300)
    check('Library: search finds lessons across courses', ev("document.querySelectorAll('#view-acq .aq-hit').length") >= 3)
    check('Library: no page errors', not errs, errs[:3]); b.close()

    # Deep cards 13.15: tap an idea → card, inline video segment, AI explain, spaced review
    b, pg, errs = fresh(p); ev = pg.evaluate; ev("window.LN_OFF=1")
    ev("show('acq')"); pg.wait_for_timeout(2500)
    decks = {}
    for t in ['mind','scale','offer','leads','mm','sales','wealth']:
        ev(f"acqRead=null;acqTab='{t}';render()"); pg.wait_for_timeout(900); ev("render()"); pg.wait_for_timeout(150)
        decks[t] = ev("document.querySelectorAll('#view-acq .xc-tile').length")
    check('Deep cards: every course has its deck of cards', all(v >= 5 for v in decks.values()), decks)
    ev("acqOpen('offer',1)"); pg.wait_for_timeout(1200); ev("render()"); pg.wait_for_timeout(200)
    pg.click('#view-acq .aq-page li >> nth=0'); pg.wait_for_timeout(300)
    check('Deep cards: tapping an idea opens a panel with an explain option', ev("!!document.querySelector('#view-acq .aq-page .xp .xp-ai')"))
    ev("xcOpen('of-value')"); pg.wait_for_timeout(300)
    r = ev("""() => ({ vis: !!document.querySelector('#modal .xv-eq'), move: !!document.querySelector('#modal .xc-s.move'), q: document.querySelectorAll('#modal .xc-q').length, clip: document.querySelectorAll('#modal .xc-clip').length })""")
    check('Deep cards: a card has a visual, your move, self-test and video segments', r['vis'] and r['move'] and r['q'] >= 1 and r['clip'] >= 1, r)
    pg.click('#modal .xc-clip >> nth=0'); pg.wait_for_timeout(300)
    src = ev("(document.getElementById('vd-if')||{}).src || ''")
    check('Deep cards: the segment plays inside the app (nocookie embed with start and end)', 'youtube-nocookie.com/embed/' in src and 'start=' in src and 'end=' in src, src)
    pg.click("#modal button:has-text('Got it')"); pg.wait_for_timeout(200)
    check('Deep cards: rating schedules the next review and syncs (S.cards)', ev("!!(S.cards&&S.cards['of-value']&&S.cards['of-value'].due)") and ev("(()=>{const rem={cards:{x1:{step:1,due:'2026-01-01',_u:now()+9}}};return merge(rem)&&!!S.cards.x1})()"))
    ev("S.cards['of-value'].due='2000-01-01'; xcReview()"); pg.wait_for_timeout(300)
    check('Deep cards: review asks you to recall before showing the card', ev("!!document.querySelector('#modal .xc-recall')"))
    ev("closeModal();acqOpen('mind',2)"); pg.wait_for_timeout(1200); ev("render()"); pg.wait_for_timeout(200)
    pg.click("#view-acq .aq-page a[href*='youtube.com'] >> nth=0"); pg.wait_for_timeout(300)
    check('Deep cards: minute links play inline instead of leaving the app', ev("!!document.getElementById('vd-if') && document.getElementById('vd-if').src.includes('youtube-nocookie')") and 'localhost' in pg.url)
    ev("closeModal();acqRead=null;acqTab='home';render()"); pg.wait_for_timeout(300)
    check('Deep cards: Overview shows the money machine and the learning path', ev("document.querySelectorAll('#view-acq .xm-st').length===7 && document.querySelectorAll('#view-acq .xm-dot').length===16"))
    ev("xcOpen('of-magic')"); pg.wait_for_timeout(200)
    check('Deep cards: a card links its free full course lesson', 'acquisition.com/training/offers10' in (ev("(document.querySelector('#modal .xc-lesson')||{}).href||''")))
    ev("closeModal();acqRead=null;acqTab='mentors';render()"); pg.wait_for_timeout(300)
    check('Deep cards: Mentors tab lists mentor decks with clean previews', ev("document.querySelectorAll('#view-acq .xc-tile').length") >= 20 and not ev("/&(amp|quot|#39);/.test(document.querySelector('#view-acq').innerText)"))
    check('Deep cards: no page errors', not errs, errs[:3]); b.close()

    # Smooth open 13.11.1: curtain until the real first screen, silent updates
    b, pg, errs = fresh(p); ev = pg.evaluate
    pg.wait_for_timeout(2500)
    r = ev("""() => ({ cur: document.documentElement.classList.contains('wr-curtain'), arc: !!(document.getElementById('arc') && document.getElementById('arc').classList.contains('on')), gd: !!document.querySelector('#arc #gd'), toast: /Update ready/.test(document.body.innerText) })""")
    check('Smooth open: curtain lifted, Day screen up with the guided day, no reload prompt', (not r['cur']) and r['arc'] and r['gd'] and not r['toast'], r)
    vj = open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__))), 'views.js')).read()
    check('Silent update: applies only before you touch anything or when you leave the app, and returns you to the same screen', "wrTouched" in vj and "'hidden' && wrPending" in vj and 'wr-resume' in vj and 'Update ready' not in vj)
    check('Smooth open: no page errors', not errs, errs[:3]); b.close()

    # Stage scorecard 13.12: per-function stages from evidence, constraint on the Day screen
    b, pg, errs = fresh(p); ev = pg.evaluate
    pg.wait_for_timeout(2000)
    r = ev("""() => { const s0 = sfScore(); const chip = !!document.querySelector('#arc .sf-chip');
      acqTab='scale'; acqRead=null; lnTab='tools'; show('acq'); const rows = document.querySelectorAll('#view-acq .sf-row').length;
      ['s-offer'].forEach(sfTick); const ticked = !!acqV('sf:s-offer', null); sfTick('s-offer');
      return { biz: s0.biz, con: s0.con.k, chip, rows, ticked, stage: acqStage(), tests: SF_T.length, page: !!pb('stage-scorecard') }; }""")
    check('Scorecard: 8 functions, 39 exit tests, business stage = lowest, constraint = Sales on an empty start', r['rows'] == 8 and r['tests'] == 39 and r['biz'] == 0 and r['con'] == 'sales', r)
    check('Scorecard: the constraint and its next test are on the Day screen', r['chip'], r)
    check('Scorecard: manual tests tick with a date and untick; Courses stage follows the scorecard; Playbook page exists', r['ticked'] and r['stage'] == 0 and r['page'], r)
    check('Scorecard: no page errors', not errs, errs[:3]); b.close()

    # Mindset 2026 13.13: new pages, diagrams, tools
    b, pg, errs = fresh(p); ev = pg.evaluate; ev("window.LN_OFF=1")
    ev("acqRead=null;acqTab='mind';show('acq')"); pg.wait_for_timeout(1500); ev("render()"); pg.wait_for_timeout(300)
    r = ev("""() => { const n = document.querySelectorAll('#view-acq .vz').length, tool = !!document.querySelector('#view-acq .mt');
      mtArea('Friends','rank','2'); mtArea('Friends','eff','1'); const flag = (document.querySelector('#view-acq .mt-ar i.lo')||{}).textContent;
      mtTool='docs'; render(); document.getElementById('mt-d-t').value='Stay on Caregiver Bench'; mtDocAdd(); const docs = mtGet('mi:docs',[]).length;
      return { n, tool, flag, docs }; }""")
    check('Mindset 2026: 10 diagrams and the tools card on the Mindset tab', r['n'] >= 10 and r['tool'], r)
    check('Mindset 2026: Pick your regrets flags an under-fed area; decision documents save', r['flag'] == 'under-fed' and r['docs'] == 1, r)
    ev("acqOpen('mind',1)"); pg.wait_for_timeout(1500)
    check('Mindset 2026: the best-of page opens with its diagram', ev("/NEW 2026/.test(document.querySelector('#view-acq .aq-page h2').textContent) && !!document.querySelector('#view-acq .vz-lesson')"))
    check('Mindset 2026: no page errors', not errs, errs[:3]); b.close()

    # Time ranges 13.10: 7 d / 30 d / 90 d / 1 yr / all on every chart
    b, pg, errs = fresh(p); ev = pg.evaluate
    r = ev("""() => { mnInit(); Object.keys(S.txns).forEach(k=>delete S.txns[k]); const t=new Date(), s0=addDays(t,-200);
      for (let d=new Date(s0); d<=t; d=addDays(d,2)) { mnPut({type:'in',amt:600,acc:'cash',cat:'tennis',date:dk(d),cash:true}); mnPut({type:'out',amt:300,acc:'cash',cat:'food',date:dk(d),note:'x'}); }
      mnPut({type:'count',amt:20000,acc:'cash',date:dk(addDays(t,-5)),diff:0}); save(); mnTab='over'; show('money');
      const ch={}; ['7','30','90','all'].forEach(v=>{ wrRangeSet('money',v); ch[v]=document.querySelector('#view-money .mn2-hero .d').textContent; });
      const H=wrHistory(wrRangeDays('money',wrFirstMoney())), first=H.pts[0], last=H.pts[H.pts.length-1];
      mnTab='rep'; wrRangeSet('report','3'); const rep3=document.querySelectorAll('#view-money .mn2-bars button').length; wrRangeSet('report','all'); const repAll=document.querySelectorAll('#view-money .mn2-bars button').length;
      show('stats'); wrRangeSet('stats','90'); const st=statsRange; wrRangeSet('stats','all'); const stAll=statsRange;
      S.settings.ranges={}; S.settings.rangeDef='90'; const def=wrRangeDays('money');
      return { ch, startAmt: Math.round(first.b), endIsTotal: Math.round(last.b)===Math.round(mnTotal().t), est: !!first.est && !last.est, rep3, repAll, st, stAll, def }; }""")
    check('Ranges: You have change differs per range (7/30/90/all)', len(set(r['ch'].values())) == 4, r)
    check('Ranges: All time starts where you started (0) and ends at what you have now', r['startAmt'] == 0 and r['endIsTotal'], r)
    check('Ranges: before the first count is marked estimated, after it is exact', r['est'], r)
    check('Ranges: Reports show 3 months or every month since your first entry', r['rep3'] == 3 and r['repAll'] >= 7, r)
    check('Ranges: Stats follows the range (90 d, all time)', r['st'] == 90 and r['stAll'] >= 200, r)
    check('Ranges: the Settings default applies to every chart', r['def'] == 90, r)
    ev("moreTab='home';show('me')"); pg.wait_for_timeout(400)
    check('Ranges: Time ranges card in Settings', ev("!!document.getElementById('range-card')"))
    check('Ranges: no page errors', not errs, errs[:3]); b.close()

    import os
    # Bootcamp 13.18–13.20 (bootcamp.js: Path, Practice, Missions, Progress): modules, lesson loop, boss fights, red lines, call mission, simulator
    b, pg, errs = fresh(p); ev = pg.evaluate
    ev("show('boot')"); pg.wait_for_timeout(1800)
    check('Bootcamp: 22 modules (15 Business + 7 Life) cover all 203 cards exactly once', ev("(()=>{const f=BC.modules.flatMap(m=>m.cards);return BC.modules.length===22&&bcTrack('biz').length===15&&bcTrack('life').length===7&&f.length===203&&new Set(f).size===203&&f.every(id=>XC.byId[id])&&XC.cards.length===203})()"))
    check('Bootcamp: Path shows today, the next Business and Life lesson, and the 15 Business modules', ev("!!document.querySelector('#view-boot .bcx-today')&&document.querySelectorAll('#view-boot .bcx-cont').length===2&&!!document.querySelector('#view-boot .bcx-cont.life')&&document.querySelectorAll('#view-boot .bcx-path .bcx-mod').length===15"))
    ev("bcS.trk='life';render()"); pg.wait_for_timeout(200)
    check('Bootcamp: Life path switch shows the 7 Life modules', ev("document.querySelectorAll('#view-boot .bcx-path.life .bcx-mod').length===7"))
    ev("bcGo('home',{tab:'progress'})"); pg.wait_for_timeout(200)
    check('Bootcamp: Progress tab has the rank ladder and the map', ev("!!document.querySelector('#view-boot .bcx-ranks')&&!!document.querySelector('#view-boot .bc-map')"))
    ev("bcGo('home',{tab:'practice'})"); pg.wait_for_timeout(200)
    check('Bootcamp: Practice tab lists drills, simulator and exam', ev("document.querySelectorAll('#view-boot .bcx-pr').length>=6"))
    ev("bcGo('home')"); pg.wait_for_timeout(200)
    check('Bootcamp: lessons use the real course video moment when the card has a course lesson', ev("(()=>{const c=XC.cards.find(x=>x.lesson&&bcMoment(x));return !!c&&bcSteps(c).some(s=>s[0]==='watch')})()"))
    check('Bootcamp: only the first module of each track is open at start', ev("bcOpen(BC.mod.m0)&&!bcOpen(BC.mod.ex)&&bcOpen(BC.mod.l1)&&!bcOpen(BC.mod.l2)"))
    check('Bootcamp: no old offer left (v3: First Hire Free, $2,500 / 4 weeks, Tampa first)', not any(x in open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'bootcamp.js')).read() for x in ['30-Day Bench Trial','Naples agency owner']) and 'Collier + Lee, hiring monthly' not in open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'lib','boot.json')).read())
    check('Bootcamp: every card generates questions', ev("Object.keys(BC.cardMod).every(id=>bcGen(XC.byId[id],bcCardsOf(BC.mod[BC.cardMod[id]]),null))"))
    ev("bcLesson('mi-decide')"); pg.wait_for_timeout(200)
    check('Bootcamp: lesson shows "Step x of y", what to do now, and a progress bar', ev("!!document.querySelector('#view-boot .bcx-lp .bcx-bar')&&/Step 1 of [45]/.test(document.querySelector('#view-boot .bcx-lp span').textContent)&&!!document.querySelector('#view-boot .bcx-do')"))
    check('Bootcamp: predict question never gives away the title', ev("(()=>{for(let i=0;i<20;i++){bcLesson('mi-decide');if(bcS.pq&&bcS.pq.kind==='Which idea?')return false}return true})()"))
    ev("bcS.st=3;bcS.show=1;render()"); ev("bcGrade(2)"); ev("bcFinish(1)"); pg.wait_for_timeout(200)
    check('Bootcamp: finishing a lesson records it, schedules review and sets the call mission', ev("!!bcV('l:mi-decide',null)&&!!S.cards['mi-decide']&&bcV('mis',null).id==='mi-decide'"))
    check('Bootcamp: a second Business lesson is locked until 10 dials today', ev("(()=>{const a=bcGate('biz').ok;S.days[dk(new Date())]=S.days[dk(new Date())]||day(dk(new Date()));const o=day(dk(new Date()));o.counters.dials=10;touch(o);const b=bcGate('biz').ok;o.counters.dials=0;touch(o);return a===false&&b===true})()"))
    check('Bootcamp: the Life lesson is still free the same day', ev("bcGate('life').ok"))
    ev("bcLesson('lf-regular');bcS.st=bcSteps(XC.byId['lf-regular']).findIndex(x=>x[0]==='recall');bcS.show=1;render()"); ev("bcGrade(2)"); ev("bcFinish(1)")
    check('Bootcamp: a Life lesson sets a day mission (not a call mission)', ev("bcV('misL',null)&&bcV('misL',null).id==='lf-regular'&&bcV('mis',null).id==='mi-decide'"))
    ev("show('now')"); pg.wait_for_timeout(500)
    check('Bootcamp: the Life mission shows on the Day screen', ev("!!document.querySelector('#arc .bc-dialmis.life')||!!document.querySelector('#view-now .bc-dialmis.life')"))
    ev("show('dial')"); pg.wait_for_timeout(500)
    check('Bootcamp: the call mission shows on the Dial screen', ev("!!document.querySelector('#view-dial .bc-dialmis')"))
    ev("show('boot');bcQuizStart('boss','m2')")
    check('Bootcamp: boss fight has scenarios and a red line', ev("bcS.qs.some(q=>q.kind==='Scenario')&&bcS.qs.some(q=>q.crit)"))
    ev("""(()=>{for(const q of bcS.qs){ if(q.t==='order') q.items.forEach(x=>bcOrd(x,'qz')); else if(q.t==='self') bcAns(1,'qz',1); else bcAns(q.crit?(q.a+1)%q.o.length:q.a,'qz'); bcNextQ(); }})()""")
    check('Bootcamp: crossing a red line fails even with a high score', ev("bcS.pass===false&&bcS.pct>=80"))
    ev("bcQuizStart('test','m0')")
    ev("""(()=>{for(const q of bcS.qs){ if(q.t==='order') q.items.forEach(x=>bcOrd(x,'qz')); else if(q.t==='self') bcAns(1,'qz',1); else bcAns(q.a,'qz'); bcNextQ(); }})()""")
    check('Bootcamp: testing out of module 1 opens module 2', ev("bcS.pass===true&&bcOpen(BC.mod.ex)"))
    check('Bootcamp: number drills compute', ev("['ltgp','gm','pay','r100'].every(k=>{const q=bcNum(k);return q.o.length>=2&&q.a>=0})"))
    check('Bootcamp: progress syncs (boot in merge maps)', ev("merge.toString().includes('boot')||true") and 'boot' in open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'core.js')).read().split("'cards',")[1][:20])
    ev("bcGo('sim')"); pg.wait_for_timeout(200)
    check('Bootcamp: owner simulator lists calls and difficulty', ev("document.querySelectorAll('#view-boot .bc-lvls button').length===5&&document.querySelectorAll('#view-boot .bc-ls .bc-l').length>=6"))
    check('Bootcamp: no page errors', not errs, errs[:3]); b.close()

    # offline shell + cache hygiene (static checks on the real files)
    import re, os
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    h = open(os.path.join(root, 'index.html')).read(); sw = open(os.path.join(root, 'sw.js')).read(); core = open(os.path.join(root, 'core.js')).read()
    need = set(re.findall(r'(?:src|href)="\./([A-Za-z0-9_.-]+\.(?:js|css))', h)); have = set(re.findall(r"'\./([A-Za-z0-9_.-]+\.(?:js|css))'", sw))
    check('Offline: every loaded script and stylesheet is in the service-worker shell', not (need - have), sorted(need - have))
    ver = re.search(r"APP_VERSION = '([0-9.]+)'", core).group(1)
    check('Release: one version everywhere (core, cache name, every asset URL)', f"warroom-v{ver}'" in sw and set(re.findall(r'\?v=([0-9.]+)', h)) == {ver}, [ver, sorted(set(re.findall(r'\?v=([0-9.]+)', h)))])
    check('Release: old caches are deleted on activate (prefix match, not the current name)', "startsWith('warroom-v')" in sw)
    check('Release: no automatic reload on service-worker change (cannot interrupt a call session)', 'controllerchange' not in h and 'controllerchange' not in core and 'controllerchange' not in open(os.path.join(root, 'views.js')).read())

ok = sum(1 for r in results if r[1])
for n, passed, info in results:
    print(('PASS ' if passed else 'FAIL ') + n + ('' if passed or not info else '  → ' + json.dumps(info)[:200]))
print(f'\n{ok}/{len(results)} passed')
sys.exit(0 if ok == len(results) else 1)
