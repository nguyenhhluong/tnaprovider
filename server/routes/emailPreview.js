import { Router } from 'express';

const router = Router();

function isDev() {
  return process.env.APP_ENV !== 'production';
}

// Preview email templates (development only)
router.get('/dev/email-preview/:template', async (req, res) => {
  if (!isDev()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { template } = req.params;
  const params = req.query;

  try {
    let content;

    switch (template) {
      case 'quote-confirmation': {
        const { quoteRequestConfirmation } = await import('../email/templates/quoteRequestConfirmation.js');
        content = quoteRequestConfirmation({
          customerName: params.customerName || 'John Smith',
          referenceNumber: params.referenceNumber || 'TNA-2026-12345',
        });
        break;
      }
      case 'new-quote-admin': {
        const { newQuoteAdmin } = await import('../email/templates/newQuoteAdmin.js');
        content = newQuoteAdmin({
          referenceNumber: params.referenceNumber || 'TNA-2026-12345',
          customerName: params.customerName || 'John Smith',
          customerEmail: params.customerEmail || 'john@example.com',
          customerPhone: params.customerPhone || '0400 000 000',
          company: params.company || 'ACME Pty Ltd',
          message: params.message || 'I would like a quote for office fitout.',
          adminQuoteUrl: params.adminQuoteUrl || 'https://tnaprovider.com.au/admin/quote-requests?id=abc',
        });
        break;
      }
      case 'user-invitation': {
        const { userInvitation } = await import('../email/templates/userInvitation.js');
        content = userInvitation({
          name: params.name || 'Jane Doe',
          email: params.email || 'jane@example.com',
          inviteUrl: params.inviteUrl || 'https://tnaprovider.com.au/accept-invite?token=abc123',
          expiresAt: params.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        break;
      }
      case 'password-reset': {
        const { passwordReset } = await import('../email/templates/passwordReset.js');
        content = passwordReset({
          name: params.name || 'Jane Doe',
          resetUrl: params.resetUrl || 'https://tnaprovider.com.au/reset-password?token=abc123',
          expiresAt: params.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        break;
      }
      case 'quote-status-changed': {
        const { quoteStatusChanged } = await import('../email/templates/quoteStatusChanged.js');
        content = quoteStatusChanged({
          customerName: params.customerName || 'John Smith',
          referenceNumber: params.referenceNumber || 'QT-2026-00001',
          oldStatus: params.oldStatus || 'approved',
          newStatus: params.newStatus || 'sent',
          quoteUrl: params.quoteUrl || 'https://tnaprovider.com.au/quote/public-token',
        });
        break;
      }
      default:
        return res.status(404).json({ error: `Unknown template: ${template}` });
    }

    res.json({
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (err) {
    console.error('Email preview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
