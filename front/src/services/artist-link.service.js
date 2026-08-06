export function createArtistSlug(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artista";
}

const ARTIST_NAV_KEY = "musimo_artist_navigation";

export function getArtistNavigationData(slug) {
  try { return (JSON.parse(sessionStorage.getItem(ARTIST_NAV_KEY)) || {})[slug] || null; }
  catch { return null; }
}

export function getArtistUrl(artist = {}) {
  const id = artist.catalogId || artist.id || artist.artistId;
  const name = artist.name || artist.artist || "Artista";
  const slug = createArtistSlug(name);
  if (id) {
    try {
      const current = JSON.parse(sessionStorage.getItem(ARTIST_NAV_KEY)) || {};
      current[slug] = { id, catalogId: id, name };
      sessionStorage.setItem(ARTIST_NAV_KEY, JSON.stringify(current));
    } catch { /* La URL sigue funcionando sin almacenamiento. */ }
    return `/artista/${slug}`;
  }
  return `/buscar?consulta=${encodeURIComponent(name)}&categoria=artistas`;
}
