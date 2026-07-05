import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { SEO } from "../../components/SEO";
import { cn } from "../../utils/cn";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Wrench,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  Target,
  DollarSign,
  CheckCircle,
  Clock,
  Activity,
  Download,
  RefreshCw,
} from "lucide-react";

interface DashboardSummary {
  totalLeads: number;
  overdueFollowups: number;
  acceptedQuoteValue: number;
  activeProjects: number;
  overdueTasks: number;
  openMaintenance: number;
}

interface DashboardResponse {
  leads?: { total?: number; byStatus?: StatusCount[]; overdueFollowups?: number };
  quotes?: { byStatus?: StatusCount[]; totalAcceptedValue?: number; conversionRate?: number };
  projects?: { byStatus?: StatusCount[] };
  tasks?: { byStatus?: StatusCount[]; overdue?: number };
  maintenance?: { byStatus?: StatusCount[]; byPriority?: StatusCount[] };
  activity?: any[];
  backups?: { count?: number; lastBackupAt?: string | null };
}

interface StatusCount {
  status: string;
  count: number;
}

interface LeadsReport {
  byStatus: StatusCount[];
  bySource: { source: string; count: number }[];
  followupCounts: { overdue: number; today: number; thisWeek: number };
}

interface QuotesReport {
  byStatus: StatusCount[];
  conversionRate: number;
  totalAcceptedValue: number;
}

interface ProjectsReport {
  byStatus: StatusCount[];
  totalBudget: number;
}

interface TasksReport {
  byStatus: StatusCount[];
  overdueCount: number;
}

interface MaintenanceReport {
  byStatus: StatusCount[];
  byPriority: { priority: string; count: number }[];
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_name: string | null;
  created_at: string;
  metadata_json: string | null;
}

