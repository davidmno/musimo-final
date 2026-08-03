import { validarToken } from "../services/token.services.js";
import { getUserById } from "../services/usuarios.services.js";

export async function validateToken(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ message: "Token requerido" });
    }

    const [bearer, token] = auth.split(" ");

    if (bearer !== "Bearer" || !token) {
      return res.status(401).json({ message: "Formato de token inválido" });
    }

    const tokenData = validarToken(token);
    const currentUser = await getUserById(tokenData._id);

    if (!currentUser) {
      return res.status(401).json({ message: "El usuario ya no existe" });
    }

    req.usuario = {
      _id: String(currentUser._id),
      nombre: currentUser.nombre,
      email: currentUser.email,
      rol: currentUser.rol,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}
