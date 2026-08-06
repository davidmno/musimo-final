import { apiRequest } from "./api";

export const TO_REVIEW_EVENT = "musimo-to-review-updated";
const notify = () => window.dispatchEvent(new Event(TO_REVIEW_EVENT));

export async function getToReviewList() { return apiRequest("/to-review"); }
export async function addToReview(release) {
  const data = await apiRequest("/to-review", { method: "POST", body: JSON.stringify(release) });
  notify();
  return data;
}
export async function removeFromToReview(release) {
  const key = release.catalogId || `${String(release.artist).trim().toLowerCase()}|${String(release.album).trim().toLowerCase()}`;
  const data = await apiRequest(`/to-review/${encodeURIComponent(key)}`, { method: "DELETE" });
  notify();
  return data;
}
export async function clearToReviewList() {
  const data = await apiRequest("/to-review", { method: "DELETE" });
  notify();
  return data;
}
export function isInToReview(list, release) {
  return list.some((item) =>
    (item.catalogId && release.catalogId && item.catalogId === release.catalogId) ||
    (item.album?.toLowerCase() === release.album?.toLowerCase() && item.artist?.toLowerCase() === release.artist?.toLowerCase()),
  );
}
