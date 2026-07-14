import type { EmailFolder, EmailMessage, ComposeEmailPayload, EmailStatus } from "../types/email";

const API_BASE = "/api/email";

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Email API error: ${res.status}`);
  }

  return res.json();
}

export interface SearchParams {
  search?: string;
  from?: string;
  to?: string;
  since?: string;
  before?: string;
  unread?: string;
  starred?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: EmailMessage[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  folder: string;
  query: any;
}

export async function listMessages(folder: EmailFolder, searchParams?: SearchParams): Promise<SearchResult> {
  const params = new URLSearchParams({ folder, pageSize: "25", page: "1" });
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
  }
  const qs = params.toString();
  return apiRequest<SearchResult>("GET", `/messages?${qs}`);
}

export async function getMessage(messageId: string): Promise<EmailMessage> {
  return apiRequest("GET", `/messages/${encodeURIComponent(messageId)}`);
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function sendEmail(payload: ComposeEmailPayload & { requestId?: string }): Promise<{ success: boolean; messageId: string; sentSync?: { status: string } }> {
  const form = new FormData();
  form.append("requestId", payload.requestId || generateIdempotencyKey());
  form.append("to", JSON.stringify(payload.to));
  if (payload.cc && payload.cc.length > 0) form.append("cc", JSON.stringify(payload.cc));
  if (payload.bcc && payload.bcc.length > 0) form.append("bcc", JSON.stringify(payload.bcc));
  form.append("subject", payload.subject);
  form.append("bodyText", payload.bodyText);
  if (payload.bodyHtml) form.append("bodyHtml", payload.bodyHtml);
  if (payload.replyToMessageId) form.append("replyToMessageId", payload.replyToMessageId);
  if (payload.references) form.append("references", JSON.stringify(payload.references));

  if (payload.attachments && payload.attachments.length > 0) {
    for (const file of payload.attachments) {
      form.append("attachments", file, file.name);
    }
  }

  const res = await fetch(`${API_BASE}/send`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Email API error: ${res.status}`);
  }

  return res.json();
}

export async function markEmailRead(messageId: string, isRead: boolean): Promise<void> {
  return apiRequest("POST", `/messages/${encodeURIComponent(messageId)}/read`, { isRead });
}

export async function starEmail(messageId: string, isStarred: boolean): Promise<void> {
  return apiRequest("POST", `/messages/${encodeURIComponent(messageId)}/star`, { isStarred });
}

export async function moveEmail(messageId: string, folder: EmailFolder): Promise<void> {
  return apiRequest("POST", `/messages/${encodeURIComponent(messageId)}/move`, { folder });
}

export async function deleteEmail(messageId: string): Promise<void> {
  return apiRequest("DELETE", `/messages/${encodeURIComponent(messageId)}`);
}

export async function getEmailStatus(): Promise<EmailStatus> {
  return apiRequest("GET", "/status/detailed");
}

export async function listFolders(): Promise<Array<{ name: string; path: string; specialUse: string | null }>> {
  return apiRequest("GET", "/folders");
}
