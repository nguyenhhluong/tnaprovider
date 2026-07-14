import * as mockConnector from "./mockMailConnector.js";
import * as smtpConnector from "./smtpConnector.js";
import * as imapConnector from "./imapConnector.js";
import * as zohoConnector from "./zohoConnector.js";

function getProvider() {
  return process.env.MAIL_PROVIDER || "mock";
}

function getConnector() {
  switch (getProvider()) {
    case "zoho":
      return zohoConnector;
    case "imap-smtp":
      return imapConnector;
    case "smtp":
      return smtpConnector;
    case "mock":
    default:
      return mockConnector;
  }
}

export function getMailConfig() {
  return getConnector().getMailConfig();
}

export async function listMessages({ mailbox, folder, page, pageSize }) {
  return getConnector().listMessages({ mailbox, folder, page, pageSize });
}

export async function searchMessages({ mailbox, folder, search, from, to, since, before, unread, starred, page, pageSize }) {
  const connector = getConnector();
  if (connector.searchMessages) {
    return connector.searchMessages({ folder, search, from, to, since, before, unread, starred, page, pageSize });
  }
  // Fallback: list all and filter client-side
  return getConnector().listMessages({ mailbox, folder });
}

export async function getMessage({ mailbox, messageId }) {
  return getConnector().getMessage({ mailbox, messageId });
}

export async function starMessage({ mailbox, messageId, isStarred }) {
  const connector = getConnector();
  if (connector.starMessage) {
    return connector.starMessage({ messageId, isStarred });
  }
  const err = new Error("Star not supported in current provider mode");
  err.statusCode = 501;
  throw err;
}

export async function sendMessage({ mailbox, payload, requestId }) {
  return getConnector().sendMessage({ mailbox, payload, requestId });
}

export async function markMessageRead({ mailbox, messageId, isRead }) {
  return getConnector().markMessageRead({ mailbox, messageId, isRead });
}

export async function moveMessage({ mailbox, messageId, folder }) {
  return getConnector().moveMessage({ mailbox, messageId, folder });
}

export async function deleteMessage({ mailbox, messageId }) {
  return getConnector().deleteMessage({ mailbox, messageId });
}

export async function listFolders() {
  const connector = getConnector();
  if (connector.listFolders) {
    return connector.listFolders();
  }
  return [
    { name: "INBOX", path: "INBOX", specialUse: "\\Inbox" },
    { name: "Sent", path: "Sent", specialUse: "\\Sent" },
    { name: "Drafts", path: "Drafts", specialUse: "\\Drafts" },
    { name: "Archive", path: "Archive", specialUse: "\\Archive" },
    { name: "Trash", path: "Trash", specialUse: "\\Trash" },
    { name: "Spam", path: "Spam", specialUse: "\\Junk" },
  ];
}

export async function fetchAttachment({ mailbox, messageId, attachmentId }) {
  const connector = getConnector();
  if (connector.fetchAttachment) {
    return connector.fetchAttachment({ messageId, attachmentId });
  }
  const err = new Error("Attachment fetching not supported in current provider mode");
  err.statusCode = 501;
  throw err;
}
