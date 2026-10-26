// Offline-Cache: App-Dateien werden beim ersten Laden gespeichert.
const CACHE = 'springfield-v8';
const FILES = ['./', 'index.html', 'style.css', 'data.js', 'questdata.js', 'art.js', 'icons.js', 'isoart.js', 'app.js', 'quests.js', 'remind.js', 'world.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Netz zuerst (damit Updates ankommen), sonst Cache.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
// Tipp auf eine Erinnerung: offenes Fenster zum Check-in holen, sonst App neu öffnen.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list[0];
    if (c) { c.postMessage({ open: 'habits' }); return c.focus(); }
    return self.clients.openWindow('./#checkin');
  }));
});
