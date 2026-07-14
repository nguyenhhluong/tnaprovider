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
import { calculatePayBreakdown as calculatePayBreakdownServer } from "../../shared/timesheet/calculations.js";

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

router.post("/users/invite", requireRole("owner", "admin"), validate(schemas.inviteUser), async (req, res) => {
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
  const tokenId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO user_invite_tokens (id, email, role, name, token_hash, expires_at, created_by, created_at, created_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tokenId, normalizedEmail, role, name, tokenHash, expiresAt, req.user.userId, now, req.ip);

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

  // Send invitation email
  try {
    const { userInvitation } = await import('../email/templates/userInvitation.js');
    const { createEmailJob, processEmailJob } = await import('../email/emailJobService.js');

    const appUrl = process.env.APP_URL || 'https://tnaprovider.com.au';
    const inviteUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(rawToken)}`;

    const emailContent = userInvitation({ name, email: normalizedEmail, inviteUrl, expiresAt });

    const jobId = createEmailJob({
      type: 'USER_INVITATION',
      recipient: normalizedEmail,
      subject: emailContent.subject,
      relatedEntityType: 'user_invite_token',
      relatedEntityId: tokenId,
      payloadJson: {
        html: emailContent.html,
        text: emailContent.text,
      },
      scheduledAt: now,
    });

    processEmailJob(jobId).catch(err => {
      console.error('[email] Failed to send invitation email:', err.message);
    });
  } catch (err) {
    console.error('[email] Failed to create invitation email:', err.message);
  }

  if (process.env.APP_ENV !== "production") {
    res.status(201).json({ message: "Invite created", devToken: rawToken, inviteId: tokenId });
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

// ── Phase 8D: Worker Profile APIs (owner only) ──

function formatDurationLabel(seconds) {
  if (!seconds || seconds <= 0) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function getDayName(dateStr) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date(dateStr).getDay()];
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// GET /api/platform/users/:userId/profile
router.get("/users/:userId/profile", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId } = req.params;
  const user = db.prepare("SELECT id, email, name, role, status, hourly_rate, must_change_password, created_at, last_login_at FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const activeShift = db.prepare("SELECT COUNT(*) as c FROM shift_sessions WHERE employee_id = ? AND status IN ('active','on_break')").get(userId);

  res.json({
    worker: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      hourlyRate: user.hourly_rate,
      mustChangePassword: !!user.must_change_password,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    },
    activeShift: { active: activeShift.c > 0 },
  });
});

// GET /api/platform/users/:userId/timesheet-week?weekStart=YYYY-MM-DD
router.get("/users/:userId/timesheet-week", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId } = req.params;
  const weekStartStr = req.query.weekStart;
  if (!weekStartStr) return res.status(400).json({ error: "weekStart is required (YYYY-MM-DD)" });

  const user = db.prepare("SELECT id, email, name, role, hourly_rate FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const monday = getMonday(new Date(weekStartStr));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  const shifts = db.prepare(`
    SELECT * FROM shift_sessions
    WHERE employee_id = ? AND checked_in_at >= ? AND checked_in_at <= ?
    ORDER BY checked_in_at ASC
  `).all(userId, weekStart + "T00:00:00", weekEnd + "T23:59:59");

  const siteNames = {};
  function getSiteName(siteId) {
    if (!siteId) return null;
    if (!siteNames[siteId]) {
      const s = db.prepare("SELECT name FROM work_sites WHERE id = ?").get(siteId);
      siteNames[siteId] = s?.name || null;
    }
    return siteNames[siteId];
  }

  const activePayRule = db.prepare("SELECT * FROM company_pay_rules WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get();

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayShifts = shifts.filter(s => s.checked_in_at && s.checked_in_at.startsWith(dateStr));

    if (dayShifts.length === 0) {
      days.push({
        day: getDayName(dateStr),
        date: dateStr,
        shiftId: null,
        start: "Set",
        end: "Set",
        paidSeconds: 0,
        paidLabel: "0h 0m",
        pay: 0,
        payLabel: "$0",
        status: "missing",
        hasShift: false,
      });
    } else {
      // Use the first shift for primary display, combine pay
      const primary = dayShifts[0];
      const endTime = primary.checked_out_at || primary.checked_in_at;
      let totalPay = 0;
      let totalPaidSeconds = 0;
      let combinedStatus = primary.status;

      for (const s of dayShifts) {
        const ps = s.payable_seconds || 0;
        totalPaidSeconds += ps;

        // Labor pay: use final_gross_pay if approved, else estimated_gross_pay, else computed from breakdown
        let laborPay = s.final_gross_pay || s.estimated_gross_pay || 0;
        if (laborPay === 0 && s.base_pay != null) {
          laborPay = (s.base_pay || 0) + (s.overtime_pay || 0) + (s.double_time_pay || 0);
        }
        // Allowance pay
        let allowancePay = s.allowance_pay || 0;
        if (!allowancePay) {
          const al = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(s.id);
          allowancePay = al?.total || 0;
        }
        totalPay += laborPay + allowancePay;

        // Pick latest status for display
        if (s.status === "pending_approval") combinedStatus = "pending_approval";
        if (s.status === "approved") combinedStatus = "approved";
        if (s.status === "rejected") combinedStatus = "rejected";
      }

      const startLabel = new Date(primary.checked_in_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
      const endLabel = primary.checked_out_at
        ? new Date(primary.checked_out_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
        : primary.status === "active" ? "Now" : primary.status === "on_break" ? "On break" : "-";

      days.push({
        day: getDayName(dateStr),
        date: dateStr,
        shiftId: primary.id,
        start: startLabel,
        end: endLabel,
        paidSeconds: totalPaidSeconds,
        paidLabel: formatDurationLabel(totalPaidSeconds),
        pay: Math.round(totalPay * 100) / 100,
        payLabel: `$${(Math.round(totalPay * 100) / 100).toFixed(2)}`,
        status: combinedStatus,
        hasShift: true,
        shiftCount: dayShifts.length,
      });
    }
  }

  const totalPaidSeconds = days.reduce((s, d) => s + d.paidSeconds, 0);
  const totalPay = days.reduce((s, d) => s + d.pay, 0);

  res.json({
    worker: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hourlyRate: user.hourly_rate,
    },
    week: {
      start: weekStart,
      end: weekEnd,
      label: `${new Date(weekStart).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(weekEnd).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`,
    },
    days,
    totals: {
      paidSeconds: totalPaidSeconds,
      paidLabel: formatDurationLabel(totalPaidSeconds),
      pay: Math.round(totalPay * 100) / 100,
      payLabel: `$${(Math.round(totalPay * 100) / 100).toFixed(2)}`,
    },
  });
});

// GET /api/platform/users/:userId/timesheet-weeks?limit=26
router.get("/users/:userId/timesheet-weeks", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 26, 52);

  const user = db.prepare("SELECT id, email, name, role, hourly_rate FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const currentMonday = getMonday(new Date());
  const weeks = [];

  for (let i = 0; i < limit; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = monday.toISOString().split("T")[0];
    const weekEnd = sunday.toISOString().split("T")[0];

    const shifts = db.prepare(`
      SELECT * FROM shift_sessions
      WHERE employee_id = ? AND checked_in_at >= ? AND checked_in_at <= ?
      ORDER BY checked_in_at ASC
    `).all(userId, weekStart + "T00:00:00", weekEnd + "T23:59:59");

    if (shifts.length === 0) {
      weeks.push({
        weekStart,
        weekEnd,
        totalSeconds: 0,
        totalPay: 0,
        shiftCount: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        missingCount: 7,
      });
      continue;
    }

    let totalSeconds = 0;
    let totalPay = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    const daysWithShifts = new Set();

    for (const s of shifts) {
      totalSeconds += s.payable_seconds || 0;

      let laborPay = s.final_gross_pay || s.estimated_gross_pay || 0;
      if (laborPay === 0 && s.base_pay != null) {
        laborPay = (s.base_pay || 0) + (s.overtime_pay || 0) + (s.double_time_pay || 0);
      }
      let allowancePay = s.allowance_pay || 0;
      if (!allowancePay) {
        const al = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(s.id);
        allowancePay = al?.total || 0;
      }
      totalPay += laborPay + allowancePay;

      if (s.status === "approved") approvedCount++;
      else if (s.status === "pending_approval") pendingCount++;
      else if (s.status === "rejected") rejectedCount++;

      if (s.checked_in_at) {
        daysWithShifts.add(s.checked_in_at.substring(0, 10));
      }
    }

    weeks.push({
      weekStart,
      weekEnd,
      totalSeconds,
      totalPay: Math.round(totalPay * 100) / 100,
      shiftCount: shifts.length,
      approvedCount,
      pendingCount,
      rejectedCount,
      missingCount: 7 - daysWithShifts.size,
    });
  }

  // Filter out empty future weeks (i === 0 is current week, keep it; i > 0 with no shifts should only be kept if past weeks)
  // Actually keep all computed weeks within the range — current week is i=0 and should always be shown
  res.json({ weeks });
});

// GET /api/platform/users/:userId/shifts/:shiftId
router.get("/users/:userId/shifts/:shiftId", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId, shiftId } = req.params;

  const shift = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.id = ? AND s.employee_id = ?
  `).get(shiftId, userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);
  const allowances = db.prepare("SELECT * FROM shift_allowances WHERE shift_session_id = ? ORDER BY created_at ASC").all(shiftId);

  res.json({ shift, events, allowances });
});

