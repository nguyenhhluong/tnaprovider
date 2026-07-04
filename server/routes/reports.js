import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

router.get("/dashboard", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();

  const totalLeads = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
  const leadsByStatus = db.prepare("SELECT status, COUNT(*) as c FROM leads GROUP BY status").all();
  const overdueFollowups = db.prepare("SELECT COUNT(*) as c FROM lead_followups WHERE status = 'pending' AND due_at < datetime('now')").get().c;

  const quotesByStatus = db.prepare("SELECT status, COUNT(*) as c FROM quotes GROUP BY status").all();
  const totalAcceptedValue = db.prepare("SELECT COALESCE(SUM(total), 0) as c FROM quotes WHERE status = 'accepted'").get().c;
  const totalQuoteCount = db.prepare("SELECT COUNT(*) as c FROM quotes").get().c || 1;
  const acceptedCount = db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status = 'accepted'").get().c || 0;
  const quoteConversionRate = Math.round((acceptedCount / totalQuoteCount) * 100);

  const projectsByStatus = db.prepare("SELECT status, COUNT(*) as c FROM projects GROUP BY status").all();
  const tasksByStatus = db.prepare("SELECT status, COUNT(*) as c FROM project_tasks GROUP BY status").all();
  const overdueTasks = db.prepare("SELECT COUNT(*) as c FROM project_tasks WHERE status NOT IN ('done','cancelled') AND due_at IS NOT NULL AND due_at < datetime('now')").get().c;

  const maintenanceByStatus = db.prepare("SELECT status, COUNT(*) as c FROM maintenance_tickets GROUP BY status").all();

  const recentActivity = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20").all();

  // Backup info from Phase 5C
  let lastBackupAt = null;
  let backupCount = 0;
  const backupDir = path.join(__dirname, "../../data/backups");
  try {
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".db"));
      backupCount = files.length;
      if (files.length > 0) {
        const stats = files.map(f => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }));
        stats.sort((a, b) => b.mtime - a.mtime);
        lastBackupAt = stats[0].mtime.toISOString();
      }
    }
  } catch (e) {
    // Backup info is optional
  }

  audit(res, "report_viewed", "report", "dashboard", {});
  res.json({
    leads: { total: totalLeads, byStatus: leadsByStatus, overdueFollowups },
    quotes: { byStatus: quotesByStatus, totalAcceptedValue, conversionRate: quoteConversionRate },
    projects: { byStatus: projectsByStatus },
    tasks: { byStatus: tasksByStatus, overdue: overdueTasks },
    maintenance: { byStatus: maintenanceByStatus },
    activity: recentActivity,
    backups: { count: backupCount, lastBackupAt },
  });
});

router.get("/leads", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { start_date, end_date } = req.query;

  let sql = "SELECT * FROM leads WHERE 1=1";
  const params = [];
  if (start_date) { sql += " AND created_at >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND created_at <= ?"; params.push(end_date); }
  sql += " ORDER BY created_at DESC";

  const leads = db.prepare(sql).all(...params);
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM leads GROUP BY status").all();
  const bySource = db.prepare("SELECT source, COUNT(*) as c FROM leads WHERE source IS NOT NULL GROUP BY source").all();
  const followupsPending = db.prepare("SELECT COUNT(*) as c FROM lead_followups WHERE status = 'pending'").get().c;
  const followupsOverdue = db.prepare("SELECT COUNT(*) as c FROM lead_followups WHERE status = 'pending' AND due_at < datetime('now')").get().c;

  audit(res, "report_viewed", "report", "leads", {});
  res.json({ leads, byStatus, bySource, followupsPending, followupsOverdue });
});

router.get("/quotes", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { start_date, end_date } = req.query;

  let sql = "SELECT q.*, qr.title as request_title, l.name as lead_name FROM quotes q LEFT JOIN quote_requests qr ON qr.id = q.quote_request_id LEFT JOIN leads l ON l.id = qr.lead_id WHERE 1=1";
  const params = [];
  if (start_date) { sql += " AND q.created_at >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND q.created_at <= ?"; params.push(end_date); }
  sql += " ORDER BY q.created_at DESC";

  const quotes = db.prepare(sql).all(...params);
  const byStatus = db.prepare("SELECT status, COUNT(*) as c, COALESCE(SUM(total), 0) as total_value FROM quotes GROUP BY status").all();
  const totalAccepted = db.prepare("SELECT COALESCE(SUM(total), 0) as c FROM quotes WHERE status = 'accepted'").get().c;
  const totalCount = db.prepare("SELECT COUNT(*) as c FROM quotes").get().c || 1;
  const acceptedCount = db.prepare("SELECT COUNT(*) as c FROM quotes WHERE status = 'accepted'").get().c || 0;
  const conversionRate = Math.round((acceptedCount / totalCount) * 100);

  audit(res, "report_viewed", "report", "quotes", {});
  res.json({ quotes, byStatus, totalAccepted, conversionRate });
});

