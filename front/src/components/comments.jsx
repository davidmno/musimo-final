import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/use-auth";
import { deleteComment, editComment, resonateComment } from "../services/community.service";
import StatusMessage from "./status-message";
import { Avatar } from "./content-cards";
import ConfirmDialog from "./confirm-dialog";
import AppIcon from "./app-icon";
import ActionSheet from "./action-sheet";
import useMobileLayout from "../hooks/use-mobile-layout";

const PAGE_LOADED_AT = Date.now();

function relativeTime(value, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  if (elapsed < minute) return "ahora";
  const formats = [
    { duration: year, singular: "año", plural: "años" },
    { duration: month, singular: "mes", plural: "meses" },
    { duration: day, singular: "día", plural: "días" },
    { duration: hour, singular: "hora", plural: "horas" },
    { duration: minute, singular: "minuto", plural: "minutos" },
  ];
  const format = formats.find(({ duration }) => elapsed >= duration);
  if (!format) return "ahora";

  const amount = Math.floor(elapsed / format.duration);
  return `hace ${amount} ${amount === 1 ? format.singular : format.plural}`;
}

function exactDate(value) {
  return new Date(value).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
}

export default function Comments({ loadComments, addComment }) {
  const { usuario } = useAuth();
  const isMobile = useMobileLayout();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [text, setText] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionComment, setActionComment] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [clock, setClock] = useState(PAGE_LOADED_AT);

  useEffect(() => {
    let active = true;
    setLoadingComments(true);
    loadComments()
      .then((data) => active && setComments(data))
      .catch(() => active && setStatus({ type: "error", text: "No se pudieron cargar los comentarios." }))
      .finally(() => active && setLoadingComments(false));
    return () => { active = false; };
  }, [loadComments]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setStatus({ type: "", text: "" });
    try {
      const comment = await addComment(text.trim());
      setComments((current) => [...current, comment]);
      setText("");
      setStatus({ type: "success", text: "Comentario publicado." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "No se pudo comentar." });
    } finally { setSending(false); }
  }

  function startEdit(comment) {
    setEditingId(comment._id);
    setEditingText(comment.text);
    setStatus({ type: "", text: "" });
  }

  async function saveEdit(commentId) {
    if (!editingText.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await editComment(commentId, editingText.trim());
      setComments((current) => current.map((comment) => String(comment._id) === String(commentId) ? updated : comment));
      setEditingId(null);
      setEditingText("");
      setStatus({ type: "success", text: "Comentario actualizado." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "No se pudo editar el comentario." });
    } finally { setSavingEdit(false); }
  }

  async function removeComment() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteComment(pendingDelete);
      setComments((current) => current.filter((comment) => String(comment._id) !== String(pendingDelete)));
      setStatus({ type: "success", text: "Comentario eliminado." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "No se pudo eliminar el comentario." });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  async function toggleResonance(commentId) {
    try {
      const result = await resonateComment(commentId);
      setComments((current) => current.map((comment) => String(comment._id) === String(commentId)
        ? { ...comment, resonatedByMe: result.resonated }
        : comment));
      setStatus({ type: "success", text: result.resonated ? "Este comentario resonó con vos." : "Quitaste tu resonancia." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "No se pudo actualizar la resonancia." });
    }
  }

  return (
    <section className="comments-section">
      <header className="comments-section-header">
        <h2>{comments.length} {comments.length === 1 ? "comentario" : "comentarios"}</h2>
      </header>
      <StatusMessage type={status.type}>{status.text}</StatusMessage>
      <div className="comments-list">
        {comments.map((comment) => {
          const own = String(comment.userId) === String(usuario?._id);
          return <article key={comment._id}>
            <div className="comment-heading">
              <span className="author-with-avatar"><Avatar user={comment.author} size={28} />{comment.author?.handle ? <Link to={`/usuario/${comment.author.handle}`}>{comment.author.nombre}</Link> : <strong>{comment.author?.nombre || "Usuario"}</strong>}<time dateTime={new Date(comment.createdAt).toISOString()} title={exactDate(comment.createdAt)}>{relativeTime(comment.createdAt, clock)}</time></span>
              <div className="comment-heading-actions">
                {own && editingId !== comment._id && (isMobile ? <button className="comment-more-button" type="button" onClick={() => setActionComment(comment)} aria-label="Acciones del comentario"><AppIcon name="more" size={21} /></button> : <><button className="comment-edit-button" type="button" onClick={() => startEdit(comment)}><AppIcon name="pencil" size={15} />Editar</button><button className="comment-delete-button" type="button" onClick={() => setPendingDelete(comment._id)}><AppIcon name="trash" size={15} />Eliminar</button></>)}
              </div>
            </div>
            {editingId === comment._id ? <div className="comment-edit-form"><textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} maxLength="1000" autoFocus /><div><button className="btn btn-primary btn-sm" type="button" onClick={() => saveEdit(comment._id)} disabled={savingEdit}>{savingEdit ? "Guardando…" : "Guardar"}</button><button className="btn btn-tertiary btn-sm" type="button" onClick={() => { setEditingId(null); setEditingText(""); }} disabled={savingEdit}>Cancelar</button></div></div> : <p>{comment.text}{comment.editedAt && <small className="comment-edited"> · editado</small>}</p>}
            {!own && usuario && <div className="comment-footer-actions"><button
                  className={`comment-resonate-button ${
                    comment.resonatedByMe ? "active" : ""
                  }`}
                  type="button"
                  onClick={() => toggleResonance(comment._id)}
                >
                  <AppIcon
  name="heart"
  size={16}
  fill={
    comment.resonatedByMe
      ? "currentColor"
      : "none"
  }
/>
                  <span>
                    {comment.resonatedByMe
                      ? "Resonó"
                      : "Resonar"}
                  </span>
                </button></div>}
          </article>;
        })}
        {loadingComments && <p className="loading-text">Cargando comentarios…</p>}
        {!loadingComments && !comments.length && <p className="empty-state">Todavía no hay comentarios. Podés iniciar la conversación.</p>}
      </div>
      {usuario && (
        <form className="comment-form comment-composer" onSubmit={submit}>
          <Avatar user={usuario} size={32} />
          <div className="comment-composer-body">
            <label htmlFor="new-comment">Comentar como <strong>{usuario.nombre}</strong></label>
            <textarea id="new-comment" value={text} onChange={(event) => setText(event.target.value)} placeholder="Sumate a la conversación" maxLength="1000" rows="3" />
            <div className="comment-composer-footer"><small>{text.length}/1000</small><button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()} aria-busy={sending}>{sending ? "Publicando…" : "Comentar"}</button></div>
          </div>
        </form>
      )}
      <ActionSheet open={Boolean(actionComment)} title="Acciones del comentario" onClose={() => setActionComment(null)} items={actionComment ? [
        { label: "Editar comentario", icon: "pencil", onSelect: () => startEdit(actionComment) },
        { label: "Eliminar comentario", icon: "trash", danger: true, onSelect: () => setPendingDelete(actionComment._id) },
      ] : []} />
      <ConfirmDialog open={Boolean(pendingDelete)} title="¿Eliminar este comentario?" description="El comentario se eliminará de forma permanente." confirmLabel="Eliminar comentario" onCancel={() => setPendingDelete(null)} onConfirm={removeComment} busy={deleting} />
    </section>
  );
}
