import type { EmailAuditEvent, EmailAuditAction } from "../types/emailAudit";

const auditLog: EmailAuditEvent[] = [];

export function logEmailAudit(
  userId: string,
  mailbox: string,
  action: EmailAuditAction,
  details?: Partial<Pick<EmailAuditEvent, "messageId" | "targetFolder" | "recipientCount" | "failureReason">>
): EmailAuditEvent {
  const event: EmailAuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    mailbox,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };
  auditLog.push(event);
  console.log("[EMAIL AUDIT]", JSON.stringify(event));
  return event;
}

export function getAuditLog(): EmailAuditEvent[] {
  return [...auditLog];
}

export function getAuditLogForUser(userId: string): EmailAuditEvent[] {
  return auditLog.filter((e) => e.userId === userId);
}
