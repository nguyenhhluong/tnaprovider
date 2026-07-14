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
const VALID_SORT_COLUMNS = ['created_at', 'sent_at', 'updated_at', 'recipient', 'status'];

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

export function listEmailJobs({
  relatedEntityType,
  relatedEntityId,
  status,
  type,
  search,
  dateFrom,
  dateTo,
  sort,
  sortOrder,
  limit = 50,
  offset = 0,
} = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (relatedEntityType) {
    conditions.push('e.related_entity_type = ?');
    params.push(relatedEntityType);
  }
  if (relatedEntityId) {
    conditions.push('e.related_entity_id = ?');
    params.push(relatedEntityId);
  }
  if (status) {
    const statuses = status.split(',');
    conditions.push(`e.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (type) {
    const types = type.split(',');
    conditions.push(`e.type IN (${types.map(() => '?').join(',')})`);
    params.push(...types);
  }
  if (search) {
    conditions.push('(e.recipient LIKE ? OR e.subject LIKE ? OR e.smtp_message_id LIKE ? OR e.related_entity_id LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (dateFrom) {
    conditions.push('e.created_at >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('e.created_at <= ?');
    params.push(dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderClause = 'ORDER BY e.created_at DESC';
  if (sort && VALID_SORT_COLUMNS.includes(sort)) {
    const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    orderClause = `ORDER BY e.${sort} ${dir}`;
  }

  const count = db.prepare(`SELECT COUNT(*) as cnt FROM email_jobs e ${where}`).get(...params).cnt;
  const rows = db.prepare(`SELECT e.* FROM email_jobs e ${where} ${orderClause} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return { data: rows, total: count, page: Math.floor(offset / limit) + 1, pageSize: limit, totalPages: Math.ceil(count / limit) };
}

export function getEmailCenterSummary() {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) as cnt FROM email_jobs').get().cnt;
  const sent = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'SENT'").get().cnt;
  const pending = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'PENDING'").get().cnt;
  const processing = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'PROCESSING'").get().cnt;
  const failed = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'FAILED'").get().cnt;
  const cancelled = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'CANCELLED'").get().cnt;
  const sentLast24Hours = db.prepare("SELECT COUNT(*) as cnt FROM email_jobs WHERE status = 'SENT' AND sent_at >= datetime('now', '-1 day')").get().cnt;
  const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

  const byType = db.prepare('SELECT type, COUNT(*) as cnt, SUM(CASE WHEN status = \'FAILED\' THEN 1 ELSE 0 END) as failed_count FROM email_jobs GROUP BY type ORDER BY cnt DESC').all();

  const recentFailed = db.prepare("SELECT * FROM email_jobs WHERE status = 'FAILED' ORDER BY updated_at DESC LIMIT 5").all();
  const recentSent = db.prepare("SELECT * FROM email_jobs WHERE status = 'SENT' ORDER BY sent_at DESC LIMIT 5").all();

  return {
    total,
    sent,
    pending,
    processing,
    failed,
    cancelled,
    sentLast24Hours,
    successRate,
    byType,
    recentFailed,
    recentSent,
  };
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

function createAttemptRecord(jobId, attemptNumber) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO email_job_attempts (id, email_job_id, attempt_number, status, started_at, created_at)
    VALUES (?, ?, ?, 'PROCESSING', ?, ?)
  `).run(id, jobId, attemptNumber, now, now);
  return id;
}

function updateAttemptRecord(id, status, result = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const sets = ['status = ?', 'completed_at = ?'];
  const params = [status, now];
  if (result.smtpMessageId !== undefined) {
    sets.push('smtp_message_id = ?');
    params.push(result.smtpMessageId);
  }
  if (result.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(result.errorMessage);
  }
  params.push(id);
  db.prepare(`UPDATE email_job_attempts SET ${sets.join(', ')} WHERE id = ?`).run(...params);
}

export function getAttemptsForJob(jobId) {
  const db = getDb();
  return db.prepare('SELECT * FROM email_job_attempts WHERE email_job_id = ? ORDER BY attempt_number DESC').all(jobId);
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

  const attemptNumber = job.attempt_count + 1;
  const attemptId = createAttemptRecord(id, attemptNumber);

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

    updateAttemptRecord(attemptId, 'SENT', {
      smtpMessageId: result.messageId,
    });

    updateEmailJobStatus(id, 'SENT', {
      smtpMessageId: result.messageId,
      sentAt: new Date().toISOString(),
      attemptCount: attemptNumber,
    });

    return { success: true, messageId: result.messageId };
  } catch (err) {
    updateAttemptRecord(attemptId, 'FAILED', {
      errorMessage: err.message,
    });

    updateEmailJobStatus(id, 'FAILED', {
      lastError: err.message,
      attemptCount: attemptNumber,
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
        subject: job.subject,
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

export function bulkRetryEmailJobs(jobIds) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    throw new Error('jobIds must be a non-empty array');
  }

  const uniqueIds = [...new Set(jobIds)];
  const results = [];
  let accepted = 0;
  let rejected = 0;

  for (const id of uniqueIds) {
    try {
      const job = getEmailJob(id);
      if (!job) {
        results.push({ id, status: 'rejected', reason: 'Email job not found' });
        rejected++;
        continue;
      }
      if (job.status === 'SENT') {
        results.push({ id, status: 'rejected', reason: 'Job has already been sent successfully' });
        rejected++;
        continue;
      }
      if (job.status === 'CANCELLED') {
        results.push({ id, status: 'rejected', reason: 'Job is cancelled' });
        rejected++;
        continue;
      }

      retryEmailJob(id);
      results.push({ id, status: 'accepted' });
      accepted++;
    } catch (err) {
      results.push({ id, status: 'rejected', reason: err.message });
      rejected++;
    }
  }

  return { requested: jobIds.length, accepted, rejected, results };
}

export async function resendEmailJob(id) {
  const job = getEmailJob(id);
  if (!job) {
    throw new Error(`Email job not found: ${id}`);
  }

  let payload = null;
  if (job.payload_json) {
    try { payload = JSON.parse(job.payload_json); } catch {}
  }

  const newJobId = createEmailJob({
    type: job.type,
    recipient: job.recipient,
    subject: job.subject,
    relatedEntityType: job.related_entity_type,
    relatedEntityId: job.related_entity_id,
    payloadJson: payload || undefined,
  });

  const result = await processEmailJob(newJobId);
  return { newJobId, ...result };
}
