import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useOutletContext, useNavigate } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader, EmptyState, LoadingState, ErrorState } from "../../components/shared";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import {
  Mail, CheckCircle, Clock, AlertCircle, XCircle, RefreshCw, Search,
  Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ExternalLink, Copy, Send, Users, FileText, MessageSquare, Download,
  Eye, ArrowUpDown, Calendar, Loader2, Inbox, Ban, Trash2,
  Info, Activity, CheckCheck,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

const PAGE_SIZES = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SENT: { label: "Sent", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon: CheckCircle },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: AlertCircle },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400", icon: Clock },
  PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", icon: Loader2 },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", icon: Ban },
};

const TYPE_LABELS: Record<string, string> = {
  QUOTE_RECEIVED_CUSTOMER: "Quote Confirmation",
  QUOTE_RECEIVED_ADMIN: "Admin Quote Notification",
  USER_INVITATION: "User Invitation",
  PASSWORD_RESET: "Password Reset",
  QUOTE_STATUS_CHANGED: "Quote Status Update",
};

const TYPE_ICONS: Record<string, any> = {
  QUOTE_RECEIVED_CUSTOMER: MessageSquare,
  QUOTE_RECEIVED_ADMIN: Mail,
  USER_INVITATION: Users,
  PASSWORD_RESET: FileText,
  QUOTE_STATUS_CHANGED: Activity,
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function fmtDateShort(iso: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cfg.color)}>
      {status === "PROCESSING" ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {cfg.label}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, color, bg, subtitle }: {
  title: string; value: string | number; icon: any; color: string; bg: string; subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-display font-bold">{value ?? 0}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-lg", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
    </div>
  );
}

