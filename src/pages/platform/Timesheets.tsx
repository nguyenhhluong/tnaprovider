import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Timesheets() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role === "worker") navigate("/realtime-timesheet", { replace: true });
    else navigate("/admin-realtime-timesheets", { replace: true });
  }, [user, navigate]);

  return null;
}
