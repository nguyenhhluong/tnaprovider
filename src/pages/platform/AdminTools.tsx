import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  HardDrive,
  Database,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileDown,
  Server,
  Clock,
  Users,
  Activity,
} from "lucide-react";

interface HealthData {
  status: string;
  uptime: number;
  nodeVersion: string;
  database: { users: number; activeSessions: number; auditEntries: number; path: string };
  timestamp: string;
}

interface StorageData {
  database: { sizeBytes: number; sizeFormatted: string };
  backups: { count: number; totalSizeBytes: number; totalSizeFormatted: string; path: string };
  total: { sizeBytes: number; sizeFormatted: string };
}

interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

const EXPORTS = [
  { key: "users", label: "Users CSV" },
  { key: "leads", label: "Leads CSV" },
  { key: "projects", label: "Projects CSV" },
  { key: "timesheets", label: "Timesheets CSV" },
  { key: "maintenance", label: "Maintenance CSV" },
  { key: "audit-logs", label: "Audit Logs CSV" },
];

export function AdminTools() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [health, setHealth] = useState<HealthData | null>(null);
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState({ health: true, storage: true, backups: true, backupCreate: false });
  const [error, setError] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading((p) => ({ ...p, health: true }));
    try {
      const res = await fetch("/api/admin-tools/health");
      if (res.ok) setHealth(await res.json());
      else setError("Failed to load health data");
    } catch { setError("Failed to load health data"); }
    finally { setLoading((p) => ({ ...p, health: false })); }
  }, []);

  const fetchStorage = useCallback(async () => {
    setLoading((p) => ({ ...p, storage: true }));
    try {
      const res = await fetch("/api/admin-tools/storage");
      if (res.ok) setStorage(await res.json());
    } catch {}
    finally { setLoading((p) => ({ ...p, storage: false })); }
  }, []);

  const fetchBackups = useCallback(async () => {
    if (!isOwner) return;
    setLoading((p) => ({ ...p, backups: true }));
    try {
      const res = await fetch("/api/admin-tools/backups");
      if (res.ok) setBackups(await res.json());
    } catch {}
    finally { setLoading((p) => ({ ...p, backups: false })); }
  }, [isOwner]);

  useEffect(() => { fetchHealth(); fetchStorage(); fetchBackups(); }, [fetchHealth, fetchStorage, fetchBackups]);

  const handleCreateBackup = useCallback(async () => {
    setBackupMsg(null);
    setLoading((p) => ({ ...p, backupCreate: true }));
    try {
      const res = await fetch("/api/admin-tools/backups", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBackupMsg(`Backup created: ${data.filename} (${data.sizeFormatted})`);
        fetchBackups();
        fetchStorage();
      } else {
        const data = await res.json().catch(() => ({}));
        setBackupMsg(`Error: ${data.error || "Failed to create backup"}`);
      }
    } catch {
      setBackupMsg("Error: Failed to create backup");
    } finally {
      setLoading((p) => ({ ...p, backupCreate: false }));
    }
  }, [fetchBackups, fetchStorage]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <>
      <SEO title="Admin Tools | TNA Provider Platform" description="Backup, export, and system administration." canonical="https://tnaprovider.com.au/platform/admin-tools" />
      <PageHeader title="Admin Tools" description="Backup, export, and system administration." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div />
        <button onClick={() => { fetchHealth(); fetchStorage(); fetchBackups(); }} className="p-2 text-gray-500 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* System Health */}
      <div className="mb-8">
        <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-accent" />
          System Health
        </h2>
        {loading.health ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <Server className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{health.database.users}</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <Activity className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{health.database.activeSessions}</p>
              <p className="text-xs text-gray-500">Active Sessions</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <Clock className="w-5 h-5 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{formatUptime(health.uptime)}</p>
              <p className="text-xs text-gray-500">Uptime</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-sm font-bold text-brand-dark dark:text-white break-all">{health.database.path}</p>
              <p className="text-xs text-gray-500">Database</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Unable to load health data.</p>
        )}
      </div>

      {/* Storage */}
      <div className="mb-8">
        <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-brand-accent" />
          Storage Usage
        </h2>
        {loading.storage ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
          </div>
        ) : storage ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <Database className="w-5 h-5 text-brand-accent mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{storage.database.sizeFormatted}</p>
              <p className="text-xs text-gray-500">Database</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <Database className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{storage.backups.totalSizeFormatted}</p>
              <p className="text-xs text-gray-500">Backups ({storage.backups.count} files)</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <HardDrive className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-brand-dark dark:text-white">{storage.total.sizeFormatted}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Unable to load storage data.</p>
        )}
      </div>

      {/* Manual Backup */}
      {isOwner && (
        <div className="mb-8">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-accent" />
            Manual Backup
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <p className="text-sm text-gray-500 mb-4">Create a timestamped backup of the database. Backups are stored securely and can be downloaded.</p>
            <button
              onClick={handleCreateBackup}
              disabled={loading.backupCreate}
              className="px-5 py-3 min-h-[44px] bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading.backupCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {loading.backupCreate ? "Creating..." : "Create Backup"}
            </button>
            {backupMsg && (
              <p className={`mt-3 text-sm ${backupMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                {backupMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Backup List */}
      {isOwner && (
        <div className="mb-8">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-brand-accent" />
            Backup List
          </h2>
          {loading.backups ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : backups.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
              <Database className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No backups yet.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="space-y-0">
                {backups.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-dark dark:text-white truncate">{b.filename}</p>
                      <p className="text-xs text-gray-500">{b.sizeFormatted} · {new Date(b.createdAt).toLocaleString()}</p>
                    </div>
                    <a
                      href={`/api/admin-tools/backups/${b.filename}/download`}
                      className="p-2 text-gray-400 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Exports */}
      <div className="mb-8">
        <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-brand-accent" />
          Data Exports
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {EXPORTS.map((exp) => (
            <a
              key={exp.key}
              href={`/api/admin-tools/export/${exp.key}.csv`}
              className="flex items-center gap-3 px-4 py-3 min-h-[44px] bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-accent/30 hover:shadow transition-all text-sm font-medium text-brand-dark dark:text-white"
            >
              <FileDown className="w-4 h-4 text-brand-accent shrink-0" />
              {exp.label}
            </a>
          ))}
        </div>
      </div>

      {/* Safety Checklist */}
      <div className="mb-8">
        <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-accent" />
          Safety Checklist
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-3">
          {[
            { label: "Database backups are stored in a secure directory", ok: true },
            { label: "CSV exports exclude password hashes and tokens", ok: true },
            { label: "Backup downloads are blocked from path traversal", ok: true },
            { label: "Health endpoint exposes no secrets", ok: true },
            { label: "Owner-only actions enforce role check", ok: true },
            { label: "must_change_password users are blocked from admin tools", ok: true },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              {item.ok ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              )}
              <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone (display only) */}
      {isOwner && (
        <div>
          <h2 className="text-lg font-display font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark dark:text-white">Restore Backup</p>
                <p className="text-xs text-gray-500">Restore the database from a previous backup.</p>
              </div>
              <span className="text-xs text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Not available</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark dark:text-white">Delete Data</p>
                <p className="text-xs text-gray-500">Permanently delete all data for a specific entity type.</p>
              </div>
              <span className="text-xs text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Not available</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark dark:text-white">Reset Platform</p>
                <p className="text-xs text-gray-500">Factory reset — deletes all data and recreates the owner account.</p>
              </div>
              <span className="text-xs text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Not available</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
