import { PlatformHeader } from "../platform/PlatformHeader";

interface PageHeaderProps {
  title: string;
  description?: string;
  onMenuClick: () => void;
}

export function PageHeader({ title, description, onMenuClick }: PageHeaderProps) {
  return (
    <>
      <PlatformHeader title={title} onMenuClick={onMenuClick} />
      {description && (
        <div className="px-4 md:px-6 pt-4 pb-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      )}
    </>
  );
}
