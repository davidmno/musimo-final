import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { useAuth } from "../context/auth-context";
import { deleteList, getLists } from "../services/lists.service";
import { deleteReview, getReviews } from "../services/reviews.service";
import {
  deleteUser,
  getUsers,
  updateUserRole,
} from "../services/usuarios.service";

function Admin() {
  const { usuario } = useAuth();
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      setMessage(error.message || "No se pudo cargar el panel.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(user, rol) {
    try {
      const updated = await updateUserRole(user._id, rol);
      setUsers((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setMessage(`Rol de ${updated.nombre} actualizado.`);
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar el rol.");
    }
  }

  async function handleDeleteUser(user) {
    const confirmed = window.confirm(
      `¿Eliminar a ${user.nombre}? También se eliminarán sus reseñas y listas.`,
    );
    if (!confirmed) return;

    try {
      await deleteUser(user._id);
      setUsers((current) => current.filter((item) => item._id !== user._id));
      await loadData();
      setMessage("Usuario eliminado.");
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar el usuario.");
    }
  }

  async function handleDeleteReview(review) {
    const confirmed = window.confirm(`¿Eliminar la reseña de ${review.album}?`);
    if (!confirmed) return;

    try {
      await deleteReview(review._id);
      setReviews((current) =>
        current.filter((item) => item._id !== review._id),
      );
      setMessage("Reseña eliminada.");
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar la reseña.");
    }
  }

  async function handleDeleteList(list) {
    const confirmed = window.confirm(`¿Eliminar la lista “${list.title}”?`);
    if (!confirmed) return;

    try {
      await deleteList(list._id);
      setLists((current) => current.filter((item) => item._id !== list._id));
      setMessage("Lista eliminada.");
    } catch (error) {
      setMessage(error.message || "No se pudo eliminar la lista.");
    }
  }

  return (
    <div className="app-body">
      <Navbar />

      <main className="app-page app-page-wide admin-page">
        <section className="home-intro">
          <p className="eyebrow">BackOffice</p>
          <h1>Administración de Musimo</h1>
          <p className="home-lead">
            Gestioná usuarios y moderá el contenido publicado en la plataforma.
          </p>
        </section>

        <section className="admin-stats" aria-label="Resumen">
          <article>
            <strong>{users.length}</strong>
            <span>Usuarios</span>
          </article>
          <article>
            <strong>{reviews.length}</strong>
            <span>Reseñas</span>
          </article>
          <article>
            <strong>{lists.length}</strong>
            <span>Listas</span>
          </article>
        </section>

        {message && <p className="status-message">{message}</p>}
        {loading && <p className="loading-text">Cargando administración…</p>}

        {!loading && (
          <>
            <section className="admin-section">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Usuarios</p>
                  <h2>Personas registradas</h2>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <strong>{user.nombre}</strong>
                          <span>@{user.handle}</span>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            value={user.rol || "user"}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value)
                            }
                            disabled={String(user._id) === String(usuario?._id)}
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={String(user._id) === String(usuario?._id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-section">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Reseñas</p>
                  <h2>Contenido publicado</h2>
                </div>
              </div>

              <div className="admin-content-grid">
                {reviews.map((review) => (
                  <article className="admin-content-card" key={review._id}>
                    <img
                      src={review.image || "/images/cover-placeholder.png"}
                      alt={review.album}
                    />
                    <div>
                      <h3>{review.album}</h3>
                      <p>{review.artist}</p>
                      <span>Por {review.username || "Usuario"}</span>
                    </div>
                    <div className="admin-card-actions">
                      <Link className="btn btn-secondary btn-sm" to={`/review/${review._id}`}>
                        Ver
                      </Link>
                      <Link className="btn btn-secondary btn-sm" to={`/reviews?edit=${review._id}`}>
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteReview(review)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-section">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Listas</p>
                  <h2>Curadurías publicadas</h2>
                </div>
              </div>

              <div className="admin-content-grid">
                {lists.map((list) => (
                  <article className="admin-content-card admin-list-card" key={list._id}>
                    <div>
                      <h3>{list.title}</h3>
                      <p>{list.description || "Sin descripción"}</p>
                      <span>
                        {list.albums?.length || 0} lanzamientos · {list.ownerName || list.owner || "Usuario"}
                      </span>
                    </div>
                    <div className="admin-card-actions">
                      <Link className="btn btn-secondary btn-sm" to={`/lists?edit=${list._id}`}>
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteList(list)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Admin;
