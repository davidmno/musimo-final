import { Navigate } from "react-router-dom";
import { useAuth } from "../context/use-auth";

export default function Profile() {
  const { usuario } = useAuth();
  if (!usuario?.handle) return <p className="loading-text">Cargando perfil…</p>;
  return <Navigate to={`/usuario/${usuario.handle}`} replace />;
}
