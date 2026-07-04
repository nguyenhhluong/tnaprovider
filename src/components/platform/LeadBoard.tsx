import { useState, useEffect } from "react";
import type { Lead } from "../../types/platform";
import { LeadCard } from "./LeadCard";
import { Loader2, Search, X } from "lucide-react";

export function LeadBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/leads", { credentials: "include" });
      if (res.ok) setLeads(await res.json());
      else setError("Failed to load leads");
    } catch {
      setError("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.company?.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && l.status !== statusFilter) return false;
    return true;
  });

  const statuses = [...new Set(leads.map((l) => l.status).filter(Boolean))];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/platform/leads/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: status as any } : l)));
    } catch { /* ignore */ }
  };

  const clearFilters = () => { setSearchTerm(""); setStatusFilter(""); };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-accent" /></div>;
  if (error) return <p className="text-sm text-red-500 text-center py-8">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, company, email..." className="w-full h-10 pl-9 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent" />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        {(searchTerm || statusFilter) && (
          <button onClick={clearFilters} className="h-10 px-3 text-sm text-gray-500 hover:text-brand-accent transition-colors">Clear</button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{searchTerm || statusFilter ? "No leads match your filters." : "No leads yet."}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
