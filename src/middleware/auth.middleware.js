import jwt from "jsonwebtoken";

// Protege rutas: exige un "Authorization: Bearer <token>" valido y deja el id
// del usuario en req.userId para que el resto de la cadena lo use.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Sesion invalida o expirada" });
  }
}
