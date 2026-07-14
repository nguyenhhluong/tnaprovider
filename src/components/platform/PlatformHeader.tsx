import { Menu } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";

export function PlatformHeader({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 bg-white/80 dark:bg-brand-darker/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 safe-area-top"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-display font-bold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
