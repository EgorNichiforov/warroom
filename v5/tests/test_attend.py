"""Attendance hub (15.9.0) browser tests. Fake calendar + fake records; nothing touches real data.
Run: cd v5 && python3 -m http.server 8765 &  then  python3 tests/test_attend.py"""
import json, os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('WR_URL', 'http://localhost:8765/index.html')
SHOTS = os.environ.get('WR_SHOTS', '')
_CH = {'executable_path': '/usr/bin/google-chrome', 'args': ['--no-sandbox']} if os.path.exists('/usr/bin/google-chrome') and not os.path.isdir(os.path.expanduser('~/.cache/ms-playwright')) else {}
res = []
def check(n, c, info=''): res.append((n, bool(c), info))

SETUP = """() => {
  const t = new Date(), k0 = dk(t), k1 = dk(addDays(t, -1)), k2 = dk(addDays(t, -2)), k20 = dk(addDays(t, -20));
  S.settings.calUrl = 'https://calendar.google.com/calendar/ical/test%40x.com/private-abc/basic.ics'; S.settings.schedSource = 'calendar';
  CAL = { at: new Date().toISOString(), from: addDays(t, -7).toISOString(), to: addDays(t, 28).toISOString(), events: [
    { uid: 'g1_' + k0, date: k0, s: '00:01', e: '00:02', title: '🟢 Grupa Green', desc: '☐ Ana Pop\\n☐ Ion Rusu\\n☐ Max Botica (vine doar sâmbăta)' },
    { uid: 'o1_' + k0, date: k0, s: '23:58', e: '23:59', title: '🟠 Grupa Orange', desc: '☐ Dan\\n☐ Eva' },
    { uid: 'g1_' + k1, date: k1, s: '19:00', e: '20:00', title: '🟢 Grupa Green', desc: '☐ Ana Pop\\n☐ Ion Rusu\\n☐ Max Botica (vine doar sâmbăta)' },
    { uid: 'r1_' + k2, date: k2, s: '18:00', e: '19:00', title: '🔴 Grupa Red 1', desc: '☐ Kid A\\n☐ Kid B' } ] };
  const o = day(k2); o.att = { ['cal:r1_' + k2]: { group: 'Grupa Red 1', date: k2, at: now(), kids: { 'Kid A': 1, 'Kid B': 0 } } }; touch(o);
  return { k0, k1, k2, k20 };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(**_CH); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.route('**/rest/v1/**', lambda r: r.abort()); ctx.route('**/functions/v1/**', lambda r: r.abort())
    ctx.add_init_script('window.CP_NOLATE=1')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2500)
    check('loads with no page errors', not errs, errs[:3])
    check('app version 15.9.0', pg.evaluate('APP_VERSION') == '15.9.0')
    K = pg.evaluate(SETUP)
    pg.evaluate("typeof arcShow==='function'&&arcShow(); typeof arcRender==='function'&&arcRender()"); pg.wait_for_timeout(300)
    check('Day screen shows the 🎾 door', pg.evaluate("!!document.querySelector('#arc .at-door')"))
    miss = pg.evaluate('atMissing().map(m => m.L.title + "@" + m.k)')
    check('missing = today Green (ended) + yesterday Green, not later Orange, not saved Red', sorted(miss) == sorted(['Grupa Green@' + K['k0'], 'Grupa Green@' + K['k1']]), miss)
    check('door badge shows 2', '2' in pg.evaluate("(document.querySelector('#arc .at-door i')||{}).textContent||''"))
    check('+ sheet has Attendance', pg.evaluate("SH_QUICK.some(q => q[0]==='Attendance')"))

    pg.evaluate('atOpen()'); pg.wait_for_timeout(300)
    check('hub opens on the oldest unmarked day', pg.evaluate('AT.k') == K['k1'], pg.evaluate('AT.k'))
    if SHOTS: pg.screenshot(path=SHOTS + '/at_1_mark.png')
    # mark yesterday: Ana + Max present
    pg.evaluate(f"atEdit('{K['k1']}', 'cal:g1_{K['k1']}')"); pg.wait_for_timeout(100)
    pg.evaluate(f"atTog('cal:g1_{K['k1']}', 0); atTog('cal:g1_{K['k1']}', 2)")
    if SHOTS: pg.screenshot(path=SHOTS + '/at_2_edit.png')
    pg.evaluate(f"atSave('{K['k1']}', 'cal:g1_{K['k1']}')"); pg.wait_for_timeout(100)
    a = pg.evaluate(f"S.days['{K['k1']}'].att['cal:g1_{K['k1']}']")
    check('earlier day saved in the guided-day format', a and a['kids'] == {'Ana Pop': 1, 'Ion Rusu': 0, 'Max Botica (vine doar sâmbăta)': 1} and a['group'] == 'Grupa Green' and a['late'] == 1, a)
    check('block marked done for that day', pg.evaluate(f"S.days['{K['k1']}'].blk['cal:g1_{K['k1']}']") == 'done')
    check('missing drops to 1', pg.evaluate('atMissing().length') == 1)

    # add a kid + all present today
    pg.evaluate(f"atGoDay('{K['k0']}'); atEdit('{K['k0']}', 'cal:g1_{K['k0']}')"); pg.wait_for_timeout(100)
    pg.fill('#at-nk-cal_g1_' + K['k0'], 'New Kid'); pg.evaluate(f"atAddKid('cal:g1_{K['k0']}')")
    pg.evaluate(f"atAll('cal:g1_{K['k0']}', 1); atSave('{K['k0']}', 'cal:g1_{K['k0']}')"); pg.wait_for_timeout(100)
    a = pg.evaluate(f"S.days['{K['k0']}'].att['cal:g1_{K['k0']}']")
    check('added kid saved, all present', a and len(a['kids']) == 4 and all(v == 1 for v in a['kids'].values()) and 'New Kid' in a['kids'], a)
    check('guided day sees it as done', pg.evaluate(f"(gdSteps().find(s => s.id==='cal:g1_{K['k0']}')||{{}}).st") == 'done')

    # day report
    pg.evaluate("AT.tab='rep'; AT.rep='day'; atRender()"); pg.wait_for_timeout(100)
    txt = pg.evaluate('atReportText()')
    check('day report: Romanian greeting + group + count', ('Bună seara' in txt or 'Bună ziua' in txt) and '🟢 Grupa Green (00:01) — 4/4' in txt, txt)
    check('day report: unmarked later lesson is flagged, not hidden', 'Grupa Orange (23:58) — prezența încă nu e completată' in txt, txt)
    check('report has Copy button + textarea', pg.evaluate("!!document.getElementById('at-txt') && [...document.querySelectorAll('#at-root .at-btn')].some(b=>b.textContent.trim()==='Copy')"))
    if SHOTS: pg.screenshot(path=SHOTS + '/at_3_report.png')
    pg.evaluate(f"AT.k='{K['k1']}'; atRender()"); txt1 = pg.evaluate('atReportText()')
    check('report strips roster notes in brackets', '✅ Max Botica\n' in txt1 + '\n' and '(vine' not in txt1 and '❌ Ion Rusu' in txt1, txt1)
    # month
    pg.evaluate("AT.rep='month'; atRender()"); m = pg.evaluate('atReportText()')
    check('month report counts held lessons per group', 'Grupa Green — ' in m and 'Total:' in m and 'Raportul lecțiilor de grup' in m, m)
    pg.evaluate("AT.rep='week'; atRender()"); w = pg.evaluate('atReportText()')
    check('week report has per-kid counts', 'Ana Pop 2/2' in w or 'Ana Pop' in w, w)

    # cancel + clear + undo
    pg.evaluate("window.confirm = () => true")
    pg.evaluate(f"AT.tab='mark'; atGoDay('{K['k0']}'); atCancelLesson('{K['k0']}', 'cal:o1_{K['k0']}')")
    check('lesson can be marked as not held', pg.evaluate(f"S.days['{K['k0']}'].att['cal:o1_{K['k0']}'].cancel") == 1)
    pg.evaluate(f"atClear('{K['k0']}', 'cal:o1_{K['k0']}')")
    check('clear removes it', pg.evaluate(f"!S.days['{K['k0']}'].att['cal:o1_{K['k0']}']"))

    # older than the calendar: add by hand from known groups, with the last roster
    pg.evaluate(f"atGoDay('{K['k20']}')"); n0 = pg.evaluate(f"atLessons('{K['k20']}').length")
    check('old day: no guessed lessons from the stale plan', n0 == 0, n0)
    pg.evaluate("AT.addOpen=true; atRender()")
    gi = pg.evaluate("atGroups().findIndex(g => g.key==='red 1')")
    pg.evaluate(f"atAddLesson({gi})"); pg.wait_for_timeout(100)
    if SHOTS: pg.screenshot(path=SHOTS + '/at_4_old.png')
    mid = pg.evaluate(f"atLessons('{K['k20']}')[0].id")
    pg.evaluate(f"atTog('{mid}', 0); atSave('{K['k20']}', '{mid}')")
    a = pg.evaluate(f"S.days['{K['k20']}'].att['{mid}']")
    check('old day saved with last known roster', a and a['kids'] == {'Kid A': 1, 'Kid B': 0}, a)
    check('it shows after reopening', pg.evaluate(f"atLessons('{K['k20']}').length") == 1)

    pg.evaluate("AT.tab='kids'; AT.per='all'; atRender()"); pg.wait_for_timeout(100)
    check('kids tab renders bars', pg.evaluate("document.querySelectorAll('#at-root .at-kr').length") >= 5)
    if SHOTS: pg.screenshot(path=SHOTS + '/at_5_kids.png', full_page=True)

    # desktop
    pg.set_viewport_size({'width': 1440, 'height': 900}); pg.evaluate('closeModal(); arcShow(); arcRender()'); pg.wait_for_timeout(400)
    check('desktop Day screen keeps the door', pg.evaluate("!!document.querySelector('#arc .at-door')"))
    pg.evaluate("atOpen(null,'rep')"); pg.wait_for_timeout(300)
    if SHOTS: pg.screenshot(path=SHOTS + '/at_6_desk.png')
    check('no page errors at the end', not errs, errs[:3])
    b.close()

bad = [r for r in res if not r[1]]
for n, ok, info in res: print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  ' + json.dumps(info, ensure_ascii=False, default=str)[:400]))
print(f'{len(res) - len(bad)}/{len(res)} passed'); sys.exit(1 if bad else 0)
