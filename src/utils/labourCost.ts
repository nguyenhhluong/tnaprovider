import type { TimesheetEntry } from "../types/timesheet";
import type { PlatformProject, PlatformWorker } from "../types/platform";

export interface LabourCostResult {
  estimatedHours: number;
  actualApprovedHours: number;
  varianceHours: number;
  estimatedCost: number;
  actualCost: number;
  varianceCost: number;
  isOverEstimate: boolean;
  isUnderEstimate: boolean;
  workerRateUsed: boolean;
}

export function calculateProjectLabourCost(
  project: PlatformProject,
  timesheets: TimesheetEntry[],
  workers: PlatformWorker[]
): LabourCostResult {
  const estimatedHours = project.estimatedLabourHours;
  const estimatedCost = project.estimatedLabourCost;

  const approvedTimesheets = timesheets.filter(
    (t) => t.projectId === project.id && t.status === "approved"
  );
  const actualApprovedHours = approvedTimesheets.reduce(
    (sum, t) => sum + t.totalHours,
    0
  );

  let actualCost = 0;
  let workerRateUsed = false;

  for (const ts of approvedTimesheets) {
    const worker = workers.find((w) => w.id === ts.workerId);
    if (worker && worker.payRate > 0) {
      actualCost += ts.totalHours * worker.payRate;
      workerRateUsed = true;
    } else {
      actualCost += project.estimatedLabourCost / Math.max(1, estimatedHours) * ts.totalHours;
    }
  }

  const varianceHours = actualApprovedHours - estimatedHours;
  const varianceCost = actualCost - estimatedCost;

  return {
    estimatedHours,
    actualApprovedHours,
    varianceHours,
    estimatedCost,
    actualCost,
    varianceCost,
    isOverEstimate: actualApprovedHours > estimatedHours,
    isUnderEstimate: actualApprovedHours < estimatedHours,
    workerRateUsed,
  };
}
