import dotenv from "dotenv";
dotenv.config();

import { MongoClient, ObjectId } from "mongodb";

const client = new MongoClient(process.env.DB_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const collection = db.collection("lists");

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function getLists() {
  return collection.find().sort({ createdAt: -1 }).toArray();
}

export function getListById(id) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  return collection.findOne({ _id: objectId });
}

export async function createList(list) {
  const newList = {
    title: list.title,
    description: list.description || "",
    albums: list.albums || [],
    ownerId: list.ownerId || null,
    ownerName: list.ownerName || "Usuario",
    owner: list.ownerName || "Usuario",
    createdAt: new Date(),
    updatedAt: null,
  };

  const result = await collection.insertOne(newList);

  return {
    ...newList,
    _id: result.insertedId,
  };
}

export async function updateList(id, list, ownerData = {}) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const updatedList = {
    title: list.title,
    description: list.description || "",
    albums: list.albums || [],
    updatedAt: new Date(),
  };

  if (ownerData.ownerId) updatedList.ownerId = ownerData.ownerId;
  if (ownerData.ownerName) {
    updatedList.ownerName = ownerData.ownerName;
    updatedList.owner = ownerData.ownerName;
  }

  const result = await collection.updateOne(
    { _id: objectId },
    { $set: updatedList },
  );

  if (!result.matchedCount) return null;

  return collection.findOne({ _id: objectId });
}

export async function deleteList(id) {
  const objectId = toObjectId(id);
  if (!objectId) return false;

  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}
