export const version = '010';
export const name = 'email-job-attempts';
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_job_attempts (
      id TEXT PRIMARY KEY,
      email_job_id TEXT NOT NULL REFERENCES email_jobs(id) ON DELETE CASCADE,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK(status IN ('PROCESSING','SENT','FAILED')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      smtp_message_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(email_job_id, attempt_number)
    );
    CREATE INDEX IF NOT EXISTS idx_email_job_attempts_job ON email_job_attempts(email_job_id);
  `);
}
