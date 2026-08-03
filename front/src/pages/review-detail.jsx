import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../context/auth-context";
import { deleteReview, getReview } from "../services/reviews.service";
import { getAlbumUrl } from "../services/album-link.service";

function canManageReview(review, usuario) {
  if (usuario?.rol === "admin") return true;

  if (review?.userId) {
    return String(review.userId) === String(usuario?._id);
  }

  return review?.username === usuario?.nombre;
}

function ReviewDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(Boolean(params.get("saved")));

  useEffect(() => {
    loadReview();

    if (params.get("saved")) {
      const timer = setTimeout(() => {
        setToastVisible(false);
      }, 2200);

      return () => clearTimeout(timer);
    }
  }, [id]);

  async function loadReview() {
    try {
      const data = await getReview(id);
      setReview(data);
    } catch {
      setReview(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmDelete = window.confirm(
      "¿Eliminar esta reseña? Esta acción no se puede deshacer.",
    );

    if (!confirmDelete) return;

    try {
      await deleteReview(review._id);
      navigate(albumUrl);
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la reseña.");
    }
  }

  if (loading) {
    return (
      <div className="app-body">
        <Navbar />
        <main className="app-page">
          <p className="loading-text">Cargando reseña…</p>
        </main>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="app-body">
        <Navbar />
        <main className="app-page">
          <p className="empty-state">Reseña no encontrada.</p>
        </main>
      </div>
    );
  }

  const albumUrl = getAlbumUrl(review);
  const isOwnerOrAdmin = canManageReview(review, usuario);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page">
        <div id="pageNav">
          <div className="breadcrumbs">
            <Link className="crumb" to="/home">Inicio</Link>
            <span className="crumb-sep">/</span>
            <Link className="crumb" to="/search">Buscar</Link>
            <span className="crumb-sep">/</span>
            <Link className="crumb" to={albumUrl}>{review.album}</Link>
            <span className="crumb-sep">/</span>
            <span className="crumb current">Reseña</span>
          </div>

          <Link className="back-link" to={albumUrl}>← Volver al álbum</Link>
        </div>

        <div id="reviewContent">
          <div className="review-page-header">
            <div className="user-avatar">{(review.username || "U")[0]}</div>
            <span>{review.username || "Usuario"}</span>
          </div>

          <div className="review-hero">
            <img
              src={review.image || "/images/cover-placeholder.png"}
              alt={review.album}
            />

            <div>
              <h1>{review.album}</h1>
              <p>
                {review.artist}
                {review.year ? ` · ${review.year}` : ""}
              </p>

              {isOwnerOrAdmin && (
                <div className="stars" aria-label="Valoración">
                  {review.rating ? (
                    stars.map((star) => (
                      <span
                        className={`star ${
                          star <= Number(review.rating) ? "filled" : ""
                        }`}
                        key={star}
                      >
                        ★
                      </span>
                    ))
                  ) : (
                    <span className="stars-empty">Sin valoración</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <article className="review-body">{review.text}</article>

          {review.significado?.length > 0 && (
            <div className="review-block">
              <h3>Significado</h3>
              <div className="tag-list">
                {review.significado.map((tag) => (
                  <span className="tag tag-chip" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {review.momento && (
            <div className="review-block momento">
              <h3>Momento</h3>
              <p>{review.momento}</p>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="review-actions">
            <Link className="btn btn-secondary" to={albumUrl}>
              Volver al álbum
            </Link>

            {isOwnerOrAdmin && (
              <>
                <Link
                  className="btn btn-secondary"
                  to={`/reviews?edit=${review._id}`}
                >
                  Editar
                </Link>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <div className={`toast-global ${toastVisible ? "show" : ""}`}>
        {params.get("saved") === "updated"
          ? "Reseña actualizada"
          : "Reseña publicada"}
      </div>
    </div>
  );
}

export default ReviewDetail;