export function EmailCenter() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTimeoutRef = useRef<any>(null);

  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "");
  const [dateFilter, setDateFilter] = useState(searchParams.get("dateRange") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "created_at");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)));

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [retryConfirm, setRetryConfirm] = useState<any>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const STATUSES = ["", "SENT", "FAILED", "PENDING", "PROCESSING", "CANCELLED"];
  const TYPES = ["", "QUOTE_RECEIVED_CUSTOMER", "QUOTE_RECEIVED_ADMIN", "USER_INVITATION", "PASSWORD_RESET", "QUOTE_STATUS_CHANGED"];
  const DATE_RANGES = [
    { value: "", label: "All time" },
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "custom", label: "Custom range" },
  ];

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (dateFilter === "custom") {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    } else if (dateFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      params.set("dateFrom", today);
    } else if (dateFilter === "7days") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      params.set("dateFrom", d.toISOString().split("T")[0]);
    } else if (dateFilter === "30days") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      params.set("dateFrom", d.toISOString().split("T")[0]);
    }
    params.set("sort", sort);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [search, statusFilter, typeFilter, dateFilter, dateFrom, dateTo, sort, sortOrder, page, pageSize]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null);
    try {
      const res = await fetch("/api/admin/email-center/summary", { credentials: "include" });
      if (!res.ok) { setSummaryError("Failed to load summary"); return; }
      const d = await res.json();
      if (d.success) setSummary(d.data);
    } catch { setSummaryError("Network error"); }
    finally { setSummaryLoading(false); }
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true); setJobsError(null);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/admin/email-jobs?${qs}`, { credentials: "include" });
      if (!res.ok) { setJobsError("Failed to load email jobs"); return; }
      const d = await res.json();
      if (d.success) {
        setJobs(d.data || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 0);
      }
    } catch { setJobsError("Network error"); }
    finally { setJobsLoading(false); }
  }, [buildQueryString]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/email-jobs/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const d = await res.json();
      if (d.success) {
        setSelectedJob(d.data);
        setDetailOpen(true);
      }
    } catch {}
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    const params = new URLSearchParams(buildQueryString());
    setSearchParams(params, { replace: true });
  }, [buildQueryString, setSearchParams]);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter, dateFilter, dateFrom, dateTo]);

  const hasActiveJobs = jobs.some(j => j.status === "PENDING" || j.status === "PROCESSING");
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (hasActiveJobs) {
      pollIntervalRef.current = setInterval(fetchJobs, 10000);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [hasActiveJobs, fetchJobs]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchJobs(), 400);
  }

  function clearFilters() {
    setSearch(""); setStatusFilter(""); setTypeFilter(""); setDateFilter("");
    setDateFrom(""); setDateTo(""); setSort("created_at"); setSortOrder("desc"); setPage(1);
  }

  function toggleSort(column: string) {
    if (sort === column) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSort(column); setSortOrder("desc");
    }
  }

  function toggleBulk(id: string) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleBulkAll() {
    if (bulkSelected.size === jobs.filter(j => j.status === "FAILED").length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(jobs.filter(j => j.status === "FAILED").map(j => j.id)));
    }
  }

  async function handleRetry(jobId: string) {
    setActionLoading(jobId);
    setErrorMsg(null); setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/email-jobs/${jobId}/retry`, { method: "POST", credentials: "include" });
      const d = await res.json();
      if (d.success) {
        setSuccessMsg(`Email sent successfully (${d.messageId?.slice(0, 20) || ""})`);
        setRetryConfirm(null);
      } else {
        setErrorMsg(d.error || "Retry failed");
      }
      await fetchJobs(); await fetchSummary();
      if (selectedJob?.id === jobId) fetchDetail(jobId);
    } catch { setErrorMsg("Network error"); }
    finally { setActionLoading(null); }
  }

  async function handleResend(jobId: string) {
    setActionLoading(jobId);
    setErrorMsg(null); setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/email-jobs/${jobId}/resend`, { method: "POST", credentials: "include" });
      const d = await res.json();
      if (d.success) {
        setSuccessMsg("Email resent successfully");
      } else {
        setErrorMsg(d.error || "Resend failed");
      }
      await fetchJobs(); await fetchSummary();
    } catch { setErrorMsg("Network error"); }
    finally { setActionLoading(null); }
  }

  async function handleBulkRetry() {
    if (bulkSelected.size === 0) return;
    setBulkActionLoading(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/email-jobs/bulk-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobIds: Array.from(bulkSelected) }),
      });
      const d = await res.json();
      if (d.success) {
        setSuccessMsg(`Bulk retry: ${d.accepted} accepted, ${d.rejected} rejected`);
        setBulkSelected(new Set());
      } else {
        setErrorMsg(d.error || "Bulk retry failed");
      }
      await fetchJobs(); await fetchSummary();
    } catch { setErrorMsg("Network error"); }
    finally { setBulkActionLoading(false); }
  }

  const hasFilters = search || statusFilter || typeFilter || dateFilter;

  return (
    <>
      <SEO title="Email Center - TNA Provider" description="Monitor and manage automated email delivery" canonical="https://app.tnaprovider.com.au/email-center" />
      <PageHeader title="Email Center" description="Monitor and manage automated email delivery" onMenuClick={() => setSidebarOpen(true)} />

      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Success/Error messages */}
        {successMsg && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
            <CheckCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-500 hover:text-green-700"><XCircle className="w-4 h-4" /></button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-500 hover:text-red-700"><XCircle className="w-4 h-4" /></button>
          </div>
        )}

        {/* Summary Cards */}
        {summaryLoading ? (
          <LoadingState message="Loading summary..." />
        ) : summaryError ? (
          <ErrorState message={summaryError} onRetry={fetchSummary} />
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <SummaryCard title="Total" value={summary.total} icon={Mail} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
              <SummaryCard title="Sent" value={summary.sent} icon={CheckCircle} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" subtitle={`${summary.sentLast24Hours} in 24h`} />
              <SummaryCard title="Pending" value={summary.pending} icon={Clock} color="text-yellow-600" bg="bg-yellow-50 dark:bg-yellow-900/20" />
              <SummaryCard title="Processing" value={summary.processing} icon={Loader2} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
              <SummaryCard title="Failed" value={summary.failed} icon={AlertCircle} color="text-red-600" bg="bg-red-50 dark:bg-red-900/20" />
              <SummaryCard title="Cancelled" value={summary.cancelled} icon={Ban} color="text-gray-600" bg="bg-gray-50 dark:bg-gray-800" />
              <SummaryCard title="Success Rate" value={`${summary.successRate}%`} icon={CheckCheck} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
            </div>

            {/* Activity by Type */}
            {summary.byType?.length > 0 && (
              <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Email Activity by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {summary.byType.map((t: any) => {
                    const Icon = TYPE_ICONS[t.type] || Mail;
                    const maxVal = Math.max(...summary.byType.map((x: any) => x.cnt), 1);
                    const pct = Math.round((t.cnt / maxVal) * 100);
                    return (
                      <div key={t.type} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{TYPE_LABELS[t.type] || t.type}</span>
                        </div>
                        <p className="text-lg font-bold">{t.cnt}</p>
                        <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", t.failed_count > 0 ? "bg-red-400" : "bg-green-400")} style={{ width: `${pct}%` }} />
                        </div>
                        {t.failed_count > 0 && <p className="text-xs text-red-500 mt-1">{t.failed_count} failed</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.recentFailed?.length > 0 && (
                <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="text-sm font-semibold text-red-600 mb-3">Recent Failed</h3>
                  <div className="space-y-2">
                    {summary.recentFailed.map((j: any) => (
                      <button key={j.id} onClick={() => { fetchDetail(j.id); }} className="w-full text-left p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{TYPE_LABELS[j.type] || j.type}</span>
                          <span className="text-xs text-gray-400">{fmtDateShort(j.updated_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{j.recipient}</p>
                        {j.last_error && <p className="text-xs text-red-500 mt-0.5 truncate">{j.last_error}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {summary.recentSent?.length > 0 && (
                <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="text-sm font-semibold text-green-600 mb-3">Recent Sent</h3>
                  <div className="space-y-2">
                    {summary.recentSent.map((j: any) => (
                      <button key={j.id} onClick={() => { fetchDetail(j.id); }} className="w-full text-left p-2.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{TYPE_LABELS[j.type] || j.type}</span>
                          <span className="text-xs text-gray-400">{fmtDateShort(j.sent_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{j.recipient}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Filters */}
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by recipient, subject, or ID..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 h-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {STATUSES.filter(Boolean).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Filter by type"
            >
              <option value="">All Types</option>
              {TYPES.filter(Boolean).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label="Filter by date"
            >
              {DATE_RANGES.map(dr => (
                <option key={dr.value} value={dr.value}>{dr.label}</option>
              ))}
            </select>
            {dateFilter === "custom" && (
              <>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" aria-label="From date" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" aria-label="To date" />
              </>
            )}
            {hasFilters && (
              <button onClick={clearFilters} className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {bulkSelected.size > 0 && (
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {bulkSelected.size} job{bulkSelected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setBulkSelected(new Set())}>Clear</Button>
              <Button size="sm" variant="primary" onClick={handleBulkRetry} disabled={bulkActionLoading}>
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Retry Selected
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {jobsLoading ? (
          <LoadingState message="Loading email jobs..." />
        ) : jobsError ? (
          <ErrorState message={jobsError} onRetry={fetchJobs} />
        ) : jobs.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={Search} title="No results" message="No email jobs match the selected filters." action={{ label: "Clear filters", onClick: clearFilters }} />
          ) : (
            <EmptyState icon={Inbox} title="No emails yet" message="Automated email activity will appear here." />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="p-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={jobs.filter(j => j.status === "FAILED").length > 0 && bulkSelected.size === jobs.filter(j => j.status === "FAILED").length}
                          onChange={toggleBulkAll}
                          className="rounded border-gray-300"
                          aria-label="Select all failed jobs"
                        />
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-gray-700">
                          Status <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">
                        <button onClick={() => toggleSort("recipient")} className="flex items-center gap-1 hover:text-gray-700">
                          Recipient <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Subject</th>
                      <th className="p-3 text-center font-medium text-gray-500 dark:text-gray-400">Attempts</th>
                      <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-gray-700">
                          Created <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className={cn("border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                        selectedJob?.id === job.id && "bg-brand-accent/5"
                      )}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={bulkSelected.has(job.id)}
                            onChange={() => toggleBulk(job.id)}
                            disabled={job.status !== "FAILED"}
                            className="rounded border-gray-300"
                            aria-label={`Select job ${job.id}`}
                          />
                        </td>
                        <td className="p-3"><StatusBadge status={job.status} /></td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {(() => { const Icon = TYPE_ICONS[job.type] || Mail; return <Icon className="w-4 h-4 text-gray-400 shrink-0" />; })()}
                            <span className="text-gray-700 dark:text-gray-300 text-xs">{TYPE_LABELS[job.type] || job.type}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          <div className="flex items-center gap-1">
                            <span className="truncate block text-gray-700 dark:text-gray-300" title={job.recipient}>{job.recipient}</span>
                            <button onClick={() => { navigator.clipboard.writeText(job.recipient); }} className="shrink-0 text-gray-400 hover:text-gray-600" title="Copy recipient">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 max-w-[250px] hidden lg:table-cell">
                          <span className="truncate block text-gray-600 dark:text-gray-400 text-xs" title={job.subject}>{job.subject}</span>
                        </td>
                        <td className="p-3 text-center text-sm text-gray-500">{job.attempt_count}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className="text-xs text-gray-500">{fmtDateShort(job.created_at)}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => fetchDetail(job.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-accent" title="View details">
                              <Eye className="w-4 h-4" />
                            </button>
                            {job.status === "FAILED" && (
                              <button
                                onClick={() => setRetryConfirm(job)}
                                disabled={actionLoading === job.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600"
                                title="Retry"
                              >
                                {actionLoading === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                              </button>
                            )}
                            {job.smtp_message_id && (
                              <button onClick={() => navigator.clipboard.writeText(job.smtp_message_id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600" title="Copy message ID">
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                            {(job.type === "QUOTE_RECEIVED_CUSTOMER" || job.type === "QUOTE_RECEIVED_ADMIN") && (
                              <button
                                onClick={() => handleResend(job.id)}
                                disabled={actionLoading === job.id}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-accent"
                                title="Resend"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(job.id)}
                        onChange={() => toggleBulk(job.id)}
                        disabled={job.status !== "FAILED"}
                        className="rounded border-gray-300"
                        aria-label={`Select ${job.id}`}
                      />
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-1">
                      {job.status === "FAILED" && (
                        <button onClick={() => setRetryConfirm(job)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Retry">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => fetchDetail(job.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {(() => { const Icon = TYPE_ICONS[job.type] || Mail; return <Icon className="w-3.5 h-3.5 text-gray-400" />; })()}
                    <span className="text-xs font-medium text-gray-500">{TYPE_LABELS[job.type] || job.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{job.recipient}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{job.subject}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                    <span>Attempts: {job.attempt_count}</span>
                    <span>{fmtDateShort(job.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-8 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm"
                  aria-label="Page size"
                >
                  {PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                </select>
                <span>of {total} results</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {detailOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setDetailOpen(false)} />
          <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Email Job Details</h2>
              <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <LoadingState message="Loading details..." />
            ) : !selectedJob ? (
              <ErrorState message="Failed to load job details" />
            ) : (
              <div className="p-4 space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedJob.status} />
                  {selectedJob.type && (
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                      {TYPE_LABELS[selectedJob.type] || selectedJob.type}
                    </span>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Recipient" value={selectedJob.recipient} />
                  <DetailField label="Subject" value={selectedJob.subject} />
                  {selectedJob.from && <DetailField label="From" value={selectedJob.from} />}
                  {selectedJob.payload_json && (() => {
                    try { const p = JSON.parse(selectedJob.payload_json); return p.replyTo ? <DetailField label="Reply-To" value={p.replyTo} /> : null; }
                    catch { return null; }
                  })()}
                  <DetailField label="Created" value={fmtDate(selectedJob.created_at)} />
                  {selectedJob.scheduled_at && <DetailField label="Scheduled" value={fmtDate(selectedJob.scheduled_at)} />}
                  {selectedJob.sent_at && <DetailField label="Sent" value={fmtDate(selectedJob.sent_at)} />}
                  <DetailField label="Attempts" value={String(selectedJob.attempt_count)} />
                  {selectedJob.smtp_message_id && <DetailField label="SMTP ID" value={selectedJob.smtp_message_id} />}
                </div>

                {/* Related entity */}
                {selectedJob.relatedInfo && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Related {selectedJob.related_entity_type}</h4>
                    {selectedJob.related_entity_type === "contact_request" && (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{selectedJob.relatedInfo.first_name} {selectedJob.relatedInfo.last_name}</p>
                        <p className="text-gray-500">{selectedJob.relatedInfo.email}</p>
                        <p className="text-xs text-gray-400">Status: {selectedJob.relatedInfo.status}</p>
                        <button onClick={() => { setDetailOpen(false); navigate(`/platform/quote-requests?id=${selectedJob.relatedInfo.id}`); }}
                          className="mt-2 text-xs text-brand-accent hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Open Quote Request
                        </button>
                      </div>
                    )}
                    {selectedJob.related_entity_type === "quote" && (
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{selectedJob.relatedInfo.quote_number} - {selectedJob.relatedInfo.title}</p>
                        <p className="text-gray-500">{selectedJob.relatedInfo.client_name} ({selectedJob.relatedInfo.client_email})</p>
                        <p className="text-xs text-gray-400">Status: {selectedJob.relatedInfo.status}</p>
                        <button onClick={() => { setDetailOpen(false); navigate(`/platform/quotes?id=${selectedJob.relatedInfo.id}`); }}
                          className="mt-2 text-xs text-brand-accent hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Open Quote
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {selectedJob.last_error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-red-600 mb-1">Last Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 break-words">{selectedJob.last_error}</p>
                  </div>
                )}

                {/* Attempt History */}
                <AttemptHistorySection job={selectedJob} />

                {/* Payload preview */}
                {selectedJob.payload_json && (() => {
                  try {
                    const p = JSON.parse(selectedJob.payload_json);
                    return (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Email Content</h4>
                        {p.text && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2">
                            <p className="text-xs text-gray-500 font-medium mb-1">Plain Text</p>
                            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{p.text.slice(0, 1000)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                  {selectedJob.status === "FAILED" && (
                    <Button size="sm" variant="primary" onClick={() => { handleRetry(selectedJob.id); }} disabled={actionLoading === selectedJob.id}>
                      {actionLoading === selectedJob.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Retry
                    </Button>
                  )}
                  {(selectedJob.type === "QUOTE_RECEIVED_CUSTOMER" || selectedJob.type === "QUOTE_RECEIVED_ADMIN") && (
                    <Button size="sm" variant="outline" onClick={() => handleResend(selectedJob.id)} disabled={actionLoading === selectedJob.id}>
                      <Send className="w-4 h-4" /> Resend
                    </Button>
                  )}
                  {selectedJob.smtp_message_id && (
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(selectedJob.smtp_message_id)}>
                      <Copy className="w-4 h-4" /> Copy SMTP ID
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Retry Confirmation Dialog */}
      {retryConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6">
            <h3 className="text-base font-semibold mb-2">Retry Email</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to retry this email?</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <p><span className="text-gray-500">Type:</span> <span className="font-medium">{TYPE_LABELS[retryConfirm.type] || retryConfirm.type}</span></p>
              <p><span className="text-gray-500">Recipient:</span> <span className="font-medium">{retryConfirm.recipient}</span></p>
              <p><span className="text-gray-500">Error:</span> <span className="text-red-500">{retryConfirm.last_error || "Unknown"}</span></p>
              <p><span className="text-gray-500">Attempts:</span> <span className="font-medium">{retryConfirm.attempt_count}</span></p>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setRetryConfirm(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={() => handleRetry(retryConfirm.id)} disabled={actionLoading === retryConfirm.id}>
                {actionLoading === retryConfirm.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {actionLoading === retryConfirm.id ? "Retrying..." : "Retry"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AttemptHistorySection({ job }: { job: any }) {
  const attempts = job.attempts;
  const hasAttemptData = Array.isArray(attempts) && attempts.length > 0;
  const hasLegacyAttempts = !hasAttemptData && (job.attempt_count > 0);

  if (!hasAttemptData && !hasLegacyAttempts) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Attempts</h4>
      <div className="space-y-2">
        {hasAttemptData ? (
          attempts.map((att: any, idx: number) => {
            const attemptNum = att.attempt_number || attempts.length - idx;
            const isProcessing = att.status === "PROCESSING";
            const isSent = att.status === "SENT";
            const isFailed = att.status === "FAILED";
            const hasDuration = att.started_at && att.completed_at;

            let duration = null;
            if (hasDuration) {
              const diff = new Date(att.completed_at).getTime() - new Date(att.started_at).getTime();
              if (diff < 1000) duration = "<1s";
              else if (diff < 60000) duration = `${Math.round(diff / 1000)}s`;
              else duration = `${Math.floor(diff / 60000)}m ${Math.round((diff % 60000) / 1000)}s`;
            }

            return (
              <div key={att.id} className={cn(
                "rounded-lg border p-3 text-sm",
                isSent && "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10",
                isFailed && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10",
                isProcessing && "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10",
                !isSent && !isFailed && !isProcessing && "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Attempt #{attemptNum}
                    </span>
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    )}
                    {isSent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" /> Sent
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                  {duration && <span className="text-xs text-gray-400">{duration}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {att.started_at && <span>Started: {fmtDate(att.started_at)}</span>}
                  {att.completed_at && <span>Completed: {fmtDate(att.completed_at)}</span>}
                </div>
                {att.smtp_message_id && (
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-gray-400">SMTP ID:</span>
                    <code className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{att.smtp_message_id}</code>
                    <button onClick={() => navigator.clipboard.writeText(att.smtp_message_id)}
                      className="text-gray-400 hover:text-gray-600 shrink-0" title="Copy SMTP ID">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {att.error_message && (
                  <details className="mt-1">
                    <summary className="text-xs text-red-500 cursor-pointer hover:text-red-600">Error details</summary>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-words bg-red-50 dark:bg-red-900/20 rounded p-2">{att.error_message}</p>
                  </details>
                )}
              </div>
            );
          })
        ) : (
          /* Legacy fallback for jobs without attempt records */
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-500">Historical Record</span>
              <span className="text-xs text-gray-400">
                {job.status === "SENT" ? "Sent" : job.status === "FAILED" ? "Failed" : job.status}
              </span>
            </div>
            {job.smtp_message_id && (
              <p className="text-xs text-gray-500 mt-1">SMTP ID: {job.smtp_message_id}</p>
            )}
            {job.last_error && (
              <p className="text-xs text-red-500 mt-1">{job.last_error}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{job.attempt_count} attempt{job.attempt_count !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{value}</p>
    </div>
  );
}