// POST /api/platform/users/:userId/manual-shift
router.post("/users/:userId/manual-shift", requireRole("owner"), (req, res) => {
  try {
    const db = getDb();
    const { userId } = req.params;
    const { date, startTime, endTime, breakDuration, siteId, reason } = req.body;

    if (!reason || !reason.trim()) return res.status(400).json({ error: "Reason is required for manual shift creation" });
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "Date, startTime, and endTime are required" });

    const user = db.prepare("SELECT id, hourly_rate FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.hourly_rate) return res.status(400).json({ error: "User has no hourly rate configured" });

    const checkedInAt = new Date(`${date}T${startTime}`);
    const checkedOutAt = new Date(`${date}T${endTime}`);
    if (isNaN(checkedInAt.getTime()) || isNaN(checkedOutAt.getTime())) return res.status(400).json({ error: "Invalid date/time format" });
    if (checkedOutAt <= checkedInAt) return res.status(400).json({ error: "End time must be after start time" });

    const totalSeconds = Math.max(0, Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 1000));
    const breakSecs = (parseInt(breakDuration) || 0) * 60;
    const payableSeconds = Math.max(0, totalSeconds - breakSecs);
    const hourlyRate = user.hourly_rate;
    const estimatedGrossPay = payableSeconds / 3600 * hourlyRate;

    const shiftId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO shift_sessions (id, employee_id, site_id, status, checked_in_at, checked_out_at, hourly_rate_snapshot, total_seconds, break_seconds, payable_seconds, estimated_gross_pay, timezone, created_at, updated_at)
      VALUES (?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, ?, ?, 'Australia/Sydney', ?, ?)
    `).run(shiftId, userId, siteId || null, checkedInAt.toISOString(), checkedOutAt.toISOString(), hourlyRate, totalSeconds, breakSecs, payableSeconds, estimatedGrossPay, now, now);

    const eventId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
      VALUES (?, ?, ?, 'check_in', ?, 'admin', ?)
    `).run(eventId, shiftId, userId, checkedInAt.toISOString(), now);

    // Add check_out event
    const checkOutEventId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
      VALUES (?, ?, ?, 'check_out', ?, 'admin', ?)
    `).run(checkOutEventId, shiftId, userId, checkedOutAt.toISOString(), now);

    audit(res, "worker_manual_shift_created", "shift_session", shiftId, { workerId: userId, date, start: startTime, end: endTime, breakSeconds: breakSecs, siteId, reason });
    res.status(201).json({ id: shiftId, status: "pending_approval" });
  } catch (err) {
    console.error("Manual shift error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/platform/users/:userId/shifts/:shiftId
router.patch("/users/:userId/shifts/:shiftId", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId, shiftId } = req.params;
  const { startTime, endTime, breakDuration, siteId, reason } = req.body;

  if (!reason || !reason.trim()) return res.status(400).json({ error: "Reason is required for shift adjustment" });

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const oldCheckedInAt = shift.checked_in_at;
  const oldCheckedOutAt = shift.checked_out_at;
  const oldBreakSeconds = shift.break_seconds;
  const oldSiteId = shift.site_id;

  const checkedInAt = startTime ? new Date(startTime) : new Date(oldCheckedInAt);
  const checkedOutAt = endTime ? new Date(endTime) : (oldCheckedOutAt ? new Date(oldCheckedOutAt) : null);
  if (isNaN(checkedInAt.getTime())) return res.status(400).json({ error: "Invalid start time" });
  if (checkedOutAt && isNaN(checkedOutAt.getTime())) return res.status(400).json({ error: "Invalid end time" });

  const newBreakSecs = breakDuration !== undefined ? (parseInt(breakDuration) || 0) * 60 : (oldBreakSeconds || 0);
  const newSiteId = siteId !== undefined ? siteId : oldSiteId;

  const now = new Date().toISOString();
  const totalSeconds = checkedOutAt ? Math.max(0, Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 1000)) : (shift.total_seconds || 0);
  const payableSeconds = Math.max(0, totalSeconds - newBreakSecs);

  // Calculate full pay breakdown
  const payRule = db.prepare("SELECT * FROM company_pay_rules WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get();
  const breakdown = calculatePayBreakdownServer(payableSeconds, shift.hourly_rate_snapshot, payRule);
  const allowanceTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(shiftId)?.total || 0;

  if (shift.status === "approved") {
    const finalPay = breakdown.basePay + breakdown.overtimePay + breakdown.doubleTimePay;
    db.prepare(`
      UPDATE shift_sessions SET checked_in_at = ?, checked_out_at = ?, site_id = ?, total_seconds = ?, break_seconds = ?, payable_seconds = ?,
        base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?,
        base_pay = ?, overtime_pay = ?, double_time_pay = ?,
        final_gross_pay = ?, allowance_pay = ?,
        updated_at = datetime('now') WHERE id = ?
    `).run(checkedInAt.toISOString(), checkedOutAt?.toISOString() || null, newSiteId || null, totalSeconds, newBreakSecs, payableSeconds,
      breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds,
      breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay,
      finalPay, allowanceTotal, shiftId);
  } else {
    const estPay = breakdown.basePay + breakdown.overtimePay + breakdown.doubleTimePay;
    db.prepare(`
      UPDATE shift_sessions SET checked_in_at = ?, checked_out_at = ?, site_id = ?, total_seconds = ?, break_seconds = ?, payable_seconds = ?,
        base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?,
        base_pay = ?, overtime_pay = ?, double_time_pay = ?,
        estimated_gross_pay = ?, allowance_pay = ?,
        updated_at = datetime('now') WHERE id = ?
    `).run(checkedInAt.toISOString(), checkedOutAt?.toISOString() || null, newSiteId || null, totalSeconds, newBreakSecs, payableSeconds,
      breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds,
      breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay,
      estPay, allowanceTotal, shiftId);
  }

  const eventId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'correction_requested', ?, 'admin', ?)
  `).run(eventId, shiftId, userId, now, now);

  audit(res, "worker_shift_adjusted", "shift_session", shiftId, {
    workerId: userId,
    oldCheckedInAt, newCheckedInAt: checkedInAt.toISOString(),
    oldCheckedOutAt, newCheckedOutAt: checkedOutAt?.toISOString() || null,
    oldBreakSeconds, newBreakSeconds: newBreakSecs,
    oldSiteId, newSiteId,
    reason,
  });

  res.json({ success: true, shiftId });
});

