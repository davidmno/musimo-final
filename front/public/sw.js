const VERSION = "v4";
const PRECACHE = `musimo-precache-${VERSION}`;
const RUNTIME = `musimo-runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const APP_SHELL = "/";

const PRECACHE_URLS = [
  APP_SHELL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-maskable-192.png",
  "/pwa-maskable-512.png",
  "/musimo-app-icon-source.jpg",
  "/images/logo.png",
  "/images/musimo.png",
  "/images/cover-placeholder.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("musimo-") && ![PRECACHE, RUNTIME].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME);
      await cache.put(APP_SHELL, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(APP_SHELL)) ||
      (await caches.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || request.headers.has("Authorization")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
