import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requirePasswordChanged);
// Block clients from timesheet routes (they have client portal for their needs)
router.use((req, res, next) => {
  if (req.user.role === "client") return res.status(403).json({ error: "Access denied" });
  next();
});

function getEmployee(db, userId) {
  const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  return user;
}

function getEmployeeRate(db, userId) {
  const user = db.prepare("SELECT hourly_rate FROM users WHERE id = ?").get(userId);
  return user?.hourly_rate ?? null;
}
function getActivePayRule(db) {
  return db.prepare("SELECT * FROM company_pay_rules WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get();
}

function calculatePayBreakdownServer(payableSeconds, hourlyRate, payRule) {
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

  const basePay = baseSeconds / 3600 * hourlyRate;
  const overtimePay = overtimeSeconds / 3600 * hourlyRate * (payRule?.overtime_rate_multiplier || 1.5);
  const doubleTimePay = doubleTimeSeconds / 3600 * hourlyRate * (payRule?.double_time_multiplier || 2.0);

  return { baseSeconds, overtimeSeconds, doubleTimeSeconds, basePay, overtimePay, doubleTimePay };
}

function recalculateShift(db, shiftId) {
  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return null;

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);

  const totalSeconds = calculateTotalSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString());
  const breakSeconds = calculateBreakSeconds(events);
  const payableSeconds = calculatePayableSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString(), breakSeconds);
  const estimatedGrossPay = calculateGrossPay(payableSeconds, shift.hourly_rate_snapshot);

  // Compute pay breakdown
  const payRule = getActivePayRule(db);
  const breakdown = calculatePayBreakdownServer(payableSeconds, shift.hourly_rate_snapshot, payRule);

  db.prepare(`
    UPDATE shift_sessions
    SET total_seconds = ?, break_seconds = ?, payable_seconds = ?, estimated_gross_pay = ?,
        base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?,
        base_pay = ?, overtime_pay = ?, double_time_pay = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(totalSeconds, breakSeconds, payableSeconds, estimatedGrossPay,
    breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds,
    breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay,
    shiftId);

  return { ...shift, total_seconds: totalSeconds, break_seconds: breakSeconds, payable_seconds: payableSeconds, estimated_gross_pay: estimatedGrossPay, ...breakdown };
}

function calculateBreakSeconds(events) {
  let breakSeconds = 0;
  let breakStartedAt = null;
  const now = new Date();

  for (const event of events) {
    if (event.event_type === "break_start") {
      breakStartedAt = new Date(event.event_time);
    } else if (event.event_type === "break_end" && breakStartedAt) {
      breakSeconds += Math.max(0, (new Date(event.event_time).getTime() - breakStartedAt.getTime()) / 1000);
      breakStartedAt = null;
    }
  }

  if (breakStartedAt) {
    breakSeconds += Math.max(0, (now.getTime() - breakStartedAt.getTime()) / 1000);
  }

  return Math.floor(breakSeconds);
}

function calculateTotalSeconds(checkedInAt, checkedOutAtOrNow) {
  return Math.max(0, Math.floor((new Date(checkedOutAtOrNow).getTime() - new Date(checkedInAt).getTime()) / 1000));
}

function calculatePayableSeconds(checkedInAt, checkedOutAtOrNow, breakSeconds) {
  return Math.max(0, calculateTotalSeconds(checkedInAt, checkedOutAtOrNow) - breakSeconds);
}

function calculateGrossPay(payableSeconds, hourlyRate) {
  return payableSeconds / 3600 * hourlyRate;
}

// ── Get active shift ──

router.get("/active", (req, res) => {
  const db = getDb();
  const shift = db.prepare("SELECT * FROM shift_sessions WHERE employee_id = ? AND status IN ('active','on_break') ORDER BY checked_in_at DESC LIMIT 1").get(req.user.userId);

  if (!shift) {
    return res.json({ active: false, serverNow: new Date().toISOString() });
  }

  const site = shift.site_id ? db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(shift.site_id) : null;
  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shift.id);

  const currentBreakEvent = shift.status === "on_break"
    ? [...events].reverse().find(e => e.event_type === "break_start")
    : null;

  return res.json({
    active: true,
    shift: {
      id: shift.id,
      status: shift.status,
      checkedInAt: shift.checked_in_at,
      checkedOutAt: shift.checked_out_at,
      hourlyRateSnapshot: shift.hourly_rate_snapshot,
      timezone: shift.timezone,
      site: site || null,
      breakSeconds: shift.break_seconds || 0,
      currentBreakStartedAt: currentBreakEvent ? currentBreakEvent.event_time : null,
      serverNow: new Date().toISOString(),
    },
  });
});

// ── Check in ──

router.post("/check-in", (req, res) => {
  const db = getDb();
  const { siteId } = req.body || {};

  const existingActive = db.prepare("SELECT * FROM shift_sessions WHERE employee_id = ? AND status IN ('active','on_break') LIMIT 1").get(req.user.userId);
  if (existingActive) {
    const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(existingActive.id);
    const currentBreakEvent = existingActive.status === "on_break"
      ? [...events].reverse().find(e => e.event_type === "break_start")
      : null;

    const site = existingActive.site_id ? db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(existingActive.site_id) : null;

    return res.json({
      active: true,
      existing: true,
      shift: {
        id: existingActive.id,
        status: existingActive.status,
        checkedInAt: existingActive.checked_in_at,
        checkedOutAt: existingActive.checked_out_at,
        hourlyRateSnapshot: existingActive.hourly_rate_snapshot,
        timezone: existingActive.timezone,
        site: site || null,
        breakSeconds: existingActive.break_seconds || 0,
        currentBreakStartedAt: currentBreakEvent ? currentBreakEvent.event_time : null,
        serverNow: new Date().toISOString(),
      },
    });
  }

  const hourlyRate = getEmployeeRate(db, req.user.userId);
  if (hourlyRate === null || hourlyRate === undefined || typeof hourlyRate !== "number" || hourlyRate <= 0) {
    return res.status(400).json({ error: "Hourly rate is not configured. Please contact admin before checking in." });
  }
  const now = new Date().toISOString();
  const shiftId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const siteTimezone = siteId ? (db.prepare("SELECT timezone FROM work_sites WHERE id = ?").get(siteId)?.timezone || "Australia/Sydney") : "Australia/Sydney";

  db.prepare(`
    INSERT INTO shift_sessions (id, employee_id, site_id, status, checked_in_at, hourly_rate_snapshot, timezone, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(shiftId, req.user.userId, siteId || null, now, hourlyRate, siteTimezone, now, now);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'check_in', ?, 'web', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  const site = siteId ? db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(siteId) : null;

  res.status(201).json({
    active: true,
    existing: false,
    shift: {
      id: shiftId,
      status: "active",
      checkedInAt: now,
      checkedOutAt: null,
      hourlyRateSnapshot: hourlyRate,
      timezone: siteTimezone,
      site: site || null,
      breakSeconds: 0,
      currentBreakStartedAt: null,
      serverNow: now,
    },
  });
});

