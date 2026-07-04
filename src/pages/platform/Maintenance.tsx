import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { MaintenanceTicketForm } from "../../components/platform/MaintenanceTicketForm";
import { MaintenanceTicketList } from "../../components/platform/MaintenanceTicketList";
import { mockMaintenanceTickets, mockProjects } from "../../data/platformMock";
import type { MaintenanceTicket } from "../../types/maintenance";
import { Plus } from "lucide-react";

export function Maintenance() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(mockMaintenanceTickets);
  const [showForm, setShowForm] = useState(false);

  const handleAddTicket = (ticket: MaintenanceTicket) => {
    setTickets((prev) => [ticket, ...prev]);
    setShowForm(false);
  };

  const handleUpdateStatus = (id: string, status: MaintenanceTicket["status"]) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
      )
    );
  };

  return (
    <>
      <PlatformHeader title="Maintenance Tickets" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "New Ticket"}
        </button>

        {showForm && (
          <MaintenanceTicketForm projects={mockProjects} onSubmit={handleAddTicket} />
        )}

        <MaintenanceTicketList tickets={tickets} onUpdateStatus={handleUpdateStatus} />
      </div>
    </>
  );
}
