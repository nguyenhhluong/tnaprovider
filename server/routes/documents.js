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

function clientHasProjectAccess(db, clientId, projectId) {
  if (!projectId) return false;

  const directProject = db.prepare(
    "SELECT id FROM projects WHERE id = ? AND client_id = ?"
  ).get(projectId, clientId);

  if (directProject) return true;

  const assignedProject = db.prepare(
    "SELECT id FROM client_project_access WHERE project_id = ? AND client_id = ?"
  ).get(projectId, clientId);

  return Boolean(assignedProject);
}

function clientCanAccessDocument(db, clientId, doc) {
  if (!doc || doc.visibility !== "client") return false;

  if (doc.entity_type === "project") {
    return clientHasProjectAccess(db, clientId, doc.entity_id);
  }

  if (doc.entity_type === "client") {
    return doc.entity_id === clientId;
  }

  if (doc.entity_type === "quote") {
    const quote = db.prepare(`
      SELECT qr.project_id
      FROM quotes q
      LEFT JOIN quote_requests qr ON qr.id = q.quote_request_id
      WHERE q.id = ?
    `).get(doc.entity_id);

    return quote?.project_id
      ? clientHasProjectAccess(db, clientId, quote.project_id)
      : false;
  }

  return false;
}

// Document Folders
router.get("/folders", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const folders = db.prepare("SELECT * FROM document_folders ORDER BY name ASC").all();
  res.json(folders);
});

router.post("/folders", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { name, entity_type, entity_id } = req.body;
  if (!name || !entity_type) return res.status(400).json({ error: "name and entity_type are required" });
  const validTypes = ["lead", "project", "quote", "client", "general"];
  if (!validTypes.includes(entity_type)) return res.status(400).json({ error: "Invalid entity_type" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO document_folders (id, name, entity_type, entity_id, created_by) VALUES (?, ?, ?, ?, ?)").run(id, name, entity_type, entity_id || null, req.user.userId);
  res.status(201).json({ id });
});

// Documents
router.get("/", (req, res) => {
  const db = getDb();
  const { entity_type, entity_id, folder_id } = req.query;

  if (!isManagement(req.user)) {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Client: fetch all client-visible documents, then filter by project/entity access
    const rows = db.prepare(`
      SELECT d.*, u.name as uploaded_by_name, df.name as folder_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN document_folders df ON df.id = d.folder_id
      WHERE d.visibility = 'client'
      ORDER BY d.created_at DESC
    `).all();

    const documents = rows.filter((doc) =>
      clientCanAccessDocument(db, req.user.userId, doc)
    );

    return res.json(documents);
  }

  let sql = `SELECT d.*, u.name as uploaded_by_name, df.name as folder_name 
    FROM documents d 
    LEFT JOIN users u ON u.id = d.uploaded_by 
    LEFT JOIN document_folders df ON df.id = d.folder_id 
    WHERE 1=1`;
  const params = [];
  if (entity_type) { sql += " AND d.entity_type = ?"; params.push(entity_type); }
  if (entity_id) { sql += " AND d.entity_id = ?"; params.push(entity_id); }
  if (folder_id) { sql += " AND d.folder_id = ?"; params.push(folder_id); }
  sql += " ORDER BY d.created_at DESC";
  const documents = db.prepare(sql).all(...params);
  res.json(documents);
});

router.post("/", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { folder_id, entity_type, entity_id, title, description, file_url, file_name, file_type, file_size, visibility } = req.body;
  if (!title || !entity_type) return res.status(400).json({ error: "title and entity_type are required" });
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO documents (id, folder_id, entity_type, entity_id, title, description, file_url, file_name, file_type, file_size, visibility, uploaded_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, folder_id || null, entity_type, entity_id || null, title, description || null, file_url || null, file_name || null, file_type || null, file_size || null, visibility || 'internal', req.user.userId);
  audit(res, "document_created", "document", id, { title, entity_type, visibility });
  res.status(201).json({ id });
});

// Proposal routes must be defined before /:id document routes
router.get("/proposal-templates", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const templates = db.prepare("SELECT * FROM proposal_templates ORDER BY name ASC").all();
  res.json(templates);
});

router.post("/proposal-templates", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { name, description, body, content } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO proposal_templates (id, name, description, body, created_by) VALUES (?, ?, ?, ?, ?)").run(id, name, description || null, body ?? content ?? null, req.user.userId);
  res.status(201).json({ id });
});

router.get("/proposals", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const proposals = db.prepare(`SELECT pv.*, pt.name as template_name, q.quote_number, q.title as quote_title 
    FROM proposal_versions pv 
    LEFT JOIN proposal_templates pt ON pt.id = pv.template_id 
    LEFT JOIN quotes q ON q.id = pv.quote_id 
    ORDER BY pv.created_at DESC`).all();
  res.json(proposals);
});

router.post("/proposals", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { quote_id, template_id, title, body, content } = req.body;
  if (!quote_id || !title) return res.status(400).json({ error: "quote_id and title are required" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO proposal_versions (id, quote_id, template_id, title, body, created_by) VALUES (?, ?, ?, ?, ?, ?)").run(id, quote_id, template_id || null, title, body ?? content ?? null, req.user.userId);
  audit(res, "proposal_created", "proposal_version", id, { quote_id, title });
  res.status(201).json({ id });
});

router.get("/proposals/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const proposal = db.prepare(`SELECT pv.*, pt.name as template_name, q.quote_number, q.title as quote_title, q.subtotal, q.gst, q.total 
    FROM proposal_versions pv 
    LEFT JOIN proposal_templates pt ON pt.id = pv.template_id 
    LEFT JOIN quotes q ON q.id = pv.quote_id 
    WHERE pv.id = ?`).get(req.params.id);
  if (!proposal) return res.status(404).json({ error: "Proposal not found" });
  res.json(proposal);
});

router.patch("/proposals/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { title, body, status } = req.body;
  const sets = []; const vals = [];
  if (title) { sets.push("title = ?"); vals.push(title); }
  if (body !== undefined) { sets.push("body = ?"); vals.push(body); }
  if (status) { sets.push("status = ?"); vals.push(status); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE proposal_versions SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "proposal_updated", "proposal_version", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const doc = db.prepare(`SELECT d.*, u.name as uploaded_by_name, df.name as folder_name 
    FROM documents d 
    LEFT JOIN users u ON u.id = d.uploaded_by 
    LEFT JOIN document_folders df ON df.id = d.folder_id 
    WHERE d.id = ?`).get(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (!isManagement(req.user)) {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!clientCanAccessDocument(db, req.user.userId, doc)) {
      return res.status(403).json({ error: "Access denied" });
    }
  }
  res.json(doc);
});

router.patch("/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { title, description, visibility, file_url, file_name, file_type, file_size } = req.body;
  const sets = []; const vals = [];
  if (title) { sets.push("title = ?"); vals.push(title); }
  if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
  if (visibility) { sets.push("visibility = ?"); vals.push(visibility); }
  if (file_url !== undefined) { sets.push("file_url = ?"); vals.push(file_url); }
  if (file_name !== undefined) { sets.push("file_name = ?"); vals.push(file_name); }
  if (file_type !== undefined) { sets.push("file_type = ?"); vals.push(file_type); }
  if (file_size !== undefined) { sets.push("file_size = ?"); vals.push(file_size); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "document_updated", "document", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

router.delete("/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
  audit(res, "document_deleted", "document", req.params.id, {});
  res.json({ success: true });
});

export default router;
