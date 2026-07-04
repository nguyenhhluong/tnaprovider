import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";
import { forgotPassword } from "../utils/authApi";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-gray dark:bg-brand-darker">
      <SEO title="Forgot Password | TNA Provider Platform" description="Reset your password." canonical="https://tnaprovider.com.au/forgot-password" />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 md:p-10">
            {sent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-2">Check Your Email</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  If an account exists for that email, reset instructions will be sent.
                </p>
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-accent hover:underline font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-14 h-14 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-4">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white">Forgot Password</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                    Enter your email and we'll send you reset instructions.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Instructions"}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-accent hover:underline font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
