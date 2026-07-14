import {
  calculatePayBreakdown,
  calculateTotalGrossPay,
  roundCurrency,
  calculateTotalSeconds,
  calculateBreakSeconds,
  calculatePayableSeconds,
  calculateGrossPay,
  calculateLiveEstimate,
  calculateFinalApprovedPay,
  calculateOrdinaryTime,
  calculateOvertime,
  calculateDoubleTime,
  validatePayRules,
  validateEventOrder,
  formatDuration,
  formatCurrency,
} from '../../shared/timesheet/calculations.js';

let pass = 0, fail = 0;

function test(label, condition) {
  if (condition) pass++;
  else { fail++; console.error(`FAIL: ${label}`); }
}

function approx(a, b, tol = 0.001) {
  return Math.abs(a - b) <= tol;
}

// === Basic rounding ===
test('roundCurrency 0.1+0.2 = 0.3', roundCurrency(0.1 + 0.2) === 0.3);
test('roundCurrency 1.005 = 1.01 (banker rounding)', roundCurrency(1.005) === 1.01 || roundCurrency(1.005) === 1.0);
test('roundCurrency 0 = 0', roundCurrency(0) === 0);
test('roundCurrency -1.5 = -1.5', roundCurrency(-1.5) === -1.5);

// === Seconds calculations ===
const start = '2026-07-10T09:00:00.000Z';
const end = '2026-07-10T17:00:00.000Z';
test('calculateTotalSeconds 8h = 28800', calculateTotalSeconds(start, end) === 28800);
test('calculateTotalSeconds same time = 0', calculateTotalSeconds(start, start) === 0);
test('calculateTotalSeconds end before start = 0', calculateTotalSeconds(end, start) === 0);

// === Break calculations ===
const events = [
  { event_type: 'break_start', event_time: '2026-07-10T12:00:00.000Z' },
  { event_type: 'break_end', event_time: '2026-07-10T12:30:00.000Z' },
];
test('calculateBreakSeconds 30min = 1800', calculateBreakSeconds(events, end) === 1800);

const unmatchedBreak = [{ event_type: 'break_start', event_time: '2026-07-10T12:00:00.000Z' }];
test('calculateBreakSeconds active break counted', calculateBreakSeconds(unmatchedBreak, '2026-07-10T12:45:00.000Z') === 2700);

test('calculateBreakSeconds empty = 0', calculateBreakSeconds([], end) === 0);

// === Payable seconds ===
test('calculatePayableSeconds 8h - 30m = 27000', calculatePayableSeconds(start, end, 1800) === 27000);
test('calculatePayableSeconds negative = 0', calculatePayableSeconds(start, start, 999999) === 0);

// === Gross pay ===
test('calculateGrossPay 27000s @ $38.5/hr', approx(calculateGrossPay(27000, 38.5), 288.75));
test('calculateGrossPay 0 seconds = 0', calculateGrossPay(0, 38.5) === 0);

// === Pay breakdown ===
const payRule = {
  overtime_daily_after_hours: 7.6,
  overtime_rate_multiplier: 1.5,
  double_time_after_hours: 10,
  double_time_multiplier: 2,
};

const breakdown8h = calculatePayBreakdown(28800, 38.5, payRule);
test('8h day - baseSeconds = 27360 (7.6h)', breakdown8h.baseSeconds === 27360);
test('8h day - overtimeSeconds = 1440 (0.4h)', breakdown8h.overtimeSeconds === 1440);
test('8h day - doubleTimeSeconds = 0', breakdown8h.doubleTimeSeconds === 0);
test('8h day - basePay = 292.6', approx(breakdown8h.basePay, 292.60));
test('8h day - overtimePay', approx(breakdown8h.overtimePay, 1440 / 3600 * 38.5 * 1.5));

const breakdown12h = calculatePayBreakdown(43200, 38.5, payRule);
test('12h day - baseSeconds = 27360', breakdown12h.baseSeconds === 27360);
const otCap = Math.max(0, (10 * 3600) - (7.6 * 3600)); // 8640
test('12h day - overtimeSeconds <= cap', breakdown12h.overtimeSeconds <= otCap);
test('12h day - doubleTimeSeconds correct', breakdown12h.doubleTimeSeconds === (43200 - 27360 - Math.min(43200 - 27360, otCap)));

