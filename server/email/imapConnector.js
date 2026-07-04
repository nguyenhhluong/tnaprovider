import { ImapFlow } from "imapflow";

let client = null;

const folderMap = {
  inbox: "INBOX",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
  spam: "Junk",
};

function getClient() {
  if (client) return client;
  const imapHost = process.env.MAIL_IMAP_HOST || "";
  const imapPort = parseInt(process.env.MAIL_IMAP_PORT || "993");
  const imapSecure = process.env.MAIL_IMAP_SECURE !== "false";
  const imapUser = process.env.MAIL_IMAP_USER || "";
  const imapPass = process.env.MAIL_IMAP_PASS || "";

  if (!imapHost) {
    const err = new Error("IMAP host not configured. Set MAIL_IMAP_HOST.");
    err.statusCode = 501;
    throw err;
  }

  client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapSecure,
    auth: {
      user: imapUser,
      pass: imapPass,
    },
    logger: false,
  });
  return client;
}

function resolveFolder(folder) {
  return folderMap[folder] || folder;
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
    threadId: String(src.uid),
    folder,
    from: {
      name: fromAddr.name || undefined,
      email: fromAddr.address || "",
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
    })),
  };
}

export function getMailConfig() {
  const imapHost = process.env.MAIL_IMAP_HOST || "";
  const smtpHost = process.env.MAIL_SMTP_HOST || "";
  return {
    provider: "imap-smtp",
    inboundReady: !!imapHost,
    outboundReady: !!smtpHost,
    attachmentsReady: false,
  };
}

export async function listMessages({ folder }) {
  const resolvedFolder = resolveFolder(folder);
  const c = getClient();
  await c.connect();

  try {
    const mailbox = await c.mailboxOpen(resolvedFolder);
    if (!mailbox) {
      await c.logout();
      return [];
    }

    const messages = [];
    for await (const msg of c.fetch(
      { uid: mailbox.exists > 0 ? `1:${mailbox.exists}` : "1:*" },
      {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        internalDate: true,
        source: true,
      }
    )) {
      const parsed = convertMessage(msg, folder);

      // Extract text/plain and text/html from body
      if (msg.body && msg.body instanceof Buffer) {
        const text = msg.body.toString("utf-8");
        if (!parsed.bodyText) parsed.bodyText = text.slice(0, 500);
      }

      messages.push(parsed);
    }

    // Try to extract body text from source
    for (const msg of messages) {
      try {
        const src = msg.id;
        const fetchMsg = await c.fetchOne(src, { source: true });
        if (fetchMsg?.source) {
          const raw = fetchMsg.source.toString("utf-8");
          // Simple HTML extraction from raw source
          const htmlMatch = raw.match(/<html[^>]*>[\s\S]*?<\/html>/i);
          if (htmlMatch) msg.bodyHtml = htmlMatch[0];
          const textMatch = raw.match(
            /Content-Type:\s*text\/plain[\s\S]*?(?=\n--|\n$)/i
          );
          if (textMatch && !msg.bodyText) {
            msg.bodyText = textMatch[0].replace(/^.*\n/, "").trim().slice(0, 500);
          }
        }
      } catch {
        // Non-critical: body extraction best-effort
      }
    }

    await c.logout();
    return messages;
  } catch (err) {
    await c.logout().catch(() => {});
    throw err;
  }
}

export async function getMessage({ messageId }) {
  const c = getClient();
  await c.connect();

  try {
    const msg = await c.fetchOne(messageId, {
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
      internalDate: true,
      source: true,
    });

    if (!msg) {
      await c.logout();
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const result = convertMessage(msg, "inbox");

    // Try to parse body from source
    if (msg.source) {
      const raw = msg.source.toString("utf-8");
      const htmlMatch = raw.match(/<html[^>]*>[\s\S]*?<\/html>/i);
      if (htmlMatch) result.bodyHtml = htmlMatch[0];
      const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?(?=\n--|\n$)/i);
      if (textMatch) {
        result.bodyText = textMatch[0].replace(/^.*\n/, "").trim().slice(0, 500);
      }
    }

    await c.logout();
    return result;
  } catch (err) {
    await c.logout().catch(() => {});
    throw err;
  }
}

export async function sendMessage({ mailbox, payload }) {
  // SMTP send is delegated to smtpConnector; import and delegate
  const { sendMessage: smtpSend } = await import("./smtpConnector.js");
  return smtpSend({ mailbox, payload });
}

export async function markMessageRead({ messageId, isRead }) {
  const c = getClient();
  await c.connect();

  try {
    if (isRead) {
      await c.messageFlagsAdd(messageId, ["\\Seen"]);
    } else {
      await c.messageFlagsRemove(messageId, ["\\Seen"]);
    }
    await c.logout();
    return { success: true };
  } catch (err) {
    await c.logout().catch(() => {});
    throw err;
  }
}

export async function moveMessage({ messageId, folder }) {
  const resolvedFolder = resolveFolder(folder);
  const c = getClient();
  await c.connect();

  try {
    // Ensure the target mailbox exists; if not, return empty success
    const mailboxes = await c.list();
    const targetExists = mailboxes.some(
      (m) => m.path === resolvedFolder || m.name === resolvedFolder
    );
    if (!targetExists) {
      await c.logout();
      return { success: true, warning: `Folder "${resolvedFolder}" does not exist on server` };
    }

    await c.messageMove(messageId, resolvedFolder);
    await c.logout();
    return { success: true };
  } catch (err) {
    await c.logout().catch(() => {});
    throw err;
  }
}

export async function deleteMessage({ messageId }) {
  const c = getClient();
  await c.connect();

  try {
    await c.messageDelete(messageId);
    await c.logout();
    return { success: true };
  } catch (err) {
    await c.logout().catch(() => {});
    throw err;
  }
}
