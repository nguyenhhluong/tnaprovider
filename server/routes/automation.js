import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";
import { validate, schemas } from "../middleware/validate.js";

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

const MANAGEMENT_ROLES = ["owner", "admin", "manager"];

function isManagement(user) {
  return MANAGEMENT_ROLES.includes(user?.role);
}

// Lead Activities
router.get("/leads/:leadId/activities", (req, res) => {
  const db = getDb();
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const activities = db
    .prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC")
    .all(req.params.leadId);
  res.json(activities);
});

router.post("/leads/:leadId/activities", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { type, title, description } = req.body;
  if (!type || !title) return res.status(400).json({ error: "type and title are required" });
  const validTypes = ["note", "call", "email", "meeting", "site_visit", "status_change"];
  if (!validTypes.includes(type)) return res.status(400).json({ error: "Invalid type" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO lead_activities (id, lead_id, type, title, description, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.leadId, type, title, description || null, req.user.userId);
  audit(res, "lead_activity_created", "lead_activity", id, {
    leadId: req.params.leadId,
    type,
    title,
  });
  res.status(201).json({ id });
});

// Lead Followups
router.get("/leads/:leadId/followups", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const followups = db
    .prepare("SELECT * FROM lead_followups WHERE lead_id = ? ORDER BY due_at ASC")
    .all(req.params.leadId);
  res.json(followups);
});

router.post("/leads/:leadId/followups", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { title, due_at, assigned_to } = req.body;
  if (!title || !due_at) return res.status(400).json({ error: "title and due_at are required" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO lead_followups (id, lead_id, title, due_at, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, req.params.leadId, title, due_at, assigned_to || null, req.user.userId);
  audit(res, "lead_followup_created", "lead_followup", id, {
    leadId: req.params.leadId,
    title,
    due_at,
  });
  res.status(201).json({ id });
});

router.patch("/followups/:id/done", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE lead_followups SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?"
  ).run(now, now, req.params.id);
  audit(res, "lead_followup_completed", "lead_followup", req.params.id, {});
  res.json({ success: true });
});

router.patch("/followups/:id/cancel", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE lead_followups SET status = 'cancelled', updated_at = ? WHERE id = ?"
  ).run(now, req.params.id);
  audit(res, "lead_followup_cancelled", "lead_followup", req.params.id, {});
  res.json({ success: true });
});

export default router;
