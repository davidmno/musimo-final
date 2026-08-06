function id(value) {
  return value == null ? "" : String(value);
}

export function isOwnReview(review, user) {
  if (!review || !user) return false;
  return id(review.userId) === id(user._id) || id(review.author?._id) === id(user._id);
}

export function orderReleaseReviews(reviews = [], user = null) {
  return [...reviews].sort((first, second) => {
    const firstIsOwn = isOwnReview(first, user);
    const secondIsOwn = isOwnReview(second, user);
    if (firstIsOwn !== secondIsOwn) return firstIsOwn ? -1 : 1;
    return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
  });
}
