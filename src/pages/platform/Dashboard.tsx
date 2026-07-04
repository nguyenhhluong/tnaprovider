import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { KpiCard } from "../../components/platform/KpiCard";
import { RecentActivity } from "../../components/platform/RecentActivity";
import { DollarSign, Users, TrendingUp, Wrench, FileText, Loader2 } from "lucide-react";

export function Dashboard() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/dashboard", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          newLeadsThisWeek: data.leads?.total ?? 0,
          hotLeads: (data.leads?.byStatus ?? []).reduce((s: number, st: any) => s + (st.status === 'hot' ? st.c : 0), 0),
          activeProjects: (data.projects?.byStatus ?? []).reduce((s: number, st: any) => s + (st.status === 'active' ? st.c : 0), 0),
          maintenanceRequests: (data.maintenance?.byStatus ?? []).reduce((s: number, st: any) => s + ((st.status === 'open' || st.status === 'in_progress') ? st.c : 0), 0),
          revenuePipeline: data.quotes?.totalAcceptedValue ?? 0,
        });
        const raw = data.activity || [];
        const knownTypes = new Set(["lead","leads","timesheet","timesheets","realtime_timesheet","project","projects","quote","quotes","task","tasks","document","documents","variation","maintenance","review","notification","notifications","user","users","security","audit","system"]);
        const normalise = (t?: string | null) => { const s = String(t || "system").toLowerCase(); return knownTypes.has(s) ? s : "system"; };
        setActivities(raw.map((a: any) => ({
          id: a.id || `${a.action || "activity"}-${a.created_at || ""}`,
          type: normalise(a.entity_type),
          action: a.action || "Activity",
          description: a.user_name
            ? `${a.user_name} performed ${a.action || "an action"}`
            : a.entity_type
              ? `${a.action || "Activity"} on ${a.entity_type}`
              : a.action || "System activity",
          timestamp: a.created_at || a.updated_at || null,
        })));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const cards = metrics ? [
    { title: "New Leads", value: metrics.newLeadsThisWeek, icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Hot Leads", value: metrics.hotLeads, icon: TrendingUp, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
    { title: "Active Projects", value: metrics.activeProjects, icon: FileText, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Maintenance", value: metrics.maintenanceRequests, icon: Wrench, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30" },
    { title: "Revenue Pipeline", value: `$${metrics.revenuePipeline.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  ] : [];

  return (
    <>
      <PlatformHeader title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <KpiCard key={card.title} {...card} />
              ))}
            </div>
            {activities.length > 0 && <RecentActivity activities={activities} />}
            {activities.length === 0 && !loading && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <p className="text-sm text-gray-400">No recent activity yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
