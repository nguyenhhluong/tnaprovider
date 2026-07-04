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

// Tasks
router.get("/", (req, res) => {
  const db = getDb();
  const { project_id, assigned_to, priority, status } = req.query;

  let sql = `SELECT pt.*, p.title as project_title, u.name as assigned_name 
    FROM project_tasks pt 
    LEFT JOIN projects p ON p.id = pt.project_id 
    LEFT JOIN users u ON u.id = pt.assigned_to 
    WHERE 1=1`;
  const params = [];

  if (!isManagement(req.user)) {
    if (req.user.role === "worker") {
      sql += " AND pt.assigned_to = ?";
      params.push(req.user.userId);
    } else {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  if (project_id) { sql += " AND pt.project_id = ?"; params.push(project_id); }
  if (assigned_to) { sql += " AND pt.assigned_to = ?"; params.push(assigned_to); }
  if (priority) { sql += " AND pt.priority = ?"; params.push(priority); }
  if (status) { sql += " AND pt.status = ?"; params.push(status); }

  sql += " ORDER BY pt.created_at DESC";
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

router.post("/", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { project_id, title, description, priority, assigned_to, due_at, estimated_hours } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: "project_id and title are required" });
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO project_tasks (id, project_id, title, description, priority, assigned_to, due_at, estimated_hours, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, project_id, title, description || null, priority || 'medium', assigned_to || null, due_at || null, estimated_hours || null, req.user.userId);
  audit(res, "task_created", "project_task", id, { project_id, title, assigned_to });
  if (assigned_to) {
    audit(res, "task_assigned", "project_task", id, { assigned_to });
  }
  res.status(201).json({ id });
});

// Task Templates — must be defined before /:id routes
router.get("/templates", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const templates = db.prepare("SELECT * FROM project_task_templates ORDER BY name ASC").all();
  res.json(templates);
});

router.post("/templates", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { name, description, sector, tasks } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO project_task_templates (id, name, description, sector, created_by) VALUES (?, ?, ?, ?, ?)").run(id, name, description || null, sector || null, req.user.userId);
  
  if (Array.isArray(tasks)) {
    const insert = db.prepare("INSERT INTO project_template_tasks (id, template_id, title, description, default_assignee_role, sort_order, estimated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)");
    tasks.forEach((t, i) => {
      insert.run(crypto.randomUUID(), id, t.title, t.description || null, t.default_assignee_role || null, i, t.estimated_hours || null);
    });
  }
  
  audit(res, "task_template_created", "project_task_template", id, { name });
  res.status(201).json({ id });
});

router.post("/templates/:id/apply-to-project/:projectId", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const template = db.prepare("SELECT * FROM project_task_templates WHERE id = ?").get(req.params.id);
  if (!template) return res.status(404).json({ error: "Template not found" });
  
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  const templateTasks = db.prepare("SELECT * FROM project_template_tasks WHERE template_id = ? ORDER BY sort_order ASC").all(req.params.id);
  const insert = db.prepare("INSERT INTO project_tasks (id, project_id, title, description, created_by) VALUES (?, ?, ?, ?, ?)");
  const created = [];
  templateTasks.forEach((tt) => {
    const id = crypto.randomUUID();
    insert.run(id, req.params.projectId, tt.title, tt.description || null, req.user.userId);
    created.push(id);
  });
  
  audit(res, "task_template_applied", "project_task_template", req.params.id, { projectId: req.params.projectId, taskCount: created.length });
  res.status(201).json({ created });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare(`SELECT pt.*, p.title as project_title, u.name as assigned_name 
    FROM project_tasks pt 
    LEFT JOIN projects p ON p.id = pt.project_id 
    LEFT JOIN users u ON u.id = pt.assigned_to 
    WHERE pt.id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!isManagement(req.user) && req.user.role === "worker" && task.assigned_to !== req.user.userId) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json(task);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const { title, description, priority, assigned_to, due_at, estimated_hours, actual_hours } = req.body;

  const task = db.prepare("SELECT * FROM project_tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!isManagement(req.user)) {
    if (req.user.role === "worker" && task.assigned_to === req.user.userId) {
      // Worker can only update status, not other fields
      if (title || description || priority !== undefined || assigned_to !== undefined || due_at !== undefined || estimated_hours !== undefined || actual_hours !== undefined) {
        return res.status(403).json({ error: "Workers can only update task status" });
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }
  }

  const sets = []; const vals = [];
  if (title) { sets.push("title = ?"); vals.push(title); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
  if (priority) { sets.push("priority = ?"); vals.push(priority); }
  if (assigned_to !== undefined) { sets.push("assigned_to = ?"); vals.push(assigned_to); }
  if (due_at !== undefined) { sets.push("due_at = ?"); vals.push(due_at); }
  if (estimated_hours !== undefined) { sets.push("estimated_hours = ?"); vals.push(estimated_hours); }
  if (actual_hours !== undefined) { sets.push("actual_hours = ?"); vals.push(actual_hours); }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE project_tasks SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "task_updated", "project_task", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

router.patch("/:id/status", (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status is required" });
  const validStatuses = ["todo", "in_progress", "blocked", "done", "cancelled"];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const task = db.prepare("SELECT * FROM project_tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!isManagement(req.user) && req.user.role === "worker" && task.assigned_to !== req.user.userId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const now = new Date().toISOString();
  const completedAt = status === "done" ? now : null;
  db.prepare("UPDATE project_tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?").run(status, completedAt, now, req.params.id);
  audit(res, "task_status_changed", "project_task", req.params.id, { old_status: task.status, new_status: status });
  res.json({ success: true });
});

// Task Comments
router.post("/:id/comments", (req, res) => {
  const db = getDb();
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const task = db.prepare("SELECT * FROM project_tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  if (!isManagement(req.user) && req.user.role === "worker" && task.assigned_to !== req.user.userId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const id = crypto.randomUUID();
  db.prepare("INSERT INTO project_task_comments (id, task_id, user_id, message) VALUES (?, ?, ?, ?)").run(id, req.params.id, req.user.userId, message);
  audit(res, "task_comment_created", "project_task_comment", id, { taskId: req.params.id });
  res.status(201).json({ id });
});

router.get("/:id/comments", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM project_tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!isManagement(req.user) && req.user.role === "worker" && task.assigned_to !== req.user.userId) {
    return res.status(403).json({ error: "Access denied" });
  }
  const comments = db.prepare(`SELECT ptc.*, u.name as user_name 
    FROM project_task_comments ptc 
    LEFT JOIN users u ON u.id = ptc.user_id 
    WHERE ptc.task_id = ? ORDER BY ptc.created_at ASC`).all(req.params.id);
  res.json(comments);
});

export default router;
