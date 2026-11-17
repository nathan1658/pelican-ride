const base = self.registration.scope;
const prefix = base + 'pelican-ride:';
const version = prefix + '__BUILD_VERSION__';
const shell = ['index.html', 'manifest.webmanifest', 'icons/pelican.svg', 'icons/pelican-180.png', 'icons/pelican-192.png', 'icons/pelican-512.png'];
const urls = new Set(shell.map(path => new URL(path, base).href));
const index = new URL('index.html', base).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    await cache.addAll([...urls].map(url => new Request(url, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== version).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  if (event.request.mode === 'navigate' && (url.href === base || url.href === index)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) return response;
        return (await caches.match(index, {cacheName: version})) || response;
      } catch {
        return (await caches.match(index, {cacheName: version})) || Response.error();
      }
    })());
  } else if (urls.has(url.href)) {
    event.respondWith(caches.match(url.href, {cacheName: version}).then(cached => cached || fetch(event.request)));
  }
});
