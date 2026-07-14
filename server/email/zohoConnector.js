import crypto from "node:crypto";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";

let smtpTransporter = null;

// ── Opaque message ID encoding ──

function encodeId(folder, uid) {
  const obj = JSON.stringify({ f: folder, u: uid });
  return Buffer.from(obj).toString("base64url");
}

function decodeId(id) {
  try {
    const json = Buffer.from(id, "base64url").toString("utf-8");
    const { f, u } = JSON.parse(json);
    return { folder: f, uid: parseInt(u) };
  } catch {
    return null;
  }
}

const folderMap = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
  spam: "Spam",
};

function getImapConfig() {
  return {
    host: process.env.ZOHO_IMAP_HOST || "imap.zoho.com.au",
    port: parseInt(process.env.ZOHO_IMAP_PORT || "993", 10),
    secure: process.env.ZOHO_IMAP_SECURE !== "false",
    user: process.env.ZOHO_IMAP_USER || "info@tnaprovider.com.au",
    pass: process.env.ZOHO_IMAP_PASSWORD || "",
  };
}

function getSmtpConfig() {
  return {
    host: process.env.ZOHO_SMTP_HOST || "",
    port: parseInt(process.env.ZOHO_SMTP_PORT || "465", 10),
    secure: process.env.ZOHO_SMTP_SECURE !== "false",
    user: process.env.ZOHO_SMTP_USER || "",
    pass: process.env.ZOHO_SMTP_PASSWORD || "",
    fromName: process.env.EMAIL_FROM_NAME || "TNA Provider",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "",
  };
}

function validateSmtpConfig() {
  const cfg = getSmtpConfig();
  const missing = [];
  if (!cfg.host) missing.push("ZOHO_SMTP_HOST");
  if (!cfg.pass) missing.push("ZOHO_SMTP_PASSWORD");
  if (!cfg.user) missing.push("ZOHO_SMTP_USER");
  if (!cfg.fromAddress) missing.push("EMAIL_FROM_ADDRESS");
  if (!Number.isFinite(cfg.port) || cfg.port < 1 || cfg.port > 65535) missing.push("ZOHO_SMTP_PORT (invalid)");
  if (missing.length > 0) {
    const err = new Error(`SMTP is not configured for Business Email. Missing: ${missing.join(", ")}`);
    err.statusCode = 503;
    throw err;
  }
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  validateSmtpConfig();
  const cfg = getSmtpConfig();
  smtpTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return smtpTransporter;
}

// ── Atomic idempotency store ──
// ── Atomic idempotency store ──
// Single-process in-memory. Not cluster-safe. Lost on restart.

const idempotencyStore = new Map();
function parsePositiveInt(value, fallback, minimum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < (minimum || 1000)) return fallback;
  return parsed;
}

const IDEMPOTENCY_TTL = parsePositiveInt(process.env.EMAIL_IDEMPOTENCY_TTL_MS, 3600000, 60000);
const IDEMPOTENCY_CLEANUP_INTERVAL = parsePositiveInt(process.env.EMAIL_IDEMPOTENCY_CLEANUP_INTERVAL_MS, 300000, 5000);
const MAX_REQUEST_ID_LENGTH = 256;

let cleanupTimer = null;
function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of idempotencyStore) {
      if (now >= entry.expiresAt) idempotencyStore.delete(key);
    }
  }, IDEMPOTENCY_CLEANUP_INTERVAL);
  if (cleanupTimer.unref) cleanupTimer.unref();
}
startCleanup();

function normalizeAddresses(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  const seen = new Set();
  return arr
    .filter((a) => a && a.email)
    .map((a) => ({ name: (a.name || "").trim(), email: a.email.toLowerCase().trim() }))
    .filter((a) => { const k = a.email; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.email.localeCompare(b.email));
}

function stableValue(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value === "object") {
    const sorted = {};
    Object.keys(value).sort().forEach((k) => { sorted[k] = stableValue(value[k]); });
    return sorted;
  }
  return value;
}

