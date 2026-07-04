import type { TimesheetEntry } from "../../types/timesheet";
import { StatusBadge } from "./StatusBadge";

interface TimesheetTableProps {
  timesheets: TimesheetEntry[];
  onEditRejected: (entry: TimesheetEntry) => void;
}

export function TimesheetTable({ timesheets, onEditRejected }: TimesheetTableProps) {
  if (!timesheets || timesheets.length === 0) {
    return (
      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-display font-bold text-lg mb-4">Timesheet Entries</h3>
        <p className="text-gray-500 text-sm">No entries yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-display font-bold text-lg">Timesheet Entries</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Worker</th>
              <th className="text-left px-4 py-3 font-medium">Project</th>
              <th className="text-left px-4 py-3 font-medium">Start</th>
              <th className="text-left px-4 py-3 font-medium">Finish</th>
              <th className="text-left px-4 py-3 font-medium">Break</th>
              <th className="text-left px-4 py-3 font-medium">Hours</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString("en-AU")}</td>
                <td className="px-4 py-3">{entry.workerName}</td>
                <td className="px-4 py-3">{entry.projectName}</td>
                <td className="px-4 py-3">{entry.startTime}</td>
                <td className="px-4 py-3">{entry.finishTime}</td>
                <td className="px-4 py-3">{entry.breakMinutes}m</td>
                <td className="px-4 py-3 font-medium">{entry.totalHours.toFixed(1)}</td>
                <td className="px-4 py-3 capitalize">{entry.workType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.status} />
                  {entry.status === "rejected" && entry.rejectionReason && (
                    <p className="text-xs text-red-500 mt-0.5">{entry.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {entry.status === "rejected" && (
                    <button
                      onClick={() => onEditRejected(entry)}
                      className="text-xs text-brand-accent hover:underline"
                    >
                      Edit & Resubmit
                    </button>
                  )}
                  {entry.status === "approved" && (
                    <span className="text-xs text-gray-400">Locked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
