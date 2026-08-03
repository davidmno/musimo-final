export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.usuario) {
      return res.status(401).json({ message: "Autenticación requerida" });
    }

    if (!allowedRoles.includes(req.usuario.rol)) {
      return res.status(403).json({ message: "No tenés permisos para realizar esta acción" });
    }

    next();
  };
}
