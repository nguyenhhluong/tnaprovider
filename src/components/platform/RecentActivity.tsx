import type { Activity } from "../../types/platform";
import { ActivityIcon } from "./ActivityIcon";

export function RecentActivity({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="font-display font-bold text-lg mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.slice(0, 10).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <ActivityIcon type={activity.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{activity.action}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(activity.timestamp).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
