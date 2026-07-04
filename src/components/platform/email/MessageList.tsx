import type { EmailMessage } from "../../../types/email";
import { cn } from "../../../utils/cn";
import { timeAgo, truncatePreview } from "../../../utils/emailFormat";
import { Star, Paperclip, Loader2 } from "lucide-react";

interface MessageListProps {
  messages: EmailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export function MessageList({ messages, selectedId, onSelect, loading, error }: MessageListProps) {
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
        <div className="text-center max-w-sm">
          <p className="text-red-500 text-sm mb-2">Failed to load messages</p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-brand-darker">
        <div className="text-center">
          <p className="text-gray-500 text-sm">This folder is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-brand-darker border-r border-gray-200 dark:border-gray-800">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={cn(
            "w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors",
            selectedId === msg.id && "bg-brand-accent/5 dark:bg-brand-accent/10",
            !msg.isRead && "bg-blue-50/50 dark:bg-blue-900/10"
          )}
        >
          <div className="flex items-start justify-between mb-1">
            <span className={cn("text-sm", !msg.isRead ? "font-semibold" : "font-medium")}>
              {msg.from.name || msg.from.email}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {msg.isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
              {msg.hasAttachments && <Paperclip className="w-3 h-3 text-gray-400" />}
              <span className="text-xs text-gray-400">{timeAgo(msg.receivedAt || msg.sentAt || "")}</span>
            </div>
          </div>
          <p className={cn("text-sm truncate", !msg.isRead ? "font-medium" : "text-gray-600 dark:text-gray-400")}>
            {msg.subject}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
            {truncatePreview(msg.preview, 80)}
          </p>
        </button>
      ))}
    </div>
  );
}
