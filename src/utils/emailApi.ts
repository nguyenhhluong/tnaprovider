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

export async function listMessages(folder: EmailFolder, searchParams?: SearchParams): Promise<EmailMessage[] | SearchResult> {
  const params = new URLSearchParams({ folder });
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
  }
  const qs = params.toString();
  const result = await apiRequest<any>("GET", `/messages?${qs}`);

  // If it has items and totalItems, it's a search result (paginated)
  if (result.items !== undefined) {
    return result;
  }
  // Otherwise it's a flat array of messages (legacy)
  return result;
}

export async function getMessage(messageId: string): Promise<EmailMessage> {
  return apiRequest("GET", `/messages/${messageId}`);
}

export async function sendEmail(payload: ComposeEmailPayload): Promise<{ id: string }> {
  return apiRequest("POST", "/send", payload);
}

export async function markEmailRead(messageId: string, isRead: boolean): Promise<void> {
  return apiRequest("POST", `/messages/${messageId}/read`, { isRead });
}

export async function moveEmail(messageId: string, folder: EmailFolder): Promise<void> {
  return apiRequest("POST", `/messages/${messageId}/move`, { folder });
}

export async function deleteEmail(messageId: string): Promise<void> {
  return apiRequest("DELETE", `/messages/${messageId}`);
}

export async function getEmailStatus(): Promise<EmailStatus> {
  return apiRequest("GET", "/status/detailed");
}

export async function starEmail(messageId: string, isStarred: boolean): Promise<void> {
  return apiRequest("POST", `/messages/${messageId}/star`, { isStarred });
}

export async function listFolders(): Promise<Array<{ name: string; path: string; specialUse: string | null }>> {
  return apiRequest("GET", "/folders");
}
