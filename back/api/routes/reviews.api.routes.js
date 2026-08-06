import express from "express";
import * as controller from "../controllers/reviews.api.controllers.js";
import {
  optionalToken,
  validateToken,
} from "../../middlewares/token.validate.js";

const router = express.Router();

router.get("/reviews", optionalToken, controller.getReviews);
router.get("/reviews/:id/comments", optionalToken, controller.getComments);
router.post("/reviews/:id/comments", validateToken, controller.addComment);
router.post("/reviews/:id/resonate", validateToken, controller.resonate);
router.get("/reviews/:id", optionalToken, controller.getReviewById);
router.post("/reviews", validateToken, controller.createReview);
router.put("/reviews/:id", validateToken, controller.updateReview);
router.delete("/reviews/:id", validateToken, controller.deleteReview);

export default router;
