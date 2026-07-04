import type { EmailFolder, EmailStatus } from "../../../types/email";
import { cn } from "../../../utils/cn";
import {
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  PenSquare,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";

interface MailboxSidebarProps {
  currentFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  onCompose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (v: boolean) => void;
  starredOnly: boolean;
  onStarredOnlyChange: (v: boolean) => void;
  emailStatus?: EmailStatus | null;
  onSettingsClick?: () => void;
}

const folders: { id: EmailFolder; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "spam", label: "Spam", icon: AlertTriangle },
];

export function MailboxSidebar({
  currentFolder,
  onFolderChange,
  onCompose,
  searchQuery,
  onSearchChange,
  unreadOnly,
  onUnreadOnlyChange,
  starredOnly,
  onStarredOnlyChange,
  emailStatus,
  onSettingsClick,
}: MailboxSidebarProps) {
  const statusLabel = emailStatus
    ? emailStatus.provider === "mock"
      ? "Mock mode"
      : emailStatus.inboundReady && emailStatus.outboundReady
        ? "Live mailbox connected"
        : emailStatus.outboundReady
          ? "Outbound only"
          : "Mail server not connected"
    : "Checking...";

  return (
    <div className="w-56 lg:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker flex flex-col shrink-0">
      <div className="p-3">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
          />
        </div>
      </div>

      <nav className="flex-1 px-2 pb-2 space-y-0.5">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => onFolderChange(f.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              currentFolder === f.id
                ? "bg-brand-accent/10 text-brand-accent font-medium"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <f.icon className="w-4 h-4 shrink-0" />
            <span>{f.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          {emailStatus?.inboundReady && emailStatus?.outboundReady ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-amber-500" />
          )}
          <span
            className={cn(
              emailStatus?.inboundReady && emailStatus?.outboundReady
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {statusLabel}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => onUnreadOnlyChange(e.target.checked)}
            className="rounded"
          />
          <Filter className="w-3 h-3" />
          Unread only
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={(e) => onStarredOnlyChange(e.target.checked)}
            className="rounded"
          />
          <Filter className="w-3 h-3" />
          Starred only
        </label>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-accent cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            Settings
          </button>
        )}
      </div>
    </div>
  );
}
