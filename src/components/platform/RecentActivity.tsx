import { ActivityIcon } from "./ActivityIcon";

type RecentActivityItem = {
  id: string;
  type?: string | null;
  action?: string | null;
  description?: string | null;
  timestamp?: string | null;
};

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity.</p>
      </div>
    );
  }

  const formatDate = (timestamp?: string | null) => {
    if (!timestamp) return "No timestamp";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "No timestamp";
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.slice(0, 10).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <ActivityIcon type={activity.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{activity.action || "Activity"}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description || "No details available"}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
