import { useState, useEffect, useRef, useCallback } from "react"
import { getAdjustedNow, calculateLiveEarning } from "../lib/timesheet/calculate"

export interface LiveTimerState {
  totalSeconds: number
  payableSeconds: number
  gross: number
  adjustedNow: number
}

export function useLiveTimer(params: {
  checkedInAt: string | null
  hourlyRateSnapshot: number
  breakSeconds: number
  status: string
  currentBreakStartedAt: string | null
  serverNow: string | null
}) {
  const { checkedInAt, hourlyRateSnapshot, breakSeconds, status, currentBreakStartedAt, serverNow } = params

  const clientReceivedAt = useRef(Date.now())
  const [state, setState] = useState<LiveTimerState>({
    totalSeconds: 0,
    payableSeconds: 0,
    gross: 0,
    adjustedNow: Date.now(),
  })

  const tick = useCallback(() => {
    if (!checkedInAt) return

    const adjustedNow = serverNow
      ? getAdjustedNow(serverNow, clientReceivedAt.current)
      : Date.now()

    const result = calculateLiveEarning({
      checkedInAt,
      hourlyRateSnapshot,
      breakSeconds,
      status,
      currentBreakStartedAt,
      adjustedNow,
    })

    setState({
      totalSeconds: result.totalSeconds,
      payableSeconds: result.payableSeconds,
      gross: result.gross,
      adjustedNow,
    })
  }, [checkedInAt, hourlyRateSnapshot, breakSeconds, status, currentBreakStartedAt, serverNow])

  useEffect(() => {
    if (!checkedInAt) return
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tick, checkedInAt])

  return state
}
