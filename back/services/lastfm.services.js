const LASTFM_URL = "https://ws.audioscrobbler.com/2.0/";

function getBestImage(images = []) {
  return (
    images?.find((img) => img.size === "extralarge")?.["#text"] ||
    images?.find((img) => img.size === "large")?.["#text"] ||
    images?.find((img) => img.size === "medium")?.["#text"] ||
    ""
  );
}

export async function searchAlbums(query) {
  const params = new URLSearchParams({
    method: "album.search",
    album: query,
    api_key: process.env.LASTFM_API_KEY,
    format: "json",
    limit: "12",
  });

  const response = await fetch(`${LASTFM_URL}?${params.toString()}`);
  const data = await response.json();

  const albums = data?.results?.albummatches?.album || [];

  return albums.map((album) => ({
    title: album.name,
    artist: album.artist,
    image: getBestImage(album.image),
    mbid: album.mbid || null,
  }));
}

export async function getAlbumInfo(artist, album) {
  const params = new URLSearchParams({
    method: "album.getinfo",
    artist,
    album,
    api_key: process.env.LASTFM_API_KEY,
    format: "json",
  });

  const response = await fetch(`${LASTFM_URL}?${params.toString()}`);
  const data = await response.json();

  const albumData = data?.album;

  if (!albumData) {
    return {
      title: album,
      artist,
      image: "",
      year: null,
      releaseType: "Álbum",
      tracks: [],
    };
  }

  const tracksRaw = albumData.tracks?.track || [];

  const tracks = Array.isArray(tracksRaw)
    ? tracksRaw.map((track) => track.name).filter(Boolean)
    : tracksRaw.name
      ? [tracksRaw.name]
      : [];

  let year = null;

  if (albumData.wiki?.published) {
    const match = albumData.wiki.published.match(/\d{4}/);
    if (match) year = match[0];
  }

  return {
    title: albumData.name || album,
    artist: albumData.artist || artist,
    image: getBestImage(albumData.image),
    year,
    releaseType: "Álbum",
    tracks,
  };
}

export async function getArtistTopAlbums(artist) {
  const params = new URLSearchParams({
    method: "artist.gettopalbums",
    artist,
    api_key: process.env.LASTFM_API_KEY,
    format: "json",
    limit: "8",
  });

  const response = await fetch(`${LASTFM_URL}?${params.toString()}`);
  const data = await response.json();

  const albums = data?.topalbums?.album || [];

  return albums.map((album) => ({
    title: album.name,
    artist: album.artist?.name || artist,
    image: getBestImage(album.image),
    mbid: album.mbid || null,
  }));
}
