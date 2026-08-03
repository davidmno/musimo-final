import express from "express";
import * as coversController from "../controllers/covers.api.controllers.js";

const router = express.Router();

router.get("/covers/resolve", coversController.resolveCover);

export default router;
