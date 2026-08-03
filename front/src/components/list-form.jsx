import { useEffect, useState } from "react";
import { listSchema } from "../schemas/lists.schema";
import { searchAlbums } from "../services/lastfm.service";

function sameAlbum(a, b) {
  return (
    a.album?.trim().toLowerCase() === b.album?.trim().toLowerCase() &&
    a.artist?.trim().toLowerCase() === b.artist?.trim().toLowerCase()
  );
}

function ListForm({ initialList, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    albums: [],
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: initialList?.title || "",
      description: initialList?.description || "",
      albums: initialList?.albums || [],
    });
  }, [initialList]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError("");

    try {
      const data = await searchAlbums(query.trim());
      setResults(
        data.map((album) => ({
          album: album.title,
          artist: album.artist,
          image: album.image || "/images/cover-placeholder.png",
          year: album.year || null,
          type: "Álbum",
        })),
      );
    } catch {
      setResults([]);
      setError("No se pudieron buscar álbumes en este momento.");
    } finally {
      setSearching(false);
    }
  }

  function addAlbum(album) {
    if (form.albums.some((item) => sameAlbum(item, album))) return;
    setForm({ ...form, albums: [...form.albums, album] });
  }

  function removeAlbum(album) {
    setForm({
      ...form,
      albums: form.albums.filter((item) => !sameAlbum(item, album)),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = await listSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      });

      await onSave(payload);
    } catch (submitError) {
      if (submitError.name === "ValidationError") {
        setError(submitError.errors[0]);
      } else {
        setError(submitError.message || "No se pudo guardar la lista.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="list-editor-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Curaduría</p>
          <h2>{initialList?._id ? "Editar lista" : "Crear una lista"}</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="list-title">
            Título
          </label>
          <input
            id="list-title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Ej: Discos para volver a casa"
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="list-description">
            Descripción
          </label>
          <textarea
            id="list-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Contá qué une a estos lanzamientos."
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="album-search">
            Agregar álbumes
          </label>

          <div className="list-search-row">
            <input
              id="album-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por álbum o artista"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="list-search-results">
            {results.map((album) => {
              const selected = form.albums.some((item) =>
                sameAlbum(item, album),
              );

              return (
                <article
                  className="list-search-result"
                  key={`${album.artist}-${album.album}`}
                >
                  <img src={album.image} alt={album.album} />
                  <div>
                    <strong>{album.album}</strong>
                    <span>{album.artist}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => (selected ? removeAlbum(album) : addAlbum(album))}
                  >
                    {selected ? "Quitar" : "Agregar"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div className="field-group">
          <span className="field-label">
            Seleccionados ({form.albums.length})
          </span>

          {form.albums.length > 0 ? (
            <div className="selected-albums-grid">
              {form.albums.map((album) => (
                <article
                  className="selected-album-card"
                  key={`${album.artist}-${album.album}`}
                >
                  <img
                    src={album.image || "/images/cover-placeholder.png"}
                    alt={album.album}
                  />
                  <div>
                    <strong>{album.album}</strong>
                    <span>{album.artist}</span>
                  </div>
                  <button
                    type="button"
                    className="selected-album-remove"
                    onClick={() => removeAlbum(album)}
                    aria-label={`Quitar ${album.album}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="field-hint">
              Podés guardar la lista vacía y agregar álbumes más adelante.
            </p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar lista"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

export default ListForm;
