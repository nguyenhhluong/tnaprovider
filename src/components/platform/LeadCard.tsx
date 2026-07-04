import type { Lead } from "../../types/platform";
import { StatusBadge } from "./StatusBadge";
import { Flame, Building2, Phone, Mail, ArrowRight } from "lucide-react";

export function LeadCard({ lead, onStatusChange }: { lead: Lead; onStatusChange: (id: string, status: Lead["status"]) => void }) {
  const nextStatuses: Record<string, Lead["status"]> = {
    new: "contacted",
    contacted: "site_visit_booked",
    site_visit_booked: "quoted",
    quoted: "won",
  };

  return (
    <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{lead.name}</h4>
            {lead.temperature === "hot" && (
              <Flame className="w-4 h-4 text-red-500 fill-red-500" />
            )}
            {lead.temperature === "warm" && (
              <Flame className="w-4 h-4 text-orange-400" />
            )}
          </div>
          {lead.company && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {lead.company}
            </p>
          )}
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
        {lead.phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {lead.phone}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="w-3 h-3" />
            {lead.email}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-xs text-gray-400">Score: {lead.score}</span>
        {lead.nextAction && (
          <span className="text-xs text-brand-accent">{lead.nextAction}</span>
        )}
      </div>

      {lead.status !== "won" && lead.status !== "lost" && nextStatuses[lead.status] && (
        <button
          onClick={() => onStatusChange(lead.id, nextStatuses[lead.status])}
          className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent/5 transition-colors"
        >
          Move to {nextStatuses[lead.status].replace(/_/g, " ")}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}

      {lead.status === "lost" && (
        <button
          onClick={() => onStatusChange(lead.id, "new")}
          className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Reopen lead
        </button>
      )}
    </div>
  );
}
