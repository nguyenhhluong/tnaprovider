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

function getClientProjectIds(db, userId) {
  const access = db.prepare("SELECT project_id FROM client_project_access WHERE client_id = ?").all(userId);
  return access.map((a) => a.project_id);
}

// ── Projects ──

router.get("/projects", (req, res) => {
  const db = getDb();

  if (req.user.role === "client") {
    const projectIds = getClientProjectIds(db, req.user.userId);
    if (projectIds.length === 0) return res.json([]);
    const placeholders = projectIds.map(() => "?").join(",");
    const projects = db.prepare(`SELECT * FROM projects WHERE id IN (${placeholders}) ORDER BY created_at DESC`).all(...projectIds);
    return res.json(projects);
  }

  // owner/admin/manager can see all projects with client access info
  const projects = db.prepare(`
    SELECT p.*, cpa.client_id as access_client_id
    FROM projects p
    LEFT JOIN client_project_access cpa ON cpa.project_id = p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects);
});

router.get("/projects/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  res.json(project);
});

// ── Updates ──

router.get("/projects/:id/updates", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const updates = db.prepare(`
    SELECT u.*, uu.name as created_by_name
    FROM project_updates u
    JOIN users uu ON uu.id = u.created_by
    WHERE u.project_id = ?
    ORDER BY u.created_at DESC
  `).all(id);

  res.json(updates);
});

router.post("/projects/:id/updates", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { title, message, status, progressPercent, imageUrl } = req.body;

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const updateId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO project_updates (id, project_id, title, message, status, progress_percent, image_url, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(updateId, id, title, message || null, status || "in_progress", progressPercent || 0, imageUrl || null, req.user.userId, now, now);

  audit(res, "project_update_created", "project_update", updateId, { projectId: id, title });
  res.status(201).json({ id: updateId, title });
});

// ── Comments ──

router.get("/updates/:id/comments", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const update = db.prepare("SELECT * FROM project_updates WHERE id = ?").get(id);
  if (!update) return res.status(404).json({ error: "Update not found" });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, update.project_id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name
    FROM project_update_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.update_id = ?
    ORDER BY c.created_at ASC
  `).all(id);

  res.json(comments);
});

router.post("/updates/:id/comments", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const update = db.prepare("SELECT * FROM project_updates WHERE id = ?").get(id);
  if (!update) return res.status(404).json({ error: "Update not found" });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, update.project_id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const commentId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO project_update_comments (id, update_id, user_id, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, id, req.user.userId, message.trim(), now);

  audit(res, "project_update_commented", "project_update_comment", commentId, { updateId: id });
  res.status(201).json({ id: commentId });
});

// ── Variations ──

router.get("/projects/:id/variations", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const variations = db.prepare(`
    SELECT v.*, req.name as requested_by_name, decider.name as decided_by_name
    FROM project_variations v
    LEFT JOIN users req ON req.id = v.requested_by
    LEFT JOIN users decider ON decider.id = v.decided_by
    WHERE v.project_id = ?
    ORDER BY v.created_at DESC
  `).all(id);

  res.json(variations);
});

router.post("/projects/:id/variations", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { title, description, amount } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const varId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO project_variations (id, project_id, title, description, amount, status, requested_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(varId, id, title.trim(), description || null, amount || null, req.user.userId, now, now);

  audit(res, "variation_created", "project_variation", varId, { projectId: id, title, amount });
  res.status(201).json({ id: varId, title });
});

router.patch("/variations/:id/approve", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const variation = db.prepare("SELECT * FROM project_variations WHERE id = ?").get(id);
  if (!variation) return res.status(404).json({ error: "Variation not found" });

  if (variation.status !== "pending") return res.status(400).json({ error: "Variation is already " + variation.status });

  // Client can only approve their own project's variations
  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, variation.project_id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  db.prepare("UPDATE project_variations SET status = 'approved', decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(req.user.userId, id);

  audit(res, "variation_approved", "project_variation", id, { projectId: variation.project_id });
  res.json({ success: true });
});

router.patch("/variations/:id/reject", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const variation = db.prepare("SELECT * FROM project_variations WHERE id = ?").get(id);
  if (!variation) return res.status(404).json({ error: "Variation not found" });

  if (variation.status !== "pending") return res.status(400).json({ error: "Variation is already " + variation.status });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, variation.project_id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  db.prepare("UPDATE project_variations SET status = 'rejected', decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(req.user.userId, id);

  audit(res, "variation_rejected", "project_variation", id, { projectId: variation.project_id });
  res.json({ success: true });
});

// ── Messages ──

router.get("/projects/:id/messages", (req, res) => {
  const db = getDb();
  const { id } = req.params;

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM client_portal_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.project_id = ?
    ORDER BY m.created_at ASC
  `).all(id);

  res.json(messages);
});

router.post("/projects/:id/messages", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) return res.status(400).json({ error: "Message is required" });

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (req.user.role === "client") {
    const access = db.prepare("SELECT id FROM client_project_access WHERE client_id = ? AND project_id = ?").get(req.user.userId, id);
    if (!access) return res.status(403).json({ error: "Access denied" });
  }

  const msgId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO client_portal_messages (id, project_id, sender_id, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(msgId, id, req.user.userId, message.trim(), now);

  audit(res, "client_message_sent", "client_portal_message", msgId, { projectId: id });
  res.status(201).json({ id: msgId });
});

export default router;
