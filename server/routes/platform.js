import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";
import { validate, schemas } from "../middleware/validate.js";
import { hashPassword } from "../auth/hash.js";
import { generateToken, hashToken } from "../auth/tokens.js";
import { revokeAllUserSessions } from "../auth/session.js";

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

function audit(res, action, entityType, entityId, metadata) {
  createAuditLog({
    userId: res.req.user.userId,
    action,
    entityType,
    entityId,
    metadata,
    ip: res.req.ip,
    userAgent: res.req.headers["user-agent"],
  });
}

function validateRate(value) {
  if (value === undefined || value === null || value === "") return "Hourly rate is required";
  const str = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return "Hourly rate must be a number with up to 2 decimal places";
  const num = Number(str);
  if (!Number.isFinite(num) || num <= 0) return "Hourly rate must be greater than 0";
  if (num > 300) return "Hourly rate must not exceed 300";
  return null;
}

// ── Users ──

router.get("/users", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, email, name, role, status, hourly_rate, must_change_password, invited_at, disabled_at, disabled_by, password_changed_at, created_at, updated_at, last_login_at FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

router.post("/users", requireRole("owner"), validate(schemas.createUser), (req, res) => {
  const db = getDb();
  const { email, name, role, password, hourlyRate, mustChangePassword } = req.body;

  // Role-specific checks
  if (role === "owner" || role === "admin") {
    return res.status(400).json({ error: "Direct creation of owner/admin users is not allowed. Use the invite flow instead." });
  }

  // Validate hourly rate for non-client roles
  if (role !== "client") {
    const rateError = validateRate(hourlyRate);
    if (rateError) return res.status(400).json({ error: rateError });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const id = crypto.randomUUID();
  const password_hash = hashPassword(password);
  const now = new Date().toISOString();
  const mustChange = mustChangePassword !== false;
  const rate = role !== "client" ? Math.round(Number(hourlyRate) * 100) / 100 : null;

  db.prepare("INSERT INTO users (id, email, name, role, password_hash, status, hourly_rate, must_change_password, password_changed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)").run(
    id, email.toLowerCase().trim(), name, role, password_hash,
    rate, mustChange ? 1 : 0, mustChange ? null : now, now, now
  );

  audit(res, "user_created_direct", "user", id, { email, role, hourlyRateProvided: rate !== null, mustChangePassword: mustChange });
  res.status(201).json({ id, email, name, role, hourlyRate: rate, mustChangePassword: mustChange });
});

// ── Owner-only: Set hourly rate ──

router.patch("/users/:id/hourly-rate", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { hourlyRate } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role === "client") return res.status(400).json({ error: "Cannot set hourly rate for client users" });

  const rateError = validateRate(hourlyRate);
  if (rateError) return res.status(400).json({ error: rateError });

  const roundedRate = Math.round(Number(hourlyRate) * 100) / 100;
  const oldRate = user.hourly_rate;

  db.prepare("UPDATE users SET hourly_rate = ?, updated_at = datetime('now') WHERE id = ?").run(roundedRate, id);

  audit(res, "user_hourly_rate_changed", "user", id, { oldRate, newRate: roundedRate, targetEmail: user.email, targetRole: user.role });
  res.json({ success: true, userId: id, hourlyRate: roundedRate });
});

router.patch("/users/:id", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, role, status } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.role === "owner" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Only owner can modify owner accounts" });
  }

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push("name = ?"); values.push(name); }
  if (role !== undefined && req.user.role === "owner") { updates.push("role = ?"); values.push(role); }
  if (status !== undefined && req.user.role === "owner") { updates.push("status = ?"); values.push(status); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    audit(res, "user_updated", "user", id, { changes: updates });
  }

  res.json({ success: true });
});

// ── Invite User ──

