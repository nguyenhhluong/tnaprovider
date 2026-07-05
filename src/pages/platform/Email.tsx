import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { EmailLayout } from "../../components/platform/email/EmailLayout";
import type { EmailFolder } from "../../types/email";

export function Email() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>("inbox");

  return (
    <>
      <PageHeader title="Business Email" description="Manage your business email and communications." onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex-1 flex h-[calc(100vh-4rem)]">
        <EmailLayout currentFolder={currentFolder} onFolderChange={setCurrentFolder} />
      </div>
    </>
  );
}
