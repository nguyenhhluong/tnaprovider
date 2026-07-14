export const version = '012';
export const name = 'email-preferences';
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferences TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
