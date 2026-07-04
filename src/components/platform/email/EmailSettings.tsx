import { X, Wifi, WifiOff, Info } from "lucide-react";
import type { EmailStatus } from "../../../types/email";

interface EmailSettingsProps {
  onClose: () => void;
  emailStatus?: EmailStatus | null;
}

export function EmailSettings({ onClose, emailStatus }: EmailSettingsProps) {
  const statusLabel = (ready: boolean | undefined) =>
    ready ? "Ready" : "Not ready";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40">
      <div className="bg-white dark:bg-brand-darker rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-display font-bold">Email Settings</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Mailbox</h4>
            <div className="text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
              {emailStatus?.mailbox || "info@tnaprovider.com.au"}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Connection</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                <span className="flex items-center gap-2">
                  {emailStatus?.inboundReady ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                  Inbound (receive)
                </span>
                <span className="text-xs">{statusLabel(emailStatus?.inboundReady)}</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                <span className="flex items-center gap-2">
                  {emailStatus?.outboundReady ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                  Outbound (send)
                </span>
                <span className="text-xs">{statusLabel(emailStatus?.outboundReady)}</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                <span className="flex items-center gap-2">
                  <Info className="w-3 h-3 text-gray-400" />
                  Provider
                </span>
                <span className="text-xs uppercase">{emailStatus?.provider || "mock"}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Attachments</h4>
            <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
              <span>Support</span>
              <span className="text-xs">{emailStatus?.attachmentsReady ? "Ready" : "Not supported in live mode"}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Signature</h4>
            <textarea
              defaultValue="Best regards,\nTNA Provider\ninfo@tnaprovider.com.au\n0406 409 668"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker rounded-lg"
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Auto-Reply</h4>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              Enable auto-reply
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
