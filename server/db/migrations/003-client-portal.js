export const version = '003';
export const name = 'client-portal';
export function migrate(db) {
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
  `);
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