// ── Start break ──

router.post("/:shiftId/break/start", (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, req.user.userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  if (shift.status !== "active") return res.status(400).json({ error: "Shift is not active" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  db.prepare("UPDATE shift_sessions SET status = 'on_break', updated_at = datetime('now') WHERE id = ?").run(shiftId);
  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'break_start', ?, 'web', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  res.json({ status: "on_break", currentBreakStartedAt: now, serverNow: now });
});

// ── End break ──

router.post("/:shiftId/break/end", (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, req.user.userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  if (shift.status !== "on_break") return res.status(400).json({ error: "Shift is not on break" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  db.prepare("UPDATE shift_sessions SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(shiftId);
  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'break_end', ?, 'web', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  const recalculated = recalculateShift(db, shiftId);

  res.json({ status: "active", breakSeconds: recalculated?.break_seconds || 0, serverNow: now });
});

// ── Check out ──

router.post("/:shiftId/check-out", (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, req.user.userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  if (shift.status !== "active" && shift.status !== "on_break") return res.status(400).json({ error: "Shift cannot be checked out" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);

  let breakSeconds = calculateBreakSeconds(events);

  const totalSeconds = calculateTotalSeconds(shift.checked_in_at, now);
  const payableSeconds = calculatePayableSeconds(shift.checked_in_at, now, breakSeconds);
  const grossPay = calculateGrossPay(payableSeconds, shift.hourly_rate_snapshot);

  // Compute pay breakdown
  const payRule = getActivePayRule(db);
  const breakdown = calculatePayBreakdownServer(payableSeconds, shift.hourly_rate_snapshot, payRule);

  db.prepare(`
    UPDATE shift_sessions
    SET status = 'pending_approval', checked_out_at = ?, total_seconds = ?, break_seconds = ?,
        payable_seconds = ?, estimated_gross_pay = ?,
        base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?,
        base_pay = ?, overtime_pay = ?, double_time_pay = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(now, totalSeconds, breakSeconds, payableSeconds, grossPay,
    breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds,
    breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay,
    shiftId);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'check_out', ?, 'web', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  const site = shift.site_id ? db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(shift.site_id) : null;

  res.json({
    completed: true,
    summary: {
      id: shiftId,
      checkedInAt: shift.checked_in_at,
      checkedOutAt: now,
      totalSeconds,
      breakSeconds,
      payableSeconds,
      estimatedGrossPay: grossPay,
      hourlyRateSnapshot: shift.hourly_rate_snapshot,
      site: site || null,
      timezone: shift.timezone,
    },
  });
});

// ── History ──

router.get("/history", (req, res) => {
  const db = getDb();
  const shifts = db.prepare(`
    SELECT s.*, w.name as site_name
    FROM shift_sessions s
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.employee_id = ?
    ORDER BY s.checked_in_at DESC
    LIMIT 50
  `).all(req.user.userId);

  res.json(shifts);
});

// ── Admin: pending shifts ──

router.get("/admin/pending", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const shifts = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.status = 'pending_approval'
    ORDER BY s.checked_in_at DESC
  `).all();

  res.json(shifts);
});

// ── Admin: active workers ──

router.get("/admin/active", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const active = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.status IN ('active','on_break')
    ORDER BY s.checked_in_at DESC
  `).all();

  res.json(active);
});

// ── Admin: shift detail ──

router.get("/admin/:shiftId", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.id = ?
  `).get(shiftId);

  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);
  const allowances = db.prepare("SELECT * FROM shift_allowances WHERE shift_session_id = ? ORDER BY created_at ASC").all(shiftId);

  res.json({ shift, events, allowances });
});

// ── Admin: approve ──

router.post("/admin/:shiftId/approve", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);
  const breakSeconds = calculateBreakSeconds(events);
  const totalSeconds = calculateTotalSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString());
  const payableSeconds = calculatePayableSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString(), breakSeconds);
  const finalGrossPay = calculateGrossPay(payableSeconds, shift.hourly_rate_snapshot);

  // Compute pay breakdown
  const payRule = getActivePayRule(db);
  const breakdown = calculatePayBreakdownServer(payableSeconds, shift.hourly_rate_snapshot, payRule);

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  // Sum allowances
  const allowanceTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(shiftId)?.total || 0;

  db.prepare(`
    UPDATE shift_sessions
    SET status = 'approved', final_gross_pay = ?, total_seconds = ?, break_seconds = ?,
        payable_seconds = ?,
        base_seconds = ?, overtime_seconds = ?, double_time_seconds = ?,
        base_pay = ?, overtime_pay = ?, double_time_pay = ?,
        allowance_pay = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(finalGrossPay, totalSeconds, breakSeconds, payableSeconds,
    breakdown.baseSeconds, breakdown.overtimeSeconds, breakdown.doubleTimeSeconds,
    breakdown.basePay, breakdown.overtimePay, breakdown.doubleTimePay,
    allowanceTotal,
    shiftId);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'admin_approved', ?, 'admin', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  res.json({ success: true, approved: true });
});

// ── Admin: reject ──

router.post("/admin/:shiftId/reject", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;
  const { reason } = req.body || {};

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  db.prepare("UPDATE shift_sessions SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(shiftId);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'admin_rejected', ?, 'admin', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  res.json({ success: true, rejected: true });
});

// ── Adjustment request ──

router.post("/:shiftId/adjustment-request", (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;
  const { requestedCheckedInAt, requestedCheckedOutAt, requestedBreakSeconds, reason } = req.body || {};

  if (!reason) return res.status(400).json({ error: "Reason is required" });

  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ? AND employee_id = ?").get(shiftId, req.user.userId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO timesheet_adjustment_requests (id, shift_session_id, employee_id, requested_checked_in_at, requested_checked_out_at, requested_break_seconds, reason, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, shiftId, req.user.userId, requestedCheckedInAt || null, requestedCheckedOutAt || null, requestedBreakSeconds || null, reason, now, now);

  res.status(201).json({ id, status: "pending" });
});

// ── Admin: Set employee hourly rate ──

router.put("/admin/employees/:userId/rate", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { userId } = req.params;
  const { hourlyRate } = req.body || {};

  if (hourlyRate === undefined || hourlyRate === null || typeof hourlyRate !== "number" || hourlyRate <= 0) {
    return res.status(400).json({ error: "Hourly rate must be a positive number" });
  }

  const user = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const roundedRate = Math.round(hourlyRate * 100) / 100;
  db.prepare("UPDATE users SET hourly_rate = ?, updated_at = datetime('now') WHERE id = ?").run(roundedRate, userId);

  res.json({ success: true, userId, hourlyRate: roundedRate });
});

// ── Admin: Get users with rates ──

router.get("/admin/employees", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const employees = db.prepare("SELECT id, email, name, role, hourly_rate, status FROM users ORDER BY name ASC").all();
  res.json(employees);
});

// ── Work sites ──

router.get("/sites", (req, res) => {
  const db = getDb();
  const sites = db.prepare("SELECT id, name, address, timezone FROM work_sites WHERE is_active = 1 ORDER BY name ASC").all();
  res.json(sites);
});

// ── QR: Admin list sites with tokens ──

router.get("/sites/admin", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const sites = db.prepare("SELECT id, name, address, timezone, qr_token, qr_enabled, default_allowance_cents, is_active FROM work_sites ORDER BY name ASC").all();
  res.json(sites);
});

// ── QR: Regenerate token ──

router.put("/sites/:siteId/qr-token", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { siteId } = req.params;

  const site = db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const shortName = site.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20);
  const qrToken = "site_" + shortName + "_" + crypto.randomBytes(6).toString("hex");

  db.prepare("UPDATE work_sites SET qr_token = ?, updated_at = datetime('now') WHERE id = ?").run(qrToken, siteId);

  res.json({ qrToken });
});

// ── QR: Resolve token ──

router.get("/sites/by-qr/:qrToken", (req, res) => {
  const db = getDb();
  const { qrToken } = req.params;

  const site = db.prepare("SELECT id, name, address, timezone FROM work_sites WHERE qr_token = ? AND qr_enabled = 1 AND is_active = 1").get(qrToken);
  if (!site) return res.status(404).json({ error: "Invalid or disabled QR code" });

  res.json(site);
});

// ── QR: Check in by QR token (no siteId in body, uses qrToken) ──

router.post("/check-in-by-qr", (req, res) => {
  const db = getDb();
  const { qrToken } = req.body || {};

  if (!qrToken) return res.status(400).json({ error: "qrToken is required" });

  const site = db.prepare("SELECT id, name, address, timezone FROM work_sites WHERE qr_token = ? AND qr_enabled = 1 AND is_active = 1").get(qrToken);
  if (!site) return res.status(400).json({ error: "Invalid or disabled QR code" });

  const existingActive = db.prepare("SELECT * FROM shift_sessions WHERE employee_id = ? AND status IN ('active','on_break') LIMIT 1").get(req.user.userId);
  if (existingActive) {
    const currSite = existingActive.site_id ? db.prepare("SELECT id, name FROM work_sites WHERE id = ?").get(existingActive.site_id) : null;
    return res.json({
      active: true,
      existing: true,
      shift: {
        id: existingActive.id,
        status: existingActive.status,
        checkedInAt: existingActive.checked_in_at,
        checkedOutAt: existingActive.checked_out_at,
        hourlyRateSnapshot: existingActive.hourly_rate_snapshot,
        timezone: existingActive.timezone,
        site: currSite || null,
        breakSeconds: existingActive.break_seconds || 0,
        currentBreakStartedAt: db.prepare("SELECT event_time FROM shift_events WHERE shift_session_id = ? AND event_type = 'break_start' ORDER BY event_time DESC LIMIT 1").get(existingActive.id)?.event_time || null,
        serverNow: new Date().toISOString(),
      },
    });
  }

  const hourlyRate = getEmployeeRate(db, req.user.userId);
  if (hourlyRate === null || hourlyRate === undefined || typeof hourlyRate !== "number" || hourlyRate <= 0) {
    return res.status(400).json({ error: "Hourly rate is not configured. Please contact admin before checking in." });
  }

  const now = new Date().toISOString();
  const shiftId = crypto.randomUUID();
  const eventId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO shift_sessions (id, employee_id, site_id, status, checked_in_at, hourly_rate_snapshot, timezone, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(shiftId, req.user.userId, site.id, now, hourlyRate, site.timezone, now, now);

  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, 'check_in', ?, 'qr', ?)
  `).run(eventId, shiftId, req.user.userId, now, now);

  res.status(201).json({
    active: true,
    existing: false,
    shift: {
      id: shiftId,
      status: "active",
      checkedInAt: now,
      checkedOutAt: null,
      hourlyRateSnapshot: hourlyRate,
      timezone: site.timezone,
      site: { id: site.id, name: site.name },
      breakSeconds: 0,
      currentBreakStartedAt: null,
      serverNow: now,
    },
  });
});

