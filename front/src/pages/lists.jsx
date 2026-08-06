import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import ListForm from "../components/list-form";
import { ListCard } from "../components/content-cards";
import StatusMessage from "../components/status-message";
import ConfirmDialog from "../components/confirm-dialog";
import PageHeader from "../components/page-header";
import { createList, deleteList, getLists, updateList } from "../services/lists.service";

export default function Lists() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editor, setEditor] = useState(params.get("nueva") === "1");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getLists(); setLists(data);
      const editId = params.get("editar");
      if (editId) { const target = data.find((item) => String(item._id) === editId); if (target?.canManage) { setEditing(target); setEditor(true); } }
    } catch (error) { setStatus({ type: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  async function save(data) {
    if (editing) await updateList(editing._id, data); else await createList(data);
    setEditor(false); setEditing(null); navigate("/listas", { replace: true });
    setStatus({ type: "success", text: editing ? "Lista actualizada." : "Lista creada." });
    await load();
  }

  async function remove(list) {
    setDeleting(true);
    try { await deleteList(list._id); setLists((current) => current.filter((item) => item._id !== list._id)); setStatus({ type: "success", text: "Lista eliminada." }); }
    catch (error) { setStatus({ type: "error", text: error.message }); }
    finally { setDeleting(false); setPendingDelete(null); }
  }

  return <div className="app-body"><Navbar /><main className="app-page app-page-wide">
    {editor ? <ListForm initialList={editing} onSave={save} onCancel={() => { setEditor(false); setEditing(null); navigate("/listas", { replace: true }); }} /> : <>
      <PageHeader trail={[{ label: "Inicio", to: "/inicio" }, { label: "Listas" }]} title="Listas para compartir y descubrir" description="Ordená álbumes y sencillos alrededor de una idea, un recuerdo o una forma de escuchar." action={<button className="btn btn-primary" type="button" onClick={() => { setEditor(true); navigate("/listas?nueva=1", { replace: true }); }}>Crear lista</button>} />
      <StatusMessage type={status.type}>{status.text}</StatusMessage>
      {loading ? <p className="loading-text">Cargando listas…</p> : <div className="lists-manage-grid">{lists.map((list) => <article key={list._id}><ListCard list={list} />{list.canManage && <div className="card-actions"><button className="text-button" type="button" onClick={() => { setEditing(list); setEditor(true); navigate(`/listas?editar=${list._id}`, { replace: true }); }}>Editar</button><button className="text-button danger" type="button" onClick={() => setPendingDelete(list)}>Eliminar</button></div>}</article>)}</div>}
      {!loading && !lists.length && <p className="empty-state">Todavía no hay listas públicas. <Link to="/listas?nueva=1">Creá la primera.</Link></p>}
    </>}
  </main><Footer /><ConfirmDialog open={Boolean(pendingDelete)} title={`¿Eliminar “${pendingDelete?.title || "esta lista"}”?`} description="Esta acción no se puede deshacer y también eliminará sus comentarios." confirmLabel="Eliminar lista" onCancel={() => setPendingDelete(null)} onConfirm={() => remove(pendingDelete)} busy={deleting} /></div>;
}
