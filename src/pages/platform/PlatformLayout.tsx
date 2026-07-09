import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { PlatformSidebar } from "../../components/platform/PlatformSidebar";
import { OfflineIndicator } from "../../components/shared/OfflineIndicator";
import { syncAllPendingActions } from "../../utils/offlineQueue";
import { registerSW } from "../../utils/pwa";

registerSW();

export function PlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAllPendingActions();
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <PlatformSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet context={{ setSidebarOpen }} />
      </div>
      <OfflineIndicator onRetrySync={handleSync} syncing={syncing} />
    </div>
  );
}
