import { Router } from "express";
import crypto from "crypto";
import { getDb } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePasswordChanged } from "../middleware/passwordChange.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();
router.use(requireAuth);

function getEmployee(db, userId) {
  const user = db.prepare("SELECT id, email, name, role FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  return user;
}

function getEmployeeRate(db, userId) {
  const user = db.prepare("SELECT hourly_rate FROM users WHERE id = ?").get(userId);
  return user?.hourly_rate ?? null;
}

function recalculateShift(db, shiftId) {
  const shift = db.prepare("SELECT * FROM shift_sessions WHERE id = ?").get(shiftId);
  if (!shift) return null;

  const events = db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);

  const totalSeconds = calculateTotalSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString());
  const breakSeconds = calculateBreakSeconds(events);
  const payableSeconds = calculatePayableSeconds(shift.checked_in_at, shift.checked_out_at || new Date().toISOString(), breakSeconds);
  const estimatedGrossPay = calculateGrossPay(payableSeconds, shift.hourly_rate_snapshot);

  db.prepare(`
    UPDATE shift_sessions
    SET total_seconds = ?, break_seconds = ?, payable_seconds = ?, estimated_gross_pay = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(totalSeconds, breakSeconds, payableSeconds, estimatedGrossPay, shiftId);

  return { ...shift, total_seconds: totalSeconds, break_seconds: breakSeconds, payable_seconds: payableSeconds, estimated_gross_pay: estimatedGrossPay };
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

  db.prepare(`
    UPDATE shift_sessions
    SET status = 'pending_approval', checked_out_at = ?, total_seconds = ?, break_seconds = ?,
        payable_seconds = ?, estimated_gross_pay = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(now, totalSeconds, breakSeconds, payableSeconds, grossPay, shiftId);

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

  res.json({ shift, events });
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
  const now = new Date().toISOString();
  const eventId = crypto.randomUUID();

  db.prepare(`
    UPDATE shift_sessions
    SET status = 'approved', final_gross_pay = ?, total_seconds = ?, break_seconds = ?,
        payable_seconds = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(finalGrossPay, totalSeconds, breakSeconds, payableSeconds, shiftId);

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

export default router;
