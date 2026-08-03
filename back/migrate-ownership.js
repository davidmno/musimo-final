import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DB_URL);

try {
  await client.connect();

  const db = client.db(process.env.DB_NAME);
  const usuarios = db.collection("usuarios");
  const reviews = db.collection("reviews");
  const lists = db.collection("lists");

  const users = await usuarios.find().toArray();
  let reviewsUpdated = 0;
  let listsUpdated = 0;

  for (const user of users) {
    const userId = String(user._id);

    const reviewResult = await reviews.updateMany(
      {
        username: user.nombre,
        $or: [
          { userId: { $exists: false } },
          { userId: null },
          { userId: "" },
        ],
      },
      { $set: { userId } },
    );

    const listResult = await lists.updateMany(
      {
        $and: [
          {
            $or: [
              { ownerName: user.nombre },
              { owner: user.nombre },
            ],
          },
          {
            $or: [
              { ownerId: { $exists: false } },
              { ownerId: null },
              { ownerId: "" },
            ],
          },
        ],
      },
      {
        $set: {
          ownerId: userId,
          ownerName: user.nombre,
          owner: user.nombre,
        },
      },
    );

    reviewsUpdated += reviewResult.modifiedCount;
    listsUpdated += listResult.modifiedCount;
  }

  console.log(`Reseñas actualizadas: ${reviewsUpdated}`);
  console.log(`Listas actualizadas: ${listsUpdated}`);
} finally {
  await client.close();
}
