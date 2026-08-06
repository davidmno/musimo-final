import { getArtistImages } from "./catalog.service";

const CACHE_PREFIX = "musimo:artist-images:v2:";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const memoryCache = new Map();
const inFlight = new Map();

function artistIdOf(artist = {}) {
  return String(artist.catalogId || artist.id || "").trim();
}

export function isUsableArtistImage(image = "") {
  const value = String(image || "").trim();

  return Boolean(
    value &&
      !value.includes("cover-placeholder") &&
      !value.endsWith("/images/cover-placeholder.png"),
  );
}

function uniqueImages(images = []) {
  return [...new Set(images.filter(isUsableArtistImage))];
}

function releaseTimestamp(release = {}) {
  const value = release.releaseDate || release.date || release.year || "";
  const parsed = Date.parse(value);

  if (!Number.isNaN(parsed)) return parsed;

  return Number(String(value).slice(0, 4)) || 0;
}

export function imagesFromReleases(releases = []) {
  return uniqueImages(
    [...releases]
      .sort((left, right) => releaseTimestamp(right) - releaseTimestamp(left))
      .map((release) => release.image || release.cover || release.coverImage || ""),
  );
}

function readPersistentCache(artistId) {
  if (!artistId) return [];

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${artistId}`);
    if (!raw) return [];

    const entry = JSON.parse(raw);
    if (!entry?.expiresAt || entry.expiresAt <= Date.now()) {
      localStorage.removeItem(`${CACHE_PREFIX}${artistId}`);
      return [];
    }

    return uniqueImages(entry.images || []);
  } catch {
    return [];
  }
}

function writePersistentCache(artistId, images) {
  if (!artistId) return;

  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${artistId}`,
      JSON.stringify({
        images: uniqueImages(images),
        expiresAt: Date.now() + CACHE_TTL,
      }),
    );
  } catch {
    // El caché en memoria sigue funcionando si localStorage no está disponible.
  }
}

export function getCachedArtistImages(artist = {}) {
  const artistId = artistIdOf(artist);

  if (!artistId) {
    return isUsableArtistImage(artist.image) ? [artist.image] : [];
  }

  if (memoryCache.has(artistId)) {
    return memoryCache.get(artistId);
  }

  const storedImages = readPersistentCache(artistId);
  if (storedImages.length) {
    memoryCache.set(artistId, storedImages);
  }

  return storedImages;
}

export function cacheArtistImages(artist, images = []) {
  const artistId = artistIdOf(artist);
  const normalized = uniqueImages(images);

  if (!artistId || !normalized.length) return normalized;

  memoryCache.set(artistId, normalized);
  writePersistentCache(artistId, normalized);

  return normalized;
}

export async function resolveArtistImages(artist = {}, releases = []) {
  const artistId = artistIdOf(artist);

  if (!artistId) {
    return isUsableArtistImage(artist.image) ? [artist.image] : [];
  }

  const releaseImages = imagesFromReleases(releases);
  if (releaseImages.length) {
    return cacheArtistImages(artist, releaseImages);
  }

  const cached = getCachedArtistImages(artist);
  if (cached.length) return cached;

  if (inFlight.has(artistId)) {
    return inFlight.get(artistId);
  }

  const request = getArtistImages(artistId)
    .then((result) => cacheArtistImages(artist, result.images || result || []))
    .catch(() => [])
    .finally(() => inFlight.delete(artistId));

  inFlight.set(artistId, request);
  return request;
}

export function removeFailedArtistImage(artist = {}, failedImage = "") {
  const artistId = artistIdOf(artist);
  if (!artistId || !failedImage) return [];

  const remaining = getCachedArtistImages(artist).filter(
    (image) => image !== failedImage,
  );

  memoryCache.set(artistId, remaining);
  writePersistentCache(artistId, remaining);

  return remaining;
}
