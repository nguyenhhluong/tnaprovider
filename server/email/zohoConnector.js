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

// ── Idempotency store ──

const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 3600000; // 1 hour

function getIdempotencyResult(key) {
  const entry = idempotencyStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    idempotencyStore.delete(key);
    return null;
  }
  return entry.result;
}

function setIdempotencyResult(key, result) {
  idempotencyStore.set(key, { result, expiresAt: Date.now() + IDEMPOTENCY_TTL });
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
      id: att.id || `part${i + 1}`,
      filename: att.filename || "unnamed",
      mimeType: att.mimeType || "application/octet-stream",
      sizeBytes: att.size || 0,
      part: att.part,
    })),
  };
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

    const query = {};
    if (search) query.or = [{ subject: search }, { text: search }];
    if (from) query.from = from;
    if (to) query.to = to;
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
    const msg = await client.fetchOne(uid, { uid: true, envelope: true, flags: true, internalDate: true, source: true });
    if (!msg) { const e = new Error("Message not found"); e.statusCode = 404; throw e; }

    const result = convertMessage(msg, folder);
    if (msg.source) {
      try {
        const parsed = await simpleParser(msg.source);
        result.bodyText = parsed.text || undefined;
        result.bodyHtml = parsed.html || undefined;
        result.attachments = parsed.attachments.map((att, idx) => ({
          id: att.contentId || `part${idx + 1}`,
          filename: att.filename || "unnamed",
          mimeType: att.contentType || "application/octet-stream",
          sizeBytes: att.size || 0,
          contentId: att.contentId,
        }));
        result.hasAttachments = parsed.attachments.length > 0;
      } catch {}
    }
    return result;
  });
}

export async function sendMessage({ mailbox, payload, requestId }) {
  // Idempotency check
  if (requestId) {
    const existing = getIdempotencyResult(requestId);
    if (existing) return existing;
  }

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
  const messageId = info.messageId;

  // Verify sent folder sync
  let sentSync = { status: "pending" };
  try {
    const sentMsgId = await findInSent(messageId);
    if (sentMsgId) {
      sentSync = { status: "confirmed", folder: "Sent", messageId: sentMsgId };
    } else {
      sentSync = { status: "pending" };
    }
  } catch {}

  const result = { success: true, messageId, accepted: info.accepted || [], rejected: info.rejected || [], sentSync };

  if (requestId) setIdempotencyResult(requestId, result);
  return result;
}

async function findInSent(rfcMessageId) {
  return withClient(async (client) => {
    try { await client.mailboxOpen("Sent"); } catch { return null; }
    const result = await client.search({ header: { "Message-ID": rfcMessageId } }, { returnOptions: ["ALL"] });
    if (result?.all) {
      const firstUid = parseInt(result.all.split(",")[0]);
      if (firstUid) return encodeId("sent", firstUid);
    }
    // Retry once after short delay (async indexing)
    await new Promise((r) => setTimeout(r, 1000));
    const result2 = await client.search({ header: { "Message-ID": rfcMessageId } }, { returnOptions: ["ALL"] });
    if (result2?.all) {
      const firstUid = parseInt(result2.all.split(",")[0]);
      if (firstUid) return encodeId("sent", firstUid);
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
  return withClient(async (client) => {
    await client.mailboxOpen(folderMap[d.folder] || d.folder);
    const msg = await client.fetchOne(d.uid, { uid: true, bodyStructure: true });
    if (!msg) { const e = new Error("Message not found"); e.statusCode = 404; throw e; }

    const att = (msg.bodyStructure?.attachments || []).find((a) => a.id === attachmentId || a.part === attachmentId);
    if (!att) { const e = new Error("Attachment not found"); e.statusCode = 404; throw e; }

    const fetchMsg = await client.fetchOne(d.uid, { uid: true, source: true });
    if (!fetchMsg?.source) { const e = new Error("Could not fetch attachment"); e.statusCode = 500; throw e; }

    return { filename: att.filename || "attachment", mimeType: att.mimeType || "application/octet-stream", size: att.size || 0, content: fetchMsg.source };
  });
}
