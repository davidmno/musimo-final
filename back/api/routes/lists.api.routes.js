import express from "express";
import * as listsController from "../controllers/lists.api.controllers.js";
import { validateToken } from "../../middlewares/token.validate.js";
import { validateSchema } from "../../middlewares/validate.schema.js";
import { listSchema } from "../../schemas/lists.schema.js";

const router = express.Router();

router.get("/lists", listsController.getLists);
router.get("/lists/:id", listsController.getListById);

router.post(
  "/lists",
  [validateToken, validateSchema(listSchema)],
  listsController.createList,
);

router.put(
  "/lists/:id",
  [validateToken, validateSchema(listSchema)],
  listsController.updateList,
);

router.delete("/lists/:id", validateToken, listsController.deleteList);

export default router;
