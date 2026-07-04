import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { SEO } from "../../components/SEO";
import { changePassword } from "../../utils/authApi";
import { Button } from "../../components/ui/Button";
import { User, Mail, Shield, Calendar, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function passwordStrength(password: string): { label: string; color: string; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", color: "bg-red-500", score };
  if (score <= 4) return { label: "Fair", color: "bg-amber-500", score };
  return { label: "Strong", color: "bg-green-500", score };
}

export function Profile() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const strength = passwordStrength(newPassword);

  if (!user) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <SEO title="Profile | TNA Provider Platform" description="Your profile." canonical="https://tnaprovider.com.au/platform/profile" />
      <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-8">Profile</h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
            <User className="w-8 h-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-display font-bold text-brand-dark dark:text-white truncate">{user.name}</h2>
            <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full capitalize">{user.role}</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
              <p className="text-sm text-brand-dark dark:text-white break-all">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Role</p>
              <p className="text-sm text-brand-dark dark:text-white capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
          <h3 className="text-lg font-display font-bold text-brand-dark dark:text-white mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-accent" />
            Change Password
          </h3>

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">Password changed successfully.</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="h-12 pl-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full" />
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
            <Button type="submit" disabled={loading} className="self-start min-h-[44px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </div>

        {/* Sign out */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button onClick={logout} className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors min-h-[44px]">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
