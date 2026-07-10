import crypto from "crypto";
import { getDb } from "../../db/database.js";
import { transaction } from "../../db/transaction.js";
import { hashPassword } from "../../auth/hash.js";
import { hashToken } from "../../auth/tokens.js";
import { createAuditLog } from "../../middleware/audit.js";
import { createSession, revokeAllUserSessions } from "../../auth/session.js";

const VALID_ROLES = ["owner", "admin", "manager", "worker", "client"];
const USER_COLUMNS = "id, email, name, role, status, hourly_rate, must_change_password, invited_at, disabled_at, disabled_by, password_changed_at, created_at, updated_at, last_login_at";

function getUserById(userId) {
  const db = getDb();
  const user = db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(userId);
  return user || null;
}

function listUsers() {
  const db = getDb();
  return db.prepare(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`).all();
}

function createUser(email, name, role, password, hourlyRate, mustChangePassword) {
  if (role === "owner" || role === "admin") {
    throw new Error("Direct creation of owner/admin users is not allowed. Use the invite flow instead.");
  }

  if (role !== "client") {
    if (hourlyRate === undefined || hourlyRate === null || hourlyRate === "") {
      throw new Error("Hourly rate is required for worker/manager users");
    }
    const rate = Number(hourlyRate);
    if (!Number.isFinite(rate) || rate < 0.01 || rate > 500) {
      throw new Error("Hourly rate must be between 0.01 and 500");
    }
  }

  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    throw new Error("Email already exists");
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();
  const mustChange = mustChangePassword !== false;
  const rate = role !== "client" ? Math.round(Number(hourlyRate) * 100) / 100 : null;

  db.prepare(`
    INSERT INTO users (id, email, name, role, password_hash, status, hourly_rate, must_change_password, password_changed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, name, role, passwordHash, rate, mustChange ? 1 : 0, mustChange ? null : now, now, now);

  return getUserById(id);
}

function updateUserProfile(userId, data) {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.email !== undefined) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(normalizedEmail, userId);
    if (existing) {
      throw new Error("Email already in use");
    }
    updates.push("email = ?");
    params.push(normalizedEmail);
  }

  if (updates.length === 0) {
    return getUserById(userId);
  }

  updates.push("updated_at = datetime('now')");
  params.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  return getUserById(userId);
}

function updateUserRole(userId, newRole, actorId) {
  if (!VALID_ROLES.includes(newRole)) {
    throw new Error("Invalid role");
  }

  transaction((txDb) => {
    const user = txDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "owner" && newRole !== "owner") {
      const activeOwners = txDb.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get();
      if (activeOwners.count <= 1) {
        throw new Error("Cannot change role of the last active owner");
      }
    }

    txDb.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(newRole, userId);

    createAuditLog({
      userId: actorId,
      action: "user_role_changed",
      entityType: "user",
      entityId: userId,
      metadata: { email: user.email, oldRole: user.role, newRole },
    });
  });

  return getUserById(userId);
}

function updateUserStatus(userId, newStatus, actorId) {
  if (!["active", "disabled"].includes(newStatus)) {
    throw new Error("Invalid status");
  }

  transaction((txDb) => {
    const user = txDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === newStatus) {
      return;
    }

    if (newStatus === "disabled" && user.role === "owner") {
      const activeOwners = txDb.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get();
      if (activeOwners.count <= 1) {
        throw new Error("Cannot disable the last active owner");
      }
    }

    const now = new Date().toISOString();

    if (newStatus === "disabled") {
      txDb.prepare("UPDATE users SET status = 'disabled', disabled_at = ?, disabled_by = ?, updated_at = ? WHERE id = ?").run(now, actorId, now, userId);
      revokeAllUserSessions(userId);
    } else {
      txDb.prepare("UPDATE users SET status = 'active', disabled_at = NULL, disabled_by = NULL, updated_at = ? WHERE id = ?").run(now, userId);
    }

    createAuditLog({
      userId: actorId,
      action: newStatus === "disabled" ? "user_disabled" : "user_enabled",
      entityType: "user",
      entityId: userId,
      metadata: { email: user.email, role: user.role },
    });
  });

  return getUserById(userId);
}

function updateUserHourlyRate(userId, hourlyRate, actorId) {
  const rate = Number(hourlyRate);
  if (!Number.isFinite(rate) || rate < 0.01 || rate > 500) {
    throw new Error("Hourly rate must be between 0.01 and 500");
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role === "client") {
    throw new Error("Cannot set hourly rate for client users");
  }

  const roundedRate = Math.round(rate * 100) / 100;
  const oldRate = user.hourly_rate;

  db.prepare("UPDATE users SET hourly_rate = ?, updated_at = datetime('now') WHERE id = ?").run(roundedRate, userId);

  createAuditLog({
    userId: actorId,
    action: "user_hourly_rate_changed",
    entityType: "user",
    entityId: userId,
    metadata: { oldRate, newRate: roundedRate, targetEmail: user.email, targetRole: user.role },
  });

  return getUserById(userId);
}

function deleteUser(userId, actorId) {
  transaction((txDb) => {
    const user = txDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "owner") {
      const activeOwners = txDb.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get();
      if (activeOwners.count <= 1) {
        throw new Error("Cannot delete the last active owner");
      }
    }

    createAuditLog({
      userId: actorId,
      action: "user_deleted",
      entityType: "user",
      entityId: userId,
      metadata: { email: user.email, role: user.role },
    });

    txDb.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
}

function resetPassword(token, password, ip, userAgent) {
  transaction((txDb) => {
    const tokenHash = hashToken(token);

    const record = txDb.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
    `).get(tokenHash);

    if (!record) {
      throw new Error("Invalid or expired reset token");
    }

    const newHash = hashPassword(password);
    txDb.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(newHash, record.user_id);
    txDb.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(record.id);

    revokeAllUserSessions(record.user_id);

    createAuditLog({
      userId: record.user_id,
      action: "password_reset_completed",
      entityType: "user",
      entityId: record.user_id,
      ip,
      userAgent,
    });
  });
}

function acceptInvite(token, password, ip, userAgent) {
  const session = transaction((txDb) => {
    const tokenHash = hashToken(token);

    const record = txDb.prepare(`
      SELECT * FROM user_invite_tokens
      WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > datetime('now')
    `).get(tokenHash);

    if (!record) {
      throw new Error("Invalid or expired invite token");
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const existingUser = txDb.prepare("SELECT id FROM users WHERE email = ?").get(record.email);

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      txDb.prepare("UPDATE users SET password_hash = ?, name = ?, role = ?, status = 'active', must_change_password = 0, updated_at = datetime('now') WHERE id = ?").run(passwordHash, record.name, record.role, userId);
    } else {
      userId = crypto.randomUUID();
      txDb.prepare(`
        INSERT INTO users (id, email, name, role, password_hash, status, must_change_password, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 0, ?, ?)
      `).run(userId, record.email, record.name, record.role, passwordHash, now, now);
    }

    txDb.prepare("UPDATE user_invite_tokens SET accepted_at = ? WHERE id = ?").run(now, record.id);

    revokeAllUserSessions(userId);

    createAuditLog({
      userId,
      action: "invite_accepted",
      entityType: "user",
      entityId: userId,
      metadata: { email: record.email, role: record.role },
      ip,
      userAgent,
    });

    return createSession(userId);
  });

  return session;
}

export {
  createUser,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
  updateUserHourlyRate,
  getUserById,
  listUsers,
  deleteUser,
  resetPassword,
  acceptInvite,
};
