import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { MaintenanceTicketList } from "../../components/platform/MaintenanceTicketList";
import { Plus, Loader2 } from "lucide-react";

export function Maintenance() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/platform/maintenance", { credentials: "include" });
      if (res.ok) setTickets(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  return (
    <>
      <PlatformHeader title="Maintenance" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-accent" /></div>
        ) : (
          <>
            <div className="flex justify-end">
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors">
                <Plus className="w-4 h-4" /> New Ticket
              </button>
            </div>
            {showForm && <p className="text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">Ticket creation form coming soon.</p>}
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No maintenance tickets yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-brand-dark dark:text-white">{t.title}</h3>
                        <p className="text-sm text-gray-500">{t.description || ''}</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full capitalize bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
