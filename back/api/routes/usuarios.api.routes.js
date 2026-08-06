import express from "express";
import * as controller from "../controllers/usuarios.api.controllers.js";
import {
  optionalToken,
  validateToken,
} from "../../middlewares/token.validate.js";
import { requireRole } from "../../middlewares/role.validate.js";

const router = express.Router();

router.post("/usuarios/register", controller.registerUser);
router.post("/usuarios/login", controller.login);
router.post("/usuarios/forgot-password", controller.forgotPassword);
router.post("/usuarios/reset-password", controller.resetPassword);
router.get("/usuarios/search", optionalToken, controller.searchUsers);
router.get(
  "/usuarios/handle/:handle",
  optionalToken,
  controller.getPublicProfile,
);

router.get("/usuarios/me", validateToken, controller.getCurrentUser);
router.patch(
  "/usuarios/me/profile",
  validateToken,
  controller.updateCurrentUserProfile,
);
router.patch("/usuarios/me/password", validateToken, controller.changePassword);
router.patch(
  "/usuarios/me/notifications",
  validateToken,
  controller.updateNotificationSettings,
);
router.post("/usuarios/:id/follow", validateToken, controller.followUser);
router.delete("/usuarios/:id/follow", validateToken, controller.unfollowUser);
router.get(
  "/usuarios/:id/connections/:type",
  optionalToken,
  controller.getConnections,
);
router.get(
  "/usuarios/:id/artists",
  optionalToken,
  controller.getFollowedArtists,
);

router.get(
  "/usuarios",
  [validateToken, requireRole("admin")],
  controller.getUsers,
);
router.get(
  "/usuarios/:id",
  [validateToken, requireRole("admin")],
  controller.getUserById,
);
router.patch(
  "/usuarios/:id/rol",
  [validateToken, requireRole("admin")],
  controller.updateUserRole,
);
router.delete(
  "/usuarios/:id",
  [validateToken, requireRole("admin")],
  controller.deleteUser,
);

export default router;
