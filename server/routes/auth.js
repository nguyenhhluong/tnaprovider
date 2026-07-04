import { Router } from "express";
import { hashPassword, comparePassword } from "../auth/hash.js";
import { createSession, revokeSession, revokeAllUserSessions, validateSession, COOKIE_NAME, getSessionCookieOptions } from "../auth/session.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimitLogin, recordLoginAttempt } from "../middleware/rateLimit.js";
import { createAuditLog } from "../middleware/audit.js";
import { validate, schemas } from "../middleware/validate.js";
import { getDb } from "../db/database.js";

const router = Router();

router.post("/login", rateLimitLogin, validate(schemas.login), (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());

  if (!user || !comparePassword(password, user.password_hash)) {
    recordLoginAttempt(req.ip);
    createAuditLog({
      action: "login_failed",
      entityType: "user",
      entityId: email,
      metadata: { reason: "invalid_credentials" },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ error: "Account is disabled" });
  }

  const session = createSession(user.id);

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  createAuditLog({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.cookie(COOKIE_NAME, session.token, getSessionCookieOptions());
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

router.post("/logout", requireAuth, (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    revokeSession(token);
    createAuditLog({
      userId: req.user.userId,
      action: "logout",
      entityType: "user",
      entityId: req.user.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
});

router.post("/change-password", requireAuth, validate(schemas.changePassword), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();

  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.userId);

  if (!comparePassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const newHash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.userId);

  revokeAllUserSessions(req.user.userId);

  createAuditLog({
    userId: req.user.userId,
    action: "change_password",
    entityType: "user",
    entityId: req.user.userId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

export default router;
