const CACHE = 'progressor-v4';
const LOCAL = ['./', './index.html', './manifest.json'];
const CHART = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(LOCAL.map(u => c.add(u).catch(() => {})));
    try { await c.put(CHART, await fetch(new Request(CHART, { mode: 'no-cors' }))); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE);
        c.put(e.request, res.clone());
      }
      return res;
    } catch (_) {
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 503 });
    }
  })());
});
