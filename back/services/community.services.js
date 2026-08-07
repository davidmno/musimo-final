import { asObjectId, getDb, idString } from "../config/db.js";
import { HttpError } from "../utils/http-error.js";
import { escapeRegExp, normalizeText, releaseKey } from "../utils/text.js";
import { applyReviewVisibility } from "../utils/review-visibility.js";

async function userMap(ids = []) {
  const db = await getDb();
  const objectIds = [...new Set(ids.map(idString))].map(asObjectId).filter(Boolean);
  if (!objectIds.length) return new Map();
  const users = await db
    .collection("usuarios")
    .find({ _id: { $in: objectIds } }, { projection: { password: 0, email: 0 } })
    .toArray();
  return new Map(users.map((user) => [idString(user._id), {
    _id: user._id,
    nombre: user.nombre,
    handle: user.handle,
    avatar: user.avatar || user.nombre?.slice(0, 1).toUpperCase() || "U",
    avatarImage: user.avatarImage || "",
  }]));
}

export async function createNotification({ recipientId, actorId, type, targetType = null, targetId = null, text = "" }) {
  if (!recipientId || idString(recipientId) === idString(actorId)) return null;
  const db = await getDb();
  return db.collection("notifications").insertOne({
    recipientId: idString(recipientId),
    actorId: idString(actorId),
    type,
    targetType,
    targetId: targetId ? idString(targetId) : null,
    text: String(text || "").slice(0, 160),
    read: false,
    createdAt: new Date(),
  });
}

export async function toggleResonance(userId, targetType, targetId, authorId) {
  if (authorId && idString(userId) === idString(authorId)) {
    throw new HttpError(400, "No podés resonar con tu propia publicación");
  }
  const db = await getDb();
  const key = { userId: idString(userId), targetType, targetId: idString(targetId) };
  const existing = await db.collection("resonances").findOne(key);
  if (existing) {
    await db.collection("resonances").deleteOne({ _id: existing._id });
    return { resonated: false };
  }

  await db.collection("resonances").insertOne({ ...key, createdAt: new Date() });
  await createNotification({
    recipientId: authorId,
    actorId: userId,
    type: "resonance",
    targetType,
    targetId,
  });
  return { resonated: true };
}

export async function getFollowedArtists(userId) {
  const db = await getDb();
  const follows = await db.collection("artist_follows")
    .find({ userId: idString(userId) })
    .sort({ createdAt: -1 })
    .toArray();
  return follows.map(({ artist, createdAt }) => ({ ...artist, followedAt: createdAt }));
}

export async function isFollowingArtist(userId, artistId) {
  if (!userId || !artistId) return false;
  const db = await getDb();
  return Boolean(await db.collection("artist_follows").findOne({
    userId: idString(userId),
    artistId: idString(artistId),
  }));
}

export async function followArtist(userId, artist = {}) {
  const artistId = idString(artist.catalogId || artist.id);
  if (!artistId || !artist.name) throw new HttpError(400, "El artista es inválido");
  const db = await getDb();
  const normalized = {
    id: artistId,
    catalogId: artistId,
    name: String(artist.name).trim(),
    image: artist.image || "",
  };
  await db.collection("artist_follows").updateOne(
    { userId: idString(userId), artistId },
    { $set: { artist: normalized, updatedAt: new Date() }, $setOnInsert: { userId: idString(userId), artistId, createdAt: new Date() } },
    { upsert: true },
  );
  return { following: true, artist: normalized };
}

export async function unfollowArtist(userId, artistId) {
  const db = await getDb();
  await db.collection("artist_follows").deleteOne({ userId: idString(userId), artistId: idString(artistId) });
  return { following: false };
}

function recentSearchItem(entity = {}) {
  const type = String(entity.type || "").trim();
  const itemId = idString(entity.catalogId || entity.id || entity._id || entity.title);
  if (!type || !itemId) throw new HttpError(400, "La búsqueda reciente es inválida");
  return {
    itemId,
    type,
    title: entity.title || entity.album || entity.name || entity.nombre || "",
    subtitle: entity.subtitle || entity.artist || entity.handle || "",
    album: entity.album || null,
    artist: entity.artist || null,
    artistId: entity.artistId || null,
    catalogId: entity.catalogId || entity.id || null,
    image: entity.image || entity.avatarImage || "",
    year: entity.year || null,
    releaseType: entity.releaseType || null,
    handle: entity.handle || null,
  };
}

