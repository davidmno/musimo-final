import { createContext, useContext, useState } from "react";
import { getCurrentUser } from "../services/usuarios.service";

const AuthContext = createContext();

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("usuario")) || null;
  } catch {
    localStorage.removeItem("usuario");
    return null;
  }
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(readStoredUser);
  const [token, setToken] = useState(localStorage.getItem("token"));

  function persistUsuario(usuarioData) {
    localStorage.setItem("usuario", JSON.stringify(usuarioData));
    setUsuario(usuarioData);
  }

  function login(usuarioData) {
    localStorage.setItem("usuario", JSON.stringify(usuarioData));
    localStorage.setItem("token", usuarioData.token);
    setUsuario(usuarioData);
    setToken(usuarioData.token);
  }

  function logout() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    setUsuario(null);
    setToken(null);
  }

  function updateUsuario(usuarioData) {
    const currentToken = localStorage.getItem("token");

    const nextUsuario = {
      ...usuario,
      ...usuarioData,
      token: usuarioData.token || usuario?.token || currentToken,
    };

    persistUsuario(nextUsuario);
  }

  async function refreshUsuario() {
    try {
      const data = await getCurrentUser();
      updateUsuario(data);
      return data;
    } catch (error) {
      if (error.status === 401) {
        logout();
      }

      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        login,
        logout,
        updateUsuario,
        refreshUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
