import * as coversService from "../../services/covers.services.js";

export async function resolveCover(req, res) {
  try {
    const artist = req.query.artist || "";
    const album = req.query.album || "";
    const legacyImage = req.query.legacyImage || "";

    const result = await coversService.resolveCover(artist, album, legacyImage);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ coverUrl: "/images/cover-placeholder.png", source: "error" });
  }
}
