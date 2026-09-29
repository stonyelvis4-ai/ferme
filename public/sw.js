const CACHE_NAME = 'ferm-plus-shell-v2-20260910';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icons/ferm-plus-logo.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ferm-plus-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API responses: farm data must always be refreshed from Laravel.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  const asset = /^\/assets\/[A-Za-z0-9_.-]+\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname);
  if (!SHELL_ASSETS.includes(url.pathname) && !asset) return;

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok && response.type === 'basic' && !response.redirected
            && !/private|no-store/i.test(response.headers.get('Cache-Control') || '')) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request))
          || (request.mode === 'navigate' ? await cache.match('/index.html') : undefined)
          || Response.error();
      })
  );
});
