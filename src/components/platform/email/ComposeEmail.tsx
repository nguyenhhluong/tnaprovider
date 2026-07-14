import { useState, useCallback, useRef } from "react";
import type { EmailMessage, EmailAddress, ComposeEmailPayload } from "../../../types/email";
import { isValidEmail, formatEmailAddress } from "../../../utils/emailFormat";
import { X, Paperclip, Send, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("\n") || "<p></p>";
}

interface ComposeEmailProps {
  replyTo?: EmailMessage | null;
  onSend: (payload: ComposeEmailPayload) => Promise<void>;
  onDiscard: () => void;
}

export function ComposeEmail({ replyTo, onSend, onDiscard }: ComposeEmailProps) {
  // Generate idempotency key once per compose session
  const requestIdRef = useRef(generateIdempotencyKey());
  function getRequestId() { return requestIdRef.current; }

  const [to, setTo] = useState(
    replyTo ? formatEmailAddress(replyTo.from) : ""
  );
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`) : ""
  );
  const [bodyText, setBodyText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const parseAddressList = (raw: string): EmailAddress[] => {
    return raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((part) => {
        const m = part.match(/^"?(.+?)"?\s*<(.+?)>$/);
        if (m) return { name: m[1].trim(), email: m[2].trim() };
        return { email: part };
      });
  };

  const validate = useCallback((): string | null => {
    const toAddresses = parseAddressList(to);
    if (toAddresses.length === 0) return "At least one recipient is required.";
    for (const addr of toAddresses) {
      if (!isValidEmail(addr.email)) return `Invalid email: ${addr.email}`;
    }
    if (cc) {
      for (const addr of parseAddressList(cc)) {
        if (!isValidEmail(addr.email)) return `Invalid email in Cc: ${addr.email}`;
      }
    }
    if (bcc) {
      for (const addr of parseAddressList(bcc)) {
        if (!isValidEmail(addr.email)) return `Invalid email in Bcc: ${addr.email}`;
      }
    }
    if (!subject.trim()) return "Subject is empty. Are you sure you want to send without a subject?";
    return null;
  }, [to, cc, bcc, subject]);

  const handleSend = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSending(true);

    const payload: ComposeEmailPayload & { requestId?: string } = {
      from: { name: "TNA Provider", email: "info@tnaprovider.com.au" },
      to: parseAddressList(to),
      cc: cc ? parseAddressList(cc) : undefined,
      bcc: bcc ? parseAddressList(bcc) : undefined,
      subject: subject.trim(),
      bodyText: bodyText,
      bodyHtml: textToHtml(bodyText),
      attachments: attachments.length > 0 ? attachments : undefined,
      replyToMessageId: replyTo?.messageId,
      references: replyTo?.messageId ? [replyTo.messageId] : undefined,
      requestId: getRequestId(),
    };

    try {
      await onSend(payload);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [to, cc, bcc, subject, bodyText, attachments, replyTo, onSend, validate]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 25 * 1024 * 1024;
    const oversized = files.filter((f) => f.size > maxSize);
    if (oversized.length > 0) {
      setError(`Attachment too large: ${oversized[0].name} (max 25MB)`);
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
    setError("");
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white dark:bg-brand-darker rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-display font-bold text-lg mb-2">Message Sent</h3>
          <p className="text-sm text-gray-500 mb-4">Your email has been sent successfully.</p>
          <button
            onClick={onDiscard}
            className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
      <div className="flex-1 flex flex-col bg-white dark:bg-brand-darker w-full max-w-2xl mx-auto shadow-2xl lg:mt-12 lg:mb-8 lg:rounded-xl lg:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onDiscard}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold">{replyTo ? "Reply" : "New Message"}</h3>
          </div>
          <button onClick={onDiscard} className="hidden lg:flex p-2 min-h-[44px] min-w-[44px] items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <p className="text-sm px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              TNA Provider &lt;info@tnaprovider.com.au&gt;
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To *</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cc</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bcc</label>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={6}
              placeholder="Write your message..."
              className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-accent/50 resize-y font-sans min-h-[120px]"
            />
          </div>

          {attachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Attachments</p>
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => removeAttachment(i)} className="p-1 text-red-500 hover:text-red-700 ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Bottom bar — sticky */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker shrink-0">
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer hover:text-gray-700 min-h-[44px] px-2">
            <Paperclip className="w-4 h-4" />
            Attach
            <input type="file" multiple onChange={handleAttachmentChange} className="hidden" />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onDiscard}
              className="px-3 py-2 min-h-[44px] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Discard
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
