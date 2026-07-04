import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { ProjectBoard } from "../../components/platform/ProjectBoard";

export function PlatformProjects() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  return (
    <>
      <PlatformHeader title="Project Management" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        <ProjectBoard />
      </div>
    </>
  );
}
