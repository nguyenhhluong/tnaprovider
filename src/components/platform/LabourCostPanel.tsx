import type { PlatformProject, PlatformWorker } from "../../types/platform";
import type { TimesheetEntry } from "../../types/timesheet";
import { calculateProjectLabourCost } from "../../utils/labourCost";

interface LabourCostPanelProps {
  project: PlatformProject;
  timesheets: TimesheetEntry[];
  workers: PlatformWorker[];
}

export function LabourCostPanel({ project, timesheets, workers }: LabourCostPanelProps) {
  const cost = calculateProjectLabourCost(project, timesheets, workers);

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h4 className="font-display font-bold mb-3">Labour Cost - {project.projectName}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-500">Est. Hours</p>
          <p className="font-bold text-lg">{cost.estimatedHours}h</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-500">Actual Hours</p>
          <p className="font-bold text-lg">{cost.actualApprovedHours.toFixed(1)}h</p>
        </div>
        <div className={`rounded-lg p-3 ${cost.isOverEstimate ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
          <p className="text-xs text-gray-500">Hours Variance</p>
          <p className={`font-bold text-lg ${cost.varianceHours > 0 ? "text-red-600" : cost.varianceHours < 0 ? "text-green-600" : ""}`}>
            {cost.varianceHours > 0 ? "+" : ""}{cost.varianceHours.toFixed(1)}h
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-500">Est. Cost</p>
          <p className="font-bold text-lg">${cost.estimatedCost.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-500">Actual Cost</p>
          <p className="font-bold text-lg">${Math.round(cost.actualCost).toLocaleString()}</p>
        </div>
        <div className={`rounded-lg p-3 ${cost.varianceCost > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
          <p className="text-xs text-gray-500">Cost Variance</p>
          <p className={`font-bold text-lg ${cost.varianceCost > 0 ? "text-red-600" : cost.varianceCost < 0 ? "text-green-600" : ""}`}>
            {cost.varianceCost > 0 ? "+" : ""}${Math.round(cost.varianceCost).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {cost.isOverEstimate ? "Over estimate" : cost.isUnderEstimate ? "Under estimate" : "On target"}
      </div>
    </div>
  );
}
