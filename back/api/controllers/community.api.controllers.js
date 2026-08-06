import * as community from "../../services/community.services.js";
import * as catalog from "../../services/catalog.services.js";
import { commentSchema } from "../../schemas/reviews.schema.js";

export async function getHome(req, res, next) {
  try {
    const [newReleases, content] = await Promise.all([
      catalog.getNewReleases(req.query.limit || 12, { genre: "pop", days: 15 }),
      community.getHomeCommunity(req.usuario?._id),
    ]);
    res.json({ newReleases, ...content });
  } catch (error) {
    next(error);
  }
}

export async function search(req, res, next) {
  try {
    res.json(
      await community.searchCommunity(
        req.query.q || "",
        req.usuario?._id,
        req.query.limit,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getFeed(req, res, next) {
  try {
    res.json(
      await community.getFeed(
        req.usuario._id,
        req.query.filter || "all",
        req.query.audience || "all",
        req.query.page,
        req.query.limit,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getToReview(req, res, next) {
  try {
    res.json(await community.getToReview(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function addToReview(req, res, next) {
  try {
    res
      .status(201)
      .json(await community.addToReview(req.usuario._id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function removeFromToReview(req, res, next) {
  try {
    res.json(
      await community.removeFromToReview(req.usuario._id, req.params.key),
    );
  } catch (error) {
    next(error);
  }
}

export async function clearToReview(req, res, next) {
  try {
    res.json(await community.clearToReview(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function getNotifications(req, res, next) {
  try {
    res.json(await community.getNotifications(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function markNotificationsRead(req, res, next) {
  try {
    res.json(
      await community.markNotificationsRead(
        req.usuario._id,
        req.params.id || null,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getFollowedArtists(req, res, next) {
  try {
    res.json(await community.getFollowedArtists(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function followArtist(req, res, next) {
  try {
    res
      .status(201)
      .json(
        await community.followArtist(req.usuario._id, {
          ...req.body,
          id: req.params.id,
        }),
      );
  } catch (error) {
    next(error);
  }
}

export async function unfollowArtist(req, res, next) {
  try {
    res.json(await community.unfollowArtist(req.usuario._id, req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function getRecentSearches(req, res, next) {
  try {
    res.json(await community.getRecentSearches(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function saveRecentSearch(req, res, next) {
  try {
    res
      .status(201)
      .json(await community.saveRecentSearch(req.usuario._id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function removeRecentSearch(req, res, next) {
  try {
    res.json(
      await community.removeRecentSearch(
        req.usuario._id,
        req.params.type,
        req.params.id,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function clearRecentSearches(req, res, next) {
  try {
    res.json(await community.clearRecentSearches(req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function updateComment(req, res, next) {
  try {
    const data = await commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    res.json(
      await community.updateComment(req.params.id, req.usuario._id, data.text),
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req, res, next) {
  try {
    res.json(await community.deleteComment(req.params.id, req.usuario._id));
  } catch (error) {
    next(error);
  }
}

export async function resonateComment(req, res, next) {
  try {
    res.json(
      await community.toggleCommentResonance(req.params.id, req.usuario._id),
    );
  } catch (error) {
    next(error);
  }
}
