import { useState, useEffect } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { appPath } from "../../utils/host";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import { LoadingState } from "../../components/shared/LoadingState";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { inviteUser, disableUser, enableUser, changeUserRole, forcePasswordChange, resendInvite } from "../../utils/authApi";
import { UserPlus, AlertCircle, Users as UsersIcon, Loader2, Mail, Shield, Ban, CheckCircle2, RotateCcw, Send, DollarSign, X, Plus, Save } from "lucide-react";

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "active" | "invited" | "disabled";
  hourly_rate: number | null;
  must_change_password: number | boolean;
  created_at: string;
  updated_at?: string;
  last_login_at: string | null;
}

const ROLES = ["admin", "manager", "worker", "client"];
const isOwner = (role?: string) => role === "owner";

export function Users() {
  const navigate = useNavigate();
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "worker" });
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "worker", password: "", confirmPassword: "", hourlyRate: "", mustChangePassword: true });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Edit rate modal
  const [rateTarget, setRateTarget] = useState<PlatformUser | null>(null);
  const [rateValue, setRateValue] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState("");

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (createForm.password !== createForm.confirmPassword) { setCreateError("Passwords do not match"); return; }
    if (createForm.role !== "client" && !createForm.hourlyRate.trim()) { setCreateError("Hourly rate is required for this role"); return; }
    setCreateLoading(true);
    try {
      const body: any = {
        email: createForm.email,
        name: createForm.name,
        role: createForm.role,
        password: createForm.password,
        mustChangePassword: createForm.mustChangePassword,
      };
      if (createForm.role !== "client") body.hourlyRate = Number(createForm.hourlyRate);
      const res = await fetch("/api/platform/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Failed to create user"); return; }
      setShowCreate(false);
      setCreateForm({ name: "", email: "", role: "worker", password: "", confirmPassword: "", hourlyRate: "", mustChangePassword: true });
      setSuccess(`User created. Give the temporary password securely. They will be asked to change it on first login.`);
      fetchUsers();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreateLoading(false);
    }
  };

  const openRateModal = (u: PlatformUser) => {
    setRateTarget(u);
    setRateValue(u.hourly_rate ? String(u.hourly_rate) : "");
    setRateError("");
  };

  const handleSaveRate = async () => {
    if (!rateTarget) return;
    setRateError("");
    const rate = Number(rateValue);
    if (!rateValue.trim() || !Number.isFinite(rate) || rate <= 0 || rate > 300) { setRateError("Rate must be between 0.01 and 300"); return; }
    setRateLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${rateTarget.id}/hourly-rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourlyRate: rate }),
      });
      const data = await res.json();
      if (!res.ok) { setRateError(data.error || "Failed to update rate"); return; }
      setRateTarget(null);
      setSuccess("Hourly rate updated. New rate applies to future check-ins only.");
      fetchUsers();
    } catch {
      setRateError("Network error");
    } finally {
      setRateLoading(false);
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

  const rateDisplay = (u: PlatformUser) => {
    if (u.role === "client") return <span className="text-gray-400 text-xs">Client user</span>;
    if (u.hourly_rate) return <span className="font-medium">${Number(u.hourly_rate).toFixed(2)}/hr</span>;
    return <span className="text-amber-500 text-xs font-medium">Timesheet blocked until rate is set</span>;
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
        <PageHeader title="Users" description="Manage platform users, roles, and invites." onMenuClick={() => setSidebarOpen(true)} />
        <LoadingState message="Loading users..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO title="Users | TNA Provider Platform" description="User management." canonical="https://tnaprovider.com.au/platform/users" />
      <PageHeader title="Users" description="Manage platform users, roles, and invites. Click a name to view profile and timesheet." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInvite(!showInvite)}>
            <Mail className="w-4 h-4 mr-2" />
            Invite User
          </Button>
          {isOwner(currentUser?.role) && (
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Invite form */}
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

      {/* Create User form (owner only) */}
      {showCreate && isOwner(currentUser?.role) && (
        <div className="mb-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-6">Create New User</h2>
          {createError && <p className="text-sm text-red-500 mb-4">{createError}</p>}
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4 max-w-md">
            <input type="text" placeholder="Full Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <input type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full">
              {ROLES.filter(r => r !== "admin").map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            {createForm.role !== "client" && (
              <div>
                <input type="text" inputMode="decimal" placeholder="Hourly Rate ($)" value={createForm.hourlyRate} onChange={(e) => setCreateForm({ ...createForm, hourlyRate: e.target.value })} className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
                <p className="text-xs text-gray-400 mt-1">Rate applies to future check-ins</p>
              </div>
            )}
            <input type="password" placeholder="Temporary Password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <input type="password" placeholder="Confirm Password" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} required className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent focus:ring-brand-accent w-full" />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={createForm.mustChangePassword} onChange={(e) => setCreateForm({ ...createForm, mustChangePassword: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
              Require password change on first login
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={createLoading}>
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create User
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Rate Modal */}
      {rateTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white">Edit Hourly Rate</h3>
              <button onClick={() => setRateTarget(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee: <span className="font-semibold text-brand-dark dark:text-white">{rateTarget.name}</span></p>
              <p className="text-sm text-gray-500 mt-1">Current rate: <span className="font-medium">{rateTarget.hourly_rate ? `$${Number(rateTarget.hourly_rate).toFixed(2)}/hr` : "Not set"}</span></p>
            </div>
            {rateError && <p className="text-sm text-red-500">{rateError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">New hourly rate ($)</label>
              <input type="text" inputMode="decimal" value={rateValue} onChange={(e) => setRateValue(e.target.value)} className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent text-lg" />
              <p className="text-xs text-gray-400 mt-1">New rate applies to future check-ins only. Existing shifts keep the rate captured at check-in.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveRate} disabled={rateLoading} className="flex-1 py-3 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {rateLoading ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setRateTarget(null)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </div>
          </div>
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
                <Link to={appPath(`/platform/worker-profile/${u.id}`)} className="font-semibold text-brand-dark dark:text-white hover:text-brand-accent transition-colors">{u.name}</Link>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              {statusBadge(u.status)}
            </div>
            <div className="flex items-center gap-2 mb-2">
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
            <div className="text-sm mb-2 flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-gray-400" />
              {rateDisplay(u)}
            </div>
            <div className="flex flex-wrap gap-2">
              {u.status === "active" && u.role !== "client" && isOwner(currentUser?.role) && (
                <button onClick={() => openRateModal(u)} className="px-3 py-2 min-h-[36px] text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Edit Rate
                </button>
              )}
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
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hourly Rate</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <Link to={appPath(`/platform/worker-profile/${u.id}`)} className="text-sm font-semibold text-brand-dark dark:text-white hover:text-brand-accent transition-colors">{u.name}</Link>
                  </td>
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
                  <td className="px-6 py-4 text-sm">{rateDisplay(u)}</td>
                  <td className="px-6 py-4">{statusBadge(u.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status === "active" && u.role !== "client" && isOwner(currentUser?.role) && (
                        <button onClick={() => openRateModal(u)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Edit Hourly Rate">
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
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
