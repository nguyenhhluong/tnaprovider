export const version = '005';
export const name = 'pay-rules';
export function migrate(db) {

  db.exec(`
    CREATE TABLE IF NOT EXISTS company_pay_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Default',
      ordinary_hours_per_day REAL DEFAULT 7.6,
      ordinary_hours_per_week REAL DEFAULT 38,
      overtime_daily_after_hours REAL DEFAULT 7.6,
      overtime_weekly_after_hours REAL DEFAULT 38,
      overtime_rate_multiplier REAL DEFAULT 1.5,
      double_time_after_hours REAL,
      double_time_multiplier REAL DEFAULT 2,
      unpaid_break_minutes_default INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shift_allowances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_session_id TEXT NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES users(id),
      allowance_type TEXT NOT NULL CHECK(allowance_type IN ('travel','meal','parking','site','other')),
      description TEXT,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payroll_export_batches (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      exported_by TEXT REFERENCES users(id),
      exported_at TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'csv',
      total_shifts INTEGER DEFAULT 0,
      total_gross REAL DEFAULT 0,
      file_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shift_allowances_session ON shift_allowances(shift_session_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_batches_week ON payroll_export_batches(week_start, week_end);
  `);

  const receiptsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='offline_action_receipts'").get();
  if (!receiptsExists) {
    db.exec(`
      CREATE TABLE offline_action_receipts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        qr_token TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('check_in','check_out','start_break','end_break')),
        client_created_at TEXT,
        server_processed_at TEXT NOT NULL,
        shift_session_id TEXT,
        result_status TEXT NOT NULL,
        result_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, idempotency_key)
      )
    `);
  }

  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
