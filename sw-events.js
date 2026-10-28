/* Rebelz events app — service worker */
const CACHE = 'rebelz-events-v1';
const SHELL = ['/events.html', '/events.webmanifest', '/icon-events-192.png', '/icon-events-512.png', '/apple-touch-events.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('rebelz-events-') && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Live data (Supabase API, storage, edge functions) always goes to the network.
  if (url.hostname.endsWith('supabase.co')) return;
  // App page: network first so updates show immediately; cached copy if offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('/events.html', copy)); return res;
    }).catch(() => caches.match('/events.html')));
    return;
  }
  // Libraries, fonts, icons: serve from cache, refresh in background.
  const cacheable = url.origin === location.origin || /(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
