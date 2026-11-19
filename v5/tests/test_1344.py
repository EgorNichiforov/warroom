"""War Room 13.44 checks: the vault. Two throwaway browsers act as two devices sharing one sync code, against a small
stand-in for the cloud table held in this test. Proves: off by default; what the server holds once it is on; that a
device without the passphrase keeps syncing everything else and never replaces the sealed block; opening on a second
device; server-side note writes; snapshots; a damaged block; changing the passphrase; switching off.
Real browser crypto. Not the live Supabase project. Not a real phone."""
import sys, json, re, copy
from urllib.parse import unquote
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []; STORE = {}; POSTS = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
def rest(route):
    q = route.request; u = q.url
    if q.method == 'GET':
        m = re.search(r'id=eq\.([^&]+)', u); row = STORE.get(unquote(m.group(1))) if m else None
        full = re.search(r'[?&]select=data(,|&|$)', u)
        return route.fulfill(status=200, content_type='application/json', body=json.dumps([{'data': row['data'], 'updated_at': row['updated_at']}] if row and full else []))
    if q.method == 'POST':
        o = json.loads(q.post_data); STORE[o['id']] = {'data': o['data'], 'updated_at': o.get('updated_at')}; POSTS.append(o['id']); return route.fulfill(status=201, body='')
    route.abort()
CODE = 'VAULTTESTCODE-0123456789'
def device(b):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block'); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/rpc/**', lambda r: r.abort()); pg.route('**/rest/v1/warroom_sync**', rest); pg.route('**/functions/v1/**', lambda r: r.abort())
    pg.clock.install(time='2026-11-19T17:00:00+02:00'); pg.goto(URL); pg.wait_for_timeout(2500); pg.clock.run_for(4500)
    pg.evaluate("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0"); pg.evaluate(f"Object.assign(S.settings.sync,{{code:'{CODE}',url:'https://fake.supabase.co',key:'k'}}); 0")
    return pg, errs
