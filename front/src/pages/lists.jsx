import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import ListForm from "../components/list-form";
import { useAuth } from "../context/auth-context";
import {
  createList,
  deleteList,
  getLists,
  updateList,
} from "../services/lists.service";
import { getAlbumUrl } from "../services/album-link.service";

function canManageList(list, usuario) {
  if (usuario?.rol === "admin") return true;

  if (list.ownerId) {
    return String(list.ownerId) === String(usuario?._id);
  }

  return (list.ownerName || list.owner) === usuario?.nombre;
}

function ListPreviewCard({ list, usuario, onEdit, onDelete }) {
  const albums = list.albums || [];
  const covers = albums
    .map((album) => album.image)
    .filter(Boolean)
    .slice(0, 3);
  const canManage = canManageList(list, usuario);

  return (
    <article className="community-list-card">
      <div className="community-list-cover">
        {covers.length > 0 ? (
          <div className="list-stack">
            {covers.map((cover, index) => (
              <img
                key={`${cover}-${index}`}
                src={cover}
                alt=""
                style={{ "--i": index }}
              />
            ))}
          </div>
        ) : (
          <div className="list-empty-cover">musimo</div>
        )}
      </div>

      <div className="community-list-body">
        <p className="eyebrow">Lista</p>
        <h2>{list.title}</h2>

        {list.description && <p>{list.description}</p>}

        <span className="release-meta">
          {albums.length} lanzamientos · {list.ownerName || list.owner || "Comunidad"}
        </span>

        {albums.length > 0 && (
          <div className="list-album-preview">
            {albums.slice(0, 3).map((album) => (
              <Link
                key={`${album.artist}-${album.album}`}
                to={getAlbumUrl(album)}
              >
                {album.album}
              </Link>
            ))}
          </div>
        )}

        {canManage && (
          <div className="card-actions list-card-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(list)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(list)}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function Lists() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingList, setEditingList] = useState(null);
  const [editorOpen, setEditorOpen] = useState(params.get("new") === "1");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists(honorQuery = true) {
    try {
      const data = await getLists();
      setLists(data);

      const editId = honorQuery ? params.get("edit") : null;
      if (editId) {
        const list = data.find((item) => String(item._id) === String(editId));

        if (list && canManageList(list, usuario)) {
          setEditingList(list);
          setEditorOpen(true);
        } else if (list) {
          setMessage("No tenés permisos para editar esa lista.");
        }
      }
    } catch {
      setLists([]);
      setMessage("No se pudieron cargar las listas.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingList(null);
    setEditorOpen(true);
    setMessage("");
    navigate("/lists?new=1", { replace: true });
  }

  function openEditForm(list) {
    setEditingList(list);
    setEditorOpen(true);
    setMessage("");
    navigate(`/lists?edit=${list._id}`, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeEditor() {
    setEditingList(null);
    setEditorOpen(false);
    navigate("/lists", { replace: true });
  }

  async function handleSave(payload) {
    if (editingList?._id) {
      await updateList(editingList._id, payload);
      setMessage("Lista actualizada.");
    } else {
      await createList(payload);
      setMessage("Lista creada.");
    }

    closeEditor();
    await loadLists(false);
  }

  async function handleDelete(list) {
    const confirmed = window.confirm(
      `¿Eliminar la lista “${list.title}”? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      await deleteList(list._id);
      setMessage("Lista eliminada.");
      await loadLists();
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar la lista.");
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide">
        {editorOpen ? (
          <ListForm
            initialList={editingList}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        ) : (
          <>
            <section className="home-intro lists-hero-actions">
              <div>
                <h1>Listas de la comunidad</h1>
                <p className="home-lead">
                  Curadurías personales para descubrir música desde momentos,
                  recuerdos y formas de escuchar.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateForm}
              >
                Crear lista
              </button>
            </section>

            {message && <p className="status-message">{message}</p>}

            {loading ? (
              <p className="loading-text">Cargando listas…</p>
            ) : lists.length > 0 ? (
              <section className="community-lists-grid">
                {lists.map((list) => (
                  <ListPreviewCard
                    key={list._id}
                    list={list}
                    usuario={usuario}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            ) : (
              <div className="empty-state-block">
                <p className="empty-state">Todavía no hay listas publicadas.</p>

                <button className="btn btn-primary" onClick={openCreateForm}>
                  Crear la primera lista
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Lists;
