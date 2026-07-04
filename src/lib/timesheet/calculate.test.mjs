import {
  calculateBreakSeconds,
  calculatePayableSeconds,
  calculateGrossPay,
  calculateTotalSeconds,
  formatDuration,
  formatDurationShort,
  formatMoney,
  calculateLiveEarning,
  getAdjustedNow,
} from "./calculate.ts"

let passed = 0
let failed = 0

function assert(condition, name) {
  if (condition) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name}`)
  }
}

function assertCloseTo(actual, expected, tolerance, name) {
  const diff = Math.abs(actual - expected)
  if (diff <= tolerance) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name} — expected ${expected} ±${tolerance}, got ${actual}`)
  }
}

console.log("\ncalculateBreakSeconds")
assert(calculateBreakSeconds([]) === 0, "empty events returns 0")

const break1 = [
  { event_type: "break_start", event_time: "2026-07-04T10:00:00Z" },
  { event_type: "break_end", event_time: "2026-07-04T10:30:00Z" },
]
assert(calculateBreakSeconds(break1) === 1800, "single 30min break")

const break2 = [
  { event_type: "break_start", event_time: "2026-07-04T10:00:00Z" },
  { event_type: "break_end", event_time: "2026-07-04T10:30:00Z" },
  { event_type: "break_start", event_time: "2026-07-04T12:00:00Z" },
  { event_type: "break_end", event_time: "2026-07-04T12:15:00Z" },
]
assert(calculateBreakSeconds(break2) === 2700, "multiple breaks total 45min")

const orphanEnd = [{ event_type: "break_end", event_time: "2026-07-04T10:30:00Z" }]
assert(calculateBreakSeconds(orphanEnd) === 0, "orphan break_end ignored")

const activeBreak = [
  { event_type: "break_start", event_time: "2026-07-04T10:00:00Z" },
]
const now = new Date("2026-07-04T10:15:00Z")
assert(calculateBreakSeconds(activeBreak, now) === 900, "active break with now")

console.log("\ncalculatePayableSeconds")
assert(calculatePayableSeconds("2026-07-04T07:00:00Z", "2026-07-04T15:00:00Z", 0) === 28800, "8h shift no break")
assert(calculatePayableSeconds("2026-07-04T07:00:00Z", "2026-07-04T15:00:00Z", 1800) === 27000, "8h shift with 30min break")

console.log("\ncalculateTotalSeconds")
assert(calculateTotalSeconds("2026-07-04T07:00:00Z", "2026-07-04T15:00:00Z") === 28800, "8h total")

console.log("\ncalculateGrossPay")
assertCloseTo(calculateGrossPay(28800, 38.5), 308.0, 0.01, "8h at $38.50 = $308.00")
assertCloseTo(calculateGrossPay(27000, 38.5), 288.75, 0.01, "7.5h at $38.50 = $288.75")

console.log("\ncalculateLiveEarning")
const liveResult = calculateLiveEarning({
  checkedInAt: "2026-07-04T07:00:00Z",
  hourlyRateSnapshot: 38.5,
  breakSeconds: 1800,
  status: "active",
  currentBreakStartedAt: null,
  adjustedNow: new Date("2026-07-04T15:00:00Z").getTime(),
})
assert(liveResult.totalSeconds === 28800, "total seconds correct")
assert(liveResult.payableSeconds === 27000, "payable seconds correct")
assertCloseTo(liveResult.gross, 288.75, 0.01, "gross correct")

const breakLiveResult = calculateLiveEarning({
  checkedInAt: "2026-07-04T07:00:00Z",
  hourlyRateSnapshot: 38.5,
  breakSeconds: 0,
  status: "on_break",
  currentBreakStartedAt: "2026-07-04T10:00:00Z",
  adjustedNow: new Date("2026-07-04T10:15:00Z").getTime(),
})
assert(breakLiveResult.activeBreakSeconds === 900, "active break 15min")
assert(breakLiveResult.payableSeconds === 10800, "earning paused — 3h payable, 15min unpaid")

console.log("\ngetAdjustedNow")
const serverNow = new Date().toISOString()
const clientReceivedAt = Date.now()
const adjusted = getAdjustedNow(serverNow, clientReceivedAt)
assert(Math.abs(adjusted - Date.now()) < 2000, "adjusted now close to Date.now()")

console.log("\nformatDuration")
assert(formatDuration(3661) === "01:01:01", "3661s = 01:01:01")
assert(formatDuration(0) === "00:00:00", "0s = 00:00:00")

console.log("\nformatDurationShort")
assert(formatDurationShort(28800) === "8h 0m", "28800s = 8h 0m")
assert(formatDurationShort(1800) === "30m", "1800s = 30m")

console.log("\nformatMoney")
assert(formatMoney(308) === "$308.00", "$308.00")
assert(formatMoney(288.75) === "$288.75", "$288.75")

console.log(`\n${"=".repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${"=".repeat(40)}`)

process.exit(failed > 0 ? 1 : 0)
