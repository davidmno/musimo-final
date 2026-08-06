import { validarToken } from "../services/token.services.js";
import { getAuthUserById } from "../services/usuarios.services.js";

async function resolveUser(req) {
  const auth = req.headers.authorization || "";
  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  const payload = validarToken(token);
  const user = await getAuthUserById(payload._id);
  if (!user) return null;

  return {
    _id: String(user._id),
    nombre: user.nombre,
    handle: user.handle,
    email: user.email,
    rol: user.rol || "user",
  };
}

export async function validateToken(req, res, next) {
  try {
    req.usuario = await resolveUser(req);
    if (!req.usuario) return res.status(401).json({ message: "Iniciá sesión para continuar" });
    next();
  } catch {
    res.status(401).json({ message: "La sesión venció. Volvé a iniciar sesión." });
  }
}

export async function optionalToken(req, res, next) {
  try {
    req.usuario = await resolveUser(req);
  } catch {
    req.usuario = null;
  }
  next();
}
