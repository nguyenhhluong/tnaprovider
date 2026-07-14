import { useState } from "react";
import type { EmailMessage } from "../../../types/email";
import { sanitizeEmailHtml, formatEmailAddress } from "../../../utils/emailFormat";
import { AttachmentList } from "./AttachmentList";
import { Reply, Forward, Trash2, Archive, ArrowLeft, Star, User, Calendar } from "lucide-react";

interface MessagePreviewProps {
  message: EmailMessage;
  onReply: (message: EmailMessage) => void;
  onForward?: (message: EmailMessage) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}

export function MessagePreview({ message, onReply, onForward, onDelete, onArchive, onClose }: MessagePreviewProps) {
  const [showImages, setShowImages] = useState(false);
  const hasRemoteImages = message.bodyHtml?.includes("http") && message.bodyHtml?.includes("src=");
  const [sanitizedHtml] = useState(() => message.bodyHtml ? sanitizeEmailHtml(message.bodyHtml) : "");

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-brand-darker h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="lg:hidden flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => onReply(message)} className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm rounded-lg bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors">
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          {onForward && (
            <button onClick={() => onForward(message)} className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Forward className="w-3.5 h-3.5" /> Forward
            </button>
          )}
          <button onClick={() => onArchive(message.id)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Archive (E)">
            <Archive className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(message.id)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Delete (Del)">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button onClick={onClose} className="hidden lg:flex p-2 min-h-[44px] min-w-[44px] items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Close (Esc)">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base sm:text-lg font-display font-bold mb-3 break-words">{message.subject}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium">{message.from.name || message.from.email}</span>
                {message.from.name && <span className="text-gray-500 ml-1 break-all">&lt;{message.from.email}&gt;</span>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 shrink-0" />
              <span className="text-gray-500 break-words">To: {message.to.map((a) => formatEmailAddress(a)).join(", ")}</span>
            </div>
            {message.cc && message.cc.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="w-4 shrink-0" />
                <span className="text-gray-500 break-words">Cc: {message.cc.map((a) => formatEmailAddress(a)).join(", ")}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-500">{new Date(message.receivedAt || message.sentAt || "").toLocaleString("en-AU")}</span>
            </div>
            {message.isStarred && (
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-amber-600">Starred</span>
              </div>
            )}
          </div>
        </div>

        {message.attachments && message.attachments.length > 0 && <AttachmentList attachments={message.attachments} />}

        <div className="px-4 sm:px-6 py-4">
          {hasRemoteImages && !showImages && (
            <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>This message contains remote images</span>
              <button onClick={() => setShowImages(true)} className="underline font-medium ml-2">Show images</button>
            </div>
          )}
          {sanitizedHtml ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-img:max-w-full prose-img:h-auto dark:prose-headings:text-gray-100 dark:prose-p:text-gray-300 dark:prose-a:text-blue-400 dark:prose-strong:text-gray-100 dark:prose-code:text-gray-200 dark:prose-pre:bg-gray-800 dark:prose-pre:text-gray-200 email-body" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          ) : message.bodyText ? (
            <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 break-words">{message.bodyText}</pre>
          ) : (
            <p className="text-sm text-gray-500 italic">No message content.</p>
          )}
        </div>
      </div>
    </div>
  );
}
