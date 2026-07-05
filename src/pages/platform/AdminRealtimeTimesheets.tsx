import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "../../components/shared/PageHeader"
import { LoadingState } from "../../components/shared/LoadingState"
import { ErrorState } from "../../components/shared/ErrorState"
import { ShiftTimeline } from "../../components/timesheet/ShiftTimeline"
import { useOutletContext } from "react-router-dom"
import { formatDurationShort, formatMoney, formatShiftDate } from "../../lib/timesheet/calculate"
import { Users, Clock, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react"

export function AdminRealtimeTimesheets() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [activeWorkers, setActiveWorkers] = useState<any[]>([])
  const [pendingShifts, setPendingShifts] = useState<any[]>([])
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [selectedEvents, setSelectedEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [tab, setTab] = useState<"pending" | "active">("pending")

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const [activeRes, pendingRes] = await Promise.all([
        fetch("/api/realtime-timesheets/admin/active"),
        fetch("/api/realtime-timesheets/admin/pending"),
      ])
      if (activeRes.ok) setActiveWorkers(await activeRes.json())
      if (pendingRes.ok) setPendingShifts(await pendingRes.json())
    } catch { setError("Failed to load timesheet data") }
  }, [])

  useEffect(() => {
    Promise.all([fetchData()]).finally(() => setLoading(false))
  }, [fetchData])

  const viewShiftDetail = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/realtime-timesheets/admin/${shiftId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedShift(data.shift)
        setSelectedEvents(data.events || [])
      }
    } catch {}
  }

  const handleApprove = async (shiftId: string) => {
    setActionLoading(shiftId)
    try {
      const res = await fetch(`/api/realtime-timesheets/admin/${shiftId}/approve`, { method: "POST" })
      if (res.ok) {
        setPendingShifts((prev) => prev.filter((s) => s.id !== shiftId))
        setSelectedShift(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (shiftId: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(shiftId)
    try {
      const res = await fetch(`/api/realtime-timesheets/admin/${shiftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (res.ok) {
        setPendingShifts((prev) => prev.filter((s) => s.id !== shiftId))
        setSelectedShift(null)
        setShowRejectModal(null)
        setRejectReason("")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Timesheet Admin" description="Review and approve worker timesheets." onMenuClick={() => setSidebarOpen(true)} />
        <LoadingState message="Loading timesheets..." />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Timesheet Admin" description="Review and approve worker timesheets." onMenuClick={() => setSidebarOpen(true)} />
      {error && (
        <div className="p-4 md:p-6 pb-0">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={fetchData} className="ml-auto text-sm font-medium underline hover:no-underline">Retry</button>
          </div>
        </div>
      )}
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "pending"
                ? "bg-white dark:bg-gray-800 text-brand-accent border-b-2 border-brand-accent"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending Approval ({pendingShifts.length})
          </button>
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "active"
                ? "bg-white dark:bg-gray-800 text-brand-accent border-b-2 border-brand-accent"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active Workers ({activeWorkers.length})
          </button>
        </div>

        {tab === "pending" && (
          <div className="space-y-3">
            {pendingShifts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                <p>No pending timesheets</p>
              </div>
            )}
            {pendingShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{shift.employee_name}</p>
                    <p className="text-sm text-gray-500">{formatShiftDate(shift.checked_in_at, shift.timezone)}</p>
                  </div>
                  <span className="text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                    Pending
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Check-in</p>
                    <p className="font-medium">{formatTime(shift.checked_in_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Check-out</p>
                    <p className="font-medium">{shift.checked_out_at ? formatTime(shift.checked_out_at) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Payable</p>
                    <p className="font-medium">{formatDurationShort(shift.payable_seconds || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Gross</p>
                    <p className="font-medium text-green-600">{formatMoney(shift.estimated_gross_pay || 0)}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => viewShiftDetail(shift.id)}
                    className="flex items-center gap-1 text-sm text-brand-accent hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => handleApprove(shift.id)}
                    disabled={actionLoading === shift.id}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(shift.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "active" && (
          <div className="space-y-3">
            {activeWorkers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p>No active workers</p>
              </div>
            )}
            {activeWorkers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${worker.status === "on_break" ? "bg-amber-400" : "bg-green-500"}`} />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{worker.employee_name}</p>
                      <p className="text-sm text-gray-500">{worker.site_name || "No site"}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    worker.status === "on_break"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                      : "bg-green-50 text-green-600 dark:bg-green-900/20"
                  }`}>
                    {worker.status === "on_break" ? "On Break" : "Working"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Since</p>
                    <p className="font-medium">{formatTime(worker.checked_in_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Rate</p>
                    <p className="font-medium">{formatMoney(worker.hourly_rate_snapshot)}/hr</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Gross</p>
                    <p className="font-medium text-green-600">
                      {formatMoney(worker.estimated_gross_pay || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedShift && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedShift.employee_name}</h3>
                <button onClick={() => setSelectedShift(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <p className="text-sm text-gray-500">{formatShiftDate(selectedShift.checked_in_at, selectedShift.timezone)}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Check-in</p>
                  <p className="font-semibold">{formatTime(selectedShift.checked_in_at)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Check-out</p>
                  <p className="font-semibold">{selectedShift.checked_out_at ? formatTime(selectedShift.checked_out_at) : "-"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Total</p>
                  <p className="font-semibold">{formatDurationShort(selectedShift.total_seconds || 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Break</p>
                  <p className="font-semibold">{formatDurationShort(selectedShift.break_seconds || 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Payable</p>
                  <p className="font-semibold">{formatDurationShort(selectedShift.payable_seconds || 0)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400">Rate</p>
                  <p className="font-semibold">{formatMoney(selectedShift.hourly_rate_snapshot)}/hr</p>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">Estimated Gross</p>
                <p className="text-2xl font-bold text-green-600">{formatMoney(selectedShift.estimated_gross_pay || 0)}</p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Timeline</h4>
                <ShiftTimeline events={selectedEvents} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleApprove(selectedShift.id)}
                  disabled={actionLoading === selectedShift.id}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  Approve for Payroll
                </button>
                <button
                  onClick={() => setShowRejectModal(selectedShift.id)}
                  className="flex-1 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h3 className="text-lg font-bold">Reject Timesheet</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-sm min-h-[80px]"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(null); setRejectReason("") }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={!rejectReason.trim() || actionLoading === showRejectModal}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
