export function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

export function calculateTotalSeconds(checkedInAt, checkedOutAtOrNow) {
  return Math.max(0, Math.floor((new Date(checkedOutAtOrNow).getTime() - new Date(checkedInAt).getTime()) / 1000));
}

export function calculateBreakSeconds(events, effectiveEndTime) {
  let breakSeconds = 0;
  let breakStartedAt = null;
  const endTime = effectiveEndTime ? new Date(effectiveEndTime) : new Date();

  for (const event of events) {
    if (event.event_type === "break_start") {
      breakStartedAt = new Date(event.event_time);
    } else if (event.event_type === "break_end" && breakStartedAt) {
      breakSeconds += Math.max(0, (new Date(event.event_time).getTime() - breakStartedAt.getTime()) / 1000);
      breakStartedAt = null;
    }
  }

  if (breakStartedAt) {
    breakSeconds += Math.max(0, (endTime.getTime() - breakStartedAt.getTime()) / 1000);
  }

  return Math.floor(breakSeconds);
}

export function calculateActiveBreakSeconds(events) {
  let breakSeconds = 0;
  let breakStartedAt = null;

  for (const event of events) {
    if (event.event_type === "break_start") {
      breakStartedAt = new Date(event.event_time);
    } else if (event.event_type === "break_end" && breakStartedAt) {
      breakSeconds += Math.max(0, (new Date(event.event_time).getTime() - breakStartedAt.getTime()) / 1000);
      breakStartedAt = null;
    }
  }

  return { completedBreakSeconds: breakSeconds, activeBreakSeconds: breakStartedAt ? Math.floor((Date.now() - breakStartedAt.getTime()) / 1000) : 0, isOnBreak: !!breakStartedAt };
}

export function calculatePayableSeconds(checkedInAt, checkedOutAtOrNow, breakSeconds) {
  return Math.max(0, calculateTotalSeconds(checkedInAt, checkedOutAtOrNow) - breakSeconds);
}

export function calculateGrossPay(payableSeconds, hourlyRate) {
  return roundCurrency(payableSeconds / 3600 * hourlyRate);
}

export function calculateOrdinaryTime(payableSeconds, hourlyRate, payRule) {
  const overtimeAfterSecs = (payRule?.overtime_daily_after_hours || 7.6) * 3600;
  const baseSeconds = Math.min(payableSeconds, overtimeAfterSecs);
  return roundCurrency(baseSeconds / 3600 * hourlyRate);
}

export function calculateOvertime(payableSeconds, hourlyRate, payRule) {
  const overtimeAfterSecs = (payRule?.overtime_daily_after_hours || 7.6) * 3600;
  const remaining = Math.max(0, payableSeconds - overtimeAfterSecs);
  let overtimeSeconds;
  if (payRule?.double_time_after_hours != null && payRule.double_time_after_hours > 0) {
    const dtAfterSecs = payRule.double_time_after_hours * 3600;
    const otCap = Math.max(0, dtAfterSecs - overtimeAfterSecs);
    overtimeSeconds = Math.min(remaining, otCap);
  } else {
    overtimeSeconds = remaining;
  }
  return roundCurrency(overtimeSeconds / 3600 * hourlyRate * (payRule?.overtime_rate_multiplier || 1.5));
}

export function calculateDoubleTime(payableSeconds, hourlyRate, payRule) {
  const overtimeAfterSecs = (payRule?.overtime_daily_after_hours || 7.6) * 3600;
  const remaining = Math.max(0, payableSeconds - overtimeAfterSecs);
  let doubleTimeSeconds = 0;
  if (payRule?.double_time_after_hours != null && payRule.double_time_after_hours > 0) {
    const dtAfterSecs = payRule.double_time_after_hours * 3600;
    const otCap = Math.max(0, dtAfterSecs - overtimeAfterSecs);
    doubleTimeSeconds = Math.max(0, remaining - otCap);
  }
  return roundCurrency(doubleTimeSeconds / 3600 * hourlyRate * (payRule?.double_time_multiplier || 2.0));
}

export function calculatePayBreakdown(payableSeconds, hourlyRate, payRule) {
  const overtimeAfterSecs = (payRule?.overtime_daily_after_hours || 7.6) * 3600;
  const baseSeconds = Math.min(payableSeconds, overtimeAfterSecs);
  const remaining = Math.max(0, payableSeconds - overtimeAfterSecs);

  let overtimeSeconds, doubleTimeSeconds;
  if (payRule?.double_time_after_hours != null && payRule.double_time_after_hours > 0) {
    const dtAfterSecs = payRule.double_time_after_hours * 3600;
    const otCap = Math.max(0, dtAfterSecs - overtimeAfterSecs);
    overtimeSeconds = Math.min(remaining, otCap);
    doubleTimeSeconds = Math.max(0, remaining - otCap);
  } else {
    overtimeSeconds = remaining;
    doubleTimeSeconds = 0;
  }

  const basePay = roundCurrency(baseSeconds / 3600 * hourlyRate);
  const overtimePay = roundCurrency(overtimeSeconds / 3600 * hourlyRate * (payRule?.overtime_rate_multiplier || 1.5));
  const doubleTimePay = roundCurrency(doubleTimeSeconds / 3600 * hourlyRate * (payRule?.double_time_multiplier || 2.0));

  return { baseSeconds, overtimeSeconds, doubleTimeSeconds, basePay, overtimePay, doubleTimePay };
}

