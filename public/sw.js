const CACHE_VERSION = 'school-manager-shell-v2';
const RUNTIME_CACHE = 'school-manager-assets-v2';
const ACTIVE_CACHES = [CACHE_VERSION, RUNTIME_CACHE];

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/install.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

function isSensitiveOrApiRequest(request, url) {
  // Never intercept or cache Supabase, auth, API, or authenticated requests
  if (request.headers && (request.headers.has('authorization') || request.headers.has('apikey'))) {
    return true;
  }
  const host = url.hostname.toLowerCase();
  if (
    host.includes('supabase.co') ||
    host.includes('supabase.in') ||
    host.includes('supabase')
  ) {
    return true;
  }
  const path = url.pathname.toLowerCase();
  if (
    path.startsWith('/api/') ||
    path.startsWith('/auth/') ||
    path.startsWith('/rest/') ||
    path.startsWith('/realtime/') ||
    path.startsWith('/storage/') ||
    path.startsWith('/functions/') ||
    path.startsWith('/graphql') ||
    path.includes('supabase')
  ) {
    return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ACTIVE_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Non-GET requests (login, mutations, uploads) are strictly network-only
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin requests (e.g. Supabase, external APIs, CDN) are network-only
  if (url.origin !== self.location.origin) return;

  // API, auth, and Supabase endpoints are strictly network-only (never cached)
  if (isSensitiveOrApiRequest(request, url)) return;

  // Never intercept Vite dev server HMR or source module requests
  if (
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // SPA navigation: network-first, falling back to cached shell (if JS assets cached) or offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic' && url.pathname !== '/offline.html') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          if (url.pathname === '/offline.html') {
            const directOffline = await caches.match('/offline.html');
            if (directOffline) return directOffline;
          }
          const runtimeCache = await caches.open(RUNTIME_CACHE);
          const runtimeKeys = await runtimeCache.keys();
          const hasCachedJs = runtimeKeys.some((req) => /\.js(?:\?|$)/i.test(req.url));
          const cachedShell = await caches.match('/');
          if (cachedShell && hasCachedJs) return cachedShell;
          const offlineFallback = await caches.match('/offline.html');
          return offlineFallback || cachedShell || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Only cache static bundled assets and PWA icons/manifest
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/install.js' ||
    url.pathname === '/offline.html' ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
