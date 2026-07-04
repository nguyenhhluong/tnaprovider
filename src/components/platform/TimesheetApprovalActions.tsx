import { useState } from "react";
import type { TimesheetEntry } from "../../types/timesheet";
import { exportTimesheetCSV, exportWeeklySummary } from "../../utils/timesheetExport";

interface TimesheetApprovalActionsProps {
  allTimesheets: TimesheetEntry[];
  pendingTimesheets: TimesheetEntry[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onBulkApprove: (ids: string[]) => void;
}

export function TimesheetApprovalActions({ allTimesheets, pendingTimesheets, onApprove, onReject, onBulkApprove }: TimesheetApprovalActionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!pendingTimesheets || pendingTimesheets.length === 0) {
    return (
      <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-display font-bold text-lg mb-2">Timesheet Approvals</h3>
        <p className="text-gray-500 text-sm">No pending timesheets to approve.</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => exportTimesheetCSV(allTimesheets)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportWeeklySummary(allTimesheets)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export Weekly Summary
          </button>
        </div>
      </div>
    );
  }

  const handleBulkApprove = () => {
    onBulkApprove(Array.from(selected));
    setSelected(new Set());
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) return;
    onReject(id, rejectReason.trim());
    setRejectId(null);
    setRejectReason("");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display font-bold text-lg">Timesheet Approvals</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportTimesheetCSV(allTimesheets)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportWeeklySummary(allTimesheets)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Export Weekly Summary
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleBulkApprove}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve {selected.size}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(pendingTimesheets.map((t) => t.id)));
                    else setSelected(new Set());
                  }}
                  checked={selected.size === pendingTimesheets.length}
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Worker</th>
              <th className="text-left px-4 py-3 font-medium">Project</th>
              <th className="text-left px-4 py-3 font-medium">Hours</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingTimesheets.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString("en-AU")}</td>
                <td className="px-4 py-3">{entry.workerName}</td>
                <td className="px-4 py-3">{entry.projectName}</td>
                <td className="px-4 py-3 font-medium">{entry.totalHours.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(entry.id)}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectId(entry.id)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectId && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
          <label className="block text-sm font-medium mb-2">Rejection reason:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm"
              autoFocus
            />
            <button
              onClick={() => handleReject(rejectId)}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => { setRejectId(null); setRejectReason(""); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {allTimesheets.filter((t) => t.status === "approved").length === 0 && (
        <div className="p-4 text-sm text-gray-500">
          Note: Rejected and draft entries are excluded from payroll export by default.
        </div>
      )}
    </div>
  );
}
