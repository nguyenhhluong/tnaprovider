import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext, Link } from "react-router-dom";
import { SEO } from "../../components/SEO";
import { MapPin, LogIn, LogOut, Coffee, Play, ExternalLink, Clock, CheckCircle2 } from "lucide-react";
import { appPath } from "../../utils/host";

function calculateLivePay(payableSeconds: number, hourlyRate: number, payRule: any) {
  const otAfterSecs = (payRule?.overtime_daily_after_hours || 7.6) * 3600;
  const baseSecs = Math.min(payableSeconds, otAfterSecs);
  const remaining = Math.max(0, payableSeconds - otAfterSecs);
  let otSecs, dtSecs;
  if (payRule?.double_time_after_hours != null && payRule.double_time_after_hours > 0) {
    const dtAfter = payRule.double_time_after_hours * 3600;
    const otCap = Math.max(0, dtAfter - otAfterSecs);
    otSecs = Math.min(remaining, otCap);
    dtSecs = Math.max(0, remaining - otCap);
  } else {
    otSecs = remaining;
    dtSecs = 0;
  }
  const basePay = baseSecs / 3600 * hourlyRate;
  const otPay = otSecs / 3600 * hourlyRate * (payRule?.overtime_rate_multiplier || 1.5);
  const dtPay = dtSecs / 3600 * hourlyRate * (payRule?.double_time_multiplier || 2.0);
  return { total: basePay + otPay + dtPay, basePay, otPay, dtPay };
}

