import { useState, useCallback, useEffect } from "react";
import type { EmailFolder, EmailMessage, ComposeEmailPayload, EmailStatus } from "../../../types/email";
import { MailboxSidebar } from "./MailboxSidebar";
import { MessageList } from "./MessageList";
import { MessagePreview } from "./MessagePreview";
import { ComposeEmail } from "./ComposeEmail";
import { EmailSettings } from "./EmailSettings";
import { useEmailData } from "./useEmailData";
import { sendEmail, getEmailStatus } from "../../../utils/emailApi";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (!MOCK_MODE) {
      getEmailStatus()
        .then(setEmailStatus)
        .catch(() => setEmailStatus(null));
    } else {
      setEmailStatus({
        provider: "mock",
        inboundReady: true,
        outboundReady: true,
        attachmentsReady: true,
        mailbox: "info@tnaprovider.com.au",
      });
    }
  }, []);

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

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteMsg(id);
      if (selectedMessageId === id) setSelectedMessageId(null);
      logEmailAudit("user-1", "info@tnaprovider.com.au", "email.deleted", { messageId: id });
      setUiError(null);
    } catch (err) {
      setUiError(err instanceof Error ? err.message : "Failed to delete message");
    }
  }, [deleteMsg, selectedMessageId]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await moveMessage(id, "archive");
      if (selectedMessageId === id) setSelectedMessageId(null);
      logEmailAudit("user-1", "info@tnaprovider.com.au", "email.moved", {
        messageId: id,
        targetFolder: "archive",
      });
      setUiError(null);
    } catch (err) {
      setUiError(err instanceof Error ? err.message : "Failed to archive message");
    }
  }, [moveMessage, selectedMessageId]);

  const clearError = useCallback(() => setUiError(null), []);

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
        emailStatus={emailStatus}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <MessageList
        messages={filteredMessages}
        selectedId={selectedMessageId}
        onSelect={handleSelectMessage}
        loading={loading}
        error={error || uiError}
        onErrorDismiss={clearError}
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

      {settingsOpen && (
        <EmailSettings
          onClose={() => setSettingsOpen(false)}
          emailStatus={emailStatus}
        />
      )}
    </div>
  );
}
