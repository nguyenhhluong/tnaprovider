import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { AnalyticsDashboard } from "../../components/platform/AnalyticsDashboard";

export function Analytics() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  return (
    <>
      <PlatformHeader title="Analytics" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        <AnalyticsDashboard />
      </div>
    </>
  );
}
