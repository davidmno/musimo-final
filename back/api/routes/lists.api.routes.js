import express from "express";
import * as controller from "../controllers/lists.api.controllers.js";
import {
  optionalToken,
  validateToken,
} from "../../middlewares/token.validate.js";

const router = express.Router();

router.get("/lists", optionalToken, controller.getLists);
router.get("/lists/:id/comments", optionalToken, controller.getComments);
router.post("/lists/:id/comments", validateToken, controller.addComment);
router.post("/lists/:id/resonate", validateToken, controller.resonate);
router.get("/lists/:id", optionalToken, controller.getListById);
router.post("/lists", validateToken, controller.createList);
router.put("/lists/:id", validateToken, controller.updateList);
router.delete("/lists/:id", validateToken, controller.deleteList);

export default router;
