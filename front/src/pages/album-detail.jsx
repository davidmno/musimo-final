import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { getReviews } from "../services/reviews.service";
import { getAlbumInfo, getArtistTopAlbums } from "../services/lastfm.service";
import { isInToReview, toggleToReview } from "../services/to-review.service";
import {
  getAlbumNavigationData,
  getAlbumUrl,
} from "../services/album-link.service";

function normalize(value = "") {
  return value.trim().toLowerCase();
}

function AlbumDetail() {
  const { slug } = useParams();
  const [params] = useSearchParams();

  const savedAlbum = getAlbumNavigationData(slug);

  const title =
    savedAlbum?.album || savedAlbum?.title || params.get("title") || "Álbum";

  const artist = savedAlbum?.artist || params.get("artist") || "Artista";

  const image =
    savedAlbum?.image || params.get("image") || "/images/cover-placeholder.png";

  const [albumInfo, setAlbumInfo] = useState({
    title,
    artist,
    image,
    year: null,
    releaseType: "Álbum",
    tracks: [],
  });

  const [reviews, setReviews] = useState([]);
  const [moreAlbums, setMoreAlbums] = useState([]);
  const [marked, setMarked] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tracklistOpen, setTracklistOpen] = useState(false);

  const tracks = albumInfo.tracks || [];
  const visibleTracks = tracklistOpen ? tracks : tracks.slice(0, 4);
  const hasMoreTracks = tracks.length > 4;

  const cover = albumInfo.image || image || "/images/cover-placeholder.png";

  const reviewUrl = `/reviews?artist=${encodeURIComponent(
    albumInfo.artist,
  )}&album=${encodeURIComponent(albumInfo.title)}&image=${encodeURIComponent(
    cover,
  )}`;

  useEffect(() => {
    loadAlbumInfo();
    loadReviews();
    loadMoreAlbums();
  }, [title, artist]);

  useEffect(() => {
    setMarked(
      isInToReview({
        album: albumInfo.title,
        artist: albumInfo.artist,
      }),
    );
  }, [albumInfo.title, albumInfo.artist]);

  async function loadAlbumInfo() {
    try {
      const data = await getAlbumInfo(artist, title);

      setAlbumInfo({
        title: data.title || title,
        artist: data.artist || artist,
        image: data.image || image,
        year: data.year || null,
        releaseType: data.releaseType || "Álbum",
        tracks: data.tracks || [],
      });
    } catch {
      setAlbumInfo({
        title,
        artist,
        image,
        year: null,
        releaseType: "Álbum",
        tracks: [],
      });
    }
  }

  async function loadReviews() {
    try {
      const data = await getReviews();

      const filtered = data.filter(
        (review) =>
          normalize(review.album) === normalize(title) &&
          normalize(review.artist) === normalize(artist),
      );

      setReviews(filtered);
    } catch {
      setReviews([]);
    }
  }

  async function loadMoreAlbums() {
    try {
      const data = await getArtistTopAlbums(artist);

      const filtered = data
        .filter((album) => normalize(album.title) !== normalize(title))
        .slice(0, 6);

      setMoreAlbums(filtered);
    } catch {
      setMoreAlbums([]);
    }
  }

  function showToast(message) {
    setToastMessage(message);

    setTimeout(() => {
      setToastMessage("");
    }, 2200);
  }

  function handleMarked() {
    const nextMarked = toggleToReview({
      album: albumInfo.title,
      artist: albumInfo.artist,
      image: cover,
      year: albumInfo.year,
      type: albumInfo.releaseType || "Álbum",
    });

    setMarked(nextMarked);

    showToast(nextMarked ? "Agregado a Por reseñar" : "Quitado de Por reseñar");
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide">
        <div id="pageNav">
          <div className="breadcrumbs">
            <Link className="crumb" to="/home">
              Inicio
            </Link>

            <span className="crumb-sep">/</span>

            <Link className="crumb" to="/search">
              Buscar
            </Link>

            <span className="crumb-sep">/</span>

            <span className="crumb current">{albumInfo.title}</span>
          </div>

          <Link className="back-link" to="/search">
            ← Volver a la búsqueda
          </Link>
        </div>
        <div className="album-page">
          <aside className="album-sticky-cover">
            <img
              className="album-cover-img"
              src={cover}
              alt={albumInfo.title}
            />

            <div className="album-cover-actions">
              <button
                type="button"
                className={`btn btn-secondary btn-block ${
                  marked ? "btn-marked" : ""
                }`}
                onClick={handleMarked}
              >
                {marked ? "✓ Por reseñar" : "Por reseñar"}
              </button>

              <Link className="btn btn-primary btn-block" to={reviewUrl}>
                Escribir reseña
              </Link>
            </div>
          </aside>

          <div className="album-scroll">
            <section>
              <h1 className="album-title">{albumInfo.title}</h1>
              <p className="album-artist">{albumInfo.artist}</p>

              <div className="album-meta-row">
                {albumInfo.year && (
                  <span className="meta-badge year">{albumInfo.year}</span>
                )}

                <span className="meta-badge">
                  {albumInfo.releaseType || "Álbum"}
                </span>
              </div>
            </section>

            <section className="tracklist-panel">
              <h2>Lista de canciones</h2>

              {tracks.length > 0 ? (
                <>
                  <div
                    className={`tracklist-wrap ${
                      hasMoreTracks && !tracklistOpen ? "collapsed" : "expanded"
                    }`}
                  >
                    <ol>
                      {visibleTracks.map((track) => (
                        <li key={track}>{track}</li>
                      ))}
                    </ol>

                    {hasMoreTracks && !tracklistOpen && (
                      <div className="tracklist-fade"></div>
                    )}
                  </div>

                  {hasMoreTracks && (
                    <button
                      type="button"
                      className="btn btn-ghost tracklist-toggle"
                      onClick={() => setTracklistOpen(!tracklistOpen)}
                    >
                      {tracklistOpen ? "Mostrar menos" : "Mostrar más"}
                    </button>
                  )}
                </>
              ) : (
                <p className="empty-state">
                  No hay lista de canciones disponible para este lanzamiento.
                </p>
              )}
            </section>

            <section>
              <h2 className="section-heading">Reseñas</h2>

              {reviews.length === 0 ? (
                <div className="empty-state-block">
                  <p className="empty-state">
                    Todavía no hay reseñas. Sé el primero en contar tu historia.
                  </p>

                  <Link className="btn btn-primary" to={reviewUrl}>
                    Escribir reseña
                  </Link>
                </div>
              ) : (
                <div>
                  {reviews.map((review) => (
                    <Link
                      className="review-preview"
                      key={review._id}
                      to={`/review/${review._id}`}
                    >
                      <div className="review-preview-header">
                        <span>{review.username || "Usuario"}</span>
                        <span>
                          {review.createdAt
                            ? new Date(review.createdAt).toLocaleDateString(
                                "es-AR",
                              )
                            : ""}
                        </span>
                      </div>

                      <p>
                        {review.text.slice(0, 180)}
                        {review.text.length > 180 ? "…" : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {moreAlbums.length > 0 && (
              <section className="more-albums">
                <h2 className="section-heading-albums">
                  Más lanzamientos de {albumInfo.artist}
                </h2>

                <div className="more-albums-grid">
                  {moreAlbums.map((album) => (
                    <Link
                      className="more-album-card"
                      key={`${album.artist}-${album.title}`}
                      to={getAlbumUrl(album)}
                    >
                      <img
                        src={album.image || "/images/cover-placeholder.png"}
                        alt={album.title}
                      />

                      <span>{album.title}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <div className={`toast-global ${toastMessage ? "show" : ""}`}>
        {toastMessage}
      </div>
    </div>
  );
}

export default AlbumDetail;
