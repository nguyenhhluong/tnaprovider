import { useState, useEffect } from "react";
import { SEO } from "../../components/SEO";
import { Shield, AlertCircle } from "lucide-react";

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

export function Audit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/platform/audit");
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
    fetchLogs();
  }, []);

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <SEO title="Audit Log | TNA Provider Platform" description="Platform audit log." canonical="https://tnaprovider.com.au/platform/audit" />
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-brand-accent" />
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-1">
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {logs.length} entries (last 500)
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No audit log entries yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-brand-dark dark:text-white">
                    {log.user_name || "System"}
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full">
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400 dark:text-gray-500 font-mono">
                    {log.ip_address || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
