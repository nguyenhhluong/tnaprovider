import { getDb } from '../db/database.js';

const BOUNCE_PATTERNS = [
  { pattern: /DOMAIN_NOT_RESOLVED/i, code: 'DOMAIN_NOT_RESOLVED' },
  { pattern: /User unknown/i, code: 'USER_UNKNOWN' },
  { pattern: /Mailbox not found/i, code: 'MAILBOX_NOT_FOUND' },
  { pattern: /No such user/i, code: 'NO_SUCH_USER' },
  { pattern: /Undeliverable/i, code: 'UNDELIVERABLE' },
  { pattern: /Delivery failed/i, code: 'DELIVERY_FAILED' },
  { pattern: /Address rejected/i, code: 'ADDRESS_REJECTED' },
  { pattern: /Relay access denied/i, code: 'RELAY_DENIED' },
  { pattern: /Over quota/i, code: 'OVER_QUOTA' },
  { pattern: /Mailbox full/i, code: 'MAILBOX_FULL' },
  { pattern: /Message expired/i, code: 'MESSAGE_EXPIRED' },
  { pattern: /Connection refused/i, code: 'CONNECTION_REFUSED' },
  { pattern: /Undelivered Mail Returned to Sender/i, code: 'UNDELIVERED' },
];

function extractFailedRecipient(text) {
  if (!text) return null;
  const patterns = [
    /Final-Recipient:.*?;\s*(.+)/i,
    /Original-Recipient:.*?;\s*(.+)/i,
    /X-Original-Recipient:\s*(.+)/i,
    /Failed recipient:\s*(.+)/i,
    /<(.+?)>:/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const email = m[1].trim().replace(/[<>]/g, '');
      if (email.includes('@')) return email;
    }
  }
  return null;
}

function extractDiagnosticCode(text) {
  if (!text) return null;
  const m = text.match(/Diagnostic-Code:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

function extractOriginalMessageId(text) {
  if (!text) return null;
  const m = text.match(/Original-Message-ID:\s*(.+)/i) || text.match(/Message-ID:\s*(.+)/i);
  return m ? m[1].trim() : null;
}

function classifyBounce(text) {
  if (!text) return { isBounce: false };
  const isBounce = /mailer-daemon|postmaster/i.test(text) &&
    /Undelivered|delivery failed|returned to sender|non-delivery/i.test(text);
  if (!isBounce) return { isBounce: false };

  let bounceCode = 'UNKNOWN';
  for (const { pattern, code } of BOUNCE_PATTERNS) {
    if (pattern.test(text)) { bounceCode = code; break; }
  }

  const failedRecipient = extractFailedRecipient(text);
  const diagnosticCode = extractDiagnosticCode(text);
  const originalMessageId = extractOriginalMessageId(text);

  return { isBounce: true, bounceCode, failedRecipient, diagnosticCode, originalMessageId };
}

export function processInboundBounce({ from, subject, bodyText, bodyHtml, messageId }) {
  if (!from?.address) return null;
  if (!/mailer-daemon|postmaster/i.test(from.address)) return null;

  const text = bodyText || bodyHtml || '';
  const result = classifyBounce(text);
  if (!result.isBounce) return null;

  const db = getDb();

  let matchedJob = null;
  if (result.failedRecipient) {
    matchedJob = db.prepare(
      `SELECT id, type, recipient, status FROM email_jobs WHERE recipient = ? AND status NOT IN ('CANCELLED','FAILED_VALIDATION') ORDER BY created_at DESC LIMIT 1`
    ).get(result.failedRecipient);
  }

  if (matchedJob) {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE email_jobs SET status = 'FAILED', last_error = ?, updated_at = ? WHERE id = ?`
    ).run(
      `Bounced: ${result.bounceCode}${result.diagnosticCode ? ' — ' + result.diagnosticCode.slice(0, 200) : ''}`,
      now,
      matchedJob.id,
    );
    console.log(`[bounce] Matched bounce to email job ${matchedJob.id}: ${matchedJob.recipient} (${result.bounceCode})`);
    return { matched: true, jobId: matchedJob.id, bounceCode: result.bounceCode, recipient: result.failedRecipient };
  }

  console.log(`[bounce] Unmatched bounce from ${from.address}: ${result.bounceCode} (recipient: ${result.failedRecipient || 'unknown'})`);
  return { matched: false, bounceCode: result.bounceCode, recipient: result.failedRecipient };
}

export { classifyBounce, extractFailedRecipient, extractDiagnosticCode, extractOriginalMessageId };
