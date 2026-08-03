import { apiRequest } from "./api";

export function searchAlbums(query) {
  return apiRequest(`/lastfm/albums?q=${encodeURIComponent(query)}`);
}

export function getAlbumInfo(artist, album) {
  return apiRequest(
    `/lastfm/album-info?artist=${encodeURIComponent(
      artist,
    )}&album=${encodeURIComponent(album)}`,
  );
}

export function getArtistTopAlbums(artist) {
  return apiRequest(
    `/lastfm/artist-albums?artist=${encodeURIComponent(artist)}`,
  );
}
