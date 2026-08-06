import { Navigate } from "react-router-dom";
import { useAuth } from "../context/use-auth";

export default function AdminRoute({ children }) {
  const { token, usuario } = useAuth();
  if (!token) return <Navigate to="/iniciar-sesion" replace />;
  return usuario?.rol === "admin" ? children : <Navigate to="/inicio" replace />;
}
