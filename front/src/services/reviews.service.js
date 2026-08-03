import { apiRequest } from "./api";

export function getReviews() {
  return apiRequest("/reviews");
}

export function getReview(id) {
  return apiRequest(`/reviews/${id}`);
}

export function createReview(data) {
  return apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateReview(id, data) {
  return apiRequest(`/reviews/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteReview(id) {
  return apiRequest(`/reviews/${id}`, {
    method: "DELETE",
  });
}
