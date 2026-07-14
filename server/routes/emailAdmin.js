import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { requirePasswordChanged } from '../middleware/passwordChange.js';
import {
  listEmailJobs,
  getEmailJob,
  retryEmailJob,
  processEmailJob,
  getEmailDeliveryStatusForEntity,
  getEmailCenterSummary,
  bulkRetryEmailJobs,
  resendEmailJob,
} from '../email/emailJobService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

// Email Center summary
router.get('/email-center/summary', requireRole('owner', 'admin'), (req, res) => {
  try {
    const summary = getEmailCenterSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('Error getting email center summary:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

// List email jobs with full filtering and pagination
router.get('/email-jobs', requireRole('owner', 'admin'), (req, res) => {
  try {
    const {
      relatedEntityType,
      relatedEntityId,
      status,
      type,
      search,
      dateFrom,
      dateTo,
      sort,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(pageSize) || 20, 1), 100);
    const currentPage = Math.max(parseInt(page) || 1, 1);
    const offset = (currentPage - 1) * limit;

    const result = listEmailJobs({
      relatedEntityType: relatedEntityType || undefined,
      relatedEntityId: relatedEntityId || undefined,
      status: status || undefined,
      type: type || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort: sort || undefined,
      sortOrder: sortOrder || undefined,
      limit,
      offset,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error listing email jobs:', err.message);
    res.status(500).json({ success: false, error: 'Failed to list email jobs' });
  }
});

// Get delivery status for a specific entity
router.get('/email-delivery-status/:entityType/:entityId', requireRole('owner', 'admin'), (req, res) => {
  try {
    const statuses = getEmailDeliveryStatusForEntity(req.params.entityType, req.params.entityId);
    res.json({ success: true, data: statuses });
  } catch (err) {
    console.error('Error getting delivery status:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get delivery status' });
  }
});

// Retry a failed email job
router.post('/email-jobs/:id/retry', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const job = getEmailJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }
    if (job.status === 'SENT') {
      return res.status(400).json({ error: 'This email has already been sent successfully' });
    }

    retryEmailJob(job.id);
    const result = await processEmailJob(job.id);

    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
    } else {
      res.json({ success: false, message: 'Email sending failed', error: result.error });
    }
  } catch (err) {
    console.error('Error retrying email job:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retry email job' });
  }
});

// Bulk retry failed email jobs
router.post('/email-jobs/bulk-retry', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { jobIds } = req.body;
    const result = bulkRetryEmailJobs(jobIds);

    // Process accepted jobs
    const processResults = [];
    for (const r of result.results) {
      if (r.status === 'accepted') {
        try {
          const pr = await processEmailJob(r.id);
          processResults.push({ id: r.id, ...pr });
        } catch (err) {
          processResults.push({ id: r.id, success: false, error: err.message });
        }
      }
    }

    res.json({ success: true, ...result, processResults });
  } catch (err) {
    console.error('Error in bulk retry:', err.message);
    if (err.message.includes('must be a non-empty array')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ success: false, error: 'Failed to process bulk retry' });
  }
});

// Resend an email (creates a new job)
router.post('/email-jobs/:id/resend', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const job = getEmailJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    const result = await resendEmailJob(req.params.id);
    if (result.success) {
      res.json({ success: true, message: 'Email resent successfully', messageId: result.messageId, newJobId: result.newJobId });
    } else {
      res.json({ success: false, message: 'Email resend failed', error: result.error, newJobId: result.newJobId });
    }
  } catch (err) {
    console.error('Error resending email:', err.message);
    res.status(500).json({ success: false, error: 'Failed to resend email' });
  }
});

// Get a single email job
router.get('/email-jobs/:id', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const job = getEmailJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    let relatedInfo = null;
    if (job.related_entity_type && job.related_entity_id) {
      try {
        const { getDb } = await import('../db/database.js');
        const db = getDb();
        if (job.related_entity_type === 'contact_request') {
          relatedInfo = db.prepare('SELECT id, first_name, last_name, email, status FROM contact_requests WHERE id = ?').get(job.related_entity_id);
        } else if (job.related_entity_type === 'quote') {
          relatedInfo = db.prepare('SELECT id, quote_number, title, client_name, client_email, status FROM quotes WHERE id = ?').get(job.related_entity_id);
        } else if (job.related_entity_type === 'user_invite_token') {
          relatedInfo = db.prepare('SELECT u.id, u.name, u.email, u.status FROM user_invite_tokens uit JOIN users u ON u.email = uit.email WHERE uit.id = ?').get(job.related_entity_id);
          if (!relatedInfo) {
            relatedInfo = db.prepare('SELECT email, name, role FROM user_invite_tokens WHERE id = ?').get(job.related_entity_id);
          }
        } else if (job.related_entity_type === 'password_reset_token') {
          relatedInfo = db.prepare('SELECT u.id, u.name, u.email FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.id = ?').get(job.related_entity_id);
        }
      } catch {}
    }

    res.json({ success: true, data: { ...job, relatedInfo } });
  } catch (err) {
    console.error('Error getting email job:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get email job' });
  }
});

export default router;
