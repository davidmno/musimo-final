const RELEASE_NAV_KEY = "musimo_release_navigation";

export function createAlbumSlug(artist = "", album = "") {
  return `${artist}-${album}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "lanzamiento";
}

export function normalizeRelease(release = {}) {
  const album = release.album || release.title || "Lanzamiento";
  const artist = release.artist || "Artista";
  return {
    catalogId: release.catalogId || release.id || null,
    album,
    title: album,
    artist,
    artistId: release.artistId || null,
    image: release.image || "/images/cover-placeholder.png",
    year: release.year || null,
    releaseDate: release.releaseDate || null,
    releaseType: release.releaseType || release.type || "Álbum",
  };
}

export function saveReleaseNavigation(release) {
  const normalized = normalizeRelease(release);
  const slug = createAlbumSlug(normalized.artist, normalized.album);
  try {
    const current = JSON.parse(sessionStorage.getItem(RELEASE_NAV_KEY)) || {};
    current[slug] = normalized;
    sessionStorage.setItem(RELEASE_NAV_KEY, JSON.stringify(current));
  } catch {
    // La navegación funciona igual cuando el almacenamiento está bloqueado.
  }
  return { ...normalized, slug };
}

export function getAlbumNavigationData(slug) {
  try {
    return (JSON.parse(sessionStorage.getItem(RELEASE_NAV_KEY)) || {})[slug] || null;
  } catch {
    return null;
  }
}

export function getAlbumUrl(release = {}) {
  const normalized = saveReleaseNavigation(release);
  return `/lanzamiento/${normalized.slug}`;
}

export const getReleaseUrl = getAlbumUrl;
