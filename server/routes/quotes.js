import { Router } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { getDb } from "../db/database.js";

const require2 = createRequire(import.meta.url);
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";
import { createAuditLog } from "../middleware/audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

const MANAGEMENT = ["owner", "admin", "manager"];
const ALLOWED_TYPES = ["labour", "material", "subcontractor", "equipment", "travel", "allowance", "other"];
const VALID_STATUSES = ["draft", "in_review", "approved", "sent", "accepted", "rejected", "expired", "converted"];

function isMgmt(u) { return MANAGEMENT.includes(u?.role); }
function audit(res, action, entityType, entityId, metadata) {
  createAuditLog({ userId: res.req.user.userId, action, entityType, entityId, metadata, ip: res.req.ip, userAgent: res.req.headers["user-agent"] });
}

function generateQuoteNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const max = db.prepare("SELECT MAX(CAST(SUBSTR(quote_number, ?) AS INTEGER)) as max_num FROM quotes WHERE quote_number LIKE ?").get(prefix.length + 1, `${prefix}%`);
  let next = (max?.max_num || 0) + 1;
  let attempts = 0;
  while (attempts < 100) {
    const num = `QT-${year}-${String(next).padStart(5, "0")}`;
    const existing = db.prepare("SELECT id FROM quotes WHERE quote_number = ?").get(num);
    if (!existing) return num;
    next++;
    attempts++;
  }
  throw new Error("Could not generate unique quote number");
}

