import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import * as mailConnector from './server/email/mailConnector.js';
import { migrate } from './server/db/migrate.js';
import { requireAuth as requireSessionAuth } from './server/middleware/auth.js';
import { requirePasswordChanged } from './server/middleware/passwordChange.js';
import authRoutes from './server/routes/auth.js';
import platformRoutes from './server/routes/platform.js';
import clientPortalRoutes from './server/routes/clientPortal.js';
import adminToolsRoutes from './server/routes/adminTools.js';
import automationRoutes from './server/routes/automation.js';
import quotesRoutes from './server/routes/quotes.js';
import tasksRoutes from './server/routes/tasks.js';
import documentsRoutes from './server/routes/documents.js';
import notificationsRoutes from './server/routes/notifications.js';
import reportsRoutes from './server/routes/reports.js';
import realtimeTimesheetsRoutes from './server/routes/realtimeTimesheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

app.use(express.json());
app.use(cookieParser());

// Auto-migrate database on startup
if (process.env.APP_ENV !== 'test') {
  try { migrate(); } catch (err) { console.error('Migration failed:', err.message); }
}

// Redirect old /platform URLs to app subdomain
app.use((req, res, next) => {
  const host = (req.headers.host || "").split(":")[0];
  const isMainDomain = host === "tnaprovider.com.au" || host === "www.tnaprovider.com.au";
  if (isMainDomain && (req.path === "/platform" || req.path.startsWith("/platform/"))) {
    const targetPath = req.path.replace(/^\/platform/, "") || "/";
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    return res.redirect(302, `https://app.tnaprovider.com.au${targetPath}${query}`);
  }
  next();
});

// Auth & Platform API routes
app.use('/api/auth', authRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/admin-tools', adminToolsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/realtime-timesheets', realtimeTimesheetsRoutes);

import { getDb } from './server/db/database.js';

app.post('/api/contact', (req, res) => {
  try {
    const { firstName, lastName, email, phone, service, location, budget, targetDate, message, requestCallback, callbackTime, privacyConsent } = req.body || {};

    // Validation
    if (!firstName || typeof firstName !== 'string' || firstName.length > 80) return res.status(400).json({ error: 'First name is required (max 80 characters)' });
    if (!lastName || typeof lastName !== 'string' || lastName.length > 80) return res.status(400).json({ error: 'Last name is required (max 80 characters)' });
    if (!email || typeof email !== 'string' || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!phone || typeof phone !== 'string' || phone.length > 40) return res.status(400).json({ error: 'Phone is required (max 40 characters)' });
    if (!service || typeof service !== 'string' || service.length > 120) return res.status(400).json({ error: 'Service type is required (max 120 characters)' });
    if (!location || typeof location !== 'string' || location.length > 160) return res.status(400).json({ error: 'Location is required (max 160 characters)' });
    if (budget && (typeof budget !== 'string' || budget.length > 120)) return res.status(400).json({ error: 'Budget too long (max 120 characters)' });
    if (targetDate && (typeof targetDate !== 'string' || targetDate.length > 80)) return res.status(400).json({ error: 'Target date too long (max 80 characters)' });
    if (!message || typeof message !== 'string' || message.length < 10 || message.length > 5000) return res.status(400).json({ error: 'Message is required (10-5000 characters)' });
    if (!privacyConsent) return res.status(400).json({ error: 'Privacy consent is required' });

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Store in SQLite
    const db = getDb();
    db.prepare(`
      INSERT INTO contact_requests (id, first_name, last_name, email, phone, service, location, budget, target_date, message, request_callback, callback_time, privacy_consent, source, status, priority, received_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'contact_form', 'new', 'normal', ?, ?, ?)
    `).run(id, firstName, lastName, email, phone, service, location, budget || null, targetDate || null, message, requestCallback ? 1 : 0, callbackTime || null, privacyConsent ? 1 : 0, now, now, now);

    // Also append to JSON backup file
    const logDir = path.join(__dirname, 'data');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'contact-submissions.json');
    let submissions = [];
    if (fs.existsSync(logFile)) {
      try { submissions = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch {}
    }
    submissions.push({ id, firstName, lastName, email, phone, service, location, budget, targetDate, message, requestCallback, callbackTime, privacyConsent, receivedAt: now });
    fs.writeFileSync(logFile, JSON.stringify(submissions, null, 2));

    res.json({ success: true });
  } catch (err) {
    console.error('Contact submission error:', err.message);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// ---------------------------------------------------------------------------
// Email API — server-side proxy via mail connector layer
// All SMTP/IMAP/JMAP credentials stay server-side only.
// Frontend must never connect directly to IMAP or SMTP.
// ---------------------------------------------------------------------------

function attachMailbox(req, res, next) {
  const allowedMailboxes = (process.env.MAIL_ALLOWED_MAILBOXES || "info@tnaprovider.com.au")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const defaultMailbox = process.env.MAIL_DEFAULT_MAILBOX || "info@tnaprovider.com.au";

  req.userId = req.user.userId;
  req.mailbox = defaultMailbox;

  if (!allowedMailboxes.includes(req.mailbox)) {
    return res.status(403).json({ error: "Mailbox not allowed" });
  }

  next();
}

// GET /api/email/status (public — no credentials exposed)
app.get("/api/email/status", (req, res) => {
  const config = mailConnector.getMailConfig();
  res.json({
    provider: config.provider,
    inboundReady: config.inboundReady,
    outboundReady: config.outboundReady,
    attachmentsReady: config.attachmentsReady,
    mailbox: process.env.MAIL_DEFAULT_MAILBOX || "info@tnaprovider.com.au",
  });
});

// GET /api/email/messages?folder=inbox
app.get("/api/email/messages", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const { folder } = req.query;
    const messages = await mailConnector.listMessages({
      mailbox: req.mailbox,
      folder: folder || "inbox",
    });
    res.json(messages);
  } catch (err) {
    console.error("listMessages error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/email/messages/:id
app.get("/api/email/messages/:id", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const msg = await mailConnector.getMessage({
      mailbox: req.mailbox,
      messageId: req.params.id,
    });
    res.json(msg);
  } catch (err) {
    console.error("getMessage error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/email/send
app.post("/api/email/send", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const result = await mailConnector.sendMessage({
      mailbox: req.mailbox,
      payload: req.body,
    });
    res.json(result);
  } catch (err) {
    console.error("sendMessage error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/email/messages/:id/read
app.post("/api/email/messages/:id/read", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const result = await mailConnector.markMessageRead({
      mailbox: req.mailbox,
      messageId: req.params.id,
      isRead: req.body.isRead,
    });
    res.json(result);
  } catch (err) {
    console.error("markMessageRead error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/email/messages/:id/move
app.post("/api/email/messages/:id/move", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const result = await mailConnector.moveMessage({
      mailbox: req.mailbox,
      messageId: req.params.id,
      folder: req.body.folder,
    });
    res.json(result);
  } catch (err) {
    console.error("moveMessage error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// DELETE /api/email/messages/:id
app.delete("/api/email/messages/:id", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
  try {
    const result = await mailConnector.deleteMessage({
      mailbox: req.mailbox,
      messageId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    console.error("deleteMessage error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
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

const HOST = process.env.HOST || "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});
