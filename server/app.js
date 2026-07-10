import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import * as mailConnector from './email/mailConnector.js';
import { requireAuth as requireSessionAuth } from './middleware/auth.js';
import { requirePasswordChanged } from './middleware/passwordChange.js';
import { errorMiddleware } from './shared/errors/errorMiddleware.js';

import authRoutes from './routes/auth.js';
import platformRoutes from './routes/platform.js';
import clientPortalRoutes from './routes/clientPortal.js';
import adminToolsRoutes from './routes/adminTools.js';
import automationRoutes from './routes/automation.js';
import quotesRoutes from './routes/quotes.js';
import tasksRoutes from './routes/tasks.js';
import documentsRoutes from './routes/documents.js';
import notificationsRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';
import realtimeTimesheetsRoutes from './routes/realtimeTimesheets.js';
import healthRoutes from './routes/health.js';
import contactRequestRoutes from './modules/contactRequests/contactRequests.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  const DIST_DIR = path.join(__dirname, '..', 'dist');

  app.use(express.json());
  app.use(cookieParser());

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

  // Health check endpoints
  app.use('/health', healthRoutes);

  // API routes
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
  app.use('/api', contactRequestRoutes);

  // Email API
  function attachMailbox(req, res, next) {
    const allowedMailboxes = (process.env.MAIL_ALLOWED_MAILBOXES || "info@tnaprovider.com.au")
      .split(",").map((m) => m.trim()).filter(Boolean);
    const defaultMailbox = process.env.MAIL_DEFAULT_MAILBOX || "info@tnaprovider.com.au";
    req.userId = req.user.userId;
    req.mailbox = defaultMailbox;
    if (!allowedMailboxes.includes(req.mailbox)) {
      return res.status(403).json({ error: "Mailbox not allowed" });
    }
    next();
  }

  app.get("/api/email/status", (req, res) => {
    res.json({ available: true });
  });

  app.get("/api/email/status/detailed", requireSessionAuth, requirePasswordChanged, (req, res) => {
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Permission denied" });
    }
    const config = mailConnector.getMailConfig();
    res.json({
      provider: config.provider,
      inboundReady: config.inboundReady,
      outboundReady: config.outboundReady,
      attachmentsReady: config.attachmentsReady,
      mailbox: process.env.MAIL_DEFAULT_MAILBOX || "info@tnaprovider.com.au",
    });
  });

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

  // Error middleware
  app.use(errorMiddleware);

  // Static files
  app.use(express.static(DIST_DIR, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
  }));

  // Catch-all for SPA routing
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

  return app;
}
