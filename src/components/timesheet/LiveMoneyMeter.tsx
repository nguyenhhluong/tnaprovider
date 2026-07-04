import { useLiveTimer } from "../../hooks/useLiveTimer"
import { formatDuration, formatMoney, formatShiftDate } from "../../lib/timesheet/calculate"
import { BreakControl } from "./BreakControl"
import { Clock, DollarSign, Timer, Coffee } from "lucide-react"

interface LiveMoneyMeterProps {
  shift: {
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
  onStartBreak: () => void
  onEndBreak: () => void
  onCheckOut: () => void
  breakLoading: boolean
}

export function LiveMoneyMeter({ shift, onStartBreak, onEndBreak, onCheckOut, breakLoading }: LiveMoneyMeterProps) {
  const { totalSeconds, payableSeconds, gross } = useLiveTimer({
    checkedInAt: shift.checkedInAt,
    hourlyRateSnapshot: shift.hourlyRateSnapshot,
    breakSeconds: shift.breakSeconds,
    status: shift.status,
    currentBreakStartedAt: shift.currentBreakStartedAt,
    serverNow: shift.serverNow,
  })

  const isOnBreak = shift.status === "on_break"

  return (
    <div className="max-w-md mx-auto mt-4 space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {formatShiftDate(shift.checkedInAt, shift.timezone)}
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              {shift.site?.name || "No site"}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {isOnBreak ? "Earning Paused" : "Estimated Gross Earned"}
            </p>
            <p className={`text-4xl font-bold tabular-nums ${isOnBreak ? "text-gray-400" : "text-green-600 dark:text-green-400"}`}>
              {formatMoney(gross)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Worked
              </p>
              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {formatDuration(totalSeconds)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                Break
              </p>
              <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                {formatDuration(isOnBreak ? totalSeconds - payableSeconds : shift.breakSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <DollarSign className="w-3.5 h-3.5" />
            Current rate: {formatMoney(shift.hourlyRateSnapshot)}/hour
          </div>
        </div>

        <div className="px-6 pb-6 space-y-2">
          <BreakControl
            status={shift.status}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            loading={breakLoading}
          />

          <button
            onClick={onCheckOut}
            disabled={isOnBreak}
            className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors"
          >
            Check Out
          </button>
        </div>
      </div>
    </div>
  )
}
