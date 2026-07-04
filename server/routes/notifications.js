import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";

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

// Notifications
router.get("/", (req, res) => {
  const db = getDb();
  const { type, status } = req.query;
  let sql = "SELECT * FROM notifications WHERE user_id = ?";
  const params = [req.user.userId];
  if (type) { sql += " AND type = ?"; params.push(type); }
  if (status) { sql += " AND status = ?"; params.push(status); }
  sql += " ORDER BY created_at DESC LIMIT 100";
  const notifications = db.prepare(sql).all(...params);
  const unreadCount = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND status = 'unread'").get(req.user.userId).c;
  res.json({ notifications, unreadCount });
});

router.patch("/:id/read", (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare("UPDATE notifications SET status = 'read', read_at = ? WHERE id = ? AND user_id = ?").run(now, req.params.id, req.user.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Notification not found" });
  audit(res, "notification_read", "notification", req.params.id, {});
  res.json({ success: true });
});

router.patch("/read-all", (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare("UPDATE notifications SET status = 'read', read_at = ? WHERE user_id = ? AND status = 'unread'").run(now, req.user.userId);
  audit(res, "notification_read_all", "notification", null, {});
  res.json({ success: true });
});

// Notification Preferences
router.get("/preferences", (req, res) => {
  const db = getDb();
  let prefs = db.prepare("SELECT * FROM notification_preferences WHERE user_id = ?").get(req.user.userId);
  if (!prefs) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO notification_preferences (id, user_id) VALUES (?, ?)").run(id, req.user.userId);
    prefs = db.prepare("SELECT * FROM notification_preferences WHERE user_id = ?").get(req.user.userId);
  }
  res.json(prefs);
});

router.patch("/preferences", (req, res) => {
  const db = getDb();
  const { notify_leads, notify_quotes, notify_tasks, notify_projects, notify_maintenance } = req.body;
  const sets = []; const vals = [];
  if (notify_leads !== undefined) { sets.push("notify_leads = ?"); vals.push(notify_leads ? 1 : 0); }
  if (notify_quotes !== undefined) { sets.push("notify_quotes = ?"); vals.push(notify_quotes ? 1 : 0); }
  if (notify_tasks !== undefined) { sets.push("notify_tasks = ?"); vals.push(notify_tasks ? 1 : 0); }
  if (notify_projects !== undefined) { sets.push("notify_projects = ?"); vals.push(notify_projects ? 1 : 0); }
  if (notify_maintenance !== undefined) { sets.push("notify_maintenance = ?"); vals.push(notify_maintenance ? 1 : 0); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    // Upsert
    const existing = db.prepare("SELECT id FROM notification_preferences WHERE user_id = ?").get(req.user.userId);
    if (existing) {
      db.prepare(`UPDATE notification_preferences SET ${sets.join(", ")} WHERE user_id = ?`).run(...vals, req.user.userId);
    } else {
      const id = crypto.randomUUID();
      const fields = ["id", "user_id", ...sets.map(s => s.split(" = ")[0])];
      const placeholders = fields.map(() => "?");
      const insertVals = [id, req.user.userId, ...vals];
      db.prepare(`INSERT INTO notification_preferences (${fields.join(", ")}) VALUES (${placeholders.join(", ")})`).run(...insertVals);
    }
  }
  res.json({ success: true });
});

// Reminder Rules
router.get("/reminder-rules", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const rules = db.prepare("SELECT * FROM reminder_rules ORDER BY name ASC").all();
  res.json(rules);
});

router.post("/reminder-rules", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { name, type, enabled, offset_hours } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });
  const validTypes = ["lead_followup", "quote_expiry", "task_due", "project_due", "maintenance_pending"];
  if (!validTypes.includes(type)) return res.status(400).json({ error: "Invalid type" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO reminder_rules (id, name, type, enabled, offset_hours, created_by) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, type, enabled !== undefined ? (enabled ? 1 : 0) : 1, offset_hours || 24, req.user.userId);
  audit(res, "reminder_rule_created", "reminder_rule", id, { name, type });
  res.status(201).json({ id });
});

