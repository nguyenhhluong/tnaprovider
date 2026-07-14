import crypto from 'crypto';
import { getDb } from '../db/database.js';

const VALID_TYPES = [
  'QUOTE_RECEIVED_CUSTOMER',
  'QUOTE_RECEIVED_ADMIN',
  'USER_INVITATION',
  'PASSWORD_RESET',
  'QUOTE_STATUS_CHANGED',
];

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'];

function validateJobData(data) {
  if (!VALID_TYPES.includes(data.type)) {
    throw new Error(`Invalid email job type: ${data.type}`);
  }
  if (!data.recipient) {
    throw new Error('Recipient is required');
  }
  if (!data.subject) {
    throw new Error('Subject is required');
  }
}

export function createEmailJob(data) {
  validateJobData(data);
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO email_jobs (id, type, recipient, subject, related_entity_type, related_entity_id, payload_json, status, attempt_count, scheduled_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?)
  `).run(
    id,
    data.type,
    data.recipient,
    data.subject,
    data.relatedEntityType || null,
    data.relatedEntityId || null,
    data.payloadJson ? JSON.stringify(data.payloadJson) : null,
    data.scheduledAt || now,
    now,
    now,
  );

  return id;
}

export function getEmailJob(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM email_jobs WHERE id = ?').get(id) || null;
}

export function listEmailJobs({ relatedEntityType, relatedEntityId, status, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (relatedEntityType) {
    conditions.push('related_entity_type = ?');
    params.push(relatedEntityType);
  }
  if (relatedEntityId) {
    conditions.push('related_entity_id = ?');
    params.push(relatedEntityId);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM email_jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM email_jobs ${where}`).get(...params).cnt;

  return { data: rows, total: count };
}

export function updateEmailJobStatus(id, status, result = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const updates = ['status = ?', 'updated_at = ?'];
  const params = [status, now];

  if (result.lastError !== undefined) {
    updates.push('last_error = ?');
    params.push(result.lastError);
  }
  if (result.smtpMessageId !== undefined) {
    updates.push('smtp_message_id = ?');
    params.push(result.smtpMessageId);
  }
  if (result.sentAt !== undefined) {
    updates.push('sent_at = ?');
    params.push(result.sentAt);
  }
  if (result.attemptCount !== undefined) {
    updates.push('attempt_count = ?');
    params.push(result.attemptCount);
  }

  params.push(id);
  db.prepare(`UPDATE email_jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export async function processEmailJob(id) {
  const job = getEmailJob(id);
  if (!job) {
    throw new Error(`Email job not found: ${id}`);
  }
  if (job.status === 'PROCESSING') {
    throw new Error(`Email job ${id} is already being processed`);
  }
  if (job.status === 'SENT') {
    throw new Error(`Email job ${id} has already been sent`);
  }

  updateEmailJobStatus(id, 'PROCESSING');

  try {
    const { sendEmail } = await import('./mailer.js');
    let payload = null;
    if (job.payload_json) {
      try { payload = JSON.parse(job.payload_json); } catch {}
    }

    const result = await sendEmail({
      to: job.recipient,
      subject: job.subject,
      html: payload?.html || '',
      text: payload?.text || '',
      replyTo: payload?.replyTo,
    });

    updateEmailJobStatus(id, 'SENT', {
      smtpMessageId: result.messageId,
      sentAt: new Date().toISOString(),
      attemptCount: job.attempt_count + 1,
    });

    return { success: true, messageId: result.messageId };
  } catch (err) {
    const newAttemptCount = job.attempt_count + 1;
    updateEmailJobStatus(id, 'FAILED', {
      lastError: err.message,
      attemptCount: newAttemptCount,
    });

    return { success: false, error: err.message };
  }
}

export function retryEmailJob(id) {
  const job = getEmailJob(id);
  if (!job) {
    throw new Error(`Email job not found: ${id}`);
  }
  if (job.status === 'SENT') {
    throw new Error(`Email job ${id} has already been sent successfully`);
  }

  updateEmailJobStatus(id, 'PENDING', {
    lastError: null,
  });

  return { success: true };
}

export function getEmailDeliveryStatusForEntity(entityType, entityId) {
  const jobs = listEmailJobs({ relatedEntityType: entityType, relatedEntityId: entityId });
  const statuses = {};
  for (const job of jobs.data) {
    if (!statuses[job.type]) {
      statuses[job.type] = {
        id: job.id,
        type: job.type,
        status: job.status,
        recipient: job.recipient,
        lastError: job.last_error,
        attemptCount: job.attempt_count,
        sentAt: job.sent_at,
        createdAt: job.created_at,
        smtpMessageId: job.smtp_message_id,
      };
    }
  }
  return statuses;
}
