import { Users, Clock, FolderKanban, FileText, Wrench, Star, type LucideIcon } from "lucide-react";
import type { Activity } from "../../types/platform";

const iconMap: Record<Activity["type"], LucideIcon> = {
  lead: Users,
  timesheet: Clock,
  project: FolderKanban,
  variation: FileText,
  maintenance: Wrench,
  review: Star,
};

const colorMap: Record<Activity["type"], string> = {
  lead: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  timesheet: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  project: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  variation: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  maintenance: "text-teal-600 bg-teal-100 dark:bg-teal-900/30",
  review: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
};

export function ActivityIcon({ type }: { type: Activity["type"] }) {
  const Icon = iconMap[type];
  return (
    <div className={`p-2 rounded-lg ${colorMap[type]}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}