router.post("/users/invite", requireRole("owner", "admin"), validate(schemas.inviteUser), (req, res) => {
  const db = getDb();
  const { email, name, role } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Only owner can invite admin
  if (role === "admin" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Only owner can invite admin users" });
  }

  const existing = db.prepare("SELECT id, status FROM users WHERE email = ?").get(normalizedEmail);
  if (existing && existing.status !== "disabled") {
    return res.status(409).json({ error: "User with this email already exists" });
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO user_invite_tokens (id, email, role, name, token_hash, expires_at, created_by, created_at, created_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, role, name, tokenHash, expiresAt, req.user.userId, now, req.ip);

  // If user exists, mark as invited to prevent login until accepted
  if (existing) {
    db.prepare("UPDATE users SET status = 'invited', invited_at = ?, updated_at = ? WHERE id = ?").run(now, now, existing.id);
  }

  createAuditLog({
    userId: req.user.userId,
    action: "invite_created",
    entityType: "user",
    metadata: { email: normalizedEmail, role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  if (process.env.APP_ENV !== "production") {
    res.status(201).json({ message: "Invite created", devToken: rawToken, inviteId: id });
  } else {
    res.status(201).json({ message: "Invite sent" });
  }
});

// ── Disable User ──

router.patch("/users/:id/disable", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.role === "owner" && req.user.role !== "owner") {
    return res.status(403).json({ error: "Only owner can disable owner accounts" });
  }

  // Prevent disabling the last active owner
  if (user.role === "owner") {
    const activeOwners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get();
    if (activeOwners.count <= 1) {
      return res.status(400).json({ error: "Cannot disable the last active owner" });
    }
  }

  db.prepare("UPDATE users SET status = 'disabled', disabled_at = datetime('now'), disabled_by = ?, updated_at = datetime('now') WHERE id = ?").run(req.user.userId, id);
  revokeAllUserSessions(id);

  createAuditLog({
    userId: req.user.userId,
    action: "user_disabled",
    entityType: "user",
    entityId: id,
    metadata: { email: user.email, role: user.role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

// ── Enable User ──

router.patch("/users/:id/enable", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare("UPDATE users SET status = 'active', disabled_at = NULL, disabled_by = NULL, updated_at = datetime('now') WHERE id = ?").run(id);

  createAuditLog({
    userId: req.user.userId,
    action: "user_enabled",
    entityType: "user",
    entityId: id,
    metadata: { email: user.email, role: user.role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

// ── Change User Role ──

router.patch("/users/:id/role", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { role } = req.body;

  if (!["owner", "admin", "manager", "worker", "client"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Prevent demoting the last owner
  if (user.role === "owner" && role !== "owner") {
    const activeOwners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get();
    if (activeOwners.count <= 1) {
      return res.status(400).json({ error: "Cannot change role of the last active owner" });
    }
  }

  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, id);

  createAuditLog({
    userId: req.user.userId,
    action: "user_role_changed",
    entityType: "user",
    entityId: id,
    metadata: { email: user.email, oldRole: user.role, newRole: role },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

// ── Force Password Change ──

router.patch("/users/:id/force-password-change", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  db.prepare("UPDATE users SET must_change_password = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  revokeAllUserSessions(id);

  createAuditLog({
    userId: req.user.userId,
    action: "force_password_change_set",
    entityType: "user",
    entityId: id,
    metadata: { email: user.email },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true });
});

// ── Leads ──

router.get("/leads", (req, res) => {
  const db = getDb();
  const leads = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  res.json(leads);
});

router.post("/leads", validate(schemas.createLead), (req, res) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { name, email, phone, company, projectType: project_type, location, budget, message, source } = req.body;

  db.prepare(`
    INSERT INTO leads (id, name, email, phone, company, project_type, location, budget, message, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email, phone || null, company || null, project_type || null, location || null, budget || null, message || null, source || null, now, now);

  if (req.user) {
    audit(res, "lead_created", "lead", id, { name, email });
  }

  res.status(201).json({ id, name, email });
});

router.patch("/leads/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, temperature, score, assignedTo } = req.body;

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const updates = [];
  const values = [];

  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (temperature !== undefined) { updates.push("temperature = ?"); values.push(temperature); }
  if (score !== undefined) { updates.push("score = ?"); values.push(score); }
  if (assignedTo !== undefined) { updates.push("assigned_to = ?"); values.push(assignedTo); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE leads SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    audit(res, "lead_updated", "lead", id, { changes: updates });
  }

  res.json({ success: true });
});

// ── Projects ──

router.get("/projects", (req, res) => {
  const db = getDb();
  if (req.user.role === "client") {
    const projects = db.prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC").all(req.user.userId);
    return res.json(projects);
  }
  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
  res.json(projects);
});

router.post("/projects", requireRole("owner", "admin", "manager"), validate(schemas.createProject), (req, res) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { title, clientName: client_name, clientId: client_id, sector, location, budget, startDate: start_date, targetDate: target_date } = req.body;

  db.prepare(`
    INSERT INTO projects (id, title, client_name, client_id, sector, location, budget, start_date, target_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, client_name, client_id || null, sector || null, location || null, budget || null, start_date || null, target_date || null, now, now);

  audit(res, "project_created", "project", id, { title, client_name });
  res.status(201).json({ id, title });
});

router.patch("/projects/:id", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { title, status, sector, location, budget, startDate, targetDate } = req.body;

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (sector !== undefined) { updates.push("sector = ?"); values.push(sector); }
  if (location !== undefined) { updates.push("location = ?"); values.push(location); }
  if (budget !== undefined) { updates.push("budget = ?"); values.push(budget); }
  if (startDate !== undefined) { updates.push("start_date = ?"); values.push(startDate); }
  if (targetDate !== undefined) { updates.push("target_date = ?"); values.push(targetDate); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    audit(res, "project_updated", "project", id, { changes: updates });
  }

  res.json({ success: true });
});

// ── Timesheets ──

router.get("/timesheets", (req, res) => {
  const db = getDb();
  if (req.user.role === "worker") {
    const timesheets = db.prepare("SELECT * FROM timesheets WHERE user_id = ? ORDER BY work_date DESC").all(req.user.userId);
    return res.json(timesheets);
  }
  const timesheets = db.prepare("SELECT t.*, u.name as user_name FROM timesheets t JOIN users u ON u.id = t.user_id ORDER BY t.work_date DESC").all();
  res.json(timesheets);
});

router.post("/timesheets", validate(schemas.createTimesheet), (req, res) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { projectId: project_id, workDate: work_date, startTime: start_time, finishTime: finish_time, breakMinutes: break_minutes, totalHours: total_hours, notes } = req.body;

  const userId = req.user.role === "worker" ? req.user.userId : (req.body.userId || req.user.userId);

  db.prepare(`
    INSERT INTO timesheets (id, user_id, project_id, work_date, start_time, finish_time, break_minutes, total_hours, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)
  `).run(id, userId, project_id, work_date, start_time || null, finish_time || null, break_minutes || 0, total_hours, notes || null, now, now);

  audit(res, "timesheet_created", "timesheet", id, { project_id, total_hours });
  res.status(201).json({ id });
});

router.patch("/timesheets/:id/approve", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ts = db.prepare("SELECT * FROM timesheets WHERE id = ?").get(id);
  if (!ts) return res.status(404).json({ error: "Timesheet not found" });

  db.prepare("UPDATE timesheets SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(req.user.userId, id);
  audit(res, "timesheet_approved", "timesheet", id);
  res.json({ success: true });
});

router.patch("/timesheets/:id/reject", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ts = db.prepare("SELECT * FROM timesheets WHERE id = ?").get(id);
  if (!ts) return res.status(404).json({ error: "Timesheet not found" });

  db.prepare("UPDATE timesheets SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(id);
  audit(res, "timesheet_rejected", "timesheet", id);
  res.json({ success: true });
});

// ── Maintenance Tickets ──

router.get("/maintenance", (req, res) => {
  const db = getDb();
  if (req.user.role === "client") {
    const tickets = db.prepare("SELECT * FROM maintenance_tickets WHERE client_id = ? ORDER BY created_at DESC").all(req.user.userId);
    return res.json(tickets);
  }
  const tickets = db.prepare("SELECT t.*, u.name as client_name FROM maintenance_tickets t JOIN users u ON u.id = t.client_id ORDER BY t.created_at DESC").all();
  res.json(tickets);
});

router.post("/maintenance", validate(schemas.createMaintenance), (req, res) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { title, description, priority, projectId: project_id } = req.body;
  const client_id = req.user.role === "client" ? req.user.userId : (req.body.clientId || req.user.userId);

  db.prepare(`
    INSERT INTO maintenance_tickets (id, client_id, project_id, title, description, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(id, client_id, project_id || null, title, description || null, priority, now, now);

  audit(res, "maintenance_created", "maintenance", id, { title, priority });
  res.status(201).json({ id, title });
});

router.patch("/maintenance/:id", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, priority, assignedTo } = req.body;

  const ticket = db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const updates = [];
  const values = [];

  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (priority !== undefined) { updates.push("priority = ?"); values.push(priority); }
  if (assignedTo !== undefined) { updates.push("assigned_to = ?"); values.push(assignedTo); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE maintenance_tickets SET ${updates.join(", ")} WHERE id = ?`).run(...values, id);
    audit(res, "maintenance_updated", "maintenance", id, { changes: updates });
  }

  res.json({ success: true });
});

// ── Client Access List for a Project ──

router.get("/projects/:id/client-access", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const clients = db.prepare(`
    SELECT u.id, u.name, u.email, u.status
    FROM client_project_access cpa
    JOIN users u ON u.id = cpa.client_id
    WHERE cpa.project_id = ?
    ORDER BY u.name ASC
  `).all(id);

  res.json(clients);
});

// ── Client User List ──

router.get("/client-users", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const clients = db.prepare("SELECT id, name, email, role, status FROM users WHERE role = 'client' ORDER BY name ASC").all();
  res.json(clients);
});

// ── Client Access Management ──

router.post("/projects/:id/client-access", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { clientId } = req.body;

  if (!clientId) return res.status(400).json({ error: "clientId is required" });

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const client = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'client'").get(clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const existing = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(clientId, id);
  if (existing) return res.status(409).json({ error: "Client already has access to this project" });

  const accessId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO client_project_access (id, client_id, project_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)").run(accessId, clientId, id, req.user.userId, now);

  audit(res, "client_project_access_granted", "client_project_access", accessId, { projectId: id, clientId });
  res.status(201).json({ id: accessId });
});

router.delete("/projects/:id/client-access/:clientId", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id, clientId } = req.params;

  const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(clientId, id);
  if (!access) return res.status(404).json({ error: "Access record not found" });

  db.prepare("DELETE FROM client_project_access WHERE id = ?").run(access.id);

  audit(res, "client_project_access_removed", "client_project_access", access.id, { projectId: id, clientId });
  res.json({ success: true });
});

// ── Audit Logs ──

router.get("/audit", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { action, userId, entityType, limit } = req.query;

  let query = "SELECT a.*, u.name as user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1";
  const params = [];

  if (action) { query += " AND a.action = ?"; params.push(action); }
  if (userId) { query += " AND a.user_id = ?"; params.push(userId); }
  if (entityType) { query += " AND a.entity_type = ?"; params.push(entityType); }

  query += " ORDER BY a.created_at DESC LIMIT ?";
  params.push(parseInt(limit) || 500);

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

export default router;
