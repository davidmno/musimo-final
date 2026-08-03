import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, "public", "covers", "cache");
const PLACEHOLDER_URL = "/images/cover-placeholder.png";

/** Mapeo manual 1:1 solo para demos con archivo dedicado */
const MANUAL_DEMO_COVERS = {
  "kylie minogue|fever": "public/images/covers/fever.jpg",
  "kylie minogue|light years": "public/images/covers/light-years.jpg",
  "frank ocean|channel orange": "public/images/covers/channel-orange.jpg",
  "sza|ctrl": "public/images/covers/ctrl.jpg",
  "lorde|melodrama": "public/images/covers/melodrama.jpg",
  "daft punk|discovery": "public/images/covers/discovery.jpg",
  "radiohead|kid a": "public/images/covers/kid-a.jpg",
  "radiohead|in rainbows": "public/images/covers/in-rainbows.jpg",
  "kate bush|hounds of love": "public/images/covers/hounds-of-love.jpg",
};

const pending = new Map();

function albumKey(artist = "", album = "") {
  return `${artist.trim().toLowerCase()}|${album.trim().toLowerCase()}`;
}

function normalizeText(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function coverCacheFilename(artist, album) {
  const slug = `${artist}-${album}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${slug || "album"}.jpg`;
}

function coverCachePath(artist, album) {
  return path.join(CACHE_DIR, coverCacheFilename(artist, album));
}

function coverCacheUrl(artist, album) {
  return `/covers/cache/${coverCacheFilename(artist, album)}`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadBuffer(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MusimoDemo/1.0" },
    redirect: "follow",
  });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length > 500 ? buffer : null;
}

async function saveCache(artist, album, buffer) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = coverCachePath(artist, album);
  await fs.writeFile(filePath, buffer);
  return coverCacheUrl(artist, album);
}

async function copyManualToCache(artist, album, relativePath) {
  const source = path.join(ROOT, relativePath);
  if (!(await fileExists(source))) return null;
  const buffer = await fs.readFile(source);
  return saveCache(artist, album, buffer);
}

async function fetchDeezerCover(artist, album) {
  const query = `${artist} ${album}`.trim();
  const response = await fetch(
    `https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=8`,
  );
  if (!response.ok) return null;

  const data = await response.json();
  const results = data?.data || [];
  if (!results.length) return null;

  const albumNorm = normalizeText(album);
  const artistNorm = normalizeText(artist);
  const artistToken = artistNorm.split(/\s+/)[0] || "";

  const ranked = results
    .map((item) => {
      let score = 0;
      const title = normalizeText(item.title);
      const artistName = normalizeText(item.artist?.name || "");

      if (title === albumNorm) score += 12;
      else if (title.includes(albumNorm) || albumNorm.includes(title)) score += 6;

      if (artistNorm && artistName.includes(artistNorm)) score += 8;
      else if (artistToken && artistName.includes(artistToken)) score += 4;

      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.item;
  if (!best) return null;

  const url =
    best.cover_xl || best.cover_big || best.cover_medium || best.cover || null;
  return url ? downloadBuffer(url) : null;
}

async function fetchCoverArtArchive(artist, album) {
  const query = `artist:"${artist}" AND release:"${album}"`;
  const searchUrl = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      "User-Agent": "MusimoDemo/1.0 (demo@musimo.local)",
      Accept: "application/json",
    },
  });
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const releases = searchData?.releases || [];
  if (!releases.length) return null;

  const albumNorm = normalizeText(album);
  const artistNorm = normalizeText(artist);

  const best =
    releases.find((r) => normalizeText(r.title) === albumNorm) || releases[0];
  if (!best?.id) return null;

  const artUrl = `https://coverartarchive.org/release/${best.id}/front-500`;
  return downloadBuffer(artUrl);
}

async function fetchItunesCover(artist, album) {
  const term = `${artist} ${album}`.trim();
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=5`,
  );
  if (!response.ok) return null;

  const data = await response.json();
  const results = data?.results || [];
  if (!results.length) return null;

  const albumNorm = normalizeText(album);
  const artistNorm = normalizeText(artist);

  const match =
    results.find(
      (r) =>
        normalizeText(r.collectionName) === albumNorm &&
        normalizeText(r.artistName).includes(artistNorm.split(" ")[0]),
    ) || results[0];

  const url = match?.artworkUrl100?.replace("100x100bb", "600x600bb");
  return url ? downloadBuffer(url) : null;
}

async function resolveCoverInternal(artist, album, legacyImage = "") {
  if (!artist?.trim() || !album?.trim()) {
    return { coverUrl: PLACEHOLDER_URL, source: "placeholder" };
  }

  const cachePath = coverCachePath(artist, album);
  if (await fileExists(cachePath)) {
    return { coverUrl: coverCacheUrl(artist, album), source: "cache" };
  }

  const manual = MANUAL_DEMO_COVERS[albumKey(artist, album)];
  if (manual) {
    const url = await copyManualToCache(artist, album, manual);
    if (url) return { coverUrl: url, source: "manual" };
  }

  const sources = [
    () => fetchDeezerCover(artist, album),
    () => fetchCoverArtArchive(artist, album),
    () => fetchItunesCover(artist, album),
  ];

  if (legacyImage?.trim()) {
    sources.push(() => downloadBuffer(legacyImage.trim()));
  }

  for (const getBuffer of sources) {
    try {
      const buffer = await getBuffer();
      if (buffer) {
        const coverUrl = await saveCache(artist, album, buffer);
        return { coverUrl, source: "resolved" };
      }
    } catch {
      /* try next source */
    }
  }

  return { coverUrl: PLACEHOLDER_URL, source: "placeholder" };
}

export async function resolveCover(artist, album, legacyImage = "") {
  const key = albumKey(artist, album);
  if (pending.has(key)) return pending.get(key);

  const promise = resolveCoverInternal(artist, album, legacyImage).finally(() => {
    pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