function computePayloadHash(payload) {
  const canonical = {
    to: normalizeAddresses(payload.to).map((a) => ({ email: a.email, name: a.name })),
    cc: normalizeAddresses(payload.cc).map((a) => ({ email: a.email, name: a.name })),
    bcc: normalizeAddresses(payload.bcc).map((a) => ({ email: a.email, name: a.name })),
    subject: (payload.subject || "").trim(),
    bodyText: payload.bodyText || "",
    bodyHtml: payload.bodyHtml || "",
    replyToMessageId: payload.replyToMessageId || "",
    references: (payload.references || []).slice().sort(),
    attachments: (payload.attachments || []).map((a) => {
      const buf = a.buffer || a.content || Buffer.alloc(0);
      const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
      return { filename: a.filename || "attachment", mimeType: a.mimeType || "application/octet-stream", size: buf.length, sha256 };
    }),
  };
  const json = JSON.stringify(stableValue(canonical));
  return crypto.createHash("sha256").update(json).digest("hex");
}

function generateMessageId() {
  const ts = Date.now();
  const rnd = crypto.randomBytes(8).toString("hex");
  const domain = (process.env.EMAIL_FROM_ADDRESS || "tnaprovider.com.au").split("@").pop() || "tnaprovider.com.au";
  return `<${ts}.${rnd}@${domain}>`;
}

function validateRequestId(rid) {
  if (!rid || typeof rid !== "string") return "requestId is required";
  if (rid.length > MAX_REQUEST_ID_LENGTH) return "requestId exceeds maximum length";
  if (!rid.trim()) return "requestId must not be empty";
  return null;
}

function classifyError(err) {
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  if (["invalid_recipients", "missing_smtp_config", "invalid_multipart_payload", "attachment_too_large"].includes(code)) return "FAILED_RETRYABLE";
  if (msg.includes("auth") || msg.includes("authenticate") || msg.includes("credentials")) return "FAILED_RETRYABLE";
  if (msg.includes("connect econnrefused") || msg.includes("connect etimedout") || msg.includes("enotfound")) return "FAILED_RETRYABLE";
  if (err.statusCode === 400 || msg.includes("rejected") || msg.includes("spam") || msg.includes("blocked")) return "FAILED_FINAL";
  if (msg.includes("timeout") || msg.includes("socket") || msg.includes("econnreset") || msg.includes("epipe")) return "AMBIGUOUS";
  return "FAILED_RETRYABLE";
}

async function reconcileFromSent(messageId) {
  if (!messageId) return null;
  try {
    const sentId = await findInSent(messageId);
    if (sentId) return { success: true, messageId, accepted: [], rejected: [], sentSync: { status: "confirmed", folder: "Sent", messageId: sentId }, reconciled: true };
  } catch {}
  return null;
}

