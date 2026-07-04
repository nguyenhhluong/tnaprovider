import { Clock, LogIn, LogOut, Coffee, Play, CheckCircle, XCircle } from "lucide-react"

interface TimelineEvent {
  event_type: string
  event_time: string
}

const eventConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  check_in: { icon: <LogIn className="w-3.5 h-3.5" />, label: "Checked in", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  break_start: { icon: <Coffee className="w-3.5 h-3.5" />, label: "Break started", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  break_end: { icon: <Play className="w-3.5 h-3.5" />, label: "Break ended", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  check_out: { icon: <LogOut className="w-3.5 h-3.5" />, label: "Checked out", color: "text-gray-600 bg-gray-50 dark:bg-gray-900/20" },
  auto_check_out: { icon: <Clock className="w-3.5 h-3.5" />, label: "Auto checked out", color: "text-gray-600 bg-gray-50 dark:bg-gray-900/20" },
  admin_approved: { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Approved", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  admin_rejected: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Rejected", color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
}

export function ShiftTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) return null

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const config = eventConfig[event.event_type] || {
          icon: <Clock className="w-3.5 h-3.5" />,
          label: event.event_type,
          color: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
        }
        return (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{config.label}</p>
            </div>
            <span className="text-sm text-gray-500">{formatTime(event.event_time)}</span>
          </div>
        )
      })}
    </div>
  )
}
