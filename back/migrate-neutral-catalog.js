import dotenv from "dotenv";
dotenv.config();

import { closeDb, ensureIndexes, getDb } from "./config/db.js";

const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function neutralRelease(item = {}) {
  const legacyId = item.catalogId || item.id || item.spotifyId || null;
  return {
    catalogId: legacyId && MBID.test(legacyId) ? legacyId : null,
    album: item.album || item.title || "Lanzamiento",
    artist: item.artist || "Artista",
    artistId: item.artistId && MBID.test(item.artistId) ? item.artistId : null,
    image: item.image || "",
    year: item.year || null,
    releaseDate: item.releaseDate || null,
    releaseType: item.releaseType || item.type || "Álbum",
  };
}

async function migrateCollection(collection, cursor, transform) {
  let updated = 0;
  for await (const document of cursor) {
    const set = transform(document);
    await collection.updateOne(
      { _id: document._id },
      { $set: set, $unset: { spotifyId: "", spotifyUrl: "" } },
    );
    updated += 1;
  }
  return updated;
}

try {
  const db = await getDb();
  const users = db.collection("usuarios");
  const lists = db.collection("lists");
  const reviews = db.collection("reviews");

  const userCount = await migrateCollection(users, users.find(), (user) => ({
    top5: (user.top5 || []).map(neutralRelease),
    favoriteArtists: user.favoriteArtists || [],
    notificationSettings: user.notificationSettings || { followedUserPosts: false },
  }));

  const listCount = await migrateCollection(lists, lists.find(), (list) => ({
    albums: (list.albums || []).map(neutralRelease),
    visibility: list.visibility || "public",
    ownerId: list.ownerId ? String(list.ownerId) : null,
  }));

  const reviewCount = await migrateCollection(reviews, reviews.find(), (review) => ({
    catalogId: review.catalogId && MBID.test(review.catalogId) ? review.catalogId : null,
    artistId: review.artistId && MBID.test(review.artistId) ? review.artistId : null,
    userId: review.userId ? String(review.userId) : null,
    momentoVisibility: review.momentoVisibility || "public",
  }));

  await ensureIndexes();
  console.log(`Migración lista: ${userCount} usuarios, ${listCount} listas y ${reviewCount} reseñas.`);
} catch (error) {
  console.error("No se pudo completar la migración:", error.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