export async function getRecentSearches(userId) {
  const db = await getDb();
  const items = await db.collection("recent_searches")
    .find({ userId: idString(userId) })
    .sort({ savedAt: -1 })
    .limit(3)
    .toArray();
  return items
    .filter(
      (item) =>
        !(
          item.type === "person" &&
          String(item.handle || "")
            .toLowerCase() === "admin"
        ),
    )
    .map(
      ({
        _id,
        userId: ownerId,
        ...item
      }) => ({
        ...item,
        id: item.itemId,
      }),
    );
}

export async function saveRecentSearch(userId, entity) {
  const db = await getDb();
  const item = recentSearchItem(entity);
  await db.collection("recent_searches").updateOne(
    { userId: idString(userId), type: item.type, itemId: item.itemId },
    { $set: { ...item, userId: idString(userId), savedAt: new Date() } },
    { upsert: true },
  );
  return getRecentSearches(userId);
}

export async function removeRecentSearch(userId, type, itemId) {
  const db = await getDb();
  await db.collection("recent_searches").deleteOne({ userId: idString(userId), type, itemId });
  return getRecentSearches(userId);
}

export async function clearRecentSearches(userId) {
  const db = await getDb();
  await db.collection("recent_searches").deleteMany({ userId: idString(userId) });
  return [];
}

export async function hasResonated(userId, targetType, targetId) {
  if (!userId) return false;
  const db = await getDb();
  return Boolean(await db.collection("resonances").findOne({
    userId: idString(userId),
    targetType,
    targetId: idString(targetId),
  }));
}

export async function listComments(targetType, targetId, viewerId = null) {
  const db = await getDb();
  const comments = await db
    .collection("comments")
    .find({ targetType, targetId: idString(targetId) })
    .sort({ createdAt: 1 })
    .toArray();
  const users = await userMap(comments.map((comment) => comment.userId));
  const resonatedIds = new Set();
  if (viewerId && comments.length) {
    const resonances = await db.collection("resonances").find({
      userId: idString(viewerId),
      targetType: "comment",
      targetId: { $in: comments.map((comment) => idString(comment._id)) },
    }).toArray();
    resonances.forEach((item) => resonatedIds.add(idString(item.targetId)));
  }
  return comments.map((comment) => ({
    ...comment,
    author: users.get(idString(comment.userId)) || { nombre: "Usuario", handle: "" },
    resonatedByMe: resonatedIds.has(idString(comment._id)),
  }));
}

export async function addComment({ userId, targetType, targetId, authorId, text }) {
  const db = await getDb();
  const comment = {
    userId: idString(userId),
    targetType,
    targetId: idString(targetId),
    text: text.trim(),
    createdAt: new Date(),
  };
  const result = await db.collection("comments").insertOne(comment);
  await createNotification({
    recipientId: authorId,
    actorId: userId,
    type: "comment",
    targetType,
    targetId,
    text,
  });
  const users = await userMap([userId]);
  return { ...comment, _id: result.insertedId, author: users.get(idString(userId)) };
}

export async function updateComment(commentId, userId, text) {
  const objectId = asObjectId(commentId);
  if (!objectId) throw new HttpError(404, "Comentario no encontrado");
  const db = await getDb();
  const current = await db.collection("comments").findOne({ _id: objectId });
  if (!current) throw new HttpError(404, "Comentario no encontrado");
  if (idString(current.userId) !== idString(userId)) {
    throw new HttpError(403, "Solo podés editar tus propios comentarios");
  }
  const updated = await db.collection("comments").findOneAndUpdate(
    { _id: objectId, userId: idString(userId) },
    { $set: { text: text.trim(), editedAt: new Date() } },
    { returnDocument: "after" },
  );
  const users = await userMap([userId]);
  return { ...updated, author: users.get(idString(userId)) || null };
}

export async function deleteComment(commentId, userId) {
  const objectId = asObjectId(commentId);
  if (!objectId) throw new HttpError(404, "Comentario no encontrado");
  const db = await getDb();
  const current = await db.collection("comments").findOne({ _id: objectId });
  if (!current) throw new HttpError(404, "Comentario no encontrado");
  if (idString(current.userId) !== idString(userId)) {
    throw new HttpError(403, "Solo podés eliminar tus propios comentarios");
  }
  await Promise.all([
    db.collection("comments").deleteOne({ _id: objectId }),
    db.collection("resonances").deleteMany({ targetType: "comment", targetId: idString(commentId) }),
  ]);
  return { deleted: idString(commentId) };
}

