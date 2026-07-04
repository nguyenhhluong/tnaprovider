// Unified mail connector — delegates to the correct backend connector
// based on MAIL_PROVIDER env var.

import * as mockConnector from "./mockMailConnector.js";
import * as smtpConnector from "./smtpConnector.js";
import * as imapConnector from "./imapConnector.js";

function getProvider() {
  return process.env.MAIL_PROVIDER || "mock";
}

function getConnector() {
  switch (getProvider()) {
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

export async function listMessages({ mailbox, folder }) {
  return getConnector().listMessages({ mailbox, folder });
}

export async function getMessage({ mailbox, messageId }) {
  return getConnector().getMessage({ mailbox, messageId });
}

export async function sendMessage({ mailbox, payload }) {
  return getConnector().sendMessage({ mailbox, payload });
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
