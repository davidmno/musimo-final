import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/use-auth";

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  return token ? children : <Navigate to="/iniciar-sesion" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
}
