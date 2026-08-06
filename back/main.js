import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

import catalogApiRoute from "./api/routes/catalog.api.routes.js";
import communityApiRoute from "./api/routes/community.api.routes.js";
import listsApiRoute from "./api/routes/lists.api.routes.js";
import reviewsApiRoute from "./api/routes/reviews.api.routes.js";
import usuariosApiRoute from "./api/routes/usuarios.api.routes.js";
import { closeDb, ensureIndexes, getDb } from "./config/db.js";

const app = express();
const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173"]),
]);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      const normalized = origin?.replace(/\/$/, "");
      const allowed = !normalized || allowedOrigins.has(normalized);
      callback(allowed ? null : new Error("Origen no permitido por CORS"), allowed);
    },
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await (await getDb()).command({ ping: 1 });
    res.json({ status: "ok", service: "musimo-backend", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", service: "musimo-backend", database: "unavailable" });
  }
});

app.use("/api", catalogApiRoute);
app.use("/api", communityApiRoute);
app.use("/api", reviewsApiRoute);
app.use("/api", listsApiRoute);
app.use("/api", usuariosApiRoute);

app.use((req, res) => res.status(404).json({ message: "Recurso no encontrado" }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const isValidation = error.name === "ValidationError";
  const isDuplicate = error.code === 11000;
  const status =
    error.message === "Origen no permitido por CORS"
      ? 403
      : isValidation
        ? 400
        : isDuplicate
          ? 409
          : error.status || 500;

  if (status >= 500) console.error(error);
  const safeMessage =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Error interno del servidor"
      : error.message || "Error del servidor";

  res.status(status).json({
    message: (isDuplicate && "Ese dato ya está en uso") || safeMessage,
    errors: status < 500 ? error.errors || error.details || undefined : undefined,
    retryAfter: error.retryAfter || undefined,
  });
});

const PORT = Number(process.env.PORT) || 3333;

try {
  await ensureIndexes();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`musimo está disponible en http://localhost:${PORT}`);
  });

  async function shutdown() {
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error("No se pudo iniciar musimo:", error.message);
  process.exitCode = 1;
}

export default app;
