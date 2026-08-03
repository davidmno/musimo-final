import express from "express";
import * as usuariosController from "../controllers/usuarios.api.controllers.js";
import { validateToken } from "../../middlewares/token.validate.js";
import { requireRole } from "../../middlewares/role.validate.js";

const router = express.Router();

router.post("/usuarios/register", usuariosController.registerUser);
router.post("/usuarios/login", usuariosController.login);

router.get("/usuarios/me", validateToken, usuariosController.getCurrentUser);
router.patch(
  "/usuarios/me/profile",
  validateToken,
  usuariosController.updateCurrentUserProfile,
);

router.get(
  "/usuarios",
  [validateToken, requireRole("admin")],
  usuariosController.getUsers,
);
router.get(
  "/usuarios/:id",
  [validateToken, requireRole("admin")],
  usuariosController.getUserById,
);
router.patch(
  "/usuarios/:id/rol",
  [validateToken, requireRole("admin")],
  usuariosController.updateUserRole,
);
router.delete(
  "/usuarios/:id",
  [validateToken, requireRole("admin")],
  usuariosController.deleteUser,
);

export default router;
