import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import { Shield, AlertCircle, Search, Calendar, Filter, X } from "lucide-react";

interface AuditEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  "login", "logout", "login_failed", "password_changed", "password_reset",
  "user_created", "user_disabled", "user_enabled", "user_invited", "user_role_changed",
  "invite_accepted", "session_revoked", "email_sent", "email_opened",
  "lead_created", "lead_status_changed", "project_created", "project_updated",
  "timesheet_submitted", "timesheet_approved", "maintenance_created", "maintenance_status",
];

const ENTITY_TYPES = ["user", "lead", "project", "timesheet", "email", "maintenance", "session", "invite"];

export function Audit() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = async (filters?: string) => {
    setLoading(true);
    try {
      const url = `/api/platform/audit${filters || ""}`;
      const res = await fetch(url);
      if (res.ok) {
        setLogs(await res.json());
      } else {
        setError("Failed to load audit logs");
      }
    } catch {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (eventType) params.set("action", eventType);
    if (entityType) params.set("entity_type", entityType);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (search) params.set("search", search);
    const qs = params.toString();
    fetchLogs(qs ? `?${qs}` : "");
  };

  const clearFilters = () => {
    setSearch("");
    setEventType("");
    setEntityType("");
    setDateFrom("");
    setDateTo("");
    fetchLogs();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const hasFilters = search || eventType || entityType || dateFrom || dateTo;
  const filteredLogs = hasFilters ? logs : logs;

  return (
    <>
      <SEO title="Audit Log | TNA Provider Platform" description="Platform audit log." canonical="https://tnaprovider.com.au/platform/audit" />
      <PageHeader title="Audit Log" description="View platform audit trail." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8">

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, IP..." className="w-full pl-9 pr-3 h-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent" />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent">
              <option value="">All</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{formatAction(t)}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Entity</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent">
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent" />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full h-10 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="h-10 px-4 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="hidden md:table-cell text-left px-4 md:px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No audit log entries match your filters.</td>
                  </tr>
                )}
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 md:px-6 py-3 text-xs md:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 md:px-6 py-3 text-sm font-medium text-brand-dark dark:text-white">{log.user_name || "System"}</td>
                    <td className="px-4 md:px-6 py-3">
                      <span className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full whitespace-nowrap">{formatAction(log.action)}</span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}</td>
                    <td className="hidden md:table-cell px-4 md:px-6 py-3 text-sm text-gray-400 font-mono">{log.ip_address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
