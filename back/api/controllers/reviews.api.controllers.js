import * as reviews from "../../services/reviews.services.js";
import * as community from "../../services/community.services.js";
import { commentSchema, reviewSchema } from "../../schemas/reviews.schema.js";
import { getUserById } from "../../services/usuarios.services.js";
import { applyReviewVisibility } from "../../utils/review-visibility.js";

function canManage(review, user) {
  return Boolean(
    user &&
    (user.rol === "admin" ||
      (review.userId && String(review.userId) === String(user._id)) ||
      (!review.userId && review.username === user.nombre)),
  );
}

async function visible(review, user) {
  if (!review) return null;
  const owner = canManage(review, user);
  const authorUser = review.userId ? await getUserById(review.userId) : null;
  return {
    ...applyReviewVisibility(review, { canManage: owner }),
    canManage: owner,
    resonatedByMe: await community.hasResonated(
      user?._id,
      "review",
      review._id,
    ),
    author: authorUser
      ? {
          _id: authorUser._id,
          nombre: authorUser.nombre,
          handle: authorUser.handle,
          avatar: authorUser.avatar,
          avatarImage: authorUser.avatarImage,
        }
      : null,
  };
}

export async function getReviews(req, res, next) {
  try {
    const data = await reviews.getReviews(req.query);
    res.json(
      await Promise.all(data.map((review) => visible(review, req.usuario))),
    );
  } catch (error) {
    next(error);
  }
}

export async function getReviewById(req, res, next) {
  try {
    const review = await reviews.getReviewById(req.params.id);
    if (!review)
      return res.status(404).json({ message: "Reseña no encontrada" });
    res.json(await visible(review, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function createReview(req, res, next) {
  try {
    const data = await reviewSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const review = await reviews.createReview({
      ...data,
      username: req.usuario.nombre,
      userId: req.usuario._id,
    });
    res.status(201).json(await visible(review, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req, res, next) {
  try {
    const current = await reviews.getReviewById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Reseña no encontrada" });
    if (!canManage(current, req.usuario))
      return res.status(403).json({ message: "No podés editar esta reseña" });
    const data = await reviewSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const review = await reviews.updateReview(req.params.id, data, {
      userId: current.userId || req.usuario._id,
      username: current.username || req.usuario.nombre,
    });
    res.json(await visible(review, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const current = await reviews.getReviewById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Reseña no encontrada" });
    if (!canManage(current, req.usuario))
      return res.status(403).json({ message: "No podés eliminar esta reseña" });
    await reviews.deleteReview(req.params.id);
    await community.deleteRelated("review", req.params.id);
    res.json({ deleted: req.params.id });
  } catch (error) {
    next(error);
  }
}

export async function getComments(req, res, next) {
  try {
    res.json(
      await community.listComments("review", req.params.id, req.usuario?._id),
    );
  } catch (error) {
    next(error);
  }
}

export async function addComment(req, res, next) {
  try {
    const current = await reviews.getReviewById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Reseña no encontrada" });
    const data = await commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    res.status(201).json(
      await community.addComment({
        userId: req.usuario._id,
        targetType: "review",
        targetId: current._id,
        authorId: current.userId,
        text: data.text,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function resonate(req, res, next) {
  try {
    const current = await reviews.getReviewById(req.params.id);
    if (!current)
      return res.status(404).json({ message: "Reseña no encontrada" });
    res.json(
      await community.toggleResonance(
        req.usuario._id,
        "review",
        current._id,
        current.userId,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export { canManage as canManageReview, visible as visibleReview };