// POST /api/platform/users/:userId/shifts/:shiftId/approve
router.post("/users/:userId/shifts/:shiftId/approve", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId, shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  if (shift.status !== "pending_approval") return res.status(400).json({ error: "Only pending-approval shifts can be approved" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  // Calculate pay breakdown
  const payRule = db.prepare("SELECT * FROM company_pay_rules WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get();
  const breakdown = calculatePayBreakdownServer(shift.payable_seconds || 0, shift.hourly_rate_snapshot, payRule);
  const allowanceTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(shiftId)?.total || 0;
  const finalGrossPay = breakdown.basePay + breakdown.overtimePay + breakdown.doubleTimePay;

  db.prepare(`
    UPDATE shift_sessions SET status = 'approved', final_gross_pay = ?, base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?, base_pay = ?, overtime_pay = ?, double_time_pay = ?, allowance_pay = ?, updated_at = datetime('now') WHERE id = ?
  `).run(finalGrossPay, breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds, breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay, allowanceTotal, shiftId);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'admin_approved', ?, 'admin', ?)
  `).run(eventId, shiftId, userId, now, now);

  audit(res, "worker_shift_approved_from_profile", "shift_session", shiftId, { workerId: userId });
  res.json({ success: true, approved: true });
});

// POST /api/platform/users/:userId/shifts/:shiftId/reject
router.post("/users/:userId/shifts/:shiftId/reject", requireRole("owner"), (req, res) => {
  const db = getDb();
  const { userId, shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  if (shift.status !== "pending_approval") return res.status(400).json({ error: "Only pending-approval shifts can be rejected" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  db.prepare("UPDATE shift_sessions SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(shiftId);
  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'admin_rejected', ?, 'admin', ?)
  `).run(eventId, shiftId, userId, now, now);

  audit(res, "worker_shift_rejected_from_profile", "shift_session", shiftId, { workerId: userId });
  res.json({ success: true, rejected: true });
});

