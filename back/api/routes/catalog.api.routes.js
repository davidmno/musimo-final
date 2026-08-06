import express from "express";
import * as controller from "../controllers/catalog.api.controllers.js";

const router = express.Router();

router.get("/catalog/search", controller.search);
router.get("/catalog/new-releases", controller.getNewReleases);
router.get("/catalog/releases/:id/tracks", controller.getReleaseTracks);
router.get("/catalog/releases/:id", controller.getRelease);
router.get("/catalog/artists/:id/releases", controller.getArtistReleases);
router.get("/catalog/artists/:id", controller.getArtist);

export default router;
