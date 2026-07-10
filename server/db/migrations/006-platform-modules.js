export const version = '006';
export const name = 'platform-modules';
export function migrate(db) {
  const existing = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
  if (existing) return;

  function addColumnIfMissing(table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  function buildSelectExpr(cols, field, defaultValue) {
    return cols.includes(field) ? field : defaultValue;
  }

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

  addColumnIfMissing('users', 'must_change_password', 'INTEGER DEFAULT 0');
  addColumnIfMissing('users', 'invited_at', 'TEXT');
  addColumnIfMissing('users', 'disabled_at', 'TEXT');
  addColumnIfMissing('users', 'disabled_by', 'TEXT REFERENCES users(id)');
  addColumnIfMissing('users', 'password_changed_at', 'TEXT');
  addColumnIfMissing('users', 'hourly_rate', 'REAL');

  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get().sql;
  if (!sql.includes("'invited'")) {
    const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

    const selMustChange = buildSelectExpr(cols, 'must_change_password', '0');
    const selInvitedAt = buildSelectExpr(cols, 'invited_at', 'NULL');
    const selDisabledAt = buildSelectExpr(cols, 'disabled_at', 'NULL');
    const selDisabledBy = buildSelectExpr(cols, 'disabled_by', 'NULL');
    const selPasswordChangedAt = buildSelectExpr(cols, 'password_changed_at', 'NULL');

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
      INSERT INTO users_new (
        id, email, name, role, password_hash, status,
        must_change_password, invited_at, disabled_at, disabled_by, password_changed_at,
        hourly_rate, created_at, updated_at, last_login_at
      )
      SELECT id, email, name, role, password_hash,
        CASE WHEN status = 'active' THEN 'active' ELSE 'disabled' END,
        ${selMustChange}, ${selInvitedAt}, ${selDisabledAt}, ${selDisabledBy}, ${selPasswordChangedAt},
        COALESCE(hourly_rate, NULL), created_at, updated_at, last_login_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);

    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA legacy_alter_table = OFF");

    const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
    if (fkErrors.length > 0) {
      console.error("Foreign key violations after users table migration:", fkErrors);
      throw new Error("Foreign key check failed during users table migration");
    }
  }

  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
