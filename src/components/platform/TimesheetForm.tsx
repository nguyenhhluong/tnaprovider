import { useState, useCallback } from "react";
import type { TimesheetEntry, WorkType } from "../../types/timesheet";
import type { PlatformWorker, PlatformProject } from "../../types/platform";
import { calculateTimesheetHours } from "../../utils/time";

interface TimesheetFormProps {
  workers: PlatformWorker[];
  projects: PlatformProject[];
  editingEntry?: TimesheetEntry | null;
  onSubmit: (entry: TimesheetEntry) => void;
}

const workTypes: { value: WorkType; label: string }[] = [
  { value: "factory", label: "Factory" },
  { value: "site_install", label: "Site Install" },
  { value: "delivery", label: "Delivery" },
  { value: "measure_up", label: "Measure-up" },
  { value: "rectification", label: "Rectification" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

export function TimesheetForm({ workers, projects, editingEntry, onSubmit }: TimesheetFormProps) {
  const [workerId, setWorkerId] = useState(editingEntry?.workerId || workers[0]?.id || "");
  const [projectId, setProjectId] = useState(editingEntry?.projectId || projects[0]?.id || "");
  const [date, setDate] = useState(editingEntry?.date || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(editingEntry?.startTime || "07:00");
  const [finishTime, setFinishTime] = useState(editingEntry?.finishTime || "15:30");
  const [breakMinutes, setBreakMinutes] = useState(editingEntry?.breakMinutes ?? 30);
  const [workType, setWorkType] = useState<WorkType>(editingEntry?.workType || "factory");
  const [notes, setNotes] = useState(editingEntry?.notes || "");
  const [error, setError] = useState("");

  const totalHours = calculateTimesheetHours(startTime, finishTime, breakMinutes);

  const validate = useCallback(() => {
    if (!workerId) return "Please select a worker";
    if (!projectId) return "Please select a project";
    if (!date) return "Please select a date";
    if (!startTime) return "Please enter start time";
    if (!finishTime) return "Please enter finish time";
    if (startTime === finishTime) return "Start and finish time cannot be the same";
    if (breakMinutes >= 24 * 60) return "Break cannot be longer than 24 hours";

    const [sh, sm] = startTime.split(":").map(Number);
    const [fh, fm] = finishTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    let finishMins = fh * 60 + fm;
    if (finishMins < startMins) finishMins += 24 * 60;
    const totalMins = finishMins - startMins;

    if (breakMinutes >= totalMins) return "Break cannot be longer than the shift";
    if (totalHours <= 0) return "Total hours must be greater than zero";

    return "";
  }, [workerId, projectId, date, startTime, finishTime, breakMinutes, totalHours]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const worker = workers.find((w) => w.id === workerId);
    const project = projects.find((p) => p.id === projectId);

    const entry: TimesheetEntry = {
      id: editingEntry?.id || `T${Date.now()}`,
      workerId,
      workerName: worker?.name || "",
      projectId,
      projectName: project?.projectName || "",
      date,
      startTime,
      finishTime,
      breakMinutes,
      totalHours,
      workType,
      notes: notes || undefined,
      status: editingEntry?.status === "rejected" ? "submitted" : "submitted",
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(entry);

    if (!editingEntry) {
      setDate(new Date().toISOString().split("T")[0]);
      setStartTime("07:00");
      setFinishTime("15:30");
      setBreakMinutes(30);
      setNotes("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-4">
        {editingEntry ? "Edit Timesheet Entry" : "New Timesheet Entry"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Worker</label>
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          >
            {workers.filter((w) => w.isActive).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.projectName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Work Type</label>
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value as WorkType)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          >
            {workTypes.map((wt) => (
              <option key={wt.value} value={wt.value}>{wt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Finish Time</label>
          <input
            type="time"
            value={finishTime}
            onChange={(e) => setFinishTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Break (minutes)</label>
          <input
            type="number"
            min="0"
            max="480"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>

        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">Total Hours</p>
            <p className="text-2xl font-display font-bold text-brand-accent">{totalHours.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          placeholder="Optional notes about the work completed"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        className="mt-4 px-6 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
      >
        {editingEntry ? "Update Entry" : "Submit Timesheet"}
      </button>
    </form>
  );
}
