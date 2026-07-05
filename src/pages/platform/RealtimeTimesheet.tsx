import { useState, useEffect, useCallback } from "react"
import { CheckInPanel } from "../../components/timesheet/CheckInPanel"
import { LiveMoneyMeter } from "../../components/timesheet/LiveMoneyMeter"
import { CheckOutSummaryModal } from "../../components/timesheet/CheckOutSummaryModal"
import { PageHeader } from "../../components/shared/PageHeader"
import { LoadingState } from "../../components/shared/LoadingState"
import { ErrorState } from "../../components/shared/ErrorState"
import { useOutletContext } from "react-router-dom"
import { useLiveTimer } from "../../hooks/useLiveTimer"
import { AlertCircle } from "lucide-react"

interface WorkSite {
  id: string
  name: string
  address?: string
}

interface ActiveShift {
  id: string
  status: string
  checkedInAt: string
  checkedOutAt: string | null
  hourlyRateSnapshot: number
  timezone: string
  site: { id: string; name: string } | null
  breakSeconds: number
  currentBreakStartedAt: string | null
  serverNow: string
}

export function RealtimeTimesheet() {
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [sites, setSites] = useState<WorkSite[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>("")
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [breakLoading, setBreakLoading] = useState(false)
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false)
  const [checkoutSummary, setCheckoutSummary] = useState<any>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [completedShift, setCompletedShift] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime-timesheets/sites")
      if (res.ok) {
        const data = await res.json()
        setSites(data)
        if (data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(data[0].id)
        }
      }
    } catch { setError("Failed to load sites") }
  }, [selectedSiteId])

  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime-timesheets/active")
      if (res.ok) {
        const data = await res.json()
        if (data.active && data.shift) {
          setActiveShift(data.shift)
        } else {
          setActiveShift(null)
        }
      }
    } catch { setError("Failed to load active shift") }
  }, [])

  useEffect(() => {
    Promise.all([fetchSites(), fetchActiveShift()]).finally(() => setLoading(false))
  }, [fetchSites, fetchActiveShift])

  const handleCheckIn = async () => {
    setCheckingIn(true)
    setError(null)
    try {
      const res = await fetch("/api/realtime-timesheets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selectedSiteId || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        setActiveShift(data.shift)
      } else {
        const err = await res.json()
        setError(err.error || "Check-in failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setCheckingIn(false)
    }
  }

  const handleStartBreak = async () => {
    if (!activeShift) return
    setBreakLoading(true)
    try {
      const res = await fetch(`/api/realtime-timesheets/${activeShift.id}/break/start`, { method: "POST" })
      if (res.ok) {
        setActiveShift((prev) =>
          prev ? { ...prev, status: "on_break", currentBreakStartedAt: new Date().toISOString() } : null
        )
      }
    } finally {
      setBreakLoading(false)
    }
  }

  const handleEndBreak = async () => {
    if (!activeShift) return
    setBreakLoading(true)
    try {
      const res = await fetch(`/api/realtime-timesheets/${activeShift.id}/break/end`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setActiveShift((prev) =>
          prev ? { ...prev, status: "active", breakSeconds: data.breakSeconds, currentBreakStartedAt: null } : null
        )
      }
    } finally {
      setBreakLoading(false)
    }
  }

  const handleCheckOutClick = async () => {
    if (!activeShift) return
    const now = new Date().toISOString()

    const elapsedTotal = Math.floor((new Date(now).getTime() - new Date(activeShift.checkedInAt).getTime()) / 1000)
    const elapsedBreak = activeShift.breakSeconds
    const payable = Math.max(0, elapsedTotal - elapsedBreak)
    const gross = payable / 3600 * activeShift.hourlyRateSnapshot

    setCheckoutSummary({
      checkedInAt: activeShift.checkedInAt,
      checkedOutAt: now,
      totalSeconds: elapsedTotal,
      breakSeconds: elapsedBreak,
      payableSeconds: payable,
      estimatedGrossPay: gross,
      hourlyRateSnapshot: activeShift.hourlyRateSnapshot,
      timezone: activeShift.timezone,
    })
    setShowCheckoutSummary(true)
  }

  const handleConfirmCheckOut = async () => {
    if (!activeShift) return
    setCheckingOut(true)
    try {
      const res = await fetch(`/api/realtime-timesheets/${activeShift.id}/check-out`, { method: "POST" })
      if (res.ok) {
        setActiveShift(null)
        setCompletedShift(true)
        setShowCheckoutSummary(false)
      } else {
        setError("Check-out failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setCheckingOut(false)
    }
  }

  const ErrorBanner = () =>
    error ? (
      <div className="max-w-md mx-auto mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    ) : null

  if (loading) {
    return (
      <>
        <PageHeader title="Timesheet" description="Check in, track your time, and manage your shifts." onMenuClick={() => setSidebarOpen(true)} />
        <LoadingState message="Loading your timesheet..." />
      </>
    )
  }

  if (completedShift) {
    return (
      <>
        <PageHeader title="Timesheet" description="Check in, track your time, and manage your shifts." onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-4 md:p-6 max-w-md mx-auto mt-8 text-center space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Shift Complete</h2>
            <p className="text-gray-500 dark:text-gray-400">Your timesheet has been submitted for approval.</p>
            <button
              onClick={() => setCompletedShift(false)}
              className="mt-4 px-6 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors"
            >
              Start New Shift
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!activeShift) {
    return (
      <>
        <PageHeader title="Timesheet" description="Check in, track your time, and manage your shifts." onMenuClick={() => setSidebarOpen(true)} />
        <div className="p-4 md:p-6">
          <ErrorBanner />
          <CheckInPanel
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSiteChange={setSelectedSiteId}
            onCheckIn={handleCheckIn}
            checkingIn={checkingIn}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Live Shift" description="Your current shift is active." onMenuClick={() => setSidebarOpen(true)} />
      <div className="p-4 md:p-6">
        <ErrorBanner />
        <LiveMoneyMeter
          shift={activeShift}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
          onCheckOut={handleCheckOutClick}
          breakLoading={breakLoading}
        />
      </div>

      {showCheckoutSummary && checkoutSummary && (
        <CheckOutSummaryModal
          summary={checkoutSummary}
          onConfirm={handleConfirmCheckOut}
          onCancel={() => setShowCheckoutSummary(false)}
          loading={checkingOut}
        />
      )}
    </>
  )
}
