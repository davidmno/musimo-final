import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

const email = (process.argv[2] || "").trim().toLowerCase();
const rol = (process.argv[3] || "").trim().toLowerCase();

if (!email || !["user", "admin"].includes(rol)) {
  console.error(
    "Uso: npm run set-role -- correo@ejemplo.com user|admin",
  );
  process.exit(1);
}

if (!process.env.DB_URL || !process.env.DB_NAME) {
  console.error("Faltan DB_URL o DB_NAME en back/.env");
  process.exit(1);
}

const client = new MongoClient(process.env.DB_URL);

try {
  await client.connect();

  const db = client.db(process.env.DB_NAME);

  const result = await db.collection("usuarios").updateOne(
    { email },
    {
      $set: {
        rol,
        updatedAt: new Date(),
      },
    },
  );

  if (!result.matchedCount) {
    console.error(`No existe un usuario con el email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`${email} ahora tiene el rol: ${rol}`);
  }
} finally {
  await client.close();
}
