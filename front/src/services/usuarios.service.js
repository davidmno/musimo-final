import { apiRequest } from "./api";

export function loginUsuario(data) {
  return apiRequest("/usuarios/login", { method: "POST", body: JSON.stringify(data) });
}

export function registrarUsuario(data) {
  return apiRequest("/usuarios/register", { method: "POST", body: JSON.stringify(data) });
}

export function requestPasswordReset(email) {
  return apiRequest("/usuarios/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token, password) {
  return apiRequest("/usuarios/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}

export function changePassword(data) {
  return apiRequest("/usuarios/me/password", { method: "PATCH", body: JSON.stringify(data) });
}

export function getCurrentUser() { return apiRequest("/usuarios/me"); }

export function updateCurrentUserProfile(data) {
  return apiRequest("/usuarios/me/profile", { method: "PATCH", body: JSON.stringify(data) });
}

export function getPublicProfile(handle) {
  return apiRequest(`/usuarios/handle/${encodeURIComponent(handle)}`);
}

export function searchUsers(query, limit = 12) {
  return apiRequest(`/usuarios/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function followUser(id) { return apiRequest(`/usuarios/${id}/follow`, { method: "POST" }); }
export function unfollowUser(id) { return apiRequest(`/usuarios/${id}/follow`, { method: "DELETE" }); }
export function getUserConnections(id, type) { return apiRequest(`/usuarios/${id}/connections/${type}`); }
export function getFollowedArtistsForUser(id) { return apiRequest(`/usuarios/${id}/artists`); }

export function updateNotificationSettings(data) {
  return apiRequest("/usuarios/me/notifications", { method: "PATCH", body: JSON.stringify(data) });
}

export function getUsers() { return apiRequest("/usuarios"); }
export function updateUserRole(id, rol) { return apiRequest(`/usuarios/${id}/rol`, { method: "PATCH", body: JSON.stringify({ rol }) }); }
export function deleteUser(id) { return apiRequest(`/usuarios/${id}`, { method: "DELETE" }); }
