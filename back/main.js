import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import reviewsApiRoute from "./api/routes/reviews.api.routes.js";
import usuariosApiRoute from "./api/routes/usuarios.api.routes.js";
import coversApiRoute from "./api/routes/covers.api.routes.js";
import listsApiRoute from "./api/routes/lists.api.routes.js";
import lastfmApiRoute from "./api/routes/lastfm.api.routes.js";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, "");

      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "musimo-backend" });
});

app.use("/api", coversApiRoute);
app.use("/api", reviewsApiRoute);
app.use("/api", usuariosApiRoute);
app.use("/api", listsApiRoute);
app.use("/api", lastfmApiRoute);

app.use((req, res) => {
  res.status(404).json({ message: "Recurso no encontrado" });
});

app.use((error, req, res, next) => {
  console.error(error);

  const status = error.message === "Origen no permitido por CORS" ? 403 : 500;
  res.status(status).json({ message: error.message || "Error del servidor" });
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
