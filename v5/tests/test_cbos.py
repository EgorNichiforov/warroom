"""Bench OS (15.8.0) browser tests. Fake cb_api server; nothing touches real data.
Run: cd v5 && python3 -m http.server 8765 &  then  python3 tests/test_cbos.py"""
import json, os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('WR_URL', 'http://localhost:8765/index.html')
_CH = {'executable_path': '/usr/bin/google-chrome', 'args': ['--no-sandbox']} if os.path.exists('/usr/bin/google-chrome') and not os.path.isdir(os.path.expanduser('~/.cache/ms-playwright')) else {}
res = []
def check(n, c, info=''): res.append((n, bool(c), info))

STATE = {'now': {'active_available_candidates': 0, 'open_job_orders': 0, 'cases_at_risk': 0, 'overdue_actions': 0, 'paying_customers': 0, 'launch_gates_pending': 6},
         'gates': [{'key': 'phone_provider_approved', 'label': 'Phone line approved', 'status': 'pending'}], 'calling_open': False,
         'at_risk': [], 'overdue': [], 'sales': [{'id': 'a1', 'name': 'Test Agency', 'town_area': 'Tampa', 'stage': 'identified', 'score': 15, 'next_best_action': 'Research', 'call_attempts': 0}],
         'candidates': [{'id': 'c1', 'full_name': 'Cand One', 'town': 'Naples', 'stage': 'applicant', 'action': 'First contact'}], 'active': [], 'jobs': [], 'interviews': [], 'shifts': [],
         'invoices': [], 'cash': {'collected_cents': 0, 'receivables_cents': 0, 'invoiced_cents': 0, 'contracted_cycle_fees_cents': 0, 'costs_cents': 0, 'ad_spend_cents': 0},
         'today': {}, 'week': {}, 'retention': {}, 'team': [{'id': 't1', 'name': 'Egor', 'role': 'founder'}],
         'counts': {'agencies': 964, 'target': 828, 'core_target': 474, 'researched': 0, 'dm_named': 0, 'dm_conversations_total': 0, 'active_core': 0, 'ad_spend_cents': 0, 'web_applications_waiting': 0}}
calls = []
mode = {'open': False, 'refuse': ''}

def handler(route):
    body = json.loads(route.request.post_data or '{}'); a = body.get('p_action'); calls.append(body)
    if a == 'state':
        st = dict(STATE); st['calling_open'] = mode['open']
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'data': st}))
    if a == 'log_call':
        if mode['refuse']: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'error': mode['refuse']}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'data': {'id': 'oa-1'}}))
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'data': None}))

