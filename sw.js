// Offline-Cache: Die App startet sofort aus dem Cache – auch bei schlechtem oder keinem Netz.
// Updates kommen über eine neue Cache-Version (CACHE hochzählen): Der Browser prüft sw.js beim Start,
// lädt alle Dateien der neuen Version auf einmal (keine gemischten Stände) und die App bietet „Neu laden“ an.
const CACHE = 'springfield-v22';
const FILES = ['./', 'index.html', 'style.css', 'faces.js', 'data.js', 'questdata.js', 'art.js', 'icons.js', 'sound.js', 'isoart.js', 'app.js', 'quests.js', 'remind.js', 'world.js',
  'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'fonts/luckiestguy.woff2', 'fonts/nunito.woff2'];

self.addEventListener('install', (e) => {
  // cache: 'reload' umgeht den HTTP-Cache, damit wirklich die neue Version gespeichert wird
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Cache zuerst; was nicht im Cache ist, aus dem Netz holen und merken. Offline-Fallback: die App selbst.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return (await c.match('index.html')) || Response.error();
      throw err;
    }
  }));
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
