import { apiRequest } from "./api";

export function getLists(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/lists${params.size ? `?${params}` : ""}`);
}
export function getList(id) { return apiRequest(`/lists/${id}`); }
export function createList(data) { return apiRequest("/lists", { method: "POST", body: JSON.stringify(data) }); }
export function updateList(id, data) { return apiRequest(`/lists/${id}`, { method: "PUT", body: JSON.stringify(data) }); }
export function deleteList(id) { return apiRequest(`/lists/${id}`, { method: "DELETE" }); }
export function getListComments(id) { return apiRequest(`/lists/${id}/comments`); }
export function commentList(id, text) { return apiRequest(`/lists/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }); }
export function resonateList(id) { return apiRequest(`/lists/${id}/resonate`, { method: "POST" }); }
