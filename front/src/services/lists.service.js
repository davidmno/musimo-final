import { apiRequest } from "./api";

export function getLists() {
  return apiRequest("/lists");
}

export function getList(id) {
  return apiRequest(`/lists/${id}`);
}

export function createList(data) {
  return apiRequest("/lists", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateList(id, data) {
  return apiRequest(`/lists/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteList(id) {
  return apiRequest(`/lists/${id}`, {
    method: "DELETE",
  });
}
