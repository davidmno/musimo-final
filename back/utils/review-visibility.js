/**
 * Única política de exposición de datos personales de una reseña.
 * La valoración siempre es privada. El momento solo se comparte cuando el
 * autor lo marcó como público. No se envían banderas que obliguen a la interfaz
 * a explicar la existencia de información oculta.
 */
export function applyReviewVisibility(review, { canManage = false } = {}) {
  if (!review) return null;

  const visible = { ...review };
  delete visible.ratingPrivate;
  delete visible.momentoPrivate;

  if (canManage) {
    visible.momento = visible.momento || "";
    return visible;
  }

  delete visible.rating;
  if (visible.momentoVisibility === "private") delete visible.momento;
  else visible.momento = visible.momento || "";
  delete visible.momentoVisibility;
  return visible;
}
