import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext, useNavigate } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader, EmptyState, LoadingState, ErrorState } from "../../components/shared";
import { Search, Filter, ChevronDown, ChevronUp, Mail, Phone, Calendar, Archive, RotateCcw, MessageSquare, User, Clock, AlertCircle, CheckCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

interface QuoteRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  service: string;
  location: string;
  budget: string | null;
  target_date: string | null;
  message: string;
  request_callback: number;
  callback_time: string | null;
  privacy_consent: number;
  source: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  last_contacted_at: string | null;
  archived_at: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = { new: "New", contacted: "Contacted", quoted: "Quoted", won: "Won", lost: "Lost", archived: "Archived" };
const PRIORITY_LABELS: Record<string, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const STATUS_COLORS: Record<string, string> = { new: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", contacted: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", quoted: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", won: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", lost: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
const PRIORITY_COLORS: Record<string, string> = { low: "text-gray-400", normal: "text-blue-500", high: "text-amber-500", urgent: "text-red-500" };

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function QuoteRequests() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<{ requests: QuoteRequest[]; total: number; summary: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") || "");
  const [page, setPage] = useState(0);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      const res = await fetch(`/api/platform/quote-requests?${params}`, { credentials: "same-origin" });
      if (res.status === 401) { setError("Your session expired. Please log in again."); return; }
      if (res.status === 403) { setError("You do not have permission to view quote requests."); return; }
      if (res.status === 404) { setError("Quote request API is not deployed."); return; }
      if (res.status >= 500) { setError("Server error loading quote requests."); return; }
      if (!res.ok) { setError("Failed to load quote requests."); return; }
      let d;
      try { d = await res.json(); } catch { setError("Could not reach the server. Please refresh or check connection."); return; }
      setData(d);
    } catch { setError("Could not reach the server. Please refresh or check connection."); }
    finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter]);

  const summaryCards = ["new", "contacted", "quoted", "won", "lost"].map((s) => ({
    label: STATUS_LABELS[s] || s,
    count: data?.summary?.[s] ?? ((statusFilter === s) ? data?.requests?.filter((r) => r.status === s).length : 0),
    status: s,
    color: STATUS_COLORS[s]?.split(" ")[0] || "bg-gray-100",
  }));

  const handleSelect = (r: QuoteRequest) => {
    setSelected(r);
    setNotesText(r.internal_notes || "");
    setEditingNotes(false);
    setDetailOpen(true);
  };

  const handleUpdate = async (id: string, updates: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/quote-requests/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates), credentials: "same-origin",
      });
      if (!res.ok) return;
      await fetchData();
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, ...updates } : prev);
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    setSaving(true);
    try {
      await fetch(`/api/platform/quote-requests/${id}/archive`, { method: "POST", credentials: "same-origin" });
      await fetchData();
      setSelected(null); setDetailOpen(false);
    } finally { setSaving(false); }
  };

  const handleRestore = async (id: string) => {
    setSaving(true);
    try {
      await fetch(`/api/platform/quote-requests/${id}/restore`, { method: "POST", credentials: "same-origin" });
      await fetchData();
      if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: "new", archived_at: null } : prev);
    } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    await handleUpdate(selected.id, { internal_notes: notesText });
    setEditingNotes(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <SEO title="Quote Requests | TNA Provider" description="Manage customer enquiries from the website contact form" canonical="https://app.tnaprovider.com.au/quote-requests" />
      <PageHeader title="Quote Requests" description="Manage customer enquiries from the website contact form" onMenuClick={() => setSidebarOpen(true)} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summaryCards.map((card) => (
          <button
            key={card.status}
            onClick={() => { setStatusFilter(card.status); setPage(0); }}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors hover:shadow-sm",
              statusFilter === card.status ? "border-brand-accent bg-brand-accent/5" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            )}
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className={cn("text-2xl font-bold mt-1", STATUS_COLORS[card.status]?.split(" ")[0] === "bg-blue-100" ? "text-blue-600" : STATUS_COLORS[card.status]?.split(" ")[0] === "bg-amber-100" ? "text-amber-600" : STATUS_COLORS[card.status]?.split(" ")[0] === "bg-purple-100" ? "text-purple-600" : STATUS_COLORS[card.status]?.split(" ")[0] === "bg-green-100" ? "text-green-600" : STATUS_COLORS[card.status]?.split(" ")[0] === "bg-red-100" ? "text-red-600" : "text-gray-600")}>{card.count ?? "-"}</p>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search name, email, phone, service..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }} className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900">
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(search || statusFilter || priorityFilter) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setPage(0); }} className="text-sm text-brand-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Main content */}
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchData} /> : !data || data.requests.length === 0 ? (
        <EmptyState title="No quote requests yet" message="New requests from tnaprovider.com.au/contact will appear here." />
      ) : (
        <div className="space-y-4">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3" data-testid="quote-request-mobile-list">
            {data.requests.map((r) => (
              <div
                key={r.id}
                data-testid={`quote-request-card-${r.id}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(r)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(r); } }}
                aria-label={`Open quote request from ${r.first_name} ${r.last_name}`}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-semibold text-sm truncate">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{r.email}</p>
                  </div>
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status] || r.status}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="truncate">{r.service}</span>
                  {r.location && <><span>·</span><span className="truncate">{r.location}</span></>}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-brand-accent hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />Email</a>
                    <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-brand-accent flex items-center gap-1"><Phone className="w-3 h-3" />Call</a>
                  </div>
                  <span className="text-gray-400">{fmtDateShort(r.received_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden md:table-cell">Service</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden lg:table-cell">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden lg:table-cell">Target</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden sm:table-cell">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.map((r) => (
                    <tr key={r.id} onClick={() => handleSelect(r)} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium">{r.first_name} {r.last_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-brand-accent hover:underline text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</a>
                          <a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-brand-accent text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell max-w-[150px] truncate">{r.service}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell max-w-[120px] truncate">{r.location}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{r.target_date ? new Date(r.target_date).toLocaleDateString("en-AU") : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status] || r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{fmtDateShort(r.received_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data.total > pageSize && (
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{data.total} total</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded-lg disabled:opacity-30">Previous</button>
                <button disabled={(page + 1) * pageSize >= data.total} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded-lg disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{selected.first_name} {selected.last_name}</h2>
              <button onClick={() => setDetailOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><ChevronDown className="w-5 h-5" /></button>
            </div>

            {/* Status & Priority */}
            <div className="flex gap-2 flex-wrap">
              <select value={selected.status} onChange={(e) => handleUpdate(selected.id, { status: e.target.value })} disabled={saving} className="px-2 py-1 border rounded-lg text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={selected.priority} onChange={(e) => handleUpdate(selected.id, { priority: e.target.value })} disabled={saving} className="px-2 py-1 border rounded-lg text-sm">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {selected.status === "archived" ? (
                <button onClick={() => handleRestore(selected.id)} disabled={saving} className="px-3 py-1 border border-green-200 text-green-600 rounded-lg text-sm hover:bg-green-50"><RotateCcw className="w-3 h-3 inline mr-1" />Restore</button>
              ) : (
                <button onClick={() => handleArchive(selected.id)} disabled={saving} className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><Archive className="w-3 h-3 inline mr-1" />Archive</button>
              )}
            </div>

            {/* Contact details */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${selected.email}`} className="text-brand-accent hover:underline">{selected.email}</a></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><a href={`tel:${selected.phone}`} className="text-brand-accent hover:underline">{selected.phone}</a></div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><span>Received {fmtDate(selected.received_at)}</span></div>
              {selected.target_date && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span>Target: {new Date(selected.target_date).toLocaleDateString("en-AU")}</span></div>}
              {selected.assigned_to_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span>Assigned to {selected.assigned_to_name}</span></div>}
            </div>

            {/* Service details */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="font-medium">{selected.service}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="font-medium">{selected.location}</span></div>
              {selected.budget && <div className="flex justify-between"><span className="text-gray-400">Budget</span><span className="font-medium">{selected.budget}</span></div>}
              {selected.request_callback ? 1 : 0 ? <div className="flex justify-between"><span className="text-gray-400">Callback</span><span className="font-medium">{selected.callback_time || "Requested"}</span></div> : null}
            </div>

            {/* Message */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" />Message</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">{selected.message}</p>
            </div>

            {/* Internal notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Internal Notes</h3>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={4} className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-gray-800" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveNotes} disabled={saving} className="px-3 py-1 bg-brand-accent text-white rounded-lg text-sm">Save</button>
                    <button onClick={() => setEditingNotes(false)} className="px-3 py-1 border rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditingNotes(true)} className="cursor-pointer bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-500 min-h-[3rem]">
                  {selected.internal_notes || "Click to add notes..."}
                </div>
              )}
            </div>

            {/* Email Delivery Status */}
            <EmailDeliveryStatus entityType="contact_request" entityId={selected.id} />

            {/* Create quote from request */}
            <button onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/quotes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    client_name: `${selected.first_name} ${selected.last_name}`,
                    client_email: selected.email,
                    client_phone: selected.phone,
                    project_name: selected.service,
                    project_location: selected.location,
                    scope: selected.message,
                  }),
                  credentials: "same-origin",
                });
                if (res.ok) {
                  const quote = await res.json();
                  handleUpdate(selected.id, { status: "quoted" });
                  setDetailOpen(false);
                  navigate(`/quotes?tab=builder&quoteId=${quote.id || ""}`, { replace: false });
                }
              } finally { setSaving(false); }
            }} disabled={saving} className="w-full py-2 border border-green-500 text-green-600 rounded-xl text-sm font-medium hover:bg-green-50">
              Create Quote From Request
            </button>

            {/* Mark contacted */}
            <button onClick={() => handleUpdate(selected.id, { status: "contacted", last_contacted_at: new Date().toISOString() })} disabled={saving} className="w-full py-2 border border-brand-accent text-brand-accent rounded-xl text-sm font-medium hover:bg-brand-accent/5">
              Mark as Contacted
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailDeliveryStatus({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, any> | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  const fetchDeliveryStatus = useCallback(async () => {
    setLoadingDelivery(true);
    try {
      const res = await fetch(`/api/admin/email-delivery-status/${entityType}/${entityId}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setDeliveryStatus(d.data);
      }
    } catch {}
    finally { setLoadingDelivery(false); }
  }, [entityType, entityId]);

  useEffect(() => { fetchDeliveryStatus(); }, [fetchDeliveryStatus]);

  if (loadingDelivery) return null;
  if (!deliveryStatus || Object.keys(deliveryStatus).length === 0) return null;

  const statusColors: Record<string, string> = {
    SENT: "text-green-600 bg-green-50 dark:bg-green-900/20",
    FAILED: "text-red-600 bg-red-50 dark:bg-red-900/20",
    PENDING: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1"><Mail className="w-4 h-4" />Email Delivery</h3>
      <div className="space-y-2">
        {Object.entries(deliveryStatus).map(([type, job]: [string, any]) => {
          const labels: Record<string, string> = {
            QUOTE_RECEIVED_CUSTOMER: "Customer Confirmation",
            QUOTE_RECEIVED_ADMIN: "Admin Notification",
          };
          return (
            <div key={type} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{labels[type] || type}</span>
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusColors[job.status] || "text-gray-500 bg-gray-100")}>
                  {job.status === "SENT" && <CheckCircle className="w-3 h-3" />}
                  {job.status === "FAILED" && <AlertCircle className="w-3 h-3" />}
                  {job.status === "PENDING" && <Clock className="w-3 h-3" />}
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{job.recipient}</p>
              {job.sentAt && <p className="text-xs text-gray-400 mt-0.5">Sent: {fmtDate(job.sentAt)}</p>}
              {job.lastError && <p className="text-xs text-red-500 mt-0.5">{job.lastError}</p>}
              <div className="flex gap-2 mt-1">
                <a href={`/platform/email-center/${job.id}`} className="text-xs text-brand-accent hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