export async function toggleCommentResonance(commentId, userId) {
  const objectId = asObjectId(commentId);
  if (!objectId) throw new HttpError(404, "Comentario no encontrado");
  const db = await getDb();
  const comment = await db.collection("comments").findOne({ _id: objectId });
  if (!comment) throw new HttpError(404, "Comentario no encontrado");
  if (idString(comment.userId) === idString(userId)) {
    throw new HttpError(400, "No podés resonar con tu propio comentario");
  }
  const key = { userId: idString(userId), targetType: "comment", targetId: idString(commentId) };
  const existing = await db.collection("resonances").findOne(key);
  if (existing) {
    await db.collection("resonances").deleteOne({ _id: existing._id });
    return { resonated: false };
  }
  await db.collection("resonances").insertOne({ ...key, createdAt: new Date() });
  await createNotification({
    recipientId: comment.userId,
    actorId: userId,
    type: "comment_resonance",
    targetType: comment.targetType,
    targetId: comment.targetId,
  });
  return { resonated: true };
}

export async function deleteRelated(targetType, targetId) {
  const db = await getDb();
  const key = { targetType, targetId: idString(targetId) };
  await Promise.all([
    db.collection("comments").deleteMany(key),
    db.collection("resonances").deleteMany(key),
    db.collection("notifications").deleteMany(key),
  ]);
}

export async function getToReview(userId) {
  const db = await getDb();
  const items = await db.collection("to_review").find({ userId: idString(userId) }).sort({ createdAt: -1 }).toArray();
  return items.map(({ release, createdAt }) => ({ ...release, createdAt }));
}

export async function addToReview(userId, release) {
  const db = await getDb();
  const normalized = {
    catalogId: release.catalogId || release.id || null,
    album: release.album || release.title,
    artist: release.artist,
    artistId: release.artistId || null,
    image: release.image || "",
    year: release.year || null,
    releaseDate: release.releaseDate || null,
    releaseType: release.releaseType || "Álbum",
  };
  if (!normalized.album || !normalized.artist) throw new HttpError(400, "El lanzamiento es inválido");
  const key = releaseKey(normalized);
  await db.collection("to_review").updateOne(
    { userId: idString(userId), releaseKey: key },
    { $setOnInsert: { userId: idString(userId), releaseKey: key, release: normalized, createdAt: new Date() } },
    { upsert: true },
  );
  return getToReview(userId);
}

export async function removeFromToReview(userId, key) {
  const db = await getDb();
  await db.collection("to_review").deleteOne({ userId: idString(userId), releaseKey: key });
  return getToReview(userId);
}

export async function clearToReview(userId) {
  const db = await getDb();
  await db.collection("to_review").deleteMany({ userId: idString(userId) });
  return [];
}

export async function removeReviewedRelease(userId, release) {
  const db = await getDb();
  const key = releaseKey(release);
  await db.collection("to_review").deleteMany({
    userId: idString(userId),
    $or: [
      { releaseKey: key },
      {
        "release.artist": release.artist,
        "release.album": release.album,
      },
    ],
  });
}

export async function getNotifications(userId) {
  const db = await getDb();
  const notifications = await db.collection("notifications").find({ recipientId: idString(userId) }).sort({ createdAt: -1 }).limit(80).toArray();
  const users = await userMap(notifications.map((item) => item.actorId));
  const reviewIds = notifications.filter((item) => item.targetType === "review").map((item) => asObjectId(item.targetId)).filter(Boolean);
  const listIds = notifications.filter((item) => item.targetType === "list").map((item) => asObjectId(item.targetId)).filter(Boolean);
  const [reviews, lists] = await Promise.all([
    reviewIds.length ? db.collection("reviews").find({ _id: { $in: reviewIds } }, { projection: { album: 1, artist: 1, image: 1 } }).toArray() : [],
    listIds.length ? db.collection("lists").find({ _id: { $in: listIds } }, { projection: { title: 1, albums: 1 } }).toArray() : [],
  ]);
  const contexts = new Map([
    ...reviews.map((review) => [idString(review._id), { title: review.album, subtitle: review.artist, image: review.image || "", kind: "review" }]),
    ...lists.map((list) => [idString(list._id), { title: list.title, image: list.albums?.find((album) => album?.image)?.image || "", kind: "list" }]),
  ]);
  return notifications.map((item) => ({ ...item, actor: users.get(idString(item.actorId)) || null, context: contexts.get(idString(item.targetId)) || null }));
}

