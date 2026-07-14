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
      let to = [], cc = [], bcc = [], subject = "", bodyText = "", bodyHtml = "";
      let replyToMessageId = "", references = [], requestId = "";
      const attachments = [];
      let totalBytes = 0;
      const MAX_FILE_BYTES = 25 * 1024 * 1024;
      const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
      const MAX_FILES = 10;

      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("multipart/form-data")) {
        let aborted = false;
        const busboy = (await import("busboy")).default;
        const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES } });

        await new Promise((resolve, reject) => {
          bb.on("field", (name, val) => {
            if (name === "to") try { const p = JSON.parse(val); to = Array.isArray(p) ? p : [p]; } catch { return reject(Object.assign(new Error("Invalid To field"), { statusCode: 400, code: "INVALID_RECIPIENTS" })); }
            else if (name === "cc") try { const p = JSON.parse(val); cc = Array.isArray(p) ? p : [p]; } catch {}
            else if (name === "bcc") try { const p = JSON.parse(val); bcc = Array.isArray(p) ? p : [p]; } catch {}
            else if (name === "subject") subject = val;
            else if (name === "bodyText") bodyText = val;
            else if (name === "bodyHtml") bodyHtml = val;
            else if (name === "replyToMessageId") replyToMessageId = val;
            else if (name === "references") try { const p = JSON.parse(val); references = Array.isArray(p) ? p : [p]; } catch {}
            else if (name === "requestId") requestId = val;
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
                return reject(Object.assign(new Error(`Attachment too large: ${info.filename} (max 25MB)`), { statusCode: 400, code: "ATTACHMENT_TOO_LARGE" }));
              }
              chunks.push(chunk);
            });
            stream.on("end", () => {
              if (aborted) return;
              const buffer = Buffer.concat(chunks);
              totalBytes += buffer.length;
              if (totalBytes > MAX_TOTAL_BYTES) {
                aborted = true;
                return reject(Object.assign(new Error("Total attachment size exceeds 50MB limit"), { statusCode: 400, code: "TOTAL_ATTACHMENT_LIMIT_EXCEEDED" }));
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
      if (!to || to.length === 0) {
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

  // Business Email folders
  app.get("/api/email/folders", requireSessionAuth, requirePasswordChanged, async (req, res) => {
    try {
      const folders = await mailConnector.listFolders();
      res.json(folders);
    } catch (err) {
      console.error("listFolders error:", err.message);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // Star/unstar message
  app.post("/api/email/messages/:id/star", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
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
  app.get("/api/email/messages/:id/attachments/:attachmentId", requireSessionAuth, requirePasswordChanged, attachMailbox, async (req, res) => {
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
