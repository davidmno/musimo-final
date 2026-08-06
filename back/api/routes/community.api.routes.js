import express from "express";
import * as controller from "../controllers/community.api.controllers.js";
import {
  optionalToken,
  validateToken,
} from "../../middlewares/token.validate.js";

const router = express.Router();

router.get("/home", optionalToken, controller.getHome);
router.get("/search", optionalToken, controller.search);
router.get("/feed", validateToken, controller.getFeed);
router.get("/to-review", validateToken, controller.getToReview);
router.post("/to-review", validateToken, controller.addToReview);
router.delete("/to-review", validateToken, controller.clearToReview);
router.delete("/to-review/:key", validateToken, controller.removeFromToReview);
router.get("/notifications", validateToken, controller.getNotifications);
router.patch(
  "/notifications/read",
  validateToken,
  controller.markNotificationsRead,
);
router.patch(
  "/notifications/:id/read",
  validateToken,
  controller.markNotificationsRead,
);
router.get("/artist-follows", validateToken, controller.getFollowedArtists);
router.post("/artist-follows/:id", validateToken, controller.followArtist);
router.delete("/artist-follows/:id", validateToken, controller.unfollowArtist);
router.get("/recent-searches", validateToken, controller.getRecentSearches);
router.post("/recent-searches", validateToken, controller.saveRecentSearch);
router.delete(
  "/recent-searches",
  validateToken,
  controller.clearRecentSearches,
);
router.delete(
  "/recent-searches/:type/:id",
  validateToken,
  controller.removeRecentSearch,
);
router.patch("/comments/:id", validateToken, controller.updateComment);
router.delete("/comments/:id", validateToken, controller.deleteComment);
router.post(
  "/comments/:id/resonate",
  validateToken,
  controller.resonateComment,
);

export default router;
