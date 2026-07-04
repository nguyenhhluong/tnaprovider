import { Clock, MapPin } from "lucide-react"
import { formatShiftDate } from "../../lib/timesheet/calculate"

interface WorkSite {
  id: string
  name: string
  address?: string
}

export function CheckInPanel({
  sites,
  selectedSiteId,
  onSiteChange,
  onCheckIn,
  checkingIn,
}: {
  sites: WorkSite[]
  selectedSiteId: string
  onSiteChange: (id: string) => void
  onCheckIn: () => void
  checkingIn: boolean
}) {
  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Today&apos;s Shift
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {formatShiftDate(new Date().toISOString(), "Australia/Sydney")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-gray-400" />
          {sites.length > 1 ? (
            <select
              value={selectedSiteId}
              onChange={(e) => onSiteChange(e.target.value)}
              className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 py-1 focus:outline-none focus:border-brand-accent"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          ) : (
            <span>{sites[0]?.name || "No site selected"}</span>
          )}
        </div>

        <button
          onClick={onCheckIn}
          disabled={checkingIn}
          className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl text-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-5 h-5" />
          {checkingIn ? "Checking In..." : "Check In"}
        </button>
      </div>
    </div>
  )
}
