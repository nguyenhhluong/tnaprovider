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

  // ── Phase 1: Load and validate complete migration inventory ──
  const seenVersions = new Set();
  const seenNames = new Set();
  const expectedOrder = ["001","002","003","004","005","006","007","008"];
  const loaded = [];

  for (const file of files) {
    const match = file.match(/^(\d{3})-.+\.js$/);
    if (!match) throw new Error(`Invalid migration filename: "${file}". Must match NNN-name.js`);
    const expectedVersion = match[1];

    const filePath = path.join(migrationsDir, file);
    let mod;
    try { mod = await import(`file://${filePath}`); }
    catch (err) { throw new Error(`Failed to load ${file}: ${err.message}`); }

    const { version, name, migrate } = mod;
    if (typeof version !== "string" || !version) throw new Error(`${file}: version must be a non-empty string`);
    if (typeof name !== "string" || !name) throw new Error(`${file}: name must be a non-empty string`);
    if (typeof migrate !== "function") throw new Error(`${file}: migrate must be a function`);
    if (version !== expectedVersion) throw new Error(`${file}: version ${expectedVersion} !== export "${version}"`);
    if (seenVersions.has(version)) throw new Error(`Duplicate version ${version} in ${file}`);
    if (seenNames.has(name)) throw new Error(`Duplicate name "${name}" in ${file}`);

    seenVersions.add(version);
    seenNames.add(name);
    loaded.push({ version, name, file, filePath });
  }

  // Verify continuous ordering
  const actualVersions = loaded.map(m => m.version);
  const expectedUpTo = expectedOrder.slice(0, actualVersions.length);
  for (let i = 0; i < actualVersions.length; i++) {
    if (actualVersions[i] !== expectedUpTo[i]) {
      throw new Error(`Migration ordering: expected ${expectedUpTo[i]} at position ${i + 1}, got ${actualVersions[i]}`);
    }
  }

  // Verify applied versions match stored names
  const appliedRecords = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  for (const rec of appliedRecords) {
    const expected = loaded.find(m => m.version === rec.version);
    if (!expected) throw new Error(`Migration ${rec.version} (${rec.name}) is applied but not found in files`);
    if (expected.name !== rec.name) {
      throw new Error(`Migration ${rec.version}: stored name "${rec.name}" !== file name "${expected.name}"`);
    }
  }

  // ── Phase 2: Execute pending migrations in order ──
  for (const { version, name, filePath } of loaded) {
    const mod = await import(`file://${filePath}`);
    const { migrate, requiresForeignKeysOff, requiresLegacyAlterTable } = mod;

    const alreadyApplied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);

    const origFk = db.prepare("PRAGMA foreign_keys").get().foreign_keys === 1;
    const origLat = db.prepare("PRAGMA legacy_alter_table").get().legacy_alter_table === 1;

    try {
      if (requiresForeignKeysOff && origFk) db.exec("PRAGMA foreign_keys = OFF");
      if (requiresLegacyAlterTable && !origLat) db.exec("PRAGMA legacy_alter_table = ON");

      const runMigration = db.transaction(() => {
        migrate(db);
        // PRAGMA foreign_key_check works regardless of foreign_keys setting
        const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
        if (fkErrors.length > 0) {
          throw new Error(`Foreign key violations after ${version} (${name}): ${JSON.stringify(fkErrors)}`);
        }
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(version, name);
      });

      runMigration();
      console.log(`Migration ${version} applied successfully`);
    } catch (err) {
      console.error(`Migration ${version} (${name}) failed:`, err.message);
      throw err;
    } finally {
      if (requiresLegacyAlterTable && !origLat) db.exec("PRAGMA legacy_alter_table = OFF");
      if (requiresForeignKeysOff && origFk) db.exec("PRAGMA foreign_keys = ON");
    }
  }

  // ── Final verification after all migrations ──
  const finalFk = db.prepare("PRAGMA foreign_key_check").all();
  const finalIntegrity = db.prepare("PRAGMA integrity_check").all();
  if (finalFk.length > 0) throw new Error(`Final foreign key violations: ${JSON.stringify(finalFk)}`);
  if (!(finalIntegrity.length === 1 && finalIntegrity[0]["integrity_check"] === "ok")) {
    throw new Error(`Integrity check failed: ${JSON.stringify(finalIntegrity)}`);
  }
}
