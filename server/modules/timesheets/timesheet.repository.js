import { parsePagination, paginatedResponse, paginatedQuery } from '../../shared/http/pagination.js';

export function getActivePayRule(db) {
  return db.prepare("SELECT * FROM company_pay_rules WHERE is_active = 1 ORDER BY id ASC LIMIT 1").get();
}

export function getShiftById(db, shiftId) {
  return db.prepare("SELECT * FROM shift_sessions WHERE id = ?").get(shiftId);
}

export function getShiftsByEmployee(db, employeeId, pagination) {
  const baseQuery = "SELECT s.*, w.name as site_name FROM shift_sessions s LEFT JOIN work_sites w ON w.id = s.site_id WHERE s.employee_id = ? ORDER BY s.checked_in_at DESC";
  const countQuery = "SELECT COUNT(*) as cnt FROM shift_sessions WHERE employee_id = ?";
  return paginatedQuery(db, baseQuery, countQuery, [employeeId], pagination);
}

export function getShiftsByDateRange(db, employeeId, startDate, endDate) {
  return db.prepare(`
    SELECT s.*, w.name as site_name
    FROM shift_sessions s
    LEFT JOIN work_sites w ON w.id = s.site_id
    WHERE s.employee_id = ? AND s.checked_in_at >= ? AND s.checked_in_at <= ?
    ORDER BY s.checked_in_at ASC
  `).all(employeeId, startDate, endDate);
}

export function getShiftEvents(db, shiftId) {
  return db.prepare("SELECT * FROM shift_events WHERE shift_session_id = ? ORDER BY event_time ASC").all(shiftId);
}

export function getActiveShiftForEmployee(db, employeeId) {
  return db.prepare("SELECT * FROM shift_sessions WHERE employee_id = ? AND status IN ('active','on_break') ORDER BY checked_in_at DESC LIMIT 1").get(employeeId);
}

export function insertShiftEvent(db, data) {
  const { id, shiftSessionId, employeeId, eventType, eventTime, source, createdAt } = data;
  db.prepare(`
    INSERT INTO shift_events (id, shift_session_id, employee_id, event_type, event_time, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shiftSessionId, employeeId, eventType, eventTime, source || 'web', createdAt);
}

export function updateShiftSession(db, shiftId, data) {
  const entries = Object.entries(data);
  if (entries.length === 0) return;
  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  values.push(shiftId);
  db.prepare(`UPDATE shift_sessions SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(...values);
}
