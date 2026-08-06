import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { ReleaseCard, ReviewCard, fallbackCover } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import { PageTrail } from "../components/page-header";
import { getArtistReleases, getRelease, getReleaseTracks, searchCatalog } from "../services/catalog.service";
import { getReviews } from "../services/reviews.service";
import { addToReview, getToReviewList, isInToReview, removeFromToReview } from "../services/to-review.service";
import { createAlbumSlug, getAlbumNavigationData, getAlbumUrl } from "../services/album-link.service";
import { getArtistUrl } from "../services/artist-link.service";
import { saveRecentSearch } from "../services/recent-searches.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";
import { isOwnReview, orderReleaseReviews } from "../services/review-display.service";
import { useAuth } from "../context/use-auth";
import BackButton from "../components/back-button";

function duration(milliseconds) {
  if (!milliseconds) return "";
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function comparable(value = "") {
  return String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function relatedReleases(release) {
  try {
    if (release.artistId) return await getArtistReleases(release.artistId, 12);
    const results = await searchCatalog(release.artist, { limit: 20 });
    const expected = comparable(release.artist);
    const artist = results.artists?.find((item) => comparable(item.name || item.artist) === expected);
    const artistId = artist?.id || artist?.catalogId || results.releases?.find((item) => comparable(item.artist) === expected)?.artistId;
    if (artistId) return await getArtistReleases(artistId, 12);
    return (results.releases || []).filter((item) => comparable(item.artist) === expected);
  } catch {
    return [];
  }
}

export default function AlbumDetail() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { id, slug } = useParams();
  const [release, setRelease] = useState(() => getAlbumNavigationData(slug));
  const [reviews, setReviews] = useState([]);
  const [more, setMore] = useState([]);
  const [saved, setSaved] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracksExpanded, setTracksExpanded] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

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
        if (!active) return;
        setRelease(detail);
        setLoading(false);
        setTracks(detail.tracks || []);
        saveRecentSearch({ ...detail, type: "release", title: detail.album, subtitle: detail.artist });
        if (detail.catalogId) {
          setTracksLoading(true);
          getReleaseTracks(detail.catalogId)
            .then((items) => { if (active) setTracks(items || []); })
            .catch(() => undefined)
            .finally(() => { if (active) setTracksLoading(false); });
        }

        const [releaseReviews, savedItems, discography] = await Promise.all([
          getReviews(detail.catalogId ? { releaseId: detail.catalogId } : {}),
          getToReviewList(),
          relatedReleases(detail),
        ]);
        if (!active) return;
        const matchingReviews = detail.catalogId ? releaseReviews : releaseReviews.filter((item) => item.album === detail.album && item.artist === detail.artist);
        setReviews(orderReleaseReviews(matchingReviews, usuario));
        setSaved(isInToReview(savedItems, detail));
        setMore(discography.filter((item) => item.catalogId !== detail.catalogId).slice(0, 8));
      } catch (error) {
        if (active) setStatus({ type: "error", text: error.message || "No se pudo cargar el lanzamiento." });
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [id, slug, usuario]);

  useEffect(() => { if (release) setBreadcrumbContext({ release }); }, [release]);

  async function toggleSaved() {
    try {
      if (saved) await removeFromToReview(release);
      else await addToReview(release);
      setSaved((value) => !value);
      setStatus({ type: "success", text: saved ? "Quitado de Por reseñar." : "Guardado en Por reseñar." });
    } catch (error) { setStatus({ type: "error", text: error.message || "No se pudo guardar." }); }
  }

  function startReview() {
    const target = release.catalogId ? `/resenas?nueva=1&lanzamiento=${encodeURIComponent(release.catalogId)}` : "/resenas?nueva=1";
    navigate(target, { state: { release } });
  }

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide">
        <div className="mobile-context-row"><BackButton fallback="/buscar" /></div>
        {loading && <p className="loading-text">Cargando lanzamiento…</p>}
        <StatusMessage type={status.type}>{status.text}</StatusMessage>
        {!loading && release && (
          <>
            <div className="release-detail-shell">
              <aside className="release-sticky-column">
                <img className="release-hero-cover" src={release.image || "/images/cover-placeholder.png"} alt={`Portada de ${release.album}`} onError={fallbackCover} />
                <div className="release-actions release-sidebar-actions">
                  <button className="btn btn-primary btn-review" type="button" onClick={startReview}>Escribir reseña</button>
                  <button className="btn btn-secondary" type="button" onClick={toggleSaved}>{saved ? "✓ En Por reseñar" : "+ Por reseñar"}</button>
                </div>
              </aside>
              <div className="release-detail-content">
                <header className="release-detail-header page-heading-copy">
                <PageTrail items={[{ label: "Inicio", to: "/inicio" }, { label: "Lanzamientos", to: "/buscar?categoria=lanzamientos" }, { label: release.artist, to: getArtistUrl({ id: release.artistId, name: release.artist }) }, { label: release.album }]} />
                <h1>{release.album}</h1>
                <Link className="artist-link" to={getArtistUrl({ id: release.artistId, name: release.artist })}>{release.artist}</Link>
                <p className="release-metadata">{[release.year, release.releaseType].filter(Boolean).join(" · ")}</p>
                </header>
                {(tracksLoading || tracks.length > 0) && <section className={`tracklist-preview ${tracksExpanded ? "expanded" : ""}`}>
                  <div className="tracklist-heading"><h2>Canciones</h2>{tracksLoading ? <span>Cargando…</span> : <span>{tracks.length} canciones</span>}</div>
                  <ol>{(tracksExpanded ? tracks : tracks.slice(0, 4)).map((track, index) => <li key={track.id || `${track.title}-${index}`}><span className="track-number">{index + 1}</span><strong>{track.title}</strong><time>{duration(track.length)}</time></li>)}</ol>
                  {tracks.length > 4 && <button className="tracklist-toggle" type="button" onClick={() => setTracksExpanded((value) => !value)}>{tracksExpanded ? "Ver menos" : `Ver todas las canciones (${tracks.length})`}</button>}
                </section>}
                <section className="community-release-section">
                  <div className="section-header"><h2>Reseñas de la comunidad</h2>{reviews.length > 0 && <Link className="btn btn-secondary btn-sm" to={`${getAlbumUrl(release)}/resenas`}>Ver todas</Link>}</div>
                  <div className="release-review-preview-grid">{reviews.slice(0, 3).map((review) => <ReviewCard key={review._id} review={review} preview showEmptyRating={isOwnReview(review, usuario)} />)}</div>
                  {!reviews.length && <button className="empty-state empty-state-action empty-state-button" type="button" onClick={startReview}><span>Todavía nadie contó una historia sobre este lanzamiento.</span><strong>Escribir la primera reseña →</strong></button>}
                </section>
                <section className="more-by-artist"><h2>Más de {release.artist}</h2>{more.length > 0 ? <div className="result-grid more-releases-grid">{more.map((item) => <ReleaseCard key={item.catalogId} release={item} />)}</div> : <p className="empty-state">No encontramos otros lanzamientos disponibles de este artista.</p>}</section>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
