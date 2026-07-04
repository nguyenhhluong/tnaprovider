import { getDb } from "./database.js";

function getColumnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

function addColumnIfMissing(db, table, column, definition) {
  const cols = getColumnNames(db, table);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function buildSelectExpr(cols, field, defaultValue) {
  return cols.includes(field) ? field : defaultValue;
}

export function migrate() {
  const db = getDb();

  const usersExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

  if (usersExists) {
    // Safely add Phase 5A columns (no-op if already present)
    addColumnIfMissing(db, 'users', 'must_change_password', 'INTEGER DEFAULT 0');
    addColumnIfMissing(db, 'users', 'invited_at', 'TEXT');
    addColumnIfMissing(db, 'users', 'disabled_at', 'TEXT');
    addColumnIfMissing(db, 'users', 'disabled_by', 'TEXT REFERENCES users(id)');
    addColumnIfMissing(db, 'users', 'password_changed_at', 'TEXT');
    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get().sql;
    if (!sql.includes("'invited'")) {
      const cols = getColumnNames(db, 'users');

      const selMustChange = buildSelectExpr(cols, 'must_change_password', '0');
      const selInvitedAt = buildSelectExpr(cols, 'invited_at', 'NULL');
      const selDisabledAt = buildSelectExpr(cols, 'disabled_at', 'NULL');
      const selDisabledBy = buildSelectExpr(cols, 'disabled_by', 'NULL');
      const selPasswordChangedAt = buildSelectExpr(cols, 'password_changed_at', 'NULL');

      // Temporarily disable FK checks for the table recreation
      db.exec("PRAGMA legacy_alter_table = ON");
      db.exec("PRAGMA foreign_keys = OFF");

      db.exec(`
        CREATE TABLE users_new (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','worker','client')),
          password_hash TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','invited')),
          must_change_password INTEGER DEFAULT 0,
          invited_at TEXT,
          disabled_at TEXT,
          disabled_by TEXT,
          password_changed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_login_at TEXT
        );
        INSERT INTO users_new SELECT id, email, name, role, password_hash,
          CASE WHEN status = 'active' THEN 'active' ELSE 'disabled' END,
          ${selMustChange}, ${selInvitedAt}, ${selDisabledAt}, ${selDisabledBy}, ${selPasswordChangedAt},
          created_at, updated_at, last_login_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);

      db.exec("PRAGMA foreign_keys = ON");
      db.exec("PRAGMA legacy_alter_table = OFF");

      // Verify foreign key integrity
      const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
      if (fkErrors.length > 0) {
        console.error("Foreign key violations after users table migration:", fkErrors);
        throw new Error("Foreign key check failed during users table migration");
      }

      console.log("Migrated users table to support 'invited' status");
    }
  } else {
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','worker','client')),
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled','invited')),
        must_change_password INTEGER DEFAULT 0,
        invited_at TEXT,
        disabled_at TEXT,
        disabled_by TEXT,
        password_changed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      );
    `);
  }

  // ── Other tables (safe CREATE IF NOT EXISTS) ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      project_type TEXT,
      location TEXT,
      budget TEXT,
      message TEXT,
      score INTEGER DEFAULT 0,
      temperature TEXT DEFAULT 'cold',
      status TEXT NOT NULL DEFAULT 'new',
      source TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_id TEXT REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      sector TEXT,
      location TEXT,
      budget REAL,
      start_date TEXT,
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      work_date TEXT NOT NULL,
      start_time TEXT,
      finish_time TEXT,
      break_minutes INTEGER DEFAULT 0,
      total_hours REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','approved','rejected')),
      notes TEXT,
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
      assigned_to TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_timesheets_user ON timesheets(user_id);
    CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_client ON maintenance_tickets(client_id);
  `);

  // ── Phase 5A new tables ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_ip TEXT
    );

    CREATE TABLE IF NOT EXISTS user_invite_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','worker','client')),
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_ip TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_invite_email ON user_invite_tokens(email);
  `);

  // ── Phase 5B: Client Portal tables ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS client_project_access (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(client_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS project_updates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'in_progress',
      progress_percent INTEGER DEFAULT 0,
      image_url TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_update_comments (
      id TEXT PRIMARY KEY,
      update_id TEXT NOT NULL REFERENCES project_updates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_variations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      requested_by TEXT NOT NULL REFERENCES users(id),
      decided_by TEXT REFERENCES users(id),
      decided_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_portal_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_client_project_access_client ON client_project_access(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_project_access_project ON client_project_access(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_variations_project ON project_variations(project_id);
    CREATE INDEX IF NOT EXISTS idx_client_portal_messages_project ON client_portal_messages(project_id);

    -- Realtime Timesheet tables
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

  console.log("Database migrated successfully");
}
