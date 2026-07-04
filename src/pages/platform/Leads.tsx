import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { LeadBoard } from "../../components/platform/LeadBoard";

export function Leads() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  return (
    <>
      <PlatformHeader title="CRM Leads Board" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        <LeadBoard />
      </div>
    </>
  );
}
