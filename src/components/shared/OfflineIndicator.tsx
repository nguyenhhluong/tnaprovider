import { useState, useEffect, useCallback } from "react";
import { isOnline, onOnline, onOffline } from "../../utils/pwa";
import { getQueueStats } from "../../utils/offlineQueue";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";

interface OfflineIndicatorProps {
  onRetrySync?: () => void;
  syncing?: boolean;
}

export function OfflineIndicator({ onRetrySync, syncing }: OfflineIndicatorProps) {
  const [offline, setOffline] = useState(!isOnline());
  const [stats, setStats] = useState({ pending: 0, syncing: 0, synced: 0, rejected: 0, login_required: 0, retryable_failed: 0 });

  const updateStats = useCallback(async () => {
    try { setStats(await getQueueStats()); } catch {}
  }, []);

  useEffect(() => {
    const unsubOff = onOffline(() => setOffline(true));
    const unsubOn = onOnline(() => {
      setOffline(false);
      updateStats();
    });
    return () => { unsubOff(); unsubOn(); };
  }, [updateStats]);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  const pending = stats.pending;
  const retryable = stats.retryable_failed;
  const rejected = stats.rejected;
  const loginReq = stats.login_required;
  const totalVisible = pending + retryable + rejected + loginReq;

  if (!offline && totalVisible === 0) return null;

  const red = offline;
  const amber = !offline && (pending > 0 || retryable > 0);
  const gray = !offline && totalVisible > 0 && !amber;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 text-sm font-medium",
        red && "bg-red-600 text-white",
        amber && "bg-amber-500 text-white",
        gray && "bg-gray-600 text-white"
      )}
    >
      {offline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are offline</span>
        </>
      ) : (
        <>
          <RefreshCw className={cn("w-4 h-4 shrink-0", syncing && "animate-spin")} />
          <span className="flex flex-wrap gap-x-1">
            {pending > 0 && <span>{pending} {pending === 1 ? "action" : "actions"} queued</span>}
            {retryable > 0 && <span>{retryable} {retryable === 1 ? "action" : "actions"} failed</span>}
            {rejected > 0 && <span>{rejected} {rejected === 1 ? "action" : "actions"} rejected</span>}
            {loginReq > 0 && <span>Login required</span>}
            {totalVisible === 0 && <span>Syncing...</span>}
          </span>
        </>
      )}
      {!offline && totalVisible > 0 && onRetrySync && (
        <button
          onClick={onRetrySync}
          disabled={syncing}
          className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs hover:bg-white/30 disabled:opacity-50 transition-colors shrink-0"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      )}
    </div>
  );
}
