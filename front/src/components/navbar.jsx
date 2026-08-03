import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth-context";

function Navbar() {
  const { usuario, logout, refreshUsuario } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (usuario) {
      refreshUsuario().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    logout();
    setProfileOpen(false);
    setMobileOpen(false);
    navigate("/login");
  }

  function closeMenus() {
    setProfileOpen(false);
    setMobileOpen(false);
  }

  const avatar =
    usuario?.avatar || usuario?.nombre?.slice(0, 1).toUpperCase() || "U";
  const nombre = usuario?.nombre || "Usuario";
  const isAdmin = usuario?.rol === "admin";

  return (
    <header className="app-nav-wrap">
      <div className="nav-float">
        <div className="nav-left">
          <nav className="nav-links" aria-label="Navegación principal">
            <Link to="/home">Inicio</Link>
            <Link to="/search">Buscar</Link>
          </nav>
        </div>

        <div className="nav-center">
          <Link to="/home" className="nav-logo" aria-label="Ir al inicio">
            <img
              src="/images/logo.png"
              alt="Musimo"
              className="musimo-navbar-logo"
            />
          </Link>
        </div>

        <div className="nav-right">
          {usuario ? (
            <div className="nav-profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="nav-profile"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
              >
                <span className="user-avatar">
                  {usuario.avatarImage ? (
                    <img
                      className="avatar-image"
                      src={usuario.avatarImage}
                      alt={nombre}
                      width="32"
                      height="32"
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        display: "block",
                      }}
                    />
                  ) : (
                    avatar
                  )}
                </span>

                <span className="nav-profile-name">{nombre}</span>
                <span className="nav-profile-caret">⌄</span>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <Link to="/profile" onClick={closeMenus}>
                    Perfil
                  </Link>

                  <Link to="/lists" onClick={closeMenus}>
                    Listas
                  </Link>

                  {isAdmin && (
                    <Link to="/admin" onClick={closeMenus}>
                      Administración
                    </Link>
                  )}

                  <button type="button" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="nav-profile" to="/login">
              <span className="user-avatar">?</span>
              <span className="nav-profile-name">Entrar</span>
            </Link>
          )}

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu-panel">
          <Link to="/home" onClick={closeMenus}>Inicio</Link>
          <Link to="/search" onClick={closeMenus}>Buscar</Link>
          <Link to="/lists" onClick={closeMenus}>Listas</Link>

          {usuario ? (
            <>
              <Link to="/profile" onClick={closeMenus}>Perfil</Link>

              {isAdmin && (
                <Link to="/admin" onClick={closeMenus}>
                  Administración
                </Link>
              )}

              <button type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenus}>Entrar</Link>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