// ── Quote Requests (Phase 8G) ─────────────────────────────────
const VALID_QR_STATUSES = ["new", "contacted", "quoted", "won", "lost", "archived"];
const VALID_QR_PRIORITIES = ["low", "normal", "high", "urgent"];

// GET /api/platform/quote-requests
router.get("/quote-requests", requireRole("owner", "admin", "manager"), (req, res) => {
  try {
    const db = getDb();
    const { status, search, priority, limit, offset } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const off = Math.max(parseInt(offset) || 0, 0);

    let where = ["1=1"];
    let params = [];

    if (status && VALID_QR_STATUSES.includes(status)) {
      where.push("qr.status = ?");
      params.push(status);
    }
    if (priority && VALID_QR_PRIORITIES.includes(priority)) {
      where.push("qr.priority = ?");
      params.push(priority);
    }
    if (search && typeof search === "string") {
      where.push("(qr.first_name LIKE ? OR qr.last_name LIKE ? OR qr.email LIKE ? OR qr.phone LIKE ? OR qr.service LIKE ? OR qr.location LIKE ? OR qr.message LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s);
    }

    const whereClause = where.join(" AND ");
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM contact_requests qr WHERE ${whereClause}`).get(...params);
    const rows = db.prepare(`SELECT qr.*, u.name as assigned_to_name FROM contact_requests qr LEFT JOIN users u ON u.id = qr.assigned_to_user_id WHERE ${whereClause} ORDER BY qr.received_at DESC LIMIT ? OFFSET ?`).all(...params, lim, off);

    // Summary counts across all records (ignoring filters)
    const summary = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) as quoted,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM contact_requests
    `).get();

    res.json({ requests: rows, total: count.cnt, summary, limit: lim, offset: off });
  } catch (err) {
    console.error("Error listing quote requests:", err.message);
    res.status(500).json({ error: "Failed to list quote requests" });
  }
});

