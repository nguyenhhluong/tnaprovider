import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-600 dark:text-red-400 max-w-md w-full">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Error</span>
        </div>
        <p>{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm font-medium underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
