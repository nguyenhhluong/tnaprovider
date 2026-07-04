import type { MaintenanceTicket } from "../../types/maintenance";
import { StatusBadge } from "./StatusBadge";
import { AlertTriangle } from "lucide-react";

interface MaintenanceTicketListProps {
  tickets: MaintenanceTicket[];
  onUpdateStatus: (id: string, status: MaintenanceTicket["status"]) => void;
}

const nextStatus: Record<string, MaintenanceTicket["status"]> = {
  new: "reviewing",
  reviewing: "scheduled",
  scheduled: "completed",
  completed: "closed",
};

export function MaintenanceTicketList({ tickets, onUpdateStatus }: MaintenanceTicketListProps) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No maintenance tickets found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const isPastDue = new Date(ticket.dueDate) < new Date() && ticket.status !== "completed" && ticket.status !== "closed";

        return (
          <div key={ticket.id} className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{ticket.clientName}</h4>
                {isPastDue && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{ticket.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
              <span>Project: {ticket.projectName}</span>
              <span>Category: {ticket.category}</span>
              <span>Due: {new Date(ticket.dueDate).toLocaleDateString("en-AU")}</span>
              {ticket.assignedTo && <span>Assigned: {ticket.assignedTo}</span>}
              {isPastDue && (
                <span className="text-red-500 font-medium">Past due date</span>
              )}
            </div>

            {ticket.status !== "closed" && nextStatus[ticket.status] && (
              <button
                onClick={() => onUpdateStatus(ticket.id, nextStatus[ticket.status])}
                className="text-xs px-3 py-1.5 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors"
              >
                Move to {nextStatus[ticket.status]}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
