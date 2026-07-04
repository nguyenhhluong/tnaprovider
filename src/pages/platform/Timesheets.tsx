import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { TimesheetForm } from "../../components/platform/TimesheetForm";
import { TimesheetTable } from "../../components/platform/TimesheetTable";
import { TimesheetSummary } from "../../components/platform/TimesheetSummary";
import { TimesheetApprovalActions } from "../../components/platform/TimesheetApprovalActions";
import { mockTimesheets, mockWorkers, mockProjects } from "../../data/platformMock";
import type { TimesheetEntry } from "../../types/timesheet";
import { Plus } from "lucide-react";

export function Timesheets() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(mockTimesheets);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [approvalView, setApprovalView] = useState(false);

  const handleAddEntry = (entry: TimesheetEntry) => {
    setTimesheets((prev) => [entry, ...prev]);
    setShowForm(false);
  };

  const handleUpdateEntry = (entry: TimesheetEntry) => {
    setTimesheets((prev) => prev.map((t) => (t.id === entry.id ? entry : t)));
    setEditingEntry(null);
  };

  const handleBulkApprove = (ids: string[]) => {
    setTimesheets((prev) =>
      prev.map((t) =>
        ids.includes(t.id) && t.status === "submitted"
          ? { ...t, status: "approved" as const, approvedBy: "Admin", approvedAt: new Date().toISOString() }
          : t
      )
    );
  };

  const handleApprove = (id: string) => {
    setTimesheets((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "submitted"
          ? { ...t, status: "approved" as const, approvedBy: "Admin", approvedAt: new Date().toISOString() }
          : t
      )
    );
  };

  const handleReject = (id: string, reason: string) => {
    setTimesheets((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "submitted"
          ? { ...t, status: "rejected" as const, rejectionReason: reason }
          : t
      )
    );
  };

  const handleEditRejected = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  return (
    <>
      <PlatformHeader title="Worker Hours Tracker" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowForm(!showForm); setEditingEntry(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancel" : "New Timesheet Entry"}
          </button>
          <button
            onClick={() => setApprovalView(!approvalView)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {approvalView ? "Show All" : "Approval View"}
          </button>
        </div>

        {showForm && (
          <TimesheetForm
            workers={mockWorkers}
            projects={mockProjects}
            editingEntry={editingEntry}
            onSubmit={editingEntry ? handleUpdateEntry : handleAddEntry}
          />
        )}

        <TimesheetSummary timesheets={timesheets} />

        {approvalView && (
          <TimesheetApprovalActions
            timesheets={timesheets.filter((t) => t.status === "submitted")}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
          />
        )}

        <TimesheetTable
          timesheets={timesheets}
          onEditRejected={handleEditRejected}
        />
      </div>
    </>
  );
}