function addReviewEvent(db, quoteId, fromStatus, toStatus, note, userId) {
  db.prepare("INSERT INTO quote_review_events (id, quote_id, from_status, to_status, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), quoteId, fromStatus || null, toStatus, note || null, userId);
}

function calcLineItem(item) {
  const qty = Number(item.quantity) || 1;
  const unitPrice = item.unit_price !== undefined ? Number(item.unit_price) : (Number(item.unit_cost) || 0);
  const markup = Number(item.markup_percent) || 0;
  const effectiveUnitPrice = unitPrice * (1 + markup / 100);
  const lineSubtotal = qty * effectiveUnitPrice;
  const discPct = Number(item.discount_percent) || 0;
  const lineDiscount = lineSubtotal * (discPct / 100);
  const taxRate = item.taxable ? (Number(item.tax_rate) || 0.10) : 0;
  const lineTax = (lineSubtotal - lineDiscount) * taxRate;
  return { subtotal: round(lineSubtotal), discount: round(lineDiscount), tax: round(lineTax), total: round(lineSubtotal - lineDiscount + lineTax), effectiveUnitPrice: round(effectiveUnitPrice) };
}

function round(v) { return Math.round(v * 100) / 100; }

function recalcQuoteTotals(db, quoteId) {
  const items = db.prepare("SELECT * FROM quote_items WHERE quote_id = ?").all(quoteId);
  let subtotal = 0, gst = 0, total = 0;
  for (const item of items) {
    const calc = calcLineItem(item);
    subtotal += calc.subtotal - calc.discount;
    gst += calc.tax;
    total += calc.total;
  }
  const q = db.prepare("SELECT discount_type, discount_value FROM quotes WHERE id = ?").get(quoteId);
  let discTotal = 0;
  if (q?.discount_type === "percentage") discTotal = round(subtotal * (Number(q.discount_value) || 0) / 100);
  else if (q?.discount_type === "fixed") discTotal = Number(q.discount_value) || 0;
  const finalTotal = round(subtotal - discTotal + gst);
  db.prepare("UPDATE quotes SET subtotal = ?, gst = ?, discount_total = ?, total = ? WHERE id = ?").run(round(subtotal), round(gst), round(discTotal), finalTotal, quoteId);
  return { subtotal: round(subtotal), gst: round(gst), discount: round(discTotal), total: finalTotal };
}

function getFullQuote(db, quoteId) {
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(quoteId);
  if (!quote) return null;
  const sections = db.prepare("SELECT * FROM quote_sections WHERE quote_id = ? ORDER BY sort_order ASC").all(quoteId);
  const items = db.prepare("SELECT qi.* FROM quote_items qi WHERE qi.quote_id = ? ORDER BY qi.sort_order ASC").all(quoteId);
  const reviewEvents = db.prepare("SELECT qre.*, u.name as changed_by_name FROM quote_review_events qre LEFT JOIN users u ON u.id = qre.changed_by WHERE qre.quote_id = ? ORDER BY qre.created_at DESC").all(quoteId);
  const documents = db.prepare("SELECT * FROM quote_documents WHERE quote_id = ? ORDER BY created_at DESC").all(quoteId);
  return { ...quote, sections, items, reviewEvents, documents };
}

// ── Quote listing ────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const { status, search, limit, offset } = req.query;
    let where = ["1=1"]; let params = [];
    if (status && VALID_STATUSES.includes(status)) { where.push("q.status = ?"); params.push(status); }
    if (search) { where.push("(q.client_name LIKE ? OR q.client_email LIKE ? OR q.project_name LIKE ? OR q.quote_number LIKE ?)"); const s = `%${search}%`; params.push(s, s, s, s); }
    const w = where.join(" AND ");
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM quotes q WHERE ${w}`).get(...params).cnt;
    const rows = db.prepare(`SELECT q.*, u.name as created_by_name FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE ${w} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`).all(...params, Math.min(parseInt(limit) || 50, 200), parseInt(offset) || 0);
    const summary = db.prepare(`SELECT status, COUNT(*) as cnt FROM quotes GROUP BY status`).all();
    const summaryObj = {}; summary.forEach(s => summaryObj[s.status] = s.cnt);
    res.json({ quotes: rows, total, summary: summaryObj, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 });
  } catch (err) { console.error("Error listing quotes:", err.message); res.status(500).json({ error: "Failed to list quotes" }); }
});

// ── Create quote atomically ──────────────────────────────────
router.post("/", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const { template_id, sections, items, ...fields } = req.body;
    if (!fields.title && !fields.project_name) return res.status(400).json({ error: "title or project_name is required" });

    // Validate nested items before transaction
    const allItems = [];
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        if (Array.isArray(sec.items)) allItems.push(...sec.items);
      }
    }
    if (Array.isArray(items)) allItems.push(...items);
    for (const item of allItems) {
      if (!item.description && !item.name) { return res.status(400).json({ error: "Each item must have a description or name" }); }
      if (item.quantity !== undefined && Number(item.quantity) < 0) { return res.status(400).json({ error: `Negative quantity not allowed for item: ${item.description || item.name}` }); }
      if (item.unit_cost !== undefined && Number(item.unit_cost) < 0) { return res.status(400).json({ error: `Negative unit cost not allowed for item: ${item.description || item.name}` }); }
      if (item.unit_price !== undefined && Number(item.unit_price) < 0) { return res.status(400).json({ error: `Negative unit price not allowed for item: ${item.description || item.name}` }); }
      if (item.item_type && !ALLOWED_TYPES.includes(item.item_type)) { return res.status(400).json({ error: `Invalid item type: ${item.item_type} for item: ${item.description || item.name}` }); }
      if (item.discount_percent !== undefined && (Number(item.discount_percent) < 0 || Number(item.discount_percent) > 100)) { return res.status(400).json({ error: `Discount percent must be 0-100 for item: ${item.description || item.name}` }); }
      if (item.markup_percent !== undefined && !Number.isFinite(Number(item.markup_percent))) { return res.status(400).json({ error: `Invalid markup percent for item: ${item.description || item.name}` }); }
    }

    const id = crypto.randomUUID();
    const quoteNumber = generateQuoteNumber(db);
    const now = new Date().toISOString();

    const createTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO quotes (id, quote_number, title, client_name, client_email, client_phone, client_company, client_address, project_name, project_location, scope, quote_date, valid_until, currency, tax_rate, terms, payment_terms, inclusions, exclusions, warranty, notes, internal_notes, status, review_status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?, ?)
      `).run(id, quoteNumber, fields.title || fields.project_name || "", fields.client_name || null, fields.client_email || null, fields.client_phone || null, fields.client_company || null, fields.client_address || null, fields.project_name || null, fields.project_location || null, fields.scope || null, now, fields.valid_until || null, fields.currency || "AUD", 0.10, fields.terms || null, fields.payment_terms || null, fields.inclusions || null, fields.exclusions || null, fields.warranty || null, fields.notes || null, null, req.user.userId, now, now);

      addReviewEvent(db, id, null, "draft", "Quote created", req.user.userId);

      if (template_id) {
        const tplItems = db.prepare("SELECT * FROM quote_template_items WHERE template_id = ? ORDER BY sort_order").all(template_id);
        const sectionsByTitle = {};
        for (const ti of tplItems) {
          if (!sectionsByTitle[ti.section_title]) {
            const secId = crypto.randomUUID();
            db.prepare("INSERT INTO quote_sections (id, quote_id, title, sort_order) VALUES (?, ?, ?, ?)").run(secId, id, ti.section_title, Object.keys(sectionsByTitle).length);
            sectionsByTitle[ti.section_title] = secId;
          }
          db.prepare("INSERT INTO quote_items (id, quote_id, section_id, name, description, quantity, unit, item_type, unit_price, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)").run(crypto.randomUUID(), id, sectionsByTitle[ti.section_title], ti.description, ti.description, ti.unit || "each", ti.item_type || "material", ti.unit_price, Object.keys(sectionsByTitle).length);
        }
      }

      if (Array.isArray(sections)) {
        for (const sec of sections) {
          const secId = crypto.randomUUID();
          db.prepare("INSERT INTO quote_sections (id, quote_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)").run(secId, id, sec.title || "Section", sec.description || null, sec.sort_order || 0);
          if (Array.isArray(sec.items)) {
            for (const item of sec.items) {
              db.prepare("INSERT INTO quote_items (id, quote_id, section_id, name, description, quantity, unit, item_type, unit_cost, unit_price, markup_percent, discount_percent, tax_rate, taxable, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), id, secId, item.name || item.description || "", item.description || "", item.quantity || 1, item.unit || "each", item.item_type || "material", item.unit_cost || 0, item.unit_price !== undefined ? item.unit_price : (item.unit_cost || 0), item.markup_percent || 0, item.discount_percent || 0, item.tax_rate || 0.10, item.taxable !== false ? 1 : 0, item.sort_order || 0, item.notes || null);
            }
          }
        }
      }

      if (Array.isArray(items)) {
        for (const item of items) {
          db.prepare("INSERT INTO quote_items (id, quote_id, name, description, quantity, unit, item_type, unit_cost, unit_price, markup_percent, discount_percent, tax_rate, taxable, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), id, item.name || item.description || "", item.description || "", item.quantity || 1, item.unit || "each", item.item_type || "material", item.unit_cost || 0, item.unit_price !== undefined ? item.unit_price : (item.unit_cost || 0), item.markup_percent || 0, item.discount_percent || 0, item.tax_rate || 0.10, item.taxable !== false ? 1 : 0, item.sort_order || 0, item.notes || null);
        }
      }

      recalcQuoteTotals(db, id);
    });

    createTransaction();
    audit(res, "quote_created", "quote", id, { quoteNumber });
    const quote = getFullQuote(db, id);
    res.status(201).json(quote);
  } catch (err) { console.error("Error creating quote:", err.message); res.status(500).json({ error: "Failed to create quote" }); }
});

