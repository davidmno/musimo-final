import dotenv from "dotenv";
dotenv.config();

import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.DB_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const collection = db.collection("reviews");

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function getReviews() {
  return collection.find().sort({ createdAt: -1 }).toArray();
}

export function getReviewById(id) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  return collection.findOne({ _id: objectId });
}

export async function createReview(review) {
  const newReview = {
    artist: review.artist,
    album: review.album,
    image: review.image || "",
    text: review.text,
    username: review.username || "Usuario",
    userId: review.userId || null,
    rating: review.rating ?? null,
    significado: review.significado || [],
    momento: review.momento || "",
    releaseType: review.releaseType || "Álbum",
    year: review.year || null,
    createdAt: new Date(),
    updatedAt: null,
  };

  const result = await collection.insertOne(newReview);

  return {
    ...newReview,
    _id: result.insertedId,
  };
}

export async function updateReview(id, review, ownerData = {}) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const updatedReview = {
    artist: review.artist,
    album: review.album,
    image: review.image || "",
    text: review.text,
    rating: review.rating ?? null,
    significado: review.significado || [],
    momento: review.momento || "",
    releaseType: review.releaseType || "Álbum",
    year: review.year || null,
    updatedAt: new Date(),
  };

  if (ownerData.userId) updatedReview.userId = ownerData.userId;
  if (ownerData.username) updatedReview.username = ownerData.username;

  const result = await collection.updateOne(
    { _id: objectId },
    { $set: updatedReview },
  );

  if (!result.matchedCount) return null;

  return collection.findOne({ _id: objectId });
}

export async function deleteReview(id) {
  const objectId = toObjectId(id);
  if (!objectId) return false;

  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
