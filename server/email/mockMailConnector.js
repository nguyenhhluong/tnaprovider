const mockStore = { messages: [], sentCount: 0 };

export function getMailConfig() {
  return {
    provider: "mock",
    inboundReady: true,
    outboundReady: true,
    attachmentsReady: true,
  };
}

export async function listMessages({ folder }) {
  return mockStore.messages.filter((m) => !folder || m.folder === folder);
}

export async function getMessage({ messageId }) {
  const msg = mockStore.messages.find((m) => m.id === messageId);
  if (!msg) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }
  return msg;
}

export async function sendMessage({ mailbox, payload }) {
  const { to, subject, attachments, bodyHtml } = payload;
  if (!to || to.length === 0) {
    const err = new Error("At least one recipient is required");
    err.statusCode = 400;
    throw err;
  }
  mockStore.sentCount++;
  const msg = {
    id: `sent-${Date.now()}`,
    folder: "sent",
    ...payload,
    from: { name: "TNA Provider", email: mailbox },
    sentAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: !!(attachments && attachments.length > 0),
  };
  mockStore.messages.push(msg);
  return { id: msg.id };
}

export async function markMessageRead({ messageId, isRead }) {
  const msg = mockStore.messages.find((m) => m.id === messageId);
  if (msg) msg.isRead = isRead;
  return { success: true };
}

export async function moveMessage({ messageId, folder }) {
  const idx = mockStore.messages.findIndex((m) => m.id === messageId);
  if (idx !== -1) mockStore.messages[idx].folder = folder;
  return { success: true };
}

export async function deleteMessage({ messageId }) {
  mockStore.messages = mockStore.messages.filter((m) => m.id !== messageId);
  return { success: true };
}
