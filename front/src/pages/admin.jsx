import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import PageHeader from "../components/page-header";
import ConfirmDialog from "../components/confirm-dialog";
import StatusMessage from "../components/status-message";
import { useAuth } from "../context/use-auth";
import { deleteList, getLists } from "../services/lists.service";
import { deleteReview, getReviews } from "../services/reviews.service";
import { deleteUser, getUsers, updateUserRole } from "../services/usuarios.service";

const EMPTY_CONFIRMATION = { type: "", item: null };

function confirmationCopy(confirmation) {
  const { type, item } = confirmation;
  if (type === "user") {
    return {
      title: `¿Eliminar a ${item?.nombre || "este usuario"}?`,
      description: "También se eliminarán sus reseñas y listas. Esta acción no se puede deshacer.",
      label: "Eliminar usuario",
    };
  }
  if (type === "review") {
    return {
      title: `¿Eliminar la reseña de ${item?.album || "este lanzamiento"}?`,
      description: "La reseña, sus comentarios y resonancias se eliminarán de forma permanente.",
      label: "Eliminar reseña",
    };
  }
  return {
    title: `¿Eliminar la lista “${item?.title || "Sin título"}”?`,
    description: "La lista y sus comentarios se eliminarán de forma permanente.",
    label: "Eliminar lista",
  };
}

export default function Admin() {
  const { usuario } = useAuth();
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmation, setConfirmation] = useState(EMPTY_CONFIRMATION);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, reviewsData, listsData] = await Promise.all([
        getUsers(),
        getReviews(),
        getLists(),
      ]);
      setUsers(usersData);
      setReviews(reviewsData);
      setLists(listsData);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "No se pudo cargar el panel." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(user, rol) {
    try {
      const updated = await updateUserRole(user._id, rol);
      setUsers((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setMessage({ type: "success", text: `Rol de ${updated.nombre} actualizado.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "No se pudo actualizar el rol." });
    }
  }

  async function confirmDelete() {
    const { type, item } = confirmation;
    if (!type || !item) return;

    setDeleting(true);
    try {
      if (type === "user") {
        await deleteUser(item._id);
        await loadData();
        setMessage({ type: "success", text: "Usuario eliminado." });
      } else if (type === "review") {
        await deleteReview(item._id);
        setReviews((current) => current.filter((review) => review._id !== item._id));
        setMessage({ type: "success", text: "Reseña eliminada." });
      } else {
        await deleteList(item._id);
        setLists((current) => current.filter((list) => list._id !== item._id));
        setMessage({ type: "success", text: "Lista eliminada." });
      }
      setConfirmation(EMPTY_CONFIRMATION);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "No se pudo eliminar el contenido." });
    } finally {
      setDeleting(false);
    }
  }

  const confirmationText = confirmationCopy(confirmation);

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide admin-page">
        <PageHeader
          trail={[{ label: "Inicio", to: "/inicio" }, { label: "Administración" }]}
          title="Administración de musimo"
          description="Gestioná usuarios y moderá el contenido publicado en la plataforma."
        />

        <section className="admin-stats" aria-label="Resumen">
          <article><strong>{users.length}</strong><span>Usuarios</span></article>
          <article><strong>{reviews.length}</strong><span>Reseñas</span></article>
          <article><strong>{lists.length}</strong><span>Listas</span></article>
        </section>

        <StatusMessage type={message.type}>{message.text}</StatusMessage>
        {loading && <p className="loading-text" role="status">Cargando administración…</p>}

        {!loading && (
          <>
            <section className="admin-section">
              <div className="section-header"><div><p className="eyebrow">Usuarios</p><h2>Personas registradas</h2></div></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentUser = String(user._id) === String(usuario?._id);
                      return (
                        <tr key={user._id}>
                          <td><strong>{user.nombre}</strong><span>@{user.handle}</span></td>
                          <td>{user.email}</td>
                          <td>
                            <label className="sr-only" htmlFor={`role-${user._id}`}>Rol de {user.nombre}</label>
                            <select
                              id={`role-${user._id}`}
                              value={user.rol || "user"}
                              onChange={(event) => handleRoleChange(user, event.target.value)}
                              disabled={isCurrentUser}
                            >
                              <option value="user">Usuario</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setConfirmation({ type: "user", item: user })}
                              disabled={isCurrentUser}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section">
              <div className="section-header"><div><p className="eyebrow">Reseñas</p><h2>Contenido publicado</h2></div></div>
              <div className="admin-content-grid">
                {reviews.map((review) => (
                  <article className="admin-content-card" key={review._id}>
                    <img src={review.image || "/images/cover-placeholder.png"} alt={`Portada de ${review.album}`} />
                    <div><h3>{review.album}</h3><p>{review.artist}</p><span>Por {review.username || "Usuario"}</span></div>
                    <div className="admin-card-actions">
                      <Link className="btn btn-tertiary btn-sm" to={`/resena/${review._id}`}>Ver</Link>
                      <Link className="btn btn-secondary btn-sm" to={`/resenas?editar=${review._id}`}>Editar</Link>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmation({ type: "review", item: review })}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="section-header"><div><p className="eyebrow">Listas</p><h2>Curadurías publicadas</h2></div></div>
              <div className="admin-content-grid">
                {lists.map((list) => (
                  <article className="admin-content-card admin-list-card" key={list._id}>
                    <div>
                      <h3>{list.title}</h3>
                      <p>{list.description || "Sin descripción"}</p>
                      <span>{list.albums?.length || 0} lanzamientos · {list.ownerName || list.owner || "Usuario"}</span>
                    </div>
                    <div className="admin-card-actions">
                      <Link className="btn btn-secondary btn-sm" to={`/listas?editar=${list._id}`}>Editar</Link>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmation({ type: "list", item: list })}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />

      <ConfirmDialog
        open={Boolean(confirmation.type)}
        title={confirmationText.title}
        description={confirmationText.description}
        confirmLabel={confirmationText.label}
        onCancel={() => setConfirmation(EMPTY_CONFIRMATION)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </div>
  );
}
