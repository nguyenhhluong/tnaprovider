import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { PlatformHeader } from "../../components/platform/PlatformHeader"
import { useOutletContext } from "react-router-dom"
import { MapPin, LogIn } from "lucide-react"

export function QRSiteCheckIn() {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const { setSidebarOpen } = useOutletContext<{ setSidebarOpen: (v: boolean) => void }>()
  const [site, setSite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (!qrToken) {
      setError("Invalid QR code")
      setLoading(false)
      return
    }
    fetch(`/api/realtime-timesheets/sites/by-qr/${encodeURIComponent(qrToken)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid or disabled QR code")
        return r.json()
      })
      .then(setSite)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [qrToken])

  const handleCheckIn = async () => {
    setCheckingIn(true)
    setError(null)
    try {
      const res = await fetch("/api/realtime-timesheets/check-in-by-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Check-in failed")
      }
      navigate("/platform/realtime-timesheet", { replace: true })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <>
      <PlatformHeader title="Site Check-In" onMenuClick={() => setSidebarOpen(true)} />
      <div className="max-w-md mx-auto mt-12 p-6">
        {loading && <p className="text-center text-gray-500">Loading site details...</p>}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {site && !error && (
          <div className="bg-white dark:bg-brand-darker rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-brand-accent" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-brand-dark dark:text-white">{site.name}</h2>
              {site.address && (
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{site.address}</p>
              )}
            </div>

            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {checkingIn ? "Checking in..." : "Check In"}
            </button>

            <p className="text-xs text-gray-400">
              Your location will be recorded as {site.name} for this shift.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
