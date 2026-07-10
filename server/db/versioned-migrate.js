import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runVersionedMigrations(db) {
  const migrationsDir = MIGRATIONS_DIR;

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) {
    return;
  }

  // Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);

    // Validate filename matches expected version pattern
    const match = file.match(/^(\d{3})-.+\.js$/);
    if (!match) {
      throw new Error(`Invalid migration filename: "${file}". Must match pattern: NNN-name.js`);
    }
    const expectedVersion = match[1];

    let migrationModule;
    try {
      migrationModule = await import(`file://${filePath}`);
    } catch (err) {
      console.error(`Failed to load migration ${file}:`, err.message);
      throw err;
    }

    const { version, name, migrate } = migrationModule;
    if (!version || !name || !migrate) {
      throw new Error(`Migration ${file}: missing required export (version, name, or migrate function)`);
    }
    if (version !== expectedVersion) {
      throw new Error(`Migration ${file}: filename version ${expectedVersion} does not match export version ${version}`);
    }

    const alreadyApplied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);

    // Run migration atomically: BEGIN → migrate → INSERT → COMMIT
    const runMigration = db.transaction(() => {
      migrate(db);
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
    });

    try {
      runMigration();
      console.log(`Migration ${version} applied successfully`);
    } catch (err) {
      console.error(`Migration ${version} (${name}) failed:`, err.message);
      throw err;
    }

    // Verify FK constraints after migration
    const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
    if (fkErrors.length > 0) {
      throw new Error(`Foreign key violations after migration ${version}: ${JSON.stringify(fkErrors)}`);
    }
  }
}