// ── Pay Rules: list ──

router.get("/pay-rules", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const rules = db.prepare("SELECT * FROM company_pay_rules ORDER BY is_active DESC, name ASC").all();
  res.json(rules);
});

// ── Pay Rules: create ──

router.post("/pay-rules", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { name, ordinary_hours_per_day, overtime_daily_after_hours, overtime_rate_multiplier, double_time_after_hours, double_time_multiplier } = req.body || {};

  if (!name) return res.status(400).json({ error: "Name is required" });

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO company_pay_rules (name, ordinary_hours_per_day, overtime_daily_after_hours, overtime_rate_multiplier, double_time_after_hours, double_time_multiplier, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    name,
    ordinary_hours_per_day || 7.6,
    overtime_daily_after_hours || 7.6,
    overtime_rate_multiplier || 1.5,
    double_time_after_hours || null,
    double_time_multiplier || 2.0,
    now,
    now,
  );

  const rule = db.prepare("SELECT * FROM company_pay_rules WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(rule);
});

// ── Pay Rules: update ──

router.put("/pay-rules/:ruleId", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { ruleId } = req.params;

  const existing = db.prepare("SELECT id FROM company_pay_rules WHERE id = ?").get(ruleId);
  if (!existing) return res.status(404).json({ error: "Pay rule not found" });

  const { name, ordinary_hours_per_day, overtime_daily_after_hours, overtime_rate_multiplier, double_time_after_hours, double_time_multiplier, is_active } = req.body || {};

  db.prepare(`
    UPDATE company_pay_rules SET name = COALESCE(?, name), ordinary_hours_per_day = COALESCE(?, ordinary_hours_per_day), overtime_daily_after_hours = COALESCE(?, overtime_daily_after_hours), overtime_rate_multiplier = COALESCE(?, overtime_rate_multiplier), double_time_after_hours = COALESCE(?, double_time_after_hours), double_time_multiplier = COALESCE(?, double_time_multiplier), is_active = COALESCE(?, is_active), updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null,
    ordinary_hours_per_day ?? null,
    overtime_daily_after_hours ?? null,
    overtime_rate_multiplier ?? null,
    double_time_after_hours ?? null,
    double_time_multiplier ?? null,
    is_active ?? null,
    ruleId,
  );

  const rule = db.prepare("SELECT * FROM company_pay_rules WHERE id = ?").get(ruleId);
  res.json(rule);
});

// ── Pay Rules: delete ──

router.delete("/pay-rules/:ruleId", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { ruleId } = req.params;

  const existing = db.prepare("SELECT id FROM company_pay_rules WHERE id = ?").get(ruleId);
  if (!existing) return res.status(404).json({ error: "Pay rule not found" });

  db.prepare("DELETE FROM company_pay_rules WHERE id = ?").run(ruleId);
  res.json({ success: true });
});

// ── Allowances: list ──

router.get("/admin/:shiftId/allowances", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;

  const shift = db.prepare("SELECT id FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const allowances = db.prepare("SELECT * FROM shift_allowances WHERE shift_session_id = ? ORDER BY created_at ASC").all(shiftId);
  res.json(allowances);
});

// ── Allowances: add ──

router.post("/admin/:shiftId/allowances", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { shiftId } = req.params;
  const { allowance_type, description, amount } = req.body || {};

  if (!allowance_type || amount === undefined || amount === null || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "allowance_type and a positive amount are required" });
  }

  const shift = db.prepare("SELECT id, employee_id FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO shift_allowances (id, shift_session_id, employee_id, allowance_type, description, amount, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, shiftId, shift.employee_id, allowance_type, description || null, amount, now, now);

  const allowance = db.prepare("SELECT * FROM shift_allowances WHERE id = ?").get(id);
  res.status(201).json(allowance);
});

// ── Allowances: delete ──

router.delete("/admin/:shiftId/allowances/:allowanceId", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { allowanceId } = req.params;

  const existing = db.prepare("SELECT id FROM shift_allowances WHERE id = ?").get(allowanceId);
  if (!existing) return res.status(404).json({ error: "Allowance not found" });

  db.prepare("DELETE FROM shift_allowances WHERE id = ?").run(allowanceId);
  res.json({ success: true });
});

// ── Payroll: weekly summary ──

router.get("/payroll/summary", requireRole("owner", "admin", "manager"), (req, res) => {
  const db = getDb();
  const { weekStart, weekEnd } = req.query;

  if (!weekStart || !weekEnd) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return res.json({
      weekStart: monday.toISOString(),
      weekEnd: sunday.toISOString(),
      shifts: [],
      employees: [],
      totalGross: 0,
      totalAllowances: 0,
      totalShifts: 0,
    });
  }

  const shifts = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.status = 'approved'
      AND s.checked_in_at >= ? AND s.checked_in_at < ?
    ORDER BY u.name ASC, s.checked_in_at ASC
  `).all(weekStart, weekEnd);

  const employeeMap = {};
  for (const shift of shifts) {
    const allowances = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(shift.id);
    shift.total_allowances = allowances?.total || 0;

    if (!employeeMap[shift.employee_id]) {
      employeeMap[shift.employee_id] = {
        employeeId: shift.employee_id,
        employeeName: shift.employee_name,
        employeeEmail: shift.employee_email,
        totalSeconds: 0,
        baseSeconds: 0,
        overtimeSeconds: 0,
        doubleTimeSeconds: 0,
        basePay: 0,
        overtimePay: 0,
        doubleTimePay: 0,
        allowancePay: 0,
        totalPay: 0,
        shiftCount: 0,
      };
    }

    const e = employeeMap[shift.employee_id];
    e.totalSeconds += (shift.payable_seconds || 0);
    e.baseSeconds += (shift.base_seconds || 0);
    e.overtimeSeconds += (shift.overtime_seconds || 0);
    e.doubleTimeSeconds += (shift.double_time_seconds || 0);
    e.basePay += (shift.base_pay || 0);
    e.overtimePay += (shift.overtime_pay || 0);
    e.doubleTimePay += (shift.double_time_pay || 0);
    e.allowancePay += (shift.total_allowances || 0);
    e.totalPay += (shift.final_gross_pay || 0) + (shift.total_allowances || 0);
    e.shiftCount++;
  }

  const employees = Object.values(employeeMap);
  const totals = employees.reduce((acc, e) => ({
    totalGross: acc.totalGross + e.totalPay,
    totalAllowances: acc.totalAllowances + e.allowancePay,
    totalShifts: acc.totalShifts + e.shiftCount,
  }), { totalGross: 0, totalAllowances: 0, totalShifts: 0 });

  res.json({
    weekStart,
    weekEnd,
    shifts,
    employees,
    totalGross: totals.totalGross,
    totalAllowances: totals.totalAllowances,
    totalShifts: totals.totalShifts,
  });
});

