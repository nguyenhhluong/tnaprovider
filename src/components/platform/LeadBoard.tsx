import { useState } from "react";
import type { Lead, LeadSource, LeadTemperature } from "../../types/platform";
import { mockLeads } from "../../data/platformMock";
import { LeadCard } from "./LeadCard";
import { Search } from "lucide-react";

export function LeadBoard() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [tempFilter, setTempFilter] = useState<LeadTemperature | "all">("all");

  const handleStatusChange = (id: string, status: Lead["status"]) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l)));
  };

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (lead.phone || "").includes(search);

    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    const matchesTemp = tempFilter === "all" || lead.temperature === tempFilter;

    return matchesSearch && matchesSource && matchesTemp;
  });

  const sources: LeadSource[] = ["website", "referral", "phone", "social_media", "walk_in"];
  const temperatures: LeadTemperature[] = ["hot", "warm", "cold"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LeadSource | "all")}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
        >
          <option value="all">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={tempFilter}
          onChange={(e) => setTempFilter(e.target.value as LeadTemperature | "all")}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-darker text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
        >
          <option value="all">All Temperatures</option>
          {temperatures.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No leads found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
