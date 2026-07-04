import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { KpiCard } from "../../components/platform/KpiCard";
import { RecentActivity } from "../../components/platform/RecentActivity";
import { mockDashboardMetrics, mockActivities } from "../../data/platformMock";
import { DollarSign, Users, TrendingUp, Clock, AlertTriangle, Wrench, FileText, BarChart3, CheckCircle } from "lucide-react";

export function Dashboard() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();

  const cards = [
    { title: "New Leads This Week", value: mockDashboardMetrics.newLeadsThisWeek, icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Hot Leads", value: mockDashboardMetrics.hotLeads, icon: TrendingUp, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
    { title: "Active Projects", value: mockDashboardMetrics.activeProjects, icon: FileText, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Pending Timesheets", value: mockDashboardMetrics.pendingTimesheets, icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { title: "Pending Variations", value: mockDashboardMetrics.pendingVariations, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
    { title: "Maintenance Requests", value: mockDashboardMetrics.maintenanceRequests, icon: Wrench, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30" },
    { title: "Revenue Pipeline", value: `$${(mockDashboardMetrics.revenuePipeline / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
    { title: "Manufacturing Lead Time", value: `${mockDashboardMetrics.currentManufacturingLeadTime}d`, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { title: "Approved Hours/Week", value: mockDashboardMetrics.approvedHoursThisWeek, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  ];

  return (
    <>
      <PlatformHeader title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <KpiCard key={card.title} {...card} />
          ))}
        </div>
        <RecentActivity activities={mockActivities} />
      </div>
    </>
  );
}
