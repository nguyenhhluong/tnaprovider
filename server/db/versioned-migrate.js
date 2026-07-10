import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verifySchemaContract, EXPECTED_MIGRATIONS } from "./schema-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const REQUIRED_FILES = [
  "001-initial-schema.js", "002-auth-invites.js", "003-client-portal.js",
  "004-realtime-timesheets.js", "005-pay-rules.js", "006-platform-modules.js",
  "007-contact-requests.js", "008-professional-quotes.js",
];

export async function runVersionedMigrations(db) {
  // ── Require migration directory and files ──
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migration directory not found: ${MIGRATIONS_DIR}`);
  }
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js')).sort();
  if (files.length === 0) {
    throw new Error(`No migration files found in ${MIGRATIONS_DIR}`);
  }

  // ── Preflight: load + validate before any DB mutation ──
  if (files.length !== REQUIRED_FILES.length) {
    throw new Error(`Expected ${REQUIRED_FILES.length} migration files, found ${files.length}`);
  }
  for (let i = 0; i < REQUIRED_FILES.length; i++) {
    if (files[i] !== REQUIRED_FILES[i]) {
      throw new Error(`Migration file ${i + 1}: expected "${REQUIRED_FILES[i]}", got "${files[i]}"`);
    }
  }

  const loaded = [];
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const expectedVersion = file.slice(0, 3);
    const expectedName = EXPECTED_MIGRATIONS.find(e => e.version === expectedVersion)?.name;

    let mod;
    try { mod = await import(`file://${filePath}`); }
    catch (err) { throw new Error(`Failed to load ${file}: ${err.message}`); }

    const { version, name, migrate, requiresForeignKeysOff: rfo, requiresLegacyAlterTable: rlat } = mod;
    if (typeof version !== "string" || !version) throw new Error(`${file}: version must be a non-empty string`);
    if (typeof name !== "string" || !name) throw new Error(`${file}: name must be a non-empty string`);
    if (typeof migrate !== "function") throw new Error(`${file}: migrate must be a function`);
    if (version !== expectedVersion) throw new Error(`${file}: filename ${expectedVersion} !== export "${version}"`);
    if (name !== expectedName) throw new Error(`${file}: name "${name}" !== manifest "${expectedName}"`);
    if (rfo !== undefined && typeof rfo !== "boolean") throw new Error(`${file}: requiresForeignKeysOff must be boolean`);
    if (rlat !== undefined && typeof rlat !== "boolean") throw new Error(`${file}: requiresLegacyAlterTable must be boolean`);

    loaded.push({ version, name, migrate, requireFK: rfo === true, requireLAT: rlat === true, file });
  }

  // No duplicate versions or names
  const seenV = new Set(), seenN = new Set();
  for (const m of loaded) {
    if (seenV.has(m.version)) throw new Error(`Duplicate version ${m.version}`);
    if (seenN.has(m.name)) throw new Error(`Duplicate name "${m.name}"`);
    seenV.add(m.version); seenN.add(m.name);
  }

  // ── DB operations ──
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Verify already-applied records
  const appliedRecords = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  if (appliedRecords.length > 0) {
    if (appliedRecords.length !== EXPECTED_MIGRATIONS.length) {
      throw new Error(`Expected ${EXPECTED_MIGRATIONS.length} applied migrations, found ${appliedRecords.length}`);
    }
    for (let i = 0; i < appliedRecords.length; i++) {
      if (appliedRecords[i].version !== EXPECTED_MIGRATIONS[i].version) {
        throw new Error(`Applied ${appliedRecords[i].version} at ${i + 1}, expected ${EXPECTED_MIGRATIONS[i].version}`);
      }
      if (appliedRecords[i].name !== loaded[i].name) {
        throw new Error(`Migration ${appliedRecords[i].version}: stored "${appliedRecords[i].name}" !== file "${loaded[i].name}"`);
      }
    }
  }

  // ── Execute pending migrations ──
  for (let idx = 0; idx < loaded.length; idx++) {
    const { version, name, migrate, requireFK, requireLAT } = loaded[idx];
    const already = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (already) continue;

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
          throw new Error(`FK violations after ${version}: ${JSON.stringify(fkErrors)}`);
        }
        // Per-migration FK check (schema contract verified fully at end only)
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

  // ── Final verification (always runs, even on no-op startups) ──
  const finalApplied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  if (finalApplied.length !== EXPECTED_MIGRATIONS.length) {
    throw new Error(`Expected ${EXPECTED_MIGRATIONS.length} migrations, found ${finalApplied.length}`);
  }
  for (let i = 0; i < EXPECTED_MIGRATIONS.length; i++) {
    if (finalApplied[i].version !== EXPECTED_MIGRATIONS[i].version) {
      throw new Error(`Final migration ${i + 1}: ${finalApplied[i].version}, expected ${EXPECTED_MIGRATIONS[i].version}`);
    }
  }

  const contractErrors = verifySchemaContract(db);
  if (contractErrors.length > 0) {
    throw new Error(`Schema contract violations:\n  ${contractErrors.join("\n  ")}`);
  }

  const finalFk = db.prepare("PRAGMA foreign_key_check").all();
  const finalIntegrity = db.prepare("PRAGMA integrity_check").all();
  if (finalFk.length > 0) throw new Error(`Final FK violations: ${JSON.stringify(finalFk)}`);
  if (!(finalIntegrity.length === 1 && finalIntegrity[0]["integrity_check"] === "ok")) {
    throw new Error(`Integrity check failed: ${JSON.stringify(finalIntegrity)}`);
  }
}
