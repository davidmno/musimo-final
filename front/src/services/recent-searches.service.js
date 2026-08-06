import { apiRequest } from "./api";

export function getRecentSearches() {
  return apiRequest("/recent-searches").catch(() => []);
}

export function saveRecentSearch(entity) {
  return apiRequest("/recent-searches", { method: "POST", body: JSON.stringify(entity) }).catch(() => []);
}

export function removeRecentSearch(item) {
  const id = item.itemId || item.id;
  return apiRequest(`/recent-searches/${encodeURIComponent(item.type)}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function clearRecentSearches() {
  return apiRequest("/recent-searches", { method: "DELETE" });
}
