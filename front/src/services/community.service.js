import { apiRequest } from "./api";

export function getHomeContent() { return apiRequest("/home"); }
export function searchCommunity(query, limit = 10) { return apiRequest(`/search?q=${encodeURIComponent(query)}&limit=${limit}`); }
export function getFeed(filter = "all", audience = "all", page = 1, limit = 10) {
  const params = new URLSearchParams({ filter, audience, page: String(page), limit: String(limit) });
  return apiRequest(`/feed?${params.toString()}`);
}
export function getNotifications() { return apiRequest("/notifications"); }
export function markNotificationsRead(id = null) { return apiRequest(id ? `/notifications/${id}/read` : "/notifications/read", { method: "PATCH" }); }
export function getFollowedArtists() { return apiRequest("/artist-follows"); }
export function followArtist(artist) { return apiRequest(`/artist-follows/${encodeURIComponent(artist.id || artist.catalogId)}`, { method: "POST", body: JSON.stringify(artist) }); }
export function unfollowArtist(id) { return apiRequest(`/artist-follows/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export function editComment(id, text) { return apiRequest(`/comments/${id}`, { method: "PATCH", body: JSON.stringify({ text }) }); }
export function deleteComment(id) { return apiRequest(`/comments/${id}`, { method: "DELETE" }); }
export function resonateComment(id) { return apiRequest(`/comments/${id}/resonate`, { method: "POST" }); }
