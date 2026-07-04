import type { EmailFolder, EmailMessage, ComposeEmailPayload } from "../types/email";

const MOCK_MODE = import.meta.env.VITE_EMAIL_MOCK_MODE !== "false";

const API_BASE = "/api/email";

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (MOCK_MODE) {
    throw new Error("Mock mode active — call mock functions directly");
  }

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

export async function listMessages(folder: EmailFolder): Promise<EmailMessage[]> {
  return apiRequest("GET", `/messages?folder=${folder}`);
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

// --- Mock mode functions ---

const mockEmails: Record<string, EmailMessage[]> = {
  inbox: [
    {
      id: "mock-inbox-1",
      folder: "inbox",
      from: { name: "Sarah Johnson", email: "sarah@johnsonprops.com" },
      to: [{ email: "info@tnaprovider.com.au" }],
      subject: "Kitchen Renovation Enquiry",
      preview: "Hi, I'm looking to renovate my kitchen and was wondering if you could provide a quote...",
      bodyHtml: "<p>Hi TNA Team,</p><p>I'm looking to renovate my kitchen and was wondering if you could provide a quote for custom joinery work. The space is approximately 4m x 3m.</p><p>Thanks,<br>Sarah</p>",
      receivedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      isRead: false,
      isStarred: true,
      hasAttachments: false,
    },
    {
      id: "mock-inbox-2",
      folder: "inbox",
      from: { name: "David Chen", email: "david@cheninteriors.com" },
      to: [{ email: "info@tnaprovider.com.au" }],
      subject: "Office Fitout Quote Follow-up",
      preview: "Just following up on the quote you sent last week for our office fitout...",
      bodyHtml: "<p>Hi,</p><p>Just following up on the quote you sent last week for our office fitout. We're keen to move forward.</p><p>Regards,<br>David</p>",
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isRead: false,
      isStarred: false,
      hasAttachments: true,
    },
    {
      id: "mock-inbox-3",
      folder: "inbox",
      from: { name: "Nexus Technologies", email: "procurement@nexustech.com" },
      to: [{ email: "projects@tnaprovider.com.au" }],
      subject: "Nexus Tech Hub — Stage 2 Approval",
      preview: "We have reviewed the designs and are pleased to approve Stage 2 of the project...",
      bodyHtml: "<p>Dear TNA Team,</p><p>We have reviewed the designs and are pleased to approve Stage 2 of the project.</p><p>Please proceed with manufacturing.</p><p>Best,<br>Procurement Team</p>",
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      isRead: true,
      isStarred: false,
      hasAttachments: true,
    },
  ],
  sent: [
    {
      id: "mock-sent-1",
      folder: "sent",
      from: { name: "TNA Provider", email: "info@tnaprovider.com.au" },
      to: [{ name: "Sarah Johnson", email: "sarah@johnsonprops.com" }],
      subject: "Re: Kitchen Renovation Enquiry",
      preview: "Thank you for reaching out! We would be happy to provide a quote...",
      bodyHtml: "<p>Hi Sarah,</p><p>Thank you for reaching out! We would be happy to provide a quote.</p><p>Could you let us know a good time for a site visit?</p><p>Best,<br>TNA Provider</p>",
      sentAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      receivedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      isRead: true,
      isStarred: false,
      hasAttachments: false,
    },
  ],
  drafts: [
    {
      id: "mock-draft-1",
      folder: "drafts",
      from: { name: "TNA Provider", email: "info@tnaprovider.com.au" },
      to: [{ name: "Client", email: "client@example.com" }],
      subject: "Draft proposal",
      preview: "Dear Client, Please find attached our proposal for the joinery work...",
      bodyHtml: "<p>Dear Client,</p><p>Please find attached our proposal for the joinery work.</p><p>Regards,<br>TNA Provider</p>",
      receivedAt: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      hasAttachments: false,
    },
  ],
  archive: [],
  trash: [],
  spam: [],
};

export function getMockEmails(folder: EmailFolder): EmailMessage[] {
  return mockEmails[folder] || [];
}

export function addMockEmail(folder: EmailFolder, email: EmailMessage): void {
  if (!mockEmails[folder]) mockEmails[folder] = [];
  mockEmails[folder].unshift(email);
}

export function removeMockEmail(messageId: string): void {
  for (const folder of Object.keys(mockEmails)) {
    mockEmails[folder] = mockEmails[folder].filter((e) => e.id !== messageId);
  }
}

export function updateMockEmail(messageId: string, updates: Partial<EmailMessage>): void {
  for (const folder of Object.keys(mockEmails)) {
    const idx = mockEmails[folder].findIndex((e) => e.id === messageId);
    if (idx !== -1) {
      mockEmails[folder][idx] = { ...mockEmails[folder][idx], ...updates };
    }
  }
}
