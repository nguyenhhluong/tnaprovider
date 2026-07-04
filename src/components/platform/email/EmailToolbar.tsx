import { RefreshCw, Search } from "lucide-react";

interface EmailToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export function EmailToolbar({ searchQuery, onSearchChange, onRefresh }: EmailToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-brand-darker">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
      </div>
      <button
        onClick={onRefresh}
        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        title="Refresh"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
