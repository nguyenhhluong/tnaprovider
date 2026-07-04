import crypto from "crypto";
import { getDb } from "../db/database.js";

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || "12");
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "tna_session";

export { COOKIE_NAME };

export function createSession(userId) {
  const db = getDb();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(48).toString("hex");
  const sessionHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, session_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, sessionHash, expiresAt, now);

  return { id, token, expiresAt };
}

export function validateSession(token) {
  if (!token) return null;

  const db = getDb();
  const sessionHash = crypto.createHash("sha256").update(token).digest("hex");

  const session = db.prepare(`
    SELECT s.*, u.email, u.name, u.role, u.status
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_hash = ? AND s.revoked_at IS NULL
  `).get(sessionHash);

  if (!session) return null;
  if (session.status !== "active") return null;

  // JS-level expiry check (belt-and-suspenders with the SQL datetime comparison)
  if (Date.parse(session.expires_at) <= Date.now()) {
    // Mark as expired in DB for cleanup
    db.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?").run(session.id);
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.user_id,
    email: session.email,
    name: session.name,
    role: session.role,
    expiresAt: session.expires_at,
  };
}

export function revokeSession(token) {
  const db = getDb();
  const sessionHash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE session_hash = ?").run(sessionHash);
}

export function revokeAllUserSessions(userId) {
  const db = getDb();
  db.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL").run(userId);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600 * 1000,
  };
}
