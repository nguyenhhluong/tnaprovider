import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, DollarSign, Mail, MoreHorizontal, X,
  Users, CheckSquare, File, BarChart, Settings, HardDrive, MessageSquare,
  LogOut,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { appPath } from "../../utils/host";
import { useAuth } from "../../context/AuthContext";

function useActiveMatch(path: string): boolean {
  const location = useLocation();
  // Match prefix for nested routes
  if (path === appPath("/platform/dashboard")) return location.pathname === path;
  return location.pathname.startsWith(path) || location.pathname.startsWith(path.replace("/platform", ""));
}

export function MobileBottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const role = user?.role || "";

  // Focus trap
  useEffect(() => {
    if (!moreOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMoreOpen(false); moreBtnRef.current?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [moreOpen]);

  const tabs = [
    { name: "Home", path: appPath("/platform/dashboard"), icon: LayoutDashboard, roles: ["owner", "admin", "manager", "worker", "client"] },
    { name: "Projects", path: appPath("/platform/projects"), icon: FolderKanban, roles: ["owner", "admin", "manager", "client"] },
    { name: "Quotes", path: appPath("/platform/quotes"), icon: DollarSign, roles: ["owner", "admin", "manager"] },
    { name: "Email", path: appPath("/platform/email"), icon: Mail, roles: ["owner", "admin"] },
  ].filter((t) => t.roles.includes(role));

  const moreItems = [
    { name: "Quote Requests", path: appPath("/platform/quote-requests"), icon: MessageSquare, roles: ["owner", "admin", "manager"] },
    { name: "Users", path: appPath("/platform/users"), icon: Users, roles: ["owner", "admin"] },
    { name: "Tasks", path: appPath("/platform/tasks"), icon: CheckSquare, roles: ["owner", "admin", "manager", "worker"] },
    { name: "Documents", path: appPath("/platform/documents"), icon: File, roles: ["owner", "admin", "manager"] },
    { name: "Reports", path: appPath("/platform/reports"), icon: BarChart, roles: ["owner", "admin", "manager"] },
    { name: "Email Center", path: appPath("/platform/email-center"), icon: Mail, roles: ["owner", "admin"] },
    { name: "Admin Tools", path: appPath("/platform/admin-tools"), icon: HardDrive, roles: ["owner", "admin"] },
    { name: "Settings", path: appPath("/platform/settings"), icon: Settings, roles: ["owner", "admin"] },
  ].filter((m) => m.roles.includes(role));

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-brand-darker border-t border-gray-200 dark:border-gray-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const active = useActiveMatch(tab.path);
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors",
                  active ? "text-brand-accent" : "text-gray-500 dark:text-gray-400"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-none">{tab.name}</span>
              </Link>
            );
          })}
          <button
            ref={moreBtnRef}
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
            aria-label="More menu"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col" role="dialog" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div
            ref={sheetRef}
            className="relative mt-auto bg-white dark:bg-brand-darker rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-brand-darker z-10">
              <h2 className="font-display font-bold text-lg">Navigation</h2>
              <button
                onClick={() => { setMoreOpen(false); moreBtnRef.current?.focus(); }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {moreItems.map((item) => {
                const active = useActiveMatch(item.path);
                return (
                  <button
                    key={item.name}
                    onClick={() => { navigate(item.path); setMoreOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors text-left",
                      active
                        ? "bg-brand-accent/10 text-brand-accent"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
