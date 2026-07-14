export const version = '009';
export const name = 'email-jobs';
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('QUOTE_RECEIVED_CUSTOMER','QUOTE_RECEIVED_ADMIN','USER_INVITATION','PASSWORD_RESET','QUOTE_STATUS_CHANGED')),
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      related_entity_type TEXT,
      related_entity_id TEXT,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      smtp_message_id TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_email_jobs_type ON email_jobs(type);
    CREATE INDEX IF NOT EXISTS idx_email_jobs_related ON email_jobs(related_entity_type, related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_email_jobs_scheduled ON email_jobs(scheduled_at);
  `);
}
