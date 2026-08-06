import { asObjectId, getDb, idString } from "../config/db.js";

function visibilityQuery(viewerId) {
  const publicQuery = { visibility: { $ne: "private" } };
  return viewerId
    ? { $or: [publicQuery, { ownerId: idString(viewerId) }] }
    : publicQuery;
}

export async function getLists(filters = {}, viewerId = null) {
  const db = await getDb();
  const query = visibilityQuery(viewerId);
  if (filters.ownerId) query.ownerId = idString(filters.ownerId);
  return db.collection("lists").find(query).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function getListById(id) {
  const objectId = asObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  return db.collection("lists").findOne({ _id: objectId });
}

export async function createList(list) {
  const db = await getDb();
  const newList = {
    title: list.title,
    description: list.description || "",
    visibility: list.visibility || "public",
    albums: list.albums || [],
    ownerId: idString(list.ownerId),
    ownerName: list.ownerName || "Usuario",
    ownerHandle: list.ownerHandle || "",
    owner: list.ownerName || "Usuario",
    createdAt: new Date(),
    updatedAt: null,
  };
  const result = await db.collection("lists").insertOne(newList);
  return { ...newList, _id: result.insertedId };
}

export async function updateList(id, list, ownerData = {}) {
  const objectId = asObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const update = {
    title: list.title,
    description: list.description || "",
    visibility: list.visibility || "public",
    albums: list.albums || [],
    ownerId: idString(ownerData.ownerId),
    ownerName: ownerData.ownerName || "Usuario",
    ownerHandle: ownerData.ownerHandle || "",
    owner: ownerData.ownerName || "Usuario",
    updatedAt: new Date(),
  };
  return db.collection("lists").findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deleteList(id) {
  const objectId = asObjectId(id);
  if (!objectId) return false;
  const db = await getDb();
  const result = await db.collection("lists").deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
