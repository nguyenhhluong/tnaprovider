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
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  HardDrive,
  Phone,
  DollarSign,
  CheckSquare,
  File,
  Bell,
  BarChart,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../utils/host";

export function PlatformSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const sidebarLinks = [
    { name: "Dashboard", path: appPath("/platform"), icon: LayoutDashboard, roles: ["owner", "admin", "manager", "worker", "client"] },
    { name: "Leads", path: appPath("/platform/leads"), icon: Users, roles: ["owner", "admin", "manager"] },
    { name: "Lead Automation", path: appPath("/platform/lead-automation"), icon: Phone, roles: ["owner", "admin", "manager"] },
    { name: "Quotes", path: appPath("/platform/quotes"), icon: DollarSign, roles: ["owner", "admin", "manager"] },
    { name: "Projects", path: appPath("/platform/projects"), icon: FolderKanban, roles: ["owner", "admin", "manager", "worker", "client"] },
    { name: "Tasks", path: appPath("/platform/tasks"), icon: CheckSquare, roles: ["owner", "admin", "manager", "worker"] },
    { name: "Timesheets", path: appPath("/platform/timesheets"), icon: Clock, roles: ["owner", "admin", "manager", "worker"] },
    { name: "Email", path: appPath("/platform/email"), icon: Mail, roles: ["owner", "admin", "manager", "worker", "client"] },
    { name: "Client Portal", path: appPath("/platform/client-portal"), icon: UserCircle, roles: ["owner", "admin", "manager", "client"] },
    { name: "Documents", path: appPath("/platform/documents"), icon: File, roles: ["owner", "admin", "manager"] },
    { name: "Maintenance", path: appPath("/platform/maintenance"), icon: Wrench, roles: ["owner", "admin", "manager", "client"] },
    { name: "Analytics", path: appPath("/platform/analytics"), icon: BarChart3, roles: ["owner", "admin", "manager"] },
  ];

  const adminLinks = [
    { name: "Users", path: appPath("/platform/users"), icon: Users, roles: ["owner", "admin"] },
    { name: "Security", path: appPath("/platform/security"), icon: Shield, roles: ["owner", "admin"] },
    { name: "Reports", path: appPath("/platform/reports"), icon: BarChart, roles: ["owner", "admin", "manager"] },
    { name: "Admin Tools", path: appPath("/platform/admin-tools"), icon: HardDrive, roles: ["owner", "admin"] },
    { name: "Audit Log", path: appPath("/platform/audit"), icon: FileText, roles: ["owner", "admin"] },
    { name: "Notifications", path: appPath("/platform/notifications"), icon: Bell, roles: ["owner", "admin", "manager", "worker", "client"] },
    { name: "Settings", path: appPath("/platform/settings"), icon: Settings, roles: ["owner", "admin"] },
  ];

  const visibleLinks = sidebarLinks.filter((l) => l.roles.includes(user?.role || ""));
  const visibleAdminLinks = adminLinks.filter((l) => l.roles.includes(user?.role || ""));

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-brand-darker border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <Link to={appPath("/platform")} className="flex items-center gap-2" onClick={onClose}>
            <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">TNA</span>
            </div>
            <span className="font-display font-bold text-lg">Platform</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <link.icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {visibleAdminLinks.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {visibleAdminLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-accent/10 text-brand-accent"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <link.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-2">
          <Link
            to={appPath("/platform/profile")}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-sm font-bold">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-dark dark:text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-accent transition-colors" />
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
