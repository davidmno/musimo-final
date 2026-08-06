import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { ReleaseCard } from "../components/content-cards";
import ArtistImage from "../components/artist-image";
import StatusMessage from "../components/status-message";
import { PageTrail } from "../components/page-header";
import {
  getArtist,
  getArtistReleases,
  searchCatalog,
} from "../services/catalog.service";
import {
  createArtistSlug,
  getArtistNavigationData,
} from "../services/artist-link.service";
import {
  followArtist,
  getFollowedArtists,
  unfollowArtist,
} from "../services/community.service";
import { saveRecentSearch } from "../services/recent-searches.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";

const filters = [
  ["Álbum", "Álbumes"],
  ["Sencillo", "Sencillos"],
  ["Compilación", "Compilaciones"],
];

export default function ArtistDetail() {
  const { id, slug } = useParams();
  const [artist, setArtist] = useState(null);
  const [releases, setReleases] = useState([]);
  const [filter, setFilter] = useState("Álbum");
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    let active = true;

    async function loadArtist() {
      try {
        let summary = id ? { id } : getArtistNavigationData(slug);

        /*
         * Las rutas legibles usan el nombre del artista. Si se abre una URL
         * sin datos de navegación previos, recuperamos su identificador.
         */
        if (!summary && slug) {
          const found = await searchCatalog(slug.replace(/-/g, " "), {
            limit: 20,
          });

          summary =
            found.artists.find(
              (item) => createArtistSlug(item.name) === slug,
            ) || found.artists[0];
        }

        if (!summary?.id) {
          throw new Error("No pudimos identificar este artista.");
        }

        const [artistData, releaseData, followedArtists] = await Promise.all([
          getArtist(summary.id),
          getArtistReleases(summary.id, 100),
          getFollowedArtists(),
        ]);

        if (!active) return;

        setArtist(artistData);
        setReleases(releaseData);
        setFollowing(
          followedArtists.some(
            (item) => String(item.id) === String(summary.id),
          ),
        );
      } catch (loadError) {
        if (active) {
          setStatus({
            type: "error",
            text:
              loadError.message ||
              "No se pudo cargar el artista.",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadArtist();

    return () => {
      active = false;
    };
  }, [id, slug]);

  useEffect(() => {
    if (artist) {
      setBreadcrumbContext({ artist });
    }
  }, [artist]);

  const handleArtistImage = useCallback((image) => {
    setArtist((current) => {
      if (!current || current.image === image) return current;
      return { ...current, image };
    });
  }, []);

  useEffect(() => {
    if (!artist?.id || !artist.image) return;

    void saveRecentSearch({
      ...artist,
      type: "artist",
      title: artist.name,
      subtitle: "Artista",
    });
  }, [artist]);

  const visibleReleases = useMemo(
    () =>
      releases
        .filter((release) => release.releaseType === filter)
        .sort((left, right) =>
          String(right.releaseDate || right.year || "").localeCompare(
            String(left.releaseDate || left.year || ""),
          ),
        ),
    [filter, releases],
  );

  async function toggleFollow() {
    try {
      if (following) {
        await unfollowArtist(artist.id);
      } else {
        await followArtist(artist);
      }

      setFollowing((value) => !value);
      setStatus({
        type: "success",
        text: following
          ? `Dejaste de seguir a ${artist.name}.`
          : `Ahora seguís a ${artist.name}. Sus lanzamientos aparecerán en Inicio.`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error.message ||
          "No se pudo actualizar el seguimiento.",
      });
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide artist-detail-page">
        {loading && <p className="loading-text">Cargando artista…</p>}

        <StatusMessage type={status.type}>{status.text}</StatusMessage>

        {artist && (
          <>
            <header className="artist-hero artist-hero-compact artist-page-header">
              <span className="artist-monogram artist-portrait">
                <ArtistImage
                  artist={artist}
                  releases={releases}
                  alt={`Imagen representativa de ${artist.name}`}
                  loading="eager"
                  onResolve={handleArtistImage}
                />
              </span>

              <div className="page-heading-copy">
                <PageTrail
                  items={[
                    { label: "Inicio", to: "/inicio" },
                    { label: "Artistas", to: "/buscar?categoria=artistas" },
                    { label: artist.name },
                  ]}
                />

                <h1>{artist.name}</h1>

                <button
                  className={`btn btn-secondary btn-sm ${
                    following ? "active" : ""
                  }`}
                  type="button"
                  onClick={toggleFollow}
                >
                  {following ? "✓ Siguiendo" : "+ Seguir artista"}
                </button>
              </div>
            </header>

            <section>
              <div className="section-header">
                <h2>Discografía</h2>
                <span>{visibleReleases.length} lanzamientos</span>
              </div>

              <div className="filter-pills">
                {filters.map(([filterId, label]) => (
                  <button
                    type="button"
                    key={filterId}
                    className={filter === filterId ? "active" : ""}
                    onClick={() => setFilter(filterId)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="result-grid">
                {visibleReleases.map((release) => (
                  <ReleaseCard
                    key={release.catalogId}
                    release={release}
                  />
                ))}
              </div>

              {!visibleReleases.length && (
                <p className="empty-state">
                  No hay lanzamientos para este filtro.
                </p>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
