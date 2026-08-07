import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import StatusMessage from "../components/status-message";
import ConfirmDialog from "../components/confirm-dialog";
import PageHeader from "../components/page-header";
import { fallbackCover } from "../components/content-cards";
import { getRelease } from "../services/catalog.service";
import {
  createReview,
  deleteReview,
  getReview,
  updateReview,
} from "../services/reviews.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";
import { createAlbumSlug } from "../services/album-link.service";
import { createArtistSlug } from "../services/artist-link.service";
import AppIcon from "../components/app-icon";
import useUnsavedChangesGuard from "../hooks/use-unsaved-changes-guard";

const initialForm = { catalogId: null, artistId: null, artist: "", album: "", image: "", releaseType: "Álbum", releaseDate: null, year: null, rating: 0, text: "", significado: "", momento: "", momentoVisibility: "public" };

function releaseFields(release = {}) {
  const item = release || {};
  return {
    catalogId: item.catalogId || null,
    artistId: item.artistId || null,
    artist: item.artist || "",
    album: item.album || "",
    image: item.image || "",
    releaseType: item.releaseType || "Álbum",
    releaseDate: item.releaseDate || null,
    year: item.year || null,
  };
}

export default function Reviews() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("editar");
  const releaseParam = params.get("lanzamiento");
  const releaseId = releaseParam && !["null", "undefined"].includes(releaseParam) ? releaseParam : null;
  const initialRelease = useMemo(() => location.state?.release || null, [location.state]);
  const [form, setForm] = useState(() => ({ ...initialForm, ...releaseFields(initialRelease) }));
  const [baseline, setBaseline] = useState(() => ({ ...initialForm, ...releaseFields(initialRelease) }));
  const [loadingRelease, setLoadingRelease] = useState(Boolean(!editId && !initialRelease && releaseId));
  const [saving, setSaving] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const hasUnsavedChanges =
    JSON.stringify(form) !== JSON.stringify(baseline);

  const {
    navigationPending,
    cancelNavigation,
    confirmNavigation,
  } = useUnsavedChangesGuard(
    hasUnsavedChanges && !saving,
  );
  const { album: breadcrumbAlbum, artist: breadcrumbArtist, artistId: breadcrumbArtistId, catalogId: breadcrumbCatalogId } = form;
  const reviewTrail = [{ label: "Inicio", to: "/inicio" }, { label: "Lanzamientos", to: "/buscar?categoria=lanzamientos" }];
  if (form.artist) reviewTrail.push({ label: form.artist, to: `/artista/${createArtistSlug(form.artist)}` });
  if (form.album) reviewTrail.push({ label: form.album, to: `/lanzamiento/${createAlbumSlug(form.artist, form.album)}` });
  reviewTrail.push({ label: editId ? "Editar reseña" : "Nueva reseña" });

  useEffect(() => {
    if (!editId) return;
    getReview(editId)
      .then((review) => {
        const loaded = { ...initialForm, ...review, significado: (review.significado || []).join(", ") };
        setForm(loaded);
        setBaseline(loaded);
      })
      .catch((error) => setStatus({ type: "error", text: error.message }));
  }, [editId]);

  useEffect(() => {
    if (editId || initialRelease || !releaseId) return;
    let active = true;
    getRelease(releaseId)
      .then((release) => {
        if (!active) return;
        const loaded = { ...initialForm, ...releaseFields(release) };
        setForm(loaded);
        setBaseline(loaded);
      })
      .catch((error) => { if (active) setStatus({ type: "error", text: error.message || "No se pudo cargar el lanzamiento." }); })
      .finally(() => { if (active) setLoadingRelease(false); });
    return () => { active = false; };
  }, [editId, initialRelease, releaseId]);

  useEffect(() => {
    if (breadcrumbAlbum && breadcrumbArtist) setBreadcrumbContext({ release: { album: breadcrumbAlbum, artist: breadcrumbArtist, artistId: breadcrumbArtistId, catalogId: breadcrumbCatalogId } });
  }, [breadcrumbAlbum, breadcrumbArtist, breadcrumbArtistId, breadcrumbCatalogId]);

  function requestCancel() {
    if (hasUnsavedChanges) {
      setCancelPending(true);
    } else {
      navigate(-1);
    }
  }

  async function removeReview() {
    if (!editId) return;

    setSaving(true);
    setStatus({ type: "", text: "" });

    try {
      await deleteReview(editId);
      setDeletePending(false);
      navigate("/inicio", { replace: true });
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error.message ||
          "No se pudo eliminar la reseña.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.album || !form.artist) return setStatus({ type: "error", text: "Primero elegí un lanzamiento." });
    setSaving(true);
    setStatus({ type: "", text: "" });
    const payload = { ...form, significado: String(form.significado).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8) };
    try {
      const saved = editId ? await updateReview(editId, payload) : await createReview(payload);
      navigate(`/resena/${saved._id}?guardada=${editId ? "actualizada" : "creada"}`);
    } catch (error) { setStatus({ type: "error", text: error.message || "No se pudo guardar la reseña." }); }
    finally { setSaving(false); }
  }

  if (!editId && !initialRelease && !releaseId) return <Navigate to="/buscar" replace />;

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide review-editor-page">
        <section className="review-editor-panel creation-editor-panel">
          <StatusMessage type={status.type}>{status.text}</StatusMessage>
          <form className="review-editor-form creation-editor-form" onSubmit={submit}>
            <div className="mobile-editor-toolbar">
              <button
                className="back-button"
                type="button"
                onClick={requestCancel}
                aria-label="Volver"
              >
                <AppIcon name="arrow-left" size={16} />
                Volver
              </button>
              <strong>
                {editId ? "Editar reseña" : "Nueva reseña"}
              </strong>
              <span aria-hidden="true" />
            </div>
            <PageHeader trail={reviewTrail} title={editId ? "Editar reseña" : "Nueva reseña"} description="Valorá el lanzamiento y dejá registrada tu experiencia." className="creation-editor-heading" action={<div className="form-actions creation-desktop-actions"><button className="btn btn-tertiary" type="button" onClick={requestCancel} disabled={saving}>Cancelar</button><button className="btn btn-primary btn-review" type="submit" disabled={saving} aria-busy={saving}>{saving ? "Guardando…" : editId ? "Guardar cambios" : "Publicar reseña"}</button></div>} />

            <div className="review-editor-columns creation-editor-columns">
              <aside className="review-editor-context creation-editor-sidebar">
                <div className="creation-section-heading"><h2>Lanzamiento</h2><p>La reseña quedará vinculada a este lanzamiento.</p></div>
                {loadingRelease && <p className="loading-text">Cargando lanzamiento…</p>}
                {!loadingRelease && form.album && <div className="review-selected-release">
                  <img src={form.image || "/images/cover-placeholder.png"} alt={`Portada de ${form.album}`} onError={fallbackCover} />
                  <div><small>{form.releaseType || "Lanzamiento"}{form.year ? ` · ${form.year}` : ""}</small><strong>{form.album}</strong><span>{form.artist}</span></div>
                </div>}

                <div className="rating-field review-page-rating review-optional-field" role="group" aria-labelledby="review-rating-title"><h2 id="review-rating-title">Tu valoración <span>(opcional)</span></h2><p>Solo vos podés verla.</p><div className="review-optional-control">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= form.rating ? "active" : ""} onClick={() => setForm({ ...form, rating: form.rating === star ? 0 : star })} aria-label={`${star} estrellas`} title={form.rating === star ? "Quitar valoración" : `${star} estrellas`}><AppIcon name="star" size={34} fill={star <= form.rating ? "currentColor" : "none"} /></button>)}</div></div>

                <div className="review-optional-field"><h2>Tu significado <span>(opcional)</span></h2><p>Agregá hasta ocho etiquetas, separadas por comas.</p><label aria-label="Tu significado"><input value={form.significado} onChange={(event) => setForm({ ...form, significado: event.target.value })} placeholder="Viaje, hogar, descubrimiento" /></label></div>
              </aside>

              <div className="review-editor-story creation-editor-main">
                <div className="creation-section-heading"><h2>Tu reseña</h2><p>Contá qué te hizo sentir, pensar o recordar este lanzamiento.</p></div>

                <label aria-label="Reseña"><textarea rows="12" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="¿Qué te hizo sentir, pensar o recordar?" required minLength="5" maxLength="10000" /><small>{form.text.length}/10.000</small></label>

                <div className="review-moment-block review-optional-field"><div className="moment-heading"><div><h2>Tu momento <span>(opcional)</span></h2><p>Vinculá esta música con una persona, un lugar o una etapa.</p></div><div className="moment-visibility-control"><span>Visibilidad:</span><button className={`moment-visibility-toggle ${form.momentoVisibility === "private" ? "private" : ""}`} type="button" aria-pressed={form.momentoVisibility === "private"} aria-label={form.momentoVisibility === "private" ? "Momento privado. Hacer público" : "Momento público. Hacer privado"} title={form.momentoVisibility === "private" ? "Momento privado" : "Momento público"} onClick={() => setForm({ ...form, momentoVisibility: form.momentoVisibility === "private" ? "public" : "private" })}><AppIcon name={form.momentoVisibility === "private" ? "eye-off" : "eye"} /></button></div></div><label><textarea rows="4" value={form.momento} onChange={(event) => setForm({ ...form, momento: event.target.value })} placeholder="Escribí tu momento" maxLength="2000" /></label></div>
              </div>
            </div>
            <div
              className={`mobile-sticky-submit ${
                editId ? "has-delete-action" : ""
              }`}
            >
              {editId && (
                <button
                  className="btn btn-tertiary danger"
                  type="button"
                  disabled={saving}
                  onClick={() => setDeletePending(true)}
                >
                  Eliminar reseña
                </button>
              )}

              <button
                className="btn btn-primary btn-review"
                type="submit"
                disabled={saving}
                aria-busy={saving}
              >
                {saving
                  ? "Guardando…"
                  : editId
                    ? "Guardar cambios"
                    : "Publicar reseña"}
              </button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
      <ConfirmDialog
        open={cancelPending}
        title="¿Descartar los cambios?"
        description={
          editId
            ? "Las modificaciones de esta reseña no se guardarán."
            : "La reseña nueva y todo lo que escribiste se perderán."
        }
        confirmLabel="Descartar"
        onCancel={() => setCancelPending(false)}
        onConfirm={() => navigate(-1)}
      />

      <ConfirmDialog
        open={navigationPending}
        title="¿Descartar los cambios?"
        description={
          editId
            ? "Las modificaciones de esta reseña no se guardarán."
            : "La reseña nueva y todo lo que escribiste se perderán."
        }
        confirmLabel="Salir"
        onCancel={cancelNavigation}
        onConfirm={confirmNavigation}
      />

      <ConfirmDialog
        open={deletePending}
        title="¿Eliminar esta reseña?"
        description="La reseña se eliminará de forma permanente."
        confirmLabel="Eliminar"
        onCancel={() => setDeletePending(false)}
        onConfirm={removeReview}
      />
    </div>
  );
}
