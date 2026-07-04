import type { EmailMessage } from "../../../types/email";
import { sanitizeEmailHtml, formatEmailAddress } from "../../../utils/emailFormat";
import { AttachmentList } from "./AttachmentList";
import {
  Reply,
  Trash2,
  Archive,
  ArrowLeft,
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
    <div className="flex-1 flex flex-col bg-white dark:bg-brand-darker h-full">
      {/* Top bar: on mobile shows back button, on desktop shows close */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker">
        <div className="flex items-center gap-2">
          {/* Mobile back button */}
          <button
            onClick={onClose}
            className="lg:hidden flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
          <button
            onClick={() => onArchive(message.id)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="hidden lg:flex p-2 min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          title="Close"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header info */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base sm:text-lg font-display font-bold mb-3 break-words">{message.subject}</h2>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium">{message.from.name || message.from.email}</span>
                {message.from.name && (
                  <span className="text-gray-500 ml-1 break-all">&lt;{message.from.email}&gt;</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span className="text-gray-500 break-words">
                To: {message.to.map((a) => formatEmailAddress(a)).join(", ")}
              </span>
            </div>
            {message.cc && message.cc.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="w-4 shrink-0" />
                <span className="text-gray-500 break-words">
                  Cc: {message.cc.map((a) => formatEmailAddress(a)).join(", ")}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-500">
                {new Date(message.receivedAt || message.sentAt || "").toLocaleString("en-AU")}
              </span>
            </div>
            {message.isStarred && (
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-amber-600">Starred</span>
              </div>
            )}
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} />
        )}

        {/* Body */}
        <div className="px-4 sm:px-6 py-4">
          {message.bodyHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-img:max-w-full prose-img:h-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(message.bodyHtml) }}
            />
          ) : message.bodyText ? (
            <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 break-words">
              {message.bodyText}
            </pre>
          ) : (
            <p className="text-sm text-gray-500 italic">No message content.</p>
          )}
        </div>
      </div>
    </div>
  );
}
