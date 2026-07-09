import fs from "fs";
import path from "path";
import crypto from "crypto";
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
    addColumnIfMissing(db, 'users', 'hourly_rate', 'REAL');
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
          hourly_rate REAL,
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
        hourly_rate REAL,
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

    -- Realtime Timesheet Phase 2: QR + Overtime + Payroll tables
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

  // ── Phase 6: Business Automation Platform tables ──

  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('note','call','email','meeting','site_visit','status_change')),
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lead_followups (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','cancelled','overdue')),
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quote_requests (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES leads(id),
      project_id TEXT REFERENCES projects(id),
      title TEXT NOT NULL,
      scope TEXT,
      location TEXT,
      budget REAL,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewing','quoted','converted','cancelled')),
      requested_by TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_request_id TEXT REFERENCES quote_requests(id) ON DELETE CASCADE,
      quote_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      scope TEXT,
      subtotal REAL DEFAULT 0,
      gst REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','expired','converted')),
      valid_until TEXT,
      created_by TEXT REFERENCES users(id),
      accepted_by TEXT REFERENCES users(id),
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'each',
      unit_price REAL NOT NULL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quote_status_history (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_task_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sector TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_template_tasks (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES project_task_templates(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      default_assignee_role TEXT,
      sort_order INTEGER DEFAULT 0,
      estimated_hours REAL
    );

    CREATE TABLE IF NOT EXISTS project_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','blocked','done','cancelled')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      assigned_to TEXT REFERENCES users(id),
      due_at TEXT,
      estimated_hours REAL,
      actual_hours REAL,
      created_by TEXT REFERENCES users(id),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('lead','project','quote','client','general')),
      entity_id TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      folder_id TEXT REFERENCES document_folders(id) ON DELETE SET NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal','client')),
      uploaded_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proposal_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      body TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proposal_versions (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      template_id TEXT REFERENCES proposal_templates(id),
      title TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','sent','accepted','rejected')),
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      entity_type TEXT,
      entity_id TEXT,
      status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','archived')),
      channel TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app','email_mock')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notify_leads INTEGER DEFAULT 1,
      notify_quotes INTEGER DEFAULT 1,
      notify_tasks INTEGER DEFAULT 1,
      notify_projects INTEGER DEFAULT 1,
      notify_maintenance INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminder_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('lead_followup','quote_expiry','task_due','project_due','maintenance_pending')),
      enabled INTEGER DEFAULT 1,
      offset_hours INTEGER DEFAULT 24,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminder_runs (
      id TEXT PRIMARY KEY,
      rule_id TEXT REFERENCES reminder_rules(id),
      entity_type TEXT,
      entity_id TEXT,
      notification_id TEXT REFERENCES notifications(id),
      ran_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Phase 6 indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_followups_lead ON lead_followups(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_followups_due ON lead_followups(due_at);
    CREATE INDEX IF NOT EXISTS idx_lead_followups_assigned ON lead_followups(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_quote_requests_lead ON quote_requests(lead_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(quote_request_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
    CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote ON quote_status_history(quote_id);
    CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_project_task_comments_task ON project_task_comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_proposal_versions_quote ON proposal_versions(quote_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_reminder_runs_rule ON reminder_runs(rule_id);
  `);

  // Add columns to existing tables (Phase 2 — QR + Overtime + Payroll)
  addColumnIfMissing(db, 'work_sites', 'qr_token', 'TEXT');
  addColumnIfMissing(db, 'work_sites', 'qr_enabled', 'INTEGER DEFAULT 1');
  addColumnIfMissing(db, 'work_sites', 'default_allowance_cents', 'INTEGER DEFAULT 0');

  // Add unique index for qr_token (SQLite can't ADD COLUMN with UNIQUE)
  const existingIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_work_sites_qr_token'").get();
  if (!existingIndexes) {
    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_work_sites_qr_token ON work_sites(qr_token)");
    } catch (e) {
      // index may fail if there are NULL values; that's ok for existing data
    }
  }

  addColumnIfMissing(db, 'shift_sessions', 'base_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'overtime_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'double_time_seconds', 'INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'base_pay', 'REAL DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'overtime_pay', 'REAL DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'double_time_pay', 'REAL DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'allowance_pay', 'REAL DEFAULT 0');
  addColumnIfMissing(db, 'shift_sessions', 'payroll_exported_at', 'TEXT');
  addColumnIfMissing(db, 'shift_sessions', 'payroll_export_batch_id', 'TEXT');

  // Check if shift_events source constraint needs 'offline_qr' added
  const shiftEventsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='shift_events'").get();
  if (shiftEventsTableInfo && !shiftEventsTableInfo.sql.includes("'offline_qr'")) {
    db.exec("PRAGMA legacy_alter_table = ON");
    db.exec("PRAGMA foreign_keys = OFF");

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
      INSERT INTO shift_events_new SELECT * FROM shift_events;
      DROP TABLE shift_events;
      ALTER TABLE shift_events_new RENAME TO shift_events;
    `);

    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA legacy_alter_table = OFF");

    const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
    if (fkErrors.length > 0) {
      console.error("Foreign key violations after shift_events migration:", fkErrors);
    }
    console.log("Migrated shift_events source constraint to include 'offline_qr'");
  }

  // Phase 8F: offline_action_receipts for idempotent offline sync
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

  // Phase 8G: contact_requests table for marketing contact form inbox
  const contactRequestsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_requests'").get();
  if (!contactRequestsExists) {
    db.exec(`
      CREATE TABLE contact_requests (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        service TEXT NOT NULL,
        location TEXT NOT NULL,
        budget TEXT,
        target_date TEXT,
        message TEXT NOT NULL,
        request_callback INTEGER DEFAULT 0,
        callback_time TEXT,
        privacy_consent INTEGER DEFAULT 0,
        project_id TEXT,
        source TEXT,
        status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','quoted','won','lost','archived')),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
        internal_notes TEXT,
        assigned_to_user_id TEXT,
        last_contacted_at TEXT,
        archived_at TEXT,
        converted_lead_id TEXT,
        received_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_requests_received_at ON contact_requests(received_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_contact_requests_phone ON contact_requests(phone)`);

    // Import existing JSON submissions if present
    try {
      const migrateDir = path.dirname(new URL(import.meta.url).pathname);
      const jsonPath = path.join(migrateDir, "..", "..", "data", "contact-submissions.json");
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const submissions = JSON.parse(raw);
        if (Array.isArray(submissions) && submissions.length > 0) {
          const insert = db.prepare(`
            INSERT OR IGNORE INTO contact_requests
              (id, first_name, last_name, email, phone, service, location, budget, target_date, message, request_callback, callback_time, privacy_consent, project_id, source, status, priority, received_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'normal', ?, ?, ?)
          `);
          let imported = 0;
          for (const s of submissions) {
            const hash = crypto.createHash("sha256").update(`${s.email || ""}|${s.phone || ""}|${s.message || ""}|${s.receivedAt || ""}`).digest("hex");
            const existing = db.prepare("SELECT id FROM contact_requests WHERE id = ?").get(hash);
            if (!existing) {
              const receivedAt = s.receivedAt || new Date().toISOString();
              const now = new Date().toISOString();
              const firstName = s.firstName || s.first_name || "";
              const lastName = s.lastName || s.last_name || "";
              const finalSource = s.source || "contact_form";
              insert.run(hash, firstName, lastName, s.email || "", s.phone || "", s.service || "", s.location || "", s.budget || null, s.targetDate || s.target_date || null, s.message || "", s.requestCallback ? 1 : 0, s.callbackTime || null, s.privacyConsent ? 1 : 0, s.projectId || s.project_id || null, finalSource, receivedAt, now, now);
              imported++;
            }
          }
          if (imported > 0) console.log(`Imported ${imported} existing contact submissions into contact_requests`);
        }
      }
    } catch (e) {
      console.warn("Could not import existing contact submissions:", e.message);
    }
  }

  // Phase 8H: Professional Quote Builder — update status CHECK constraint on quotes
  const currentCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quotes'").get()?.sql || "";
  if (currentCheck.includes("CHECK(status IN") && !currentCheck.includes("in_review")) {
    // Drop stale backup table from previous runs
    const oldExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quotes_old'").get();
    if (oldExists) db.exec("DROP TABLE quotes_old");

    // Disable FK checks during migration
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE quotes_new (
        id TEXT PRIMARY KEY,
        quote_request_id TEXT,
        quote_number TEXT NOT NULL,
        title TEXT NOT NULL,
        scope TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','sent','accepted','rejected','expired','converted')),
        subtotal REAL DEFAULT 0,
        gst REAL DEFAULT 0,
        total REAL DEFAULT 0,
        created_by TEXT,
        accepted_by TEXT,
        accepted_at TEXT,
        valid_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO quotes_new (id, quote_request_id, quote_number, title, scope, status, subtotal, gst, total, created_by, accepted_by, accepted_at, valid_until, created_at, updated_at)
        SELECT id, quote_request_id, quote_number, title, scope, status, subtotal, gst, total, created_by, accepted_by, accepted_at, valid_until, created_at, updated_at FROM quotes;
      DROP TABLE quotes;
      ALTER TABLE quotes_new RENAME TO quotes;
    `);
    db.pragma("foreign_keys = ON");
    console.log("Migrated quotes table CHECK constraint for Phase 8H");
  }

  // Phase 8H: Add columns to quotes
  const qCols = getColumnNames(db, "quotes");
  addColumnIfMissing(db, "quotes", "client_name", "TEXT");
  addColumnIfMissing(db, "quotes", "client_email", "TEXT");
  addColumnIfMissing(db, "quotes", "client_phone", "TEXT");
  addColumnIfMissing(db, "quotes", "client_company", "TEXT");
  addColumnIfMissing(db, "quotes", "client_address", "TEXT");
  addColumnIfMissing(db, "quotes", "project_name", "TEXT");
  addColumnIfMissing(db, "quotes", "project_location", "TEXT");
  addColumnIfMissing(db, "quotes", "quote_date", "TEXT");
  addColumnIfMissing(db, "quotes", "valid_until", "TEXT");
  addColumnIfMissing(db, "quotes", "revision_number", "INTEGER DEFAULT 1");
  addColumnIfMissing(db, "quotes", "currency", "TEXT DEFAULT 'AUD'");
  addColumnIfMissing(db, "quotes", "tax_rate", "REAL DEFAULT 0.10");
  addColumnIfMissing(db, "quotes", "discount_type", "TEXT DEFAULT 'none'");
  addColumnIfMissing(db, "quotes", "discount_value", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quotes", "discount_total", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quotes", "margin_total", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quotes", "terms", "TEXT");
  addColumnIfMissing(db, "quotes", "payment_terms", "TEXT");
  addColumnIfMissing(db, "quotes", "inclusions", "TEXT");
  addColumnIfMissing(db, "quotes", "exclusions", "TEXT");
  addColumnIfMissing(db, "quotes", "warranty", "TEXT");
  addColumnIfMissing(db, "quotes", "notes", "TEXT");
  addColumnIfMissing(db, "quotes", "internal_notes", "TEXT");
  addColumnIfMissing(db, "quotes", "review_status", "TEXT DEFAULT 'draft'");
  addColumnIfMissing(db, "quotes", "reviewed_by", "TEXT");
  addColumnIfMissing(db, "quotes", "reviewed_at", "TEXT");
  addColumnIfMissing(db, "quotes", "approved_by", "TEXT");
  addColumnIfMissing(db, "quotes", "approved_at", "TEXT");
  addColumnIfMissing(db, "quotes", "sent_at", "TEXT");
  addColumnIfMissing(db, "quotes", "sent_to_email", "TEXT");
  addColumnIfMissing(db, "quotes", "pdf_file_path", "TEXT");
  addColumnIfMissing(db, "quotes", "pdf_generated_at", "TEXT");
  addColumnIfMissing(db, "quotes", "public_token", "TEXT");
  addColumnIfMissing(db, "quotes", "public_token_expires_at", "TEXT");

  // Phase 8H: quote_sections table
  const qsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_sections'").get();
  if (!qsExists) {
    db.exec(`
      CREATE TABLE quote_sections (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        subtotal REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // Phase 8H: upgrade quote_items with missing columns
  const qiCols = getColumnNames(db, "quote_items");
  addColumnIfMissing(db, "quote_items", "section_id", "TEXT");
  addColumnIfMissing(db, "quote_items", "item_type", "TEXT DEFAULT 'material'");
  addColumnIfMissing(db, "quote_items", "item_code", "TEXT");
  addColumnIfMissing(db, "quote_items", "unit_cost", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quote_items", "markup_percent", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quote_items", "discount_percent", "REAL DEFAULT 0");
  addColumnIfMissing(db, "quote_items", "tax_rate", "REAL DEFAULT 0.10");
  addColumnIfMissing(db, "quote_items", "taxable", "INTEGER DEFAULT 1");
  addColumnIfMissing(db, "quote_items", "notes", "TEXT");
  addColumnIfMissing(db, "quote_items", "name", "TEXT");

  // Phase 8H: quote_documents table
  const qdExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_documents'").get();
  if (!qdExists) {
    db.exec(`
      CREATE TABLE quote_documents (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL DEFAULT 'pdf',
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        revision_number INTEGER DEFAULT 1,
        generated_by TEXT REFERENCES users(id),
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // Phase 8H: quote_review_events table
  const qreExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_review_events'").get();
  if (!qreExists) {
    db.exec(`
      CREATE TABLE quote_review_events (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT,
        changed_by TEXT REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // Phase 8H: quote_templates table
  const qtExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_templates'").get();
  if (!qtExists) {
    db.exec(`
      CREATE TABLE quote_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  // Phase 8H: quote_template_items table
  const qtiExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quote_template_items'").get();
  if (!qtiExists) {
    db.exec(`
      CREATE TABLE quote_template_items (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES quote_templates(id) ON DELETE CASCADE,
        section_title TEXT NOT NULL,
        description TEXT NOT NULL,
        unit TEXT DEFAULT 'each',
        unit_price REAL DEFAULT 0,
        item_type TEXT DEFAULT 'material',
        sort_order INTEGER DEFAULT 0
      )
    `);
  }

  // Phase 8H: indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_client_email ON quotes(client_email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_sections_quote ON quote_sections(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_items_section ON quote_items(section_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_documents_quote ON quote_documents(quote_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quote_review_events_quote ON quote_review_events(quote_id)`);

  // Seed default quote templates
  const templateCount = db.prepare("SELECT COUNT(*) as cnt FROM quote_templates").get().cnt;
  if (templateCount === 0) {
    const templates = [
      { name: "Commercial Fitout", items: [{ section: "Demolition & Strip Out", desc: "Strip out existing fitout including removal of partitions, ceiling, floor coverings", price: 12000 }, { section: "New Partitions", desc: "Supply & install new metal stud partition walls with 1 layer Fyrechek each side", price: 8500 }, { section: "Ceiling", desc: "Supply & install suspended ceiling grid with 600x600mm acoustic tiles", price: 9500 }, { section: "Flooring", desc: "Supply & install commercial grade carpet tiles including underlay", price: 6500 }, { section: "Paint", desc: "Supply & apply 2 coats premium interior paint to all walls and ceiling", price: 4500 }, { section: "Electrical", desc: "Allowance for electrical works including power points, data points, light fittings", price: 8000 }] },
      { name: "Joinery Supply & Install", items: [{ section: "Custom Cabinetry", desc: "Design, supply & install custom joinery including drawers, shelving, doors", price: 15000 }, { section: "Benchtops", desc: "Supply & install engineered stone benchtop 40mm thick with integrated sink cutout", price: 4500 }, { section: "Hardware", desc: "Supply & install all handles, hinges, drawer runners (soft-close)", price: 1200 }, { section: "Delivery & Installation", desc: "Delivery to site, installation, protection, and final clean", price: 2500 }] },
      { name: "Maintenance Works", items: [{ section: "General Repairs", desc: "Labour for general building maintenance and repairs (per day)", price: 660 }, { section: "Plumbing", desc: "Minor plumbing repairs including tap washers, valve replacements, unblocking drains", price: 550 }, { section: "Electrical", desc: "Minor electrical repairs including switch plate replacement, light fitting swap", price: 550 }, { section: "Carpentry", desc: "Minor carpentry repairs including door adjustments, hinge replacements", price: 880 }] },
      { name: "Labour Hire / Day Works", items: [{ section: "Carpenter", desc: "Qualified carpenter — labour only per day (8 hours)", price: 660 }, { section: "Leading Hand", desc: "Leading hand / supervisor — labour only per day (8 hours)", price: 880 }, { section: "Labourer", desc: "General labourer — labour only per day (8 hours)", price: 440 }, { section: "Travel", desc: "Travel allowance (per km outside 30km radius)", price: 0.85 }] },
      { name: "Supply Only", items: [{ section: "Materials", desc: "Supply of materials as per scope (call for itemised breakdown)", price: 0 }, { section: "Delivery", desc: "Delivery to site within 20km of depot", price: 150 }] },
    ];
    const tplInsert = db.prepare("INSERT INTO quote_templates (id, name, description, category, is_default) VALUES (?, ?, ?, ?, ?)");
    const tplItemInsert = db.prepare("INSERT INTO quote_template_items (id, template_id, section_title, description, unit, unit_price, item_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const t of templates) {
      const tplId = crypto.randomUUID();
      tplInsert.run(tplId, t.name, `${t.name} template`, t.name, 0);
      t.items.forEach((item, i) => {
        tplItemInsert.run(crypto.randomUUID(), tplId, item.section, item.desc, "each", item.price, "material", i);
      });
    }
    console.log(`Seeded ${templates.length} default quote templates`);
  }

  console.log("Database migrated successfully");
}
