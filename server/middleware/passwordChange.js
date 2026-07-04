import { getDb } from "../db/database.js";

export function requirePasswordChanged(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT must_change_password FROM users WHERE id = ?").get(req.user.userId);

  if (user && user.must_change_password) {
    return res.status(403).json({
      error: "Password change required",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }

  next();
}