// ── Payroll: CSV export ──

router.post("/payroll/export", requireRole("owner", "admin"), (req, res) => {
  const db = getDb();
  const { weekStart, weekEnd } = req.body || {};

  if (!weekStart || !weekEnd) {
    return res.status(400).json({ error: "weekStart and weekEnd are required" });
  }

  const shifts = db.prepare(`
    SELECT s.*, u.name as employee_name, u.email as employee_email, u.hourly_rate, w.name as site_name
    FROM shift_sessions s
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.status = 'approved'
      AND s.checked_in_at >= ? AND s.checked_in_at < ?
    ORDER BY u.name ASC, s.checked_in_at ASC
  `).all(weekStart, weekEnd);

  // Build CSV rows
  const rows = [["Employee Name","Email","Site","Date","Start","End","Total Hours","Base Hours","Overtime Hours","Double Time Hours","Base Pay","Overtime Pay","Double Time Pay","Allowances","Total Pay"]];

  for (const shift of shifts) {
    const allowances = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM shift_allowances WHERE shift_session_id = ?").get(shift.id);
    const allowanceTotal = allowances?.total || 0;
    const totalPay = (shift.final_gross_pay || 0) + allowanceTotal;
    const shiftDate = new Date(shift.checked_in_at).toISOString().split("T")[0];

    rows.push([
      shift.employee_name,
      shift.employee_email,
      shift.site_name || "",
      shiftDate,
      shift.checked_in_at,
      shift.checked_out_at || "",
      ((shift.payable_seconds || 0) / 3600).toFixed(2),
      ((shift.base_seconds || 0) / 3600).toFixed(2),
      ((shift.overtime_seconds || 0) / 3600).toFixed(2),
      ((shift.double_time_seconds || 0) / 3600).toFixed(2),
      (shift.base_pay || 0).toFixed(2),
      (shift.overtime_pay || 0).toFixed(2),
      (shift.double_time_pay || 0).toFixed(2),
      allowanceTotal.toFixed(2),
      totalPay.toFixed(2),
    ]);
  }

  const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO payroll_export_batches (id, week_start, week_end, exported_by, exported_at, format, total_shifts, total_gross, created_at)
    VALUES (?, ?, ?, ?, ?, 'csv', ?, ?, ?)
  `).run(batchId, weekStart, weekEnd, req.user.userId, now, shifts.length, rows.reduce((s, r) => s + parseFloat(r[14] || "0"), 0), now);

  // Mark shifts as exported
  for (const shift of shifts) {
    db.prepare("UPDATE shift_sessions SET payroll_exported_at = ?, payroll_export_batch_id = ?, updated_at = datetime('now') WHERE id = ?").run(now, batchId, shift.id);
  }

  res.json({
    batchId,
    exportedAt: now,
    shiftCount: shifts.length,
    csv: csvContent,
  });
});

export default router;
