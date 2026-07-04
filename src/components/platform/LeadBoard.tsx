import { useState, useEffect } from "react";
import type { Lead } from "../../types/platform";
import { LeadCard } from "./LeadCard";
import { Loader2 } from "lucide-react";

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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-accent" /></div>;
  if (error) return <p className="text-sm text-red-500 text-center py-8">{error}</p>;

  if (filtered.length === 0) {
    return <div><p className="text-sm text-gray-400 text-center py-8">{searchTerm || statusFilter ? "No leads match your filters." : "No leads yet."}</p></div>;
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/platform/leads/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: status as any } : l)));
    } catch { /* ignore */ }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((lead) => (
        <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
      ))}
    </div>
  );
}
