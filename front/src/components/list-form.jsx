import { useEffect, useState } from "react";
import { searchCatalog } from "../services/catalog.service";
import { fallbackCover } from "./content-cards";
import StatusMessage from "./status-message";
import ConfirmDialog from "./confirm-dialog";
import PageHeader from "./page-header";
import AppIcon from "./app-icon";

const blank = { title: "", description: "", visibility: "public", albums: [] };

export default function ListForm({ initialList, onSave, onCancel }) {
  const [form, setForm] = useState(blank);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [cancelPending, setCancelPending] = useState(false);

  useEffect(() => { setForm(initialList ? { ...blank, ...initialList } : blank); }, [initialList]);

  async function search(event) {
    event.preventDefault(); if (query.trim().length < 2) return;
    setBusy(true); setStatus({ type: "", text: "" });
    try { setResults((await searchCatalog(query, { limit: 12, releaseLimit: 36, expandArtist: true })).releases); }
    catch (error) { setStatus({ type: "error", text: error.message || "No se pudo buscar." }); }
    finally { setBusy(false); }
  }

  function add(release) {
    if (form.albums.some((item) => item.catalogId === release.catalogId)) return;
    setForm({ ...form, albums: [...form.albums, release] });
  }

  function remove(index) { setForm({ ...form, albums: form.albums.filter((_, position) => position !== index) }); }
  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= form.albums.length) return;
    const albums = [...form.albums];
    [albums[index], albums[target]] = [albums[target], albums[index]];
    setForm({ ...form, albums });
  }

  function moveTo(from, to) {
    if (from === null || from === to || from < 0 || to < 0) return;
    const albums = [...form.albums];
    const [release] = albums.splice(from, 1);
    albums.splice(to, 0, release);
    setForm({ ...form, albums });
  }

  function requestCancel() {
    const original = initialList ? { ...blank, ...initialList } : blank;
    const changed = JSON.stringify(form) !== JSON.stringify(original);
    if (changed) setCancelPending(true);
    else onCancel();
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus({ type: "", text: "" });
    try { await onSave(form); }
    catch (error) { setStatus({ type: "error", text: error.message || "No se pudo guardar la lista." }); }
    finally { setBusy(false); }
  }

  return <section className="list-editor-panel creation-editor-panel">
    <StatusMessage type={status.type}>{status.text}</StatusMessage>
    <form onSubmit={submit} className="list-editor-form creation-editor-form">
      <div className="mobile-editor-toolbar"><button className="back-button" type="button" onClick={requestCancel}><AppIcon name="arrow-left" size={16} />Volver</button><strong>{initialList?._id ? "Editar lista" : "Nueva lista"}</strong><span aria-hidden="true" /></div>
      <PageHeader trail={[{ label: "Inicio", to: "/inicio" }, { label: "Comunidad", to: "/comunidad" }, { label: initialList?._id ? "Editar lista" : "Nueva lista" }]} title={initialList?._id ? "Editar lista" : "Nueva lista"} description="Reuní y ordená lanzamientos alrededor de una idea." className="creation-editor-heading" action={<div className="form-actions creation-desktop-actions"><button className="btn btn-tertiary" type="button" onClick={requestCancel}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : initialList?._id ? "Guardar cambios" : "Publicar lista"}</button></div>} />
      <div className="list-editor-columns creation-editor-columns">
        <aside className="list-editor-fields creation-editor-sidebar"><div className="creation-section-heading"><h2>Detalles</h2><p>Definí el nombre, la descripción y quién puede verla.</p></div><label>Título<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength="3" maxLength="100" placeholder="Mi nueva lista" required /></label><label>Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength="1000" placeholder="Contá de qué se trata esta lista" /></label><label>Visibilidad<select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}><option value="public">Pública</option><option value="private">Privada</option></select><small>{form.visibility === "public" ? "Cualquier persona puede verla." : "Solamente vos podés verla."}</small></label></aside>
        <div className="list-editor-releases creation-editor-main">
          <div className="creation-section-heading"><h2>Lanzamientos <span className="creation-count">{form.albums.length}</span></h2><p>Buscá, agregá y ordená los elementos de la lista.</p></div>
          <div className={`selected-list-items ${form.albums.length ? "" : "empty"}`}>
            {form.albums.map((release, index) => <article key={`${release.catalogId}-${index}`} draggable className={draggedIndex === index ? "dragging" : ""} onDragStart={(event) => { setDraggedIndex(index); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); moveTo(draggedIndex, index); setDraggedIndex(null); }} onDragEnd={() => setDraggedIndex(null)}>
              <span className="drag-handle" aria-hidden="true"><AppIcon name="grip" size={17} /></span><span className="order-number">{index + 1}</span><img src={release.image || "/images/cover-placeholder.png"} alt="" onError={fallbackCover} /><span><strong>{release.album}</strong><small>{release.artist}</small></span>
              <div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"><AppIcon name="arrow-up" size={16} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === form.albums.length - 1} aria-label="Bajar"><AppIcon name="arrow-down" size={16} /></button><button type="button" onClick={() => remove(index)} aria-label="Quitar"><AppIcon name="x" size={16} /></button></div>
            </article>)}
            {!form.albums.length && <p>Tu lista está vacía. Buscá un lanzamiento para empezar.</p>}
          </div>
          <div className="release-picker"><div className="search-box"><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(event); }} placeholder="Buscar lanzamientos para agregar" />{query && <button className="search-clear" type="button" onClick={() => { setQuery(""); setResults([]); }} aria-label="Limpiar búsqueda"><AppIcon name="x" size={16} /></button>}<button className="btn btn-primary" type="button" onClick={search} disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button></div><div className="picker-results">{results.filter((release) => !form.albums.some((selected) => selected.catalogId === release.catalogId)).map((release) => <button type="button" key={release.catalogId} onClick={() => add(release)}><img src={release.image || "/images/cover-placeholder.png"} alt="" onError={fallbackCover} /><span><strong>{release.album}</strong><small>{release.artist} · {release.releaseType}</small></span><b><AppIcon name="plus" size={16} /></b></button>)}</div></div>
        </div>
      </div>
      <div className="mobile-sticky-submit"><button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? "Guardando…" : initialList?._id ? "Guardar cambios" : "Publicar lista"}</button></div>
    </form>
    <ConfirmDialog open={cancelPending} title="¿Descartar los cambios?" description={initialList?._id ? "Las modificaciones de esta lista no se guardarán." : "La lista nueva y los lanzamientos agregados se perderán."} confirmLabel="Descartar" onCancel={() => setCancelPending(false)} onConfirm={onCancel} />
  </section>;
}