type Section = "leads" | "quotes" | "projects" | "tasks" | "maintenance" | "activity";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function BarChart({ data, color }: { data: StatusCount[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.status} className="flex items-center gap-3">
          <span className="text-xs capitalize w-28 shrink-0 text-gray-600 dark:text-gray-400">
            {item.status.replace(/_/g, " ")}
          </span>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", color)}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium w-6 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
  loading,
  error,
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-brand" />
          <h3 className="font-display font-bold text-lg">{title}</h3>
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();

  const [startDate, setStartDate] = useState(thirtyDaysAgoISO);
  const [endDate, setEndDate] = useState(todayISO);

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [leadsReport, setLeadsReport] = useState<LeadsReport | null>(null);
  const [quotesReport, setQuotesReport] = useState<QuotesReport | null>(null);
  const [projectsReport, setProjectsReport] = useState<ProjectsReport | null>(null);
  const [tasksReport, setTasksReport] = useState<TasksReport | null>(null);
  const [maintenanceReport, setMaintenanceReport] = useState<MaintenanceReport | null>(null);
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);

  const [sectionLoading, setSectionLoading] = useState<Partial<Record<Section, boolean>>>({});
  const [sectionError, setSectionError] = useState<Partial<Record<Section, string | null>>>({});

  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    leads: false,
    quotes: false,
    projects: false,
    tasks: false,
    maintenance: false,
    activity: false,
  });

  const toggleSection = (s: Section) =>
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetch("/api/reports/dashboard");
      const data = await res.json();
      setDashboard({
        totalLeads: data.leads?.total ?? 0,
        overdueFollowups: data.leads?.overdueFollowups ?? 0,
        acceptedQuoteValue: data.quotes?.totalAcceptedValue ?? 0,
        activeProjects: (data.projects?.byStatus ?? []).reduce((s: number, st: any) => s + (st.status === 'active' ? st.c : 0), 0),
        overdueTasks: data.tasks?.overdue ?? 0,
        openMaintenance: (data.maintenance?.byStatus ?? []).reduce((s: number, st: any) => s + ((st.status === 'open' || st.status === 'in_progress') ? st.c : 0), 0),
      });
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchSection = useCallback(
    async (section: Section) => {
      setSectionLoading((prev) => ({ ...prev, [section]: true }));
      setSectionError((prev) => ({ ...prev, [section]: null }));
      try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
        switch (section) {
          case "leads": {
            const data = await fetchJSON<LeadsReport>(`/api/reports/leads?${params}`);
            setLeadsReport(data);
            break;
          }
          case "quotes": {
            const data = await fetchJSON<QuotesReport>(`/api/reports/quotes?${params}`);
            setQuotesReport(data);
            break;
          }
          case "projects": {
            const data = await fetchJSON<ProjectsReport>(`/api/reports/projects?${params}`);
            setProjectsReport(data);
            break;
          }
          case "tasks": {
            const data = await fetchJSON<TasksReport>(`/api/reports/tasks?${params}`);
            setTasksReport(data);
            break;
          }
          case "maintenance": {
            const data = await fetchJSON<MaintenanceReport>(`/api/reports/maintenance?${params}`);
            setMaintenanceReport(data);
            break;
          }
          case "activity": {
            const data = await fetchJSON<ActivityItem[]>("/api/reports/activity");
            setActivities(data);
            break;
          }
        }
      } catch (err) {
        setSectionError((prev) => ({
          ...prev,
          [section]: err instanceof Error ? err.message : "Failed to load",
        }));
      } finally {
        setSectionLoading((prev) => ({ ...prev, [section]: false }));
      }
    },
    [startDate, endDate],
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const open = Object.entries(openSections).filter(([, v]) => v);
    open.forEach(([key]) => fetchSection(key as Section));
  }, [openSections, fetchSection]);

  const summaryCards = dashboard
    ? [
        {
          title: "Total Leads",
          value: dashboard.totalLeads,
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-100 dark:bg-blue-900/30",
        },
        {
          title: "Overdue Follow-ups",
          value: dashboard.overdueFollowups,
          icon: AlertTriangle,
          color: "text-red-600",
          bg: "bg-red-100 dark:bg-red-900/30",
        },
        {
          title: "Accepted Quote Value",
          value: `$${(dashboard.acceptedQuoteValue / 1000).toFixed(0)}k`,
          icon: DollarSign,
          color: "text-green-600",
          bg: "bg-green-100 dark:bg-green-900/30",
        },
        {
          title: "Active Projects",
          value: dashboard.activeProjects,
          icon: FileText,
          color: "text-purple-600",
          bg: "bg-purple-100 dark:bg-purple-900/30",
        },
        {
          title: "Overdue Tasks",
          value: dashboard.overdueTasks,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-100 dark:bg-amber-900/30",
        },
        {
          title: "Open Maintenance",
          value: dashboard.openMaintenance,
          icon: Wrench,
          color: "text-teal-600",
          bg: "bg-teal-100 dark:bg-teal-900/30",
        },
      ]
    : [];

  return (
    <>
      <SEO
        title="Reports | TNA Provider"
        description="Business reports and analytics for TNA Provider platform"
        canonical="/platform/reports"
      />
      <PageHeader title="Reports" description="View business reports and analytics." onMenuClick={() => setSidebarOpen(true)} />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-brand-darker text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-brand-darker text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchDashboard();
                Object.keys(openSections).forEach((s) => {
                  if (openSections[s as Section]) fetchSection(s as Section);
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed">
              <Download className="w-4 h-4" />
              Export (coming soon)
            </button>
          </div>
        </div>

        {dashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : dashboardError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
            {dashboardError}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryCards.map((card) => (
              <div
                key={card.title}
                className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                    <p className="text-2xl font-display font-bold">{card.value ?? 0}</p>
                  </div>
                  <div className={cn("p-3 rounded-lg", card.bg)}>
                    <card.icon className={cn("w-5 h-5", card.color)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollapsibleSection
            title="Leads Report"
            icon={Target}
            open={openSections.leads}
            onToggle={() => toggleSection("leads")}
            loading={sectionLoading.leads}
            error={sectionError.leads}
          >
            {leadsReport && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Status
                  </h4>
                  <BarChart data={leadsReport.byStatus} color="bg-blue-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Source
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {leadsReport.bySource.map((s) => (
                      <div
                        key={s.source}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      >
                        <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                          {s.source.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Follow-ups
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p className="text-lg font-bold text-red-600">
                        {leadsReport.followupCounts.overdue}
                      </p>
                      <p className="text-xs text-red-500">Overdue</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <p className="text-lg font-bold text-amber-600">
                        {leadsReport.followupCounts.today}
                      </p>
                      <p className="text-xs text-amber-500">Today</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-lg font-bold text-blue-600">
                        {leadsReport.followupCounts.thisWeek}
                      </p>
                      <p className="text-xs text-blue-500">This Week</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Quotes Report"
            icon={TrendingUp}
            open={openSections.quotes}
            onToggle={() => toggleSection("quotes")}
            loading={sectionLoading.quotes}
            error={sectionError.quotes}
          >
            {quotesReport && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Status
                  </h4>
                  <BarChart data={quotesReport.byStatus} color="bg-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Conversion Rate</p>
                    <p className="text-2xl font-display font-bold text-brand">
                      {quotesReport.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Accepted Value
                    </p>
                    <p className="text-2xl font-display font-bold text-green-600">
                      ${(quotesReport.totalAcceptedValue / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Projects Report"
            icon={FileText}
            open={openSections.projects}
            onToggle={() => toggleSection("projects")}
            loading={sectionLoading.projects}
            error={sectionError.projects}
          >
            {projectsReport && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Status
                  </h4>
                  <BarChart data={projectsReport.byStatus} color="bg-purple-500" />
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budget</p>
                  <p className="text-2xl font-display font-bold text-purple-600">
                    ${(projectsReport.totalBudget / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Tasks Report"
            icon={CheckCircle}
            open={openSections.tasks}
            onToggle={() => toggleSection("tasks")}
            loading={sectionLoading.tasks}
            error={sectionError.tasks}
          >
            {tasksReport && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Status
                  </h4>
                  <BarChart data={tasksReport.byStatus} color="bg-amber-500" />
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overdue Tasks</p>
                  <p className="text-2xl font-display font-bold text-red-600">
                    {tasksReport.overdueCount}
                  </p>
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Maintenance Report"
            icon={Wrench}
            open={openSections.maintenance}
            onToggle={() => toggleSection("maintenance")}
            loading={sectionLoading.maintenance}
            error={sectionError.maintenance}
          >
            {maintenanceReport && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Status
                  </h4>
                  <BarChart data={maintenanceReport.byStatus} color="bg-teal-500" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    By Priority
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {maintenanceReport.byPriority.map((p) => (
                      <div
                        key={p.priority}
                        className={cn(
                          "text-center p-3 rounded-lg",
                          p.priority === "urgent" && "bg-red-50 dark:bg-red-900/20",
                          p.priority === "high" && "bg-orange-50 dark:bg-orange-900/20",
                          p.priority === "medium" && "bg-amber-50 dark:bg-amber-900/20",
                          p.priority === "low" && "bg-green-50 dark:bg-green-900/20",
                        )}
                      >
                        <p
                          className={cn(
                            "text-lg font-bold",
                            p.priority === "urgent" && "text-red-600",
                            p.priority === "high" && "text-orange-600",
                            p.priority === "medium" && "text-amber-600",
                            p.priority === "low" && "text-green-600",
                          )}
                        >
                          {p.count}
                        </p>
                        <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                          {p.priority}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Activity Feed"
            icon={Activity}
            open={openSections.activity}
            onToggle={() => toggleSection("activity")}
            loading={sectionLoading.activity}
            error={sectionError.activity}
          >
            {activities && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                            <span className="font-medium">{a.action}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">
                          {a.action?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-gray-500">{a.user_name || '-'}</td>
                        <td className="py-2.5 px-2 text-right text-gray-400 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                    {activities.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No recent activity.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>
        </div>
      </div>
    </>
  );
}
