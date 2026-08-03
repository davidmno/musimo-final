import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();

if (!email) {
  console.error("Uso: npm run make-admin -- correo@ejemplo.com");
  process.exit(1);
}

const client = new MongoClient(process.env.DB_URL);

try {
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const result = await db
    .collection("usuarios")
    .updateOne({ email }, { $set: { rol: "admin", updatedAt: new Date() } });

  if (!result.matchedCount) {
    console.error(`No existe un usuario con el email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`Usuario administrador configurado: ${email}`);
  }
} finally {
  await client.close();
}
