import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { ClientProjectView } from "../../components/platform/ClientProjectView";
import { mockProjects, mockProgressPhotos, mockVariations } from "../../data/platformMock";

export function ClientPortal() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();

  return (
    <>
      <PlatformHeader title="Client Portal" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        {mockProjects.slice(0, 3).map((project) => {
          const visiblePhotos = mockProgressPhotos.filter(
            (p) => p.projectId === project.id && p.visibleToClient
          );
          const projectVariations = mockVariations.filter(
            (v) => v.projectId === project.id
          );
          return (
            <ClientProjectView
              key={project.id}
              project={project}
              progressPhotos={visiblePhotos}
              variations={projectVariations}
            />
          );
        })}
      </div>
    </>
  );
}
