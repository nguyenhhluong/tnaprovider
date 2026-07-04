import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const smtpHost = process.env.MAIL_SMTP_HOST || "";
  const smtpPort = parseInt(process.env.MAIL_SMTP_PORT || "587");
  const smtpUser = process.env.MAIL_SMTP_USER || "";
  const smtpPass = process.env.MAIL_SMTP_PASS || "";

  if (!smtpHost) {
    const err = new Error("SMTP host not configured. Set MAIL_SMTP_HOST.");
    err.statusCode = 501;
    throw err;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
  return transporter;
}

export function getMailConfig() {
  const smtpHost = process.env.MAIL_SMTP_HOST || "";
  return {
    provider: "smtp",
    inboundReady: false,
    outboundReady: !!smtpHost,
    attachmentsReady: false,
  };
}

export async function sendMessage({ mailbox, payload }) {
  const { to, subject, bodyHtml, attachments } = payload;

  if (!to || to.length === 0) {
    const err = new Error("At least one recipient is required");
    err.statusCode = 400;
    throw err;
  }

  if (attachments && attachments.length > 0) {
    const err = new Error("Attachments are not supported in live email mode yet.");
    err.statusCode = 400;
    throw err;
  }

  const tr = getTransporter();
  const info = await tr.sendMail({
    from: `"${payload.from?.name || "TNA Provider"}" <${mailbox}>`,
    to: to.map((a) => a.email).join(", "),
    cc: payload.cc?.map((a) => a.email).join(", "),
    bcc: payload.bcc?.map((a) => a.email).join(", "),
    subject,
    html: bodyHtml,
  });
  return { id: info.messageId };
}

export async function listMessages() {
  const err = new Error("Inbound mail connector not configured (SMTP mode). Set MAIL_PROVIDER to imap-smtp or mock for inbox access.");
  err.statusCode = 501;
  throw err;
}

export async function getMessage() {
  const err = new Error("Inbound mail connector not configured (SMTP mode). Set MAIL_PROVIDER to imap-smtp or mock for message reading.");
  err.statusCode = 501;
  throw err;
}

export async function markMessageRead() {
  const err = new Error("Inbound mail connector not configured (SMTP mode).");
  err.statusCode = 501;
  throw err;
}

export async function moveMessage() {
  const err = new Error("Inbound mail connector not configured (SMTP mode).");
  err.statusCode = 501;
  throw err;
}

export async function deleteMessage() {
  const err = new Error("Inbound mail connector not configured (SMTP mode).");
  err.statusCode = 501;
  throw err;
}
