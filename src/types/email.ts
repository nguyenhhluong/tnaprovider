export type EmailFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "archive"
  | "trash"
  | "spam";

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl?: string;
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  folder: EmailFolder;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  preview: string;
  bodyText?: string;
  bodyHtml?: string;
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
}

export interface ComposeEmailPayload {
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyHtml: string;
  attachments?: File[];
  replyToMessageId?: string;
}

export interface MailboxAccount {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "project_manager" | "accounts" | "staff";
  canSend: boolean;
  canDelete: boolean;
}

export interface EmailStatus {
  provider: "mock" | "smtp" | "imap-smtp" | "stalwart";
  inboundReady: boolean;
  outboundReady: boolean;
  attachmentsReady: boolean;
  mailbox: string;
}
