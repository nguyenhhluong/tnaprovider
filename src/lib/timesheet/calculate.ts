export interface ShiftEvent {
  id?: string
  shift_session_id?: string
  employee_id?: string
  event_type: "check_in" | "break_start" | "break_end" | "check_out" | "auto_check_out" | "correction_requested" | "admin_approved" | "admin_rejected"
  event_time: string
  source?: string
}

export function calculateBreakSeconds(events: ShiftEvent[], now?: Date): number {
  const sorted = [...events].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  )

  let breakSeconds = 0
  let breakStartedAt: Date | null = null

  for (const event of sorted) {
    if (event.event_type === "break_start") {
      breakStartedAt = new Date(event.event_time)
    } else if (event.event_type === "break_end" && breakStartedAt) {
      const duration = (new Date(event.event_time).getTime() - breakStartedAt.getTime()) / 1000
      breakSeconds += Math.max(0, duration)
      breakStartedAt = null
    }
  }

  if (breakStartedAt) {
    const endTime = now || new Date()
    const duration = (endTime.getTime() - breakStartedAt.getTime()) / 1000
    breakSeconds += Math.max(0, duration)
  }

  return Math.floor(breakSeconds)
}

export function calculatePayableSeconds(
  checkedInAt: string | Date,
  checkedOutAtOrNow: string | Date,
  breakSeconds: number
): number {
  const start = new Date(checkedInAt).getTime()
  const end = new Date(checkedOutAtOrNow).getTime()
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000))
  return Math.max(0, totalSeconds - breakSeconds)
}

export function calculateTotalSeconds(
  checkedInAt: string | Date,
  checkedOutAtOrNow: string | Date
): number {
  const start = new Date(checkedInAt).getTime()
  const end = new Date(checkedOutAtOrNow).getTime()
  return Math.max(0, Math.floor((end - start) / 1000))
}

export function calculateGrossPay(payableSeconds: number, hourlyRate: number): number {
  return payableSeconds / 3600 * hourlyRate
}

export interface PayRule {
  ordinary_hours_per_day: number
  overtime_daily_after_hours: number
  overtime_rate_multiplier: number
  double_time_after_hours: number | null
  double_time_multiplier: number
}

export interface PayBreakdown {
  totalSeconds: number
  baseSeconds: number
  overtimeSeconds: number
  doubleTimeSeconds: number
  basePay: number
  overtimePay: number
  doubleTimePay: number
  totalPay: number
  hourlyRateSnapshot: number
}

export function calculatePayBreakdown(
  payableSeconds: number,
  hourlyRate: number,
  payRule: PayRule
): PayBreakdown {
  const overtimeAfterSecs = payRule.overtime_daily_after_hours * 3600

  const baseSeconds = Math.min(payableSeconds, overtimeAfterSecs)
  const remaining = Math.max(0, payableSeconds - overtimeAfterSecs)

  let overtimeSeconds: number
  let doubleTimeSeconds: number

  if (payRule.double_time_after_hours != null && payRule.double_time_after_hours > 0) {
    const dtAfterSecs = payRule.double_time_after_hours * 3600
    const otCap = Math.max(0, dtAfterSecs - overtimeAfterSecs)
    overtimeSeconds = Math.min(remaining, otCap)
    doubleTimeSeconds = Math.max(0, remaining - otCap)
  } else {
    overtimeSeconds = remaining
    doubleTimeSeconds = 0
  }

  const basePay = baseSeconds / 3600 * hourlyRate
  const overtimePay = overtimeSeconds / 3600 * hourlyRate * payRule.overtime_rate_multiplier
  const doubleTimePay = doubleTimeSeconds / 3600 * hourlyRate * payRule.double_time_multiplier

  return {
    totalSeconds: payableSeconds,
    baseSeconds,
    overtimeSeconds,
    doubleTimeSeconds,
    basePay,
    overtimePay,
    doubleTimePay,
    totalPay: basePay + overtimePay + doubleTimePay,
    hourlyRateSnapshot: hourlyRate,
  }
}

export interface LiveShiftSnapshot {
  status: string
  shiftDateLabel: string
  checkedInAt: string
  checkedOutAt: string | null
  totalSeconds: number
  breakSeconds: number
  payableSeconds: number
  estimatedGrossPay: number
  hourlyRateSnapshot: number
  isOnBreak: boolean
  currentBreakStartedAt: string | null
}

export function formatShiftDate(date: string | Date, timezone: string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  })
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export function formatDurationShort(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getLiveShiftSnapshot(
  shift: {
    status: string
    checked_in_at: string
    checked_out_at?: string | null
    hourly_rate_snapshot: number
    timezone: string
    break_seconds: number
  },
  events: ShiftEvent[],
  now: Date
): LiveShiftSnapshot {
  const checkedOutAt = shift.checked_out_at || now.toISOString()
  const totalSeconds = calculateTotalSeconds(shift.checked_in_at, checkedOutAt)
  const breakSeconds = calculateBreakSeconds(events, now)
  const isOnBreak = shift.status === "on_break"

  const currentBreakEvent = isOnBreak
    ? [...events].reverse().find(e => e.event_type === "break_start")
    : null

  return {
    status: shift.status,
    shiftDateLabel: formatShiftDate(shift.checked_in_at, shift.timezone),
    checkedInAt: shift.checked_in_at,
    checkedOutAt: shift.checked_out_at || null,
    totalSeconds,
    breakSeconds,
    payableSeconds: calculatePayableSeconds(shift.checked_in_at, checkedOutAt, breakSeconds),
    estimatedGrossPay: calculateGrossPay(
      calculatePayableSeconds(shift.checked_in_at, checkedOutAt, breakSeconds),
      shift.hourly_rate_snapshot
    ),
    hourlyRateSnapshot: shift.hourly_rate_snapshot,
    isOnBreak,
    currentBreakStartedAt: currentBreakEvent ? currentBreakEvent.event_time : null,
  }
}

export function getAdjustedNow(serverNow: string, clientReceivedAt: number): number {
  const offset = new Date(serverNow).getTime() - clientReceivedAt
  return Date.now() + offset
}

export function calculateLiveEarning(params: {
  checkedInAt: string
  hourlyRateSnapshot: number
  breakSeconds: number
  status: string
  currentBreakStartedAt: string | null
  adjustedNow: number
}) {
  const { checkedInAt, hourlyRateSnapshot, breakSeconds, status, currentBreakStartedAt, adjustedNow } = params
  const totalSeconds = Math.max(0, Math.floor((adjustedNow - new Date(checkedInAt).getTime()) / 1000))

  let activeBreakSeconds = 0
  if (status === "on_break" && currentBreakStartedAt) {
    activeBreakSeconds = Math.max(0, Math.floor((adjustedNow - new Date(currentBreakStartedAt).getTime()) / 1000))
  }

  const payableSeconds = Math.max(0, totalSeconds - breakSeconds - activeBreakSeconds)
  const gross = payableSeconds / 3600 * hourlyRateSnapshot

  return { totalSeconds, activeBreakSeconds, payableSeconds, gross }
}
