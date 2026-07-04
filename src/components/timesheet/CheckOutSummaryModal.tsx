import { formatShiftDate, formatDurationShort, formatMoney } from "../../lib/timesheet/calculate"
import { X } from "lucide-react"

interface CheckOutSummaryProps {
  summary: {
    checkedInAt: string
    checkedOutAt: string
    totalSeconds: number
    breakSeconds: number
    payableSeconds: number
    estimatedGrossPay: number
    hourlyRateSnapshot: number
    timezone: string
  }
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

export function CheckOutSummaryModal({ summary, onConfirm, onCancel, loading }: CheckOutSummaryProps) {
  const checkedIn = new Date(summary.checkedInAt)
  const checkedOut = new Date(summary.checkedOutAt)

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check Out</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatShiftDate(summary.checkedInAt, summary.timezone)}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Check-in</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatTime(checkedIn)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Current time</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatTime(checkedOut)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Total time</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatDurationShort(summary.totalSeconds)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Break</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatDurationShort(summary.breakSeconds)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-500">Payable time</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatDurationShort(summary.payableSeconds)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <div className="flex justify-between py-1 text-base">
            <span className="font-semibold text-gray-900 dark:text-white">Estimated gross</span>
            <span className="font-bold text-green-600 dark:text-green-400">{formatMoney(summary.estimatedGrossPay)}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors"
          >
            {loading ? "Checking Out..." : "Confirm Check Out"}
          </button>
        </div>
      </div>
    </div>
  )
}