router.get("/projects", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { start_date, end_date } = req.query;

  let sql = "SELECT * FROM projects WHERE 1=1";
  const params = [];
  if (start_date) { sql += " AND created_at >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND created_at <= ?"; params.push(end_date); }
  sql += " ORDER BY created_at DESC";

  const projects = db.prepare(sql).all(...params);
  const byStatus = db.prepare("SELECT status, COUNT(*) as c, COALESCE(SUM(budget), 0) as total_budget FROM projects GROUP BY status").all();

  audit(res, "report_viewed", "report", "projects", {});
  res.json({ projects, byStatus });
});

router.get("/tasks", (req, res) => {
  if (!isManagement(req.user)) {
    if (req.user.role === "worker") {
      const db = getDb();
      const tasks = db.prepare(`SELECT pt.*, p.title as project_title FROM project_tasks pt LEFT JOIN projects p ON p.id = pt.project_id WHERE pt.assigned_to = ? ORDER BY pt.created_at DESC`).all(req.user.userId);
      const byStatus = [
        { status: "todo", c: tasks.filter(t => t.status === "todo").length },
        { status: "in_progress", c: tasks.filter(t => t.status === "in_progress").length },
        { status: "done", c: tasks.filter(t => t.status === "done").length },
      ];
      return res.json({ tasks, byStatus, total: tasks.length });
    }
    return res.status(403).json({ error: "Access denied" });
  }
  const db = getDb();
  const { start_date, end_date, assigned_to, status } = req.query;

  let sql = "SELECT pt.*, p.title as project_title, u.name as assigned_name FROM project_tasks pt LEFT JOIN projects p ON p.id = pt.project_id LEFT JOIN users u ON u.id = pt.assigned_to WHERE 1=1";
  const params = [];
  if (start_date) { sql += " AND pt.created_at >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND pt.created_at <= ?"; params.push(end_date); }
  if (assigned_to) { sql += " AND pt.assigned_to = ?"; params.push(assigned_to); }
  if (status) { sql += " AND pt.status = ?"; params.push(status); }
  sql += " ORDER BY pt.created_at DESC";

  const tasks = db.prepare(sql).all(...params);
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM project_tasks GROUP BY status").all();
  const overdue = db.prepare("SELECT COUNT(*) as c FROM project_tasks WHERE status NOT IN ('done','cancelled') AND due_at IS NOT NULL AND due_at < datetime('now')").get().c;

  audit(res, "report_viewed", "report", "tasks", {});
  res.json({ tasks, byStatus, overdue });
});

router.get("/maintenance", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { start_date, end_date } = req.query;

  let sql = "SELECT mt.*, u.name as client_name, p.title as project_title FROM maintenance_tickets mt LEFT JOIN users u ON u.id = mt.client_id LEFT JOIN projects p ON p.id = mt.project_id WHERE 1=1";
  const params = [];
  if (start_date) { sql += " AND mt.created_at >= ?"; params.push(start_date); }
  if (end_date) { sql += " AND mt.created_at <= ?"; params.push(end_date); }
  sql += " ORDER BY mt.created_at DESC";

  const tickets = db.prepare(sql).all(...params);
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM maintenance_tickets GROUP BY status").all();
  const byPriority = db.prepare("SELECT priority, COUNT(*) as c FROM maintenance_tickets GROUP BY priority").all();

  audit(res, "report_viewed", "report", "maintenance", {});
  res.json({ tickets, byStatus, byPriority });
});

router.get("/activity", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { limit: limitParam } = req.query;
  const rowLimit = Math.min(parseInt(limitParam) || 50, 200);

  const activity = db.prepare("SELECT al.*, u.name as user_name FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT ?").all(rowLimit);
  res.json(activity);
});

export default router;
