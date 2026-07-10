export const version = '007';
export const name = 'contact-requests';
export function migrate(db) {
  const existing = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
  if (existing) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_requests (
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
    );
    CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_received_at ON contact_requests(received_at);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_phone ON contact_requests(phone);
  `);

  db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
}
