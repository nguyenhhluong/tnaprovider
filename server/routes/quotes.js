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

const MANAGEMENT_ROLES = ["owner", "admin", "manager"];

function isManagement(user) {
  return MANAGEMENT_ROLES.includes(user?.role);
}

function audit(res, action, entityType, entityId, metadata) {
  createAuditLog({
    userId: res.req.user.userId,
    action,
    entityType,
    entityId,
    metadata,
    ip: res.req.ip,
    userAgent: res.req.headers["user-agent"]
  });
}

// Quote Requests
router.get("/requests", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const requests = db.prepare("SELECT qr.*, l.name as lead_name, p.title as project_title FROM quote_requests qr LEFT JOIN leads l ON l.id = qr.lead_id LEFT JOIN projects p ON p.id = qr.project_id ORDER BY qr.created_at DESC").all();
  res.json(requests);
});

router.post("/requests", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { lead_id, project_id, title, scope, location, budget, target_date } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO quote_requests (id, lead_id, project_id, title, scope, location, budget, target_date, requested_by, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, lead_id || null, project_id || null, title, scope || null, location || null, budget || null, target_date || null, req.user.userId, req.user.userId);
  audit(res, "quote_request_created", "quote_request", id, { title });
  res.status(201).json({ id });
});

router.get("/requests/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const request = db.prepare("SELECT qr.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone, l.company as lead_company, p.title as project_title FROM quote_requests qr LEFT JOIN leads l ON l.id = qr.lead_id LEFT JOIN projects p ON p.id = qr.project_id WHERE qr.id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ error: "Quote request not found" });
  res.json(request);
});

router.patch("/requests/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { title, scope, location, budget, target_date, status } = req.body;
  if (!title && !scope && !location && budget === undefined && !target_date && !status) return res.status(400).json({ error: "No fields to update" });
  const sets = []; const vals = [];
  if (title) { sets.push("title = ?"); vals.push(title); }
  if (scope !== undefined) { sets.push("scope = ?"); vals.push(scope); }
  if (location !== undefined) { sets.push("location = ?"); vals.push(location); }
  if (budget !== undefined) { sets.push("budget = ?"); vals.push(budget); }
  if (target_date !== undefined) { sets.push("target_date = ?"); vals.push(target_date); }
  if (status) { sets.push("status = ?"); vals.push(status); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE quote_requests SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "quote_request_updated", "quote_request", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

// Quotes
router.get("/", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quotes = db.prepare("SELECT q.*, qr.title as request_title, l.name as lead_name FROM quotes q LEFT JOIN quote_requests qr ON qr.id = q.quote_request_id LEFT JOIN leads l ON l.id = qr.lead_id ORDER BY q.created_at DESC").all();
  res.json(quotes);
});

router.post("/", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { quote_request_id, title, scope, valid_until } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = crypto.randomUUID();
  // Generate sequential quote number
  const count = db.prepare("SELECT COUNT(*) as c FROM quotes").get().c;
  const quote_number = `QT-${String(count + 1).padStart(5, '0')}`;
  db.prepare("INSERT INTO quotes (id, quote_request_id, quote_number, title, scope, valid_until, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, quote_request_id || null, quote_number, title, scope || null, valid_until || null, req.user.userId);
  // Log status history
  db.prepare("INSERT INTO quote_status_history (id, quote_id, new_status, changed_by) VALUES (?, ?, 'draft', ?)").run(crypto.randomUUID(), id, req.user.userId);
  audit(res, "quote_created", "quote", id, { quote_number, title });
  res.status(201).json({ id, quote_number });
});

router.get("/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quote = db.prepare("SELECT q.*, qr.title as request_title, l.name as lead_name, l.email as lead_email, l.phone as lead_phone, l.company as lead_company FROM quotes q LEFT JOIN quote_requests qr ON qr.id = q.quote_request_id LEFT JOIN leads l ON l.id = qr.lead_id WHERE q.id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  const items = db.prepare("SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order ASC").all(req.params.id);
  const history = db.prepare("SELECT * FROM quote_status_history WHERE quote_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ ...quote, items, history });
});

router.patch("/:id", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { title, scope, valid_until } = req.body;
  if (!title && scope === undefined && valid_until === undefined) return res.status(400).json({ error: "No fields to update" });
  const sets = []; const vals = [];
  if (title) { sets.push("title = ?"); vals.push(title); }
  if (scope !== undefined) { sets.push("scope = ?"); vals.push(scope); }
  if (valid_until !== undefined) { sets.push("valid_until = ?"); vals.push(valid_until); }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    db.prepare(`UPDATE quotes SET ${sets.join(", ")} WHERE id = ?`).run(...vals, req.params.id);
    audit(res, "quote_updated", "quote", req.params.id, { changes: sets });
  }
  res.json({ success: true });
});

// Quote Items
router.post("/:id/items", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { description, quantity, unit, unit_price } = req.body;
  if (!description || unit_price === undefined) return res.status(400).json({ error: "description and unit_price are required" });
  const qty = quantity || 1;
  const price = Number(unit_price);
  const total = qty * price;
  const itemId = crypto.randomUUID();
  const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM quote_items WHERE quote_id = ?").get(req.params.id).m;
  db.prepare("INSERT INTO quote_items (id, quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(itemId, req.params.id, description, qty, unit || 'each', price, total, maxSort + 1);
  // Recalc quote totals
  recalcQuoteTotals(db, req.params.id);
  audit(res, "quote_item_added", "quote_item", itemId, { quoteId: req.params.id });
  res.status(201).json({ id: itemId });
});