router.patch("/reminder-rules/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { name, type, enabled, offset_hours } = req.body;
  const sets = []; const vals = [];
  if (name) { sets.push("name = ?"); vals.push(name); }
  if (type) { sets.push("type = ?"); vals.push(type); }
  if (enabled !== undefined) { sets.push("enabled = ?"); vals.push(enabled ? 1 : 0); }
  if (offset_hours !== undefined) { sets.push("offset_hours = ?"); vals.push(offset_hours); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE reminder_rules SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "reminder_rule_updated", "reminder_rule", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

// Manual Reminder Run (owner/admin only)
router.post("/run-reminders", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const rules = db.prepare("SELECT * FROM reminder_rules WHERE enabled = 1").all();
  let notificationCount = 0;

  rules.forEach((rule) => {
    let entities = [];

    if (rule.type === "lead_followup") {
      entities = db.prepare(`SELECT lf.id, lf.title, lf.assigned_to FROM lead_followups lf WHERE lf.status = 'pending' AND lf.due_at <= datetime('now', '+' || ? || ' hours')`).all(rule.offset_hours);
      entities.forEach((e) => {
        if (e.assigned_to) {
          const nid = createInternalNotification(db, e.assigned_to, "lead_followup_due", `Follow-up due: ${e.title}`, null, "lead_followup", e.id);
          db.prepare("INSERT INTO reminder_runs (id, rule_id, entity_type, entity_id, notification_id, ran_at) VALUES (?, ?, 'lead_followup', ?, ?, ?)").run(crypto.randomUUID(), rule.id, e.id, nid, now);
          notificationCount++;
        }
      });
    } else if (rule.type === "quote_expiry") {
      entities = db.prepare(`SELECT q.id, q.title, q.created_by FROM quotes q WHERE q.status = 'sent' AND q.valid_until IS NOT NULL AND q.valid_until <= datetime('now', '+' || ? || ' hours')`).all(rule.offset_hours);
      entities.forEach((e) => {
        if (e.created_by) {
          const nid = createInternalNotification(db, e.created_by, "quote_expiring", `Quote expiring: ${e.title}`, null, "quote", e.id);
          db.prepare("INSERT INTO reminder_runs (id, rule_id, entity_type, entity_id, notification_id, ran_at) VALUES (?, ?, 'quote', ?, ?, ?)").run(crypto.randomUUID(), rule.id, e.id, nid, now);
          notificationCount++;
        }
      });
    } else if (rule.type === "task_due") {
      entities = db.prepare(`SELECT pt.id, pt.title, pt.assigned_to FROM project_tasks pt WHERE pt.status NOT IN ('done','cancelled') AND pt.due_at IS NOT NULL AND pt.due_at <= datetime('now', '+' || ? || ' hours')`).all(rule.offset_hours);
      entities.forEach((e) => {
        if (e.assigned_to) {
          const nid = createInternalNotification(db, e.assigned_to, "task_due", `Task due: ${e.title}`, null, "project_task", e.id);
          db.prepare("INSERT INTO reminder_runs (id, rule_id, entity_type, entity_id, notification_id, ran_at) VALUES (?, ?, 'project_task', ?, ?, ?)").run(crypto.randomUUID(), rule.id, e.id, nid, now);
          notificationCount++;
        }
      });
    } else if (rule.type === "project_due") {
      entities = db.prepare(`SELECT p.id, p.title FROM projects p WHERE p.status = 'active' AND p.target_date IS NOT NULL AND p.target_date <= datetime('now', '+' || ? || ' hours')`).all(rule.offset_hours);
      entities.forEach((e) => {
        // Notify all managers/admins/owners
        const users = db.prepare("SELECT id FROM users WHERE role IN ('owner','admin','manager')").all();
        users.forEach((u) => {
          const nid = createInternalNotification(db, u.id, "project_due", `Project due: ${e.title}`, null, "project", e.id);
          db.prepare("INSERT INTO reminder_runs (id, rule_id, entity_type, entity_id, notification_id, ran_at) VALUES (?, ?, 'project', ?, ?, ?)").run(crypto.randomUUID(), rule.id, e.id, nid, now);
          notificationCount++;
        });
      });
    } else if (rule.type === "maintenance_pending") {
      entities = db.prepare(`SELECT mt.id, mt.title, mt.assigned_to FROM maintenance_tickets mt WHERE mt.status IN ('open','in_progress')`).all();
      entities.forEach((e) => {
        if (e.assigned_to) {
          const nid = createInternalNotification(db, e.assigned_to, "maintenance_pending", `Maintenance pending: ${e.title}`, null, "maintenance_ticket", e.id);
          db.prepare("INSERT INTO reminder_runs (id, rule_id, entity_type, entity_id, notification_id, ran_at) VALUES (?, ?, 'maintenance_ticket', ?, ?, ?)").run(crypto.randomUUID(), rule.id, e.id, nid, now);
          notificationCount++;
        }
      });
    }
  });

  audit(res, "reminder_run_completed", "reminder", null, { notificationCount });
  res.json({ success: true, notificationCount });
});

function createInternalNotification(db, userId, type, title, message, entityType, entityId) {
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, channel) VALUES (?, ?, ?, ?, ?, ?, ?, 'in_app')").run(id, userId, type, title, message || null, entityType || null, entityId || null);
  return id;
}

export default router;
