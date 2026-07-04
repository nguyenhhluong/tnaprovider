import type { TimesheetEntry } from "../types/timesheet";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU");
}

export function exportTimesheetCSV(timesheets: TimesheetEntry[]): void {
  const payrollEntries = timesheets.filter(
    (t) => t.status === "approved" || t.status === "submitted"
  );

  const headers = [
    "Date",
    "Worker",
    "Project",
    "Start",
    "Finish",
    "Break Minutes",
    "Total Hours",
    "Work Type",
    "Status",
    "Notes",
    "Approved By",
    "Approved At",
  ];

  const rows = payrollEntries.map((entry) => [
    formatDate(entry.date),
    entry.workerName,
    entry.projectName,
    entry.startTime,
    entry.finishTime,
    entry.breakMinutes.toString(),
    entry.totalHours.toFixed(2),
    entry.workType.replace(/_/g, " "),
    entry.status,
    entry.notes || "",
    entry.approvedBy || "",
    entry.approvedAt ? formatDate(entry.approvedAt) : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const total = payrollEntries.reduce((sum, t) => sum + t.totalHours, 0);
  const csvWithTotal = csvContent + `\n"","","","","","","${total.toFixed(2)}","Total","","","",""`;

  const blob = new Blob([csvWithTotal], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `timesheet-export-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportWeeklySummary(timesheets: TimesheetEntry[]): void {
  const approved = timesheets.filter((t) => t.status === "approved");

  const byWorker = approved.reduce<Record<string, number>>((acc, t) => {
    acc[t.workerName] = (acc[t.workerName] || 0) + t.totalHours;
    return acc;
  }, {});

  const byProject = approved.reduce<Record<string, number>>((acc, t) => {
    acc[t.projectName] = (acc[t.projectName] || 0) + t.totalHours;
    return acc;
  }, {});

  const headers = ["Category", "Name", "Total Hours"];
  const rows: string[][] = [];

  rows.push(["Worker", "", ""]);
  Object.entries(byWorker).forEach(([name, hours]) => {
    rows.push(["", name, hours.toFixed(2)]);
  });

  rows.push(["", "Total", approved.reduce((s, t) => s + t.totalHours, 0).toFixed(2)]);

  rows.push(["Project", "", ""]);
  Object.entries(byProject).forEach(([name, hours]) => {
    rows.push(["", name, hours.toFixed(2)]);
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `weekly-summary-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
