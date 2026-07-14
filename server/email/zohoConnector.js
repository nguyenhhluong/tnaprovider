import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";

let imapClient = null;
let smtpTransporter = null;

// Encode folder + UID into a stable identifier
function encodeId(folder, uid) {
  const folderKey = Object.entries(folderMap).find(([, v]) => v === folder)?.[0] || folder;
  return `${folderKey}:${uid}`;
}

// Decode a stable identifier back to folder and UID
function decodeId(id) {
  const colonIdx = id.indexOf(":");
  if (colonIdx === -1) return { folder: "inbox", uid: parseInt(id) };
  const folderKey = id.substring(0, colonIdx);
  const uid = parseInt(id.substring(colonIdx + 1));
  const folder = folderMap[folderKey] || folderKey;
  return { folder, uid };
}

const folderMap = {
  inbox: "INBOX",
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
    host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com.au",
    port: parseInt(process.env.ZOHO_SMTP_PORT || "465", 10),
    secure: process.env.ZOHO_SMTP_SECURE !== "false",
    user: process.env.ZOHO_SMTP_USER || "info@tnaprovider.com.au",
    pass: process.env.ZOHO_SMTP_PASSWORD || "",
    fromName: process.env.EMAIL_FROM_NAME || "TNA Provider",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "info@tnaprovider.com.au",
  };
}

function getImapClient() {
  if (imapClient) return imapClient;
  const config = getImapConfig();
  if (!config.pass) {
    const err = new Error("Zoho IMAP password not configured. Set ZOHO_IMAP_PASSWORD.");
    err.statusCode = 501;
    throw err;
  }
  imapClient = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    logger: false,
    verifyState: true,
  });
  return imapClient;
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const config = getSmtpConfig();
  smtpTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
  });
  return smtpTransporter;
}

async function ensureConnected() {
  const client = getImapClient();
  if (!client.usable) {
    try { await client.connect(); } catch (err) {
      imapClient = null;
      const responseText = err.responseText || err.message || "";
      if (responseText.includes("enable IMAP")) {
        const imapErr = new Error("IMAP is not enabled for this mailbox. Enable IMAP Access in Zoho Mail Settings (Settings → Mail Accounts → IMAP Access).");
        imapErr.statusCode = 503;
        throw imapErr;
      }
      throw err;
    }
  }
  return client;
}

function resolveFolder(folder) {
  return folderMap[folder.toLowerCase()] || folder;
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

  // Use ImapFlow's text/html body fields if available, else derive from source
  const textPart = src.text?.substring?.(0, 500) || "";
  const htmlPart = src.html || "";
  const preview = textPart.slice(0, 100) || htmlPart.replace(/<[^>]*>/g, "").slice(0, 100) || (envelope.subject || "").slice(0, 100);

  return {
    id: encodeId(folder, src.uid),
    uid: src.uid,
    folder,
    messageId: envelope.messageId || "",
    from: {
      name: fromAddr.name || undefined,
      address: fromAddr.address || "",
    },
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
    attachments: (src.attachments || []).map((att) => ({
      id: att.id || att.part,
      filename: att.filename || "unnamed",
      mimeType: att.mimeType || "application/octet-stream",
      sizeBytes: att.size || 0,
      part: att.part,
    })),
  };
}

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