router.patch("/:id/items/:itemId", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const { description, quantity, unit, unit_price } = req.body;
  const sets = []; const vals = [];
  if (description) { sets.push("description = ?"); vals.push(description); }
  if (quantity !== undefined) { sets.push("quantity = ?"); vals.push(quantity); }
  if (unit) { sets.push("unit = ?"); vals.push(unit); }
  if (unit_price !== undefined) { sets.push("unit_price = ?"); vals.push(unit_price); }
  if (sets.length > 0) {
    // Recalculate total for this item
    const item = db.prepare("SELECT quantity, unit_price FROM quote_items WHERE id = ? AND quote_id = ?").get(req.params.itemId, req.params.id);
    if (item) {
      const qty = quantity !== undefined ? quantity : item.quantity;
      const price = unit_price !== undefined ? unit_price : item.unit_price;
      sets.push("total = ?"); vals.push(Number(qty) * Number(price));
    }
    db.prepare(`UPDATE quote_items SET ${sets.join(", ")} WHERE id = ? AND quote_id = ?`).run(...vals, req.params.itemId, req.params.id);
    recalcQuoteTotals(db, req.params.id);
    audit(res, "quote_item_updated", "quote_item", req.params.itemId, { quoteId: req.params.id });
  }
  res.json({ success: true });
});

router.delete("/:id/items/:itemId", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  db.prepare("DELETE FROM quote_items WHERE id = ? AND quote_id = ?").run(req.params.itemId, req.params.id);
  recalcQuoteTotals(db, req.params.id);
  audit(res, "quote_item_deleted", "quote_item", req.params.itemId, { quoteId: req.params.id });
  res.json({ success: true });
});

// Quote Status Actions
router.patch("/:id/send", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quote = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (quote.status !== 'draft') return res.status(400).json({ error: "Only draft quotes can be sent" });
  const oldStatus = quote.status;
  const now = new Date().toISOString();
  db.prepare("UPDATE quotes SET status = 'sent', updated_at = ? WHERE id = ?").run(now, req.params.id);
  db.prepare("INSERT INTO quote_status_history (id, quote_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), req.params.id, oldStatus, 'sent', req.user.userId, 'Quote sent (mock)');
  audit(res, "quote_sent_mock", "quote", req.params.id, {});
  res.json({ success: true });
});

router.patch("/:id/accept", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quote = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (quote.status !== 'sent') return res.status(400).json({ error: "Only sent quotes can be accepted" });
  const oldStatus = quote.status;
  const now = new Date().toISOString();
  db.prepare("UPDATE quotes SET status = 'accepted', accepted_by = ?, accepted_at = ?, updated_at = ? WHERE id = ?").run(req.user.userId, now, now, req.params.id);
  db.prepare("INSERT INTO quote_status_history (id, quote_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), req.params.id, oldStatus, 'accepted', req.user.userId);
  audit(res, "quote_accepted", "quote", req.params.id, {});
  res.json({ success: true });
});

router.patch("/:id/reject", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quote = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (!['sent','draft'].includes(quote.status)) return res.status(400).json({ error: "Cannot reject this quote" });
  const oldStatus = quote.status;
  const now = new Date().toISOString();
  db.prepare("UPDATE quotes SET status = 'rejected', updated_at = ? WHERE id = ?").run(now, req.params.id);
  db.prepare("INSERT INTO quote_status_history (id, quote_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), req.params.id, oldStatus, 'rejected', req.user.userId);
  audit(res, "quote_rejected", "quote", req.params.id, {});
  res.json({ success: true });
});

router.post("/:id/convert-to-project", (req, res) => {
  if (!isManagement(req.user)) return res.status(403).json({ error: "Access denied" });
  const db = getDb();
  const quote = db.prepare("SELECT q.*, qr.lead_id, qr.project_id as existing_project_id FROM quotes q LEFT JOIN quote_requests qr ON qr.id = q.quote_request_id WHERE q.id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Quote not found" });
  if (quote.status !== 'accepted') return res.status(400).json({ error: "Only accepted quotes can be converted to projects" });
  
  // Get lead for client info
  const lead = quote.lead_id ? db.prepare("SELECT * FROM leads WHERE id = ?").get(quote.lead_id) : null;
  
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  db.prepare("INSERT INTO projects (id, title, client_name, status, sector, budget, start_date, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)").run(
    projectId, quote.title, lead?.name || quote.title, lead?.project_type || null, quote.total || 0, now, now, now
  );
  
  // Update quote status
  db.prepare("UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ?").run(now, req.params.id);
  db.prepare("INSERT INTO quote_status_history (id, quote_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), req.params.id, 'accepted', 'converted', req.user.userId);
  
  // Update quote request status
  if (quote.quote_request_id) {
    db.prepare("UPDATE quote_requests SET status = 'converted', updated_at = ? WHERE id = ?").run(now, quote.quote_request_id);
  }
  
  // Update lead status
  if (quote.lead_id) {
    db.prepare("UPDATE leads SET status = 'won', updated_at = ? WHERE id = ?").run(now, quote.lead_id);
  }
  
  audit(res, "quote_converted_to_project", "project", projectId, { quoteId: req.params.id, quoteNumber: quote.quote_number });
  res.status(201).json({ id: projectId });
});

// Helper: recalculate quote subtotal, gst, total
function recalcQuoteTotals(db, quoteId) {
  const items = db.prepare("SELECT total FROM quote_items WHERE quote_id = ?").all(quoteId);
  const subtotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
  const gst = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + gst;
  db.prepare("UPDATE quotes SET subtotal = ?, gst = ?, total = ? WHERE id = ?").run(subtotal, gst, total, quoteId);
}

export default router;
