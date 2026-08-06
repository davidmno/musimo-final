import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Comments from "../components/comments";
import StatusMessage from "../components/status-message";
import {
  Avatar,
  fallbackCover,
} from "../components/content-cards";
import ConfirmDialog from "../components/confirm-dialog";
import { PageTrail } from "../components/page-header";
import {
  commentReview,
  deleteReview,
  getReview,
  getReviewComments,
  resonateReview,
} from "../services/reviews.service";
import { getAlbumUrl } from "../services/album-link.service";
import { getArtistUrl } from "../services/artist-link.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";
import BackButton from "../components/back-button";
import ActionSheet from "../components/action-sheet";
import AppIcon from "../components/app-icon";

function ReviewRating({
  value = 0,
  showEmpty = false,
}) {
  const rating = Math.max(
    0,
    Math.min(5, Math.round(Number(value) || 0)),
  );

  if (!rating && !showEmpty) {
    return null;
  }

  return (
    <span
      className="rating-stars rating-display"
      role="img"
      aria-label={`${rating} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <AppIcon
          key={star}
          name="star"
          size={19}
          className={
            star <= rating
              ? "rating-star is-filled"
              : "rating-star"
          }
          fill={
            star <= rating
              ? "currentColor"
              : "none"
          }
        />
      ))}
    </span>
  );
}

export default function ReviewDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionsOpen, setActionsOpen] =
    useState(false);

  const savedState = params.get("guardada");

  const [status, setStatus] = useState({
    type: savedState ? "success" : "",
    text: ["actualizada", "updated"].includes(
      savedState,
    )
      ? "Reseña actualizada."
      : savedState
        ? "Reseña publicada."
        : "",
  });

  useEffect(() => {
    let active = true;

    setLoading(true);

    getReview(id)
      .then((data) => {
        if (!active) return;

        setReview(data);
      })
      .catch((error) => {
        if (!active) return;

        setReview(null);
        setStatus({
          type: "error",
          text:
            error.message ||
            "No pudimos abrir esta reseña.",
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (review) {
      setBreadcrumbContext({ review });
    }
  }, [review]);

  const loadComments = useCallback(
    () => getReviewComments(id),
    [id],
  );

  const addComment = useCallback(
    (text) => commentReview(id, text),
    [id],
  );

  async function resonate() {
    try {
      const data = await resonateReview(id);

      setReview((current) => ({
        ...current,
        resonatedByMe: data.resonated,
      }));

      setStatus({
        type: "success",
        text: data.resonated
          ? "Esta historia resonó con vos."
          : "Quitaste tu resonancia.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error.message,
      });
    }
  }

  async function remove() {
    if (!review) return;

    setDeleting(true);

    try {
      await deleteReview(id);

      navigate(getAlbumUrl(review), {
        replace: true,
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error.message,
      });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide story-detail-page">
        {loading && (
          <p className="loading-text">
            Cargando historia…
          </p>
        )}

        <StatusMessage type={status.type}>
          {status.text}
        </StatusMessage>

        {!loading && !review && (
          <section className="review-load-error empty-state">
            <h1>No pudimos abrir esta reseña</h1>

            <p>
              La reseña puede no existir o no estar
              disponible en este momento.
            </p>

            <Link
              className="btn btn-primary"
              to="/inicio"
            >
              Volver al inicio
            </Link>
          </section>
        )}

        {review && (
          <>
            <div className="mobile-detail-toolbar">
              <BackButton
                fallback={getAlbumUrl(review)}
              />

              {review.canManage && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Acciones de la reseña"
                  onClick={() =>
                    setActionsOpen(true)
                  }
                >
                  <AppIcon name="more" />
                </button>
              )}
            </div>

            <div className="review-detail-shell">
              <aside className="review-release-context">
                <Link
                  className="review-detail-cover-link"
                  to={getAlbumUrl(review)}
                  aria-label={`Ir al lanzamiento ${review.album}`}
                  title={`Ir a ${review.album}`}
                >
                  <img
                    src={
                      review.image ||
                      "/images/cover-placeholder.png"
                    }
                    alt={`Portada de ${review.album}`}
                    onError={fallbackCover}
                  />
                </Link>

                <div className="review-side-actions">
                  {!review.canManage && (
                    <button
                      className={`btn btn-secondary ${
                        review.resonatedByMe
                          ? "active"
                          : ""
                      }`}
                      type="button"
                      onClick={resonate}
                    >
                      <AppIcon
                        name="heart"
                        size={17}
                        fill={
                          review.resonatedByMe
                            ? "currentColor"
                            : "none"
                        }
                      />

                      <span>
                        {review.resonatedByMe
                          ? "Resonó"
                          : "Resonar con esta reseña"}
                      </span>
                    </button>
                  )}

                  {review.canManage && (
                    <>
                      <Link
                        className="btn btn-primary btn-review"
                        to={`/resenas?editar=${review._id}`}
                      >
                        Editar reseña
                      </Link>

                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() =>
                          setConfirmDelete(true)
                        }
                      >
                        Eliminar reseña
                      </button>
                    </>
                  )}
                </div>
              </aside>

              <div className="review-detail-content">
                <article className="story-detail">
                  <header className="page-heading-copy">
                    <PageTrail
                      items={[
                        {
                          label: "Inicio",
                          to: "/inicio",
                        },
                        {
                          label: "Lanzamientos",
                          to: "/buscar?categoria=lanzamientos",
                        },
                        {
                          label: review.artist,
                          to: getArtistUrl({
                            id: review.artistId,
                            name: review.artist,
                          }),
                        },
                        {
                          label: review.album,
                          to: getAlbumUrl(review),
                        },
                        {
                          label: `Reseña de ${
                            review.author?.nombre ||
                            review.username ||
                            "Usuario"
                          }`,
                        },
                      ]}
                    />

                    <Link
                      className="review-mobile-cover"
                      to={getAlbumUrl(review)}
                      aria-label={`Ir al lanzamiento ${review.album}`}
                    >
                      <img
                        src={
                          review.image ||
                          "/images/cover-placeholder.png"
                        }
                        alt={`Portada de ${review.album}`}
                        onError={fallbackCover}
                      />
                    </Link>

                    <h1>{review.album}</h1>

                    <p className="story-author-heading author-with-avatar">
                      <Avatar
                        user={
                          review.author || {
                            nombre: review.username,
                          }
                        }
                        size={30}
                      />

                      <span className="story-author-copy">
                        Reseña de{" "}
                        {review.author?.handle ? (
                          <Link
                            to={`/usuario/${review.author.handle}`}
                          >
                            {review.author.nombre}
                          </Link>
                        ) : (
                          review.username || "Usuario"
                        )}
                      </span>
                    </p>

                    <Link
                      className="artist-link"
                      to={getArtistUrl({
                        id: review.artistId,
                        name: review.artist,
                      })}
                    >
                      {review.artist}
                    </Link>

                    <ReviewRating
                      value={review.rating}
                      showEmpty={review.canManage}
                    />
                  </header>

                  <div className="review-mobile-owner-actions">
                    {review.canManage ? (
                      <Link
                        className="btn btn-primary btn-review"
                        to={`/resenas?editar=${review._id}`}
                      >
                        <AppIcon
                          name="pencil"
                          size={17}
                        />
                        Editar reseña
                      </Link>
                    ) : (
                      <button
                        className={`btn btn-secondary review-mobile-interaction ${
                          review.resonatedByMe
                            ? "active"
                            : ""
                        }`}
                        type="button"
                        onClick={resonate}
                      >
                        <AppIcon
                          name="heart"
                          size={17}
                          fill={
                            review.resonatedByMe
                              ? "currentColor"
                              : "none"
                          }
                        />

                        <span>
                          {review.resonatedByMe
                            ? "Resonó"
                            : "Resonar con esta reseña"}
                        </span>
                      </button>
                    )}
                  </div>

                  <section className="review-content-section review-copy-section">
                    <h2>Reseña</h2>

                    <p className="story-detail-text">
                      {review.text}
                    </p>
                  </section>

                  {review.significado?.length > 0 && (
                    <section className="review-content-section review-meaning-section">
                      <h2>Significado</h2>

                      <div className="tag-list">
                        {review.significado.map(
                          (tag) => (
                            <span
                              className="tag"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ),
                        )}
                      </div>
                    </section>
                  )}

                  {review.momento && (
                    <section className="review-content-section review-moment-section">
                      <h2>Momento</h2>
                      <p>{review.momento}</p>
                    </section>
                  )}
                </article>

                <Comments
                  loadComments={loadComments}
                  addComment={addComment}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      <ActionSheet
        open={actionsOpen}
        title="Acciones de la reseña"
        onClose={() => setActionsOpen(false)}
        items={[
          {
            label: "Editar reseña",
            icon: "pencil",
            variant: "primary",
            hidden: !review?.canManage,
            to: review
              ? `/resenas?editar=${review._id}`
              : "/resenas",
          },
          {
            label: "Ir al lanzamiento",
            icon: "music",
            to: review
              ? getAlbumUrl(review)
              : "/buscar",
          },
          {
            label: "Eliminar reseña",
            icon: "trash",
            danger: true,
            hidden: !review?.canManage,
            onSelect: () =>
              setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar esta reseña?"
        description="La reseña, sus comentarios y resonancias se eliminarán de forma permanente."
        confirmLabel="Eliminar reseña"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={deleting}
      />
    </div>
  );
}
