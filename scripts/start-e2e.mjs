import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Set deterministic test database
const DB_PATH = process.env.E2E_DB_PATH || '/tmp/tna-e2e.db';
process.env.DATABASE_URL = DB_PATH;
process.env.NODE_ENV = 'test';

// Remove prior test DB
for (const ext of ['', '-wal', '-shm']) {
  try { fs.unlinkSync(DB_PATH + ext); } catch {}
}

async function main() {
  console.log(`[e2e] Using database: ${DB_PATH}`);

  // Run migrations
  const { migrate } = await import('../server/db/migrate.js');
  await migrate();
  console.log('[e2e] Migrations complete');

  // Seed test users and data
  const { getDb, closeDb } = await import('../server/db/database.js');
  const crypto = await import('crypto');
  const bcrypt = await import('bcrypt');
  const db = getDb();

  const now = new Date().toISOString();
  const hash = (pw) => bcrypt.hashSync(pw, 12);

  const roles = ['owner', 'admin', 'manager', 'worker', 'client'];
  for (const role of roles) {
    const envKey = `E2E_${role.toUpperCase()}`;
    const email = process.env[`${envKey}_EMAIL`];
    const password = process.env[`${envKey}_PASSWORD`];
    if (!email || !password) {
      console.log(`[e2e] Skipping ${role}: set ${envKey}_EMAIL and ${envKey}_PASSWORD`);
      continue;
    }
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    db.prepare('INSERT INTO users (id, email, name, role, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), email, `E2E ${role.charAt(0).toUpperCase() + role.slice(1)}`, role, hash(password), 'active', now, now
    );
    console.log(`[e2e] Seeded user: ${role} <${email}>`);
  }

  // Seed quote requests
  for (let i = 1; i <= 3; i++) {
    db.prepare('INSERT OR IGNORE INTO contact_requests (id, first_name, last_name, email, phone, service, location, message, status, received_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), 'E2E', `Customer ${i}`, `customer${i}@test.com`, '0400000000', 'Construction', 'Sydney NSW', `E2E test quote request ${i}`, 'new', now, now, now
    );
  }
  console.log('[e2e] Seeded quote requests');

  // Seed email jobs
  const jobId1 = crypto.randomUUID();
  db.prepare("INSERT INTO email_jobs (id, type, recipient, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(jobId1, 'QUOTE_RECEIVED_CUSTOMER', 'customer@test.com', 'E2E Test Quote Confirmation', 'SENT', now, now);
  const jobId2 = crypto.randomUUID();
  db.prepare("INSERT INTO email_jobs (id, type, recipient, subject, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(jobId2, 'QUOTE_RECEIVED_ADMIN', 'admin@test.com', 'E2E Test Admin Notification', 'FAILED', now, now);
  console.log('[e2e] Seeded email jobs');

  // Seed email job attempt
  const attemptId = crypto.randomUUID();
  db.prepare("INSERT INTO email_job_attempts (id, email_job_id, attempt_number, status, started_at, completed_at, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    attemptId, jobId2, 1, 'FAILED', now, now, 'E2E test SMTP failure', now
  );
  console.log('[e2e] Seeded email job attempts');

  // Seed project
  const projectId = crypto.randomUUID();
  db.prepare("INSERT INTO projects (id, title, client_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(projectId, 'E2E Test Project', 'E2E Client', 'active', now, now);
  console.log('[e2e] Seeded project');

  closeDb();
  console.log('[e2e] Seed complete');

  // Start the application server
  const { startServer } = await import('../server/startup.js');
  const { createApp } = await import('../server/app.js');
  const app = createApp();
  await startServer(app);
}

main().catch((err) => {
  console.error('[e2e] Startup failed:', err.message);
  process.exit(1);
});