async function withIdempotency(requestId, payload, sendFn) {
  const verr = validateRequestId(requestId);
  if (verr) { const e = new Error(verr); e.statusCode = 400; e.code = "INVALID_REQUEST_ID"; throw e; }

  const incomingHash = computePayloadHash(payload);
  let entry = idempotencyStore.get(requestId);

  if (entry && Date.now() >= entry.expiresAt) { idempotencyStore.delete(requestId); entry = null; }

  if (entry) {
    if (entry.payloadHash !== incomingHash) {
      const e = new Error("Idempotency key conflict: different payload");
      e.statusCode = 409; e.code = "IDEMPOTENCY_KEY_CONFLICT"; throw e;
    }
    if (entry.status === "SUCCEEDED") return entry.result;
    if (entry.status === "PENDING" && entry.promise) return entry.promise;
    if (entry.status === "FAILED_RETRYABLE") { /* fall through to re-reserve */ }
    if (entry.status === "FAILED_FINAL") {
      const e = new Error("Previous send failed with a non-recoverable error");
      e.statusCode = 409; e.code = "IDEMPOTENCY_KEY_BLOCKED"; e.previousError = entry.errorCode; throw e;
    }
    if (entry.status === "AMBIGUOUS") {
      const rec = await reconcileFromSent(entry.messageId);
      if (rec) { entry.status = "SUCCEEDED"; entry.result = rec; return rec; }
      const e = new Error("Previous send status is ambiguous. Check Sent folder.");
      e.statusCode = 409; e.code = "IDEMPOTENCY_KEY_AMBIGUOUS"; throw e;
    }
  }

  const messageId = generateMessageId();
  const newEntry = { status: "PENDING", payloadHash: incomingHash, promise: null, result: null, errorCode: null, messageId, expiresAt: Date.now() + IDEMPOTENCY_TTL, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  idempotencyStore.set(requestId, newEntry);

  const promise = (async () => {
    try {
      const result = await sendFn(messageId);
      newEntry.status = "SUCCEEDED"; newEntry.result = result; newEntry.promise = null; newEntry.updatedAt = new Date().toISOString();
      return result;
    } catch (err) {
      const cat = classifyError(err);
      newEntry.status = cat; newEntry.errorCode = err.code || cat; newEntry.promise = null; newEntry.updatedAt = new Date().toISOString();
      if (cat === "AMBIGUOUS") {
        const rec = await reconcileFromSent(newEntry.messageId);
        if (rec) { newEntry.status = "SUCCEEDED"; newEntry.result = rec; return rec; }
      }
      throw err;
    }
  })();

  newEntry.promise = promise;
  return promise;
}

// ── IMAP helpers ──

function getImapClient() {
  const config = getImapConfig();
  if (!config.pass) {
    const err = new Error("Zoho IMAP password not configured. Set ZOHO_IMAP_PASSWORD.");
    err.statusCode = 501;
    throw err;
  }
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

async function withClient(fn) {
  const client = getImapClient();
  try {
    await client.connect();
    return await fn(client);
  } finally {
    try { await client.logout(); } catch {}
  }
}

function convertMessage(src, folder) {
  const srcUid = src.uid;
  const envelope = src.envelope || {};
  const fromAddr = (envelope.from || [])[0] || {};
  const toAddrs = (envelope.to || []).map((a) => ({
    name: a.name || undefined,
    email: a.address || "",
  }));
  const ccAddrs = (envelope.cc || []).map((a) => ({
    name: a.name || undefined,
    email: a.address || "",
  }));
  const bccAddrs = (envelope.bcc || []).map((a) => ({
    name: a.name || undefined,
    email: a.address || "",
  }));
  const textPart = src.text?.substring?.(0, 500) || "";
  const htmlPart = src.html || "";
  const preview = textPart.slice(0, 100) || htmlPart.replace(/<[^>]*>/g, "").slice(0, 100) || (envelope.subject || "").slice(0, 100);
  return {
    id: encodeId(folder, src.uid),
    uid: src.uid,
    folder,
    messageId: envelope.messageId || "",
    from: { name: fromAddr.name || undefined, address: fromAddr.address || "" },
    to: toAddrs,
    cc: ccAddrs.length > 0 ? ccAddrs : undefined,
    bcc: bccAddrs.length > 0 ? bccAddrs : undefined,
    subject: envelope.subject || "(No subject)",
    preview,
    bodyText: textPart || undefined,
    bodyHtml: htmlPart || undefined,
    receivedAt: src.internalDate?.toISOString?.() || new Date().toISOString(),
    sentAt: envelope.date ? new Date(envelope.date).toISOString() : undefined,
    isRead: !!src.flags?.includes?.("\\Seen"),
    isStarred: !!src.flags?.includes?.("\\Flagged"),
    hasAttachments: (src.attachments || []).length > 0,
    attachments: (src.attachments || []).map((att, i) => ({
      id: encodeAttachmentToken(folder, srcUid, i, att.filename, att.id),
      filename: att.filename || "unnamed",
      mimeType: att.mimeType || "application/octet-stream",
      sizeBytes: att.size || 0,
      contentId: att.id,
    })),
  };
}

// ── Attachment token ──

function encodeAttachmentToken(folder, uid, index, filename, contentId) {
  const obj = { f: folder, u: uid, i: index };
  if (filename) obj.n = filename;
  if (contentId) obj.c = contentId;
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function decodeAttachmentToken(token) {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const obj = JSON.parse(json);
    if (!obj.f || typeof obj.u !== "number" || typeof obj.i !== "number") return null;
    return obj;
  } catch { return null; }
}

// ── Exported API ──

export function getMailConfig() {
  const imap = getImapConfig();
  const smtp = getSmtpConfig();
  return {
    provider: "zoho",
    inboundReady: !!imap.host && !!imap.pass,
    outboundReady: !!smtp.host && !!smtp.pass,
    attachmentsReady: true,
    mailbox: imap.user,
  };
}

export async function listMessages({ folder, page = 1, pageSize = 25 }) {
  const resolvedFolder = folderMap[folder] || folder;
  return withClient(async (client) => {
    const mailbox = await client.mailboxOpen(resolvedFolder);
    if (!mailbox || mailbox.exists === 0) {
      return { items: [], page, pageSize, totalItems: 0, totalPages: 0, folder: resolvedFolder };
    }

    // Get all real UIDs
    const allUids = await client.search({ all: true }, { returnOptions: ["ALL"] });
    let uidList = [];
    if (allUids?.all) {
      const ranges = allUids.all.split(",");
      for (const range of ranges) {
        if (range.includes(":")) {
          const [s, e] = range.split(":").map(Number);
          for (let i = s; i <= e; i++) uidList.push(i);
        } else {
          uidList.push(Number(range));
        }
      }
    }
    uidList.sort((a, b) => b - a);
    if (uidList.length === 0) {
      return { items: [], page, pageSize, totalItems: 0, totalPages: 0, folder: resolvedFolder };
    }

    const totalItems = uidList.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;
    const pageUids = uidList.slice(start, start + pageSize);

    const items = [];
    for await (const msg of client.fetch({ uid: pageUids }, { uid: true, envelope: true, flags: true, internalDate: true })) {
      items.push(convertMessage(msg, folder));
    }
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return { items, page, pageSize, totalItems, totalPages, folder: resolvedFolder };
  });
}

export async function searchMessages({ folder, search, from, to, since, before, unread, starred, page = 1, pageSize = 25 }) {
  const resolvedFolder = folderMap[folder] || folder;
  return withClient(async (client) => {
    const mailbox = await client.mailboxOpen(resolvedFolder);
    if (!mailbox || mailbox.exists === 0) {
      return { items: [], page, pageSize, totalItems: 0, totalPages: 0, folder: resolvedFolder, query: { search, from } };
    }

    // Parse advanced search operators
    let effectiveSearch = search;
    let effectiveFrom = from;
    let effectiveTo = to;
    if (search && !from && !to) {
      const fromMatch = search.match(/from:(\S+)/i);
      const toMatch = search.match(/to:(\S+)/i);
      const subjectMatch = search.match(/subject:(\S+)/i);
      const hasAttach = search.match(/has:attachment/i);
      const isUnread = search.match(/is:unread/i);
      const isStarred = search.match(/is:starred/i);
      if (fromMatch) { effectiveFrom = fromMatch[1]; effectiveSearch = effectiveSearch.replace(fromMatch[0], "").trim(); }
      if (toMatch) { effectiveTo = toMatch[1]; effectiveSearch = effectiveSearch.replace(toMatch[0], "").trim(); }
      if (subjectMatch) { if (!effectiveSearch) effectiveSearch = subjectMatch[1]; else effectiveSearch = effectiveSearch.replace(subjectMatch[0], subjectMatch[1]).trim(); }
      if (hasAttach) { /* handled below if needed */ }
      if (isUnread) { unread = "true"; effectiveSearch = effectiveSearch.replace(isUnread[0], "").trim(); }
      if (isStarred) { starred = "true"; effectiveSearch = effectiveSearch.replace(isStarred[0], "").trim(); }
    }

    const query = {};
    if (effectiveSearch) query.or = [{ subject: effectiveSearch }, { text: effectiveSearch }];
    if (effectiveFrom) query.from = effectiveFrom;
    if (effectiveTo) query.to = effectiveTo;
    if (since) query.since = new Date(since);
    if (before) query.before = new Date(before);
    if (unread === "true") query.seen = false;
    if (unread === "false") query.seen = true;
    if (starred === "true") query.flagged = true;

    let allUids = [];
    if (Object.keys(query).length > 0) {
      const result = await client.search(query, { returnOptions: ["ALL"] });
      if (result?.all) {
        const ranges = result.all.split(",");
        for (const range of ranges) {
          if (range.includes(":")) {
            const [s, e] = range.split(":").map(Number);
            for (let i = s; i <= e; i++) allUids.push(i);
          } else {
            allUids.push(Number(range));
          }
        }
      }
    } else {
      allUids = await client.search({ all: true });
    }
    allUids.sort((a, b) => b - a);

    const totalItems = allUids.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const pageUids = allUids.slice(start, start + pageSize);

    if (pageUids.length === 0) {
      return { items: [], page, pageSize, totalItems, totalPages, folder: resolvedFolder, query: { search, from } };
    }

    const items = [];
    for await (const msg of client.fetch({ uid: pageUids }, { uid: true, envelope: true, flags: true, internalDate: true })) {
      const conv = convertMessage(msg, folder);
      items.push(conv);
    }
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return { items, page, pageSize, totalItems, totalPages, folder: resolvedFolder, query: { search, from } };
  });
}

export async function getMessage({ messageId }) {
  const decoded = decodeId(messageId);
  if (!decoded) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }
  const { folder, uid } = decoded;
  const resolvedFolder = folderMap[folder] || folder;

  return withClient(async (client) => {
    await client.mailboxOpen(resolvedFolder);
    // Use UID-based fetch by passing the UID number and including uid:true in query
    const msg = await client.fetchOne(uid, { uid: true, envelope: true, flags: true, internalDate: true, source: true });
    if (!msg) { const e = new Error("Message not found"); e.statusCode = 404; throw e; }

    const result = convertMessage(msg, folder);

    if (msg.source) {
      try {
        const parsed = await simpleParser(msg.source);
        // MIME body fallback: use parsed text/html, then check attachment parts
        let bodyText = parsed.text || "";
        let bodyHtml = parsed.html || "";

        // For multipart/report and delivery-status, extract from attachments
        if (!bodyText && !bodyHtml && parsed.attachments.length > 0) {
          for (const att of parsed.attachments) {
            const ct = (att.contentType || "").toLowerCase();
            const content = att.content;
            if (!content) continue;
            if (ct.startsWith("text/plain") || ct === "text/rfc822-headers") {
              const text = content instanceof Buffer ? content.toString("utf-8") : String(content);
              if (text.trim()) { bodyText = text; break; }
            }
            if (ct.startsWith("text/html")) {
              const html = content instanceof Buffer ? content.toString("utf-8") : String(content);
              if (html.trim()) { bodyHtml = html; break; }
            }
          }
        }

        result.bodyText = bodyText || undefined;
        result.bodyHtml = bodyHtml || undefined;

        // Update sender/metadata from parsed result when envelope is incomplete
        if (!result.from?.name && !result.from?.address && parsed.from) {
          result.from = { name: parsed.from.name || undefined, address: parsed.from.text || "" };
        }
        if ((!result.to || result.to.length === 0) && parsed.to) {
          result.to = (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).map((a) => ({
            name: a.name || undefined,
            email: a.text || "",
          }));
        }
        if (!result.subject && parsed.subject) result.subject = parsed.subject;
        if (!result.messageId && parsed.messageId) result.messageId = parsed.messageId;

        result.attachments = parsed.attachments.map((att, idx) => ({
          id: encodeAttachmentToken(folder, result.uid, idx, att.filename, att.contentId),
          filename: att.filename || "unnamed",
          mimeType: att.contentType || "application/octet-stream",
          sizeBytes: att.size || 0,
          contentId: att.contentId,
        }));
        result.hasAttachments = parsed.attachments.length > 0;
      } catch (parseError) {
        console.error("Email MIME parse failed", {
          folder,
          uid,
          sourceBytes: msg.source?.length || 0,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        // Ensure fallback: try to extract basic text from raw source
        if (!result.bodyText && !result.bodyHtml && msg.source.length > 0) {
          const rawText = msg.source.toString("utf-8").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
          if (rawText.length > 50) result.bodyText = rawText.slice(0, 5000);
        }
      }
    }

    return result;
  });
}

export async function saveDraft({ mailbox, payload }) {
  // Save a draft message to Zoho Drafts folder via IMAP APPEND
  return withClient(async (client) => {
    try { await client.mailboxOpen("Drafts"); } catch { await client.mailboxOpen("INBOX"); }
    const cfg = getSmtpConfig();
    const raw = [
      "From: " + `"${cfg.fromName}" <${cfg.fromAddress}>`,
      "To: " + (payload.to || []).map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
      "Subject: " + (payload.subject || "(no subject)"),
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 7bit",
      "Date: " + new Date().toUTCString(),
      "",
      payload.bodyText || "",
    ].join("\r\n");
    const result = await client.append("Drafts", [Buffer.from(raw, "utf-8")], ["\\Draft"], new Date());
    return { success: true, uid: result?.uid };
  });
}

export async function forwardMessage({ messageId, payload, requestId }) {
  const decoded = decodeId(messageId);
  if (!decoded) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }

  // Fetch original message to include as quote/attachment
  const originalMsg = await getMessage({ messageId });
  const fwdSubject = originalMsg.subject.startsWith("Fwd:") ? originalMsg.subject : `Fwd: ${originalMsg.subject}`;
  const fwdBody = `\n\n---------- Forwarded message ---------\nFrom: ${originalMsg.from.name || originalMsg.from.address}\nSubject: ${originalMsg.subject}\nDate: ${originalMsg.receivedAt}\n\n${originalMsg.bodyText || ""}`;

  const fwdPayload = { ...payload, subject: fwdSubject, bodyText: (payload.bodyText || "") + fwdBody };
  return sendMessage({ payload: fwdPayload, requestId });
}

export async function sendMessage({ mailbox, payload, requestId }) {
  const sendFn = async (preGeneratedMessageId) => {
    validateSmtpConfig();

    if (!payload.to || payload.to.length === 0) {
      const e = new Error("At least one recipient is required");
      e.statusCode = 400;
      throw e;
    }

    const cfg = getSmtpConfig();
    const tr = getSmtpTransporter();
    const mailOptions = {
      from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
      to: payload.to.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
      cc: payload.cc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
      bcc: payload.bcc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
      subject: payload.subject,
      text: payload.bodyText || (payload.bodyHtml ? payload.bodyHtml.replace(/<[^>]*>/g, "") : ""),
      html: payload.bodyHtml || undefined,
      messageId: preGeneratedMessageId || undefined,
    };

    if (payload.attachments?.length > 0) {
      mailOptions.attachments = payload.attachments.map((att) => ({
        filename: att.filename || "attachment",
        content: att.buffer || att.content,
        contentType: att.mimeType || "application/octet-stream",
      }));
    }

    if (payload.replyToMessageId) {
      mailOptions.inReplyTo = payload.replyToMessageId;
      mailOptions.references = payload.references || [payload.replyToMessageId];
    }

    const info = await tr.sendMail(mailOptions);

    let sentSync = { status: "pending" };
    try {
      const sentMsgId = await findInSent(info.messageId);
      if (sentMsgId) sentSync = { status: "confirmed", folder: "Sent", messageId: sentMsgId };
      else sentSync = { status: "pending" };
    } catch {}

    return { success: true, messageId: info.messageId, accepted: info.accepted || [], rejected: info.rejected || [], sentSync };
  };

  return withIdempotency(requestId, payload, sendFn);
}

async function findInSent(rfcMessageId) {
  return withClient(async (client) => {
    try { await client.mailboxOpen("Sent"); } catch { return null; }
    const attempts = [0, 1];
    for (const delay of attempts) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay * 1000));
      const result = await client.search({ header: { "Message-ID": rfcMessageId } }, { returnOptions: ["ALL"] });
      if (result?.all) {
        const parts = result.all.split(",");
        const firstUid = parseInt(parts[0]);
        if (!isNaN(firstUid) && firstUid > 0) return encodeId("sent", firstUid);
      }
    }
    return null;
  });
}

