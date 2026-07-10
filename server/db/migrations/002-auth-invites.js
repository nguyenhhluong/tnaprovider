export const version = '002';
export const name = 'auth-invites';
export function migrate(db) {
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
  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
