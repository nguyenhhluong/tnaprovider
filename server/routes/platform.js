import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";
import { validate, schemas } from "../middleware/validate.js";
import { hashPassword } from "../auth/hash.js";

const router = Router();

router.use(requireAuth);

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

// ── Users ──

router.get("/users", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, email, name, role, status, created_at, last_login_at FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

router.post("/users", requireRole("owner", "admin"), validate(schemas.createUser), (req, res) => {
  const db = getDb();
  const { email, name, role, password } = req.body;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const id = crypto.randomUUID();
  const password_hash = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare("INSERT INTO users (id, email, name, role, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)").run(id, email.toLowerCase().trim(), name, role, password_hash, now, now);

  audit(res, "user_created", "user", id, { email, role });
  res.status(201).json({ id, email, name, role });
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

// ── Audit Logs ──

router.get("/audit", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const logs = db.prepare("SELECT a.*, u.name as user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 500").all();
  res.json(logs);
});

export default router;