export async function markMessageRead({ messageId, isRead }) {
  const d = decodeId(messageId);
  if (!d) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }
  return withClient(async (client) => {
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    if (isRead) await client.messageFlagsAdd(d.uid, ["\\Seen"]);
    else await client.messageFlagsRemove(d.uid, ["\\Seen"]);
    return { success: true };
  });
}

export async function starMessage({ messageId, isStarred }) {
  const d = decodeId(messageId);
  if (!d) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }
  return withClient(async (client) => {
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    if (isStarred) await client.messageFlagsAdd(d.uid, ["\\Flagged"]);
    else await client.messageFlagsRemove(d.uid, ["\\Flagged"]);
    return { success: true };
  });
}

export async function moveMessage({ messageId, folder: targetFolder }) {
  const d = decodeId(messageId);
  if (!d) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }
  const resolvedTarget = folderMap[targetFolder] || targetFolder;
  return withClient(async (client) => {
    const mailboxes = await client.list();
    const targetExists = mailboxes.some((m) => m.path === resolvedTarget || m.name === resolvedTarget);
    if (!targetExists) {
      return { success: true, warning: `Folder "${resolvedTarget}" does not exist` };
    }
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    await client.messageMove(d.uid, resolvedTarget);
    return { success: true };
  });
}

export async function deleteMessage({ messageId }) {
  const d = decodeId(messageId);
  if (!d) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }
  return withClient(async (client) => {
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    await client.messageDelete(d.uid);
    return { success: true };
  });
}

