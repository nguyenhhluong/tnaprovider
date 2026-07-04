import type { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function KpiCard({ title, value, icon: Icon, color, bg }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-display font-bold">{value ?? 0}</p>
        </div>
        <div className={cn("p-3 rounded-lg", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </div>
  );
}
