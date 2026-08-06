import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import PageHeader from "../components/page-header";
import StatusMessage from "../components/status-message";
import { ReviewCard, fallbackCover } from "../components/content-cards";
import { useAuth } from "../context/use-auth";
import { getRelease, searchCatalog } from "../services/catalog.service";
import { createAlbumSlug, getAlbumNavigationData, getAlbumUrl } from "../services/album-link.service";
import { getArtistUrl } from "../services/artist-link.service";
import { getReviews } from "../services/reviews.service";
import { isOwnReview, orderReleaseReviews } from "../services/review-display.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";

export default function ReleaseReviews() {
  const { usuario } = useAuth();
  const { id, slug } = useParams();
  const [release, setRelease] = useState(() => getAlbumNavigationData(slug));
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let summary = id ? { catalogId: id } : getAlbumNavigationData(slug);
        if (!summary && slug) {
          const found = await searchCatalog(slug.replace(/-/g, " "), { limit: 20 });
          summary = found.releases.find((item) => createAlbumSlug(item.artist, item.album) === slug) || found.releases[0];
        }
        const detail = summary?.catalogId ? await getRelease(summary.catalogId) : summary;
        if (!detail) throw new Error("No pudimos identificar este lanzamiento.");
        const releaseReviews = await getReviews(detail.catalogId ? { releaseId: detail.catalogId } : {});
        const matchingReviews = detail.catalogId
          ? releaseReviews
          : releaseReviews.filter((item) => item.album === detail.album && item.artist === detail.artist);
        if (!active) return;
        setRelease(detail);
        setReviews(orderReleaseReviews(matchingReviews, usuario));
      } catch (loadError) {
        if (active) setError(loadError.message || "No se pudieron cargar las reseñas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, slug, usuario]);

  useEffect(() => { if (release) setBreadcrumbContext({ release }); }, [release]);

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide release-reviews-page">
        {loading && <p className="loading-text">Cargando reseñas…</p>}
        <StatusMessage type={error ? "error" : ""}>{error}</StatusMessage>
        {!loading && release && (
          <>
            <PageHeader
              trail={[
                { label: "Inicio", to: "/inicio" },
                { label: "Lanzamientos", to: "/buscar?categoria=lanzamientos" },
                { label: release.artist, to: getArtistUrl({ id: release.artistId, name: release.artist }) },
                { label: release.album, to: getAlbumUrl(release) },
                { label: "Reseñas" },
              ]}
              title={`Reseñas de ${release.album}`}
              description={`${reviews.length} ${reviews.length === 1 ? "reseña publicada" : "reseñas publicadas"}.`}
            />
            <div className="release-reviews-layout">
              <aside className="release-reviews-context">
                <Link to={getAlbumUrl(release)} aria-label={`Volver a ${release.album}`}>
                  <img src={release.image || "/images/cover-placeholder.png"} alt={`Portada de ${release.album}`} onError={fallbackCover} />
                </Link>
                <strong>{release.album}</strong>
                <Link to={getArtistUrl({ id: release.artistId, name: release.artist })}>{release.artist}</Link>
              </aside>
              <section className="release-reviews-grid" aria-label={`Reseñas de ${release.album}`}>
                {reviews.map((review) => <ReviewCard key={review._id} review={review} showEmptyRating={isOwnReview(review, usuario)} />)}
                {!reviews.length && <p className="empty-state">Todavía no hay reseñas para mostrar.</p>}
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