export async function listFolders() {
  return withClient(async (client) => {
    const mailboxes = await client.list();
    return mailboxes.map((m) => ({
      name: m.name,
      path: m.path,
      specialUse: m.specialUse || null,
    }));
  });
}

export async function fetchAttachment({ messageId, attachmentId }) {
  const d = decodeId(messageId);
  if (!d) { const e = new Error("Invalid message ID"); e.statusCode = 400; throw e; }

  const attToken = decodeAttachmentToken(attachmentId);
  if (!attToken) { const e = new Error("Invalid attachment token"); e.statusCode = 400; throw e; }
  if (attToken.f !== d.folder || attToken.u !== d.uid) {
    const e = new Error("Attachment token does not match the message"); e.statusCode = 400; throw e;
  }

  return withClient(async (client) => {
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    // Fetch by UID with uid:true option
    const msg = await client.fetchOne(d.uid, { uid: true, source: true });
    if (!msg?.source) { const e = new Error("Message not found"); e.statusCode = 404; throw e; }

    let parsed;
    try {
      parsed = await simpleParser(msg.source);
    } catch (parseError) {
      console.error("Attachment parse failed", { folder: d.folder, uid: d.uid, error: parseError.message });
      const e = new Error("Could not parse message to extract attachment"); e.statusCode = 500; throw e;
    }

    if (!parsed.attachments || attToken.i >= parsed.attachments.length) {
      const e = new Error("Attachment not found"); e.statusCode = 404; throw e;
    }

    const att = parsed.attachments[attToken.i];
    return {
      filename: att.filename || "attachment",
      mimeType: att.contentType || "application/octet-stream",
      size: att.size || att.content.length || 0,
      content: att.content,
    };
  });
}
