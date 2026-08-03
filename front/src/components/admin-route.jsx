import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

function AdminRoute({ children }) {
  const { token, refreshUsuario } = useAuth();
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    if (!token) {
      setHasAccess(false);
      return;
    }

    setHasAccess(null);

    refreshUsuario()
      .then((user) => setHasAccess(user.rol === "admin"))
      .catch(() => setHasAccess(false));
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (hasAccess === null) {
    return (
      <main className="auth-page">
        <p className="loading-text">Verificando permisos…</p>
      </main>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default AdminRoute;
