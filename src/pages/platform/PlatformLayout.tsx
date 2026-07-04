import { useState } from "react";
import { Outlet } from "react-router-dom";
import { PlatformSidebar } from "../../components/platform/PlatformSidebar";

export function PlatformLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <PlatformSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet context={{ setSidebarOpen }} />
      </div>
    </div>
  );
}
