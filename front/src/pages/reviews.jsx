import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createReview,
  deleteReview,
  getReview,
  getReviews,
  updateReview,
} from "../services/reviews.service";
import { reviewSchema } from "../schemas/reviews.schema";
import { getAlbumUrl } from "../services/album-link.service";
import { useAuth } from "../context/auth-context";
import { removeFromToReview } from "../services/to-review.service";

const significadoOptions = [
  "Hogar",
  "Viaje",
  "Noche",
  "Descubrimiento",
  "Nostalgia",
  "Euforia",
];

function canManageReview(review, usuario) {
  if (usuario?.rol === "admin") return true;

  if (review.userId) {
    return String(review.userId) === String(usuario?._id);
  }

  return review.username === usuario?.nombre;
}

function Reviews() {
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialForm = {
    artist: params.get("artist") || "",
    album: params.get("album") || "",
    image: params.get("image") || "",
    text: "",
    rating: 0,
    significado: [],
    momento: "",
    releaseType: "Álbum",
    year: "",
  };

  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const editId = params.get("edit");
  const isEditing = Boolean(editId);

  const isWritingFromAlbum = Boolean(
    params.get("artist") || params.get("album") || params.get("image"),
  );

  const isReviewFormMode = isWritingFromAlbum || isEditing;

  const albumUrl = getAlbumUrl({
    album: form.album,
    artist: form.artist,
    image: form.image,
  });

  async function loadReviews() {
    const data = await getReviews();
    setReviews(data);
  }

  async function loadReviewForEdit(id) {
    try {
      const review = await getReview(id);

      if (!canManageReview(review, usuario)) {
        setError("No tenés permisos para editar esta reseña");
        return;
      }

      setForm({
        artist: review.artist || "",
        album: review.album || "",
        image: review.image || "",
        text: review.text || "",
        rating: review.rating || 0,
        significado: review.significado || [],
        momento: review.momento || "",
        releaseType: review.releaseType || "Álbum",
        year: review.year || "",
      });
    } catch {
      setError("No se pudo cargar la reseña");
    }
  }

  useEffect(() => {
    loadReviews();

    if (editId) {
      loadReviewForEdit(editId);
      return;
    }

    setForm((prevForm) => ({
      ...prevForm,
      artist: params.get("artist") || "",
      album: params.get("album") || "",
      image: params.get("image") || "",
    }));
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function toggleSignificado(tag) {
    const alreadySelected = form.significado.includes(tag);

    setForm({
      ...form,
      significado: alreadySelected
        ? form.significado.filter((item) => item !== tag)
        : [...form.significado, tag],
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const payload = await reviewSchema.validate(
        {
          ...form,
          rating: form.rating ? Number(form.rating) : null,
          year: form.year ? Number(form.year) : null,
        },
        {
          abortEarly: false,
          stripUnknown: true,
        },
      );

      if (isEditing) {
        await updateReview(editId, payload);
        navigate(`/review/${editId}?saved=updated`);
        return;
      }

      const createdReview = await createReview(payload);
      removeFromToReview(payload);

      if (isWritingFromAlbum) {
        navigate(`/review/${createdReview._id}?saved=1`);
        return;
      }

      setForm({
        ...initialForm,
        text: "",
        rating: 0,
        significado: [],
        momento: "",
      });

      loadReviews();
    } catch (error) {
      if (error.name === "ValidationError") {
        setError(error.errors[0]);
        return;
      }

      setError("No se pudo guardar la reseña");
    }
  }

  async function handleDelete(id) {
    const review = reviews.find((item) => String(item._id) === String(id));

    if (!review || !canManageReview(review, usuario)) {
      setError("No tenés permisos para eliminar esta reseña");
      return;
    }

    const confirmDelete = window.confirm(
      "¿Seguro que querés borrar esta reseña?",
    );
    if (!confirmDelete) return;

    try {
      await deleteReview(id);
      await loadReviews();
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo borrar la reseña");
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main
        className={
          isReviewFormMode ? "app-page create-page" : "app-page app-page-wide"
        }
      >
        {isReviewFormMode && (
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

              <Link className="crumb" to={albumUrl}>
                {form.album || "Álbum"}
              </Link>

              <span className="crumb-sep">/</span>

              <span className="crumb current">
                {isEditing ? "Editar reseña" : "Escribir reseña"}
              </span>
            </div>

            <Link className="back-link" to={albumUrl}>
              ← Volver al álbum
            </Link>
          </div>
        )}

        {isReviewFormMode ? (
          <>
            <div className="album-mini">
              <img
                src={form.image || "/images/cover-placeholder.png"}
                alt={form.album}
              />

              <div>
                <h2 className="album-title" style={{ fontSize: "1.1rem" }}>
                  {form.album}
                </h2>
                <p className="album-artist">{form.artist}</p>
              </div>
            </div>

            <form className="create-intimate" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label">Reseña</label>

                <textarea
                  name="text"
                  required
                  placeholder="¿Qué te dejó este lanzamiento? No hace falta escribir una crítica. Contanos lo que te hizo pensar, sentir o recordar."
                  value={form.text}
                  onChange={handleChange}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Valoración</label>

                <div className="stars-row">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`star-btn ${
                        value <= Number(form.rating) ? "active" : ""
                      }`}
                      onClick={() =>
                        setForm({
                          ...form,
                          rating: value,
                        })
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>

                <p className="field-hint">
                  Solo vos podés ver esta valoración.
                </p>
              </div>

              <div className="optional-section">
                <h3>
                  Significado <span className="field-hint">(opcional)</span>
                </h3>

                <div className="tags-picker">
                  {significadoOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag ${
                        form.significado.includes(tag) ? "active" : ""
                      }`}
                      onClick={() => toggleSignificado(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="optional-section">
                <h3>
                  Momento <span className="field-hint">(opcional)</span>
                </h3>

                <textarea
                  name="momento"
                  rows="4"
                  placeholder="¿Hay una persona, un lugar o una etapa de tu vida que ahora asocies con este lanzamiento?"
                  value={form.momento}
                  onChange={handleChange}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: "32px" }}
              >
                {isEditing ? "Guardar cambios" : "Publicar reseña"}
              </button>
            </form>
          </>
        ) : (
          <section className="home-intro">
            <p className="eyebrow">Reseñas</p>
            <h1>Tu bitácora musical</h1>
            <p className="home-lead">
              Buscá un lanzamiento y escribí una reseña asociada a ese álbum.
            </p>
          </section>
        )}

        {!isReviewFormMode && (
          <section className="reviews-list reviews-list-full">
            {reviews.map((review) => (
              <article className="review-card" key={review._id}>
                {review.image && <img src={review.image} alt={review.album} />}

                <div>
                  <h3>{review.album}</h3>
                  <p className="review-artist">{review.artist}</p>
                  <p>{review.text}</p>

                  {(canManageReview(review, usuario) || review.momento) && (
                    <small>
                      {canManageReview(review, usuario)
                        ? review.rating
                          ? `${review.rating}/5`
                          : "Sin valoración"
                        : ""}
                      {canManageReview(review, usuario) && review.momento
                        ? " · "
                        : ""}
                      {review.momento || ""}
                    </small>
                  )}

                  {review.significado?.length > 0 && (
                    <div className="tag-list">
                      {review.significado.map((tag) => (
                        <span className="tag tag-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="card-actions">
                    <Link
                      className="btn btn-secondary"
                      to={`/review/${review._id}`}
                    >
                      Ver reseña
                    </Link>

                    {canManageReview(review, usuario) && (
                      <>
                        <Link
                          className="btn btn-secondary"
                          to={`/reviews?edit=${review._id}`}
                        >
                          Editar
                        </Link>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(review._id)}
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Reviews;
