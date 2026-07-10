import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verifySchemaContract } from "./schema-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const EXPECTED_ORDER = ["001", "002", "003", "004", "005", "006", "007", "008"];

export async function runVersionedMigrations(db) {
  const migrationsDir = MIGRATIONS_DIR;
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (files.length === 0) return;

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // ── Phase 1: Load and validate complete migration inventory ──
  const loaded = [];

  for (const file of files) {
    const match = file.match(/^(\d{3})-.+\.js$/);
    if (!match) throw new Error(`Invalid migration filename: "${file}". Must match NNN-name.js`);
    const expectedVersion = match[1];

    const filePath = path.join(migrationsDir, file);
    let mod;
    try { mod = await import(`file://${filePath}`); }
    catch (err) { throw new Error(`Failed to load ${file}: ${err.message}`); }

    const { version, name, migrate, requiresForeignKeysOff, requiresLegacyAlterTable: rlat } = mod;
    if (typeof version !== "string" || !version) throw new Error(`${file}: version must be a non-empty string`);
    if (typeof name !== "string" || !name) throw new Error(`${file}: name must be a non-empty string`);
    if (typeof migrate !== "function") throw new Error(`${file}: migrate must be a function`);
    if (version !== expectedVersion) throw new Error(`${file}: filename ${expectedVersion} !== export "${version}"`);

    // Reject non-boolean metadata
    if (requiresForeignKeysOff !== undefined && typeof requiresForeignKeysOff !== "boolean") {
      throw new Error(`${file}: requiresForeignKeysOff must be boolean`);
    }
    if (rlat !== undefined && typeof rlat !== "boolean") {
      throw new Error(`${file}: requiresLegacyAlterTable must be boolean`);
    }

    loaded.push({ version, name, migrate, requireFK: requiresForeignKeysOff === true, requireLAT: rlat === true, file });
  }

  // Exact ordering and completeness
  if (loaded.length !== EXPECTED_ORDER.length) {
    throw new Error(`Expected ${EXPECTED_ORDER.length} migrations, found ${loaded.length}`);
  }
  for (let i = 0; i < EXPECTED_ORDER.length; i++) {
    if (loaded[i].version !== EXPECTED_ORDER[i]) {
      throw new Error(`Migration ${i + 1}: expected ${EXPECTED_ORDER[i]}, got ${loaded[i].version} (${loaded[i].file})`);
    }
  }

  // Check duplicate versions and names
  const seenVersions = new Set();
  const seenNames = new Set();
  for (const m of loaded) {
    if (seenVersions.has(m.version)) throw new Error(`Duplicate version ${m.version}`);
    if (seenNames.has(m.name)) throw new Error(`Duplicate name "${m.name}"`);
    seenVersions.add(m.version);
    seenNames.add(m.name);
  }

  // Verify applied versions match stored names
  const appliedRecords = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  for (const rec of appliedRecords) {
    const expected = loaded.find(m => m.version === rec.version);
    if (!expected) throw new Error(`Migration ${rec.version} applied but not found`);
    if (expected.name !== rec.name) throw new Error(`Migration ${rec.version}: stored "${rec.name}" !== file "${expected.name}"`);
  }

  // ── Phase 2: Execute pending migrations in order ──
  for (const { version, name, migrate, requireFK, requireLAT } of loaded) {
    const alreadyApplied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (alreadyApplied) continue;

    console.log(`Running migration ${version}: ${name}`);

    const origFk = db.prepare("PRAGMA foreign_keys").get().foreign_keys === 1;
    const origLat = db.prepare("PRAGMA legacy_alter_table").get().legacy_alter_table === 1;

    try {
      if (requireFK && origFk) db.exec("PRAGMA foreign_keys = OFF");
      if (requireLAT && !origLat) db.exec("PRAGMA legacy_alter_table = ON");

      const runMigration = db.transaction(() => {
        migrate(db);
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
      if (requireLAT && !origLat) db.exec("PRAGMA legacy_alter_table = OFF");
      if (requireFK && origFk) db.exec("PRAGMA foreign_keys = ON");
    }
  }

  // Final verification: FK, integrity, and schema contract
  const finalFk = db.prepare("PRAGMA foreign_key_check").all();
  const finalIntegrity = db.prepare("PRAGMA integrity_check").all();
  if (finalFk.length > 0) throw new Error(`Final FK violations: ${JSON.stringify(finalFk)}`);
  if (!(finalIntegrity.length === 1 && finalIntegrity[0]["integrity_check"] === "ok")) {
    throw new Error(`Integrity check failed: ${JSON.stringify(finalIntegrity)}`);
  }
  const contractErrors = verifySchemaContract(db);
  if (contractErrors.length > 0) {
    throw new Error(`Schema contract violations:\n  ${contractErrors.join("\n  ")}`);
  }
}
