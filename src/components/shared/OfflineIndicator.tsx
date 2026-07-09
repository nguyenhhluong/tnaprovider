import { useState, useEffect } from "react";
import { isOnline, onOnline, onOffline } from "../../utils/pwa";
import { getQueueCount } from "../../utils/offlineQueue";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";

interface OfflineIndicatorProps {
  onRetrySync?: () => void;
  syncing?: boolean;
}

export function OfflineIndicator({ onRetrySync, syncing }: OfflineIndicatorProps) {
  const [offline, setOffline] = useState(!isOnline());
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubOff = onOffline(() => setOffline(true));
    const unsubOn = onOnline(() => {
      setOffline(false);
      updateCount();
    });
    return () => { unsubOff(); unsubOn(); };
  }, []);

  const updateCount = async () => {
    try { setQueueCount(await getQueueCount()); } catch {}
  };

  useEffect(() => {
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!offline && queueCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 text-sm font-medium",
        offline
          ? "bg-red-600 text-white"
          : "bg-amber-500 text-white"
      )}
    >
      {offline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are offline</span>
        </>
      ) : (
        <>
          <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
          <span>{queueCount} pending {queueCount === 1 ? "action" : "actions"}</span>
        </>
      )}
      {!offline && queueCount > 0 && onRetrySync && (
        <button
          onClick={onRetrySync}
          disabled={syncing}
          className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs hover:bg-white/30 disabled:opacity-50 transition-colors"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      )}
    </div>
  );
}
