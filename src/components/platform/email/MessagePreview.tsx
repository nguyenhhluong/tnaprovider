import type { EmailMessage } from "../../../types/email";
import { sanitizeEmailHtml, formatEmailAddress, formatFileSize } from "../../../utils/emailFormat";
import { AttachmentList } from "./AttachmentList";
import {
  Reply,
  Trash2,
  Archive,
  X,
  Star,
  User,
  Calendar,
} from "lucide-react";

interface MessagePreviewProps {
  message: EmailMessage;
  onReply: (message: EmailMessage) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}

export function MessagePreview({ message, onReply, onDelete, onArchive, onClose }: MessagePreviewProps) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-brand-darker overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
          <button
            onClick={() => onArchive(message.id)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-display font-bold mb-3">{message.subject}</h2>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <span className="font-medium">{message.from.name || message.from.email}</span>
              {message.from.name && (
                <span className="text-gray-500 ml-1">&lt;{message.from.email}&gt;</span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 shrink-0" />
            <span className="text-gray-500">
              To: {message.to.map((a) => formatEmailAddress(a)).join(", ")}
            </span>
          </div>
          {message.cc && message.cc.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span className="text-gray-500">
                Cc: {message.cc.map((a) => formatEmailAddress(a)).join(", ")}
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="text-gray-500">
              {new Date(message.receivedAt || message.sentAt || "").toLocaleString("en-AU")}
            </span>
          </div>
          {message.isStarred && (
            <div className="flex items-start gap-2">
              <Star className="w-4 h-4 text-amber-400 mt-0.5" />
              <span className="text-amber-600">Starred</span>
            </div>
          )}
        </div>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <AttachmentList attachments={message.attachments} />
      )}

      <div className="flex-1 px-6 py-4">
        {message.bodyHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(message.bodyHtml) }}
          />
        ) : message.bodyText ? (
          <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
            {message.bodyText}
          </pre>
        ) : (
          <p className="text-sm text-gray-500 italic">No message content.</p>
        )}
      </div>
    </div>
  );
}