export async function markNotificationsRead(userId, id = null) {
  const db = await getDb();
  const filter = { recipientId: idString(userId), ...(id ? { _id: asObjectId(id) } : {}) };
  await db.collection("notifications").updateMany(filter, { $set: { read: true, readAt: new Date() } });
  return { updated: true };
}

function visibleReview(item, viewerId) {
  const owner = idString(item.userId) === idString(viewerId);
  return applyReviewVisibility(item, { canManage: owner });
}

export async function getFeed(userId, filter = "all", audience = "all", page = 1, limit = 10) {
  const db = await getDb();

  const adminUsers = await db
    .collection("usuarios")
    .find(
      { rol: "admin" },
      { projection: { _id: 1 } },
    )
    .toArray();

  const adminIds = adminUsers.map((user) =>
    idString(user._id),
  );

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(20, Math.max(1, Number.parseInt(limit, 10) || 10));
  const offset = (currentPage - 1) * pageSize;
  const fetchLimit = offset + pageSize;
  const followed = audience === "following"
    ? await db.collection("follows").find({ followerId: idString(userId) }).toArray()
    : [];
  const adminIdSet = new Set(adminIds);

  const ownerIds = followed
    .map((item) => item.targetId)
    .filter(
      (ownerId) =>
        !adminIdSet.has(idString(ownerId)),
    );

  if (audience === "following" && !ownerIds.length) {
    return {
      items: [],
      pagination: { page: 1, pageSize, total: 0, totalPages: 1, hasPrevious: false, hasNext: false },
    };
  }
  const ownerFilter =
    audience === "following"
      ? { $in: ownerIds }
      : {
          $exists: true,
          ...(adminIds.length
            ? { $nin: adminIds }
            : {}),
        };

  const reviewQuery = {
    userId: ownerFilter,
  };

  const listQuery = {
    ownerId: ownerFilter,
    visibility: { $ne: "private" },
  };

  const [reviews, lists, reviewCount, listCount] = await Promise.all([
    filter === "lists" ? [] : db.collection("reviews").find(reviewQuery).sort({ createdAt: -1 }).limit(fetchLimit).toArray(),
    filter === "reviews" ? [] : db.collection("lists").find(listQuery).sort({ createdAt: -1 }).limit(fetchLimit).toArray(),
    filter === "lists" ? 0 : db.collection("reviews").countDocuments(reviewQuery),
    filter === "reviews" ? 0 : db.collection("lists").countDocuments(listQuery),
  ]);
  const users = await userMap([
    ...reviews.map((item) => item.userId),
    ...lists.map((item) => item.ownerId),
  ]);
  const items = [
    ...reviews.map((item) => ({ type: "review", createdAt: item.createdAt, data: visibleReview(item, userId), author: users.get(idString(item.userId)) })),
    ...lists.map((item) => ({ type: "list", createdAt: item.createdAt, data: item, author: users.get(idString(item.ownerId)) })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(offset, offset + pageSize);
  const total = reviewCount + listCount;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    pagination: {
      page: Math.min(currentPage, totalPages),
      pageSize,
      total,
      totalPages,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
    },
  };
}

export async function getHomeCommunity(viewerId = null) {
  const db = await getDb();

  const adminUsers = await db
    .collection("usuarios")
    .find(
      { rol: "admin" },
      { projection: { _id: 1 } },
    )
    .toArray();

  const adminIds = adminUsers.map((user) =>
    idString(user._id),
  );

  const excludedReviewOwners = [
    ...adminIds,
    ...(viewerId
      ? [idString(viewerId)]
      : []),
  ];

  const reviewFilter =
    excludedReviewOwners.length
      ? {
          userId: {
            $nin: excludedReviewOwners,
          },
        }
      : {};

  const viewerObjectId = viewerId
    ? asObjectId(viewerId)
    : null;
  const [reviews, lists, resonances, latestUsers, viewerFollows] = await Promise.all([
    db.collection("reviews").find(reviewFilter).sort({ createdAt: -1 }).limit(20).toArray(),
    db
      .collection("lists")
      .find({
        visibility: { $ne: "private" },
        ownerId: {
          $nin: [
            ...adminIds,
            ...(viewerId ? [idString(viewerId)] : []),
          ],
        },
      })
      .sort({ createdAt: -1 })
      .limit(16)
      .toArray(),
    db.collection("resonances").aggregate([
      { $match: { targetType: "review", createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: "$targetId", score: { $sum: 1 } } },
      { $sort: { score: -1 } },
      { $limit: 12 },
    ]).toArray(),
    db.collection("usuarios")
      .find(
        {
          rol: { $ne: "admin" },
          ...(viewerObjectId
            ? { _id: { $ne: viewerObjectId } }
            : {}),
        },
        {
          projection: {
            password: 0,
            email: 0,
          },
        },
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(3)
      .toArray(),
    viewerId ? db.collection("follows").find({ followerId: idString(viewerId) }).toArray() : [],
  ]);
  const authors = await userMap([
    ...reviews.map((review) => review.userId),
    ...lists.map((list) => list.ownerId),
  ]);
  const reviewById = new Map(reviews.map((review) => [idString(review._id), review]));
  const resonatedReviews = resonances.map((item) => reviewById.get(idString(item._id))).filter(Boolean);
  const seenStoryIds = new Set();
  const generatingStories = [...resonatedReviews, ...reviews].filter((review) => {
    const reviewId = idString(review._id);
    if (!reviewId || seenStoryIds.has(reviewId)) return false;
    seenStoryIds.add(reviewId);
    return true;
  }).slice(0, 8);
  const followedUserIds = new Set(viewerFollows.map((follow) => idString(follow.targetId)));

  const decorateReview = (review) => ({
    ...visibleReview(review, viewerId),
    author: authors.get(idString(review.userId)) || null,
  });
  return {
    generatingStories: generatingStories.map(decorateReview),
    recentStories: reviews.slice(0, 12).map(decorateReview),
    discoverLists: lists.slice(0, 12).map((list) => ({ ...list, author: authors.get(idString(list.ownerId)) || null })),
    suggestedUsers: latestUsers.map((user) => ({
      _id: user._id,
      nombre: user.nombre || "Usuario",
      handle: user.handle,
      avatar: user.avatar || user.nombre?.slice(0, 1).toUpperCase() || "U",
      avatarImage: user.avatarImage || "",
      bio: user.bio || "",
      isFollowing: followedUserIds.has(idString(user._id)),
    })),
  };
}

export async function searchCommunity(query, viewerId = null, limit = 10) {
  const clean = normalizeText(query);
  if (clean.length < 2) return { people: [], lists: [], reviews: [] };
  const db = await getDb();
  const regex = new RegExp(escapeRegExp(clean), "i");
  const safeLimit = Math.min(Number(limit) || 10, 20);

  const adminUsers = await db
    .collection("usuarios")
    .find(
      { rol: "admin" },
      { projection: { _id: 1 } },
    )
    .toArray();

  const adminIds = adminUsers.map((user) =>
    idString(user._id),
  );

  const [people, lists] = await Promise.all([
    db
      .collection("usuarios")
      .find(
        {
          rol: { $ne: "admin" },
          $or: [
            { nombre: regex },
            { handle: regex },
          ],
        },
        {
          projection: {
            password: 0,
            email: 0,
          },
        },
      )
      .limit(safeLimit)
      .toArray(),

    db
      .collection("lists")
      .find({
        visibility: { $ne: "private" },
        ...(adminIds.length
          ? { ownerId: { $nin: adminIds } }
          : {}),
        $or: [
          { title: regex },
          { description: regex },
        ],
      })
      .limit(safeLimit)
      .toArray(),
  ]);
  const authors = await userMap(lists.map((list) => list.ownerId));
  return {
    people: people.map((user) => ({ _id: user._id, nombre: user.nombre, handle: user.handle, avatar: user.avatar, avatarImage: user.avatarImage || "", bio: user.bio || "" })),
    lists: lists.map((list) => ({ ...list, author: authors.get(idString(list.ownerId)) || null })),
    reviews: [],
  };
}
