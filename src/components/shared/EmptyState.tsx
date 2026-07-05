import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-12 text-center">
      <Icon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
      {title && <h3 className="text-base font-semibold text-brand-dark dark:text-white mb-1">{title}</h3>}
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
