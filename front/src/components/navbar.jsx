import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/use-auth";
import useMobileLayout from "../hooks/use-mobile-layout";
import {
  getNotifications,
  markNotificationsRead,
} from "../services/community.service";
import { Avatar } from "./content-cards";
import BottomSheet from "./bottom-sheet";
import AppIcon from "./app-icon";
function notificationLabel(item) {
  if (item.type === "follow") return "empezó a seguirte";
  if (item.type === "comment_resonance") return "resonó con tu comentario";
  const target = item.targetType === "list" ? "tu lista" : "tu reseña";
  if (item.type === "comment") return `comentó ${target}`;
  if (item.type === "resonance") return `resonó con ${target}`;
  return "interactuó con vos";
}

function notificationDestination(item) {
  if (item.type === "follow" && item.actor?.handle)
    return `/usuario/${item.actor.handle}`;
  if (item.targetType === "review") return `/resena/${item.targetId}`;
  if (item.targetType === "list") return `/lista/${item.targetId}`;
  return "/inicio";
}

export default function Navbar() {
  const { usuario, logout, refreshUsuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileLayout();
  const rootRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userId = usuario?._id;
  const unread = notifications.filter((item) => !item.read).length;

  const loadNotifications = useCallback(() => {
    if (!userId) return Promise.resolve();
    return getNotifications()
      .then(setNotifications)
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (userId) refreshUsuario().catch(() => undefined);
  }, [userId, refreshUsuario]);
  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);
  useEffect(() => {
    function markLocalNotificationsRead() {
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    }
    window.addEventListener("musimo:notifications-read", markLocalNotificationsRead);
    return () => window.removeEventListener("musimo:notifications-read", markLocalNotificationsRead);
  }, []);
  useEffect(() => {
    setProfileOpen(false);
    setNotificationOpen(false);
    setCreateOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    setProfileOpen(false);
    setNotificationOpen(false);
    setCreateOpen(false);
  }, [isMobile]);
  useEffect(() => {
    function close(event) {
      if (
        !isMobile &&
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
        setNotificationOpen(false);
        setCreateOpen(false);
      }
    }
    function escape(event) {
      if (event.key === "Escape" && !isMobile) {
        setProfileOpen(false);
        setNotificationOpen(false);
        setCreateOpen(false);
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [isMobile]);

  function signOut() {
    logout();
    navigate("/iniciar-sesion");
  }
  async function openNotification(item) {
    if (!item.read) {
      await markNotificationsRead(item._id).catch(() => undefined);
      setNotifications((current) =>
        current.map((value) =>
          value._id === item._id ? { ...value, read: true } : value,
        ),
      );
    }
    setNotificationOpen(false);
    navigate(notificationDestination(item));
  }

  async function markAllNotifications() {
    await markNotificationsRead().catch(() => undefined);
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  }

  function toggleNotifications() {
    setNotificationOpen((value) => !value);
    setProfileOpen(false);
    setCreateOpen(false);
    if (!notificationOpen) loadNotifications();
  }

  function goBack() {
    const historyIndex = Number(window.history.state?.idx || 0);
    if (historyIndex > 0) {
      navigate(-1);
      return;
    }
    const path = location.pathname;
    if (path.startsWith("/artista/")) navigate("/buscar?categoria=artistas");
    else if (path.startsWith("/lanzamiento/") || path.startsWith("/resena") || path.startsWith("/resenas")) navigate("/buscar?categoria=lanzamientos");
    else if (path.startsWith("/lista") || path.startsWith("/comunidad")) navigate("/comunidad");
    else navigate("/inicio");
  }

  const mobileRoot = location.pathname === "/inicio";
const ownProfilePath = `/usuario/${usuario?.handle || "perfil"}`;
const isOwnMobileProfile =
  isMobile && location.pathname === ownProfilePath;
  return (
    <>
      <header className="app-nav-wrap" ref={rootRef}>
        <div className="nav-float">
          <Link to="/inicio" className="nav-logo" aria-label="musimo, inicio">
            <img src="/images/logo.png" alt="musimo" />
          </Link>
          <nav className="nav-links" aria-label="Navegación principal">
            <NavLink to="/inicio">Inicio</NavLink>
            <NavLink to="/comunidad">Comunidad</NavLink>
            <NavLink to="/buscar">
              <AppIcon name="search" size={16} />
              Descubrir
            </NavLink>
          </nav>
          <div className="nav-actions">
            <button
              className="nav-create"
              type="button"
              onClick={() => {
                setCreateOpen((value) => !value);
                setProfileOpen(false);
                setNotificationOpen(false);
              }}
            >
              <AppIcon name="plus" size={16} /> Crear
            </button>
            <button
              className="nav-icon-link notification-trigger"
              type="button"
              aria-label={
                unread ? `${unread} notificaciones sin leer` : "Notificaciones"
              }
              onClick={toggleNotifications}
            >
              <AppIcon name="bell" />
              {unread > 0 && (
                <span className="notification-badge">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <button
              className="nav-profile"
              type="button"
              onClick={() => {
                setProfileOpen((value) => !value);
                setNotificationOpen(false);
                setCreateOpen(false);
              }}
              aria-expanded={profileOpen}
            >
              <Avatar user={usuario} size={34} />
              <span>{usuario?.nombre || "Perfil"}</span>
            </button>
            {createOpen && !isMobile && (
              <div className="create-dropdown">
                <Link to="/buscar">
                  Escribir reseña<span>Buscá un lanzamiento para comenzar</span>
                </Link>
                <Link to="/listas?nueva=1">
                  Crear lista<span>Reuní y ordená lanzamientos</span>
                </Link>
              </div>
            )}
            {notificationOpen && !isMobile && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-title">
                  <strong>Notificaciones</strong>
                  {unread > 0 && (
                    <button type="button" onClick={markAllNotifications}>
                      Marcar todas
                    </button>
                  )}
                </div>
                <div className="notification-dropdown-list">
                  {notifications.slice(0, 4).map((item) => (
                    <button
                      type="button"
                      className={item.read ? "" : "unread"}
                      key={item._id}
                      onClick={() => openNotification(item)}
                    >
                      <Avatar user={item.actor} size={32} />
                      <span>
                        <strong>{item.actor?.nombre || "Alguien"}</strong>{" "}
                        {notificationLabel(item)}
                      </span>
                    </button>
                  ))}
                  {!notifications.length && <p>No tenés notificaciones.</p>}
                </div>
                <Link className="notification-view-all" to="/notificaciones">
                  Ver todas las notificaciones
                </Link>
              </div>
            )}
            {profileOpen && (
              <div className="profile-dropdown">
                <Link to={`/usuario/${usuario?.handle || "perfil"}`}>
                  Perfil
                </Link>
                {usuario?.rol === "admin" && (
                  <Link to="/administracion">Administración</Link>
                )}
                <button type="button" onClick={signOut}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mobile-app-header">
          {!mobileRoot ? (
            <button className="mobile-app-back" type="button" onClick={goBack} aria-label="Volver">
              <AppIcon name="arrow-left" size={22} />
            </button>
          ) : <span className="mobile-app-header-spacer" aria-hidden="true" />}
          <Link to="/inicio" className="mobile-app-logo" aria-label="musimo, inicio">
            <img src="/images/logo.png" alt="musimo" />
          </Link>
          {isOwnMobileProfile ? (
  <button
    className="mobile-notification-trigger"
    type="button"
    onClick={signOut}
    aria-label="Cerrar sesión"
    title="Cerrar sesión"
  >
    <AppIcon name="logout" size={23} />
  </button>
) : (
  <button
    className="mobile-notification-trigger"
    type="button"
    onClick={() => navigate("/notificaciones")}
    aria-label={
      unread
        ? `${unread} notificaciones sin leer`
        : "Notificaciones"
    }
  >
    <AppIcon name="bell" size={23} />
    {unread > 0 && (
      <span className="notification-badge">
        {unread > 99 ? "99+" : unread}
      </span>
    )}
  </button>
)}
        </div>
      </header>
      <nav className="mobile-tabbar" aria-label="Navegación móvil">
        <NavLink to="/inicio">
          <AppIcon name="home" />
          <small>Inicio</small>
        </NavLink>
        <NavLink to="/comunidad">
          <AppIcon name="users" />
          <small>Comunidad</small>
        </NavLink>
        <NavLink to="/buscar">
          <AppIcon name="search" />
          <small>Descubrir</small>
        </NavLink>
        <button
          className={createOpen ? "active" : ""}
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setNotificationOpen(false);
          }}
        >
          <AppIcon name="plus" />
          <small>Crear</small>
        </button>
        <NavLink to={`/usuario/${usuario?.handle || "perfil"}`}>
          <AppIcon name="user" />
          <small>Perfil</small>
        </NavLink>
      </nav>
      {isMobile && (
        <>
          <BottomSheet
            open={createOpen}
            title="Crear en musimo"
            description="Elegí qué querés registrar."
            onClose={() => setCreateOpen(false)}
            className="create-sheet"
          >
            <div className="create-sheet-actions">
              <Link to="/buscar" onClick={() => setCreateOpen(false)}>
                <AppIcon name="pencil" size={22} />
                <span>
                  <strong>Escribir reseña</strong>
                  <small>Buscá un lanzamiento para comenzar</small>
                </span>
              </Link>
              <Link to="/listas?nueva=1" onClick={() => setCreateOpen(false)}>
                <AppIcon name="list" size={22} />
                <span>
                  <strong>Crear lista</strong>
                  <small>Reuní y ordená lanzamientos</small>
                </span>
              </Link>
            </div>
            <div className="create-sheet-divider" />
            <button className="create-sheet-close" type="button" onClick={() => setCreateOpen(false)}>Cerrar</button>
          </BottomSheet>
        </>
      )}
    </>
  );
}