with sync_playwright() as p:
    b = p.chromium.launch(**_CH); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/rest/v1/warroom_sync**', lambda r: r.abort())
    ctx.route('**/rest/v1/rpc/cb_api', handler)
    ctx.route('**/rest/v1/rpc/warroom_*', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    ctx.add_init_script('window.CP_NOLATE=1')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2500)
    check('loads with no page errors', not errs, errs[:3])
    check('app version 15.9.0', pg.evaluate('APP_VERSION') == '15.9.0')
    pg.evaluate("""() => { S.settings.sync = Object.assign({}, S.settings.sync || {}, { url: 'https://fake.supabase.co', key: 'k', code: 'test-code-1234567890' }); }""")
    pg.evaluate('cbLoad(true)'); pg.wait_for_timeout(600)
    check('state loaded through cb_api', pg.evaluate('!!(CB && CB.counts && CB.counts.agencies === 964)'))
    pg.evaluate("show('dial')"); pg.wait_for_timeout(300)
    check('Ops shows the locked banner', 'calling locked' in (pg.inner_text('#cb-banner-slot') or '').lower())
    r = pg.evaluate("""() => { Q = Q || { items: {} }; Q.items[901] = { id: 901, agency: 'Lock Test', city: 'Tampa', phone: '(813) 555-0101', status: 'new', attempts: 0, log: [] };
        const o = day(new Date()); const d0 = Number(o.counters.dials) || 0; outcome(901, 'noanswer'); offListDial(); return { d0, d1: Number(day(new Date()).counters.dials) || 0, logs: Q.items[901].log.length }; }""")
    check('locked: no dial counted, nothing logged', r['d0'] == r['d1'] and r['logs'] == 0, r)
    check('locked: skip still allowed', pg.evaluate("() => { outcome(901, 'skip'); return (Q.items[901]._skip || 0) >= 1; }"))
    # open calling + force Tampa clock inside the window
    mode['open'] = True; pg.evaluate('cbLoad(true)'); pg.wait_for_timeout(500); pg.evaluate('window.cbEtMin = () => 10 * 60')
    r = pg.evaluate("""async () => { outGuard = { id: 0, at: 0 }; const d0 = Number(day(new Date()).counters.dials) || 0; outcome(901, 'noanswer');
        await new Promise((ok) => setTimeout(ok, 800)); const x = Q.items[901]; return { d0, d1: Number(day(new Date()).counters.dials) || 0, cb: x.log.length ? x.log[x.log.length - 1].cb : null }; }""")
    check('open: dial counted and sent to cb', r['d1'] == r['d0'] + 1 and r['cb'] == 'oa-1', r)
    sent = [c for c in calls if c.get('p_action') == 'log_call']
    check('log_call carries phone + disposition', bool(sent) and sent[-1]['p_args'].get('disposition') == 'no_answer' and '555' in sent[-1]['p_args'].get('phone', ''), sent[-1:] )
    mode['refuse'] = 'Max 3 calls to this number in 24 hours reached'
    r = pg.evaluate("""async () => { outGuard = { id: 0, at: 0 }; const n0 = Q.items[901].log.length, d0 = Number(day(new Date()).counters.dials) || 0; outcome(901, 'voicemail');
        await new Promise((ok) => setTimeout(ok, 800)); return { n0, n1: Q.items[901].log.length, d0, d1: Number(day(new Date()).counters.dials) || 0 }; }""")
    check('refused by cb: call undone, dial taken back', r['n1'] == r['n0'] and r['d1'] == r['d0'], r)
    mode['refuse'] = ''
    r = pg.evaluate("""() => { undoEntry(901, Q.items[901].log[Q.items[901].log.length - 1].at, true); return true; }"""); pg.wait_for_timeout(400)
    check('undo voids the cb call', any(c.get('p_action') == 'void_call' and c['p_args'].get('id') == 'oa-1' for c in calls))
    m = pg.evaluate("""() => [cbDisposition('No answer'), cbDisposition('Voicemail left'), cbDisposition('Gatekeeper: Maria'), cbDisposition('Gatekeeper'),
        cbDisposition('OWNER TALK → booked', '', true), cbDisposition('OWNER TALK → callback', '', true), cbDisposition('OWNER TALK → no', 'we use Indeed', true)].map((d) => d.disposition + (d.substantive ? '+' : ''))""")
    check('disposition mapping', m == ['no_answer', 'voicemail', 'gatekeeper_dm_named', 'gatekeeper_blocked', 'dm_conversation+', 'dm_reached_not_now', 'not_interested+'], m)
    t = pg.evaluate("[cbEtIso('2026-12-01 10:00'), cbEtIso('2027-07-01 10:00')]")
    check('Tampa time → UTC with EST/EDT', t == ['2026-12-01T15:00:00.000Z', '2027-07-01T14:00:00.000Z'], t)
    for tab in ['today', 'sales', 'cands', 'cases', 'money', 'gates']:
        pg.evaluate(f"cbTab='{tab}'; show('cbos')"); pg.wait_for_timeout(150)
        txt = pg.inner_text('#view-cbos') if pg.query_selector('#view-cbos') else ''
        check(f'Bench OS tab {tab} renders', 'bench os' in txt.lower() and len(txt) > 60, txt[:80])
    check('Today shows the 20-conversation gate', '0 / 20' in pg.evaluate("cbTab='today'; show('cbos'); document.getElementById('view-cbos').innerText"))
    check('no page errors after all flows', not errs, errs[:3])
    b.close()

ok = sum(1 for _, c, _ in res if c)
for n, c, i in res: print(('PASS ' if c else 'FAIL ') + n + ('' if c else f'  {i}'))
print(f'{ok}/{len(res)} passed'); sys.exit(0 if ok == len(res) else 1)
