import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import Comments from "../components/comments";
import { Avatar, ReleaseCard } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import ConfirmDialog from "../components/confirm-dialog";
import { PageTrail } from "../components/page-header";
import {
  commentList,
  deleteList,
  getList,
  getListComments,
  resonateList,
} from "../services/lists.service";
import { setBreadcrumbContext } from "../services/breadcrumb.service";
import BackButton from "../components/back-button";
import ActionSheet from "../components/action-sheet";
import AppIcon from "../components/app-icon";

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [list, setList] = useState(null);
  const [status, setStatus] = useState({
    type: "",
    text: "",
  });
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionsOpen, setActionsOpen] =
    useState(false);

  useEffect(() => {
    let active = true;

    getList(id)
      .then((data) => {
        if (active) {
          setList(data);
        }
      })
      .catch((error) => {
        if (active) {
          setStatus({
            type: "error",
            text: error.message,
          });
        }
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
    if (list) {
      setBreadcrumbContext({ list });
    }
  }, [list]);

  const loadComments = useCallback(
    () => getListComments(id),
    [id],
  );

  const addComment = useCallback(
    (text) => commentList(id, text),
    [id],
  );

  async function resonate() {
    try {
      const result = await resonateList(id);

      setList((current) => ({
        ...current,
        resonatedByMe: result.resonated,
      }));

      setStatus({
        type: "success",
        text: result.resonated
          ? "Esta lista resonó con vos."
          : "Quitaste tu resonancia.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        text: error.message,
      });
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: list?.title || "Lista de musimo",
          text:
            list?.description ||
            "Mirá esta lista en musimo.",
          url: window.location.href,
        });

        setStatus({
          type: "success",
          text: "Lista compartida.",
        });

        return;
      }

      await navigator.clipboard.writeText(
        window.location.href,
      );

      setStatus({
        type: "success",
        text: "Enlace copiado.",
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      setStatus({
        type: "error",
        text:
          "No se pudo compartir. Usá la dirección del navegador.",
      });
    }
  }

  async function remove() {
    setDeleting(true);

    try {
      await deleteList(id);
      navigate("/comunidad?tipo=listas", { replace: true });
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

      <main className="app-page app-page-wide list-detail-page">
        {loading && (
          <p className="loading-text">
            Cargando lista…
          </p>
        )}

        <StatusMessage type={status.type}>
          {status.text}
        </StatusMessage>

        {list && (
          <>
            <div className="mobile-detail-toolbar">
              <BackButton fallback="/comunidad?tipo=listas" forceFallback />

              {list.canManage && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Acciones de la lista"
                  onClick={() =>
                    setActionsOpen(true)
                  }
                >
                  <AppIcon name="more" />
                </button>
              )}
            </div>

            <header className="list-detail-header page-heading-copy">
              <PageTrail
                items={[
                  {
                    label: "Inicio",
                    to: "/inicio",
                  },
                  {
                    label: "Comunidad",
                    to: "/comunidad?tipo=listas",
                  },
                  {
                    label: list.title,
                  },
                ]}
              />

              <h1>{list.title}</h1>

              <p className="detail-kicker">
                Lista{" "}
                {list.visibility === "private"
                  ? "privada"
                  : "pública"}
              </p>

              <p>{list.description}</p>

              <div className="list-detail-meta">
                <p className="author-with-avatar">
                  <Avatar
                    user={
                      list.author || {
                        nombre: list.ownerName,
                        avatarImage:
                          list.ownerAvatarImage,
                      }
                    }
                    size={30}
                  />{" "}
                  por{" "}
                  {list.ownerHandle ? (
                    <Link
                      to={`/usuario/${list.ownerHandle}`}
                    >
                      @{list.ownerHandle}
                    </Link>
                  ) : (
                    list.ownerName
                  )}
                </p>

                <span>
                  {list.albums?.length || 0}{" "}
                  {(list.albums?.length || 0) === 1
                    ? "lanzamiento"
                    : "lanzamientos"}
                </span>
              </div>

              <div
                className={`story-actions list-detail-actions ${
                  list.canManage
                    ? "list-owner-actions"
                    : ""
                }`}
              >
                {!list.canManage && (
                  <button
                    className={`btn btn-secondary list-resonate-button ${
                      list.resonatedByMe
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
                        list.resonatedByMe
                          ? "currentColor"
                          : "none"
                      }
                    />

                    <span>
                      {list.resonatedByMe
                        ? "Resonó"
                        : "Resonar con lista"}
                    </span>
                  </button>
                )}

                <button
                  className="btn btn-secondary list-share-button"
                  type="button"
                  onClick={share}
                >
                  <AppIcon
                    name="share"
                    size={17}
                  />

                  <span>Compartir</span>
                </button>

                {list.canManage && (
                  <>
                    <Link
                      className="btn btn-secondary"
                      to={`/listas?editar=${list._id}`}
                    >
                      Editar
                    </Link>

                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() =>
                        setConfirmDelete(true)
                      }
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </header>

            <ol className="list-detail-items list-detail-grid">
              {(list.albums || []).map(
                (release, index) => (
                  <li
                    key={`${
                      release.catalogId ||
                      release.album
                    }-${index}`}
                  >
                    <span className="list-position">
                      {index + 1}.
                    </span>

                    <ReleaseCard release={release} />
                  </li>
                ),
              )}
            </ol>

            {!list.albums?.length && (
              <p className="empty-state">
                Esta lista todavía no tiene
                lanzamientos.
              </p>
            )}

            {list.visibility !== "private" && (
              <Comments
                loadComments={loadComments}
                addComment={addComment}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      <ActionSheet
        open={actionsOpen}
        title="Acciones de la lista"
        onClose={() => setActionsOpen(false)}
        items={[
          {
            label: "Editar lista",
            icon: "pencil",
            to: list
              ? `/listas?editar=${list._id}`
              : "/comunidad?tipo=listas",
          },
          {
            label: "Eliminar lista",
            icon: "trash",
            danger: true,
            onSelect: () =>
              setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar esta lista?"
        description="La lista, sus comentarios y resonancias se eliminarán de forma permanente."
        confirmLabel="Eliminar lista"
        onCancel={() =>
          setConfirmDelete(false)
        }
        onConfirm={remove}
        busy={deleting}
      />
    </div>
  );
}
