import { X } from "lucide-react";

interface EmailSettingsProps {
  onClose: () => void;
}

export function EmailSettings({ onClose }: EmailSettingsProps) {
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
            <h4 className="text-sm font-medium mb-2">Mailboxes</h4>
            <div className="space-y-2">
              {["info@tnaprovider.com.au", "admin@tnaprovider.com.au", "projects@tnaprovider.com.au", "accounts@tnaprovider.com.au"].map((mailbox) => (
                <div key={mailbox} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg">
                  <span>{mailbox}</span>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
              ))}
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
