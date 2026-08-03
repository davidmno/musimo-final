import { apiRequest } from "./api";

export function loginUsuario(data) {
  return apiRequest("/usuarios/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function registrarUsuario(data) {
  return apiRequest("/usuarios/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return apiRequest("/usuarios/me");
}

export function updateCurrentUserProfile(data) {
  return apiRequest("/usuarios/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getUsers() {
  return apiRequest("/usuarios");
}

export function updateUserRole(id, rol) {
  return apiRequest(`/usuarios/${id}/rol`, {
    method: "PATCH",
    body: JSON.stringify({ rol }),
  });
}

export function deleteUser(id) {
  return apiRequest(`/usuarios/${id}`, {
    method: "DELETE",
  });
}
