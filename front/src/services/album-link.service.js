const ALBUM_NAV_KEY = "musimo_album_navigation";

export function createAlbumSlug(artist = "", album = "") {
  const clean = `${artist} ${album}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "album";
}

function normalizeRelease(release = {}) {
  const album = release.album || release.title || "Álbum";
  const artist = release.artist || "Artista";

  return {
    album,
    title: release.title || album,
    artist,
    image: release.image || "/images/cover-placeholder.png",
    year: release.year || null,
    type: release.type || release.releaseType || "Álbum",
    releaseType: release.releaseType || release.type || "Álbum",
  };
}

export function getAlbumUrl(release = {}) {
  const normalized = normalizeRelease(release);
  const slug = createAlbumSlug(normalized.artist, normalized.album);

  saveAlbumNavigationData({
    ...normalized,
    slug,
  });

  return `/album/${slug}`;
}

export function saveAlbumNavigationData(release = {}) {
  const normalized = normalizeRelease(release);
  const slug = release.slug || createAlbumSlug(normalized.artist, normalized.album);

  let current = {};

  try {
    current = JSON.parse(localStorage.getItem(ALBUM_NAV_KEY)) || {};
  } catch {
    current = {};
  }

  current[slug] = {
    ...normalized,
    slug,
    savedAt: Date.now(),
  };

  localStorage.setItem(ALBUM_NAV_KEY, JSON.stringify(current));

  return current[slug];
}

export function getAlbumNavigationData(slug) {
  if (!slug) return null;

  try {
    const current = JSON.parse(localStorage.getItem(ALBUM_NAV_KEY)) || {};
    return current[slug] || null;
  } catch {
    return null;
  }
}

export function getLegacyAlbumUrl(release = {}) {
  const normalized = normalizeRelease(release);

  return `/album?title=${encodeURIComponent(
    normalized.album,
  )}&artist=${encodeURIComponent(
    normalized.artist,
  )}&image=${encodeURIComponent(normalized.image || "")}`;
}
