import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { ProjectBoard } from "../../components/platform/ProjectBoard";

export function PlatformProjects() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  return (
    <>
      <PageHeader title="Project Management" description="Manage and track all projects." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        <ProjectBoard />
      </div>
    </>
  );
}
