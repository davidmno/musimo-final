import express from "express";
import * as reviewsController from "../controllers/reviews.api.controllers.js";
import { validateToken } from "../../middlewares/token.validate.js";
import { reviewSchema } from "../../schemas/reviews.schema.js";
import { validateSchema } from "../../middlewares/validate.schema.js";

const router = express.Router();

router.get("/reviews", validateToken, reviewsController.getReviews);
router.get("/reviews/:id", validateToken, reviewsController.getReviewById);

router.post(
  "/reviews",
  [validateToken, validateSchema(reviewSchema)],
  reviewsController.createReview,
);

router.put(
  "/reviews/:id",
  [validateToken, validateSchema(reviewSchema)],
  reviewsController.updateReview,
);

router.delete("/reviews/:id", validateToken, reviewsController.deleteReview);

export default router;
