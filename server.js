import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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

// Auth middleware (placeholder — replace with real session auth)
function requireAuth(req, res, next) {
  // TODO: integrate with platform session/auth system
  req.userId = req.headers['x-user-id'] || 'user-1';
  req.mailbox = req.headers['x-mailbox'] || 'info@tnaprovider.com.au';
  next();
}

// GET /api/email/messages?folder=inbox
app.get('/api/email/messages', requireAuth, (req, res) => {
  const { folder } = req.query;
  if (mailConfig.provider === 'mock') {
    return res.json(mockStore.messages.filter(m => !folder || m.folder === folder));
  }
  // TODO: proxy to Stalwart JMAP API
  res.json([]);
});

// GET /api/email/messages/:id
app.get('/api/email/messages/:id', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const msg = mockStore.messages.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    return res.json(msg);
  }
  res.status(501).json({ error: 'Mail server not connected' });
});

// POST /api/email/send
app.post('/api/email/send', requireAuth, (req, res) => {
  const { to, subject } = req.body;
  if (!to || to.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required' });
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
      hasAttachments: false,
    };
    mockStore.messages.push(msg);
    return res.json({ id: msg.id });
  }
  // TODO: proxy to Stalwart JMAP or SMTP
  res.status(501).json({ error: 'Mail server not connected' });
});

// POST /api/email/messages/:id/read
app.post('/api/email/messages/:id/read', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const msg = mockStore.messages.find(m => m.id === req.params.id);
    if (msg) msg.isRead = req.body.isRead;
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected' });
});

// POST /api/email/messages/:id/move
app.post('/api/email/messages/:id/move', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    const idx = mockStore.messages.findIndex(m => m.id === req.params.id);
    if (idx !== -1) mockStore.messages[idx].folder = req.body.folder;
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected' });
});

// DELETE /api/email/messages/:id
app.delete('/api/email/messages/:id', requireAuth, (req, res) => {
  if (mailConfig.provider === 'mock') {
    mockStore.messages = mockStore.messages.filter(m => m.id !== req.params.id);
    return res.json({ success: true });
  }
  res.status(501).json({ error: 'Mail server not connected' });
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
