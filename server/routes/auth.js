import { Router } from "express";
import crypto from "crypto";
import { hashPassword, comparePassword } from "../auth/hash.js";
import { createSession, revokeSession, revokeAllUserSessions, validateSession, COOKIE_NAME, getSessionCookieOptions } from "../auth/session.js";
import { generateToken, hashToken } from "../auth/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
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
      mustChangePassword: !!user.must_change_password,
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
  const db = getDb();
  const user = db.prepare("SELECT must_change_password FROM users WHERE id = ?").get(req.user.userId);

  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      mustChangePassword: user ? !!user.must_change_password : false,
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
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.userId);

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

// ── Forgot Password ──

router.post("/forgot-password", rateLimitLogin, validate(schemas.forgotPassword), async (req, res) => {
  const { email } = req.body;
  const db = getDb();

  const user = db.prepare("SELECT id, name FROM users WHERE email = ? AND status = 'active'").get(email.toLowerCase().trim());

  // Always return the same message to avoid revealing whether the user exists
  const genericMsg = "If this email is registered, you will receive password reset instructions.";

  if (!user) {
    return res.json({ message: genericMsg });
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const tokenId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at, created_ip)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tokenId, user.id, tokenHash, expiresAt, now, req.ip);

  createAuditLog({
    userId: user.id,
    action: "forgot_password_requested",
    entityType: "user",
    entityId: user.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Send password reset email
  try {
    const { passwordReset } = await import('../email/templates/passwordReset.js');
    const { createEmailJob, processEmailJob } = await import('../email/emailJobService.js');

    const appUrl = process.env.APP_URL || 'https://tnaprovider.com.au';
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const emailContent = passwordReset({ name: user.name, resetUrl, expiresAt });

    const jobId = createEmailJob({
      type: 'PASSWORD_RESET',
      recipient: email.toLowerCase().trim(),
      subject: emailContent.subject,
      relatedEntityType: 'password_reset_token',
      relatedEntityId: tokenId,
      payloadJson: {
        html: emailContent.html,
        text: emailContent.text,
      },
      scheduledAt: now,
    });

    processEmailJob(jobId).catch(err => {
      console.error('[email] Failed to send password reset email:', err.message);
    });
  } catch (err) {
    console.error('[email] Failed to create password reset email:', err.message);
  }

  if (process.env.APP_ENV !== "production") {
    res.json({ message: genericMsg, devToken: rawToken, tokenId });
  } else {
    res.json({ message: genericMsg });
  }
});

// ── Reset Password ──

router.post("/reset-password", validate(schemas.resetPassword), (req, res) => {
  const { token, password } = req.body;
  const db = getDb();

  const tokenHash = hashToken(token);

  const record = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).get(tokenHash);

  if (!record) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const newHash = hashPassword(password);
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(newHash, record.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(record.id);

  revokeAllUserSessions(record.user_id);

  createAuditLog({
    userId: record.user_id,
    action: "password_reset_completed",
    entityType: "user",
    entityId: record.user_id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

// ── Accept Invite ──

router.post("/accept-invite", validate(schemas.acceptInvite), (req, res) => {
  const { token, password } = req.body;
  const db = getDb();

  const tokenHash = hashToken(token);

  const record = db.prepare(`
    SELECT * FROM user_invite_tokens
    WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > datetime('now')
  `).get(tokenHash);

  if (!record) {
    return res.status(400).json({ error: "Invalid or expired invite token" });
  }

  const passwordHash = hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // User might already exist (invited user re-invited)
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(record.email);

  if (existingUser) {
    db.prepare("UPDATE users SET password_hash = ?, name = ?, role = ?, status = 'active', must_change_password = 0, updated_at = datetime('now') WHERE id = ?").run(passwordHash, record.name, record.role, existingUser.id);
    db.prepare("UPDATE user_invite_tokens SET accepted_at = ? WHERE id = ?").run(now, record.id);
    createAuditLog({
      action: "invite_accepted",
      entityType: "user",
      entityId: existingUser.id,
      metadata: { email: record.email, role: record.role },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.json({ success: true });
  }

  db.prepare(`
    INSERT INTO users (id, email, name, role, password_hash, status, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', 0, ?, ?)
  `).run(id, record.email, record.name, record.role, passwordHash, now, now);

  db.prepare("UPDATE user_invite_tokens SET accepted_at = ? WHERE id = ?").run(now, record.id);

  createAuditLog({
    action: "invite_accepted",
    entityType: "user",
    entityId: id,
    metadata: { email: record.email, role: record.role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const session = createSession(id);
  res.cookie(COOKIE_NAME, session.token, getSessionCookieOptions());
  res.json({ success: true });
});

// ── Resend Invite ──

router.post("/resend-invite", requireAuth, requireRole("owner", "admin"), validate(schemas.resendInvite), async (req, res) => {
  const { email } = req.body;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM user_invite_tokens WHERE email = ? AND accepted_at IS NULL AND expires_at > datetime('now')").get(email.toLowerCase().trim());

  if (!existing) {
    return res.status(404).json({ error: "No pending invite found for this email" });
  }

  // Only owner can resend admin invites
  if (existing.role === "admin" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Only owner can resend admin invites" });
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare("UPDATE user_invite_tokens SET token_hash = ?, expires_at = ?, created_at = ?, created_ip = ? WHERE id = ?").run(tokenHash, expiresAt, now, req.ip, existing.id);

  createAuditLog({
    userId: req.user.userId,
    action: "invite_resent",
    entityType: "user",
    metadata: { email: email.toLowerCase().trim(), role: existing.role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Send invitation email
  try {
    const { userInvitation } = await import('../email/templates/userInvitation.js');
    const { createEmailJob, processEmailJob } = await import('../email/emailJobService.js');

    const appUrl = process.env.APP_URL || 'https://tnaprovider.com.au';
    const inviteUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(rawToken)}`;

    const emailContent = userInvitation({ name: existing.name, email: existing.email, inviteUrl, expiresAt });

    const jobId = createEmailJob({
      type: 'USER_INVITATION',
      recipient: existing.email,
      subject: emailContent.subject,
      relatedEntityType: 'user_invite_token',
      relatedEntityId: existing.id,
      payloadJson: {
        html: emailContent.html,
        text: emailContent.text,
      },
      scheduledAt: now,
    });

    processEmailJob(jobId).catch(err => {
      console.error('[email] Failed to resend invitation email:', err.message);
    });
  } catch (err) {
    console.error('[email] Failed to create resend invitation email:', err.message);
  }

  if (process.env.APP_ENV !== "production") {
    res.json({ message: "Invite resent", devToken: rawToken, tokenId: existing.id });
  } else {
    res.json({ message: "Invite resent" });
  }
});

// ── Session Management ──

router.get("/sessions", requireAuth, (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT id, user_id, created_at, expires_at, revoked_at,
      CASE WHEN revoked_at IS NULL AND expires_at > datetime('now') THEN 'active' ELSE 'expired' END as status
    FROM sessions WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.userId);

  res.json(sessions.map(s => ({
    id: s.id,
    userId: s.user_id,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
    status: s.status,
  })));
});

router.delete("/sessions/:id", requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const session = db.prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?").get(id, req.user.userId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  db.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?").run(id);

  createAuditLog({
    userId: req.user.userId,
    action: "session_revoked",
    entityType: "session",
    entityId: id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

router.delete("/sessions", requireAuth, (req, res) => {
  const db = getDb();
  const currentSession = req.cookies?.[COOKIE_NAME];
  const currentSessionHash = currentSession ? crypto.createHash("sha256").update(currentSession).digest("hex") : null;

  // Revoke all sessions except current
  if (currentSessionHash) {
    const currentRecord = db.prepare("SELECT id FROM sessions WHERE session_hash = ? AND user_id = ?").get(currentSessionHash, req.user.userId);
    if (currentRecord) {
      db.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND id != ? AND revoked_at IS NULL").run(req.user.userId, currentRecord.id);
    }
  }

  createAuditLog({
    userId: req.user.userId,
    action: "all_sessions_revoked",
    entityType: "user",
    entityId: req.user.userId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

export default router;
