const CACHE_NAME = "atlas-field-v1";
const ASSETS = [
  "/",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Não cacheia chamadas de API
  if (url.pathname.startsWith("/auth/") || 
      url.pathname.includes("/maintenance/") || 
      url.pathname.includes("/assets") || 
      url.pathname.includes("/inventory") || 
      url.pathname.includes("/expenses") || 
      url.pathname.includes("/materials") || 
      url.pathname.includes("/services") || 
      url.pathname.includes("/organizations")) {
    return;
  }

  // Estratégia Network First, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});
