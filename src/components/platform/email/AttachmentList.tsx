import type { EmailAttachment } from "../../../types/email";
import { formatFileSize } from "../../../utils/emailFormat";
import { Paperclip, Download, AlertTriangle } from "lucide-react";

const riskyMimeTypes = [
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-msi",
  "application/vnd.microsoft.portable-executable",
  "application/x-sh",
  "application/x-bat",
  "application/x-ms-shortcut",
  "application/vnd.ms-excel.addin.macroEnabled",
  "application/vnd.ms-excel.sheet.macroEnabled",
  "application/vnd.ms-excel.sheet.binary.macroEnabled",
  "application/vnd.ms-word.document.macroEnabled",
];

export function AttachmentList({ attachments }: { attachments: EmailAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 mb-2">
        Attachments ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const isRisky = riskyMimeTypes.includes(att.mimeType);
          return (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-white dark:bg-brand-darker rounded-lg px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 min-w-0 max-w-full"
            >
              <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate max-w-[120px] sm:max-w-[180px]">{att.filename}</p>
                <p className="text-xs text-gray-500">{formatFileSize(att.sizeBytes)}</p>
              </div>
              {isRisky && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              {att.downloadUrl && (
                <a
                  href={att.downloadUrl}
                  className="p-1 text-gray-400 hover:text-brand-accent shrink-0"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
