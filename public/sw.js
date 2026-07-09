const CACHE = "tna-shell-v1";
const OFFLINE_URL = "/offline.html";
const ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests always go network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets: cache-first for build files
  if (url.pathname.match(/\/assets\//) || url.pathname.match(/\.(js|css|svg|png|ico|woff2?)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell (HTML): network-first with offline fallback
  if (url.pathname === "/" || !url.pathname.match(/\.\w+$/)) {
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(event.request);
          const cache = await caches.open(CACHE);
          cache.put(event.request, resp.clone());
          return resp;
        } catch {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put(request, resp.clone());
    return resp;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
