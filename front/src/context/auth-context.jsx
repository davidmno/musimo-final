import { createContext, useCallback, useMemo, useState } from "react";
import { getCurrentUser } from "../services/usuarios.service";

export const AuthContext = createContext(null);

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    localStorage.removeItem("usuario");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(storedUser);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const login = useCallback((data) => {
    localStorage.setItem("usuario", JSON.stringify(data));
    localStorage.setItem("token", data.token);
    setUsuario(data);
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    setUsuario(null);
    setToken(null);
  }, []);

  const updateUsuario = useCallback((data) => {
    setUsuario((current) => {
      const next = {
        ...current,
        ...data,
        token: data.token || current?.token || localStorage.getItem("token"),
      };
      localStorage.setItem("usuario", JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshUsuario = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      updateUsuario(data);
      return data;
    } catch (error) {
      if (error.status === 401) logout();
      throw error;
    }
  }, [logout, updateUsuario]);

  const value = useMemo(
    () => ({ usuario, token, login, logout, updateUsuario, refreshUsuario }),
    [usuario, token, login, logout, updateUsuario, refreshUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
