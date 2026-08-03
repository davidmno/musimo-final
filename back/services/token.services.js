import jwt from "jsonwebtoken";

export function crearToken(usuario) {
  return jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: "2h" });
}

export function validarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
