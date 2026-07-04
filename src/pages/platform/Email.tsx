import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { EmailLayout } from "../../components/platform/email/EmailLayout";
import type { EmailFolder } from "../../types/email";

export function Email() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");

  return (
    <>
      <PlatformHeader title="Business Email" onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex-1 flex h-[calc(100vh-4rem)]">
        <EmailLayout currentFolder={currentFolder} onFolderChange={setCurrentFolder} />
      </div>
    </>
  );
}
