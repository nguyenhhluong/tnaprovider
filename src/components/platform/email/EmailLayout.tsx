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
import { cn } from "../../../utils/cn";
import { ChevronDown, PenSquare, Menu } from "lucide-react";

const folders: { id: EmailFolder; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
  { id: "drafts", label: "Drafts" },
  { id: "archive", label: "Archive" },
  { id: "trash", label: "Trash" },
  { id: "spam", label: "Spam" },
];

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileFolderPickerOpen, setMobileFolderPickerOpen] = useState(false);

  useEffect(() => {
    getEmailStatus()
      .then(setEmailStatus)
      .catch(() => setEmailStatus(null));
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

    const result = await sendEmail(payload);
    newMsg.id = result.id;
    addSentMessage(newMsg);

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

  const handleBackToList = useCallback(() => {
    setSelectedMessageId(null);
  }, []);

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

  const currentFolderLabel = folders.find((f) => f.id === currentFolder)?.label || currentFolder;

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-white dark:bg-brand-darker">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
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
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <MailboxSidebar
              currentFolder={currentFolder}
              onFolderChange={(folder) => { onFolderChange(folder); setMobileSidebarOpen(false); }}
              onCompose={() => { handleCompose(); setMobileSidebarOpen(false); }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              unreadOnly={unreadOnly}
              onUnreadOnlyChange={setUnreadOnly}
              starredOnly={starredOnly}
              onStarredOnlyChange={setStarredOnly}
              emailStatus={emailStatus}
              onSettingsClick={() => { setSettingsOpen(true); setMobileSidebarOpen(false); }}
              mobileOverlay
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile top bar (hidden on desktop, hidden when viewing message detail) */}
      <div className={cn(
        "lg:hidden flex-shrink-0",
        selectedMessageId && "hidden"
      )}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMobileFolderPickerOpen(!mobileFolderPickerOpen)}
                className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm font-semibold text-gray-900 dark:text-white"
              >
                {currentFolderLabel}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {mobileFolderPickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMobileFolderPickerOpen(false)} />
                  <div className="absolute left-2 top-full mt-1 z-20 w-44 bg-white dark:bg-brand-darker border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { onFolderChange(f.id); setMobileFolderPickerOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm min-h-[44px]",
                          currentFolder === f.id
                            ? "bg-brand-accent/10 text-brand-accent font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleCompose}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] bg-brand-accent text-white rounded-lg text-sm font-medium"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Message list */}
      {/* On mobile: hidden when message selected. On desktop: always visible. */}
      <div className={cn(
        "flex-1 overflow-hidden flex flex-col",
        selectedMessageId && "hidden lg:flex"
      )}>
        <MessageList
          messages={filteredMessages}
          selectedId={selectedMessageId}
          onSelect={handleSelectMessage}
          loading={loading}
          error={error || uiError}
          onErrorDismiss={clearError}
        />
      </div>

      {/* Message preview */}
      {/* On mobile: full width when message selected. On desktop: shown alongside list. */}
      {selectedMessage && (
        <div className={cn(
          "flex-1",
          "hidden lg:flex",
          selectedMessageId && "flex"
        )}>
          <MessagePreview
            message={selectedMessage}
            onReply={handleReply}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onClose={handleBackToList}
          />
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <ComposeEmail
          replyTo={replyTo}
          onSend={handleSend}
          onDiscard={() => { setShowCompose(false); setReplyTo(null); }}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <EmailSettings
          onClose={() => setSettingsOpen(false)}
          emailStatus={emailStatus}
        />
      )}
    </div>
  );
}
