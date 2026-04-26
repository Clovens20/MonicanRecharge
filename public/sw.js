/* eslint-disable no-restricted-globals */
const CACHE = "monican-recharge-v1";
const PRECACHE = ["/", "/tableau-de-bord"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isNavigation = request.mode === "navigate";
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isApi = url.pathname.startsWith("/api/");

  // Ne jamais intercepter les assets Next ni API (évite chunks 404 cachés).
  if (isNextAsset || isApi) return;

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Pour assets non-Next (images statiques, etc.): cache seulement si réponse OK.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
