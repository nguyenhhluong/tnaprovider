import { useState, useEffect } from "react";
import { SEO } from "../../components/SEO";
import { useAuth } from "../../context/AuthContext";
import { getSessions, revokeSession, revokeAllSessions, changePassword } from "../../utils/authApi";
import { Button } from "../../components/ui/Button";
import { Shield, Smartphone, Monitor, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";

function passwordStrength(password: string): { label: string; color: string; score: number } {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", color: "bg-red-500", score };
  if (score <= 4) return { label: "Fair", color: "bg-amber-500", score };
  return { label: "Strong", color: "bg-green-500", score };
}

function validatePassword(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

export function Security() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<{ id: string; createdAt: string; ipAddress?: string; userAgent?: string; isCurrent?: boolean; status?: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const strength = passwordStrength(newPassword);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("This will sign you out of all other devices. Continue?")) return;
    setSessionsLoading(true);
    try {
      await revokeAllSessions();
      await fetchSessions();
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    const pwErr = validatePassword(newPassword);
    if (pwErr) { setPasswordError(pwErr); return; }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatUA = (ua: string) => {
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) return "Mobile";
    if (ua.includes("Mac") || ua.includes("Windows") || ua.includes("Linux")) return "Desktop";
    return ua.slice(0, 40);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <SEO title="Security | TNA Provider Platform" description="Account security." canonical="https://tnaprovider.com.au/platform/security" />
      <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-2">Security</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Manage your account security and active sessions.</p>

      {/* Security Status Summary */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-accent" />
            Security Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600">{sessions.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active Sessions</p>
            </div>
            <div className="bg-brand-accent/5 rounded-xl p-4">
              <p className="text-2xl font-bold text-brand-accent">{user?.role}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account Role</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-600">{passwordSuccess ? "Good" : "Pending"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Password Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-brand-accent" />
              Active Sessions
            </h2>
            {sessions.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleRevokeAll} disabled={sessionsLoading}>
                <Trash2 className="w-4 h-4 mr-1" />
                Revoke Others
              </Button>
            )}
          </div>

          {sessionsError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{sessionsError}</p>
            </div>
          )}

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className={`flex items-center justify-between p-4 rounded-xl border ${session.isCurrent ? "border-brand-accent/30 bg-brand-accent/5" : "border-gray-100 dark:border-gray-800"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      {session.userAgent?.includes("Mobile") || session.userAgent?.includes("iPhone") || session.userAgent?.includes("Android") ? (
                        <Smartphone className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Monitor className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-dark dark:text-white truncate">
                        {session.userAgent ? formatUA(session.userAgent) : session.status ? `Session (${session.status})` : "Device"}
                        {session.isCurrent && <span className="ml-2 text-xs text-brand-accent font-normal">(current)</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {session.ipAddress || "Unknown IP"} · {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {session.isCurrent !== true && (
                    <button
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokingId === session.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    >
                      {revokingId === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-accent" />
            Change Password
          </h2>

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">Password changed successfully.</p>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Password</label>
              <div className="relative mt-1">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={10} className="h-12 pl-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i <= Math.ceil(strength.score / 2) ? strength.color : "bg-gray-200 dark:bg-gray-700"}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-amber-500" : "text-green-500"}`}>{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full" />
            </div>
            <Button type="submit" disabled={passwordLoading} className="self-start min-h-[44px]">
              {passwordLoading ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
