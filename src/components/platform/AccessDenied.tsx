import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
        <ShieldOff className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-3xl font-display font-bold text-brand-dark dark:text-white mb-3">
        Access Denied
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
        You don't have permission to access this page. If you believe this is a mistake, contact your administrator.
      </p>
      <Link
        to="/platform"
        className="px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent-hover transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
