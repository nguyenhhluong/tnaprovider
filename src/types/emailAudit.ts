export type EmailAuditAction =
  | "email.opened"
  | "email.sent"
  | "email.replied"
  | "email.forwarded"
  | "email.deleted"
  | "email.moved"
  | "email.attachment_downloaded"
  | "email.send_failed";

export interface EmailAuditEvent {
  id: string;
  userId: string;
  mailbox: string;
  messageId?: string;
  action: EmailAuditAction;
  timestamp: string;
  targetFolder?: string;
  recipientCount?: number;
  failureReason?: string;
}
