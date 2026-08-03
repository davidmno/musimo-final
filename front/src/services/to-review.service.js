const TO_REVIEW_KEY = "musimo_to_review";
const TO_REVIEW_EVENT = "musimo-to-review-updated";

function normalize(value = "") {
  return String(value).trim().toLowerCase();
}

function getCurrentUserEmail() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    return usuario?.email
      ? normalize(usuario.email)
      : "guest";
  } catch {
    return "guest";
  }
}

function getUserStorageKey() {
  return `${TO_REVIEW_KEY}:${getCurrentUserEmail()}`;
}

function notifyToReviewChange() {
  window.dispatchEvent(new Event(TO_REVIEW_EVENT));
}

export function getToReviewList() {
  const stored = localStorage.getItem(getUserStorageKey());

  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToReviewList(list) {
  localStorage.setItem(getUserStorageKey(), JSON.stringify(list));
  notifyToReviewChange();
}

export function isInToReview(release) {
  return getToReviewList().some(
    (item) =>
      normalize(item.album) === normalize(release.album) &&
      normalize(item.artist) === normalize(release.artist),
  );
}

export function addToReview(release) {
  const list = getToReviewList();

  if (isInToReview(release)) return list;

  const nextList = [
    {
      album: release.album,
      artist: release.artist,
      image: release.image || "",
      year: release.year || "",
      type: release.type || "Álbum",
    },
    ...list,
  ];

  saveToReviewList(nextList);
  return nextList;
}

export function removeFromToReview(release) {
  const nextList = getToReviewList().filter(
    (item) =>
      normalize(item.album) !== normalize(release.album) ||
      normalize(item.artist) !== normalize(release.artist),
  );

  saveToReviewList(nextList);
  return nextList;
}

export function toggleToReview(release) {
  if (isInToReview(release)) {
    removeFromToReview(release);
    return false;
  }

  addToReview(release);
  return true;
}

export function clearToReviewList() {
  saveToReviewList([]);
}

export { TO_REVIEW_EVENT };