// GET /api/platform/quote-requests/:id
router.get("/quote-requests/:id", requireRole("owner", "admin", "manager"), (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT qr.*, u.name as assigned_to_name FROM contact_requests qr LEFT JOIN users u ON u.id = qr.assigned_to_user_id WHERE qr.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: "Quote request not found" });
    res.json(row);
  } catch (err) {
    console.error("Error getting quote request:", err.message);
    res.status(500).json({ error: "Failed to get quote request" });
  }
});

// PATCH /api/platform/quote-requests/:id
router.patch("/quote-requests/:id", requireRole("owner", "admin", "manager"), (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Quote request not found" });

    const { status, priority, internal_notes, assigned_to_user_id, last_contacted_at } = req.body || {};

    if (status !== undefined && !VALID_QR_STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_QR_STATUSES.join(", ")}` });
    if (priority !== undefined && !VALID_QR_PRIORITIES.includes(priority)) return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_QR_PRIORITIES.join(", ")}` });

    const now = new Date().toISOString();
    const updates = ["updated_at = ?"];
    const params = [now];

    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (priority !== undefined) { updates.push("priority = ?"); params.push(priority); }
    if (internal_notes !== undefined) { updates.push("internal_notes = ?"); params.push(internal_notes); }
    if (assigned_to_user_id !== undefined) { updates.push("assigned_to_user_id = ?"); params.push(assigned_to_user_id); }
    if (last_contacted_at !== undefined) { updates.push("last_contacted_at = ?"); params.push(last_contacted_at); }

    // If status is 'archived', set archived_at
    if (status === "archived") { updates.push("archived_at = ?"); params.push(now); }

    params.push(req.params.id);
    db.prepare(`UPDATE contact_requests SET ${updates.join(", ")} WHERE id = ?`).run(...params);

    audit(res, "quote_request_updated", "quote_request", req.params.id, { changes: req.body });
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating quote request:", err.message);
    res.status(500).json({ error: "Failed to update quote request" });
  }
});

// POST /api/platform/quote-requests/:id/archive
router.post("/quote-requests/:id/archive", requireRole("owner", "admin", "manager"), (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare("UPDATE contact_requests SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?").run(now, now, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Quote request not found" });
    audit(res, "quote_request_archived", "quote_request", req.params.id, {});
    res.json({ success: true, archived: true });
  } catch (err) {
    console.error("Error archiving quote request:", err.message);
    res.status(500).json({ error: "Failed to archive quote request" });
  }
});

// POST /api/platform/quote-requests/:id/restore
router.post("/quote-requests/:id/restore", requireRole("owner", "admin", "manager"), (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare("UPDATE contact_requests SET status = 'new', archived_at = NULL, updated_at = ? WHERE id = ? AND status = 'archived'").run(now, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Quote request not found or not archived" });
    audit(res, "quote_request_restored", "quote_request", req.params.id, {});
    res.json({ success: true, restored: true });
  } catch (err) {
    console.error("Error restoring quote request:", err.message);
    res.status(500).json({ error: "Failed to restore quote request" });
  }
});

export default router;
