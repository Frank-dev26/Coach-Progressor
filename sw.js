const CACHE = 'progressor-v5';
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

// ---------- NOTIFICATIONS PUSH ----------
// Reçoit un message push (envoyé par un serveur) et l'affiche.
// Charge utile attendue (JSON) : { "title": "...", "body": "...", "url": "./index.html", "tag": "..." }
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; }
  catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Progressor', {
    body: d.body || 'Pense à mettre à jour tes notes 📚',
    icon: 'icon-192.png',
    badge: 'icon-96.png',
    tag: d.tag || 'progressor',
    renotify: !!d.tag,
    vibrate: [100, 50, 100],
    data: { url: d.url || './index.html' }
  }));
});

// Au clic sur la notification : ouvre ou ramène l'application au premier plan.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './index.html', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        await w.focus();
        if ('navigate' in w && w.url !== target) { try { await w.navigate(target); } catch (_) {} }
        return;
      }
    }
    return clients.openWindow(target);
  })());
});
