"""War Room 14.1 checks: kept audio. A recording of yourself is kept on this device only, can be played back, is listed
with its size, has a 3-minute and 50 MB limit, is deleted only by you, and nothing claims to judge it."""
import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/v5/'
RES = []
def check(name, ok, info=''):
    RES.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info and not ok else ''))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Chisinau', service_workers='block', permissions=['microphone'])
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/rest/v1/**', lambda r: r.abort())
    sent = []; pg.on('request', lambda r: sent.append(r.url) if r.method == 'POST' else None)
    pg.goto(URL); pg.wait_for_timeout(3500)
    ev = pg.evaluate; ev("CP_NOLATE=1; OD_OFF=1; SL_OFF=1; TOUR_OFF=1; 0")
    check('version 14.1.0 or later', ev("APP_VERSION.localeCompare('14.1.0',undefined,{numeric:true})>=0"), ev("APP_VERSION"))
    check('limits are 3 minutes a clip and 50 MB in all', ev("VK_MAX_MS===180000&&VK_MAX_BYTES===50*1024*1024"))
    ev("spkOpen(); 0"); pg.wait_for_timeout(300)
    check('Communication has a Kept recordings button', ev("!!document.getElementById('vk-open')"))
    ev("SPKS.ex=null;SPKS.prev=null;spkTrain(true); 0"); pg.wait_for_timeout(300)
    check('a Speak exercise offers Keep a recording, saying it stays on this phone', ev("!!document.getElementById('vk-b')") and 'Stays on this phone' in ev("document.getElementById('vk-s').textContent"))
    ev("vkStart('test'); 0"); pg.wait_for_timeout(300)
    t = ev("document.getElementById('modal').textContent")
    check('the first time it explains first: this phone only, not sent, not judged, not for calls', 'not synced' in t and 'not sent' in t and 'judge your pronunciation' in t and 'record a call' in t, t[:300])
    ev("bcW('spk:audcfg',{ok:true}); spkTrain(true); vkStart('Say what you do in one sentence'); 0"); pg.wait_for_timeout(2500)
    check('recording starts and the button turns into Stop', ev("!!VKS.mr") and 'Stop' in ev("document.getElementById('vk-b').textContent"))
    ev("vkStop(); 0"); pg.wait_for_timeout(1500)
    L = ev("vkAll().then(L=>L.map(x=>({size:x.size,ms:x.ms,label:x.label,blob:x.blob instanceof Blob})))")
    check('the recording is kept with its length, size and exercise', len(L) == 1 and L[0]['size'] > 0 and L[0]['ms'] > 1000 and L[0]['blob'] and 'one sentence' in L[0]['label'], L)
    check('the recording is not in the synced records', 'blob' not in ev("JSON.stringify(Object.keys(S.boot).filter(k=>/aud/.test(k)))") and ev("JSON.stringify(S).length<5e6"))
    check('no audio was sent anywhere', not any('audio' in u or 'gemini' in u or 'openai' in u for u in sent), sent[:5])
    ev("vkOpen(); 0"); pg.wait_for_timeout(600)
    h = ev("document.getElementById('modal').innerHTML")
    check('the list plays it back and shows how much space is used', h.count('<audio') == 1 and 'MB of 50.0 MB' in h, h[:400])
    check('the list says nothing here judges it', 'nothing here judges it' in ev("document.getElementById('modal').textContent"))
    check('it fits the phone', ev("document.getElementById('modal').scrollWidth<=document.getElementById('modal').clientWidth+2"))
    full = ev("vkPut({id:'big',at:Date.now(),ms:1,size:VK_MAX_BYTES,mime:'audio/webm',blob:new Blob(['x'])})")
    check('when full it refuses to keep more and deletes nothing by itself', full['ok'] is False and ev("vkAll().then(L=>L.length)") == 1, full)
    rid = ev("vkAll().then(L=>L[0].id)")
    ev(f"vkAskDel('{rid}'); 0"); pg.wait_for_timeout(200)
    check('delete asks first and says there is no other copy', 'no other copy' in ev("document.getElementById('modal').textContent"))
    check('nothing deleted until you confirm', ev("vkAll().then(L=>L.length)") == 1)
    ev(f"vkDel('{rid}').then(vkOpen); 0"); pg.wait_for_timeout(500)
    check('after you confirm it is gone', ev("vkAll().then(L=>L.length)") == 0)
    check('still one recommender', ev("(()=>{const M=mcBuild();return M.top===(M.C[0]||null)})()"))
    check('no page errors', not errs, errs[:3]); b.close()
bad = [r for r in RES if not r[1]]
print(f"\n{len(RES) - len(bad)}/{len(RES)} passed"); sys.exit(1 if bad else 0)
