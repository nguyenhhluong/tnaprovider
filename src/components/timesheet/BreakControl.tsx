import { Play, Pause, Coffee } from "lucide-react"

export function BreakControl({
  status,
  onStartBreak,
  onEndBreak,
  loading,
}: {
  status: string
  onStartBreak: () => void
  onEndBreak: () => void
  loading: boolean
}) {
  if (status === "on_break") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <Coffee className="w-4 h-4" />
          On Break
        </div>
        <button
          onClick={onEndBreak}
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          {loading ? "Resuming..." : "End Break"}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onStartBreak}
      disabled={loading}
      className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
    >
      <Pause className="w-4 h-4" />
      {loading ? "Starting Break..." : "Start Break"}
    </button>
  )
}
