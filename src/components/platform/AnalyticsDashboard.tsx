import { mockLeads, mockProjects, mockTimesheets, mockVariations, mockMaintenanceTickets } from "../../data/platformMock";
import { calculateAnalytics } from "../../utils/analytics";

export function AnalyticsDashboard() {
  const metrics = calculateAnalytics(
    mockLeads,
    mockProjects,
    mockTimesheets,
    mockVariations,
    mockMaintenanceTickets
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Active Projects</h4>
          <p className="text-2xl font-display font-bold">{metrics.activeProjectCount}</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Completed Projects</h4>
          <p className="text-2xl font-display font-bold">{metrics.completedProjects}</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Conversion Rate</h4>
          <p className="text-2xl font-display font-bold">{metrics.conversionRate}%</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Hot Leads</h4>
          <p className="text-2xl font-display font-bold">{metrics.hotLeads}</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Approved Hours This Week</h4>
          <p className="text-2xl font-display font-bold">{metrics.approvedHoursThisWeek.toFixed(1)}h</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Avg Manufacturing Lead Time</h4>
          <p className="text-2xl font-display font-bold">{metrics.avgManufacturingLeadTime}d</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Pending Variations</h4>
          <p className="text-2xl font-display font-bold">{metrics.pendingVariations}</p>
        </div>
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="text-sm text-gray-500 mb-1">Open Maintenance Tickets</h4>
          <p className="text-2xl font-display font-bold">{metrics.maintenanceTickets}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="font-display font-bold mb-4">Leads by Source</h4>
          {Object.keys(metrics.leadsBySource).length === 0 ? (
            <p className="text-sm text-gray-500">No lead data available</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.leadsBySource).map(([source, count]) => {
                const total = Object.values(metrics.leadsBySource).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{source.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-accent rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="font-display font-bold mb-4">Labour Variance by Project</h4>
          {Object.keys(metrics.labourVarianceByProject).length === 0 ? (
            <p className="text-sm text-gray-500">No project data available</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.labourVarianceByProject).map(([name, data]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="flex-1 truncate">{name}</span>
                  <div className="flex gap-4 text-xs">
                    <span>Est: {data.estimated}h</span>
                    <span>Act: {data.actual}h</span>
                    <span className={data.variance > 0 ? "text-red-600" : data.variance < 0 ? "text-green-600" : ""}>
                      {data.variance > 0 ? "+" : ""}{data.variance}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
