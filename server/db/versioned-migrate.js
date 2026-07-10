import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runVersionedMigrations(db) {
  const migrationsDir = MIGRATIONS_DIR;
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) return;

  // Ensure schema_migrations table exists
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Phase 1: Load and validate complete migration inventory before running anything
  const seenVersions = new Set();
  const seenNames = new Set();

  for (const file of files) {
    const match = file.match(/^(\d{3})-.+\.js$/);
    if (!match) throw new Error(`Invalid migration filename: "${file}". Must match NNN-name.js`);
    const expectedVersion = match[1];

    const filePath = path.join(migrationsDir, file);
    let mod;
    try { mod = await import(`file://${filePath}`); }
    catch (err) { throw new Error(`Failed to load ${file}: ${err.message}`); }

    const { version, name, migrate } = mod;
    if (!version || !name || !migrate) throw new Error(`${file}: missing version, name, or migrate`);
    if (version !== expectedVersion) throw new Error(`${file}: version ${expectedVersion} !== export ${version}`);
    if (seenVersions.has(version)) throw new Error(`Duplicate version ${version} in ${file}`);
    if (seenNames.has(name)) throw new Error(`Duplicate name "${name}" in ${file}`);

    seenVersions.add(version);
    seenNames.add(name);
  }

  // Phase 2: Execute pending migrations in order
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const expectedVersion = file.match(/^(\d{3})-/)[1];

    const mod = await import(`file://${filePath}`);
    const { version, name, migrate, requiresForeignKeysOff } = mod;

    const alreadyApplied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);

    if (requiresForeignKeysOff) {
      // For migrations that need to disable FKs (table rebuilds like 004, 006)
      const fkOn = db.prepare("PRAGMA foreign_keys").get().foreign_keys === 1;
      try {
        if (fkOn) db.exec("PRAGMA foreign_keys = OFF");
        db.exec("BEGIN IMMEDIATE");
        try {
          migrate(db);
        } catch (migrateErr) {
          db.exec("ROLLBACK");
          throw migrateErr;
        }
        // Verify FK inside transaction before committing
        db.exec("PRAGMA foreign_keys = ON");
        const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
        if (fkErrors.length > 0) {
          db.exec("ROLLBACK");
          throw new Error(`Foreign key violations after ${version} (${name}): ${JSON.stringify(fkErrors)}`);
        }
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
        db.exec("COMMIT");
        console.log(`Migration ${version} applied successfully`);
      } catch (err) {
        // Ensure we're not in a transaction
        try { db.exec("ROLLBACK"); } catch {}
        throw err;
      } finally {
        if (fkOn) db.exec("PRAGMA foreign_keys = ON");
      }
    } else {
      // Standard migrations inside a single transaction
      const runMigration = db.transaction(() => {
        migrate(db);
        const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
        if (fkErrors.length > 0) {
          throw new Error(`Foreign key violations after ${version}: ${JSON.stringify(fkErrors)}`);
        }
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
      });

      try {
        runMigration();
        console.log(`Migration ${version} applied successfully`);
      } catch (err) {
        console.error(`Migration ${version} (${name}) failed:`, err.message);
        throw err;
      }
    }
  }

  // Final verification after all migrations
  const finalFk = db.prepare("PRAGMA foreign_key_check").all();
  const finalIntegrity = db.prepare("PRAGMA integrity_check").all();
  if (finalFk.length > 0) throw new Error(`Final foreign key violations: ${JSON.stringify(finalFk)}`);
  if (!(finalIntegrity.length === 1 && finalIntegrity[0]["integrity_check"] === "ok")) {
    throw new Error(`Integrity check failed: ${JSON.stringify(finalIntegrity)}`);
  }
}
