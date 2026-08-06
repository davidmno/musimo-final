import { asObjectId, getDb, idString } from "../config/db.js";
import { removeReviewedRelease } from "./community.services.js";

function queryFrom(filters = {}) {
  const query = {};
  if (filters.releaseId) query.catalogId = filters.releaseId;
  if (filters.userId) query.userId = idString(filters.userId);
  if (filters.artistId) query.artistId = filters.artistId;
  return query;
}

export async function getReviews(filters = {}) {
  const db = await getDb();
  return db.collection("reviews").find(queryFrom(filters)).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function getReviewById(id) {
  const objectId = asObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  return db.collection("reviews").findOne({ _id: objectId });
}

export async function createReview(review) {
  const db = await getDb();
  const newReview = {
    catalogId: review.catalogId || null,
    artistId: review.artistId || null,
    artist: review.artist,
    album: review.album,
    image: review.image || "",
    text: review.text,
    username: review.username || "Usuario",
    userId: idString(review.userId),
    rating: review.rating,
    significado: review.significado || [],
    momento: review.momento || "",
    momentoVisibility: review.momentoVisibility || "public",
    releaseType: review.releaseType || "Álbum",
    releaseDate: review.releaseDate || null,
    year: review.year || null,
    createdAt: new Date(),
    updatedAt: null,
  };
  const result = await db.collection("reviews").insertOne(newReview);
  await removeReviewedRelease(review.userId, newReview);
  return { ...newReview, _id: result.insertedId };
}

export async function updateReview(id, review, ownerData = {}) {
  const objectId = asObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const update = {
    catalogId: review.catalogId || null,
    artistId: review.artistId || null,
    artist: review.artist,
    album: review.album,
    image: review.image || "",
    text: review.text,
    rating: review.rating,
    significado: review.significado || [],
    momento: review.momento || "",
    momentoVisibility: review.momentoVisibility || "public",
    releaseType: review.releaseType || "Álbum",
    releaseDate: review.releaseDate || null,
    year: review.year || null,
    userId: idString(ownerData.userId),
    username: ownerData.username || "Usuario",
    updatedAt: new Date(),
  };
  return db.collection("reviews").findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deleteReview(id) {
  const objectId = asObjectId(id);
  if (!objectId) return false;
  const db = await getDb();
  const result = await db.collection("reviews").deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
