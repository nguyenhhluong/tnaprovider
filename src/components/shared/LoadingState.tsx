import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      {message && <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>}
    </div>
  );
}