main = lambda: STORE[CODE]['data']
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    A, eA = device(b); a = A.evaluate
    check('version 13.44.0 or later', a("APP_VERSION.localeCompare('13.44.0',undefined,{numeric:true})>=0"), a("APP_VERSION"))
    check('the vault is loaded before the sync code', a("(()=>{const s=Array.from(document.scripts).map(x=>(x.getAttribute('src')||'').split('?')[0]);return s.indexOf('./vault.js')>=0&&s.indexOf('./vault.js')<s.indexOf('./core.js')})()"))
    a("S.journal=S.journal||{}; S.journal.jA={id:'jA',_u:now(),at:'2026-11-19',kind:'note',text:'SECRET-ALPHA felt like quitting'}; S.txns=S.txns||{}; S.txns.tA={id:'tA',_u:now(),amt:-4200,memo:'SECRET-RENT'}; S.tasks.tkA={id:'tkA',_u:now(),title:'Plain task from A'}; save(true); 0"); a("pushCloud()")
    raw = json.dumps(main())
    check('off by default: the document goes up as it always did', 'vault' not in main() and 'SECRET-ALPHA' in raw and not a("vaOn()"))
    # switching on
    a("vaOpen()"); A.wait_for_timeout(100)
    check('the screen says what is sealed, what is not, and that there is no reset', a("(()=>{const t=document.getElementById('modal').textContent;return /Vault · off/.test(t)&&/What is sealed/.test(t)&&/What is not/.test(t)&&/There is no reset/.test(t)&&/Anyone holding this device unlocked can read them/.test(t)&&/Copies made before the vault/.test(t)})()"))
    check('the screen fits the phone', a("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    a("$('va-p1').value='short'; $('va-p2').value='short'; 0"); check('a short passphrase is refused', a("vaEnable()") is False and not a("vaOn()"))
    a("$('va-p1').value='correct horse 1'; $('va-p2').value='correct horse 2'; 0"); check('two different entries are refused', a("vaEnable()") is False and not a("vaOn()"))
    a("$('va-p1').value='correct horse battery'; $('va-p2').value='correct horse battery'; 0"); check('switching on works', a("vaEnable()") is True and a("vaOn()"))
    d = main(); raw = json.dumps(d)
    check('on the server the private stores are empty and a sealed block sits beside them', d.get('journal') == {} and d.get('txns') == {} and isinstance(d.get('vault'), dict) and len(d['vault']['ct']) > 40, list(d.get('vault', {}).keys()))
    check('nothing private is readable in what the server holds', 'SECRET-ALPHA' not in raw and 'SECRET-RENT' not in raw and '4200' not in raw)
    check('everything the server jobs need is still readable', 'Plain task from A' in raw and 'days' in d and 'goals' in d and 'tasks' in d and 'settings' in d)
    check('neither the passphrase nor the key is in the synced document', 'correct horse' not in raw and a("!JSON.stringify(S).includes(JSON.parse(localStorage.getItem('wr-vault-key')).k)") and set(d['settings']['vault'].keys()) == {'on', 'salt', 'check', 'at'}, list(d['settings']['vault'].keys()))
    check('this device still has its records', a("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting' and a("S.txns.tA.amt") == -4200)
    a("pullCloud(true)"); check('a pull opens the block and changes nothing', a("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting' and a("VA.bad") == 0)
    a("vaOpen()"); A.wait_for_timeout(100); check('the screen now says on and open here', a("!!document.getElementById('va-open')&&/Vault · on/.test(document.getElementById('modal').textContent)")); a("closeModal(); 0")
    # a second device without the passphrase
    B, eB = device(b); bb = B.evaluate; bb("pullCloud(true)")
    check('second device: learns the vault is on, cannot open it, does not get the sealed records', bb("vaOn()") and bb("vaKey().then(k=>!k)") and bb("!(S.journal||{}).jA") and bb("!!S.tasks.tkA"))
    blob0 = copy.deepcopy(main()['vault'])
    bb("S.tasks.tkB={id:'tkB',_u:now(),title:'Plain task from B'}; S.journal=S.journal||{}; S.journal.jB={id:'jB',_u:now(),at:'2026-11-19',text:'SECRET-BRAVO written while closed'}; save(true); 0"); bb("pushCloud()")
    d = main(); raw = json.dumps(d)
    check('second device syncs everything else', 'Plain task from B' in raw and bb("syncState.status") == 'ok', bb("syncState.msg"))
    check('…and passes the sealed block through untouched', d['vault'] == blob0)
    check('…and sends none of its own private records unsealed', 'SECRET-BRAVO' not in raw and d.get('journal') == {})
    a("pullCloud(true)"); check('first device gets the other one\'s ordinary records; its private ones are intact', a("!!S.tasks.tkB&&S.journal.jA.text==='SECRET-ALPHA felt like quitting'"))
    bb("vaOpen()"); B.wait_for_timeout(100)
    check('second device is told the vault is closed here', bb("!!document.getElementById('va-closed')"))
    bb("$('va-p1').value='wrong horse battery'; 0"); check('a wrong passphrase is refused', bb("vaUnlock()") is False and bb("vaKey().then(k=>!k)"))
    bb("vaOpen()"); B.wait_for_timeout(50); bb("$('va-p1').value='correct horse battery'; 0")
    check('the right passphrase opens it and the sealed records arrive', bb("vaUnlock()") is True and bb("S.journal.jA&&S.journal.jA.text") == 'SECRET-ALPHA felt like quitting' and bb("S.txns.tA.amt") == -4200)
    check('what the second device wrote while closed is still there', bb("S.journal.jB.text") == 'SECRET-BRAVO written while closed')
    bb("pushCloud()"); a("pullCloud(true)")
    check('…and reaches the first device, sealed on the way', a("(S.journal.jB||{}).text") == 'SECRET-BRAVO written while closed' and 'SECRET-BRAVO' not in json.dumps(main()) and main()['vault'] != blob0)
    # the server writes a note the way the worker and Claude's tasks do (one key inside the document)
    blob1 = copy.deepcopy(main()['vault']); main().setdefault('inbox', {})['sj1'] = {'id': 'sj1', '_u': 1795000000000, 'at': 1795000000000, 'from': 'Server', 'title': 'Server note', 'body': '- hello'}
    a("pullCloud(true)"); check('a note written on the server arrives; the vault is untouched', a("(S.inbox.sj1||{}).title") == 'Server note' and main()['vault'] == blob1 and a("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting')
    # cloud snapshots
    check('a cloud snapshot is written', a("snapWrite('manual','test')") is True and (CODE + ':snapmanual') in STORE)
    sn = STORE[CODE + ':snapmanual']['data']
    check('the snapshot is sealed too', sn['S'].get('journal') == {} and 'vault' in sn['S'] and 'SECRET-ALPHA' not in json.dumps(sn))
    check('reading a snapshot back opens it', a(f"fetch('https://fake.supabase.co/rest/v1/warroom_sync?id=eq.'+encodeURIComponent('{CODE}:snapmanual')+'&select=data',{{headers:snapHdr('x')}}).then(r=>r.json()).then(j=>j[0].data.S.journal.jA.text)") == 'SECRET-ALPHA felt like quitting')
    # a damaged block
    good = copy.deepcopy(main()['vault']); main()['vault']['ct'] = 'AAAA' + main()['vault']['ct'][4:]; bad = copy.deepcopy(main()['vault'])
    a("pullCloud(true)"); check('a block that will not open is noticed and local records are kept', a("VA.bad") == 1 and a("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting')
    a("S.tasks.tkC={id:'tkC',_u:now(),title:'After damage'}; save(true); 0"); a("pushCloud()")
    check('a block this device could not open is not replaced by an ordinary sync', main()['vault']['ct'] == bad['ct'] and 'After damage' in json.dumps(main()) and 'SECRET-ALPHA' not in json.dumps(main()))
    a("vaOpen()"); A.wait_for_timeout(100); check('the screen explains it and offers to seal again from this device', a("!!document.getElementById('va-bad')"))
    a("vaReseal()"); a("pullCloud(true)"); check('after "seal again" the block opens', a("VA.bad") == 0 and main()['vault']['ct'] != bad['ct'] and a("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting')
    # sealing fails -> nothing is sent
    n0 = len(POSTS); a("window._enc=vaEnc; vaEnc=async()=>{throw new Error('no crypto')}; 0"); a("S.journal.jZ={id:'jZ',_u:now(),text:'SECRET-ZULU'}; save(true); 0"); a("pushCloud()")
    check('if sealing fails, nothing is sent and sync shows an error', len([x for x in POSTS[n0:] if x == CODE]) == 0 and a("syncState.status") == 'err' and 'SECRET-ZULU' not in json.dumps(STORE), a("syncState.msg")); a("vaEnc=window._enc; 0"); a("pushCloud()")
    # changing the passphrase
    a("vaChangeAsk(); 0"); A.wait_for_timeout(50); a("$('va-p1').value='a brand new passphrase'; $('va-p2').value='a brand new passphrase'; 0")
    check('the passphrase can be changed from an open device', a("vaEnable()") is True and main()['vault']['s'] == main()['settings']['vault']['salt'])
    blob2 = copy.deepcopy(main()['vault']); bb("pullCloud(true)")
    check('the other device is closed again and keeps what it had', bb("vaKey().then(k=>!k)") and bb("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting')
    bb("S.tasks.tkD={id:'tkD',_u:now(),title:'B after change'}; save(true); 0"); bb("pushCloud()")
    check('…and still leaves the newly sealed block alone', main()['vault'] == blob2 and 'B after change' in json.dumps(main()))
    bb("vaOpen()"); B.wait_for_timeout(50); bb("$('va-p1').value='correct horse battery'; 0"); check('the old passphrase no longer opens it', bb("vaUnlock()") is False)
    bb("vaOpen()"); B.wait_for_timeout(50); bb("$('va-p1').value='a brand new passphrase'; 0"); check('the new one does', bb("vaUnlock()") is True and bb("(S.journal.jZ||{}).text") == 'SECRET-ZULU')
    # switching off
    a("vaOpen()"); A.wait_for_timeout(100); a("vaOff(document.getElementById('va-offb'))"); check('switching off needs a second tap', a("vaOn()"))
    a("vaOff(document.getElementById('va-offb'))")
    d = main(); check('switched off: records are back unsealed and the block is gone', not a("vaOn()") and 'vault' not in d and d['journal']['jA']['text'] == 'SECRET-ALPHA felt like quitting' and d['journal']['jB']['text'] == 'SECRET-BRAVO written while closed' and d['txns']['tA']['amt'] == -4200)
    bb("pullCloud(true)"); bb("pushCloud()"); check('the other device follows and nothing is lost', not bb("vaOn()") and bb("S.journal.jA.text") == 'SECRET-ALPHA felt like quitting' and main()['journal']['jZ']['text'] == 'SECRET-ZULU' and 'vault' not in main())
    check('"Where do I…?" finds the vault', all(a(f"(wfFind({json.dumps(q)})[0]||[])[0]") == 'vault' for q in ['encrypt my data', 'passphrase', 'vault']), [a(f"(wfFind({json.dumps(q)})[0]||[])[0]") for q in ['encrypt my data', 'passphrase', 'vault']])
    check('still one recommender', a("(()=>{closeModal();const M=mcBuild();return M.top===(M.C[0]||null)&&!M.C.some(c=>/^va/.test(c.k))})()"))
    check('no page errors on either device', not eA and not eB, (eA + eB)[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