// ── Get quote ────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const quote = getFullQuote(db, req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  } catch (err) { console.error("Error getting quote:", err.message); res.status(500).json({ error: "Failed to get quote" }); }
});

// ── Update quote header ──────────────────────────────────────
router.patch("/:id", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    if (!["draft", "in_review"].includes(quote.status)) return res.status(400).json({ error: "Only draft or in-review quotes can be edited" });

    const allowed = ["title", "client_name", "client_email", "client_phone", "client_company", "client_address", "project_name", "project_location", "scope", "quote_date", "valid_until", "currency", "tax_rate", "discount_type", "discount_value", "terms", "payment_terms", "inclusions", "exclusions", "warranty", "notes", "internal_notes"];
    const sets = []; const vals = [];
    for (const field of allowed) {
      if (req.body[field] !== undefined) { sets.push(`${field} = ?`); vals.push(req.body[field]); }
    }
    if (req.body.discount_type === "none") { sets.push("discount_value = ?"); vals.push(0); }

    if (sets.length > 0) {
      sets.push("updated_at = ?");
      vals.push(new Date().toISOString());
      vals.push(req.params.id);
      db.prepare(`UPDATE quotes SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      recalcQuoteTotals(db, req.params.id);
      audit(res, "quote_updated", "quote", req.params.id, { changes: sets });
    }
    const updated = getFullQuote(db, req.params.id);
    res.json(updated);
  } catch (err) { console.error("Error updating quote:", err.message); res.status(500).json({ error: "Failed to update quote" }); }
});

// ── Sections CRUD ────────────────────────────────────────────
router.post("/:id/sections", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (!["draft", "in_review"].includes(q.status)) return res.status(400).json({ error: "Only draft/in_review quotes can be edited" });
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const id = crypto.randomUUID();
    const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM quote_sections WHERE quote_id = ?").get(req.params.id).m;
    db.prepare("INSERT INTO quote_sections (id, quote_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)").run(id, req.params.id, title, description || null, maxSort + 1);
    res.status(201).json({ id });
  } catch (err) { console.error("Error creating section:", err.message); res.status(500).json({ error: "Failed to create section" }); }
});

router.patch("/:id/sections/:sectionId", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (!["draft", "in_review"].includes(q.status)) return res.status(400).json({ error: "Only draft/in_review quotes can be edited" });
    const { title, description, sort_order } = req.body;
    const sets = []; const vals = [];
    if (title !== undefined) { sets.push("title = ?"); vals.push(title); }
    if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
    if (sort_order !== undefined) { sets.push("sort_order = ?"); vals.push(sort_order); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now')");
      vals.push(req.params.sectionId);
      db.prepare(`UPDATE quote_sections SET ${sets.join(", ")} WHERE id = ? AND quote_id = ?`).run(...vals, req.params.id);
    }
    res.json({ success: true });
  } catch (err) { console.error("Error updating section:", err.message); res.status(500).json({ error: "Failed to update section" }); }
});

router.delete("/:id/sections/:sectionId", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    db.prepare("DELETE FROM quote_items WHERE section_id = ? AND quote_id = ?").run(req.params.sectionId, req.params.id);
    db.prepare("DELETE FROM quote_sections WHERE id = ? AND quote_id = ?").run(req.params.sectionId, req.params.id);
    recalcQuoteTotals(db, req.params.id);
    res.json({ success: true });
  } catch (err) { console.error("Error deleting section:", err.message); res.status(500).json({ error: "Failed to delete section" }); }
});

// ── Items CRUD ───────────────────────────────────────────────
router.post("/:id/items", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (!["draft", "in_review"].includes(q.status)) return res.status(400).json({ error: "Only draft/in_review quotes can be edited" });
    const { section_id, name, description, quantity, unit, item_type, unit_cost, unit_price, markup_percent, discount_percent, tax_rate, taxable, notes } = req.body;
    if (!description && !name) return res.status(400).json({ error: "description or name is required" });

    if (quantity !== undefined && Number(quantity) < 0) return res.status(400).json({ error: "negative quantity not allowed" });
    if (item_type && !ALLOWED_TYPES.includes(item_type)) return res.status(400).json({ error: `Invalid item type: ${item_type}` });

    const itemId = crypto.randomUUID();
    const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM quote_items WHERE quote_id = ?").get(req.params.id).m;
    const effectivePrice = unit_price !== undefined ? Number(unit_price) : (Number(unit_cost) || 0);
    db.prepare("INSERT INTO quote_items (id, quote_id, section_id, name, description, quantity, unit, item_type, unit_cost, unit_price, markup_percent, discount_percent, tax_rate, taxable, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(itemId, req.params.id, section_id || null, name || description || "", description || "", quantity || 1, unit || "each", item_type || "material", unit_cost || 0, effectivePrice, markup_percent || 0, discount_percent || 0, tax_rate ?? 0.10, taxable !== false ? 1 : 0, maxSort + 1, notes || null);
    recalcQuoteTotals(db, req.params.id);
    res.status(201).json({ id: itemId });
  } catch (err) { console.error("Error creating item:", err.message); res.status(500).json({ error: "Failed to create item" }); }
});

router.patch("/:id/items/:itemId", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT status FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (!["draft", "in_review"].includes(q.status)) return res.status(400).json({ error: "Only draft/in_review quotes can be edited" });
    if (req.body.quantity !== undefined && Number(req.body.quantity) < 0) return res.status(400).json({ error: "negative quantity not allowed" });
    if (req.body.item_type && !ALLOWED_TYPES.includes(req.body.item_type)) return res.status(400).json({ error: `Invalid item type: ${req.body.item_type}` });

    const allowed = ["section_id", "name", "description", "quantity", "unit", "item_type", "unit_cost", "unit_price", "markup_percent", "discount_percent", "tax_rate", "taxable", "sort_order", "notes"];
    const sets = []; const vals = [];
    for (const field of allowed) {
      if (req.body[field] !== undefined) { sets.push(`${field} = ?`); vals.push(req.body[field]); }
    }
    if (sets.length > 0) {
      vals.push(req.params.itemId, req.params.id);
      db.prepare(`UPDATE quote_items SET ${sets.join(", ")} WHERE id = ? AND quote_id = ?`).run(...vals);
      recalcQuoteTotals(db, req.params.id);
    }
    res.json({ success: true });
  } catch (err) { console.error("Error updating item:", err.message); res.status(500).json({ error: "Failed to update item" }); }
});

router.delete("/:id/items/:itemId", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    db.prepare("DELETE FROM quote_items WHERE id = ? AND quote_id = ?").run(req.params.itemId, req.params.id);
    recalcQuoteTotals(db, req.params.id);
    res.json({ success: true });
  } catch (err) { console.error("Error deleting item:", err.message); res.status(500).json({ error: "Failed to delete item" }); }
});

router.post("/:id/items/reorder", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) return res.status(400).json({ error: "itemIds array required" });
    const update = db.prepare("UPDATE quote_items SET sort_order = ? WHERE id = ? AND quote_id = ?");
    itemIds.forEach((id, idx) => update.run(idx, id, req.params.id));
    res.json({ success: true });
  } catch (err) { console.error("Error reordering items:", err.message); res.status(500).json({ error: "Failed to reorder items" }); }
});

// ── Review workflow ──────────────────────────────────────────
router.post("/:id/submit-review", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "draft") return res.status(400).json({ error: "Only draft quotes can be submitted for review" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'in_review', review_status = 'in_review', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, "draft", "in_review", req.body.note || null, req.user.userId);
    audit(res, "quote_submitted_review", "quote", req.params.id, {});
    res.json({ success: true, status: "in_review" });
  } catch (err) { console.error("Error submitting review:", err.message); res.status(500).json({ error: "Failed to submit for review" }); }
});

router.post("/:id/approve", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "in_review") return res.status(400).json({ error: "Only in-review quotes can be approved" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'approved', review_status = 'approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?").run(req.user.userId, now, now, req.params.id);
    addReviewEvent(db, req.params.id, "in_review", "approved", req.body.note || null, req.user.userId);
    audit(res, "quote_approved", "quote", req.params.id, {});
    res.json({ success: true, status: "approved" });
  } catch (err) { console.error("Error approving quote:", err.message); res.status(500).json({ error: "Failed to approve quote" }); }
});

router.post("/:id/reject-review", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "in_review") return res.status(400).json({ error: "Only in-review quotes can be rejected" });
    if (!req.body.note) return res.status(400).json({ error: "Rejection note is required" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'draft', review_status = 'draft', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, "in_review", "draft", req.body.note, req.user.userId);
    audit(res, "quote_review_rejected", "quote", req.params.id, { note: req.body.note });
    res.json({ success: true, status: "draft" });
  } catch (err) { console.error("Error rejecting review:", err.message); res.status(500).json({ error: "Failed to reject review" }); }
});

// ── Shared PDF Generation ────────────────────────────────────
async function generateQuotePdf(db, quoteId, userId) {
  const quote = getFullQuote(db, quoteId);
  if (!quote) throw new Error("Quote not found");

  const PDFDocument = require2("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const pdfDir = path.join(__dirname, "..", "..", "data", "generated", "quotes");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const fileName = `TNA-QUOTE-${quote.quote_number}-R${quote.revision_number || 1}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(22).font("Helvetica-Bold").text("TNA Provider", 50, 50);
  doc.fontSize(10).font("Helvetica").text("ABN: 00 000 000 000", 50, 78).text("Unit 6, 7-9 Gibbon St, Wetherill Park NSW 2164", 50, 92).text("info@tnaprovider.com.au", 50, 106).text("1300 000 000", 50, 120);
  doc.fontSize(14).font("Helvetica-Bold").text("QUOTE", 400, 50);
  doc.fontSize(10).font("Helvetica").text(`Quote #: ${quote.quote_number}`, 400, 70).text(`Revision: ${quote.revision_number || 1}`, 400, 84).text(`Date: ${quote.quote_date ? new Date(quote.quote_date).toLocaleDateString("en-AU") : new Date().toLocaleDateString("en-AU")}`, 400, 98).text(`Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("en-AU") : "30 days"}`, 400, 112);
  doc.moveDown(2);
  doc.fontSize(12).font("Helvetica-Bold").text("Bill To:");
  doc.fontSize(10).font("Helvetica");
  if (quote.client_name) doc.text(quote.client_name);
  if (quote.client_company) doc.text(quote.client_company);
  if (quote.client_address) doc.text(quote.client_address);
  if (quote.client_email) doc.text(quote.client_email);
  if (quote.client_phone) doc.text(quote.client_phone);
  if (quote.project_name) { doc.moveDown(0.5); doc.fontSize(12).font("Helvetica-Bold").text("Project:"); doc.fontSize(10).font("Helvetica").text(quote.project_name); if (quote.project_location) doc.text(quote.project_location); }
  if (quote.scope) { doc.moveDown(0.5); doc.fontSize(12).font("Helvetica-Bold").text("Scope of Works:"); doc.fontSize(10).font("Helvetica").text(quote.scope, { width: 495 }); }
  doc.moveDown(1);

  const tableTop = doc.y;
  const colX = { item: 50, qty: 350, unit: 390, price: 430, total: 480 };
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Description", colX.item, tableTop, { width: 300 });
  doc.text("Qty", colX.qty, tableTop, { width: 40, align: "center" });
  doc.text("Unit", colX.unit, tableTop, { width: 40, align: "center" });
  doc.text("Price", colX.price, tableTop, { width: 50, align: "right" });
  doc.text("Total", colX.total, tableTop, { width: 60, align: "right" });
  doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke("#cccccc");
  doc.fontSize(9).font("Helvetica");
  let y = doc.y + 10;

  for (const section of quote.sections || []) {
    const sectionItems = (quote.items || []).filter(i => i.section_id === section.id);
    if (sectionItems.length === 0) continue;
    doc.fontSize(10).font("Helvetica-Bold").text(section.title, 50, y);
    y = doc.y + 8;
    for (const item of sectionItems) {
      const calc = calcLineItem(item);
      if (y > 700) { doc.addPage(); y = 50; }
      doc.fontSize(9).font("Helvetica");
      doc.text(item.description || item.name || "", colX.item, y, { width: 300 });
      doc.text(String(item.quantity || 1), colX.qty, y, { width: 40, align: "center" });
      doc.text(item.unit || "each", colX.unit, y, { width: 40, align: "center" });
      doc.text(`$${round(Number(item.unit_price) || 0).toFixed(2)}`, colX.price, y, { width: 50, align: "right" });
      doc.text(`$${calc.subtotal.toFixed(2)}`, colX.total, y, { width: 60, align: "right" });
      y = doc.y + 18;
    }
  }

  y = Math.max(y + 10, doc.y + 20);
  if (y > 720) { doc.addPage(); y = 50; }
  doc.moveTo(350, y).lineTo(545, y).stroke("#cccccc"); y += 10;
  doc.fontSize(10).font("Helvetica");
  doc.text("Subtotal:", 350, y, { width: 145, align: "right" }); doc.text(`$${(quote.subtotal || 0).toFixed(2)}`, 350, y, { width: 195, align: "right" }); y += 16;
  if (quote.discount_total > 0) { doc.text("Discount:", 350, y, { width: 145, align: "right" }); doc.text(`-$${(quote.discount_total || 0).toFixed(2)}`, 350, y, { width: 195, align: "right" }); y += 16; }
  doc.text("GST:", 350, y, { width: 145, align: "right" }); doc.text(`$${(quote.gst || 0).toFixed(2)}`, 350, y, { width: 195, align: "right" }); y += 16;
  doc.moveTo(350, y).lineTo(545, y).stroke("#cccccc"); y += 10;
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("Total:", 350, y, { width: 145, align: "right" }); doc.text(`$${(quote.total || 0).toFixed(2)}`, 350, y, { width: 195, align: "right" });
  y = Math.max(y + 60, doc.y + 40);

  if (quote.terms || quote.payment_terms) { doc.fontSize(12).font("Helvetica-Bold").text("Terms & Conditions", 50, y); y = doc.y + 10; doc.fontSize(9).font("Helvetica"); if (quote.payment_terms) doc.text(`Payment Terms: ${quote.payment_terms}`, 50, y, { width: 495 }); y = doc.y + 5; if (quote.terms) doc.text(quote.terms, 50, y, { width: 495 }); y = doc.y + 15; }
  if (quote.inclusions) { doc.fontSize(10).font("Helvetica-Bold").text("Inclusions:", 50, y); y = doc.y + 5; doc.fontSize(9).font("Helvetica").text(quote.inclusions, 50, y, { width: 495 }); y = doc.y + 15; }
  if (quote.exclusions) { doc.fontSize(10).font("Helvetica-Bold").text("Exclusions:", 50, y); y = doc.y + 5; doc.fontSize(9).font("Helvetica").text(quote.exclusions, 50, y, { width: 495 }); y = doc.y + 15; }
  if (quote.warranty) { doc.fontSize(10).font("Helvetica-Bold").text("Warranty:", 50, y); y = doc.y + 5; doc.fontSize(9).font("Helvetica").text(quote.warranty, 50, y, { width: 495 }); y = doc.y + 15; }
  if (quote.notes) { doc.fontSize(10).font("Helvetica-Bold").text("Notes:", 50, y); y = doc.y + 5; doc.fontSize(9).font("Helvetica").text(quote.notes, 50, y, { width: 495 }); y = doc.y + 15; }

  y = Math.max(y + 20, doc.y + 20);
  if (y > 700) { doc.addPage(); y = 50; }
  doc.moveTo(50, y).lineTo(300, y).stroke(); y += 5;
  doc.fontSize(10).font("Helvetica-Bold").text("Acceptance of Quote", 50, y); y += 16;
  doc.fontSize(9).font("Helvetica").text("I/We accept the above quote and agree to the terms and conditions outlined.", 50, y, { width: 495 }); y += 20;
  doc.text("Signed: ______________________________", 50, y); doc.text("Date: ______________________________", 280, y); y += 20;
  doc.text("Name: ______________________________", 50, y); doc.text("Company: ______________________________", 280, y);
  doc.fontSize(8).font("Helvetica").fillColor("#999999");
  doc.text(`TNA Provider | ${quote.quote_number} | Revision ${quote.revision_number || 1}`, 50, 780, { align: "center", width: 495 });
  doc.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  const docId = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("UPDATE quotes SET pdf_file_path = ?, pdf_generated_at = ?, updated_at = ? WHERE id = ?").run(filePath, now, now, quoteId);
  db.prepare("INSERT INTO quote_documents (id, quote_id, document_type, file_name, file_path, revision_number, generated_by, generated_at) VALUES (?, ?, 'pdf', ?, ?, ?, ?, ?)").run(docId, quoteId, fileName, filePath, quote.revision_number || 1, userId, now);
  return { documentId: docId, fileName, filePath, url: `/api/quotes/${quoteId}/pdf` };
}

// ── PDF Generation ───────────────────────────────────────────
router.post("/:id/generate-pdf", async (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const result = await generateQuotePdf(db, req.params.id, req.user.userId);
    audit(res, "quote_pdf_generated", "quote", req.params.id, { fileName: result.fileName });
    res.json(result);
  } catch (err) { console.error("Error generating PDF:", err.message); res.status(500).json({ error: "Failed to generate PDF" }); }
});

// ── Download PDF ─────────────────────────────────────────────
router.get("/:id/pdf", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT pdf_file_path FROM quotes WHERE id = ?").get(req.params.id);
    if (!q?.pdf_file_path) return res.status(404).json({ error: "PDF not generated yet" });
    if (!fs.existsSync(q.pdf_file_path)) return res.status(404).json({ error: "PDF file not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(q.pdf_file_path)}"`);
    res.sendFile(q.pdf_file_path);
  } catch (err) { console.error("Error serving PDF:", err.message); res.status(500).json({ error: "Failed to serve PDF" }); }
});

async function sendQuoteStatusChangedEmail(quote, oldStatus, newStatus) {
  try {
    if (!quote.client_email) return;
    const { quoteStatusChanged } = await import('../email/templates/quoteStatusChanged.js');
    const { createEmailJob, processEmailJob } = await import('../email/emailJobService.js');

    const appUrl = process.env.APP_URL || 'https://tnaprovider.com.au';
    const quoteUrl = quote.public_token
      ? `${appUrl}/quote/${quote.public_token}`
      : `${appUrl}/platform/quotes?id=${quote.id}`;

    const emailContent = quoteStatusChanged({
      customerName: quote.client_name || 'Valued Customer',
      referenceNumber: quote.quote_number,
      oldStatus,
      newStatus,
      quoteUrl,
    });

    const jobId = createEmailJob({
      type: 'QUOTE_STATUS_CHANGED',
      recipient: quote.client_email,
      subject: emailContent.subject,
      relatedEntityType: 'quote',
      relatedEntityId: quote.id,
      payloadJson: {
        html: emailContent.html,
        text: emailContent.text,
      },
    });

    processEmailJob(jobId).catch(err => {
      console.error('[email] Failed to send quote status change email:', err.message);
    });
  } catch (err) {
    console.error('[email] Failed to create quote status change email:', err.message);
  }
}

// ── Send quote ───────────────────────────────────────────────
router.post("/:id/send", async (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "approved") return res.status(400).json({ error: "Only approved quotes can be sent" });
    const now = new Date().toISOString();
    // Auto-generate full professional PDF if missing
    if (!q.pdf_file_path) {
      await generateQuotePdf(db, req.params.id, req.user.userId);
    }
    db.prepare("UPDATE quotes SET status = 'sent', sent_at = ?, sent_to_email = ?, updated_at = ? WHERE id = ?").run(now, q.client_email || null, now, req.params.id);
    addReviewEvent(db, req.params.id, "approved", "sent", "Quote sent via system", req.user.userId);
    audit(res, "quote_sent", "quote", req.params.id, { sentTo: q.client_email });
    sendQuoteStatusChangedEmail(q, 'approved', 'sent');
    res.json({ success: true, status: "sent", sent_at: now, message: "Email sending is paused. PDF generated and quote marked as sent. Download the PDF and send manually." });
  } catch (err) { console.error("Error sending quote:", err.message); res.status(500).json({ error: "Failed to send quote" }); }
});

// ── Accept / Reject / Expire ─────────────────────────────────
router.post("/:id/accept", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "sent") return res.status(400).json({ error: "Only sent quotes can be accepted" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, "sent", "accepted", req.body.note || null, req.user.userId);
    audit(res, "quote_accepted", "quote", req.params.id, {});
    sendQuoteStatusChangedEmail(q, 'sent', 'accepted');
    res.json({ success: true, status: "accepted" });
  } catch (err) { console.error("Error accepting quote:", err.message); res.status(500).json({ error: "Failed to accept quote" }); }
});

router.post("/:id/reject", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (!["sent", "approved"].includes(q.status)) return res.status(400).json({ error: "Quote cannot be rejected in its current state" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'rejected', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, q.status, "rejected", req.body.note || null, req.user.userId);
    audit(res, "quote_rejected", "quote", req.params.id, {});
    sendQuoteStatusChangedEmail(q, q.status, 'rejected');
    res.json({ success: true, status: "rejected" });
  } catch (err) { console.error("Error rejecting quote:", err.message); res.status(500).json({ error: "Failed to reject quote" }); }
});

router.post("/:id/expire", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (["expired", "converted", "accepted", "rejected"].includes(q.status)) return res.status(400).json({ error: "Quote cannot be expired in its current state" });
    const now = new Date().toISOString();
    db.prepare("UPDATE quotes SET status = 'expired', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, q.status, "expired", req.body.note || null, req.user.userId);
    audit(res, "quote_expired", "quote", req.params.id, {});
    sendQuoteStatusChangedEmail(q, q.status, 'expired');
    res.json({ success: true, status: "expired" });
  } catch (err) { console.error("Error expiring quote:", err.message); res.status(500).json({ error: "Failed to expire quote" }); }
});

// ── Convert to project ───────────────────────────────────────
router.post("/:id/convert-to-project", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const q = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
    if (!q) return res.status(404).json({ error: "Quote not found" });
    if (q.status !== "accepted") return res.status(400).json({ error: "Only accepted quotes can be converted to projects" });
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();
    db.prepare("INSERT INTO projects (id, title, client_name, status, sector, budget, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?, ?)").run(projectId, q.project_name || q.title || "Project", q.client_name || null, null, q.total || 0, now, now);
    db.prepare("UPDATE quotes SET status = 'converted', updated_at = ? WHERE id = ?").run(now, req.params.id);
    addReviewEvent(db, req.params.id, "accepted", "converted", "Converted to project", req.user.userId);
    audit(res, "quote_converted_to_project", "project", projectId, { quoteId: req.params.id, quoteNumber: q.quote_number });
    res.status(201).json({ id: projectId });
  } catch (err) { console.error("Error converting quote:", err.message); res.status(500).json({ error: "Failed to convert quote to project" }); }
});

// ── Templates ────────────────────────────────────────────────
router.get("/templates/list", (req, res) => {
  try {
    if (!isMgmt(req.user)) return res.status(403).json({ error: "Access denied" });
    const db = getDb();
    const templates = db.prepare("SELECT * FROM quote_templates ORDER BY name ASC").all();
    for (const t of templates) {
      t.items = db.prepare("SELECT * FROM quote_template_items WHERE template_id = ? ORDER BY sort_order ASC").all(t.id);
    }
    res.json(templates);
  } catch (err) { console.error("Error listing templates:", err.message); res.status(500).json({ error: "Failed to list templates" }); }
});

export default router;