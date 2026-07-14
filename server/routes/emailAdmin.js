import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { requirePasswordChanged } from '../middleware/passwordChange.js';
import { listEmailJobs, getEmailJob, retryEmailJob, processEmailJob, getEmailDeliveryStatusForEntity } from '../email/emailJobService.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

// List email jobs with optional filters
router.get('/email-jobs', requireRole('owner', 'admin'), (req, res) => {
  try {
    const { relatedEntityType, relatedEntityId, status, limit, offset } = req.query;
    const result = listEmailJobs({
      relatedEntityType: relatedEntityType || undefined,
      relatedEntityId: relatedEntityId || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
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

// Get a single email job
router.get('/email-jobs/:id', requireRole('owner', 'admin'), (req, res) => {
  try {
    const job = getEmailJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }
    res.json({ success: true, data: job });
  } catch (err) {
    console.error('Error getting email job:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get email job' });
  }
});

export default router;