export async function listMessages({ folder }) {
  const resolvedFolder = resolveFolder(folder);
  const client = await ensureConnected();
  try {
    const mailbox = await client.mailboxOpen(resolvedFolder);
    if (!mailbox) return [];

    const messages = [];
    const fetchRange = mailbox.exists > 0
      ? { uid: mailbox.exists > 50 ? `${mailbox.exists - 49}:*` : `1:*` }
      : { uid: "1:*" };

    for await (const msg of client.fetch(fetchRange, {
      uid: true,
      envelope: true,
      flags: true,
      internalDate: true,
      body: true,
    })) {
      const parsed = convertMessage(msg, folder);
      // Try to get a text preview from the body (ImapFlow decodes text/plain parts)
      if (!parsed.preview && msg.body && msg.body instanceof Buffer) {
        try {
          const rawText = msg.body.toString("utf-8").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
          parsed.preview = rawText.slice(0, 100);
        } catch {}
      }
      messages.push(parsed);
    }

    messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    return messages;
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function searchMessages({ folder, search, from, to, since, before, unread, starred, page = 1, pageSize = 25 }) {
  const resolvedFolder = resolveFolder(folder);
  const client = await ensureConnected();
  try {
    const mailbox = await client.mailboxOpen(resolvedFolder);
    if (!mailbox || mailbox.exists === 0) {
      return { items: [], page, pageSize, totalItems: 0, totalPages: 0, folder: resolvedFolder, query: { search, from } };
    }

    // Build ImapFlow search query object
    const query = {};

    if (search) {
      query.or = [{ subject: search }, { text: search }];
    }
    if (from) {
      query.from = from;
    }
    if (to) {
      query.to = to;
    }
    if (since) {
      query.since = new Date(since);
    }
    if (before) {
      query.before = new Date(before);
    }
    if (unread === "true" || unread === true) {
      query.seen = false;
    }
    if (unread === "false" || unread === false) {
      query.seen = true;
    }
    if (starred === "true" || starred === true) {
      query.flagged = true;
    }

    // Execute search with ImapFlow query object
    let result;
    if (Object.keys(query).length > 0) {
      result = await client.search(query, { returnOptions: ["COUNT", "ALL"] });
    }

    // Parse UIDs from search result
    let allUids = [];
    if (result && result.all) {
      // all is a packed message range like "1,3,5:10"
      const ranges = result.all.split(",");
      for (const range of ranges) {
        if (range.includes(":")) {
          const [start, end] = range.split(":").map(Number);
          for (let i = start; i <= end; i++) allUids.push(i);
        } else {
          allUids.push(Number(range));
        }
      }
    } else if (Object.keys(query).length === 0) {
      // No criteria - fetch all sequence numbers
      for (let i = 1; i <= mailbox.exists; i++) allUids.push(i);
    }

    // Sort newest first (assuming higher UID = newer)
    allUids.sort((a, b) => b - a);

    const totalItems = allUids.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIdx = (page - 1) * pageSize;
    const pageUids = allUids.slice(startIdx, startIdx + pageSize);

    if (pageUids.length === 0) {
      return { items: [], page, pageSize, totalItems, totalPages, folder: resolvedFolder, query: { search, from } };
    }

    // Fetch metadata for the requested page (no bodyStructure to save bandwidth)
    const items = [];
    for await (const msg of client.fetch(
      { uid: pageUids },
      { uid: true, envelope: true, flags: true, internalDate: true, body: true }
    )) {
      const envelope = msg.envelope || {};
      const fromAddr = (envelope.from || [])[0] || {};
      const toAddrs = (envelope.to || []).map((a) => ({ name: a.name || undefined, email: a.address || "" }));
      const textPart = msg.text?.substring?.(0, 200) || "";
      const htmlPart = msg.html || "";
      let preview = textPart.slice(0, 100) || htmlPart.replace(/<[^>]*>/g, "").slice(0, 100);

      // Fallback: use mailparser if ImapFlow didn't decode body
      if (!preview && msg.body && msg.body instanceof Buffer) {
        try {
          const parsedMail = await simpleParser(msg.body);
          preview = (parsedMail.text || parsedMail.html?.replace(/<[^>]*>/g, "") || "").slice(0, 100);
        } catch {}
      }

      items.push({
        id: encodeId(folder, msg.uid),
        uid: msg.uid,
        folder,
        messageId: envelope.messageId || "",
        from: { name: fromAddr.name || undefined, address: fromAddr.address || "" },
        to: toAddrs,
        subject: envelope.subject || "(No subject)",
        preview,
        receivedAt: msg.internalDate?.toISOString?.() || new Date().toISOString(),
        isRead: !!msg.flags?.includes?.("\\Seen"),
        isStarred: !!msg.flags?.includes?.("\\Flagged"),
        hasAttachments: (msg.attachments || []).length > 0,
      });
    }

    // Restore newest-first order
    items.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return { items, page, pageSize, totalItems, totalPages, folder: resolvedFolder, query: { search, from } };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function getMessage({ messageId }) {
  const { folder, uid } = decodeId(messageId);
  const client = await ensureConnected();
  try {
    // Open the specific folder first, then try others if not found
    let msg = null;
    const foldersToTry = [folderMap[folder] || folder, ...Object.values(folderMap).filter(f => f !== (folderMap[folder] || folder))];
    
    for (const f of foldersToTry) {
      try {
        await client.mailboxOpen(f);
        msg = await client.fetchOne(uid, {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          internalDate: true,
          source: true,
        });
        if (msg) break;
      } catch {}
    }

    if (!msg) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const result = convertMessage(msg, folder);

    // Use mailparser to properly parse MIME structure
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
      } catch (parseErr) {
        console.error("[zohoConnector] mailparser error for message", messageId, ":", parseErr.message);
      }
    }

    return result;
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function sendMessage({ mailbox, payload }) {
  const { to, subject, bodyText, bodyHtml, attachments, cc, bcc, replyToMessageId, references } = payload;

  // Validate SMTP config before attempting send
  const config = getSmtpConfig();
  if (!config.host || !config.pass) {
    const err = new Error("SMTP is not configured for Business Email. Check ZOHO_SMTP_* environment variables.");
    err.statusCode = 503;
    throw err;
  }

  if (!to || to.length === 0) {
    const err = new Error("At least one recipient is required");
    err.statusCode = 400;
    throw err;
  }

  const tr = getSmtpTransporter();

  const mailOptions = {
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: to.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    cc: cc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    bcc: bcc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    subject,
    text: bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]*>/g, "") : ""),
    html: bodyHtml || undefined,
  };

  // Attachments from multipart form
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = [];
    for (const att of attachments) {
      if (att.buffer || att.content) {
        mailOptions.attachments.push({
          filename: att.filename || "attachment",
          content: att.buffer || att.content,
          contentType: att.mimeType || att.contentType || "application/octet-stream",
        });
      }
    }
    if (mailOptions.attachments.length === 0) delete mailOptions.attachments;
  }

  // Reply threading - use RFC Message-ID, not IMAP UID
  if (replyToMessageId) {
    mailOptions.inReplyTo = replyToMessageId;
    mailOptions.references = references || [replyToMessageId];
  }

  const info = await tr.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
}

