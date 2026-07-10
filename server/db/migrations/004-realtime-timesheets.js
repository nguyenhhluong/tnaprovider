export const version = '004';
export const name = 'realtime-timesheets';
export const requiresForeignKeysOff = true;
export const requiresLegacyAlterTable = true;
export function migrate(db) {
  function addColumnIfMissing(table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS work_sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shift_sessions (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      site_id TEXT REFERENCES work_sites(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_break','pending_approval','approved','rejected','auto_closed','correction_requested')),
      checked_in_at TEXT NOT NULL,
      checked_out_at TEXT,
      total_seconds INTEGER DEFAULT 0,
      break_seconds INTEGER DEFAULT 0,
      payable_seconds INTEGER DEFAULT 0,
      estimated_gross_pay REAL DEFAULT 0,
      final_gross_pay REAL,
      hourly_rate_snapshot REAL NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shift_events (
      id TEXT PRIMARY KEY,
      shift_session_id TEXT NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL CHECK(event_type IN ('check_in','break_start','break_end','check_out','auto_check_out','correction_requested','admin_approved','admin_rejected')),
      event_time TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web','mobile','kiosk','admin','system')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS timesheet_adjustment_requests (
      id TEXT PRIMARY KEY,
      shift_session_id TEXT NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES users(id),
      requested_checked_in_at TEXT,
      requested_checked_out_at TEXT,
      requested_break_seconds INTEGER,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shift_sessions_employee ON shift_sessions(employee_id);
    CREATE INDEX IF NOT EXISTS idx_shift_sessions_status ON shift_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_shift_events_session ON shift_events(shift_session_id);
    CREATE INDEX IF NOT EXISTS idx_shift_events_employee ON shift_events(employee_id);
    CREATE INDEX IF NOT EXISTS idx_adjustment_requests_session ON timesheet_adjustment_requests(shift_session_id);
  `);

  addColumnIfMissing('work_sites', 'qr_token', 'TEXT');
  addColumnIfMissing('work_sites', 'qr_enabled', 'INTEGER DEFAULT 1');
  addColumnIfMissing('work_sites', 'default_allowance_cents', 'INTEGER DEFAULT 0');

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_work_sites_qr_token ON work_sites(qr_token)");

  addColumnIfMissing('shift_sessions', 'base_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'overtime_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'double_time_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'base_pay', 'REAL DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'overtime_pay', 'REAL DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'double_time_pay', 'REAL DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'allowance_pay', 'REAL DEFAULT 0');
  addColumnIfMissing('shift_sessions', 'payroll_exported_at', 'TEXT');
  addColumnIfMissing('shift_sessions', 'payroll_export_batch_id', 'TEXT');

  // Add 'offline_qr' and 'qr' to shift_events source constraint
  const shiftEventsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='shift_events'").get();
  if (shiftEventsTableInfo && !shiftEventsTableInfo.sql.includes("'offline_qr'")) {
    db.exec(`
      CREATE TABLE shift_events_new (
        id TEXT PRIMARY KEY,
        shift_session_id TEXT NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES users(id),
        event_type TEXT NOT NULL CHECK(event_type IN ('check_in','break_start','break_end','check_out','auto_check_out','correction_requested','admin_approved','admin_rejected')),
        event_time TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web','mobile','kiosk','admin','system','qr','offline_qr')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.exec(`INSERT INTO shift_events_new (id, shift_session_id, employee_id, event_type, event_time, source, created_at) SELECT id, shift_session_id, employee_id, event_type, event_time, source, created_at FROM shift_events`);
    db.exec("DROP TABLE shift_events");
    db.exec("ALTER TABLE shift_events_new RENAME TO shift_events");
    db.exec("CREATE INDEX IF NOT EXISTS idx_shift_events_session ON shift_events(shift_session_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_shift_events_employee ON shift_events(employee_id)");
  }
}
