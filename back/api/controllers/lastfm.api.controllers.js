import * as lastfmService from "../../services/lastfm.services.js";

export async function searchAlbums(req, res) {
  try {
    const query = req.query.q || "";

    if (!query.trim()) {
      return res.status(400).json({ message: "La búsqueda es obligatoria" });
    }

    const albums = await lastfmService.searchAlbums(query);

    res.json(albums);
  } catch {
    res.status(500).json({ message: "No se pudo consultar Last.fm" });
  }
}

export async function getAlbumInfo(req, res) {
  try {
    const artist = req.query.artist || "";
    const album = req.query.album || "";

    if (!artist.trim() || !album.trim()) {
      return res
        .status(400)
        .json({ message: "Artista y álbum son obligatorios" });
    }

    const albumInfo = await lastfmService.getAlbumInfo(artist, album);

    res.json(albumInfo);
  } catch {
    res
      .status(500)
      .json({ message: "No se pudo consultar la información del álbum" });
  }
}

export async function getArtistTopAlbums(req, res) {
  try {
    const artist = req.query.artist || "";

    if (!artist.trim()) {
      return res.status(400).json({ message: "El artista es obligatorio" });
    }

    const albums = await lastfmService.getArtistTopAlbums(artist);

    res.json(albums);
  } catch {
    res
      .status(500)
      .json({ message: "No se pudieron consultar más lanzamientos" });
  }
}
