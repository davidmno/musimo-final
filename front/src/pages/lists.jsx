import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../components/footer";
import ListForm from "../components/list-form";
import Navbar from "../components/navbar";
import StatusMessage from "../components/status-message";
import {
  createList,
  getList,
  updateList,
} from "../services/lists.service";
import { canGoBackInApp } from "../services/navigation.service";

const COMMUNITY_LISTS_URL = "/comunidad?tipo=listas";

export default function Lists() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const editId = params.get("editar");
  const isCreating = params.get("nueva") === "1";
  const isEditorRoute = isCreating || Boolean(editId);

  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(Boolean(editId));
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!editId) {
      setEditing(null);
      setLoading(false);
      setStatus({ type: "", text: "" });
      return undefined;
    }

    let active = true;
    setLoading(true);
    setStatus({ type: "", text: "" });

    getList(editId)
      .then((list) => {
        if (!active) return;

        if (!list?.canManage) {
          throw new Error("No tenés permiso para editar esta lista.");
        }

        setEditing(list);
      })
      .catch((error) => {
        if (!active) return;
        setStatus({
          type: "error",
          text: error.message || "No se pudo cargar la lista.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [editId]);

  if (!isEditorRoute) {
    return <Navigate to={COMMUNITY_LISTS_URL} replace />;
  }

  async function save(data) {
    const savedList = editId
      ? await updateList(editId, data)
      : await createList(data);

    const savedId = savedList?._id || editId;

    if (!savedId) {
      throw new Error("La lista se guardó, pero no se pudo abrir su detalle.");
    }

    if (editId && canGoBackInApp()) {
      navigate(-1);
      return;
    }

    navigate(`/lista/${savedId}`, { replace: true });
  }

  function cancel() {
    if (canGoBackInApp()) {
      navigate(-1);
      return;
    }

    navigate(editId ? `/lista/${editId}` : COMMUNITY_LISTS_URL, {
      replace: true,
    });
  }

  return (
    <div className="app-body">
      <Navbar />
      <main className="app-page app-page-wide">
        {loading && <p className="loading-text">Cargando lista…</p>}

        {!loading && status.text && (
          <section className="list-editor-panel creation-editor-panel">
            <StatusMessage type={status.type}>{status.text}</StatusMessage>
            <p className="empty-state">
              <Link to={COMMUNITY_LISTS_URL}>Volver a Comunidad</Link>
            </p>
          </section>
        )}

        {!loading && !status.text && (isCreating || editing) && (
          <ListForm
            initialList={editing}
            onSave={save}
            onCancel={cancel}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