function fmtDuration(secs: number) {
  secs = Math.max(0, Math.floor(secs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtMoney(amount: number) {
  return `$${(amount || 0).toFixed(2)}`;
}

function fmtHour(isoStr: string) {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function QRQuickAction() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const al = (a: string) => actionLoading === a;
  const [completedAction, setCompletedAction] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const [liveSecs, setLiveSecs] = useState(0);
  const [liveBreakSecs, setLiveBreakSecs] = useState(0);

  const fetchQR = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/realtime-timesheets/qr/${encodeURIComponent(qrToken || "")}`);
      if (res.status === 401) { navigate(`/login?redirect=/qr/${qrToken}`); return; }
      if (!res.ok) { const d = await res.json(); setError(d.error || "Invalid QR code"); return; }
      const d = await res.json();
      setData(d);
      if (d.activeShift?.active && d.activeShift?.shift) {
        setLiveBreakSecs(d.activeShift.shift.liveBreakSeconds || 0);
      }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQR(); }, [qrToken]);

  // Live timer
  useEffect(() => {
    if (!data?.activeShift?.active || !data?.activeShift?.shift) return;
    const shift = data.activeShift.shift;
    const checkedIn = new Date(shift.checkedInAt).getTime();
    const serverNow = new Date(shift.serverNow).getTime();
    const offset = Date.now() - serverNow;

    const tick = () => {
      const now = Date.now() - offset;
      const totalSecs = Math.max(0, Math.floor((now - checkedIn) / 1000));
      setLiveSecs(totalSecs);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [data?.activeShift?.active, data?.activeShift?.shift?.id]);

  const doAction = async (action: string) => {
    setActionLoading(action); setError(null);
    try {
      const res = await fetch(`/api/realtime-timesheets/qr/${encodeURIComponent(qrToken || "")}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Action failed"); return; }
      setCompletedAction(action);
      if (action !== "check_out") {
        // Refetch to get updated state
        setTimeout(() => { setCompletedAction(null); fetchQR(); }, 1500);
      }
    } catch { setError("Network error"); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading site details...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center max-w-sm w-full">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-brand-dark dark:text-white mb-1">QR Code Error</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Link to={appPath("/platform/dashboard")} className="text-sm text-brand-accent hover:underline">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const shift = data.activeShift?.shift;
  const isCheckedIn = data.activeShift?.active;
  const isOnBreak = data.activeShift?.status === "on_break";

  // Calculate live values
  const totalSecs = isCheckedIn ? liveSecs : (shift?.liveTotalSeconds || 0);
  const breakSecs = isCheckedIn ? (isOnBreak ? (liveSecs - liveBreakSecs) : (shift?.liveBreakSeconds || 0)) : (shift?.liveBreakSeconds || 0);
  const paySecs = Math.max(0, totalSecs - breakSecs);
  const payRule = data.payRule || {};
  const live = calculateLivePay(paySecs, shift?.hourlyRateSnapshot || 0, payRule);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4">
      <SEO title="QR Check-In | TNA Provider" description="Quick QR check-in." canonical="https://tnaprovider.com.au/qr" />

      {/* Completed state */}
      {completedAction === "check_out" ? (
        <div className="max-w-sm w-full mt-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-600">Checked Out Successfully</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Checked in at</span><span className="font-medium">{fmtHour(shift?.checkedInAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Checked out at</span><span className="font-medium">{fmtHour(new Date().toISOString())}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Final paid duration</span><span className="font-medium">{fmtDuration(paySecs)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Estimated earning</span><span className="font-medium text-green-600">{fmtMoney(live.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span><span className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 text-xs font-semibold rounded-full">Pending approval</span></div>
            </div>
            <Link to={appPath("/platform/dashboard")} className="block w-full py-3 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent/90 transition-colors text-center">
              Open Company App <ExternalLink className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        </div>
      ) : completedAction === "check_in" ? (
        <div className="max-w-sm w-full mt-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-600">Checked In Successfully</h2>
            <div className="space-y-1 text-sm">
              <p className="text-gray-400">Checked in at</p>
              <p className="text-3xl font-bold text-brand-dark dark:text-white">{fmtHour(new Date().toISOString())}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Current paid duration</p>
              <p className="text-2xl font-mono font-bold text-brand-accent">{fmtDuration(0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Estimated earning</p>
              <p className="text-2xl font-bold text-green-600">{fmtMoney(0)}</p>
            </div>
            <p className="text-sm text-gray-500">{data.site?.name}</p>
            <div className="space-y-2 pt-2">
              <Link to={appPath("/platform/realtime-timesheet")} className="block w-full py-3 bg-brand-accent/10 text-brand-accent rounded-xl font-medium hover:bg-brand-accent/20 transition-colors text-center">
                Open Timesheet <ExternalLink className="w-4 h-4 inline ml-1" />
              </Link>
              <Link to={appPath("/platform/dashboard")} className="block w-full py-3 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent/90 transition-colors text-center">
                Open Company App <ExternalLink className="w-4 h-4 inline ml-1" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Main action screen */
        <div className="max-w-sm w-full mt-8 space-y-4">
          {/* Site info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center shadow-sm">
            <div className="w-14 h-14 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-7 h-7 text-brand-accent" />
            </div>
            <h2 className="text-xl font-bold text-brand-dark dark:text-white">{data.site?.name}</h2>
            {data.site?.address && <p className="text-sm text-gray-400 mt-0.5">{data.site.address}</p>}
            <p className="text-xs text-gray-400 mt-1">Main Entry</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</div>
          )}

          {/* Not checked in */}
          {!isCheckedIn && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-sm">
              <p className="text-gray-500">You are not checked in.</p>
              <button onClick={() => doAction("check_in")} disabled={al("check_in")} className="w-full flex items-center justify-center gap-2 py-4 bg-brand-accent text-white rounded-xl font-semibold text-lg hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
                <LogIn className="w-5 h-5" />
                {al("check_in") ? "Checking in..." : "Check In Now"}
              </button>
              <Link to={appPath("/platform/dashboard")} className="block w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center">
                Open Company App
              </Link>
            </div>
          )}

          {/* Checked in */}
          {isCheckedIn && !isOnBreak && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-sm">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-green-600 font-semibold">You are currently checked in.</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Checked in at</p>
                <p className="text-3xl font-bold text-brand-dark dark:text-white">{fmtHour(shift?.checkedInAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Current paid duration</p>
                <p className="text-2xl font-mono font-bold text-brand-accent">{fmtDuration(paySecs)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Estimated earning</p>
                <p className="text-2xl font-bold text-green-600">{fmtMoney(live.total)}</p>
              </div>
              <div className="space-y-2 pt-2">
                <button onClick={() => doAction("check_out")} disabled={al("check_out")} className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                  <LogOut className="w-4 h-4" /> {al("check_out") ? "Checking out..." : "Check Out Now"}
                </button>
                <button onClick={() => doAction("start_break")} disabled={al("start_break")} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  <Coffee className="w-4 h-4" /> {al("start_break") ? "Starting break..." : "Start Break"}
                </button>
                <Link to={appPath("/platform/realtime-timesheet")} className="block w-full py-3 bg-brand-accent/10 text-brand-accent rounded-xl font-medium hover:bg-brand-accent/20 transition-colors text-center">
                  Open Timesheet
                </Link>
                <Link to={appPath("/platform/dashboard")} className="block w-full py-3 text-gray-400 hover:text-brand-accent transition-colors text-center text-sm">
                  Open Company App
                </Link>
              </div>
            </div>
          )}

          {/* On break */}
          {isOnBreak && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4 shadow-sm">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
                <Coffee className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-amber-600 font-semibold">You are currently on break.</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">Checked in at</p>
                <p className="text-2xl font-bold text-brand-dark dark:text-white">{fmtHour(shift?.checkedInAt)}</p>
              </div>
              <div className="text-sm text-gray-400">Current paid duration <span className="font-mono font-bold text-brand-dark dark:text-white">{fmtDuration(paySecs)}</span></div>
              <div className="text-sm text-gray-400">Estimated earning <span className="font-bold text-green-600">{fmtMoney(live.total)}</span></div>
              <div className="text-sm text-gray-400">Break time <span className="font-mono font-bold text-amber-600">{fmtDuration(breakSecs)}</span></div>
              <div className="space-y-2 pt-2">
                <button onClick={() => doAction("end_break")} disabled={al("end_break")} className="w-full flex items-center justify-center gap-2 py-3 bg-brand-accent text-white rounded-xl font-medium hover:bg-brand-accent/90 disabled:opacity-50 transition-colors">
                  <Play className="w-4 h-4" /> {al("end_break") ? "Ending break..." : "End Break"}
                </button>
                <button onClick={() => doAction("check_out")} disabled={al("check_out")} className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 dark:border-red-800 text-red-600 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
                  <LogOut className="w-4 h-4" /> {al("check_out") ? "Checking out..." : "Check Out Now"}
                </button>
                <Link to={appPath("/platform/dashboard")} className="block w-full text-center text-sm text-gray-400 hover:text-brand-accent transition-colors pt-1">
                  Open Company App
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
