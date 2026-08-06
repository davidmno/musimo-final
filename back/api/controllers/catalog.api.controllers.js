import * as catalog from "../../services/catalog.services.js";

export async function search(req, res, next) {
  try {
    const results = await catalog.searchCatalog(
      req.query.q || "",
      req.query.limit,
      {
        expandArtist: req.query.expandArtist === "1",
        releaseLimit: req.query.releaseLimit,
      },
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
}

export async function getRelease(req, res, next) {
  try {
    res.json(await catalog.getReleaseGroup(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function getReleaseTracks(req, res, next) {
  try {
    res.json(await catalog.getReleaseTracks(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function getArtist(req, res, next) {
  try {
    res.json(await catalog.getArtist(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function getArtistReleases(req, res, next) {
  try {
    res.json(await catalog.getArtistReleases(req.params.id, req.query.limit));
  } catch (error) {
    next(error);
  }
}

export async function getNewReleases(req, res, next) {
  try {
    res.json(await catalog.getNewReleases(req.query.limit));
  } catch (error) {
    next(error);
  }
}
