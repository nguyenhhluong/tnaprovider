import type { EmailMessage } from "../../../types/email";
import { cn } from "../../../utils/cn";
import { timeAgo, truncatePreview } from "../../../utils/emailFormat";
import { Star, Paperclip, Loader2, Inbox } from "lucide-react";

interface MessageListProps {
  messages: EmailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
  onErrorDismiss?: () => void;
  searchResult?: { totalItems: number; totalPages: number; page: number; query: any } | null;
}

export function MessageList({ messages, selectedId, onSelect, loading, error, onErrorDismiss, searchResult }: MessageListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-brand-darker">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-brand-darker">
        <div className="text-center max-w-xs px-4">
          <p className="text-red-500 text-sm mb-2 font-medium">Failed to load messages</p>
          <p className="text-xs text-gray-500 break-words">{error}</p>
          {onErrorDismiss && (
            <button onClick={onErrorDismiss} className="mt-3 text-xs text-brand-accent hover:underline min-h-[32px] px-3">
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-brand-darker">
        <div className="text-center px-4">
          <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">This folder is empty.</p>
          <p className="text-xs text-gray-400 mt-1">No messages to show.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-brand-darker">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={cn(
            "w-full text-left px-4 py-3.5 min-h-[72px] border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors active:bg-gray-100 dark:active:bg-gray-800",
            selectedId === msg.id && "bg-brand-accent/5 dark:bg-brand-accent/10",
            !msg.isRead && "bg-blue-50/50 dark:bg-blue-900/10"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={cn(
              "text-sm truncate",
              !msg.isRead ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-200"
            )}>
              {msg.from.name || msg.from.email}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {msg.isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
              {msg.hasAttachments && <Paperclip className="w-3 h-3 text-gray-400" />}
              <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(msg.receivedAt || msg.sentAt || "")}</span>
            </div>
          </div>
          <p className={cn(
            "text-sm truncate mt-0.5",
            !msg.isRead ? "font-medium text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          )}>
            {msg.subject}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {truncatePreview(msg.preview, 100)}
          </p>
        </button>
      ))}
    </div>
  );
}
