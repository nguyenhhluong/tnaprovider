// Unified mail connector — delegates to the correct backend connector
// based on MAIL_PROVIDER env var.
//
// Supported providers:
//   mock       — in-memory store, all ops work, no real server needed
//   smtp       — SMTP outbound only, inbound returns 501
//   imap-smtp  — IMAP for inbox/move/delete + SMTP for send
//   stalwart   — JMAP API (not yet implemented, returns 501)

import * as mockConnector from "./mockMailConnector.js";
import * as smtpConnector from "./smtpConnector.js";
import * as imapConnector from "./imapConnector.js";

function getProvider() {
  return process.env.MAIL_PROVIDER || "mock";
}

function notImplemented(operation) {
  const err = new Error(
    `Stalwart JMAP connector not implemented yet. Operation "${operation}" is not available. Set MAIL_PROVIDER=mock for development.`
  );
  err.statusCode = 501;
  throw err;
}

const stalwartStub = {
  getMailConfig() {
    return {
      provider: "stalwart",
      inboundReady: false,
      outboundReady: false,
      attachmentsReady: false,
    };
  },
  listMessages: () => notImplemented("listMessages"),
  getMessage: () => notImplemented("getMessage"),
  sendMessage: () => notImplemented("sendMessage"),
  markMessageRead: () => notImplemented("markMessageRead"),
  moveMessage: () => notImplemented("moveMessage"),
  deleteMessage: () => notImplemented("deleteMessage"),
};

function getConnector() {
  switch (getProvider()) {
    case "imap-smtp":
      return imapConnector;
    case "smtp":
      return smtpConnector;
    case "stalwart":
      return stalwartStub;
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
