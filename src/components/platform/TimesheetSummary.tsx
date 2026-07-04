import type { TimesheetEntry } from "../../types/timesheet";

interface TimesheetSummaryProps {
  timesheets: TimesheetEntry[];
}

export function TimesheetSummary({ timesheets }: TimesheetSummaryProps) {
  if (!timesheets || timesheets.length === 0) {
    return null;
  }

  const submitted = timesheets.filter((t) => t.status === "submitted");
  const approved = timesheets.filter((t) => t.status === "approved");
  const rejected = timesheets.filter((t) => t.status === "rejected");

  const totalSubmitted = submitted.reduce((sum, t) => sum + t.totalHours, 0);
  const totalApproved = approved.reduce((sum, t) => sum + t.totalHours, 0);
  const totalRejected = rejected.reduce((sum, t) => sum + t.totalHours, 0);
  const pendingHours = timesheets
    .filter((t) => t.status === "draft" || t.status === "submitted")
    .reduce((sum, t) => sum + t.totalHours, 0);

  const hoursByWorker = timesheets
    .filter((t) => t.status === "approved")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.workerName] = (acc[t.workerName] || 0) + t.totalHours;
      return acc;
    }, {});

  const hoursByProject = timesheets
    .filter((t) => t.status === "approved")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.projectName] = (acc[t.projectName] || 0) + t.totalHours;
      return acc;
    }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h4 className="font-display font-bold mb-3">Hours Overview</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">Submitted</p>
            <p className="text-lg font-bold">{totalSubmitted.toFixed(1)}h</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400">Approved</p>
            <p className="text-lg font-bold">{totalApproved.toFixed(1)}h</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Pending</p>
            <p className="text-lg font-bold">{pendingHours.toFixed(1)}h</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <p className="text-xs text-red-600 dark:text-red-400">Rejected</p>
            <p className="text-lg font-bold">{totalRejected.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h4 className="font-display font-bold mb-3">By Worker</h4>
        <div className="space-y-2">
          {Object.entries(hoursByWorker).length === 0 ? (
            <p className="text-sm text-gray-500">No approved hours yet</p>
          ) : (
            Object.entries(hoursByWorker).map(([name, hours]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="font-medium">{hours.toFixed(1)}h</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <h4 className="font-display font-bold mb-3">By Project</h4>
        <div className="space-y-2">
          {Object.entries(hoursByProject).length === 0 ? (
            <p className="text-sm text-gray-500">No approved hours yet</p>
          ) : (
            Object.entries(hoursByProject).map(([name, hours]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span>{name}</span>
                <span className="font-medium">{hours.toFixed(1)}h</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
