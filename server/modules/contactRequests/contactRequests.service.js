import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../../db/database.js";
import { transaction } from "../../db/transaction.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");

const VALID_STATUSES = ["new", "contacted", "quoted", "won", "lost", "archived"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

function generateReferenceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `TNA-${year}-${seq}`;
}

function getJsonBackupPath() {
  const dir = path.join(DATA_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "contact-submissions.json");
}

function appendToJsonBackup(submission) {
  const filePath = getJsonBackupPath();
  let submissions = [];
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      submissions = JSON.parse(content);
    } catch {
      try {
        // Try JSON Lines format
        submissions = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      } catch {}
    }
  }
  submissions.push(submission);
  fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
}

export function submitContactRequest(data) {
  if (!data.privacyConsent) {
    throw new Error("Privacy consent is required");
  }
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const dbResult = db.prepare(`
    INSERT INTO contact_requests (id, first_name, last_name, email, phone, service, location, budget, target_date, message, request_callback, callback_time, privacy_consent, project_id, source, received_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.service,
    data.location,
    data.budget || null,
    data.targetDate || null,
    data.message,
    data.requestCallback ? 1 : 0,
    data.callbackTime || null,
    data.privacyConsent ? 1 : 0,
    data.projectId || null,
    data.source || null,
    now,
    now,
    now
  );

  const submission = {
    id,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    service: data.service,
    location: data.location,
    budget: data.budget || null,
    targetDate: data.targetDate || null,
    message: data.message,
    requestCallback: data.requestCallback || false,
    callbackTime: data.callbackTime || null,
    privacyConsent: !!data.privacyConsent,
    projectId: data.projectId || null,
    source: data.source || null,
    receivedAt: now,
  };

  appendToJsonBackup(submission);

  // Create email job records synchronously, process asynchronously
  const referenceNumber = generateReferenceNumber();
  createQuoteEmailJobs(submission, id, referenceNumber);

  return { id, referenceNumber, ...submission };
}

async function createQuoteEmailJobs(submission, contactId, referenceNumber) {
  try {
    const { quoteRequestConfirmation } = await import('../../email/templates/quoteRequestConfirmation.js');
    const { newQuoteAdmin } = await import('../../email/templates/newQuoteAdmin.js');
    const { createEmailJob, processEmailJob } = await import('../../email/emailJobService.js');

    const customerEmail = quoteRequestConfirmation({
      customerName: `${submission.firstName} ${submission.lastName}`,
      referenceNumber,
    });

    const customerJobId = createEmailJob({
      type: 'QUOTE_RECEIVED_CUSTOMER',
      recipient: submission.email,
      subject: customerEmail.subject,
      relatedEntityType: 'contact_request',
      relatedEntityId: contactId,
      payloadJson: {
        html: customerEmail.html,
        text: customerEmail.text,
      },
    });

    const { buildAppUrl } = await import('../../config/appUrl.js');
    const adminEmail = newQuoteAdminTemplate.newQuoteAdmin({
      referenceNumber,
      customerName: `${submission.firstName} ${submission.lastName}`,
      customerEmail: submission.email,
      customerPhone: submission.phone,
      company: null,
      message: submission.message,
      adminQuoteUrl: buildAppUrl('/platform/quote-requests', { id: contactId }),
    });

    const adminRecipient = process.env.ADMIN_EMAIL || 'info@tnaprovider.com.au';
    const adminJobId = createEmailJob({
      type: 'QUOTE_RECEIVED_ADMIN',
      recipient: adminRecipient,
      subject: adminEmail.subject,
      relatedEntityType: 'contact_request',
      relatedEntityId: contactId,
      payloadJson: {
        html: adminEmail.html,
        text: adminEmail.text,
        replyTo: submission.email,
      },
    });

    // Process asynchronously - don't block response
    Promise.all([
      processEmailJob(customerJobId),
      processEmailJob(adminJobId),
    ]).then(results => {
      console.log(`[email] Quote emails for ${referenceNumber}: customer=${results[0].success ? 'sent' : 'failed'}, admin=${results[1].success ? 'sent' : 'failed'}`);
    }).catch(err => {
      console.error('[email] Failed to process quote emails:', err.message);
    });
  } catch (err) {
    console.error('[email] Failed to create quote email jobs:', err.message);
  }
}

export function listContactRequests(query, userId, role) {
  const db = getDb();

  const page = Math.max(parseInt(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize) || 25, 1), 100);
  const sort = query.sort || "received_at";
  const order = query.order === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * pageSize;

  const allowedSortColumns = ["received_at", "created_at", "updated_at", "status", "priority", "first_name", "last_name", "email", "service", "location"];
  const sortColumn = allowedSortColumns.includes(sort) ? sort : "received_at";

  let where = ["1=1"];
  let params = [];

  if (query.status && VALID_STATUSES.includes(query.status)) {
    where.push("cr.status = ?");
    params.push(query.status);
  }

  if (query.priority && VALID_PRIORITIES.includes(query.priority)) {
    where.push("cr.priority = ?");
    params.push(query.priority);
  }

  if (query.search) {
    where.push("(cr.first_name LIKE ? OR cr.last_name LIKE ? OR cr.email LIKE ? OR cr.phone LIKE ? OR cr.service LIKE ? OR cr.location LIKE ?)");
    const s = `%${query.search}%`;
    params.push(s, s, s, s, s, s);
  }

  const whereClause = where.join(" AND ");

  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM contact_requests cr WHERE ${whereClause}`).get(...params);
  const total = countRow.cnt;

  const rows = db.prepare(`SELECT cr.*, u.name as assigned_to_name FROM contact_requests cr LEFT JOIN users u ON u.id = cr.assigned_to_user_id WHERE ${whereClause} ORDER BY cr.${sortColumn} ${order} LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export function getContactRequest(id) {
  const db = getDb();
  const row = db.prepare(`SELECT cr.*, u.name as assigned_to_name FROM contact_requests cr LEFT JOIN users u ON u.id = cr.assigned_to_user_id WHERE cr.id = ?`).get(id);
  return row || null;
}

export function updateContactRequest(id, data) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(id);
  if (!row) return null;

  const now = new Date().toISOString();
  const updates = ["updated_at = ?"];
  const params = [now];

  const allowedFields = ["status", "priority", "internal_notes", "assigned_to_user_id", "last_contacted_at"];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (data.status === "archived") {
    updates.push("archived_at = ?");
    params.push(now);
  }

  if (data.status && data.status !== "archived" && row.status === "archived") {
    updates.push("archived_at = ?");
    params.push(null);
  }

  params.push(id);
  db.prepare(`UPDATE contact_requests SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare(`SELECT cr.*, u.name as assigned_to_name FROM contact_requests cr LEFT JOIN users u ON u.id = cr.assigned_to_user_id WHERE cr.id = ?`).get(id);
  return updated;
}

export function convertContactRequestToLead(id, userId) {
  const db = getDb();
  const request = db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(id);
  if (!request) return null;
  if (request.converted_lead_id) {
    const existing = db.prepare("SELECT * FROM leads WHERE id = ?").get(request.converted_lead_id);
    if (existing) return { alreadyConverted: true, lead: existing };
  }

  const leadId = crypto.randomUUID();
  const now = new Date().toISOString();

  transaction((txDb) => {
    txDb.prepare(`
      INSERT INTO leads (id, name, email, phone, project_type, location, budget, message, source, assigned_to, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'contact_request', ?, 'new', ?, ?)
    `).run(
      leadId,
      `${request.first_name} ${request.last_name}`,
      request.email,
      request.phone,
      request.service,
      request.location,
      request.budget,
      request.message,
      request.assigned_to_user_id || null,
      now,
      now
    );

    txDb.prepare("UPDATE contact_requests SET converted_lead_id = ?, status = 'quoted', updated_at = ? WHERE id = ?").run(leadId, now, id);
  });

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
  return { alreadyConverted: false, lead };
}
