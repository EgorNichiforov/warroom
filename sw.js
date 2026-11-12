/* War Room service worker: app shell cached for offline use, network-first so updates arrive. */
const CACHE = 'warroom-v5.3.1';
const SHELL = ['./', './index.html', './core.js', './train.js', './dial.js', './pipeline.js', './todoist.js', './views.js', './game.js', './food.js', './stats.js', './ops.js', './devices.js', './v5.css', './fonts/barlow-semi-condensed-latin-500-normal.woff2', './fonts/barlow-semi-condensed-latin-600-normal.woff2', './fonts/barlow-semi-condensed-latin-700-normal.woff2', './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2', './queue_seed.json', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('warroom-v5') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => hit || (e.request.mode === 'navigate' ? c.match('./index.html') : undefined))))
  );
});
