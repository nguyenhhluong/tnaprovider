import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  UserCircle,
  Wrench,
  BarChart3,
  Mail,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";

const sidebarLinks = [
  { name: "Dashboard", path: "/platform", icon: LayoutDashboard },
  { name: "Leads", path: "/platform/leads", icon: Users },
  { name: "Projects", path: "/platform/projects", icon: FolderKanban },
  { name: "Timesheets", path: "/platform/timesheets", icon: Clock },
  { name: "Email", path: "/platform/email", icon: Mail },
  { name: "Client Portal", path: "/platform/client-portal", icon: UserCircle },
  { name: "Maintenance", path: "/platform/maintenance", icon: Wrench },
  { name: "Analytics", path: "/platform/analytics", icon: BarChart3 },
];

export function PlatformSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-brand-darker border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/platform" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">TNA</span>
            </div>
            <span className="font-display font-bold text-lg">Platform</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent dark:text-brand-accent"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 hover:text-brand-accent transition-colors"
          >
            ← Back to website
          </Link>
        </div>
      </aside>
    </>
  );
}
