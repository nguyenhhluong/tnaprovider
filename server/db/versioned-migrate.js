import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { verifySchemaContract, EXPECTED_MIGRATIONS } from "./schema-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const REQUIRED_FILES = ["001-initial-schema.js","002-auth-invites.js","003-client-portal.js","004-realtime-timesheets.js","005-pay-rules.js","006-platform-modules.js","007-contact-requests.js","008-professional-quotes.js"];

export async function runVersionedMigrations(db) {
  const migrationsDir = MIGRATIONS_DIR;
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

  // ── Phase 1: Preflight — validate migration inventory before any DB mutation ──
  if (files.length !== REQUIRED_FILES.length) {
    throw new Error(`Expected ${REQUIRED_FILES.length} migration files, found ${files.length}`);
  }
  for (let i = 0; i < REQUIRED_FILES.length; i++) {
    if (files[i] !== REQUIRED_FILES[i]) {
      throw new Error(`Migration ${i + 1}: expected "${REQUIRED_FILES[i]}", got "${files[i]}"`);
    }
  }

  const loaded = [];
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    let mod;
    try { mod = await import(`file://${filePath}`); }
    catch (err) { throw new Error(`Failed to load ${file}: ${err.message}`); }

    const { version, name, migrate, requiresForeignKeysOff: rfo, requiresLegacyAlterTable: rlat } = mod;
    if (typeof version !== "string" || !version) throw new Error(`${file}: version must be a non-empty string`);
    if (typeof name !== "string" || !name) throw new Error(`${file}: name must be a non-empty string`);
    if (typeof migrate !== "function") throw new Error(`${file}: migrate must be a function`);
    if (rfo !== undefined && typeof rfo !== "boolean") throw new Error(`${file}: requiresForeignKeysOff must be boolean`);
    if (rlat !== undefined && typeof rlat !== "boolean") throw new Error(`${file}: requiresLegacyAlterTable must be boolean`);

    const expectedVersion = file.slice(0, 3);
    if (version !== expectedVersion) throw new Error(`${file}: version ${expectedVersion} !== export "${version}"`);

    loaded.push({ version, name, migrate, requireFK: rfo === true, requireLAT: rlat === true, file });
  }

  // Exact ordering, no duplicates
  for (let i = 0; i < loaded.length; i++) {
    if (loaded[i].version !== EXPECTED_MIGRATIONS[i].version) {
      throw new Error(`Migration ${i + 1}: version ${loaded[i].version}, expected ${EXPECTED_MIGRATIONS[i].version}`);
    }
  }
  const seenVersions = new Set(), seenNames = new Set();
  for (const m of loaded) {
    if (seenVersions.has(m.version)) throw new Error(`Duplicate version ${m.version}`);
    if (seenNames.has(m.name)) throw new Error(`Duplicate name "${m.name}"`);
    seenVersions.add(m.version); seenNames.add(m.name);
  }

  // ── Phase 2: DB operations — create tracking table and execute migrations ──
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Verify already-applied records match files
  const applied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
  if (applied.length > 0) {
    for (let i = 0; i < applied.length; i++) {
      if (applied[i].version !== EXPECTED_MIGRATIONS[i].version) {
        throw new Error(`Applied ${applied[i].version} at position ${i + 1}, expected ${EXPECTED_MIGRATIONS[i].version}`);
      }
      if (applied[i].name !== loaded[i].name) {
        throw new Error(`Migration ${applied[i].version}: stored name "${applied[i].name}" !== file "${loaded[i].name}"`);
      }
    }
  }

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
        // FK check inside transaction
        const fkErrors = db.prepare("PRAGMA foreign_key_check").all();
        if (fkErrors.length > 0) {
          throw new Error(`FK violations after ${version}: ${JSON.stringify(fkErrors)}`);
        }
        // For the final migration (008), verify schema structure before commit
        if (version === "008") {
          const currentApplied = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
          const futureApplied = [...currentApplied, { version: "008", name }];
          const contractErrors = verifySchemaContract(db, futureApplied);
          if (contractErrors.length > 0) {
            throw new Error(`Schema contract violations after ${version}:\n  ${contractErrors.join("\n  ")}`);
          }
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

  // ── Final post-commit verification ──
  const finalFk = db.prepare("PRAGMA foreign_key_check").all();
  const finalIntegrity = db.prepare("PRAGMA integrity_check").all();
  if (finalFk.length > 0) throw new Error(`Final FK violations: ${JSON.stringify(finalFk)}`);
  if (!(finalIntegrity.length === 1 && finalIntegrity[0]["integrity_check"] === "ok")) {
    throw new Error(`Integrity check failed: ${JSON.stringify(finalIntegrity)}`);
  }
}
