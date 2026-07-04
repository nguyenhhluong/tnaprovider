import { Users, Clock, FolderKanban, FileText, Wrench, Star, Bell, CheckSquare, DollarSign, Shield, Activity as ActivityFallback, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  lead: Users,
  leads: Users,
  timesheet: Clock,
  timesheets: Clock,
  realtime_timesheet: Clock,
  project: FolderKanban,
  projects: FolderKanban,
  quote: DollarSign,
  quotes: DollarSign,
  task: CheckSquare,
  tasks: CheckSquare,
  document: FileText,
  documents: FileText,
  variation: FileText,
  maintenance: Wrench,
  review: Star,
  notification: Bell,
  notifications: Bell,
  user: Users,
  users: Users,
  security: Shield,
  audit: Shield,
  system: ActivityFallback,
};

const colorMap: Record<string, string> = {
  lead: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  leads: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  timesheet: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  timesheets: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  realtime_timesheet: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  project: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  projects: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  quote: "text-green-600 bg-green-100 dark:bg-green-900/30",
  quotes: "text-green-600 bg-green-100 dark:bg-green-900/30",
  task: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  tasks: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  document: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  documents: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  variation: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  maintenance: "text-teal-600 bg-teal-100 dark:bg-teal-900/30",
  review: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
  notification: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
  notifications: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30",
  user: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  users: "text-gray-600 bg-gray-100 dark:bg-gray-800",
  security: "text-red-600 bg-red-100 dark:bg-red-900/30",
  audit: "text-red-600 bg-red-100 dark:bg-red-900/30",
  system: "text-gray-600 bg-gray-100 dark:bg-gray-800",
};

export function ActivityIcon({ type }: { type?: string | null }) {
  const normalized = String(type || "system").toLowerCase();
  const Icon = iconMap[normalized] || ActivityFallback;
  const color = colorMap[normalized] || colorMap.system;
  return (
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}
