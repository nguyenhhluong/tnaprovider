import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderKanban, DollarSign, Mail, MoreHorizontal } from "lucide-react";
import { cn } from "../../utils/cn";
import { appPath } from "../../utils/host";

const tabs = [
  { name: "Home", path: appPath("/platform/dashboard"), icon: LayoutDashboard },
  { name: "Projects", path: appPath("/platform/projects"), icon: FolderKanban },
  { name: "Quotes", path: appPath("/platform/quotes"), icon: DollarSign },
  { name: "Email", path: appPath("/platform/email"), icon: Mail },
  { name: "More", path: appPath("/platform/settings"), icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-brand-darker border-t border-gray-200 dark:border-gray-800 safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-brand-accent"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
