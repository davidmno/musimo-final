import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import {
  Avatar,
  ListCard,
  ReleaseCard,
  ReviewCard,
} from "../components/content-cards";
import StatusMessage from "../components/status-message";
import PageHeader from "../components/page-header";
import { getHomeContent } from "../services/community.service";
import {
  getToReviewList,
  removeFromToReview,
} from "../services/to-review.service";
import { followUser, unfollowUser } from "../services/usuarios.service";
import AppIcon from "../components/app-icon";

const empty = {
  newReleases: [],
  generatingStories: [],
  recentStories: [],
  discoverLists: [],
  suggestedUsers: [],
};

const contextualBackState = { contextualBack: true };

function Section({ title, action, children, className = "" }) {
  const railRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canAdvance, setCanAdvance] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    function updateControls() {
      const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
      setCanGoBack(rail.scrollLeft > 4);
      setCanAdvance(remaining > 4);
    }
    updateControls();
    rail.addEventListener("scroll", updateControls, { passive: true });
    const observer = new ResizeObserver(updateControls);
    observer.observe(rail);
    window.addEventListener("resize", updateControls);
    return () => {
      rail.removeEventListener("scroll", updateControls);
      observer.disconnect();
      window.removeEventListener("resize", updateControls);
    };
  }, [children]);

  function move(direction) {
    railRef.current?.scrollBy({
      left: railRef.current.clientWidth * 0.82 * direction,
      behavior: "smooth",
    });
  }
  return (
    <section className={`home-section carousel-section ${className}`.trim()}>
      <div className="section-header">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="carousel-frame">
        <div className="horizontal-grid" ref={railRef}>
          {children}
        </div>
        {canGoBack && (
          <button
            type="button"
            className="carousel-control carousel-prev"
            onClick={() => move(-1)}
            aria-label={`Volver en ${title}`}
          >
            <AppIcon name="arrow-left" />
          </button>
        )}
        {canAdvance && (
          <button
            type="button"
            className="carousel-control carousel-next"
            onClick={() => move(1)}
            aria-label={`Ver más de ${title}`}
          >
            <AppIcon name="arrow-right" />
          </button>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [content, setContent] = useState(empty);
  const [toReview, setToReview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followingBusy, setFollowingBusy] = useState(null);
  const [removingReview, setRemovingReview] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getHomeContent(), getToReviewList()])
      .then(([home, saved]) => {
        if (active) {
          setContent(home);
          setToReview(saved);
        }
      })
      .catch((loadError) => {
        if (active)
          setError(loadError.message || "No se pudo cargar el inicio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleSuggestedUser(user) {
    setFollowingBusy(user._id);
    try {
      if (user.isFollowing) await unfollowUser(user._id);
      else await followUser(user._id);
      setContent((current) => ({
        ...current,
        suggestedUsers: current.suggestedUsers.map((item) =>
          String(item._id) === String(user._id)
            ? { ...item, isFollowing: !item.isFollowing }
            : item,
        ),
      }));
    } catch (followError) {
      setError(followError.message || "No se pudo actualizar el seguimiento.");
    } finally {
      setFollowingBusy(null);
    }
  }

  async function removeSavedRelease(release) {
    const key = release.catalogId || `${release.artist}-${release.album}`;
    setRemovingReview(key);
    try {
      setToReview(await removeFromToReview(release));
    } catch (removeError) {
      setError(removeError.message || "No se pudo quitar el lanzamiento.");
    } finally {
      setRemovingReview(null);
    }
  }

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide social-page home-page">
        <PageHeader
          trail={[{ label: "Inicio" }]}
          title="Tu próximo momento musical"
          description="Recorré lanzamientos, historias y listas destacadas."
          action={
            <Link className="btn btn-primary" to="/buscar" state={contextualBackState}>
              Buscar música
            </Link>
          }
        />
        <StatusMessage type="error">{error}</StatusMessage>
        {loading ? (
          <p className="loading-text">Preparando descubrimientos…</p>
        ) : (
          <div className="home-content-layout">
            <aside
              className="home-sidebar"
              aria-label="Tu actividad y personas sugeridas"
            >
              <section className="home-sidebar-section home-section-to-review">
                <div className="home-sidebar-heading">
                  <h2>Por reseñar</h2>
                  <Link to="/perfil" state={contextualBackState}>Ver todo</Link>
                </div>
                <div className="home-review-queue">
                  {toReview.slice(0, 4).map((release) => {
                    const key =
                      release.catalogId || `${release.artist}-${release.album}`;
                    return (
                      <article className="home-review-item" key={key}>
                        <ReleaseCard compact release={release} />
                        <button
                          type="button"
                          onClick={() => removeSavedRelease(release)}
                          disabled={removingReview === key}
                          aria-label={`Quitar ${release.album} de Por reseñar`}
                          title="Quitar de Por reseñar"
                        >
                          <AppIcon name="x" size={16} />
                        </button>
                      </article>
                    );
                  })}
                </div>
                {!toReview.length && (
                  <Link
                    className="empty-state-action home-sidebar-cta"
                    to="/buscar"
                    state={contextualBackState}
                  >
                    <span>Todavía no guardaste lanzamientos.</span>
                    <strong>Buscar para guardar →</strong>
                  </Link>
                )}
              </section>
              <section className="home-sidebar-section home-section-users">
                <div className="home-sidebar-heading">
                  <h2>A quién seguir</h2>
                </div>
                <div className="home-follow-suggestions">
                  {content.suggestedUsers.map((user) => (
                    <article key={user._id}>
                      <Link to={`/usuario/${user.handle}`}>
                        <Avatar user={user} size={38} />
                        <span>
                          <strong>{user.nombre}</strong>
                          <small>@{user.handle}</small>
                        </span>
                      </Link>
                      <button
                        className={`btn btn-sm ${user.isFollowing ? "btn-secondary active" : "btn-primary"}`}
                        type="button"
                        onClick={() => toggleSuggestedUser(user)}
                        disabled={followingBusy === user._id}
                      >
                        {followingBusy === user._id
                          ? "…"
                          : user.isFollowing
                            ? "Siguiendo"
                            : "Seguir"}
                      </button>
                    </article>
                  ))}
                </div>
                {!content.suggestedUsers.length && (
                  <p className="home-sidebar-empty">
                    No hay personas nuevas para sugerir.
                  </p>
                )}
              </section>
            </aside>
            <div className="home-main-content">
              <Section
                className="home-section-new-releases"
                title="Nuevos lanzamientos"
                action={
                  <Link to="/buscar?categoria=lanzamientos" state={contextualBackState}>Buscar más</Link>
                }
              >
                {content.newReleases.map((release) => (
                  <ReleaseCard
                    key={release.catalogId}
                    release={release}
                    recentDate
                  />
                ))}
                {!content.newReleases.length && (
                  <p className="empty-state">
                    El catálogo está actualizándose. Probá la búsqueda mientras
                    tanto.
                  </p>
                )}
              </Section>
              <Section
                className="home-section-reviews"
                title="Reseñas de la comunidad"
                action={<Link to="/comunidad?tipo=resenas" state={contextualBackState}>Ver más</Link>}
              >
                {content.recentStories.map((review) => (
                  <ReviewCard key={review._id} review={review} home />
                ))}
                {!content.recentStories.length && (
                  <p className="empty-state">
                    Las primeras historias de la comunidad aparecerán acá.
                  </p>
                )}
              </Section>
              <Section
                className="home-section-lists"
                title="Listas para descubrir"
                action={<Link to="/comunidad?tipo=listas" state={contextualBackState}>Ver más</Link>}
              >
                {content.discoverLists.map((list) => (
                  <ListCard key={list._id} list={list} />
                ))}
                {!content.discoverLists.length && (
                  <p className="empty-state">Todavía no hay listas públicas.</p>
                )}
              </Section>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
