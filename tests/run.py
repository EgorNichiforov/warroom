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

    # ── Every screen renders without errors ──
    for v in ['now', 'dial', 'train', 'food', 'stats', 'plan', 'me']:
        try: pg.evaluate(f"show('{v}')"); pg.wait_for_timeout(150)
        except Exception as e: errs.append(v + ': ' + str(e)[:120])
    pg.evaluate("moreTab='home';show('me')"); pg.wait_for_timeout(200)
    check('System status card renders', 'System status' in pg.inner_text('body'))
    check('No page errors', not errs, errs[:3])
    b.close()

ok = sum(1 for r in results if r[1])
for n, passed, info in results:
    print(('PASS ' if passed else 'FAIL ') + n + ('' if passed or not info else '  → ' + json.dumps(info)[:200]))
print(f'\n{ok}/{len(results)} passed')
sys.exit(0 if ok == len(results) else 1)
