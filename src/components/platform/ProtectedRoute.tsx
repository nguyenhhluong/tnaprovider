import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AccessDenied } from "./AccessDenied";

interface Props {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-brand-darker">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // QR routes need /login?redirect=/qr/... so the login page can redirect back
    if (location.pathname.startsWith("/qr/") || location.pathname.startsWith("/platform/qr/")) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force password change redirect
  if (mustChangePassword && location.pathname !== "/force-password-change") {
    return <Navigate to="/force-password-change" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
