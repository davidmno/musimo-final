import express from "express";
import * as lastfmController from "../controllers/lastfm.api.controllers.js";

const router = express.Router();

router.get("/lastfm/albums", lastfmController.searchAlbums);
router.get("/lastfm/album-info", lastfmController.getAlbumInfo);
router.get("/lastfm/artist-albums", lastfmController.getArtistTopAlbums);

export default router;
