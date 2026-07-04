import type { Variation } from "../../types/variation";
import { StatusBadge } from "./StatusBadge";

interface VariationListProps {
  variations: Variation[];
  showProject?: boolean;
}

export function VariationList({ variations, showProject }: VariationListProps) {
  if (!variations || variations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No variations found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variations.map((variation) => (
        <div key={variation.id} className="bg-white dark:bg-brand-darker rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{variation.title}</h4>
              {showProject && (
                <p className="text-sm text-gray-500">{variation.projectName}</p>
              )}
            </div>
            <StatusBadge status={variation.status} />
          </div>

          {variation.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{variation.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Cost: </span>
              <span className={variation.costImpact >= 0 ? "text-red-600" : "text-green-600"}>
                {variation.costImpact >= 0 ? "+" : ""}${Math.abs(variation.costImpact).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Time: </span>
              <span>{variation.timeImpactDays >= 0 ? "+" : ""}{variation.timeImpactDays} days</span>
            </div>
            {variation.requestedBy && (
              <div>
                <span className="text-gray-500">Requested by: </span>
                <span>{variation.requestedBy}</span>
              </div>
            )}
            {variation.clientApprovalDate && (
              <div>
                <span className="text-gray-500">Client approval: </span>
                <span>{new Date(variation.clientApprovalDate).toLocaleDateString("en-AU")}</span>
              </div>
            )}
          </div>

          {variation.status === "rejected" && variation.rejectionReason && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
              Reason: {variation.rejectionReason}
            </div>
          )}

          {variation.notes && (
            <div className="mt-2 text-xs text-gray-500">Notes: {variation.notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}