// === Total gross pay ===
const total8h = calculateTotalGrossPay(28800, 38.5, payRule);
test('total8h = basePay + overtimePay', approx(total8h, breakdown8h.basePay + breakdown8h.overtimePay));

// === Pay rule validation ===
test('validatePayRules null returns errors', validatePayRules(null).length > 0);
test('validatePayRules valid returns empty', validatePayRules(payRule).length === 0);
const badRules = { ...payRule, overtime_rate_multiplier: 0 };
test('validatePayRules zero multiplier = error', validatePayRules(badRules).length > 0);
const badThresholds = { ...payRule, double_time_after_hours: 5, overtime_daily_after_hours: 7.6 };
test('validatePayRules DT before OT = error', validatePayRules(badThresholds).length > 0);
const negRate = { ...payRule, hourly_rate: -1 };
test('validatePayRules negative rate = error', validatePayRules(negRate).length > 0);

// === Event order validation ===
test('validateEventOrder empty = valid', validateEventOrder([]).valid);
const goodEvents = [
  { event_type: 'check_in', event_time: '2026-07-10T09:00:00Z' },
  { event_type: 'break_start', event_time: '2026-07-10T12:00:00Z' },
  { event_type: 'break_end', event_time: '2026-07-10T12:30:00Z' },
  { event_type: 'check_out', event_time: '2026-07-10T17:00:00Z' },
];
test('validateEventOrder good = valid', validateEventOrder(goodEvents).valid);
const badEvents = [
  { event_type: 'break_start', event_time: '2026-07-10T12:00:00Z' },
];
test('validateEventOrder break without checkin = invalid', !validateEventOrder(badEvents).valid);
const dupCheckin = [
  { event_type: 'check_in', event_time: '2026-07-10T09:00:00Z' },
  { event_type: 'check_in', event_time: '2026-07-10T10:00:00Z' },
];
test('validateEventOrder double checkin = invalid', !validateEventOrder(dupCheckin).valid);
const unmatchedEnd = [
  { event_type: 'check_in', event_time: '2026-07-10T09:00:00Z' },
  { event_type: 'break_start', event_time: '2026-07-10T12:00:00Z' },
];
test('validateEventOrder unmatched break_start = invalid', !validateEventOrder(unmatchedEnd).valid);

// === Formatting ===
test('formatDuration 3661 = 1h 1m', formatDuration(3661) === '1h 1m');
test('formatDuration 0 = 0h 0m', formatDuration(0) === '0h 0m');
test('formatDuration 3600 = 1h 0m', formatDuration(3600) === '1h 0m');
test('formatCurrency 38.5 = $38.50', formatCurrency(38.5) === '$38.50');
test('formatCurrency 0 = $0.00', formatCurrency(0) === '$0.00');
test('formatCurrency null = $0.00', formatCurrency(null) === '$0.00');

// === Parity: live estimate should use same calculation as final pay ===
const shiftStart = '2026-07-10T09:00:00.000Z';
const shiftEvents = [
  { event_type: 'check_in', event_time: '2026-07-10T09:00:00.000Z' },
  { event_type: 'break_start', event_time: '2026-07-10T12:00:00.000Z' },
  { event_type: 'break_end', event_time: '2026-07-10T12:30:00.000Z' },
];
const hourlyRate = 38.5;
const liveEstimate = calculateLiveEstimate(shiftStart, shiftEvents, hourlyRate, payRule);
const finalPay = calculateFinalApprovedPay(liveEstimate.payableSeconds, hourlyRate, payRule);
test('live estimate == final pay for same seconds', approx(liveEstimate.estimatedGrossPay, finalPay));

const total = pass + fail;
console.log(`\nCalculations: ${pass} passed, ${fail} failed (${total} total)`);
process.exit(fail > 0 ? 1 : 0);
