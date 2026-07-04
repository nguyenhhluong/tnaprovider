import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PlatformHeader } from "../../components/platform/PlatformHeader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { inviteUser, disableUser, enableUser, changeUserRole, forcePasswordChange, resendInvite } from "../../utils/authApi";
import { UserPlus, AlertCircle, Users as UsersIcon, Loader2, Mail, Shield, Ban, CheckCircle2, RotateCcw, Send } from "lucide-react";

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "active" | "invited" | "disabled";
  created_at: string;
  last_login_at: string | null;
}

const ROLES = ["admin", "manager", "worker", "client"];

export function Users() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "worker" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/platform/users");
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setError("Failed to load users");
      }
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    try {
      await inviteUser(inviteForm.email, inviteForm.name, inviteForm.role);
      setShowInvite(false);
      setInviteForm({ email: "", name: "", role: "worker" });
      fetchUsers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDisable = async (userId: string) => {
    setActionLoading(userId);
    try {
      await disableUser(userId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnable = async (userId: string) => {
    setActionLoading(userId);
    try {
      await enableUser(userId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      await changeUserRole(userId, role);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleForcePasswordChange = async (userId: string) => {
    setActionLoading(userId);
    try {
      await forcePasswordChange(userId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger password change");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      await resendInvite(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
      invited: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
      disabled: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-500"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PlatformHeader title="Users" onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO title="Users | TNA Provider Platform" description="User management." canonical="https://tnaprovider.com.au/platform/users" />
      <PlatformHeader title="Users" onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-1">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {showInvite && (
        <div className="mb-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-6">Invite New User</h2>
          {inviteError && <p className="text-sm text-red-500 mb-4">{inviteError}</p>}
          <form onSubmit={handleInvite} className="flex flex-col gap-4 max-w-md">
            <input type="text" placeholder="Full Name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <input type="email" placeholder="Email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <div className="flex gap-3">
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Invitation
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <UsersIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No users yet.</p>
          </div>
        )}
        {users.map((u) => (
          <div key={u.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-brand-dark dark:text-white">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              {statusBadge(u.status)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                disabled={actionLoading === u.id}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <span className="text-xs text-gray-400">
                {u.last_login_at ? `Last login: ${new Date(u.last_login_at).toLocaleDateString()}` : "Never logged in"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {u.status === "active" && (
                <button onClick={() => handleDisable(u.id)} disabled={actionLoading === u.id} className="px-3 py-2 min-h-[36px] text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Disable
                </button>
              )}
              {u.status === "disabled" && (
                <button onClick={() => handleEnable(u.id)} disabled={actionLoading === u.id} className="px-3 py-2 min-h-[36px] text-xs border border-green-200 dark:border-green-800 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Enable
                </button>
              )}
              {u.status === "invited" && (
<button onClick={() => handleResendInvite(u.id, u.email)} disabled={actionLoading === u.id} className="px-3 py-2 min-h-[36px] text-xs border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Resend Invite
                        </button>
                      )}
                      {u.status === "active" && u.id !== currentUser?.id && (
                        <button onClick={() => handleForcePasswordChange(u.id)} disabled={actionLoading === u.id} className="px-3 py-2 min-h-[36px] text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Force Reset
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto self-center">Joined {new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4 text-sm font-semibold text-brand-dark dark:text-white">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={actionLoading === u.id}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-accent font-semibold"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">{statusBadge(u.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status === "active" && u.id !== currentUser?.id && (
                        <button onClick={() => handleDisable(u.id)} disabled={actionLoading === u.id} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Disable">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {u.status === "disabled" && (
                        <button onClick={() => handleEnable(u.id)} disabled={actionLoading === u.id} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Enable">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {u.status === "invited" && (
                        <button onClick={() => handleResendInvite(u.id, u.email)} disabled={actionLoading === u.id} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Resend Invite">
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                      {u.status === "active" && u.id !== currentUser?.id && (
                        <button onClick={() => handleForcePasswordChange(u.id)} disabled={actionLoading === u.id} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Force Password Change">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
