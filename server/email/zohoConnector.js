import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

let imapClient = null;
let smtpTransporter = null;

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

  const textPart = src.text?.substring?.(0, 500) || "";
  const htmlPart = src.html || "";

  return {
    id: String(src.uid),
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
    preview: textPart.slice(0, 100) || htmlPart.replace(/<[^>]*>/g, "").slice(0, 100),
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
      bodyStructure: true,
      internalDate: true,
      source: true,
    })) {
      const parsed = convertMessage(msg, folder);
      if (msg.body && msg.body instanceof Buffer) {
        const text = msg.body.toString("utf-8");
        if (!parsed.bodyText) parsed.bodyText = text.slice(0, 500);
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

export async function getMessage({ messageId }) {
  const client = await ensureConnected();
  try {
    const mailbox = await client.mailboxOpen("INBOX");
    if (!mailbox) {
      for (const f of Object.values(folderMap)) {
        try {
          await client.mailboxOpen(f);
          break;
        } catch {}
      }
    }

    const msg = await client.fetchOne(parseInt(messageId), {
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
      internalDate: true,
      source: true,
    });

    if (!msg) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const result = convertMessage(msg, "inbox");

    if (msg.source) {
      const raw = msg.source.toString("utf-8");
      const htmlMatch = raw.match(/<html[^>]*>[\s\S]*?<\/html>/i);
      if (htmlMatch) result.bodyHtml = htmlMatch[0];
      const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?(?=\n--|\n$)/i);
      if (textMatch) {
        result.bodyText = textMatch[0].replace(/^.*\n/, "").trim().slice(0, 5000);
      }
    }

    return result;
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function sendMessage({ mailbox, payload }) {
  const { to, subject, bodyHtml, attachments, cc, bcc, replyToMessageId } = payload;

  if (!to || to.length === 0) {
    const err = new Error("At least one recipient is required");
    err.statusCode = 400;
    throw err;
  }

  const config = getSmtpConfig();
  const tr = getSmtpTransporter();

  const mailOptions = {
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: to.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    cc: cc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    bcc: bcc?.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(", "),
    subject,
    html: bodyHtml,
    text: bodyHtml ? bodyHtml.replace(/<[^>]*>/g, "") : "",
    attachments: attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.mimeType,
    })),
  };

  if (replyToMessageId) {
    mailOptions.inReplyTo = replyToMessageId;
    mailOptions.references = replyToMessageId;
  }

  const info = await tr.sendMail(mailOptions);
  return { id: info.messageId, messageId: info.messageId };
}

export async function markMessageRead({ messageId, isRead }) {
  const client = await ensureConnected();
  try {
    const mailbox = await client.mailboxOpen("INBOX");
    if (isRead) {
      await client.messageFlagsAdd(parseInt(messageId), ["\\Seen"]);
    } else {
      await client.messageFlagsRemove(parseInt(messageId), ["\\Seen"]);
    }
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function moveMessage({ messageId, folder }) {
  const resolvedFolder = resolveFolder(folder);
  const client = await ensureConnected();
  try {
    const mailboxes = await client.list();
    const targetExists = mailboxes.some(
      (m) => m.path === resolvedFolder || m.name === resolvedFolder
    );
    if (!targetExists) {
      return { success: true, warning: `Folder "${resolvedFolder}" does not exist on server` };
    }
    await client.messageMove(parseInt(messageId), resolvedFolder);
    return { success: true };
  } finally {
    try { await client.logout(); } catch {}
    imapClient = null;
  }
}

export async function deleteMessage({ messageId }) {
  const client = await ensureConnected();
  try {
    await client.messageDelete(parseInt(messageId));
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
  const client = await ensureConnected();
  try {
    await client.mailboxOpen("INBOX");
    const msg = await client.fetchOne(parseInt(messageId), {
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

    const fetchMsg = await client.fetchOne(parseInt(messageId), {
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
