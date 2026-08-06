import { apiRequest } from "./api";

const memoryCache = new Map();
const inFlight = new Map();
const SESSION_PREFIX = "musimo:catalog:";
const MINUTE = 60 * 1000;

function readSession(key) {
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (entry.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

function writeSession(key, value, ttl) {
  try {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      JSON.stringify({ value, expiresAt: Date.now() + ttl }),
    );
  } catch {
    // El caché en memoria sigue disponible cuando storage está bloqueado.
  }
}

function cachedRequest(key, loader, ttl, { share = true } = {}) {
  const memoryHit = memoryCache.get(key);
  if (memoryHit?.expiresAt > Date.now()) {
    return Promise.resolve(memoryHit.value);
  }

  const sessionHit = readSession(key);
  if (sessionHit) {
    memoryCache.set(key, sessionHit);
    return Promise.resolve(sessionHit.value);
  }

  if (share && inFlight.has(key)) return inFlight.get(key);

  const promise = loader()
    .then((value) => {
      const entry = { value, expiresAt: Date.now() + ttl };
      memoryCache.set(key, entry);
      writeSession(key, value, ttl);
      return value;
    })
    .finally(() => {
      if (share) inFlight.delete(key);
    });

  if (share) inFlight.set(key, promise);
  return promise;
}

export function searchCatalog(query, options = {}) {
  const clean = String(query || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 20);
  const releaseLimit = Math.min(
    Math.max(Number(options.releaseLimit) || limit * 2, limit),
    100,
  );
  const expandArtist = Boolean(options.expandArtist);
  const params = new URLSearchParams({
    q: clean,
    limit: String(limit),
    ...(expandArtist
      ? { expandArtist: "1", releaseLimit: String(releaseLimit) }
      : {}),
  });

  return cachedRequest(
    `search:v5:${clean}:${limit}:${expandArtist ? 1 : 0}:${releaseLimit}`,
    () => apiRequest(`/catalog/search?${params}`, { signal: options.signal }),
    30 * MINUTE,
    { share: !options.signal },
  );
}

export function getRelease(id) {
  return cachedRequest(
    `release:${id}`,
    () => apiRequest(`/catalog/releases/${encodeURIComponent(id)}`),
    60 * MINUTE,
  );
}

export function getReleaseTracks(id) {
  return cachedRequest(
    `tracks:v2:${id}`,
    () => apiRequest(`/catalog/releases/${encodeURIComponent(id)}/tracks`),
    24 * 60 * MINUTE,
  );
}

export function getArtist(id) {
  return cachedRequest(
    `artist:${id}`,
    () => apiRequest(`/catalog/artists/${encodeURIComponent(id)}`),
    60 * MINUTE,
  );
}

export function getArtistReleases(id, limit = 30) {
  return cachedRequest(
    `artist-releases:${id}:${limit}`,
    () =>
      apiRequest(
        `/catalog/artists/${encodeURIComponent(id)}/releases?limit=${limit}`,
      ),
    30 * MINUTE,
  );
}

export function getArtistImages(id, limit = 8) {
  return cachedRequest(
    `artist-images:v1:${id}:${limit}`,
    () =>
      apiRequest(
        `/catalog/artists/${encodeURIComponent(id)}/images?limit=${limit}`,
      ),
    24 * 60 * MINUTE,
  );
}

export function getNewReleases(limit = 12) {
  return cachedRequest(
    `new-releases:v2:${limit}`,
    () => apiRequest(`/catalog/new-releases?limit=${limit}`),
    30 * MINUTE,
  );
}
