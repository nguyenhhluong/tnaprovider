import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import * as mailConnector from './email/mailConnector.js';
import { requireAuth as requireSessionAuth } from './middleware/auth.js';
import { requirePasswordChanged } from './middleware/passwordChange.js';
import { requireRole } from './middleware/roles.js';
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
import usersRoutes from './modules/users/users.routes.js';
import emailAdminRoutes from './routes/emailAdmin.js';
import emailPreviewRoutes from './routes/emailPreview.js';

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
  app.use('/api/users', usersRoutes);
  app.use('/api/admin', emailAdminRoutes);
  app.use('/', emailPreviewRoutes);

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

  const requireAdmin = [requireSessionAuth, requirePasswordChanged, requireRole("owner", "admin")];

  app.get("/api/email/status", (req, res) => {
    res.json({ available: true });
  });

  app.get("/api/email/status/detailed", ...requireAdmin, (req, res) => {
    const config = mailConnector.getMailConfig();
    res.json({
      provider: config.provider,
      inboundReady: config.inboundReady,
      outboundReady: config.outboundReady,
      attachmentsReady: config.attachmentsReady,
      mailbox: process.env.MAIL_DEFAULT_MAILBOX || "info@tnaprovider.com.au",
    });
  });

  app.get("/api/email/messages", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      const { folder, search, from, to, since, before, unread, starred, page, pageSize } = req.query;

      // If any search parameters are provided, use server-side IMAP search
      if (search || from || to || since || before || unread !== undefined || starred !== undefined) {
        const result = await mailConnector.searchMessages({
          mailbox: req.mailbox,
          folder: folder || "inbox",
          search,
          from,
          to,
          since,
          before,
          unread,
          starred,
          page: parseInt(page) || 1,
          pageSize: Math.min(parseInt(pageSize) || 25, 100),
        });
        return res.json(result);
      }

      const result = await mailConnector.listMessages({
        mailbox: req.mailbox,
        folder: folder || "inbox",
        page: parseInt(page) || 1,
        pageSize: Math.min(parseInt(pageSize) || 25, 100),
      });
      res.json(result);
    } catch (err) {
      console.error("listMessages error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  app.get("/api/email/messages/:id", ...requireAdmin, attachMailbox, async (req, res) => {
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

  app.post("/api/email/send", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      let to = [], cc = [], bcc = [], subject = "", bodyText = "", bodyHtml = "";
      let replyToMessageId = "", references = [], requestId = "";
      const attachments = [];
      let totalBytes = 0;
      const { getAttachmentLimits } = await import("./email/emailConfig.js");
      const limits = getAttachmentLimits();
      const MAX_FILE_BYTES = limits.maxFileBytes;
      const MAX_TOTAL_BYTES = limits.maxTotalBytes;
      const MAX_FILES = limits.maxFiles;

      const contentType = req.headers["content-type"] || "";

      const { parseMultipartJsonField, validateRecipients, validateReferences: validateRefs } = await import("./email/emailConfig.js");

      if (contentType.includes("multipart/form-data")) {
        let aborted = false;
        const busboy = (await import("busboy")).default;
        const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES } });

        await new Promise((resolve, reject) => {
          bb.on("field", (name, val) => {
            try {
              if (name === "to") to = parseMultipartJsonField(val, { fieldName: "To", code: "INVALID_RECIPIENTS" });
              else if (name === "cc") cc = parseMultipartJsonField(val, { fieldName: "Cc", code: "INVALID_RECIPIENTS" });
              else if (name === "bcc") bcc = parseMultipartJsonField(val, { fieldName: "Bcc", code: "INVALID_RECIPIENTS" });
              else if (name === "subject") subject = val;
              else if (name === "bodyText") bodyText = val;
              else if (name === "bodyHtml") bodyHtml = val;
              else if (name === "replyToMessageId") replyToMessageId = val;
              else if (name === "references") references = parseMultipartJsonField(val, { fieldName: "References", code: "INVALID_REFERENCES" });
              else if (name === "requestId") requestId = val;
            } catch (err) { reject(err); }
          });

          bb.on("file", (name, stream, info) => {
            if (aborted) { stream.resume(); return; }
            if (attachments.length >= MAX_FILES) {
              aborted = true; stream.resume();
              return reject(Object.assign(new Error(`Too many attachments (max ${MAX_FILES})`), { statusCode: 400, code: "TOO_MANY_ATTACHMENTS" }));
            }
            const chunks = [];
            let fileSize = 0;
            stream.on("data", (chunk) => {
              fileSize += chunk.length;
              if (fileSize > MAX_FILE_BYTES) {
                aborted = true; stream.destroy();
                const maxMb = Math.floor(MAX_FILE_BYTES / 1024 / 1024);
                return reject(Object.assign(new Error(`Attachment too large: ${info.filename} (max ${maxMb}MB)`), { statusCode: 400, code: "ATTACHMENT_TOO_LARGE" }));
              }
              chunks.push(chunk);
            });
            stream.on("end", () => {
              if (aborted) return;
              const buffer = Buffer.concat(chunks);
              totalBytes += buffer.length;
              if (totalBytes > MAX_TOTAL_BYTES) {
                aborted = true;
                const totalMb = Math.floor(MAX_TOTAL_BYTES / 1024 / 1024);
                return reject(Object.assign(new Error(`Total attachment size exceeds ${totalMb}MB limit`), { statusCode: 400, code: "TOTAL_ATTACHMENT_LIMIT_EXCEEDED" }));
              }
              attachments.push({ filename: info.filename, mimeType: info.mimeType || "application/octet-stream", buffer });
            });
          });

          bb.on("finish", () => { if (!aborted) resolve(); });
          bb.on("error", reject);
          req.pipe(bb);
        });
      } else {
        ({ to = [], cc = [], bcc = [], subject = "", bodyText = "", bodyHtml = "", replyToMessageId = "", references = [], requestId = "" } = req.body);
      }

      if (!requestId) {
        return res.status(400).json({ error: "requestId is required", code: "MISSING_REQUEST_ID" });
      }

      // Validate recipients and references
      try {
        validateRecipients(to);
        if (cc.length > 0) validateRecipients(cc);
        if (bcc.length > 0) validateRecipients(bcc);
        if (references.length > 0) validateRefs(references);
      } catch (err) {
        return res.status(err.statusCode || 400).json({ error: err.message, code: err.code || "INVALID_MULTIPART_PAYLOAD" });
      }

      if (to.length === 0) {
        return res.status(400).json({ error: "At least one recipient is required", code: "INVALID_RECIPIENTS" });
      }

      const payload = { to, cc, bcc, subject, bodyText, bodyHtml, replyToMessageId, references };
      if (attachments.length > 0) payload.attachments = attachments;

      const result = await mailConnector.sendMessage({ mailbox: req.mailbox, payload, requestId });
      res.json(result);
    } catch (err) {
      const code = err.code || "SMTP_SEND_FAILED";
      const status = err.statusCode || 500;
      console.error("sendMessage error:", err.message);
      res.status(status).json({ error: err.message, code });
    }
  });

  // Forward message
  app.post("/api/email/messages/:id/forward", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      const result = await mailConnector.forwardMessage({
        mailbox: req.mailbox,
        messageId: req.params.id,
        payload: req.body,
        requestId: req.body.requestId,
      });
      res.json(result);
    } catch (err) {
      console.error("forwardMessage error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message, code: err.code || "FORWARD_FAILED" });
    }
  });

  // Save draft
  app.post("/api/email/drafts", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      const result = await mailConnector.saveDraft({
        mailbox: req.mailbox,
        payload: req.body,
      });
      res.json(result);
    } catch (err) {
      console.error("saveDraft error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // User preferences (owner/admin only - mailbox settings)
  app.get("/api/email/preferences", ...requireAdmin, async (req, res) => {
    const { getDb } = await import('./db/database.js');
    const db = getDb();
    let row = db.prepare("SELECT preferences FROM email_preferences WHERE user_id = ?").get(req.user.userId);
    res.json(row ? JSON.parse(row.preferences) : {});
  });

  app.post("/api/email/preferences", ...requireAdmin, async (req, res) => {
    const { getDb } = await import('./db/database.js');
    const db = getDb();
    const json = JSON.stringify(req.body);
    db.prepare("INSERT INTO email_preferences (user_id, preferences, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET preferences = ?, updated_at = datetime('now')").run(req.user.userId, json, json);
    res.json({ success: true });
  });

  app.post("/api/email/messages/:id/read", ...requireAdmin, attachMailbox, async (req, res) => {
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

  app.post("/api/email/messages/:id/move", ...requireAdmin, attachMailbox, async (req, res) => {
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

  app.delete("/api/email/messages/:id", ...requireAdmin, attachMailbox, async (req, res) => {
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

  // Business Email folders
  app.get("/api/email/folders", ...requireAdmin, async (req, res) => {
    try {
      const folders = await mailConnector.listFolders();
      res.json(folders);
    } catch (err) {
      console.error("listFolders error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Star/unstar message
  app.post("/api/email/messages/:id/star", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      const result = await mailConnector.starMessage({
        mailbox: req.mailbox,
        messageId: req.params.id,
        isStarred: req.body.isStarred,
      });
      res.json(result);
    } catch (err) {
      console.error("starMessage error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Download attachment
  app.get("/api/email/messages/:id/attachments/:attachmentId", ...requireAdmin, attachMailbox, async (req, res) => {
    try {
      const result = await mailConnector.fetchAttachment({
        mailbox: req.mailbox,
        messageId: req.params.id,
        attachmentId: req.params.attachmentId,
      });
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("Content-Length", result.size);
      if (result.content instanceof Buffer) {
        res.send(result.content);
      } else {
        res.send(result.content);
      }
    } catch (err) {
      console.error("fetchAttachment error:", err.message);
      if (err.statusCode === 404) {
        res.status(404).json({ error: "Attachment not found" });
      } else {
        res.status(err.statusCode || 500).json({ error: err.message });
      }
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
