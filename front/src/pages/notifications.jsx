import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import StatusMessage from "../components/status-message";
import { Avatar } from "../components/content-cards";
import PageHeader from "../components/page-header";
import { getNotifications, markNotificationsRead } from "../services/community.service";

function notificationLabel(item) {
  if (item.type === "follow") return "empezó a seguirte";
  if (item.type === "comment_resonance") return "resonó con tu comentario";
  const target = item.targetType === "list" ? "tu lista" : "tu reseña";
  if (item.type === "comment") return `comentó ${target}`;
  if (item.type === "resonance") return `resonó con ${target}`;
  return "interactuó con vos";
}

function destination(item) {
  if (item.type === "follow" && item.actor?.handle) return `/usuario/${item.actor.handle}`;
  if (item.targetType === "review") return `/resena/${item.targetId}`;
  if (item.targetType === "list") return `/lista/${item.targetId}`;
  return "/notificaciones";
}

function relativeTime(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  if (elapsed < minute) return "ahora";
  if (elapsed < hour) return `hace ${Math.floor(elapsed / minute)} min`;
  if (elapsed < day) return `hace ${Math.floor(elapsed / hour)} h`;
  if (elapsed < month) { const count = Math.floor(elapsed / day); return `hace ${count} ${count === 1 ? "día" : "días"}`; }
  const count = Math.floor(elapsed / month);
  return `hace ${count} ${count === 1 ? "mes" : "meses"}`;
}

function groupLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days <= 30) return "Últimos 30 días";
  return "Anteriores";
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getNotifications()
      .then(async (data) => {
        if (!active) return;
        setItems(data.map((item) => ({ ...item, read: true })));
        if (data.some((item) => !item.read)) {
          await markNotificationsRead();
          window.dispatchEvent(new Event("musimo:notifications-read"));
        }
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => items.reduce((result, item) => {
    const label = groupLabel(item.createdAt);
    const group = result.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else result.push({ label, items: [item] });
    return result;
  }, []), [items]);

  return <div className="app-body"><Navbar /><main className="app-page app-page-wide notifications-page"><PageHeader trail={[{ label: "Inicio", to: "/inicio" }, { label: "Notificaciones" }]} title="Notificaciones" description="Revisá las interacciones relacionadas con tu actividad." /><StatusMessage type="error">{error}</StatusMessage>{loading ? <p className="loading-text">Cargando notificaciones…</p> : <div className="notification-groups">{groups.map((group) => <section key={group.label} className="notification-group"><h2>{group.label}</h2><div className="notification-list">{group.items.map((item) => <Link key={item._id} to={destination(item)}><Avatar user={item.actor} size={40} /><div className="notification-copy"><p><strong>{item.actor?.nombre || "Alguien"}</strong> {notificationLabel(item)}</p>{item.text && <span>“{item.text}”</span>}<time dateTime={new Date(item.createdAt).toISOString()} title={new Date(item.createdAt).toLocaleString("es-AR")}>{relativeTime(item.createdAt)}</time></div>{item.context?.image && <img className="notification-context-image" src={item.context.image} alt={item.context.title || ""} loading="lazy" />}</Link>)}</div></section>)}</div>}{!loading && !items.length && <p className="empty-state">No tenés notificaciones por ahora.</p>}</main><Footer /></div>;
}
