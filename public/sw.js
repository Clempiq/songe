// Service worker de Songe : cartes et fichiers du jeu en cache, page toujours à jour quand le réseau répond.
const V = 'songe-v5';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  if (/^\/(cards|assets|icons)\//.test(u.pathname)) {
    e.respondWith(caches.open(V).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
  } else if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('/', cp)); return res; }).catch(() => caches.match('/')));
  }
});
