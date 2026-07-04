import { useAuth } from "../../context/AuthContext";
import { SEO } from "../../components/SEO";
import { User, Mail, Shield, Calendar } from "lucide-react";

export function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="p-8 max-w-2xl">
      <SEO title="Profile | TNA Provider Platform" description="Your profile." canonical="https://tnaprovider.com.au/platform/profile" />
      <h1 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-8">
        Profile
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-brand-dark dark:text-white">{user.name}</h2>
            <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Email</p>
              <p className="text-sm text-brand-dark dark:text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Role</p>
              <p className="text-sm text-brand-dark dark:text-white capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={logout}
            className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
