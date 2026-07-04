import { useState, useCallback } from "react";
import type { EmailFolder, EmailMessage, ComposeEmailPayload } from "../../../types/email";
import { MailboxSidebar } from "./MailboxSidebar";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { ComposeEmail } from "./ComposeEmail";
import { useEmailData } from "./useEmailData";
import { sendEmail } from "../../../utils/emailApi";
import { logEmailAudit } from "../../../utils/emailAudit";

const MOCK_MODE = import.meta.env.VITE_EMAIL_MOCK_MODE !== "false";

interface EmailLayoutProps {
  currentFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
}

export function EmailLayout({ currentFolder, onFolderChange }: EmailLayoutProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);

  const {
    messages,
    loading,
    error,
    markRead,
    moveMessage,
    deleteMsg,
    addSentMessage,
  } = useEmailData(currentFolder);

  const selectedMessage = messages.find((m) => m.id === selectedMessageId) || null;

  const handleSelectMessage = useCallback((id: string) => {
    setSelectedMessageId(id);
    markRead(id, true);
    logEmailAudit("user-1", "info@tnaprovider.com.au", "email.opened", { messageId: id });
  }, [markRead]);

  const handleCompose = useCallback(() => {
    setReplyTo(null);
    setShowCompose(true);
  }, []);

  const handleReply = useCallback((message: EmailMessage) => {
    setReplyTo(message);
    setShowCompose(true);
  }, []);

  const handleSend = useCallback(async (payload: ComposeEmailPayload) => {
    const newMsg: EmailMessage = {
      id: `sent-${Date.now()}`,
      folder: "sent",
      from: payload.from,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      preview: payload.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 100),
      bodyHtml: payload.bodyHtml,
      sentAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      hasAttachments: !!(payload.attachments && payload.attachments.length > 0),
    };

    if (MOCK_MODE) {
      addSentMessage(newMsg);
    } else {
      const result = await sendEmail(payload);
      newMsg.id = result.id;
      addSentMessage(newMsg);
    }

    setShowCompose(false);
    setReplyTo(null);
    logEmailAudit("user-1", "info@tnaprovider.com.au", "email.sent", {
      recipientCount: payload.to.length + (payload.cc?.length || 0) + (payload.bcc?.length || 0),
    });
  }, [addSentMessage]);

  const handleDelete = useCallback((id: string) => {
    moveMessage(id, "trash");
    if (selectedMessageId === id) setSelectedMessageId(null);
    logEmailAudit("user-1", "info@tnaprovider.com.au", "email.deleted", { messageId: id });
  }, [moveMessage, selectedMessageId]);

  const handleArchive = useCallback((id: string) => {
    moveMessage(id, "archive");
    if (selectedMessageId === id) setSelectedMessageId(null);
    logEmailAudit("user-1", "info@tnaprovider.com.au", "email.moved", {
      messageId: id,
      targetFolder: "archive",
    });
  }, [moveMessage, selectedMessageId]);

  const filteredMessages = messages.filter((m) => {
    if (unreadOnly && m.isRead) return false;
    if (starredOnly && !m.isStarred) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.from.email.toLowerCase().includes(q) ||
        (m.from.name || "").toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-1 overflow-hidden">
      <MailboxSidebar
        currentFolder={currentFolder}
        onFolderChange={onFolderChange}
        onCompose={handleCompose}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadOnly={unreadOnly}
        onUnreadOnlyChange={setUnreadOnly}
        starredOnly={starredOnly}
        onStarredOnlyChange={setStarredOnly}
      />

      <MessageList
        messages={filteredMessages}
        selectedId={selectedMessageId}
        onSelect={handleSelectMessage}
        loading={loading}
        error={error}
      />

      {selectedMessage && (
        <MessagePreview
          message={selectedMessage}
          onReply={handleReply}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onClose={() => setSelectedMessageId(null)}
        />
      )}

      {showCompose && (
        <ComposeEmail
          replyTo={replyTo}
          onSend={handleSend}
          onDiscard={() => { setShowCompose(false); setReplyTo(null); }}
        />
      )}
    </div>
  );
}
