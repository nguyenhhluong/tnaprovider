import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

app.use(express.json());

app.post('/api/contact', (req, res) => {
  const submission = {
    ...req.body,
    receivedAt: new Date().toISOString(),
  };
  const logDir = path.join(__dirname, 'data');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'contact-submissions.json');
  let submissions = [];
  if (fs.existsSync(logFile)) {
    try { submissions = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch {}
  }
  submissions.push(submission);
  fs.writeFileSync(logFile, JSON.stringify(submissions, null, 2));
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Email API — server-side proxy to Stalwart/Mailu mail server
// All SMTP/IMAP/JMAP credentials stay server-side only.
// Frontend must never connect directly to IMAP or SMTP.
// ---------------------------------------------------------------------------
const mailConfig = {
  provider: process.env.MAIL_PROVIDER || 'mock',
  baseUrl: process.env.MAIL_BASE_URL || '',
  jmapUrl: process.env.MAIL_JMAP_URL || '',
  imapHost: process.env.MAIL_IMAP_HOST || '',
  smtpHost: process.env.MAIL_SMTP_HOST || '',
  smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '587'),
  domain: process.env.MAIL_DOMAIN || 'tnaprovider.com.au',
  adminToken: process.env.MAIL_ADMIN_TOKEN || '',
};

// Simple in-memory store for mock mode
const mockStore = { messages: [], sentCount: 0 };

// Auth middleware — uses server-side config, never trusts client headers
function requireAuth(req, res, next) {
  const allowedMailboxes = (process.env.MAIL_ALLOWED_MAILBOXES || 'info@tnaprovider.com.au')
    .split(',')
    .map(m => m.trim());
  const defaultMailbox = process.env.MAIL_DEFAULT_MAILBOX || 'info@tnaprovider.com.au';

  req.userId = 'user-1'; // Placeholder: integrate with platform session/auth
  req.mailbox = defaultMailbox;

  // Only allow a requested mailbox if it's in the allowed list
  const requested = req.headers['x-mailbox'];
  if (requested && allowedMailboxes.includes(requested)) {
    req.mailbox = requested;
  }

  next();
}

// GET /api/email/messages?folder=inbox
app.get('/api/email/messages', requireAuth, (req, res) => {
  const { folder } = req.query;
  if (mailConfig.provider === 'mock') {
    return res.json(mockStore.messages.filter(m => !folder || m.folder === folder));
  }
  res.json([]);
});

// GET /api/email/messages/:id
app.get('/api/email/messages/:id', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const msg = mockStore.messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    return res.json(msg);
  }
  res.status(501).json({ error: 'Mail server not connected. Set MAIL_PROVIDER=mock for development.' });
});

// POST /api/email/send
app.post('/api/email/send', requireAuth, async (req, res) => {
  const { to, subject, attachments } = req.body;
  if (!to || to.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required' });
  }

  // Block attachments in non-mock mode until multipart/FormData is implemented
  if (mailConfig.provider !== 'mock' && attachments && attachments.length > 0) {
    return res.status(400).json({
      error: 'Attachments not supported in real mode yet. Use mock mode or implement multipart upload.',
    });
  }

  if (mailConfig.provider === 'mock') {
    mockStore.sentCount++;
    const msg = {
      id: `sent-${Date.now()}`,
      folder: 'sent',
      ...req.body,
      from: { name: 'TNA Provider', email: req.mailbox },
      sentAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      hasAttachments: !!(attachments && attachments.length > 0),
    };
    mockStore.messages.push(msg);
    return res.json({ id: msg.id });
  }

  // Real SMTP send via nodemailer
  if (mailConfig.provider === 'smtp' && mailConfig.smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: mailConfig.smtpHost,
        port: mailConfig.smtpPort,
        secure: mailConfig.smtpPort === 465,
        auth: {
          user: process.env.MAIL_SMTP_USER,
          pass: process.env.MAIL_SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"${req.body.from?.name || 'TNA Provider'}" <${req.mailbox}>`,
        to: to.map(a => a.email).join(', '),
        cc: req.body.cc?.map(a => a.email).join(', '),
        bcc: req.body.bcc?.map(a => a.email).join(', '),
        subject,
        html: req.body.bodyHtml,
      });

      return res.json({ id: info.messageId });
    } catch (err) {
      console.error('SMTP send error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(501).json({ error: 'Mail server not connected. Set MAIL_PROVIDER to "mock" for development.' });
});

// POST /api/email/messages/:id/read
app.post('/api/email/messages/:id/read', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const msg = mockStore.messages.find(m => m.id === req.params.id);
    if (msg) msg.isRead = req.body.isRead;
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected. Set MAIL_PROVIDER=mock for development.' });
});

// POST /api/email/messages/:id/move
app.post('/api/email/messages/:id/move', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const idx = mockStore.messages.findIndex(m => m.id === req.params.id);
    if (idx !== -1) mockStore.messages[idx].folder = req.body.folder;
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected. Set MAIL_PROVIDER=mock for development.' });
});

// DELETE /api/email/messages/:id
app.delete('/api/email/messages/:id', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    mockStore.messages = mockStore.messages.filter(m => m.id !== req.params.id);
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected. Set MAIL_PROVIDER=mock for development.' });
});

app.use(express.static(DIST_DIR, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
}));

app.get('*', (req, res) => {
  const preRenderedPath = path.join(DIST_DIR, req.path === '/' ? 'index.html' : `${req.path}.html`);
  const preRenderedDir = path.join(DIST_DIR, req.path.slice(1), 'index.html');
  
  if (req.path !== '/' && fs.existsSync(preRenderedDir)) {
    res.sendFile(preRenderedDir);
  } else if (fs.existsSync(preRenderedPath)) {
    res.sendFile(preRenderedPath);
  } else {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});
