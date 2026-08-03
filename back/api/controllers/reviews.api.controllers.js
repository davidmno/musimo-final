import * as reviewsService from "../../services/reviews.services.js";

function canManageReview(review, usuario) {
  if (usuario?.rol === "admin") return true;

  const sameUserId =
    review.userId && String(review.userId) === String(usuario?._id);

  const legacyOwner =
    !review.userId &&
    review.username &&
    review.username === usuario?.nombre;

  return Boolean(sameUserId || legacyOwner);
}

function visibleReview(review, usuario) {
  if (canManageReview(review, usuario)) return review;

  return {
    ...review,
    rating: null,
    ratingPrivate: true,
  };
}

export async function getReviews(req, res) {
  try {
    const reviews = await reviewsService.getReviews();
    res.json(reviews.map((review) => visibleReview(review, req.usuario)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudieron cargar las reseñas" });
  }
}

export async function getReviewById(req, res) {
  try {
    const review = await reviewsService.getReviewById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Reseña no encontrada" });
    }

    res.json(visibleReview(review, req.usuario));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo cargar la reseña" });
  }
}

export async function createReview(req, res) {
  try {
    const review = await reviewsService.createReview({
      ...req.body,
      username: req.usuario.nombre,
      userId: req.usuario._id,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo crear la reseña" });
  }
}

export async function updateReview(req, res) {
  try {
    const existingReview = await reviewsService.getReviewById(req.params.id);

    if (!existingReview) {
      return res.status(404).json({ message: "Reseña no encontrada" });
    }

    if (!canManageReview(existingReview, req.usuario)) {
      return res.status(403).json({ message: "No podés editar esta reseña" });
    }

    const review = await reviewsService.updateReview(req.params.id, req.body, {
      userId: existingReview.userId || req.usuario._id,
      username: existingReview.username || req.usuario.nombre,
    });

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo actualizar la reseña" });
  }
}

export async function deleteReview(req, res) {
  try {
    const existingReview = await reviewsService.getReviewById(req.params.id);

    if (!existingReview) {
      return res.status(404).json({ message: "Reseña no encontrada" });
    }

    if (!canManageReview(existingReview, req.usuario)) {
      return res.status(403).json({ message: "No podés eliminar esta reseña" });
    }

    await reviewsService.deleteReview(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "No se pudo eliminar la reseña" });
  }
}
