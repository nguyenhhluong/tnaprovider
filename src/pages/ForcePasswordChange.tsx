import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../utils/authApi";
import { Shield, Loader2, Eye, EyeOff, CheckCircle2, LogOut } from "lucide-react";

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

export function ForcePasswordChange() {
  const { logout, checkAuth } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const strength = passwordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      await checkAuth();
      setTimeout(() => navigate("/platform", { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-brand-darker">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 md:p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-2">Password Updated</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to the platform...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-brand-darker">
      <SEO title="Change Password | TNA Provider Platform" description="Change your password." canonical="https://tnaprovider.com.au/force-password-change" />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 md:p-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 mb-4">
                <Shield className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white">Change Your Password</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                Your administrator requires you to update your password before continuing.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 10 characters"
                    required
                    minLength={10}
                    className="h-12 pl-4 pr-12 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= Math.ceil(strength.score / 2) ? strength.color : "bg-gray-200 dark:bg-gray-700"}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${strength.score <= 2 ? "text-red-500" : strength.score <= 4 ? "text-amber-500" : "text-green-500"}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <button onClick={logout} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
                Sign out instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
