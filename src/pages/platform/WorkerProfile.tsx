import { useState, useEffect } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { PageHeader } from "../../components/shared/PageHeader";
import { LoadingState } from "../../components/shared/LoadingState";
import { ErrorState } from "../../components/shared/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../utils/host";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, DollarSign, Clock, User, Mail, Shield, Calendar, Save, X, AlertCircle, CheckCircle2, XCircle, Eye, ExternalLink } from "lucide-react";

interface WorkerData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  hourlyRate: number | null;
  mustChangePassword?: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface DayRow {
  day: string;
  date: string;
  shiftId: string | null;
  start: string;
  end: string;
  paidSeconds: number;
  paidLabel: string;
  pay: number;
  payLabel: string;
  status: string;
  hasShift: boolean;
  shiftCount?: number;
}

interface WeekData {
  worker: WorkerData;
  week: { start: string; end: string; label: string };
  days: DayRow[];
  totals: { paidSeconds: number; paidLabel: string; pay: number; payLabel: string };
}

export function WorkerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === "owner";

  const [profile, setProfile] = useState<WorkerData | null>(null);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [rateValue, setRateValue] = useState("");
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSuccess, setRateSuccess] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  // Shift detail modal
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [shiftDetail, setShiftDetail] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Timesheet history dropdown
  const [showHistory, setShowHistory] = useState(false);
  const [historyWeeks, setHistoryWeeks] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Manual shift / adjustment
  const [showManualShift, setShowManualShift] = useState(false);
  const [manualForm, setManualForm] = useState({ date: "", startTime: "", endTime: "", breakDuration: "0", siteId: "", reason: "" });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getWeekStart = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    return getMonday(d).toISOString().split("T")[0];
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/platform/users/${userId}/profile`);
      if (!res.ok) { setError("Failed to load profile"); return; }
      const data = await res.json();
      setProfile(data.worker);
      setRateValue(data.worker.hourlyRate ? String(data.worker.hourlyRate) : "");
    } catch { setError("Network error"); }
  };

  const fetchWeek = async (offset: number) => {
    const ws = getWeekStart(offset);
    try {
      const res = await fetch(`/api/platform/users/${userId}/timesheet-week?weekStart=${ws}`);
      if (res.ok) setWeekData(await res.json());
    } catch {}
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getOffsetFromWeekStart = (weekStart: string) => {
    const today = new Date();
    const todayMonday = getMonday(today);
    const targetMonday = new Date(weekStart + "T00:00:00");
    const diffDays = Math.round((todayMonday.getTime() - targetMonday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(diffDays / 7);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${userId}/timesheet-weeks`);
      if (res.ok) setHistoryWeeks((await res.json()).weeks);
    } catch {}
    finally { setHistoryLoading(false); }
  };

  const selectHistoryWeek = (week: any) => {
    const offset = getOffsetFromWeekStart(week.weekStart);
    setWeekOffset(offset);
    setShowHistory(false);
  };

  useEffect(() => { setLoading(true); Promise.all([fetchProfile(), fetchWeek(0)]).finally(() => setLoading(false)); }, [userId]);

  useEffect(() => { if (profile) fetchWeek(weekOffset); }, [weekOffset]);

  const handleSaveRate = async () => {
    if (!isOwner) return;
    setRateError(null); setRateSuccess(null);
    const rate = Number(rateValue);
    if (!rateValue.trim() || !Number.isFinite(rate) || rate <= 0 || rate > 300) { setRateError("Rate must be between 0.01 and 300"); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(String(rateValue))) { setRateError("Max 2 decimal places"); return; }
    setRateSaving(true);
    try {
      const res = await fetch(`/api/platform/users/${userId}/hourly-rate`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hourlyRate: rate }) });
      if (!res.ok) { const d = await res.json(); setRateError(d.error || "Failed"); return; }
      setRateSuccess("Rate updated. Future check-ins use this rate.");
      fetchProfile();
    } catch { setRateError("Network error"); }
    finally { setRateSaving(false); }
  };

  const viewShiftDetail = async (shiftId: string) => {
    setSelectedShiftId(shiftId); setShiftLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${userId}/shifts/${shiftId}`);
      if (res.ok) setShiftDetail(await res.json());
    } catch {}
    finally { setShiftLoading(false); }
  };

  const handleCreateManualShift = async (e: React.FormEvent) => {
    e.preventDefault(); setManualError(null);
    if (!manualForm.reason.trim()) { setManualError("Reason is required"); return; }
    setManualSaving(true);
    try {
      const res = await fetch(`/api/platform/users/${userId}/manual-shift`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manualForm) });
      if (!res.ok) { const d = await res.json(); setManualError(d.error || "Failed"); return; }
      setShowManualShift(false);
      setManualForm({ date: "", startTime: "", endTime: "", breakDuration: "0", siteId: "", reason: "" });
      fetchWeek(weekOffset);
    } catch { setManualError("Network error"); }
    finally { setManualSaving(false); }
  };

  const handleApproveShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/platform/users/${userId}/shifts/${shiftId}/approve`, { method: "POST" });
      if (res.ok) { setSelectedShiftId(null); fetchWeek(weekOffset); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch { alert("Network error"); }
  };

  const handleRejectShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/platform/users/${userId}/shifts/${shiftId}/reject`, { method: "POST" });
      if (res.ok) { setSelectedShiftId(null); fetchWeek(weekOffset); }
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } catch { alert("Network error"); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-50 dark:bg-green-900/20 text-green-600",
      on_break: "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
      pending_approval: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600",
      approved: "bg-green-50 dark:bg-green-900/20 text-green-600",
      rejected: "bg-red-50 dark:bg-red-900/20 text-red-600",
      missing: "bg-gray-50 dark:bg-gray-800 text-gray-400",
    };
    const label: Record<string, string> = {
      active: "Active", on_break: "On Break", pending_approval: "Pending",
      approved: "Approved", rejected: "Rejected", missing: "Missing",
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status] || "bg-gray-100 text-gray-500"}`}>{label[status] || status}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Worker Profile" onMenuClick={() => setSidebarOpen(true)} />
        <LoadingState message="Loading worker profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Worker Profile" onMenuClick={() => setSidebarOpen(true)} />
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO title={`Worker Profile${profile ? ` | ${profile.name}` : ""} | TNA Provider Platform`} description="Worker profile and timesheet review." canonical={`https://tnaprovider.com.au/platform/worker-profile/${userId}`} />
      <PageHeader title={profile?.name || "Worker Profile"} onMenuClick={() => setSidebarOpen(true)} />

      {/* Back link */}
      <div className="px-4 md:px-6 pt-4 pb-0">
        <Link to={appPath("/platform/users")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-accent transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
      </div>

      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Worker Summary Card */}
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-brand-dark dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-brand-accent" /> Worker Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div><span className="text-gray-400">Name</span><p className="font-medium text-brand-dark dark:text-white">{profile?.name}</p></div>
            <div><span className="text-gray-400">Email</span><p className="font-medium">{profile?.email}</p></div>
            <div><span className="text-gray-400">Role</span><p className="font-medium capitalize">{profile?.role}</p></div>
            <div><span className="text-gray-400">Status</span><div>{profile && statusBadge(profile.status)}</div></div>
            <div><span className="text-gray-400">Current Rate</span><p className="font-medium text-brand-accent">{profile?.hourlyRate ? `$${Number(profile.hourlyRate).toFixed(2)}/hr` : "Not set"}</p></div>
            <div><span className="text-gray-400">Last Login</span><p className="font-medium">{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never"}</p></div>
          </div>
        </div>

        {/* Rate Edit Card (owner only) */}
        {isOwner && (
          <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-brand-dark dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-accent" /> Pay Rate
            </h3>
            {rateError && <p className="text-sm text-red-500">{rateError}</p>}
            {rateSuccess && <p className="text-sm text-green-600">{rateSuccess}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" inputMode="decimal" value={rateValue} onChange={(e) => { setRateValue(e.target.value); setRateError(null); setRateSuccess(null); }} placeholder="Hourly rate" className="w-32 h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:border-brand-accent text-lg" />
              <button onClick={handleSaveRate} disabled={rateSaving} className="flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {rateSaving ? "Saving..." : "Update Rate"}
              </button>
            </div>
            <p className="text-xs text-gray-400">Changing this rate only affects future check-ins. Existing shifts keep the rate captured at check-in.</p>
          </div>
        )}

        {/* Weekly Timesheet */}
        <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <button
                onClick={() => { setShowHistory(!showHistory); if (!showHistory && historyWeeks.length === 0) loadHistory(); }}
                className="text-sm font-semibold text-brand-dark dark:text-white min-w-[160px] text-center cursor-pointer hover:text-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/50 rounded px-2 py-1"
                aria-label="Open timesheet history"
              >
                {weekData?.week.label || "Loading..."}
                <ChevronDown className="w-3.5 h-3.5 inline-block ml-1 opacity-50" />
              </button>
              <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">This Week</button>
              )}
            </div>
            {isOwner && (
              <button onClick={() => setShowManualShift(true)} className="text-xs px-3 py-1.5 bg-brand-accent text-white rounded-lg hover:bg-brand-accent/90 transition-colors">+ Manual Shift</button>
            )}
          </div>

          {/* Timesheet History Dropdown */}
          {showHistory && (
            <div className="border-b border-gray-100 dark:border-gray-800 max-h-72 overflow-y-auto bg-white dark:bg-brand-darker">
              {historyLoading ? (
                <div className="p-4 text-center text-sm text-gray-400">Loading history...</div>
              ) : historyWeeks.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No timesheet history available</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {historyWeeks.map((week) => {
                    const label = `${new Date(week.weekStart).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(week.weekEnd).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
                    const hrsLabel = formatDuration(week.totalSeconds);
                    const payLabel = `$${week.totalPay.toFixed(2)}`;
                    const isCurrent = week.weekStart === weekData?.week.start;
                    let summary;
                    if (week.shiftCount === 0) {
                      summary = `${hrsLabel} · ${payLabel} · 0 shifts · ${week.missingCount} missing`;
                    } else {
                      const parts = [];
                      if (week.approvedCount > 0) parts.push(`${week.approvedCount} approved`);
                      if (week.pendingCount > 0) parts.push(`${week.pendingCount} pending`);
                      if (week.rejectedCount > 0) parts.push(`${week.rejectedCount} rejected`);
                      if (week.missingCount > 0) parts.push(`${week.missingCount} missing`);
                      summary = `${hrsLabel} · ${payLabel} · ${week.shiftCount} shifts · ${parts.join(", ") || "All shifts"}`;
                    }
                    return (
                      <button
                        key={week.weekStart}
                        onClick={() => selectHistoryWeek(week)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30 ${isCurrent ? "bg-brand-accent/5" : ""}`}
                      >
                        <div className="text-sm font-semibold text-brand-dark dark:text-white">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{summary}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Day Rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {weekData?.days.map((day) => (
              <button
                key={day.date}
                onClick={() => day.hasShift && viewShiftDetail(day.shiftId!)}
                disabled={!day.hasShift}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors ${day.hasShift ? "hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer" : "cursor-default"}`}
              >
                <div className="w-10 text-sm font-semibold text-brand-dark dark:text-white">{day.day}</div>
                <div className="flex-1 grid grid-cols-4 sm:grid-cols-5 gap-2 text-sm">
                  <div><span className="text-gray-400 text-xs hidden sm:inline">Start </span><span className="text-brand-dark dark:text-white">{day.start}</span></div>
                  <div><span className="text-gray-400 text-xs hidden sm:inline">End </span><span className="text-brand-dark dark:text-white">{day.end}</span></div>
                  <div><span className="text-gray-400 text-xs hidden sm:inline">Time </span><span className="text-brand-dark dark:text-white">{day.paidLabel}</span></div>
                  <div><span className="text-gray-400 text-xs hidden sm:inline">Pay </span><span className="font-medium">{day.payLabel}</span></div>
                  <div className="text-right">{statusBadge(day.status)}</div>
                </div>
                {day.hasShift && <ChevronRight className="w-4 h-4 text-gray-300 ml-2 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-brand-dark dark:text-white">Total Time</span>
            <span className="text-sm font-semibold text-brand-accent">{weekData?.totals.paidLabel}</span>
            <span className="text-sm font-semibold text-brand-dark dark:text-white">Total Pay</span>
            <span className="text-sm font-semibold text-green-600">{weekData?.totals.payLabel}</span>
          </div>
        </div>
      </div>

      {/* Manual Shift Modal */}
      {showManualShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowManualShift(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white">Create Manual Shift</h3>
              <button onClick={() => setShowManualShift(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {manualError && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{manualError}</p>}
            <form onSubmit={handleCreateManualShift} className="space-y-3">
              <input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} required className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={manualForm.startTime} onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })} required className="h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                <input type="time" value={manualForm.endTime} onChange={(e) => setManualForm({ ...manualForm, endTime: e.target.value })} required className="h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              </div>
              <input type="number" min="0" placeholder="Break duration (minutes)" value={manualForm.breakDuration} onChange={(e) => setManualForm({ ...manualForm, breakDuration: e.target.value })} className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <input type="text" placeholder="Reason (required)" value={manualForm.reason} onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })} required className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={manualSaving} className="flex-1 py-3 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
                  {manualSaving ? "Creating..." : "Create Shift"}
                </button>
                <button type="button" onClick={() => setShowManualShift(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Detail Modal */}
      {selectedShiftId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedShiftId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-dark dark:text-white">Shift Detail</h3>
              <button onClick={() => setSelectedShiftId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {shiftLoading ? <LoadingState message="Loading shift details..." /> : shiftDetail && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Date</span><span className="font-medium">{new Date(shiftDetail.shift.checked_in_at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Status</span>{statusBadge(shiftDetail.shift.status)}</div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Check In</span><span className="font-medium">{new Date(shiftDetail.shift.checked_in_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Check Out</span><span className="font-medium">{shiftDetail.shift.checked_out_at ? new Date(shiftDetail.shift.checked_out_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "-"}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Break</span><span className="font-medium">{Math.floor((shiftDetail.shift.break_seconds || 0) / 60)} min</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Rate Snapshot</span><span className="font-medium">${Number(shiftDetail.shift.hourly_rate_snapshot).toFixed(2)}/hr</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Base Pay</span><span className="font-medium">${(shiftDetail.shift.base_pay || 0).toFixed(2)}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">OT Pay</span><span className="font-medium">${(shiftDetail.shift.overtime_pay || 0).toFixed(2)}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">DT Pay</span><span className="font-medium">${(shiftDetail.shift.double_time_pay || 0).toFixed(2)}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><span className="text-gray-400 block text-xs">Allowances</span><span className="font-medium">${(shiftDetail.allowances || []).reduce((s: number, a: any) => s + (a.amount || 0), 0).toFixed(2)}</span></div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 col-span-2"><span className="text-gray-400 block text-xs">Total Pay</span><span className="text-2xl font-bold text-green-600">${(shiftDetail.shift.final_gross_pay || shiftDetail.shift.estimated_gross_pay || 0).toFixed(2)}</span></div>
                </div>

                {/* Events Timeline */}
                {shiftDetail.events?.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timeline</h4>
                    <div className="space-y-1.5">
                      {shiftDetail.events.map((ev: any) => (
                        <div key={ev.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-mono text-gray-400 w-16 shrink-0">{new Date(ev.event_time).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                          <span className="capitalize">{ev.event_type.replace(/_/g, " ")}</span>
                          {ev.source && <span className="text-gray-400">({ev.source})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isOwner && shiftDetail.shift.status === "pending_approval" && (
                  <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={() => handleApproveShift(selectedShiftId)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleRejectShift(selectedShiftId)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