export async function starMessage({ messageId, isStarred }) {
  const { folder, uid } = decodeId(messageId);
  const client = await ensureConnected();
  try {
    await client.mailboxOpen(folderMap[folder] || folder);
    if (isStarred) {
      await client.messageFlagsAdd(uid, ["\\Flagged"]);
    } else {
      await client.messageFlagsRemove(uid, ["\\Flagged"]);
    }
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function markMessageRead({ messageId, isRead }) {
  const { folder, uid } = decodeId(messageId);
  const client = await ensureConnected();
  try {
    await client.mailboxOpen(folderMap[folder] || folder);
    if (isRead) {
      await client.messageFlagsAdd(uid, ["\\Seen"]);
    } else {
      await client.messageFlagsRemove(uid, ["\\Seen"]);
    }
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function moveMessage({ messageId, folder: targetFolder }) {
  const { folder: sourceFolder, uid } = decodeId(messageId);
  const resolvedTarget = resolveFolder(targetFolder);
  const resolvedSource = folderMap[sourceFolder] || sourceFolder;
  const client = await ensureConnected();
  try {
    const mailboxes = await client.list();
    const targetExists = mailboxes.some(
      (m) => m.path === resolvedTarget || m.name === resolvedTarget
    );
    if (!targetExists) {
      return { success: true, warning: `Folder "${resolvedTarget}" does not exist on server` };
    }
    await client.mailboxOpen(resolvedSource);
    await client.messageMove(uid, resolvedTarget);
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function deleteMessage({ messageId }) {
  const { folder, uid } = decodeId(messageId);
  const client = await ensureConnected();
  try {
    await client.mailboxOpen(folderMap[folder] || folder);
    await client.messageDelete(uid);
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function listFolders() {
  const client = await ensureConnected();
  try {
    const mailboxes = await client.list();
    return mailboxes
      .filter((m) => !m.name.startsWith("[Gmail]") || m.name === "[Gmail]/Spam" || m.name === "[Gmail]/Trash")
      .map((m) => ({
        name: m.name,
        path: m.path,
        delimiter: m.delimiter,
        specialUse: m.specialUse || null,
      }));
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function fetchAttachment({ messageId, attachmentId }) {
  const { folder, uid } = decodeId(messageId);
  const client = await ensureConnected();
  try {
    await client.mailboxOpen(folderMap[folder] || folder);
    const msg = await client.fetchOne(uid, {
      uid: true,
      bodyStructure: true,
    });
    if (!msg) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const att = (msg.bodyStructure?.attachments || []).find(
      (a) => a.id === attachmentId || a.part === attachmentId
    );
    if (!att) {
      const err = new Error("Attachment not found");
      err.statusCode = 404;
      throw err;
    }

    const fetchMsg = await client.fetchOne(uid, {
      uid: true,
      source: true,
    });
    if (!fetchMsg?.source) {
      const err = new Error("Could not fetch attachment data");
      err.statusCode = 500;
      throw err;
    }

    return {
      filename: att.filename || "attachment",
      mimeType: att.mimeType || "application/octet-stream",
      size: att.size || 0,
      content: fetchMsg.source,
    };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}