export function calculateTotalGrossPay(payableSeconds, hourlyRate, payRule) {
  const breakdown = calculatePayBreakdown(payableSeconds, hourlyRate, payRule);
  return roundCurrency(breakdown.basePay + breakdown.overtimePay + breakdown.doubleTimePay);
}

export function calculateLiveEstimate(checkedInAt, events, hourlyRate, payRule) {
  const now = new Date().toISOString();
  const totalSeconds = calculateTotalSeconds(checkedInAt, now);
  const breakInfo = calculateActiveBreakSeconds(events);
  const completedBreakSeconds = breakInfo.completedBreakSeconds;
  const payableSeconds = calculatePayableSeconds(checkedInAt, now, completedBreakSeconds);
  const breakdown = calculatePayBreakdown(payableSeconds, hourlyRate, payRule);
  return {
    totalSeconds,
    breakSeconds: completedBreakSeconds,
    activeBreakSeconds: breakInfo.activeBreakSeconds,
    isOnBreak: breakInfo.isOnBreak,
    payableSeconds,
    basePay: breakdown.basePay,
    overtimePay: breakdown.overtimePay,
    doubleTimePay: breakdown.doubleTimePay,
    estimatedGrossPay: roundCurrency(breakdown.basePay + breakdown.overtimePay + breakdown.doubleTimePay),
    serverNow: now,
  };
}

export function calculateFinalApprovedPay(payableSeconds, hourlyRate, payRule) {
  return calculateTotalGrossPay(payableSeconds, hourlyRate, payRule);
}

export function validatePayRules(rules) {
  const errors = [];
  if (!rules) return ['Pay rules are required'];
  if (rules.overtime_daily_after_hours != null && rules.overtime_daily_after_hours < 0) {
    errors.push('Overtime threshold must be >= 0');
  }
  if (rules.overtime_rate_multiplier != null && rules.overtime_rate_multiplier <= 0) {
    errors.push('Overtime multiplier must be > 0');
  }
  if (rules.double_time_after_hours != null && rules.double_time_after_hours < 0) {
    errors.push('Double time threshold must be >= 0');
  }
  if (rules.double_time_multiplier != null && rules.double_time_multiplier <= 0) {
    errors.push('Double time multiplier must be > 0');
  }
  if (rules.double_time_after_hours != null && rules.double_time_after_hours > 0 &&
      rules.overtime_daily_after_hours != null && rules.double_time_after_hours <= rules.overtime_daily_after_hours) {
    errors.push('Double time threshold must be after overtime threshold');
  }
  if (rules.hourly_rate != null && rules.hourly_rate <= 0) {
    errors.push('Hourly rate must be > 0');
  }
  return errors;
}

export function validateEventOrder(events) {
  if (!events || events.length === 0) return { valid: true, errors: [] };
  const errors = [];
  const sorted = [...events].sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
  let state = 'none';
  let breakStartCount = 0;
  let breakEndCount = 0;
  let checkInCount = 0;
  let checkOutCount = 0;

  for (const event of sorted) {
    if (event.event_type === 'check_in') {
      checkInCount++;
      if (state !== 'none') errors.push('Duplicate check_in or out of order');
      state = 'active';
    } else if (event.event_type === 'break_start') {
      if (state !== 'active') errors.push('break_start without active shift');
      state = 'on_break';
      breakStartCount++;
    } else if (event.event_type === 'break_end') {
      if (state !== 'on_break') errors.push('break_end without matching break_start');
      state = 'active';
      breakEndCount++;
    } else if (event.event_type === 'check_out' || event.event_type === 'auto_check_out') {
      checkOutCount++;
      state = 'pending_approval';
    }
  }

  if (checkInCount > 1) errors.push('Multiple check_in events');
  if (checkOutCount > 1) errors.push('Multiple check_out events');
  if (breakStartCount < breakEndCount) errors.push('Unmatched break_end');
  if (breakStartCount > breakEndCount) errors.push('Unmatched break_start');

  return { valid: errors.length === 0, errors };
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function formatCurrency(amount) {
  if (amount == null) return '$0.00';
  return `$${Math.abs(amount).toFixed(2)}`;
}
