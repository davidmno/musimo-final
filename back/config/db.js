import { MongoClient, ObjectId } from "mongodb";

let clientPromise;
let indexesPromise;

function handleSeed(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 24) || "usuario";
}

async function repairHandles(db) {
  const users = await db.collection("usuarios").find().sort({ createdAt: 1, _id: 1 }).toArray();
  const used = new Set();
  const updates = [];

  for (const user of users) {
    const base = handleSeed(user.handle || user.nombre);
    let handle = base;
    let suffix = 1;
    while (used.has(handle)) {
      suffix += 1;
      handle = `${base.slice(0, 24 - String(suffix).length)}${suffix}`;
    }
    used.add(handle);
    if (user.handle !== handle) {
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { handle, updatedAt: new Date() } },
        },
      });
    }
  }

  if (updates.length) await db.collection("usuarios").bulkWrite(updates);
}

function requireDatabaseConfig() {
  if (!process.env.DB_URL || !process.env.DB_NAME) {
    const error = new Error(
      "Faltan DB_URL o DB_NAME. Revisá back/.env antes de iniciar musimo.",
    );
    error.status = 503;
    throw error;
  }
}

export async function getDb() {
  requireDatabaseConfig();

  if (!clientPromise) {
    const client = new MongoClient(process.env.DB_URL, {
      serverSelectionTimeoutMS: 8_000,
    });
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  const client = await clientPromise;
  return client.db(process.env.DB_NAME);
}

export function asObjectId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export function idString(value) {
  return value == null ? "" : String(value);
}

export async function ensureIndexes() {
  if (indexesPromise) return indexesPromise;

  indexesPromise = (async () => {
    const db = await getDb();
    await repairHandles(db);

    await Promise.all([
      db.collection("usuarios").createIndex({ email: 1 }, { unique: true }),
      db
        .collection("usuarios")
        .createIndex({ handle: 1 }, { unique: true, sparse: true }),
      db.collection("reviews").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("reviews").createIndex({ releaseId: 1, createdAt: -1 }),
      db.collection("reviews").createIndex({ createdAt: -1 }),
      db.collection("lists").createIndex({ ownerId: 1, createdAt: -1 }),
      db.collection("lists").createIndex({ visibility: 1, createdAt: -1 }),
      db
        .collection("follows")
        .createIndex({ followerId: 1, targetId: 1 }, { unique: true }),
      db.collection("follows").createIndex({ followerId: 1, createdAt: -1 }),
      db.collection("follows").createIndex({ targetId: 1, createdAt: -1 }),
      db
        .collection("artist_follows")
        .createIndex({ userId: 1, artistId: 1 }, { unique: true }),
      db
        .collection("artist_follows")
        .createIndex({ userId: 1, createdAt: -1 }),
      db
        .collection("recent_searches")
        .createIndex({ userId: 1, type: 1, itemId: 1 }, { unique: true }),
      db
        .collection("recent_searches")
        .createIndex({ userId: 1, savedAt: -1 }),
      db
        .collection("resonances")
        .createIndex(
          { userId: 1, targetType: 1, targetId: 1 },
          { unique: true },
        ),
      db
        .collection("comments")
        .createIndex({ targetType: 1, targetId: 1, createdAt: 1 }),
      db
        .collection("resonances")
        .createIndex({ targetType: 1, createdAt: -1, targetId: 1 }),
      db
        .collection("to_review")
        .createIndex({ userId: 1, releaseKey: 1 }, { unique: true }),
      db
        .collection("notifications")
        .createIndex({ recipientId: 1, createdAt: -1 }),
      db
        .collection("password_resets")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  })().catch((error) => {
    indexesPromise = null;
    throw error;
  });

  return indexesPromise;
}

export async function closeDb() {
  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
  clientPromise = null;
  indexesPromise = null;
}
