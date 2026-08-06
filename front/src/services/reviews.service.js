import { apiRequest } from "./api";

export function getReviews(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/reviews${params.size ? `?${params}` : ""}`);
}
export function getReview(id) { return apiRequest(`/reviews/${id}`); }
export function createReview(data) { return apiRequest("/reviews", { method: "POST", body: JSON.stringify(data) }); }
export function updateReview(id, data) { return apiRequest(`/reviews/${id}`, { method: "PUT", body: JSON.stringify(data) }); }
export function deleteReview(id) { return apiRequest(`/reviews/${id}`, { method: "DELETE" }); }
export function getReviewComments(id) { return apiRequest(`/reviews/${id}/comments`); }
export function commentReview(id, text) { return apiRequest(`/reviews/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }); }
export function resonateReview(id) { return apiRequest(`/reviews/${id}/resonate`, { method: "POST" }); }
